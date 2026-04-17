/**
 * Router flow integration test — checklist item #4.
 *
 * The router SKILL is agent-executed markdown; this test exercises the
 * composable TypeScript primitives the SKILL invokes:
 *
 *   - Pattern #15 version resolution  (installed_plugins.json → active-path.json
 *                                       → plugin.json fallback)
 *   - Pattern #16 shaping prereq      (.vibe-test/state.json presence detection)
 *   - Banner composition              (via reporter + createReportObject)
 *   - Session-log append              (sentinel + terminal entries paired by
 *                                       sessionUUID)
 *   - Complement detection            (anchored registry + availableSkills)
 *
 * Everything is sandboxed: a temp cwd holds the fake project; a temp HOME
 * holds the fake `~/.claude/` tree (so the user's real builder.json and real
 * sessions JSONL are NEVER touched).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createReportObject } from '../../src/reporter/report-object.js';
import { renderBanner } from '../../src/reporter/banner-renderer.js';
import {
  parseAnchoredSync,
  type AnchoredEntry,
} from '../../src/composition/anchored-registry.js';
import { detectComplements } from '../../src/composition/detect-complements.js';
import * as sessionLog from '../../src/state/session-log.js';
import { projectStatePath } from '../../src/state/project-state.js';

// --------------------------------------------------------------------------
// Shared sandbox helpers
// --------------------------------------------------------------------------

interface Sandbox {
  homeDir: string; // fake ~/.claude tree root
  projectDir: string; // fake cwd with / without .vibe-test/state.json
  cleanup: () => void;
  originalHome?: string;
  originalUserProfile?: string;
}

function createSandbox(): Sandbox {
  const homeDir = mkdtempSync(join(tmpdir(), 'vibe-test-router-home-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'vibe-test-router-proj-'));

  // Seed the fake Claude plugin cache layout.
  const claudeDir = join(homeDir, '.claude');
  mkdirSync(join(claudeDir, 'plugins'), { recursive: true });
  mkdirSync(join(claudeDir, 'profiles'), { recursive: true });

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
 * Pattern #15 version resolution — the router's first-step logic as a pure
 * function. Returns a `ResolvedVersion` so the test can assert on the path
 * the SKILL would take.
 */
interface ResolvedVersion {
  version: string;
  source: 'installed_plugins.json' | 'active-path.json' | 'plugin.json' | 'unknown';
}

function resolveVersion(opts: {
  installedPluginsPath?: string;
  activePathJsonPath?: string;
  pluginJsonPath?: string;
}): ResolvedVersion {
  // 1. installed_plugins.json
  if (opts.installedPluginsPath && existsSync(opts.installedPluginsPath)) {
    try {
      const raw = JSON.parse(readFileSync(opts.installedPluginsPath, 'utf8')) as Record<
        string,
        { version?: string } | undefined
      >;
      const entry = raw['vibe-test'];
      if (entry && typeof entry.version === 'string') {
        return { version: entry.version, source: 'installed_plugins.json' };
      }
    } catch {
      // fall through
    }
  }
  // 2. active-path.json
  if (opts.activePathJsonPath && existsSync(opts.activePathJsonPath)) {
    try {
      const raw = JSON.parse(readFileSync(opts.activePathJsonPath, 'utf8')) as {
        version?: string;
      };
      if (typeof raw.version === 'string') {
        return { version: raw.version, source: 'active-path.json' };
      }
    } catch {
      // fall through
    }
  }
  // 3. plugin.json
  if (opts.pluginJsonPath && existsSync(opts.pluginJsonPath)) {
    try {
      const raw = JSON.parse(readFileSync(opts.pluginJsonPath, 'utf8')) as {
        version?: string;
      };
      if (typeof raw.version === 'string') {
        return { version: raw.version, source: 'plugin.json' };
      }
    } catch {
      // fall through
    }
  }
  return { version: 'unknown', source: 'unknown' };
}

/**
 * Pattern #16 shaping prereq — returning vs first-run based on
 * `.vibe-test/state.json` presence (and parseability).
 */
function detectRunState(projectDir: string): 'first-run' | 'returning-builder' | 'first-run-stale' {
  const statePath = projectStatePath(projectDir);
  if (!existsSync(statePath)) return 'first-run';
  try {
    JSON.parse(readFileSync(statePath, 'utf8'));
    return 'returning-builder';
  } catch {
    return 'first-run-stale';
  }
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('router flow · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // ------------------------------------------------------------------------
  // Pattern #15 — Version resolution
  // ------------------------------------------------------------------------

  describe('version resolution (Pattern #15)', () => {
    it('resolves from installed_plugins.json when present', () => {
      const installed = join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json');
      writeFileSync(
        installed,
        JSON.stringify({
          'vibe-test': { version: '0.2.0', path: '~/.claude/plugins/cache/vibe-test/0.2.0' },
        }),
      );

      const resolved = resolveVersion({
        installedPluginsPath: installed,
        activePathJsonPath: undefined,
        pluginJsonPath: undefined,
      });

      expect(resolved.source).toBe('installed_plugins.json');
      expect(resolved.version).toBe('0.2.0');
    });

    it('falls back to active-path.json when installed_plugins.json is missing', () => {
      const activePath = join(sbx.projectDir, 'active-path.json');
      writeFileSync(
        activePath,
        JSON.stringify({
          schema_version: 1,
          plugin: 'vibe-test',
          version: '0.2.1',
        }),
      );

      const resolved = resolveVersion({
        installedPluginsPath: join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json'),
        activePathJsonPath: activePath,
        pluginJsonPath: undefined,
      });

      expect(resolved.source).toBe('active-path.json');
      expect(resolved.version).toBe('0.2.1');
    });

    it('falls back to plugin.json when both upstream sources are missing', () => {
      const pluginJson = join(sbx.projectDir, 'plugin.json');
      writeFileSync(pluginJson, JSON.stringify({ name: 'vibe-test', version: '0.2.2' }));

      const resolved = resolveVersion({
        installedPluginsPath: join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json'),
        activePathJsonPath: join(sbx.projectDir, 'active-path.json'),
        pluginJsonPath: pluginJson,
      });

      expect(resolved.source).toBe('plugin.json');
      expect(resolved.version).toBe('0.2.2');
    });

    it('returns "unknown" source when everything is missing — never throws', () => {
      const resolved = resolveVersion({
        installedPluginsPath: join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json'),
        activePathJsonPath: join(sbx.projectDir, 'active-path.json'),
        pluginJsonPath: join(sbx.projectDir, 'plugin.json'),
      });
      expect(resolved.source).toBe('unknown');
      expect(resolved.version).toBe('unknown');
    });

    it('gracefully falls through when installed_plugins.json lacks a vibe-test entry', () => {
      const installed = join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json');
      writeFileSync(
        installed,
        JSON.stringify({ 'another-plugin': { version: '1.2.3' } }),
      );
      const activePath = join(sbx.projectDir, 'active-path.json');
      writeFileSync(activePath, JSON.stringify({ version: '0.2.9' }));

      const resolved = resolveVersion({
        installedPluginsPath: installed,
        activePathJsonPath: activePath,
      });
      expect(resolved.source).toBe('active-path.json');
      expect(resolved.version).toBe('0.2.9');
    });
  });

  // ------------------------------------------------------------------------
  // Pattern #16 — Shaping prereq (first-run vs returning-builder)
  // ------------------------------------------------------------------------

  describe('first-run vs returning-builder (Pattern #16)', () => {
    it('detects first-run when .vibe-test/state.json is absent', () => {
      expect(detectRunState(sbx.projectDir)).toBe('first-run');
    });

    it('detects returning-builder when .vibe-test/state.json exists and parses', () => {
      const stateDir = join(sbx.projectDir, '.vibe-test');
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        join(stateDir, 'state.json'),
        JSON.stringify({
          schema_version: 1,
          last_updated: '2026-04-17T14:00:00Z',
          classification: {
            app_type: 'spa-api',
            tier: 'public-facing',
            modifiers: [],
            confidence: 0.85,
          },
          inventory: null,
          coverage_snapshot: {
            current_score: 27.5,
            target_score: 70,
            per_level: { smoke: 55, behavioral: 30, edge: 10, integration: 5, performance: 0 },
            measured_at: '2026-04-17T14:00:00Z',
          },
          generated_tests: [],
          rejected_tests: [],
          framework: 'vitest',
          ci_integrated: false,
          covered_surfaces_written_at: null,
        }),
      );
      expect(detectRunState(sbx.projectDir)).toBe('returning-builder');
    });

    it('degrades gracefully when state.json is unparseable (treat as first-run-stale, never throw)', () => {
      const stateDir = join(sbx.projectDir, '.vibe-test');
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(join(stateDir, 'state.json'), '{ garbage');
      expect(detectRunState(sbx.projectDir)).toBe('first-run-stale');
    });
  });

  // ------------------------------------------------------------------------
  // Banner output shape (first-run vs returning differ; under 40 lines)
  // ------------------------------------------------------------------------

  describe('banner output shape', () => {
    it('produces a first-run banner under 40 lines and does NOT include a "last X" summary', () => {
      // First-run: no classification, no score attached — matches the spec.
      const report = createReportObject({
        command: 'posture', // router isn't a ReportObject command, but the
        // reporter interface is shared; the banner renders the same way.
        repo_root: sbx.projectDir,
      });
      report.next_step_hint =
        'Where do you want to start? Most builders start with /vibe-test:audit.';

      const out = renderBanner(report, { columns: 80, disableColors: true });
      const lines = out.split('\n');
      expect(lines.length).toBeLessThanOrEqual(40);
      expect(out).toMatch(/Vibe Test/);
      expect(out).toMatch(/Next step/);
      // No "Last X" summary on first-run
      expect(out).not.toMatch(/Last audit:/);
      expect(out).not.toMatch(/last generate:/i);
    });

    it('returning-builder banner reflects prior state in the classification + score sections', () => {
      const report = createReportObject({
        command: 'posture',
        repo_root: sbx.projectDir,
      });
      report.classification = {
        app_type: 'spa-api',
        tier: 'public-facing',
        modifiers: ['customer-facing'],
        confidence: 0.85,
      };
      report.score = {
        current: 27.5,
        target: 70,
        per_level: { smoke: 55, behavioral: 30, edge: 10, integration: 5, performance: 0 },
      };
      report.next_step_hint =
        'Ready to generate for the frontend gap? Or check posture first?';

      const out = renderBanner(report, { columns: 80, disableColors: true });
      expect(out).toMatch(/Vibe Test/);
      expect(out).toMatch(/Classification/);
      expect(out).toMatch(/spa-api/);
      expect(out).toMatch(/public-facing/);
      expect(out).toMatch(/Score/);
      // Below target → BELOW line appears
      expect(out).toMatch(/BELOW/);
    });

    it('banner output differs between first-run and returning-builder shapes', () => {
      const firstRun = createReportObject({ command: 'posture', repo_root: sbx.projectDir });
      firstRun.next_step_hint = 'Where do you want to start?';
      const firstOut = renderBanner(firstRun, { columns: 80, disableColors: true });

      const returning = createReportObject({ command: 'posture', repo_root: sbx.projectDir });
      returning.classification = {
        app_type: 'spa-api',
        tier: 'public-facing',
        modifiers: [],
        confidence: 0.85,
      };
      returning.score = {
        current: 27.5,
        target: 70,
        per_level: { smoke: 55, behavioral: 30, edge: 10, integration: 5, performance: 0 },
      };
      returning.next_step_hint = 'Ready to generate for the frontend gap?';
      const returningOut = renderBanner(returning, { columns: 80, disableColors: true });

      expect(firstOut).not.toEqual(returningOut);
      // Classification section only present on the returning-builder shape
      expect(firstOut).toMatch(/\(no classification attached\)/);
      expect(returningOut).toMatch(/spa-api/);
    });
  });

  // ------------------------------------------------------------------------
  // Session-log append (sentinel + terminal paired by sessionUUID)
  // ------------------------------------------------------------------------

  describe('session log append', () => {
    it('writes a sentinel entry to the sandboxed sessions dir with outcome=in_progress', async () => {
      const sessionUUID = await sessionLog.start('router', 'my-app');
      expect(sessionUUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // The file should now exist under the sandboxed home.
      const file = sessionLog.todaysSessionFile();
      expect(file).toContain(sbx.homeDir);
      expect(existsSync(file)).toBe(true);

      const content = readFileSync(file, 'utf8').trim().split('\n');
      expect(content).toHaveLength(1);
      const entry = JSON.parse(content[0]!) as Record<string, unknown>;
      expect(entry.command).toBe('router');
      expect(entry.outcome).toBe('in_progress');
      expect(entry.sessionUUID).toBe(sessionUUID);
      expect(entry.plugin).toBe('vibe-test');
      expect(entry.project).toBe('my-app');
    });

    it('pairs sentinel + terminal entries by sessionUUID when router completes', async () => {
      const sessionUUID = await sessionLog.start('router', 'my-app');
      await sessionLog.end({
        sessionUUID,
        command: 'router',
        outcome: 'completed',
        key_decisions: ['first-run detected', 'version resolved via installed_plugins.json'],
        complements_invoked: [],
        artifact_generated: null,
      });

      const file = sessionLog.todaysSessionFile();
      const lines = readFileSync(file, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(2);
      const sentinel = JSON.parse(lines[0]!) as Record<string, unknown>;
      const terminal = JSON.parse(lines[1]!) as Record<string, unknown>;

      expect(sentinel.sessionUUID).toBe(sessionUUID);
      expect(terminal.sessionUUID).toBe(sessionUUID);
      expect(sentinel.outcome).toBe('in_progress');
      expect(terminal.outcome).toBe('completed');
      // key_decisions only on terminal
      expect(sentinel.key_decisions).toBeUndefined();
      expect(terminal.key_decisions).toEqual([
        'first-run detected',
        'version resolved via installed_plugins.json',
      ]);
    });

    it('session-log write failure is swallowed — router never blocks on instrumentation', async () => {
      // Point HOME at a bogus location with an invalid character to force a write error.
      // Then verify start/end don't throw and callers proceed.
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;
      // Invalid path on Windows contains `:` in the middle of a segment — but
      // since Node may tolerate it, we fall back to a path with a null byte which
      // is reliably rejected by the fs layer on every platform.
      process.env.HOME = '\u0000invalid\u0000';
      process.env.USERPROFILE = '\u0000invalid\u0000';

      let threw = false;
      try {
        const uuid = await sessionLog.start('router', null);
        expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
        await sessionLog.end({ sessionUUID: uuid, command: 'router', outcome: 'completed' });
      } catch {
        threw = true;
      } finally {
        if (originalHome === undefined) delete process.env.HOME;
        else process.env.HOME = originalHome;
        if (originalUserProfile === undefined) delete process.env.USERPROFILE;
        else process.env.USERPROFILE = originalUserProfile;
      }
      expect(threw).toBe(false);
    });
  });

  // ------------------------------------------------------------------------
  // Complement detection — router filter, teaser-only behavior
  // ------------------------------------------------------------------------

  describe('complement detection (Pattern #13)', () => {
    const ANCHORED_YAML = `
- complement: superpowers:test-driven-development
  applies_to:
    - generate
  phase: new-feature test generation
  deferral_contract: TDD drives new-feature tests.

- complement: playwright
  applies_to:
    - generate
    - audit
  phase: E2E
  deferral_contract: Playwright drives E2E.

- complement: vibe-doc
  applies_to:
    - audit
    - generate
  phase: TESTING.md composition
  deferral_contract: Co-author.
`;

    it('no anchored entry has applies_to:[router] — router filter returns no matches', () => {
      const anchored = parseAnchoredSync(ANCHORED_YAML);
      expect(anchored.length).toBeGreaterThan(0);

      const map = detectComplements({
        availableSkills: ['superpowers:test-driven-development', 'vibe-doc:generate', 'playwright'],
        anchored,
        currentCommand: 'router',
      });

      // `router` filter strips entries whose applies_to doesn't include 'router'.
      expect(map.size).toBe(0);
    });

    it('cross-filter check: same available skills DO match under generate filter', () => {
      const anchored = parseAnchoredSync(ANCHORED_YAML);
      const map = detectComplements({
        availableSkills: ['superpowers:test-driven-development', 'vibe-doc:generate', 'playwright'],
        anchored,
        currentCommand: 'generate',
      });

      expect(map.get('superpowers:test-driven-development')?.available).toBe(true);
      expect(map.get('playwright')?.available).toBe(true);
      expect(map.get('vibe-doc')?.available).toBe(true);
    });

    it('teaser-mode: the router may still surface a "plays well with" line by checking anchored availability across all commands', () => {
      const anchored = parseAnchoredSync(ANCHORED_YAML);

      // Unfiltered: the router's teaser checks whether ANY anchored complement
      // is present in the available-skills list, without the router filter.
      const availableSkills = ['vibe-doc:generate', 'unrelated-plugin'];
      const anyPresent = anchored.some((entry: AnchoredEntry) =>
        availableSkills.some((s) => s === entry.complement || s.startsWith(entry.complement + ':')),
      );
      expect(anyPresent).toBe(true);

      const noMatchSkills = ['unrelated-plugin', 'another-random'];
      const anyPresent2 = anchored.some((entry: AnchoredEntry) =>
        noMatchSkills.some((s) => s === entry.complement || s.startsWith(entry.complement + ':')),
      );
      expect(anyPresent2).toBe(false);
    });
  });

  // ------------------------------------------------------------------------
  // End-to-end: full router flow against a first-run fixture
  // ------------------------------------------------------------------------

  describe('end-to-end router invocation', () => {
    it('first-run scenario: resolves version, detects first-run, writes paired session entries, renders banner', async () => {
      // Arrange: seed installed_plugins.json (Pattern #15 primary source).
      const installed = join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json');
      writeFileSync(
        installed,
        JSON.stringify({ 'vibe-test': { version: '0.2.0' } }),
      );
      // No .vibe-test/state.json in the project → first-run.

      // Act: version resolution
      const resolved = resolveVersion({
        installedPluginsPath: installed,
        activePathJsonPath: undefined,
      });
      expect(resolved.source).toBe('installed_plugins.json');
      expect(resolved.version).toBe('0.2.0');

      // Act: state detection
      const runState = detectRunState(sbx.projectDir);
      expect(runState).toBe('first-run');

      // Act: session-log start + end
      const sessionUUID = await sessionLog.start('router', 'router-e2e-first-run', {
        pluginVersion: resolved.version,
      });
      await sessionLog.end(
        {
          sessionUUID,
          command: 'router',
          outcome: 'completed',
          key_decisions: [
            'first-run detected',
            'version resolved via installed_plugins.json',
          ],
          complements_invoked: [],
          artifact_generated: null,
        },
        { pluginVersion: resolved.version },
      );

      // Act: banner render (first-run shape — no classification, no score)
      const report = createReportObject({
        command: 'posture',
        plugin_version: resolved.version,
        repo_root: sbx.projectDir,
      });
      report.next_step_hint =
        'Where do you want to start? Most builders start with /vibe-test:audit.';
      const banner = renderBanner(report, { columns: 80, disableColors: true });

      // Assert: banner contents
      expect(banner).toMatch(/Vibe Test/);
      expect(banner.split('\n').length).toBeLessThanOrEqual(40);

      // Assert: paired session entries written to sandboxed home
      const file = sessionLog.todaysSessionFile();
      expect(file).toContain(sbx.homeDir);
      const lines = readFileSync(file, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(2);
      const sentinel = JSON.parse(lines[0]!) as Record<string, unknown>;
      const terminal = JSON.parse(lines[1]!) as Record<string, unknown>;
      expect(sentinel.sessionUUID).toBe(sessionUUID);
      expect(terminal.sessionUUID).toBe(sessionUUID);
      expect(terminal.outcome).toBe('completed');
      expect(terminal.plugin_version).toBe('0.2.0');
    });

    it('returning-builder scenario: detects prior state, banner differs, session pair written', async () => {
      // Arrange: seed returning-builder state.
      const installed = join(sbx.homeDir, '.claude', 'plugins', 'installed_plugins.json');
      writeFileSync(
        installed,
        JSON.stringify({ 'vibe-test': { version: '0.2.0' } }),
      );
      const stateDir = join(sbx.projectDir, '.vibe-test');
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        join(stateDir, 'state.json'),
        JSON.stringify({
          schema_version: 1,
          last_updated: '2026-04-14T14:00:00Z',
          classification: {
            app_type: 'spa-api',
            tier: 'public-facing',
            modifiers: [],
            confidence: 0.85,
          },
          inventory: null,
          coverage_snapshot: {
            current_score: 27.5,
            target_score: 70,
            per_level: {
              smoke: 55,
              behavioral: 30,
              edge: 10,
              integration: 5,
              performance: 0,
            },
            measured_at: '2026-04-14T14:00:00Z',
          },
          generated_tests: [],
          rejected_tests: [],
          framework: 'vitest',
          ci_integrated: false,
          covered_surfaces_written_at: null,
        }),
      );

      // Act + assert
      const runState = detectRunState(sbx.projectDir);
      expect(runState).toBe('returning-builder');

      const sessionUUID = await sessionLog.start('router', 'router-e2e-returning');
      await sessionLog.end({
        sessionUUID,
        command: 'router',
        outcome: 'completed',
        key_decisions: ['returning-builder detected'],
      });

      const lines = readFileSync(sessionLog.todaysSessionFile(), 'utf8').trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      const terminal = JSON.parse(lines[lines.length - 1]!) as Record<string, unknown>;
      expect(terminal.key_decisions).toEqual(['returning-builder detected']);
    });
  });
});
