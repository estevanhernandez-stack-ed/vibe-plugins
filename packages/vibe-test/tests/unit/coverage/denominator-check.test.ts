import { describe, it, expect } from 'vitest';

import { checkDenominator } from '../../../src/coverage/denominator-check.js';

describe('denominator-check', () => {
  it('flags cherry-picked coverage (3 of 43 files reported)', () => {
    const actualFiles = Array.from({ length: 43 }, (_, i) => `src/file${i + 1}.ts`);
    const reported = ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'];
    const res = checkDenominator({
      reportedFiles: reported,
      actualSourceFiles: actualFiles,
    });
    expect(res.is_cherry_picked).toBe(true);
    expect(res.reported_files).toBe(3);
    expect(res.actual_source_files).toBe(43);
    expect(res.missing_files.length).toBe(40);
    expect(res.coverage_ratio).toBeCloseTo(3 / 43, 4);
  });

  it('passes honest coverage (100% files reported)', () => {
    const actualFiles = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const res = checkDenominator({
      reportedFiles: [...actualFiles],
      actualSourceFiles: actualFiles,
    });
    expect(res.is_cherry_picked).toBe(false);
    expect(res.missing_files).toEqual([]);
    expect(res.coverage_ratio).toBe(1);
  });

  it('handles empty source input as indeterminate', () => {
    const res = checkDenominator({
      reportedFiles: [],
      actualSourceFiles: [],
    });
    expect(res.indeterminate).toBe(true);
    expect(res.is_cherry_picked).toBe(false);
  });

  it('tolerates absolute-vs-relative path mismatches via suffix match', () => {
    const res = checkDenominator({
      reportedFiles: ['/repo/src/a.ts', '/repo/src/b.ts'],
      actualSourceFiles: ['src/a.ts', 'src/b.ts'],
    });
    expect(res.is_cherry_picked).toBe(false);
    expect(res.missing_files).toEqual([]);
  });
});
