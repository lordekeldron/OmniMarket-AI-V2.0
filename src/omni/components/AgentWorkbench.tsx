import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail, Megaphone, Network, Target, Workflow } from "lucide-react";
import { AgentChat } from "./AgentChat";
import { AGENT_DIRECTORY, getAgentById, type AgentId } from "../agentRegistry";
import type { BrandProfile } from "../types";

const agentIcons = { lifecycle: Workflow, campaigns: Mail, growth: Target, acquisition: Megaphone };

export function AgentWorkbench({ brand }: { brand: BrandProfile }) {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>(
    AGENT_DIRECTORY[0]?.id ?? "lifecycle",
  );
  const selected = getAgentById(selectedAgentId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <Network aria-hidden="true" className="size-4" /> Central de agentes
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">Uma demanda. O especialista certo.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Converse com a equipe de IA usando o contexto de {brand.name}, do nicho {brand.industry}{" "}
            e do público cadastrado.
          </p>
        </div>
        <a
          href="/agentes"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-accent/50 hover:text-white"
        >
          Conheça os agentes <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section aria-label="Selecionar agente" className="flex flex-col gap-2">
          {AGENT_DIRECTORY.map((agent) => {
            const AgentIcon = agentIcons[agent.id];
            const active = agent.id === selected.id;
            return (
              <button
                key={agent.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-accent/50 bg-accent/10" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${agent.color}22`, color: agent.color }}
                  >
                    <AgentIcon aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate text-sm font-semibold text-white">{agent.name}</h2>
                      {active && (
                        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-accent" />
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">{agent.source}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-400">{agent.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {agent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <AgentChat
          brand={brand}
          selectedAgentId={selectedAgentId}
          onAgentRouted={setSelectedAgentId}
        />
      </div>
    </div>
  );
}
