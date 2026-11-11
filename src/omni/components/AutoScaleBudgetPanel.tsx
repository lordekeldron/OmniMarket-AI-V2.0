// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState } from 'react';
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Flame,
  Clock,
  History,
  Layers,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ChannelPerformanceData } from '../types';
import {
  PerformanceSpike,
  AutoScaleSettings,
  DEFAULT_AUTOSCALE_SETTINGS,
  detectPerformanceSpikes,
  calculateDynamicBudgetScale,
  applyAutoScaleSpike,
  generateSyntheticSpike,
} from '../utils/marketingMath';

interface AutoScaleBudgetPanelProps {
  channels: ChannelPerformanceData[];
  onApplyScaledChannels: (updatedChannels: ChannelPerformanceData[]) => void;
  brandName: string;
}

export const AutoScaleBudgetPanel: React.FC<AutoScaleBudgetPanelProps> = ({
  channels,
  onApplyScaledChannels,
  brandName,
}) => {
  // Settings state
  const [settings, setSettings] = useState<AutoScaleSettings>(DEFAULT_AUTOSCALE_SETTINGS);
  const [showConfig, setShowConfig] = useState(false);

  // Spikes state - initialized from real channel metrics
  const [spikes, setSpikes] = useState<PerformanceSpike[]>(() =>
    detectPerformanceSpikes(channels, DEFAULT_AUTOSCALE_SETTINGS)
  );

  // Audit history of applied scale actions
  const [auditLog, setAuditLog] = useState<
    Array<{
      id: string;
      timestamp: string;
      channelName: string;
      prevDaily: number;
      newDaily: number;
      deltaDaily: number;
      projectedRev: number;
      spikeType: string;
    }>
  >([
    {
      id: 'log-seed-1',
      timestamp: 'Há 45 min',
      channelName: 'Instagram',
      prevDaily: 150,
      newDaily: 195,
      deltaDaily: 45,
      projectedRev: 270,
      spikeType: 'Surge de ROAS (+35%)',
    },
    {
      id: 'log-seed-2',
      timestamp: 'Há 2 horas',
      channelName: 'TikTok Ads',
      prevDaily: 120,
      newDaily: 156,
      deltaDaily: 36,
      projectedRev: 215,
      spikeType: 'Velocidade Viral de CTR (+42%)',
    },
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Update settings handler
  const handleUpdateSettings = (partial: Partial<AutoScaleSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);

    // Recalculate pending spikes with new settings
    setSpikes((prev) =>
      prev.map((s) => {
        if (s.status !== 'pending') return s;
        const calc = calculateDynamicBudgetScale(
          s.currentDailyBudget,
          { spikeType: s.spikeType, currentRoas: s.currentValue, deltaPct: s.deltaPct },
          next
        );
        return {
          ...s,
          suggestedDailyBudget: calc.suggestedDailyBudget,
          budgetDelta: calc.budgetDelta,
          projectedIncrementalRevenue:
            calc.projectedRevenue - Math.round(s.currentDailyBudget * s.currentValue),
          projectedNewRoas: calc.projectedRoas,
        };
      })
    );
  };

  // Apply single spike
  const handleApplySpike = (spike: PerformanceSpike) => {
    const updatedChannels = applyAutoScaleSpike(channels, spike);
    onApplyScaledChannels(updatedChannels);

    setSpikes((prev) =>
      prev.map((s) => (s.id === spike.id ? { ...s, status: 'applied' } : s))
    );

    // Add to audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setAuditLog((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: `Hoje às ${timeStr}`,
        channelName: spike.channelName,
        prevDaily: spike.currentDailyBudget,
        newDaily: spike.suggestedDailyBudget,
        deltaDaily: spike.budgetDelta,
        projectedRev: spike.projectedIncrementalRevenue,
        spikeType: spike.metricName,
      },
      ...prev,
    ]);

    showToast(
      `Orçamento de ${spike.channelName} escalonado para R$ ${spike.suggestedDailyBudget}/dia (+R$ ${spike.budgetDelta}/dia)!`
    );
  };

  // Dismiss a spike
  const handleDismissSpike = (spikeId: string) => {
    setSpikes((prev) =>
      prev.map((s) => (s.id === spikeId ? { ...s, status: 'dismissed' } : s))
    );
  };

  // Apply all pending spikes at once
  const handleApplyAllPending = () => {
    const pendingList = spikes.filter((s) => s.status === 'pending');
    if (pendingList.length === 0) return;

    let updated = [...channels];
    const newLogs: typeof auditLog = [];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    pendingList.forEach((spike) => {
      updated = applyAutoScaleSpike(updated, spike);
      newLogs.push({
        id: `log-${Date.now()}-${spike.id}`,
        timestamp: `Hoje às ${timeStr}`,
        channelName: spike.channelName,
        prevDaily: spike.currentDailyBudget,
        newDaily: spike.suggestedDailyBudget,
        deltaDaily: spike.budgetDelta,
        projectedRev: spike.projectedIncrementalRevenue,
        spikeType: spike.metricName,
      });
    });

    onApplyScaledChannels(updated);
    setSpikes((prev) =>
      prev.map((s) => (s.status === 'pending' ? { ...s, status: 'applied' } : s))
    );
    setAuditLog((prev) => [...newLogs, ...prev]);
    showToast(`${pendingList.length} escalonamentos dinâmicos aprovados e sincronizados!`);
  };

  // Simulate on-demand synthetic spike
  const handleSimulateLiveSpike = (type: 'roas' | 'viral') => {
    const newSpike = generateSyntheticSpike(channels, type, settings);

    // If autoMode is true, auto apply directly!
    if (settings.autoMode) {
      const updated = applyAutoScaleSpike(channels, newSpike);
      onApplyScaledChannels(updated);
      setSpikes((prev) => [{ ...newSpike, status: 'applied' }, ...prev]);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      setAuditLog((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: `Hoje às ${timeStr} (Piloto Automático)`,
          channelName: newSpike.channelName,
          prevDaily: newSpike.currentDailyBudget,
          newDaily: newSpike.suggestedDailyBudget,
          deltaDaily: newSpike.budgetDelta,
          projectedRev: newSpike.projectedIncrementalRevenue,
          spikeType: newSpike.metricName,
        },
        ...prev,
      ]);

      showToast(
        `[Piloto Automático] Spike detectado em ${newSpike.channelName}: Orçamento diário auto-escalonado para R$ ${newSpike.suggestedDailyBudget}/dia!`
      );
    } else {
      setSpikes((prev) => [newSpike, ...prev]);
      showToast(
        `Novo spike em tempo real detectado em ${newSpike.channelName}! Ajuste diário sugerido disponível para aprovação.`
      );
    }
  };

  const pendingSpikes = spikes.filter((s) => s.status === 'pending');
  const totalSuggestedIncrementalSpend = pendingSpikes.reduce(
    (acc, s) => acc + (s.budgetDelta > 0 ? s.budgetDelta : 0),
    0
  );
  const totalProjectedDailyRevenue = pendingSpikes.reduce(
    (acc, s) => acc + (s.projectedIncrementalRevenue > 0 ? s.projectedIncrementalRevenue : 0),
    0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-400 hover:text-emerald-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header & Auto-Scale Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Auto-Scale Budget · Ajuste Dinâmico por Spikes de Performance
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Tempo Real 24/7
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitora a velocidade de conversão e picos repentinos de ROAS para {brandName}, sugerindo e aplicando
            escalonamentos diários para capturar receita marginal antes do pico arrefecer.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Mode Switch: Auto-Apply vs Manual Approval */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleUpdateSettings({ autoMode: false })}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                !settings.autoMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Aprovação Manual
            </button>
            <button
              type="button"
              onClick={() => handleUpdateSettings({ autoMode: true })}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                settings.autoMode
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${settings.autoMode ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              <span>Piloto Automático</span>
            </button>
          </div>

          {/* Simulate Live Spike Demo Button */}
          <button
            type="button"
            onClick={() => handleSimulateLiveSpike('roas')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap"
            title="Injeta um spike de performance simulado para testar o algoritmo"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simular Spike ao Vivo</span>
          </button>

          {/* Toggle Guardrails / Settings Button */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Guardrails</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Guardrails and Aggressiveness Configuration Drawer */}
      {showConfig && (
        <div className="p-4 bg-slate-950/70 border border-indigo-900/50 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Travas de Segurança & Guardrails do Auto-Scale
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Proteção ativa contra queima de orçamento</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Aggressiveness Level */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">Agressividade de Escala</span>
              <div className="grid grid-cols-3 gap-1 pt-1">
                {(['conservative', 'moderate', 'aggressive'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleUpdateSettings({ aggressiveness: lvl })}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold text-center transition-all ${
                      settings.aggressiveness === lvl
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl === 'conservative' ? '+15%' : lvl === 'moderate' ? '+30%' : '+50%'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 block pt-1">
                {settings.aggressiveness === 'conservative'
                  ? 'Conservador: incrementos moderados (+15%) com menor exposição.'
                  : settings.aggressiveness === 'moderate'
                  ? 'Moderado (Recomendado): escala ótima (+30%) balanceando saturação.'
                  : 'Agressivo: aceleração máxima (+50%) para capturar virais rápidos.'}
              </span>
            </div>

            {/* Min ROAS Floor */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Piso Mínimo de ROAS</span>
                <span className="font-mono text-emerald-400">{settings.minRoasFloor.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.1"
                value={settings.minRoasFloor}
                onChange={(e) => handleUpdateSettings({ minRoasFloor: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Se o canal registrar ROAS inferior a {settings.minRoasFloor.toFixed(1)}x, qualquer escalonamento é congelado.
              </span>
            </div>

            {/* Max Daily Spend Cap */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Teto Máximo Diário / Canal</span>
                <span className="font-mono text-indigo-400">R$ {settings.maxDailyCap.toLocaleString('pt-BR')}/dia</span>
              </div>
              <input
                type="range"
                min="500"
                max="8000"
                step="250"
                value={settings.maxDailyCap}
                onChange={(e) => handleUpdateSettings({ maxDailyCap: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Limite absoluto de gasto diário mesmo durante os maiores picos.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Spike Impact Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Spikes Ativos Detectados
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white font-mono">{pendingSpikes.length}</span>
            {pendingSpikes.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-[11px] text-slate-400">Requerem atenção ou piloto</span>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Incremento Diário Sugerido
          </span>
          <div className="text-xl font-extrabold text-amber-400 font-mono">
            +R$ {totalSuggestedIncrementalSpend.toLocaleString('pt-BR')}/dia
          </div>
          <span className="text-[11px] text-slate-400">Rebalanceamento imediato</span>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Receita Diária Adicional Prevista
          </span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">
            +R$ {totalProjectedDailyRevenue.toLocaleString('pt-BR')}/dia
          </div>
          <span className="text-[11px] text-slate-400">Modelagem econométrica</span>
        </div>

        <div className="flex items-center justify-end">
          {pendingSpikes.length > 0 ? (
            <button
              type="button"
              onClick={handleApplyAllPending}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Aprovar Todos ({pendingSpikes.length})</span>
            </button>
          ) : (
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Orçamentos Otimizados</span>
              </span>
              <span className="text-[11px] text-slate-400">Nenhum spike pendente</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Spikes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Fila de Picos em Tempo Real & Sugestões de Escala</span>
          </h3>
          <span className="text-xs text-slate-400">
            Atualizado continuamente via telemetria
          </span>
        </div>

        {spikes.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
            Nenhum spike ativo no momento. Clique em &quot;Simular Spike ao Vivo&quot; para disparar um evento sob demanda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spikes.map((spike) => {
              const isPending = spike.status === 'pending';
              const isApplied = spike.status === 'applied';
              const isDismissed = spike.status === 'dismissed';
              const isProtective = spike.spikeType === 'cpa_spike_fatigue';

              return (
                <div
                  key={spike.id}
                  className={`p-5 rounded-xl border transition-all space-y-4 ${
                    isApplied
                      ? 'bg-slate-950/60 border-emerald-900/40 opacity-80'
                      : isDismissed
                      ? 'bg-slate-950/30 border-slate-800/40 opacity-40'
                      : isProtective
                      ? 'bg-gradient-to-br from-slate-900 to-amber-950/30 border-amber-800/60 shadow-sm'
                      : 'bg-gradient-to-br from-slate-900 to-indigo-950/40 border-indigo-800/60 shadow-md'
                  }`}
                >
                  {/* Card Header: Channel & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base">
                          {spike.channelName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isProtective
                              ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                              : spike.spikeType === 'viral_creative'
                              ? 'bg-pink-950 text-pink-300 border border-pink-700/60'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          }`}
                        >
                          {isProtective
                            ? 'PROTEÇÃO CONTRA FADIGA'
                            : spike.spikeType === 'viral_creative'
                            ? 'VELOCIDADE VIRAL'
                            : 'SURGE DE CONVERSÃO'}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{spike.detectedAt}</span>
                        </span>
                      </div>
                      <div className="text-xs text-indigo-300 font-medium">
                        Campanha: &quot;{spike.campaignName}&quot;
                      </div>
                    </div>

                    {isApplied && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-800/60">
                        <Check className="w-3.5 h-3.5" />
                        <span>Aplicado</span>
                      </span>
                    )}
                  </div>

                  {/* Creative Hook / Trigger Details */}
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
                    <span className="text-[11px] text-slate-400 block">Criativo em Pico:</span>
                    <span className="text-slate-200 font-medium italic block">
                      {spike.creativeHook}
                    </span>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400">{spike.metricName}:</span>
                      <strong className="text-white font-mono">
                        {spike.benchmarkValue}x ➔{' '}
                        <span className={isProtective ? 'text-amber-400' : 'text-emerald-400'}>
                          {spike.currentValue}x ({spike.deltaPct > 0 ? `+${spike.deltaPct}%` : `${spike.deltaPct}%`})
                        </span>
                      </strong>
                    </div>
                  </div>

                  {/* Budget Scaling Matrix */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/90 p-3 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Orçamento Diário Atual
                      </span>
                      <div className="font-mono text-sm sm:text-base font-bold text-slate-300">
                        R$ {spike.currentDailyBudget}/dia
                      </div>
                      <span className="text-[10px] text-slate-400">
                        R$ {(spike.currentDailyBudget * 30).toLocaleString('pt-BR')}/mês
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">
                        {isProtective ? 'Orçamento Protegido' : 'Orçamento Sugerido'}
                      </span>
                      <div className="font-mono text-sm sm:text-base font-extrabold text-emerald-400">
                        R$ {spike.suggestedDailyBudget}/dia
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        {spike.budgetDelta > 0 ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span>+R$ {spike.budgetDelta}/dia</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3 text-amber-400" />
                            <span>R$ {spike.budgetDelta}/dia</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Projected Financial Impact & Confidence */}
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {spike.rationale}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span>Receita Diária Estimada:</span>
                      <strong className="text-emerald-400 font-mono">
                        +R$ {spike.projectedIncrementalRevenue.toLocaleString('pt-BR')}/dia (ROAS {spike.projectedNewRoas}x)
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span>Confiança Algorítmica:</span>
                      <span className="text-indigo-300 font-mono font-bold">
                        {spike.confidenceScore}% (Base Histórica Validada)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplySpike(spike)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                          isProtective
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isProtective ? 'Aplicar Redução Protetiva' : 'Aprovar Escalonamento Diário'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismissSpike(spike.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit History / Log of Executed Dynamic Adjustments */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Histórico de Escalonamentos Dinâmicos Executados
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            {auditLog.length} eventos registrados nesta sessão
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {auditLog.map((log) => (
            <div
              key={log.id}
              className="p-2.5 bg-slate-900/70 border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-bold text-white">{log.channelName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300 font-mono">
                  R$ {log.prevDaily}/dia ➔{' '}
                  <strong className="text-emerald-400">R$ {log.newDaily}/dia</strong>{' '}
                  ({log.deltaDaily > 0 ? `+R$ ${log.deltaDaily}` : `-R$ ${Math.abs(log.deltaDaily)}`}/dia)
                </span>
                <span className="text-[11px] text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/50">
                  {log.spikeType}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-400 text-[11px] sm:text-right shrink-0">
                <span className="text-emerald-400 font-mono font-semibold">
                  +R$ {log.projectedRev}/dia capturado
                </span>
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
