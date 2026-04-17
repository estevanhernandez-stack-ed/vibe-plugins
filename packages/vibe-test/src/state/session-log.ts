/**
 * Session log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/sessions/<YYYY-MM-DD>.jsonl`.
 *
 * Invoked by `skills/session-logger/SKILL.md`. Two-phase protocol per
 * Cart-lineage: sentinel (outcome=in_progress) at command start, terminal
 * (outcome in completed|aborted|errored|partial) at command end. Both entries
 * share a `sessionUUID` so paired lookup works across the day's log.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';

import { appendJsonl } from './atomic-write.js';

export type SessionCommand =
  | 'router'
  | 'audit'
  | 'generate'
  | 'fix'
  | 'coverage'
  | 'gate'
  | 'posture'
  | 'evolve'
  | 'vitals';

export type SessionOutcome =
  | 'in_progress'
  | 'completed'
  | 'aborted'
  | 'errored'
  | 'partial';

export interface SessionEntry {
  schema_version: 1;
  timestamp: string;
  sessionUUID: string;
  command: SessionCommand;
  project: string | null;
  plugin: 'vibe-test';
  plugin_version: string;
  outcome: SessionOutcome;
  tests_generated?: number;
  tests_accepted?: number;
  tests_rejected?: number;
  rejection_reasons?: string[];
  levels_covered?: string[];
  framework_used?: string;
  friction_notes?: string[];
  key_decisions?: string[];
  complements_invoked?: string[];
  artifact_generated?: string | null;
  mode?: 'learner' | 'builder' | null;
  persona?: string | null;
  /** Free-form context bag for SKILL-specific payloads. */
  context?: Record<string, unknown>;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function sessionsDir(): string {
  return join(homedir(), '.claude', 'plugins', 'data', 'vibe-test', 'sessions');
}

export function todaysSessionFile(): string {
  return join(sessionsDir(), `${todayIsoDate()}.jsonl`);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Write the sentinel entry and return the sessionUUID the caller holds until
 * `end()` is called. A non-fatal write failure is swallowed — session logging
 * is instrumentation, not critical path.
 */
export async function start(
  command: SessionCommand,
  project: string | null,
  opts: { pluginVersion?: string; extra?: Partial<SessionEntry> } = {},
): Promise<string> {
  const sessionUUID = randomUUID();
  const entry: SessionEntry = {
    schema_version: 1,
    timestamp: nowIso(),
    sessionUUID,
    command,
    project,
    plugin: 'vibe-test',
    plugin_version: opts.pluginVersion ?? DEFAULT_PLUGIN_VERSION,
    outcome: 'in_progress',
    ...(opts.extra ?? {}),
  };

  try {
    await appendJsonl(todaysSessionFile(), entry);
  } catch {
    // Instrumentation — never block the command on session logging failure.
  }
  return sessionUUID;
}

/**
 * Write the terminal entry paired to a sentinel by sessionUUID.
 * Caller supplies at minimum `sessionUUID`, `command`, and `outcome`; this
 * function fills audit fields. No validation blocks the write — malformed
 * entries are still persisted (downstream tooling tolerates drift).
 */
export async function end(
  entry: Partial<SessionEntry> & {
    sessionUUID: string;
    command: SessionCommand;
    outcome: Exclude<SessionOutcome, 'in_progress'>;
  },
  opts: { pluginVersion?: string } = {},
): Promise<void> {
  const full: SessionEntry = {
    schema_version: 1,
    timestamp: nowIso(),
    plugin: 'vibe-test',
    plugin_version: opts.pluginVersion ?? DEFAULT_PLUGIN_VERSION,
    project: entry.project ?? null,
    ...entry,
  } as SessionEntry;

  try {
    await appendJsonl(todaysSessionFile(), full);
  } catch {
    // Instrumentation — never block the command on session logging failure.
  }
}

/**
 * Generic append (used by tests + smoke scripts).
 * Entry is persisted verbatim after audit-field defaults are filled.
 */
export async function append(partial: Partial<SessionEntry>): Promise<void> {
  const full: SessionEntry = {
    schema_version: 1,
    timestamp: partial.timestamp ?? nowIso(),
    sessionUUID: partial.sessionUUID ?? randomUUID(),
    command: (partial.command ?? 'router') as SessionCommand,
    project: partial.project ?? null,
    plugin: 'vibe-test',
    plugin_version: partial.plugin_version ?? DEFAULT_PLUGIN_VERSION,
    outcome: (partial.outcome ?? 'completed') as SessionOutcome,
    ...partial,
  } as SessionEntry;
  try {
    await appendJsonl(todaysSessionFile(), full);
  } catch {
    // Instrumentation.
  }
}

/** Read recent session entries (last N days). */
export async function readRecent(days: number): Promise<SessionEntry[]> {
  const dir = sessionsDir();
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const cutoff = Date.now() - days * 86_400_000;
  const out: SessionEntry[] = [];
  for (const f of files) {
    if (!f.endsWith('.jsonl')) continue;
    const dateStr = f.replace(/\.jsonl$/, '');
    const t = Date.parse(`${dateStr}T00:00:00`);
    if (Number.isNaN(t) || t < cutoff) continue;
    const content = await fs.readFile(join(dir, f), 'utf8').catch(() => '');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed) as SessionEntry);
      } catch {
        // skip malformed lines
      }
    }
  }
  return out;
}
