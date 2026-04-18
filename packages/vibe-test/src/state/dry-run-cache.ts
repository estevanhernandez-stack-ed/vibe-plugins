/**
 * Dry-run cache — `<repo>/.vibe-test/state/last-dry-run.json`.
 *
 * Story G9: `/vibe-test:generate --dry-run` produces all three output views
 * with "WOULD WRITE" annotations and writes nothing to the working tree. The
 * full would-be payload + the ordered list of planned writes are cached here
 * so a subsequent `--apply-last-dry-run` (within the 24h TTL) can replay
 * exactly what the dry-run previewed.
 *
 * Ownership per the data contract:
 *   - WRITER: generate SKILL (via `cacheDryRun`) when `--dry-run` succeeds.
 *   - READER: generate SKILL (via `readDryRunCache`) when `--apply-last-dry-run`
 *     is invoked.
 *   - CLEANER: generate SKILL (via `clearDryRunCache`) after a successful apply
 *     or when the cache is intentionally invalidated.
 *
 * Schema enforcement: `cacheDryRun` validates the payload against
 * `dry-run-cache.schema.json` before writing. Reads are permissive (return the
 * cache even if an older schema shape leaked through) so we never brick the
 * apply path on a schema drift — the SKILL can re-validate and decide whether
 * to trust it.
 */

import { join } from 'node:path';
import { promises as fs } from 'node:fs';

import { atomicWriteJson } from './atomic-write.js';
import { validate, lastErrors } from './schema-validators.js';

export const DRY_RUN_CACHE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_DRY_RUN_TTL_SECONDS = 86_400; // 24h

export type DryRunPlannedWriteAction =
  | 'write-test'
  | 'stage-pending'
  | 'write-pending-index'
  | 'append-test-plan'
  | 'update-testing-md'
  | 'write-ci-stub'
  | 'update-project-state'
  | 'update-accepted-json'
  | 'update-rejected-json'
  | 'write-generate-state'
  | 'write-markdown-artifact';

export interface DryRunPlannedWrite {
  path: string;
  action: DryRunPlannedWriteAction;
  content_summary?: string;
  confidence?: number | null;
  lane?: 'auto' | 'staged' | 'inline' | null;
  audit_finding_id?: string | null;
  /** Optional content payload for replay. SKILL may omit for large bodies. */
  content?: string | null;
}

export interface DryRunCachePayload {
  /** Free-form SKILL-authored payload — mirrors the three output views. */
  [key: string]: unknown;
}

export interface DryRunCache {
  schema_version: typeof DRY_RUN_CACHE_SCHEMA_VERSION;
  cached_at: string;
  ttl_seconds: number;
  plugin_version?: string;
  repo_root?: string;
  scope?: string | null;
  head_hash_at_generation?: string | null;
  session_uuid?: string | null;
  payload: DryRunCachePayload;
  planned_writes: DryRunPlannedWrite[];
}

export interface CacheDryRunInput {
  payload: DryRunCachePayload;
  plannedWrites: DryRunPlannedWrite[];
  ttlSeconds?: number;
  pluginVersion?: string;
  scope?: string | null;
  headHashAtGeneration?: string | null;
  sessionUUID?: string | null;
  /** ISO timestamp override — test harness hook. */
  cachedAt?: string;
}

export interface CacheExpired {
  expired: true;
  cached_at: string;
  ttl_seconds: number;
  age_seconds: number;
}

export type ReadDryRunCacheResult = DryRunCache | CacheExpired | null;

/**
 * Canonical location of the cache inside a project.
 */
export function dryRunCachePath(repoRoot: string): string {
  return join(repoRoot, '.vibe-test', 'state', 'last-dry-run.json');
}

/**
 * Cache a dry-run result. Validates against the `dry-run-cache` JSON Schema
 * before writing; on validation failure, throws with the ajv errors so the
 * SKILL can surface a clear error (never write an invalid cache).
 */
export async function cacheDryRun(
  repoRoot: string,
  input: CacheDryRunInput,
): Promise<string> {
  const cache: DryRunCache = {
    schema_version: DRY_RUN_CACHE_SCHEMA_VERSION,
    cached_at: input.cachedAt ?? new Date().toISOString(),
    ttl_seconds: input.ttlSeconds ?? DEFAULT_DRY_RUN_TTL_SECONDS,
    payload: input.payload,
    planned_writes: input.plannedWrites,
  };
  if (input.pluginVersion !== undefined) cache.plugin_version = input.pluginVersion;
  // Always record the repo_root so apply can guard against cross-project replay.
  cache.repo_root = repoRoot;
  if (input.scope !== undefined) cache.scope = input.scope;
  if (input.headHashAtGeneration !== undefined) {
    cache.head_hash_at_generation = input.headHashAtGeneration;
  }
  if (input.sessionUUID !== undefined) cache.session_uuid = input.sessionUUID;

  if (!validate('dry-run-cache', cache)) {
    const detail = lastErrors()
      .map((err) => `  - ${err.instancePath || '<root>'}: ${err.message ?? 'invalid'}`)
      .join('\n');
    throw new Error(`dry-run-cache payload failed schema validation:\n${detail}`);
  }

  const target = dryRunCachePath(repoRoot);
  await atomicWriteJson(target, cache);
  return target;
}

/**
 * Read + TTL-check the cache. Returns:
 *   - `null` when the cache file is absent or unparseable.
 *   - `{expired: true, cached_at, ttl_seconds, age_seconds}` when present but
 *     older than `ttl_seconds` (including negative TTL which should never happen).
 *   - The parsed `DryRunCache` when present and fresh.
 *
 * Schema validation is advisory at read time — if the cache shape is slightly
 * off, we still return it and let the SKILL decide. The apply path itself
 * should re-validate before replaying anything destructive.
 */
export async function readDryRunCache(repoRoot: string): Promise<ReadDryRunCacheResult> {
  const file = dryRunCachePath(repoRoot);
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const cache = parsed as Partial<DryRunCache>;
  const cachedAt = cache.cached_at;
  const ttl = cache.ttl_seconds;
  if (typeof cachedAt !== 'string' || typeof ttl !== 'number') {
    return null;
  }

  const cachedAtMs = Date.parse(cachedAt);
  if (Number.isNaN(cachedAtMs)) {
    return null;
  }

  const ageSeconds = Math.floor((Date.now() - cachedAtMs) / 1000);
  if (ageSeconds > ttl) {
    return {
      expired: true,
      cached_at: cachedAt,
      ttl_seconds: ttl,
      age_seconds: ageSeconds,
    };
  }

  return cache as DryRunCache;
}

/**
 * Remove the cache file. Idempotent — no error if absent.
 */
export async function clearDryRunCache(repoRoot: string): Promise<void> {
  const file = dryRunCachePath(repoRoot);
  await fs.rm(file, { force: true });
}

/**
 * Convenience: short human-readable reason string for an expired cache.
 * The SKILL uses this verbatim in the "cache expired" error it surfaces.
 */
export function formatExpiredCacheReason(expired: CacheExpired): string {
  const hours = (expired.age_seconds / 3600).toFixed(1);
  return `dry-run cache expired; re-run --dry-run for fresh output (cached ${hours}h ago, TTL ${expired.ttl_seconds}s)`;
}
