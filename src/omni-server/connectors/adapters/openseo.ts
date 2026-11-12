import type { Breakdown, DataTable, Kpi, Notice, SnapshotGroup } from '../../../omni/types/connectors';
import { findRecords, findTimeSeries, pickNumber, pickString, type JsonObject } from '../parse';
import { callSafe, newGroup, safeDivide, snippet, sum, type Adapter } from './common';

/**
 * OpenSEO — usa apenas ferramentas que NÃO consomem créditos
 * (list_projects, whoami, get_search_console_performance, list_site_audits).
 * Pesquisa de palavras-chave, backlinks e visão de domínio cobram créditos e
 * ficam de fora da sincronização automática.
 */
export const syncOpenSeo: Adapter = async ({ client }) => {
  const notices: Notice[] = [];
  const groups: SnapshotGroup[] = [];

  const projectsCall = await callSafe(client, 'list_projects');
  if (!projectsCall.ok) throw new Error(`Não foi possível listar os projetos do OpenSEO: ${projectsCall.error}`);

  const projects = readProjects(projectsCall.result.data);
  if (projects.length === 0) {
    const text = projectsCall.result.text;
    const emptyAccount = /no projects yet|projects \(0\)/i.test(text);
    notices.push({
      level: emptyAccount ? 'info' : 'warning',
      text: emptyAccount
        ? 'Esta conta do OpenSEO ainda não tem projetos. Crie um com o domínio do seu site para ver os dados aqui.'
        : `Não consegui interpretar a lista de projetos do OpenSEO. Resposta recebida: "${snippet(text)}"`,
    });
  }

  const credits = await callSafe(client, 'whoami');
  if (credits.ok) {
    const match = credits.result.text.match(/credits remaining:\s*([\d.,]+)/i);
    if (match) notices.push({ level: 'info', text: `Créditos restantes no OpenSEO: ${match[1]}.` });
  }

  for (const project of projects.slice(0, 3)) {
    groups.push(await syncProject(client, project));
  }

  return { groups, notices };
};

interface Project {
  id: string;
  name: string;
  domain: string;
}

function readProjects(data: unknown): Project[] {
  const records = findRecords(data, 1);
  return records
    .map((r) => ({
      id: pickString(r, ['id', 'projectId']) ?? '',
      name: pickString(r, ['name', 'title']) ?? '',
      domain: pickString(r, ['domain', 'website', 'url']) ?? '',
    }))
    .filter((p) => p.id);
}

async function syncProject(client: Parameters<Adapter>[0]['client'], project: Project): Promise<SnapshotGroup> {
  const group = newGroup(project.id, project.domain || project.name || project.id, project.name && project.domain ? project.name : undefined);
  const base = { projectId: project.id, dateRange: 'last_28_days' };

  const [byDate, byQuery, byPage, byDevice, audits] = await Promise.all([
    callSafe(client, 'get_search_console_performance', { ...base, dimensions: ['date'], rowLimit: 100 }),
    callSafe(client, 'get_search_console_performance', { ...base, dimensions: ['query'], rowLimit: 10 }),
    callSafe(client, 'get_search_console_performance', { ...base, dimensions: ['page'], rowLimit: 10 }),
    callSafe(client, 'get_search_console_performance', { ...base, dimensions: ['device'], rowLimit: 5 }),
    callSafe(client, 'list_site_audits', { projectId: project.id }),
  ]);

  if (!byDate.ok) {
    group.notices.push({
      level: 'warning',
      text: `Search Console indisponível para este projeto: ${byDate.error}. Conecte o Google Search Console ao projeto no OpenSEO.`,
    });
  } else {
    const rows = searchConsoleRows(byDate.result.data);
    const clicks = rows.map((r) => r.clicks).filter((n): n is number => n !== undefined);
    const impressions = rows.map((r) => r.impressions).filter((n): n is number => n !== undefined);

    if (rows.length === 0) {
      group.notices.push({
        level: 'info',
        text: 'O Search Console respondeu, mas sem dados nos últimos 28 dias (sites novos levam alguns dias para aparecer).',
      });
    } else {
      const totalClicks = sum(clicks);
      const totalImpressions = sum(impressions);
      const weightedPosition = weightedAverage(rows.map((r) => ({ value: r.position, weight: r.impressions })));

      const kpis: Kpi[] = [
        { id: 'clicks', label: 'Cliques', value: totalClicks, unit: 'count' },
        { id: 'impressions', label: 'Impressões', value: totalImpressions, unit: 'count' },
      ];
      const ctr = safeDivide(totalClicks, totalImpressions);
      if (ctr !== undefined) kpis.push({ id: 'ctr', label: 'CTR', value: ctr, unit: 'percent' });
      if (weightedPosition !== undefined) kpis.push({ id: 'position', label: 'Posição média', value: weightedPosition, unit: 'position', lowerIsBetter: true });
      group.kpis = kpis;

      const series = findTimeSeries(byDate.result.data);
      for (const [id, label] of [['clicks', 'Cliques'], ['impressions', 'Impressões']] as const) {
        const found = series.find((s) => s.label === id);
        if (found) group.series.push({ id, label, unit: 'count', points: found.points });
      }
    }
  }

  if (byQuery.ok) {
    const table = rankingTable('queries', 'Consultas que mais trazem cliques', 'Consulta', byQuery.result.data, ['query']);
    if (table) group.tables.push(table);
  }
  if (byPage.ok) {
    const table = rankingTable('pages', 'Páginas com mais cliques', 'Página', byPage.result.data, ['page']);
    if (table) group.tables.push(table);
  }
  if (byDevice.ok) {
    const breakdown = deviceBreakdown(byDevice.result.data);
    if (breakdown) group.breakdowns.push(breakdown);
  }

  if (audits.ok) {
    const records = findRecords(audits.result.data, 2);
    if (records.length > 0) {
      group.tables.push({
        id: 'audits',
        title: 'Auditorias do site',
        columns: [
          { key: 'url', label: 'Endereço' },
          { key: 'status', label: 'Situação' },
          { key: 'pages', label: 'Páginas', align: 'right', unit: 'count' },
          { key: 'date', label: 'Data' },
        ],
        rows: records.slice(0, 5).map((r) => ({
          url: pickString(r, ['url', 'domain', 'startUrl', 'site']) ?? '—',
          status: pickString(r, ['status', 'state']) ?? '—',
          pages: pickNumber(r, ['pageCount', 'pages', 'pagesCrawled', 'totalPages']) ?? null,
          date: (pickString(r, ['createdAt', 'startedAt', 'date', 'finishedAt']) ?? '').slice(0, 10) || '—',
        })),
      });
    }
  }

  return group;
}

interface ScRow {
  clicks?: number | undefined;
  impressions?: number | undefined;
  position?: number | undefined;
}

function searchConsoleRows(data: unknown): ScRow[] {
  return findRecords(data, 2)
    .map((r) => ({
      clicks: pickNumber(r, ['clicks']),
      impressions: pickNumber(r, ['impressions']),
      position: pickNumber(r, ['position', 'avgPosition']),
    }))
    .filter((r) => r.clicks !== undefined || r.impressions !== undefined);
}

function weightedAverage(items: { value?: number | undefined; weight?: number | undefined }[]): number | undefined {
  let total = 0;
  let weights = 0;
  for (const { value, weight } of items) {
    if (value === undefined) continue;
    const w = weight && weight > 0 ? weight : 1;
    total += value * w;
    weights += w;
  }
  return weights > 0 ? total / weights : undefined;
}

function labelOf(record: JsonObject, dimensions: string[]): string | undefined {
  const recordKeys = record['keys'];
  if (Array.isArray(recordKeys) && recordKeys.length > 0) return recordKeys.map(String).join(' · ');
  return pickString(record, dimensions);
}

function rankingTable(id: string, title: string, firstColumn: string, data: unknown, dimensions: string[]): DataTable | undefined {
  const rows = findRecords(data, 2)
    .map((r) => ({
      label: labelOf(r, dimensions),
      clicks: pickNumber(r, ['clicks']),
      impressions: pickNumber(r, ['impressions']),
      ctr: pickNumber(r, ['ctr']),
      position: pickNumber(r, ['position']),
    }))
    .filter((r) => r.label && (r.clicks !== undefined || r.impressions !== undefined));
  if (rows.length === 0) return undefined;

  return {
    id,
    title,
    columns: [
      { key: 'label', label: firstColumn },
      { key: 'clicks', label: 'Cliques', align: 'right', unit: 'count' },
      { key: 'impressions', label: 'Impressões', align: 'right', unit: 'count' },
      { key: 'ctr', label: 'CTR', align: 'right', unit: 'percent' },
      { key: 'position', label: 'Posição', align: 'right', unit: 'position' },
    ],
    rows: rows.map((r) => ({ label: r.label ?? '—', clicks: r.clicks ?? null, impressions: r.impressions ?? null, ctr: r.ctr ?? null, position: r.position ?? null })),
  };
}

const DEVICE_LABELS: Record<string, string> = { DESKTOP: 'Computador', MOBILE: 'Celular', TABLET: 'Tablet' };

function deviceBreakdown(data: unknown): Breakdown | undefined {
  const rows = findRecords(data, 2)
    .map((r) => {
      const raw = labelOf(r, ['device']);
      return { label: raw ? (DEVICE_LABELS[raw.toUpperCase()] ?? raw) : undefined, value: pickNumber(r, ['clicks']) };
    })
    .filter((r): r is { label: string; value: number } => Boolean(r.label) && r.value !== undefined);
  return rows.length > 0 ? { id: 'devices', label: 'Cliques por dispositivo', unit: 'count', rows } : undefined;
}
