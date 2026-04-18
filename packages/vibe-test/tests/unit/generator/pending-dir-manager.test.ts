import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';

import {
  stagePendingTest,
  acceptPendingTest,
  rejectPendingTest,
  listPending,
  writePendingIndex,
  renderPendingIndex,
  pendingPathFor,
} from '../../../src/generator/pending-dir-manager.js';

describe('pending-dir-manager', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'vibe-test-pending-'));
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  describe('pendingPathFor', () => {
    it('mirrors the target path under .vibe-test/pending/', () => {
      const p = pendingPathFor(repo, 'tests/components/MovieCard.test.tsx');
      expect(p).toContain(join('.vibe-test', 'pending', 'tests', 'components', 'MovieCard.test.tsx'));
    });

    it('rejects paths that escape the repo root', () => {
      expect(() => pendingPathFor(repo, '../outside.test.ts')).toThrow(/outside repoRoot/);
    });
  });

  describe('stage → list', () => {
    it('writes the staged file, meta sidecar, and lists the entry', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/a.test.ts',
        content: 'console.log("hi");\n',
        confidence: 0.8,
        rationale: 'smoke test for a',
        auditFindingId: 'gap-smoke-1',
        headHash: 'abc123',
      });
      expect(stage.recorded_hash).toBe('abc123');

      const pendingExists = await fs.stat(stage.pending_path);
      expect(pendingExists.isFile()).toBe(true);

      const list = await listPending(repo);
      expect(list).toHaveLength(1);
      expect(list[0]?.meta.confidence).toBe(0.8);
      expect(list[0]?.meta.rationale).toBe('smoke test for a');
      expect(list[0]?.meta.head_hash_at_stage).toBe('abc123');
      expect(list[0]?.meta.audit_finding_id).toBe('gap-smoke-1');
    });

    it('sorts list by confidence descending', async () => {
      await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/low.test.ts',
        content: 'x',
        confidence: 0.71,
        rationale: 'low',
        headHash: null,
      });
      await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/high.test.ts',
        content: 'x',
        confidence: 0.88,
        rationale: 'high',
        headHash: null,
      });
      const list = await listPending(repo);
      expect(list.map((e) => e.meta.target_test_path)).toEqual([
        'tests/high.test.ts',
        'tests/low.test.ts',
      ]);
    });
  });

  describe('accept', () => {
    it('moves the staged file to its target path when HEAD matches', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/a.test.ts',
        content: '// generated\n',
        confidence: 0.85,
        rationale: 'smoke',
        headHash: 'deadbeef',
      });
      const result = await acceptPendingTest({
        repoRoot: repo,
        pendingPath: stage.pending_path,
        currentHeadHash: 'deadbeef',
      });
      expect(result.accepted).toBe(true);
      expect(result.branch_switched).toBe(false);
      expect(result.final_path).toBe(join(repo, 'tests', 'a.test.ts'));

      // File moved: pending gone, target present.
      await expect(fs.stat(stage.pending_path)).rejects.toThrow();
      const target = await fs.readFile(result.final_path!, 'utf8');
      expect(target).toBe('// generated\n');
    });

    it('returns branch_switched=true and does NOT move the file when HEAD differs', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/b.test.ts',
        content: '// generated\n',
        confidence: 0.8,
        rationale: 'smoke',
        headHash: 'aaa111',
      });
      const result = await acceptPendingTest({
        repoRoot: repo,
        pendingPath: stage.pending_path,
        currentHeadHash: 'bbb222',
      });
      expect(result.accepted).toBe(false);
      expect(result.branch_switched).toBe(true);
      expect(result.recorded_hash).toBe('aaa111');
      expect(result.current_hash).toBe('bbb222');

      // Staged file still present.
      const stat = await fs.stat(stage.pending_path);
      expect(stat.isFile()).toBe(true);
    });

    it('force flag promotes even on branch switch', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/c.test.ts',
        content: '// generated\n',
        confidence: 0.8,
        rationale: 'smoke',
        headHash: 'aaa111',
      });
      const result = await acceptPendingTest({
        repoRoot: repo,
        pendingPath: stage.pending_path,
        currentHeadHash: 'bbb222',
        force: true,
      });
      expect(result.accepted).toBe(true);
      expect(result.branch_switched).toBe(true);
    });

    it('treats null-recorded or null-current hash as "not switched"', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/d.test.ts',
        content: '// generated\n',
        confidence: 0.8,
        rationale: 'smoke',
        headHash: null, // simulate non-git-repo at stage time
      });
      const result = await acceptPendingTest({
        repoRoot: repo,
        pendingPath: stage.pending_path,
        currentHeadHash: 'anything',
      });
      expect(result.accepted).toBe(true);
      expect(result.branch_switched).toBe(false);
    });
  });

  describe('reject', () => {
    it('removes the staged file and returns a friction-shaped entry', async () => {
      const stage = await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/e.test.ts',
        content: '// bad idea\n',
        confidence: 0.7,
        rationale: 'edge',
        headHash: null,
      });
      const result = await rejectPendingTest({
        pendingPath: stage.pending_path,
        reason: 'fixture approach wrong for this repo',
      });
      expect(result.removed).toBe(true);
      expect(result.friction_entry.friction_type).toBe('generation_pattern_mismatch');
      expect(result.friction_entry.symptom).toBe('fixture approach wrong for this repo');
      expect(result.friction_entry.target_test_path).toBe('tests/e.test.ts');

      await expect(fs.stat(stage.pending_path)).rejects.toThrow();
    });
  });

  describe('index.md', () => {
    it('renders a header and an empty message when nothing is staged', () => {
      const md = renderPendingIndex(repo, []);
      expect(md).toContain('# Vibe Test — Pending Tests');
      expect(md).toContain('No staged tests');
    });

    it('renders rows for each entry with confidence, hash-prefix, and rationale', async () => {
      await stagePendingTest({
        repoRoot: repo,
        targetTestPath: 'tests/f.test.ts',
        content: 'x',
        confidence: 0.85,
        rationale: 'covers happy-path render',
        headHash: 'deadbeefcafebabe1234567890abcdef12345678',
      });
      const list = await listPending(repo);
      const md = renderPendingIndex(repo, list);
      expect(md).toContain('tests/f.test.ts');
      expect(md).toContain('0.85');
      expect(md).toContain('deadbee');
      expect(md).toContain('covers happy-path render');
    });

    it('writePendingIndex writes the file atomically', async () => {
      const path = await writePendingIndex(repo, []);
      const content = await fs.readFile(path, 'utf8');
      expect(content).toContain('# Vibe Test — Pending Tests');
    });
  });
});
