import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';

import {
  pollHealthEndpoint,
  pollStdoutSignature,
} from '../../../src/runtime/health-check.js';

describe('pollHealthEndpoint', () => {
  it('returns ready=true on first 2xx response', async () => {
    let called = 0;
    const fetchImpl = async (): Promise<{ status: number }> => {
      called += 1;
      return { status: 200 };
    };
    const result = await pollHealthEndpoint('http://localhost:1/', {
      fetchImpl,
      intervalMs: 5,
      timeoutMs: 200,
    });
    expect(result.ready).toBe(true);
    expect(result.attempts).toBe(1);
    expect(called).toBe(1);
    expect(result.lastStatus).toBe(200);
  });

  it('retries non-2xx and eventually succeeds', async () => {
    let called = 0;
    const fetchImpl = async (): Promise<{ status: number }> => {
      called += 1;
      return called < 3 ? { status: 502 } : { status: 200 };
    };
    const result = await pollHealthEndpoint('http://localhost:1/', {
      fetchImpl,
      intervalMs: 5,
      timeoutMs: 500,
    });
    expect(result.ready).toBe(true);
    expect(result.attempts).toBe(3);
  });

  it('returns ready=false when timeout exhausts', async () => {
    const fetchImpl = async (): Promise<{ status: number }> => {
      throw new Error('ECONNREFUSED');
    };
    const result = await pollHealthEndpoint('http://localhost:1/', {
      fetchImpl,
      intervalMs: 10,
      timeoutMs: 50,
    });
    expect(result.ready).toBe(false);
    expect(result.lastError).toContain('ECONNREFUSED');
    expect(result.attempts).toBeGreaterThanOrEqual(1);
  });

  it('honors a numeric expectStatus', async () => {
    const fetchImpl = async (): Promise<{ status: number }> => ({ status: 204 });
    const result = await pollHealthEndpoint('http://localhost:1/', {
      fetchImpl,
      intervalMs: 5,
      timeoutMs: 200,
      expectStatus: 204,
    });
    expect(result.ready).toBe(true);
  });
});

describe('pollStdoutSignature', () => {
  function makeFakeChild(): {
    stdout: EventEmitter;
    stderr: EventEmitter;
  } {
    return {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    };
  }

  it('resolves ready=true when stdout matches the pattern', async () => {
    const child = makeFakeChild();
    const promise = pollStdoutSignature(child as never, /local:\s+http:\/\/localhost:\d+/i, {
      timeoutMs: 1_000,
    });
    setTimeout(() => {
      child.stdout.emit('data', '  vite v5.0.0  dev server running\n');
      child.stdout.emit('data', '  Local:   http://localhost:5173/\n');
    }, 10);
    const result = await promise;
    expect(result.ready).toBe(true);
    expect(result.matchedLine).toContain('Local:');
  });

  it('reads stderr too', async () => {
    const child = makeFakeChild();
    const promise = pollStdoutSignature(child as never, /READY-MARKER/, {
      timeoutMs: 1_000,
    });
    setTimeout(() => {
      child.stderr.emit('data', 'noise\nREADY-MARKER\n');
    }, 10);
    const result = await promise;
    expect(result.ready).toBe(true);
  });

  it('resolves ready=false on timeout', async () => {
    const child = makeFakeChild();
    const result = await pollStdoutSignature(child as never, /never-matches/, {
      timeoutMs: 50,
    });
    expect(result.ready).toBe(false);
    expect(result.matchedLine).toBeUndefined();
  });

  it('caps captured lines at 200', async () => {
    const child = makeFakeChild();
    const promise = pollStdoutSignature(child as never, /STOP/, { timeoutMs: 500 });
    setTimeout(() => {
      const lines: string[] = [];
      for (let i = 0; i < 250; i += 1) lines.push(`line-${i}`);
      child.stdout.emit('data', lines.join('\n') + '\nSTOP\n');
    }, 10);
    const result = await promise;
    expect(result.ready).toBe(true);
    expect(result.capturedLines.length).toBeLessThanOrEqual(200);
  });
});
