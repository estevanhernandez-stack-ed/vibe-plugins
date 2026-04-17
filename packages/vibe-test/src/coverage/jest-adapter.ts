/**
 * Jest adapter — proposes adding `--collectCoverageFrom` so every source file
 * lands in the denominator.
 *
 * Precedence:
 * 1. If `jest.config.*` exists and has a `collectCoverageFrom` key, propose an
 *    additive diff that widens the glob if it's currently narrow.
 * 2. Otherwise propose appending `--collectCoverageFrom="src/**\/*.{js,ts,jsx,tsx}"`
 *    to the `test:coverage` script in `package.json`.
 * 3. If neither a config nor a coverage script is found, propose creating the
 *    script.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import type { AdapterProposal } from './vitest-adapter.js';

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch {
    return null;
  }
}

export async function proposeJestCollectCoverageFrom(rootPath: string): Promise<AdapterProposal | null> {
  const configCandidates = ['jest.config.ts', 'jest.config.js', 'jest.config.cjs', 'jest.config.mjs'];
  for (const name of configCandidates) {
    const path = join(rootPath, name);
    const content = await readIfExists(path);
    if (!content) continue;
    if (/collectCoverageFrom\s*:/.test(content)) {
      // Already present — signal a no-op.
      return {
        framework: 'jest',
        target: path,
        diff: '# already adapted — collectCoverageFrom already defined\n',
      };
    }
    const diff =
      `--- a/${name}\n` +
      `+++ b/${name}\n` +
      `@@ module.exports @@\n` +
      `   collectCoverage: true,\n` +
      `+  collectCoverageFrom: ['src/**/*.{js,ts,jsx,tsx}', '!src/**/*.d.ts'],\n` +
      `   // ...\n`;
    return { framework: 'jest', target: path, diff };
  }

  const pkgPath = join(rootPath, 'package.json');
  const pkgContent = await readIfExists(pkgPath);
  if (!pkgContent) return null;
  try {
    const pkg = JSON.parse(pkgContent) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const target = scripts['test:coverage']
      ? 'test:coverage'
      : scripts['coverage']
        ? 'coverage'
        : null;
    const collectFromFlag = `--collectCoverageFrom="src/**/*.{js,ts,jsx,tsx}"`;
    if (!target) {
      return {
        framework: 'jest',
        target: pkgPath,
        diff:
          '--- a/package.json\n+++ b/package.json\n' +
          '   "scripts": {\n' +
          `+    "test:coverage": "jest --coverage ${collectFromFlag}",\n` +
          '   }\n',
      };
    }
    const existing = scripts[target] ?? '';
    if (existing.includes('--collectCoverageFrom')) {
      return {
        framework: 'jest',
        target: pkgPath,
        diff: '# already adapted — --collectCoverageFrom already present\n',
      };
    }
    const proposed = existing.includes('--coverage')
      ? `${existing} ${collectFromFlag}`
      : `${existing} --coverage ${collectFromFlag}`;
    return {
      framework: 'jest',
      target: pkgPath,
      diff:
        `--- a/package.json\n+++ b/package.json\n` +
        `   "scripts": {\n` +
        `-    "${target}": "${existing}",\n` +
        `+    "${target}": "${proposed}",\n` +
        `   }\n`,
    };
  } catch {
    return null;
  }
}
