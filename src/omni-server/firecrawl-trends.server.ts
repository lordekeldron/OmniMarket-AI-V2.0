import type { MacroTrend, TrendData } from "../omni/types";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const RESULTS_PER_SOURCE = 6;
const MAX_SOURCES = RESULTS_PER_SOURCE * 2;

export type FirecrawlTrendSource = {
  title: string;
  description: string;
  url: string;
  sourceType: "news" | "web";
  publishedAt: string | null;
};

export class FirecrawlRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "FirecrawlRequestError";
  }
}

const stopWords = new Set([
  "ainda",
  "agora",
  "alguns",
  "algumas",
  "apenas",
  "assim",
  "cada",
  "como",
  "com",
  "contra",
  "depois",
  "desde",
  "durante",
  "entre",
  "essa",
  "essas",
  "esse",
  "esses",
  "esta",
  "estao",
  "está",
  "este",
  "estes",
  "mais",
  "mesmo",
  "muito",
  "muitas",
  "muitos",
  "nas",
  "nesta",
  "neste",
  "noticia",
  "noticias",
  "novo",
  "novos",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "porque",
  "quando",
  "sobre",
  "tambem",
  "tendencia",
  "tendencias",
  "todos",
  "todas",
  "uma",
  "umas",
  "uns",
  "hoje",
  "mercado",
  "brasil",
  "digital",
  "web",
  "news",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readResults(
  value: unknown,
  sourceType: FirecrawlTrendSource["sourceType"],
): FirecrawlTrendSource[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): FirecrawlTrendSource | null => {
      if (!isRecord(entry)) return null;

      const metadata = isRecord(entry.metadata) ? entry.metadata : {};
      const url = safeHttpUrl(asText(entry.url));
      if (!url) return null;

      const title = asText(entry.title) || asText(metadata.title) || "Resultado sem título";
      const description =
        asText(entry.description) || asText(metadata.description) || asText(entry.snippet);
      const publishedAt =
        asText(entry.publishedDate) ||
        asText(entry.publishedTime) ||
        asText(metadata.publishedTime) ||
        null;

      return { title, description, url, sourceType, publishedAt };
    })
    .filter((source): source is FirecrawlTrendSource => source !== null);
}

function categoryForTerm(term: string): string {
  const normalized = normalizeToken(term);

  if (/sustent|ambient|clima|reciclag/.test(normalized)) return "Sustentabilidade";
  if (/inteligencia|artificial|tecnolog|automacao|dados|software/.test(normalized)) {
    return "Tecnologia & IA";
  }
  if (/social|influenc|creator|criador|video|instagram|tiktok|reels/.test(normalized)) {
    return "Social & UGC";
  }
  if (/consum|compr|cliente|varejo|comerc|preco|pagamento|marca/.test(normalized)) {
    return "Comportamento";
  }

  return "Sinais da web";
}

function extractRecurringTopics(sources: FirecrawlTrendSource[], query: string): MacroTrend[] {
  const queryWords = new Set(query.match(/[\p{L}\p{N}]{3,}/gu)?.map(normalizeToken) ?? []);
  const topics = new Map<string, { label: string; sourceUrls: Set<string> }>();

  for (const source of sources) {
    const tokens = `${source.title} ${source.description}`.match(/[\p{L}\p{N}]{3,}/gu) ?? [];
    const validTokens = tokens.map((label) => ({ label, normalized: normalizeToken(label) }));
    const sourceTopics = new Set<string>();

    const addTopic = (label: string, normalized: string) => {
      if (
        normalized.length < 4 ||
        stopWords.has(normalized) ||
        queryWords.has(normalized) ||
        sourceTopics.has(normalized)
      ) {
        return;
      }

      sourceTopics.add(normalized);
      const current = topics.get(normalized) ?? { label, sourceUrls: new Set<string>() };
      current.sourceUrls.add(source.url);
      topics.set(normalized, current);
    };

    validTokens.forEach((token, index) => {
      addTopic(token.label, token.normalized);

      const nextToken = validTokens[index + 1];
      if (
        nextToken &&
        !stopWords.has(token.normalized) &&
        !stopWords.has(nextToken.normalized) &&
        !queryWords.has(token.normalized) &&
        !queryWords.has(nextToken.normalized)
      ) {
        addTopic(
          `${token.label} ${nextToken.label}`,
          `${token.normalized} ${nextToken.normalized}`,
        );
      }
    });
  }

  return [...topics.entries()]
    .filter(([, topic]) => topic.sourceUrls.size > 0)
    .sort(
      ([, left], [, right]) =>
        right.sourceUrls.size - left.sourceUrls.size ||
        left.label.localeCompare(right.label, "pt-BR"),
    )
    .slice(0, 6)
    .map(([normalized, topic]) => {
      const sourceCount = topic.sourceUrls.size;

      return {
        name: topic.label,
        growthRate: `${sourceCount} ${sourceCount === 1 ? "fonte recente" : "fontes recentes"}`,
        sentiment: "Neutro",
        category: categoryForTerm(normalized),
        description: `Menção encontrada em ${sourceCount} de ${sources.length} fontes da última semana.`,
        predictedImpact: "Sinal qualitativo, sem estimativa de volume de busca.",
        recommendedAction:
          "Leia as fontes e valide o interesse com dados próprios antes de ajustar campanhas.",
        relevantKeywords: topic.label.split(" "),
      };
    });
}

export async function searchFirecrawlTrends(
  query: string,
): Promise<{ data: TrendData; sources: FirecrawlTrendSource[] }> {
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    throw new FirecrawlRequestError(503, "A variável API_KEY não está configurada no servidor.");
  }

  const response = await fetch(FIRECRAWL_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: RESULTS_PER_SOURCE,
      sources: ["news", "web"],
      country: "BR",
      tbs: "sbd:1,qdr:w",
      safe: true,
      timeout: 30_000,
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (response.status === 401 || response.status === 403) {
    throw new FirecrawlRequestError(502, "O Firecrawl recusou a API_KEY configurada.");
  }
  if (response.status === 429) {
    throw new FirecrawlRequestError(
      429,
      "Limite de consultas do Firecrawl atingido. Tente novamente mais tarde.",
    );
  }
  if (!response.ok) {
    throw new FirecrawlRequestError(502, `O Firecrawl respondeu com erro HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FirecrawlRequestError(502, "O Firecrawl retornou uma resposta inválida.");
  }

  if (!isRecord(payload) || payload.success === false || !isRecord(payload.data)) {
    throw new FirecrawlRequestError(502, "Não foi possível interpretar a resposta do Firecrawl.");
  }

  const sources = [
    ...readResults(payload.data.news, "news"),
    ...readResults(payload.data.web, "web"),
  ]
    .filter(
      (source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index,
    )
    .slice(0, MAX_SOURCES);
  const macroTrends = extractRecurringTopics(sources, query);
  const summary = sources.length
    ? `O Firecrawl encontrou ${sources.length} fontes recentes para “${query}”. Os temas abaixo aparecem com maior recorrência em títulos e resumos dos resultados da última semana.`
    : `Nenhum resultado recente foi encontrado para “${query}”. Tente outro termo ou amplie o assunto da busca.`;

  return {
    data: {
      summary,
      macroTrends,
      viralHooks: [],
      roiOpportunity:
        "A frequência nos resultados web é um sinal editorial, não uma medida de crescimento ou volume de buscas.",
    },
    sources,
  };
}
