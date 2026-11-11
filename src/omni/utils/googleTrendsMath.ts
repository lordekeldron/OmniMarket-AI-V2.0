import { GoogleTrendCountry, GoogleTrendRegion, GoogleTrendSearchData } from '../types';

export const SEED_COUNTRIES: GoogleTrendCountry[] = [
  {
    name: 'Brasil',
    code: 'BR',
    searchVolumeIndex: 94,
    growthRate: '+128%',
    sentiment: 'Altamente Aquecido',
    lat: -14.235,
    lng: -51.9253,
    regions: [
      {
        name: 'São Paulo',
        code: 'SP',
        searchVolumeIndex: 100,
        growthRate: '+142%',
        isBreakout: true,
        topRisingQuery: 'melhor custo benefício 2026',
        lat: -23.5505,
        lng: -46.6333,
        opportunityScore: 98,
      },
      {
        name: 'Rio de Janeiro',
        code: 'RJ',
        searchVolumeIndex: 86,
        growthRate: '+115%',
        isBreakout: false,
        topRisingQuery: 'cupom desconto frete grátis',
        lat: -22.9068,
        lng: -43.1729,
        opportunityScore: 89,
      },
      {
        name: 'Minas Gerais',
        code: 'MG',
        searchVolumeIndex: 82,
        growthRate: '+98%',
        isBreakout: false,
        topRisingQuery: 'lançamento oficial avaliações',
        lat: -19.9167,
        lng: -43.9345,
        opportunityScore: 85,
      },
      {
        name: 'Rio Grande do Sul',
        code: 'RS',
        searchVolumeIndex: 78,
        growthRate: '+92%',
        isBreakout: false,
        topRisingQuery: 'marca confiável entrega rápida',
        lat: -30.0346,
        lng: -51.2177,
        opportunityScore: 81,
      },
      {
        name: 'Paraná',
        code: 'PR',
        searchVolumeIndex: 75,
        growthRate: '+88%',
        isBreakout: false,
        topRisingQuery: 'promoção parcelamento sem juros',
        lat: -25.4284,
        lng: -49.2733,
        opportunityScore: 79,
      },
      {
        name: 'Bahia',
        code: 'BA',
        searchVolumeIndex: 71,
        growthRate: '+110%',
        isBreakout: true,
        topRisingQuery: 'onde comprar original',
        lat: -12.9777,
        lng: -38.5016,
        opportunityScore: 83,
      },
      {
        name: 'Distrito Federal',
        code: 'DF',
        searchVolumeIndex: 88,
        growthRate: '+135%',
        isBreakout: true,
        topRisingQuery: 'premium atendimento imediato',
        lat: -15.7975,
        lng: -47.8919,
        opportunityScore: 91,
      },
      {
        name: 'Santa Catarina',
        code: 'SC',
        searchVolumeIndex: 74,
        growthRate: '+94%',
        isBreakout: false,
        topRisingQuery: 'sustentável e inovador',
        lat: -27.5954,
        lng: -48.548,
        opportunityScore: 80,
      },
      {
        name: 'Pernambuco',
        code: 'PE',
        searchVolumeIndex: 68,
        growthRate: '+85%',
        isBreakout: false,
        topRisingQuery: 'tendência tiktok viral',
        lat: -8.0476,
        lng: -34.877,
        opportunityScore: 76,
      },
    ],
  },
  {
    name: 'Estados Unidos',
    code: 'US',
    searchVolumeIndex: 88,
    growthRate: '+95%',
    sentiment: 'Forte Expansão',
    lat: 37.0902,
    lng: -95.7129,
    regions: [
      {
        name: 'California',
        code: 'CA',
        searchVolumeIndex: 96,
        growthRate: '+120%',
        isBreakout: true,
        topRisingQuery: 'ai smart workflows',
        lat: 36.7783,
        lng: -119.4179,
        opportunityScore: 95,
      },
      {
        name: 'New York',
        code: 'NY',
        searchVolumeIndex: 92,
        growthRate: '+105%',
        isBreakout: false,
        topRisingQuery: 'sustainable luxury drops',
        lat: 40.7128,
        lng: -74.006,
        opportunityScore: 92,
      },
      {
        name: 'Texas',
        code: 'TX',
        searchVolumeIndex: 87,
        growthRate: '+98%',
        isBreakout: false,
        topRisingQuery: 'direct to consumer best price',
        lat: 31.9686,
        lng: -99.9018,
        opportunityScore: 88,
      },
      {
        name: 'Florida',
        code: 'FL',
        searchVolumeIndex: 84,
        growthRate: '+90%',
        isBreakout: false,
        topRisingQuery: 'fast shipping holiday deals',
        lat: 27.6648,
        lng: -81.5158,
        opportunityScore: 84,
      },
      {
        name: 'Washington',
        code: 'WA',
        searchVolumeIndex: 82,
        growthRate: '+86%',
        isBreakout: false,
        topRisingQuery: 'eco conscious packaging',
        lat: 47.7511,
        lng: -120.7401,
        opportunityScore: 82,
      },
    ],
  },
  {
    name: 'Reino Unido',
    code: 'UK',
    searchVolumeIndex: 79,
    growthRate: '+76%',
    sentiment: 'Crescimento Consistente',
    lat: 55.3781,
    lng: -3.436,
    regions: [
      {
        name: 'Greater London',
        code: 'LDN',
        searchVolumeIndex: 88,
        growthRate: '+88%',
        isBreakout: true,
        topRisingQuery: 'ethical consumer brands',
        lat: 51.5074,
        lng: -0.1278,
        opportunityScore: 90,
      },
      {
        name: 'North West (Manchester)',
        code: 'MAN',
        searchVolumeIndex: 72,
        growthRate: '+68%',
        isBreakout: false,
        topRisingQuery: 'verified reviews online',
        lat: 53.4808,
        lng: -2.2426,
        opportunityScore: 75,
      },
    ],
  },
  {
    name: 'Alemanha',
    code: 'DE',
    searchVolumeIndex: 73,
    growthRate: '+64%',
    sentiment: 'Estável e Maduro',
    lat: 51.1657,
    lng: 10.4515,
    regions: [
      {
        name: 'Bavaria (Munique)',
        code: 'BY',
        searchVolumeIndex: 80,
        growthRate: '+72%',
        isBreakout: false,
        topRisingQuery: 'nachhaltige qualität',
        lat: 48.7904,
        lng: 11.4979,
        opportunityScore: 82,
      },
      {
        name: 'Berlim',
        code: 'BE',
        searchVolumeIndex: 85,
        growthRate: '+81%',
        isBreakout: true,
        topRisingQuery: 'tech lifestyle trends',
        lat: 52.52,
        lng: 13.405,
        opportunityScore: 86,
      },
    ],
  },
  {
    name: 'Japão',
    code: 'JP',
    searchVolumeIndex: 81,
    growthRate: '+90%',
    sentiment: 'Forte Adoção Tecnológica',
    lat: 36.2048,
    lng: 138.2529,
    regions: [
      {
        name: 'Tóquio',
        code: 'TYO',
        searchVolumeIndex: 94,
        growthRate: '+112%',
        isBreakout: true,
        topRisingQuery: 'スマートライフスタイル',
        lat: 35.6762,
        lng: 139.6503,
        opportunityScore: 94,
      },
      {
        name: 'Osaka',
        code: 'OSA',
        searchVolumeIndex: 82,
        growthRate: '+84%',
        isBreakout: false,
        topRisingQuery: 'お得なトレンド',
        lat: 34.6937,
        lng: 135.5023,
        opportunityScore: 83,
      },
    ],
  },
];

/**
 * Calculates Opportunity Score based on search index and growth rate
 */
export function calculateRegionalOpportunityScore(searchVolumeIndex: number, growthRateStr: string): number {
  const numericGrowth = parseInt(growthRateStr.replace(/[^0-9-]/g, ''), 10) || 50;
  // Score formula combining volume (60%) and momentum growth (40%)
  const score = Math.round(searchVolumeIndex * 0.6 + Math.min(numericGrowth, 150) * 0.4 * (100 / 150));
  return Math.min(100, Math.max(10, score));
}

/**
 * Normalizes Google Trends queries and tags intent
 */
export function categorizeSearchIntent(term: string): 'Transacional' | 'Informacional' | 'Comercial' | 'Navegacional' {
  const lower = term.toLowerCase();
  if (lower.includes('comprar') || lower.includes('preço') || lower.includes('cupom') || lower.includes('desconto') || lower.includes('promoção') || lower.includes('frete') || lower.includes('buy') || lower.includes('deals')) {
    return 'Transacional';
  }
  if (lower.includes('melhor') || lower.includes('vs') || lower.includes('avaliação') || lower.includes('review') || lower.includes('comparativo') || lower.includes('qual escolher')) {
    return 'Comercial';
  }
  if (lower.includes('como') || lower.includes('o que é') || lower.includes('guia') || lower.includes('significado') || lower.includes('tutoria')) {
    return 'Informacional';
  }
  return 'Comercial';
}

/**
 * Generates default trends data for a given brand and keyword
 */
export function generateDefaultGoogleTrendsData(query: string, countryName: string = 'Brasil'): GoogleTrendSearchData {
  const matchedCountry = SEED_COUNTRIES.find((c) => c.name.toLowerCase() === countryName.toLowerCase()) || SEED_COUNTRIES[0];

  return {
    query: query || 'Inteligência de Mercado',
    category: 'E-commerce & Tendências de Consumo',
    selectedCountry: matchedCountry.name,
    selectedRegion: matchedCountry.regions[0]?.name || 'Geral',
    timeRange: 'Últimos 90 dias (Tempo Real)',
    globalInterestIndex: matchedCountry.searchVolumeIndex,
    breakoutQueries: [
      {
        term: `${query} melhor preço 2026`,
        growth: '+350%',
        category: 'Busca Comercial',
        searchIntent: 'Transacional',
      },
      {
        term: `${query} vale a pena opiniões`,
        growth: '+280%',
        category: 'Pesquisa Comparativa',
        searchIntent: 'Comercial',
      },
      {
        term: `${query} cupom primeira compra`,
        growth: '+420% (Breakout)',
        category: 'Conversão Direta',
        searchIntent: 'Transacional',
      },
      {
        term: `marcas de ${query} sustentáveis e locais`,
        growth: '+190%',
        category: 'Comportamental',
        searchIntent: 'Informacional',
      },
      {
        term: `novidades e lançamentos ${query}`,
        growth: '+165%',
        category: 'Novidades',
        searchIntent: 'Navegacional',
      },
    ],
    relatedTopics: [
      { title: 'Personalização com IA', type: 'Tecnologia', relevanceScore: 94 },
      { title: 'Social Commerce & TikTok Shop', type: 'Canal', relevanceScore: 89 },
      { title: 'Entrega Expressa & Logística', type: 'Serviço', relevanceScore: 81 },
      { title: 'Consumo Consciente', type: 'Movimento', relevanceScore: 78 },
      { title: 'Fidelidade & Recompensa', type: 'Estratégia', relevanceScore: 75 },
    ],
    interestOverTime: [
      { period: 'Semana 1', volume: 62 },
      { period: 'Semana 2', volume: 68 },
      { period: 'Semana 3', volume: 74 },
      { period: 'Semana 4', volume: 71 },
      { period: 'Semana 5', volume: 79 },
      { period: 'Semana 6', volume: 85 },
      { period: 'Semana 7', volume: 82 },
      { period: 'Semana 8', volume: 91 },
      { period: 'Semana 9', volume: 88 },
      { period: 'Semana 10', volume: 94 },
      { period: 'Semana 11', volume: 97 },
      { period: 'Atual', volume: 100 },
    ],
    countries: SEED_COUNTRIES,
    marketingTakeaway: `Forte ascensão no volume de busca para "${query}" com destaque em ${matchedCountry.name} (${matchedCountry.regions[0]?.name}), indicando momento ideal para alocação de tráfego com palavras-chave de intenção comercial e ganchos de prova social.`,
  };
}
