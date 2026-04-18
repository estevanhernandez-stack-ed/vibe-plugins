/**
 * Template loader — reads a template file from `skills/guide/templates/` and
 * substitutes `{{placeholder}}` tokens with a caller-supplied map.
 *
 * Unknown placeholders are left intact (debuggable: the builder will see
 * `{{foo}}` in the rendered artifact rather than a silent blank).
 */
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the templates dir relative to the package. Works both from the
 * built `dist/handoff/` location and from `src/handoff/` during tests.
 */
export function templatesDir(): string {
  // Walk up from this file looking for a sibling `skills/guide/templates/`.
  // dist layout: <pkg>/dist/handoff/template-loader.js → up 2 = pkg root
  // src layout:  <pkg>/src/handoff/template-loader.ts  → up 2 = pkg root
  const packageRoot = resolve(moduleDir, '..', '..');
  return join(packageRoot, 'skills', 'guide', 'templates');
}

export async function loadTemplate(name: string): Promise<string> {
  const path = join(templatesDir(), name);
  return fs.readFile(path, 'utf8');
}

/**
 * Synchronous variant for callers that already have the template content
 * in memory (most tests pass a literal string).
 */
export function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key) => {
    const value = vars[key];
    return value !== undefined ? value : `{{${key}}}`;
  });
}

export async function renderTemplate(name: string, vars: Record<string, string>): Promise<string> {
  const raw = await loadTemplate(name);
  return substitute(raw, vars);
}
