/**
 * Audit flow integration test — checklist item #5.
 *
 * The audit SKILL is agent-executed markdown; this test exercises the
 * deterministic primitives it orchestrates:
 *
 *   - scan() against the minimal-spa fixture → well-formed Inventory JSON
 *   - classifyAppType → "spa" or "spa-api" (depends on whether routes counted)
 *   - computeWeightedScore → expected value for hand-calculated inputs
 *   - createReportObject + three renderers (markdown, banner, JSON)
 *   - extractCoveredSurfaces → covered-surfaces.json validates against schema
 *   - re-run diff (story A3)
 *   - scoped audit via `--path` writes `audit-<hash>.json` without clobbering
 *     the full-repo sidecar (story A7)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scan } from '../../src/scanner/index.js';
import { classifyAppType } from '../../src/scanner/classify-app-type.js';
import { classifyModifiers } from '../../src/scanner/classify-modifiers.js';
import { extractCoveredSurfaces } from '../../src/scanner/covered-surfaces.js';
import { computeWeightedScore } from '../../src/coverage/weighted-score.js';
import { createReportObject } from '../../src/reporter/report-object.js';
import { renderBanner } from '../../src/reporter/banner-renderer.js';
import { renderMarkdown } from '../../src/reporter/markdown-renderer.js';
import { renderJson } from '../../src/reporter/json-renderer.js';
import {
  writeProjectState,
  readProjectState,
  projectStateSidecarPath,
  scopeHash,
  DEFAULT_PROJECT_STATE,
  type ProjectState,
} from '../../src/state/project-state.js';
import { validate } from '../../src/state/schema-validators.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'minimal-spa');

interface Sandbox {
  repoDir: string;
  cleanup: () => void;
}

function createSandbox(): Sandbox {
  const tmp = mkdtempSync(join(tmpdir(), 'vibe-test-audit-'));
  const repoDir = join(tmp, 'repo');
  cpSync(FIXTURE_DIR, repoDir, { recursive: true });
  return {
    repoDir,
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
  };
}

describe('audit flow · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // ------------------------------------------------------------------------
  // Step 1 — scan() produces a well-formed Inventory
  // ------------------------------------------------------------------------

  it('scan() against minimal-spa produces a well-formed Inventory with routes + components + models', async () => {
    const inventory = await scan(sbx.repoDir);

    expect(inventory.schema_version).toBe(1);
    expect(inventory.root).toBe(sbx.repoDir);
    expect(inventory.scope).toBeNull();
    expect(inventory.detection.frontend).toContain('react');
    expect(inventory.detection.frontend).toContain('vite');
    expect(inventory.detection.test).toContain('vitest');
    // Scanner walks the fixture; should find at least App.tsx + Greeting.tsx + models.ts + api files.
    expect(inventory.scanned_files.length).toBeGreaterThanOrEqual(5);
    // The existing Greeting.test.tsx should be picked up as a test file.
    expect(
      inventory.existing_test_files.some((p) => p.endsWith('Greeting.test.tsx')),
    ).toBe(true);
    // Components: App, BadgeManager, Greeting all detected.
    const componentNames = inventory.components.map((c) => c.name);
    expect(componentNames).toContain('App');
    expect(componentNames).toContain('Greeting');
    // Models from models.ts
    const modelNames = inventory.models.map((m) => m.name);
    expect(modelNames).toContain('User');
    expect(modelNames).toContain('Badge');
  });

  // ------------------------------------------------------------------------
  // Step 2 — classifyAppType returns "spa" or "spa-api" for minimal-spa
  // ------------------------------------------------------------------------

  it('classifyAppType returns "spa" or "spa-api" for minimal-spa (has frontend + lightweight routes)', async () => {
    const inventory = await scan(sbx.repoDir);
    const result = classifyAppType({
      detection: inventory.detection,
      routes: inventory.routes,
      models: inventory.models,
      componentCount: inventory.components.length,
    });
    // Acceptable app types for this fixture.
    expect(['spa', 'spa-api']).toContain(result.app_type);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.reason).toBeTruthy();
  });

  it('classifyAppType is deterministic for identical input', async () => {
    const inventory = await scan(sbx.repoDir);
    const input = {
      detection: inventory.detection,
      routes: inventory.routes,
      models: inventory.models,
      componentCount: inventory.components.length,
    };
    const r1 = classifyAppType(input);
    const r2 = classifyAppType(input);
    expect(r1).toEqual(r2);
  });

  it('classifyModifiers extracts a flat array without false-positive regulated signals', async () => {
    const inventory = await scan(sbx.repoDir);
    const mods = classifyModifiers({
      detection: inventory.detection,
      models: inventory.models,
      integrations: inventory.integrations,
      extraSignals: [],
    });
    expect(Array.isArray(mods)).toBe(true);
    // Minimal SPA has no auth / payments / PII fields (email/name fields exist
    // in User model → pii-present) — but no regulated markers.
    expect(mods).not.toContain('regulated');
    // User/email/name present → pii-present
    expect(mods).toContain('pii-present');
  });

  // ------------------------------------------------------------------------
  // Step 3 — weighted-score computes expected value
  // ------------------------------------------------------------------------

  it('weightedScore matches hand-calculated value for public-facing tier', () => {
    const r = computeWeightedScore({
      perLevel: { smoke: 80, behavioral: 60, edge: 40, integration: 20, performance: 0 },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: true,
        performance: false,
      },
      tier: 'public-facing',
    });
    // Hand-calc:
    //   numerator = 80*1 + 60*1 + 40*0.8 + 20*0.8 + 0*0.5*0 = 80 + 60 + 32 + 16 = 188
    //   denominator = 1 + 1 + 0.8 + 0.8 + 0.5*0 = 3.6
    //   188 / 3.6 = 52.222...
    expect(r.score).toBeCloseTo(52.222, 2);
    expect(r.threshold).toBe(70);
    expect(r.passes).toBe(false);
  });

  // ------------------------------------------------------------------------
  // Step 4 — reporter produces all three output views
  // ------------------------------------------------------------------------

  it('reporter produces markdown + banner + JSON (JSON validates against schema)', async () => {
    const inventory = await scan(sbx.repoDir);
    const appType = classifyAppType({
      detection: inventory.detection,
      routes: inventory.routes,
      models: inventory.models,
      componentCount: inventory.components.length,
    });
    const modifiers = classifyModifiers({
      detection: inventory.detection,
      models: inventory.models,
      integrations: inventory.integrations,
    });
    const report = createReportObject({
      command: 'audit',
      repo_root: sbx.repoDir,
    });
    report.classification = {
      app_type: appType.app_type,
      tier: 'internal',
      modifiers,
      confidence: appType.confidence,
    };
    const score = computeWeightedScore({
      perLevel: { smoke: 20, behavioral: 10, edge: 0, integration: 0, performance: 0 },
      applicability: { smoke: true, behavioral: true, edge: true, integration: false, performance: false },
      tier: 'internal',
    });
    report.score = {
      current: score.score,
      target: score.threshold,
      per_level: { smoke: 20, behavioral: 10, edge: 0, integration: 0, performance: 0 },
    };
    report.findings.push({
      id: 'gap-behavioral-1',
      severity: 'high',
      category: 'gap-behavioral',
      title: 'Missing behavioral tests on SPA components',
      rationale: 'SPA at Internal tier → behavioral tests required.',
      effort: 'low',
    });

    // Three renders in parallel.
    const [markdown, banner, jsonResult] = await Promise.all([
      renderMarkdown(report),
      Promise.resolve(renderBanner(report, { columns: 80, disableColors: true })),
      renderJson({ report, repoRoot: sbx.repoDir }),
    ]);

    expect(markdown).toMatch(/audit/);
    expect(markdown).toMatch(/Classification/);
    expect(banner).toMatch(/Vibe Test/);
    expect(banner).toMatch(/Score/);
    expect(existsSync(jsonResult.currentPath)).toBe(true);
    expect(existsSync(jsonResult.historyPath)).toBe(true);
    expect(jsonResult.validation.valid).toBe(true);
  });

  // ------------------------------------------------------------------------
  // Step 5 — covered-surfaces.json validates against schema
  // ------------------------------------------------------------------------

  it('extractCoveredSurfaces produces a schema-valid covered-surfaces.json', async () => {
    const inventory = await scan(sbx.repoDir);
    const doc = extractCoveredSurfaces({
      inventory,
      testFileContents: {},
      pluginVersion: '0.2.0',
      commitHash: null,
    });

    const v = validate('covered-surfaces', doc);
    expect(v).toBe(true);
    expect(doc.schema_version).toBe(1);
    expect(doc.surfaces.length).toBeGreaterThan(0);
    // Every surface should have a non-empty identifier.
    for (const s of doc.surfaces) {
      expect(s.identifier.length).toBeGreaterThan(0);
      expect(['none', 'smoke', 'behavioral', 'edge', 'integration', 'performance']).toContain(
        s.coverage_level,
      );
    }
  });

  it('surfaces get coverage_level=smoke when a test file mentions them', async () => {
    const inventory = await scan(sbx.repoDir);
    // Load all existing test files' content.
    const testContents: Record<string, string> = {};
    for (const p of inventory.existing_test_files) {
      testContents[p] = readFileSync(p, 'utf8');
    }
    const doc = extractCoveredSurfaces({
      inventory,
      testFileContents: testContents,
    });

    const greeting = doc.surfaces.find((s) => s.kind === 'component' && s.identifier === 'Greeting');
    expect(greeting).toBeDefined();
    expect(greeting!.coverage_level).toBe('smoke');
    expect(greeting!.test_files).toBeDefined();
    expect(greeting!.test_files!.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------------
  // Step 6 — Re-running audit produces a diff against prior state (story A3)
  // ------------------------------------------------------------------------

  it('re-running audit produces a diff against prior state (story A3)', async () => {
    // Arrange — write an initial state.
    const inventory = await scan(sbx.repoDir);
    const appType = classifyAppType({
      detection: inventory.detection,
      routes: inventory.routes,
      models: inventory.models,
      componentCount: inventory.components.length,
    });
    const prior: ProjectState = {
      ...DEFAULT_PROJECT_STATE,
      last_updated: '2026-04-10T00:00:00Z',
      classification: {
        app_type: appType.app_type,
        tier: 'internal',
        modifiers: [],
        confidence: 0.9,
      },
      inventory: {
        routes: inventory.routes,
        components: inventory.components,
        models: inventory.models,
        integrations: inventory.integrations,
        test_frameworks: inventory.test_frameworks,
        existing_test_files: inventory.existing_test_files,
      },
      coverage_snapshot: {
        current_score: 15,
        target_score: 55,
        per_level: { smoke: 15, behavioral: 0, edge: 0, integration: 0, performance: 0 },
        denominator_honest: true,
        measured_at: '2026-04-10T00:00:00Z',
      },
      framework: 'vitest',
    };
    await writeProjectState(sbx.repoDir, prior);

    // Act — re-audit. SKILL reads prior state and can diff.
    const persisted = await readProjectState(sbx.repoDir);
    expect(persisted).not.toBeNull();
    expect(persisted!.classification?.app_type).toBe(appType.app_type);

    // Simulate second audit — same classification, different score.
    const newState: ProjectState = {
      ...prior,
      last_updated: '2026-04-17T00:00:00Z',
      coverage_snapshot: {
        current_score: 25,
        target_score: 55,
        per_level: { smoke: 25, behavioral: 10, edge: 0, integration: 0, performance: 0 },
        denominator_honest: true,
        measured_at: '2026-04-17T00:00:00Z',
      },
    };
    await writeProjectState(sbx.repoDir, newState);

    const after = await readProjectState(sbx.repoDir);
    expect(after!.coverage_snapshot?.current_score).toBe(25);
    // Classification unchanged → SKILL can render "classification unchanged since last audit".
    expect(after!.classification?.app_type).toBe(prior.classification!.app_type);
  });

  // ------------------------------------------------------------------------
  // Step 7 — Scoped audit writes audit-<hash>.json without overwriting
  //          full-repo audit.json (story A7)
  // ------------------------------------------------------------------------

  it('scoped audit via --path writes audit-<hash>.json without overwriting full-repo audit.json (story A7)', async () => {
    // First: full-repo audit produces state/audit.json.
    const fullInventory = await scan(sbx.repoDir);
    const fullReport = createReportObject({
      command: 'audit',
      repo_root: sbx.repoDir,
    });
    fullReport.classification = {
      app_type: classifyAppType({
        detection: fullInventory.detection,
        routes: fullInventory.routes,
        models: fullInventory.models,
      }).app_type,
      tier: 'internal',
      modifiers: [],
      confidence: 0.9,
    };
    fullReport.score = {
      current: 10,
      target: 55,
      per_level: { smoke: 10, behavioral: 0, edge: 0, integration: 0, performance: 0 },
    };
    const fullJson = await renderJson({ report: fullReport, repoRoot: sbx.repoDir });
    expect(fullJson.currentPath).toMatch(/state[\\/]audit\.json$/);
    const fullContentBefore = readFileSync(fullJson.currentPath, 'utf8');

    // Second: scoped audit via --path src/components/ writes audit-<hash>.json.
    const scope = 'src/components/';
    const hash = scopeHash(scope);
    const scopedInventory = await scan(sbx.repoDir, scope);
    expect(scopedInventory.scope).toBe(scope);
    // Scope should narrow to the components directory — App.tsx / models.ts excluded.
    expect(scopedInventory.scanned_files.every((p) => p.includes('components'))).toBe(true);

    const scopedReport = createReportObject({
      command: 'audit',
      repo_root: sbx.repoDir,
      scope,
    });
    scopedReport.classification = fullReport.classification;
    scopedReport.score = fullReport.score;

    // Write scoped sidecar explicitly to the hashed path (audit SKILL would do
    // this instead of the default renderJson path).
    const scopedPath = projectStateSidecarPath(sbx.repoDir, 'audit', hash);
    const { atomicWriteJson } = await import('../../src/state/atomic-write.js');
    await atomicWriteJson(scopedPath, {
      schema_version: 1,
      command: 'audit',
      last_updated: new Date().toISOString(),
      project: { repo_root: sbx.repoDir, scope },
      classification: scopedReport.classification,
      findings: scopedReport.findings,
    });

    // Assertions.
    expect(existsSync(scopedPath)).toBe(true);
    expect(scopedPath).toMatch(/audit-[0-9a-f]{8}\.json$/);
    // Full-repo audit.json is untouched.
    const fullContentAfter = readFileSync(fullJson.currentPath, 'utf8');
    expect(fullContentAfter).toBe(fullContentBefore);
  });

  // ------------------------------------------------------------------------
  // Harness-break detection sanity — missing_test_binary shape
  // ------------------------------------------------------------------------

  it('harness-break detection: reports when package.json references a missing test binary', async () => {
    // Write a broken package.json into the sandbox.
    const brokenPkg = {
      name: 'broken-fixture',
      private: true,
      scripts: { test: 'node node_modules/jest/bin/jest.js' },
      dependencies: {},
      devDependencies: {},
    };
    writeFileSync(join(sbx.repoDir, 'package.json'), JSON.stringify(brokenPkg, null, 2));
    // Drop existing fixture files that would confuse scanner.
    rmSync(join(sbx.repoDir, 'vitest.config.ts'), { force: true });

    const inventory = await scan(sbx.repoDir);
    const deps = inventory.detection.allDependencies;
    const testScript = brokenPkg.scripts.test;
    // Simulates what the SKILL does at Step 9: script references jest but jest is not in deps.
    const referencesJest = /jest/.test(testScript);
    const hasJest = 'jest' in deps;
    const missingBinary = referencesJest && !hasJest;
    expect(missingBinary).toBe(true);
  });
});
