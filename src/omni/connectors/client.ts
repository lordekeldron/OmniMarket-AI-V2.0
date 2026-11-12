import type {
  ConnectionSummary,
  CreateConnectionRequest,
  CreateConnectionResponse,
  ProviderInfo,
  Snapshot,
} from '../types/connectors';

export interface ConnectionsState {
  configured: boolean;
  providers: ProviderInfo[];
  connections: ConnectionSummary[];
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/connections${path}`, {
    ...init,
    credentials: 'same-origin',
    ...(init?.body ? { headers: { 'Content-Type': 'application/json' } } : {}),
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? `Falha na requisição (${res.status}).`, res.status);
  return body as T;
}

export const connectorsApi = {
  state: () => call<ConnectionsState>(''),
  create: (req: CreateConnectionRequest) =>
    call<CreateConnectionResponse>('', { method: 'POST', body: JSON.stringify(req) }),
  sync: (id: string) =>
    call<{ connection: ConnectionSummary; snapshot?: Snapshot }>(`/${id}/sync`, { method: 'POST' }),
  reconnect: (id: string) => call<{ authorizationUrl: string }>(`/${id}/reconnect`, { method: 'POST' }),
  rename: (id: string, label: string) =>
    call<{ connection: ConnectionSummary }>(`/${id}`, { method: 'PATCH', body: JSON.stringify({ label }) }),
  remove: (id: string) => call<void>(`/${id}`, { method: 'DELETE' }),
};

// Snapshots ficam só neste navegador: o servidor não guarda dados de métricas.
const KEY = 'omnimarket_snapshots_v1';

export function loadSnapshots(): Record<string, Snapshot> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Snapshot>) : {};
  } catch {
    return {};
  }
}

export function saveSnapshots(all: Record<string, Snapshot>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* armazenamento bloqueado ou cheio: o relatório só não persiste entre visitas */
  }
}

/**
 * Abre a página de autorização da plataforma em um popup e resolve quando o retorno
 * (/api/connections/oauth/callback) avisa que terminou. Resolve false se o usuário fechar o popup.
 */
export function authorizeInPopup(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const popup = window.open(url, 'omnimarket-oauth', 'width=560,height=720');
    if (!popup) {
      window.location.assign(url);
      resolve(false);
      return;
    }
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
      resolve(ok);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; ok?: boolean } | null;
      if (d?.source === 'omnimarket' && d.type === 'oauth-complete') finish(Boolean(d.ok));
    };
    window.addEventListener('message', onMessage);
    const timer = window.setInterval(() => {
      if (popup.closed) finish(false);
    }, 500);
  });
}
