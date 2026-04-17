/**
 * Tier-adaptive language — reads `shared.technical_experience.level` via
 * `src/state/profile.ts` and returns verbosity knobs for the SKILL-side prose
 * generator.
 *
 * Not a template engine — just a data struct. SKILL prose consumes the knobs.
 */

import { readProfile } from '../state/profile.js';

export type Verbosity = 'terse' | 'balanced' | 'plain';
export type ExperienceLevel = 'first-time' | 'beginner' | 'intermediate' | 'experienced';

export interface LanguageKnobs {
  verbosity: Verbosity;
  show_technical_details: boolean;
  show_details_expansion: boolean;
}

export interface AdaptiveLanguageOverrides {
  verboseFlag?: boolean;
  terseFlag?: boolean;
  /** Override the profile-derived level for testing + explicit invocations. */
  levelOverride?: ExperienceLevel;
}

const LEVEL_TO_KNOBS: Record<ExperienceLevel, LanguageKnobs> = {
  'first-time': { verbosity: 'plain', show_technical_details: false, show_details_expansion: true },
  beginner: { verbosity: 'plain', show_technical_details: false, show_details_expansion: true },
  intermediate: { verbosity: 'balanced', show_technical_details: true, show_details_expansion: true },
  experienced: { verbosity: 'terse', show_technical_details: true, show_details_expansion: false },
};

export async function getLanguageKnobs(
  overrides: AdaptiveLanguageOverrides = {},
): Promise<LanguageKnobs> {
  let level: ExperienceLevel = overrides.levelOverride ?? 'intermediate';
  if (!overrides.levelOverride) {
    try {
      const profile = await readProfile();
      const exp = profile.testing_experience;
      if (exp) level = exp;
    } catch {
      // profile read fail → keep default
    }
  }

  const base = LEVEL_TO_KNOBS[level] ?? LEVEL_TO_KNOBS.intermediate;
  if (overrides.verboseFlag) {
    return { verbosity: 'plain', show_technical_details: true, show_details_expansion: true };
  }
  if (overrides.terseFlag) {
    return { verbosity: 'terse', show_technical_details: true, show_details_expansion: false };
  }
  return base;
}

/** Synchronous variant for tests that don't want to await profile I/O. */
export function languageKnobsForLevel(level: ExperienceLevel): LanguageKnobs {
  return LEVEL_TO_KNOBS[level];
}
