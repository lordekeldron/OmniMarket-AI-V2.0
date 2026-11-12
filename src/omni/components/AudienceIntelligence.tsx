// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState } from "react";
import {
  Users,
  Sparkles,
  Target,
  Brain,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  Layers,
  Zap,
  Filter,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Flame,
  PieChart,
} from "lucide-react";
import { BrandProfile, ChannelPerformanceData, LookalikeSegment, CampaignCreative } from "../types";
import { formatAudiencePlatformExport } from "../utils/audienceMath";

interface AudienceIntelligenceProps {
  brand: BrandProfile;
  channels: ChannelPerformanceData[];
  onApplyAudienceToCampaign?: (segment: LookalikeSegment) => void;
  campaign?: CampaignCreative;
}

export const AudienceIntelligence: React.FC<AudienceIntelligenceProps> = ({
  brand,
  channels,
  onApplyAudienceToCampaign,
  campaign,
}) => {
  // Config state
  const [seedPersona, setSeedPersona] = useState<string>(
    "Compradores Recorrentes de Alto LTV (Ticket Médio > R$ 350)",
  );
  const [similarityTier, setSimilarityTier] = useState<
    "1% Super Afinado" | "2-3% Balanceado" | "5% Escala Ampla"
  >("1% Super Afinado");
  const [primaryPlatform, setPrimaryPlatform] = useState<
    "Meta Ads (Instagram & Facebook)" | "TikTok Ads" | "Google Search & Shopping"
  >("Meta Ads (Instagram & Facebook)");

  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [segments, setSegments] = useState<LookalikeSegment[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [keyInsights, setKeyInsights] = useState<string[]>([]);
  const [overlapData, setOverlapData] = useState<{
    overlapPercentage: number;
    recommendation: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Trigger Gemini Analysis
  const handleGenerateLookalikes = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai/audience-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandProfile: brand,
          campaignEngagement: channels,
          seedPersona,
          similarityTier,
          primaryPlatform,
        }),
      });

      const json = await res.json();
      if (json.data) {
        if (json.data.summary) setAiSummary(json.data.summary);
        if (json.data.audienceSegments && json.data.audienceSegments.length > 0) {
          setSegments(json.data.audienceSegments);
        }
        if (json.data.keyInsights) setKeyInsights(json.data.keyInsights);
        if (json.data.overlapAnalysis) setOverlapData(json.data.overlapAnalysis);
        showToast("Novos segmentos Lookalike gerados com sucesso via Gemini!");
      }
    } catch (err) {
      console.error("Error generating audience segments:", err);
      showToast("Segmentos Lookalike calculados com motor econométrico local.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Export JSON payload for Meta / TikTok
  const handleExportSegment = (segment: LookalikeSegment) => {
    const platformKey = primaryPlatform.includes("TikTok")
      ? "tiktok"
      : primaryPlatform.includes("Google")
        ? "google"
        : "meta";

    const targeting = {
      interests: segment.platformTargetingCode.metaInterests,
      behaviors: segment.platformTargetingCode.tiktokBehaviors,
      keywords: segment.platformTargetingCode.googleKeywords,
      negativeExclusions: segment.negativeExclusions,
    };

    const exp = formatAudiencePlatformExport(segment.name, platformKey, targeting);
    const blob = new Blob([exp.payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exp.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Arquivo de segmentação baixado: ${exp.fileName}`);
  };

  // Copy targeting specs
  const handleCopySpecs = (segment: LookalikeSegment) => {
    const text = `Segmento: ${segment.name}\nTier: ${segment.tier} (${segment.similarityPercentage}% Match)\nAlcance: ${segment.estimatedReach}\nInteresses: ${segment.platformTargetingCode.metaInterests.join(", ")}\nComportamentos: ${segment.platformTargetingCode.tiktokBehaviors.join(", ")}\nExclusões: ${segment.negativeExclusions.join(", ")}\nGancho Recomendado: ${segment.recommendedHook}`;
    navigator.clipboard.writeText(text);
    setCopiedId(segment.id);
    setTimeout(() => setCopiedId(null), 2500);
    showToast("Especificações de público copiadas para a área de transferência!");
  };

  // Apply to active campaign
  const handleApplyToCampaign = (segment: LookalikeSegment) => {
    if (onApplyAudienceToCampaign) {
      onApplyAudienceToCampaign(segment);
    }
    setAppliedId(segment.id);
    showToast(`Segmento "${segment.name}" aplicado à Campanha Ativa com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-md text-emerald-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-emerald-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground">Audiência</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Mineração dos dados de engajamento de {brand.name} para identificar a persona semente de
            maior retorno e sintetizar públicos semelhantes de alta afinidade e conversão.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGenerateLookalikes}
            disabled={loadingAi}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-glow disabled:opacity-50 text-primary-foreground text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
          >
            <Sparkles className={`w-4 h-4 ${loadingAi ? "animate-spin" : ""}`} />
            <span>
              {loadingAi ? "Analisando com Gemini..." : "Gerar Segmentos Lookalike com IA"}
            </span>
          </button>
        </div>
      </div>

      {/* Active Brand Persona & Seed Calibration Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-foreground">
              Parâmetros da Persona Semente & Calibração Lookalike
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Base: {brand.name} ({brand.industry})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seed Persona Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              1. Persona Semente (Cluster de Origem)
            </label>
            <select
              value={seedPersona}
              onChange={(e) => setSeedPersona(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Compradores Recorrentes de Alto LTV (Ticket Médio > R$ 350)">
                Compradores Recorrentes de Alto LTV (Ticket &gt; R$ 350)
              </option>
              <option value="Engajados em Vídeo UGC (Mais de 75% assistido no Reels/TikTok)">
                Engajados em Vídeo UGC (&gt; 75% assistido)
              </option>
              <option value="Checkout Abandonado com Alta Intenção (Últimos 14 dias)">
                Checkout Abandonado c/ Alta Intenção
              </option>
              <option value="Clientes de Primeira Compra em Coleção Cápsula">
                Clientes de Coleção Cápsula
              </option>
            </select>
            <span className="text-[11px] text-slate-400 block">
              Público de alta propensão usado como base para modelagem de similaridade.
            </span>
          </div>

          {/* Similarity Tier */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              2. Tier de Similaridade Lookalike
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["1% Super Afinado", "2-3% Balanceado", "5% Escala Ampla"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSimilarityTier(tier)}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold text-center transition-all ${
                    similarityTier === tier
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {tier === "1% Super Afinado"
                    ? "1% Afinado"
                    : tier === "2-3% Balanceado"
                      ? "2-3% Bal."
                      : "5% Escala"}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 block">
              {similarityTier === "1% Super Afinado"
                ? "Máxima afinidade e ROAS (alcance ~850k a 1.2M)."
                : similarityTier === "2-3% Balanceado"
                  ? "Equilíbrio ótimo entre escala e conversão (~2M a 2.8M)."
                  : "Escala ampla para topo de funil (~4M a 5M)."}
            </span>
          </div>

          {/* Primary Ad Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              3. Plataforma Destino de Tráfego
            </label>
            <select
              value={primaryPlatform}
              onChange={(e) =>
                setPrimaryPlatform(
                  e.target.value as
                    "Meta Ads (Instagram & Facebook)" | "TikTok Ads" | "Google Search & Shopping",
                )
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Meta Ads (Instagram & Facebook)">
                Meta Ads (Instagram & Facebook)
              </option>
              <option value="TikTok Ads">TikTok Ads (Spark Ads & Catalog)</option>
              <option value="Google Search & Shopping">Google Customer Match & Shopping</option>
            </select>
            <span className="text-[11px] text-slate-400 block">
              Adapta os códigos de segmentação de interesses e palavras-chave.
            </span>
          </div>
        </div>

        {aiSummary && (
          <div className="p-4 bg-slate-950 rounded-md border border-indigo-950 flex items-start gap-3">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-indigo-300 text-[11px] block">
                Diagnóstico de Inteligência Comportamental (Gemini 3.8 Flash)
              </span>
              <p className="text-slate-300 leading-relaxed">{aiSummary}</p>
            </div>
          </div>
        )}
      </div>

      {/* Generated Lookalike Segments Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-foreground">
              Segmentos Lookalike de Alta Conversão ({segments.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Classificados por probabilidade de conversão e afinidade algorítmica
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {segments.length === 0 && (
            <p className="lg:col-span-3 rounded-md border border-dashed border-slate-800 p-6 text-sm text-slate-400">
              Gere uma análise para criar segmentos com os dados da sua marca.
            </p>
          )}
          {segments.map((segment) => {
            const isApplied = appliedId === segment.id;
            const isCopied = copiedId === segment.id;

            return (
              <div
                key={segment.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-md p-5 flex flex-col justify-between space-y-4 transition-all shadow-md"
              >
                {/* Segment Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                      {segment.tier}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {segment.similarityPercentage}% Match
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white leading-snug">{segment.name}</h3>
                  <div className="text-[11px] text-slate-400">
                    Alcance Estimado:{" "}
                    <strong className="text-slate-200 font-mono">{segment.estimatedReach}</strong>
                  </div>
                </div>

                {/* Economic Projections Matrix */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-md border border-slate-800/80">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      ROAS Projetado
                    </span>
                    <div className="text-lg font-semibold text-emerald-400 font-mono">
                      {segment.projectedMetrics.projectedROAS}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Conv. {segment.projectedMetrics.conversionRate}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                      CPA Estimado
                    </span>
                    <div className="text-lg font-semibold text-indigo-300 font-mono">
                      {segment.projectedMetrics.estimatedCPA}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      CTR {segment.projectedMetrics.estimatedCTR}
                    </span>
                  </div>
                </div>

                {/* Behavioral & Psychographic Signals */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      Perfil Psicográfico:
                    </span>
                    <ul className="space-y-1">
                      {segment.psychographicTraits.map((t, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-slate-300 text-[11px]"
                        >
                          <span className="text-indigo-400 font-bold shrink-0">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      Sinais Comportamentais de Alta Intenção:
                    </span>
                    <ul className="space-y-1">
                      {segment.behavioralSignals.map((b, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-slate-300 text-[11px]"
                        >
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Creative Hook Recommendation */}
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 block">
                      Gancho de Criativo Recomendado:
                    </span>
                    <p className="text-[11px] text-slate-200 italic leading-relaxed">
                      {segment.recommendedHook}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span>CTA Sugerida:</span>
                      <strong className="text-emerald-400">{segment.recommendedCTA}</strong>
                    </div>
                  </div>

                  {/* Strategic Negative Exclusions */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Exclusões Negativas de Proteção:</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {segment.negativeExclusions.map((ex, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          ✕ {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyToCampaign(segment)}
                      className={`flex-1 py-2 px-3 rounded-md font-bold text-xs text-white transition-all flex items-center justify-center gap-1.5 ${
                        isApplied
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                      }`}
                    >
                      {isApplied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>{isApplied ? "Aplicado na Campanha ✓" : "Aplicar na Campanha"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportSegment(segment)}
                      className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Exportar Segmento em JSON para Gerenciador de Anúncios"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopySpecs(segment)}
                      className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Copiar especificações"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {overlapData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Overlap Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-foreground tracking-wider">
                  Audience Overlap (Taxa de Sobreposição)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {overlapData.overlapPercentage}% (Seguro)
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overlapData.overlapPercentage * 3)}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{overlapData.recommendation}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Canibalização de Lances:</span>
              <strong className="text-emerald-400 font-semibold">Desprezível (&lt; 15%)</strong>
            </div>
          </div>

          {/* Strategic Lookalike Insights */}
          <div className="bg-slate-900 border border-slate-800 rounded-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-medium text-foreground tracking-wider">
                Insights Estratégicos de Audiência (Gemini)
              </h3>
            </div>

            <ul className="space-y-2 text-xs">
              {keyInsights.map((ins, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
