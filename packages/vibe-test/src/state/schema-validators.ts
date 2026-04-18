/**
 * ajv-wrapped schema validator with a compile-once cache.
 *
 * Usage:
 *   import { validate, validateOrThrow, SchemaName } from './schema-validators.js';
 *   if (!validate('audit-state', data)) { ... }
 *
 * Schemas live under `skills/guide/schemas/` as draft-07 JSON Schema files.
 * On first use per schema the file is loaded and compiled, then cached for the
 * process lifetime.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv, type ErrorObject, type ValidateFunction, type Plugin } from 'ajv';
import addFormatsRaw from 'ajv-formats';

// ajv-formats' CommonJS default export surfaces as a module namespace with a
// `.default` key under NodeNext ESM. Narrow to the Plugin function at runtime.
type AddFormatsFn = Plugin<unknown>;
const addFormatsRawAny = addFormatsRaw as unknown;
const addFormats: AddFormatsFn =
  typeof addFormatsRawAny === 'function'
    ? (addFormatsRawAny as AddFormatsFn)
    : ((addFormatsRawAny as { default: AddFormatsFn }).default);

export type SchemaName =
  | 'audit-state'
  | 'coverage-state'
  | 'generate-state'
  | 'findings'
  | 'covered-surfaces'
  | 'builder-profile'
  | 'dry-run-cache';

const SCHEMA_NAMES: readonly SchemaName[] = [
  'audit-state',
  'coverage-state',
  'generate-state',
  'findings',
  'covered-surfaces',
  'builder-profile',
  'dry-run-cache',
] as const;

// Resolve the schemas directory relative to this source file. In dev we run
// from `src/state/`; after tsup bundling we run from `dist/`. Both sit two
// levels under the package root, so the schemas folder is always at
// `<pkg>/skills/guide/schemas/`.
function schemasDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Walk up until we find `package.json` at the package root.
  let cursor = here;
  for (let i = 0; i < 6; i += 1) {
    try {
      readFileSync(join(cursor, 'package.json'), 'utf8');
      return join(cursor, 'skills', 'guide', 'schemas');
    } catch {
      cursor = dirname(cursor);
    }
  }
  throw new Error(
    `schema-validators: could not locate package root from ${here}. ` +
      `Expected a package.json within 6 parent directories.`,
  );
}

const ajv = new Ajv({
  allErrors: true,
  strict: false, // draft-07 $schema keyword triggers strict warnings we don't need
  allowUnionTypes: true,
});
addFormats(ajv);

const validatorCache = new Map<SchemaName, ValidateFunction>();

function getValidator(name: SchemaName): ValidateFunction {
  const cached = validatorCache.get(name);
  if (cached) return cached;

  const filePath = join(schemasDir(), `${name}.schema.json`);
  const raw = readFileSync(filePath, 'utf8');
  const schema = JSON.parse(raw) as Record<string, unknown>;
  const fn = ajv.compile(schema);
  validatorCache.set(name, fn);
  return fn;
}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

/**
 * Validate `data` against the named schema. Returns `true` when valid, `false`
 * when invalid. Errors can be retrieved via `lastErrors()` immediately after.
 */
export function validate(name: SchemaName, data: unknown): boolean {
  const fn = getValidator(name);
  const result = fn(data);
  _lastErrors = fn.errors ?? [];
  return result === true;
}

export function validateDetailed(name: SchemaName, data: unknown): ValidationResult {
  const fn = getValidator(name);
  const result = fn(data);
  return {
    valid: result === true,
    errors: fn.errors ?? [],
  };
}

export function validateOrThrow(name: SchemaName, data: unknown): void {
  const { valid, errors } = validateDetailed(name, data);
  if (!valid) {
    const detail = errors
      .map((err) => `  - ${err.instancePath || '<root>'}: ${err.message ?? 'invalid'}`)
      .join('\n');
    throw new Error(`Schema validation failed for '${name}':\n${detail}`);
  }
}

let _lastErrors: ErrorObject[] = [];
export function lastErrors(): ErrorObject[] {
  return _lastErrors;
}

/**
 * Preload all known schemas. Useful at process start to surface malformed
 * schemas immediately rather than lazily on first validation call.
 */
export function warmCache(): void {
  for (const name of SCHEMA_NAMES) {
    getValidator(name);
  }
}

export { SCHEMA_NAMES };
