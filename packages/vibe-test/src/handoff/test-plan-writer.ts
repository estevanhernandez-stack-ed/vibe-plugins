/**
 * `docs/test-plan.md` writer — Builder-Sustainable Handoff (PRD H2).
 *
 * Chronological per-session log. Append-only: each `/vibe-test:audit` and
 * `/vibe-test:generate` run appends a `## Session <ISO>` block with stable
 * subsection headings that L2 (session memory) can parse back out.
 *
 * The writer does NOT rewrite prior sessions — those are history. New session
 * entries are appended to the end of the file (or the file is created with
 * the template header + first entry when absent).
 */
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

import { atomicWrite } from '../state/atomic-write.js';
import { loadTemplate, substitute } from './template-loader.js';

export interface TestPlanSessionEntry {
  /** ISO-8601 timestamp used as the session heading. */
  timestamp: string;
  /** Which command generated this entry — 'audit' or 'generate'. */
  command: 'audit' | 'generate';
  /** The sessionUUID threaded through session-logger / friction-logger / wins-logger. */
  sessionUUID: string;
  /** SKILL-authored classification prose (deciding the app_type / tier / modifiers). */
  classification: string;
  /**
   * Generated-test records: every candidate test considered this session with
   * its confidence and accept/reject status. Rejected tests include the reason.
   */
  generated_tests: Array<{
    path: string;
    confidence: number;
    status: 'auto-written' | 'staged' | 'accepted' | 'rejected' | 'inline-pending';
    rationale?: string;
  }>;
  /**
   * Tests explicitly rejected by the builder with reasons. L2 uses this to
   * detect generation-pattern mismatch via G4.
   */
  rejected_with_reason: Array<{
    path: string;
    reason: string;
  }>;
  /** Optional free-form notes. */
  notes?: string;
}

export interface TestPlanWriteResult {
  path: string;
  created: boolean;
  appended: boolean;
}

export interface TestPlanWriteOptions {
  /** Defaults to the repo basename. */
  project_name?: string;
}

export async function appendTestPlanSession(
  targetRoot: string,
  entry: TestPlanSessionEntry,
  options: TestPlanWriteOptions = {},
): Promise<TestPlanWriteResult> {
  const path = join(targetRoot, 'docs', 'test-plan.md');

  let existing: string | null = null;
  try {
    existing = await fs.readFile(path, 'utf8');
  } catch {
    existing = null;
  }

  const sessionMd = renderSessionEntry(entry);

  let output: string;
  let created = false;
  if (existing === null) {
    const template = await loadTemplate('test-plan-md.template.md');
    const header = substitute(template, {
      project_name: options.project_name ?? basename(targetRoot),
      session_entries: sessionMd,
    });
    output = header;
    created = true;
  } else {
    const sep = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
    output = `${existing}${sep}${sessionMd}\n`;
  }

  await fs.mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, output);

  return { path, created, appended: !created };
}

/** Render a single session entry with stable headings for L2 extraction. */
export function renderSessionEntry(entry: TestPlanSessionEntry): string {
  const lines: string[] = [];
  lines.push(`## Session ${entry.timestamp}`);
  lines.push('');
  lines.push(`- **Command:** \`${entry.command}\``);
  lines.push(`- **Session UUID:** \`${entry.sessionUUID}\``);
  lines.push('');
  lines.push('### Classification');
  lines.push('');
  lines.push(entry.classification.trim());
  lines.push('');
  lines.push('### Generated tests');
  lines.push('');
  if (entry.generated_tests.length === 0) {
    lines.push('_None this session._');
  } else {
    lines.push('| Path | Confidence | Status | Rationale |');
    lines.push('|---|---|---|---|');
    for (const t of entry.generated_tests) {
      const conf = t.confidence.toFixed(2);
      const rationale = (t.rationale ?? '').replace(/\|/g, '\\|');
      lines.push(`| \`${t.path}\` | ${conf} | ${t.status} | ${rationale} |`);
    }
  }
  lines.push('');
  lines.push('### Rejected with reason');
  lines.push('');
  if (entry.rejected_with_reason.length === 0) {
    lines.push('_None._');
  } else {
    for (const r of entry.rejected_with_reason) {
      lines.push(`- \`${r.path}\` — ${r.reason}`);
    }
  }
  lines.push('');
  if (entry.notes && entry.notes.trim().length > 0) {
    lines.push('### Notes');
    lines.push('');
    lines.push(entry.notes.trim());
    lines.push('');
  }
  return lines.join('\n');
}

function basename(p: string): string {
  const norm = p.replace(/[\\/]+$/, '');
  const idx = Math.max(norm.lastIndexOf('/'), norm.lastIndexOf('\\'));
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}
