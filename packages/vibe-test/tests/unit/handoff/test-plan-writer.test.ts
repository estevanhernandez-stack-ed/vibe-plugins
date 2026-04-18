import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  appendTestPlanSession,
  renderSessionEntry,
  type TestPlanSessionEntry,
} from '../../../src/handoff/test-plan-writer.js';

function entry(n: number): TestPlanSessionEntry {
  return {
    timestamp: `2026-04-17T00:0${n}:00.000Z`,
    command: n % 2 === 0 ? 'generate' : 'audit',
    sessionUUID: `sess-${n}`,
    classification: `Classification prose for session ${n}.`,
    generated_tests: [
      {
        path: `tests/foo${n}.test.ts`,
        confidence: 0.9,
        status: 'auto-written',
        rationale: 'Smoke test for Foo component.',
      },
    ],
    rejected_with_reason: [{ path: `tests/rej${n}.test.ts`, reason: 'builder prefers vitest fakers' }],
  };
}

describe('test-plan-writer', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'vibe-test-plan-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('creates docs/test-plan.md with the first session entry on initial write', async () => {
    const res = await appendTestPlanSession(dir, entry(1));
    expect(res.created).toBe(true);
    expect(res.appended).toBe(false);

    const content = await fs.readFile(res.path, 'utf8');
    expect(content).toContain('# Test Plan');
    expect(content).toContain('## Session 2026-04-17T00:01:00.000Z');
    expect(content).toContain('### Classification');
    expect(content).toContain('### Generated tests');
    expect(content).toContain('### Rejected with reason');
  });

  it('appends subsequent sessions without overwriting prior entries', async () => {
    await appendTestPlanSession(dir, entry(1));
    await appendTestPlanSession(dir, entry(2));
    const content = await fs.readFile(join(dir, 'docs', 'test-plan.md'), 'utf8');

    // Both session blocks present, session 1 before session 2.
    const idx1 = content.indexOf('## Session 2026-04-17T00:01:00.000Z');
    const idx2 = content.indexOf('## Session 2026-04-17T00:02:00.000Z');
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThan(idx1);
    expect(content).toContain('Classification prose for session 1.');
    expect(content).toContain('Classification prose for session 2.');
  });

  it('renders stable headings for L2 extraction', () => {
    const md = renderSessionEntry(entry(5));
    expect(md).toContain('## Session 2026-04-17T00:05:00.000Z');
    expect(md).toContain('### Classification');
    expect(md).toContain('### Generated tests');
    expect(md).toContain('### Rejected with reason');
  });

  it('falls back to placeholders when lists are empty', () => {
    const e: TestPlanSessionEntry = {
      ...entry(7),
      generated_tests: [],
      rejected_with_reason: [],
    };
    const md = renderSessionEntry(e);
    expect(md).toContain('_None this session._');
    expect(md).toContain('_None._');
  });
});
