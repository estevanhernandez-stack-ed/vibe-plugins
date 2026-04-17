import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createReportObject } from '../../../src/reporter/report-object.js';
import { renderJson, serializeReport } from '../../../src/reporter/json-renderer.js';

describe('json-renderer', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vibe-test-json-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes current + history files with schema-valid audit payload', async () => {
    const r = createReportObject({ command: 'audit', repo_root: dir });
    r.classification = {
      app_type: 'spa',
      tier: 'internal',
      modifiers: [],
      confidence: 0.9,
    };
    r.findings.push({
      id: 'F1',
      severity: 'high',
      category: 'gap-smoke',
      title: 'Missing smoke test for App root',
    });
    const res = await renderJson({ report: r, repoRoot: dir });
    expect(res.validation.attempted).toBe(true);
    expect(res.validation.valid).toBe(true);
    expect(existsSync(res.currentPath)).toBe(true);
    expect(existsSync(res.historyPath)).toBe(true);

    const payload = JSON.parse(readFileSync(res.currentPath, 'utf8'));
    expect(payload.schema_version).toBe(1);
    expect(payload.command).toBe('audit');
    expect(payload.findings).toHaveLength(1);

    // History file should be named with sanitized timestamp.
    const histFiles = readdirSync(join(dir, '.vibe-test/state/history'));
    expect(histFiles.length).toBe(1);
    expect(histFiles[0]).toMatch(/^audit-/);
  });

  it('throws on schema violations (audit without required schema_version)', async () => {
    const r = createReportObject({ command: 'audit', repo_root: dir });
    // Pollute the report to force a schema violation. We bypass TypeScript to
    // simulate a malformed in-memory object.
    (r as unknown as { schema_version: unknown }).schema_version = 2;
    await expect(renderJson({ report: r, repoRoot: dir })).rejects.toThrow(/validation failed/);
  });

  it('supports skipValidation for commands without a schema mapping', async () => {
    const r = createReportObject({ command: 'posture', repo_root: dir });
    const res = await renderJson({ report: r, repoRoot: dir });
    // posture isn't in COMMAND_TO_SCHEMA — validation is skipped implicitly.
    expect(res.validation.attempted).toBe(false);
    expect(existsSync(res.currentPath)).toBe(true);
  });

  it('serializeReport returns stable JSON text', () => {
    const r = createReportObject({ command: 'coverage', repo_root: '/x' });
    const out = serializeReport(r);
    expect(out).toMatch(/"schema_version": 1/);
  });
});
