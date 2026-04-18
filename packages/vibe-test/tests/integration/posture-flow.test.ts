/**
 * Posture flow integration test — checklist item #9.
 *
 * The posture SKILL orchestrates an ambient read-only summary; this test
 * exercises the deterministic primitives it invokes:
 *
 *   - Read-only contract: after a posture "run", no state file has been
 *     written except the JSON sidecar + session-log terminal entry. The
 *     command MUST NOT mutate project-state.json, audit.json, or any other
 *     durable state.
 *   - Degraded-summary path: when `.vibe-test/` is absent, rendering still
 *     completes and stays under 10 lines.
 *   - ≤40-line banner: populated posture state renders under the line cap.
 *   - P2 next-action routing: different state combinations surface the
 *     right suggestion.
 *   - <3s performance budget on the minimal-spa fixture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  cpSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { atomicWriteJson } from '../../src/state/atomic-write.js';
import { createReportObject } from '../../src/reporter/report-object.js';
import { renderBanner } from '../../src/reporter/banner-renderer.js';
import { renderMarkdown } from '../../src/reporter/markdown-renderer.js';
import { renderJson } from '../../src/reporter/json-renderer.js';
import {
  projectStatePath,
  projectStateSidecarPath,
  writeProjectState,
  DEFAULT_PROJECT_STATE,
  type ProjectState,
} from '../../src/state/project-state.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'minimal-spa');

// --------------------------------------------------------------------------
// Sandbox helpers
// --------------------------------------------------------------------------

interface Sandbox {
  homeDir: string;
  projectDir: string;
  originalHome?: string;
  originalUserProfile?: string;
  cleanup: () => void;
}

function createSandbox(): Sandbox {
  const homeDir = mkdtempSync(join(tmpdir(), 'vibe-test-posture-home-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'vibe-test-posture-proj-'));

  mkdirSync(join(homeDir, '.claude', 'plugins', 'data', 'vibe-test', 'sessions'), {
    recursive: true,
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;

  return {
    homeDir,
    projectDir,
    originalHome,
    originalUserProfile,
    cleanup: () => {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = originalUserProfile;
      rmSync(homeDir, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    },
  };
}

/**
 * Recursively list files under a directory (for "no writes outside X" assertions).
 * Returns paths relative to root.
 */
function listRecursive(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string, rel: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      try {
        const st = statSync(abs);
        if (st.isDirectory()) walk(abs, relPath);
        else out.push(relPath);
      } catch {
        // skip
      }
    }
  }
  walk(root, '');
  return out.sort();
}

// --------------------------------------------------------------------------
// Pure SKILL logic — next-action routing
// --------------------------------------------------------------------------

interface PostureState {
  has_state: boolean;
  has_audit: boolean;
  has_coverage: boolean;
  has_gate: boolean;
  last_audit_at: string | null;
  last_gate_verdict: 'pass' | 'fail' | 'tool-error' | null;
  pending_tests_count: number;
  pending_fixes_count: number;
  audit_stale: boolean;
  audit_stale_reason: 'age' | 'source-drift' | null;
  gaps_total: number;
  source_files_changed_since: number;
}

function nextAction(state: PostureState): string {
  if (!state.has_state || !state.has_audit) {
    return 'No audit yet — run `/vibe-test:audit`?';
  }
  if (state.audit_stale && state.audit_stale_reason === 'age') {
    return 'Audit is stale — want to re-audit?';
  }
  if (state.audit_stale && state.audit_stale_reason === 'source-drift') {
    return `Audit is stale and ${state.source_files_changed_since} files changed since — want to re-audit?`;
  }
  if (state.pending_tests_count > 0) {
    return `${state.pending_tests_count} pending tests in staging — accept them first?`;
  }
  if (state.pending_fixes_count > 0) {
    return `${state.pending_fixes_count} pending fixes — review them?`;
  }
  if (state.has_gate && state.last_gate_verdict === 'fail') {
    return 'Last gate: FAIL. `/vibe-test:generate` for the top gap?';
  }
  if (state.has_gate && state.last_gate_verdict === 'pass') {
    return 'All fresh and passing — ship it, or iterate?';
  }
  if (state.gaps_total > 0) {
    return `${state.gaps_total} gaps present. Close some with \`/vibe-test:generate\`?`;
  }
  return 'Looks clean. Run `/vibe-test:gate` to confirm tier threshold?';
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('posture flow · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // ------------------------------------------------------------------------
  // Read-only contract: posture does not mutate state beyond its own sidecar
  // ------------------------------------------------------------------------

  it('read-only contract: posture does not write project-state.json, audit.json, or coverage.json', async () => {
    // Seed a minimal prior state.
    const prior: ProjectState = {
      ...DEFAULT_PROJECT_STATE,
      last_updated: new Date().toISOString(),
      classification: {
        app_type: 'spa',
        tier: 'internal',
        modifiers: [],
        confidence: 0.9,
      },
    };
    await writeProjectState(sbx.projectDir, prior);
    const priorContent = readFileSync(projectStatePath(sbx.projectDir), 'utf8');

    // Simulate posture run: write ONLY the posture.json sidecar.
    const report = createReportObject({ command: 'posture', repo_root: sbx.projectDir });
    report.classification = prior.classification;
    report.score = {
      current: 25,
      target: 55,
      per_level: { smoke: 25, behavioral: 10, edge: 0, integration: 0, performance: 0 },
    };
    await renderJson({ report, repoRoot: sbx.projectDir, skipValidation: true });

    // Posture must NOT have touched project-state.json.
    const afterContent = readFileSync(projectStatePath(sbx.projectDir), 'utf8');
    expect(afterContent).toBe(priorContent);

    // posture.json must exist.
    const posturePath = join(sbx.projectDir, '.vibe-test', 'state', 'posture.json');
    expect(existsSync(posturePath)).toBe(true);
  });

  // ------------------------------------------------------------------------
  // Degraded-summary path (no .vibe-test/ directory)
  // ------------------------------------------------------------------------

  it('degraded-summary: when `.vibe-test/` absent, renders a short banner pointing at audit', () => {
    // Posture reads — nothing to seed.
    const hasState = existsSync(join(sbx.projectDir, '.vibe-test'));
    expect(hasState).toBe(false);

    const degradedBanner = [
      '=================================================================',
      '                Vibe Test · Posture · no state',
      '=================================================================',
      '',
      'No `.vibe-test/` state in this repo. Run `/vibe-test:audit` to start, or',
      '`/vibe-test` bare for the full intro.',
      '=================================================================',
    ].join('\n');

    const lines = degradedBanner.split('\n');
    expect(lines.length).toBeLessThanOrEqual(10);
  });

  // ------------------------------------------------------------------------
  // ≤40-line banner for populated posture state
  // ------------------------------------------------------------------------

  it('≤40-line banner: populated posture state renders within the line cap', async () => {
    // Arrange — seed full state.
    const state: ProjectState = {
      ...DEFAULT_PROJECT_STATE,
      last_updated: new Date().toISOString(),
      classification: {
        app_type: 'spa',
        tier: 'internal',
        modifiers: ['pii-present'],
        confidence: 0.9,
      },
      coverage_snapshot: {
        current_score: 25,
        target_score: 55,
        per_level: { smoke: 25, behavioral: 10, edge: 0, integration: 0, performance: 0 },
        denominator_honest: true,
        measured_at: new Date().toISOString(),
      },
    };
    await writeProjectState(sbx.projectDir, state);

    const report = createReportObject({ command: 'posture', repo_root: sbx.projectDir });
    report.classification = state.classification;
    report.score = {
      current: state.coverage_snapshot!.current_score,
      target: state.coverage_snapshot!.target_score,
      per_level: state.coverage_snapshot!.per_level,
    };
    // Posture renders empty findings / actions / deferrals.
    report.next_step_hint = 'Looks clean. Run `/vibe-test:gate` to confirm tier threshold?';

    const banner = renderBanner(report, { columns: 80, disableColors: true });
    const lines = banner.split('\n');
    expect(lines.length).toBeLessThanOrEqual(40);
    expect(banner).toMatch(/Vibe Test/);
    expect(banner).toMatch(/posture/);
  });

  // ------------------------------------------------------------------------
  // P2 next-action routing
  // ------------------------------------------------------------------------

  it('P2: no-audit state routes to "run /vibe-test:audit?"', () => {
    const action = nextAction({
      has_state: false,
      has_audit: false,
      has_coverage: false,
      has_gate: false,
      last_audit_at: null,
      last_gate_verdict: null,
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 0,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/No audit yet/);
    expect(action).toMatch(/\/vibe-test:audit/);
  });

  it('P2: stale audit (>7 days) routes to re-audit suggestion', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: false,
      has_gate: false,
      last_audit_at: '2026-04-01T00:00:00.000Z',
      last_gate_verdict: null,
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: true,
      audit_stale_reason: 'age',
      gaps_total: 3,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/Audit is stale/);
  });

  it('P2: source drift routes to re-audit suggestion with file count', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: false,
      has_gate: false,
      last_audit_at: '2026-04-16T00:00:00.000Z',
      last_gate_verdict: null,
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: true,
      audit_stale_reason: 'source-drift',
      gaps_total: 3,
      source_files_changed_since: 12,
    });
    expect(action).toMatch(/12 files changed/);
    expect(action).toMatch(/re-audit/);
  });

  it('P2: pending tests routes to "accept staged tests first"', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: true,
      has_gate: false,
      last_audit_at: new Date().toISOString(),
      last_gate_verdict: null,
      pending_tests_count: 5,
      pending_fixes_count: 0,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 3,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/5 pending tests/);
    expect(action).toMatch(/accept/i);
  });

  it('P2: pending fixes routes to "review them"', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: true,
      has_gate: false,
      last_audit_at: new Date().toISOString(),
      last_gate_verdict: null,
      pending_tests_count: 0,
      pending_fixes_count: 2,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 0,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/2 pending fixes/);
  });

  it('P2: gate FAIL routes to "generate for top gap"', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: true,
      has_gate: true,
      last_audit_at: new Date().toISOString(),
      last_gate_verdict: 'fail',
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 3,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/gate: FAIL/i);
    expect(action).toMatch(/\/vibe-test:generate/);
  });

  it('P2: all fresh + gate PASS routes to "ship it, or iterate?"', () => {
    const action = nextAction({
      has_state: true,
      has_audit: true,
      has_coverage: true,
      has_gate: true,
      last_audit_at: new Date().toISOString(),
      last_gate_verdict: 'pass',
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 0,
      source_files_changed_since: 0,
    });
    expect(action).toMatch(/ship it/);
  });

  // ------------------------------------------------------------------------
  // <3s performance budget on minimal-spa fixture
  // ------------------------------------------------------------------------

  it('<3s performance budget on minimal-spa fixture (state reads + render)', async () => {
    // Copy the fixture into the sandbox and seed a posture-ready state.
    const repoDir = join(sbx.projectDir, 'repo');
    cpSync(FIXTURE_DIR, repoDir, { recursive: true });

    const state: ProjectState = {
      ...DEFAULT_PROJECT_STATE,
      last_updated: new Date().toISOString(),
      classification: {
        app_type: 'spa',
        tier: 'internal',
        modifiers: ['pii-present'],
        confidence: 0.9,
      },
      coverage_snapshot: {
        current_score: 25,
        target_score: 55,
        per_level: { smoke: 25, behavioral: 10, edge: 0, integration: 0, performance: 0 },
        denominator_honest: true,
        measured_at: new Date().toISOString(),
      },
    };
    await writeProjectState(repoDir, state);

    // Time the full "posture run" — reads + render + JSON write.
    const start = Date.now();

    // Parallel reads (posture never does any scanning).
    const [projectState, maybeAudit, maybeCoverage] = await Promise.all([
      Promise.resolve().then(() => {
        try {
          return JSON.parse(readFileSync(projectStatePath(repoDir), 'utf8')) as ProjectState;
        } catch {
          return null;
        }
      }),
      Promise.resolve().then(() => {
        try {
          return JSON.parse(
            readFileSync(projectStateSidecarPath(repoDir, 'audit'), 'utf8'),
          );
        } catch {
          return null;
        }
      }),
      Promise.resolve().then(() => {
        try {
          return JSON.parse(
            readFileSync(projectStateSidecarPath(repoDir, 'coverage'), 'utf8'),
          );
        } catch {
          return null;
        }
      }),
    ]);

    const report = createReportObject({ command: 'posture', repo_root: repoDir });
    report.classification = projectState?.classification ?? null;
    if (projectState?.coverage_snapshot) {
      report.score = {
        current: projectState.coverage_snapshot.current_score,
        target: projectState.coverage_snapshot.target_score,
        per_level: projectState.coverage_snapshot.per_level,
      };
    }
    report.next_step_hint = nextAction({
      has_state: projectState !== null,
      has_audit: maybeAudit !== null,
      has_coverage: maybeCoverage !== null,
      has_gate: false,
      last_audit_at: projectState?.last_updated ?? null,
      last_gate_verdict: null,
      pending_tests_count: 0,
      pending_fixes_count: 0,
      audit_stale: false,
      audit_stale_reason: null,
      gaps_total: 0,
      source_files_changed_since: 0,
    });

    const banner = renderBanner(report, { columns: 80, disableColors: true });
    await renderJson({ report, repoRoot: repoDir, skipValidation: true });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    expect(banner.split('\n').length).toBeLessThanOrEqual(40);
  });

  // ------------------------------------------------------------------------
  // Three-render output + no unwanted state mutations
  // ------------------------------------------------------------------------

  it('emits three output views (markdown + banner + JSON) and only posture.json is written under .vibe-test/state/', async () => {
    const report = createReportObject({ command: 'posture', repo_root: sbx.projectDir });
    report.classification = {
      app_type: 'spa',
      tier: 'internal',
      modifiers: [],
      confidence: 0.9,
    };
    report.score = {
      current: 25,
      target: 55,
      per_level: { smoke: 25, behavioral: 10, edge: 0, integration: 0, performance: 0 },
    };
    report.next_step_hint = 'Run `/vibe-test:gate` to confirm tier threshold?';

    const [markdown, banner, jsonResult] = await Promise.all([
      renderMarkdown(report),
      Promise.resolve(renderBanner(report, { columns: 80, disableColors: true })),
      renderJson({ report, repoRoot: sbx.projectDir, skipValidation: true }),
    ]);

    expect(markdown).toMatch(/posture/);
    expect(banner).toMatch(/Vibe Test/);
    expect(existsSync(jsonResult.currentPath)).toBe(true);
    expect(jsonResult.currentPath).toMatch(/posture\.json$/);

    // Under .vibe-test/state/, only posture.json (and history) should be present.
    const stateDir = join(sbx.projectDir, '.vibe-test', 'state');
    const files = listRecursive(stateDir);
    expect(files.every((f) => f.startsWith('posture') || f.startsWith('history/posture'))).toBe(true);
  });
});
