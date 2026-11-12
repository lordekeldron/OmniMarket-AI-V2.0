import type { DataTable, Kpi, Notice, SnapshotGroup } from '../../../omni/types/connectors';
import { findRecords, pickNumber, pickString, type JsonObject } from '../parse';
import type { ToolInfo } from '../mcp';
import { callSafe, newGroup, safeDivide, snippet, sum, type Adapter } from './common';

/**
 * Adspirer — plataformas ligadas e desempenho de campanhas.
 *
 * Sem conta no Adspirer não foi possível observar este servidor. O adaptador
 * é guiado pela descoberta: lê a lista de ferramentas e o esquema de cada uma
 * em tempo de execução, e só preenche parâmetros que reconhece com segurança.
 * Qualquer coisa que não reconhecer vira aviso para o usuário.
 */

const PERFORMANCE_TOOLS = ['get_campaign_performance', 'get_meta_campaign_performance'];

export const syncAdspirer: Adapter = async ({ client, period }) => {
  const notices: Notice[] = [];
  const groups: SnapshotGroup[] = [];

  const tools = await client.listTools();
  const byName = new Map(tools.map((t) => [t.name, t]));

  if (byName.has('get_connections_status')) {
    const status = await callSafe(client, 'get_connections_status', {});
    if (status.ok) {
      const records = findRecords(status.result.data, 2);
      if (records.length > 0) {
        groups.push(connectionsGroup(records));
      } else if (status.result.text.trim()) {
        notices.push({ level: 'info', text: `Plataformas ligadas ao Adspirer: ${snippet(status.result.text, 200)}` });
      }
    } else {
      notices.push({ level: 'warning', text: `Não consegui consultar as plataformas ligadas: ${status.error}` });
    }
  }

  let anyPerformance = false;
  for (const name of PERFORMANCE_TOOLS) {
    const tool = byName.get(name);
    if (!tool) continue;

    const args = buildArgs(tool, period);
    if (!args) {
      notices.push({ level: 'info', text: `A ferramenta ${name} exige parâmetros que este app ainda não sabe preencher.` });
      continue;
    }

    const call = await callSafe(client, name, args);
    if (!call.ok) {
      notices.push({ level: 'warning', text: `${name}: ${call.error}` });
      continue;
    }

    const records = findRecords(call.result.data, 2);
    if (records.length === 0) {
      notices.push({ level: 'info', text: `${name}: nenhuma campanha encontrada no período.` });
      continue;
    }
    anyPerformance = true;
    groups.push(...performanceGroups(name, records));
  }

  if (!anyPerformance && groups.length === 0 && notices.length === 0) {
    notices.push({ level: 'info', text: 'O Adspirer respondeu, mas ainda sem campanhas para mostrar. Ligue uma conta de anúncios no Adspirer e atualize.' });
  }
  return { groups, notices };
};

/** Monta os argumentos a partir do esquema; devolve undefined se faltar um parâmetro obrigatório desconhecido. */
export function buildArgs(tool: ToolInfo, period: { from: string; to: string }): Record<string, unknown> | undefined {
  const props = (tool.inputSchema?.properties ?? {}) as Record<string, { type?: string; enum?: unknown[] } | undefined>;
  const required = new Set(tool.inputSchema?.required ?? []);
  const args: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(props)) {
    if (/^(start_?date|date_?from|from|since)$/i.test(key)) args[key] = period.from;
    else if (/^(end_?date|date_?to|to|until)$/i.test(key)) args[key] = period.to;
    else if (/^(days|lookback_?days|date_?range_?days)$/i.test(key)) args[key] = 30;
    else if (/^(date_?range|period|time_?range)$/i.test(key) && Array.isArray(def?.enum)) {
      const options = def.enum.map(String);
      args[key] = options.find((o) => /30/.test(o)) ?? options[0];
    }
  }

  for (const key of required) if (!(key in args)) return undefined;
  return args;
}

function connectionsGroup(records: JsonObject[]): SnapshotGroup {
  const group = newGroup('connections', 'Plataformas ligadas');
  const table: DataTable = {
    id: 'connections',
    title: 'Plataformas ligadas ao Adspirer',
    columns: [
      { key: 'platform', label: 'Plataforma' },
      { key: 'status', label: 'Situação' },
      { key: 'account', label: 'Conta' },
    ],
    rows: records.slice(0, 12).map((r) => ({
      platform: pickString(r, ['platform', 'name', 'provider', 'channel']) ?? '—',
      status: statusLabel(r),
      account: pickString(r, ['account_name', 'accountName', 'account', 'account_id', 'accountId']) ?? '—',
    })),
  };
  group.tables.push(table);
  return group;
}

function statusLabel(r: JsonObject): string {
  const explicit = pickString(r, ['status', 'state']);
  if (explicit) return explicit;
  for (const key of ['connected', 'is_connected', 'isConnected']) {
    if (typeof r[key] === 'boolean') return r[key] ? 'Conectada' : 'Não conectada';
  }
  return '—';
}

function performanceGroups(toolName: string, records: JsonObject[]): SnapshotGroup[] {
  const byPlatform = new Map<string, JsonObject[]>();
  const defaultPlatform = toolName === 'get_meta_campaign_performance' ? 'Meta Ads' : 'Campanhas';
  for (const r of records) {
    const platform = pickString(r, ['platform', 'channel', 'network']) ?? defaultPlatform;
    byPlatform.set(platform, [...(byPlatform.get(platform) ?? []), r]);
  }
  return [...byPlatform].map(([platform, rows]) => buildPerformanceGroup(`${toolName}:${platform}`, platform, rows));
}

function buildPerformanceGroup(id: string, label: string, records: JsonObject[]): SnapshotGroup {
  const group = newGroup(id, label, `${records.length} campanhas`);

  const rows = records.map((r) => ({
    name: pickString(r, ['campaign_name', 'campaignName', 'name', 'campaign']) ?? '—',
    spend: pickNumber(r, ['spend', 'cost', 'amount_spent', 'amountSpent']),
    impressions: pickNumber(r, ['impressions']),
    clicks: pickNumber(r, ['clicks']),
    conversions: pickNumber(r, ['conversions', 'purchases', 'results']),
  }));

  const total = (pick: (r: (typeof rows)[number]) => number | undefined) => {
    const values = rows.map(pick).filter((n): n is number => n !== undefined);
    return values.length > 0 ? sum(values) : undefined;
  };
  const spend = total((r) => r.spend);
  const impressions = total((r) => r.impressions);
  const clicks = total((r) => r.clicks);
  const conversions = total((r) => r.conversions);

  const kpis: Kpi[] = [];
  if (spend !== undefined) kpis.push({ id: 'spend', label: 'Investimento', value: spend, unit: 'currency' });
  if (impressions !== undefined) kpis.push({ id: 'impressions', label: 'Impressões', value: impressions, unit: 'count' });
  if (clicks !== undefined) kpis.push({ id: 'clicks', label: 'Cliques', value: clicks, unit: 'count' });
  if (conversions !== undefined) kpis.push({ id: 'conversions', label: 'Conversões', value: conversions, unit: 'count' });
  const ctr = clicks !== undefined && impressions !== undefined ? safeDivide(clicks, impressions) : undefined;
  const cpa = spend !== undefined && conversions !== undefined ? safeDivide(spend, conversions) : undefined;
  if (ctr !== undefined) kpis.push({ id: 'ctr', label: 'CTR', value: ctr, unit: 'percent' });
  if (cpa !== undefined) kpis.push({ id: 'cpa', label: 'CPA', value: cpa, unit: 'currency', lowerIsBetter: true });
  group.kpis = kpis;

  const sorted = [...rows].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)).slice(0, 10);
  group.tables.push({
    id: 'campaigns',
    title: 'Campanhas por investimento',
    columns: [
      { key: 'name', label: 'Campanha' },
      { key: 'spend', label: 'Investimento', align: 'right', unit: 'currency' },
      { key: 'clicks', label: 'Cliques', align: 'right', unit: 'count' },
      { key: 'conversions', label: 'Conversões', align: 'right', unit: 'count' },
    ],
    rows: sorted.map((r) => ({ name: r.name, spend: r.spend ?? null, clicks: r.clicks ?? null, conversions: r.conversions ?? null })),
  });

  if (spend !== undefined && spend > 0) {
    group.breakdowns.push({
      id: 'spend-by-campaign',
      label: 'Investimento por campanha',
      unit: 'currency',
      rows: sorted.filter((r) => (r.spend ?? 0) > 0).slice(0, 6).map((r) => ({ label: r.name, value: r.spend as number })),
    });
  }
  return group;
}
