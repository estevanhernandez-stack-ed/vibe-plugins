import { describe, it, expect } from 'vitest';

import { createReportObject } from '../../../src/reporter/report-object.js';
import { renderBanner } from '../../../src/reporter/banner-renderer.js';

function maxLineWidth(str: string): number {
  // Strip ANSI escape sequences before measuring.
  const ansiRe = /\u001b\[[0-9;]*m/g;
  return Math.max(...str.replace(ansiRe, '').split('\n').map((l) => l.length));
}

describe('banner-renderer', () => {
  it('renders within 80 cols by default', () => {
    const report = createReportObject({ command: 'audit', repo_root: '/tmp/x' });
    report.classification = {
      app_type: 'spa-api',
      tier: 'public-facing',
      modifiers: ['customer-facing'],
      confidence: 0.85,
    };
    report.score = {
      current: 55.5,
      target: 70,
      per_level: { smoke: 60, behavioral: 55, edge: 40, integration: 20, performance: 0 },
    };
    report.findings.push({
      id: 'F1',
      severity: 'high',
      category: 'harness-break',
      title: 'Broken vitest forks pool',
      rationale: 'Command times out before reporting.',
    });
    const out = renderBanner(report, { columns: 80, disableColors: true });
    expect(maxLineWidth(out)).toBeLessThanOrEqual(80);
    expect(out).toMatch(/Vibe Test/);
    expect(out).toMatch(/Classification/);
    expect(out).toMatch(/Findings \(1\)/);
  });

  it('expands beyond 80 cols when terminal is wider', () => {
    const report = createReportObject({ command: 'gate', repo_root: '/tmp/x' });
    const out = renderBanner(report, { columns: 120, disableColors: true });
    expect(maxLineWidth(out)).toBeLessThanOrEqual(120);
    // The bar divider should fill the width.
    expect(out).toMatch(/={120}/);
  });

  it('renders no classification / score gracefully', () => {
    const report = createReportObject({ command: 'posture', repo_root: '/x' });
    const out = renderBanner(report, { columns: 80, disableColors: true });
    expect(out).toMatch(/no classification attached/);
    expect(out).toMatch(/no score attached/);
  });
});
