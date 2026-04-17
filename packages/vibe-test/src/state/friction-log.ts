/**
 * Friction log — append-only JSONL at
 * `~/.claude/plugins/data/vibe-test/friction.jsonl`.
 *
 * Invoked by `skills/friction-logger/SKILL.md` at trigger points declared in
 * `skills/guide/references/friction-triggers.md`. Defensive default: when in
 * doubt, don't log (false positives poison `/evolve`). The SKILL enforces the
 * `repeat_question` quoted-prior gate before calling append; this module is
 * the dumb write path.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

import { appendJsonl } from './atomic-write.js';

export type FrictionType =
  | 'classification_mismatch'
  | 'generation_pattern_mismatch'
  | 'idiom_mismatch'
  | 'coverage_adapter_refused'
  | 'harness_break'
  | 'tier_threshold_dispute'
  | 'runtime_hook_failure'
  | 'composition_deferral_confusion'
  | 'command_abandoned'
  | 'default_overridden'
  | 'complement_rejected'
  | 'repeat_question'
  | 'artifact_rewritten'
  | 'sequence_revised'
  | 'rephrase_requested'
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
  agent_guess_at_cause?: string | null;
  command?: string;
  project?: string | null;
  complement_involved?: string | null;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

export function frictionFile(): string {
  return join(homedir(), '.claude', 'plugins', 'data', 'vibe-test', 'friction.jsonl');
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Append a friction entry. Caller supplies the semantic fields; this module
 * fills `schema_version`, `timestamp`, and `plugin_version` defaults.
 * Failures are surfaced via rejected promise — caller decides whether to
 * swallow (the SKILL-level policy is: never block the command).
 */
export async function append(partial: Partial<FrictionEntry>): Promise<void> {
  const entry: FrictionEntry = {
    schema_version: 1,
    timestamp: partial.timestamp ?? nowIso(),
    sessionUUID: partial.sessionUUID ?? '00000000-0000-0000-0000-000000000000',
    plugin_version: partial.plugin_version ?? DEFAULT_PLUGIN_VERSION,
    friction_type: (partial.friction_type ?? 'other') as FrictionType,
    symptom: partial.symptom ?? '',
    confidence: (partial.confidence ?? 'low') as FrictionConfidence,
    agent_guess_at_cause: partial.agent_guess_at_cause ?? null,
    command: partial.command,
    project: partial.project ?? null,
    complement_involved: partial.complement_involved ?? null,
  };

  // Defensive default: repeat_question requires quoted prior in symptom.
  if (entry.friction_type === 'repeat_question' && !entry.symptom.trim()) {
    return;
  }

  await appendJsonl(frictionFile(), entry);
}

export async function readRecent(days: number): Promise<FrictionEntry[]> {
  const file = frictionFile();
  const content = await fs.readFile(file, 'utf8').catch(() => '');
  if (!content) return [];
  const cutoff = Date.now() - days * 86_400_000;
  const out: FrictionEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed) as FrictionEntry;
      if (Date.parse(entry.timestamp) >= cutoff) out.push(entry);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}
