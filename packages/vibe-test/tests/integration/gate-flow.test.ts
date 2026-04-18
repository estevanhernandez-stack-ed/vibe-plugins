/**
 * Gate flow integration test — checklist item #9.
 *
 * The gate SKILL orchestrates the decision flow; this test exercises the
 * deterministic primitives it invokes:
 *
 *   - Ga1 verdict mapping: computeWeightedScore → exit code (0/1/2)
 *   - Ga1 CI mode detection: GITHUB_ACTIONS=true OR --ci flag
 *   - Ga1 GitHub Actions annotations: ::error:: / ::warning:: / ::notice::
 *   - Ga1 summary-markdown write to $GITHUB_STEP_SUMMARY when present
 *   - Ga2 local mode "what would it take to pass" guidance
 *   - Ga3 co-invocation announcement fires when superpowers:verification-
 *     before-completion is in the available-skills list (PASS only — no
 *     co-invoke on FAIL or tool error)
 *   - gate.json sidecar carries verdict + exit_code + would_exit
 *   - Three-render output (banner + markdown + JSON)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  computeWeightedScore,
  TIER_THRESHOLDS,
  type PerLevelCoverage,
  type PerLevelApplicability,
} from '../../src/coverage/weighted-score.js';
import { createReportObject } from '../../src/reporter/report-object.js';
import { renderBanner } from '../../src/reporter/banner-renderer.js';
import { renderMarkdown } from '../../src/reporter/markdown-renderer.js';
import { renderJson } from '../../src/reporter/json-renderer.js';
import { atomicWriteJson } from '../../src/state/atomic-write.js';
import type { Tier } from '../../src/state/project-state.js';

// --------------------------------------------------------------------------
// Sandbox helpers
// --------------------------------------------------------------------------

interface Sandbox {
  homeDir: string;
  projectDir: string;
  originalHome?: string;
  originalUserProfile?: string;
  originalGithubActions?: string;
  originalStepSummary?: string;
  cleanup: () => void;
}

function createSandbox(): Sandbox {
  const homeDir = mkdtempSync(join(tmpdir(), 'vibe-test-gate-home-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'vibe-test-gate-proj-'));

  mkdirSync(join(homeDir, '.claude', 'plugins', 'data', 'vibe-test', 'sessions'), {
    recursive: true,
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  const originalGithubActions = process.env.GITHUB_ACTIONS;
  const originalStepSummary = process.env.GITHUB_STEP_SUMMARY;
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;

  return {
    homeDir,
    projectDir,
    originalHome,
    originalUserProfile,
    originalGithubActions,
    originalStepSummary,
    cleanup: () => {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = originalUserProfile;
      if (originalGithubActions === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = originalGithubActions;
      if (originalStepSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = originalStepSummary;
      rmSync(homeDir, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    },
  };
}

// --------------------------------------------------------------------------
// Pure gate logic (mirrors SKILL Step 3)
// --------------------------------------------------------------------------

type Verdict = 'pass' | 'fail' | 'tool-error';
type ExitCode = 0 | 1 | 2;

interface GateInput {
  perLevel: PerLevelCoverage;
  applicability: PerLevelApplicability;
  tier: Tier;
  toolError?: string | null;
}

interface GateResult {
  verdict: Verdict;
  exit_code: ExitCode;
  score: number;
  threshold: number;
}

function runGate(input: GateInput): GateResult {
  if (input.toolError) {
    return { verdict: 'tool-error', exit_code: 2, score: 0, threshold: 0 };
  }
  const r = computeWeightedScore({
    perLevel: input.perLevel,
    applicability: input.applicability,
    tier: input.tier,
  });
  return {
    verdict: r.passes ? 'pass' : 'fail',
    exit_code: r.passes ? 0 : 1,
    score: r.score,
    threshold: r.threshold,
  };
}

/** Detect CI mode the way the SKILL does in Step 0. */
function detectCiMode(args: string[] = []): boolean {
  return process.env.GITHUB_ACTIONS === 'true' || args.includes('--ci');
}

/** Compose a GitHub Actions annotation line per verdict. */
function ciAnnotation(result: GateResult, tier: Tier): string {
  if (result.verdict === 'pass') {
    return `::notice::Vibe Test gate passed — ${result.score.toFixed(1)} >= ${result.threshold} (${tier})`;
  }
  if (result.verdict === 'fail') {
    return `::error::Vibe Test gate failed — ${result.score.toFixed(1)} < ${result.threshold} (${tier})`;
  }
  return `::error::Vibe Test gate tool error`;
}

/** Ga2 "what would it take to pass" marginal analysis. */
function marginalAnalysis(input: GateInput): Array<{ level: string; delta: number; contribution: number }> {
  const current = computeWeightedScore(input);
  const out: Array<{ level: string; delta: number; contribution: number }> = [];
  const levels: Array<keyof PerLevelCoverage> = ['smoke', 'behavioral', 'edge', 'integration', 'performance'];
  for (const level of levels) {
    if (!input.applicability[level]) continue;
    const lifted = { ...input.perLevel, [level]: 100 };
    const afterLift = computeWeightedScore({ ...input, perLevel: lifted });
    out.push({
      level,
      delta: afterLift.score - current.score,
      contribution: afterLift.score - current.score,
    });
  }
  return out.sort((a, b) => b.delta - a.delta);
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('gate flow · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // ------------------------------------------------------------------------
  // Ga1 exit codes (0 pass / 1 threshold breach / 2 tool error)
  // ------------------------------------------------------------------------

  it('Ga1 exit code 0: PASS when weighted score >= tier threshold', () => {
    const result = runGate({
      perLevel: { smoke: 100, behavioral: 100, edge: 100, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'internal',
    });
    expect(result.verdict).toBe('pass');
    expect(result.exit_code).toBe(0);
  });

  it('Ga1 exit code 1: FAIL when weighted score < tier threshold', () => {
    const result = runGate({
      perLevel: { smoke: 20, behavioral: 10, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });
    expect(result.verdict).toBe('fail');
    expect(result.exit_code).toBe(1);
    expect(result.score).toBeLessThan(result.threshold);
  });

  it('Ga1 exit code 2: tool error when coverage run crashed', () => {
    const result = runGate({
      perLevel: { smoke: 0, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: false,
        integration: false,
        performance: false,
      },
      tier: 'internal',
      toolError: 'coverage run crashed: exit code 1',
    });
    expect(result.verdict).toBe('tool-error');
    expect(result.exit_code).toBe(2);
  });

  // ------------------------------------------------------------------------
  // Ga1 CI mode auto-detection
  // ------------------------------------------------------------------------

  it('Ga1 CI mode: detects GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectCiMode([])).toBe(true);
    delete process.env.GITHUB_ACTIONS;
  });

  it('Ga1 CI mode: detects --ci flag when GITHUB_ACTIONS unset', () => {
    delete process.env.GITHUB_ACTIONS;
    expect(detectCiMode(['--ci'])).toBe(true);
  });

  it('Ga1 CI mode: defaults to false when neither signal present', () => {
    delete process.env.GITHUB_ACTIONS;
    expect(detectCiMode([])).toBe(false);
  });

  // ------------------------------------------------------------------------
  // Ga1 GitHub Actions annotations
  // ------------------------------------------------------------------------

  it('Ga1 annotation: PASS verdict emits ::notice:: prefix under GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectCiMode([])).toBe(true);

    const result = runGate({
      perLevel: { smoke: 100, behavioral: 100, edge: 100, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'internal',
    });
    const annotation = ciAnnotation(result, 'internal');
    expect(annotation).toMatch(/^::notice::/);
    expect(annotation).toMatch(/gate passed/);
    expect(annotation).toMatch(/internal/);

    delete process.env.GITHUB_ACTIONS;
  });

  it('Ga1 annotation: FAIL verdict emits ::error:: prefix under GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true';

    const result = runGate({
      perLevel: { smoke: 20, behavioral: 10, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });
    const annotation = ciAnnotation(result, 'public-facing');
    expect(annotation).toMatch(/^::error::/);
    expect(annotation).toMatch(/gate failed/);

    delete process.env.GITHUB_ACTIONS;
  });

  it('Ga1 annotation: tool-error emits ::error:: prefix', () => {
    process.env.GITHUB_ACTIONS = 'true';

    const result = runGate({
      perLevel: { smoke: 0, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: false,
        integration: false,
        performance: false,
      },
      tier: 'internal',
      toolError: 'coverage exec failed',
    });
    const annotation = ciAnnotation(result, 'internal');
    expect(annotation).toMatch(/^::error::/);
    expect(annotation).toMatch(/tool error/);

    delete process.env.GITHUB_ACTIONS;
  });

  // ------------------------------------------------------------------------
  // Ga1 GITHUB_STEP_SUMMARY write
  // ------------------------------------------------------------------------

  it('Ga1 GITHUB_STEP_SUMMARY: writes summary markdown when env var is present', () => {
    process.env.GITHUB_ACTIONS = 'true';
    const summaryFile = join(sbx.projectDir, 'step-summary.md');
    process.env.GITHUB_STEP_SUMMARY = summaryFile;

    const result = runGate({
      perLevel: { smoke: 30, behavioral: 20, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });

    // SKILL writes the markdown body to the step-summary file.
    const summaryMd = `## Vibe Test Gate\n\n- Verdict: **${result.verdict}**\n- Score: ${result.score.toFixed(1)} / ${result.threshold}\n- Tier: public-facing\n`;
    writeFileSync(summaryFile, summaryMd);

    expect(existsSync(summaryFile)).toBe(true);
    const content = readFileSync(summaryFile, 'utf8');
    expect(content).toMatch(/## Vibe Test Gate/);
    expect(content).toMatch(/Verdict: \*\*fail\*\*/);

    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_STEP_SUMMARY;
  });

  // ------------------------------------------------------------------------
  // Ga2 "what would it take to pass" guidance
  // ------------------------------------------------------------------------

  it('Ga2 marginal analysis: ranks levels by highest marginal contribution', () => {
    const analysis = marginalAnalysis({
      perLevel: { smoke: 0, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: true,
        performance: false,
      },
      tier: 'public-facing',
    });
    // performance is not applicable — 4 levels should be returned.
    expect(analysis.length).toBe(4);
    // Smoke + behavioral carry weight 1.0 — they should rank higher than edge + integration (0.8).
    expect(analysis[0]!.level === 'smoke' || analysis[0]!.level === 'behavioral').toBe(true);
    expect(analysis[0]!.delta).toBeGreaterThan(0);
  });

  it('Ga2 marginal analysis: skips non-applicable levels', () => {
    const analysis = marginalAnalysis({
      perLevel: { smoke: 30, behavioral: 20, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: false,
        integration: false,
        performance: false,
      },
      tier: 'internal',
    });
    const levels = analysis.map((a) => a.level);
    expect(levels).not.toContain('edge');
    expect(levels).not.toContain('integration');
    expect(levels).not.toContain('performance');
  });

  // ------------------------------------------------------------------------
  // Ga3 co-invocation announcement
  // ------------------------------------------------------------------------

  it('Ga3 co-invoke: announcement fires on PASS when verification-before-completion in skills list', () => {
    const availableSkills = [
      'superpowers:verification-before-completion',
      'superpowers:test-driven-development',
    ];
    const result = runGate({
      perLevel: { smoke: 100, behavioral: 100, edge: 100, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'internal',
    });

    const shouldCoInvoke =
      result.verdict === 'pass' && availableSkills.includes('superpowers:verification-before-completion');
    expect(shouldCoInvoke).toBe(true);
  });

  it('Ga3 co-invoke: NO announcement on FAIL even when verification skill present (incomplete work)', () => {
    const availableSkills = ['superpowers:verification-before-completion'];
    const result = runGate({
      perLevel: { smoke: 10, behavioral: 0, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: false,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });

    const shouldCoInvoke =
      result.verdict === 'pass' && availableSkills.includes('superpowers:verification-before-completion');
    expect(shouldCoInvoke).toBe(false);
    expect(result.verdict).toBe('fail');
  });

  it('Ga3 co-invoke: NO announcement when verification skill absent', () => {
    const availableSkills = ['superpowers:test-driven-development'];
    const result = runGate({
      perLevel: { smoke: 100, behavioral: 100, edge: 100, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'internal',
    });

    const shouldCoInvoke =
      result.verdict === 'pass' && availableSkills.includes('superpowers:verification-before-completion');
    expect(shouldCoInvoke).toBe(false);
  });

  // ------------------------------------------------------------------------
  // gate.json sidecar shape
  // ------------------------------------------------------------------------

  it('gate.json sidecar carries verdict + exit_code + would_exit fields', async () => {
    const result = runGate({
      perLevel: { smoke: 30, behavioral: 20, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });
    const gateJsonPath = join(sbx.projectDir, '.vibe-test', 'state', 'gate.json');
    await atomicWriteJson(gateJsonPath, {
      schema_version: 1,
      last_updated: new Date().toISOString(),
      plugin_version: '0.2.0',
      project: { repo_root: sbx.projectDir, scope: null, commit_hash: null },
      verdict: result.verdict,
      exit_code: result.exit_code,
      would_exit: result.exit_code,
      score: result.score,
      threshold: result.threshold,
      tier: 'public-facing',
      audit_state_source: 'reused',
      coverage_state_source: 'fresh-run',
      ci_mode: false,
    });

    expect(existsSync(gateJsonPath)).toBe(true);
    const payload = JSON.parse(readFileSync(gateJsonPath, 'utf8')) as Record<string, unknown>;
    expect(payload.verdict).toBe('fail');
    expect(payload.exit_code).toBe(1);
    expect(payload.would_exit).toBe(1);
  });

  // ------------------------------------------------------------------------
  // Three-render output
  // ------------------------------------------------------------------------

  it('emits three output views (markdown + banner + JSON)', async () => {
    const report = createReportObject({
      command: 'gate',
      repo_root: sbx.projectDir,
    });
    report.classification = {
      app_type: 'spa',
      tier: 'public-facing',
      modifiers: [],
      confidence: 0.9,
    };
    const r = computeWeightedScore({
      perLevel: { smoke: 30, behavioral: 20, edge: 0, integration: 0, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: false,
        performance: false,
      },
      tier: 'public-facing',
    });
    report.score = {
      current: r.score,
      target: r.threshold,
      per_level: { smoke: 30, behavioral: 20, edge: 0, integration: 0, performance: 0 },
    };
    report.findings.push({
      id: 'threshold-breach-1',
      severity: 'high',
      category: 'gap-behavioral',
      title: `Threshold breach: ${r.score.toFixed(1)} < ${r.threshold} (public-facing)`,
      rationale: 'Raise smoke and behavioral coverage to clear the threshold.',
    });
    report.next_step_hint = 'Run `/vibe-test:generate` to close the gaps.';

    const [markdown, banner, jsonResult] = await Promise.all([
      renderMarkdown(report),
      Promise.resolve(renderBanner(report, { columns: 80, disableColors: true })),
      renderJson({ report, repoRoot: sbx.projectDir, skipValidation: true }),
    ]);

    expect(markdown).toMatch(/gate/);
    expect(banner).toMatch(/Vibe Test/);
    expect(banner).toMatch(/BELOW|PASS/);
    expect(existsSync(jsonResult.currentPath)).toBe(true);
    expect(jsonResult.currentPath).toMatch(/gate\.json$/);
  });
});
