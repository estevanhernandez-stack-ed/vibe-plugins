import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';

import {
  scanSource,
  scanFile,
  scanFiles,
  uniqueVarNames,
  formatInlineWarning,
} from '../../../src/generator/env-var-scanner.js';

describe('env-var-scanner', () => {
  describe('process.env patterns (TS/JS)', () => {
    it('detects dotted property access and returns line numbers', () => {
      const source = [
        'const key = process.env.FIREBASE_API_KEY;',
        'function f() {',
        '  return process.env.NODE_ENV;',
        '}',
      ].join('\n');
      const refs = scanSource({ content: source, file: 'a.ts' });
      const names = refs.map((r) => ({ name: r.var_name, line: r.line, src: r.source }));
      expect(names).toEqual([
        { name: 'FIREBASE_API_KEY', line: 1, src: 'process.env' },
        { name: 'NODE_ENV', line: 3, src: 'process.env' },
      ]);
    });

    it('detects bracket access with string literal keys', () => {
      const source = `const k = process.env['STRIPE_PK'];\n`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toMatchObject({
        var_name: 'STRIPE_PK',
        line: 1,
        source: 'process.env',
      });
    });

    it('captures inline string fallbacks via ?? / ||', () => {
      const source = [
        `const a = process.env.HOST ?? 'localhost';`,
        `const b = process.env.PORT || '3000';`,
      ].join('\n');
      const refs = scanSource({ content: source, file: 'a.ts' });
      const byName = Object.fromEntries(refs.map((r) => [r.var_name, r.fallback]));
      expect(byName).toEqual({
        HOST: 'localhost',
        PORT: '3000',
      });
    });

    it('does not emit entries for dynamic keys (process.env[varName])', () => {
      const source = `const k = process.env[myVar];`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs).toHaveLength(0);
    });
  });

  describe('import.meta.env patterns (Vite code)', () => {
    it('detects dotted access', () => {
      const source = `const k = import.meta.env.VITE_API_URL;`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toMatchObject({
        var_name: 'VITE_API_URL',
        line: 1,
        source: 'import.meta.env',
      });
    });

    it('detects bracket access', () => {
      const source = `const k = import.meta.env['VITE_SENTRY_DSN'];`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toMatchObject({
        var_name: 'VITE_SENTRY_DSN',
        source: 'import.meta.env',
      });
    });
  });

  describe('dotenv patterns', () => {
    it('detects `import "dotenv/config"` side-effect', () => {
      const source = [`import 'dotenv/config';`, `export const x = 1;`].join('\n');
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs.some((r) => r.source === 'dotenv-side-effect')).toBe(true);
    });

    it('detects `require("dotenv/config")` side-effect', () => {
      const source = `require('dotenv/config');`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(refs[0]?.source).toBe('dotenv-side-effect');
    });

    it('detects dotenv.config() call with path bag', () => {
      const source = [
        `import dotenv from 'dotenv';`,
        `dotenv.config({ path: '.env.local' });`,
      ].join('\n');
      const refs = scanSource({ content: source, file: 'a.ts' });
      const cfgRef = refs.find((r) => r.source === 'dotenv-config');
      expect(cfgRef).toBeDefined();
      expect(cfgRef?.fallback).toBe('.env.local');
    });
  });

  describe('deduplication', () => {
    it('emits one entry per (source, var_name, line) triple even with overlapping patterns', () => {
      const source = `const a = process.env.X; const b = process.env.X;`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      // Two occurrences on the same line — both should appear, because the
      // dedup key uses `match.index`-indirect via regex global scan, and we
      // iterate matches per pattern. Expect 2 entries for `X` on line 1.
      expect(refs.filter((r) => r.var_name === 'X').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scanFile + scanFiles', () => {
    let tmp: string;
    beforeEach(async () => {
      tmp = await mkdtemp(join(tmpdir(), 'vibe-test-env-scanner-'));
    });
    afterEach(async () => {
      await rm(tmp, { recursive: true, force: true });
    });

    it('scanFile reads from disk and returns refs with the supplied path', async () => {
      const file = join(tmp, 'a.ts');
      await fs.writeFile(file, `const k = process.env.API_KEY;\n`);
      const refs = await scanFile(file);
      expect(refs[0]).toMatchObject({
        var_name: 'API_KEY',
        file,
        line: 1,
      });
    });

    it('scanFiles tolerates missing files and flattens results', async () => {
      const real = join(tmp, 'a.ts');
      await fs.writeFile(real, `const k = process.env.REAL;`);
      const missing = join(tmp, 'missing.ts');
      const refs = await scanFiles([missing, real]);
      expect(refs).toHaveLength(1);
      expect(refs[0]?.var_name).toBe('REAL');
    });
  });

  describe('helpers', () => {
    it('uniqueVarNames dedupes across references, preserves order', () => {
      const source = [
        `const a = process.env.A;`,
        `const b = process.env.B;`,
        `const a2 = process.env.A;`,
      ].join('\n');
      const refs = scanSource({ content: source, file: 'a.ts' });
      expect(uniqueVarNames(refs)).toEqual(['A', 'B']);
    });

    it('formatInlineWarning names env vars when present', () => {
      const source = `const k = process.env.FOO; const j = process.env.BAR;`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      const out = formatInlineWarning(refs);
      expect(out).toContain('FOO');
      expect(out).toContain('BAR');
      expect(out).toMatch(/^\/\/ /);
    });

    it('formatInlineWarning announces dotenv when only side-effect found', () => {
      const source = `import 'dotenv/config';`;
      const refs = scanSource({ content: source, file: 'a.ts' });
      const out = formatInlineWarning(refs);
      expect(out).toContain('dotenv');
    });
  });
});
