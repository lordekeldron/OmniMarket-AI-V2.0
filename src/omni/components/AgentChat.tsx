import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpRight, Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { getAgentById, type AgentId } from "../agentRegistry";
import type { BrandProfile } from "../types";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  agentName?: string;
  routingReason?: string;
};

interface AgentChatProps {
  brand: BrandProfile;
  selectedAgentId: AgentId;
  onAgentRouted: (agentId: AgentId) => void;
}

export function AgentChat({ brand, selectedAgentId, onAgentRouted }: AgentChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [autoPilot, setAutoPilot] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeAgent = getAgentById(selectedAgentId);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError("");
  }, [brand.id]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: message },
    ]);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          brandProfile: brand,
          autoPilot,
          selectedAgentId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Não foi possível encaminhar sua solicitação.");
      }

      const routedAgentId = data.agentId as AgentId;
      onAgentRouted(routedAgentId);
      setMessages((current) => [
        ...current,
        {
          id: `agent-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          agentId: routedAgentId,
          agentName: data.agentName,
          routingReason: data.routingReason,
        },
      ]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Não foi possível encaminhar sua solicitação. Tente novamente.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section className="flex h-[min(720px,calc(100vh-220px))] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#1a1c1b]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${activeAgent.color}22`, color: activeAgent.color }}
          >
            <Bot aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {autoPilot ? "Orquestração automática" : "Agente selecionado"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">{activeAgent.name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Contexto de {brand.name} · {brand.industry}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2">
          <div>
            <p id="agent-auto-pilot-label" className="text-xs font-semibold text-white">
              Auto-pilot
            </p>
            <p id="agent-auto-pilot-description" className="mt-0.5 text-[10px] text-slate-400">
              A IA escolhe o especialista
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoPilot}
            aria-labelledby="agent-auto-pilot-label"
            aria-describedby="agent-auto-pilot-description"
            onClick={() => setAutoPilot((current) => !current)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${autoPilot ? "bg-accent" : "bg-slate-700"}`}
          >
            <span
              aria-hidden="true"
              className={`size-4 rounded-full bg-slate-950 transition-transform ${autoPilot ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </header>

      <div
        ref={transcriptRef}
        role="region"
        aria-label="Conversa com os agentes"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <ol className="flex flex-col gap-4" aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 && (
            <li className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                <Sparkles aria-hidden="true" className="size-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                Qual desafio vamos resolver?
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
                Conte o que precisa. O contexto de nicho, público e tom de voz de {brand.name}{" "}
                acompanha cada solicitação.
              </p>
              <span className="mt-4 rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                {autoPilot ? "Auto-pilot ativo" : `Agente: ${activeAgent.name}`}
              </span>
            </li>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const messageAgent = getAgentById(message.agentId);
            return (
              <li key={message.id}>
                <article
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  aria-label={
                    isUser ? "Sua mensagem" : `Resposta de ${message.agentName || "agente"}`
                  }
                >
                  <div
                    aria-hidden="true"
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${isUser ? "bg-slate-700 text-slate-200" : "bg-accent/10 text-accent"}`}
                  >
                    {isUser ? <UserRound className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl border px-4 py-3 ${isUser ? "border-accent/20 bg-accent/10" : "border-slate-700 bg-slate-900/80"}`}
                  >
                    <header className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-white">
                        {isUser ? "Você" : message.agentName || "Agente OmniMarket"}
                      </span>
                      {!isUser && messageAgent && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">
                          {messageAgent.skills[0]}
                        </span>
                      )}
                    </header>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                      {message.content}
                    </p>
                    {!isUser && message.routingReason && (
                      <p className="mt-3 border-t border-slate-700 pt-2 text-[10px] leading-4 text-slate-400">
                        {message.routingReason}
                      </p>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
          {isSending && (
            <li
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 pl-11 text-xs text-slate-400"
            >
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-accent" />
              {autoPilot
                ? "Entendendo o contexto e encaminhando para um agente..."
                : `${activeAgent.name} está preparando uma resposta...`}
            </li>
          )}
        </ol>
      </div>

      <form
        onSubmit={(event) => void sendMessage(event)}
        className="border-t border-slate-800 p-4 sm:p-5"
      >
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-200"
          >
            {error}
          </p>
        )}
        <label htmlFor="agent-message" className="sr-only">
          Escreva sua demanda
        </label>
        <div className="relative rounded-xl border border-slate-700 bg-slate-950/50 focus-within:border-accent/50">
          <textarea
            id="agent-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            maxLength={1000}
            rows={3}
            placeholder="Descreva sua demanda para a equipe de agentes..."
            disabled={isSending}
            className="min-h-[88px] w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2 pr-14 text-sm leading-6 text-white placeholder:text-slate-600 focus:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={isSending || !draft.trim()}
            className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
          <span>Enter cria uma linha; Ctrl/⌘ + Enter envia.</span>
          <span>{draft.length}/1000</span>
        </div>
      </form>
    </section>
  );
}
