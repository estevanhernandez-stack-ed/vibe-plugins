/**
 * Covered-surfaces extractor — builds the `covered-surfaces.json` payload for
 * Vibe Sec consumption (cross-plugin coordination EC5).
 *
 * The shape must validate against `skills/guide/schemas/covered-surfaces.schema.json`.
 * We emit one surface per route / component / model / middleware / integration
 * the scanner found, annotated with a coarse coverage_level.
 *
 * Coverage-level assignment in v0.2 is conservative: if at least one existing
 * test file references the surface's basename, mark `smoke`. If the scanner
 * sees no test files at all, every surface is `none`. Finer-grained mapping
 * (behavioral / edge / integration) lands in v0.3 when the generator has more
 * context about what kind of tests exist.
 */
import { basename } from 'node:path';
import { promises as fs } from 'node:fs';

import type { Inventory } from './index.js';

export type SurfaceKind = 'route' | 'component' | 'model' | 'middleware' | 'integration';

export type SurfaceCoverageLevel =
  | 'none'
  | 'smoke'
  | 'behavioral'
  | 'edge'
  | 'integration'
  | 'performance';

export interface CoveredSurface {
  kind: SurfaceKind;
  identifier: string;
  file_path?: string;
  coverage_level: SurfaceCoverageLevel;
  test_files?: string[];
  last_verified_at?: string;
}

export interface CoveredSurfacesDoc {
  schema_version: 1;
  plugin_version?: string;
  generated_at: string;
  project?: {
    repo_root?: string;
    commit_hash?: string | null;
  };
  surfaces: CoveredSurface[];
  summary?: {
    total_surfaces: number;
    covered_surfaces: number;
    coverage_by_kind: Record<string, { total: number; covered: number }>;
  };
}

export interface ExtractInput {
  inventory: Inventory;
  /** Loaded test-file contents keyed by absolute path — optional. */
  testFileContents?: Record<string, string>;
  pluginVersion?: string;
  commitHash?: string | null;
}

function routeIdentifier(method: string, path: string): string {
  return `${method} ${path}`;
}

function surfaceIsMentionedInTests(
  identifier: string,
  fileHint: string | null,
  testFileContents: Record<string, string>,
): { mentioned: boolean; testFiles: string[] } {
  const hits: string[] = [];
  const basenameToMatch = fileHint ? basename(fileHint).replace(/\.(tsx?|jsx?)$/, '') : null;
  for (const [testPath, content] of Object.entries(testFileContents)) {
    if (basenameToMatch && content.includes(basenameToMatch)) {
      hits.push(testPath);
      continue;
    }
    if (content.includes(identifier)) {
      hits.push(testPath);
    }
  }
  return { mentioned: hits.length > 0, testFiles: hits };
}

export async function loadTestContents(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    try {
      out[p] = await fs.readFile(p, 'utf8');
    } catch {
      // skip unreadable
    }
  }
  return out;
}

export function extractCoveredSurfaces(input: ExtractInput): CoveredSurfacesDoc {
  const { inventory } = input;
  const testContents = input.testFileContents ?? {};
  const surfaces: CoveredSurface[] = [];

  // Routes
  for (const r of inventory.routes) {
    const id = routeIdentifier(r.method, r.path);
    const match = surfaceIsMentionedInTests(id, r.handler_file, testContents);
    const entry: CoveredSurface = {
      kind: 'route',
      identifier: id,
      coverage_level: match.mentioned ? 'smoke' : 'none',
    };
    if (r.handler_file) entry.file_path = r.handler_file;
    if (match.testFiles.length > 0) entry.test_files = match.testFiles;
    surfaces.push(entry);
  }

  // Components
  for (const c of inventory.components) {
    const match = surfaceIsMentionedInTests(c.name, c.file, testContents);
    const entry: CoveredSurface = {
      kind: 'component',
      identifier: c.name,
      coverage_level: match.mentioned ? 'smoke' : 'none',
    };
    if (c.file) entry.file_path = c.file;
    if (match.testFiles.length > 0) entry.test_files = match.testFiles;
    surfaces.push(entry);
  }

  // Models
  for (const m of inventory.models) {
    const match = surfaceIsMentionedInTests(m.name, m.file, testContents);
    const entry: CoveredSurface = {
      kind: 'model',
      identifier: m.name,
      coverage_level: match.mentioned ? 'smoke' : 'none',
    };
    if (m.file) entry.file_path = m.file;
    if (match.testFiles.length > 0) entry.test_files = match.testFiles;
    surfaces.push(entry);
  }

  // Integrations — treat as opaque surfaces; coverage by identifier (provider name).
  for (const ig of inventory.integrations) {
    const match = surfaceIsMentionedInTests(ig.provider, null, testContents);
    const entry: CoveredSurface = {
      kind: 'integration',
      identifier: ig.provider,
      coverage_level: match.mentioned ? 'smoke' : 'none',
    };
    if (match.testFiles.length > 0) entry.test_files = match.testFiles;
    surfaces.push(entry);
  }

  // Summary
  const coverageByKind: Record<string, { total: number; covered: number }> = {};
  let covered = 0;
  for (const s of surfaces) {
    const bucket = (coverageByKind[s.kind] ??= { total: 0, covered: 0 });
    bucket.total += 1;
    if (s.coverage_level !== 'none') {
      bucket.covered += 1;
      covered += 1;
    }
  }

  const doc: CoveredSurfacesDoc = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    surfaces,
    summary: {
      total_surfaces: surfaces.length,
      covered_surfaces: covered,
      coverage_by_kind: coverageByKind,
    },
  };
  if (input.pluginVersion) doc.plugin_version = input.pluginVersion;
  const project: CoveredSurfacesDoc['project'] = { repo_root: inventory.root };
  if (input.commitHash !== undefined) project.commit_hash = input.commitHash;
  doc.project = project;
  return doc;
}
