import type { Kpi, Notice, SnapshotGroup } from '../../../omni/types/connectors';
import { findRecords, isObject, pickString, toIsoDate, toNumber, type Json } from '../parse';
import type { McpToolClient } from '../mcp';
import { callSafe, newGroup, safeDivide, snippet, type Adapter } from './common';

/**
 * Supermetrics — descobre as fontes de dados autenticadas, as contas de cada
 * uma e os campos disponíveis, consulta os últimos 30 dias e agrega por dia.
 *
 * Os identificadores de campo variam por fonte, então nada é fixo: cada campo é
 * escolhido a partir do que `field_discovery` devolve. Contas sem nenhuma fonte
 * autenticada (o caso hoje) resultam em um aviso claro, não em erro.
 */

type MetricKey = 'spend' | 'impressions' | 'clicks' | 'conversions' | 'sessions' | 'users';

const METRIC_CANDIDATES: Record<MetricKey, string[]> = {
  spend: ['cost', 'spend', 'amountspent', 'amount_spent'],
  impressions: ['impressions', 'impr'],
  clicks: ['clicks', 'linkclicks', 'link_clicks'],
  conversions: ['conversions', 'purchases', 'results'],
  sessions: ['sessions'],
  users: ['users', 'activeusers', 'totalusers'],
};
const DATE_CANDIDATES = ['date', 'day'];
const PREFERRED_CATEGORY = /paid media|analytics|search|seo|social/i;
const MAX_SOURCES = 4;
const MAX_ACCOUNTS = 3;
const MAX_POLLS = 8;

export const syncSupermetrics: Adapter = async ({ client }) => {
  const notices: Notice[] = [];
  const groups: SnapshotGroup[] = [];

  const discovery = await callSafe(client, 'data_source_discovery', {});
  if (!discovery.ok) throw new Error(`Não foi possível listar as fontes do Supermetrics: ${discovery.error}`);

  const sources = readSources(discovery.result.data);
  if (sources.length === 0) {
    notices.push({
      level: 'warning',
      text: `Não consegui interpretar a lista de fontes do Supermetrics. Resposta recebida: "${snippet(discovery.result.text)}"`,
    });
    return { groups, notices };
  }

  const authenticated = sources.filter((s) => /^authenticated$/i.test(s.status));
  if (authenticated.length === 0) {
    notices.push({
      level: 'info',
      text: 'Nenhuma fonte de dados está ligada a esta conta do Supermetrics ainda. Ligue Google Ads, Meta Ads ou outra fonte e atualize.',
      action: { label: 'Abrir o Supermetrics Hub', url: 'https://hub.supermetrics.com' },
    });
    return { groups, notices };
  }

  const ordered = [...authenticated].sort((a, b) => Number(PREFERRED_CATEGORY.test(b.categories)) - Number(PREFERRED_CATEGORY.test(a.categories)));
  for (const source of ordered.slice(0, MAX_SOURCES)) {
    groups.push(await syncSource(client, source, 'last_30_days'));
  }
  if (authenticated.length > MAX_SOURCES) {
    notices.push({ level: 'info', text: `Mostrando ${MAX_SOURCES} de ${authenticated.length} fontes ligadas.` });
  }
  return { groups, notices };
};

interface Source {
  id: string;
  name: string;
  status: string;
  categories: string;
}

function readSources(data: Json | undefined): Source[] {
  return findRecords(data, 2)
    .map((r) => ({
      id: pickString(r, ['id']) ?? '',
      name: pickString(r, ['name']) ?? '',
      status: pickString(r, ['authentication_status', 'authenticationStatus', 'status']) ?? '',
      categories: Array.isArray(r['categories']) ? r['categories'].join(',') : (pickString(r, ['categories']) ?? ''),
    }))
    .filter((s) => s.id && s.name && s.status);
}

async function syncSource(client: McpToolClient, source: Source, dateRange: string): Promise<SnapshotGroup> {
  const group = newGroup(source.id, source.name, source.categories || undefined);

  const accountsCall = await callSafe(client, 'accounts_discovery', { ds_id: source.id });
  const accounts = accountsCall.ok
    ? findRecords(accountsCall.result.data, 2)
        .map((r) => pickString(r, ['account_id', 'accountId', 'id']))
        .filter((id): id is string => Boolean(id))
    : [];
  if (accounts.length === 0) {
    group.notices.push({ level: 'info', text: 'Nenhuma conta encontrada nesta fonte.' });
    return group;
  }
  group.sublabel = [group.sublabel, `${Math.min(accounts.length, MAX_ACCOUNTS)} de ${accounts.length} contas`].filter(Boolean).join(' · ');

  const fieldsCall = await callSafe(client, 'field_discovery', {
    ds_id: source.id,
    filter: 'date,day,impressions,clicks,cost,spend,conversions,sessions,users',
  });
  if (!fieldsCall.ok) {
    group.notices.push({ level: 'warning', text: `Não consegui listar os campos desta fonte: ${fieldsCall.error}` });
    return group;
  }

  const fieldIds = readFieldIds(fieldsCall.result.data);
  const dateField = firstMatch(fieldIds, DATE_CANDIDATES);
  const metrics = (Object.keys(METRIC_CANDIDATES) as MetricKey[])
    .map((key) => ({ key, field: firstMatch(fieldIds, METRIC_CANDIDATES[key]) }))
    .filter((m): m is { key: MetricKey; field: string } => Boolean(m.field));

  if (!dateField || metrics.length === 0) {
    group.notices.push({ level: 'info', text: 'Esta fonte não expõe os campos padrão (data, investimento, cliques, impressões). Ela ainda não é resumida aqui.' });
    return group;
  }

  const requested = [dateField, ...metrics.map((m) => m.field)];
  const queryCall = await callSafe(client, 'data_query', {
    ds_id: source.id,
    ds_accounts: accounts.slice(0, MAX_ACCOUNTS),
    fields: requested,
    date_range_type: dateRange,
    max_rows: 500,
  });
  if (!queryCall.ok) {
    group.notices.push({ level: 'warning', text: `A consulta falhou: ${queryCall.error}` });
    return group;
  }

  let payload = queryCall.result.data;
  for (let tries = 0; tries < MAX_POLLS && needsPolling(payload); tries++) {
    const scheduleId = findScheduleId(payload);
    if (!scheduleId) break;
    const next = await callSafe(client, 'get_async_query_results', { schedule_id: scheduleId });
    if (!next.ok) {
      group.notices.push({ level: 'warning', text: `Não consegui obter o resultado: ${next.error}` });
      return group;
    }
    payload = next.result.data;
  }

  const rows = readRows(payload, requested);
  if (rows.length === 0) {
    group.notices.push({ level: 'info', text: 'A consulta terminou sem linhas nos últimos 30 dias.' });
    return group;
  }

  fillGroup(group, rows, dateField, metrics);
  group.notices.push({ level: 'info', text: 'Valores monetários estão na moeda de cada conta de anúncios.' });
  return group;
}

function readFieldIds(data: Json | undefined): string[] {
  return findRecords(data, 1)
    .map((r) => pickString(r, ['field_id', 'fieldId', 'id', 'name']) ?? '')
    .filter(Boolean);
}

function firstMatch(fieldIds: string[], candidates: string[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, '');
  for (const candidate of candidates) {
    const hit = fieldIds.find((id) => norm(id) === norm(candidate));
    if (hit) return hit;
  }
  return undefined;
}

function findScheduleId(data: Json | undefined): string | undefined {
  if (!isObject(data)) return undefined;
  const direct = data['schedule_id'];
  if (typeof direct === 'string' && direct) return direct;
  for (const value of Object.values(data)) {
    if (isObject(value) && typeof value['schedule_id'] === 'string') return value['schedule_id'];
  }
  return undefined;
}

function needsPolling(data: Json | undefined): boolean {
  if (!isObject(data)) return false;
  const status = typeof data['status'] === 'string' ? data['status'].toLowerCase() : '';
  return Boolean(findScheduleId(data)) && /^(scheduled|queued|running|pending|in_progress)$/.test(status);
}

type Row = Record<string, string | number>;

/** Converte a resposta em linhas {campo: valor}, aceitando objetos ou matriz com cabeçalho. */
export function readRows(data: Json | undefined, requested: string[]): Row[] {
  const norm = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, '');

  const records = findRecords(data, 2);
  if (records.length > 0) {
    const keys = new Map(Object.keys(records[0] ?? {}).map((k) => [norm(k), k]));
    if (requested.every((f) => keys.has(norm(f)))) {
      return records.map((r) => Object.fromEntries(requested.map((f) => [f, scalar(r[keys.get(norm(f)) as string])])));
    }
  }

  const matrix = findMatrix(data);
  if (!matrix) return [];

  // As colunas seguem a ordem pedida; se o servidor informar os IDs das colunas,
  // usa a posição real de cada campo pedido.
  const order = columnIds(data);
  const position = (field: string, fallback: number) => {
    const found = order ? order.findIndex((id) => norm(id) === norm(field)) : -1;
    return found >= 0 ? found : fallback;
  };

  const body = looksLikeHeader(matrix[0] ?? []) ? matrix.slice(1) : matrix;
  return body.map((cells) => Object.fromEntries(requested.map((field, idx) => [field, scalar(cells[position(field, idx)])])));
}

function columnIds(data: Json | undefined): string[] | undefined {
  if (!isObject(data)) return undefined;
  for (const key of ['canonical_field_ids', 'requested_field_ids']) {
    const v = data[key];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  }
  return undefined;
}

function findMatrix(data: Json | undefined): Json[][] | undefined {
  let best: Json[][] | undefined;
  const visit = (node: Json | undefined, depth: number) => {
    if (node === undefined || node === null || depth > 5) return;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every((row) => Array.isArray(row))) {
        if (!best || node.length > best.length) best = node as Json[][];
      } else node.forEach((n) => visit(n, depth + 1));
    } else if (isObject(node)) Object.values(node).forEach((n) => visit(n, depth + 1));
  };
  visit(data, 0);
  return best;
}

function looksLikeHeader(row: Json[]): boolean {
  return row.length > 0 && row.every((c) => typeof c === 'string' && toNumber(c) === undefined && !toIsoDate(c));
}

function scalar(value: Json | undefined): string | number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return '';
}

const LABELS: Record<MetricKey, string> = {
  spend: 'Investimento',
  impressions: 'Impressões',
  clicks: 'Cliques',
  conversions: 'Conversões',
  sessions: 'Sessões',
  users: 'Usuários',
};

function fillGroup(group: SnapshotGroup, rows: Row[], dateField: string, metrics: { key: MetricKey; field: string }[]): void {
  const metricKeys = metrics.map((m) => m.key);
  const fieldFor = new Map<MetricKey, string>(metrics.map((m) => [m.key, m.field]));

  const totals = new Map<MetricKey, number>();
  const daily = new Map<MetricKey, Map<string, number>>();

  for (const row of rows) {
    const date = toIsoDate(row[dateField]);
    for (const key of metricKeys) {
      const value = toNumber(row[fieldFor.get(key) as string]);
      if (value === undefined) continue;
      totals.set(key, (totals.get(key) ?? 0) + value);
      if (date) {
        const perDay = daily.get(key) ?? new Map<string, number>();
        perDay.set(date, (perDay.get(date) ?? 0) + value);
        daily.set(key, perDay);
      }
    }
  }

  const kpis: Kpi[] = [];
  for (const key of metricKeys) {
    const value = totals.get(key);
    if (value === undefined) continue;
    kpis.push({ id: key, label: LABELS[key], value, unit: key === 'spend' ? 'currency' : 'count' });
  }

  const spend = totals.get('spend');
  const clicks = totals.get('clicks');
  const impressions = totals.get('impressions');
  const conversions = totals.get('conversions');
  const ctr = clicks !== undefined && impressions !== undefined ? safeDivide(clicks, impressions) : undefined;
  const cpc = spend !== undefined && clicks !== undefined ? safeDivide(spend, clicks) : undefined;
  const cpa = spend !== undefined && conversions !== undefined ? safeDivide(spend, conversions) : undefined;
  if (ctr !== undefined) kpis.push({ id: 'ctr', label: 'CTR', value: ctr, unit: 'percent' });
  if (cpc !== undefined) kpis.push({ id: 'cpc', label: 'CPC', value: cpc, unit: 'currency', lowerIsBetter: true });
  if (cpa !== undefined) kpis.push({ id: 'cpa', label: 'CPA', value: cpa, unit: 'currency', lowerIsBetter: true });
  group.kpis = kpis;

  for (const key of metricKeys) {
    const perDay = daily.get(key);
    if (!perDay || perDay.size < 2) continue;
    group.series.push({
      id: key,
      label: LABELS[key],
      unit: key === 'spend' ? 'currency' : 'count',
      points: [...perDay].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  }
}
