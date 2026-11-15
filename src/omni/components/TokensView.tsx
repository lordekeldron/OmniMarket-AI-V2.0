import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Coins, Loader2, XCircle } from "lucide-react";

interface PaymentsConfig {
  configured: boolean;
  currency: string;
  priceCents: number;
  minTokens: number;
  maxTokens: number;
}

type Outcome =
  | { state: "approved"; tokens: number; balance: number; credited: boolean }
  | { state: "pending" | "rejected" | "unknown"; detail?: string }
  | { state: "invalid"; reason: string };

const QUICK_PICKS = [100, 500, 1000, 5000];
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/payments/${path}`, {
    ...init,
    ...(init?.body ? { headers: { "Content-Type": "application/json" } } : {}),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Falha na requisição (${res.status}).`);
  return body as T;
}

interface TokensViewProps {
  userId: string | undefined;
}

export const TokensView: React.FC<TokensViewProps> = ({ userId }) => {
  const [config, setConfig] = useState<PaymentsConfig | undefined>();
  const [raw, setRaw] = useState("500");
  const [balance, setBalance] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | undefined>();

  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    try {
      setBalance((await api<{ balance: number }>(`balance?userId=${encodeURIComponent(userId)}`)).balance);
    } catch {
      /* o saldo é informativo; a compra não depende dele */
    }
  }, [userId]);

  useEffect(() => {
    api<PaymentsConfig>("config")
      .then(setConfig)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  // Retorno do Mercado Pago: confere o pagamento no servidor (a URL sozinha não prova nada).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("mp_return")) return;
    const paymentId = q.get("payment_id") ?? q.get("collection_id");
    const flow = q.get("mp_return");
    window.history.replaceState({}, "", window.location.pathname);
    if (!paymentId || paymentId === "null") {
      setOutcome(flow === "failure" ? { state: "rejected" } : { state: "pending" });
      return;
    }
    setChecking(true);
    api<Outcome>(`status?payment_id=${encodeURIComponent(paymentId)}`)
      .then((o) => {
        setOutcome(o);
        void refreshBalance();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setChecking(false));
  }, [refreshBalance]);

  const tokens = /^\d{1,9}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  const validation = useMemo(() => {
    if (!config) return undefined;
    if (!Number.isInteger(tokens) || tokens <= 0) return "Informe uma quantidade inteira de tokens.";
    if (tokens < config.minTokens) return `A compra mínima é de ${config.minTokens.toLocaleString("pt-BR")} tokens.`;
    if (tokens > config.maxTokens) return `A compra máxima é de ${config.maxTokens.toLocaleString("pt-BR")} tokens por pagamento.`;
    return undefined;
  }, [config, tokens]);

  const total = config && !validation ? tokens * config.priceCents : undefined;

  const pay = async () => {
    if (!userId || validation) return;
    setSubmitting(true);
    setError(undefined);
    setOutcome(undefined);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens, userId }),
      });
      const data = (await res.json().catch(() => ({}))) as { init_point?: string; error?: string };
      if (!res.ok || !data.init_point) throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
      window.location.assign(data.init_point);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Comprar tokens</h1>
        <p className="text-sm text-muted-foreground">Escolha quantos tokens quiser. O pagamento é feito no Mercado Pago (Pix, cartão ou boleto).</p>
      </div>

      {typeof balance === "number" && (
        <div className="surface flex items-center gap-3 p-4">
          <Coins className="h-5 w-5 text-primary" />
          <div className="text-sm">
            Saldo atual: <strong className="tabular-nums">{balance.toLocaleString("pt-BR")} tokens</strong>
          </div>
        </div>
      )}

      {checking && (
        <div className="surface flex items-center gap-3 p-4 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirmando o seu pagamento…
        </div>
      )}
      {outcome?.state === "approved" && (
        <div className="surface flex items-start gap-3 border-chart-2/40 p-4" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-chart-2" />
          <div className="text-sm">
            <div className="font-medium">Pagamento aprovado!</div>
            <div className="text-muted-foreground">
              {outcome.tokens.toLocaleString("pt-BR")} tokens adicionados. Saldo: {outcome.balance.toLocaleString("pt-BR")}.
            </div>
          </div>
        </div>
      )}
      {outcome && (outcome.state === "pending" || outcome.state === "unknown") && (
        <div className="surface flex items-start gap-3 p-4" role="status">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-chart-4" />
          <div className="text-sm">
            <div className="font-medium">Pagamento em análise</div>
            <div className="text-muted-foreground">Assim que o Mercado Pago confirmar (Pix e boleto podem levar alguns minutos), os tokens entram no seu saldo.</div>
          </div>
        </div>
      )}
      {outcome && (outcome.state === "rejected" || outcome.state === "invalid") && (
        <div className="surface flex items-start gap-3 border-destructive/40 p-4" role="alert">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <div className="font-medium">Não foi possível concluir o pagamento</div>
            <div className="text-muted-foreground">
              {outcome.state === "invalid" ? outcome.reason : "O pagamento foi recusado. Tente outro meio de pagamento."}
            </div>
          </div>
        </div>
      )}

      <section className="surface space-y-4 p-5 sm:p-6">
        <div>
          <label htmlFor="token-qty" className="text-sm text-muted-foreground">
            Quantidade de tokens
          </label>
          <input
            id="token-qty"
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
            aria-invalid={Boolean(validation)}
            aria-describedby="token-qty-help"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-lg tabular-nums"
          />
          <div id="token-qty-help" className={`mt-1.5 text-xs ${validation ? "text-destructive" : "text-muted-foreground"}`}>
            {validation ?? (config ? `Cada token custa ${brl(config.priceCents)}.` : "Carregando preço…")}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PICKS.map((n) => (
            <button key={n} type="button" onClick={() => setRaw(String(n))} className="rounded-md border border-border px-3 py-1.5 text-sm tabular-nums hover:bg-muted">
              {n.toLocaleString("pt-BR")}
            </button>
          ))}
        </div>

        <p className="checkout-total flex items-baseline justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Total a pagar</span>
          <strong className="text-2xl tabular-nums">{total !== undefined ? brl(total) : "—"}</strong>
        </p>

        {error && (
          <div role="alert" className="rounded-md border border-destructive/40 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        {config && !config.configured && (
          <div className="rounded-md border border-chart-4/40 px-3 py-2.5 text-sm">Os pagamentos ainda não foram ativados neste ambiente (falta o segredo MP_ACCESS_TOKEN).</div>
        )}
        {!userId && <div className="rounded-md border border-border px-3 py-2.5 text-sm text-muted-foreground">Entre na sua conta para comprar tokens.</div>}

        <button
          type="button"
          data-mp-checkout-cta="checkout-pro"
          aria-label="Pagar com Mercado Pago"
          onClick={pay}
          disabled={submitting || !userId || Boolean(validation) || !config?.configured}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#009ee3] px-4 py-3 text-sm font-medium text-white hover:bg-[#0089c7] disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Abrindo o Mercado Pago…" : "Pagar com Mercado Pago"}
        </button>
      </section>
    </div>
  );
};
