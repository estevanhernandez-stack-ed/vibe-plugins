import { describe, it, expect } from 'vitest';

import {
  renderEcosystemSection,
  type EcosystemRecommendation,
} from '../../../src/handoff/ecosystem-section-writer.js';

const recs: EcosystemRecommendation[] = [
  {
    plugin: 'superpowers:test-driven-development',
    gap: 'NEW-feature test authoring discipline.',
    install_command: '/plugin install superpowers',
    why: 'Vibe Test closes retrofit gaps; TDD owns new-feature flow.',
  },
  {
    plugin: 'playwright',
    gap: 'E2E browser-driven flows.',
    install_command: '/plugin install playwright',
    why: 'UI-heavy repo benefits from real-browser coverage.',
  },
  {
    plugin: 'vibe-doc',
    gap: 'Co-authoring TESTING.md with documentation scanner.',
    install_command: '/plugin install vibe-doc',
    why: 'Keeps docs/TESTING.md synced with detected doc gaps.',
  },
];

describe('ecosystem-section-writer', () => {
  it('filters out recommendations whose plugin is already installed', async () => {
    const res = await renderEcosystemSection({
      recommendations: recs,
      availableSkills: ['superpowers:test-driven-development', 'vibe-doc:scan'],
    });
    // playwright remains; tdd (exact match) + vibe-doc (plugin-level via vibe-doc:scan) filtered.
    expect(res.included.map((r) => r.plugin)).toEqual(['playwright']);
    expect(res.excluded.map((r) => r.plugin)).toContain('superpowers:test-driven-development');
    expect(res.excluded.map((r) => r.plugin)).toContain('vibe-doc');
    expect(res.content).toContain('### playwright');
    expect(res.content).not.toContain('### superpowers:test-driven-development');
  });

  it('returns empty content when every recommendation is already installed', async () => {
    const res = await renderEcosystemSection({
      recommendations: recs,
      availableSkills: [
        'superpowers:test-driven-development',
        'playwright:codegen',
        'vibe-doc:scan',
      ],
    });
    expect(res.included).toHaveLength(0);
    expect(res.content).toBe('');
  });

  it('renders gap + why + install_command in the ecosystem block', async () => {
    const res = await renderEcosystemSection({
      recommendations: [recs[1]!],
      availableSkills: [],
    });
    expect(res.content).toContain('### playwright');
    expect(res.content).toContain('E2E browser-driven flows.');
    expect(res.content).toContain('UI-heavy repo benefits');
    expect(res.content).toContain('/plugin install playwright');
  });

  it('is case-insensitive when matching installed plugins', async () => {
    const res = await renderEcosystemSection({
      recommendations: [recs[0]!],
      availableSkills: ['Superpowers:Test-Driven-Development'],
    });
    expect(res.included).toHaveLength(0);
  });
});
