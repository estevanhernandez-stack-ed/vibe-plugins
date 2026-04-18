/**
 * Unit tests for the harness-break detector — the three F2 findings.
 */
import { describe, it, expect } from 'vitest';

import {
  detectBrokenTestRunner,
  detectMissingTestBinary,
  detectCherryPickedDenominator,
} from '../../../src/scanner/harness-detector.js';

describe('detectBrokenTestRunner', () => {
  it('flags forks pool + sub-30s testTimeout as high severity', () => {
    const finding = detectBrokenTestRunner({
      vitestConfigContent: `
        export default {
          test: {
            pool: 'forks',
            testTimeout: 5000,
          },
        };
      `,
      allDependencies: { vitest: '^2.0.0', '@vitest/coverage-v8': '^2.0.0' },
      scripts: { 'test:coverage': 'vitest run --coverage' },
    });
    expect(finding).not.toBeNull();
    expect(finding!.type).toBe('broken_test_runner');
    expect(finding!.severity).toBe('high');
    expect(finding!.evidence.timeoutMs).toBe(5000);
  });

  it('flags forks + coverage-v8 + --coverage script with no timeout as medium', () => {
    const finding = detectBrokenTestRunner({
      vitestConfigContent: `
        export default { test: { pool: 'forks' } };
      `,
      allDependencies: { vitest: '^2.0.0', '@vitest/coverage-v8': '^2.0.0' },
      scripts: { 'test:coverage': 'vitest run --coverage' },
    });
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe('medium');
  });

  it('returns null when config uses threads pool', () => {
    const finding = detectBrokenTestRunner({
      vitestConfigContent: `export default { test: { pool: 'threads' } };`,
      allDependencies: { vitest: '^2.0.0' },
      scripts: { test: 'vitest run' },
    });
    expect(finding).toBeNull();
  });

  it('returns null when vitest not installed', () => {
    const finding = detectBrokenTestRunner({
      vitestConfigContent: `export default { test: { pool: 'forks', testTimeout: 5000 } };`,
      allDependencies: { jest: '^29.0.0' },
      scripts: { test: 'jest' },
    });
    expect(finding).toBeNull();
  });
});

describe('detectMissingTestBinary', () => {
  it('flags jest in scripts when jest not installed', () => {
    const findings = detectMissingTestBinary({
      scripts: { test: 'jest', 'test:coverage': 'jest --coverage' },
      allDependencies: { express: '^4.0.0' },
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('missing_test_binary');
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].evidence.runner).toBe('jest');
  });

  it('does not flag jest when jest is installed', () => {
    const findings = detectMissingTestBinary({
      scripts: { test: 'jest' },
      allDependencies: { jest: '^29.0.0' },
    });
    expect(findings.length).toBe(0);
  });

  it('flags vitest in scripts when vitest missing', () => {
    const findings = detectMissingTestBinary({
      scripts: { test: 'vitest run' },
      allDependencies: {},
    });
    expect(findings.some((f) => f.evidence.runner === 'vitest')).toBe(true);
  });

  it('accepts `playwright` dep when script uses playwright binary', () => {
    const findings = detectMissingTestBinary({
      scripts: { e2e: 'playwright test' },
      allDependencies: { playwright: '^1.40.0' },
    });
    expect(findings.length).toBe(0);
  });
});

describe('detectCherryPickedDenominator', () => {
  it('flags when tests only import a fraction of source files', () => {
    const sourceFiles = Array.from({ length: 23 }, (_, i) =>
      i < 3
        ? `/repo/src/middleware/file${i}.js`
        : `/repo/src/routes/route${i}.js`,
    );
    const testFiles = [
      '/repo/src/__tests__/middleware/file0.test.js',
      '/repo/src/__tests__/middleware/file1.test.js',
      '/repo/src/__tests__/middleware/file2.test.js',
    ];
    const testImports: Record<string, string[]> = {
      '/repo/src/__tests__/middleware/file0.test.js': ['../../middleware/file0.js'],
      '/repo/src/__tests__/middleware/file1.test.js': ['../../middleware/file1.js'],
      '/repo/src/__tests__/middleware/file2.test.js': ['../../middleware/file2.js'],
    };
    const finding = detectCherryPickedDenominator({
      repoRoot: '/repo',
      sourceFiles,
      testFiles,
      testImports,
    });
    expect(finding).not.toBeNull();
    expect(finding!.type).toBe('cherry_picked_denominator');
    expect(finding!.evidence.importedSourceCount).toBe(3);
    expect(finding!.evidence.totalSourceCount).toBe(23);
  });

  it('returns null when source-file count is below min-sample threshold', () => {
    const finding = detectCherryPickedDenominator({
      repoRoot: '/repo',
      sourceFiles: ['/repo/src/a.js', '/repo/src/b.js'],
      testFiles: ['/repo/src/a.test.js'],
      testImports: { '/repo/src/a.test.js': ['./a.js'] },
    });
    expect(finding).toBeNull();
  });

  it('returns null when coverage ratio exceeds threshold', () => {
    const sourceFiles = Array.from({ length: 10 }, (_, i) => `/repo/src/f${i}.js`);
    const testFiles = ['/repo/src/all.test.js'];
    const testImports: Record<string, string[]> = {
      '/repo/src/all.test.js': sourceFiles.map((_, i) => `./f${i}.js`),
    };
    const finding = detectCherryPickedDenominator({
      repoRoot: '/repo',
      sourceFiles,
      testFiles,
      testImports,
    });
    expect(finding).toBeNull();
  });
});
