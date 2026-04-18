/**
 * Health-check primitives for runtime hooks.
 *
 * Two readiness strategies:
 *   1. `pollHealthEndpoint` — HTTP GET with retry until the response status
 *      matches `expectStatus` (default 2xx-class) or the timeout elapses.
 *   2. `pollStdoutSignature` — read child process stdout/stderr lines until a
 *      signature pattern matches (e.g., `/local: http:\/\/localhost:\d+/i`)
 *      or the timeout elapses.
 *
 * Both helpers return structured results — callers (dev-server-probe) decide
 * how to react. Neither helper throws on a failed poll; only invalid arguments
 * produce errors. This keeps the dev-server-probe orchestrator's flow linear.
 *
 * No external HTTP library — Node's built-in `http`/`https` keep the dependency
 * surface small for a CLI binary that ships in CI.
 */

import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { ChildProcess } from 'node:child_process';

export interface PollHealthEndpointOptions {
  /** Time between attempts in ms. Default 200ms. */
  intervalMs?: number;
  /** Total time budget in ms. Default 15_000. */
  timeoutMs?: number;
  /**
   * Status code that signals "ready". When `'2xx'` (default), any 200-299 is
   * accepted. When a number, exact match.
   */
  expectStatus?: number | '2xx';
  /** Inject a custom fetch — used by tests to avoid real HTTP. */
  fetchImpl?: (url: string) => Promise<{ status: number }>;
}

export interface PollHealthEndpointResult {
  ready: boolean;
  attempts: number;
  /** First non-OK status seen (helps surface "got 502 every time"). */
  lastStatus?: number;
  /** Last error message (undefined when ready === true OR network was always reachable). */
  lastError?: string;
  elapsedMs: number;
}

const DEFAULT_INTERVAL_MS = 200;
const DEFAULT_TIMEOUT_MS = 15_000;

function statusMatches(status: number, expect: number | '2xx'): boolean {
  if (expect === '2xx') return status >= 200 && status < 300;
  return status === expect;
}

function defaultFetch(url: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    const lib = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = lib(
      {
        method: 'GET',
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname || '/'}${parsed.search || ''}`,
        timeout: 5_000,
      },
      (res: IncomingMessage) => {
        const status = res.statusCode ?? 0;
        // Drain to free the socket.
        res.on('data', () => {});
        res.on('end', () => resolve({ status }));
      },
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy(new Error('request timed out'));
    });
    req.end();
  });
}

export async function pollHealthEndpoint(
  url: string,
  options: PollHealthEndpointOptions = {},
): Promise<PollHealthEndpointResult> {
  const interval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expect = options.expectStatus ?? '2xx';
  const fetchImpl = options.fetchImpl ?? defaultFetch;

  const started = Date.now();
  let attempts = 0;
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  while (Date.now() - started < timeout) {
    attempts += 1;
    try {
      const res = await fetchImpl(url);
      lastStatus = res.status;
      if (statusMatches(res.status, expect)) {
        const result: PollHealthEndpointResult = {
          ready: true,
          attempts,
          elapsedMs: Date.now() - started,
        };
        if (lastStatus !== undefined) result.lastStatus = lastStatus;
        return result;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(interval);
  }

  const result: PollHealthEndpointResult = {
    ready: false,
    attempts,
    elapsedMs: Date.now() - started,
  };
  if (lastStatus !== undefined) result.lastStatus = lastStatus;
  if (lastError !== undefined) result.lastError = lastError;
  return result;
}

export interface PollStdoutSignatureOptions {
  /** Total time budget in ms. Default 15_000. */
  timeoutMs?: number;
}

export interface PollStdoutSignatureResult {
  ready: boolean;
  matchedLine?: string;
  /** All lines collected during the wait (capped at 200). */
  capturedLines: string[];
  elapsedMs: number;
}

/**
 * Read stdout + stderr of `child` until `signaturePattern` matches a single
 * line OR the timeout elapses. Does NOT detach the listeners on the child;
 * caller is expected to manage the child lifecycle (we just observe).
 *
 * The data stream is line-buffered internally so multi-line bursts are still
 * tested individually against the pattern. Captured lines are returned (capped
 * at 200) for diagnostic reporting.
 */
export function pollStdoutSignature(
  child: Pick<ChildProcess, 'stdout' | 'stderr'>,
  signaturePattern: RegExp,
  options: PollStdoutSignatureOptions = {},
): Promise<PollStdoutSignatureResult> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve) => {
    const started = Date.now();
    const captured: string[] = [];
    let stdoutBuf = '';
    let stderrBuf = '';
    let settled = false;

    const finish = (matched: string | undefined): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.stdout?.off('data', onStdout);
        child.stderr?.off('data', onStderr);
      } catch {
        /* listeners may already be detached */
      }
      const result: PollStdoutSignatureResult = {
        ready: matched !== undefined,
        capturedLines: captured.slice(0, 200),
        elapsedMs: Date.now() - started,
      };
      if (matched !== undefined) result.matchedLine = matched;
      resolve(result);
    };

    const handleLine = (line: string): boolean => {
      const trimmed = line.replace(/\r$/, '');
      if (trimmed.length === 0) return false;
      if (captured.length < 200) captured.push(trimmed);
      if (signaturePattern.test(trimmed)) {
        finish(trimmed);
        return true;
      }
      return false;
    };

    const onStdout = (chunk: Buffer | string): void => {
      stdoutBuf += chunk.toString();
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx);
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (handleLine(line)) return;
      }
    };

    const onStderr = (chunk: Buffer | string): void => {
      stderrBuf += chunk.toString();
      let idx;
      while ((idx = stderrBuf.indexOf('\n')) >= 0) {
        const line = stderrBuf.slice(0, idx);
        stderrBuf = stderrBuf.slice(idx + 1);
        if (handleLine(line)) return;
      }
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);

    const timer = setTimeout(() => finish(undefined), timeout);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
