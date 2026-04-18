/**
 * Scanner — composes the sub-inventories into the full `Inventory` JSON shape
 * consumed by the audit SKILL.
 *
 * Public API: `scan(rootPath, scopeGlob?) → Promise<Inventory>`
 *
 * The returned inventory validates against the `audit-state.schema.json`
 * inventory shape. It is the single source of truth that SKILL reasoning +
 * classifier rules operate on.
 */

import { promises as fs } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { parseFile, type ParsedFile, SUPPORTED_EXTENSIONS } from './ast-walker.js';
import { detectFrameworks, detectFrameworksPure, type DetectionResult, type PackageJsonShape } from './framework-detector.js';
import { extractRoutes, type RouteEntry } from './route-inventory.js';
import { extractComponents, type ComponentEntry } from './component-inventory.js';
import { extractModels, type ModelEntry, loadTextModelSources } from './model-inventory.js';
import { extractIntegrations, type IntegrationEntry } from './integration-inventory.js';

export interface Inventory {
  schema_version: 1;
  scanned_at: string;
  root: string;
  scope: string | null;
  detection: DetectionResult;
  routes: RouteEntry[];
  components: ComponentEntry[];
  models: ModelEntry[];
  integrations: IntegrationEntry[];
  /** Detected test frameworks — flat list for convenience in the SKILL prompt. */
  test_frameworks: string[];
  /** Paths of detected test files. */
  existing_test_files: string[];
  /** Fully scanned source files (paths only). */
  scanned_files: string[];
  /** Files the walker could not parse. */
  parse_errors: string[];
}

const DEFAULT_IGNORES = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'coverage',
  '.turbo',
  '.git',
  '.vibe-test',
  '.vibe-doc',
  '.vibe-sec',
  '.cache',
  'out',
  'storybook-static',
]);

const TEST_FILE_PATTERNS: RegExp[] = [
  /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /\.spec\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /__tests__[\\/].*\.(ts|tsx|js|jsx|mjs|cjs)$/,
];

function isTestFile(relPath: string): boolean {
  const normalized = relPath.split(sep).join('/');
  return TEST_FILE_PATTERNS.some((re) => re.test(normalized));
}

function isSupported(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

/**
 * Very small glob check: supports leading `**\/`, path segments with `*`, and
 * exact prefix matches. This is intentionally narrow; the audit SKILL can pass
 * a repo-relative directory path and get sensible results.
 */
function matchesScope(relPath: string, glob: string | null | undefined): boolean {
  if (!glob) return true;
  const normalized = relPath.split(sep).join('/');
  const cleaned = glob.replace(/^\.\//, '').split(sep).join('/');
  if (cleaned.includes('*')) {
    // Convert to regex, `**` = match anything, `*` = match within one segment.
    const re = new RegExp(
      '^' +
        cleaned
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.+')
          .replace(/\*/g, '[^/]*') +
        '$',
    );
    return re.test(normalized);
  }
  // Plain prefix match.
  return normalized === cleaned || normalized.startsWith(cleaned + '/');
}

async function walkDirectory(root: string): Promise<string[]> {
  const all: string[] = [];
  async function recur(current: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await recur(full);
      } else if (entry.isFile()) {
        all.push(full);
      }
    }
  }
  await recur(root);
  return all;
}

export interface ScanOptions {
  /** Custom file walker — mostly useful for tests. */
  walker?: (root: string) => Promise<string[]>;
  /** Override detection — tests can inject a package.json shape directly. */
  detectionOverride?: DetectionResult;
}

export async function scan(
  rootPath: string,
  scopeGlob?: string | null,
  options: ScanOptions = {},
): Promise<Inventory> {
  const detection = options.detectionOverride ?? (await detectFrameworks(rootPath));
  const walker = options.walker ?? walkDirectory;
  const allPaths = await walker(rootPath);

  const sources: string[] = [];
  const testFiles: string[] = [];
  const prismaOrSql: string[] = [];
  for (const abs of allPaths) {
    const rel = relative(rootPath, abs);
    if (!matchesScope(rel, scopeGlob ?? null)) continue;
    if (abs.endsWith('.prisma') || abs.endsWith('.sql')) {
      prismaOrSql.push(abs);
      continue;
    }
    if (!isSupported(abs)) continue;
    if (isTestFile(rel)) {
      testFiles.push(abs);
      continue;
    }
    sources.push(abs);
  }

  const parsed: ParsedFile[] = [];
  const parseErrors: string[] = [];
  for (const src of sources) {
    try {
      const p = await parseFile(src);
      parsed.push(p);
    } catch (err) {
      parseErrors.push(`${src}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const routes = extractRoutes({
    repoRoot: rootPath,
    files: parsed,
    detectedBackends: detection.backend,
    detectedFrontends: detection.frontend,
  });
  const components = extractComponents({
    files: parsed,
    detectedFrontends: detection.frontend,
  });
  const textFiles = await loadTextModelSources(prismaOrSql);
  const models = extractModels({ files: parsed, textFiles });
  const integrations = extractIntegrations({
    files: parsed,
    dependencies: detection.allDependencies,
  });

  const inventory: Inventory = {
    schema_version: 1,
    scanned_at: new Date().toISOString(),
    root: rootPath,
    scope: scopeGlob ?? null,
    detection,
    routes,
    components,
    models,
    integrations,
    test_frameworks: detection.test,
    existing_test_files: testFiles,
    scanned_files: sources,
    parse_errors: parseErrors,
  };
  return inventory;
}

/** Pure variant for unit tests — caller supplies the parsed sources + detection. */
export function assembleInventory(input: {
  rootPath: string;
  scope: string | null;
  parsed: ParsedFile[];
  pkg: PackageJsonShape | null;
  configFiles: string[];
  testFiles: string[];
  scannedFiles: string[];
  textFiles?: Array<{ path: string; content: string }>;
}): Inventory {
  const detection = detectFrameworksPure(input.pkg, input.configFiles);
  const routes = extractRoutes({
    repoRoot: input.rootPath,
    files: input.parsed,
    detectedBackends: detection.backend,
    detectedFrontends: detection.frontend,
  });
  const components = extractComponents({
    files: input.parsed,
    detectedFrontends: detection.frontend,
  });
  const models = extractModels({ files: input.parsed, textFiles: input.textFiles });
  const integrations = extractIntegrations({
    files: input.parsed,
    dependencies: detection.allDependencies,
  });
  return {
    schema_version: 1,
    scanned_at: new Date().toISOString(),
    root: input.rootPath,
    scope: input.scope,
    detection,
    routes,
    components,
    models,
    integrations,
    test_frameworks: detection.test,
    existing_test_files: input.testFiles,
    scanned_files: input.scannedFiles,
    parse_errors: [],
  };
}

export {
  detectFrameworks,
  detectFrameworksPure,
  extractRoutes,
  extractComponents,
  extractModels,
  extractIntegrations,
};
export type {
  DetectionResult,
  RouteEntry,
  ComponentEntry,
  ModelEntry,
  IntegrationEntry,
};

export { classifyAppType } from './classify-app-type.js';
export type {
  ClassifyAppTypeInput,
  ClassifyAppTypeResult,
} from './classify-app-type.js';

export { classifyModifiers } from './classify-modifiers.js';
export type { ClassifyModifiersInput, ContextModifier } from './classify-modifiers.js';

export {
  extractCoveredSurfaces,
  loadTestContents,
} from './covered-surfaces.js';
export type {
  CoveredSurface,
  CoveredSurfacesDoc,
  ExtractInput as ExtractCoveredSurfacesInput,
  SurfaceKind,
  SurfaceCoverageLevel,
} from './covered-surfaces.js';

export {
  detectBrokenTestRunner,
  detectMissingTestBinary,
  detectCherryPickedDenominator,
  detectAllHarnessIssues,
} from './harness-detector.js';
export type {
  HarnessFinding,
  HarnessFindingType,
  DetectBrokenRunnerInput,
  DetectMissingBinaryInput,
  DetectCherryPickedInput,
  DetectAllHarnessInput,
} from './harness-detector.js';
