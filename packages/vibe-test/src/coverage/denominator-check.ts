/**
 * Denominator honesty check — detects "cherry-picked" coverage denominators.
 *
 * Cherry-picking happens when a framework's coverage report only includes the
 * files that were imported during the test run. In a vibe-coded app with
 * 43 source files and 3 files tested, the report says "88% lines covered" —
 * but only over the 3 files. Whole-repo coverage is ~6%.
 *
 * This function compares the set of files the coverage report *measured* against
 * the set of files the scanner actually found in `src/`. When the delta is
 * significant we flag it + enumerate which files are missing.
 */

export interface DenominatorCheckInput {
  /** Files reported as measured by the coverage tool. */
  reportedFiles: string[];
  /** Files the scanner found (filtered to testable sources). */
  actualSourceFiles: string[];
  /**
   * Ratio threshold (0..1) above which we consider the denominator honest.
   * Default 0.75 — if reportedFiles covers >=75% of actual, not cherry-picked.
   */
  honestyThreshold?: number;
}

export interface DenominatorCheckResult {
  is_cherry_picked: boolean;
  reported_files: number;
  actual_source_files: number;
  coverage_ratio: number;
  missing_files: string[];
  /** Whether our inputs had zero source files (makes ratio undefined). */
  indeterminate: boolean;
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/');
}

export function checkDenominator(input: DenominatorCheckInput): DenominatorCheckResult {
  const threshold = input.honestyThreshold ?? 0.75;
  const reported = new Set(input.reportedFiles.map(normalize));
  const actualNorm = input.actualSourceFiles.map(normalize);
  const actualCount = actualNorm.length;
  const reportedCount = reported.size;

  if (actualCount === 0) {
    return {
      is_cherry_picked: false,
      reported_files: reportedCount,
      actual_source_files: 0,
      coverage_ratio: 1,
      missing_files: [],
      indeterminate: true,
    };
  }

  // Which actual files are missing from the reported set? Use basename as a
  // fallback match — coverage tools sometimes report with repo-absolute paths
  // and sometimes relative. We compare on suffix to stay tolerant.
  const missing: string[] = [];
  for (const srcFile of actualNorm) {
    let found = false;
    for (const r of reported) {
      if (r === srcFile || r.endsWith(srcFile) || srcFile.endsWith(r)) {
        found = true;
        break;
      }
    }
    if (!found) missing.push(srcFile);
  }

  const measured = actualCount - missing.length;
  const ratio = measured / actualCount;
  return {
    is_cherry_picked: ratio < threshold,
    reported_files: reportedCount,
    actual_source_files: actualCount,
    coverage_ratio: ratio,
    missing_files: missing,
    indeterminate: false,
  };
}
