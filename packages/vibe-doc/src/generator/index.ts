/**
 * Generator Orchestrator Module
 * Orchestrates the document generation pipeline
 */

import { loadTemplate, RenderData, renderTemplate } from '../templates';
import { writeMarkdown, DocMetadata } from './markdown-writer';
import { writeDocx } from './docx-writer';
import { archiveCurrentVersion, getNextVersion } from '../versioning';
import { VibedocState, GeneratedDoc } from '../state/schema';
import { logger } from '../utils/logger';

/**
 * Result of a document generation
 */
export interface GenerationResult {
  paths: string[];
  docType: string;
  version: number;
}

/**
 * Generate a document in one or more formats
 * @param docType - Type of document (e.g., 'adr', 'runbook')
 * @param projectPath - Root path of the project
 * @param state - Current vibe-doc state
 * @param renderData - Data to render into the template
 * @param format - Format(s) to generate: 'md', 'docx', or 'both'
 * @returns GenerationResult with paths and version number
 */
export async function generateDocument(
  docType: string,
  projectPath: string,
  state: VibedocState,
  renderData: RenderData,
  format: 'md' | 'docx' | 'both' = 'both'
): Promise<GenerationResult> {
  logger.info('Starting document generation', { docType, format });

  try {
    // Load template
    const template = loadTemplate(docType);
    logger.debug('Template loaded', { docType });

    // Render template
    const rendered = renderTemplate(template, renderData);
    logger.debug('Template rendered', { docType, length: rendered.length });

    // Archive current version if exists
    const nextVersion = getNextVersion(state, docType);
    const archived = archiveCurrentVersion(projectPath, docType, state);
    if (archived) {
      logger.info('Previous version archived', { docType, version: archived.version });
      state.history.push(archived);
    }

    // Prepare metadata
    const metadata: DocMetadata = {
      generatedAt: new Date().toISOString(),
      classification: renderData.metadata.classification,
      sourceArtifacts: renderData.metadata.sourceArtifacts,
      confidenceSummary: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    // Count confidence levels from rendered output
    // Look for confidence tags in the rendered output
    const highMatch = rendered.match(/high/gi);
    const mediumMatch = rendered.match(/medium/gi);
    const lowMatch = rendered.match(/low/gi);

    metadata.confidenceSummary.high = highMatch ? highMatch.length : 0;
    metadata.confidenceSummary.medium = mediumMatch ? mediumMatch.length : 0;
    metadata.confidenceSummary.low = lowMatch ? lowMatch.length : 0;

    const paths: string[] = [];

    // Write markdown
    if (format === 'md' || format === 'both') {
      const mdPath = writeMarkdown(rendered, docType, projectPath, metadata);
      paths.push(mdPath);
      logger.info('Markdown document generated', { docType, path: mdPath });
    }

    // Write DOCX
    if (format === 'docx' || format === 'both') {
      const docxPath = await writeDocx(rendered, docType, projectPath, metadata);
      paths.push(docxPath);
      logger.info('DOCX document generated', { docType, path: docxPath });
    }

    // Update state with generated doc entry
    const generatedDoc: GeneratedDoc = {
      docType,
      generatedAt: new Date().toISOString(),
      paths,
      sourceArtifacts: renderData.metadata.sourceArtifacts.toString().split(','),
      confidenceSections: {
        high: metadata.confidenceSummary.high,
        medium: metadata.confidenceSummary.medium,
        low: metadata.confidenceSummary.low,
      },
      stateHash: '', // TODO: compute state hash if needed
    };

    // Replace or add generated doc entry
    const existingIndex = state.generatedDocs.findIndex((doc) => doc.docType === docType);
    if (existingIndex >= 0) {
      state.generatedDocs[existingIndex] = generatedDoc;
    } else {
      state.generatedDocs.push(generatedDoc);
    }

    logger.info('Document generation complete', {
      docType,
      version: nextVersion,
      formats: format,
    });

    return {
      paths,
      docType,
      version: nextVersion,
    };
  } catch (error) {
    logger.error('Document generation failed', { docType, error });
    throw error;
  }
}
