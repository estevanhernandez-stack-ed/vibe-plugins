/**
 * Pending-dir manager — atomic ops on `<repo>/.vibe-test/pending/`.
 *
 * Responsibilities:
 * - Stage medium-confidence tests (0.70–0.89) for batch review with HEAD hash
 *   recorded at stage time.
 * - Accept → move the staged test to its real location under `tests/` (or the
 *   target path chosen by the SKILL), verifying the HEAD hash hasn't changed
 *   since stage. If HEAD has changed, return `branch_switched: true` so the
 *   SKILL can warn the builder.
 * - Reject → remove the staged test and return a friction-log-shaped entry the
 *   SKILL can persist.
 * - `pending/index.md` — human-readable summary of what's staged with the
 *   SKILL-authored rationale strings.
 *
 * Path mirroring: staged tests live at
 *   `<repo>/.vibe-test/pending/<mirror_of_target_test_path>`
 *
 * So a candidate test for `tests/components/MovieCard.test.tsx` is staged at
 * `<repo>/.vibe-test/pending/tests/components/MovieCard.test.tsx`. The mirror
 * preserves the directory structure so the SKILL can present the layout as
 * "what it would look like after accept-all".
 *
 * Metadata sidecar: each staged test has a sibling `<file>.meta.json` with
 * `{target_test_path, head_hash_at_stage, confidence, rationale, staged_at}`.
 * The sidecar is the source of truth for branch-switch checks.
 */

import { promises as fs } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

import { atomicWrite, atomicWriteJson } from '../state/atomic-write.js';

export interface PendingMetadata {
  schema_version: 1;
  target_test_path: string;
  head_hash_at_stage: string | null;
  confidence: number;
  rationale: string;
  staged_at: string;
  audit_finding_id?: string;
  plugin_version: string;
}

export interface StageResult {
  pending_path: string;
  meta_path: string;
  recorded_hash: string | null;
}

export interface AcceptResult {
  accepted: boolean;
  branch_switched: boolean;
  recorded_hash: string | null;
  current_hash: string | null;
  /** Final destination path if accepted. Only set when `accepted === true`. */
  final_path?: string;
}

export interface RejectResult {
  removed: boolean;
  /**
   * Shape matches the friction-log entry the SKILL will persist via
   * `src/state/friction-log.ts` — the manager does NOT write to the log
   * itself (that's SKILL territory per the data contract).
   */
  friction_entry: {
    friction_type: 'generation_pattern_mismatch';
    symptom: string;
    target_test_path: string;
    rejected_at: string;
  };
}

export interface PendingListEntry {
  pending_path: string;
  meta: PendingMetadata;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

export function pendingRoot(repoRoot: string): string {
  return join(repoRoot, '.vibe-test', 'pending');
}

export function pendingIndexPath(repoRoot: string): string {
  return join(pendingRoot(repoRoot), 'index.md');
}

/**
 * Mirror the target test path into the pending directory. The target path is
 * always interpreted relative to `repoRoot` — absolute paths are rebased.
 */
export function pendingPathFor(repoRoot: string, targetTestPath: string): string {
  const resolvedTarget = resolve(repoRoot, targetTestPath);
  const rel = relative(repoRoot, resolvedTarget);
  if (rel.startsWith('..')) {
    throw new Error(
      `pending-dir-manager: target test path "${targetTestPath}" resolves outside repoRoot`,
    );
  }
  return join(pendingRoot(repoRoot), rel);
}

function metaPathFor(pendingPath: string): string {
  return `${pendingPath}.meta.json`;
}

/**
 * Git rev-parse HEAD — returns the full SHA, or `null` when the directory is
 * not a git repo OR git is not on PATH. The scanner-level SKILL branch-switch
 * check tolerates `null` (treats as "unknown, skip the warning") per PRD G3.
 */
export function getCurrentHeadHash(repoRoot: string): string | null {
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) return null;
    const out = result.stdout.trim();
    if (!out) return null;
    return out;
  } catch {
    return null;
  }
}

export interface StageInput {
  repoRoot: string;
  targetTestPath: string;
  content: string;
  confidence: number;
  rationale: string;
  auditFindingId?: string;
  pluginVersion?: string;
  /**
   * Optional HEAD-hash override (for tests / deterministic callers). When
   * omitted, the manager calls `getCurrentHeadHash(repoRoot)`.
   */
  headHash?: string | null;
}

/**
 * Stage a test for review. Writes the test content to the mirrored pending
 * path and a sidecar `.meta.json` with the recorded HEAD hash.
 */
export async function stagePendingTest(input: StageInput): Promise<StageResult> {
  const pendingPath = pendingPathFor(input.repoRoot, input.targetTestPath);
  const metaPath = metaPathFor(pendingPath);
  const headHash = input.headHash === undefined ? getCurrentHeadHash(input.repoRoot) : input.headHash;

  await fs.mkdir(dirname(pendingPath), { recursive: true });
  await atomicWrite(pendingPath, input.content);

  const metadata: PendingMetadata = {
    schema_version: 1,
    target_test_path: normalizeForward(input.targetTestPath),
    head_hash_at_stage: headHash,
    confidence: input.confidence,
    rationale: input.rationale,
    staged_at: new Date().toISOString(),
    plugin_version: input.pluginVersion ?? DEFAULT_PLUGIN_VERSION,
  };
  if (input.auditFindingId !== undefined) {
    metadata.audit_finding_id = input.auditFindingId;
  }
  await atomicWriteJson(metaPath, metadata);

  return {
    pending_path: pendingPath,
    meta_path: metaPath,
    recorded_hash: headHash,
  };
}

export interface AcceptInput {
  repoRoot: string;
  /** Absolute path to the staged file under `.vibe-test/pending/`. */
  pendingPath: string;
  /** Override current HEAD (for tests); otherwise computed from repoRoot. */
  currentHeadHash?: string | null;
  /**
   * If `true`, proceed even when `branch_switched === true`. Mirrors the
   * `--force` CLI flag behavior described in PRD G3.
   */
  force?: boolean;
}

/**
 * Accept a staged test. Verifies the recorded HEAD hash matches the current
 * one; if not and `force !== true`, returns `{accepted: false, branch_switched: true}`
 * without moving the file. Caller (SKILL) decides whether to re-prompt or force.
 */
export async function acceptPendingTest(input: AcceptInput): Promise<AcceptResult> {
  const metaPath = metaPathFor(input.pendingPath);
  const metaRaw = await fs.readFile(metaPath, 'utf8');
  const meta = JSON.parse(metaRaw) as PendingMetadata;

  const currentHash =
    input.currentHeadHash === undefined ? getCurrentHeadHash(input.repoRoot) : input.currentHeadHash;

  const branchSwitched = Boolean(
    meta.head_hash_at_stage && currentHash && meta.head_hash_at_stage !== currentHash,
  );

  if (branchSwitched && !input.force) {
    return {
      accepted: false,
      branch_switched: true,
      recorded_hash: meta.head_hash_at_stage,
      current_hash: currentHash,
    };
  }

  const finalPath = join(input.repoRoot, meta.target_test_path);
  await fs.mkdir(dirname(finalPath), { recursive: true });
  const content = await fs.readFile(input.pendingPath, 'utf8');
  await atomicWrite(finalPath, content);

  // Clean up staged files.
  await fs.rm(input.pendingPath, { force: true });
  await fs.rm(metaPath, { force: true });

  return {
    accepted: true,
    branch_switched: branchSwitched,
    recorded_hash: meta.head_hash_at_stage,
    current_hash: currentHash,
    final_path: finalPath,
  };
}

export interface RejectInput {
  pendingPath: string;
  reason: string;
}

/**
 * Reject a staged test. Removes the staged file + metadata sidecar, and returns
 * a friction-log-shaped record the caller can persist via `src/state/friction-log.ts`.
 */
export async function rejectPendingTest(input: RejectInput): Promise<RejectResult> {
  const metaPath = metaPathFor(input.pendingPath);
  let target = input.pendingPath;
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw) as PendingMetadata;
    target = meta.target_test_path;
  } catch {
    // If the sidecar is missing, use the pending path as the target label.
  }

  const existed = await pathExists(input.pendingPath);
  await fs.rm(input.pendingPath, { force: true });
  await fs.rm(metaPath, { force: true });

  return {
    removed: existed,
    friction_entry: {
      friction_type: 'generation_pattern_mismatch',
      symptom: input.reason,
      target_test_path: normalizeForward(target),
      rejected_at: new Date().toISOString(),
    },
  };
}

/**
 * List all currently-staged tests. Walks `.vibe-test/pending/` recursively and
 * pairs each test file with its `.meta.json` sidecar. Entries without a sidecar
 * are skipped (the manager never trusts staged files that have lost their
 * metadata).
 */
export async function listPending(repoRoot: string): Promise<PendingListEntry[]> {
  const root = pendingRoot(repoRoot);
  const results: PendingListEntry[] = [];
  await walkPending(root, root, async (absPath) => {
    if (absPath.endsWith('.meta.json')) return;
    if (absPath.endsWith('index.md')) return;
    const meta = metaPathFor(absPath);
    try {
      const raw = await fs.readFile(meta, 'utf8');
      const parsed = JSON.parse(raw) as PendingMetadata;
      results.push({ pending_path: absPath, meta: parsed });
    } catch {
      // Orphan file — skip silently; a later reconcile pass can flag it.
    }
  });
  // Sort by confidence descending so highest-confidence appears at top of index.md.
  results.sort((a, b) => b.meta.confidence - a.meta.confidence);
  return results;
}

async function walkPending(
  root: string,
  current: string,
  onFile: (absPath: string) => Promise<void>,
): Promise<void> {
  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(current, entry.name);
    if (entry.isDirectory()) {
      await walkPending(root, abs, onFile);
    } else if (entry.isFile()) {
      await onFile(abs);
    }
  }
}

/**
 * Write `pending/index.md` — a markdown summary of what's staged with path,
 * confidence, rationale, and HEAD hash columns. Overwrites atomically.
 */
export async function writePendingIndex(
  repoRoot: string,
  entries: PendingListEntry[],
): Promise<string> {
  const indexPath = pendingIndexPath(repoRoot);
  const content = renderPendingIndex(repoRoot, entries);
  await fs.mkdir(dirname(indexPath), { recursive: true });
  await atomicWrite(indexPath, content);
  return indexPath;
}

export function renderPendingIndex(repoRoot: string, entries: PendingListEntry[]): string {
  const lines: string[] = [];
  lines.push('# Vibe Test — Pending Tests');
  lines.push('');
  lines.push('_Staged for review. Accept / reject via the `/vibe-test:generate` follow-up prompts._');
  lines.push('');
  if (entries.length === 0) {
    lines.push('_No staged tests. Run `/vibe-test:generate` to produce candidates._');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('| Target path | Confidence | HEAD @ stage | Rationale |');
  lines.push('|---|---|---|---|');
  for (const e of entries) {
    const rel = relative(repoRoot, e.pending_path).split(sep).join('/');
    const confidence = e.meta.confidence.toFixed(2);
    const hash = (e.meta.head_hash_at_stage ?? 'n/a').slice(0, 7);
    const rationale = e.meta.rationale.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| \`${normalizeForward(e.meta.target_test_path)}\` (staged at \`${rel}\`) | ${confidence} | \`${hash}\` | ${rationale} |`,
    );
  }
  lines.push('');
  lines.push(
    '> Branch-switch note: if HEAD has moved since staging, `/vibe-test:generate` warns at accept time. Use `--force` to promote anyway, or rerun generation fresh.',
  );
  lines.push('');
  return lines.join('\n');
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeForward(p: string): string {
  return p.split(sep).join('/');
}
