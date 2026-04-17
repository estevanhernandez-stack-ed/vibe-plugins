/**
 * Atomic writes via temp-file-rename pattern.
 *
 * Guarantees: readers never observe a half-written file. If the process crashes
 * mid-write, the original file remains intact and a stray `.tmp.<pid>.<random>`
 * may be left behind (garbage-collected on next successful write to the same
 * target).
 *
 * Flow: write to `<target>.tmp.<pid>.<random>` → fsync → rename to `<target>`.
 * `rename` on POSIX and NTFS is atomic for same-directory moves.
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface AtomicWriteOptions {
  /** File mode (Unix permission bits). Defaults to 0o644. */
  mode?: number;
  /** If true, create parent directories as needed. Defaults to true. */
  ensureDir?: boolean;
  /** If true, call fsync before rename. Defaults to true (durability over speed). */
  fsync?: boolean;
}

const DEFAULT_MODE = 0o644;

/**
 * Write `contents` to `targetPath` atomically. Returns the final absolute path.
 */
export async function atomicWrite(
  targetPath: string,
  contents: string | Buffer,
  options: AtomicWriteOptions = {},
): Promise<string> {
  const mode = options.mode ?? DEFAULT_MODE;
  const ensureDir = options.ensureDir ?? true;
  const doFsync = options.fsync ?? true;

  const parent = dirname(targetPath);
  if (ensureDir) {
    await fs.mkdir(parent, { recursive: true });
  }

  const suffix = `${process.pid}.${randomBytes(6).toString('hex')}`;
  const tempPath = `${targetPath}.tmp.${suffix}`;

  const handle = await fs.open(tempPath, 'w', mode);
  try {
    await handle.writeFile(contents);
    if (doFsync) {
      await handle.sync();
    }
  } finally {
    await handle.close();
  }

  try {
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    // Best-effort cleanup if rename fails.
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw err;
  }

  return targetPath;
}

/**
 * Convenience wrapper for JSON with stable formatting (2-space indent + trailing newline).
 */
export async function atomicWriteJson(
  targetPath: string,
  data: unknown,
  options: AtomicWriteOptions = {},
): Promise<string> {
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  return atomicWrite(targetPath, payload, options);
}

/**
 * JSONL append is NOT atomic by the temp-rename pattern — appending must go
 * through `appendFile` with a flush. Readers tolerating partial final lines are
 * standard for JSONL consumers. For the rare case we want atomic append, the
 * pattern is: read → append in memory → atomicWrite. Use `atomicAppendJsonl`
 * only when the file is small (<few MB) and read-modify-write is acceptable.
 */
export async function appendJsonl(
  targetPath: string,
  entry: unknown,
  options: { ensureDir?: boolean } = {},
): Promise<void> {
  const ensureDir = options.ensureDir ?? true;
  if (ensureDir) {
    await fs.mkdir(dirname(targetPath), { recursive: true });
  }
  const line = `${JSON.stringify(entry)}\n`;
  await fs.appendFile(targetPath, line, { encoding: 'utf8' });
}
