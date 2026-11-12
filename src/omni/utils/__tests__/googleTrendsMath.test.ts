// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRegionalOpportunityScore,
  categorizeSearchIntent,
  generateDefaultGoogleTrendsData,
  SEED_COUNTRIES,
} from "../googleTrendsMath.ts";

test("calculateRegionalOpportunityScore combines volume and growth appropriately", () => {
  const highGrowthHighVolume = calculateRegionalOpportunityScore(100, "+142%");
  assert.ok(highGrowthHighVolume >= 95, `Expected score >= 95, got ${highGrowthHighVolume}`);

  const moderate = calculateRegionalOpportunityScore(70, "+60%");
  assert.ok(moderate >= 55 && moderate <= 75, `Expected score in 55-75 range, got ${moderate}`);
});

test("categorizeSearchIntent tags commercial and transactional intent", () => {
  assert.equal(categorizeSearchIntent("comprar tênis esportivo com cupom"), "Transacional");
  assert.equal(categorizeSearchIntent("melhor marca de tênis vs concorrente"), "Comercial");
  assert.equal(
    categorizeSearchIntent("como funciona tecnologia de amortecimento"),
    "Informacional",
  );
});

test("generateDefaultGoogleTrendsData generates comprehensive country and region structures", () => {
  const trendsData = generateDefaultGoogleTrendsData("Skincare Orgânico", "Brasil");
  assert.equal(trendsData.query, "Skincare Orgânico");
  assert.equal(trendsData.selectedCountry, "Brasil");
  assert.ok(trendsData.countries.length >= 3, "Should have multiple countries");

  const brazil = trendsData.countries.find((c) => c.code === "BR");
  assert.ok(brazil, "Brazil should be in the list");
  assert.ok(brazil.regions.length >= 5, "Brazil should have multiple sub-regions/states");

  const saoPaulo = brazil.regions.find((r) => r.code === "SP");
  assert.ok(saoPaulo, "São Paulo region should exist");
  assert.ok(saoPaulo.lat && saoPaulo.lng, "Regional coordinates must exist");
  assert.ok(saoPaulo.opportunityScore > 0, "Opportunity score should be computed");
});
