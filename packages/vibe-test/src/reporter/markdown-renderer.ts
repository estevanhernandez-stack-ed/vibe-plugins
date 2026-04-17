/**
 * Markdown renderer — writes `docs/vibe-test/<command>-<date>.md` with a
 * deterministic structure so tooling (vibe-doc, L2 extractors) can parse it.
 *
 * Uses templates from `skills/guide/templates/` when available — otherwise
 * emits a minimal built-in structure.
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ReportObject } from './report-object.js';

export interface MarkdownRenderOptions {
  /** Optional SKILL-filled prose sections keyed by slot name. */
  proseSlots?: Record<string, string>;
  /** Override template path — otherwise resolves from `skills/guide/templates/`. */
  templatePath?: string;
}

function resolveTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let cursor = here;
  for (let i = 0; i < 6; i += 1) {
    try {
      // package root detection
      const probe = join(cursor, 'skills', 'guide', 'templates');
      // Synchronous readdirSync is avoided; we return the candidate and let the
      // caller deal with missing files at the read level.
      return probe;
    } catch {
      cursor = dirname(cursor);
    }
  }
  return join(here, 'skills', 'guide', 'templates');
}

async function loadTemplate(
  commandName: string,
  explicitPath?: string,
): Promise<string | null> {
  const candidates: string[] = [];
  if (explicitPath) candidates.push(explicitPath);
  const templatesDir = resolveTemplatesDir();
  candidates.push(join(templatesDir, `${commandName}-report.md.template`));
  candidates.push(join(templatesDir, `audit-report.md.template`));
  for (const c of candidates) {
    try {
      return await fs.readFile(c, 'utf8');
    } catch {
      // try next
    }
  }
  return null;
}

const DEFAULT_TEMPLATE = `# Vibe Test · {{command}}

**Project:** \`{{project.repo_root}}\`
**Scope:** {{project.scope}}
**Timestamp:** {{timestamp}}
**Plugin version:** {{plugin_version}}

## Classification

{{slot:classification}}

## Score

{{slot:score}}

## Findings

{{slot:findings}}

## Actions taken

{{slot:actions_taken}}

## Plays well with

{{slot:deferrals}}

## Handoff artifacts

{{slot:handoff_artifacts}}

## Next step

{{slot:next_step_hint}}
`;

function defaultClassificationSlot(report: ReportObject): string {
  const c = report.classification;
  if (!c) return '_No classification attached._';
  const mods = c.modifiers.length > 0 ? c.modifiers.join(', ') : '—';
  return [
    `- **App type:** ${c.app_type}`,
    `- **Tier:** ${c.tier}`,
    `- **Confidence:** ${c.confidence.toFixed(2)}`,
    `- **Modifiers:** ${mods}`,
  ].join('\n');
}

function defaultScoreSlot(report: ReportObject): string {
  const s = report.score;
  if (!s) return '_No score attached._';
  const lines = [
    `- **Current:** ${s.current.toFixed(1)}%`,
    `- **Target:** ${s.target.toFixed(1)}%`,
    '',
    '| Level | Coverage |',
    '|---|---|',
  ];
  for (const key of Object.keys(s.per_level)) {
    const v = s.per_level[key as keyof typeof s.per_level];
    lines.push(`| ${key} | ${v.toFixed(1)}% |`);
  }
  return lines.join('\n');
}

function defaultFindingsSlot(report: ReportObject): string {
  if (report.findings.length === 0) return '_No findings._';
  const lines: string[] = [];
  for (const f of report.findings) {
    lines.push(`### ${f.title}`);
    lines.push(`- **Severity:** ${f.severity}`);
    lines.push(`- **Category:** ${f.category}`);
    if (f.effort) lines.push(`- **Effort:** ${f.effort}`);
    if (f.rationale) lines.push('', f.rationale);
    if (f.example_pattern) {
      lines.push('', '```', f.example_pattern, '```');
    }
    lines.push('');
  }
  return lines.join('\n');
}

function defaultActionsSlot(report: ReportObject): string {
  if (report.actions_taken.length === 0) return '_No actions taken._';
  return report.actions_taken
    .map((a) => `- **${a.kind}** — ${a.description}${a.target ? ` (\`${a.target}\`)` : ''}`)
    .join('\n');
}

function defaultDeferralsSlot(report: ReportObject): string {
  if (report.deferrals.length === 0) return '_No complement deferrals detected._';
  return report.deferrals
    .map((d) => `- **${d.complement}** · ${d.phase}\n  > ${d.contract}`)
    .join('\n');
}

function defaultHandoffSlot(report: ReportObject): string {
  if (report.handoff_artifacts.length === 0) return '_No handoff artifacts written._';
  return report.handoff_artifacts.map((p) => `- \`${p}\``).join('\n');
}

function defaultNextStepSlot(report: ReportObject): string {
  return report.next_step_hint ?? '_No next-step hint attached._';
}

function applyTemplate(template: string, report: ReportObject, proseSlots: Record<string, string>): string {
  const defaults: Record<string, string> = {
    classification: defaultClassificationSlot(report),
    score: defaultScoreSlot(report),
    findings: defaultFindingsSlot(report),
    actions_taken: defaultActionsSlot(report),
    deferrals: defaultDeferralsSlot(report),
    handoff_artifacts: defaultHandoffSlot(report),
    next_step_hint: defaultNextStepSlot(report),
  };
  const merged = { ...defaults, ...proseSlots };
  return template
    .replace(/\{\{command\}\}/g, report.command)
    .replace(/\{\{project\.repo_root\}\}/g, report.project.repo_root)
    .replace(/\{\{project\.scope\}\}/g, report.project.scope ?? '_full repo_')
    .replace(/\{\{timestamp\}\}/g, report.timestamp)
    .replace(/\{\{plugin_version\}\}/g, report.plugin_version)
    .replace(/\{\{slot:([a-zA-Z_]+)\}\}/g, (_full, slot: string) => merged[slot] ?? '');
}

export async function renderMarkdown(
  report: ReportObject,
  options: MarkdownRenderOptions = {},
): Promise<string> {
  const proseSlots = options.proseSlots ?? {};
  const templateSourceArg = options.templatePath;
  const template =
    (templateSourceArg ? await loadTemplate(report.command, templateSourceArg) : await loadTemplate(report.command))
    ?? DEFAULT_TEMPLATE;
  return applyTemplate(template, report, proseSlots);
}

/** Synchronous pure helper — useful when SKILLs already have the template in memory. */
export function renderMarkdownSync(
  report: ReportObject,
  template: string = DEFAULT_TEMPLATE,
  proseSlots: Record<string, string> = {},
): string {
  return applyTemplate(template, report, proseSlots);
}

export { DEFAULT_TEMPLATE };
