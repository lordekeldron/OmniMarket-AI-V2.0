import type { ProviderId, ProviderInfo } from '../../omni/types/connectors';

export interface ProviderConfig extends ProviderInfo {
  /** Endereço do servidor MCP remoto (Streamable HTTP). */
  mcpUrl: string;
  /** Prefixo das variáveis de ambiente (ex.: SUPERMETRICS → SUPERMETRICS_MCP_URL). */
  envPrefix: string;
  /** Cabeçalho usado quando a conexão é por chave de API. */
  apiKeyHeader?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'supermetrics',
    name: 'Supermetrics',
    category: 'analytics',
    summary: 'Investimento, cliques e conversões de Google Ads, Meta Ads, TikTok Ads e outras fontes ligadas à sua conta.',
    emptyHint: 'Ligue ao menos uma fonte de dados (por exemplo Google Ads ou Meta Ads) no painel do Supermetrics e atualize.',
    authModes: ['oauth'],
    mcpUrl: 'https://mcp.supermetrics.com/mcp',
    envPrefix: 'SUPERMETRICS',
  },
  {
    id: 'metricool',
    name: 'Metricool',
    category: 'social',
    summary: 'Seguidores, alcance e engajamento por rede social, mais as próximas publicações agendadas.',
    emptyHint: 'Conecte ao menos uma rede social à sua marca no Metricool e atualize.',
    authModes: ['oauth', 'apiKey'],
    note: 'Se preferir não autorizar pelo navegador, use a chave de API em Metricool > Configurações da conta > API.',
    mcpUrl: 'https://ai.metricool.com/mcp',
    envPrefix: 'METRICOOL',
    apiKeyHeader: 'X-Mc-Auth',
  },
  {
    id: 'openseo',
    name: 'OpenSEO',
    category: 'seo',
    summary: 'Cliques, impressões e posição média no Google, consultas e páginas que mais trazem tráfego, auditorias do site.',
    emptyHint: 'Crie um projeto com o domínio do seu site no OpenSEO e conecte o Google Search Console a ele.',
    authModes: ['oauth'],
    note: 'A sincronização usa só consultas gratuitas e não consome créditos do OpenSEO.',
    mcpUrl: 'https://app.openseo.so/mcp',
    envPrefix: 'OPENSEO',
  },
  {
    id: 'adspirer',
    name: 'Adspirer',
    category: 'ads',
    summary: 'Desempenho de campanhas pagas em Google, Meta, LinkedIn e TikTok, e quais plataformas estão ligadas.',
    emptyHint: 'Ligue uma conta de anúncios no Adspirer e atualize.',
    authModes: ['oauth'],
    note: 'Você precisa de uma conta no Adspirer. A conexão fica pronta aqui e funciona assim que a conta existir.',
    mcpUrl: 'https://mcp.adspirer.com/mcp',
    envPrefix: 'ADSPIRER',
  },
];

export function listProviders(): ProviderConfig[] {
  return PROVIDERS.map((p) => ({ ...p, mcpUrl: resolveMcpUrl(p) }));
}

export function getProvider(id: string): ProviderConfig | undefined {
  const found = PROVIDERS.find((p) => p.id === id);
  return found ? { ...found, mcpUrl: resolveMcpUrl(found) } : undefined;
}

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDERS.some((p) => p.id === value);
}

/** Versão pública, sem endereços internos nem detalhes de configuração. */
export function toPublicInfo(p: ProviderConfig): ProviderInfo {
  const { mcpUrl: _mcpUrl, envPrefix: _envPrefix, apiKeyHeader: _apiKeyHeader, ...info } = p;
  return info;
}

function resolveMcpUrl(p: ProviderConfig): string {
  return process.env[`${p.envPrefix}_MCP_URL`]?.trim() || p.mcpUrl;
}

/**
 * Credenciais OAuth pré-cadastradas, para plataformas que não aceitam registro
 * dinâmico de cliente. Se não houver, o app tenta o registro dinâmico.
 */
export function getPreregisteredClient(p: ProviderConfig): { client_id: string; client_secret?: string } | undefined {
  const client_id = process.env[`${p.envPrefix}_OAUTH_CLIENT_ID`]?.trim();
  if (!client_id) return undefined;
  const client_secret = process.env[`${p.envPrefix}_OAUTH_CLIENT_SECRET`]?.trim();
  return client_secret ? { client_id, client_secret } : { client_id };
}
