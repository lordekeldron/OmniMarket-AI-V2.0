import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Layers,
  Palette,
  Image as ImageIcon,
  RefreshCw,
  Sliders,
  Type,
  Layout,
  Instagram,
  Linkedin,
  Share2,
  Tag,
  CheckCircle2,
  ExternalLink,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { BrandProfile, CampaignCreative } from '../types';
import { SimulatedABTestingTool } from './SimulatedABTestingTool';

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
  const [productFocus, setProductFocus] = useState(prefillTrendTopic || '');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState(brand.targetAudience);
  const [tone, setTone] = useState(brand.tone);
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeChannelTab, setActiveChannelTab] = useState<'instagram' | 'tiktok' | 'linkedin' | 'googleAds'>('instagram');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Creative Canvas Studio State
  const [format, setFormat] = useState<'1:1' | '9:16' | '16:9' | '3:1'>('1:1');
  const [visualTheme, setVisualTheme] = useState<'minimalist' | 'luxury' | 'cyber' | 'eco'>('luxury');
  const [productType, setProductType] = useState<'bottle' | 'box' | 'device' | 'bag'>('bottle');
  const [headline, setHeadline] = useState(campaign.designDirectives?.adBannerCreative?.mainHeadline || '');
  const [badgeText, setBadgeText] = useState(campaign.designDirectives?.adBannerCreative?.badgeText || '');
  const [ctaText, setCtaText] = useState(campaign.designDirectives?.adBannerCreative?.ctaButtonText || '');
  const [priceTag, setPriceTag] = useState('');
  const [accentColor, setAccentColor] = useState(brand.accentColor || '#4F46E5');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update product focus when prefill arrives
  useEffect(() => {
    if (prefillTrendTopic) {
      setProductFocus(prefillTrendTopic);
    }
  }, [prefillTrendTopic]);

  const handleGenerateCampaign = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand.name,
          industry: brand.industry,
          objective,
          channels: ['Instagram', 'TikTok', 'LinkedIn', 'Google Ads'],
          budget,
          audience,
          tone,
          productFocus,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onUpdateCampaign(data.data);
        if (data.data.designDirectives?.adBannerCreative?.mainHeadline) {
          setHeadline(data.data.designDirectives.adBannerCreative.mainHeadline);
        }
        if (data.data.designDirectives?.adBannerCreative?.badgeText) {
          setBadgeText(data.data.designDirectives.adBannerCreative.badgeText);
        }
        if (data.data.designDirectives?.adBannerCreative?.ctaButtonText) {
          setCtaText(data.data.designDirectives.adBannerCreative.ctaButtonText);
        }
      }
    } catch (err) {
      console.error('Failed to generate campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyWinningVariation = (winningHeadline: string, winningHook: string, winningCta: string) => {
    setHeadline(winningHeadline);
    setCtaText(winningCta);
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

  // Render high-res banner on the HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 1080;
    let height = 1080;
    if (format === '9:16') {
      width = 1080;
      height = 1920;
    } else if (format === '16:9') {
      width = 1920;
      height = 1080;
    } else if (format === '3:1') {
      width = 1500;
      height = 500;
    }

    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    if (visualTheme === 'minimalist') {
      bgGradient.addColorStop(0, '#0F172A');
      bgGradient.addColorStop(0.6, '#1E293B');
      bgGradient.addColorStop(1, '#020617');
    } else if (visualTheme === 'luxury') {
      bgGradient.addColorStop(0, '#18181B');
      bgGradient.addColorStop(0.5, '#27272A');
      bgGradient.addColorStop(1, '#09090B');
    } else if (visualTheme === 'cyber') {
      bgGradient.addColorStop(0, '#0B0F19');
      bgGradient.addColorStop(0.5, '#1E1B4B');
      bgGradient.addColorStop(1, '#030712');
    } else {
      // eco
      bgGradient.addColorStop(0, '#064E3B');
      bgGradient.addColorStop(0.5, '#065F46');
      bgGradient.addColorStop(1, '#022C22');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Light Orb
    const orbGradient = ctx.createRadialGradient(
      width * 0.7,
      height * 0.4,
      50,
      width * 0.7,
      height * 0.4,
      width * 0.6
    );
    orbGradient.addColorStop(0, `${accentColor}55`);
    orbGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle Grid / Texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 4. Draw Product Silhouette / Illustration
    const prodCenterX = format === '3:1' ? width * 0.75 : width * 0.68;
    const prodCenterY = format === '9:16' ? height * 0.52 : height * 0.5;
    const prodScale = (format === '9:16' ? 1.3 : format === '3:1' ? 0.7 : 1) * (height / 1080);

    ctx.save();
    ctx.translate(prodCenterX, prodCenterY);

    // Pedestal Glow & Shadow
    ctx.beginPath();
    ctx.ellipse(0, 190 * prodScale, 160 * prodScale, 30 * prodScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // Draw chosen product
    if (productType === 'bottle') {
      // Cosmetic Dropper Bottle
      // Glass Body
      const bottleGrad = ctx.createLinearGradient(-70 * prodScale, 0, 70 * prodScale, 0);
      bottleGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
      bottleGrad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
      bottleGrad.addColorStop(0.7, `${accentColor}99`);
      bottleGrad.addColorStop(1, 'rgba(20,20,30,0.8)');

      ctx.fillStyle = bottleGrad;
      ctx.beginPath();
      ctx.roundRect(-60 * prodScale, -60 * prodScale, 120 * prodScale, 240 * prodScale, 24 * prodScale);
      ctx.fill();

      // Bottle Cap / Dropper
      ctx.fillStyle = visualTheme === 'luxury' ? '#F59E0B' : '#E2E8F0';
      ctx.fillRect(-24 * prodScale, -110 * prodScale, 48 * prodScale, 50 * prodScale);
      ctx.beginPath();
      ctx.ellipse(0, -125 * prodScale, 18 * prodScale, 20 * prodScale, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();

      // Bottle Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-42 * prodScale, 0, 84 * prodScale, 130 * prodScale, 8 * prodScale);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.font = `bold ${14 * prodScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(brand.name.slice(0, 16).toUpperCase(), 0, 45 * prodScale);
      ctx.font = `${10 * prodScale}px sans-serif`;
      ctx.fillText('BIO-ACTIVE FORMULA', 0, 68 * prodScale);
      ctx.fillText('30ml / 1.0 fl. oz', 0, 95 * prodScale);
    } else if (productType === 'box') {
      // Luxury Package Box
      const boxGrad = ctx.createLinearGradient(-100 * prodScale, -100 * prodScale, 100 * prodScale, 100 * prodScale);
      boxGrad.addColorStop(0, '#1E293B');
      boxGrad.addColorStop(0.5, '#334155');
      boxGrad.addColorStop(1, accentColor);
      ctx.fillStyle = boxGrad;
      ctx.beginPath();
      ctx.roundRect(-100 * prodScale, -100 * prodScale, 200 * prodScale, 260 * prodScale, 16 * prodScale);
      ctx.fill();

      // Gold Ribbon or Accent Line
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-100 * prodScale, -10 * prodScale, 200 * prodScale, 16 * prodScale);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${18 * prodScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(brand.name.toUpperCase(), 0, 40 * prodScale);
      ctx.font = `${12 * prodScale}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('EDITION PRESTIGE', 0, 70 * prodScale);
    } else if (productType === 'device') {
      // Tech Device / Smart Watch
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(-75 * prodScale, -110 * prodScale, 150 * prodScale, 220 * prodScale, 36 * prodScale);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * prodScale;
      ctx.stroke();

      // Screen glow
      const screenGrad = ctx.createLinearGradient(0, -90 * prodScale, 0, 90 * prodScale);
      screenGrad.addColorStop(0, '#1E1B4B');
      screenGrad.addColorStop(1, '#0284C7');
      ctx.fillStyle = screenGrad;
      ctx.beginPath();
      ctx.roundRect(-60 * prodScale, -95 * prodScale, 120 * prodScale, 190 * prodScale, 24 * prodScale);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${24 * prodScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('98.4%', 0, -20 * prodScale);
      ctx.font = `${11 * prodScale}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('ROI EFFICIENCY', 0, 10 * prodScale);
    } else {
      // Fashion Bag / Tote
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(-100 * prodScale, -60 * prodScale, 200 * prodScale, 200 * prodScale, 20 * prodScale);
      ctx.fill();

      // Handles
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 12 * prodScale;
      ctx.beginPath();
      ctx.arc(0, -60 * prodScale, 60 * prodScale, Math.PI, 0, false);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${16 * prodScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(brand.name.toUpperCase(), 0, 40 * prodScale);
    }
    ctx.restore();

    // 5. Typography & Text Overlay on Left
    const textStartX = width * 0.08;
    const textStartY = format === '9:16' ? height * 0.16 : height * 0.28;

    // Brand Label
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold ${format === '3:1' ? 14 : 20}px sans-serif`;
    ctx.fillText(brand.name.toUpperCase(), textStartX, textStartY);

    // Badge
    const badgeY = textStartY + (format === '3:1' ? 32 : 46);
    ctx.fillStyle = accentColor;
    const badgeWidth = ctx.measureText(badgeText).width + 36;
    ctx.beginPath();
    ctx.roundRect(textStartX, badgeY - 20, badgeWidth + 10, 32, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${format === '3:1' ? 12 : 14}px sans-serif`;
    ctx.fillText(badgeText.toUpperCase(), textStartX + 18, badgeY + 1);

    // Main Headline (with auto-wrap)
    ctx.fillStyle = '#FFFFFF';
    const headlineFontSize = format === '3:1' ? 32 : format === '9:16' ? 52 : 44;
    ctx.font = `800 ${headlineFontSize}px sans-serif`;
    const maxTextWidth = format === '3:1' ? width * 0.5 : width * 0.52;
    const words = headline.split(' ');
    let line = '';
    let curY = badgeY + (format === '3:1' ? 44 : 64);

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(line, textStartX, curY);
        line = words[n] + ' ';
        curY += headlineFontSize * 1.15;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, textStartX, curY);

    // Price / Offer Tag
    curY += format === '3:1' ? 32 : 46;
    ctx.fillStyle = '#34D399';
    ctx.font = `bold ${format === '3:1' ? 18 : 24}px sans-serif`;
    ctx.fillText(priceTag, textStartX, curY);

    // CTA Button
    curY += format === '3:1' ? 36 : 56;
    const btnWidth = format === '3:1' ? 220 : 300;
    const btnHeight = format === '3:1' ? 46 : 58;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(textStartX, curY, btnWidth, btnHeight, 12);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold ${format === '3:1' ? 14 : 18}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ctaText, textStartX + btnWidth / 2, curY + btnHeight / 2 + (format === '3:1' ? 5 : 6));
  }, [format, visualTheme, productType, headline, badgeText, ctaText, priceTag, accentColor, brand]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${brand.name.toLowerCase().replace(/\s+/g, '_')}_ad_${format.replace(':', 'x')}.png`;
    a.click();
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
              Gere campanhas completas de alta conversão para múltiplos canais e artes publicitárias com IA.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCampaign}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-glow disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-all whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Criando Campanha...' : 'Gerar Campanha com IA'}</span>
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
              <option value="Conversões & Vendas com Alto ROAS">Conversões & Vendas (Alto ROAS)</option>
              <option value="Reconhecimento de Marca & Alcance">Reconhecimento & Alcance (Branding)</option>
              <option value="Lançamento Exclusivo & Urgência">Lançamento Exclusivo (Urgência)</option>
              <option value="Retargeting de Carrinho Abandonado">Retargeting de Fundo de Funil</option>
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
            <label className="block text-xs font-medium text-slate-300 mb-1">Orçamento Previsto</label>
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
            <span className="text-[11px] font-bold text-indigo-400">
              Campanha Ativa
            </span>
            <h2 className="text-xl font-semibold text-white mt-0.5">
              {campaign.campaignName}
            </h2>
            <p className="text-xs text-slate-300 italic mt-1">
              "{campaign.tagline}"
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">CTR Estimado</span>
              <strong className="text-emerald-400 font-mono text-sm">{campaign.expectedMetrics?.estimatedCTR || '3.8%'}</strong>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">CPA Previsto</span>
              <strong className="text-indigo-300 font-mono text-sm">{campaign.expectedMetrics?.estimatedCPA || 'R$ 16,80'}</strong>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-md border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase">ROAS Projetado</span>
              <strong className="text-emerald-400 font-mono text-sm">{campaign.expectedMetrics?.projectedROAS || '4.8x'}</strong>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-4 leading-relaxed pt-3 border-t border-slate-800">
          <strong>Conceito Central:</strong> {campaign.concept}
        </p>
      </div>

      {/* Main Studio Two-Column Grid: Left Copywriting, Right Visual Canvas Designer */}
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
                { id: 'instagram', label: 'Instagram' },
                { id: 'tiktok', label: 'TikTok' },
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'googleAds', label: 'Google Ads' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChannelTab(c.id as any)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeChannelTab === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Channel Content Body */}
            {activeChannelTab === 'instagram' && (
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
                      onClick={() => copyToClipboard(campaign.channels.instagram.caption, 'ig-caption')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === 'ig-caption' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'ig-caption' ? 'Copiado!' : 'Copiar'}</span>
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
                    <span key={tidx} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeChannelTab === 'tiktok' && (
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
                      onClick={() => copyToClipboard(campaign.channels.tiktok.caption, 'tt-caption')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === 'tt-caption' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'tt-caption' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-slate-200 border border-slate-700/60">
                    {campaign.channels.tiktok.caption}
                  </div>
                </div>
              </div>
            )}

            {activeChannelTab === 'linkedin' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Título B2B / Autoridade</label>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs font-semibold text-white border border-slate-700/60">
                    {campaign.channels.linkedin.headline}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400">Texto Corporativo</label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(campaign.channels.linkedin.copy, 'li-copy')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === 'li-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'li-copy' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-md text-xs text-slate-200 border border-slate-700/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {campaign.channels.linkedin.copy}
                  </div>
                </div>
              </div>
            )}

            {activeChannelTab === 'googleAds' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Títulos Responsivos (30 Caracteres)</label>
                  <div className="space-y-1.5">
                    {campaign.channels.googleAds.headlines.map((hl, hidx) => (
                      <div key={hidx} className="p-2 bg-slate-800 rounded-lg text-xs font-mono text-emerald-300 border border-slate-700">
                        {hl}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Descrições (90 Caracteres)</label>
                  <div className="space-y-1.5">
                    {campaign.channels.googleAds.descriptions.map((desc, didx) => (
                      <div key={didx} className="p-2.5 bg-slate-800 rounded-lg text-xs text-slate-200 border border-slate-700">
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
              Compare títulos, ganchos e formatos de criativo com base em dados históricos para prever a variação vencedora antes de gastar verba real.
            </p>

            <div className="space-y-2">
              {campaign.abTestVariants.slice(0, 2).map((v, vidx) => (
                <div key={vidx} className="p-2.5 bg-slate-800/70 rounded-md border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400">Variante {v.variant}</span>
                    <span className="text-[10px] text-slate-400">{v.focus}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 italic line-clamp-2">
                    "{v.hook}"
                  </p>
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

        {/* Right: Interactive Product Design & Ad Creative Canvas Studio (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-md p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-semibold text-foreground">Estúdio de Design de Produto & Artes</h3>
              </div>
              <p className="text-xs text-slate-400">Personalize o design visual e exporte em alta resolução PNG</p>
            </div>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arte (PNG)</span>
            </button>
          </div>

          {/* Control Bar: Format & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Formato da Arte</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="1:1">Quadrado Feed (1:1)</option>
                <option value="9:16">Stories / Reels / TikTok (9:16)</option>
                <option value="16:9">Display Horizontal (16:9)</option>
                <option value="3:1">Banner Web Header (3:1)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Tema Visual</label>
              <select
                value={visualTheme}
                onChange={(e) => setVisualTheme(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="luxury">Luxe Champagne & Dark</option>
                <option value="minimalist">Minimalist Studio</option>
                <option value="cyber">Cyber Tech & Neon</option>
                <option value="eco">Clean Eco Botanical</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Modelo do Produto</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="bottle">Frasco Cosmético / Sérum</option>
                <option value="box">Embalagem de Luxo / Caixa</option>
                <option value="device">Smart Device / Wearable</option>
                <option value="bag">Bolsa Moda / Bag Premium</option>
              </select>
            </div>
          </div>

          {/* Text Customization Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Título Principal do Anúncio</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Texto da Badge de Urgência</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Preço ou Oferta Especial</label>
              <input
                type="text"
                value={priceTag}
                onChange={(e) => setPriceTag(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Texto do Botão de Ação</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Live Canvas Artboard Preview */}
          <div className="p-4 bg-slate-950 rounded-md border border-slate-800 flex items-center justify-center min-h-[360px] overflow-hidden">
            <canvas
              ref={canvasRef}
              className={`max-w-full rounded-md shadow-2xl transition-all duration-300 ${
                format === '9:16'
                  ? 'h-[440px] w-auto'
                  : format === '3:1'
                  ? 'w-full h-auto'
                  : 'h-[360px] w-auto'
              }`}
            />
          </div>

          {/* AI Photorealistic Prompt Recommendation */}
          <div className="p-3.5 bg-slate-800/60 rounded-md border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-indigo-400">
                Prompt Fotográfico para IA de Imagens
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(campaign.designDirectives?.adBannerCreative?.visualPrompt || '', 'img-prompt')
                }
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedKey === 'img-prompt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'img-prompt' ? 'Copiado' : 'Copiar Prompt'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{campaign.designDirectives?.adBannerCreative?.visualPrompt}"
            </p>
          </div>
        </div>
      </div>

      {/* Full-Featured Simulated A/B Testing Tool based on Historical Engagement Data */}
      <div id="simulated-ab-tool" className="pt-2">
        <SimulatedABTestingTool
          brand={brand}
          campaign={campaign}
          channel={activeChannelTab === 'instagram' ? 'Instagram Reels & Stories' : activeChannelTab === 'tiktok' ? 'TikTok Spark Ads' : activeChannelTab === 'linkedin' ? 'LinkedIn B2B Sponsored' : 'Google Ads Search'}
          onApplyWinningVariation={handleApplyWinningVariation}
        />
      </div>
    </div>
  );
};
