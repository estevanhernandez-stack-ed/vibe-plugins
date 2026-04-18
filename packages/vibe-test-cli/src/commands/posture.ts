/**
 * `vibe-test posture` — read-only ambient state summary.
 *
 * Per spec Component Areas > Posture: <=40 line banner + JSON sidecar, <3s
 * runtime, no execution side effects. Reads `.vibe-test/state.json`,
 * `.vibe-test/state/audit.json`, `.vibe-test/state/coverage.json` when present;
 * surfaces freshness + last action.
 */

import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';

import { detectCiContext, emitNotice } from '../stdout-protocol.js';

export interface PostureCommandOptions {
  cwd?: string;
  ci?: boolean;
}

export interface PostureCommandResult {
  exitCode: number;
  jsonPath: string | null;
}

interface PostureSummary {
  schema_version: 1;
  rendered_at: string;
  state_present: boolean;
  audit_present: boolean;
  audit_last_updated: string | null;
  coverage_present: boolean;
  coverage_last_updated: string | null;
  pending_count: number;
  freshness_hours: number | null;
  next_action_hint: string;
}

async function safeReadJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function countPending(repoRoot: string): Promise<number> {
  const root = join(repoRoot, '.vibe-test', 'pending');
  let count = 0;
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(abs);
      } else if (e.isFile() && !e.name.endsWith('.meta.json') && e.name !== 'index.md') {
        count += 1;
      }
    }
  }
  await walk(root);
  return count;
}

export async function runPostureCommand(options: PostureCommandOptions = {}): Promise<PostureCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const ctx = detectCiContext(options.ci);
  const startedAt = Date.now();

  const stateDir = join(cwd, '.vibe-test', 'state');
  const statePath = join(cwd, '.vibe-test', 'state.json');
  const auditPath = join(stateDir, 'audit.json');
  const coveragePath = join(stateDir, 'coverage.json');

  const state = await safeReadJson(statePath);
  const auditState = await safeReadJson(auditPath);
  const coverageState = await safeReadJson(coveragePath);
  const pendingCount = await countPending(cwd);

  const auditUpdated = auditState && typeof auditState.last_updated === 'string' ? auditState.last_updated : null;
  const coverageUpdated = coverageState && typeof coverageState.last_updated === 'string' ? coverageState.last_updated : null;

  let freshnessHours: number | null = null;
  if (auditUpdated) {
    const ms = Date.now() - new Date(auditUpdated).getTime();
    if (!Number.isNaN(ms)) freshnessHours = ms / (1000 * 60 * 60);
  }

  let hint: string;
  if (!state && !auditState) {
    hint = 'No prior runs detected. Start with `/vibe-test:audit` (or `vibe-test audit` for headless).';
  } else if (!auditState) {
    hint = 'State file present but no audit run found — try `/vibe-test:audit`.';
  } else if (pendingCount > 0) {
    hint = `${pendingCount} pending tests staged at .vibe-test/pending/ — review with /vibe-test:generate.`;
  } else if (freshnessHours !== null && freshnessHours > 24 * 7) {
    hint = `Audit is ${Math.floor(freshnessHours / 24)} days old — consider re-running /vibe-test:audit.`;
  } else {
    hint = 'State current. Run `/vibe-test:gate` to verify CI gate would pass.';
  }

  const summary: PostureSummary = {
    schema_version: 1,
    rendered_at: new Date().toISOString(),
    state_present: state !== null,
    audit_present: auditState !== null,
    audit_last_updated: auditUpdated,
    coverage_present: coverageState !== null,
    coverage_last_updated: coverageUpdated,
    pending_count: pendingCount,
    freshness_hours: freshnessHours,
    next_action_hint: hint,
  };

  const banner = [
    '----- Vibe Test posture -----',
    `state.json:        ${summary.state_present ? 'present' : 'absent'}`,
    `audit.json:        ${summary.audit_present ? `present (last_updated ${summary.audit_last_updated ?? '?'})` : 'absent'}`,
    `coverage.json:     ${summary.coverage_present ? `present (last_updated ${summary.coverage_last_updated ?? '?'})` : 'absent'}`,
    `pending tests:     ${summary.pending_count}`,
    `audit freshness:   ${summary.freshness_hours === null ? 'n/a' : `${summary.freshness_hours.toFixed(1)}h`}`,
    '',
    `Next action: ${summary.next_action_hint}`,
    '-----------------------------',
  ].join('\n');
  process.stdout.write(`${banner}\n`);

  // Write the JSON sidecar.
  await fs.mkdir(stateDir, { recursive: true });
  const sidecarPath = join(stateDir, 'posture.json');
  await fs.writeFile(sidecarPath, JSON.stringify(summary, null, 2), 'utf8');

  emitNotice(
    `posture: ${summary.next_action_hint} (rendered in ${Date.now() - startedAt}ms)`,
    ctx,
  );

  return { exitCode: 0, jsonPath: sidecarPath };
}
