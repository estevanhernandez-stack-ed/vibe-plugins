/**
 * Runtime-flow integration test — checklist item #10.
 *
 * The generate SKILL is agent-executed markdown; this test exercises the
 * deterministic primitives the SKILL orchestrates when `--with-runtime` is on:
 *
 *   - dev-server path: detects scripts.dev, mocks spawn, mocks readiness via
 *     stdout pattern, mocks probe responses, asserts clean teardown
 *   - playwright path (MCP absent): formatDeferralFinding produces the
 *     "install the playwright plugin" finding text the SKILL surfaces
 *   - playwright path (MCP present): isAvailable returns true; composeProbeIntent
 *     builds the natural-language intent the SKILL would forward to MCP tools
 */

import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runDevServerProbe } from '../../src/runtime/dev-server-probe.js';
import {
  isAvailable as isPlaywrightHookAvailable,
  composeProbeIntent,
  formatDeferralFinding,
} from '../../src/runtime/playwright-hook.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'minimal-spa');

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  exitCode: number | null;
  killed: boolean;
  kill: (signal?: string) => boolean;
}

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.exitCode = null;
  child.killed = false;
  child.kill = (_signal?: string): boolean => {
    child.killed = true;
    setImmediate(() => {
      child.exitCode = 0;
      child.emit('exit', 0, _signal ?? null);
    });
    return true;
  };
  return child;
}

describe('runtime-flow integration: dev-server path against minimal-spa', () => {
  it('detects scripts.dev, spawns, observes readiness, probes routes, tears down', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vt-runtime-'));
    try {
      cpSync(FIXTURE_DIR, tmp, { recursive: true });

      const child = makeFakeChild();
      const fakeSpawn = (() => child) as never;
      setTimeout(() => {
        child.stdout.emit('data', '  vite v5.4.0  dev server running\n');
        child.stdout.emit('data', '  Local:   http://localhost:5173/\n');
      }, 20);

      const probedPaths: string[] = [];
      const fakeProbe = async (input: { baseUrl: string; path: string; method?: string }) => {
        probedPaths.push(input.path);
        return {
          url: `${input.baseUrl}${input.path}`,
          method: input.method ?? 'GET',
          status: 200,
          bodyPreview: '<!doctype html><html><body>OK</body></html>',
          durationMs: 12,
          responseHeaders: { 'content-type': 'text/html' },
        };
      };

      const result = await runDevServerProbe({
        rootPath: tmp,
        routes: [{ path: '/' }, { path: '/index.html' }],
        readiness: { kind: 'stdout', pattern: /Local:\s+http/i, timeoutMs: 1_500 },
        spawnFn: fakeSpawn,
        probeFn: fakeProbe,
      });

      expect(result.ready).toBe(true);
      expect(result.command).toBe('vite');
      expect(result.observations).toHaveLength(2);
      expect(probedPaths).toEqual(['/', '/index.html']);
      expect(result.observations[0]?.status).toBe(200);
      expect(result.teardown.signaled).toBe(true);
      expect(result.teardown.killed).toBe(false);
      expect(child.killed).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('graceful degradation: returns ready=false with error when no scripts.dev', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vt-runtime-no-dev-'));
    try {
      writeFileSync(
        join(tmp, 'package.json'),
        JSON.stringify({ name: 'no-dev', scripts: { build: 'tsc' } }),
      );
      const result = await runDevServerProbe({
        rootPath: tmp,
        routes: [{ path: '/' }],
      });
      expect(result.ready).toBe(false);
      expect(result.error).toContain('no `scripts.dev`');
      // No spawn happened, no teardown needed.
      expect(result.observations).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('runtime-flow integration: playwright path against minimal-spa', () => {
  it('emits the deferral finding when MCP is unavailable', () => {
    const finding = formatDeferralFinding([
      {
        entry: '/',
        steps: ['Render the home page', 'Click the CTA', 'Assert the modal opens'],
        name: 'home-cta',
      },
    ]);

    expect(isPlaywrightHookAvailable(['superpowers:test-driven-development'])).toBe(false);
    expect(finding.toLowerCase()).toContain('install the `playwright` plugin');
    expect(finding).toContain('home-cta');
  });

  it('composes a probe intent ready for the SKILL to forward to Playwright MCP', () => {
    expect(isPlaywrightHookAvailable(['playwright'])).toBe(true);

    const intent = composeProbeIntent({
      entry: '/',
      steps: ['Render the home page', 'Assert the heading text reads "Hello"'],
      name: 'home-smoke',
    });

    expect(intent.suggestedSpecBasename).toBe('home-smoke.spec.ts');
    expect(intent.text.toLowerCase()).toContain('codegen typescript');
    expect(intent.text).toContain('Render the home page');
    expect(intent.flow.entry).toBe('/');
  });
});
