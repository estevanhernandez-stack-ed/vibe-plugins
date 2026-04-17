/**
 * Cross-plugin coordination beacons — append-only JSONL at
 * `<project>/.626labs/beacons.jsonl`. Pattern #12.
 *
 * Every command terminal writes a beacon so sibling plugins (Vibe Cartographer,
 * Vibe Doc, Vibe Sec) can observe and stitch cross-plugin session context.
 *
 * STUB for checklist item #1. Full implementation lands with item #3.
 */

export interface BeaconEntry {
  schema_version: 1;
  timestamp: string;
  plugin: 'vibe-test';
  plugin_version: string;
  command: string;
  sessionUUID: string;
  outcome: 'completed' | 'aborted' | 'errored';
  /** Optional next-hint for other plugins to pick up. */
  hint?: string;
  project?: string | null;
}

/** Append a beacon for the given project root. Stub — replaced by item #3. */
export async function append(
  _repoRoot: string,
  _entry: Partial<BeaconEntry>,
): Promise<void> {
  return;
}

/** Read recent beacons from this project (for posture / cross-plugin introspection). Stub. */
export async function readRecent(
  _repoRoot: string,
  _limit: number,
): Promise<BeaconEntry[]> {
  return [];
}
