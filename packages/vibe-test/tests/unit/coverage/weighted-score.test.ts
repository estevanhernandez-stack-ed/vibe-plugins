import { describe, it, expect } from 'vitest';

import {
  computeWeightedScore,
  weightedScore,
  LEVEL_WEIGHTS,
  TIER_THRESHOLDS,
} from '../../../src/coverage/weighted-score.js';

describe('weighted-score', () => {
  const allApplicable = {
    smoke: true,
    behavioral: true,
    edge: true,
    integration: true,
    performance: true,
  };

  it('passes locked weight + threshold constants', () => {
    expect(LEVEL_WEIGHTS.smoke).toBe(1.0);
    expect(LEVEL_WEIGHTS.behavioral).toBe(1.0);
    expect(LEVEL_WEIGHTS.edge).toBe(0.8);
    expect(LEVEL_WEIGHTS.integration).toBe(0.8);
    expect(LEVEL_WEIGHTS.performance).toBe(0.5);
    expect(TIER_THRESHOLDS.prototype).toBe(30);
    expect(TIER_THRESHOLDS.internal).toBe(55);
    expect(TIER_THRESHOLDS['public-facing']).toBe(70);
    expect(TIER_THRESHOLDS['customer-facing-saas']).toBe(80);
    expect(TIER_THRESHOLDS.regulated).toBe(90);
  });

  it('computes a hand-checked score for prototype tier, smoke-only', () => {
    const result = computeWeightedScore({
      perLevel: { smoke: 60, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: { ...allApplicable, behavioral: false, edge: false, integration: false, performance: false },
      tier: 'prototype',
    });
    // Numerator: 60 * 1.0 * 1 = 60
    // Denominator: 1.0 * 1 = 1.0
    // Score = 60, passes 30.
    expect(result.score).toBe(60);
    expect(result.passes).toBe(true);
    expect(result.threshold).toBe(30);
  });

  it('computes a hand-checked score when every level applies at 100%', () => {
    const result = computeWeightedScore({
      perLevel: { smoke: 100, behavioral: 100, edge: 100, integration: 100, performance: 100 },
      applicability: allApplicable,
      tier: 'regulated',
    });
    // Numerator: 100*1 + 100*1 + 100*0.8 + 100*0.8 + 100*0.5 = 100+100+80+80+50 = 410
    // Denominator: 1 + 1 + 0.8 + 0.8 + 0.5 = 4.1
    // Score = 100, passes 90.
    expect(result.score).toBeCloseTo(100, 5);
    expect(result.passes).toBe(true);
  });

  it('computes a mixed score for a public-facing app', () => {
    const result = computeWeightedScore({
      perLevel: { smoke: 90, behavioral: 70, edge: 50, integration: 40, performance: 0 },
      applicability: { ...allApplicable, performance: false },
      tier: 'public-facing',
    });
    // Numerator: 90*1 + 70*1 + 50*0.8 + 40*0.8 + 0 = 90 + 70 + 40 + 32 = 232
    // Denominator: 1 + 1 + 0.8 + 0.8 = 3.6
    // Score = 232 / 3.6 ≈ 64.44
    expect(result.score).toBeCloseTo(232 / 3.6, 4);
    expect(result.passes).toBe(false);
    expect(result.threshold).toBe(70);
  });

  it('handles zero-denominator gracefully (no applicable levels)', () => {
    const result = computeWeightedScore({
      perLevel: { smoke: 0, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: { smoke: false, behavioral: false, edge: false, integration: false, performance: false },
      tier: 'internal',
    });
    expect(result.score).toBe(0);
    expect(result.passes).toBe(false);
  });

  it('exposes `weightedScore` convenience that matches the full result', () => {
    const input = {
      perLevel: { smoke: 80, behavioral: 60, edge: 40, integration: 30, performance: 10 },
      applicability: allApplicable,
      tier: 'internal' as const,
    };
    expect(weightedScore(input)).toBe(computeWeightedScore(input).score);
  });
});
