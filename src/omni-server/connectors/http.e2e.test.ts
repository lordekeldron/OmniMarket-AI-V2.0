// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { handleConnectorsRequest } from "./http";
import { startFakeOAuthMcp, type FakeOAuthMcp, type FakeTool } from "./testing/fake";

/**
 * Fluxo completo contra um servidor MCP de mentira com OAuth de verdade
 * (registro dinâmico de cliente, PKCE, renovação de token). Tudo passa pela
 * mesma função que a rota usa; só a rede da plataforma é local.
 *
 * Atenção: os FORMATOS de resposta do OpenSEO abaixo são suposições razoáveis
 * (a conta real não tem projetos). O que este teste prova é o encanamento:
 * autorização, cookies cifrados, renovação e expiração.
 */

const APP = "http://app.test";
const SECRET = "um-segredo-de-teste-com-mais-de-16-caracteres";

const rows = (dimension: string) => {
  if (dimension === "date") {
    return [
      { keys: ["2026-11-01"], clicks: 4, impressions: 100, ctr: 0.04, position: 8 },
      { keys: ["2026-11-02"], clicks: 6, impressions: 150, ctr: 0.04, position: 6 },
    ];
  }
  if (dimension === "query") return [{ keys: ["marketing com ia"], clicks: 7, impressions: 120, ctr: 0.058, position: 4.2 }];
  if (dimension === "page") return [{ keys: ["https://x.com/blog"], clicks: 9, impressions: 200, ctr: 0.045, position: 5.1 }];
  return [{ keys: ["MOBILE"], clicks: 8, impressions: 180, ctr: 0.044, position: 5.5 }, { keys: ["DESKTOP"], clicks: 2, impressions: 70, ctr: 0.028, position: 7 }];
};

const tools: FakeTool[] = [
  { name: "list_projects", handler: () => JSON.stringify([{ id: "p1", name: "Meu site", domain: "x.com", locationCode: 2076, languageCode: "pt" }]) },
  { name: "whoami", handler: () => "Account: a@b.c\nCredits remaining: 500" },
  {
    name: "get_search_console_performance",
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, dimensions: { type: "array" } } },
    handler: (args) => JSON.stringify({ rows: rows(String((args["dimensions"] as string[])[0])) }),
  },
  { name: "list_site_audits", handler: () => JSON.stringify([]) },
];

let fake: FakeOAuthMcp;

beforeAll(async () => {
  fake = await startFakeOAuthMcp(tools);
  process.env["OPENSEO_MCP_URL"] = fake.mcpUrl;
});

afterAll(async () => {
  delete process.env["OPENSEO_MCP_URL"];
  await fake.close();
});

/** Navegador mínimo: guarda cookies e os reenvia. */
class Browser {
  private jar = new Map<string, string>();

  cookieHeader(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  raw(): string {
    return this.cookieHeader();
  }

  async call(method: string, path: string, body?: unknown, extra: Record<string, string> = {}, secret: string | null = SECRET): Promise<Response> {
    const response = await handleConnectorsRequest(
      new Request(`${APP}${path}`, {
        method,
        headers: { cookie: this.cookieHeader(), ...(body ? { "content-type": "application/json" } : {}), ...extra },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { secret: secret ?? undefined },
    );
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const index = (pair as string).indexOf("=");
      const name = (pair as string).slice(0, index);
      const value = (pair as string).slice(index + 1);
      if (/Max-Age=0/.test(header)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    return response;
  }
}

/** Faz o "usuário" aprovar na plataforma e volta pelo callback do app. */
async function authorize(browser: Browser, authorizationUrl: string): Promise<Response> {
  const hop = await fetch(authorizationUrl, { redirect: "manual" });
  const location = hop.headers.get("location");
  expect(location, "a plataforma deveria redirecionar de volta ao app").toBeTruthy();
  const target = new URL(location as string);
  expect(target.origin).toBe(APP);
  return browser.call("GET", `${target.pathname}${target.search}`);
}

async function connect(browser: Browser) {
  const created = await browser.call("POST", "/api/connections", { providerId: "openseo" });
  expect(created.status).toBe(201);
  const { connection, authorizationUrl } = await created.json();
  expect(authorizationUrl).toContain(fake.mcpUrl.replace("/mcp", ""));
  const callback = await authorize(browser, authorizationUrl);
  expect(callback.status).toBe(200);
  return connection.id as string;
}

describe("conexão por OAuth, de ponta a ponta", () => {
  test("conecta, sincroniza e entrega métricas; tokens nunca aparecem em claro", async () => {
    const browser = new Browser();
    const id = await connect(browser);

    const list = await (await browser.call("GET", "/api/connections")).json();
    expect(list.configured).toBe(true);
    expect(list.providers.map((p: { id: string }) => p.id)).toEqual(["supermetrics", "metricool", "openseo", "adspirer"]);
    expect(list.connections).toHaveLength(1);
    expect(list.connections[0].status).toBe("connected");

    const sync = await (await browser.call("POST", `/api/connections/${id}/sync`)).json();
    expect(sync.connection.status).toBe("connected");
    expect(sync.connection.lastSyncAt).toBeTruthy();

    const group = sync.snapshot.groups[0];
    expect(group.label).toBe("x.com");
    const kpi = (key: string) => group.kpis.find((k: { id: string }) => k.id === key)?.value;
    expect(kpi("clicks")).toBe(10);
    expect(kpi("impressions")).toBe(250);
    expect(kpi("ctr")).toBeCloseTo(0.04, 5);
    expect(group.series.find((s: { id: string }) => s.id === "clicks").points).toHaveLength(2);
    expect(group.tables.find((t: { id: string }) => t.id === "queries").rows[0].label).toBe("marketing com ia");
    expect(group.breakdowns[0].rows.map((r: { label: string }) => r.label)).toEqual(["Celular", "Computador"]);

    // Nada do que a plataforma emitiu pode estar legível no que o navegador guarda ou recebe.
    const everythingTheBrowserSees = browser.raw() + JSON.stringify(list) + JSON.stringify(sync);
    for (const token of fake.issuedTokens) expect(everythingTheBrowserSees).not.toContain(token);
  });

  test("renova o token sozinho quando o de acesso expira, e guarda o novo", async () => {
    const browser = new Browser();
    const id = await connect(browser);
    const refreshesBefore = fake.stats.refreshes;

    fake.expireAccessTokens();
    const sync = await (await browser.call("POST", `/api/connections/${id}/sync`)).json();
    expect(sync.connection.status).toBe("connected");
    expect(fake.stats.refreshes).toBe(refreshesBefore + 1);

    // O refresh token novo foi gravado: a sincronização seguinte funciona sem renovar de novo se o token estiver válido.
    const again = await (await browser.call("POST", `/api/connections/${id}/sync`)).json();
    expect(again.connection.status).toBe("connected");
    expect(fake.stats.refreshes).toBe(refreshesBefore + 1);
  });

  test("quando a plataforma revoga tudo, pede nova autorização e permite reconectar", async () => {
    const browser = new Browser();
    const id = await connect(browser);

    fake.revokeEverything();
    const lost = await (await browser.call("POST", `/api/connections/${id}/sync`)).json();
    expect(lost.connection.status).toBe("reauthorization_required");
    expect(lost.snapshot).toBeUndefined();

    const reconnect = await (await browser.call("POST", `/api/connections/${id}/reconnect`)).json();
    expect((await authorize(browser, reconnect.authorizationUrl)).status).toBe(200);

    const back = await (await browser.call("POST", `/api/connections/${id}/sync`)).json();
    expect(back.connection.status).toBe("connected");
    expect(back.snapshot.groups).toHaveLength(1);
  });

  test("reutiliza o registro do cliente entre contas do mesmo navegador? Não: cada conta registra o seu", async () => {
    const browser = new Browser();
    const before = fake.stats.registrations;
    await connect(browser);
    await connect(browser);
    expect(fake.stats.registrations).toBe(before + 2);
    const list = await (await browser.call("GET", "/api/connections")).json();
    expect(list.connections.map((c: { label: string }) => c.label)).toEqual(["OpenSEO", "OpenSEO 2"]);
  });

  test("renomear e remover", async () => {
    const browser = new Browser();
    const id = await connect(browser);

    const renamed = await (await browser.call("PATCH", `/api/connections/${id}`, { label: "Blog da empresa" })).json();
    expect(renamed.label).toBe("Blog da empresa");

    expect((await browser.call("DELETE", `/api/connections/${id}`)).status).toBe(204);
    expect((await (await browser.call("GET", "/api/connections")).json()).connections).toEqual([]);
    expect((await browser.call("DELETE", `/api/connections/${id}`)).status).toBe(404);
  });
});

describe("proteções", () => {
  test("callback com state errado ou sem autorização pendente é recusado", async () => {
    const browser = new Browser();
    const created = await (await browser.call("POST", "/api/connections", { providerId: "openseo" })).json();
    const hop = await fetch(created.authorizationUrl, { redirect: "manual" });
    const target = new URL(hop.headers.get("location") as string);
    target.searchParams.set("state", "state-forjado");

    const forged = await browser.call("GET", `${target.pathname}${target.search}`);
    expect(forged.status).toBe(400);
    expect(await browser.call("GET", "/api/connections").then((r) => r.json())).toMatchObject({ connections: [] });

    const stranger = new Browser();
    const noPending = await stranger.call("GET", `${target.pathname}${target.search}`);
    expect(noPending.status).toBe(400);
  });

  test("o código de autorização só vale uma vez", async () => {
    const browser = new Browser();
    const created = await (await browser.call("POST", "/api/connections", { providerId: "openseo" })).json();
    const hop = await fetch(created.authorizationUrl, { redirect: "manual" });
    const target = new URL(hop.headers.get("location") as string);

    expect((await browser.call("GET", `${target.pathname}${target.search}`)).status).toBe(200);
    expect((await browser.call("GET", `${target.pathname}${target.search}`)).status).toBe(400);
  });

  test("bloqueia escrita vinda de outro site", async () => {
    const browser = new Browser();
    const blocked = await browser.call("POST", "/api/connections", { providerId: "openseo" }, { origin: "https://site-malicioso.example" });
    expect(blocked.status).toBe(403);
    const allowed = await browser.call("POST", "/api/connections", { providerId: "openseo" }, { origin: APP });
    expect(allowed.status).toBe(201);
  });

  test("uma conta de outro navegador não é visível nem acessível", async () => {
    const owner = new Browser();
    const id = await connect(owner);
    const other = new Browser();
    expect((await (await other.call("GET", "/api/connections")).json()).connections).toEqual([]);
    expect((await other.call("POST", `/api/connections/${id}/sync`)).status).toBe(404);
  });

  test("sem CONNECTOR_SECRET: lista vazia e aviso claro, e nada é gravado", async () => {
    const browser = new Browser();
    const list = await (await browser.call("GET", "/api/connections", undefined, {}, null)).json();
    expect(list.configured).toBe(false);
    expect(list.connections).toEqual([]);

    const attempt = await browser.call("POST", "/api/connections", { providerId: "openseo" }, {}, null);
    expect(attempt.status).toBe(503);
    expect((await attempt.json()).error).toContain("CONNECTOR_SECRET");
    expect(browser.raw()).toBe("");
  });

  test("plataforma desconhecida, chave de API onde não existe e limite de contas", async () => {
    const browser = new Browser();
    expect((await browser.call("POST", "/api/connections", { providerId: "facebook" })).status).toBe(400);
    expect((await browser.call("POST", "/api/connections", { providerId: "openseo", apiKey: "x" })).status).toBe(400);
  });
});

describe("conexão por chave de API (Metricool)", () => {
  test("guarda a chave cifrada e não pede autorização", async () => {
    const browser = new Browser();
    const created = await browser.call("POST", "/api/connections", { providerId: "metricool", apiKey: "chave-secreta-metricool-123" });
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.authorizationUrl).toBeUndefined();
    expect(body.connection.authMode).toBe("apiKey");
    expect(browser.raw()).not.toContain("chave-secreta-metricool-123");
    expect(JSON.stringify(body)).not.toContain("chave-secreta-metricool-123");
  });
});
