/**
 * `vibe-test coverage` — invoke c8 --all unconditionally, deterministic only.
 *
 * The plugin SKILL has an adaptation-prompt UX (propose vitest config diff
 * with builder consent). The CLI doesn't — there's no human in CI to consent —
 * so it shells `c8 --all` directly with the project's existing test command.
 *
 * Outputs:
 *   - `<out>/coverage.json` — JSON sidecar with summary + reported files
 *   - stdout summary       — human-readable per-level numbers
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import { coverage as coverageMod, scanner } from '@esthernandez/vibe-test';

import { detectCiContext, emitNotice, emitError, emitWarning } from '../stdout-protocol.js';

export interface CoverageCommandOptions {
  out?: string;
  cwd?: string;
  ci?: boolean;
  /** Override the test command c8 wraps. Defaults to `npm test`. */
  testCommand?: string;
}

export interface CoverageCommandResult {
  exitCode: number;
  jsonPath: string | null;
  weightedScore: number | null;
}

const DEFAULT_OUT = 'docs/vibe-test';

export async function runCoverageCommand(options: CoverageCommandOptions = {}): Promise<CoverageCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const outDir = resolve(cwd, options.out ?? DEFAULT_OUT);
  const ctx = detectCiContext(options.ci);

  // Scan to populate `actualSourceFiles` for the denominator-honesty check.
  let actualSourceFiles: string[] = [];
  try {
    const inventory = await scanner.scan(cwd, null);
    actualSourceFiles = inventory.scanned_files;
  } catch (err) {
    emitWarning(
      `coverage: scan for denominator failed: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
  }

  const testCmd = options.testCommand ?? 'npm';
  const testArgs = options.testCommand ? [] : ['test'];

  let result;
  try {
    result = await coverageMod.runCoverage({
      framework: 'c8-standalone',
      cwd,
      adapterAccepted: false,
      actualSourceFiles,
      c8TestCommand: { command: testCmd, args: testArgs },
    });
  } catch (err) {
    emitError(
      `coverage: c8 fallback failed: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
    return { exitCode: 2, jsonPath: null, weightedScore: null };
  }

  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, 'coverage.json');
  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let weightedScore: number | null = null;
  if (result.summary) {
    // Build per-level coverage from the c8 summary — CLI uses lines as a coarse proxy
    // for each level since we don't have the SKILL's per-test-level mapping.
    const linesPct = result.summary.lines;
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
      tier: 'internal',
    });
    weightedScore = score.score;
  }

  process.stdout.write(`Coverage summary (CLI deterministic):\n`);
  if (result.summary) {
    const s = result.summary;
    process.stdout.write(
      `  lines=${s.lines.toFixed(2)}%  statements=${s.statements.toFixed(2)}%  functions=${s.functions.toFixed(2)}%  branches=${s.branches.toFixed(2)}%\n`,
    );
    if (weightedScore !== null) {
      process.stdout.write(`  weighted score (lines-as-proxy): ${weightedScore.toFixed(1)}\n`);
    }
  } else {
    process.stdout.write(`  (no coverage summary returned by c8)\n`);
  }
  process.stdout.write(
    `  denominator: reported=${result.denominator.reported_files} actual=${result.denominator.actual_source_files} cherry_picked=${result.denominator.is_cherry_picked}\n`,
  );

  emitNotice(
    `coverage: lines=${result.summary?.lines.toFixed(2) ?? 'n/a'}% (json sidecar at ${jsonPath})`,
    ctx,
  );

  return { exitCode: 0, jsonPath, weightedScore };
}
