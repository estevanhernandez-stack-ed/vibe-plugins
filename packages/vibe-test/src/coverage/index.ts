/**
 * Coverage public API.
 *
 * `runCoverage(command, adapter)` is the high-level entry point the coverage
 * SKILL calls. It orchestrates:
 *   1. framework adapter proposal (vitest or jest)
 *   2. adapter apply OR c8 fallback
 *   3. denominator-honesty check
 *   4. weighted-score application
 *
 * The full classify-and-report flow owns the adaptation-prompt UX — we return
 * a structured `Coverage` result which the SKILL renders.
 */

import { proposeVitestCoverageAll } from './vitest-adapter.js';
import { proposeJestCollectCoverageFrom } from './jest-adapter.js';
import { runC8, type C8Result } from './c8-fallback.js';
import { checkDenominator, type DenominatorCheckResult } from './denominator-check.js';
import { computeWeightedScore, type WeightedScoreInput, type WeightedScoreResult } from './weighted-score.js';
import type { AdapterProposal } from './vitest-adapter.js';

export { proposeVitestCoverageAll } from './vitest-adapter.js';
export { proposeJestCollectCoverageFrom } from './jest-adapter.js';
export { runC8, type C8Result } from './c8-fallback.js';
export { checkDenominator, type DenominatorCheckResult } from './denominator-check.js';
export {
  computeWeightedScore,
  weightedScore,
  LEVEL_WEIGHTS,
  TIER_THRESHOLDS,
  type WeightedScoreInput,
  type WeightedScoreResult,
  type PerLevelCoverage,
  type PerLevelApplicability,
} from './weighted-score.js';
export type { AdapterProposal } from './vitest-adapter.js';

export type SupportedFramework = 'vitest' | 'jest' | 'c8-standalone';

export interface CoverageCommandInput {
  /** Framework to run; if `auto`, caller should pre-detect and pass `'vitest' | 'jest' | 'c8-standalone'`. */
  framework: SupportedFramework;
  /** Project root. */
  cwd: string;
  /** Builder decision on the adaptation proposal. `null` = skip adaptation and go straight to c8. */
  adapterAccepted: boolean | null;
  /**
   * Actual source files found by the scanner — fed into denominator-check so
   * we can flag cherry-picking.
   */
  actualSourceFiles: string[];
  /** Test command to wrap with c8 when fallback is used. */
  c8TestCommand?: { command: string; args?: string[] };
  /** Optional shell override for tests. */
  shellOverride?: Parameters<typeof runC8>[0]['shellOverride'];
}

export interface Coverage {
  framework: SupportedFramework;
  adapter_proposal: AdapterProposal | null;
  adapter_accepted: boolean | null;
  c8_result: C8Result | null;
  denominator: DenominatorCheckResult;
  summary: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  } | null;
  /** Raw reported files from the coverage tool. */
  reported_files: string[];
  measured_at: string;
}

export async function runCoverage(input: CoverageCommandInput): Promise<Coverage> {
  let proposal: AdapterProposal | null = null;
  if (input.framework === 'vitest') {
    proposal = await proposeVitestCoverageAll(input.cwd);
  } else if (input.framework === 'jest') {
    proposal = await proposeJestCollectCoverageFrom(input.cwd);
  }

  let c8Result: C8Result | null = null;
  if (input.adapterAccepted !== true) {
    // Fall back to c8 when builder declined or framework is c8-standalone.
    if (input.c8TestCommand) {
      c8Result = await runC8({
        command: input.c8TestCommand.command,
        args: input.c8TestCommand.args,
        cwd: input.cwd,
        ...(input.shellOverride ? { shellOverride: input.shellOverride } : {}),
      });
    }
  }

  const reported = c8Result?.reported_files ?? [];
  const denominator = checkDenominator({
    reportedFiles: reported,
    actualSourceFiles: input.actualSourceFiles,
  });

  return {
    framework: input.framework,
    adapter_proposal: proposal,
    adapter_accepted: input.adapterAccepted,
    c8_result: c8Result,
    denominator,
    summary: c8Result?.summary ?? null,
    reported_files: reported,
    measured_at: new Date().toISOString(),
  };
}

/** Convenience — apply the locked weighted-score formula over a per-level coverage map. */
export function scoreFromCoverage(
  input: WeightedScoreInput,
): WeightedScoreResult {
  return computeWeightedScore(input);
}
