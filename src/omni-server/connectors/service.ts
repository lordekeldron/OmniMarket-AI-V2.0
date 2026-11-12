import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ConnectionSummary,
  CreateConnectionRequest,
  CreateConnectionResponse,
  ProviderInfo,
  Snapshot,
} from "../../omni/types/connectors";
import { ADAPTERS } from "./adapters";
import { lastDays } from "./adapters/common";
import { describeError, openMcpClient, ReauthorizationRequiredError } from "./mcp";
import { MemoryOAuthProvider } from "./oauth";
import { getProvider, isProviderId, listProviders, toPublicInfo, type ProviderConfig } from "./providers";
import { CookieSession } from "./session";
import type { ConnectionRecord, StoredSummary } from "./vault";

const MAX_CONNECTIONS = 8;
const MAX_LABEL_LENGTH = 60;
const SYNC_TIMEOUT_MS = 90_000;
const SYNC_DAYS = 30;

export class ConnectorError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 | 429 | 502 | 503 = 400,
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

interface Deps {
  /** URL que as plataformas usam para devolver o usuário; precisa estar liberada lá. */
  redirectUrl: string;
  now?: () => Date;
  /** Só para testes: substitui o transporte HTTP do cliente MCP. */
  transportFactory?: (provider: ProviderConfig) => Transport | undefined;
}

export function toSummary(record: ConnectionRecord): ConnectionSummary {
  return { ...record.summary };
}

export class ConnectorService {
  constructor(private readonly deps: Deps) {}

  providers(): ProviderInfo[] {
    return listProviders().map(toPublicInfo);
  }

  async list(session: CookieSession): Promise<ConnectionSummary[]> {
    return (await session.records()).map(toSummary);
  }

  async create(session: CookieSession, request: CreateConnectionRequest): Promise<CreateConnectionResponse> {
    if (!isProviderId(request.providerId)) throw new ConnectorError("Plataforma desconhecida.");
    const provider = getProvider(request.providerId) as ProviderConfig;

    const existing = await session.records();
    if (existing.length >= MAX_CONNECTIONS) {
      throw new ConnectorError(`Limite de ${MAX_CONNECTIONS} contas conectadas atingido.`, 429);
    }

    const apiKey = typeof request.apiKey === "string" ? request.apiKey.trim() : "";
    if (apiKey && !provider.authModes.includes("apiKey")) {
      throw new ConnectorError(`${provider.name} não aceita conexão por chave de API.`);
    }

    const summary: StoredSummary = {
      id: CookieSession.newConnectionId(),
      providerId: provider.id,
      label: uniqueLabel(existing, provider, request.label),
      authMode: apiKey ? "apiKey" : "oauth",
      status: apiKey ? "connected" : "awaiting_authorization",
      createdAt: this.now().toISOString(),
    };

    if (apiKey) {
      const record: ConnectionRecord = { summary, secrets: { apiKey } };
      await session.put(record);
      return { connection: toSummary(record) };
    }

    const record: ConnectionRecord = { summary, secrets: {} };
    const authorizationUrl = await this.beginAuthorization(session, provider, record);
    return { connection: toSummary(record), authorizationUrl };
  }

  /** Gera uma nova URL de autorização para uma conta cuja autorização expirou. */
  async reconnect(session: CookieSession, id: string): Promise<{ authorizationUrl: string }> {
    const record = await session.get(id);
    if (!record) throw new ConnectorError("Conta não encontrada.", 404);
    if (record.summary.authMode !== "oauth") {
      throw new ConnectorError("Esta conta usa chave de API; remova e conecte de novo com outra chave.", 409);
    }
    const provider = getProvider(record.summary.providerId) as ProviderConfig;
    // Começa do zero: tokens antigos não valem mais, o registro do cliente é reaproveitado.
    const fresh: ConnectionRecord = {
      summary: { ...record.summary, status: "awaiting_authorization" },
      secrets: record.secrets.clientInfo ? { clientInfo: record.secrets.clientInfo } : {},
    };
    delete fresh.summary.error;
    return { authorizationUrl: await this.beginAuthorization(session, provider, fresh) };
  }

  /** Conclui o OAuth: troca o código por tokens e passa a guardar a conta. */
  async completeAuthorization(session: CookieSession, state: string, code: string): Promise<ConnectionSummary> {
    const pending = await session.pending();
    if (!pending || !safeEqual(pending.state, state)) {
      throw new ConnectorError("Autorização inválida ou expirada. Inicie a conexão de novo.");
    }

    const provider = getProvider(pending.record.summary.providerId) as ProviderConfig;
    const oauth = this.oauth(provider, pending.record.secrets);
    try {
      const result = await auth(oauth, { serverUrl: provider.mcpUrl, authorizationCode: code });
      if (result !== "AUTHORIZED") throw new Error("A plataforma não concluiu a autorização.");
    } catch (err) {
      session.clearPending();
      throw new ConnectorError(
        `Falha ao concluir a autorização com ${provider.name}: ${describeError(err)}`,
        502,
      );
    }

    const summary: StoredSummary = { ...pending.record.summary, status: "connected" };
    delete summary.error;
    const record: ConnectionRecord = { summary, secrets: oauth.secrets };
    await session.put(record);
    session.clearPending();
    return toSummary(record);
  }

  /** O usuário recusou, ou a plataforma devolveu erro no retorno do OAuth. */
  async failAuthorization(session: CookieSession, state: string): Promise<void> {
    const pending = await session.pending();
    if (pending && safeEqual(pending.state, state)) session.clearPending();
  }

  /** Busca os dados da conta. Grava os tokens renovados mesmo quando a busca falha. */
  async sync(session: CookieSession, id: string): Promise<{ connection: ConnectionSummary; snapshot?: Snapshot }> {
    const record = await session.get(id);
    if (!record) throw new ConnectorError("Conta não encontrada.", 404);
    const provider = getProvider(record.summary.providerId) as ProviderConfig;

    const oauth = record.summary.authMode === "oauth" ? this.oauth(provider, record.secrets) : undefined;
    let snapshot: Snapshot | undefined;
    let summary: StoredSummary = { ...record.summary };

    try {
      const opened = await openMcpClient({
        provider,
        ...(oauth ? { authProvider: oauth } : {}),
        ...(record.secrets.apiKey ? { apiKey: record.secrets.apiKey } : {}),
        ...(this.transport(provider) ? { transport: this.transport(provider) as Transport } : {}),
      });
      try {
        const now = this.now();
        const period = lastDays(now, SYNC_DAYS);
        const output = await withTimeout(ADAPTERS[provider.id]({ client: opened.client, period, now }), SYNC_TIMEOUT_MS);
        snapshot = { connectionId: id, providerId: provider.id, fetchedAt: now.toISOString(), period, ...output };
        summary = { ...summary, status: "connected", lastSyncAt: snapshot.fetchedAt };
        delete summary.error;
      } finally {
        await opened.close();
      }
    } catch (err) {
      if (err instanceof ReauthorizationRequiredError || err instanceof UnauthorizedError || oauth?.reauthorizationRequested) {
        summary = { ...summary, status: "reauthorization_required", error: "A autorização expirou. Reconecte a conta." };
      } else {
        summary = { ...summary, status: "error", error: describeError(err) };
      }
    }

    // Tokens renovados durante a busca precisam ser guardados, senão a próxima busca pede login de novo.
    await session.put({ summary, secrets: oauth ? oauth.secrets : record.secrets });
    return { connection: { ...summary }, ...(snapshot ? { snapshot } : {}) };
  }

  async rename(session: CookieSession, id: string, label: string): Promise<ConnectionSummary> {
    const clean = label.trim().slice(0, MAX_LABEL_LENGTH);
    if (!clean) throw new ConnectorError("Dê um nome para a conta.");
    const record = await session.get(id);
    if (!record) throw new ConnectorError("Conta não encontrada.", 404);
    const next: ConnectionRecord = { ...record, summary: { ...record.summary, label: clean } };
    await session.put(next);
    return toSummary(next);
  }

  async remove(session: CookieSession, id: string): Promise<void> {
    if (!(await session.remove(id))) throw new ConnectorError("Conta não encontrada.", 404);
  }

  // -------------------------------------------------------------------------

  private async beginAuthorization(session: CookieSession, provider: ProviderConfig, record: ConnectionRecord): Promise<string> {
    const state = randomToken();
    const oauth = this.oauth(provider, record.secrets, state);
    try {
      const result = await auth(oauth, { serverUrl: provider.mcpUrl });
      if (result === "AUTHORIZED") throw new ConnectorError("Esta conta já está autorizada.", 409);
      if (!oauth.authorizationUrl) throw new Error("A plataforma não devolveu um endereço de autorização.");
    } catch (err) {
      if (err instanceof ConnectorError) throw err;
      throw this.startFailure(provider, err);
    }

    await session.setPending({
      state,
      createdAt: Date.now(),
      record: { summary: record.summary, secrets: oauth.secrets },
    });
    return (oauth.authorizationUrl as URL).toString();
  }

  private startFailure(provider: ProviderConfig, err: unknown): ConnectorError {
    const detail = describeError(err);
    const registration = /regist|client_id|client id/i.test(detail)
      ? ` Se a plataforma não aceita cadastro automático de aplicativos, configure ${provider.envPrefix}_OAUTH_CLIENT_ID (e ${provider.envPrefix}_OAUTH_CLIENT_SECRET, se houver) com um aplicativo OAuth criado nela.`
      : "";
    return new ConnectorError(`Não consegui iniciar a conexão com ${provider.name}: ${detail}.${registration}`, 502);
  }

  private oauth(provider: ProviderConfig, secrets: ConnectionRecord["secrets"], state?: string): MemoryOAuthProvider {
    return new MemoryOAuthProvider({
      provider,
      redirectUrl: this.deps.redirectUrl,
      secrets,
      ...(state ? { state } : {}),
    });
  }

  private transport(provider: ProviderConfig): Transport | undefined {
    return this.deps.transportFactory?.(provider);
  }

  private now(): Date {
    return this.deps.now ? this.deps.now() : new Date();
  }
}

function uniqueLabel(existing: ConnectionRecord[], provider: ProviderConfig, requested?: string): string {
  const taken = new Set(existing.map((r) => r.summary.label.toLowerCase()));
  const base = (requested ?? "").trim().slice(0, MAX_LABEL_LENGTH) || provider.name;
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${CookieSession.newConnectionId().slice(0, 4)}`;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Comparação em tempo constante para o `state` do OAuth. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("A sincronização demorou demais e foi interrompida.")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
