// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState, useEffect } from "react";
import { ArrowRight, Check, Copy, RefreshCw, Share2, Trophy } from "lucide-react";
import { BrandProfile, CampaignCreative } from "../types";
import { SimulatedABTestingTool } from "./SimulatedABTestingTool";
import { CampaignImageGenerator } from "./CampaignImageGenerator";

interface CampaignStudioProps {
  brand: BrandProfile;
  campaign: CampaignCreative;
  onUpdateCampaign: (campaign: CampaignCreative) => void;
  prefillTrendTopic?: string;
}

export const CampaignStudio: React.FC<CampaignStudioProps> = ({
  brand,
  campaign,
  onUpdateCampaign,
  prefillTrendTopic,
}) => {
  // Campaign Form State
  const [productFocus, setProductFocus] = useState(prefillTrendTopic || "");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState(brand.targetAudience);
  const [tone, setTone] = useState(brand.tone);
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChannelTab, setActiveChannelTab] = useState<
    "instagram" | "tiktok" | "linkedin" | "googleAds"
  >("instagram");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Update product focus when prefill arrives
  useEffect(() => {
    if (prefillTrendTopic) {
      setProductFocus(prefillTrendTopic);
    }
  }, [prefillTrendTopic]);

  const handleGenerateCampaign = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brand.name,
          industry: brand.industry,
          objective,
          channels: ["Instagram", "TikTok", "LinkedIn", "Google Ads"],
          budget,
          audience,
          tone,
          productFocus,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onUpdateCampaign(data.data);
      }
    } catch (err) {
      console.error("Failed to generate campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyWinningVariation = (
    winningHeadline: string,
    winningHook: string,
    winningCta: string,
  ) => {
    onUpdateCampaign({
      ...campaign,
      channels: {
        ...campaign.channels,
        instagram: {
          ...campaign.channels.instagram,
          hook: winningHook,
          cta: winningCta,
        },
      },
      designDirectives: {
        ...campaign.designDirectives,
        adBannerCreative: {
          ...campaign.designDirectives.adBannerCreative,
          mainHeadline: winningHeadline,
          ctaButtonText: winningCta,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Campaign Generator Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-foreground">Campanhas</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Gere campanhas completas de alta conversão para múltiplos canais e artes publicitárias
              com IA.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCampaign}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-glow disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-all whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Criando Campanha..." : "Gerar Campanha com IA"}</span>
          </button>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Foco do Produto / Tema da Campanha
            </label>
            <input
              type="text"
              value={productFocus}
              onChange={(e) => setProductFocus(e.target.value)}
              placeholder="Ex: Lançamento Coleção Essência 2026 em Linho Puro"
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Objetivo da Campanha
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Conversões & Vendas com Alto ROAS">
                Conversões & Vendas (Alto ROAS)
              </option>
              <option value="Reconhecimento de Marca & Alcance">
                Reconhecimento & Alcance (Branding)
              </option>
              <option value="Lançamento Exclusivo & Urgência">
                Lançamento Exclusivo (Urgência)
              </option>
              <option value="Retargeting de Carrinho Abandonado">
                Retargeting de Fundo de Funil
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Público-Alvo</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Tom de Voz</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Orçamento Previsto
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Generated Creative Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-indigo-400">Campanha Ativa</span>
            <h2 className="text-xl font-semibold text-white mt-0.5">{campaign.campaignName}</h2>
            <p className="text-xs text-slate-300 italic mt-1">"{campaign.tagline}"</p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">CTR Estimado</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {campaign.expectedMetrics?.estimatedCTR || "3.8%"}
              </strong>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">CPA Previsto</span>
              <strong className="text-indigo-300 font-mono text-sm">
                {campaign.expectedMetrics?.estimatedCPA || "R$ 16,80"}
              </strong>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">ROAS Projetado</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {campaign.expectedMetrics?.projectedROAS || "4.8x"}
              </strong>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-4 leading-relaxed pt-3 border-t border-slate-800">
          <strong>Conceito Central:</strong> {campaign.concept}
        </p>
      </div>

      {/* Main Studio Two-Column Grid: Left Copywriting, Right AI Image Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-Channel Copywriting Hub (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>Copys Prontas por Canal</span>
              </h3>
              <span className="text-[11px] text-slate-400">1-clique para copiar</span>
            </div>

            {/* Channel Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-800 rounded-xl">
              {[
                { id: "instagram", label: "Instagram" },
                { id: "tiktok", label: "TikTok" },
                { id: "linkedin", label: "LinkedIn" },
                { id: "googleAds", label: "Google Ads" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChannelTab(c.id as any)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeChannelTab === c.id
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Channel Content Body */}
            {activeChannelTab === "instagram" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Gancho de Parada (Primeiros 3s)
                  </label>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-indigo-200 border border-slate-700/60 font-medium">
                    {campaign.channels.instagram.hook}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Legenda Completa com Gatilhos
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(campaign.channels.instagram.caption, "ig-caption")
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === "ig-caption" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "ig-caption" ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-slate-200 border border-slate-700/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {campaign.channels.instagram.caption}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Botão de Ação (CTA)
                  </label>
                  <div className="p-2.5 bg-indigo-950/60 border border-indigo-800 rounded-lg text-xs font-semibold text-indigo-300">
                    {campaign.channels.instagram.cta}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {campaign.channels.instagram.hashtags?.map((tag, tidx) => (
                    <span
                      key={tidx}
                      className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeChannelTab === "tiktok" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Roteiro / Gancho Viral
                  </label>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-amber-200 border border-slate-700/60">
                    {campaign.channels.tiktok.hook}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400">Legenda TikTok</label>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(campaign.channels.tiktok.caption, "tt-caption")
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === "tt-caption" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "tt-caption" ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-slate-200 border border-slate-700/60">
                    {campaign.channels.tiktok.caption}
                  </div>
                </div>
              </div>
            )}

            {activeChannelTab === "linkedin" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Título B2B / Autoridade
                  </label>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs font-semibold text-white border border-slate-700/60">
                    {campaign.channels.linkedin.headline}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Texto Corporativo
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(campaign.channels.linkedin.copy, "li-copy")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === "li-copy" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "li-copy" ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-slate-200 border border-slate-700/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {campaign.channels.linkedin.copy}
                  </div>
                </div>
              </div>
            )}

            {activeChannelTab === "googleAds" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Títulos Responsivos (30 Caracteres)
                  </label>
                  <div className="space-y-1.5">
                    {campaign.channels.googleAds.headlines.map((hl, hidx) => (
                      <div
                        key={hidx}
                        className="p-2 bg-slate-800 rounded-lg text-xs font-mono text-emerald-300 border border-slate-700"
                      >
                        {hl}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Descrições (90 Caracteres)
                  </label>
                  <div className="space-y-1.5">
                    {campaign.channels.googleAds.descriptions.map((desc, didx) => (
                      <div
                        key={didx}
                        className="p-2.5 bg-slate-800 rounded-lg text-xs text-slate-200 border border-slate-700"
                      >
                        {desc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* A/B Test Quick Summary Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Simulador de Teste A/B Preditivo</span>
              </h3>
              <a
                href="#simulated-ab-tool"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Abrir Ferramenta Completa</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-300">
              Compare títulos, ganchos e formatos de criativo com base em dados históricos para
              prever a variação vencedora antes de gastar verba real.
            </p>

            <div className="space-y-2">
              {campaign.abTestVariants.slice(0, 2).map((v, vidx) => (
                <div
                  key={vidx}
                  className="p-2.5 bg-slate-800/70 rounded-md border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400">Variante {v.variant}</span>
                    <span className="text-[10px] text-slate-400">{v.focus}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 italic line-clamp-2">"{v.hook}"</p>
                </div>
              ))}
            </div>

            <a
              href="#simulated-ab-tool"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-slate-200 hover:text-white transition-all text-center"
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simular Coorte Preditiva de 10.000 Impressões</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          <CampaignImageGenerator brand={brand} campaign={campaign} productFocus={productFocus} />
        </div>
      </div>

      {/* Full-Featured Simulated A/B Testing Tool based on Historical Engagement Data */}
      <div id="simulated-ab-tool" className="pt-2">
        <SimulatedABTestingTool
          brand={brand}
          campaign={campaign}
          channel={
            activeChannelTab === "instagram"
              ? "Instagram Reels & Stories"
              : activeChannelTab === "tiktok"
                ? "TikTok Spark Ads"
                : activeChannelTab === "linkedin"
                  ? "LinkedIn B2B Sponsored"
                  : "Google Ads Search"
          }
          onApplyWinningVariation={handleApplyWinningVariation}
        />
      </div>
    </div>
  );
};
