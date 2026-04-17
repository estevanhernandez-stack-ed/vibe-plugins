import { describe, it, expect } from 'vitest';

import { detectComplements, suggestDynamic } from '../../../src/composition/detect-complements.js';
import type { AnchoredEntry } from '../../../src/composition/anchored-registry.js';

const REGISTRY: AnchoredEntry[] = [
  {
    complement: 'superpowers:test-driven-development',
    applies_to: ['generate'],
    phase: 'new-feature tests',
    deferral_contract: 'TDD drives.',
  },
  {
    complement: 'playwright',
    applies_to: ['generate', 'audit'],
    phase: 'E2E',
    deferral_contract: 'Playwright drives.',
  },
  {
    complement: 'vibe-doc',
    applies_to: ['audit'],
    phase: 'doc compose',
    deferral_contract: 'Co-author.',
  },
];

describe('detectComplements', () => {
  it('marks exact-name skills as available', () => {
    const map = detectComplements({
      availableSkills: ['superpowers:test-driven-development', 'vibe-doc:generate'],
      anchored: REGISTRY,
      currentCommand: 'generate',
    });
    expect(map.get('superpowers:test-driven-development')?.available).toBe(true);
    // playwright not in availableSkills → not available
    expect(map.get('playwright')?.available).toBe(false);
  });

  it('matches plugin-name prefixes (vibe-doc vs vibe-doc:generate)', () => {
    const map = detectComplements({
      availableSkills: ['vibe-doc:generate', 'vibe-doc:scan'],
      anchored: REGISTRY,
      currentCommand: 'audit',
    });
    expect(map.get('vibe-doc')?.available).toBe(true);
  });

  it('filters by currentCommand so irrelevant complements are dropped', () => {
    const map = detectComplements({
      availableSkills: ['playwright'],
      anchored: REGISTRY,
      currentCommand: 'coverage',
    });
    // playwright applies_to = [generate, audit]; not relevant for coverage.
    expect(map.has('playwright')).toBe(false);
  });
});

describe('suggestDynamic', () => {
  it('surfaces a non-anchored but testing-related skill', () => {
    const suggestion = suggestDynamic({
      availableSkills: ['acme:test-harness', 'unrelated-plugin'],
      anchored: REGISTRY,
      currentCommand: 'generate',
    });
    expect(suggestion).toBe('acme:test-harness');
  });

  it('returns null outside relevant commands', () => {
    const suggestion = suggestDynamic({
      availableSkills: ['acme:test-harness'],
      anchored: REGISTRY,
      currentCommand: 'posture',
    });
    expect(suggestion).toBeNull();
  });

  it('does not suggest skills already anchored', () => {
    const suggestion = suggestDynamic({
      availableSkills: ['superpowers:test-driven-development'],
      anchored: REGISTRY,
      currentCommand: 'generate',
    });
    expect(suggestion).toBeNull();
  });
});
