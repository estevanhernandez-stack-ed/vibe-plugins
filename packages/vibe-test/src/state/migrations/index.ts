/**
 * Schema-version migration dispatcher.
 *
 * On read, if `data.schema_version < CURRENT_VERSIONS[file]`, the dispatcher
 * runs migrations in sequence (v1 → v2 → v3 ...), writing a `.bak.<timestamp>`
 * copy of the pre-migration file before persisting the migrated data.
 *
 * Every migration is **idempotent**: running it twice is a no-op. This is a
 * hard requirement of Pattern #7 — migrations must be safe to re-run if a
 * previous run crashed mid-flight.
 *
 * v0.2 ships with all state files at `schema_version: 1`, so the migration map
 * is empty. The dispatcher is wired and tested so future bumps (v1 → v2 in
 * v0.3+) can register migrations without refactoring.
 */

import { promises as fs } from 'node:fs';

import { atomicWriteJson } from '../atomic-write.js';

export type MigrationFile =
  | 'builder-profile'
  | 'project-state'
  | 'audit-state'
  | 'coverage-state'
  | 'generate-state'
  | 'covered-surfaces';

export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/** Current schema version for each file. Bump here when you add a migration. */
export const CURRENT_VERSIONS: Record<MigrationFile, number> = {
  'builder-profile': 1,
  'project-state': 1,
  'audit-state': 1,
  'coverage-state': 1,
  'generate-state': 1,
  'covered-surfaces': 1,
};

/**
 * Registry of migrations keyed by file and "fromVersion". Each entry migrates
 * from version `fromVersion` to `fromVersion + 1`.
 *
 * Empty in v0.2 — every file is already at v1. Example for future:
 *
 *   'audit-state': {
 *     1: (data) => ({ ...data, schema_version: 2, new_field: null }),
 *   }
 */
const MIGRATIONS: Partial<Record<MigrationFile, Record<number, MigrationFn>>> = {};

export interface MigrationResult {
  /** The data after running all applicable migrations. */
  data: Record<string, unknown>;
  /** Number of migration steps applied. */
  steps: number;
  /** Backup file paths written during migration, if any. */
  backups: string[];
}

/**
 * Migrate `data` toward the current version for `file`. If already current,
 * returns unchanged. If a backup path is provided, writes a `.bak.<timestamp>`
 * copy of the pre-migration file before each step.
 */
export async function migrate(
  file: MigrationFile,
  data: Record<string, unknown>,
  filePath?: string,
): Promise<MigrationResult> {
  const target = CURRENT_VERSIONS[file];
  const rawVersion = data['schema_version'];
  let current = typeof rawVersion === 'number' ? rawVersion : 1;

  if (current === target) {
    return { data, steps: 0, backups: [] };
  }
  if (current > target) {
    throw new Error(
      `Cannot migrate ${file}: found schema_version ${current} but current is ${target}. ` +
        `Downgrade paths are not supported — upgrade the plugin.`,
    );
  }

  const fileMigrations = MIGRATIONS[file] ?? {};
  let cursor = data;
  const backups: string[] = [];
  let steps = 0;

  while (current < target) {
    const step = fileMigrations[current];
    if (!step) {
      throw new Error(
        `No migration registered for ${file} v${current} → v${current + 1}. ` +
          `Add one in src/state/migrations/ and register it in MIGRATIONS.`,
      );
    }

    // Write backup of pre-migration data before mutating.
    if (filePath) {
      const backupPath = `${filePath}.bak.${Date.now()}.v${current}`;
      await atomicWriteJson(backupPath, cursor);
      backups.push(backupPath);
    }

    cursor = step(cursor);

    // Invariant: each migration must set schema_version = current + 1.
    const after = cursor['schema_version'];
    if (after !== current + 1) {
      throw new Error(
        `Migration ${file} v${current} → v${current + 1} did not update schema_version. ` +
          `Got ${String(after)}.`,
      );
    }

    current += 1;
    steps += 1;
  }

  return { data: cursor, steps, backups };
}

/**
 * Read a JSON file and apply any pending migrations. Returns the migrated data
 * and writes the migrated data back to disk (via atomicWriteJson) when steps > 0.
 * If the file does not exist, returns `null`.
 */
export async function readWithMigration(
  file: MigrationFile,
  filePath: string,
): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const { data, steps } = await migrate(file, parsed, filePath);

  if (steps > 0) {
    await atomicWriteJson(filePath, data);
  }

  return data;
}

/** Exposed for tests — register a migration fn at runtime. */
export function registerMigration(
  file: MigrationFile,
  fromVersion: number,
  fn: MigrationFn,
): void {
  const slot = MIGRATIONS[file] ?? {};
  slot[fromVersion] = fn;
  MIGRATIONS[file] = slot;
}

export { MIGRATIONS as _migrationsForTest };
