/**
 * State — read-merge-write helpers for per-project plugin state
 *
 * Each plugin writes to .vibe-<name>/state.json in the project root.
 * This module provides safe read-merge-write semantics so plugins
 * never overwrite each other's state and never lose data on partial
 * writes.
 *
 * Extraction status: STUB. The Vibe Doc src/state/ implementation is
 * the canonical reference. Phase 2 will lift it here with versioning
 * and migration helpers.
 */

export interface StateOptions {
  projectPath: string;
  pluginName: string;
}

export async function read<T>(_options: StateOptions): Promise<T | null> {
  throw new Error('@626labs/plugin-core/state not yet implemented. Phase 2 extraction pending.');
}

export async function write<T>(_state: T, _options: StateOptions): Promise<void> {
  throw new Error('@626labs/plugin-core/state not yet implemented. Phase 2 extraction pending.');
}

export async function mergeAndWrite<T extends object>(_partial: Partial<T>, _options: StateOptions): Promise<T> {
  throw new Error('@626labs/plugin-core/state not yet implemented. Phase 2 extraction pending.');
}
