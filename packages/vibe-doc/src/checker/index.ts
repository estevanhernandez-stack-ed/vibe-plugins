/**
 * CI Check Logic
 * Validates that all required documentation exists and is not stale
 */

import * as path from 'path';
import * as fs from 'fs';
import { readState } from '../state';
import { isStale, getStalenessInfo } from './staleness';
import { VibedocState, GeneratedDoc } from '../state/schema';

export interface CheckOptions {
  threshold?: number;
}

export interface CheckResult {
  pass: boolean;
  missing: string[];
  stale: string[];
  details: string;
  exitCode: 0 | 1;
}

/**
 * Run CI checks on the project
 * Verifies that all required docs exist and are not stale
 * @param projectPath - Root path of the project
 * @param options - Check options (threshold in commits)
 * @returns CheckResult with pass/fail status and details
 */
export async function runCheck(
  projectPath: string,
  options: CheckOptions = {}
): Promise<CheckResult> {
  const threshold = options.threshold ?? 20;
  const missing: string[] = [];
  const stale: string[] = [];

  // Read state
  const state = readState(projectPath);
  if (!state) {
    return {
      pass: false,
      missing: [],
      stale: [],
      details: 'No vibe-doc state found. Run `vibe-doc scan` first.',
      exitCode: 1,
    };
  }

  // Get all required gaps (tier === 'required')
  const requiredGaps = state.gapReport.gaps.filter((gap) => gap.tier === 'required');

  // Check each required gap
  for (const gap of requiredGaps) {
    const docPath = path.join(projectPath, 'docs', 'generated', `${gap.docType}.md`);

    // Check if doc exists
    if (!fs.existsSync(docPath)) {
      missing.push(gap.docType);
      continue;
    }

    // Find the generated doc in state
    const generatedDoc = state.generatedDocs.find((d) => d.docType === gap.docType);
    if (!generatedDoc) {
      missing.push(gap.docType);
      continue;
    }

    // Check staleness
    const docIsStale = await isStale(generatedDoc, projectPath, threshold);
    if (docIsStale) {
      stale.push(gap.docType);
    }
  }

  // Determine pass/fail
  const pass = missing.length === 0 && stale.length === 0;

  // Build details message
  const details = buildDetailsMessage(requiredGaps.length, missing, stale, threshold);

  return {
    pass,
    missing,
    stale,
    details,
    exitCode: pass ? 0 : 1,
  };
}

/**
 * Build a human-readable details message
 */
function buildDetailsMessage(
  totalRequired: number,
  missing: string[],
  stale: string[],
  threshold: number
): string {
  const lines: string[] = [];

  lines.push(`Documentation Check Results`);
  lines.push(`Required docs: ${totalRequired}`);

  if (missing.length > 0) {
    lines.push(`\nMissing (${missing.length}):`);
    for (const doc of missing) {
      lines.push(`  - ${doc}`);
    }
  }

  if (stale.length > 0) {
    lines.push(`\nStale - more than ${threshold} commits since generation (${stale.length}):`);
    for (const doc of stale) {
      lines.push(`  - ${doc}`);
    }
  }

  if (missing.length === 0 && stale.length === 0) {
    lines.push(`\n✓ All required documentation is present and current`);
  }

  return lines.join('\n');
}

/**
 * Get detailed staleness info for a specific doc type
 * Useful for debugging/verbose output
 */
export async function getDocStalenessDetails(
  projectPath: string,
  docType: string
): Promise<{
  docType: string;
  commitsSince: number;
  daysSince: number;
  generatedAt: string;
  exists: boolean;
} | null> {
  const state = readState(projectPath);
  if (!state) {
    return null;
  }

  const generatedDoc = state.generatedDocs.find((d) => d.docType === docType);
  if (!generatedDoc) {
    return null;
  }

  const docPath = path.join(projectPath, 'docs', 'generated', `${docType}.md`);
  const exists = fs.existsSync(docPath);

  try {
    const staleness = await getStalenessInfo(generatedDoc, projectPath);
    return {
      docType,
      commitsSince: staleness.commitsSince,
      daysSince: staleness.daysSince,
      generatedAt: generatedDoc.generatedAt,
      exists,
    };
  } catch {
    return null;
  }
}
