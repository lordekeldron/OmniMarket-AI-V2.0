// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
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
  Compass,
  Search
} from 'lucide-react';
import { BrandProfile, TrendData, MacroTrend } from '../types';
import { GlobalTrendHeatmap } from './GlobalTrendHeatmap';

interface TrendsViewProps {
  brand: BrandProfile;
  trends: TrendData;
  onUpdateTrends: (newTrends: TrendData) => void;
  onSelectTrendForCampaign: (trend: MacroTrend) => void;
}

type TrendSource = {
  title: string;
  description: string;
  url: string;
  sourceType: 'news' | 'web';
  publishedAt: string | null;
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [trendSources, setTrendSources] = useState<TrendSource[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const defaultQuery = [brand.name, brand.industry].filter(Boolean).join(' ') || 'tendências de consumo Brasil';

  const handleRefreshTrends = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (searchQuery.trim() || defaultQuery).slice(0, 180);
    setLoading(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/firecrawl/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Não foi possível consultar tendências agora.');
      }

      onUpdateTrends(result.data);
      setTrendSources(Array.isArray(result.sources) ? result.sources : []);
      setSearchedAt(result.searchedAt || new Date().toISOString());
      setSearchedQuery(query);
      setSelectedCategory('all');
      setCustomSearch('');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Não foi possível consultar o Firecrawl.');
    } finally {
      setLoading(false);
    }
  };

  const copyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const formatSourceDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR');
  };

  const getSourceHost = (value: string) => {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return value;
    }
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
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Radar de Tendências da Web</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Pesquise sinais recentes sobre {brand.name} usando páginas e notícias encontradas pelo Firecrawl.
          </p>
        </div>

        <form onSubmit={handleRefreshTrends} className="w-full xl:max-w-xl">
          <label htmlFor="firecrawl-topic" className="sr-only">Tema para pesquisar na web</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="firecrawl-topic"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
                  event.preventDefault();
                }
              }}
              placeholder={defaultQuery}
              maxLength={180}
              autoComplete="off"
              aria-describedby="firecrawl-search-help"
              className="min-w-0 flex-1 px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/60 text-white text-sm font-semibold shadow-md transition-all whitespace-nowrap"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{loading ? 'Pesquisando...' : 'Buscar tendências'}</span>
            </button>
          </div>
          <p id="firecrawl-search-help" className="mt-2 text-[11px] text-slate-400">
            Web e notícias do Brasil, com foco nos últimos 7 dias.
          </p>
          {searchError && <p role="alert" className="mt-2 text-xs text-rose-300">{searchError}</p>}
        </form>
      </div>

      {/* Executive Summary Box */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Zap className="w-32 h-32 text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-wider font-bold rounded-md">
              Resumo da pesquisa
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {trends.summary || 'Pesquise um tema para encontrar tópicos recorrentes em notícias e páginas recentes.'}
          </p>
          {searchedAt && (
            <p className="mt-3 text-xs text-slate-400">
              Busca por “{searchedQuery}” concluída em {new Date(searchedAt).toLocaleString('pt-BR')}.
            </p>
          )}
          {trends.roiOpportunity && (
            <div className="mt-4 flex items-start gap-2 text-emerald-300/90 text-sm bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Zap className="w-4 h-4 mt-0.5 shrink-0" />
              <span><strong>Como interpretar:</strong> {trends.roiOpportunity}</span>
            </div>
          )}
        </div>
      </div>
      {trendSources.length > 0 && (
        <section aria-label="Fontes encontradas pelo Firecrawl" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">Fontes recentes</h2>
            <span className="text-xs text-slate-400">{trendSources.length} resultados</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {trendSources.map((source) => {
              const dateLabel = formatSourceDate(source.publishedAt);
              return (
                <article key={source.url} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                      {source.sourceType === 'news' ? 'Notícia' : 'Web'}
                    </span>
                    {dateLabel && source.publishedAt && (
                      <time dateTime={source.publishedAt} className="text-[11px] text-slate-500">
                        {dateLabel}
                      </time>
                    )}
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir fonte: ${source.title}`}
                    className="flex items-start justify-between gap-3 text-sm font-semibold text-slate-100 hover:text-indigo-300"
                  >
                    <span>{source.title}</span>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                  </a>
                  {source.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">{source.description}</p>}
                  <p className="mt-3 truncate text-[11px] text-slate-500">{getSourceHost(source.url)}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
            { id: 'comport', label: 'Comportamento' },
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
        {filteredTrends.length > 0 ? filteredTrends.map((trend, idx) => (
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
                  <span className="text-[10px] text-slate-400">
                    {trend.growthRate.includes('fonte') ? 'recorrência nas fontes' : 'crescimento estimado'}
                  </span>
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
        )) : (
          <div role="status" className="col-span-full rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-200">
              {trends.macroTrends.length > 0
                ? 'Nenhum tema corresponde aos filtros selecionados.'
                : 'Faça uma busca acima para descobrir temas recorrentes da web.'}
            </p>
          </div>
        )}
      </div>

      {trends.viralHooks.length > 0 && (
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
      )}
    </div>
  );
};
