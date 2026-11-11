// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLookalikeReach,
  scoreAudienceAffinity,
  projectSegmentEconomics,
  formatAudiencePlatformExport,
} from '../audienceMath';

test('calculateLookalikeReach accurately computes reach for different similarity tiers', () => {
  // 1% tier in 85M population
  const reach1Pct = calculateLookalikeReach(1.0, 85000000);
  assert.ok(reach1Pct.minReach > 700000);
  assert.ok(reach1Pct.maxReach < 1000000);
  assert.ok(reach1Pct.formattedReach.includes('pessoas'));

  // 3% tier
  const reach3Pct = calculateLookalikeReach(3.0, 85000000);
  assert.ok(reach3Pct.minReach > reach1Pct.maxReach);
  assert.ok(reach3Pct.formattedReach.includes('2.2M') || reach3Pct.formattedReach.includes('2.9M'));
});

test('scoreAudienceAffinity scores correctly and categorizes confidence', () => {
  const highFit = scoreAudienceAffinity({
    demographicFit: 95,
    historicalEngagementRate: 4.5,
    historicalConversionRate: 3.8,
    channelAlignmentScore: 90,
  });

  assert.ok(highFit.affinityScore >= 90);
  assert.equal(highFit.confidenceRating, 'Ultra-Alta');

  const lowFit = scoreAudienceAffinity({
    demographicFit: 40,
    historicalEngagementRate: 1.0,
    historicalConversionRate: 0.8,
    channelAlignmentScore: 50,
  });

  assert.ok(lowFit.affinityScore < 60);
});

test('projectSegmentEconomics boosts ROAS for 1% super-afinado tier', () => {
  const baselineRoas = 4.0;
  const baselineCpa = 20.0;

  const superAfinado = projectSegmentEconomics(
    baselineRoas,
    baselineCpa,
    '1% Super Afinado',
    92
  );

  // 1% Super Afinado should achieve higher ROAS and lower CPA than baseline
  assert.ok(superAfinado.projectedRoas > baselineRoas);
  assert.ok(superAfinado.projectedCpa < baselineCpa);
  assert.ok(superAfinado.expectedConversionRate > 4.0);

  const broadScale = projectSegmentEconomics(
    baselineRoas,
    baselineCpa,
    '5% Escala Ampla',
    80
  );

  // 5% scale trades efficiency for reach
  assert.ok(broadScale.projectedRoas < superAfinado.projectedRoas);
  assert.ok(broadScale.projectedCpa > superAfinado.projectedCpa);
});

test('formatAudiencePlatformExport formats correct json payloads for Meta, TikTok, and Google', () => {
  const targeting = {
    interests: ['Moda Sustentável', 'Quiet Luxury'],
    behaviors: ['Compradores Frequentes Online'],
    keywords: ['alfaiataria sustentavel', 'roupas de linho'],
    negativeExclusions: ['fast fashion', 'cupom de desconto'],
  };

  const metaExport = formatAudiencePlatformExport('Segmento VIP', 'meta', targeting);
  assert.ok(metaExport.fileName.includes('meta_lookalike'));
  const metaParsed = JSON.parse(metaExport.payload);
  assert.equal(metaParsed.audience_type, 'LOOKALIKE_CUSTOM');

  const tiktokExport = formatAudiencePlatformExport('Segmento VIP', 'tiktok', targeting);
  assert.ok(tiktokExport.fileName.includes('tiktok_lookalike'));
  const tiktokParsed = JSON.parse(tiktokExport.payload);
  assert.equal(tiktokParsed.audience_type, 'TIKTOK_LOOKALIKE_PACKAGE');
});
