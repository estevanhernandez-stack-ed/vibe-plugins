/**
 * Banner renderer — ANSI-colored terminal output.
 *
 * Width: default 80 cols, expands up to the actual `process.stdout.columns`
 * when larger. Never exceeds the terminal width to avoid mangled wrapping.
 *
 * Uses `chalk` for colors and `cli-table3` for key-value layouts.
 */

import chalk from 'chalk';
import Table from 'cli-table3';

import type { ReportObject } from './report-object.js';

export interface BannerRenderOptions {
  /** Force a specific width. Defaults to stdout detection with an 80-col floor. */
  columns?: number;
  /** Disable colors — for tests and plain-text contexts. */
  disableColors?: boolean;
}

function resolveColumns(options: BannerRenderOptions): number {
  if (options.columns !== undefined) return options.columns;
  const stdoutCols = process.stdout && typeof process.stdout.columns === 'number'
    ? process.stdout.columns
    : 0;
  return Math.max(80, stdoutCols || 80);
}

function divider(ch: string, width: number): string {
  return ch.repeat(width);
}

function centerText(text: string, width: number): string {
  const padTotal = Math.max(0, width - text.length);
  const left = Math.floor(padTotal / 2);
  const right = padTotal - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

interface Colors {
  title: (s: string) => string;
  section: (s: string) => string;
  key: (s: string) => string;
  pass: (s: string) => string;
  fail: (s: string) => string;
  warn: (s: string) => string;
  dim: (s: string) => string;
}

function colorsFor(disabled: boolean): Colors {
  if (disabled) {
    const identity = (s: string): string => s;
    return {
      title: identity,
      section: identity,
      key: identity,
      pass: identity,
      fail: identity,
      warn: identity,
      dim: identity,
    };
  }
  return {
    title: (s) => chalk.bold.cyan(s),
    section: (s) => chalk.bold.white(s),
    key: (s) => chalk.gray(s),
    pass: (s) => chalk.green(s),
    fail: (s) => chalk.red(s),
    warn: (s) => chalk.yellow(s),
    dim: (s) => chalk.dim(s),
  };
}

export function renderBanner(report: ReportObject, options: BannerRenderOptions = {}): string {
  const colors = options.disableColors ? colorsFor(true) : colorsFor(false);
  const width = resolveColumns(options);

  const lines: string[] = [];
  const bar = divider('=', width);
  const thin = divider('-', width);

  lines.push(colors.title(bar));
  const heading = `Vibe Test  ·  ${report.command}`;
  lines.push(colors.title(centerText(heading, width)));
  lines.push(colors.title(bar));

  // Project line
  lines.push(colors.dim(`project: ${report.project.repo_root}`));
  if (report.project.scope) {
    lines.push(colors.dim(`scope:   ${report.project.scope}`));
  }
  lines.push(colors.dim(`at:      ${report.timestamp}`));

  // Classification
  lines.push('');
  lines.push(colors.section('Classification'));
  lines.push(thin);
  if (!report.classification) {
    lines.push(colors.dim('  (no classification attached)'));
  } else {
    const cls = report.classification;
    // cli-table3 adds 4 chars of border chrome (│ │ │) between + around columns.
    // We size our two columns so total width ≤ `width` with a safety margin of 1.
    const border = 4;
    const leftW = Math.min(20, Math.max(12, Math.floor((width - border) / 3)));
    const rightW = Math.max(10, width - leftW - border);
    const table = new Table({
      head: [],
      style: { head: [], border: [] },
      colWidths: [leftW, rightW],
      wordWrap: true,
    });
    table.push([colors.key('app type'), cls.app_type]);
    table.push([colors.key('tier'), cls.tier]);
    table.push([colors.key('confidence'), cls.confidence.toFixed(2)]);
    if (cls.modifiers.length > 0) table.push([colors.key('modifiers'), cls.modifiers.join(', ')]);
    lines.push(table.toString());
  }

  // Score
  lines.push('');
  lines.push(colors.section('Score'));
  lines.push(thin);
  if (!report.score) {
    lines.push(colors.dim('  (no score attached)'));
  } else {
    const s = report.score;
    const pass = s.current >= s.target;
    const statusLabel = pass ? colors.pass(`PASS (${s.current.toFixed(1)} ≥ ${s.target})`) : colors.fail(`BELOW (${s.current.toFixed(1)} / ${s.target})`);
    lines.push(`  ${statusLabel}`);
    const perLevelKeys = Object.keys(s.per_level);
    if (perLevelKeys.length > 0) {
      for (const key of perLevelKeys) {
        const value = s.per_level[key as keyof typeof s.per_level];
        lines.push(`  ${colors.key(key.padEnd(12))} ${value.toFixed(1)}%`);
      }
    }
  }

  // Findings
  lines.push('');
  lines.push(colors.section(`Findings (${report.findings.length})`));
  lines.push(thin);
  if (report.findings.length === 0) {
    lines.push(colors.dim('  (none)'));
  } else {
    for (const f of report.findings.slice(0, 20)) {
      const sev = f.severity.toUpperCase().padEnd(8);
      const sevColored =
        f.severity === 'critical' || f.severity === 'high'
          ? colors.fail(sev)
          : f.severity === 'medium'
            ? colors.warn(sev)
            : colors.dim(sev);
      lines.push(`  ${sevColored} ${f.title}`);
      if (f.rationale) {
        lines.push(colors.dim(`    ${truncate(f.rationale, width - 6)}`));
      }
    }
    if (report.findings.length > 20) {
      lines.push(colors.dim(`  … and ${report.findings.length - 20} more`));
    }
  }

  // Actions
  if (report.actions_taken.length > 0) {
    lines.push('');
    lines.push(colors.section(`Actions (${report.actions_taken.length})`));
    lines.push(thin);
    for (const a of report.actions_taken.slice(0, 15)) {
      lines.push(`  ${colors.key(a.kind.padEnd(8))} ${a.description}`);
    }
  }

  // Deferrals (Pattern #13)
  if (report.deferrals.length > 0) {
    lines.push('');
    lines.push(colors.section(`Plays well with (${report.deferrals.length})`));
    lines.push(thin);
    for (const d of report.deferrals) {
      lines.push(`  ${colors.key('→')} ${d.complement} · ${colors.dim(d.phase)}`);
    }
  }

  // Handoff artifacts
  if (report.handoff_artifacts.length > 0) {
    lines.push('');
    lines.push(colors.section('Handoff artifacts'));
    lines.push(thin);
    for (const h of report.handoff_artifacts) {
      lines.push(`  ${colors.dim('·')} ${h}`);
    }
  }

  // Next step
  if (report.next_step_hint) {
    lines.push('');
    lines.push(colors.section('Next step'));
    lines.push(thin);
    lines.push(`  ${report.next_step_hint}`);
  }

  lines.push('');
  lines.push(colors.title(bar));

  return lines.join('\n');
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, Math.max(1, max - 1)) + '…';
}
