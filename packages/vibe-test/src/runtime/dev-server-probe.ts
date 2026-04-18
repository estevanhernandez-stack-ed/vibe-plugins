/**
 * Dev-server probe — Path A for API-heavy apps.
 *
 * The runtime hook that lets `/vibe-test:generate --with-runtime=dev-server`
 * spin up the project's `npm run dev` (or whatever script the package.json
 * exposes), wait for readiness, probe a handful of routes from the audit
 * inventory, and shut everything down cleanly.
 *
 * Lifecycle:
 *   1. detectDevCommand    — read package.json for scripts.dev/start
 *   2. allocateFreePort    — bind a transient TCP server, get the OS port
 *   3. spawnDevServer      — child process with stdio piped + cwd + env
 *   4. (caller polls health-check helpers until ready)
 *   5. probeRoute          — issue a single HTTP request and capture timing
 *   6. teardownDevServer   — SIGTERM, then SIGKILL after 5s, reap child
 *
 * `runDevServerProbe` orchestrates the full flow as a one-shot for CLI use.
 *
 * No process leaks: even on probe failure, teardown is called inside a
 * try/finally. Tests inject a `spawnFn` to avoid touching real processes.
 */

import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { createServer } from 'node:net';
import { promises as fs } from 'node:fs';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';

import {
  pollHealthEndpoint,
  pollStdoutSignature,
  type PollHealthEndpointOptions,
  type PollHealthEndpointResult,
  type PollStdoutSignatureResult,
} from './health-check.js';

export interface DetectDevCommandResult {
  /** Resolved command (e.g., `"npm run dev"` or `"vite --port 3000"`). `null` when neither dev nor start exists. */
  command: string | null;
  /** Which package.json key the command came from. */
  source: 'scripts.dev' | 'scripts.start' | null;
  /** Best-guess port hint parsed from the command (e.g., `--port 3000`). `null` when not present. */
  portHint: number | null;
}

const PORT_FLAG_PATTERNS: RegExp[] = [
  /--port[\s=](\d{2,5})/i,
  /-p[\s=](\d{2,5})/i,
  /PORT=(\d{2,5})/,
];

export async function detectDevCommand(packageJsonPath: string): Promise<DetectDevCommandResult> {
  let raw: string;
  try {
    raw = await fs.readFile(packageJsonPath, 'utf8');
  } catch {
    return { command: null, source: null, portHint: null };
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { command: null, source: null, portHint: null };
  }
  const scripts = (parsed.scripts ?? {}) as Record<string, string>;
  const dev = typeof scripts.dev === 'string' ? scripts.dev : null;
  const start = typeof scripts.start === 'string' ? scripts.start : null;
  const command = dev ?? start;
  const source: DetectDevCommandResult['source'] = dev ? 'scripts.dev' : start ? 'scripts.start' : null;

  let portHint: number | null = null;
  if (command) {
    for (const re of PORT_FLAG_PATTERNS) {
      const m = re.exec(command);
      if (m && m[1]) {
        const n = Number(m[1]);
        if (!Number.isNaN(n) && n > 0 && n < 65_536) {
          portHint = n;
          break;
        }
      }
    }
  }

  return { command, source, portHint };
}

/**
 * Bind to port 0 (let OS pick a free port), then close immediately and return
 * the chosen port. Race-prone in theory; fine in practice for dev servers
 * that bind seconds later. Caller can pass the port to the dev server via
 * `PORT=<n>` or `--port=<n>` env / arg.
 */
export function allocateFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close();
        reject(new Error('allocateFreePort: failed to read transient server address'));
      }
    });
  });
}

export interface SpawnDevServerInput {
  /** Full command to invoke, e.g., `"npm run dev"`. */
  command: string;
  /** Port the dev server should bind to. Passed in env as PORT and to the script via -- --port=<n>. */
  port: number;
  /** Working directory; usually the project root. */
  cwd: string;
  /** Extra env vars merged on top of the parent's env. */
  env?: NodeJS.ProcessEnv;
  /** Override the spawn implementation (tests). */
  spawnFn?: typeof spawn;
}

export interface DevServerHandle {
  child: ChildProcess;
  port: number;
  command: string;
  cwd: string;
  startedAt: string;
}

/**
 * Spawn the dev server. The command string is parsed naively (whitespace-split)
 * for portability — no shell interpolation, no pipes. PORT is set in env.
 * We use spawn (NOT shell-eval) so user input cannot escape into shell metacharacters.
 */
export function spawnDevServer(input: SpawnDevServerInput): DevServerHandle {
  const parts = input.command.trim().split(/\s+/);
  const head = parts[0];
  if (!head) {
    throw new Error('spawnDevServer: empty command');
  }
  const args = parts.slice(1);
  const spawnImpl = input.spawnFn ?? spawn;
  const opts: SpawnOptions = {
    cwd: input.cwd,
    env: {
      ...process.env,
      ...(input.env ?? {}),
      PORT: String(input.port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: false,
  };
  const child = spawnImpl(head, args, opts);
  return {
    child,
    port: input.port,
    command: input.command,
    cwd: input.cwd,
    startedAt: new Date().toISOString(),
  };
}

export interface ProbeRouteInput {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  payload?: unknown;
  headers?: Record<string, string>;
  /** Inject custom request — used by tests. */
  requestFn?: (input: ProbeRouteInput) => Promise<ProbeObservation>;
  /** Per-request timeout. Default 5_000ms. */
  timeoutMs?: number;
}

export interface ProbeObservation {
  url: string;
  method: string;
  status: number;
  /** First 4KB of response body — caller uses for shape inference. */
  bodyPreview: string;
  durationMs: number;
  /** Subset of response headers we care about. */
  responseHeaders: { 'content-type'?: string };
  error?: string;
}

export async function probeRoute(input: ProbeRouteInput): Promise<ProbeObservation> {
  if (input.requestFn) return input.requestFn(input);
  const method = input.method ?? 'GET';
  const url = `${input.baseUrl.replace(/\/$/, '')}${input.path.startsWith('/') ? '' : '/'}${input.path}`;
  const started = Date.now();
  return new Promise<ProbeObservation>((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      resolve({
        url,
        method,
        status: 0,
        bodyPreview: '',
        durationMs: Date.now() - started,
        responseHeaders: {},
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    const lib = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers: Record<string, string> = { ...(input.headers ?? {}) };
    let body: Buffer | null = null;
    if (input.payload !== undefined) {
      const text = typeof input.payload === 'string' ? input.payload : JSON.stringify(input.payload);
      body = Buffer.from(text, 'utf8');
      if (!headers['content-type']) headers['content-type'] = 'application/json';
      headers['content-length'] = String(body.byteLength);
    }
    const req = lib(
      {
        method,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname || '/'}${parsed.search || ''}`,
        headers,
        timeout: input.timeoutMs ?? 5_000,
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          if (total < 4096) {
            chunks.push(chunk);
            total += chunk.length;
          }
        });
        res.on('end', () => {
          const preview = Buffer.concat(chunks).toString('utf8').slice(0, 4096);
          const ct = (res.headers['content-type'] as string | undefined) ?? undefined;
          const responseHeaders: ProbeObservation['responseHeaders'] = {};
          if (ct) responseHeaders['content-type'] = ct;
          resolve({
            url,
            method,
            status: res.statusCode ?? 0,
            bodyPreview: preview,
            durationMs: Date.now() - started,
            responseHeaders,
          });
        });
      },
    );
    req.on('error', (err) => {
      resolve({
        url,
        method,
        status: 0,
        bodyPreview: '',
        durationMs: Date.now() - started,
        responseHeaders: {},
        error: err.message,
      });
    });
    req.on('timeout', () => req.destroy(new Error('probeRoute: request timed out')));
    if (body) req.write(body);
    req.end();
  });
}

export interface TeardownOptions {
  /** Time to wait between SIGTERM and SIGKILL. Default 5_000ms. */
  killTimeoutMs?: number;
}

export interface TeardownResult {
  signaled: boolean;
  killed: boolean;
  exitCode: number | null;
  durationMs: number;
}

/**
 * Send SIGTERM, wait `killTimeoutMs`, then SIGKILL if still alive. Resolves
 * once the child reports `exit`. If the child never exits (Windows quirks),
 * we resolve after a hard ceiling of 2x killTimeoutMs.
 */
export function teardownDevServer(
  handle: DevServerHandle,
  options: TeardownOptions = {},
): Promise<TeardownResult> {
  const killTimeout = options.killTimeoutMs ?? 5_000;
  const started = Date.now();
  return new Promise<TeardownResult>((resolve) => {
    const child = handle.child;
    let signaled = false;
    let killed = false;
    let resolved = false;

    let killTimer: ReturnType<typeof setTimeout> | null = null;
    let hardCeiling: ReturnType<typeof setTimeout> | null = null;

    const finish = (exitCode: number | null): void => {
      if (resolved) return;
      resolved = true;
      if (killTimer) clearTimeout(killTimer);
      if (hardCeiling) clearTimeout(hardCeiling);
      resolve({
        signaled,
        killed,
        exitCode,
        durationMs: Date.now() - started,
      });
    };

    if (child.exitCode !== null && child.exitCode !== undefined) {
      finish(child.exitCode);
      return;
    }

    child.once('exit', (code) => finish(code));

    try {
      child.kill('SIGTERM');
      signaled = true;
    } catch {
      // already gone
    }

    killTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
        killed = true;
      } catch {
        /* already gone */
      }
    }, killTimeout);

    // Hard ceiling so we never hang on a misbehaving child.
    hardCeiling = setTimeout(() => finish(child.exitCode ?? null), killTimeout * 2);
  });
}

export interface RouteSpec {
  path: string;
  method?: ProbeRouteInput['method'];
  payload?: unknown;
  headers?: Record<string, string>;
}

export interface RunDevServerProbeInput {
  rootPath: string;
  routes: RouteSpec[];
  /**
   * Override the resolved command. When omitted, `detectDevCommand` is run
   * against `<rootPath>/package.json`.
   */
  commandOverride?: string;
  /** Override the port. When omitted, a free port is allocated. */
  portOverride?: number;
  /**
   * Readiness strategy. When `'health'` (default), HTTP GET on `/`. When
   * `'stdout'`, watches stdout for the supplied pattern. When both are
   * supplied, whichever fires first wins.
   */
  readiness?:
    | { kind: 'health'; path?: string; options?: PollHealthEndpointOptions }
    | { kind: 'stdout'; pattern: RegExp; timeoutMs?: number }
    | {
        kind: 'either';
        healthPath?: string;
        healthOptions?: PollHealthEndpointOptions;
        stdoutPattern: RegExp;
        timeoutMs?: number;
      };
  spawnFn?: typeof spawn;
  /** Override the probe function — useful for tests. */
  probeFn?: typeof probeRoute;
  env?: NodeJS.ProcessEnv;
}

export interface RunDevServerProbeResult {
  command: string;
  port: number;
  startedAt: string;
  ready: boolean;
  readiness: {
    kind: 'health' | 'stdout' | 'either';
    health?: PollHealthEndpointResult;
    stdout?: PollStdoutSignatureResult;
  };
  observations: ProbeObservation[];
  teardown: TeardownResult;
  error?: string;
}

/**
 * One-shot orchestration: detect to spawn to wait to probe to teardown.
 * Returns structured observations. NEVER throws — even on detect failure or
 * spawn failure, returns `{ready: false, error}` so the SKILL can degrade
 * to static.
 */
export async function runDevServerProbe(
  input: RunDevServerProbeInput,
): Promise<RunDevServerProbeResult> {
  const detectResult = input.commandOverride
    ? { command: input.commandOverride }
    : await detectDevCommand(join(input.rootPath, 'package.json'));
  if (!detectResult.command) {
    return {
      command: '',
      port: 0,
      startedAt: new Date().toISOString(),
      ready: false,
      readiness: { kind: input.readiness?.kind ?? 'health' },
      observations: [],
      teardown: { signaled: false, killed: false, exitCode: null, durationMs: 0 },
      error: 'no `scripts.dev` or `scripts.start` found in package.json',
    };
  }

  const port = input.portOverride ?? (await allocateFreePort());
  const handle = spawnDevServer({
    command: detectResult.command,
    port,
    cwd: input.rootPath,
    ...(input.env ? { env: input.env } : {}),
    ...(input.spawnFn ? { spawnFn: input.spawnFn } : {}),
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const readinessKind = input.readiness?.kind ?? 'health';
  const readinessResult: RunDevServerProbeResult['readiness'] = { kind: readinessKind };
  let ready = false;

  try {
    if (input.readiness?.kind === 'stdout') {
      const r = await pollStdoutSignature(handle.child, input.readiness.pattern, {
        timeoutMs: input.readiness.timeoutMs ?? 15_000,
      });
      readinessResult.stdout = r;
      ready = r.ready;
    } else if (input.readiness?.kind === 'either') {
      const healthPromise = pollHealthEndpoint(
        `${baseUrl}${input.readiness.healthPath ?? '/'}`,
        input.readiness.healthOptions ?? {},
      );
      const stdoutPromise = pollStdoutSignature(handle.child, input.readiness.stdoutPattern, {
        timeoutMs: input.readiness.timeoutMs ?? 15_000,
      });
      const winner = await Promise.race([
        healthPromise.then((r) => ({ kind: 'health' as const, r })),
        stdoutPromise.then((r) => ({ kind: 'stdout' as const, r })),
      ]);
      if (winner.kind === 'health') {
        readinessResult.health = winner.r;
        ready = winner.r.ready;
      } else {
        readinessResult.stdout = winner.r;
        ready = winner.r.ready;
      }
    } else {
      const r = await pollHealthEndpoint(
        `${baseUrl}${input.readiness?.kind === 'health' ? input.readiness.path ?? '/' : '/'}`,
        input.readiness?.kind === 'health' ? input.readiness.options ?? {} : {},
      );
      readinessResult.health = r;
      ready = r.ready;
    }

    const observations: ProbeObservation[] = [];
    if (ready) {
      const probeImpl = input.probeFn ?? probeRoute;
      for (const route of input.routes) {
        const probeInput: ProbeRouteInput = {
          baseUrl,
          path: route.path,
        };
        if (route.method !== undefined) probeInput.method = route.method;
        if (route.payload !== undefined) probeInput.payload = route.payload;
        if (route.headers !== undefined) probeInput.headers = route.headers;
        const obs = await probeImpl(probeInput);
        observations.push(obs);
      }
    }

    const teardown = await teardownDevServer(handle);
    return {
      command: detectResult.command,
      port,
      startedAt: handle.startedAt,
      ready,
      readiness: readinessResult,
      observations,
      teardown,
    };
  } catch (err) {
    const teardown = await teardownDevServer(handle).catch(() => ({
      signaled: false,
      killed: false,
      exitCode: null,
      durationMs: 0,
    }));
    return {
      command: detectResult.command,
      port,
      startedAt: handle.startedAt,
      ready,
      readiness: readinessResult,
      observations: [],
      teardown,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
