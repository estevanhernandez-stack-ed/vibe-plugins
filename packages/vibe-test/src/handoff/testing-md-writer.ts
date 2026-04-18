/**
 * `docs/TESTING.md` writer — Builder-Sustainable Handoff (PRD H1 + H5 + H6).
 *
 * Appends/updates the TESTING.md runbook at `<target>/docs/TESTING.md`. The
 * writer is deterministic plumbing: SKILL supplies the prose for each section
 * via the `payload` argument; this module renders it into the marker-delimited
 * template at `skills/guide/templates/testing-md.template.md`.
 *
 * Round-trip rule: builder edits placed OUTSIDE `<!-- vibe-test:start:X -->` /
 * `<!-- vibe-test:end:X -->` marker pairs are preserved verbatim on re-write.
 * Builder edits placed between markers are discarded (those sections are
 * owned by the writer).
 */
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

import { atomicWrite } from '../state/atomic-write.js';
import { loadTemplate, substitute } from './template-loader.js';
import { replaceSection, startMarker, endMarker } from './markers.js';

export interface TestingMdPayload {
  /** Human-readable project name (e.g., the repo basename). */
  project_name: string;
  /** ISO-8601 timestamp. Defaults to `new Date().toISOString()` when omitted. */
  timestamp?: string;
  /** SKILL-authored prose for each of the 6 required sections. */
  testing_overview: string;
  classification_summary: string;
  coverage_posture: string;
  run_instructions: string;
  add_test_instructions: string;
  graduating_section: string;
  /** Optional — rendered ecosystem recommendations block (from ecosystem-section-writer). */
  ecosystem_section?: string;
}

export interface TestingMdWriteResult {
  path: string;
  created: boolean;
  sectionsWritten: string[];
}

const SECTIONS = [
  'header',
  'testing_overview',
  'classification_summary',
  'coverage_posture',
  'run_instructions',
  'add_test_instructions',
  'graduating_section',
  'ecosystem',
] as const;

/**
 * Write or update `<targetRoot>/docs/TESTING.md`. If the file already exists,
 * only marker-delimited sections are replaced; everything else is preserved.
 */
export async function writeTestingMd(
  targetRoot: string,
  payload: TestingMdPayload,
): Promise<TestingMdWriteResult> {
  const path = join(targetRoot, 'docs', 'TESTING.md');
  const timestamp = payload.timestamp ?? new Date().toISOString();

  const template = await loadTemplate('testing-md.template.md');
  const fresh = substitute(template, {
    project_name: payload.project_name,
    timestamp,
    testing_overview: payload.testing_overview,
    classification_summary: payload.classification_summary,
    coverage_posture: payload.coverage_posture,
    run_instructions: payload.run_instructions,
    add_test_instructions: payload.add_test_instructions,
    graduating_section: payload.graduating_section,
    ecosystem_section: payload.ecosystem_section ?? '',
  });

  let existing: string | null = null;
  try {
    existing = await fs.readFile(path, 'utf8');
  } catch {
    existing = null;
  }

  let output: string;
  if (existing === null) {
    output = fresh;
  } else {
    // Merge: for each section, replace only the marker-delimited region in the
    // existing file with the freshly-rendered region.
    output = existing;
    for (const section of SECTIONS) {
      const freshInner = extractInner(fresh, section);
      if (freshInner === null) continue;
      output = replaceSection(output, section, freshInner);
    }
  }

  await fs.mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, output);

  return {
    path,
    created: existing === null,
    sectionsWritten: [...SECTIONS],
  };
}

/** Extract inner content of a marker-delimited section from a source string. */
function extractInner(source: string, section: string): string | null {
  const start = startMarker(section);
  const end = endMarker(section);
  const startIdx = source.indexOf(start);
  if (startIdx === -1) return null;
  const innerStart = startIdx + start.length;
  const endIdx = source.indexOf(end, innerStart);
  if (endIdx === -1) return null;
  return source.slice(innerStart, endIdx).replace(/^\n/, '').replace(/\n$/, '');
}
