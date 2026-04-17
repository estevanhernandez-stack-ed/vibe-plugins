/**
 * Friction log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/friction.jsonl`.
 *
 * STUB for checklist item #1. Full implementation lands with item #3 — the
 * friction-logger SKILL invokes `append()` at the per-command trigger points
 * declared in `skills/guide/references/friction-triggers.md`.
 */

export type FrictionType =
  | 'classification_mismatch'
  | 'generation_pattern_mismatch'
  | 'idiom_mismatch'
  | 'coverage_adapter_refused'
  | 'harness_break'
  | 'tier_threshold_dispute'
  | 'runtime_hook_failure'
  | 'composition_deferral_confusion'
  | 'other';

export type FrictionConfidence = 'high' | 'medium' | 'low';

export interface FrictionEntry {
  schema_version: 1;
  timestamp: string;
  sessionUUID: string;
  plugin_version: string;
  friction_type: FrictionType;
  symptom: string;
  confidence: FrictionConfidence;
  agent_guess_at_cause?: string;
  command?: string;
  project?: string | null;
}

/** Append a friction entry. Stub — replaced by item #3. */
export async function append(_entry: Partial<FrictionEntry>): Promise<void> {
  return;
}

/** Read recent friction entries (last N days). Stub — returns []. */
export async function readRecent(_days: number): Promise<FrictionEntry[]> {
  return [];
}
