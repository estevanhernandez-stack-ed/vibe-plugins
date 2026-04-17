/**
 * CI Check — tier-gated pass/fail pattern
 *
 * Every Vibe plugin's `check` command follows the same shape:
 * - Read project state
 * - Determine the applicable tier (based on classification + context)
 * - Walk the tier's required items
 * - Pass/fail with a structured result and an exit code suitable for CI
 *
 * Extraction status: STUB. Vibe Doc src/checker/ is the reference.
 * Phase 2 will generalize the pattern.
 */

export interface CheckResult {
  pass: boolean;
  exitCode: number;
  tier: string;
  itemsRequired: number;
  itemsSatisfied: number;
  missing: string[];
  stale: string[];
  details: string;
}

export interface CheckOptions {
  projectPath: string;
  pluginName: string;
  threshold?: number;
}

export async function runCheck(_options: CheckOptions): Promise<CheckResult> {
  throw new Error('@626labs/plugin-core/ci-check not yet implemented. Phase 2 extraction pending.');
}
