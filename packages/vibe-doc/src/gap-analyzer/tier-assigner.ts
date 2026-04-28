/**
 * Tier Assigner Module
 * Assesses gaps based on breadcrumb searches and requirement analysis
 */

import { ArtifactInventory } from '../state/schema';
import { logger } from '../utils/logger';
import { DocRequirement, Tier } from './matrix';
import { getBreadcrumbs, Breadcrumb } from './breadcrumbs';

export interface Gap {
  docType: string;
  tier: Tier;
  category: string;
  artifactsScanned: number;
  found: number;
  missing: number;
  rationale: string;
}

/**
 * Assess documentation gaps based on artifact inventory
 */
export function assessGaps(
  requirements: DocRequirement[],
  inventory: ArtifactInventory,
  breadcrumbs: Map<string, Breadcrumb>
): Gap[] {
  const gaps: Gap[] = [];
  const allArtifactText = buildArtifactSearchSpace(inventory);
  const artifactsScanned =
    inventory.categories.sourceCode.count +
    inventory.categories.documentation.count +
    inventory.categories.configuration.count;

  for (const req of requirements) {
    const breadcrumb = breadcrumbs.get(req.docType);
    if (!breadcrumb) {
      logger.warn('No breadcrumbs for doc type', { docType: req.docType });
      continue;
    }

    const { found, missing } = searchForDocumentationEvidence(breadcrumb, inventory);

    const gap: Gap = {
      docType: req.docType,
      tier: req.tier,
      category: req.category,
      artifactsScanned,
      found,
      missing,
      rationale: buildGapRationale(req.tier, found, missing),
    };

    gaps.push(gap);
  }

  return gaps;
}

/**
 * Search for evidence of a documentation type in artifacts
 */
function searchForDocumentationEvidence(
  breadcrumb: Breadcrumb,
  inventory: ArtifactInventory
): { found: number; missing: number } {
  let found = 0;
  let missing = 0;

  // Search in documentation files
  const docFiles = inventory.categories.documentation.files;
  const docMatches = docFiles.filter((f) =>
    breadcrumb.keywords.some((kw) => f.toLowerCase().includes(kw))
  ).length;

  // Search in source code files
  const sourceFiles = inventory.categories.sourceCode.files;
  const codeMatches = sourceFiles.filter((f) =>
    breadcrumb.filePatterns.some((pattern) => matchPattern(f, pattern))
  ).length;

  // Search in config files
  const configFiles = inventory.categories.configuration.files;
  const configMatches = configFiles.filter((f) =>
    breadcrumb.filePatterns.some((pattern) => matchPattern(f, pattern))
  ).length;

  // Calculate total found vs missing
  found = docMatches + codeMatches + configMatches;
  const expectedSections = breadcrumb.requiredSections.length;
  missing = Math.max(0, expectedSections - found);

  logger.debug('Documentation evidence search', {
    docType: breadcrumb.docType,
    found,
    missing,
    docMatches,
    codeMatches,
    configMatches,
  });

  return { found, missing };
}

/**
 * Simple glob pattern matcher
 * Normalizes Windows backslashes to forward slashes so glob patterns
 * that reference path segments (e.g., "** /docs/adr/**") work cross-platform.
 */
function matchPattern(filePath: string, pattern: string): boolean {
  const regex = patternToRegex(pattern);
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return regex.test(normalized);
}

/**
 * Convert glob pattern to regex
 *
 * Uses a placeholder for `**` to prevent the subsequent `*` → `[^/]*`
 * replacement from clobbering the `*` inside `.*`. A naive two-pass
 * replacement silently produced `.[^/]*` for every `**` pattern,
 * which broke glob matching for every doc type.
 */
function patternToRegex(pattern: string): RegExp {
  // Escape regex-special characters first
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Use a placeholder token that can't appear in a normal path
  const DOUBLE_STAR = '\u0000DOUBLESTAR\u0000';

  const globRegex = escaped
    .replace(/\*\*/g, DOUBLE_STAR)
    .replace(/\*/g, '[^/]*')
    .replace(new RegExp(DOUBLE_STAR, 'g'), '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${globRegex}$`, 'i');
}

/**
 * Build a rationale for the gap
 */
function buildGapRationale(tier: Tier, found: number, missing: number): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  if (found === 0) {
    return `${tierLabel}: No evidence found in codebase.`;
  }

  if (missing === 0) {
    return `${tierLabel}: All expected sections found.`;
  }

  const missingPercent = Math.round((missing / (found + missing)) * 100);
  return `${tierLabel}: Found ${found} sections, missing ${missing} (${missingPercent}% incomplete).`;
}

/**
 * Build a searchable text space from all artifacts
 */
function buildArtifactSearchSpace(inventory: ArtifactInventory): string {
  const allFiles = [
    ...inventory.categories.sourceCode.files,
    ...inventory.categories.documentation.files,
    ...inventory.categories.configuration.files,
  ];

  return allFiles.join('\n').toLowerCase();
}

export { getBreadcrumbs } from './breadcrumbs';
