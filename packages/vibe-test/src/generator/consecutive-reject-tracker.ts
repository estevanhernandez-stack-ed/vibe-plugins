/**
 * Consecutive-reject tracker — G4 rejection-pattern probe helper.
 *
 * The generate SKILL routes low-confidence tests inline with per-test
 * accept/reject UX. Every decision writes a session-log entry tagged with the
 * current sessionUUID and `event: "test_accepted" | "test_rejected"`.
 *
 * This module walks the session log (globally, across `~/.claude/plugins/
 * data/vibe-test/sessions/*.jsonl`) and computes the trailing consecutive
 * reject count for a given sessionUUID. At ≥3, the SKILL fires the probe.
 *
 * Probe-fire deduplication: once the SKILL asks the builder for guidance and
 * handles their response (captured as friction OR wins per Pattern #14), it
 * calls `markProbeFired(sessionUUID)` which appends a marker entry so the
 * probe doesn't re-trigger in the same session.
 *
 * Graceful degradation: missing/empty session log returns 0 — the probe just
 * never fires, which is the correct fallback (we'd rather miss a probe than
 * pester a builder based on corrupted instrumentation).
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { SessionEntry } from '../state/session-log.js';
import { sessionsDir, append as appendSessionLog } from '../state/session-log.js';

/**
 * Events the tracker cares about. The session-log type union is intentionally
 * open-ended; the tracker only switches on these four string values.
 */
export const REJECT_EVENT = 'test_rejected' as const;
export const ACCEPT_EVENT = 'test_accepted' as const;
export const PROBE_FIRED_EVENT = 'rejection_probe_fired' as const;
export const DEFAULT_PROBE_THRESHOLD = 3 as const;

export interface SessionEventLike {
  sessionUUID?: string;
  timestamp?: string;
  context?: {
    event?: string;
    [k: string]: unknown;
  } & Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * Read all session entries from the global sessions dir, across all date-
 * partitioned files. Entries are returned in filesystem-read order (already
 * chronological within each day; day files are iterated in lexical order).
 */
async function readAllSessionEntries(): Promise<SessionEventLike[]> {
  const dir = sessionsDir();
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  files.sort();
  const entries: SessionEventLike[] = [];
  for (const f of files) {
    if (!f.endsWith('.jsonl')) continue;
    const raw = await fs.readFile(join(dir, f), 'utf8').catch(() => '');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed) as SessionEventLike);
      } catch {
        // skip malformed lines — never block the probe on log drift
      }
    }
  }
  return entries;
}

function eventName(entry: SessionEventLike): string | undefined {
  const ctx = entry.context;
  if (ctx && typeof ctx.event === 'string') return ctx.event;
  // Support direct top-level `event` for defensive callers.
  const topLevel = (entry as { event?: unknown }).event;
  return typeof topLevel === 'string' ? topLevel : undefined;
}

/**
 * Count trailing consecutive `test_rejected` events for the given sessionUUID.
 * Any `test_accepted` event resets the count to 0. Probe-fired markers DO NOT
 * reset the counter — the probe is a read-only checkpoint, not a new accept
 * signal.
 *
 * Returns 0 on empty/missing session log.
 */
export async function getConsecutiveRejectCount(sessionUUID: string): Promise<number> {
  const entries = await readAllSessionEntries();
  const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
  let count = 0;
  for (const e of mine) {
    const ev = eventName(e);
    if (ev === REJECT_EVENT) {
      count += 1;
    } else if (ev === ACCEPT_EVENT) {
      count = 0;
    }
    // Other events (probe_fired, test_generated, generate sentinel, etc.) are
    // neutral — they don't advance or reset the streak.
  }
  return count;
}

/**
 * Return `true` when the session has hit the probe threshold AND the probe
 * hasn't been marked as fired yet for this session.
 *
 * `threshold` defaults to 3 per PRD G4.
 */
export async function shouldFireProbe(
  sessionUUID: string,
  threshold: number = DEFAULT_PROBE_THRESHOLD,
): Promise<boolean> {
  const entries = await readAllSessionEntries();
  const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
  let count = 0;
  let fired = false;
  for (const e of mine) {
    const ev = eventName(e);
    if (ev === REJECT_EVENT) {
      count += 1;
    } else if (ev === ACCEPT_EVENT) {
      count = 0;
    } else if (ev === PROBE_FIRED_EVENT) {
      fired = true;
    }
  }
  if (fired) return false;
  return count >= threshold;
}

/**
 * Append a marker entry so subsequent `shouldFireProbe` calls short-circuit.
 * The marker is a regular session-log line with `event: "rejection_probe_fired"`
 * in its context bag so `/evolve` can still see the probe happened.
 */
export async function markProbeFired(
  sessionUUID: string,
  opts: { command?: string; project?: string | null; pluginVersion?: string } = {},
): Promise<void> {
  await appendSessionLog({
    sessionUUID,
    command: (opts.command ?? 'generate') as SessionEntry['command'],
    project: opts.project ?? null,
    plugin_version: opts.pluginVersion,
    outcome: 'in_progress',
    context: {
      event: PROBE_FIRED_EVENT,
    },
  });
}

/**
 * Convenience: emit a `test_accepted` or `test_rejected` session-log entry
 * that `getConsecutiveRejectCount` + `shouldFireProbe` will see.
 * The generate SKILL calls this at every accept/reject decision.
 */
export interface FeedbackEventInput {
  sessionUUID: string;
  event: typeof ACCEPT_EVENT | typeof REJECT_EVENT;
  auditFindingId?: string;
  framework?: string;
  confidenceTier?: 'high' | 'medium' | 'low';
  rejectionReason?: string | null;
  project?: string | null;
  pluginVersion?: string;
  /**
   * When true, add a `dry_run: true` marker so `/evolve` can filter these
   * entries out of L2 aggregation. Per SKILL.md, dry-run session-log entries
   * are deferred in normal mode but if the SKILL chooses to write during a
   * dry-run it MUST tag them as such.
   */
  dryRun?: boolean;
}

export async function recordFeedbackEvent(input: FeedbackEventInput): Promise<void> {
  const context: Record<string, unknown> = {
    event: input.event,
  };
  if (input.auditFindingId !== undefined) context.audit_finding_id = input.auditFindingId;
  if (input.framework !== undefined) context.framework = input.framework;
  if (input.confidenceTier !== undefined) context.confidence_tier = input.confidenceTier;
  if (input.rejectionReason !== undefined && input.rejectionReason !== null) {
    context.rejection_reason = input.rejectionReason;
  }
  if (input.dryRun === true) context.dry_run = true;
  await appendSessionLog({
    sessionUUID: input.sessionUUID,
    command: 'generate',
    project: input.project ?? null,
    plugin_version: input.pluginVersion,
    outcome: 'in_progress',
    context,
  });
}
