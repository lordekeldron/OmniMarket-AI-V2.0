// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Sparkles,
  TrendingUp,
  Target,
  Bot,
  CheckCircle2,
  DollarSign,
  Wallet,
  Activity,
  Crosshair,
  Zap,
} from "lucide-react";
import { BrandProfile, ChannelPerformanceData, TrendData } from "../types";

interface DashboardOverviewProps {
  brand: BrandProfile;
  channels: ChannelPerformanceData[];
  trends: TrendData;
  onNavigateTab: (tab: string) => void;
  onApplyOptimization: () => void;
  optimizationApplied: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  brand,
  channels,
  trends,
  onNavigateTab,
  onApplyOptimization,
  optimizationApplied,
}) => {
  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const totalConversions = channels.reduce((sum, c) => sum + c.conversions, 0);
  const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0";
  const avgCPA = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : "0";
  const budgetPct = ((totalSpend / (brand.monthlyBudget || 30000)) * 100).toFixed(0);

  const metrics = [
    {
      label: "Receita",
      value: `R$ ${totalRevenue.toLocaleString("pt-BR")}`,
      note: "+24,6% no período",
      icon: DollarSign,
      tone: "text-accent",
    },
    {
      label: "Investido",
      value: `R$ ${totalSpend.toLocaleString("pt-BR")}`,
      note: `${budgetPct}% do orçamento`,
      icon: Wallet,
      tone: "text-primary",
    },
    {
      label: "ROAS",
      value: `${blendedROAS}x`,
      note: "Meta de 3,5x",
      icon: Activity,
      tone: "text-primary",
    },
    {
      label: "CPA",
      value: `R$ ${avgCPA}`,
      note: "−18,4% de custo",
      icon: Crosshair,
      tone: "text-accent",
    },
    {
      label: "Conversões",
      value: totalConversions.toLocaleString("pt-BR"),
      note: "Taxa média 3,42%",
      icon: Zap,
      tone: "text-primary",
    },
  ];
  const maxRevenue = Math.max(0, ...channels.map((c) => c.revenue));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden surface p-6 sm:p-8">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: brand.accentColor }}
              />
              {brand.industry}
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold leading-tight text-foreground">
              Olá, <span className="text-gradient">{brand.name}</span>
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {brand.tagline}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab("campaigns")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow glow transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Nova campanha
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("trends")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-foreground hover:border-primary/40 transition-colors"
            >
              <TrendingUp className="w-4 h-4" /> Tendências
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("audience")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-foreground hover:border-primary/40 transition-colors"
            >
              <Target className="w-4 h-4" /> Audiência
            </button>
          </div>
        </div>
      </section>

      {/* AI insight */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              Insight da IA
            </p>
            <p className="mt-1 text-sm text-foreground">
              {optimizationApplied
                ? "Orçamento rebalanceado para os canais com melhor retorno marginal."
                : "Reels e TikTok estão com ROAS de 5,2x e CPA 38% menor que a busca paga."}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {optimizationApplied
                ? "Projeção de receita +38,2%."
                : "Rebalancear pode capturar cerca de R$ 14.800 a mais."}
            </p>
          </div>
        </div>
        {optimizationApplied ? (
          <span className="inline-flex items-center gap-1.5 shrink-0 font-mono text-xs text-accent">
            <CheckCircle2 className="w-4 h-4" /> Aplicado
          </span>
        ) : (
          <button
            type="button"
            onClick={onApplyOptimization}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-glow transition-colors"
          >
            Aplicar rebalanceamento <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </section>

      {/* KPIs */}
      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="group surface p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {m.label}
                </dt>
                <Icon className={`w-4 h-4 ${m.tone} opacity-80`} />
              </div>
              <dd className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                {m.value}
              </dd>
              <dd className="mt-1 text-[12px] text-muted-foreground">{m.note}</dd>
            </div>
          );
        })}
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 surface p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Desempenho por canal</h3>
              <p className="text-[12px] text-muted-foreground">Receita relativa e ROAS</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("roi")}
              className="text-[13px] text-primary hover:text-primary-glow inline-flex items-center gap-1"
            >
              Simulador <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {channels.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum canal cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {channels.map((ch) => {
                const pct = maxRevenue > 0 ? (ch.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={ch.id}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-foreground">{ch.name}</span>
                      <span className="font-mono tabular-nums text-primary">{ch.roas}x</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground tabular-nums">
                      <span>R$ {ch.spend.toLocaleString("pt-BR")} investidos</span>
                      <span className="inline-flex items-center gap-1 text-accent">
                        <ArrowUpRight className="w-3 h-3" /> R$ {ch.revenue.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface p-5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">O que está mudando</h3>
          </div>
          {trends.summary || trends.macroTrends.length > 0 ? (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">{trends.summary}</p>
              <ul className="mt-4 space-y-3">
                {trends.macroTrends.slice(0, 3).map((t, idx) => (
                  <li key={idx} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-foreground">{t.name}</span>
                      <span className="font-mono text-accent tabular-nums">{t.growthRate}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">{t.recommendedAction}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Rode o radar para ver as tendências do seu mercado.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => onNavigateTab("trends")}
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[13px] text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            Abrir radar de tendências <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>
    </div>
  );
};
