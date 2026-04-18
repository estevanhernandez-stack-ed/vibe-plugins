/**
 * @esthernandez/vibe-test — public entry point.
 *
 * v0.2 items #1–#11 populate the layers below. After item #2 the scanner,
 * coverage, reporter, and composition primitives are live; generator, runtime,
 * handoff, and cli are still pending their own items.
 */

export * as state from './state/index.js';
export * as scanner from './scanner/index.js';
export * as coverage from './coverage/index.js';
export * as reporter from './reporter/index.js';
export * as composition from './composition/index.js';
export * as handoff from './handoff/index.js';
export * as generator from './generator/index.js';

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

// Ergonomic re-exports for the new primitives.
export type { Inventory } from './scanner/index.js';
export type { Coverage, WeightedScoreInput, WeightedScoreResult } from './coverage/index.js';
export type {
  ReportObject,
  CommandName,
  Finding,
  Action,
  Deferral,
} from './reporter/index.js';
export type { AnchoredEntry, ComplementStatus } from './composition/index.js';
export type {
  EnvVarReference,
  EnvVarSource,
  PendingMetadata,
  StageInput,
  StageResult,
  AcceptInput,
  AcceptResult,
  PendingListEntry,
  IdiomMatcher,
  IdiomTemplate,
  PlaywrightBridgeResult,
} from './generator/index.js';

export const VERSION = '0.2.0' as const;
