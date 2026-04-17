/**
 * Session Logger — Self-Evolving Plugin Framework Level 2
 *
 * Append-only JSONL writer for per-command session entries. Schema is
 * shared across all Vibe plugins so /evolve commands can read each
 * plugin's logs uniformly.
 *
 * Each plugin sets its own log directory (e.g., ~/.claude/plugins/data/
 * vibe-cartographer/sessions/<date>.jsonl) but the entry shape and
 * write mechanics are common.
 *
 * Extraction status: STUB. The Vibe Cartographer session-logger SKILL
 * is the canonical schema reference. Phase 2 will lift the actual
 * write logic into this module; until then, plugins write directly
 * per their own SKILL instructions.
 */

export type Outcome = 'completed' | 'abandoned' | 'error' | 'partial';

export interface SessionEntry {
  schema_version: 1;
  timestamp: string;
  plugin: string;
  plugin_version: string;
  command: string;
  project_id: string | null;
  project_dir: string;
  mode: 'learner' | 'builder' | null;
  persona: 'professor' | 'cohort' | 'superdev' | 'architect' | 'coach' | null;
  outcome: Outcome;
  user_pushback: boolean;
  friction_notes: string[];
  key_decisions: string[];
  artifact_generated: string | null;
  complements_invoked: string[];
}

export interface AppendOptions {
  logDir: string;
}

export async function append(_entry: SessionEntry, _options: AppendOptions): Promise<void> {
  throw new Error('@626labs/plugin-core/session-logger not yet implemented. Phase 2 extraction pending.');
}
