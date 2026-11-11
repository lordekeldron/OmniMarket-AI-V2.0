import React, { useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, GitBranch, Loader2, Mail, Megaphone, Network, RotateCcw, Target, Workflow } from 'lucide-react';
import { AgentDefinition, BrandProfile } from '../types';

const agentIcons = { lifecycle: Workflow, campaigns: Mail, growth: Target, acquisition: Megaphone };

const agents: AgentDefinition[] = [
  { id: 'lifecycle', name: 'Orquestrador de Lifecycle', source: 'Mautic', summary: 'Desenha jornadas, segmentação e lead scoring a partir do comportamento da sua base.', skills: ['segmentação', 'lead scoring', 'jornadas'], color: '#b5d4a6' },
  { id: 'campaigns', name: 'Operador de Campanhas', source: 'listmonk', summary: 'Planeja newsletters e campanhas de relacionamento com cadência, hipótese e métrica.', skills: ['newsletter', 'sequências', 'entregabilidade'], color: '#c5d8ef' },
  { id: 'growth', name: 'Estrategista de Conversão', source: 'Marketing Skills PT-BR', summary: 'Revisa oferta, copy e fluxo de cadastro para encontrar o maior ganho de conversão.', skills: ['CRO', 'copywriting', 'signup'], color: '#ead2b5' },
  { id: 'acquisition', name: 'Radar de Aquisição', source: 'Corey Haines Marketing Skills', summary: 'Conecta SEO, mídia, analytics e concorrência em uma agenda de crescimento priorizada.', skills: ['SEO', 'analytics', 'competidores'], color: '#d5c7e8' },
];

export const AgentWorkbench: React.FC<{ brand: BrandProfile }> = ({ brand }) => {
  const [selected, setSelected] = useState<AgentDefinition>(agents[0]);
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const Icon = agentIcons[selected.id as keyof typeof agentIcons] || Bot;

  const runAgent = async () => {
    if (!objective.trim()) return;
    setLoading(true); setError(''); setResult('');
    try {
      const response = await fetch('/api/ai/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: selected.id, objective, brandProfile: brand }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível executar o agente.');
      setResult(data.result);
    } catch (agentError) {
      setError(agentError instanceof Error ? agentError.message : 'Não foi possível executar o agente.');
    } finally { setLoading(false); }
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent"><Network className="h-4 w-4" /> Agent workbench</div><h1 className="mt-3 text-2xl font-bold text-white">Um briefing. A especialidade certa.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Agentes com responsabilidades diferentes, trabalhando sobre o mesmo contexto de {brand.name}. A resposta vem com hipótese, ação e critério de revisão.</p></div><div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> contexto sincronizado</div></div><div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]"><div className="space-y-2">{agents.map((agent) => { const AgentIcon = agentIcons[agent.id as keyof typeof agentIcons] || Bot; const active = agent.id === selected.id; return <button key={agent.id} type="button" onClick={() => { setSelected(agent); setResult(''); setError(''); }} className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-accent/50 bg-accent/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${agent.color}22`, color: agent.color }}><AgentIcon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex items-center justify-between gap-3"><h2 className="truncate text-sm font-semibold text-white">{agent.name}</h2>{active && <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />}</div><p className="mt-1 text-xs font-medium text-slate-500">{agent.source}</p><p className="mt-3 text-xs leading-5 text-slate-400">{agent.summary}</p><div className="mt-3 flex flex-wrap gap-1.5">{agent.skills.map((skill) => <span key={skill} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">{skill}</span>)}</div></div></div></button>; })}</div><div className="rounded-2xl border border-slate-800 bg-[#1a1c1b] p-5 sm:p-7"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${selected.color}22`, color: selected.color }}><Icon className="h-5 w-5" /></div><div><div className="text-xs uppercase tracking-[0.15em] text-slate-500">agente ativo</div><h2 className="mt-1 text-lg font-semibold text-white">{selected.name}</h2></div></div><GitBranch className="h-4 w-4 text-slate-600" /></div><label className="mt-8 block text-xs font-medium text-slate-300">Qual decisão você quer destravar?<textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={5} placeholder="Ex: Quero recuperar leads que abriram a última campanha, mas não compraram." className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-accent/60" /></label><button type="button" onClick={runAgent} disabled={loading || !objective.trim()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-card transition hover:bg-[#c5e0b8] disabled:cursor-not-allowed disabled:opacity-40">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando contexto...</> : <>Executar agente <ArrowRight className="h-4 w-4" /></>}</button>{error && <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>}{result && <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-accent"><Bot className="h-4 w-4" /> Entrega do agente</div><button type="button" onClick={() => setResult('')} className="text-slate-500 hover:text-white" aria-label="Limpar resultado"><RotateCcw className="h-4 w-4" /></button></div><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">{result}</div></div>}</div></div></div>;
};
