import { afterEach, describe, expect, it, vi } from "vitest";
import { FirecrawlRequestError, searchFirecrawlTrends } from "./firecrawl-trends.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("searchFirecrawlTrends", () => {
  it("uses the server key and derives recurring topics from recent search sources", async () => {
    vi.stubEnv("API_KEY", "test-firecrawl-key");
    let requestOptions: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestOptions = init;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            news: [
              {
                title: "Compras sustentáveis ganham espaço no varejo",
                description: "Marcas ampliam iniciativas de compras sustentáveis.",
                url: "https://news.example.com/sustainable-retail",
                publishedDate: "2026-11-10",
              },
            ],
            web: [
              {
                title: "Compras sustentáveis transformam o varejo",
                description: "O varejo acompanha a procura por compras sustentáveis.",
                url: "https://example.com/retail-trends",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchFirecrawlTrends("varejo Brasil");
    const requestBody = JSON.parse(String(requestOptions?.body));
    const sustainabilityTrend = result.data.macroTrends.find((trend) =>
      trend.name.toLowerCase().includes("sustentáveis"),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new Headers(requestOptions?.headers).get("Authorization")).toBe(
      "Bearer test-firecrawl-key",
    );
    expect(requestBody.sources).toEqual(["news", "web"]);
    expect(requestBody.tbs).toBe("sbd:1,qdr:w");
    expect(result.sources).toHaveLength(2);
    expect(sustainabilityTrend?.growthRate).toBe("2 fontes recentes");
    expect(result.data.summary).toContain("2 fontes recentes");
  });

  it("does not call Firecrawl when the server key is absent", async () => {
    vi.stubEnv("API_KEY", "");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchFirecrawlTrends("varejo")).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns Firecrawl rate-limit responses into a safe application error", async () => {
    vi.stubEnv("API_KEY", "test-firecrawl-key");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchFirecrawlTrends("varejo")).rejects.toBeInstanceOf(FirecrawlRequestError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
