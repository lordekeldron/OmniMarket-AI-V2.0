/**
 * Tipos compartilhados entre o servidor (server/connectors) e a interface.
 * Nada aqui contém segredos: tokens e chaves nunca saem do servidor.
 */

export type ProviderId = 'supermetrics' | 'metricool' | 'openseo' | 'adspirer';

export type ProviderCategory = 'analytics' | 'social' | 'seo' | 'ads';

export type AuthMode = 'oauth' | 'apiKey';

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  category: ProviderCategory;
  /** O que esta plataforma traz para dentro do OmniMarket. */
  summary: string;
  /** O que o usuário deve fazer quando a conta conecta mas não há dados. */
  emptyHint: string;
  /** Formas de conexão aceitas. A primeira é a padrão. */
  authModes: AuthMode[];
  /** Observação específica da plataforma, exibida no diálogo de conexão. */
  note?: string;
}

export type ConnectionStatus =
  | 'awaiting_authorization'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'reauthorization_required';

export interface ConnectionSummary {
  id: string;
  providerId: ProviderId;
  label: string;
  authMode: AuthMode;
  status: ConnectionStatus;
  error?: string;
  createdAt: string;
  lastSyncAt?: string;
}

export type MetricUnit = 'count' | 'currency' | 'percent' | 'ratio' | 'position' | 'text';

export interface Kpi {
  id: string;
  label: string;
  value: number;
  unit: MetricUnit;
  /** Código ISO 4217, quando unit = currency. */
  currency?: string;
  /** Variação relativa ao período anterior (0.12 = +12%), quando conhecida. */
  delta?: number;
  /** Em métricas como posição média, valor menor é melhor. */
  lowerIsBetter?: boolean;
}

export interface SeriesPoint {
  /** ISO 8601 (YYYY-MM-DD ou data-hora). */
  date: string;
  value: number;
}

export interface TimeSeries {
  id: string;
  label: string;
  unit: MetricUnit;
  currency?: string;
  points: SeriesPoint[];
}

export interface BreakdownRow {
  label: string;
  value: number;
}

export interface Breakdown {
  id: string;
  label: string;
  unit: MetricUnit;
  currency?: string;
  rows: BreakdownRow[];
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  unit?: MetricUnit;
  currency?: string;
}

export interface DataTable {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
}

export interface Notice {
  level: 'info' | 'warning' | 'error';
  text: string;
  action?: { label: string; url: string };
}

/**
 * Um recorte dentro de uma conta: marca no Metricool, projeto no OpenSEO,
 * fonte de dados no Supermetrics, plataforma de anúncio no Adspirer.
 */
export interface SnapshotGroup {
  id: string;
  label: string;
  sublabel?: string;
  kpis: Kpi[];
  series: TimeSeries[];
  breakdowns: Breakdown[];
  tables: DataTable[];
  notices: Notice[];
}

export interface Snapshot {
  connectionId: string;
  providerId: ProviderId;
  fetchedAt: string;
  period: { from: string; to: string };
  groups: SnapshotGroup[];
  /** Avisos da conta como um todo (conta vazia, formato não reconhecido, etc.). */
  notices: Notice[];
}

export interface CreateConnectionRequest {
  providerId: ProviderId;
  label?: string;
  /** Só para provedores com authModes contendo 'apiKey'. */
  apiKey?: string;
}

export interface CreateConnectionResponse {
  connection: ConnectionSummary;
  /** Presente quando o usuário precisa autorizar na plataforma. */
  authorizationUrl?: string;
}
