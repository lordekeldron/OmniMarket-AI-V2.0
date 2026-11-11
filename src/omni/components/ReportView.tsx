// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React from 'react';
import {
  FileText,
  Printer,
  Presentation,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Building2
} from 'lucide-react';
import { BrandProfile, ChannelPerformanceData, TrendData, CompetitorData, CampaignCreative } from '../types';

interface ReportViewProps {
  brand: BrandProfile;
  channels: ChannelPerformanceData[];
  trends: TrendData;
  competitors: CompetitorData[];
  campaign: CampaignCreative;
  onOpenSlideDeck: () => void;
  onTriggerPrint: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  brand,
  channels,
  trends,
  competitors,
  campaign,
  onOpenSlideDeck,
  onTriggerPrint,
}) => {
  const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const totalConversions = channels.reduce((sum, c) => sum + c.conversions, 0);
  const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const avgCPA = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* Header & Export CTAs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Relatório Executivo de Desempenho & Inteligência</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Documento consolidado de métricas, tendências e projeções preditivas pronto para exportação em PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSlideDeck}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-colors"
          >
            <Presentation className="w-4 h-4 text-indigo-400" />
            <span>Gerar Apresentação de Slides</span>
          </button>

          <button
            type="button"
            onClick={onTriggerPrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Exportar Relatório em PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-8 shadow-2xl print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: brand.accentColor }}
              >
                {brand.logoInitial || 'OM'}
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white print:text-slate-900">
                {brand.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Relatório Executivo de Marketing & Inteligência Preditiva de ROI
            </p>
          </div>

          <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
            <div>Data: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div>Status: <span className="text-emerald-400 font-bold print:text-emerald-700">Auditado & Otimizado</span></div>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/60 print:bg-slate-100 print:border-slate-300 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-indigo-700">
            1. Resumo Executivo & Conclusões Preditivas
          </span>
          <p className="text-xs sm:text-sm text-slate-200 print:text-slate-800 leading-relaxed">
            No período recente, a estratégia de marketing de <strong className="text-white print:text-slate-900">{brand.name}</strong> gerou um total de <strong className="text-emerald-400 print:text-emerald-700">R$ {totalRevenue.toLocaleString('pt-BR')}</strong> em faturamento a partir de um investimento de <strong className="text-slate-100 print:text-slate-900">R$ {totalSpend.toLocaleString('pt-BR')}</strong>, consolidando um ROAS global de <strong className="text-white print:text-slate-900">{blendedROAS}x</strong>. A implementação do algoritmo preditivo de rebalanceamento aponta capacidade de expansão para ROAS superior a 4.7x com o redirecionamento de verba para formatos de vídeo dinâmico e retenção qualificada.
          </p>
        </div>

        {/* Scorecard KPI Grid */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            2. Indicadores-Chave de Desempenho (Scorecard Global)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
              <span className="text-[11px] text-slate-400 print:text-slate-500 uppercase">Receita Bruta</span>
              <div className="text-xl font-bold font-mono text-white print:text-slate-900 mt-1">
                R$ {totalRevenue.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
              <span className="text-[11px] text-slate-400 print:text-slate-500 uppercase">Investimento em Mídia</span>
              <div className="text-xl font-bold font-mono text-white print:text-slate-900 mt-1">
                R$ {totalSpend.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
              <span className="text-[11px] text-slate-400 print:text-slate-500 uppercase">ROAS Blended</span>
              <div className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-700 mt-1">
                {blendedROAS}x
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
              <span className="text-[11px] text-slate-400 print:text-slate-500 uppercase">CPA Médio Global</span>
              <div className="text-xl font-bold font-mono text-purple-400 print:text-purple-700 mt-1">
                R$ {avgCPA}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Channel Breakdown Table */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            3. Tabela de Atribuição e Eficiência por Canal de Mídia
          </span>
          <div className="overflow-x-auto border border-slate-800 rounded-xl print:border-slate-300">
            <table className="w-full text-xs text-left text-slate-300 print:text-slate-800">
              <thead className="text-[10px] uppercase bg-slate-800/80 text-slate-400 print:bg-slate-200 print:text-slate-700">
                <tr>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Investimento</th>
                  <th className="py-3 px-4">Receita Gerada</th>
                  <th className="py-3 px-4">Conversões</th>
                  <th className="py-3 px-4">CTR</th>
                  <th className="py-3 px-4">CPA</th>
                  <th className="py-3 px-4">ROAS Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {channels.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white print:text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono">R$ {c.spend.toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 print:text-emerald-700 font-bold">
                      R$ {c.revenue.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-mono">{c.conversions}</td>
                    <td className="py-3 px-4 font-mono">{c.ctr}%</td>
                    <td className="py-3 px-4 font-mono">R$ {c.cpa}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400 print:text-indigo-700">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trends & Competitors Impact Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Trends */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 print:text-amber-700">
              4. Oportunidades Identificadas em Tendências de Consumo
            </span>
            <ul className="space-y-2 text-xs text-slate-300 print:text-slate-700">
              {trends.macroTrends.map((t, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>{t.name} ({t.growthRate}):</strong> {t.recommendedAction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Competitor Benchmark */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 print:text-rose-700">
              5. Inteligência Competitiva & Gaps a Explorar
            </span>
            <ul className="space-y-2 text-xs text-slate-300 print:text-slate-700">
              {competitors.map((comp) => (
                <li key={comp.id} className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">»</span>
                  <span><strong>{comp.name} ({comp.marketShare} share):</strong> {comp.counterStrategy}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Strategic Next Steps */}
        <div className="p-5 bg-gradient-to-r from-indigo-950/40 to-slate-900 rounded-xl border border-indigo-800/60 print:bg-slate-100 print:border-slate-300 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 print:text-indigo-800">
            6. Plano de Ação Imediato para Escala de ROI
          </span>
          <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed">
            1. Escalar orçamento em Instagram Reels e TikTok Spark Ads em até +40% aproveitando os ganchos visuais gerados pelo Campaign Studio.<br />
            2. Ativar as 3 regras de engajamento social automatizado para recuperar clientes em potencial em menos de 60 segundos.<br />
            3. Veicular campanhas de fundo de funil destacando as vulnerabilidades de pós-venda dos concorrentes diretos.
          </p>
        </div>

        {/* Footer Signature */}
        <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-[11px] text-slate-500 print:text-slate-600">
          <span>OmniMarket AI · Sistema de Inteligência Autônoma de Marketing</span>
          <span>Página 1 de 1 · Documento Confidencial</span>
        </div>
      </div>
    </div>
  );
};
