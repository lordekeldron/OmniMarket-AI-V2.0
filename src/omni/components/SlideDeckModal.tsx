import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Printer,
  Sparkles,
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  Users,
  Layers,
  FileText
} from 'lucide-react';
import { BrandProfile, ChannelPerformanceData, TrendData, CompetitorData, CampaignCreative } from '../types';

interface SlideDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandProfile;
  channels: ChannelPerformanceData[];
  trends: TrendData;
  competitors: CompetitorData[];
  campaign: CampaignCreative;
  onTriggerPrint: () => void;
}

export const SlideDeckModal: React.FC<SlideDeckModalProps> = ({
  isOpen,
  onClose,
  brand,
  channels,
  trends,
  competitors,
  campaign,
  onTriggerPrint,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide((prev) => Math.min(prev + 1, 5));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slides = [
    // Slide 1: Cover
    {
      id: 0,
      title: brand.name,
      subtitle: brand.tagline,
      badge: 'Relatório Executivo & Estratégia de Escala',
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-6 h-full">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl"
            style={{ backgroundColor: brand.accentColor }}
          >
            {brand.logoInitial || 'OM'}
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Especialista em Inteligência de Marketing
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {brand.name}
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto">
              {brand.tagline}
            </p>
          </div>
          <div className="pt-4 flex items-center gap-4 text-xs text-slate-400">
            <span>Setor: <strong className="text-white">{brand.industry}</strong></span>
            <span>·</span>
            <span>Tom: <strong className="text-white">{brand.tone}</strong></span>
            <span>·</span>
            <span>Data: <strong className="text-white">{new Date().toLocaleDateString('pt-BR')}</strong></span>
          </div>
        </div>
      ),
      speakerNotes: 'Slide de abertura institucional. Apresentar os objetivos da análise e o posicionamento da marca no trimestre.',
    },

    // Slide 2: Consumer Trends
    {
      id: 1,
      title: 'Tendências de Consumo & Oportunidades Emergentes',
      subtitle: 'Comportamentos de compra e viralidade detectados em tempo real',
      badge: 'Inteligência de Mercado',
      content: (
        <div className="space-y-5 h-full flex flex-col justify-center">
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              "{trends.summary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trends.macroTrends.slice(0, 3).map((t, idx) => (
              <div key={idx} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-indigo-400">{t.category}</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">{t.growthRate}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{t.name}</h4>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{t.recommendedAction}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-800/60 text-xs text-indigo-200">
            <strong>Alavanca Principal de ROI:</strong> {trends.roiOpportunity}
          </div>
        </div>
      ),
      speakerNotes: 'Destacar como a adaptação aos novos formatos de prova social e consumo consciente reduzirá o CAC da marca em até 20%.',
    },

    // Slide 3: Performance Scorecard
    {
      id: 2,
      title: 'Desempenho de Canais & Atribuição de Mídia',
      subtitle: 'Métricas consolidadas de tráfego, vendas e retorno sobre investimento',
      badge: 'Scorecard Financeiro',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 uppercase">Receita Bruta</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                R$ {totalRevenue.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 uppercase">Investimento em Anúncios</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
                R$ {totalSpend.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 uppercase">ROAS Global</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono mt-1">
                {blendedROAS}x
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Canal</th>
                  <th className="py-2.5 px-3">Investimento</th>
                  <th className="py-2.5 px-3">Receita</th>
                  <th className="py-2.5 px-3">Conversões</th>
                  <th className="py-2.5 px-3">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {channels.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-bold text-white">{c.name}</td>
                    <td className="py-2.5 px-3 font-mono">R$ {c.spend.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">R$ {c.revenue.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 font-mono">{c.conversions}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
      speakerNotes: 'Ressaltar que o Instagram Reels e Meta Retargeting apresentaram a maior eficiência marginal da conta.',
    },

    // Slide 4: Predictive ROI Optimization
    {
      id: 3,
      title: 'Otimização Preditiva de ROI & Alocação de Orçamento',
      subtitle: 'Modelagem marginal para aumentar a receita sem elevar o custo global',
      badge: 'Machine Learning & Econometria',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-800 to-indigo-950/40 rounded-xl border border-emerald-800/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Impacto Projetado do Rebalanceamento
                </span>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Crescimento Estimado de Receita: <strong className="text-emerald-400">+38.2%</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">ROAS Projetado</span>
                <span className="text-2xl font-mono font-extrabold text-indigo-400">4.8x</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-emerald-400">Acelerar Investimento:</span>
              <p className="text-slate-300 leading-relaxed">
                • Instagram Reels (+37% de verba) devido a menor saturação de frequência.<br />
                • TikTok Spark Ads (+80% de verba) aproveitando o CPA 45% mais barato.
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-amber-400">Otimizar & Cortar Desperdício:</span>
              <p className="text-slate-300 leading-relaxed">
                • Reduzir palavras genéricas de topo de funil no Google Search.<br />
                • Focar apenas em termos de alta intenção com cupom de conversão direta.
              </p>
            </div>
          </div>
        </div>
      ),
      speakerNotes: 'Explicar a curva de rendimentos decrescentes e por que o corte de 15% no Google gerará ganho líquido na conta.',
    },

    // Slide 5: Competitor Radar
    {
      id: 4,
      title: 'Inteligência Competitiva & Gaps de Mercado',
      subtitle: 'Como capturar clientes insatisfeitos dos concorrentes diretos',
      badge: 'Monitoramento em Tempo Real',
      content: (
        <div className="space-y-4 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp) => (
              <div key={comp.id} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{comp.name}</h4>
                  <span className="text-xs text-rose-400 font-mono font-semibold">{comp.marketShare} share</span>
                </div>
                <div className="text-xs text-slate-300">
                  <strong>Vulnerabilidade Crítica:</strong> {comp.vulnerabilities[0]}
                </div>
                <div className="p-2.5 bg-indigo-950/50 rounded-lg border border-indigo-800/60 text-xs text-indigo-200">
                  <strong>Contra-Estratégia:</strong> {comp.counterStrategy}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300">
            <strong>Diferencial Competitivo Decisivo:</strong> Atendimento humanizado 24/7 com inteligência artificial e garantia total sem fricção.
          </div>
        </div>
      ),
      speakerNotes: 'Apresentar as oportunidades de comparação direta para converter compradores frustrados com o atendimento do concorrente.',
    },

    // Slide 6: Creative Campaign Roadmap
    {
      id: 5,
      title: 'Estratégia Criativa & Próximos Passos',
      subtitle: campaign.campaignName,
      badge: 'Plano de Ação Imediato',
      content: (
        <div className="space-y-5 h-full flex flex-col justify-center">
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-center space-y-1">
            <h3 className="text-lg font-bold text-white">"{campaign.tagline}"</h3>
            <p className="text-xs text-slate-300">{campaign.concept}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-indigo-400">Meta CTR</span>
              <div className="text-lg font-mono font-bold text-emerald-400">{campaign.expectedMetrics?.estimatedCTR || '4.2%'}</div>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-indigo-400">Meta CPA</span>
              <div className="text-lg font-mono font-bold text-white">{campaign.expectedMetrics?.estimatedCPA || 'R$ 18,00'}</div>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-indigo-400">Meta ROAS</span>
              <div className="text-lg font-mono font-bold text-indigo-300">{campaign.expectedMetrics?.projectedROAS || '5.2x'}</div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
            <strong className="text-white block">Cronograma de Implementação:</strong>
            <p>• Dia 1-3: Produção e veiculação dos criativos A/B no Campaign Studio.<br />• Dia 4-7: Ativação das regras de automação social e monitoramento do CPA.<br />• Dia 8+: Escalação preditiva nos canais com ROAS superior a 4.5x.</p>
          </div>
        </div>
      ),
      speakerNotes: 'Finalizar com compromisso de acompanhamento contínuo e revisão semanal dos indicadores chave.',
    },
  ];

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Slide Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Apresentação Executiva de Marketing
              </span>
            </div>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-indigo-400 font-medium">
              Slide {currentSlide + 1} de {slides.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                showNotes
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {showNotes ? 'Ocultar Notas' : 'Notas do Orador'}
            </button>

            <button
              type="button"
              onClick={onTriggerPrint}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Exportar para PDF"
              aria-label="Exportar apresentação em PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Fechar apresentação"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Stage Body */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20">
          {/* Slide Title Header */}
          {slide.id !== 0 && (
            <div className="pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                {slide.badge}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {slide.subtitle}
              </p>
            </div>
          )}

          {/* Slide Interactive Content */}
          <div className="flex-1 flex flex-col justify-center">
            {slide.content}
          </div>

          {/* Speaker Notes Drawer */}
          {showNotes && (
            <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-amber-200/90 shrink-0">
              <strong className="text-amber-400 block mb-0.5">Notas do Orador:</strong>
              {slide.speakerNotes}
            </div>
          )}
        </div>

        {/* Slide Controls Bottom Bar */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <button
            type="button"
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {/* Slide Dots Indicator */}
          <div className="flex items-center gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentSlide === idx
                    ? 'w-6 bg-indigo-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
            aria-label="Próximo slide"
          >
            <span>Próximo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
