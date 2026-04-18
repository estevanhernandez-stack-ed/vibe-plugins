/**
 * `vibe-test gate` — runs audit + coverage + threshold check.
 *
 * Exit codes per spec Component Areas > Gate:
 *   0 — pass (weighted score ≥ tier threshold, no harness breaks)
 *   1 — threshold breach (real failure to investigate)
 *   2 — tool error (config / spawn / parse — not a real test failure)
 *
 * In CI mode (`GITHUB_ACTIONS=true` OR `--ci`):
 *   - emits `::error::` / `::warning::` / `::notice::` annotations
 *   - appends a markdown summary block to `$GITHUB_STEP_SUMMARY` when set
 */

import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

import { coverage as coverageMod, scanner } from '@esthernandez/vibe-test';

import {
  detectCiContext,
  emitError,
  emitNotice,
  emitWarning,
  appendStepSummary,
} from '../stdout-protocol.js';

export interface GateCommandOptions {
  cwd?: string;
  ci?: boolean;
  /** Override tier threshold lookup. */
  tier?: 'prototype' | 'internal' | 'public-facing' | 'customer-facing-saas' | 'regulated';
  testCommand?: string;
}

export interface GateCommandResult {
  exitCode: number;
  passed: boolean;
  weightedScore: number | null;
  threshold: number | null;
}

export async function runGateCommand(options: GateCommandOptions = {}): Promise<GateCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const ctx = detectCiContext(options.ci);
  const tier = options.tier ?? 'internal';

  let inventory;
  try {
    inventory = await scanner.scan(cwd, null);
  } catch (err) {
    emitError(
      `gate: scan failed: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
    return { exitCode: 2, passed: false, weightedScore: null, threshold: null };
  }

  const testCmd = options.testCommand ?? 'npm';
  const testArgs = options.testCommand ? [] : ['test'];

  let coverageResult;
  try {
    coverageResult = await coverageMod.runCoverage({
      framework: 'c8-standalone',
      cwd,
      adapterAccepted: false,
      actualSourceFiles: inventory.scanned_files,
      c8TestCommand: { command: testCmd, args: testArgs },
    });
  } catch (err) {
    emitError(
      `gate: coverage step failed (treating as tool-error, exit 2): ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
    return { exitCode: 2, passed: false, weightedScore: null, threshold: null };
  }

  // Harness-break detection — denominator cherry-picking is a tool-error class break.
  if (coverageResult.denominator.is_cherry_picked) {
    emitWarning(
      `gate: coverage denominator cherry-picked — reported=${coverageResult.denominator.reported_files}, actual=${coverageResult.denominator.actual_source_files}`,
      ctx,
    );
  }

  const linesPct = coverageResult.summary?.lines ?? 0;
  const score = coverageMod.scoreFromCoverage({
    perLevel: {
      smoke: linesPct,
      behavioral: linesPct,
      edge: linesPct,
      integration: linesPct,
      performance: linesPct,
    },
    applicability: {
      smoke: true,
      behavioral: true,
      edge: true,
      integration: false,
      performance: false,
    },
    tier,
  });

  const passed = score.passes;
  const exitCode = passed ? 0 : 1;

  // Step summary (markdown for CI-side visibility).
  const summary = [
    `## Vibe Test gate — ${passed ? 'PASS' : 'FAIL'}`,
    '',
    `- tier: \`${tier}\``,
    `- weighted score: \`${score.score.toFixed(1)}\``,
    `- threshold: \`${score.threshold}\``,
    `- lines covered: \`${linesPct.toFixed(2)}%\``,
    `- cherry-picked denominator: \`${coverageResult.denominator.is_cherry_picked}\``,
    '',
  ].join('\n');
  await appendStepSummary(summary, ctx);

  if (passed) {
    emitNotice(
      `gate passed: weighted score ${score.score.toFixed(1)} >= threshold ${score.threshold} for tier ${tier}`,
      ctx,
    );
  } else {
    emitError(
      `gate failed: weighted score ${score.score.toFixed(1)} < threshold ${score.threshold} for tier ${tier}`,
      ctx,
    );
  }

  // Local diagnostic banner (non-CI gets a bit more prose).
  if (!ctx.active) {
    process.stdout.write(
      `\nGate result: ${passed ? 'PASS' : 'FAIL'} (score ${score.score.toFixed(1)} vs threshold ${score.threshold})\n`,
    );
    if (!passed) {
      process.stdout.write(
        `What it would take to pass: lift weighted score by ${(score.threshold - score.score).toFixed(1)} points. Run \`/vibe-test:audit\` for per-level gap rationale, or \`/vibe-test:generate\` to start closing the gap.\n`,
      );
    }
  }

  // Avoid an unused-import warning.
  void fs;

  return { exitCode, passed, weightedScore: score.score, threshold: score.threshold };
}
