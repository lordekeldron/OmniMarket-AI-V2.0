import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError, type OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { parseToolPayload, type Json } from './parse';
import type { ProviderConfig } from './providers';

/** O servidor exige que o usuário autorize de novo (token expirado e sem renovação). */
export class ReauthorizationRequiredError extends Error {
  constructor() {
    super('A plataforma pediu uma nova autorização.');
    this.name = 'ReauthorizationRequiredError';
  }
}

export interface ToolResult {
  /** A ferramenta sinalizou erro (isError) — o texto traz a explicação. */
  isError: boolean;
  text: string;
  /** Dados estruturados, quando o texto pôde ser interpretado. */
  data: Json | undefined;
}

export interface ToolInfo {
  name: string;
  description?: string | undefined;
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] } | undefined;
}

export interface McpToolClient {
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolResult>;
  listTools(): Promise<ToolInfo[]>;
}

const CONNECT_TIMEOUT_MS = 20_000;
const CALL_TIMEOUT_MS = 60_000;

export function wrapClient(client: Client): McpToolClient {
  return {
    async callTool(name, args = {}) {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: CALL_TIMEOUT_MS });
      const content = Array.isArray(result.content) ? result.content : [];
      const text = content
        .filter((part): part is { type: 'text'; text: string } => part?.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n');
      const structured = (result as { structuredContent?: unknown }).structuredContent;
      const data = structured !== undefined && structured !== null ? (structured as Json) : parseToolPayload(text);
      return { isError: Boolean(result.isError), text, data };
    },
    async listTools() {
      const tools: ToolInfo[] = [];
      let cursor: string | undefined;
      do {
        const page = await client.listTools(cursor ? { cursor } : undefined, { timeout: CALL_TIMEOUT_MS });
        for (const t of page.tools) {
          tools.push({ name: t.name, description: t.description, inputSchema: t.inputSchema as ToolInfo['inputSchema'] });
        }
        cursor = page.nextCursor;
      } while (cursor);
      return tools;
    },
  };
}

interface OpenParams {
  provider: ProviderConfig;
  /** Conexão por OAuth. */
  authProvider?: OAuthClientProvider & { reauthorizationRequested?: boolean };
  /** Conexão por chave de API (usa provider.apiKeyHeader). */
  apiKey?: string;
  /** Para testes: substitui o transporte HTTP. */
  transport?: Transport;
}

export interface OpenClient {
  client: McpToolClient;
  close(): Promise<void>;
}

export async function openMcpClient({ provider, authProvider, apiKey, transport }: OpenParams): Promise<OpenClient> {
  const headers: Record<string, string> = {};
  if (apiKey && provider.apiKeyHeader) headers[provider.apiKeyHeader] = apiKey;

  const effectiveTransport =
    transport ??
    new StreamableHTTPClientTransport(new URL(provider.mcpUrl), {
      ...(authProvider ? { authProvider } : {}),
      ...(Object.keys(headers).length ? { requestInit: { headers } } : {}),
    });

  const client = new Client({ name: 'omnimarket-ai', version: '1.0.0' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
  try {
    await client.connect(effectiveTransport, { timeout: CONNECT_TIMEOUT_MS });
  } catch (err) {
    await client.close().catch(() => undefined);
    if (err instanceof UnauthorizedError || authProvider?.reauthorizationRequested) throw new ReauthorizationRequiredError();
    throw err;
  }

  return {
    client: wrapClient(client),
    close: () => client.close().catch(() => undefined),
  };
}

/** Mensagem curta e segura (sem segredos) para mostrar ao usuário. */
export function describeError(err: unknown): string {
  if (err instanceof ReauthorizationRequiredError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, ' ').slice(0, 240);
}
