/**
 * Session log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/sessions/<YYYY-MM-DD>.jsonl`.
 *
 * STUB for checklist item #1. Full implementation lands with item #3 (shared
 * SKILL scaffolding — the session-logger SKILL is the primary caller).
 */

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

export type SessionOutcome = 'in_progress' | 'completed' | 'aborted' | 'errored';

export interface SessionEntry {
  schema_version: 1;
  timestamp: string;
  sessionUUID: string;
  command: SessionCommand;
  project: string | null;
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
  /** Free-form context bag for SKILL-specific payloads. */
  context?: Record<string, unknown>;
}

/** Append a session-log entry. Stub — replaced by item #3. */
export async function append(_entry: Partial<SessionEntry>): Promise<void> {
  return;
}

/** Read recent session entries (last N days). Stub — returns []. */
export async function readRecent(_days: number): Promise<SessionEntry[]> {
  return [];
}
