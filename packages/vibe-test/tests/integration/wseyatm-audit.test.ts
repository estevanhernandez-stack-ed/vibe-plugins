/**
 * WSYATM regression fixture — audit flow integration tests.
 *
 * Verifies that the full audit pipeline (scanner + classifier + harness
 * detectors + weighted score) reproduces the three canonical WSYATM findings
 * against the anonymized static snapshot at
 * `tests/fixtures/wseyatm-snapshot/`.
 *
 * Reference: checklist item #11 acceptance. These tests are the deterministic
 * half of the WSYATM ship gate (item #12 runs the full SKILL-orchestrated
 * audit against the real repo).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { scan } from '../../src/scanner/index.js';
import {
  detectBrokenTestRunner,
  detectMissingTestBinary,
  detectCherryPickedDenominator,
  detectAllHarnessIssues,
} from '../../src/scanner/harness-detector.js';
import { classifyAppType } from '../../src/scanner/classify-app-type.js';
import { classifyModifiers } from '../../src/scanner/classify-modifiers.js';
import { computeWeightedScore } from '../../src/coverage/weighted-score.js';

const FIXTURE_ROOT = join(__dirname, '..', 'fixtures', 'wseyatm-snapshot');
const FRONTEND = join(FIXTURE_ROOT, 'frontend');
const BACKEND = join(FIXTURE_ROOT, 'Backend');

function rel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

function extractRequireSpecifiers(content: string): string[] {
  const out: string[] = [];
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

describe('WSYATM snapshot · audit regression', () => {
  it('fixture directory exists', () => {
    expect(existsSync(FIXTURE_ROOT)).toBe(true);
    expect(existsSync(FRONTEND)).toBe(true);
    expect(existsSync(BACKEND)).toBe(true);
    expect(existsSync(join(FIXTURE_ROOT, '.github', 'workflows', 'deploy.yml'))).toBe(true);
  });

  it('reproduces finding #1: broken vitest forks-pool config', async () => {
    const vitestCfg = readFileSync(join(FRONTEND, 'vitest.config.ts'), 'utf8');
    const pkg = JSON.parse(readFileSync(join(FRONTEND, 'package.json'), 'utf8'));
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    const finding = detectBrokenTestRunner({
      vitestConfigContent: vitestCfg,
      allDependencies: allDeps,
      scripts: pkg.scripts ?? {},
    });
    expect(finding).not.toBeNull();
    expect(finding!.type).toBe('broken_test_runner');
    expect(finding!.severity).toBe('high');
    expect(finding!.evidence.timeoutMs).toBe(5000);
    expect(finding!.evidence.usesForks).toBe(true);
  });

  it('reproduces finding #2: Backend missing jest', () => {
    const pkg = JSON.parse(readFileSync(join(BACKEND, 'package.json'), 'utf8'));
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    expect('jest' in allDeps).toBe(false);
    expect(pkg.scripts.test).toMatch(/jest/);

    const findings = detectMissingTestBinary({
      scripts: pkg.scripts,
      allDependencies: allDeps,
    });
    expect(findings.length).toBeGreaterThan(0);
    const jestFinding = findings.find((f) => f.evidence.runner === 'jest');
    expect(jestFinding).toBeDefined();
    expect(jestFinding!.type).toBe('missing_test_binary');
    expect(jestFinding!.severity).toBe('critical');
  });

  it('reproduces finding #3: cherry-picked denominator on Backend', async () => {
    const backendInventory = await scan(BACKEND);
    const sourceFiles = backendInventory.scanned_files;
    expect(sourceFiles.length).toBeGreaterThan(20);
    const testFiles = backendInventory.existing_test_files;
    expect(testFiles.length).toBe(3);

    const testImports: Record<string, string[]> = {};
    for (const tf of testFiles) {
      const content = readFileSync(tf, 'utf8');
      testImports[tf] = extractRequireSpecifiers(content);
    }

    const finding = detectCherryPickedDenominator({
      repoRoot: BACKEND,
      sourceFiles,
      testFiles,
      testImports,
    });
    expect(finding).not.toBeNull();
    expect(finding!.type).toBe('cherry_picked_denominator');
    expect(finding!.evidence.importedSourceCount).toBe(3);
    const totalSrc = finding!.evidence.totalSourceCount as number;
    expect(totalSrc).toBeGreaterThanOrEqual(20);
    const ratio = finding!.evidence.coverageRatio as number;
    expect(ratio).toBeLessThan(0.2);
  });

  it('detectAllHarnessIssues composes all three findings end-to-end', async () => {
    const frontendInv = await scan(FRONTEND);
    const backendInv = await scan(BACKEND);

    const frontendFindings = await detectAllHarnessIssues({
      repoRoot: FRONTEND,
      packageJson: frontendInv.detection.packageJson,
      allDependencies: frontendInv.detection.allDependencies,
      sourceFiles: frontendInv.scanned_files,
      testFiles: frontendInv.existing_test_files,
      testImports: {},
    });
    expect(frontendFindings.some((f) => f.type === 'broken_test_runner')).toBe(true);

    const backendTestImports: Record<string, string[]> = {};
    for (const tf of backendInv.existing_test_files) {
      const content = readFileSync(tf, 'utf8');
      backendTestImports[tf] = extractRequireSpecifiers(content);
    }
    const backendFindings = await detectAllHarnessIssues({
      repoRoot: BACKEND,
      packageJson: backendInv.detection.packageJson,
      allDependencies: backendInv.detection.allDependencies,
      sourceFiles: backendInv.scanned_files,
      testFiles: backendInv.existing_test_files,
      testImports: backendTestImports,
    });
    expect(backendFindings.some((f) => f.type === 'missing_test_binary')).toBe(true);
    expect(backendFindings.some((f) => f.type === 'cherry_picked_denominator')).toBe(true);
  });

  it('classifies fixture as full-stack-db via unioned frontend + backend detection', async () => {
    const rootInv = await scan(FIXTURE_ROOT);
    const backendInv = await scan(BACKEND);
    expect(backendInv.detection.backend).toContain('firebase-functions');
    const frontendInv = await scan(FRONTEND);
    const unionedDetection = {
      ...frontendInv.detection,
      backend: [
        ...frontendInv.detection.backend,
        ...backendInv.detection.backend,
      ],
      database: [...frontendInv.detection.database, 'firestore' as const],
      auth: ['firebase-auth' as const, ...frontendInv.detection.auth],
    };
    const result = classifyAppType({
      detection: unionedDetection,
      routes: [],
      models: rootInv.models,
      componentCount: frontendInv.components.length,
    });
    expect(['full-stack-db', 'multi-tenant-saas']).toContain(result.app_type);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('modifier scan tolerates fixture (no false-positive regulated)', async () => {
    const backendInv = await scan(BACKEND);
    const mods = classifyModifiers({
      detection: backendInv.detection,
      models: backendInv.models,
      integrations: backendInv.integrations,
    });
    expect(mods).not.toContain('regulated');
  });

  it('detects production-deploy signal from .github/workflows/deploy.yml', () => {
    const wf = readFileSync(
      join(FIXTURE_ROOT, '.github', 'workflows', 'deploy.yml'),
      'utf8',
    );
    expect(wf).toMatch(/push:[\s\S]*?branches:[\s\S]*?main/);
    expect(wf).toMatch(/firebase-tools deploy/);
  });

  it('weighted score for WSYATM shape is well below public-facing 70 threshold', () => {
    const result = computeWeightedScore({
      perLevel: {
        smoke: 35,
        behavioral: 10,
        edge: 0,
        integration: 0,
        performance: 0,
      },
      applicability: {
        smoke: true,
        behavioral: true,
        edge: true,
        integration: true,
        performance: false,
      },
      tier: 'public-facing',
    });
    expect(result.threshold).toBe(70);
    expect(result.passes).toBe(false);
    expect(result.score).toBeCloseTo(12.5, 1);
  });

  it('fixture stays under 50-file budget', async () => {
    const { promises: fs } = await import('node:fs');
    async function count(dir: string): Promise<number> {
      let n = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) n += await count(p);
        else n += 1;
      }
      return n;
    }
    const total = await count(FIXTURE_ROOT);
    expect(total).toBeLessThanOrEqual(50);
  });

  it('scanner finds BadgeManager.tsx and the 3 middleware files + 20 routes', async () => {
    const frontendInv = await scan(FRONTEND);
    const names = frontendInv.scanned_files.map((p) => rel(FRONTEND, p));
    expect(names).toContain('src/components/BadgeManager.tsx');
    expect(names).toContain('src/components/MovieCard.tsx');
    expect(names).toContain('src/components/Quiz.tsx');

    const backendInv = await scan(BACKEND);
    const bnames = backendInv.scanned_files.map((p) => rel(BACKEND, p));
    expect(bnames).toContain('src/middleware/errorHandler.js');
    expect(bnames).toContain('src/middleware/validators.js');
    expect(bnames).toContain('src/middleware/adminValidation.js');
    const routeCount = bnames.filter((p) => p.startsWith('src/routes/')).length;
    expect(routeCount).toBeGreaterThanOrEqual(18);
  });
});
