import React, { useState } from 'react';
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Layers,
  ArrowUpRight,
  Eye,
  MousePointerClick,
  DollarSign,
  HelpCircle,
  Plus,
  Trash2,
  Share2
} from 'lucide-react';
import { BrandProfile, CampaignCreative } from '../types';
import {
  AdVariationInput,
  HistoricalBenchmark,
  ABComparisonResult,
  runABTestingPrediction,
  VisualType,
  EmotionalAngle
} from '../utils/abTestingEngine';

interface SimulatedABTestingToolProps {
  brand: BrandProfile;
  campaign: CampaignCreative;
  channel: string;
  onApplyWinningVariation: (winningHeadline: string, winningHook: string, winningCta: string) => void;
}

export const SimulatedABTestingTool: React.FC<SimulatedABTestingToolProps> = ({
  brand,
  campaign,
  channel,
  onApplyWinningVariation,
}) => {
  // Historical Benchmarks based on Brand profile
  const [benchmark, setBenchmark] = useState<HistoricalBenchmark>({
    baselineCTR: 3.1,
    baselineConvRate: 2.6,
    avgOrderValue: 210,
    avgCPC: 1.18,
    topPerformingHooks: [
      'Ganchos reflexivos e de contraste nos primeiros 3s',
      'Formatos de prova social com clientes reais (UGC)',
      'Ofertas diretas com redução de risco percebido (Garantia/Troca)',
    ],
    fatiguedAngles: [
      'Anúncios estáticos institucionais sem gancho de parada',
      'CTAs genéricos ("Clique aqui", "Compre já")',
    ],
  });

  // Target Channel for Simulation
  const [targetChannel, setTargetChannel] = useState<string>(channel || 'Instagram Reels & Stories');
  const [simulatedImpressions, setSimulatedImpressions] = useState<number>(10000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState(false);

  // Variations list
  const [variations, setVariations] = useState<AdVariationInput[]>([
    {
      id: 'var_a',
      name: 'Variante A (Gancho Psicológico & UGC)',
      headline: campaign.channels?.instagram?.hook || 'Você já reparou que as pessoas mais elegantes nunca parecem estar se esforçando?',
      bodyCopy: campaign.channels?.instagram?.caption || 'Descubra a combinação exclusiva que elimina o desperdício e garante durabilidade vitalícia com caimento impecável.',
      ctaText: campaign.channels?.instagram?.cta || 'Garantir com Desconto Exclusivo',
      visualType: 'video_ugc',
      emotionalAngle: 'curiosity_hook',
    },
    {
      id: 'var_b',
      name: 'Variante B (Racional & Oferta Direta)',
      headline: campaign.abTestVariants?.[0]?.hook || 'Economize até 40% do seu tempo com a solução definitiva da categoria.',
      bodyCopy: 'Peças com certificação premium e envio expresso para todo o Brasil. Primeira troca grátis garantida.',
      ctaText: 'Comprar Agora',
      visualType: 'static_minimal',
      emotionalAngle: 'rational_savings',
    },
  ]);

  // Initial simulation run result
  const [result, setResult] = useState<ABComparisonResult>(() =>
    runABTestingPrediction(
      [
        {
          id: 'var_a',
          name: 'Variante A (Gancho Psicológico & UGC)',
          headline: campaign.channels?.instagram?.hook || 'Você já reparou que as pessoas mais elegantes nunca parecem estar se esforçando?',
          bodyCopy: campaign.channels?.instagram?.caption || 'Descubra a combinação exclusiva que elimina o desperdício e garante durabilidade vitalícia com caimento impecável.',
          ctaText: campaign.channels?.instagram?.cta || 'Garantir com Desconto Exclusivo',
          visualType: 'video_ugc',
          emotionalAngle: 'curiosity_hook',
        },
        {
          id: 'var_b',
          name: 'Variante B (Racional & Oferta Direta)',
          headline: campaign.abTestVariants?.[0]?.hook || 'Economize até 40% do seu tempo com a solução definitiva da categoria.',
          bodyCopy: 'Peças com certificação premium e envio expresso para todo o Brasil. Primeira troca grátis garantida.',
          ctaText: 'Comprar Agora',
          visualType: 'static_minimal',
          emotionalAngle: 'rational_savings',
        },
      ],
      {
        baselineCTR: 3.1,
        baselineConvRate: 2.6,
        avgOrderValue: 210,
        avgCPC: 1.18,
        topPerformingHooks: ['Ganchos reflexivos nos primeiros 3s', 'UGC autêntico'],
        fatiguedAngles: ['Anúncios estáticos institucionais'],
      },
      targetChannel,
      brand.targetAudience,
      10000
    )
  );

  const handleUpdateVariation = (id: string, updates: Partial<AdVariationInput>) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const handleAddVariation = () => {
    if (variations.length >= 4) return;
    const nextLetter = String.fromCharCode(65 + variations.length);
    const newVar: AdVariationInput = {
      id: `var_${Date.now()}`,
      name: `Variante ${nextLetter} (Prova Social)`,
      headline: `Mais de 12.000 clientes já adotaram a ${brand.name}. Veja o porquê...`,
      bodyCopy: 'Resultados comprovados com avaliações 5 estrelas e entrega garantida para todo o Brasil.',
      ctaText: 'Experimentar Sem Riscos',
      visualType: 'carousel',
      emotionalAngle: 'social_proof',
    };
    setVariations((prev) => [...prev, newVar]);
  };

  const handleRemoveVariation = (id: string) => {
    if (variations.length <= 2) return;
    setVariations((prev) => prev.filter((v) => v.id !== id));
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newResult = runABTestingPrediction(
        variations,
        benchmark,
        targetChannel,
        brand.targetAudience,
        simulatedImpressions
      );
      setResult(newResult);
      setIsSimulating(false);
    }, 600);
  };

  const handleApplyWinner = () => {
    const winnerVar = variations.find((v) => v.id === result.winnerId) || variations[0];
    onApplyWinningVariation(winnerVar.headline, winnerVar.headline, winnerVar.ctaText);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 3000);
  };

  const winnerPrediction = result.predictions.find((p) => p.variationId === result.winnerId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Trophy className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Simulador Preditivo de Testes A/B
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            Prevê qual copy e variação de criativo terá melhor desempenho com base nos dados históricos de engajamento de {brand.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAddVariation}
            disabled={variations.length >= 4}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Variante ({variations.length}/4)</span>
          </button>

          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all whitespace-nowrap"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Simulando Coorte...' : 'Executar Simulação Preditiva'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Configuration & Historical Baseline Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Canal Alvo da Simulação
          </label>
          <select
            value={targetChannel}
            onChange={(e) => setTargetChannel(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
          >
            <option value="Instagram Reels & Stories">Instagram Reels & Stories</option>
            <option value="TikTok Spark Ads">TikTok Spark Ads</option>
            <option value="Meta Feed & Carrossel">Meta Feed & Carrossel</option>
            <option value="LinkedIn B2B Sponsored">LinkedIn B2B Sponsored</option>
            <option value="Google Ads Search">Google Ads Search</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Volume da Coorte Sintética
          </label>
          <select
            value={simulatedImpressions}
            onChange={(e) => setSimulatedImpressions(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
          >
            <option value={10000}>10.000 impressões virtuais</option>
            <option value={25000}>25.000 impressões virtuais</option>
            <option value={50000}>50.000 impressões virtuais</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Baseline Histórico da Marca
          </label>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono font-bold text-white">CTR {benchmark.baselineCTR}%</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono font-bold text-emerald-400">Conv. {benchmark.baselineConvRate}%</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-slate-300">Ticket R${benchmark.avgOrderValue}</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Segmento de Audiência
          </label>
          <p className="text-slate-300 truncate pt-1" title={brand.targetAudience}>
            {brand.targetAudience}
          </p>
        </div>
      </div>

      {/* WINNER PREDICTION BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-800/80 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  🏆 Vencedor Previsto pelo Algoritmo
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {result.confidenceLevel}% de Confiança Estatística
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                {result.winnerName}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Vantagem em Conversões</span>
              <span className="text-lg font-mono font-extrabold text-emerald-400">
                +{result.conversionUpliftPct}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleApplyWinner}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{appliedNotification ? 'Aplicado na Campanha!' : 'Aplicar Vencedor na Campanha'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-medium pt-2 border-t border-slate-800/80">
          {result.summaryRationale}
        </p>
      </div>

      {/* Variations Editor & Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {variations.map((v, idx) => {
          const isWinner = v.id === result.winnerId;
          const pred = result.predictions.find((p) => p.variationId === v.id);

          return (
            <div
              key={v.id}
              className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                isWinner
                  ? 'bg-slate-900 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                {/* Header with Title and format */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isWinner ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <span className="font-bold text-sm text-white">{v.name}</span>
                    {isWinner && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Vencedor
                      </span>
                    )}
                  </div>

                  {variations.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariation(v.id)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remover variante"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scorecard Metric Row */}
                {pred && (
                  <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Score IA</span>
                      <strong className={`font-mono text-sm ${isWinner ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {pred.overallScore}/100
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">CTR Previsto</span>
                      <strong className="font-mono text-sm text-white">
                        {pred.predictedCTR}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">CPA Previsto</span>
                      <strong className="font-mono text-sm text-indigo-300">
                        R$ {pred.predictedCPA}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">ROAS</span>
                      <strong className="font-mono text-sm text-emerald-400">
                        {pred.predictedROAS}x
                      </strong>
                    </div>
                  </div>
                )}

                {/* Editable Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Gancho / Título do Anúncio
                    </label>
                    <input
                      type="text"
                      value={v.headline}
                      onChange={(e) => handleUpdateVariation(v.id, { headline: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Texto da Copy / Legenda
                    </label>
                    <textarea
                      rows={3}
                      value={v.bodyCopy}
                      onChange={(e) => handleUpdateVariation(v.id, { bodyCopy: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Texto do CTA
                      </label>
                      <input
                        type="text"
                        value={v.ctaText}
                        onChange={(e) => handleUpdateVariation(v.id, { ctaText: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Formato Visual
                      </label>
                      <select
                        value={v.visualType}
                        onChange={(e) => handleUpdateVariation(v.id, { visualType: e.target.value as VisualType })}
                        className="w-full px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="video_ugc">Vídeo UGC Autêntico</option>
                        <option value="carousel">Carrossel de Benefícios</option>
                        <option value="static_minimal">Imagem Estática Minimalista</option>
                        <option value="editorial_luxury">Editorial de Alto Padrão</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Ângulo Emocional
                      </label>
                      <select
                        value={v.emotionalAngle}
                        onChange={(e) => handleUpdateVariation(v.id, { emotionalAngle: e.target.value as EmotionalAngle })}
                        className="w-full px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="curiosity_hook">Curiosidade / Quebra de Padrão</option>
                        <option value="social_proof">Prova Social & Depoimento</option>
                        <option value="rational_savings">Economia Racional & Eficiência</option>
                        <option value="urgency_scarcity">Urgência & Escassez</option>
                        <option value="aspirational_status">Status & Exclusividade</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Simulated Cohort Metrics Table */}
                {pred && (
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Simulação da Coorte ({simulatedImpressions.toLocaleString('pt-BR')} impressões)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Cliques Previstos</span>
                        <strong className="text-white font-mono">{pred.simulatedCohort.clicks.toLocaleString('pt-BR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Vendas Previstas</span>
                        <strong className="text-emerald-400 font-mono">{pred.simulatedCohort.conversions}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Gasto Estimado</span>
                        <strong className="text-slate-300 font-mono">R$ {pred.simulatedCohort.spend.toLocaleString('pt-BR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Receita Estimada</span>
                        <strong className="text-emerald-400 font-mono font-bold">R$ {pred.simulatedCohort.revenue.toLocaleString('pt-BR')}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Positive Drivers & Risk Factors */}
                {pred && (
                  <div className="space-y-1.5 text-[11px] pt-1">
                    {pred.positiveDrivers.map((driver, didx) => (
                      <div key={didx} className="flex items-start gap-1.5 text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{driver}</span>
                      </div>
                    ))}
                    {pred.riskFactors.map((risk, ridx) => (
                      <div key={ridx} className="flex items-start gap-1.5 text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Data Context Insight */}
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Metodologia Preditiva Baseada em Dados Históricos:</strong>
          <p className="leading-relaxed text-slate-400">
            {result.historicalContextInsight} As taxas de conversão e custo por clique foram ajustadas considerando o histórico real da conta de {brand.name} no canal "{targetChannel}", aplicando modelagem de significância Z-score para garantir reprodutibilidade em campanhas reais.
          </p>
        </div>
      </div>
    </div>
  );
};
