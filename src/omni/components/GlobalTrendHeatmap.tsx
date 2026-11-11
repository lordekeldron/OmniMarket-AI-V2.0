import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import {
  Globe as GlobeIcon,
  Map as MapIcon,
  TrendingUp,
  Sparkles,
  Flame,
  Search,
  RefreshCw,
  ArrowRight,
  Layers,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { BrandProfile, GoogleTrendCountry, GoogleTrendRegion, GoogleTrendSearchData, MacroTrend } from '../types';
import {
  SEED_COUNTRIES,
  generateDefaultGoogleTrendsData,
} from '../utils/googleTrendsMath';

const GEO_URL =
  'https://unpkg.com/three-globe@2.31.1/example/country-polygons/ne_110m_admin_0_countries.geojson';
// Google Earth / Blue Marble high-res satellite imagery texture
const EARTH_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

interface GlobalTrendHeatmapProps {
  brand: BrandProfile;
  onFocusTopic: (topic: string) => void;
  onSelectTrendForCampaign?: (trend: MacroTrend) => void;
}

class GlobeErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('Globe WebGL rendering gracefully recovered:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Controller component to smoothly pan the 2D Google Map when the user clicks a country or region pill
const MapCameraController: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
};

export const GlobalTrendHeatmap: React.FC<GlobalTrendHeatmapProps> = ({
  brand,
  onFocusTopic,
  onSelectTrendForCampaign,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);
  const [width, setWidth] = useState(720);
  const [countriesGeo, setCountriesGeo] = useState<any[]>([]);
  const [loadError, setLoadError] = useState(false);

  // Explicit View Mode ('3d' for 3D Globe, '2d' for 2D Google Earth Map)
  // Switching is controlled strictly via the top-right button toggle
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Google Maps Platform API Key state
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );
  const [mapsError, setMapsError] = useState(false);

  // Google Trends State
  const [searchQuery, setSearchQuery] = useState(brand.industry || 'Inteligência de Mercado');
  const [activeCountryCode, setActiveCountryCode] = useState('BR');
  const [activeRegionCode, setActiveRegionCode] = useState<string>('SP');
  const [trendsData, setTrendsData] = useState<GoogleTrendSearchData>(() =>
    generateDefaultGoogleTrendsData(brand.industry || 'Inteligência de Mercado', 'Brasil')
  );
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Selected Country & Region Objects
  const currentCountry = useMemo<GoogleTrendCountry>(() => {
    return (
      trendsData.countries.find((c) => c.code === activeCountryCode) ||
      trendsData.countries[0] ||
      SEED_COUNTRIES[0]
    );
  }, [trendsData, activeCountryCode]);

  const currentRegion = useMemo<GoogleTrendRegion | undefined>(() => {
    return currentCountry.regions.find((r) => r.code === activeRegionCode) || currentCountry.regions[0];
  }, [currentCountry, activeRegionCode]);

  // Center coordinates for map view
  const mapCenter = useMemo(() => {
    if (currentRegion) {
      return { lat: currentRegion.lat, lng: currentRegion.lng };
    }
    return { lat: currentCountry.lat, lng: currentCountry.lng };
  }, [currentCountry, currentRegion]);

  // Load API Key from server if missing in client env
  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.googleMapsApiKey) {
            setMapsApiKey(data.googleMapsApiKey);
          }
        })
        .catch(() => {
          // silently continue with satellite fallback if needed
        });
    }
  }, [mapsApiKey]);

  // Measure container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch GeoJSON for 3D Globe boundaries
  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((res) => {
        if (!res.ok) throw new Error('geo');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCountriesGeo(data.features || []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate 3D Globe Camera on Country Change (only active in 3D mode)
  useEffect(() => {
    if (viewMode === '3d' && globeRef.current) {
      const timer = setTimeout(() => {
        try {
          globeRef.current?.pointOfView?.(
            {
              lat: currentCountry.lat,
              lng: currentCountry.lng,
              altitude: 1.8,
            },
            700
          );
        } catch {
          // ignore transient animation race conditions
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentCountry.lat, currentCountry.lng, viewMode]);

  // Fetch Google Trends from backend with Search Grounding
  const fetchGoogleTrends = async (termToSearch: string, countryName: string) => {
    setLoadingTrends(true);
    try {
      const res = await fetch('/api/ai/google-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: termToSearch,
          country: countryName,
          region: currentRegion?.name,
          brandName: brand.name,
          industry: brand.industry,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTrendsData(json.data);
      }
    } catch (err) {
      console.error('Failed to load Google Trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchGoogleTrends(searchQuery.trim(), currentCountry.name);
  };

  const handleSelectCountry = (country: GoogleTrendCountry) => {
    setActiveCountryCode(country.code);
    setActiveRegionCode(country.regions[0]?.code || '');
  };

  const handleSelectRegion = (region: GoogleTrendRegion) => {
    setActiveRegionCode(region.code);
  };

  // Convert Google Trends breakout query to Campaign format
  const handleCreateCampaignFromTrend = (breakoutTerm: string) => {
    if (onSelectTrendForCampaign) {
      onSelectTrendForCampaign({
        name: breakoutTerm,
        growthRate: currentRegion?.growthRate || currentCountry.growthRate,
        sentiment: currentCountry.sentiment,
        category: 'Google Trends (Busca em Ascensão)',
        description: `Tendência identificada no Google Trends com alto volume de busca em ${currentRegion?.name || currentCountry.name}. Intenção comercial verificada.`,
        predictedImpact: 'Muito Alto',
        recommendedAction: `Veicular anúncios focados nas palavras-chave "${breakoutTerm}" nas regiões com maior Opportunity Score (${currentRegion?.name || 'SP, RJ'}).`,
        relevantKeywords: [breakoutTerm, currentCountry.name, 'Google Search', 'Alta Demanda'],
      });
    } else {
      onFocusTopic(breakoutTerm);
    }
  };

  // 3D Globe Polygon Styling
  const capColor = useMemo(() => {
    return (feature: any) => {
      const iso = feature.properties?.ISO_A2;
      if (iso === activeCountryCode) {
        return 'rgba(239, 68, 68, 0.45)'; // Active country highlighted
      }
      return 'rgba(56, 189, 248, 0.16)';
    };
  }, [activeCountryCode]);

  return (
    <section className="space-y-4">
      {/* Header with Google Trends & Earth Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <GlobeIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Google Trends & Google Earth
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                Pesquisa em Tempo Real
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Acompanhe o volume de buscas no Google por países e regiões. Alterne entre o Globo 3D e o Mapa 2D de Satélite.
          </p>
        </div>

        {/* Live Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar termo no Google Trends..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loadingTrends}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTrends ? 'animate-spin' : ''}`} />
            <span>{loadingTrends ? 'Buscando...' : 'Atualizar Trends'}</span>
          </button>
        </form>
      </div>

      {/* Main Interactive Map & Globe Container */}
      <div className="relative rounded-2xl border border-slate-800 bg-[#08090a] overflow-hidden shadow-2xl">
        {/* Floating Top Control Toolbar */}
        <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Country Selector Pills */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md overflow-x-auto shadow-lg">
            {trendsData.countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelectCountry(country)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeCountryCode === country.code
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{country.code === 'BR' ? '🇧🇷' : country.code === 'US' ? '🇺🇸' : country.code === 'UK' ? '🇬🇧' : country.code === 'DE' ? '🇩🇪' : country.code === 'JP' ? '🇯🇵' : '🌐'}</span>
                <span>{country.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({country.searchVolumeIndex})</span>
              </button>
            ))}
          </div>

          {/* Dedicated View Mode Toggle: Globo 3D vs Mapa 2D */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-900/95 border border-slate-800 rounded-xl backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GlobeIcon className="w-3.5 h-3.5" />
              <span>Globo 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === '2d'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Mapa 2D</span>
            </button>
          </div>
        </div>

        {/* Dynamic Canvas Area: Explicitly Swapped between 3D Earth Globe and 2D Google Earth Map */}
        <div ref={wrapRef} className="relative h-[560px] w-full">
          {/* VIEW 1: Photorealistic 3D Google Earth Globe */}
          <div
            className="absolute inset-0"
            style={{ display: viewMode === '3d' ? 'block' : 'none' }}
          >
            {!loadError && (
              <GlobeErrorBoundary
                fallback={
                  <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                    <div
                      className="w-96 h-96 rounded-full shadow-2xl border-2 border-sky-400/30 bg-cover bg-center animate-pulse"
                      style={{
                        backgroundImage: `url(${EARTH_URL})`,
                        boxShadow: '0 0 60px rgba(56, 189, 248, 0.35), inset 0 0 40px rgba(0,0,0,0.8)',
                      }}
                    />
                    <div className="absolute bottom-6 text-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-300 font-medium">
                        Google Earth 3D ativo · Clique em <span className="text-emerald-400 font-bold">Mapa 2D</span> para navegar pelas regiões
                      </p>
                    </div>
                  </div>
                }
              >
                <Globe
                  ref={globeRef}
                  width={width}
                  height={560}
                  backgroundColor="rgba(0,0,0,0)"
                  globeImageUrl={EARTH_URL}
                  atmosphereColor="#38bdf8"
                  atmosphereAltitude={0.22}
                  polygonsData={countriesGeo}
                  polygonAltitude={0.012}
                  polygonCapColor={capColor}
                  polygonSideColor={() => 'rgba(15, 23, 42, 0.5)'}
                  polygonStrokeColor={() => 'rgba(255, 255, 255, 0.3)'}
                  polygonsTransitionDuration={300}
                  polygonLabel={(d: any) => `${d.properties?.NAME || 'País'}`}
                  onPolygonClick={(feature: any) => {
                    const iso = feature?.properties?.ISO_A2;
                    const match = trendsData.countries.find((c) => c.code === iso);
                    if (match) {
                      handleSelectCountry(match);
                    }
                  }}
                />
              </GlobeErrorBoundary>
            )}

            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Não foi possível carregar o mapa poligonal. Alternando para visão direta de tendências.
              </div>
            )}
          </div>

          {/* VIEW 2: 2D Google Earth Satellite Map (Full interactive click-drag and mouse wheel zoom) */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{ display: viewMode === '2d' ? 'block' : 'none' }}
          >
            {mapsApiKey && !mapsError ? (
              <APIProvider
                apiKey={mapsApiKey}
                {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
                onError={() => setMapsError(true)}
              >
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={6}
                  mapTypeId="satellite"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  zoomControl={true}
                  className="w-full h-full"
                >
                  {/* Camera controller smoothly centers on country or region upon selection */}
                  <MapCameraController center={mapCenter} />

                  {/* Google Trends Regional Pins in 2D Satellite View */}
                  {currentCountry.regions.map((reg) => (
                    <Marker
                      key={reg.code}
                      position={{ lat: reg.lat, lng: reg.lng }}
                      title={`${reg.name} - Volume Google: ${reg.searchVolumeIndex}`}
                      onClick={() => setActiveRegionCode(reg.code)}
                    />
                  ))}
                </Map>
              </APIProvider>
            ) : (
              /* High-Resolution Satellite Composite Fallback (Handles API quota / setup effortlessly) */
              <div className="relative w-full h-full bg-[#0a1118] overflow-hidden flex flex-col items-center justify-center p-6">
                <div
                  className="absolute inset-0 opacity-40 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${EARTH_URL})`,
                    filter: 'contrast(120%) brightness(85%)',
                  }}
                />
                <div className="relative z-10 max-w-md bg-slate-900/90 border border-slate-700 p-5 rounded-2xl backdrop-blur-md shadow-2xl text-center">
                  <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 inline-block mb-3">
                    <MapIcon className="w-6 h-6" />
                  </span>
                  <h3 className="text-base font-bold text-white mb-1">
                    Visualização 2D Satélite Google Earth: {currentCountry.name}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">
                    Região Ativa: <span className="text-emerald-400 font-semibold">{currentRegion?.name}</span> (Coordenadas: {currentRegion?.lat.toFixed(2)}, {currentRegion?.lng.toFixed(2)}).
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-left text-xs mb-4">
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Volume Google</span>
                      <span className="text-lg font-bold text-emerald-400">{currentRegion?.searchVolumeIndex} / 100</span>
                    </div>
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Opportunity Score</span>
                      <span className="text-lg font-bold text-indigo-400">{currentRegion?.opportunityScore} pts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('3d')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700"
                    >
                      Voltar ao Globo 3D
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regional Selection Floating Badge - Positioned on bottom-left to leave bottom-right zoom controls completely unobstructed */}
          {currentRegion && (
            <div className="absolute bottom-8 left-4 z-20 max-w-xs bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3.5 rounded-2xl shadow-xl pointer-events-none">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {currentCountry.name}
                  </span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {currentRegion.name}
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentRegion.isBreakout
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {currentRegion.isBreakout ? 'Breakout +140%' : currentRegion.growthRate}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                Consulta em alta: <span className="text-amber-300 font-medium">"{currentRegion.topRisingQuery}"</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Regions / States Filter Grid for Selected Country */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Regiões e Estados de {currentCountry.name} no Google Trends
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Clique na região para centralizar o mapa e visualizar oportunidades
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentCountry.regions.map((reg) => {
            const isSelected = activeRegionCode === reg.code;
            return (
              <button
                key={reg.code}
                type="button"
                onClick={() => handleSelectRegion(reg)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all border ${
                  isSelected
                    ? 'bg-emerald-600/20 border-emerald-500 text-white font-semibold shadow-md'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                <span>{reg.name}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-emerald-400">
                  {reg.searchVolumeIndex} vol
                </span>
                {reg.isBreakout && (
                  <span className="text-[9px] font-bold px-1 rounded bg-red-500/30 text-red-300">
                    Spike
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Google Trends Intelligence Cards: Breakout Queries, Related Topics & Marketing Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Breakout Queries in Google Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-red-400">
              <Flame className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Consultas em Ascensão Meteórica (Breakout)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Termos pesquisados no Google com crescimento superior a +150% nos últimos 90 dias
            </p>

            <div className="space-y-2.5">
              {trendsData.breakoutQueries.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-xl hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      "{item.term}"
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
                      {item.growth}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300">
                      Intenção {item.searchIntent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateCampaignFromTrend(item.term)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <span>Usar em Anúncio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Related Topics & Interest Over Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Tópicos Relacionados & Tendência Temporal
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Assuntos mais conectados à pesquisa e volume semanal de buscas
            </p>

            {/* Interest Over Time Bars */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 mb-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">
                Histórico de Volume de Busca (Últimas 12 Semanas)
              </span>
              <div className="flex items-end justify-between gap-1 h-16 pt-2">
                {trendsData.interestOverTime.map((pt, pidx) => (
                  <div key={pidx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className="w-full bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                      style={{ height: `${Math.max(12, (pt.volume / 100) * 52)}px` }}
                      title={`${pt.period}: ${pt.volume}/100`}
                    />
                    <span className="text-[8px] text-slate-500">{pidx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Topics List */}
            <div className="space-y-1.5">
              {trendsData.relatedTopics.map((top, tidx) => (
                <div
                  key={tidx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 text-xs"
                >
                  <span className="text-slate-200">{top.title}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{top.relevanceScore}% rel</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Strategic Marketing & ROI Takeaway */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Diretriz Estratégica de Marketing & ROI
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Como capitalizar em tempo real sobre esta tendência de busca
            </p>

            <div className="p-4 bg-gradient-to-br from-slate-800/90 to-indigo-950/40 border border-slate-700 rounded-xl mb-4">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {trendsData.marketingTakeaway}
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Geolocalização prioritária: {currentRegion?.name || 'São Paulo'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Score de Oportunidade: {currentRegion?.opportunityScore || 95}/100</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleCreateCampaignFromTrend(searchQuery)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gerar Campanha com Dados do Google Trends</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
