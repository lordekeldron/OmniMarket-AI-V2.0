import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCopyMetrics,
  predictVariationPerformance,
  runABTestingPrediction,
  HistoricalBenchmark,
  AdVariationInput,
} from '../abTestingEngine';

const mockBenchmark: HistoricalBenchmark = {
  baselineCTR: 3.2,
  baselineConvRate: 2.5,
  avgOrderValue: 200,
  avgCPC: 1.20,
  topPerformingHooks: ['Você já reparou?', 'O segredo que ninguém conta'],
  fatiguedAngles: ['Compre já', 'Promoção imperdível'],
};

test('analyzeCopyMetrics scores higher on question hooks and power words', () => {
  const strongVariation: AdVariationInput = {
    id: 'var_a',
    name: 'Variante A (Hook Curioso)',
    headline: 'Você já reparou como a elegância real parece natural?',
    bodyCopy: 'Descubra a fórmula exclusiva que garante resultados comprovados com desconto especial hoje.',
    ctaText: 'Garantir com Desconto Exclusivo',
    visualType: 'video_ugc',
    emotionalAngle: 'curiosity_hook',
  };

  const weakVariation: AdVariationInput = {
    id: 'var_b',
    name: 'Variante B (Tradicional)',
    headline: 'Esta é uma camisa de linho muito bonita para você comprar agora mesmo na nossa loja online oficial.',
    bodyCopy: 'Clique aqui e compre já a melhor camisa com promoção imperdível.',
    ctaText: 'Compre Já',
    visualType: 'static_minimal',
    emotionalAngle: 'rational_savings',
  };

  const scoreA = analyzeCopyMetrics(strongVariation, 'Instagram Reels', 'Público A/B');
  const scoreB = analyzeCopyMetrics(weakVariation, 'Instagram Reels', 'Público A/B');

  assert.ok(scoreA.hookStrength > scoreB.hookStrength, 'Strong variation should have higher hook strength');
  assert.ok(scoreA.positiveDrivers.length > 0, 'Should have identified positive drivers');
  assert.ok(scoreB.riskFactors.length > 0, 'Weak variation should trigger ad fatigue risk factors');
});

test('predictVariationPerformance produces realistic cohort simulation', () => {
  const variation: AdVariationInput = {
    id: 'var_test',
    name: 'Variante Teste',
    headline: 'Como economizar tempo na sua rotina com resultado garantido?',
    bodyCopy: 'A solução exclusiva e comprovada para quem busca alta performance.',
    ctaText: 'Experimentar Agora',
    visualType: 'video_ugc',
    emotionalAngle: 'social_proof',
  };

  const pred = predictVariationPerformance(variation, mockBenchmark, 'TikTok Spark Ads', 'Jovens Urbanos', 10000);

  assert.equal(pred.simulatedCohort.impressions, 10000);
  assert.ok(pred.predictedCTR > 0, 'CTR must be positive');
  assert.ok(pred.simulatedCohort.clicks > 0, 'Clicks must be positive');
  assert.ok(pred.predictedROAS > 0, 'ROAS must be positive');
  assert.ok(pred.overallScore >= 15 && pred.overallScore <= 100, 'Score in bounds');
});

test('runABTestingPrediction correctly identifies winner and computes confidence', () => {
  const varA: AdVariationInput = {
    id: 'var_a',
    name: 'Variante A (UGC + Gancho Curioso)',
    headline: 'Por que todo mundo está trocando suas roupas antigas por linho puro?',
    bodyCopy: 'Descubra como peças sustentáveis duram 5x mais com caimento perfeito garantido.',
    ctaText: 'Garantir com Frete Grátis',
    visualType: 'video_ugc',
    emotionalAngle: 'curiosity_hook',
  };

  const varB: AdVariationInput = {
    id: 'var_b',
    name: 'Variante B (Estática Tradicional)',
    headline: 'Camisa de linho sustentável em oferta especial na loja.',
    bodyCopy: 'Compre nossa linha de produtos novos disponíveis no catálogo.',
    ctaText: 'Comprar',
    visualType: 'static_minimal',
    emotionalAngle: 'rational_savings',
  };

  const result = runABTestingPrediction([varA, varB], mockBenchmark, 'Instagram Reels', 'Consumidores 25-45');

  assert.equal(result.winnerId, 'var_a', 'Variant A should win due to better hook and format alignment');
  assert.ok(result.conversionUpliftPct > 0, 'Winner should have positive conversion uplift');
  assert.ok(result.confidenceLevel >= 70, 'Confidence level should be calculated');
  assert.ok(result.summaryRationale.includes('Variante A'), 'Summary should mention winner');
  assert.equal(result.predictions.length, 2);
});
