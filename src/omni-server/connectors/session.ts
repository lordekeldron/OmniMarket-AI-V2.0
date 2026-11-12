import type { ConnectionRecord, PendingAuth, Vault } from "./vault";

/** Todos os cookies ficam restritos a este caminho: não viajam em páginas nem imagens. */
export const COOKIE_PATH = "/api/connections";
const CONNECTION_PREFIX = "omni_c_";
const PENDING_NAME = "omni_oauth";
const ID_PATTERN = /^[a-f0-9]{16}$/;
const MAX_COOKIE_VALUE = 3800;
const PENDING_TTL_MS = 15 * 60 * 1000;
const CONNECTION_MAX_AGE = 180 * 24 * 3600;

export class CookieTooLargeError extends Error {
  constructor() {
    super("Os dados desta conexão ficaram grandes demais para o navegador guardar.");
    this.name = "CookieTooLargeError";
  }
}

function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    out.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return out;
}

/**
 * Lê as contas dos cookies da requisição e acumula os Set-Cookie da resposta.
 * Cada conta tem o próprio cookie (omni_c_<id>), então uma falha de tamanho
 * ou de leitura afeta uma conta só.
 */
export class CookieSession {
  private readonly incoming: Map<string, string>;
  private readonly outgoing: string[] = [];
  private cache: Map<string, ConnectionRecord> | undefined;

  constructor(
    cookieHeader: string | null,
    private readonly vault: Vault,
    private readonly secure: boolean,
  ) {
    this.incoming = parseCookies(cookieHeader);
  }

  async records(): Promise<ConnectionRecord[]> {
    const all = await this.load();
    return [...all.values()].sort((a, b) => a.summary.createdAt.localeCompare(b.summary.createdAt));
  }

  async get(id: string): Promise<ConnectionRecord | undefined> {
    return (await this.load()).get(id);
  }

  async put(record: ConnectionRecord): Promise<void> {
    const name = this.nameFor(record.summary.id);
    const value = await this.vault.seal(record, name);
    if (value.length > MAX_COOKIE_VALUE) throw new CookieTooLargeError();
    (await this.load()).set(record.summary.id, record);
    this.outgoing.push(this.serialize(name, value, CONNECTION_MAX_AGE));
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.load();
    if (!all.delete(id)) return false;
    this.outgoing.push(this.serialize(this.nameFor(id), "", 0));
    return true;
  }

  async pending(): Promise<PendingAuth | undefined> {
    const raw = this.incoming.get(PENDING_NAME);
    if (!raw) return undefined;
    const value = await this.vault.open<PendingAuth>(raw, PENDING_NAME);
    if (!value || Date.now() - value.createdAt > PENDING_TTL_MS) return undefined;
    return value;
  }

  async setPending(pending: PendingAuth): Promise<void> {
    const value = await this.vault.seal(pending, PENDING_NAME);
    if (value.length > MAX_COOKIE_VALUE) throw new CookieTooLargeError();
    this.outgoing.push(this.serialize(PENDING_NAME, value, PENDING_TTL_MS / 1000));
  }

  clearPending(): void {
    this.outgoing.push(this.serialize(PENDING_NAME, "", 0));
  }

  /** Cabeçalhos Set-Cookie a anexar à resposta (cada um precisa ir em um append separado). */
  setCookieHeaders(): string[] {
    return [...this.outgoing];
  }

  static newConnectionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private nameFor(id: string): string {
    return `${CONNECTION_PREFIX}${id}`;
  }

  private async load(): Promise<Map<string, ConnectionRecord>> {
    if (this.cache) return this.cache;
    const all = new Map<string, ConnectionRecord>();
    for (const [name, raw] of this.incoming) {
      if (!name.startsWith(CONNECTION_PREFIX)) continue;
      const id = name.slice(CONNECTION_PREFIX.length);
      if (!ID_PATTERN.test(id)) continue;
      const record = await this.vault.open<ConnectionRecord>(raw, name);
      if (record?.summary?.id === id) all.set(id, record);
    }
    this.cache = all;
    return all;
  }

  private serialize(name: string, value: string, maxAge: number): string {
    const parts = [`${name}=${value}`, `Path=${COOKIE_PATH}`, "HttpOnly", "SameSite=Lax", `Max-Age=${Math.floor(maxAge)}`];
    if (this.secure) parts.push("Secure");
    return parts.join("; ");
  }
}
