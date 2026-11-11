import React, { lazy, Suspense } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Globe2,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
const OmniEarthGlobe = lazy(() =>
  import("./OmniEarthGlobe").then((module) => ({ default: module.OmniEarthGlobe })),
);

type LandingPageProps = {
  onSignUp: () => void;
  onLogIn: () => void;
};

const agents = [
  {
    icon: Workflow,
    number: "01",
    name: "Jornada & lifecycle",
    text: "Construa relacionamentos que avançam no ritmo certo, do primeiro sinal à fidelização.",
    accent: "text-[#b9ef58]",
  },
  {
    icon: Mail,
    number: "02",
    name: "Campanhas & conteúdo",
    text: "Crie campanhas coerentes com sua marca e conectadas a cada mercado.",
    accent: "text-[#72dfc0]",
  },
  {
    icon: Target,
    number: "03",
    name: "Audiência & conversão",
    text: "Descubra os públicos, ofertas e mensagens com maior potencial de crescimento.",
    accent: "text-[#ffbd78]",
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignUp, onLogIn }) => (
  <div className="min-h-screen overflow-hidden bg-[#f4f3ed] text-[#10221f]">
    <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-10 lg:px-16">
      <a href="#top" className="flex items-center gap-3" aria-label="OmniMarket, início">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#10221f] text-[11px] font-bold tracking-tight text-[#d4f768]">
          OM
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-[-0.04em]">OmniMarket</span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-[#6f7d74]">
            intelligence studio
          </span>
        </span>
      </a>
      <nav
        aria-label="Navegação principal"
        className="hidden items-center gap-8 text-xs font-medium text-[#52635c] md:flex"
      >
        <a href="#agentes" className="transition-colors hover:text-[#10221f]">
          Agentes
        </a>
        <a href="#metodo" className="transition-colors hover:text-[#10221f]">
          Como funciona
        </a>
        <a href="#visao" className="transition-colors hover:text-[#10221f]">
          Visão global
        </a>
      </nav>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLogIn}
          className="rounded-full px-3 py-2 text-xs font-semibold text-[#44544d] transition-colors hover:bg-black/5 sm:px-4"
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={onSignUp}
          className="group inline-flex items-center gap-2 rounded-full bg-[#10221f] px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 sm:px-5"
        >
          Criar conta{" "}
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </button>
      </div>
    </header>

    <main id="top">
      <section className="relative mx-auto grid max-w-[1440px] items-center gap-6 px-5 pb-16 pt-12 sm:px-10 sm:pt-16 lg:min-h-[720px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-0 lg:px-16 lg:pb-20 lg:pt-10">
        <div className="pointer-events-none absolute -left-64 top-12 size-[520px] rounded-full bg-[#d9e8c0]/55 blur-[100px]" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d4dbce] bg-white/65 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#53675a]">
            <Sparkles aria-hidden="true" className="size-3 text-[#4b805e]" /> Inteligência de
            mercado, em escala global
          </div>
          <h1 className="max-w-3xl text-[clamp(3.5rem,8vw,7rem)] font-semibold leading-[0.88] tracking-[-0.085em]">
            Cresça com
            <br />
            uma visão <span className="text-[#618d49]">maior.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#58665f] sm:text-lg sm:leading-8">
            Transforme sinais de mercado em decisões melhores. O OmniMarket conecta estratégia,
            audiência e agentes de IA para fazer sua marca avançar com clareza.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onSignUp}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#10221f] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Começar agora{" "}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </button>
            <a
              href="#metodo"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-[#53635b] transition-colors hover:bg-black/5"
            >
              Conhecer a plataforma <ArrowDown aria-hidden="true" className="size-4" />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-medium text-[#75817a]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-[#64854c]" /> Estratégia com
              contexto
            </span>
            <span className="inline-flex items-center gap-2">
              <Globe2 aria-hidden="true" className="size-4 text-[#64854c]" /> Perspectiva global
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[650px] lg:-mr-8">
          <div className="absolute inset-[10%] rounded-full bg-[#83d8bd]/20 blur-[80px]" />
          <div className="relative z-10 mx-auto w-full max-w-[600px]">
            <Suspense
              fallback={
                <div
                  className="aspect-square w-full rounded-full bg-[#dce8d5]/60"
                  aria-hidden="true"
                />
              }
            >
              <OmniEarthGlobe />
            </Suspense>
          </div>
          <div className="absolute left-2 top-[22%] z-10 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_12px_40px_rgba(20,44,34,0.09)] backdrop-blur sm:left-0">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#728078]">
              <span className="size-1.5 rounded-full bg-[#78bd65]" /> sinais ao vivo
            </div>
            <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#183b30]">
              +24,8% <span className="text-[10px] font-medium text-[#75817a]">oportunidade</span>
            </div>
          </div>
          <div className="absolute bottom-[12%] right-0 z-10 w-52 rounded-2xl border border-white/70 bg-[#10221f] p-4 text-white shadow-[0_18px_50px_rgba(12,31,26,0.22)] sm:right-1">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-white/55">
              <span>pulso global</span>
              <BarChart3 aria-hidden="true" className="size-4 text-[#b9ef58]" />
            </div>
            <div
              className="mt-3 flex items-end gap-1.5"
              aria-label="Tendência de crescimento ascendente"
            >
              {[34, 49, 42, 61, 54, 72, 63, 83, 75, 96].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-sm bg-[#b9ef58]"
                  style={{ height: `${height}px`, opacity: 0.45 + index * 0.055 }}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] text-white/55">mercados conectados</div>
          </div>
          <div className="absolute right-[7%] top-[8%] z-10 flex size-11 items-center justify-center rounded-full border border-white/70 bg-[#d4f768] text-[#193323] shadow-lg">
            <Bot aria-hidden="true" className="size-5" />
          </div>
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#10221f]/70 px-3 py-1.5 text-[9px] font-medium tracking-wide text-white/80 backdrop-blur">
            Arraste o globo para explorar
          </p>
        </div>
      </section>

      <section id="visao" className="border-y border-[#dce0d7] bg-[#e9ede4]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-9 sm:grid-cols-3 sm:px-10 lg:px-16">
          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#557a50]">
              <Globe2 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-[-0.05em]">Visão sem fronteiras</div>
              <div className="text-xs text-[#66756c]">Tendências e sinais de mercado</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#557a50]">
              <Bot aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-[-0.05em]">Agentes especializados</div>
              <div className="text-xs text-[#66756c]">Inteligência conectada ao seu contexto</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#557a50]">
              <BarChart3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-[-0.05em]">Decisões mensuráveis</div>
              <div className="text-xs text-[#66756c]">Da oportunidade ao resultado</div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="agentes"
        className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 lg:px-16 lg:py-24"
      >
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#618d49]">
              um time, muitas especialidades
            </div>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-[1.03] tracking-[-0.065em] sm:text-5xl">
              Estratégia que conecta
              <br />
              cada próximo passo.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#627168]">
            Agentes com funções claras, trabalhando com o mesmo contexto da sua marca.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {agents.map(({ icon: Icon, number, name, text, accent }) => (
            <article
              key={name}
              className="group rounded-[1.6rem] border border-[#dce0d7] bg-white/75 p-6 transition-all hover:-translate-y-1 hover:border-[#b9c9af] hover:shadow-[0_18px_50px_rgba(25,53,38,0.08)]"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#10221f] text-[#b9ef58]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.15em] text-[#a0aaa1]">
                  {number}
                </span>
              </div>
              <h3 className="mt-9 text-lg font-semibold tracking-[-0.03em]">{name}</h3>
              <p className="mt-3 min-h-12 text-sm leading-6 text-[#66756c]">{text}</p>
              <div
                className={`mt-7 flex items-center gap-2 text-xs font-semibold text-[#40564a] ${accent}`}
              >
                Conhecer agente{" "}
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-hover:translate-x-1"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="metodo" className="bg-[#10221f] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[0.7fr_1.3fr] lg:px-16 lg:py-24">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b9ef58]">
              do sinal à ação
            </div>
            <h2 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-6xl">
              Veja o todo.
              <br />
              Aja com precisão.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              A tecnologia encontra os sinais. Você decide o que faz sentido para a sua marca.
            </p>
          </div>
          <div className="border-t border-white/15">
            {[
              [
                "01",
                "Entenda seu contexto",
                "Defina público, oferta, tom e objetivos. A inteligência começa pela realidade da sua marca.",
              ],
              [
                "02",
                "Encontre a oportunidade",
                "Conecte tendências, canais e audiências para enxergar onde agir primeiro.",
              ],
              [
                "03",
                "Transforme em crescimento",
                "Receba recomendações claras, revise cada ação e acompanhe o impacto.",
              ],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="grid gap-3 border-b border-white/15 py-6 sm:grid-cols-[56px_0.8fr_1fr] sm:items-start"
              >
                <span className="text-xs font-bold text-[#b9ef58]">{number}</span>
                <h3 className="text-lg font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="max-w-sm text-sm leading-6 text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#d4f768] text-[#10221f]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-14 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:py-20">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#48633f]">
              o próximo passo é seu
            </div>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-6xl">
              Uma visão maior começa com uma decisão.
            </h2>
          </div>
          <button
            type="button"
            onClick={onSignUp}
            className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#10221f] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Criar meu workspace{" "}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>
      </section>
    </main>
    <footer className="bg-[#10221f] px-5 pb-8 text-xs text-white/50 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
        <span>© 2026 OmniMarket Intelligence Studio</span>
        <span>Feito para marcas que crescem com contexto.</span>
      </div>
    </footer>
  </div>
);
