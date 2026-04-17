/**
 * Vitest adapter — proposes a diff that adds `coverage.all = true` to the
 * builder's coverage command so every source file lands in the denominator.
 *
 * Two proposal shapes, in priority order:
 * 1. If `vitest.config.(ts|js|mjs)` exists and has a `coverage` block, propose
 *    an inline edit that adds `all: true`.
 * 2. Otherwise, propose appending `--coverage.all` to the `test:coverage` (or
 *    equivalent) script in `package.json`.
 *
 * This module emits a *diff string* — textual, human-readable, ready to paste
 * into a PR. It does NOT apply the diff; builder opt-in is mandatory.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface AdapterProposal {
  framework: 'vitest' | 'jest';
  diff: string;
  /** Target file the diff applies to. */
  target: string;
  /** Whether the builder has opted in to apply. SKILL sets this after prompting. */
  applied?: boolean;
  /** Builder decision: true = applied, false = declined, undefined = pending. */
  accepted?: boolean;
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch {
    return null;
  }
}

export async function proposeVitestCoverageAll(rootPath: string): Promise<AdapterProposal | null> {
  const configCandidates = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs'];
  for (const name of configCandidates) {
    const path = join(rootPath, name);
    const content = await readIfExists(path);
    if (!content) continue;
    if (/\ball\s*:\s*true\b/.test(content)) {
      return {
        framework: 'vitest',
        target: path,
        diff: '# already adapted — coverage.all: true already set\n',
      };
    }
    if (/coverage\s*:/.test(content)) {
      // Propose inserting `all: true` into the coverage block.
      const diff =
        `--- a/${name}\n` +
        `+++ b/${name}\n` +
        `@@ coverage config @@\n` +
        `   coverage: {\n` +
        `+    all: true,\n` +
        `     // ...existing keys preserved\n` +
        `   }\n`;
      return { framework: 'vitest', target: path, diff };
    }
    // No coverage block at all — propose adding one.
    const diff =
      `--- a/${name}\n` +
      `+++ b/${name}\n` +
      `@@ within defineConfig.test @@\n` +
      `   test: {\n` +
      `+    coverage: {\n` +
      `+      all: true,\n` +
      `+      provider: 'v8',\n` +
      `+    },\n` +
      `     // ...\n` +
      `   }\n`;
    return { framework: 'vitest', target: path, diff };
  }

  // No config file — propose package.json script mutation.
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
    if (!target) {
      return {
        framework: 'vitest',
        target: pkgPath,
        diff:
          '--- a/package.json\n+++ b/package.json\n' +
          '   "scripts": {\n' +
          '+    "test:coverage": "vitest run --coverage --coverage.all",\n' +
          '   }\n',
      };
    }
    const existing = scripts[target] ?? '';
    if (existing.includes('--coverage.all')) {
      return {
        framework: 'vitest',
        target: pkgPath,
        diff: '# already adapted — --coverage.all already present\n',
      };
    }
    const proposed = existing.includes('--coverage') ? `${existing} --coverage.all` : `${existing} --coverage --coverage.all`;
    return {
      framework: 'vitest',
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
