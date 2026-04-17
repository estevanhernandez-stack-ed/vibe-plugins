import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { proposeVitestCoverageAll } from '../../../src/coverage/vitest-adapter.js';
import { proposeJestCollectCoverageFrom } from '../../../src/coverage/jest-adapter.js';

describe('vitest-adapter', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vibe-test-vitest-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('proposes adding coverage.all to an existing coverage block', async () => {
    writeFileSync(
      join(dir, 'vitest.config.ts'),
      `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { coverage: { provider: 'v8' } } });\n`,
    );
    const p = await proposeVitestCoverageAll(dir);
    expect(p).toBeTruthy();
    expect(p?.framework).toBe('vitest');
    expect(p?.diff).toMatch(/all: true/);
  });

  it('returns no-op when coverage.all already set', async () => {
    writeFileSync(
      join(dir, 'vitest.config.ts'),
      `export default { test: { coverage: { all: true } } };\n`,
    );
    const p = await proposeVitestCoverageAll(dir);
    expect(p?.diff).toMatch(/already adapted/);
  });

  it('falls back to package.json script mutation when no config file', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ scripts: { 'test:coverage': 'vitest run --coverage' } }, null, 2),
    );
    const p = await proposeVitestCoverageAll(dir);
    expect(p?.target).toMatch(/package\.json$/);
    expect(p?.diff).toMatch(/--coverage\.all/);
  });
});

describe('jest-adapter', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vibe-test-jest-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('proposes collectCoverageFrom when missing from jest.config.js', async () => {
    writeFileSync(
      join(dir, 'jest.config.js'),
      `module.exports = { testEnvironment: 'node', collectCoverage: true };\n`,
    );
    const p = await proposeJestCollectCoverageFrom(dir);
    expect(p?.framework).toBe('jest');
    expect(p?.diff).toMatch(/collectCoverageFrom/);
  });

  it('falls back to package.json script mutation', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ scripts: { 'test:coverage': 'jest --coverage' } }, null, 2),
    );
    const p = await proposeJestCollectCoverageFrom(dir);
    expect(p?.diff).toMatch(/collectCoverageFrom/);
  });
});
