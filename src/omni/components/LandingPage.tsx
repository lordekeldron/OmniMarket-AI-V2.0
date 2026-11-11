import React from 'react';
import { ArrowRight, BarChart3, Bot, Check, ChevronRight, GitBranch, Mail, ShieldCheck, Sparkles, Target, Workflow } from 'lucide-react';

type LandingPageProps = {
  onSignUp: () => void;
  onLogIn: () => void;
};

const agents = [
  { icon: Workflow, name: 'Jornada & lifecycle', label: 'Mautic-inspired', text: 'Segmenta, pontua e conduz cada lead até o próximo melhor passo.' },
  { icon: Mail, name: 'Campanhas & newsletters', label: 'listmonk-inspired', text: 'Transforma audiência em comunicação recorrente, relevante e mensurável.' },
  { icon: Target, name: 'Conversão & copy', label: 'Marketing skills', text: 'Encontra a mensagem certa para cada página, oferta e momento.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignUp, onLogIn }) => (
  <div className="min-h-screen overflow-hidden bg-foreground text-background">
    <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-10 lg:px-16">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-xs font-bold tracking-tight text-foreground">OM</div>
        <div>
          <div className="font-semibold tracking-[-0.04em]">OmniMarket</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">intelligence studio</div>
        </div>
      </div>
      <nav className="hidden items-center gap-8 text-xs font-medium text-[#6c675f] md:flex">
        <a href="#agents" className="transition-colors hover:text-background">Agentes</a>
        <a href="#method" className="transition-colors hover:text-background">Como funciona</a>
        <a href="#principles" className="transition-colors hover:text-background">Princípios</a>
      </nav>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onLogIn} className="rounded-full px-3 py-2 text-xs font-semibold text-[#4e4a43] transition-colors hover:bg-black/5 sm:px-4">Log in</button>
        <button type="button" onClick={onSignUp} className="group flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-xs font-semibold text-foreground shadow-[0_6px_18px_rgba(23,23,20,0.14)] transition-transform hover:-translate-y-0.5 sm:px-5">
          Sign up <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </header>

    <main>
      <section className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 pb-20 pt-12 sm:px-10 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-16 lg:pb-28 lg:pt-24">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-[#d7e2da]/70 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-muted-foreground bg-white/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#6e695f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8aa77f]" /> O marketing começa antes da campanha
          </div>
          <h1 className="max-w-4xl text-[clamp(3.5rem,8vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.085em] text-background">
            Clareza para<br /><span className="text-accent">agir melhor.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[#625e56] sm:text-lg">
            OmniMarket transforma contexto de marca em decisões de crescimento. Um estúdio vivo para estratégia, campanhas e relacionamento — sem dashboards que parecem planilhas de aeroporto.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={onSignUp} className="group inline-flex items-center justify-center gap-3 rounded-full bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5">
              Começar com minha marca <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a href="#method" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-[#5a554d] hover:bg-black/5">Conhecer o método <ChevronRight className="h-4 w-4" /></a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-medium text-[#8b857b]">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Dados da sua marca primeiro</span>
            <span className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-accent" /> Estratégia rastreável</span>
          </div>
        </div>

        <div className="relative min-h-[470px] lg:min-h-[560px]">
          <div className="absolute inset-x-4 top-4 h-[88%] rounded-[2.25rem] bg-card p-5 text-foreground shadow-2xl sm:inset-x-10 sm:p-7 lg:rotate-[2deg]">
            <div className="flex items-center justify-between border-b border-white/10 pb-5 text-[10px] uppercase tracking-[0.18em] text-white/45"><span>workspace / agora</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> ao vivo</span></div>
            <div className="mt-10 max-w-sm"><div className="text-[11px] uppercase tracking-[0.18em] text-accent">sinal prioritário</div><div className="mt-3 text-3xl font-medium leading-tight tracking-[-0.05em]">Seu próximo crescimento não está no canal. Está na sequência.</div></div>
            <div className="mt-12 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.07] p-4"><div className="text-[10px] uppercase tracking-[0.15em] text-white/40">clareza</div><div className="mt-3 text-2xl">86<span className="text-sm text-white/40">%</span></div><div className="mt-2 text-[11px] text-accent">+12% esta semana</div></div><div className="rounded-2xl bg-accent p-4 text-card"><div className="text-[10px] uppercase tracking-[0.15em] text-[#587052]">próxima ação</div><div className="mt-3 text-sm font-semibold leading-5">Refinar a oferta para leads mornos</div><div className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">Abrir agente <ArrowRight className="h-3 w-3" /></div></div></div>
            <div className="mt-3 rounded-2xl border border-white/10 p-4"><div className="flex items-center justify-between"><span className="text-xs text-white/60">Pulso da operação</span><BarChart3 className="h-4 w-4 text-accent" /></div><div className="mt-5 flex h-20 items-end gap-1.5">{[30,44,38,61,52,73,64,88,78,96,83,100].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-accent/80" style={{ height: `${height}%` }} />)}</div></div>
          </div>
          <div className="absolute bottom-0 right-0 w-56 rounded-3xl border border-muted-foreground bg-[#fffdf8] p-5 shadow-xl sm:right-4"><div className="flex items-center justify-between"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7efe3]"><Bot className="h-4 w-4 text-[#6f8769]" /></div><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">orquestrador</span></div><div className="mt-5 text-sm font-semibold leading-5">4 agentes lendo o mesmo contexto.</div><div className="mt-2 text-xs leading-5 text-muted-foreground">Menos respostas isoladas. Mais continuidade.</div></div>
        </div>
      </section>

      <section id="agents" className="border-y border-muted-foreground bg-[#ece8df]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 lg:px-16 lg:py-20"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">um time, não um botão</div><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.06em] sm:text-5xl">Agentes com repertório<br />e responsabilidade.</h2></div><p className="max-w-xs text-sm leading-6 text-[#6a655c]">Cada agente tem uma função clara, uma memória comum e um próximo passo que você consegue revisar.</p></div><div className="grid gap-3 md:grid-cols-3">{agents.map(({ icon: Icon, name, label, text }, index) => <article key={name} className="group rounded-[1.7rem] border border-muted-foreground bg-foreground p-6 transition-transform hover:-translate-y-1"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e2ecdf] text-[#6f8769]"><Icon className="h-5 w-5" /></div><span className="text-[10px] uppercase tracking-[0.15em] text-[#9a9286]">0{index + 1}</span></div><div className="mt-10 text-lg font-semibold tracking-[-0.03em]">{name}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">{label}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{text}</p><div className="mt-8 flex items-center gap-2 text-xs font-semibold text-[#4e5e49]">Ver o que ele faz <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></div></article>)}</div></div>
      </section>

      <section id="method" className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-10 lg:grid-cols-[0.7fr_1.3fr] lg:px-16 lg:py-28"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">o método</div><h2 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-6xl">Do contexto<br />à decisão.</h2></div><div className="grid gap-0 border-t border-muted-foreground">{[['01','Cadastre sua realidade','A plataforma começa pela sua marca — público, oferta, tom e objetivos. Sem inventar contexto.'],['02','Escolha o agente certo','Cada pergunta é encaminhada para a especialidade que melhor resolve o problema.'],['03','Revise antes de ativar','A recomendação chega com justificativa, hipótese e ação sugerida para você decidir.']].map(([number, title, text]) => <div key={number} className="grid gap-4 border-b border-muted-foreground py-7 sm:grid-cols-[60px_0.8fr_1fr] sm:items-start"><span className="text-xs font-bold text-[#9a9286]">{number}</span><h3 className="text-xl font-semibold tracking-[-0.04em]">{title}</h3><p className="max-w-sm text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></section>

      <section id="principles" className="bg-background text-foreground"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:py-20"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">pronto para começar?</div><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-6xl">Sua próxima boa decisão merece contexto.</h2></div><button type="button" onClick={onSignUp} className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-card transition-transform hover:-translate-y-0.5">Criar meu workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button></div></section>
    </main>
    <footer className="bg-background px-5 pb-8 text-xs text-white/45 sm:px-10 lg:px-16"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row"><span>© 2026 OmniMarket Intelligence Studio</span><span>Feito para marcas que preferem método a ruído.</span></div></footer>
  </div>
);
