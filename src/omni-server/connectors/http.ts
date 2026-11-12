import type { CreateConnectionRequest } from "../../omni/types/connectors";
import { ConnectorError, ConnectorService } from "./service";
import { CookieSession, CookieTooLargeError } from "./session";
import { Vault, VaultUnavailableError } from "./vault";

const BASE = "/api/connections";
export const CALLBACK_PATH = `${BASE}/oauth/callback`;

export interface HandlerEnv {
  /** Segredo de cifragem (CONNECTOR_SECRET). */
  secret?: string | undefined;
  /** Endereço público do app, se for diferente do da requisição. */
  appUrl?: string | undefined;
  /** Só para testes. */
  service?: (redirectUrl: string) => ConnectorService;
}

/** Atende /api/connections/* a partir de uma Request padrão. */
export async function handleConnectorsRequest(request: Request, env: HandlerEnv): Promise<Response> {
  const url = new URL(request.url);
  const origin = env.appUrl && /^https?:\/\//.test(env.appUrl) ? env.appUrl.replace(/\/+$/, "") : url.origin;
  const vault = new Vault(env.secret);
  const session = new CookieSession(request.headers.get("cookie"), vault, origin.startsWith("https://"));
  const service = env.service ? env.service(`${origin}${CALLBACK_PATH}`) : new ConnectorService({ redirectUrl: `${origin}${CALLBACK_PATH}` });

  const respond = (body: unknown, status = 200): Response => {
    const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
    for (const cookie of session.setCookieHeaders()) headers.append("set-cookie", cookie);
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
  };

  try {
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD" && !sameOrigin(request, url)) {
      throw new ConnectorError("Origem não permitida.", 403);
    }

    const path = url.pathname.replace(/\/+$/, "");
    const rest = path.startsWith(BASE) ? path.slice(BASE.length).split("/").filter(Boolean) : [];

    // GET /api/connections
    if (method === "GET" && rest.length === 0) {
      const connections = vault.available ? await service.list(session) : [];
      return respond({ configured: vault.available, providers: service.providers(), connections });
    }

    // GET /api/connections/oauth/callback  (a plataforma devolve o usuário para cá)
    if (method === "GET" && rest[0] === "oauth" && rest[1] === "callback") {
      return await callback(url, session, service);
    }

    requireVault(vault);

    // POST /api/connections
    if (method === "POST" && rest.length === 0) {
      const body = ((await request.json().catch(() => ({}))) ?? {}) as Partial<CreateConnectionRequest>;
      const created = await service.create(session, {
        providerId: body.providerId as CreateConnectionRequest["providerId"],
        ...(typeof body.label === "string" ? { label: body.label } : {}),
        ...(typeof body.apiKey === "string" ? { apiKey: body.apiKey } : {}),
      });
      return respond(created, 201);
    }

    const id = rest[0];
    if (id && rest.length === 2 && rest[1] === "sync" && method === "POST") return respond(await service.sync(session, id));
    if (id && rest.length === 2 && rest[1] === "reconnect" && method === "POST") return respond(await service.reconnect(session, id));
    if (id && rest.length === 1 && method === "PATCH") {
      const body = ((await request.json().catch(() => ({}))) ?? {}) as { label?: unknown };
      return respond(await service.rename(session, id, typeof body.label === "string" ? body.label : ""));
    }
    if (id && rest.length === 1 && method === "DELETE") {
      await service.remove(session, id);
      return respond(null, 204);
    }

    throw new ConnectorError("Rota não encontrada.", 404);
  } catch (err) {
    return respondError(err, session);
  }
}

function requireVault(vault: Vault): void {
  if (!vault.available) {
    throw new ConnectorError(
      "As conexões ainda não estão habilitadas neste servidor: falta o segredo CONNECTOR_SECRET (mínimo de 16 caracteres) em Lovable > Secrets.",
      503,
    );
  }
}

function respondError(err: unknown, session: CookieSession): Response {
  let status = 500;
  let message = "Erro interno. Tente novamente.";
  if (err instanceof ConnectorError) {
    status = err.status;
    message = err.message;
  } else if (err instanceof VaultUnavailableError) {
    status = 503;
    message = "As conexões não estão habilitadas neste servidor (falta CONNECTOR_SECRET).";
  } else if (err instanceof CookieTooLargeError) {
    status = 502;
    message = err.message;
  } else {
    console.error("Erro nos conectores:", err);
  }
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const cookie of session.setCookieHeaders()) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

/** Bloqueia escritas disparadas por outros sites: a origem precisa ser a do próprio app. */
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // chamadas sem Origin (ferramentas, testes) não vêm de outro site
  try {
    const host = new URL(origin).host;
    return host === url.host || host === request.headers.get("host") || host === request.headers.get("x-forwarded-host");
  } catch {
    return false;
  }
}

async function callback(url: URL, session: CookieSession, service: ConnectorService): Promise<Response> {
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const providerError = url.searchParams.get("error");

  const page = (ok: boolean, message: string, status = 200): Response => {
    const headers = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    for (const cookie of session.setCookieHeaders()) headers.append("set-cookie", cookie);
    return new Response(callbackPage(ok, message), { status, headers });
  };

  if (providerError) {
    await service.failAuthorization(session, state);
    return page(false, "A autorização foi cancelada ou recusada. Feche esta janela e tente de novo.");
  }
  if (!code || !state) return page(false, "Retorno da autorização incompleto. Feche esta janela e tente de novo.", 400);

  try {
    await service.completeAuthorization(session, state, code);
    return page(true, "Conta conectada. Os dados já estão sendo carregados.");
  } catch (err) {
    if (err instanceof ConnectorError) return page(false, err.message, err.status);
    if (err instanceof VaultUnavailableError || err instanceof CookieTooLargeError) return page(false, err.message, 503);
    console.error("Erro ao concluir autorização:", err);
    return page(false, "Não foi possível concluir a conexão.", 500);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Janela curta de retorno: avisa o app que abriu a janela e se fecha. */
function callbackPage(ok: boolean, message: string): string {
  const payload = JSON.stringify({ source: "omnimarket", type: "oauth-complete", ok });
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ok ? "Conta conectada" : "Não foi possível conectar"}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1317;color:#e3e8ec;font:16px/1.5 system-ui,sans-serif}
  main{max-width:26rem;padding:2rem}
  h1{font-size:1.25rem;margin:0 0 .5rem}
  p{margin:0 0 1rem;color:#a3b0bc}
  a{color:#e3b04b}
</style>
</head>
<body>
<main>
  <h1>${ok ? "Conta conectada" : "Não foi possível conectar"}</h1>
  <p>${escapeHtml(message)}</p>
  <a href="/">Voltar ao OmniMarket</a>
</main>
<script>
  try { if (window.opener) window.opener.postMessage(${payload}, window.location.origin); } catch (e) {}
  ${ok ? "setTimeout(function () { window.close(); }, 600);" : ""}
</script>
</body>
</html>`;
}
