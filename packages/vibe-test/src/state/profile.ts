/**
 * Builder profile read/write — shared bus at `~/.claude/profiles/builder.json`
 * plus plugin-local mirror at `~/.claude/plugins/data/vibe-test/profile.json`.
 *
 * STUB for checklist item #1. Full implementation lands with item #3 (shared
 * SKILL scaffolding) — this stub defines the exported types + stable function
 * signatures so downstream modules can import them now.
 */

export type TestingExperience = 'first-time' | 'beginner' | 'intermediate' | 'experienced';

export type PreferredFramework =
  | 'vitest'
  | 'jest'
  | 'mocha'
  | 'playwright'
  | 'cypress'
  | 'none'
  | 'auto';

export type AssertionStyle = 'expect' | 'assert' | 'should' | 'auto';
export type TestLocation = 'colocated' | 'tests-dir' | '__tests__' | 'auto';
export type FixtureApproach = 'factory' | 'inline' | 'json-files' | 'auto';

export interface DecayMeta {
  last_confirmed: string;
  stale: boolean;
  ttl_days: number | null;
}

export interface VibeTestProfile {
  schema_version: 1;
  testing_experience: TestingExperience;
  preferred_framework: PreferredFramework;
  preferred_assertion_style?: AssertionStyle;
  preferred_test_location?: TestLocation;
  fixture_approach?: FixtureApproach;
  auto_generate_threshold: number;
  coverage_target: number | null;
  last_updated: string;
  projects_audited: number;
  _meta?: Record<string, DecayMeta>;
}

export interface SharedProfile {
  schema_version: number;
  last_updated: string;
  shared?: Record<string, unknown>;
  plugins?: {
    'vibe-test'?: VibeTestProfile;
    [pluginKey: string]: unknown;
  };
}

export const DEFAULT_PROFILE: VibeTestProfile = {
  schema_version: 1,
  testing_experience: 'intermediate',
  preferred_framework: 'auto',
  preferred_assertion_style: 'auto',
  preferred_test_location: 'auto',
  fixture_approach: 'auto',
  auto_generate_threshold: 0.9,
  coverage_target: null,
  last_updated: new Date(0).toISOString(),
  projects_audited: 0,
};

/** Read the Vibe Test profile namespace from the shared bus. Stub: returns defaults. */
export async function readProfile(): Promise<VibeTestProfile> {
  return { ...DEFAULT_PROFILE };
}

/** Persist a Vibe Test profile update. Stub: no-op. */
export async function writeProfile(_profile: VibeTestProfile): Promise<void> {
  // Full implementation in item #3: atomic write to shared bus + plugin-local mirror.
  return;
}

/** Refresh a single decay-tracked field's `last_confirmed` timestamp. Stub. */
export async function refreshDecayField(_fieldName: keyof VibeTestProfile): Promise<void> {
  return;
}
