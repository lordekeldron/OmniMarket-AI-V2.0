export interface AgentDefinition {
  id: "lifecycle" | "campaigns" | "growth" | "acquisition";
  name: string;
  source: string;
  summary: string;
  skills: string[];
  color: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  industry: string;
  tagline: string;
  tone: string;
  targetAudience: string;
  valueProposition: string;
  monthlyBudget: number;
  currency: string;
  accentColor: string;
  logoInitial: string;
  socialHandles: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface MacroTrend {
  name: string;
  growthRate: string;
  sentiment: string;
  category: string;
  description: string;
  predictedImpact: string;
  recommendedAction: string;
  relevantKeywords: string[];
}

export interface TrendData {
  summary: string;
  macroTrends: MacroTrend[];
  viralHooks: string[];
  roiOpportunity: string;
}

export interface ChannelPerformanceData {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
}

export interface CompetitorData {
  id: string;
  name: string;
  website: string;
  marketShare: string;
  pricingStrategy: string;
  threatLevel: "Alta" | "Média" | "Baixa" | "";
  trafficShare: { channel: string; share: string; threatLevel: string }[];
  spottedAdHooks: string[];
  strengths: string[];
  vulnerabilities: string[];
  counterStrategy: string;
  keywordOpportunities: {
    keyword: string;
    searchVolume: string;
    difficulty: string;
    opportunity: string;
  }[];
}

export interface CampaignCreative {
  campaignName: string;
  tagline: string;
  concept: string;
  channels: {
    instagram: {
      hook: string;
      caption: string;
      cta: string;
      hashtags: string[];
    };
    tiktok: {
      hook: string;
      caption: string;
      cta: string;
    };
    linkedin: {
      headline: string;
      copy: string;
      cta: string;
    };
    googleAds: {
      headlines: string[];
      descriptions: string[];
    };
  };
  designDirectives: {
    productDesign: {
      concept: string;
      colorPalette: string[];
      visualStyle: string;
      recommendedElements: string[];
    };
    adBannerCreative: {
      mainHeadline: string;
      badgeText: string;
      ctaButtonText: string;
      visualPrompt: string;
    };
  };
  abTestVariants: {
    variant: string;
    focus: string;
    hook: string;
  }[];
  expectedMetrics: {
    estimatedCTR: string;
    estimatedCPA: string;
    projectedROAS: string;
  };
}

export interface ScheduledPost {
  id: string;
  channel: "instagram" | "tiktok" | "linkedin" | "facebook";
  caption: string;
  scheduledTime: string;
  status: "scheduled" | "published" | "draft";
  impressions?: number;
  engagementRate?: string;
  likes?: number;
  creativeTitle: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent" | "customer";
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SlideContent {
  id: number;
  title: string;
  subtitle: string;
  kpis?: { label: string; value: string; trend?: string }[];
  bullets: string[];
  speakerNotes: string;
  badge?: string;
}

export interface LookalikeSegment {
  id: string;
  name: string;
  tier: "1% Super Afinado" | "2-3% Balanceado" | "5% Escala Ampla";
  similarityPercentage: number;
  estimatedReach: string;
  channelFocus: string[];
  projectedMetrics: {
    estimatedCTR: string;
    estimatedCPA: string;
    projectedROAS: string;
    conversionRate: string;
  };
  seedPersonaReference: string;
  psychographicTraits: string[];
  behavioralSignals: string[];
  recommendedHook: string;
  recommendedCTA: string;
  negativeExclusions: string[];
  platformTargetingCode: {
    metaInterests: string[];
    tiktokBehaviors: string[];
    googleKeywords: string[];
  };
}

export interface EngagementSignalSummary {
  channel: string;
  ctr: number;
  conversionRate: number;
  avgOrderValue: number;
  dominantAgeGroup: string;
  topConvertingCreative: string;
  intentScore: number;
}

export interface GoogleTrendRegion {
  name: string;
  code: string;
  searchVolumeIndex: number; // 0-100
  growthRate: string; // e.g. "+84%"
  isBreakout?: boolean;
  topRisingQuery: string;
  lat: number;
  lng: number;
  opportunityScore: number; // 0-100
}

export interface GoogleTrendCountry {
  name: string;
  code: string; // BR, US, UK, etc.
  searchVolumeIndex: number;
  growthRate: string;
  sentiment: string;
  lat: number;
  lng: number;
  regions: GoogleTrendRegion[];
}

export interface GoogleTrendSearchData {
  query: string;
  category: string;
  selectedCountry: string;
  selectedRegion?: string;
  timeRange: string;
  globalInterestIndex: number;
  breakoutQueries: {
    term: string;
    growth: string;
    category: string;
    searchIntent: "Transacional" | "Informacional" | "Comercial" | "Navegacional";
  }[];
  relatedTopics: {
    title: string;
    type: string;
    relevanceScore: number;
  }[];
  interestOverTime: {
    period: string;
    volume: number;
  }[];
  countries: GoogleTrendCountry[];
  marketingTakeaway: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserWorkspaceData {
  user: UserProfile;
  brands: BrandProfile[];
  activeBrandId: string | null;
  channels?: ChannelPerformanceData[];
  competitors?: CompetitorData[];
  scheduledPosts?: ScheduledPost[];
  campaign?: CampaignCreative;
  updatedAt: string;
}
