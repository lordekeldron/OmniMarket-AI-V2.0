// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Zap,
  HelpCircle,
} from "lucide-react";
import { BrandProfile, ChatMessage } from "../types";

interface SupportChatProps {
  brand: BrandProfile;
}

export const SupportChat: React.FC<SupportChatProps> = ({ brand }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const predefinedQueries: string[] = [];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "customer",
      role: "user",
      content: text.trim(),
      timestamp: "Agora",
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          brandProfile: brand,
          customerContext: "Cliente em busca de informações no chat do site",
        }),
      });
      const data = await res.json();
      const replyText =
        data.reply ||
        `Com certeza! Na ${brand.name}, priorizamos sua satisfação com garantia incondicional e suporte contínuo.`;

      setMessages((prev) => [
        ...prev,
        {
          id: "agent_" + Date.now(),
          sender: "agent",
          role: "assistant",
          content: replyText,
          timestamp: "Agora",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "agent_" + Date.now(),
          sender: "agent",
          role: "assistant",
          content: `Estamos à disposição para garantir a melhor experiência com a ${brand.name}! Como posso te auxiliar em seguida?`,
          timestamp: "Agora",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">
              Central de Atendimento & Conversão via Chat IA
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Agente inteligente treinado no tom de voz de{" "}
            <strong className="text-white">{brand.name}</strong> ({brand.tone}).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 font-semibold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Atendimento 24/7 Ativo</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[580px]">
        {/* Quick Question Chips */}
        <div className="pb-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Cenários de Teste:
          </span>
          {predefinedQueries.map((q, qidx) => (
            <button
              key={qidx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((msg) => {
            const isAgent = msg.sender === "agent";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isAgent ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isAgent
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {isAgent ? brand.logoInitial || "IA" : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isAgent
                      ? "bg-slate-800/90 text-slate-100 border border-slate-700/60"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                    <span className="font-bold">
                      {isAgent ? `${brand.name} Assistente` : "Cliente"}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-800/80 rounded-2xl px-4 py-3 text-xs text-indigo-300 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>O especialista está formulando a resposta...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="pt-4 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem como cliente ou simule uma objeção de compra..."
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold shadow-md transition-all shrink-0"
            aria-label="Enviar mensagem"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
