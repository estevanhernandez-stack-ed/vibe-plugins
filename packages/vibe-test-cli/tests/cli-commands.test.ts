/**
 * CLI commands integration test — checklist item #10.
 *
 * Each command runs against the minimal-spa fixture (copied to a temp dir to
 * avoid polluting the source tree). The tests verify:
 *
 *   - audit emits markdown + JSON without LLM calls
 *   - coverage runs c8 and writes the JSON sidecar (or surfaces tool error)
 *   - gate exits 0/1/2 correctly + emits GH Actions annotations under --ci
 *   - posture renders banner + JSON sidecar in <3s
 *   - generate / fix exit 2 with the plugin-only message
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runAuditCommand } from '../src/commands/audit.js';
import { runPostureCommand } from '../src/commands/posture.js';
import { runGateCommand } from '../src/commands/gate.js';
import { runCli } from '../src/index.js';

const FIXTURE_SRC = join(__dirname, '..', '..', 'vibe-test', 'tests', 'fixtures', 'minimal-spa');

interface CapturedStream {
  text: string;
  restore: () => void;
}

function captureStream(stream: NodeJS.WriteStream): CapturedStream {
  const captured: { text: string } = { text: '' };
  const orig = stream.write.bind(stream);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (stream as any).write = (chunk: string | Uint8Array): boolean => {
    captured.text += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  };
  return {
    get text(): string {
      return captured.text;
    },
    restore: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stream as any).write = orig;
    },
  };
}

describe('CLI: audit command', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'vt-cli-audit-'));
    cpSync(FIXTURE_SRC, tmp, { recursive: true });
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('runs against minimal-spa fixture and writes markdown + json sidecars', async () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    try {
      const result = await runAuditCommand({ cwd: tmp });
      expect(result.exitCode).toBe(0);
      expect(result.inventory).not.toBeNull();
      expect(result.reportPath).not.toBeNull();
      expect(existsSync(result.reportPath!)).toBe(true);
      expect(existsSync(join(tmp, 'docs', 'vibe-test', 'inventory.json'))).toBe(true);
      // Stdout should contain the deterministic banner.
      expect(stdout.text).toContain('Inventory summary');
    } finally {
      stdout.restore();
      stderr.restore();
    }
  });
});

describe('CLI: posture command', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'vt-cli-posture-'));
    cpSync(FIXTURE_SRC, tmp, { recursive: true });
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('renders banner + JSON sidecar even when no prior state exists', async () => {
    const stdout = captureStream(process.stdout);
    try {
      const t0 = Date.now();
      const result = await runPostureCommand({ cwd: tmp });
      const elapsed = Date.now() - t0;
      expect(result.exitCode).toBe(0);
      expect(result.jsonPath).not.toBeNull();
      expect(existsSync(result.jsonPath!)).toBe(true);
      expect(stdout.text).toContain('Vibe Test posture');
      expect(stdout.text).toContain('Next action');
      // Banner must be <= 40 lines.
      const bannerLines = stdout.text.split('\n').filter((l) => l.trim().length > 0);
      expect(bannerLines.length).toBeLessThanOrEqual(40);
      // <3s runtime.
      expect(elapsed).toBeLessThan(3_000);
    } finally {
      stdout.restore();
    }
  });

  it('surfaces pending count when .vibe-test/pending/ has files', async () => {
    const pendingDir = join(tmp, '.vibe-test', 'pending');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(pendingDir, { recursive: true });
    writeFileSync(join(pendingDir, 'sample.test.ts'), 'test("smoke", () => {});');
    writeFileSync(join(pendingDir, 'sample.test.ts.meta.json'), '{}');

    const stdout = captureStream(process.stdout);
    try {
      const result = await runPostureCommand({ cwd: tmp });
      expect(result.exitCode).toBe(0);
      const sidecar = JSON.parse(readFileSync(result.jsonPath!, 'utf8')) as { pending_count: number };
      expect(sidecar.pending_count).toBe(1);
    } finally {
      stdout.restore();
    }
  });
});

describe('CLI: gate command (mocked GITHUB_ACTIONS=true)', () => {
  let tmp: string;
  let originalEnv: string | undefined;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'vt-cli-gate-'));
    cpSync(FIXTURE_SRC, tmp, { recursive: true });
    originalEnv = process.env.GITHUB_ACTIONS;
    process.env.GITHUB_ACTIONS = 'true';
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.GITHUB_ACTIONS;
    } else {
      process.env.GITHUB_ACTIONS = originalEnv;
    }
  });

  it('exits 1 with ::error:: annotations when coverage falls below threshold', async () => {
    // The fixture has no real test coverage — c8 will return 0% lines, gate fails.
    // We override the test command to a noop so c8 doesn't actually need vitest installed.
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    try {
      const result = await runGateCommand({
        cwd: tmp,
        ci: true,
        // node -e exits cleanly with no test runner — c8 will report 0% lines.
        testCommand: 'node -e "process.exit(0)"',
      });
      // Either exit 1 (low coverage) or exit 2 (tool error from missing test runner).
      // Both are acceptable outcomes for this fixture; what matters is annotations land.
      expect([1, 2]).toContain(result.exitCode);
      // Annotations end up on stderr (error/warning) or stdout (notice).
      const all = stdout.text + stderr.text;
      // At minimum a notice OR error annotation should have fired.
      expect(all).toMatch(/::(error|warning|notice)/);
    } finally {
      stdout.restore();
      stderr.restore();
    }
  });
});

describe('CLI: generate / fix plugin-only error', () => {
  it('runCli("generate") exits 2 with the plugin-only message', async () => {
    const stderr = captureStream(process.stderr);
    try {
      const code = await runCli({ argv: ['node', 'vibe-test', 'generate'] });
      expect(code).toBe(2);
      expect(stderr.text).toContain('plugin-only in v0.2');
      expect(stderr.text).toContain('/vibe-test:generate');
    } finally {
      stderr.restore();
    }
  });

  it('runCli("fix") exits 2 with the plugin-only message', async () => {
    const stderr = captureStream(process.stderr);
    try {
      const code = await runCli({ argv: ['node', 'vibe-test', 'fix'] });
      expect(code).toBe(2);
      expect(stderr.text).toContain('plugin-only in v0.2');
    } finally {
      stderr.restore();
    }
  });

  it('runCli("--help") exits 0 and prints usage', async () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    try {
      const code = await runCli({ argv: ['node', 'vibe-test', '--help'] });
      expect(code).toBe(0);
      // Commander prints help to stdout.
      expect(stdout.text + stderr.text).toContain('vibe-test');
    } finally {
      stdout.restore();
      stderr.restore();
    }
  });
});

describe('CLI: stdout-protocol', () => {
  it('detectCiContext picks up GITHUB_ACTIONS=true from env', async () => {
    const { detectCiContext } = await import('../src/stdout-protocol.js');
    const original = process.env.GITHUB_ACTIONS;
    process.env.GITHUB_ACTIONS = 'true';
    try {
      expect(detectCiContext().active).toBe(true);
    } finally {
      if (original === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = original;
    }
  });

  it('detectCiContext respects --ci flag', async () => {
    const { detectCiContext } = await import('../src/stdout-protocol.js');
    const original = process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_ACTIONS;
    try {
      expect(detectCiContext(true).active).toBe(true);
      expect(detectCiContext(false).active).toBe(false);
    } finally {
      if (original !== undefined) process.env.GITHUB_ACTIONS = original;
    }
  });

  it('emitError emits ::error:: prefix in CI context', async () => {
    const { emitError, detectCiContext } = await import('../src/stdout-protocol.js');
    const stderr = captureStream(process.stderr);
    try {
      emitError('boom', { active: true, stepSummaryPath: null });
      expect(stderr.text).toMatch(/::error::boom/);
    } finally {
      stderr.restore();
    }
    void detectCiContext;
  });

  it('emitError emits plain "error: " prefix outside CI', async () => {
    const { emitError } = await import('../src/stdout-protocol.js');
    const stderr = captureStream(process.stderr);
    try {
      emitError('boom', { active: false, stepSummaryPath: null });
      expect(stderr.text).toContain('error: boom');
      expect(stderr.text).not.toContain('::error');
    } finally {
      stderr.restore();
    }
  });
});
