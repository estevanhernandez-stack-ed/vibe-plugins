/**
 * Integration-style smoke test: runs all handoff writers against the
 * minimal-spa fixture to verify the full composition flow works end-to-end.
 * Keeps the fixture clean by pointing writes at a tmpdir copy of its docs/ tree.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  writeTestingMd,
  appendTestPlanSession,
  writeCiStub,
  renderGraduatingSection,
  renderEcosystemSection,
} from '../../../src/handoff/index.js';

describe('handoff fixture smoke', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'vibe-test-smoke-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('composes all 5 writers into a coherent first-audit handoff bundle', async () => {
    const graduating = await renderGraduatingSection({
      current_tier: 'public-facing',
      transition_summary: 'Moving up means multi-tenant isolation and mandatory error handling.',
      changes_list: ['Multi-tenant test isolation', 'Mandatory error-handling paths'],
      new_tests_list: ['tenant-isolation smoke test', 'error-boundary behavioral tests'],
      new_patterns_list: ['Factory per tenant', 'Shared fixture for auth session'],
    });

    const ecosystem = await renderEcosystemSection({
      recommendations: [
        {
          plugin: 'playwright',
          gap: 'E2E browser testing for SPA routes.',
          install_command: '/plugin install playwright',
          why: 'UI-heavy components benefit from real-browser coverage.',
        },
      ],
      availableSkills: ['vibe-doc:scan'],
    });

    const tmRes = await writeTestingMd(dir, {
      project_name: 'minimal-spa',
      testing_overview: 'Minimal SPA with React + Vite. 2 components, no backend.',
      classification_summary: 'spa / public-facing / no modifiers (confidence 0.9).',
      coverage_posture: 'Current 25% / target 30%. Gap on behavioral tests.',
      run_instructions: '`pnpm test` runs the vitest suite.',
      add_test_instructions: 'Drop `<name>.test.ts` next to the source file.',
      graduating_section: graduating,
      ecosystem_section: ecosystem.content,
    });
    expect(tmRes.created).toBe(true);
    const tmContent = await fs.readFile(tmRes.path, 'utf8');
    // 6 required sections + ecosystem
    for (const marker of [
      'testing_overview',
      'classification_summary',
      'coverage_posture',
      'run_instructions',
      'add_test_instructions',
      'graduating_section',
      'ecosystem',
    ]) {
      expect(tmContent).toContain(`<!-- vibe-test:start:${marker} -->`);
    }
    // Acceptance: TESTING.md has no structural vibe-test references outside the
    // ecosystem section (which legitimately names Vibe Test as a tool).
    const nonEcosystem = tmContent
      .replace(
        /<!-- vibe-test:start:ecosystem -->[\s\S]*?<!-- vibe-test:end:ecosystem -->/,
        '',
      )
      // markers themselves don't count as structural references.
      .replace(/<!-- vibe-test:(start|end):[\w_]+ -->/g, '');
    expect(/vibe-test/i.test(nonEcosystem)).toBe(false);

    const tpRes = await appendTestPlanSession(dir, {
      timestamp: '2026-04-17T00:00:00.000Z',
      command: 'audit',
      sessionUUID: 'smoke-uuid-1',
      classification: 'spa / public-facing',
      generated_tests: [],
      rejected_with_reason: [],
    });
    expect(tpRes.created).toBe(true);

    // CI stub with consent=false — returns content, no file.
    const ciRes = await writeCiStub(
      dir,
      { detectedEnvVars: ['VITE_API_URL'], packageManager: 'pnpm' },
      { consent: false },
    );
    expect(ciRes.wrote).toBe(false);
    await expect(fs.access(join(dir, '.github', 'workflows', 'vibe-test-gate.yml'))).rejects.toThrow();
  });
});
