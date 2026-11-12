// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
/**
 * Pure marketing math and optimization algorithms.
 * Decoupled from React UI for fast testing and reliability.
 */

export interface ChannelPerformance {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface ReallocationResult {
  channelId: string;
  name: string;
  currentSpend: number;
  recommendedSpend: number;
  spendDelta: number;
  predictedROAS: number;
  predictedRevenue: number;
}

/**
 * Calculates Return on Ad Spend (ROAS).
 * ROAS = Revenue / Ad Spend
 */
export function calculateROAS(revenue: number, adSpend: number): number {
  if (adSpend <= 0) return 0;
  return Number((revenue / adSpend).toFixed(2));
}

/**
 * Calculates Return on Investment (ROI) as a percentage.
 * ROI = ((Revenue - Cost) / Cost) * 100
 */
export function calculateROI(revenue: number, cost: number): number {
  if (cost <= 0) return 0;
  return Number((((revenue - cost) / cost) * 100).toFixed(1));
}

/**
 * Calculates Cost Per Acquisition (CPA).
 * CPA = Ad Spend / Number of Conversions
 */
export function calculateCPA(adSpend: number, conversions: number): number {
  if (conversions <= 0) return 0;
  return Number((adSpend / conversions).toFixed(2));
}

/**
 * Calculates Click-Through Rate (CTR) as a percentage.
 * CTR = (Clicks / Impressions) * 100
 */
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return Number(((clicks / impressions) * 100).toFixed(2));
}

/**
 * Scores trend momentum / velocity from 0 to 100 based on growth rate,
 * sentiment multiplier and volume factor.
 */
export function scoreTrendVelocity(
  growthRatePct: number,
  sentiment: "positive" | "neutral" | "negative" | "critical",
  monthlySearchVolume: number,
): {
  velocityScore: number;
  classification: "Explosive" | "Steady Growth" | "Saturating" | "Volatile";
} {
  const sentimentMultiplier =
    sentiment === "positive"
      ? 1.2
      : sentiment === "neutral"
        ? 1.0
        : sentiment === "critical"
          ? 0.7
          : 0.85;

  const normalizedGrowth = Math.min(Math.max(growthRatePct, 0), 200) / 2; // 0..100
  const normalizedVolume = Math.min(monthlySearchVolume / 1000, 100); // 0..100

  const rawScore = (normalizedGrowth * 0.6 + normalizedVolume * 0.4) * sentimentMultiplier;
  const velocityScore = Math.min(Math.max(Math.round(rawScore), 5), 99);

  let classification: "Explosive" | "Steady Growth" | "Saturating" | "Volatile";
  if (velocityScore >= 80) {
    classification = "Explosive";
  } else if (velocityScore >= 55) {
    classification = "Steady Growth";
  } else if (growthRatePct < 15 && normalizedVolume > 60) {
    classification = "Saturating";
  } else {
    classification = "Volatile";
  }

  return { velocityScore, classification };
}

/**
 * Rebalances ad budget across channels toward higher ROAS channels
 * using marginal efficiency curve heuristic.
 */
export function optimizeChannelAllocations(
  channels: ChannelPerformance[],
  totalBudgetOverride?: number,
): {
  items: ReallocationResult[];
  overallCurrentROAS: number;
  overallPredictedROAS: number;
  totalCurrentSpend: number;
  totalNewSpend: number;
} {
  const totalCurrentSpend = channels.reduce((sum, c) => sum + c.spend, 0);
  const totalCurrentRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const overallCurrentROAS = calculateROAS(totalCurrentRevenue, totalCurrentSpend);

  const targetBudget =
    totalBudgetOverride && totalBudgetOverride > 0 ? totalBudgetOverride : totalCurrentSpend;

  // Weight channels by current ROAS with a dampening floor
  const weights = channels.map((c) => {
    const roas = calculateROAS(c.revenue, c.spend);
    // Exponential weight rewarding top ROAS
    const weight = Math.pow(Math.max(roas, 0.5), 1.35);
    return { ...c, roas, weight };
  });

  const totalWeight = weights.reduce((sum, c) => sum + c.weight, 0);

  let predictedTotalRevenue = 0;
  const items: ReallocationResult[] = weights.map((c) => {
    const rawShare = totalWeight > 0 ? c.weight / totalWeight : 1 / channels.length;
    // Bound each channel to at least 8% and at most 55% to prevent complete starvation
    const boundedShare = Math.min(Math.max(rawShare, 0.08), 0.55);
    const recommendedSpend = Math.round((targetBudget * boundedShare) / 100) * 100;
    const spendDelta = recommendedSpend - c.spend;

    // Diminishing returns curve for predicted ROAS
    const deltaRatio = c.spend > 0 ? recommendedSpend / c.spend : 1;
    let predictedROAS = c.roas;
    if (deltaRatio > 1) {
      // Slight degradation on scaling up (saturation factor)
      predictedROAS = Number((c.roas * Math.pow(deltaRatio, -0.1)).toFixed(2));
    } else {
      // Improved efficiency on cutting low-intent waste
      predictedROAS = Number((c.roas * Math.pow(deltaRatio, -0.05)).toFixed(2));
    }

    const predictedRevenue = Math.round(recommendedSpend * predictedROAS);
    predictedTotalRevenue += predictedRevenue;

    return {
      channelId: c.id,
      name: c.name,
      currentSpend: c.spend,
      recommendedSpend,
      spendDelta,
      predictedROAS,
      predictedRevenue,
    };
  });

  const totalNewSpend = items.reduce((sum, it) => sum + it.recommendedSpend, 0);
  const overallPredictedROAS = calculateROAS(predictedTotalRevenue, totalNewSpend);

  return {
    items,
    overallCurrentROAS,
    overallPredictedROAS,
    totalCurrentSpend,
    totalNewSpend,
  };
}

/**
 * Calculates competitive gap index between our metric and competitor's metric.
 * Positive = we lead, negative = competitor leads.
 */
export function calculateCompetitiveGap(
  ourValue: number,
  competitorValue: number,
): {
  gapPercentage: number;
  leading: "us" | "competitor" | "parity";
} {
  if (competitorValue <= 0 && ourValue <= 0) return { gapPercentage: 0, leading: "parity" };
  if (competitorValue <= 0) return { gapPercentage: 100, leading: "us" };

  const diff = ourValue - competitorValue;
  const pct = Number(((diff / competitorValue) * 100).toFixed(1));

  if (Math.abs(pct) < 1.0) {
    return { gapPercentage: 0, leading: "parity" };
  } else if (pct > 0) {
    return { gapPercentage: pct, leading: "us" };
  } else {
    return { gapPercentage: Math.abs(pct), leading: "competitor" };
  }
}

export interface PerformanceSpike {
  id: string;
  channelId: string;
  channelName: string;
  campaignName: string;
  creativeHook: string;
  spikeType: "roas_surge" | "cpa_plummet" | "ctr_velocity" | "viral_creative" | "cpa_spike_fatigue";
  severity: "high" | "medium" | "critical" | "protective";
  detectedAt: string;
  metricName: string;
  benchmarkValue: number;
  currentValue: number;
  deltaPct: number;
  currentDailyBudget: number;
  suggestedDailyBudget: number;
  budgetDelta: number;
  projectedIncrementalRevenue: number;
  projectedNewRoas: number;
  confidenceScore: number;
  rationale: string;
  status: "pending" | "applied" | "dismissed";
}

export interface AutoScaleSettings {
  autoMode: boolean;
  aggressiveness: "conservative" | "moderate" | "aggressive";
  minRoasFloor: number;
  maxDailyCap: number;
  cooldownMinutes: number;
}

export const DEFAULT_AUTOSCALE_SETTINGS: AutoScaleSettings = {
  autoMode: false,
  aggressiveness: "moderate",
  minRoasFloor: 2.5,
  maxDailyCap: 2500,
  cooldownMinutes: 60,
};

/**
 * Calculates dynamic budget scale adjustment and projected revenue based on performance spike and guardrails.
 */
export function calculateDynamicBudgetScale(
  currentDailyBudget: number,
  spike: {
    spikeType: PerformanceSpike["spikeType"];
    currentRoas: number;
    deltaPct: number;
  },
  settings: AutoScaleSettings = DEFAULT_AUTOSCALE_SETTINGS,
): {
  suggestedDailyBudget: number;
  budgetDelta: number;
  projectedRevenue: number;
  projectedRoas: number;
  blockedByFloor: boolean;
  cappedByLimit: boolean;
} {
  // If ROAS is below guardrail floor and this is not a protective reduction, do not scale up
  if (spike.spikeType !== "cpa_spike_fatigue" && spike.currentRoas < settings.minRoasFloor) {
    const projectedRevenue = Math.round(currentDailyBudget * spike.currentRoas);
    return {
      suggestedDailyBudget: currentDailyBudget,
      budgetDelta: 0,
      projectedRevenue,
      projectedRoas: spike.currentRoas,
      blockedByFloor: true,
      cappedByLimit: false,
    };
  }

  // Determine base scaling percentage based on aggressiveness
  let scalePct = 0.3; // default moderate
  if (settings.aggressiveness === "conservative") {
    scalePct = 0.15;
  } else if (settings.aggressiveness === "aggressive") {
    scalePct = 0.5;
  }

  // Adjust scale factor based on spike magnitude
  if (spike.spikeType === "cpa_spike_fatigue") {
    // Protective throttle: downscale by 25%
    const suggested = Math.max(Math.round(currentDailyBudget * 0.75), 50);
    const budgetDelta = suggested - currentDailyBudget;
    const projectedRoas = Number((spike.currentRoas * 1.1).toFixed(2)); // cutting waste improves roas slightly
    const projectedRevenue = Math.round(suggested * projectedRoas);
    return {
      suggestedDailyBudget: suggested,
      budgetDelta,
      projectedRevenue,
      projectedRoas,
      blockedByFloor: false,
      cappedByLimit: false,
    };
  }

  // Positive spike: amplify scale if delta is exceptionally high (> 50%)
  let finalScalePct = scalePct;
  if (spike.deltaPct > 60) {
    finalScalePct = scalePct * 1.25;
  }

  let rawSuggested = Math.round((currentDailyBudget * (1 + finalScalePct)) / 10) * 10;
  let cappedByLimit = false;

  // Apply maximum daily spend cap guardrail
  if (rawSuggested > settings.maxDailyCap) {
    rawSuggested = settings.maxDailyCap;
    cappedByLimit = true;
  }

  const budgetDelta = Math.max(0, rawSuggested - currentDailyBudget);
  const scaleRatio = currentDailyBudget > 0 ? rawSuggested / currentDailyBudget : 1;

  // Slight diminishing marginal return on immediate scaling
  const projectedRoas = Number((spike.currentRoas * Math.pow(scaleRatio, -0.08)).toFixed(2));
  const projectedRevenue = Math.round(rawSuggested * projectedRoas);

  return {
    suggestedDailyBudget: rawSuggested,
    budgetDelta,
    projectedRevenue,
    projectedRoas,
    blockedByFloor: false,
    cappedByLimit,
  };
}

/**
 * Detects real-time performance spikes across campaign channels.
 */
export function detectPerformanceSpikes(
  channels: ChannelPerformance[],
  settings: AutoScaleSettings = DEFAULT_AUTOSCALE_SETTINGS,
): PerformanceSpike[] {
  const spikes: PerformanceSpike[] = [];

  channels.forEach((ch) => {
    const dailyBudget = Math.max(Math.round(ch.spend / 30), 50);
    const roas = calculateROAS(ch.revenue, ch.spend);
    const cpa = calculateCPA(ch.spend, ch.conversions);
    const ctr = calculateCTR(ch.clicks, ch.impressions);

    // Channel specific benchmark heuristics
    let benchmarkRoas = 3.5;
    let benchmarkCpa = 25.0;
    let benchmarkCtr = 2.4;

    if (ch.id === "instagram") {
      benchmarkRoas = 4.2;
      benchmarkCpa = 18.0;
      benchmarkCtr = 2.8;
    } else if (ch.id === "tiktok") {
      benchmarkRoas = 3.8;
      benchmarkCpa = 14.5;
      benchmarkCtr = 3.2;
    } else if (ch.id === "google") {
      benchmarkRoas = 3.2;
      benchmarkCpa = 28.0;
      benchmarkCtr = 2.1;
    } else if (ch.id === "linkedin") {
      benchmarkRoas = 1.8;
      benchmarkCpa = 85.0;
      benchmarkCtr = 1.2;
    }

    // 1. Detect ROAS Surge (ROAS >= 1.25x benchmark)
    if (roas >= benchmarkRoas * 1.2) {
      const deltaPct = Number((((roas - benchmarkRoas) / benchmarkRoas) * 100).toFixed(1));
      const calc = calculateDynamicBudgetScale(
        dailyBudget,
        { spikeType: "roas_surge", currentRoas: roas, deltaPct },
        settings,
      );

      spikes.push({
        id: `spike-roas-${ch.id}`,
        channelId: ch.id,
        channelName: ch.name,
        campaignName:
          ch.id === "instagram" ? "Alfaiataria Essencial SS26" : `${ch.name} Performance Surge`,
        creativeHook:
          ch.id === "instagram"
            ? "Look Completo em 30 Segundos (Reels UGC)"
            : "Oferta de Alta Conversão",
        spikeType: "roas_surge",
        severity: deltaPct > 40 ? "critical" : "high",
        detectedAt: "Há 8 min",
        metricName: "ROAS em Tempo Real",
        benchmarkValue: benchmarkRoas,
        currentValue: roas,
        deltaPct,
        currentDailyBudget: dailyBudget,
        suggestedDailyBudget: calc.suggestedDailyBudget,
        budgetDelta: calc.budgetDelta,
        projectedIncrementalRevenue: calc.projectedRevenue - Math.round(dailyBudget * roas),
        projectedNewRoas: calc.projectedRoas,
        confidenceScore: Math.min(98, 85 + Math.round(deltaPct / 4)),
        rationale: `ROAS disparou +${deltaPct}% acima do benchmark histórico (${roas}x vs ${benchmarkRoas}x). Oportunidade de captura de receita marginal imediata antes da saturação da coorte.`,
        status: "pending",
      });
    }

    // 2. Detect Viral Creative / CTR Velocity on Video platforms
    if ((ch.id === "tiktok" || ch.id === "instagram") && ctr >= benchmarkCtr * 1.25) {
      const deltaPct = Number((((ctr - benchmarkCtr) / benchmarkCtr) * 100).toFixed(1));
      const calc = calculateDynamicBudgetScale(
        dailyBudget,
        { spikeType: "viral_creative", currentRoas: roas, deltaPct },
        settings,
      );

      spikes.push({
        id: `spike-viral-${ch.id}`,
        channelId: ch.id,
        channelName: ch.name,
        campaignName: `${ch.name} Spark UGC Viral`,
        creativeHook: "#ProvadorReal Criadores Micro-Influenciadores",
        spikeType: "viral_creative",
        severity: "high",
        detectedAt: "Há 14 min",
        metricName: "Taxa de Cliques (CTR)",
        benchmarkValue: benchmarkCtr,
        currentValue: ctr,
        deltaPct,
        currentDailyBudget: dailyBudget,
        suggestedDailyBudget: calc.suggestedDailyBudget,
        budgetDelta: calc.budgetDelta,
        projectedIncrementalRevenue: calc.projectedRevenue - Math.round(dailyBudget * roas),
        projectedNewRoas: calc.projectedRoas,
        confidenceScore: 92,
        rationale: `CTR atingiu ${ctr}% (+${deltaPct}% acima da média). Criativo de vídeo atingiu coeficiente viral com alta taxa de retenção nos primeiros 3 segundos.`,
        status: "pending",
      });
    }

    // 3. Detect Protective Fatigue / Out of bounds CPA (e.g. on LinkedIn or low-efficiency channels)
    if (ch.id === "linkedin" && roas < 1.4) {
      const deltaPct = Number((((roas - benchmarkRoas) / benchmarkRoas) * 100).toFixed(1));
      const calc = calculateDynamicBudgetScale(
        dailyBudget,
        { spikeType: "cpa_spike_fatigue", currentRoas: roas, deltaPct },
        settings,
      );

      spikes.push({
        id: `spike-fatigue-${ch.id}`,
        channelId: ch.id,
        channelName: ch.name,
        campaignName: "LinkedIn B2B Retargeting",
        creativeHook: "Case Study Whitepaper Download",
        spikeType: "cpa_spike_fatigue",
        severity: "protective",
        detectedAt: "Há 22 min",
        metricName: "ROAS Baixo / Fadiga de CPA",
        benchmarkValue: benchmarkRoas,
        currentValue: roas,
        deltaPct,
        currentDailyBudget: dailyBudget,
        suggestedDailyBudget: calc.suggestedDailyBudget,
        budgetDelta: calc.budgetDelta,
        projectedIncrementalRevenue: 0,
        projectedNewRoas: calc.projectedRoas,
        confidenceScore: 89,
        rationale: `ROAS caiu para ${roas}x com CPA elevado (R$ ${cpa.toFixed(2)}). Recomendado recuo protetivo de -25% do orçamento diário para conter desperdício de mídia.`,
        status: "pending",
      });
    }
  });

  return spikes;
}

/**
 * Applies a spike's suggested budget change to the active channels data.
 */
export function applyAutoScaleSpike<T extends ChannelPerformance>(
  channels: T[],
  spike: PerformanceSpike,
): T[] {
  return channels.map((c) => {
    if (c.id === spike.channelId) {
      const currentDaily = Math.max(Math.round(c.spend / 30), 1);
      const newDaily = spike.suggestedDailyBudget;
      const monthlySpend = newDaily * 30;
      const spendRatio = c.spend > 0 ? monthlySpend / c.spend : 1;

      const newRoas = spike.projectedNewRoas;
      const newRevenue = Math.round(monthlySpend * newRoas);
      const estimatedConversions = Math.max(1, Math.round(c.conversions * spendRatio * 0.95));

      return {
        ...c,
        spend: monthlySpend,
        revenue: newRevenue,
        roas: newRoas,
        conversions: estimatedConversions,
      };
    }
    return c;
  });
}

/**
 * Generates an on-demand synthetic real-time spike simulation.
 */
export function generateSyntheticSpike(
  channels: ChannelPerformance[],
  presetType: "roas" | "cpa" | "viral" = "roas",
  settings: AutoScaleSettings = DEFAULT_AUTOSCALE_SETTINGS,
): PerformanceSpike {
  const targetChannel =
    presetType === "viral"
      ? channels.find((c) => c.id === "tiktok") || channels[0]
      : channels.find((c) => c.id === "instagram") || channels[0];

  const currentDailyBudget = Math.max(Math.round(targetChannel.spend / 30), 100);
  const channelRoas = calculateROAS(targetChannel.revenue, targetChannel.spend) || 3.8;
  const nowId = `spike-live-${Date.now()}`;

  if (presetType === "viral") {
    const calc = calculateDynamicBudgetScale(
      currentDailyBudget,
      { spikeType: "viral_creative", currentRoas: channelRoas * 1.35, deltaPct: 82.5 },
      settings,
    );

    return {
      id: nowId,
      channelId: targetChannel.id,
      channelName: targetChannel.name,
      campaignName: "Flash Sale Stories & Reels",
      creativeHook: '"3 Peças Essenciais que Você Precisa Conhecer Hoje"',
      spikeType: "viral_creative",
      severity: "critical",
      detectedAt: "Agora (Tempo Real)",
      metricName: "Velocidade de Conversão (CTR + Conversão)",
      benchmarkValue: 2.8,
      currentValue: 5.1,
      deltaPct: 82.5,
      currentDailyBudget,
      suggestedDailyBudget: calc.suggestedDailyBudget,
      budgetDelta: calc.budgetDelta,
      projectedIncrementalRevenue:
        calc.projectedRevenue - Math.round(currentDailyBudget * channelRoas),
      projectedNewRoas: calc.projectedRoas,
      confidenceScore: 96,
      rationale: `Spike detectado em tempo real: Velocidade de conversão disparou 82.5% na última hora. Acelerar o orçamento diário para R$ ${calc.suggestedDailyBudget}/dia capturará a demanda em pico antes da saturação do criativo.`,
      status: "pending",
    };
  }

  // Default ROAS surge
  const surgeRoas = Number((channelRoas * 1.45).toFixed(2));
  const calc = calculateDynamicBudgetScale(
    currentDailyBudget,
    { spikeType: "roas_surge", currentRoas: surgeRoas, deltaPct: 45.0 },
    settings,
  );

  return {
    id: nowId,
    channelId: targetChannel.id,
    channelName: targetChannel.name,
    campaignName: "Pico de Conversão em Tempo Real",
    creativeHook: "Edição Limitada Coleção 2026",
    spikeType: "roas_surge",
    severity: "critical",
    detectedAt: "Agora (Tempo Real)",
    metricName: "Surge de ROAS Instantâneo",
    benchmarkValue: channelRoas,
    currentValue: surgeRoas,
    deltaPct: 45.0,
    currentDailyBudget,
    suggestedDailyBudget: calc.suggestedDailyBudget,
    budgetDelta: calc.budgetDelta,
    projectedIncrementalRevenue:
      calc.projectedRevenue - Math.round(currentDailyBudget * channelRoas),
    projectedNewRoas: calc.projectedRoas,
    confidenceScore: 97,
    rationale: `Surge de ROAS registrado: Saltou de ${channelRoas}x para ${surgeRoas}x (+45%). O motor econométrico recomenda incremento imediato de +R$ ${calc.budgetDelta}/dia com teto de segurança garantido.`,
    status: "pending",
  };
}
