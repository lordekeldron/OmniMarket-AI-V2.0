/**
 * Pure math and algorithmic logic for Audience Intelligence & Lookalike Modeling.
 * Decoupled from React UI for fast testing and reliability.
 */

export interface AudienceAffinityInputs {
  demographicFit: number; // 0..100
  historicalEngagementRate: number; // e.g. 3.5%
  historicalConversionRate: number; // e.g. 2.8%
  channelAlignmentScore: number; // 0..100
}

/**
 * Calculates Lookalike audience estimated reach in population.
 * 1% lookalike in Brazil adult digital population (~85M) is ~850k to 1.2M.
 */
export function calculateLookalikeReach(
  similarityTierPct: number,
  baseDigitalPopulation: number = 85000000
): { minReach: number; maxReach: number; formattedReach: string } {
  const boundedPct = Math.max(0.5, Math.min(10, similarityTierPct));
  const baseReach = Math.round(baseDigitalPopulation * (boundedPct / 100));
  
  const minReach = Math.round(baseReach * 0.85);
  const maxReach = Math.round(baseReach * 1.15);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    return `${Math.round(num / 1000)}k`;
  };

  return {
    minReach,
    maxReach,
    formattedReach: `${formatNumber(minReach)} - ${formatNumber(maxReach)} pessoas`,
  };
}

/**
 * Scores audience affinity from 0 to 100 based on demographic fit,
 * engagement history, conversion rate and channel alignment.
 */
export function scoreAudienceAffinity(inputs: AudienceAffinityInputs): {
  affinityScore: number;
  confidenceRating: 'Ultra-Alta' | 'Alta' | 'Moderada' | 'Experimental';
} {
  const normEng = Math.min(inputs.historicalEngagementRate / 5, 1) * 100;
  const normConv = Math.min(inputs.historicalConversionRate / 4, 1) * 100;

  const rawScore =
    inputs.demographicFit * 0.35 +
    inputs.channelAlignmentScore * 0.25 +
    normEng * 0.20 +
    normConv * 0.20;

  const affinityScore = Math.min(99, Math.max(20, Math.round(rawScore)));

  let confidenceRating: 'Ultra-Alta' | 'Alta' | 'Moderada' | 'Experimental';
  if (affinityScore >= 90) {
    confidenceRating = 'Ultra-Alta';
  } else if (affinityScore >= 75) {
    confidenceRating = 'Alta';
  } else if (affinityScore >= 50) {
    confidenceRating = 'Moderada';
  } else {
    confidenceRating = 'Experimental';
  }

  return { affinityScore, confidenceRating };
}

/**
 * Projects expected ROAS and CPA based on baseline metrics and similarity tier.
 * Tighter similarity (1%) produces higher ROAS and lower CPA.
 * Wider similarity (5%) trades margin for volume.
 */
export function projectSegmentEconomics(
  baselineRoas: number,
  baselineCpa: number,
  tier: '1% Super Afinado' | '2-3% Balanceado' | '5% Escala Ampla',
  affinityScore: number
): {
  projectedRoas: number;
  projectedCpa: number;
  expectedConversionRate: number;
} {
  let tierMultiplier = 1.0;
  let cpaMultiplier = 1.0;
  let baseConversion = 3.2;

  if (tier === '1% Super Afinado') {
    tierMultiplier = 1.30; // +30% ROAS efficiency
    cpaMultiplier = 0.72; // -28% CPA
    baseConversion = 4.4;
  } else if (tier === '2-3% Balanceado') {
    tierMultiplier = 1.12; // +12% ROAS efficiency
    cpaMultiplier = 0.88; // -12% CPA
    baseConversion = 3.6;
  } else {
    tierMultiplier = 0.95; // Slight dilution on 5% broad scale
    cpaMultiplier = 1.08;
    baseConversion = 2.7;
  }

  const affinityFactor = affinityScore / 85; // normalized around baseline 85
  const projectedRoas = Number((baselineRoas * tierMultiplier * Math.pow(affinityFactor, 0.4)).toFixed(2));
  const projectedCpa = Number((baselineCpa * cpaMultiplier / Math.pow(affinityFactor, 0.4)).toFixed(2));
  const expectedConversionRate = Number((baseConversion * affinityFactor).toFixed(1));

  return {
    projectedRoas,
    projectedCpa,
    expectedConversionRate,
  };
}

/**
 * Generates structured export format ready for ad platforms.
 */
export function formatAudiencePlatformExport(
  segmentName: string,
  platform: 'meta' | 'tiktok' | 'google',
  targeting: {
    interests: string[];
    behaviors: string[];
    keywords: string[];
    negativeExclusions: string[];
  }
): {
  fileName: string;
  payload: string;
} {
  const safeName = segmentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  if (platform === 'meta') {
    return {
      fileName: `meta_lookalike_${safeName}.json`,
      payload: JSON.stringify(
        {
          audience_type: 'LOOKALIKE_CUSTOM',
          target_spec: {
            country: 'BR',
            similarity_tier: '1%',
            interests: targeting.interests,
            behaviors: targeting.behaviors,
            exclusions: targeting.negativeExclusions,
          },
        },
        null,
        2
      ),
    };
  } else if (platform === 'tiktok') {
    return {
      fileName: `tiktok_lookalike_${safeName}.json`,
      payload: JSON.stringify(
        {
          audience_type: 'TIKTOK_LOOKALIKE_PACKAGE',
          optimization_goal: 'PURCHASE',
          interests: targeting.interests,
          actions: targeting.behaviors,
          negative_exclusions: targeting.negativeExclusions,
        },
        null,
        2
      ),
    };
  }

  return {
    fileName: `google_customer_match_${safeName}.json`,
    payload: JSON.stringify(
      {
        type: 'GOOGLE_CUSTOMER_MATCH_SIMILAR',
        keywords: targeting.keywords,
        affinity_categories: targeting.interests,
        negative_keywords: targeting.negativeExclusions,
      },
      null,
      2
    ),
  };
}
