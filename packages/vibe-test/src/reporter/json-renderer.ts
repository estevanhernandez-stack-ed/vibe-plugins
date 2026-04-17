/**
 * JSON renderer — serializes the ReportObject, validates against the per-command
 * schema (when one exists), and writes two files:
 *   .vibe-test/state/<command>.json                — current
 *   .vibe-test/state/history/<command>-<ISO>.json  — timestamped history
 */

import { join } from 'node:path';

import { atomicWriteJson } from '../state/atomic-write.js';
import { validateDetailed, type SchemaName } from '../state/schema-validators.js';
import type { ReportObject, CommandName } from './report-object.js';

export interface JsonRenderInput {
  report: ReportObject;
  /** Repo root — we write under `<repoRoot>/.vibe-test/state/`. */
  repoRoot: string;
  /** If true, skip schema validation (use for commands without a schema yet). */
  skipValidation?: boolean;
}

export interface JsonRenderResult {
  currentPath: string;
  historyPath: string;
  validation: {
    attempted: boolean;
    valid: boolean;
    errors: string[];
  };
  payload: Record<string, unknown>;
}

/** Mapping from command → schema file (when one exists). */
const COMMAND_TO_SCHEMA: Partial<Record<CommandName, SchemaName>> = {
  audit: 'audit-state',
  coverage: 'coverage-state',
  generate: 'generate-state',
};

/** Translate the full ReportObject into the per-command schema shape. */
function payloadForSchema(report: ReportObject, schema: SchemaName | null): Record<string, unknown> {
  const base: Record<string, unknown> = {
    schema_version: report.schema_version,
    command: report.command,
    plugin_version: report.plugin_version,
    last_updated: report.timestamp,
  };
  if (schema === 'audit-state') {
    return {
      ...base,
      project: report.project,
      classification: report.classification,
      findings: report.findings,
    };
  }
  if (schema === 'coverage-state') {
    const s = report.score;
    return {
      ...base,
      measured_at: report.timestamp,
      denominator_honest: true,
      per_level: s?.per_level ?? undefined,
      weighted_score: s?.current ?? undefined,
      tier_threshold: s?.target ?? undefined,
      passes_tier_threshold: s ? s.current >= s.target : undefined,
    };
  }
  if (schema === 'generate-state') {
    return {
      ...base,
      scope: report.project.scope,
    };
  }
  // No schema — dump the full report verbatim.
  return { ...base, report };
}

function sanitizeForPath(str: string): string {
  return str.replace(/[^a-zA-Z0-9-]/g, '-');
}

export async function renderJson(input: JsonRenderInput): Promise<JsonRenderResult> {
  const stateDir = join(input.repoRoot, '.vibe-test', 'state');
  const historyDir = join(stateDir, 'history');
  const currentPath = join(stateDir, `${input.report.command}.json`);
  const historyPath = join(
    historyDir,
    `${input.report.command}-${sanitizeForPath(input.report.timestamp)}.json`,
  );

  const schemaName = COMMAND_TO_SCHEMA[input.report.command] ?? null;
  const payload = payloadForSchema(input.report, schemaName);

  let validation: JsonRenderResult['validation'] = {
    attempted: false,
    valid: true,
    errors: [],
  };
  if (schemaName && !input.skipValidation) {
    const r = validateDetailed(schemaName, payload);
    validation = {
      attempted: true,
      valid: r.valid,
      errors: r.errors.map((e) => `${e.instancePath || '<root>'}: ${e.message ?? 'invalid'}`),
    };
    if (!r.valid) {
      throw new Error(
        `json-renderer: schema '${schemaName}' validation failed:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    }
  }

  await atomicWriteJson(currentPath, payload);
  await atomicWriteJson(historyPath, payload);

  return {
    currentPath,
    historyPath,
    validation,
    payload,
  };
}

/** Pure serializer — for callers who want the validated JSON text without disk I/O. */
export function serializeReport(report: ReportObject): string {
  return JSON.stringify(report, null, 2);
}
