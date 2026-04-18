import { describe, it, expect } from 'vitest';

import {
  isPlaywrightHookAvailable,
  composeProbeIntent,
  formatDeferralFinding,
} from '../../../src/runtime/index.js';

describe('isPlaywrightHookAvailable', () => {
  it('returns true when playwright is in available skills', () => {
    expect(isPlaywrightHookAvailable(['playwright'])).toBe(true);
    expect(isPlaywrightHookAvailable(['playwright:codegen'])).toBe(true);
  });

  it('returns false when playwright is missing', () => {
    expect(isPlaywrightHookAvailable(['superpowers:test-driven-development'])).toBe(false);
    expect(isPlaywrightHookAvailable([])).toBe(false);
  });
});

describe('composeProbeIntent', () => {
  it('composes a probe intent with the entry, steps, and a suggested basename', () => {
    const intent = composeProbeIntent({
      entry: '/login',
      steps: [
        'Fill the email field',
        'Fill the password field',
        'Submit the form',
        'Assert the dashboard heading is visible',
      ],
      name: 'sign-in',
    });

    expect(intent.suggestedSpecBasename).toBe('sign-in.spec.ts');
    expect(intent.text).toContain('/login');
    expect(intent.text).toContain('sign-in.spec.ts');
    expect(intent.text).toContain('Fill the email field');
    expect(intent.text.toLowerCase()).toContain('codegen typescript');
  });

  it('falls back to a slugified entry when name is missing', () => {
    const intent = composeProbeIntent({
      entry: '/checkout/cancel',
      steps: ['Open cancel modal', 'Confirm cancel'],
    });
    expect(intent.suggestedSpecBasename).toBe('cancel.spec.ts');
    expect(intent.text).toContain('/checkout/cancel');
  });

  it('handles bare-root entry by defaulting to flow.spec.ts', () => {
    const intent = composeProbeIntent({
      entry: '/',
      steps: ['Click hero CTA'],
    });
    expect(intent.suggestedSpecBasename).toBe('flow.spec.ts');
  });
});

describe('formatDeferralFinding', () => {
  it('returns empty string for no flows', () => {
    expect(formatDeferralFinding([])).toBe('');
  });

  it('returns the install-the-playwright-plugin finding when MCP is missing', () => {
    const out = formatDeferralFinding([
      { entry: '/login', steps: ['fill', 'submit'], name: 'sign-in' },
      { entry: '/checkout', steps: ['add', 'pay'] },
    ]);
    expect(out.toLowerCase()).toContain('install the `playwright` plugin');
    expect(out).toContain('sign-in');
    expect(out).toContain('checkout');
    expect(out).toContain('2 steps');
  });
});
