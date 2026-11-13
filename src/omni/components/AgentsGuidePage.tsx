import { ArrowLeft, ArrowUpRight, Bot, Mail, Megaphone, Target, Workflow } from "lucide-react";
import { AGENT_DIRECTORY } from "../agentRegistry";

const agentIcons = {
  lifecycle: Workflow,
  campaigns: Mail,
  growth: Target,
  acquisition: Megaphone,
};

export function AgentsGuidePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao workspace
        </a>

        <header className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Bot aria-hidden="true" className="size-4" /> Especialistas OmniMarket
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Uma equipe para cada desafio de marketing
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base">
            Cada agente tem uma missão própria e recebe o contexto cadastrado da empresa, como
            nicho, público e tom de voz. Com o Auto-pilot ativo, a IA identifica o foco da
            solicitação e encaminha a conversa ao especialista mais adequado.
          </p>
        </header>

        <section aria-label="Funções dos agentes" className="mt-8 grid gap-4 md:grid-cols-2">
          {AGENT_DIRECTORY.map((agent) => {
            const Icon = agentIcons[agent.id];
            return (
              <article
                key={agent.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${agent.color}22`, color: agent.color }}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {agent.source}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{agent.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{agent.summary}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Missão
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {agent.mission.charAt(0).toUpperCase() + agent.mission.slice(1)}.
                  </p>
                </div>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  O que faz
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {agent.responsibilities.map((responsibility) => (
                    <li
                      key={responsibility}
                      className="flex gap-2 text-sm leading-5 text-slate-300"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      {responsibility}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-white">Pronto para começar?</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Volte ao chat e descreva o resultado que sua equipe precisa alcançar.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Abrir chat de agentes <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </main>
  );
}
