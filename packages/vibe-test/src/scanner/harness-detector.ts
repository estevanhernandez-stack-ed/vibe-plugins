/**
 * Harness break detector — the three flagship F2 findings Vibe Test is built
 * to catch. Reads deterministic signals (package.json + config files) and
 * flags the canonical WSYATM failure modes:
 *
 *   1. `broken_test_runner`     — vitest forks-pool with sub-30s timeout, or
 *                                  known-bad vitest config shapes.
 *   2. `missing_test_binary`    — package.json scripts reference jest/vitest
 *                                  but that dep is absent from dependencies /
 *                                  devDependencies.
 *   3. `cherry_picked_denominator` — coverage would measure N <<< M source
 *                                  files (imported-by-tests vs. actual source
 *                                  tree).
 *
 * Pure + deterministic — the audit SKILL consumes the findings and renders
 * them in the markdown/banner/JSON views. No filesystem writes from this
 * module; callers supply the inputs.
 */
import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { PackageJsonShape } from './framework-detector.js';

export type HarnessFindingType =
  | 'broken_test_runner'
  | 'missing_test_binary'
  | 'cherry_picked_denominator';

export interface HarnessFinding {
  type: HarnessFindingType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  rationale: string;
  /** Free-form metadata for renderer + proposals. */
  evidence: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Broken test runner — vitest config that will fail at test time.
// ---------------------------------------------------------------------------

export interface DetectBrokenRunnerInput {
  /** Raw text of vitest.config.ts / .js / .mjs, when present. */
  vitestConfigContent?: string | null;
  /** Dependency map from framework-detector. */
  allDependencies: Record<string, string>;
  /** Scripts from package.json. */
  scripts: Record<string, string>;
}

/**
 * Catches the WSYATM-shaped broken vitest config:
 *   - `pool: 'forks'` with a sub-30s testTimeout (observed: forks + 5s → hangs in CI)
 *   - any vitest script + `pool: 'forks'` with no timeout at all on a project that
 *     also ships `@vitest/coverage-v8` (the canonical double-config tripwire).
 *
 * Returns `null` when nothing suspicious is found.
 */
export function detectBrokenTestRunner(
  input: DetectBrokenRunnerInput,
): HarnessFinding | null {
  const cfg = (input.vitestConfigContent ?? '').trim();
  const hasVitest = 'vitest' in input.allDependencies;
  const hasCoverageV8 = '@vitest/coverage-v8' in input.allDependencies;
  if (!cfg || !hasVitest) return null;

  const usesForks = /pool\s*:\s*['"]forks['"]/.test(cfg);
  if (!usesForks) return null;

  // Extract testTimeout if present. Keep parser simple — look for literal
  // number in `testTimeout: <n>`.
  const timeoutMatch = cfg.match(/testTimeout\s*:\s*(\d+)/);
  const timeoutMs = timeoutMatch && timeoutMatch[1] ? Number.parseInt(timeoutMatch[1], 10) : null;

  const subThreshold = timeoutMs !== null && timeoutMs < 30_000;
  const coverageScript = Object.values(input.scripts).some((s) =>
    /--coverage/.test(s),
  );

  if (subThreshold) {
    return {
      type: 'broken_test_runner',
      severity: 'high',
      title:
        'vitest forks-pool with <30s testTimeout — will hang coverage runs',
      rationale:
        `Detected \`pool: 'forks'\` with \`testTimeout: ${timeoutMs}\` ms in vitest config. ` +
        'Forks pool spawns worker processes that need >30s to warm up under coverage; ' +
        'sub-30s timeouts produce silent test hangs that look like passing runs.',
      evidence: {
        timeoutMs,
        usesForks,
        hasCoverageV8,
        coverageScript,
      },
    };
  }

  // forks + coverage-v8 + no timeout — suspicious but lower severity.
  if (usesForks && hasCoverageV8 && coverageScript) {
    return {
      type: 'broken_test_runner',
      severity: 'medium',
      title: 'vitest forks pool combined with coverage-v8 — known flake source',
      rationale:
        'Forks pool + coverage-v8 without explicit testTimeout is the canonical WSYATM ' +
        'failure mode. Recommend pinning `pool: "threads"` for coverage runs.',
      evidence: { usesForks, hasCoverageV8, coverageScript },
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. Missing test binary — script invokes a runner that is not installed.
// ---------------------------------------------------------------------------

export interface DetectMissingBinaryInput {
  scripts: Record<string, string>;
  allDependencies: Record<string, string>;
}

const RUNNER_TOKENS: Array<{ token: RegExp; dep: string; label: string }> = [
  { token: /\bjest\b/, dep: 'jest', label: 'jest' },
  { token: /\bvitest\b/, dep: 'vitest', label: 'vitest' },
  { token: /\bplaywright\b/, dep: '@playwright/test', label: 'playwright' },
  { token: /\bcypress\b/, dep: 'cypress', label: 'cypress' },
  { token: /\bmocha\b/, dep: 'mocha', label: 'mocha' },
];

/**
 * For each runner token observed in a script, require the matching dep be in
 * `allDependencies`. When a mismatch is found, flag — this is the WSYATM
 * "backend has `jest --coverage` in its scripts but jest isn't installed" case.
 */
export function detectMissingTestBinary(
  input: DetectMissingBinaryInput,
): HarnessFinding[] {
  const findings: HarnessFinding[] = [];
  const seen = new Set<string>();
  for (const [name, cmd] of Object.entries(input.scripts)) {
    for (const { token, dep, label } of RUNNER_TOKENS) {
      if (!token.test(cmd)) continue;
      if (dep in input.allDependencies) continue;
      // Playwright: also accept `playwright` as dep name (not just @playwright/test).
      if (label === 'playwright' && 'playwright' in input.allDependencies) continue;
      // Avoid duplicate findings for the same (script,dep) pair.
      const key = `${label}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        type: 'missing_test_binary',
        severity: 'critical',
        title: `Script "${name}" invokes \`${label}\` but it is not installed`,
        rationale:
          `package.json scripts.${name} = "${cmd}" references the \`${label}\` test runner, ` +
          `but \`${dep}\` is missing from dependencies, devDependencies, peerDependencies, ` +
          'and optionalDependencies. The script will fail on first invocation.',
        evidence: { script: name, command: cmd, expectedDep: dep, runner: label },
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// 3. Cherry-picked denominator — import graph analysis.
// ---------------------------------------------------------------------------

export interface DetectCherryPickedInput {
  /** Repo root — used only for relative-path normalization in evidence. */
  repoRoot: string;
  /** Full list of source files (non-test) under scope. */
  sourceFiles: string[];
  /** Full list of test files under scope. */
  testFiles: string[];
  /** Map from test file path → set of module specifiers it imports. */
  testImports: Record<string, string[]>;
  /**
   * Ratio threshold (0..1) — when imported-source-count / source-count < this,
   * we flag cherry-picked. Default 0.3 — only flag strong cases (<30%).
   */
  cherryThreshold?: number;
}

function toRelativePosix(root: string, abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

/**
 * Resolve a bare module specifier to a source file.
 *
 * Supports:
 *   - Relative paths (`./foo`, `../bar/baz`) — resolved against the test file's
 *     directory, with extension inference (`.ts`, `.tsx`, `.js`, etc.) and
 *     `index.*` fallback.
 *
 * External deps (no leading `.`) are ignored — they don't count against the
 * cherry-picked denominator.
 */
function resolveImportTarget(
  testFileAbs: string,
  specifier: string,
  sourceFiles: Set<string>,
): string | null {
  if (!specifier.startsWith('.')) return null;
  const dirSep = testFileAbs.includes('\\') ? '\\' : '/';
  const testDir = testFileAbs.split(dirSep).slice(0, -1).join(dirSep);
  const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const rawTargets: string[] = [];
  // Direct + with extension variants.
  rawTargets.push(join(testDir, specifier));
  for (const ext of EXTS) {
    rawTargets.push(join(testDir, specifier + ext));
    rawTargets.push(join(testDir, specifier, `index${ext}`));
  }
  for (const candidate of rawTargets) {
    const normalized = candidate.split(sep).join('/');
    for (const src of sourceFiles) {
      const srcNormalized = src.split(sep).join('/');
      if (srcNormalized === normalized) return src;
    }
  }
  return null;
}

export function detectCherryPickedDenominator(
  input: DetectCherryPickedInput,
): HarnessFinding | null {
  const threshold = input.cherryThreshold ?? 0.3;
  if (input.sourceFiles.length < 5) return null; // not enough files to meaningfully cherry-pick

  const sourceSet = new Set(input.sourceFiles);
  const imported = new Set<string>();
  for (const testFile of input.testFiles) {
    const specs = input.testImports[testFile] ?? [];
    for (const spec of specs) {
      const resolved = resolveImportTarget(testFile, spec, sourceSet);
      if (resolved) imported.add(resolved);
    }
  }

  const ratio = imported.size / input.sourceFiles.length;
  if (ratio >= threshold) return null;

  const missingSample = input.sourceFiles
    .filter((s) => !imported.has(s))
    .slice(0, 10)
    .map((p) => toRelativePosix(input.repoRoot, p));

  return {
    type: 'cherry_picked_denominator',
    severity: 'high',
    title:
      `Coverage denominator would only measure ${imported.size} of ${input.sourceFiles.length} source files`,
    rationale:
      `Tests import ${imported.size} source files out of ${input.sourceFiles.length} ` +
      `(${(ratio * 100).toFixed(0)}%). Without \`--coverage.all\` or \`collectCoverageFrom\`, ` +
      'the coverage report will look high while most of the codebase sits unmeasured.',
    evidence: {
      importedSourceCount: imported.size,
      totalSourceCount: input.sourceFiles.length,
      coverageRatio: ratio,
      missingSample,
    },
  };
}

// ---------------------------------------------------------------------------
// Convenience: one-shot that reads vitest config content from disk + composes
// all three detectors. Used by the audit SKILL orchestration + integration
// tests.
// ---------------------------------------------------------------------------

export interface DetectAllHarnessInput {
  repoRoot: string;
  packageJson: PackageJsonShape | null;
  allDependencies: Record<string, string>;
  sourceFiles: string[];
  testFiles: string[];
  testImports: Record<string, string[]>;
}

export async function detectAllHarnessIssues(
  input: DetectAllHarnessInput,
): Promise<HarnessFinding[]> {
  const findings: HarnessFinding[] = [];
  const scripts = input.packageJson?.scripts ?? {};

  // Try each possible vitest config location.
  const vitestCandidates = [
    'vitest.config.ts',
    'vitest.config.js',
    'vitest.config.mjs',
  ];
  let vitestConfigContent: string | null = null;
  for (const name of vitestCandidates) {
    try {
      vitestConfigContent = await fs.readFile(
        join(input.repoRoot, name),
        'utf8',
      );
      break;
    } catch {
      // not present — continue.
    }
  }

  const broken = detectBrokenTestRunner({
    vitestConfigContent,
    allDependencies: input.allDependencies,
    scripts,
  });
  if (broken) findings.push(broken);

  findings.push(
    ...detectMissingTestBinary({
      scripts,
      allDependencies: input.allDependencies,
    }),
  );

  const cherry = detectCherryPickedDenominator({
    repoRoot: input.repoRoot,
    sourceFiles: input.sourceFiles,
    testFiles: input.testFiles,
    testImports: input.testImports,
  });
  if (cherry) findings.push(cherry);

  return findings;
}
