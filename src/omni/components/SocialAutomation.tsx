import React, { useState } from 'react';
import {
  Share2,
  Calendar,
  Clock,
  Plus,
  Send,
  CheckCircle2,
  Instagram,
  Linkedin,
  MessageCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Heart,
  Eye,
  Check
} from 'lucide-react';
import { BrandProfile, ScheduledPost } from '../types';

interface SocialAutomationProps {
  brand: BrandProfile;
  scheduledPosts: ScheduledPost[];
  onAddPost: (post: ScheduledPost) => void;
  onPublishPostNow: (id: string) => void;
}

export const SocialAutomation: React.FC<SocialAutomationProps> = ({
  brand,
  scheduledPosts,
  onAddPost,
  onPublishPostNow,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'instagram' | 'tiktok' | 'linkedin' | 'facebook'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [publishedToast, setPublishedToast] = useState<string | null>(null);

  // Engagement Rules Toggles
  const [ruleAutoCoupon, setRuleAutoCoupon] = useState(true);
  const [ruleLeadCapture, setRuleLeadCapture] = useState(true);
  const [ruleSentimentAlert, setRuleSentimentAlert] = useState(true);

  // New Post Modal State
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newChannel, setNewChannel] = useState<'instagram' | 'tiktok' | 'linkedin' | 'facebook'>('instagram');
  const [newTime, setNewTime] = useState('Amanhã às 18:00');

  const filteredPosts = scheduledPosts.filter(
    (p) => selectedChannel === 'all' || p.channel === selectedChannel
  );

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;

    const post: ScheduledPost = {
      id: 'post_' + Date.now(),
      channel: newChannel,
      creativeTitle: newTitle.trim() || 'Nova Publicação ' + brand.name,
      caption: newCaption.trim(),
      scheduledTime: newTime.trim() || 'Agendado para breve',
      status: 'scheduled',
      impressions: 0,
      engagementRate: '0%',
      likes: 0,
    };

    onAddPost(post);
    setShowScheduleModal(false);
    setNewTitle('');
    setNewCaption('');
  };

  const handleInstantPublish = (id: string, title: string) => {
    onPublishPostNow(id);
    setPublishedToast(`Post "${title}" publicado com sucesso nas redes de ${brand.name}!`);
    setTimeout(() => setPublishedToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {publishedToast && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{publishedToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Share2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Automação de Redes Sociais & Engajamento</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Agendamento multicanal automático e regras de engajamento personalizado para {brand.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Nova Publicação</span>
        </button>
      </div>

      {/* Automated Engagement Rules Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Regras de Engajamento Personalizado Automático</span>
          </h2>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            3 Regras Ativas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rule 1 */}
          <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Cupom Dinâmico em Comentários</span>
              <button
                type="button"
                onClick={() => setRuleAutoCoupon(!ruleAutoCoupon)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {ruleAutoCoupon ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Detecta perguntas como "qual o valor?", "onde compro?" e responde automaticamente no direct com link e cupom exclusivo.
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Qualificação Instantânea de Leads</span>
              <button
                type="button"
                onClick={() => setRuleLeadCapture(!ruleLeadCapture)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {ruleLeadCapture ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Envia perguntas de triagem no LinkedIn e Instagram Direct para pedidos no atacado ou parcerias comerciais.
            </p>
          </div>

          {/* Rule 3 */}
          <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Escalação de Sentimento Crítico</span>
              <button
                type="button"
                onClick={() => setRuleSentimentAlert(!ruleSentimentAlert)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {ruleSentimentAlert ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Identifica comentários negativos ou dúvidas sobre atraso de pedido e direciona prioritariamente para atendimento VIP.
            </p>
          </div>
        </div>
      </div>

      {/* Post Channel Filter Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        {[
          { id: 'all', label: 'Todos os Canais' },
          { id: 'instagram', label: 'Instagram' },
          { id: 'tiktok', label: 'TikTok' },
          { id: 'linkedin', label: 'LinkedIn' },
          { id: 'facebook', label: 'Facebook' },
        ].map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setSelectedChannel(ch.id as any)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              selectedChannel === ch.id
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Post Feed & Scheduling Queue */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isPublished = post.status === 'published';
          return (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-5 transition-all"
            >
              <div className="space-y-2.5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
                    {post.channel.toUpperCase()}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{post.scheduledTime}</span>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isPublished ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isPublished ? 'Publicado' : 'Agendado no Cron'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{post.creativeTitle}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  {post.caption}
                </p>

                {isPublished && post.impressions && (
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{post.impressions.toLocaleString()} impressões</span>
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>{post.likes} curtidas</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{post.engagementRate} engajamento</span>
                    </span>
                  </div>
                )}
              </div>

              {!isPublished && (
                <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleInstantPublish(post.id, post.creativeTitle)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar Agora</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Agendar Nova Postagem Automática</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure a legenda e a data para a IA disparar a publicação.
            </p>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título do Post</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Carrossel Educativo de Dicas de Alfaiataria"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Canal</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Horário Previsto</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="Ex: Amanhã às 18:30"
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Legenda / Copy</label>
                <textarea
                  rows={4}
                  required
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Escreva a legenda ou cole uma das copys geradas pelo Campaign Studio..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
