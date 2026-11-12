import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ExternalLink, Info, Loader2, Pencil, Plug, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  Breakdown,
  ConnectionSummary,
  DataTable,
  Kpi,
  MetricUnit,
  Notice,
  ProviderId,
  ProviderInfo,
  Snapshot,
  SnapshotGroup,
  TimeSeries,
} from '../types/connectors';
import { authorizeInPopup, connectorsApi, loadSnapshots, saveSnapshots } from '../connectors/client';

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function formatValue(v: number | string | null | undefined, unit: MetricUnit = 'count', currency?: string): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  switch (unit) {
    case 'currency':
      try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency ?? 'BRL' }).format(v);
      } catch {
        return v.toLocaleString('pt-BR');
      }
    case 'percent':
      return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(v);
    case 'ratio':
    case 'position':
      return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    default:
      return Math.abs(v) >= 10000
        ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
        : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const STATUS_TEXT: Record<ConnectionSummary['status'], string> = {
  awaiting_authorization: 'Aguardando autorização',
  connected: 'Conectada',
  syncing: 'Sincronizando',
  error: 'Erro',
  reauthorization_required: 'Reautorização necessária',
};

function NoticeList({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;
  return (
    <div className="space-y-2">
      {notices.map((n, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${
            n.level === 'error'
              ? 'border-destructive/40 text-destructive'
              : n.level === 'warning'
                ? 'border-chart-4/40 text-foreground'
                : 'border-border text-muted-foreground'
          }`}
        >
          {n.level === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div className="flex-1">
            {n.text}
            {n.action && (
              <a
                href={n.action.url}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                {n.action.label} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  if (!kpis.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((k) => {
        const good = k.delta === undefined ? undefined : k.lowerIsBetter ? k.delta < 0 : k.delta > 0;
        return (
          <div key={k.id} className="surface p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums">{formatValue(k.value, k.unit, k.currency)}</div>
            {k.delta !== undefined && (
              <div className={`mt-1 text-xs tabular-nums ${good ? 'text-chart-2' : 'text-chart-5'}`}>
                {k.delta > 0 ? '+' : ''}
                {(k.delta * 100).toFixed(1)}% vs. período anterior
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SeriesChart({ series, color }: { series: TimeSeries; color: string }) {
  if (series.points.length < 2) return null;
  const gradient = `grad-${series.id.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div className="surface p-4">
      <div className="mb-3 text-sm font-medium">{series.label}</div>
      <div className="h-52" role="img" aria-label={`Gráfico de ${series.label} por dia`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tickFormatter={(v: number) => formatValue(v, series.unit, series.currency)} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              labelFormatter={(l: string) => formatDate(l)}
              formatter={(v: number) => [formatValue(v, series.unit, series.currency), series.label]}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradient})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BreakdownChart({ breakdown, color }: { breakdown: Breakdown; color: string }) {
  if (!breakdown.rows.length) return null;
  return (
    <div className="surface p-4">
      <div className="mb-3 text-sm font-medium">{breakdown.label}</div>
      <div style={{ height: Math.max(120, breakdown.rows.length * 34 + 24) }} role="img" aria-label={`Gráfico de ${breakdown.label}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdown.rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={120} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              formatter={(v: number) => [formatValue(v, breakdown.unit, breakdown.currency), breakdown.label]}
            />
            <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableBlock({ table }: { table: DataTable }) {
  if (!table.rows.length) return null;
  return (
    <div className="surface overflow-x-auto p-4">
      <div className="mb-3 text-sm font-medium">{table.title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {table.columns.map((c) => (
              <th key={c.key} className={`px-2 py-1.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {table.columns.map((c) => (
                <td key={c.key} className={`px-2 py-1.5 tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {formatValue(row[c.key], c.unit, c.currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupReport({ group }: { group: SnapshotGroup }) {
  return (
    <div className="space-y-4">
      <NoticeList notices={group.notices} />
      <KpiGrid kpis={group.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        {group.series.map((s, i) => (
          <SeriesChart key={s.id} series={s} color={CHART_COLORS[i % CHART_COLORS.length] as string} />
        ))}
        {group.breakdowns.map((b, i) => (
          <BreakdownChart key={b.id} breakdown={b} color={CHART_COLORS[(i + group.series.length) % CHART_COLORS.length] as string} />
        ))}
      </div>
      {group.tables.map((t) => (
        <TableBlock key={t.id} table={t} />
      ))}
    </div>
  );
}

interface AccountPanelProps {
  connection: ConnectionSummary;
  provider: ProviderInfo | undefined;
  snapshot: Snapshot | undefined;
  busy: boolean;
  onSync: () => void;
  onReconnect: () => void;
  onRename: () => void;
  onRemove: () => void;
}

function AccountPanel({ connection, provider, snapshot, busy, onSync, onReconnect, onRename, onRemove }: AccountPanelProps) {
  const [groupId, setGroupId] = useState<string | undefined>();
  const groups = snapshot?.groups ?? [];
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const needsAuth = connection.status === 'reauthorization_required' || connection.status === 'awaiting_authorization';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{connection.label}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {provider?.name} · {STATUS_TEXT[connection.status]}
            {snapshot && ` · atualizado em ${new Date(snapshot.fetchedAt).toLocaleString('pt-BR')}`}
          </div>
          {snapshot && (
            <div className="text-xs text-muted-foreground">
              Período: {formatDate(snapshot.period.from)} a {formatDate(snapshot.period.to)}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {needsAuth ? (
            <button type="button" onClick={onReconnect} disabled={busy} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-glow disabled:opacity-50">
              Autorizar novamente
            </button>
          ) : (
            <button type="button" onClick={onSync} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
            </button>
          )}
          <button type="button" onClick={onRename} aria-label="Renomear conta" className="rounded-md border border-border p-2 hover:bg-muted">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} aria-label="Remover conta" className="rounded-md border border-border p-2 text-destructive hover:bg-muted">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {connection.error && <NoticeList notices={[{ level: 'error', text: connection.error }]} />}
      {snapshot && <NoticeList notices={snapshot.notices} />}

      {busy && !snapshot && <div className="surface p-8 text-center text-sm text-muted-foreground">Buscando os dados desta conta…</div>}
      {!busy && !snapshot && !needsAuth && !connection.error && (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Ainda não há dados neste navegador. Use “Atualizar” para buscá-los.</div>
      )}

      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Recortes da conta">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === group?.id}
              onClick={() => setGroupId(g.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${g.id === group?.id ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {g.label}
              {g.sublabel && <span className="ml-1.5 text-xs text-muted-foreground">{g.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
      {group && <GroupReport group={group} />}
    </div>
  );
}

function ConnectDialog({ providers, onClose, onConnect }: {
  providers: ProviderInfo[];
  onClose: () => void;
  onConnect: (providerId: ProviderId, label: string, apiKey?: string) => Promise<void>;
}) {
  const [providerId, setProviderId] = useState<ProviderId>(providers[0]?.id ?? 'supermetrics');
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<'oauth' | 'apiKey'>('oauth');
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const provider = providers.find((p) => p.id === providerId);
  const canUseKey = provider?.authModes.includes('apiKey') ?? false;
  const useKey = canUseKey && mode === 'apiKey';

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await onConnect(providerId, label.trim(), useKey ? apiKey.trim() : undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível conectar.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Conectar conta">
      <div className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conectar conta</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProviderId(p.id); setMode('oauth'); }}
              className={`rounded-md border p-3 text-left ${p.id === providerId ? 'border-primary/50 bg-primary/10' : 'border-border hover:bg-muted'}`}
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.summary}</div>
            </button>
          ))}
        </div>

        {provider?.note && <p className="mt-3 text-xs text-muted-foreground">{provider.note}</p>}

        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Nome da conta (opcional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder={`Ex.: ${provider?.name ?? 'Conta'} da loja`}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        {canUseKey && (
          <div className="mt-4 flex gap-2 text-sm">
            <button type="button" onClick={() => setMode('oauth')} className={`rounded-md border px-3 py-1.5 ${!useKey ? 'border-primary/50 bg-primary/10' : 'border-border'}`}>Entrar com login</button>
            <button type="button" onClick={() => setMode('apiKey')} className={`rounded-md border px-3 py-1.5 ${useKey ? 'border-primary/50 bg-primary/10' : 'border-border'}`}>Chave de API</button>
          </div>
        )}
        {useKey && (
          <label className="mt-3 block text-sm">
            <span className="text-muted-foreground">Chave de API</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}

        {error && <div className="mt-4"><NoticeList notices={[{ level: 'error', text: error }]} /></div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || (useKey && !apiKey.trim())}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-glow disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {useKey ? 'Conectar' : 'Continuar para o login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ConnectionsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pageError, setPageError] = useState<string | undefined>();

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const mergeConnection = useCallback((c: ConnectionSummary) => {
    setConnections((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
  }, []);

  const storeSnapshot = useCallback((id: string, snapshot: Snapshot) => {
    setSnapshots((prev) => {
      const next = { ...prev, [id]: snapshot };
      saveSnapshots(next);
      return next;
    });
  }, []);

  const sync = useCallback(
    async (id: string) => {
      setBusyFor(id, true);
      try {
        const res = await connectorsApi.sync(id);
        mergeConnection(res.connection);
        if (res.snapshot) storeSnapshot(id, res.snapshot);
      } catch (e) {
        setPageError(e instanceof Error ? e.message : 'Falha ao atualizar a conta.');
      } finally {
        setBusyFor(id, false);
      }
    },
    [mergeConnection, storeSnapshot],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await connectorsApi.state();
        if (cancelled) return;
        setConfigured(state.configured);
        setProviders(state.providers);
        setConnections(state.connections);
        const stored = loadSnapshots();
        const live: Record<string, Snapshot> = {};
        for (const c of state.connections) if (stored[c.id]) live[c.id] = stored[c.id] as Snapshot;
        setSnapshots(live);
        setActive((cur) => cur ?? state.connections[0]?.id);
      } catch (e) {
        if (!cancelled) setPageError(e instanceof Error ? e.message : 'Não foi possível carregar as contas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = async (providerId: ProviderId, label: string, apiKey?: string) => {
    const created = await connectorsApi.create({ providerId, ...(label ? { label } : {}), ...(apiKey ? { apiKey } : {}) });
    mergeConnection(created.connection);
    setActive(created.connection.id);
    if (created.authorizationUrl) {
      const ok = await authorizeInPopup(created.authorizationUrl);
      if (!ok) {
        setPageError('A autorização não foi concluída. Use “Autorizar novamente” na aba da conta para tentar de novo.');
        return;
      }
    }
    // Extração automática assim que a conta é conectada.
    void sync(created.connection.id);
  };

  const reconnect = async (c: ConnectionSummary) => {
    setBusyFor(c.id, true);
    try {
      const { authorizationUrl } = await connectorsApi.reconnect(c.id);
      const ok = await authorizeInPopup(authorizationUrl);
      if (ok) await sync(c.id);
      else setPageError('A autorização não foi concluída.');
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Falha ao reautorizar.');
    } finally {
      setBusyFor(c.id, false);
    }
  };

  const rename = async (c: ConnectionSummary) => {
    const label = window.prompt('Novo nome da conta', c.label)?.trim();
    if (!label || label === c.label) return;
    try {
      mergeConnection((await connectorsApi.rename(c.id, label)).connection);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Falha ao renomear.');
    }
  };

  const remove = async (c: ConnectionSummary) => {
    if (!window.confirm(`Remover “${c.label}”? Os dados guardados neste navegador também serão apagados.`)) return;
    try {
      await connectorsApi.remove(c.id);
      setConnections((prev) => prev.filter((x) => x.id !== c.id));
      setSnapshots((prev) => {
        const { [c.id]: _gone, ...rest } = prev;
        saveSnapshots(rest);
        return rest;
      });
      setActive((cur) => (cur === c.id ? undefined : cur));
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Falha ao remover.');
    }
  };

  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);
  const current = connections.find((c) => c.id === active) ?? connections[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contas conectadas</h1>
          <p className="text-sm text-muted-foreground">Cada conta tem a sua aba, com as métricas e o relatório dos últimos 30 dias.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={loading || !configured}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-glow disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Conectar conta
        </button>
      </div>

      {!loading && !configured && (
        <NoticeList
          notices={[{ level: 'warning', text: 'As conexões ainda não foram ativadas neste ambiente: falta o segredo CONNECTOR_SECRET (mínimo de 16 caracteres) nas configurações do projeto.' }]}
        />
      )}
      {pageError && (
        <div className="flex items-start gap-2">
          <div className="flex-1"><NoticeList notices={[{ level: 'error', text: pageError }]} /></div>
          <button type="button" onClick={() => setPageError(undefined)} aria-label="Dispensar aviso" className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">Carregando contas…</div>
      ) : connections.length === 0 ? (
        <section className="surface p-10 text-center">
          <Plug className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Nenhuma conta conectada</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Conecte Supermetrics, Metricool, OpenSEO ou Adspirer. Basta entrar na plataforma; os dados são buscados automaticamente.
          </p>
        </section>
      ) : (
        <Tabs value={current?.id ?? ''} onValueChange={setActive}>
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            {connections.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{providerById.get(c.providerId)?.name ?? c.providerId}</span>
                {c.label}
                {busy.has(c.id) && <Loader2 className="h-3 w-3 animate-spin" />}
              </TabsTrigger>
            ))}
          </TabsList>
          {connections.map((c) => (
            <TabsContent key={c.id} value={c.id} className="mt-5">
              <AccountPanel
                connection={c}
                provider={providerById.get(c.providerId)}
                snapshot={snapshots[c.id]}
                busy={busy.has(c.id)}
                onSync={() => void sync(c.id)}
                onReconnect={() => void reconnect(c)}
                onRename={() => void rename(c)}
                onRemove={() => void remove(c)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {dialogOpen && <ConnectDialog providers={providers} onClose={() => setDialogOpen(false)} onConnect={connect} />}
    </div>
  );
};
