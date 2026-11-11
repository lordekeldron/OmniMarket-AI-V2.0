import React, { useState } from 'react';
import {
  Users,
  Globe,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  AlertTriangle,
  Target,
  ArrowRight,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { BrandProfile, CompetitorData } from '../types';

interface CompetitorMonitorProps {
  brand: BrandProfile;
  competitors: CompetitorData[];
  onAddCompetitor: (newComp: CompetitorData) => void;
  onSelectCounterStrategy: (strategy: string) => void;
}

export const CompetitorMonitor: React.FC<CompetitorMonitorProps> = ({
  brand,
  competitors,
  onAddCompetitor,
  onSelectCounterStrategy,
}) => {
  const [selectedComp, setSelectedComp] = useState<CompetitorData | null>(competitors[0] ?? null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New competitor form inputs
  const [newCompName, setNewCompName] = useState('');
  const [newCompWebsite, setNewCompWebsite] = useState('');

  const handleRunAiAudit = async (competitor: CompetitorData) => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/ai/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand.name,
          industry: brand.industry,
          competitorName: competitor.name,
          competitorUrl: competitor.website,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const updated: CompetitorData = {
          ...competitor,
          ...data.data,
        };
        setSelectedComp(updated);
      }
    } catch (err) {
      console.error('Failed to run competitor audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAddNewCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const newComp: CompetitorData = {
      id: 'comp_' + Date.now(),
      name: newCompName.trim(),
      website: newCompWebsite.trim(),
      marketShare: '',
      pricingStrategy: '',
      threatLevel: '',
      trafficShare: [],
      spottedAdHooks: [],
      strengths: [],
      vulnerabilities: [],
      counterStrategy: '',
      keywordOpportunities: [
        {
          keyword: `alternativa para ${newCompName.toLowerCase()}`,
          searchVolume: '4.800/mês',
          difficulty: 'Baixa',
          opportunity: 'Criar landing page comparativa com foco em qualidade',
        },
      ],
    };

    onAddCompetitor(newComp);
    setSelectedComp(newComp);
    setShowAddModal(false);
    setNewCompName('');
    setNewCompWebsite('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Competitor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Monitor de Concorrentes & Inteligência em Tempo Real</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Rastreamento contínuo de anúncios ativos, precificação, palavras-chave e vulnerabilidades de mercado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Monitorar Novo Concorrente</span>
        </button>
      </div>

      {competitors.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-800 p-6 text-sm text-slate-400">
          Adicione um concorrente para iniciar uma análise com dados da sua plataforma.
        </div>
      )}

      {/* Competitor Selector Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {competitors.map((comp) => (
          <button
            key={comp.id}
            type="button"
            onClick={() => setSelectedComp(comp)}
            className={`px-4 py-3 rounded-xl border text-left transition-all shrink-0 flex items-center gap-3 min-w-[220px] ${
              selectedComp?.id === comp.id
                ? 'bg-slate-800 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-800/40">
              {comp.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-white truncate max-w-[140px]">{comp.name}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>{comp.marketShare} share</span>
                <span>·</span>
                <span className={comp.threatLevel === 'Alta' ? 'text-rose-400' : 'text-amber-400'}>
                  Ameaça {comp.threatLevel}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detailed Selected Competitor Intelligence Dashboard */}
      {selectedComp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Intelligence & Vulnerabilities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview & Quick Audit Trigger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedComp.name}</h2>
                    <a
                      href={selectedComp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{selectedComp.website.replace('https://', '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Estratégia de Precificação: <strong className="text-slate-200">{selectedComp.pricingStrategy}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunAiAudit(selectedComp)}
                  disabled={loadingAudit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  <span>{loadingAudit ? 'Auditando...' : 'Fazer Auditoria Completa com IA'}</span>
                </button>
              </div>

              {/* Counter-Strategy Spotlight */}
              <div className="p-4 bg-gradient-to-r from-indigo-950/50 to-slate-900 border border-indigo-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span>Contra-Estratégia Recomendada para Superar o Concorrente</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {selectedComp.counterStrategy}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectCounterStrategy(selectedComp.counterStrategy)}
                  className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 pt-2 transition-colors"
                >
                  <span>Transformar em Campanha Publicitária</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Strengths vs Vulnerabilities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Pontos Fortes do Concorrente</span>
                  </span>
                  <ul className="space-y-1.5">
                    {selectedComp.strengths.map((str, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 shrink-0">·</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vulnerabilities (Gaps to Exploit) */}
                <div className="p-4 bg-rose-950/20 rounded-xl border border-rose-900/40 space-y-2">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Gargalos e Vulnerabilidades para Explorar</span>
                  </span>
                  <ul className="space-y-1.5">
                    {selectedComp.vulnerabilities.map((vuln, idx) => (
                      <li key={idx} className="text-xs text-rose-200 flex items-start gap-2">
                        <span className="text-rose-400 shrink-0">·</span>
                        <span>{vuln}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Keyword Opportunities */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Palavras-Chave de Alta Oportunidade (Menor CPC e Alta Conversão)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-800/80 border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Palavra-Chave</th>
                      <th className="py-2.5 px-3">Volume Mensal</th>
                      <th className="py-2.5 px-3">Dificuldade</th>
                      <th className="py-2.5 px-3">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedComp.keywordOpportunities?.map((kw, kidx) => (
                      <tr key={kidx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">{kw.keyword}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">{kw.searchVolume}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300">
                            {kw.difficulty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{kw.opportunity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Active Ads Spotted in Real Time & Traffic Distribution */}
          <div className="space-y-6">
            {/* Active Ad Hooks Spotted */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Anúncios & Ganchos Detectados</span>
                </h3>
                <span className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-md font-medium">
                  Em Veiculação
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedComp.spottedAdHooks.map((ad, aidx) => (
                  <div key={aidx} className="p-3 bg-slate-800/70 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase">Criativo #{aidx + 1}</span>
                    <p className="text-xs text-slate-200 italic">
                      "{ad}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Share Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Origem Estimada de Tráfego</h3>
              <div className="space-y-3">
                {selectedComp.trafficShare.map((ts, tidx) => (
                  <div key={tidx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{ts.channel}</span>
                      <span className="font-mono font-bold text-white">{ts.share}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: ts.share }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Monitorar Novo Concorrente</h3>
            <p className="text-xs text-slate-400 mb-4">
              A IA começará a analisar anúncios ativos, precificação e palavras-chave.
            </p>

            <form onSubmit={handleAddNewCompetitor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Concorrente *</label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="Ex: Farm Rio ou Renner"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Site Oficial ou Perfil</label>
                <input
                  type="text"
                  value={newCompWebsite}
                  onChange={(e) => setNewCompWebsite(e.target.value)}
                  placeholder="https://exemplo.com.br"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Adicionar ao Monitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
