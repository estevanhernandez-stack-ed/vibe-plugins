/**
 * Wins log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/wins.jsonl`. Pattern #14.
 *
 * STUB for checklist item #1. Full implementation lands with item #3.
 *
 * Three capture techniques (Pattern #14):
 *   1. Absence-of-friction inference — applied by `/evolve` at aggregation time.
 *   2. Explicit success markers — unambiguous positive reaction from the builder.
 *   3. External validation — cold-load success, testimonial, shared screenshot.
 */

export type WinEvent =
  | 'graceful_cold_load'
  | 'generation_accepted_all'
  | 'first_audit_useful'
  | 'gate_passed_in_ci'
  | 'dogfood_finding_reproduced'
  | 'explicit_positive_reaction'
  | 'absence_of_friction'
  | 'external_validation';

export interface WinEntry {
  schema_version: 1;
  timestamp: string;
  sessionUUID: string;
  plugin_version: string;
  command: string;
  event: WinEvent;
  context: string;
  /** True when the win is working-as-designed behavior. */
  working_as_designed: boolean;
  /** Short text describing what the builder saw / said. */
  symptom: string;
  project?: string | null;
}

/** Append a wins entry. Stub — replaced by item #3. */
export async function append(_entry: Partial<WinEntry>): Promise<void> {
  return;
}

/** Read recent win entries. Stub — returns []. */
export async function readRecent(_days: number): Promise<WinEntry[]> {
  return [];
}
