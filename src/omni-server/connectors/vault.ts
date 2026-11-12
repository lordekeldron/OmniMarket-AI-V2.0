import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { ConnectionSummary } from "../../omni/types/connectors";

/**
 * Cofre sem estado: cada conta conectada vive em um cookie httpOnly cifrado
 * com AES-256-GCM. Não há disco nem banco no servidor (o app roda como Worker),
 * então o navegador carrega os segredos, mas só o servidor consegue abri-los.
 *
 * A chave vem do segredo CONNECTOR_SECRET (Lovable > Secrets). Sem ele o cofre
 * se recusa a gravar qualquer coisa.
 */

export interface ConnectionSecrets {
  tokens?: OAuthTokens;
  clientInfo?: OAuthClientInformationMixed;
  codeVerifier?: string;
  apiKey?: string;
}

export type StoredSummary = Omit<ConnectionSummary, "hasSnapshot">;

export interface ConnectionRecord {
  summary: StoredSummary;
  secrets: ConnectionSecrets;
}

/** Autorização OAuth em andamento: a conta só vira registro depois do retorno da plataforma. */
export interface PendingAuth {
  state: string;
  createdAt: number;
  record: ConnectionRecord;
}

export class VaultUnavailableError extends Error {
  constructor() {
    super("CONNECTOR_SECRET não está configurado no servidor.");
    this.name = "VaultUnavailableError";
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class Vault {
  private keyPromise: Promise<CryptoKey> | undefined;

  constructor(private readonly secret: string | undefined) {}

  get available(): boolean {
    return Boolean(this.secret && this.secret.trim().length >= 16);
  }

  /**
   * `purpose` (o nome do cookie) entra como dado autenticado: um cookie de
   * autorização pendente não pode ser reaproveitado como cookie de conta.
   */
  async seal(value: unknown, purpose: string): Promise<string> {
    const key = await this.key();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = encoder.encode(JSON.stringify(value));
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(purpose) }, key, plain),
    );
    return `${toBase64Url(iv)}.${toBase64Url(cipher)}`;
  }

  /** Devolve undefined para qualquer cookie ilegível, adulterado ou de outra chave. */
  async open<T>(payload: string, purpose: string): Promise<T | undefined> {
    if (!this.available) return undefined;
    const [ivPart, cipherPart] = payload.split(".");
    if (!ivPart || !cipherPart) return undefined;
    try {
      const key = await this.key();
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64Url(ivPart), additionalData: encoder.encode(purpose) },
        key,
        fromBase64Url(cipherPart),
      );
      return JSON.parse(decoder.decode(plain)) as T;
    } catch {
      return undefined;
    }
  }

  private key(): Promise<CryptoKey> {
    if (!this.available) return Promise.reject(new VaultUnavailableError());
    this.keyPromise ??= crypto.subtle
      .digest("SHA-256", encoder.encode(this.secret as string))
      .then((hash) => crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]));
    return this.keyPromise;
  }
}
