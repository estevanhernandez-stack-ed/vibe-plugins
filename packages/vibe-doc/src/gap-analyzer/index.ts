/**
 * Gap Analyzer Orchestrator
 * Main entry point for documentation gap analysis
 */

import { ArtifactInventory, Classification, GapReport, GapItem } from '../state/schema';
import { logger } from '../utils/logger';
import { getRequiredDocs } from './matrix';
import { getBreadcrumbs } from './breadcrumbs';
import { assessGaps } from './tier-assigner';

/**
 * Analyze documentation gaps based on classification
 */
export function analyzeGaps(
  classification: Classification,
  inventory: ArtifactInventory
): GapReport {
  logger.info('Starting gap analysis', {
    category: classification.primaryCategory,
    contexts: classification.contextModifiers,
  });

  // Step 1: Get required docs for this classification
  const contexts = classification.contextModifiers;

  const requirements = getRequiredDocs(classification.primaryCategory as string, contexts);

  // Step 2: Get breadcrumbs for all doc types
  const breadcrumbsMap = new Map();
  const docTypes = new Set(requirements.map((r) => r.docType));
  for (const docType of docTypes) {
    breadcrumbsMap.set(docType, getBreadcrumbs(docType));
  }

  // Step 3: Run tier assigner to assess gaps
  const gaps = assessGaps(requirements, inventory, breadcrumbsMap);

  // Step 4: Calculate summary statistics
  const summary = calculateSummary(gaps, inventory);

  logger.info('Gap analysis complete', {
    totalGaps: gaps.length,
    coveragePercent: summary.coveragePercent,
    docsMissing: summary.docsMissing,
  });

  return {
    summary,
    gaps: gaps.map((gap) => ({
      docType: gap.docType,
      tier: gap.tier,
      domain: classification.primaryCategory as string,
      artifactsScanned: gap.artifactsScanned,
      found: gap.found,
      missing: gap.missing,
      rationale: gap.rationale,
    })),
  };
}

/**
 * Calculate summary statistics from gaps
 */
function calculateSummary(
  gaps: ReturnType<typeof assessGaps>,
  inventory: ArtifactInventory
): GapReport['summary'] {
  const totalArtifacts = inventory.totalArtifacts;

  let docsCovered = 0; // Docs with all sections found
  let docsPartial = 0; // Docs with some sections found
  let docsMissing = 0; // Docs with no sections found

  for (const gap of gaps) {
    if (gap.found === 0) {
      docsMissing++;
    } else if (gap.missing === 0) {
      docsCovered++;
    } else {
      docsPartial++;
    }
  }

  const totalRequiredDocs = gaps.length;
  const coveragePercent =
    totalRequiredDocs > 0
      ? Math.round(((docsCovered + docsPartial * 0.5) / totalRequiredDocs) * 100)
      : 0;

  return {
    totalArtifacts,
    docsCovered,
    docsPartial,
    docsMissing,
    coveragePercent,
  };
}

export { getRequiredDocs } from './matrix';
export { getBreadcrumbs } from './breadcrumbs';
export { assessGaps } from './tier-assigner';
