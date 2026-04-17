import { describe, it, expect } from 'vitest';

import {
  parseAnchoredMarkdown,
  parseAnchoredSync,
  loadAnchoredRegistry,
} from '../../../src/composition/anchored-registry.js';

const SAMPLE = `# Plays Well With

Some intro prose.

\`\`\`yaml
- complement: superpowers:test-driven-development
  applies_to:
    - generate
  phase: new-feature test generation
  deferral_contract: |
    TDD drives new features; Vibe Test owns retrofit.

- complement: vibe-doc
  applies_to:
    - audit
    - generate
  phase: TESTING.md composition
  deferral_contract: |
    Offer co-author via /vibe-doc:generate.
\`\`\`
`;

describe('anchored-registry', () => {
  it('parses a sample plays-well-with.md with fenced YAML', () => {
    const out = parseAnchoredMarkdown(SAMPLE);
    expect(out).toHaveLength(2);
    const tdd = out.find((e) => e.complement === 'superpowers:test-driven-development');
    expect(tdd?.applies_to).toEqual(['generate']);
    expect(tdd?.phase).toMatch(/new-feature/);
    const vd = out.find((e) => e.complement === 'vibe-doc');
    expect(vd?.applies_to).toEqual(['audit', 'generate']);
  });

  it('parses inline YAML without fences', () => {
    const yaml = `- complement: playwright
  applies_to: [generate, audit]
  phase: E2E emission
  deferral_contract: |
    Defer test-file generation via codegen.
`;
    const out = parseAnchoredSync(yaml);
    expect(out).toHaveLength(1);
    expect(out[0]?.complement).toBe('playwright');
  });

  it('loads the real plays-well-with.md shipped in the repo', async () => {
    const out = await loadAnchoredRegistry();
    // The placeholder registry from item #2 has all 7 complements listed.
    expect(out.length).toBeGreaterThanOrEqual(7);
    expect(out.some((e) => e.complement === 'vibe-sec')).toBe(true);
  });
});
