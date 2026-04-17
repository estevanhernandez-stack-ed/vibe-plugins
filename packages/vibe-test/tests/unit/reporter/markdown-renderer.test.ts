import { describe, it, expect } from 'vitest';

import { createReportObject } from '../../../src/reporter/report-object.js';
import { renderMarkdownSync, DEFAULT_TEMPLATE } from '../../../src/reporter/markdown-renderer.js';

describe('markdown-renderer', () => {
  it('renders the default template with slot substitution', () => {
    const r = createReportObject({ command: 'audit', repo_root: '/repo' });
    r.classification = {
      app_type: 'spa',
      tier: 'prototype',
      modifiers: [],
      confidence: 0.9,
    };
    r.score = {
      current: 25,
      target: 30,
      per_level: { smoke: 40, behavioral: 15, edge: 10, integration: 0, performance: 0 },
    };
    const md = renderMarkdownSync(r, DEFAULT_TEMPLATE);
    expect(md).toMatch(/# Vibe Test · audit/);
    expect(md).toMatch(/App type.*spa/);
    expect(md).toMatch(/Current.*25\.0%/);
  });

  it('prefers SKILL-provided prose when a slot is overridden', () => {
    const r = createReportObject({ command: 'audit', repo_root: '/repo' });
    const md = renderMarkdownSync(r, DEFAULT_TEMPLATE, {
      findings: '_SKILL-curated findings prose here._',
    });
    expect(md).toMatch(/SKILL-curated findings prose here/);
  });
});
