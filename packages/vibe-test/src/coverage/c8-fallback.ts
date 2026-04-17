/**
 * c8 fallback — shells `npx c8 --all --reporter json --reporter text <cmd>`
 * when the framework adapter is refused or missing.
 *
 * Surface:
 *   runC8({ command, args, cwd }) → Promise<C8Result>
 *
 * We deliberately use `execFile`-style invocation (argv-array, no shell) to
 * avoid injection. When the command arrives as a single string from user
 * config, we split on whitespace conservatively.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runChild = promisify(execFile);

export interface C8Input {
  /** Command to run under c8 (e.g., `vitest` or `jest`). */
  command: string;
  /** Arguments passed to the wrapped command. */
  args?: string[];
  cwd: string;
  /** Extra c8 args beyond `--all --reporter json --reporter text`. */
  c8ExtraArgs?: string[];
  /** Timeout (ms). Default 5 minutes. */
  timeoutMs?: number;
  /**
   * Injection point for tests — when provided, skip the real child process and
   * return this payload. Tests supply a fake JSON summary here.
   */
  shellOverride?: (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

export interface C8Summary {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export interface C8Result {
  ok: boolean;
  /** Parsed summary from c8's JSON reporter. */
  summary: C8Summary | null;
  /** Raw stdout — text reporter output. */
  stdoutText: string;
  /** Raw stderr. */
  stderrText: string;
  /** Files c8 reported on (for denominator-check). */
  reported_files: string[];
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function parseC8Json(stdout: string): { summary: C8Summary | null; files: string[] } {
  // c8 with --reporter json emits a JSON document mixed into stdout. We scan
  // for the first `{` through the matching `}` to get it.
  const start = stdout.indexOf('{');
  if (start === -1) return { summary: null, files: [] };
  const jsonText = stdout.slice(start);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { summary: null, files: [] };
  }
  if (!parsed || typeof parsed !== 'object') return { summary: null, files: [] };

  const obj = parsed as Record<string, unknown>;
  const total = (obj.total as Record<string, { pct?: number }> | undefined) ?? null;
  const summary: C8Summary | null = total
    ? {
        lines: total.lines?.pct ?? 0,
        statements: total.statements?.pct ?? 0,
        functions: total.functions?.pct ?? 0,
        branches: total.branches?.pct ?? 0,
      }
    : null;

  const files: string[] = [];
  for (const key of Object.keys(obj)) {
    if (key === 'total') continue;
    files.push(key);
  }
  return { summary, files };
}

export async function runC8(input: C8Input): Promise<C8Result> {
  const args = [
    '--all',
    '--reporter',
    'json',
    '--reporter',
    'text',
    ...(input.c8ExtraArgs ?? []),
    '--',
    input.command,
    ...(input.args ?? []),
  ];

  try {
    const rawRes = input.shellOverride
      ? await input.shellOverride('c8', args)
      : await runChild('npx', ['--yes', 'c8', ...args], {
          cwd: input.cwd,
          timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          maxBuffer: 50 * 1024 * 1024,
        });
    const res = rawRes as { stdout: unknown; stderr: unknown };
    const stdoutText = typeof res.stdout === 'string'
      ? res.stdout
      : res.stdout instanceof Buffer
        ? res.stdout.toString()
        : String(res.stdout ?? '');
    const stderrText = typeof res.stderr === 'string'
      ? res.stderr
      : res.stderr instanceof Buffer
        ? res.stderr.toString()
        : String(res.stderr ?? '');
    const { summary, files } = parseC8Json(stdoutText);
    return {
      ok: true,
      summary,
      stdoutText,
      stderrText,
      reported_files: files,
    };
  } catch (err) {
    const e = err as { stdout?: unknown; stderr?: unknown; code?: number | string };
    const stdoutText = typeof e.stdout === 'string'
      ? e.stdout
      : e.stdout instanceof Buffer
        ? e.stdout.toString()
        : '';
    const stderrText = typeof e.stderr === 'string'
      ? e.stderr
      : e.stderr instanceof Buffer
        ? e.stderr.toString()
        : '';
    return {
      ok: false,
      summary: null,
      stdoutText,
      stderrText,
      reported_files: [],
    };
  }
}
