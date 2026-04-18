/**
 * GitHub Actions stdout protocol helpers.
 *
 * GitHub Actions parses lines that start with `::error::`, `::warning::`, and
 * `::notice::` into annotations attached to the workflow run. When the CLI
 * detects `GITHUB_ACTIONS=true` (or the user passes `--ci`), every diagnostic
 * line gets the appropriate prefix.
 *
 * The protocol also supports `::set-output` and a `$GITHUB_STEP_SUMMARY`
 * markdown sink — we wrap both with helpers the gate command uses.
 *
 * Plain-stdout fallback (non-CI): the helpers emit human-readable lines
 * without the `::` prefix so local terminal output stays readable.
 */

import { promises as fs } from 'node:fs';

export interface CiContext {
  /** Whether CI mode is active (auto-detected or forced via --ci). */
  active: boolean;
  /** Path to $GITHUB_STEP_SUMMARY when set, else null. */
  stepSummaryPath: string | null;
}

export function detectCiContext(forceCi?: boolean): CiContext {
  const fromEnv = process.env.GITHUB_ACTIONS === 'true';
  const active = forceCi === true || fromEnv;
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  return {
    active,
    stepSummaryPath: typeof stepSummary === 'string' && stepSummary.length > 0 ? stepSummary : null,
  };
}

export interface AnnotationLocation {
  file?: string;
  line?: number;
  col?: number;
  title?: string;
}

function formatLocation(loc: AnnotationLocation | undefined): string {
  if (!loc) return '';
  const parts: string[] = [];
  if (loc.file) parts.push(`file=${loc.file}`);
  if (loc.line !== undefined) parts.push(`line=${loc.line}`);
  if (loc.col !== undefined) parts.push(`col=${loc.col}`);
  if (loc.title) parts.push(`title=${loc.title}`);
  return parts.length === 0 ? '' : ` ${parts.join(',')}`;
}

export function emitError(message: string, ctx: CiContext, loc?: AnnotationLocation): void {
  if (ctx.active) {
    process.stderr.write(`::error${formatLocation(loc)}::${message}\n`);
  } else {
    process.stderr.write(`error: ${message}\n`);
  }
}

export function emitWarning(message: string, ctx: CiContext, loc?: AnnotationLocation): void {
  if (ctx.active) {
    process.stderr.write(`::warning${formatLocation(loc)}::${message}\n`);
  } else {
    process.stderr.write(`warning: ${message}\n`);
  }
}

export function emitNotice(message: string, ctx: CiContext, loc?: AnnotationLocation): void {
  if (ctx.active) {
    process.stdout.write(`::notice${formatLocation(loc)}::${message}\n`);
  } else {
    process.stdout.write(`notice: ${message}\n`);
  }
}

export async function appendStepSummary(markdown: string, ctx: CiContext): Promise<void> {
  if (!ctx.stepSummaryPath) return;
  try {
    await fs.appendFile(ctx.stepSummaryPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`, 'utf8');
  } catch (err) {
    emitWarning(
      `failed to append to GITHUB_STEP_SUMMARY: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
  }
}

/** Group helper — emits `::group::title` / `::endgroup::` only in CI. */
export function emitGroup(title: string, ctx: CiContext, body: () => void): void {
  if (ctx.active) {
    process.stdout.write(`::group::${title}\n`);
    body();
    process.stdout.write('::endgroup::\n');
  } else {
    process.stdout.write(`--- ${title} ---\n`);
    body();
  }
}
