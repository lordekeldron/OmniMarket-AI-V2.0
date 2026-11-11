// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState } from 'react';
import {
  TrendingUp,
  Zap,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Sparkles,
  BarChart3,
  Check,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { BrandProfile, ChannelPerformanceData } from '../types';
import { optimizeChannelAllocations, calculateROAS } from '../utils/marketingMath';
import { AutoScaleBudgetPanel } from './AutoScaleBudgetPanel';

interface RoiEngineProps {
  brand: BrandProfile;
  channels: ChannelPerformanceData[];
  onApplyNewAllocations: (newChannels: ChannelPerformanceData[]) => void;
}

export const RoiEngine: React.FC<RoiEngineProps> = ({
  brand,
  channels,
  onApplyNewAllocations,
}) => {
  const [liveTelemetryActive, setLiveTelemetryActive] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [applied, setApplied] = useState(false);
  const [customSpends, setCustomSpends] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    channels.forEach((c) => {
      map[c.id] = c.spend;
    });
    return map;
  });

  const totalCurrentSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalCurrentRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const currentOverallROAS = calculateROAS(totalCurrentRevenue, totalCurrentSpend);

  // Compute recommended allocation using pure tested logic
  const optimization = optimizeChannelAllocations(channels);

  const handleSpendSliderChange = (channelId: string, val: number) => {
    setCustomSpends((prev) => ({ ...prev, [channelId]: val }));
    setApplied(false);
  };

  const handleOneClickOptimize = async () => {
    // 1. Instantly apply mathematically proven rebalancing
    const newMap: Record<string, number> = {};
    optimization.items.forEach((item) => {
      newMap[item.channelId] = item.recommendedSpend;
    });
    setCustomSpends(newMap);

    const updatedChannels: ChannelPerformanceData[] = channels.map((c) => {
      const item = optimization.items.find((i) => i.channelId === c.id);
      const newSpend = item ? item.recommendedSpend : c.spend;
      const newRevenue = item ? item.predictedRevenue : c.revenue;
      const newRoas = item ? item.predictedROAS : c.roas;
      return {
        ...c,
        spend: newSpend,
        revenue: newRevenue,
        roas: newRoas,
        cpa: Number((newSpend / (c.conversions || 1)).toFixed(2)),
      };
    });

    onApplyNewAllocations(updatedChannels);
    setApplied(true);

    // 2. Fetch AI econometrics analysis in background
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/predictive-roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand.name,
          currentSpend: totalCurrentSpend,
          channelsData: channels,
        }),
      });
      await res.json();
    } catch (err) {
      console.error('Error optimizing ROI:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleApplyScaledChannels = (updatedChannels: ChannelPerformanceData[]) => {
    const newMap: Record<string, number> = {};
    updatedChannels.forEach((c) => {
      newMap[c.id] = c.spend;
    });
    setCustomSpends(newMap);
    onApplyNewAllocations(updatedChannels);
    setApplied(true);
  };

  const handleReset = () => {
    const map: Record<string, number> = {};
    channels.forEach((c) => {
      map[c.id] = c.spend;
    });
    setCustomSpends(map);
    setApplied(false);
  };

  // Calculate live simulator values based on customSpends
  const simulatedTotalSpend = Object.values(customSpends).reduce((a, b) => a + b, 0);
  const simulatedTotalRevenue = channels.reduce((sum, c) => {
    const spend = customSpends[c.id] || c.spend;
    const ratio = c.spend > 0 ? spend / c.spend : 1;
    // Diminishing returns curve
    const predictedRoas = c.roas * Math.pow(ratio, -0.08);
    return sum + spend * predictedRoas;
  }, 0);
  const simulatedROAS = calculateROAS(simulatedTotalRevenue, simulatedTotalSpend);
  const revenueUpliftPct =
    totalCurrentRevenue > 0
      ? (((simulatedTotalRevenue - totalCurrentRevenue) / totalCurrentRevenue) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Header and 1-Click Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="mb-1">
            <h1 className="text-xl font-semibold text-foreground">ROI</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Modelagem econométrica para realocar orçamentos em tempo real e maximizar o retorno marginal de {brand.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Redefinir</span>
          </button>

          <button
            type="button"
            onClick={handleOneClickOptimize}
            disabled={loadingAi}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-glow disabled:opacity-50 text-primary-foreground text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
          >
            <Sparkles className={`w-4 h-4 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'Calculando Otimização...' : applied ? 'Otimização Preditiva Ativa' : 'Aplicar Rebalanceamento Preditivo'}</span>
          </button>
        </div>
      </div>

      {/* Before / After Projection Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            ROAS Blended Atual
          </span>
          <div className="text-2xl font-semibold text-white font-mono">
            {currentOverallROAS}x
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Baseline antes da reatribuição marginal
          </span>
        </div>

        <div className="border border-white/10 rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 block mb-1">
              ROAS Projetado Pós-Otimização
            </span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              +{(simulatedROAS - currentOverallROAS).toFixed(2)}x
            </span>
          </div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono">
            {simulatedROAS}x
          </div>
          <span className="text-xs text-indigo-200 mt-1 block">
            Aumento previsto de receita: +{revenueUpliftPct}%
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-md p-5">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Receita Estimada Mensal
          </span>
          <div className="text-2xl font-semibold text-white font-mono">
            R$ {Math.round(simulatedTotalRevenue).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+R$ {Math.max(0, Math.round(simulatedTotalRevenue - totalCurrentRevenue)).toLocaleString('pt-BR')} incremental</span>
          </div>
        </div>
      </div>

      {/* Auto-Scale Budget based on Real-Time Campaign Performance Spikes */}
      <AutoScaleBudgetPanel
        channels={channels}
        onApplyScaledChannels={handleApplyScaledChannels}
        brandName={brand.name}
      />

      {/* Interactive Channel Rebalance Sliders & Recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Simulador Interativo de Alocação de Verba</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ajuste as barras para simular o comportamento preditivo ou use a sugestão de machine learning
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Investimento Total Simulado:
            </span>
            <strong className="text-sm font-mono text-white">
              R$ {simulatedTotalSpend.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>

        <div className="space-y-6">
          {channels.map((ch) => {
            const currentVal = customSpends[ch.id] ?? ch.spend;
            const rec = optimization.items.find((i) => i.channelId === ch.id);
            const delta = rec ? rec.spendDelta : 0;
            const isUplift = delta > 0;

            return (
              <div key={ch.id} className="p-4 bg-slate-800/60 rounded-md border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-white">{ch.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>ROAS Atual: <strong className="text-slate-200">{ch.roas}x</strong></span>
                      <span>·</span>
                      <span>ROAS Projetado: <strong className="text-emerald-400">{rec?.predictedROAS || ch.roas}x</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      isUplift
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                    }`}>
                      {isUplift ? `+R$ ${delta.toLocaleString('pt-BR')} (Acelerar)` : `-R$ ${Math.abs(delta).toLocaleString('pt-BR')} (Otimizar)`}
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      R$ {currentVal.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="500"
                  max="20000"
                  step="100"
                  value={currentVal}
                  onChange={(e) => handleSpendSliderChange(ch.id, Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Mínimo R$ 500</span>
                  <span className="text-indigo-300">
                    Recomendação IA: R$ {(rec?.recommendedSpend || ch.spend).toLocaleString('pt-BR')}
                  </span>
                  <span>Máximo R$ 20.000</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Telemetry Event Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">Stream de Telemetria e Otimização em Tempo Real</h2>
          </div>
          <button
            type="button"
            onClick={() => setLiveTelemetryActive(!liveTelemetryActive)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {liveTelemetryActive ? 'Pausar Monitoramento' : 'Retomar Monitoramento'}
          </button>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>[14:41:02] Conversão confirmada: R$ 389,00 via Instagram Reels (Ad: "Alfaiataria Essencial")</span>
            </div>
            <span className="text-emerald-400 font-bold">ROAS 6.2x</span>
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>[14:38:15] Gatilho de Automação: Lance reduzido em 12% no termo "roupa de festa" (Saturação de CPA)</span>
            </div>
            <span className="text-indigo-300 font-bold">Economia Prevista R$ 140/dia</span>
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>[14:35:49] Conversão confirmada: R$ 240,00 via TikTok Spark Ads (UGC #ProvadorReal)</span>
            </div>
            <span className="text-emerald-400 font-bold">CPA R$ 9,20</span>
          </div>
        </div>
      </div>
    </div>
  );
};
