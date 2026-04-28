/**
 * Scanner Orchestrator
 * Runs all scanner modules in sequence and assembles complete ArtifactInventory
 */

import { logger } from '../utils/logger';
import { ArtifactInventory } from '../state/schema';
import { scanFiles } from './file-scanner';
import { scanGit } from './git-scanner';
import { scanCode } from './code-scanner';
import { enrichArtifacts } from './artifact-scanner';

/**
 * Main scanner function that orchestrates all scanners
 * Returns complete ArtifactInventory
 */
export async function scan(projectPath: string): Promise<ArtifactInventory> {
  logger.info('Starting comprehensive project scan', { projectPath });

  try {
    // Phase 1: File scanning
    logger.info('Phase 1/4: Scanning file structure...');
    const fileResults = await scanFiles(projectPath);

    // Phase 2: Git scanning
    logger.info('Phase 2/4: Analyzing git history...');
    const gitStats = await scanGit(projectPath);

    // Phase 3: Code scanning
    logger.info('Phase 3/4: Analyzing code structure...');
    const codeStructure = await scanCode(projectPath);

    // Phase 4: Artifact enrichment
    logger.info('Phase 4/4: Enriching artifacts with summaries...');
    await enrichArtifacts(
      fileResults.documentation.files,
      fileResults.agentArtifacts.files,
      fileResults.configAsDocs.files
    );

    // Assemble inventory
    const totalArtifacts =
      fileResults.configAsDocs.count +
      fileResults.agentArtifacts.count +
      fileResults.sessionContext.count +
      fileResults.documentation.count +
      fileResults.packageConfigs.count +
      fileResults.cicdConfigs.count +
      fileResults.infrastructure.count +
      fileResults.testFiles.count +
      fileResults.apiSpecs.count +
      fileResults.sourceCode.count;

    // Map file scanner categories to inventory categories
    const inventory: ArtifactInventory = {
      totalArtifacts,
      categories: {
        sourceCode: fileResults.sourceCode,
        configuration: {
          files: [
            ...fileResults.packageConfigs.files,
            ...fileResults.cicdConfigs.files,
            ...fileResults.configAsDocs.files,
          ],
          count:
            fileResults.packageConfigs.count +
            fileResults.cicdConfigs.count +
            fileResults.configAsDocs.count,
        },
        documentation: fileResults.documentation,
        tests: fileResults.testFiles,
        architecture: {
          files: [
            ...fileResults.agentArtifacts.files,
            ...fileResults.sessionContext.files,
            ...fileResults.apiSpecs.files,
          ],
          count:
            fileResults.agentArtifacts.count +
            fileResults.sessionContext.count +
            fileResults.apiSpecs.count,
        },
        infrastructure: fileResults.infrastructure,
      },
      gitStats: {
        ...gitStats,
        mainLanguages: codeStructure.languages.map((l) => l.name),
      },
    };

    logger.info('Scan completed successfully', {
      total: totalArtifacts,
      categories: {
        sourceCode: inventory.categories.sourceCode.count,
        configuration: inventory.categories.configuration.count,
        documentation: inventory.categories.documentation.count,
        tests: inventory.categories.tests.count,
        architecture: inventory.categories.architecture.count,
        infrastructure: inventory.categories.infrastructure.count,
      },
      languages: inventory.gitStats.mainLanguages,
      contributors: inventory.gitStats.contributors,
      commits: inventory.gitStats.totalCommits,
    });

    return inventory;
  } catch (error) {
    logger.error('Scan failed', { error });
    throw error;
  }
}

export { scanFiles } from './file-scanner';
export { scanGit } from './git-scanner';
export { scanCode } from './code-scanner';
export { enrichArtifacts } from './artifact-scanner';
