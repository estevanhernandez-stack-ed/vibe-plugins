import { describe, it, expect } from 'vitest';

import { createReportObject } from '../../../src/reporter/report-object.js';

describe('createReportObject', () => {
  it('returns a well-formed minimal report', () => {
    const r = createReportObject({
      command: 'audit',
      plugin_version: '0.2.0',
      repo_root: '/tmp/x',
      scope: null,
    });
    expect(r.schema_version).toBe(1);
    expect(r.command).toBe('audit');
    expect(r.plugin_version).toBe('0.2.0');
    expect(r.project.repo_root).toBe('/tmp/x');
    expect(r.project.scope).toBeNull();
    expect(r.findings).toEqual([]);
    expect(r.actions_taken).toEqual([]);
    expect(r.deferrals).toEqual([]);
    expect(r.classification).toBeNull();
    expect(r.score).toBeNull();
    expect(typeof r.timestamp).toBe('string');
  });

  it('carries scope when provided', () => {
    const r = createReportObject({ command: 'generate', scope: 'src/frontend' });
    expect(r.project.scope).toBe('src/frontend');
  });
});
