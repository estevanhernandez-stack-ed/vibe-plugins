/**
 * Artifact Scanner
 * Reads artifact files and extracts summaries and metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

interface ArtifactMetadata {
  path: string;
  type: 'markdown' | 'skill' | 'config';
  summary: string;
  title?: string;
}

const YAML_FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

/**
 * Extracts YAML frontmatter from a file
 */
function extractYamlFrontmatter(content: string): { [key: string]: any } | null {
  const match = content.match(YAML_FRONTMATTER_REGEX);
  if (!match) {
    return null;
  }

  const yamlContent = match[1];
  const result: { [key: string]: any } = {};

  const lines = yamlContent.split('\n').filter((line) => line.trim());
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (key && value) {
      result[key.trim()] = value;
    }
  }

  return result;
}

/**
 * Extracts first meaningful paragraph from markdown content
 */
function extractMarkdownSummary(content: string, maxChars: number = 200): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(YAML_FRONTMATTER_REGEX, '').trim();

  // Get lines and skip empty ones
  const lines = withoutFrontmatter.split('\n').filter((line) => line.trim().length > 0);

  let summary = '';
  for (const line of lines) {
    // Skip headers, code blocks, etc.
    if (line.startsWith('#') || line.startsWith('```') || line.startsWith('    ')) {
      continue;
    }

    summary += (summary ? ' ' : '') + line.trim();
    if (summary.length >= maxChars) {
      break;
    }
  }

  return summary.substring(0, maxChars).trim();
}

/**
 * Reads markdown artifact and returns metadata
 */
async function readMarkdownArtifact(filePath: string): Promise<ArtifactMetadata> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract first header as title
    const titleMatch = content.match(/^#\s+(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract summary
    const summary = extractMarkdownSummary(content);

    return {
      path: filePath,
      type: 'markdown',
      summary,
      title,
    };
  } catch (error) {
    logger.warn('Failed to read markdown artifact', { path: filePath, error });
    return {
      path: filePath,
      type: 'markdown',
      summary: '',
    };
  }
}

/**
 * Reads skill artifact and returns metadata from YAML frontmatter
 */
async function readSkillArtifact(filePath: string): Promise<ArtifactMetadata> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractYamlFrontmatter(content);

    const title = frontmatter?.name || path.basename(filePath);
    const summary = frontmatter?.description || '';

    return {
      path: filePath,
      type: 'skill',
      summary,
      title,
    };
  } catch (error) {
    logger.warn('Failed to read skill artifact', { path: filePath, error });
    return {
      path: filePath,
      type: 'skill',
      summary: '',
    };
  }
}

/**
 * Reads config-as-docs artifact
 */
async function readConfigArtifact(filePath: string): Promise<ArtifactMetadata> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const summary = extractMarkdownSummary(content, 300);
    const title = path.basename(filePath);

    return {
      path: filePath,
      type: 'config',
      summary,
      title,
    };
  } catch (error) {
    logger.warn('Failed to read config artifact', { path: filePath, error });
    return {
      path: filePath,
      type: 'config',
      summary: '',
    };
  }
}

/**
 * Enriches artifact files with summaries and metadata
 */
export async function enrichArtifacts(
  markdownFiles: string[],
  skillFiles: string[],
  configFiles: string[]
): Promise<ArtifactMetadata[]> {
  logger.debug('Starting artifact enrichment', {
    markdownCount: markdownFiles.length,
    skillCount: skillFiles.length,
    configCount: configFiles.length,
  });

  const allMetadata: ArtifactMetadata[] = [];

  // Process markdown files
  for (const file of markdownFiles) {
    const metadata = await readMarkdownArtifact(file);
    allMetadata.push(metadata);
  }

  // Process skill files
  for (const file of skillFiles) {
    const metadata = await readSkillArtifact(file);
    allMetadata.push(metadata);
  }

  // Process config files
  for (const file of configFiles) {
    const metadata = await readConfigArtifact(file);
    allMetadata.push(metadata);
  }

  logger.info('Artifact enrichment completed', { total: allMetadata.length });

  return allMetadata;
}
