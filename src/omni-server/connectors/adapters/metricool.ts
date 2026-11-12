import type { DataTable, Kpi, Notice, SnapshotGroup } from '../../../omni/types/connectors';
import { findRecords, findTimeSeries, isObject, pickString, type FoundSeries, type JsonObject } from '../parse';
import { callSafe, isoWithOffset, newGroup, snippet, sum, type Adapter } from './common';

/**
 * Metricool — marcas, métricas de evolução por rede e publicações agendadas.
 *
 * Este adaptador foi escrito a partir dos esquemas das ferramentas e do erro
 * real de uma conta sem redes conectadas. O formato dos dados de contas com
 * redes conectadas não pôde ser observado; por isso a leitura é tolerante e
 * qualquer parte não reconhecida vira aviso, nunca falha silenciosa.
 */

const NETWORKS: { match: RegExp; id: string; label: string }[] = [
  { match: /^instagram/i, id: 'instagram', label: 'Instagram' },
  { match: /^facebook(page)?$/i, id: 'facebook', label: 'Facebook' },
  { match: /^tiktok/i, id: 'tiktok', label: 'TikTok' },
  { match: /^youtube/i, id: 'youtube', label: 'YouTube' },
  { match: /^linkedin/i, id: 'linkedin', label: 'LinkedIn' },
  { match: /^(twitter|x)$/i, id: 'twitter', label: 'X' },
  { match: /^threads/i, id: 'threads', label: 'Threads' },
  { match: /^pinterest/i, id: 'pinterest', label: 'Pinterest' },
  { match: /^bluesky/i, id: 'bluesky', label: 'Bluesky' },
  { match: /^(gmb|googlebusiness)/i, id: 'googleBusinessProfile', label: 'Google Meu Negócio' },
];

const WANTED_METRIC = /follower|seguidor|reach|alcance|impression|impress|engag|like|curtid|view|visualiza/i;
const CUMULATIVE_METRIC = /follower|seguidor|subscriber|inscrit/i;

export const syncMetricool: Adapter = async ({ client, period, now }) => {
  const notices: Notice[] = [];
  const groups: SnapshotGroup[] = [];

  const brandsCall = await callSafe(client, 'getBrandSettings');
  if (!brandsCall.ok) {
    if (/social network connected|rede.*conectada/i.test(brandsCall.error)) {
      const url = brandsCall.error.match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, '');
      notices.push({
        level: 'info',
        text: 'A marca desta conta do Metricool ainda não tem nenhuma rede social conectada.',
        ...(url ? { action: { label: 'Conectar redes no Metricool', url } } : {}),
      });
      return { groups, notices };
    }
    throw new Error(`Não foi possível ler as marcas do Metricool: ${brandsCall.error}`);
  }

  const brands = readBrands(brandsCall.result.data);
  if (brands.length === 0) {
    notices.push({
      level: 'warning',
      text: `Não consegui identificar marcas na resposta do Metricool. Resposta recebida: "${snippet(brandsCall.result.text)}"`,
    });
    return { groups, notices };
  }

  for (const brand of brands.slice(0, 3)) {
    groups.push(await syncBrand(client, brand, period, now));
  }
  return { groups, notices };
};

interface Brand {
  id: string;
  label: string;
  timezone: string;
  networks: { id: string; label: string }[];
}

function readBrands(data: unknown): Brand[] {
  const records = findRecords(data, 1);
  return records
    .map((r): Brand => ({
      id: pickString(r, ['id', 'blogId', 'brandId']) ?? '',
      label: pickString(r, ['label', 'name', 'title', 'brandName']) ?? 'Marca',
      timezone: pickString(r, ['timezone', 'timeZone']) ?? 'America/Sao_Paulo',
      networks: detectNetworks(r),
    }))
    .filter((b) => b.id);
}

function detectNetworks(record: JsonObject): { id: string; label: string }[] {
  const found = new Map<string, string>();
  const add = (raw: string) => {
    const net = NETWORKS.find((n) => n.match.test(raw.trim()));
    if (net) found.set(net.id, net.label);
  };

  for (const [key, value] of Object.entries(record)) {
    const hasValue =
      value === true || (typeof value === 'string' && value.trim() !== '') || (isObject(value) && Object.keys(value).length > 0) || (typeof value === 'number' && value !== 0);
    if (hasValue) add(key);
    if (Array.isArray(value) && /network|social/i.test(key)) {
      for (const item of value) {
        if (typeof item === 'string') add(item);
        else if (isObject(item)) {
          const name = pickString(item, ['network', 'name', 'type', 'provider']);
          if (name) add(name);
        }
      }
    }
  }
  return [...found].map(([id, label]) => ({ id, label }));
}

async function syncBrand(client: Parameters<Adapter>[0]['client'], brand: Brand, period: { from: string; to: string }, now: Date): Promise<SnapshotGroup> {
  const group = newGroup(brand.id, brand.label, brand.networks.map((n) => n.label).join(', ') || undefined);

  if (brand.networks.length === 0) {
    group.notices.push({
      level: 'warning',
      text: 'Não consegui identificar quais redes estão conectadas a esta marca. Confira as conexões no Metricool e atualize.',
    });
  }

  const from = new Date(`${period.from}T00:00:00Z`);
  const kpis: Kpi[] = [];

  for (const network of brand.networks.slice(0, 4)) {
    const metricsCall = await callSafe(client, 'getAnalyticsAvailableMetrics', { network: network.id, connector: 'evolution' });
    if (!metricsCall.ok) {
      group.notices.push({ level: 'info', text: `${network.label}: métricas de evolução indisponíveis (${snippet(metricsCall.error, 120)}).` });
      continue;
    }

    const available = readMetricCatalog(metricsCall.result.data);
    const chosen = available.filter((m) => WANTED_METRIC.test(m.name)).slice(0, 4);
    if (chosen.length === 0) {
      group.notices.push({ level: 'info', text: `${network.label}: nenhuma métrica de evolução reconhecida.` });
      continue;
    }

    const dataCall = await callSafe(client, 'getAnalyticsDataByMetrics', {
      brandId: brand.id,
      from: isoWithOffset(from),
      to: isoWithOffset(now),
      metrics: chosen.map((m) => m.id),
    });
    if (!dataCall.ok) {
      group.notices.push({ level: 'warning', text: `${network.label}: não consegui ler as métricas (${snippet(dataCall.error, 120)}).` });
      continue;
    }

    const series = findTimeSeries(dataCall.result.data);
    if (series.length === 0) {
      group.notices.push({ level: 'info', text: `${network.label}: sem dados no período.` });
      continue;
    }

    for (const s of series) {
      const name = nameForSeries(s, chosen);
      const label = `${network.label} · ${name}`;
      group.series.push({ id: `${network.id}-${s.label}`, label, unit: 'count', points: s.points });

      const first = s.points[0]?.value;
      const last = s.points[s.points.length - 1]?.value;
      if (first === undefined || last === undefined) continue;
      if (CUMULATIVE_METRIC.test(name)) {
        kpis.push({ id: `${network.id}-${s.label}`, label, value: last, unit: 'count', ...(first > 0 ? { delta: (last - first) / first } : {}) });
      } else {
        kpis.push({ id: `${network.id}-${s.label}`, label: `${label} (período)`, value: sum(s.points.map((p) => p.value)), unit: 'count' });
      }
    }
  }
  group.kpis = kpis.slice(0, 6);

  const upcoming = await callSafe(client, 'getScheduledPosts', {
    brandId: brand.id,
    fromDate: isoWithOffset(now),
    toDate: isoWithOffset(new Date(now.getTime() + 14 * 24 * 3600 * 1000)),
    timezone: brand.timezone,
  });
  if (upcoming.ok) {
    const table = scheduledTable(upcoming.result.data);
    if (table) group.tables.push(table);
  }

  return group;
}

interface MetricDef {
  id: string;
  name: string;
}

function readMetricCatalog(data: unknown): MetricDef[] {
  return findRecords(data, 2)
    .map((r) => ({
      id: pickString(r, ['id', 'field', 'metric', 'metricId', 'fieldId', 'code']) ?? '',
      name: pickString(r, ['name', 'label', 'title', 'metricName', 'description']) ?? '',
    }))
    .filter((m) => m.id && m.name);
}

function nameForSeries(series: FoundSeries, chosen: MetricDef[]): string {
  const byId = chosen.find((m) => m.id === series.label);
  if (byId) return byId.name;
  const byName = chosen.find((m) => m.name.toLowerCase() === series.label.toLowerCase());
  return byName ? byName.name : series.label;
}

function scheduledTable(data: unknown): DataTable | undefined {
  const records = findRecords(data, 2);
  if (records.length === 0) return undefined;
  return {
    id: 'scheduled',
    title: 'Próximas publicações',
    columns: [
      { key: 'when', label: 'Quando' },
      { key: 'network', label: 'Rede' },
      { key: 'text', label: 'Texto' },
    ],
    rows: records.slice(0, 8).map((r) => ({
      when: (pickString(r, ['publicationDate', 'dateTime', 'date', 'scheduledAt', 'publishAt']) ?? '—').replace('T', ' ').slice(0, 16),
      network: pickString(r, ['network', 'provider', 'networks']) ?? '—',
      text: snippet(pickString(r, ['text', 'description', 'content', 'title']) ?? '—', 90),
    })),
  };
}
