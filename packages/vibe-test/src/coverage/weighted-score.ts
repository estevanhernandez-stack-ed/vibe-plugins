/**
 * Pure function: the locked weighted-score formula.
 *
 *   TierScore = Σ (level_coverage% × level_weight × level_applicable)
 *               / Σ (level_weight × level_applicable)
 *
 * Weights:
 *   smoke        1.0
 *   behavioral   1.0
 *   edge         0.8
 *   integration  0.8
 *   performance  0.5
 *
 * Tier thresholds (pass if score ≥ threshold):
 *   prototype             30
 *   internal              55
 *   public-facing         70
 *   customer-facing-saas  80
 *   regulated             90
 *
 * The function is pure + framework-agnostic — the gate SKILL + coverage SKILL
 * both consume it.
 */

import type { Tier, TestLevel } from '../state/project-state.js';

export const LEVEL_WEIGHTS: Record<TestLevel, number> = {
  smoke: 1.0,
  behavioral: 1.0,
  edge: 0.8,
  integration: 0.8,
  performance: 0.5,
};

export const TIER_THRESHOLDS: Record<Tier, number> = {
  prototype: 30,
  internal: 55,
  'public-facing': 70,
  'customer-facing-saas': 80,
  regulated: 90,
};

export type PerLevelCoverage = Record<TestLevel, number>;
export type PerLevelApplicability = Record<TestLevel, boolean>;

export interface WeightedScoreInput {
  perLevel: PerLevelCoverage;
  applicability: PerLevelApplicability;
  tier: Tier;
}

export interface WeightedScoreResult {
  score: number;
  threshold: number;
  passes: boolean;
  /** Contribution breakdown per level, for explainability. */
  contributions: Record<TestLevel, { weight: number; applicable: boolean; contribution: number }>;
}

export function computeWeightedScore(input: WeightedScoreInput): WeightedScoreResult {
  const levels = Object.keys(LEVEL_WEIGHTS) as TestLevel[];
  let numerator = 0;
  let denominator = 0;
  const contributions = {} as WeightedScoreResult['contributions'];

  for (const level of levels) {
    const weight = LEVEL_WEIGHTS[level];
    const applicable = input.applicability[level];
    const coverage = input.perLevel[level] ?? 0;
    const app = applicable ? 1 : 0;
    const contribution = coverage * weight * app;
    numerator += contribution;
    denominator += weight * app;
    contributions[level] = {
      weight,
      applicable: applicable === true,
      contribution,
    };
  }

  const score = denominator === 0 ? 0 : numerator / denominator;
  const threshold = TIER_THRESHOLDS[input.tier];
  return {
    score,
    threshold,
    passes: score >= threshold,
    contributions,
  };
}

/** Convenience — returns just the score for call sites that don't need the breakdown. */
export function weightedScore(input: WeightedScoreInput): number {
  return computeWeightedScore(input).score;
}
