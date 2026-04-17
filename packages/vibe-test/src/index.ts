/**
 * @esthernandez/vibe-test — public entry point.
 *
 * v0.2 items #1–#11 populate the layers below. Today (item #1) only the
 * state layer has implementation; the other barrel re-exports exist so
 * imports in future items compile cleanly.
 */

export * as state from './state/index.js';

// Re-export commonly used state types at the top level for ergonomic imports.
export type {
  SchemaName,
  VibeTestProfile,
  ProjectState,
  Classification,
  CoverageSnapshot,
  AppType,
  Tier,
  TestLevel,
  SessionEntry,
  FrictionEntry,
  WinEntry,
  BeaconEntry,
} from './state/index.js';

export const VERSION = '0.2.0' as const;
