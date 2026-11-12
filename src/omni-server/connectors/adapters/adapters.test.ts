// @vitest-environment node
import { describe, expect, test } from "vitest";
import { ADAPTERS } from ".";
import { lastDays } from "./common";
import { connectFake, type FakeTool } from "../testing/fake";
import type { ProviderId } from "../../../omni/types/connectors";

const now = new Date("2026-11-11T15:00:00Z");

async function run(provider: ProviderId, tools: FakeTool[]) {
  const opened = await connectFake(tools, provider);
  try {
    return await ADAPTERS[provider]({ client: opened.client, period: lastDays(now, 30), now });
  } finally {
    await opened.close();
  }
}

describe("contas reais, hoje vazias (respostas observadas)", () => {
  test("Supermetrics sem nenhuma fonte ligada", async () => {
    // Trecho real de data_source_discovery (compress) devolvido pela conta.
    const compact = `sources[3]:
  - id: AA
    name: Amazon Ads
    description: A platform for advertising on Amazon's websites and mobile apps.
    categories[1]: Paid media
    authentication_status: NOT_AUTHENTICATED
  - id: AW
    name: Google Ads
    description: "A platform for advertising on Google search, websites, and apps."
    categories[2]: Paid media,Search
    authentication_status: NOT_AUTHENTICATED
    data_out: true
  - id: APPD
    name: Apple Public Data
    categories[2]: Brand Reputation,Mobile
    authentication_status: NOT_REQUIRED
notes[1]: Call data_source_discovery(ds_id=X) for detailed config.`;
    const out = await run("supermetrics", [
      { name: "data_source_discovery", handler: () => JSON.stringify({ success: true, data: compact, metadata: { tool_version: "1.27.41" } }) },
    ]);

    expect(out.groups).toEqual([]);
    expect(out.notices).toHaveLength(1);
    expect(out.notices[0]?.text).toMatch(/Nenhuma fonte de dados está ligada/);
    expect(out.notices[0]?.action?.url).toBe("https://hub.supermetrics.com");
  });

  test("Metricool com marca sem redes conectadas", async () => {
    const out = await run("metricool", [
      {
        name: "getBrandSettings",
        handler: () => ({
          isError: true,
          text: "This brand doesn't have any social network connected yet. Ask the user to connect at least one network before continuing here: https://app.metricool.com/brands/connections?blogId=8011798",
        }),
      },
    ]);
    expect(out.groups).toEqual([]);
    expect(out.notices[0]?.text).toMatch(/nenhuma rede social conectada/);
    expect(out.notices[0]?.action?.url).toBe("https://app.metricool.com/brands/connections?blogId=8011798");
  });

  test("OpenSEO sem projetos, mostrando os créditos", async () => {
    const out = await run("openseo", [
      {
        name: "list_projects",
        handler: () => "Projects (0):\nNo projects yet. Ask the user for their website, then call create_project with its domain. Creating a project uses no credits.",
      },
      { name: "whoami", handler: () => "Account: a@b.c\nMode: hosted\nScopes: offline_access, mcp\nCredits remaining: 500" },
    ]);
    expect(out.groups).toEqual([]);
    expect(out.notices.map((n) => n.text)).toEqual([
      expect.stringMatching(/ainda não tem projetos/),
      expect.stringMatching(/Créditos restantes no OpenSEO: 500/),
    ]);
  });

  test("OpenSEO nunca chama ferramentas que gastam créditos", async () => {
    const called: string[] = [];
    const tool = (name: string, text: string): FakeTool => ({
      name,
      handler: () => {
        called.push(name);
        return text;
      },
    });
    await run("openseo", [
      tool("list_projects", JSON.stringify([{ id: "p1", name: "Site", domain: "x.com" }])),
      tool("whoami", "Credits remaining: 10"),
      tool("get_search_console_performance", JSON.stringify({ rows: [] })),
      tool("list_site_audits", "[]"),
      tool("get_domain_overview", "{}"),
      tool("get_ranked_keywords", "{}"),
      tool("get_backlinks_overview", "{}"),
      tool("run_site_audit", "{}"),
    ]);
    const paid = ["get_domain_overview", "get_ranked_keywords", "get_backlinks_overview", "run_site_audit"];
    expect(called.filter((n) => paid.includes(n))).toEqual([]);
    expect(called).toContain("get_search_console_performance");
  });
});

describe("falhas parciais não derrubam a sincronização", () => {
  test("OpenSEO: Search Console desconectado vira aviso no grupo", async () => {
    const out = await run("openseo", [
      { name: "list_projects", handler: () => JSON.stringify([{ id: "p1", name: "Site", domain: "x.com" }]) },
      { name: "whoami", handler: () => "Credits remaining: 10" },
      { name: "get_search_console_performance", handler: () => ({ isError: true, text: "No Search Console property connected to this project." }) },
      { name: "list_site_audits", handler: () => "[]" },
    ]);
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0]?.kpis).toEqual([]);
    expect(out.groups[0]?.notices[0]?.text).toMatch(/Search Console indisponível/);
  });
});

describe("com dados (formatos ASSUMIDOS: ainda não observados em conta real)", () => {
  test("Supermetrics soma investimento, cliques e impressões e calcula CTR, CPC e CPA", async () => {
    const compactSources = `sources[1]:
  - id: AW
    name: Google Ads
    categories[2]: Paid media,Search
    authentication_status: AUTHENTICATED`;
    const out = await run("supermetrics", [
      { name: "data_source_discovery", handler: () => JSON.stringify({ success: true, data: compactSources }) },
      { name: "accounts_discovery", handler: () => `accounts[1]:\n  - account_id: 123\n    account_name: Loja` },
      {
        name: "field_discovery",
        handler: () => `fields[5]{field_id,name,type}:\n  date,Date,dimension\n  impressions,Impressions,metric\n  clicks,Clicks,metric\n  cost,Cost,metric\n  conversions,Conversions,metric`,
      },
      {
        name: "data_query",
        handler: () =>
          JSON.stringify({
            status: "completed",
            data: [
              { date: "2026-11-01", impressions: 1000, clicks: 50, cost: 100, conversions: 5 },
              { date: "2026-11-02", impressions: 1000, clicks: 50, cost: 100, conversions: 5 },
            ],
          }),
      },
    ]);

    const group = out.groups[0];
    expect(group?.label).toBe("Google Ads");
    const kpi = (id: string) => group?.kpis.find((k) => k.id === id)?.value;
    expect(kpi("spend")).toBe(200);
    expect(kpi("clicks")).toBe(100);
    expect(kpi("impressions")).toBe(2000);
    expect(kpi("ctr")).toBeCloseTo(0.05, 6);
    expect(kpi("cpc")).toBeCloseTo(2, 6);
    expect(kpi("cpa")).toBeCloseTo(20, 6);
    expect(group?.series.find((s) => s.id === "spend")?.points).toHaveLength(2);
  });
});
