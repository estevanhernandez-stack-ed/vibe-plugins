/**
 * Staleness Detection
 * Determines if generated documentation is stale based on git commit history
 */

import * as path from 'path';
import simpleGit from 'simple-git';
import { GeneratedDoc } from '../state/schema';

export interface StalenessInfo {
  commitsSince: number;
  daysSince: number;
  isStale: boolean;
}

/**
 * Check if a document is stale based on commit count since generation
 * @param doc - The generated document
 * @param projectPath - Root path of the project
 * @param threshold - Number of commits before doc is considered stale (default: 20)
 * @returns true if commits since generation >= threshold
 */
export async function isStale(
  doc: GeneratedDoc,
  projectPath: string,
  threshold: number = 20
): Promise<boolean> {
  try {
    const staleness = await getStalenessInfo(doc, projectPath);
    return staleness.commitsSince >= threshold;
  } catch (error) {
    // If we can't determine staleness, conservatively assume stale to prevent deploying with outdated docs
    console.warn(
      `Failed to check staleness for ${doc.docType}: ${error}. Assuming stale for safety.`
    );
    return true;
  }
}

/**
 * Get detailed staleness information for a document
 * @param doc - The generated document
 * @param projectPath - Root path of the project
 * @returns Staleness info including commit count and days since generation
 */
export async function getStalenessInfo(
  doc: GeneratedDoc,
  projectPath: string
): Promise<StalenessInfo> {
  try {
    const git = simpleGit(projectPath);

    // Get the timestamp of the document generation
    const docDate = new Date(doc.generatedAt);

    // Get all commits since that time
    const log = await git.log({ from: doc.generatedAt });

    // Calculate days since generation
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      commitsSince: log.total,
      daysSince,
      isStale: false, // Will be set by isStale() function
    };
  } catch (error) {
    throw new Error(`Failed to get staleness info for ${doc.docType}: ${error}`);
  }
}
