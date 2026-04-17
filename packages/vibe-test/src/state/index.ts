/**
 * Public barrel for the state layer.
 *
 * Import stable types + functions from `@esthernandez/vibe-test/state`:
 *   import { atomicWrite, validate, readProfile, ... } from '@esthernandez/vibe-test/state';
 */

export { atomicWrite, atomicWriteJson, appendJsonl } from './atomic-write.js';
export type { AtomicWriteOptions } from './atomic-write.js';

export {
  validate,
  validateDetailed,
  validateOrThrow,
  lastErrors,
  warmCache,
  SCHEMA_NAMES,
} from './schema-validators.js';
export type { SchemaName, ValidationResult } from './schema-validators.js';

export {
  migrate,
  readWithMigration,
  registerMigration,
  CURRENT_VERSIONS,
} from './migrations/index.js';
export type { MigrationFile, MigrationFn, MigrationResult } from './migrations/index.js';

export {
  readProfile,
  writeProfile,
  refreshDecayField,
  DEFAULT_PROFILE,
} from './profile.js';
export type {
  VibeTestProfile,
  SharedProfile,
  TestingExperience,
  PreferredFramework,
  AssertionStyle,
  TestLocation,
  FixtureApproach,
  DecayMeta,
} from './profile.js';

export {
  readProjectState,
  writeProjectState,
  projectStatePath,
  DEFAULT_PROJECT_STATE,
} from './project-state.js';
export type {
  ProjectState,
  Classification,
  CoverageSnapshot,
  InventorySnapshot,
  AppType,
  Tier,
  TestLevel,
} from './project-state.js';

export * as sessionLog from './session-log.js';
export type {
  SessionEntry,
  SessionCommand,
  SessionOutcome,
} from './session-log.js';

export * as frictionLog from './friction-log.js';
export type {
  FrictionEntry,
  FrictionType,
  FrictionConfidence,
} from './friction-log.js';

export * as winsLog from './wins-log.js';
export type { WinEntry, WinEvent } from './wins-log.js';

export * as beacons from './beacons.js';
export type { BeaconEntry } from './beacons.js';
