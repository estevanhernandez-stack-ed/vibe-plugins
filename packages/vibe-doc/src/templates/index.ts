/**
 * Template Loader Module
 * Loads embedded templates with support for local cache overrides
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Load a template by doc type
 * Checks for local cache override in .vibe-doc/templates/<docType>.md first,
 * falls back to embedded template
 */
export function loadTemplate(docType: string, cacheDir?: string): string {
  // Try local cache override first
  if (cacheDir) {
    const localCachePath = path.join(cacheDir, 'templates', `${docType}.md`);
    try {
      if (fs.existsSync(localCachePath)) {
        logger.debug('Loading template from local cache', { docType, path: localCachePath });
        return fs.readFileSync(localCachePath, 'utf-8');
      }
    } catch (error) {
      logger.warn('Failed to read local template cache', { docType, error: String(error) });
    }
  }

  // Fall back to embedded template
  const embeddedPath = getTemplatePath(docType);
  try {
    logger.debug('Loading embedded template', { docType, path: embeddedPath });
    return fs.readFileSync(embeddedPath, 'utf-8');
  } catch (error) {
    logger.error('Failed to load template', { docType, error: String(error) });
    throw new Error(`Template not found for doc type: ${docType}`);
  }
}

/**
 * Get path to the embedded template file
 *
 * __dirname at runtime is dist/templates/ (compiled from src/templates/index.ts).
 * Templates are copied to dist/templates/embedded/ by scripts/copy-templates.js.
 * So the templates directory relative to __dirname is just ./embedded/.
 *
 * The same path works in dev under tsx, where __dirname is src/templates/ and
 * templates live at src/templates/embedded/.
 *
 * This was historically broken: the function looked for
 * `__dirname/templates/embedded/` which produced `dist/templates/templates/embedded/`
 * in published packages (nested "templates" directory). Combined with the
 * copy-templates.js fast-glob bug (fixed in v0.2.2), template loading failed
 * in every published version before v0.2.3.
 */
export function getTemplatePath(docType: string): string {
  const templatesDir = path.join(__dirname, 'embedded');
  return path.join(templatesDir, `${docType}.md`);
}

/**
 * List all available template names
 */
export function listTemplates(): string[] {
  const templates = [
    'adr',
    'runbook',
    'threat-model',
    'api-spec',
    'deployment-procedure',
    'test-plan',
    'data-model',
    'readme',
    'install-guide',
    'skill-command-reference',
    'changelog-contributing',
  ];

  return templates;
}

export { RenderData, renderTemplate } from './renderer';
