import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { writeTestingMd } from '../../../src/handoff/testing-md-writer.js';

function basePayload(project_name = 'fixture-app') {
  return {
    project_name,
    timestamp: '2026-04-17T00:00:00.000Z',
    testing_overview: 'Overview prose.',
    classification_summary: 'SPA + API, public-facing tier.',
    coverage_posture: 'Current 25% / target 30%.',
    run_instructions: '`pnpm test`',
    add_test_instructions: 'Add a file under `tests/` matching `*.test.ts`.',
    graduating_section: '### From public-facing to customer-facing-saas\n\nStub.',
    ecosystem_section: '',
  };
}

describe('testing-md-writer', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'vibe-test-md-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('creates docs/TESTING.md with all 6 required section marker pairs on first write', async () => {
    const result = await writeTestingMd(dir, basePayload());
    expect(result.created).toBe(true);

    const content = await fs.readFile(result.path, 'utf8');
    for (const section of [
      'testing_overview',
      'classification_summary',
      'coverage_posture',
      'run_instructions',
      'add_test_instructions',
      'graduating_section',
    ]) {
      expect(content).toContain(`<!-- vibe-test:start:${section} -->`);
      expect(content).toContain(`<!-- vibe-test:end:${section} -->`);
    }
    expect(content).toContain('Overview prose.');
    expect(content).toContain('SPA + API, public-facing tier.');
  });

  it('preserves builder edits placed OUTSIDE Vibe Test marker pairs between writes', async () => {
    // First write — default payload.
    await writeTestingMd(dir, basePayload());
    const path = join(dir, 'docs', 'TESTING.md');

    // Builder manually inserts a section AFTER the ecosystem marker block.
    const manual = '\n\n## Builder Notes\n\nKeep an eye on the weird auth race.\n';
    const original = await fs.readFile(path, 'utf8');
    await fs.writeFile(path, original + manual, 'utf8');

    // Second write — payload changes but the manual section should survive.
    const updated = basePayload();
    updated.testing_overview = 'REFRESHED overview prose.';
    await writeTestingMd(dir, updated);

    const final = await fs.readFile(path, 'utf8');
    expect(final).toContain('## Builder Notes');
    expect(final).toContain('weird auth race');
    expect(final).toContain('REFRESHED overview prose.');
    // Prior managed content should be gone.
    expect(final).not.toContain('Overview prose.\n<!-- vibe-test:end:testing_overview');
  });

  it('overwrites only marker-delimited inner content, leaving outer scaffolding intact', async () => {
    await writeTestingMd(dir, basePayload());
    const path = join(dir, 'docs', 'TESTING.md');

    // Second write with changed prose.
    const p2 = basePayload();
    p2.classification_summary = 'SPA only, internal tier.';
    await writeTestingMd(dir, p2);

    const content = await fs.readFile(path, 'utf8');
    expect(content).toContain('SPA only, internal tier.');
    // Other sections retained (i.e., still present).
    expect(content).toContain('Current 25% / target 30%.');
  });
});
