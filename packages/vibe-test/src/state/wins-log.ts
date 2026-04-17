/**
 * Wins log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/wins.jsonl`. Pattern #14.
 *
 * Invoked by `skills/wins-logger/SKILL.md`. Three capture techniques:
 *   1. Absence-of-friction inference — applied by `/evolve` at aggregation time.
 *   2. Explicit success markers — unambiguous positive reaction from the builder.
 *   3. External validation — cold-load success, testimonial, shared screenshot.
 *
 * Conservative threshold: never auto-inferred from a single signal; the SKILL
 * enforces the guardrails, this module is the dumb write path.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

import { appendJsonl } from './atomic-write.js';

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
  working_as_designed: boolean;
  symptom: string;
  project?: string | null;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

export function winsFile(): string {
  return join(homedir(), '.claude', 'plugins', 'data', 'vibe-test', 'wins.jsonl');
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function append(partial: Partial<WinEntry>): Promise<void> {
  const entry: WinEntry = {
    schema_version: 1,
    timestamp: partial.timestamp ?? nowIso(),
    sessionUUID: partial.sessionUUID ?? '00000000-0000-0000-0000-000000000000',
    plugin_version: partial.plugin_version ?? DEFAULT_PLUGIN_VERSION,
    command: partial.command ?? 'unknown',
    event: (partial.event ?? 'absence_of_friction') as WinEvent,
    context: partial.context ?? '',
    working_as_designed: partial.working_as_designed ?? true,
    symptom: partial.symptom ?? '',
    project: partial.project ?? null,
  };
  await appendJsonl(winsFile(), entry);
}

export async function readRecent(days: number): Promise<WinEntry[]> {
  const file = winsFile();
  const content = await fs.readFile(file, 'utf8').catch(() => '');
  if (!content) return [];
  const cutoff = Date.now() - days * 86_400_000;
  const out: WinEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed) as WinEntry;
      if (Date.parse(entry.timestamp) >= cutoff) out.push(entry);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}
