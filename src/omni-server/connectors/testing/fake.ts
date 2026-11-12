/**
 * Servidores MCP de mentira, só para testes.
 *
 *  - connectFake: servidor em memória (sem rede), para testar os adaptadores.
 *  - startFakeOAuthMcp: servidor HTTP com OAuth completo (registro dinâmico de
 *    cliente, PKCE, renovação de token) montado com as peças do próprio SDK,
 *    para testar a conexão de ponta a ponta sem depender das plataformas reais.
 */
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Server as HttpServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { InvalidGrantError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { openMcpClient, type OpenClient } from '../mcp';
import { getProvider, type ProviderConfig } from '../providers';

export interface FakeTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  /** Devolve o texto da resposta, ou { text, isError } para simular erro da ferramenta. */
  handler: (args: Record<string, unknown>) => string | { text: string; isError?: boolean };
}

function buildServer(tools: FakeTool[]): Server {
  const server = new Server({ name: 'fake-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description ?? t.name,
      inputSchema: (t.inputSchema ?? { type: 'object', properties: {} }) as { type: 'object'; properties?: Record<string, unknown> },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) return { content: [{ type: 'text' as const, text: `Ferramenta desconhecida: ${request.params.name}` }], isError: true };
    const out = tool.handler((request.params.arguments ?? {}) as Record<string, unknown>);
    const normalized = typeof out === 'string' ? { text: out, isError: false } : out;
    return { content: [{ type: 'text' as const, text: normalized.text }], isError: normalized.isError ?? false };
  });
  return server;
}

/** Cliente MCP ligado a um servidor de mentira em memória. */
export async function connectFake(tools: FakeTool[], providerId: Parameters<typeof getProvider>[0] = 'openseo'): Promise<OpenClient> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await buildServer(tools).connect(serverSide);
  return openMcpClient({ provider: getProvider(providerId) as ProviderConfig, transport: clientSide });
}

// ---------------------------------------------------------------------------

export interface FakeOAuthMcp {
  /** Endereço do endpoint MCP, para apontar o *_MCP_URL do provedor. */
  mcpUrl: string;
  stats: { registrations: number; authorizations: number; codeExchanges: number; refreshes: number; toolCalls: number };
  /** Todos os tokens já emitidos (para conferir que nunca aparecem em claro). */
  issuedTokens: string[];
  /** Faz os access tokens atuais expirarem; o refresh token continua válido. */
  expireAccessTokens(): void;
  /** Invalida access e refresh tokens: a próxima chamada exige nova autorização. */
  revokeEverything(): void;
  close(): Promise<void>;
}

export async function startFakeOAuthMcp(tools: FakeTool[]): Promise<FakeOAuthMcp> {
  const stats = { registrations: 0, authorizations: 0, codeExchanges: 0, refreshes: 0, toolCalls: 0 };
  const issuedTokens: string[] = [];
  const clients = new Map<string, OAuthClientInformationFull>();
  const codes = new Map<string, { clientId: string; challenge: string; redirectUri: string }>();
  const accessTokens = new Map<string, { clientId: string; expiresAt: number }>();
  const refreshTokens = new Map<string, string>();

  const issue = (clientId: string): OAuthTokens => {
    const access = `at_${crypto.randomBytes(16).toString('hex')}`;
    const refresh = `rt_${crypto.randomBytes(16).toString('hex')}`;
    accessTokens.set(access, { clientId, expiresAt: Date.now() + 3600_000 });
    refreshTokens.set(refresh, clientId);
    issuedTokens.push(access, refresh);
    return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600 };
  };

  const provider: OAuthServerProvider = {
    clientsStore: {
      getClient: (id) => clients.get(id),
      registerClient: (client) => {
        stats.registrations++;
        const full = { ...client, client_id: `client_${crypto.randomUUID()}`, client_id_issued_at: Math.floor(Date.now() / 1000) } as OAuthClientInformationFull;
        clients.set(full.client_id, full);
        return full;
      },
    },
    async authorize(client, params, res) {
      stats.authorizations++;
      const code = `code_${crypto.randomBytes(12).toString('hex')}`;
      codes.set(code, { clientId: client.client_id, challenge: params.codeChallenge, redirectUri: params.redirectUri });
      const target = new URL(params.redirectUri);
      target.searchParams.set('code', code);
      if (params.state) target.searchParams.set('state', params.state);
      res.redirect(target.toString()); // aprova sozinho, como um usuário já logado
    },
    async challengeForAuthorizationCode(_client, code) {
      const entry = codes.get(code);
      if (!entry) throw new InvalidGrantError('Código desconhecido.');
      return entry.challenge;
    },
    async exchangeAuthorizationCode(client, code) {
      const entry = codes.get(code);
      if (!entry || entry.clientId !== client.client_id) throw new InvalidGrantError('Código inválido.');
      codes.delete(code);
      stats.codeExchanges++;
      return issue(client.client_id);
    },
    async exchangeRefreshToken(client, refreshToken) {
      if (refreshTokens.get(refreshToken) !== client.client_id) throw new InvalidGrantError('Refresh token inválido.');
      stats.refreshes++;
      return issue(client.client_id);
    },
    async verifyAccessToken(token) {
      const entry = accessTokens.get(token);
      if (!entry || entry.expiresAt < Date.now()) throw new InvalidTokenError('Token inválido ou expirado.');
      return { token, clientId: entry.clientId, scopes: [], expiresAt: Math.floor(entry.expiresAt / 1000) };
    },
  };

  const app = express();
  let origin = '';
  const mountAt = (port: number) => {
    origin = `http://localhost:${port}`;
    const resourceServerUrl = new URL(`${origin}/mcp`);
    app.use(
      mcpAuthRouter({
        provider,
        issuerUrl: new URL(origin),
        resourceServerUrl,
        clientRegistrationOptions: { clientIdGeneration: false },
      } as Parameters<typeof mcpAuthRouter>[0]) as express.RequestHandler,
    );
    app.post(
      '/mcp',
      express.json(),
      requireBearerAuth({ verifier: provider, resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceServerUrl) }) as express.RequestHandler,
      async (req, res) => {
        stats.toolCalls++;
        const server = buildServer(tools);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined } as unknown as ConstructorParameters<typeof StreamableHTTPServerTransport>[0]);
        res.on('close', () => {
          void transport.close();
          void server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      },
    );
    app.all('/mcp', (_req, res) => void res.status(405).json({ error: 'Método não permitido.' }));
  };

  const http: HttpServer = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  mountAt((http.address() as AddressInfo).port);

  return {
    mcpUrl: `${origin}/mcp`,
    stats,
    issuedTokens,
    expireAccessTokens: () => accessTokens.forEach((v) => (v.expiresAt = 0)),
    revokeEverything: () => {
      accessTokens.clear();
      refreshTokens.clear();
    },
    close: () => new Promise((resolve) => http.close(() => resolve())),
  };
}
