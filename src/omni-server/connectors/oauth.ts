import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { getPreregisteredClient, type ProviderConfig } from "./providers";
import type { ConnectionSecrets } from "./vault";

interface Options {
  provider: ProviderConfig;
  redirectUrl: string;
  /** Segredos atuais da conta; o provedor trabalha em memória e quem chama grava depois. */
  secrets: ConnectionSecrets;
  /** `state` desta autorização. Só existe quando o usuário está iniciando a conexão. */
  state?: string;
}

/**
 * OAuth do SDK de MCP, em memória. Não toca em cookie nem em disco: o serviço
 * lê `secrets` ao final (tokens renovados, registro do cliente, verificador PKCE)
 * e decide o que gravar.
 *
 * Dois modos:
 *  - iniciando a conexão (`state` presente): guarda a URL de autorização;
 *  - sincronizando (sem `state`): se a plataforma exigir novo login, só marca
 *    `reauthorizationRequested`.
 */
export class MemoryOAuthProvider implements OAuthClientProvider {
  authorizationUrl: URL | undefined;
  reauthorizationRequested = false;
  secrets: ConnectionSecrets;

  constructor(private readonly opts: Options) {
    this.secrets = { ...opts.secrets };
  }

  get redirectUrl(): string {
    return this.opts.redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "OmniMarket AI",
      redirect_uris: [this.opts.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  state(): string {
    // Na sincronização o SDK também monta uma URL de login (que descartamos) ao perder a
    // autorização; ele exige um state, mas nenhum fluxo real depende deste valor.
    return this.opts.state ?? crypto.randomUUID();
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    const preregistered = getPreregisteredClient(this.opts.provider);
    if (preregistered) return preregistered;

    const stored = this.secrets.clientInfo;
    if (!stored) return undefined;
    // Registro feito para outro endereço do app (prévia x publicado): precisa registrar de novo.
    const uris = (stored as { redirect_uris?: string[] }).redirect_uris;
    if (Array.isArray(uris) && !uris.includes(this.opts.redirectUrl)) return undefined;
    return stored;
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    this.secrets = { ...this.secrets, clientInfo: info };
  }

  tokens(): OAuthTokens | undefined {
    return this.secrets.tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    // O verificador PKCE só serve para a troca de código; descarta depois dela.
    const { codeVerifier: _used, ...rest } = this.secrets;
    this.secrets = { ...rest, tokens };
  }

  redirectToAuthorization(url: URL): void {
    if (this.opts.state) this.authorizationUrl = url;
    else this.reauthorizationRequested = true;
  }

  saveCodeVerifier(verifier: string): void {
    this.secrets = { ...this.secrets, codeVerifier: verifier };
  }

  codeVerifier(): string {
    const verifier = this.secrets.codeVerifier;
    if (!verifier) throw new Error("Verificador PKCE ausente: reinicie a conexão.");
    return verifier;
  }

  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): void {
    const next = { ...this.secrets };
    if (scope === "all" || scope === "client") delete next.clientInfo;
    if (scope === "all" || scope === "tokens") delete next.tokens;
    if (scope === "all" || scope === "verifier") delete next.codeVerifier;
    this.secrets = next;
  }
}
