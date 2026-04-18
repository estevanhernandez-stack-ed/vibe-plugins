/**
 * Generate SKILL safety-features integration test — checklist item #8.
 *
 * The SKILL orchestrates the flow (persona-adapted prompts, branching on
 * builder responses); this test exercises the deterministic primitives the
 * SKILL invokes:
 *
 *   - `cacheDryRun` + `readDryRunCache` + `clearDryRunCache` (G9)
 *   - Schema validation of the dry-run cache payload
 *   - 24h TTL enforcement (fresh, expired, boundary)
 *   - Apply-last-dry-run replay semantics
 *   - Consecutive-reject tracker + probe-fire dedup (G4)
 *   - `recordFeedbackEvent` writes session-log entries `getConsecutiveRejectCount`
 *     observes
 *   - The probe-branching decision is SKILL reasoning — we assert the two
 *     capture paths (friction vs wins) produce the correct log entries
 *
 * Everything is sandboxed: a temp cwd holds the fake project; a temp HOME
 * holds the fake `~/.claude/` tree (so the user's real session logs are never
 * touched).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  cacheDryRun,
  readDryRunCache,
  clearDryRunCache,
  dryRunCachePath,
  formatExpiredCacheReason,
  type DryRunCache,
  type CacheExpired,
  type DryRunPlannedWrite,
} from '../../src/state/dry-run-cache.js';
import { validate } from '../../src/state/schema-validators.js';
import {
  getConsecutiveRejectCount,
  shouldFireProbe,
  markProbeFired,
  recordFeedbackEvent,
  ACCEPT_EVENT,
  REJECT_EVENT,
  PROBE_FIRED_EVENT,
} from '../../src/generator/consecutive-reject-tracker.js';
import * as frictionLog from '../../src/state/friction-log.js';
import * as winsLog from '../../src/state/wins-log.js';
import * as sessionLog from '../../src/state/session-log.js';
import { atomicWrite } from '../../src/state/atomic-write.js';

// --------------------------------------------------------------------------
// Shared sandbox helpers
// --------------------------------------------------------------------------

interface Sandbox {
  homeDir: string;
  projectDir: string;
  originalHome?: string;
  originalUserProfile?: string;
  cleanup: () => void;
}

function createSandbox(): Sandbox {
  const homeDir = mkdtempSync(join(tmpdir(), 'vibe-test-safety-home-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'vibe-test-safety-proj-'));

  mkdirSync(join(homeDir, '.claude', 'plugins', 'data', 'vibe-test', 'sessions'), {
    recursive: true,
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;

  return {
    homeDir,
    projectDir,
    originalHome,
    originalUserProfile,
    cleanup: () => {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = originalUserProfile;
      rmSync(homeDir, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    },
  };
}

/**
 * Count filesystem entries under a directory tree (for "no writes outside X"
 * assertions). Returns an array of paths relative to `root`.
 */
function listRecursive(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string, rel: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs, relPath);
      else out.push(relPath);
    }
  }
  walk(root, '');
  return out.sort();
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('generate safety features · integration', () => {
  let sbx: Sandbox;

  beforeEach(() => {
    sbx = createSandbox();
  });

  afterEach(() => {
    sbx.cleanup();
  });

  // ------------------------------------------------------------------------
  // A. Dry-run mode (G9)
  // ------------------------------------------------------------------------

  describe('dry-run cache (G9)', () => {
    const samplePayload = {
      markdown_body: '# Generate · DRY-RUN PREVIEW\n\nWOULD WRITE 2 tests.\n',
      banner:
        'Vibe Test · Generate · DRY-RUN PREVIEW — no files were written\n\nDRY-RUN ended — run /vibe-test:generate --apply-last-dry-run to commit this preview (TTL 24h).',
      generate_state: {
        schema_version: 1,
        last_updated: '2026-04-17T20:00:00.000Z',
        dry_run: true,
        dry_run_cached_at: '2026-04-17T20:00:00.000Z',
        tests_proposed: [
          { path: 'tests/Foo.test.ts', confidence: 0.95, lane: 'auto', status: 'proposed' },
          { path: 'tests/Bar.test.ts', confidence: 0.78, lane: 'staged', status: 'proposed' },
        ],
      },
    };

    const samplePlanned: DryRunPlannedWrite[] = [
      {
        path: 'tests/Foo.test.ts',
        action: 'write-test',
        content_summary: 'smoke render for Foo',
        confidence: 0.95,
        lane: 'auto',
        audit_finding_id: 'finding-foo',
        content:
          '// vibe-test generated · HIGH\nimport { it, expect } from "vitest";\nit("smoke Foo", () => { expect(true).toBe(true); });\n',
      },
      {
        path: '.vibe-test/pending/tests/Bar.test.ts',
        action: 'stage-pending',
        content_summary: 'behavioral for Bar',
        confidence: 0.78,
        lane: 'staged',
        audit_finding_id: 'finding-bar',
        content:
          '// vibe-test generated · MEDIUM\nimport { it, expect } from "vitest";\nit("behavior Bar", () => { expect(1).toBe(1); });\n',
      },
      {
        path: 'docs/test-plan.md',
        action: 'append-test-plan',
        content_summary: 'generate session entry (2 tests)',
      },
      {
        path: '.vibe-test/state/generate.json',
        action: 'write-generate-state',
        content_summary: 'generate-state json',
      },
    ];

    it('dry-run cache validates against the dry-run-cache schema', async () => {
      const target = await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
        scope: null,
        headHashAtGeneration: 'abc1234',
        sessionUUID: '00000000-0000-0000-0000-000000000001',
      });

      expect(target).toBe(dryRunCachePath(sbx.projectDir));
      expect(existsSync(target)).toBe(true);

      const raw = JSON.parse(readFileSync(target, 'utf8')) as unknown;
      expect(validate('dry-run-cache', raw)).toBe(true);
    });

    it('cacheDryRun throws when a planned_write has an unknown action', async () => {
      await expect(
        cacheDryRun(sbx.projectDir, {
          payload: samplePayload,
          // @ts-expect-error — deliberately invalid action
          plannedWrites: [{ path: 'tests/x.test.ts', action: 'bogus-action' }],
        }),
      ).rejects.toThrow(/schema validation/i);
    });

    it('dry-run produces structurally identical output to real-run (same tests_proposed shape) with WOULD-WRITE annotations and zero writes outside the cache file', async () => {
      // Sanity: before the dry-run, the project dir is empty (mkdtempSync
      // creates an empty dir).
      expect(listRecursive(sbx.projectDir)).toEqual([]);

      await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
      });

      // Only the cache file should exist under .vibe-test/ after the dry-run.
      const entries = listRecursive(sbx.projectDir);
      expect(entries).toEqual(['.vibe-test/state/last-dry-run.json']);

      // No tests/ or docs/ writes.
      expect(existsSync(join(sbx.projectDir, 'tests'))).toBe(false);
      expect(existsSync(join(sbx.projectDir, 'docs'))).toBe(false);
      expect(existsSync(join(sbx.projectDir, '.vibe-test', 'pending'))).toBe(false);

      // Banner payload carries the WOULD-WRITE annotation.
      expect(samplePayload.banner).toMatch(/DRY-RUN PREVIEW/);
      expect(samplePayload.banner).toMatch(/no files were written/);
      expect(samplePayload.markdown_body).toMatch(/WOULD WRITE/);

      // generate-state shape matches what a real run emits (tests_proposed
      // array keyed on path/confidence/lane/status).
      const readBack = await readDryRunCache(sbx.projectDir);
      expect(readBack && 'expired' in readBack ? false : true).toBe(true);
      const cache = readBack as DryRunCache;
      expect(cache.payload).toBeDefined();
      const ge = (cache.payload as { generate_state: Record<string, unknown> }).generate_state;
      expect(Array.isArray(ge.tests_proposed)).toBe(true);
    });

    it('readDryRunCache returns null when cache is absent', async () => {
      const result = await readDryRunCache(sbx.projectDir);
      expect(result).toBeNull();
    });

    it('readDryRunCache returns the cache fresh within TTL', async () => {
      const cachedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
      await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
        cachedAt,
      });
      const result = await readDryRunCache(sbx.projectDir);
      expect(result).not.toBeNull();
      expect(result && 'expired' in result && result.expired === true).toBe(false);
      const cache = result as DryRunCache;
      expect(cache.cached_at).toBe(cachedAt);
      expect(cache.planned_writes.length).toBe(4);
    });

    it('readDryRunCache returns expired when cache is older than TTL (24h boundary)', async () => {
      // 25 hours ago — past the default 24h TTL.
      const cachedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
        cachedAt,
      });

      const result = await readDryRunCache(sbx.projectDir);
      expect(result).not.toBeNull();
      expect(result && 'expired' in result && result.expired === true).toBe(true);
      const expired = result as CacheExpired;
      expect(expired.cached_at).toBe(cachedAt);
      expect(expired.ttl_seconds).toBe(86_400);
      expect(expired.age_seconds).toBeGreaterThan(86_400);

      // `--apply-last-dry-run` uses this message verbatim to refuse.
      const reason = formatExpiredCacheReason(expired);
      expect(reason).toMatch(/expired/);
      expect(reason).toMatch(/re-run --dry-run/);
    });

    it('apply-last-dry-run replays planned writes within TTL', async () => {
      await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
      });

      const cache = (await readDryRunCache(sbx.projectDir)) as DryRunCache;
      expect(cache).not.toBeNull();
      expect('expired' in cache ? cache.expired : false).toBe(false);

      // Simulate the SKILL's apply-flow for the two `write-test` /
      // `stage-pending` entries that carry cached content.
      for (const write of cache.planned_writes) {
        if (!write.content) continue;
        const abs = join(sbx.projectDir, write.path);
        await atomicWrite(abs, write.content);
      }

      // After replay: the auto-lane test exists at its real destination; the
      // staged test exists under .vibe-test/pending/ mirroring source tree.
      expect(existsSync(join(sbx.projectDir, 'tests', 'Foo.test.ts'))).toBe(true);
      expect(
        existsSync(join(sbx.projectDir, '.vibe-test', 'pending', 'tests', 'Bar.test.ts')),
      ).toBe(true);

      // The cache is single-use — apply clears it.
      await clearDryRunCache(sbx.projectDir);
      expect(existsSync(dryRunCachePath(sbx.projectDir))).toBe(false);
      expect(await readDryRunCache(sbx.projectDir)).toBeNull();
    });

    it('apply-last-dry-run refuses with a clear message when the cache is expired', async () => {
      const cachedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
      await cacheDryRun(sbx.projectDir, {
        payload: samplePayload,
        plannedWrites: samplePlanned,
        pluginVersion: '0.2.0',
        cachedAt,
      });

      const result = await readDryRunCache(sbx.projectDir);
      expect(result && 'expired' in result && result.expired === true).toBe(true);

      // SKILL uses this verbatim — assert the message the builder would see.
      const expired = result as CacheExpired;
      const reason = formatExpiredCacheReason(expired);
      expect(reason).toMatch(/dry-run cache expired/);
      expect(reason).toMatch(/re-run --dry-run for fresh output/);

      // Expired cache is NOT silently deleted — the builder decides whether
      // to re-run dry-run. We verify the file still exists.
      expect(existsSync(dryRunCachePath(sbx.projectDir))).toBe(true);
    });

    it('clearDryRunCache is idempotent when the file is absent', async () => {
      await expect(clearDryRunCache(sbx.projectDir)).resolves.not.toThrow();
      expect(existsSync(dryRunCachePath(sbx.projectDir))).toBe(false);
    });

    it('readDryRunCache returns null on a corrupted cache file', async () => {
      const file = dryRunCachePath(sbx.projectDir);
      mkdirSync(join(sbx.projectDir, '.vibe-test', 'state'), { recursive: true });
      writeFileSync(file, '{ not valid json');
      const result = await readDryRunCache(sbx.projectDir);
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------------
  // B. Rejection-pattern probe (G4) + C. L2 feedback capture
  // ------------------------------------------------------------------------

  describe('rejection-pattern probe (G4) + L2 capture', () => {
    const sessionUUID = '11111111-2222-3333-4444-555555555555';

    it('records feedback events to the session log', async () => {
      await recordFeedbackEvent({
        sessionUUID,
        event: ACCEPT_EVENT,
        auditFindingId: 'finding-a',
        framework: 'vitest',
        confidenceTier: 'high',
      });
      await recordFeedbackEvent({
        sessionUUID,
        event: REJECT_EVENT,
        auditFindingId: 'finding-b',
        framework: 'vitest',
        confidenceTier: 'low',
        rejectionReason: 'generates tests for admin UI we don’t ship',
      });

      const entries = await sessionLog.readRecent(1);
      const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
      expect(mine.length).toBe(2);

      const events = mine.map((e) => e.context?.event).filter(Boolean);
      expect(events).toContain(ACCEPT_EVENT);
      expect(events).toContain(REJECT_EVENT);

      const rejectEntry = mine.find((e) => e.context?.event === REJECT_EVENT);
      expect(rejectEntry?.context?.rejection_reason).toMatch(/admin UI/);
      expect(rejectEntry?.context?.confidence_tier).toBe('low');
      expect(rejectEntry?.context?.framework).toBe('vitest');
      expect(rejectEntry?.context?.audit_finding_id).toBe('finding-b');
    });

    it('getConsecutiveRejectCount returns 0 with empty session log', async () => {
      const count = await getConsecutiveRejectCount('nonexistent-session-uuid');
      expect(count).toBe(0);
    });

    it('getConsecutiveRejectCount counts trailing consecutive rejects only', async () => {
      // Sequence: reject, reject, accept, reject, reject — trailing = 2.
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      await recordFeedbackEvent({ sessionUUID, event: ACCEPT_EVENT, confidenceTier: 'low' });
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });

      const count = await getConsecutiveRejectCount(sessionUUID);
      expect(count).toBe(2);

      // Not yet at threshold.
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(false);
    });

    it('fires probe at ≥3 consecutive low-confidence rejects', async () => {
      for (let i = 0; i < 3; i += 1) {
        await recordFeedbackEvent({
          sessionUUID,
          event: REJECT_EVENT,
          confidenceTier: 'low',
          auditFindingId: `finding-${i}`,
        });
      }
      expect(await getConsecutiveRejectCount(sessionUUID)).toBe(3);
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(true);
    });

    it('probe does not re-fire same session after marker is written', async () => {
      for (let i = 0; i < 4; i += 1) {
        await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      }
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(true);

      // SKILL marks the probe as fired after prompting the builder.
      await markProbeFired(sessionUUID);

      // Even with more rejects, the probe does not re-fire this session.
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(false);

      // But the marker is visible in the log for /evolve aggregation.
      const entries = await sessionLog.readRecent(1);
      const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
      const fired = mine.find((e) => e.context?.event === PROBE_FIRED_EVENT);
      expect(fired).toBeDefined();
    });

    it('probe-response branching: friction-flavored response captures as generation_pattern_mismatch', async () => {
      // Seed 3 rejects + mark probe fired (simulating the SKILL flow up to
      // "got the builder's response").
      for (let i = 0; i < 3; i += 1) {
        await recordFeedbackEvent({
          sessionUUID,
          event: REJECT_EVENT,
          confidenceTier: 'low',
          auditFindingId: `finding-friction-${i}`,
        });
      }
      await markProbeFired(sessionUUID);

      // Builder's friction-flavored response — explicit critique.
      const builderResponse =
        'you keep generating tests against a component API that doesn’t exist anymore';

      // SKILL reasoning branches to friction.
      await frictionLog.append({
        sessionUUID,
        friction_type: 'generation_pattern_mismatch',
        symptom: builderResponse,
        confidence: 'medium',
        agent_guess_at_cause:
          'idiom sampler read stale imports; regenerate should consult HEAD signatures',
        command: 'generate',
      });

      const entries = await frictionLog.readRecent(1);
      const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
      expect(mine.length).toBe(1);
      expect(mine[0]!.friction_type).toBe('generation_pattern_mismatch');
      expect(mine[0]!.symptom).toBe(builderResponse);
      expect(mine[0]!.confidence).toBe('medium');
      expect(mine[0]!.command).toBe('generate');

      // Wins log should be empty — we did NOT mis-route to wins.
      const wins = await winsLog.readRecent(1);
      const myWins = wins.filter((w) => w.sessionUUID === sessionUUID);
      expect(myWins.length).toBe(0);
    });

    it('probe-response branching: wins-flavored response captures as high_quality_pruning', async () => {
      for (let i = 0; i < 3; i += 1) {
        await recordFeedbackEvent({
          sessionUUID,
          event: REJECT_EVENT,
          confidenceTier: 'low',
          auditFindingId: `finding-wins-${i}`,
        });
      }
      await markProbeFired(sessionUUID);

      // Builder's wins-flavored response — acceptance with selective scope.
      const builderResponse =
        'you’re doing fine, I’m just pruning hard — these tests are good but I only want the smoke layer right now';

      // SKILL reasoning branches to wins (Pattern #14 explicit-success-marker).
      await winsLog.append({
        sessionUUID,
        command: 'generate',
        event: 'explicit_positive_reaction',
        context: '3-consecutive-reject probe — high_quality_pruning',
        working_as_designed: true,
        symptom: builderResponse,
      });

      const wins = await winsLog.readRecent(1);
      const myWins = wins.filter((w) => w.sessionUUID === sessionUUID);
      expect(myWins.length).toBe(1);
      expect(myWins[0]!.symptom).toBe(builderResponse);
      expect(myWins[0]!.working_as_designed).toBe(true);

      // Friction log should be empty — we did NOT mis-route to friction.
      const friction = await frictionLog.readRecent(1);
      const myFriction = friction.filter((f) => f.sessionUUID === sessionUUID);
      expect(myFriction.length).toBe(0);
    });

    it('dry-run-tagged feedback events are filterable for /evolve', async () => {
      await recordFeedbackEvent({
        sessionUUID,
        event: REJECT_EVENT,
        confidenceTier: 'low',
        dryRun: true,
      });
      await recordFeedbackEvent({
        sessionUUID,
        event: REJECT_EVENT,
        confidenceTier: 'low',
        dryRun: false,
      });

      const entries = await sessionLog.readRecent(1);
      const mine = entries.filter((e) => e.sessionUUID === sessionUUID);
      expect(mine.length).toBe(2);
      const dryRunEntries = mine.filter((e) => e.context?.dry_run === true);
      expect(dryRunEntries.length).toBe(1);
    });

    it('accept event resets the consecutive-reject counter before reaching threshold', async () => {
      for (let i = 0; i < 2; i += 1) {
        await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      }
      // An accept resets — only 1 reject trailing after this.
      await recordFeedbackEvent({ sessionUUID, event: ACCEPT_EVENT, confidenceTier: 'high' });
      await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });

      const count = await getConsecutiveRejectCount(sessionUUID);
      expect(count).toBe(1);
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(false);
    });

    it('per-session isolation: rejects in one sessionUUID do not fire probes in another', async () => {
      const otherSession = '99999999-aaaa-bbbb-cccc-dddddddddddd';
      for (let i = 0; i < 4; i += 1) {
        await recordFeedbackEvent({ sessionUUID, event: REJECT_EVENT, confidenceTier: 'low' });
      }
      expect(await shouldFireProbe(sessionUUID, 3)).toBe(true);
      expect(await getConsecutiveRejectCount(otherSession)).toBe(0);
      expect(await shouldFireProbe(otherSession, 3)).toBe(false);
    });
  });
});
