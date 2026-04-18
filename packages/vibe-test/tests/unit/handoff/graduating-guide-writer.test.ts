import { describe, it, expect } from 'vitest';

import {
  renderGraduatingSection,
  nextTier,
  detectTierTransition,
} from '../../../src/handoff/graduating-guide-writer.js';

describe('graduating-guide-writer', () => {
  it('nextTier progresses through all five tiers and stops at regulated', () => {
    expect(nextTier('prototype')).toBe('internal');
    expect(nextTier('internal')).toBe('public-facing');
    expect(nextTier('public-facing')).toBe('customer-facing-saas');
    expect(nextTier('customer-facing-saas')).toBe('regulated');
    expect(nextTier('regulated')).toBeNull();
  });

  it('produces a tier-specific section for each transition', async () => {
    for (const tier of [
      'prototype',
      'internal',
      'public-facing',
      'customer-facing-saas',
    ] as const) {
      const md = await renderGraduatingSection({
        current_tier: tier,
        transition_summary: `Moving from ${tier} upwards means stricter guarantees.`,
        changes_list: ['CI deploy target required'],
        new_tests_list: ['auth behavioral tests'],
        new_patterns_list: ['error-boundary integration test scaffold'],
      });
      expect(md).toContain(`from ${tier}`);
      expect(md).toContain('CI deploy target required');
      expect(md).toContain('auth behavioral tests');
    }
  });

  it('emits a sentinel section at the top tier', async () => {
    const md = await renderGraduatingSection({
      current_tier: 'regulated',
      transition_summary: '',
      changes_list: [],
      new_tests_list: [],
      new_patterns_list: [],
    });
    expect(md).toContain('top tier');
    expect(md).toContain('`regulated`');
  });

  it('renders empty lists as "_None._"', async () => {
    const md = await renderGraduatingSection({
      current_tier: 'prototype',
      transition_summary: 'Stub.',
      changes_list: [],
      new_tests_list: [],
      new_patterns_list: [],
    });
    expect(md).toContain('_None._');
  });

  it('detectTierTransition flags a change and ignores equality / missing prior', () => {
    expect(detectTierTransition(undefined, 'internal').transitioned).toBe(false);
    expect(detectTierTransition('internal', 'internal').transitioned).toBe(false);
    const t = detectTierTransition('prototype', 'public-facing');
    expect(t.transitioned).toBe(true);
    expect(t.from).toBe('prototype');
    expect(t.to).toBe('public-facing');
  });
});
