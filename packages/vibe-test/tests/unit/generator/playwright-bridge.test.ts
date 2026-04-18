import { describe, it, expect } from 'vitest';

import {
  isPlaywrightMcpAvailable,
  formatDeferralAnnouncement,
  formatPresentAnnouncement,
  resolvePlaywrightBridge,
} from '../../../src/generator/playwright-bridge.js';

describe('playwright-bridge', () => {
  describe('isPlaywrightMcpAvailable', () => {
    it('returns true on exact match', () => {
      expect(isPlaywrightMcpAvailable(['playwright'])).toBe(true);
    });

    it('returns true on prefix / plugin-namespaced match', () => {
      expect(isPlaywrightMcpAvailable(['playwright:codegen'])).toBe(true);
      expect(isPlaywrightMcpAvailable(['playwright (plugin + MCP)'])).toBe(true);
    });

    it('returns false when only unrelated skills are present', () => {
      expect(
        isPlaywrightMcpAvailable([
          'superpowers:test-driven-development',
          'vibe-doc:generate',
        ]),
      ).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isPlaywrightMcpAvailable(['PlayWright'])).toBe(true);
    });
  });

  describe('formatDeferralAnnouncement', () => {
    it('returns empty string when no gaps are supplied', () => {
      expect(formatDeferralAnnouncement([])).toBe('');
    });

    it('names the gaps and points the builder to the plugin install', () => {
      const out = formatDeferralAnnouncement([
        'Sign-in happy path',
        'Checkout cancel flow',
      ]);
      expect(out.toLowerCase()).toContain('install the `playwright` plugin');
      expect(out).toContain('Sign-in happy path');
      expect(out).toContain('Checkout cancel flow');
      expect(out).toContain('--codegen typescript');
    });
  });

  describe('formatPresentAnnouncement', () => {
    it('announces deferral when Playwright is present, even with no gaps', () => {
      const out = formatPresentAnnouncement([]);
      expect(out).toContain('Playwright MCP detected');
      expect(out).toContain('--codegen typescript');
    });

    it('lists the queued flows when gaps are supplied', () => {
      const out = formatPresentAnnouncement(['flow A', 'flow B']);
      expect(out).toContain('flow A');
      expect(out).toContain('flow B');
      expect(out).toContain('Flows queued for Playwright');
    });
  });

  describe('resolvePlaywrightBridge', () => {
    it('returns available=true + present announcement when playwright is in the list', () => {
      const res = resolvePlaywrightBridge({
        availableSkills: ['playwright'],
        detectedE2eGaps: ['nav'],
      });
      expect(res.available).toBe(true);
      expect(res.announcement).toContain('Playwright MCP detected');
    });

    it('returns available=false + deferral announcement otherwise', () => {
      const res = resolvePlaywrightBridge({
        availableSkills: ['superpowers:test-driven-development'],
        detectedE2eGaps: ['nav'],
      });
      expect(res.available).toBe(false);
      expect(res.announcement.toLowerCase()).toContain('install the `playwright` plugin');
    });
  });
});
