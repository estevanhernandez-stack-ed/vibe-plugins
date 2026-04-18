import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  detectDevCommand,
  allocateFreePort,
  spawnDevServer,
  teardownDevServer,
  runDevServerProbe,
  type DevServerHandle,
  type ProbeObservation,
} from '../../../src/runtime/dev-server-probe.js';

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

describe('detectDevCommand', () => {
  it('returns scripts.dev with port hint', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-dev-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'vite --port 3000', start: 'node server.js' } }),
      );
      const r = await detectDevCommand(join(dir, 'package.json'));
      expect(r.command).toBe('vite --port 3000');
      expect(r.source).toBe('scripts.dev');
      expect(r.portHint).toBe(3000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to scripts.start when dev is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-dev-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ scripts: { start: 'PORT=4000 node server.js' } }),
      );
      const r = await detectDevCommand(join(dir, 'package.json'));
      expect(r.command).toBe('PORT=4000 node server.js');
      expect(r.source).toBe('scripts.start');
      expect(r.portHint).toBe(4000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null when neither script exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-dev-'));
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc' } }));
      const r = await detectDevCommand(join(dir, 'package.json'));
      expect(r.command).toBeNull();
      expect(r.source).toBeNull();
      expect(r.portHint).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null when package.json is missing or invalid', async () => {
    const r1 = await detectDevCommand(join(tmpdir(), 'definitely-not-here.json'));
    expect(r1.command).toBeNull();

    const dir = mkdtempSync(join(tmpdir(), 'vt-dev-'));
    try {
      writeFileSync(join(dir, 'package.json'), 'not-json');
      const r2 = await detectDevCommand(join(dir, 'package.json'));
      expect(r2.command).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('allocateFreePort', () => {
  it('returns a port in the ephemeral range', async () => {
    const port = await allocateFreePort();
    expect(port).toBeGreaterThan(1024);
    expect(port).toBeLessThan(65_536);
  });

  it('returns a different port on consecutive calls (almost always)', async () => {
    const a = await allocateFreePort();
    const b = await allocateFreePort();
    // Not strictly required, but the OS rarely re-uses the same port back-to-back.
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
  });
});

describe('spawnDevServer + teardownDevServer (mocked spawn)', () => {
  it('spawns the parsed command with PORT env set', () => {
    let capturedCmd: string | undefined;
    let capturedArgs: readonly string[] | undefined;
    let capturedOpts: { env?: NodeJS.ProcessEnv; cwd?: string } | undefined;
    const fakeSpawn = ((cmd: string, args: readonly string[], opts?: { env?: NodeJS.ProcessEnv; cwd?: string }) => {
      capturedCmd = cmd;
      capturedArgs = args;
      capturedOpts = opts;
      return makeFakeChild();
    }) as never;
    const handle = spawnDevServer({
      command: 'vite --port 3000',
      port: 5173,
      cwd: '/tmp',
      spawnFn: fakeSpawn,
    });
    expect(capturedCmd).toBe('vite');
    expect(capturedArgs).toEqual(['--port', '3000']);
    expect(capturedOpts?.cwd).toBe('/tmp');
    expect(capturedOpts?.env?.PORT).toBe('5173');
    expect(handle.port).toBe(5173);
  });

  it('teardownDevServer signals SIGTERM, reaps the child', async () => {
    const child = makeFakeChild();
    const handle: DevServerHandle = {
      child: child as never,
      port: 1234,
      command: 'fake',
      cwd: '/tmp',
      startedAt: new Date().toISOString(),
    };
    const result = await teardownDevServer(handle, { killTimeoutMs: 50 });
    expect(result.signaled).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('teardownDevServer escalates to SIGKILL when SIGTERM is ignored', async () => {
    const child = new EventEmitter() as FakeChild;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.exitCode = null;
    child.killed = false;
    let killSignals: string[] = [];
    child.kill = (signal?: string): boolean => {
      killSignals.push(signal ?? 'SIGTERM');
      if (signal === 'SIGKILL') {
        setImmediate(() => {
          child.exitCode = 137;
          child.emit('exit', 137, 'SIGKILL');
        });
      }
      return true;
    };
    const handle: DevServerHandle = {
      child: child as never,
      port: 1234,
      command: 'fake',
      cwd: '/tmp',
      startedAt: new Date().toISOString(),
    };
    const result = await teardownDevServer(handle, { killTimeoutMs: 30 });
    expect(killSignals).toContain('SIGTERM');
    expect(killSignals).toContain('SIGKILL');
    expect(result.killed).toBe(true);
  });

  it('teardownDevServer resolves immediately when child already exited', async () => {
    const child = makeFakeChild();
    child.exitCode = 0;
    const handle: DevServerHandle = {
      child: child as never,
      port: 1234,
      command: 'fake',
      cwd: '/tmp',
      startedAt: new Date().toISOString(),
    };
    const result = await teardownDevServer(handle);
    expect(result.exitCode).toBe(0);
  });
});

describe('runDevServerProbe (mocked)', () => {
  it('returns ready=false with error when no dev script', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-probe-'));
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: {} }));
      const r = await runDevServerProbe({
        rootPath: dir,
        routes: [{ path: '/api/health' }],
      });
      expect(r.ready).toBe(false);
      expect(r.error).toContain('no `scripts.dev`');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('full flow: spawn -> stdout-readiness -> probe -> teardown', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-probe-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'fake-server --watch' } }),
      );

      const child = makeFakeChild();
      const fakeSpawn = (() => child) as never;

      // Emit ready signature shortly after spawn.
      setTimeout(() => {
        child.stdout.emit('data', 'starting\n');
        child.stdout.emit('data', 'READY ON PORT\n');
      }, 20);

      const observed: string[] = [];
      const fakeProbe = async (input: { baseUrl: string; path: string; method?: string }): Promise<ProbeObservation> => {
        observed.push(`${input.method ?? 'GET'} ${input.path}`);
        return {
          url: `${input.baseUrl}${input.path}`,
          method: input.method ?? 'GET',
          status: 200,
          bodyPreview: '{"ok":true}',
          durationMs: 5,
          responseHeaders: { 'content-type': 'application/json' },
        };
      };

      const result = await runDevServerProbe({
        rootPath: dir,
        routes: [
          { path: '/api/health' },
          { path: '/api/items', method: 'POST', payload: { name: 'a' } },
        ],
        readiness: { kind: 'stdout', pattern: /READY ON PORT/, timeoutMs: 1_000 },
        spawnFn: fakeSpawn,
        probeFn: fakeProbe,
      });

      expect(result.ready).toBe(true);
      expect(result.observations).toHaveLength(2);
      expect(observed).toEqual(['GET /api/health', 'POST /api/items']);
      expect(result.teardown.signaled).toBe(true);
      expect(child.killed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips probes when readiness times out, still tears down', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vt-probe-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'fake-server' } }),
      );

      const child = makeFakeChild();
      const fakeSpawn = (() => child) as never;
      let probeCalled = 0;
      const fakeProbe = async (): Promise<ProbeObservation> => {
        probeCalled += 1;
        return {
          url: 'x',
          method: 'GET',
          status: 200,
          bodyPreview: '',
          durationMs: 1,
          responseHeaders: {},
        };
      };

      const result = await runDevServerProbe({
        rootPath: dir,
        routes: [{ path: '/health' }],
        readiness: { kind: 'stdout', pattern: /never-fires/, timeoutMs: 30 },
        spawnFn: fakeSpawn,
        probeFn: fakeProbe,
      });

      expect(result.ready).toBe(false);
      expect(probeCalled).toBe(0);
      expect(result.teardown.signaled).toBe(true);
      expect(child.killed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
