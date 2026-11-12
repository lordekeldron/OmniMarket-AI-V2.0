// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateROAS,
  calculateROI,
  calculateCPA,
  calculateCTR,
  scoreTrendVelocity,
  optimizeChannelAllocations,
  calculateCompetitiveGap,
  calculateDynamicBudgetScale,
  detectPerformanceSpikes,
  applyAutoScaleSpike,
  generateSyntheticSpike,
  DEFAULT_AUTOSCALE_SETTINGS,
} from "../marketingMath";

test("calculateROAS computes return on ad spend correctly", () => {
  assert.equal(calculateROAS(10000, 2000), 5.0);
  assert.equal(calculateROAS(4520, 1200), 3.77);
  assert.equal(calculateROAS(0, 500), 0);
  assert.equal(calculateROAS(500, 0), 0);
});

test("calculateROI calculates percentage return on investment", () => {
  assert.equal(calculateROI(15000, 10000), 50.0);
  assert.equal(calculateROI(8000, 10000), -20.0);
  assert.equal(calculateROI(0, 0), 0);
});

test("calculateCPA computes cost per acquisition", () => {
  assert.equal(calculateCPA(5000, 250), 20.0);
  assert.equal(calculateCPA(1000, 0), 0);
});

test("calculateCTR computes click-through rate percentage", () => {
  assert.equal(calculateCTR(150, 10000), 1.5);
  assert.equal(calculateCTR(0, 5000), 0);
  assert.equal(calculateCTR(50, 0), 0);
});

test("scoreTrendVelocity classifies momentum and normalizes scores", () => {
  const explosive = scoreTrendVelocity(120, "positive", 85000);
  assert.ok(explosive.velocityScore >= 80);
  assert.equal(explosive.classification, "Explosive");

  const volatile = scoreTrendVelocity(10, "critical", 5000);
  assert.ok(volatile.velocityScore < 55);
});

test("optimizeChannelAllocations reallocates budget favoring higher ROAS", () => {
  const sampleChannels = [
    {
      id: "ig",
      name: "Instagram",
      spend: 4000,
      revenue: 20000,
      clicks: 4000,
      impressions: 80000,
      conversions: 250,
    }, // ROAS 5.0
    {
      id: "google",
      name: "Google Ads",
      spend: 3000,
      revenue: 9000,
      clicks: 2000,
      impressions: 50000,
      conversions: 100,
    }, // ROAS 3.0
    {
      id: "tiktok",
      name: "TikTok",
      spend: 1000,
      revenue: 4500,
      clicks: 1500,
      impressions: 60000,
      conversions: 80,
    }, // ROAS 4.5
    {
      id: "linkedin",
      name: "LinkedIn",
      spend: 2000,
      revenue: 2200,
      clicks: 500,
      impressions: 15000,
      conversions: 15,
    }, // ROAS 1.1
  ];

  const result = optimizeChannelAllocations(sampleChannels, 10000);

  assert.equal(result.items.length, 4);
  assert.ok(result.overallPredictedROAS >= result.overallCurrentROAS);

  // Top ROAS channel (Instagram) should receive healthy budget
  const igResult = result.items.find((i) => i.channelId === "ig");
  assert.ok(igResult && igResult.recommendedSpend > 3000);

  // Lowest ROAS channel (LinkedIn) should have budget reduced
  const liResult = result.items.find((i) => i.channelId === "linkedin");
  assert.ok(liResult && liResult.recommendedSpend < 2000);
});

test("calculateCompetitiveGap correctly attributes parity or leader", () => {
  const weLead = calculateCompetitiveGap(1500, 1000);
  assert.equal(weLead.leading, "us");
  assert.equal(weLead.gapPercentage, 50.0);

  const competitorLeads = calculateCompetitiveGap(800, 1000);
  assert.equal(competitorLeads.leading, "competitor");
  assert.equal(competitorLeads.gapPercentage, 20.0);

  const parity = calculateCompetitiveGap(1005, 1000);
  assert.equal(parity.leading, "parity");
});

test("calculateDynamicBudgetScale scales dynamically according to aggressiveness and guardrails", () => {
  // Moderate (+30%)
  const modResult = calculateDynamicBudgetScale(
    200,
    { spikeType: "roas_surge", currentRoas: 4.8, deltaPct: 35 },
    { ...DEFAULT_AUTOSCALE_SETTINGS, aggressiveness: "moderate" },
  );
  assert.equal(modResult.suggestedDailyBudget, 260); // 200 * 1.30 = 260
  assert.equal(modResult.budgetDelta, 60);
  assert.equal(modResult.blockedByFloor, false);
  assert.equal(modResult.cappedByLimit, false);

  // Conservative (+15%)
  const consResult = calculateDynamicBudgetScale(
    200,
    { spikeType: "roas_surge", currentRoas: 4.8, deltaPct: 35 },
    { ...DEFAULT_AUTOSCALE_SETTINGS, aggressiveness: "conservative" },
  );
  assert.equal(consResult.suggestedDailyBudget, 230); // 200 * 1.15 = 230
  assert.equal(consResult.budgetDelta, 30);

  // Aggressive (+50%)
  const aggResult = calculateDynamicBudgetScale(
    200,
    { spikeType: "roas_surge", currentRoas: 4.8, deltaPct: 35 },
    { ...DEFAULT_AUTOSCALE_SETTINGS, aggressiveness: "aggressive" },
  );
  assert.equal(aggResult.suggestedDailyBudget, 300); // 200 * 1.50 = 300
  assert.equal(aggResult.budgetDelta, 100);

  // Guardrail 1: Max Spend Cap
  const cappedResult = calculateDynamicBudgetScale(
    2000,
    { spikeType: "roas_surge", currentRoas: 5.0, deltaPct: 40 },
    { ...DEFAULT_AUTOSCALE_SETTINGS, maxDailyCap: 2200 },
  );
  assert.equal(cappedResult.suggestedDailyBudget, 2200);
  assert.equal(cappedResult.cappedByLimit, true);

  // Guardrail 2: Min ROAS Floor blocks scale-up
  const blockedResult = calculateDynamicBudgetScale(
    500,
    { spikeType: "roas_surge", currentRoas: 1.8, deltaPct: 20 },
    { ...DEFAULT_AUTOSCALE_SETTINGS, minRoasFloor: 2.5 },
  );
  assert.equal(blockedResult.suggestedDailyBudget, 500);
  assert.equal(blockedResult.budgetDelta, 0);
  assert.equal(blockedResult.blockedByFloor, true);

  // Protective Throttle on Fatigue (-25%)
  const throttleResult = calculateDynamicBudgetScale(
    400,
    { spikeType: "cpa_spike_fatigue", currentRoas: 1.2, deltaPct: -45 },
    DEFAULT_AUTOSCALE_SETTINGS,
  );
  assert.equal(throttleResult.suggestedDailyBudget, 300); // 400 * 0.75 = 300
  assert.equal(throttleResult.budgetDelta, -100);
});

test("detectPerformanceSpikes and applyAutoScaleSpike work end-to-end", () => {
  const testChannels = [
    {
      id: "instagram",
      name: "Instagram",
      spend: 6000,
      revenue: 36000,
      clicks: 4200,
      impressions: 80000,
      conversions: 300,
      ctr: 5.25,
      cpa: 20,
      roas: 6.0,
    }, // High ROAS & High CTR
    {
      id: "linkedin",
      name: "LinkedIn",
      spend: 3000,
      revenue: 3300,
      clicks: 300,
      impressions: 25000,
      conversions: 10,
      ctr: 1.2,
      cpa: 300,
      roas: 1.1,
    }, // Low ROAS fatigue
  ];

  const spikes = detectPerformanceSpikes(testChannels);
  assert.ok(spikes.length >= 2);

  const roasSpike = spikes.find((s: any) => s.spikeType === "roas_surge");
  assert.ok(roasSpike);
  assert.equal(roasSpike.channelId, "instagram");
  assert.ok(roasSpike.suggestedDailyBudget > roasSpike.currentDailyBudget);

  // Apply spike to channels
  const updatedChannels = applyAutoScaleSpike(testChannels, roasSpike);
  const updatedIg = updatedChannels.find((c) => c.id === "instagram");
  assert.ok(updatedIg && updatedIg.spend === roasSpike.suggestedDailyBudget * 30);
  assert.ok(updatedIg && updatedIg.revenue > testChannels[0].revenue);

  // Test synthetic spike generation
  const synthetic = generateSyntheticSpike(testChannels, "viral");
  assert.equal(synthetic.spikeType, "viral_creative");
  assert.equal(synthetic.status, "pending");
  assert.ok(synthetic.confidenceScore > 90);
});
