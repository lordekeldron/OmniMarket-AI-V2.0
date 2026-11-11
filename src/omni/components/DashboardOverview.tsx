import React from 'react';
import { ArrowRight, ArrowUpRight, Flame } from 'lucide-react';
import { BrandProfile, ChannelPerformanceData, TrendData } from '../types';

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
  const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const avgCPA = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0';
  const budgetPct = ((totalSpend / (brand.monthlyBudget || 30000)) * 100).toFixed(0);

  const metrics = [
    { label: 'Receita', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`, note: '+24,6% no período' },
    { label: 'Investido', value: `R$ ${totalSpend.toLocaleString('pt-BR')}`, note: `${budgetPct}% do orçamento` },
    { label: 'ROAS', value: `${blendedROAS}x`, note: 'Meta de 3,5x' },
    { label: 'CPA', value: `R$ ${avgCPA}`, note: '−18,4% de custo' },
    { label: 'Conversões', value: totalConversions.toLocaleString('pt-BR'), note: 'Taxa média 3,42%' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[13px] text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ backgroundColor: brand.accentColor }} />
            {brand.industry}
          </p>
          <h1 className="mt-2 text-[2rem] leading-none font-semibold text-foreground">{brand.name}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#cfc6ba]">{brand.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigateTab('campaigns')} className="px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-glow">
            Nova campanha
          </button>
          <button type="button" onClick={() => onNavigateTab('trends')} className="px-3.5 py-2 rounded-md border border-white/10 text-sm text-foreground hover:bg-white/5">
            Tendências
          </button>
          <button type="button" onClick={() => onNavigateTab('audience')} className="px-3.5 py-2 rounded-md border border-white/10 text-sm text-foreground hover:bg-white/5">
            Audiência
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-y border-white/8 py-4">
        <div>
          <p className="text-sm text-[#f4efe8]">
            {optimizationApplied
              ? 'Orçamento rebalanceado para os canais com melhor retorno marginal.'
              : 'Reels e TikTok estão com ROAS de 5,2x e CPA 38% menor que a busca paga.'}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {optimizationApplied ? 'Projeção de receita +38,2%.' : 'Rebalancear pode capturar cerca de R$ 14.800 a mais.'}
          </p>
        </div>
        {!optimizationApplied && (
          <button type="button" onClick={onApplyOptimization} className="shrink-0 text-sm text-primary hover:text-[#f0c7a4]">
            Aplicar rebalanceamento
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-[12px] text-muted-foreground">{metric.label}</dt>
            <dd className="mt-1 text-[1.35rem] font-semibold tracking-tight text-foreground">{metric.value}</dd>
            <dd className="mt-1 text-[12px] text-muted-foreground">{metric.note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Canais</h2>
            <button type="button" onClick={() => onNavigateTab('roi')} className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Simulador <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/8">
            {channels.map((ch) => {
              const maxRevenue = Math.max(...channels.map((c) => c.revenue));
              const pct = maxRevenue > 0 ? (ch.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={ch.id} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-foreground">{ch.name}</span>
                    <span className="tabular-nums text-foreground">{ch.roas}x</span>
                  </div>
                  <div className="mt-2 h-1 bg-white/8">
                    <div className="h-1 bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] text-muted-foreground tabular-nums">
                    <span>R$ {ch.spend.toLocaleString('pt-BR')} investidos</span>
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> R$ {ch.revenue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">O que está mudando</h2>
          </div>
          <p className="text-sm leading-relaxed text-[#cfc6ba]">{trends.summary}</p>
          <ul className="mt-4 space-y-3">
            {trends.macroTrends.slice(0, 2).map((t, idx) => (
              <li key={idx} className="border-l border-primary/70 pl-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{t.name}</span>
                  <span className="text-primary tabular-nums">{t.growthRate}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{t.recommendedAction}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onNavigateTab('trends')} className="mt-4 text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Ver o radar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>
    </div>
  );
};
