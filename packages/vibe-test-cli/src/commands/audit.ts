/**
 * `vibe-test audit` — deterministic audit primitives, no LLM calls.
 *
 * Runs the scanner + classifier helpers + coverage adapters + reporter against
 * a project root. Outputs:
 *
 *   - `<out>/audit-<ISO>.md`     — markdown audit report (basic, no SKILL prose)
 *   - `<out>/audit.json`         — JSON sidecar (validates against audit-state schema)
 *   - stdout banner              — terminal-friendly summary
 *
 * Full classification + rationale prose requires SKILL reasoning, which the CLI
 * doesn't have. The output marks classification confidence as "see plugin for
 * full classification" so CI consumers know the deterministic floor.
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  scanner,
  reporter,
  type Inventory,
  type ReportObject,
} from '@esthernandez/vibe-test';

import { detectCiContext, emitNotice, emitError, type CiContext } from '../stdout-protocol.js';

export interface AuditCommandOptions {
  path?: string;
  out?: string;
  cwd?: string;
  /** Force CI annotation mode. */
  ci?: boolean;
}

export interface AuditCommandResult {
  exitCode: number;
  inventory: Inventory | null;
  reportPath: string | null;
  jsonPath: string | null;
}

const DEFAULT_OUT = 'docs/vibe-test';

export async function runAuditCommand(options: AuditCommandOptions = {}): Promise<AuditCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const outDir = resolve(cwd, options.out ?? DEFAULT_OUT);
  const ctx = detectCiContext(options.ci);

  let inventory: Inventory;
  try {
    inventory = await scanner.scan(cwd, options.path ?? null);
  } catch (err) {
    emitError(
      `audit: scan failed: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
    return { exitCode: 2, inventory: null, reportPath: null, jsonPath: null };
  }

  // Deterministic classification — best-effort; full reasoning is in the SKILL.
  const classification = scanner.classifyAppType({
    detection: inventory.detection,
    routes: inventory.routes,
    models: inventory.models,
    componentCount: inventory.components.length,
  });
  const modifiers = scanner.classifyModifiers({
    detection: inventory.detection,
    models: inventory.models,
    integrations: inventory.integrations,
  });

  // Build a minimal ReportObject — no findings beyond inventory summary, no SKILL prose.
  const report = reporter.createReportObject({
    command: 'audit',
    repo_root: cwd,
    scope: options.path ?? null,
  });
  report.classification = {
    app_type: classification.app_type,
    tier: 'internal',
    modifiers,
    confidence: classification.confidence,
  };
  report.next_step_hint =
    'CLI emits the deterministic audit floor — run `/vibe-test:audit` in Claude Code for full classification, rationales, and tier reasoning.';
  report.findings.push({
    id: 'cli-headless-note',
    severity: 'info',
    category: 'classification',
    title: 'see plugin for full classification',
    rationale:
      'The CLI runs deterministic scanner + adapter primitives only — no LLM. Tier inference, mixed-stack split, and per-finding rationales require the `/vibe-test:audit` SKILL.',
  });

  await fs.mkdir(outDir, { recursive: true });
  const isoStamp = report.timestamp.replace(/[^a-zA-Z0-9]/g, '-');
  const mdPath = join(outDir, `audit-${isoStamp}.md`);
  const md = await reporter.renderMarkdown(report);
  await fs.writeFile(mdPath, md, 'utf8');

  let jsonPath: string | null = null;
  try {
    const json = await reporter.renderJson({ report, repoRoot: cwd, skipValidation: true });
    jsonPath = json.currentPath;
  } catch (err) {
    emitError(
      `audit: json render failed: ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
  }

  // Inventory summary sidecar — written under `<out>/inventory.json` for CI consumers.
  const invPath = join(outDir, 'inventory.json');
  await fs.writeFile(invPath, JSON.stringify(inventory, null, 2), 'utf8');

  emitBanner(report, inventory, ctx);
  emitNotice(
    `audit: classification=${classification.app_type} (confidence ${classification.confidence.toFixed(2)}); routes=${inventory.routes.length}, components=${inventory.components.length}, models=${inventory.models.length}`,
    ctx,
  );

  return {
    exitCode: 0,
    inventory,
    reportPath: mdPath,
    jsonPath,
  };
}

function emitBanner(report: ReportObject, inventory: Inventory, ctx: CiContext): void {
  const banner = reporter.renderBanner(report, { disableColors: !process.stdout.isTTY || ctx.active });
  process.stdout.write(`${banner}\n`);
  process.stdout.write(
    `Inventory summary: ${inventory.routes.length} routes, ${inventory.components.length} components, ${inventory.models.length} models, ${inventory.integrations.length} integrations\n`,
  );
}
