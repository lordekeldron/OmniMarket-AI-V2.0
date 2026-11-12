// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { TrendsView } from './components/TrendsView';
import { CampaignStudio } from './components/CampaignStudio';
import { AudienceIntelligence } from './components/AudienceIntelligence';
import { RoiEngine } from './components/RoiEngine';
import { CompetitorMonitor } from './components/CompetitorMonitor';
import { SocialAutomation } from './components/SocialAutomation';
import { SupportChat } from './components/SupportChat';
import { ReportView } from './components/ReportView';
import { BrandProfileModal } from './components/BrandProfileModal';
import { SlideDeckModal } from './components/SlideDeckModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AgentWorkbench } from './components/AgentWorkbench';
import { ConnectionsView } from './components/ConnectionsView';

import {
  BrandProfile,
  TrendData,
  ChannelPerformanceData,
  CompetitorData,
  ScheduledPost,
  CampaignCreative,
  MacroTrend,
  LookalikeSegment,
  UserProfile,
} from './types';
import { optimizeChannelAllocations } from './utils/marketingMath';
import {
  getCurrentSession,
  clearCurrentSession,
  loadUserWorkspace,
  saveUserWorkspace,
  registerOrUpdateUser,
} from './utils/storage';

const emptyTrendData: TrendData = {
  summary: '',
  macroTrends: [],
  viralHooks: [],
  roiOpportunity: '',
};

const emptyCampaign: CampaignCreative = {
  campaignName: '',
  tagline: '',
  concept: '',
  channels: {
    instagram: { hook: '', caption: '', cta: '', hashtags: [] },
    tiktok: { hook: '', caption: '', cta: '' },
    linkedin: { headline: '', copy: '', cta: '' },
    googleAds: { headlines: [], descriptions: [] },
  },
  designDirectives: {
    productDesign: { concept: '', colorPalette: [], visualStyle: '', recommendedElements: [] },
    adBannerCreative: { mainHeadline: '', badgeText: '', ctaButtonText: '', visualPrompt: '' },
  },
  abTestVariants: [],
  expectedMetrics: { estimatedCTR: '', estimatedCPA: '', projectedROAS: '' },
};

export default function App() {
  // Active authenticated user session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentSession());
  const [showLanding, setShowLanding] = useState<boolean>(() => !getCurrentSession());
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);

  // Workspace data loaded from persistent storage
  const [brands, setBrands] = useState<BrandProfile[]>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      return ws?.brands || [];
    }
    return [];
  });

  const [activeBrand, setActiveBrand] = useState<BrandProfile | null>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      if (ws?.brands && ws.brands.length > 0) {
        return ws.brands.find((b) => b.id === ws.activeBrandId) || ws.brands[0];
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [trends, setTrends] = useState<TrendData>(emptyTrendData);

  const [channels, setChannels] = useState<ChannelPerformanceData[]>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      return ws?.channels || [];
    }
    return [];
  });

  const [competitors, setCompetitors] = useState<CompetitorData[]>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      return ws?.competitors || [];
    }
    return [];
  });

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      return ws?.scheduledPosts || [];
    }
    return [];
  });

  const [campaign, setCampaign] = useState<CampaignCreative>(() => {
    const session = getCurrentSession();
    if (session) {
      const ws = loadUserWorkspace(session.id);
      return ws?.campaign || emptyCampaign;
    }
    return emptyCampaign;
  });

  // Modal States
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isSlideDeckOpen, setIsSlideDeckOpen] = useState(false);
  const [optimizationApplied, setOptimizationApplied] = useState(false);
  const [prefillTrendTopic, setPrefillTrendTopic] = useState<string | undefined>(undefined);

  // Auto-persist workspace changes whenever relevant data changes
  useEffect(() => {
    if (currentUser) {
      saveUserWorkspace({
        user: currentUser,
        brands,
        activeBrandId: activeBrand ? activeBrand.id : null,
        channels,
        competitors,
        scheduledPosts,
        campaign,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [currentUser, brands, activeBrand, channels, competitors, scheduledPosts, campaign]);

  // Auth Success Handler: Restores saved data or opens brand creation
  const handleAuthSuccess = (user: UserProfile, isNew: boolean) => {
    setCurrentUser(user);
    setShowLanding(false);
    setAuthMode(null);

    const ws = loadUserWorkspace(user.id);
    if (ws && ws.brands && ws.brands.length > 0) {
      setBrands(ws.brands);
      const active = ws.brands.find((b) => b.id === ws.activeBrandId) || ws.brands[0];
      setActiveBrand(active);
      if (ws.channels && ws.channels.length > 0) setChannels(ws.channels);
      if (ws.competitors && ws.competitors.length > 0) setCompetitors(ws.competitors);
      if (ws.scheduledPosts && ws.scheduledPosts.length > 0) setScheduledPosts(ws.scheduledPosts);
      if (ws.campaign && ws.campaign.campaignName) setCampaign(ws.campaign);
      setIsBrandModalOpen(false);
    } else {
      // Prompt for new brand profile
      setIsBrandModalOpen(true);
    }
  };

  // Logout Handler: Clears session, returns to landing, but keeps records intact
  const handleLogout = () => {
    clearCurrentSession();
    setCurrentUser(null);
    setShowLanding(true);
    setActiveBrand(null);
  };

  // Switch Brand Profile Handler
  const handleSelectBrand = (brand: BrandProfile) => {
    setActiveBrand(brand);
    setTrends(emptyTrendData);
    setCampaign(emptyCampaign);
  };

  // Save New Brand Profile
  const handleSaveBrand = (newBrand: BrandProfile) => {
    let user = currentUser;
    if (!user) {
      const res = registerOrUpdateUser(
        newBrand.name + ' Admin',
        'admin@' + newBrand.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
        newBrand.name
      );
      user = res.user;
      setCurrentUser(user);
    }
    const updatedBrands = [...brands, newBrand];
    setBrands(updatedBrands);
    setActiveBrand(newBrand);
    saveUserWorkspace({
      user,
      brands: updatedBrands,
      activeBrandId: newBrand.id,
      channels,
      competitors,
      scheduledPosts,
      campaign,
      updatedAt: new Date().toISOString(),
    });
  };

  // One-Click ROI Optimization from Dashboard or ROI Engine
  const handleApplyOptimization = () => {
    const optimization = optimizeChannelAllocations(channels);
    const updatedChannels: ChannelPerformanceData[] = channels.map((c) => {
      const rec = optimization.items.find((i) => i.channelId === c.id);
      return rec
        ? {
            ...c,
            spend: rec.recommendedSpend,
            revenue: rec.predictedRevenue,
            roas: rec.predictedROAS,
            cpa: Number((rec.recommendedSpend / (c.conversions || 1)).toFixed(2)),
          }
        : c;
    });

    setChannels(updatedChannels);
    setOptimizationApplied(true);
  };

  // Navigate to Campaign Studio prefilled from a Trend
  const handleSelectTrendForCampaign = (trend: MacroTrend) => {
    setPrefillTrendTopic(`${trend.name}: ${trend.recommendedAction}`);
    setActiveTab('campaigns');
  };

  // Navigate to Campaign Studio from Competitor Counter-Strategy
  const handleSelectCounterStrategy = (strategy: string) => {
    setPrefillTrendTopic(`Contra-Estratégia: ${strategy}`);
    setActiveTab('campaigns');
  };

  // Add Scheduled Post
  const handleAddPost = (post: ScheduledPost) => {
    setScheduledPosts((prev) => [post, ...prev]);
  };

  // Instant Publish Post
  const handlePublishPostNow = (id: string) => {
    setScheduledPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'published',
              scheduledTime: 'Publicado agora',
              impressions: Math.floor(Math.random() * 5000) + 1200,
              likes: Math.floor(Math.random() * 400) + 85,
              engagementRate: (Math.random() * 3 + 4).toFixed(1) + '%',
            }
          : p
      )
    );
  };

  // Add Competitor
  const handleAddCompetitor = (newComp: CompetitorData) => {
    setCompetitors((prev) => [newComp, ...prev]);
  };

  // Apply Audience Lookalike Segment to Campaign
  const handleApplyAudienceToCampaign = (segment: LookalikeSegment) => {
    setCampaign((prev) => ({
      ...prev,
      tagline: `${prev.tagline} · Lookalike: ${segment.name}`,
      channels: {
        ...prev.channels,
        instagram: {
          ...prev.channels.instagram,
          hook: segment.recommendedHook,
          cta: segment.recommendedCTA,
        },
      },
      designDirectives: {
        ...prev.designDirectives,
        adBannerCreative: {
          ...prev.designDirectives.adBannerCreative,
          mainHeadline: segment.recommendedHook,
          badgeText: segment.tier,
          ctaButtonText: segment.recommendedCTA,
        },
      },
      expectedMetrics: {
        estimatedCTR: segment.projectedMetrics.estimatedCTR,
        estimatedCPA: segment.projectedMetrics.estimatedCPA,
        projectedROAS: segment.projectedMetrics.projectedROAS,
      },
    }));
    setActiveTab('campaigns');
  };

  // Print Handler
  const handleTriggerPrint = () => {
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (showLanding) {
    return (
      <>
        <LandingPage onSignUp={() => setAuthMode('signup')} onLogIn={() => setAuthMode('login')} />
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen text-foreground flex flex-col font-sans selection:bg-primary/30">
      {activeBrand && (
        <Navbar
          currentUser={currentUser}
          brands={brands}
          activeBrand={activeBrand}
          onSelectBrand={handleSelectBrand}
          onOpenNewBrandModal={() => setIsBrandModalOpen(true)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSlideDeck={() => setIsSlideDeckOpen(true)}
          onTriggerPrint={handleTriggerPrint}
          onLogout={handleLogout}
        />
      )}

      <div className="flex-1 flex flex-col lg:pl-64">
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeBrand ? (
          <section className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">OmniMarket AI</p>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">Comece pelo perfil da sua marca</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Cadastre os dados da sua empresa para liberar análises, campanhas e relatórios baseados exclusivamente nas informações da sua plataforma.
            </p>
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(true)}
              className="mt-6 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-glow"
            >
              Adicionar perfil da marca
            </button>
          </section>
        ) : (
          <>
            {activeTab === 'agents' && activeBrand && <AgentWorkbench brand={activeBrand} />}

            {activeTab === 'connections' && <ConnectionsView />}

            {activeTab === 'overview' && (
              <DashboardOverview
            brand={activeBrand}
            channels={channels}
            trends={trends}
            onNavigateTab={setActiveTab}
            onApplyOptimization={handleApplyOptimization}
            optimizationApplied={optimizationApplied}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsView
            brand={activeBrand}
            trends={trends}
            onUpdateTrends={setTrends}
            onSelectTrendForCampaign={handleSelectTrendForCampaign}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignStudio
            brand={activeBrand}
            campaign={campaign}
            onUpdateCampaign={setCampaign}
            prefillTrendTopic={prefillTrendTopic}
          />
        )}

        {activeTab === 'audience' && (
          <AudienceIntelligence
            brand={activeBrand}
            channels={channels}
            onApplyAudienceToCampaign={handleApplyAudienceToCampaign}
            campaign={campaign}
          />
        )}

        {activeTab === 'roi' && (
          <RoiEngine
            brand={activeBrand}
            channels={channels}
            onApplyNewAllocations={(newCh) => {
              setChannels(newCh);
              setOptimizationApplied(true);
            }}
          />
        )}

        {activeTab === 'competitors' && (
          <CompetitorMonitor
            brand={activeBrand}
            competitors={competitors}
            onAddCompetitor={handleAddCompetitor}
            onSelectCounterStrategy={handleSelectCounterStrategy}
          />
        )}

        {activeTab === 'social' && (
          <SocialAutomation
            brand={activeBrand}
            scheduledPosts={scheduledPosts}
            onAddPost={handleAddPost}
            onPublishPostNow={handlePublishPostNow}
          />
        )}

        {activeTab === 'support' && (
          <SupportChat brand={activeBrand} />
        )}

        {activeTab === 'report' && (
          <ReportView
            brand={activeBrand}
            channels={channels}
            trends={trends}
            competitors={competitors}
            campaign={campaign}
            onOpenSlideDeck={() => setIsSlideDeckOpen(true)}
            onTriggerPrint={handleTriggerPrint}
          />
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>OmniMarket AI Especialista · Otimização Preditiva de ROI & Marketing Autônomo</span>
          </div>
          <div>
            Monitorando {brands.length} perfis de marca simultaneamente em tempo real.
          </div>
        </div>
      </footer>
      </div>

      {/* Brand Profile Modal */}
      <BrandProfileModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        onSaveBrand={handleSaveBrand}
      />

      {activeBrand && (
        <SlideDeckModal
          isOpen={isSlideDeckOpen}
          onClose={() => setIsSlideDeckOpen(false)}
          brand={activeBrand}
          channels={channels}
          trends={trends}
          competitors={competitors}
          campaign={campaign}
          onTriggerPrint={handleTriggerPrint}
        />
      )}
    </div>
  );
}
