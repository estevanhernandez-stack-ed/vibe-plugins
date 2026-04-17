/**
 * Cross-plugin coordination beacons — append-only JSONL at
 * `<project>/.626labs/beacons.jsonl`. Pattern #12.
 *
 * Every command terminal writes a beacon so sibling plugins (Vibe Cartographer,
 * Vibe Doc, Vibe Sec) can observe and stitch cross-plugin session context.
 */

import { join } from 'node:path';
import { promises as fs } from 'node:fs';

import { appendJsonl } from './atomic-write.js';

export interface BeaconEntry {
  schema_version: 1;
  timestamp: string;
  plugin: 'vibe-test';
  plugin_version: string;
  command: string;
  sessionUUID: string;
  outcome: 'completed' | 'aborted' | 'errored' | 'partial';
  hint?: string;
  project?: string | null;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

export function beaconsFile(repoRoot: string): string {
  return join(repoRoot, '.626labs', 'beacons.jsonl');
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function append(
  repoRoot: string,
  partial: Partial<BeaconEntry>,
): Promise<void> {
  const entry: BeaconEntry = {
    schema_version: 1,
    timestamp: partial.timestamp ?? nowIso(),
    plugin: 'vibe-test',
    plugin_version: partial.plugin_version ?? DEFAULT_PLUGIN_VERSION,
    command: partial.command ?? 'unknown',
    sessionUUID: partial.sessionUUID ?? '00000000-0000-0000-0000-000000000000',
    outcome: (partial.outcome ?? 'completed') as BeaconEntry['outcome'],
    hint: partial.hint,
    project: partial.project ?? null,
  };
  await appendJsonl(beaconsFile(repoRoot), entry);
}

export async function readRecent(
  repoRoot: string,
  limit: number,
): Promise<BeaconEntry[]> {
  const file = beaconsFile(repoRoot);
  const content = await fs.readFile(file, 'utf8').catch(() => '');
  if (!content) return [];
  const out: BeaconEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as BeaconEntry);
    } catch {
      // skip malformed
    }
  }
  return out.slice(-limit);
}
