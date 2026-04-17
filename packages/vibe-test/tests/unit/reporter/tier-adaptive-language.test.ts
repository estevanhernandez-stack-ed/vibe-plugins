import { describe, it, expect } from 'vitest';

import { languageKnobsForLevel, getLanguageKnobs } from '../../../src/reporter/tier-adaptive-language.js';

describe('tier-adaptive-language', () => {
  it('returns terse + technical for experienced builders', () => {
    const k = languageKnobsForLevel('experienced');
    expect(k.verbosity).toBe('terse');
    expect(k.show_technical_details).toBe(true);
    expect(k.show_details_expansion).toBe(false);
  });

  it('returns plain + hidden-technical for first-time / beginner', () => {
    for (const lvl of ['first-time', 'beginner'] as const) {
      const k = languageKnobsForLevel(lvl);
      expect(k.verbosity).toBe('plain');
      expect(k.show_technical_details).toBe(false);
      expect(k.show_details_expansion).toBe(true);
    }
  });

  it('intermediate is balanced-with-details', () => {
    const k = languageKnobsForLevel('intermediate');
    expect(k.verbosity).toBe('balanced');
    expect(k.show_technical_details).toBe(true);
  });

  it('--verbose override yields plain + technical + expansion', async () => {
    const k = await getLanguageKnobs({ verboseFlag: true, levelOverride: 'experienced' });
    expect(k.verbosity).toBe('plain');
    expect(k.show_technical_details).toBe(true);
    expect(k.show_details_expansion).toBe(true);
  });

  it('--terse override yields terse', async () => {
    const k = await getLanguageKnobs({ terseFlag: true, levelOverride: 'beginner' });
    expect(k.verbosity).toBe('terse');
    expect(k.show_details_expansion).toBe(false);
  });
});
