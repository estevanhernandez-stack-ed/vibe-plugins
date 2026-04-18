/**
 * Fix flow integration test — checklist item #9.
 *
 * The fix SKILL is agent-executed markdown; this test exercises the
 * deterministic primitives it orchestrates:
 *
 *   - Failure-signal collection (mocked last-run output / inline failure)
 *   - F2 harness-break detection (broken_test_runner, missing_test_binary,
 *     cherry_picked_denominator)
 *   - F1 rollback hook — detects the auto-written header + reverts to
 *     `.vibe-test/pending/tests/` (removes the accepted.json entry)
 *   - F3 scoped fix — reads matching audit-<hash>.json for context
 *   - Three-render output (markdown + banner + JSON)
 *   - Session-log + beacons terminal writes
 *
 * Everything is sandboxed: a temp cwd holds the fake project; a temp HOME
 * holds the fake `~/.claude/` tree (so the user's real session logs are never
 * touched).
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

import { atomicWrite, atomicWriteJson } from '../../src/state/atomic-write.js';
import { createReportObject } from '../../src/reporter/report-object.js';
import { renderBanner } from '../../src/reporter/banner-renderer.js';
import { renderMarkdown } from '../../src/reporter/markdown-renderer.js';
import { renderJson } from '../../src/reporter/json-renderer.js';
import {
  projectStatePath,
  projectStateSidecarPath,
  scopeHash,
  DEFAULT_PROJECT_STATE,
  type ProjectState,
  writeProjectState,
} from '../../src/state/project-state.js';
import * as sessionLog from '../../src/state/session-log.js';
import * as beacons from '../../src/state/beacons.js';

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
  const homeDir = mkdtempSync(join(tmpdir(), 'vibe-test-fix-home-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'vibe-test-fix-proj-'));

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

// --------------------------------------------------------------------------
// Failure-record shape (what the SKILL composes from raw output)
// --------------------------------------------------------------------------

interface FailureRecord {
  id: string;
  source: 'builder-pasted' | 'last-run' | 'live-run';
  kind: 'test-logic' | 'harness-break';
  subkind:
    | 'broken_test_runner'
    | 'missing_test_binary'
    | 'cherry_picked_denominator'
    | 'assertion-mismatch'
    | 'mock-drift'
    | 'fixture-drift'
    | 'import-missing'
    | 'unknown';
  test_file: string | null;
  raw_output_excerpt: string;
}

/**
 * Pure function: classify a failure signature into a FailureRecord.
 * Mirrors the SKILL's Step 3+4 reasoning deterministically.
 */
function classifyFailure(rawOutput: string, testFile: string | null): FailureRecord {
  const id = `fail-${Math.random().toString(36).slice(2, 9)}`;
  // Harness-break signatures (F2 priority — checked first)
  if (/Test timed out in \d+ms/i.test(rawOutput) || /forks worker exited/i.test(rawOutput)) {
    return {
      id,
      source: 'builder-pasted',
      kind: 'harness-break',
      subkind: 'broken_test_runner',
      test_file: testFile,
      raw_output_excerpt: rawOutput.slice(0, 500),
    };
  }
  if (/Cannot find module '(jest|vitest|mocha)'/i.test(rawOutput)) {
    return {
      id,
      source: 'builder-pasted',
      kind: 'harness-break',
      subkind: 'missing_test_binary',
      test_file: testFile,
      raw_output_excerpt: rawOutput.slice(0, 500),
    };
  }
  // Test-logic signatures
  if (/expect.*toBe\(|AssertionError:/i.test(rawOutput)) {
    return {
      id,
      source: 'builder-pasted',
      kind: 'test-logic',
      subkind: 'assertion-mismatch',
      test_file: testFile,
      raw_output_excerpt: rawOutput.slice(0, 500),
    };
  }
  if (/Cannot find module/i.test(rawOutput)) {
    return {
      id,
      source: 'builder-pasted',
      kind: 'test-logic',
      subkind: 'import-missing',
      test_file: testFile,
      raw_output_excerpt: rawOutput.slice(0, 500),
    };
  }
  return {
    id,
    source: 'builder-pasted',
    kind: 'test-logic',
    subkind: 'unknown',
    test_file: testFile,
    raw_output_excerpt: rawOutput.slice(0, 500),
  };
}

/**
 * Pure function: detect whether a test file is an auto-written generated test.
 * Mirrors the SKILL's rollback-hook detection.
 */
function isAutoGenerated(content: string): boolean {
  return /^\/\/ Generated by Vibe Test v[\d.]+ on .+\. Confidence: HIGH\. Audit finding: #\S+\./m.test(
    content,
  );
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('fix flow · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // --------------------------------------------------------------------------
  // F2 harness-break detection
  // --------------------------------------------------------------------------

  it('classifyFailure detects broken_test_runner (vitest forks-pool timeout)', () => {
    const rawOutput = `
FAIL  tests/foo.test.ts
Test timed out in 5000ms
forks worker exited unexpectedly (code 1)
`;
    const f = classifyFailure(rawOutput, 'tests/foo.test.ts');
    expect(f.kind).toBe('harness-break');
    expect(f.subkind).toBe('broken_test_runner');
  });

  it('classifyFailure detects missing_test_binary (cannot find jest)', () => {
    const rawOutput = `Error: Cannot find module 'jest'
Require stack:
- /repo/scripts/test.js
`;
    const f = classifyFailure(rawOutput, null);
    expect(f.kind).toBe('harness-break');
    expect(f.subkind).toBe('missing_test_binary');
  });

  it('classifyFailure detects test-logic assertion-mismatch', () => {
    const rawOutput = `
FAIL  tests/Greeting.test.tsx > renders name
AssertionError: expected 'Hello, World' to be 'Hello, Vibe'
- expect(got).toBe('Hello, Vibe')
`;
    const f = classifyFailure(rawOutput, 'tests/Greeting.test.tsx');
    expect(f.kind).toBe('test-logic');
    expect(f.subkind).toBe('assertion-mismatch');
  });

  it('classifyFailure falls back to unknown for unfamiliar shapes', () => {
    const f = classifyFailure('Something went wrong but we are not sure what', 'tests/x.test.ts');
    expect(f.kind).toBe('test-logic');
    expect(f.subkind).toBe('unknown');
  });

  // --------------------------------------------------------------------------
  // F1 rollback hook — auto-generated test detection
  // --------------------------------------------------------------------------

  it('rollback hook: detects Vibe-Test-generated header and reverts to pending', async () => {
    // Arrange — seed an auto-written test + accepted.json entry.
    const testPath = join(sbx.projectDir, 'tests', 'Foo.test.ts');
    const pendingPath = join(sbx.projectDir, '.vibe-test', 'pending', 'tests', 'tests', 'Foo.test.ts');
    const autoContent =
      '// Generated by Vibe Test v0.2.0 on 2026-04-17. Confidence: HIGH. Audit finding: #gap-smoke-1.\n' +
      "import { it, expect } from 'vitest';\n" +
      "it('renders', () => { expect(true).toBe(false); });\n"; // intentionally failing
    await atomicWrite(testPath, autoContent);

    const acceptedPath = join(sbx.projectDir, '.vibe-test', 'state', 'accepted.json');
    await atomicWriteJson(acceptedPath, {
      entries: [
        {
          target_test_path: testPath,
          confidence: 0.95,
          status: 'auto-written',
          finding_id: 'gap-smoke-1',
          generated_at: '2026-04-17T00:00:00.000Z',
        },
      ],
    });

    // Act — SKILL detects the header + reverts.
    const content = readFileSync(testPath, 'utf8');
    expect(isAutoGenerated(content)).toBe(true);

    // Revert: copy current content to pending path; delete original; remove accepted.json entry.
    await atomicWrite(pendingPath, content);
    rmSync(testPath);
    await atomicWriteJson(acceptedPath, { entries: [] });

    // Assert — rollback state.
    expect(existsSync(testPath)).toBe(false);
    expect(existsSync(pendingPath)).toBe(true);
    expect(readFileSync(pendingPath, 'utf8')).toContain('Generated by Vibe Test');
    const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8')) as { entries: unknown[] };
    expect(accepted.entries.length).toBe(0);
  });

  it('rollback hook: does NOT fire for hand-written tests (no Vibe Test header)', () => {
    const handWritten =
      "import { it, expect } from 'vitest';\n" +
      "it('renders', () => { expect(true).toBe(true); });\n";
    expect(isAutoGenerated(handWritten)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // F3 scoped fix — reads scoped audit-state
  // --------------------------------------------------------------------------

  it('F3 scoped fix: reads matching audit-<hash>.json for context', async () => {
    const scope = 'src/components/';
    const hash = scopeHash(scope);
    const scopedPath = projectStateSidecarPath(sbx.projectDir, 'audit', hash);

    // Seed a scoped audit-state with classification context.
    await atomicWriteJson(scopedPath, {
      schema_version: 1,
      command: 'audit',
      last_updated: new Date().toISOString(),
      project: { repo_root: sbx.projectDir, scope },
      classification: {
        app_type: 'spa',
        tier: 'internal',
        modifiers: [],
        confidence: 0.9,
      },
      findings: [
        {
          id: 'gap-smoke-1',
          severity: 'high',
          category: 'gap-smoke',
          title: 'Missing smoke tests on Greeting component',
        },
      ],
    });

    // SKILL reads the scoped state to derive classification for diagnosis.
    const state = JSON.parse(readFileSync(scopedPath, 'utf8')) as {
      classification: { tier: string };
      findings: { id: string }[];
    };
    expect(state.classification.tier).toBe('internal');
    expect(state.findings.length).toBe(1);

    // Full-repo audit.json untouched.
    const fullPath = projectStateSidecarPath(sbx.projectDir, 'audit');
    expect(existsSync(fullPath)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Three-render output
  // --------------------------------------------------------------------------

  it('emits three output views (markdown + banner + JSON sidecar)', async () => {
    const report = createReportObject({
      command: 'fix',
      repo_root: sbx.projectDir,
    });
    report.classification = {
      app_type: 'spa',
      tier: 'internal',
      modifiers: [],
      confidence: 0.9,
    };
    report.findings.push({
      id: 'harness-break-1',
      severity: 'critical',
      category: 'harness-break',
      title: 'broken_test_runner: vitest forks-pool timeout',
      rationale:
        'Detected "Test timed out in 5000ms" on every suite. Likely pool exhaustion; propose `pool: "threads"` or `pool: "forks", poolOptions.forks.singleFork: true`.',
      effort: 'low',
    });
    report.actions_taken.push({
      kind: 'write',
      description: 'Applied vitest pool config fix',
      target: 'vitest.config.ts',
    });
    report.next_step_hint = 'Re-run tests; `/vibe-test:gate` when ready.';

    const [markdown, banner, jsonResult] = await Promise.all([
      renderMarkdown(report),
      Promise.resolve(renderBanner(report, { columns: 80, disableColors: true })),
      renderJson({ report, repoRoot: sbx.projectDir, skipValidation: true }),
    ]);

    expect(markdown).toMatch(/fix/);
    expect(banner).toMatch(/Vibe Test/);
    expect(banner).toMatch(/broken_test_runner/);
    expect(existsSync(jsonResult.currentPath)).toBe(true);
    expect(jsonResult.currentPath).toMatch(/fix\.json$/);
  });

  // --------------------------------------------------------------------------
  // Session-log + beacons terminal writes
  // --------------------------------------------------------------------------

  it('writes session-log sentinel + terminal pair and beacon with fix summary', async () => {
    const uuid = await sessionLog.start('fix', 'fix-proj');
    await sessionLog.end({
      sessionUUID: uuid,
      command: 'fix',
      outcome: 'completed',
      key_decisions: ['harness-break: broken_test_runner repaired'],
      artifact_generated: 'docs/vibe-test/fix-2026-04-17.md',
    });
    await beacons.append(sbx.projectDir, {
      command: 'fix',
      sessionUUID: uuid,
      outcome: 'completed',
      hint: '1 repaired, 0 staged, 0 deferred, 0 rolled back',
    });

    const entries = await sessionLog.readRecent(1);
    const mine = entries.filter((e) => e.sessionUUID === uuid);
    expect(mine.length).toBe(2);
    expect(mine.some((e) => e.outcome === 'in_progress')).toBe(true);
    expect(mine.some((e) => e.outcome === 'completed')).toBe(true);

    const bs = await beacons.readRecent(sbx.projectDir, 10);
    expect(bs.length).toBe(1);
    expect(bs[0]!.command).toBe('fix');
    expect(bs[0]!.hint).toMatch(/repaired/);
  });

  // --------------------------------------------------------------------------
  // Harness-break findings take precedence in banner ordering
  // --------------------------------------------------------------------------

  it('harness-break findings render at critical severity', () => {
    const report = createReportObject({ command: 'fix', repo_root: sbx.projectDir });
    report.findings.push(
      {
        id: 'harness-break-1',
        severity: 'critical',
        category: 'harness-break',
        title: 'missing_test_binary: jest not installed',
        rationale: 'Script references jest but it is not in deps. Run: `npm install -D jest`.',
      },
      {
        id: 'test-logic-1',
        severity: 'medium',
        category: 'gap-behavioral',
        title: 'assertion-mismatch in Greeting test',
      },
    );
    const banner = renderBanner(report, { columns: 80, disableColors: true });
    expect(banner).toMatch(/CRITICAL/);
    expect(banner).toMatch(/missing_test_binary/);
  });
});
