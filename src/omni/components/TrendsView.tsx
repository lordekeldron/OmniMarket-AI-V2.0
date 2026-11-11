import React, { useState } from 'react';
import {
  TrendingUp,
  Flame,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Zap,
  BarChart2,
  Compass
} from 'lucide-react';
import { BrandProfile, TrendData, MacroTrend } from '../types';
import { GlobalTrendHeatmap } from './GlobalTrendHeatmap';

interface TrendsViewProps {
  brand: BrandProfile;
  trends: TrendData;
  onUpdateTrends: (newTrends: TrendData) => void;
  onSelectTrendForCampaign: (trend: MacroTrend) => void;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  brand,
  trends,
  onUpdateTrends,
  onSelectTrendForCampaign,
}) => {
  const [loading, setLoading] = useState(false);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customSearch, setCustomSearch] = useState('');

  const handleRefreshTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand.name,
          industry: brand.industry,
          targetAudience: brand.targetAudience,
          currentContext: 'Tendências de mercado para o trimestre atual',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onUpdateTrends(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const filteredTrends = trends.macroTrends.filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      t.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !customSearch.trim() ||
      t.name.toLowerCase().includes(customSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(customSearch.toLowerCase()) ||
      t.recommendedAction.toLowerCase().includes(customSearch.toLowerCase()) ||
      t.relevantKeywords.some((k) => k.toLowerCase().includes(customSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Refresh Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Inteligência de Tendências de Consumo</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitoramento de comportamento de compra, viralidade cultural e sinais fracos para {brand.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshTrends}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/60 text-white text-sm font-semibold shadow-md transition-all whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analisando Mercado...' : 'Atualizar com IA em Tempo Real'}</span>
        </button>
      </div>

      {/* Executive Summary Box */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Diagnóstico de Mercado & Oportunidade de ROI</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          {trends.summary}
        </p>
        {trends.roiOpportunity && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2.5 text-xs text-emerald-400 font-medium">
            <Zap className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Alavanca de ROI: {trends.roiOpportunity}</span>
          </div>
        )}
      </div>

      <GlobalTrendHeatmap
        brand={brand}
        onSelectTrendForCampaign={onSelectTrendForCampaign}
        onFocusTopic={(topic) => {
          const query: Record<string, string> = {
            'Vídeo curto': 'Reels',
            'Quiet luxury': 'Quiet',
            'IA no atendimento': 'IA',
            Sustentabilidade: 'sustent',
            'Social commerce': 'Social',
            'Live shopping': 'Shopping',
          };
          setSelectedCategory('all');
          setCustomSearch(query[topic] ?? topic);
        }}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Todas as Tendências' },
            { id: 'comportamental', label: 'Comportamento' },
            { id: 'sustentabilidade', label: 'Sustentabilidade' },
            { id: 'tecnol', label: 'Tecnologia & IA' },
            { id: 'social', label: 'Social & UGC' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={customSearch}
          onChange={(e) => setCustomSearch(e.target.value)}
          placeholder="Buscar palavras-chave ou temas..."
          className="w-full sm:w-64 px-3.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Macro Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTrends.map((trend, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                    {trend.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {trend.name}
                  </h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-base font-mono font-extrabold text-emerald-400">
                    {trend.growthRate}
                  </span>
                  <span className="text-[10px] text-slate-400">crescimento</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {trend.description}
              </p>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Recomendação Tática
                </span>
                <p className="text-xs text-indigo-200 font-medium">
                  {trend.recommendedAction}
                </p>
              </div>

              {/* Keywords */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {trend.relevantKeywords.map((kw, kidx) => (
                  <span
                    key={kidx}
                    className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onSelectTrendForCampaign(trend)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-slate-200 hover:text-white transition-all group-hover:bg-indigo-600 group-hover:text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar Campanha com Esta Tendência</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Viral Hooks Catalog */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-white">Ganchos Virais Prontos para Teste</h2>
            <p className="text-xs text-slate-400">Formatos psicológicos de alta retenção nos primeiros 3 segundos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.viralHooks.map((hook, hidx) => (
            <div
              key={hidx}
              className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl flex flex-col justify-between"
            >
              <p className="text-xs text-slate-200 italic leading-relaxed mb-3">
                {hook}
              </p>
              <button
                type="button"
                onClick={() => copyHook(hook, hidx)}
                className="flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2 border-t border-slate-700/60 transition-colors"
              >
                <span>{copiedHookIndex === hidx ? 'Copiado para área de transferência!' : 'Copiar Gancho'}</span>
                {copiedHookIndex === hidx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
