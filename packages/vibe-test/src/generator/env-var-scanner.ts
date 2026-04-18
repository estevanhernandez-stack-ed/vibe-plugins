/**
 * Env-var scanner — detects env-var reads in code-under-test so the generator
 * can annotate tests with CI env stubs and inline warnings.
 *
 * Detects four patterns (PRD G2):
 *   1. `process.env.X` — direct property access
 *   2. `process.env['X']` — bracket access
 *   3. `import.meta.env.X` / `import.meta.env['X']` — Vite / ES module
 *   4. `dotenv` side-effects — `import 'dotenv/config'`, `require('dotenv/config')`,
 *      `config({ path: '...' })` from dotenv
 *
 * The scanner is regex-first for portability (cheap for multi-file scans) and
 * preserves line numbers for caller-side annotation. Scanning is pure over a
 * string input — callers that already have file contents do not re-read them.
 *
 * Returns: `EnvVarReference[]` with `{var_name, file, line, fallback?, source}`.
 */

import { promises as fs } from 'node:fs';

export type EnvVarSource =
  | 'process.env'
  | 'import.meta.env'
  | 'dotenv-side-effect'
  | 'dotenv-config';

export interface EnvVarReference {
  /** Variable name (e.g., `FIREBASE_API_KEY`). `null` for side-effect-only dotenv imports. */
  var_name: string | null;
  /** Absolute or repo-relative path — caller decides what to pass. Scanner echoes it back. */
  file: string;
  /** 1-indexed line number where the reference appears. */
  line: number;
  /** Inline fallback literal if the code uses `process.env.X ?? 'default'` / `|| 'default'`. */
  fallback?: string;
  /** Which pattern family matched (for diagnostic / annotation prose). */
  source: EnvVarSource;
}

/**
 * Patterns:
 *   process.env.IDENT         → capture the identifier
 *   process.env['IDENT']      → capture the string literal
 *   import.meta.env.IDENT     → capture the identifier
 *   import.meta.env['IDENT']  → capture the string literal
 *
 * We intentionally do NOT resolve dynamic keys (`process.env[varName]`) — those
 * can't be named statically, and a heuristic guess would mislead the SKILL.
 */
const PROCESS_ENV_DOT = /\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const PROCESS_ENV_BRACKET = /\bprocess\.env\[\s*['"]([^'"]+)['"]\s*\]/g;
const IMPORT_META_ENV_DOT = /\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const IMPORT_META_ENV_BRACKET = /\bimport\.meta\.env\[\s*['"]([^'"]+)['"]\s*\]/g;

/**
 * Dotenv patterns — side-effect imports that load env at process start.
 * These don't name specific variables but signal "this module's code expects
 * a .env file to exist". The SKILL can use this to warn: "needs a `.env`
 * stub — CI secrets required".
 */
const DOTENV_IMPORT = /^\s*import\s+['"]dotenv\/config['"]\s*;?\s*$/;
const DOTENV_REQUIRE = /\brequire\(\s*['"]dotenv\/config['"]\s*\)/;

/**
 * `config({ path: 'foo.env' })` or `dotenv.config(...)` — we detect both:
 * the zero-arg / `path:` bag variant. The captured path (if any) is stored in
 * `fallback` for caller-side annotation ("reads .env from <path>").
 */
const DOTENV_CONFIG_CALL =
  /\b(?:dotenv\s*\.\s*)?config\s*\(\s*(?:\{\s*path\s*:\s*['"]([^'"]+)['"][^}]*\})?\s*\)/;

/**
 * Inline-fallback capture: `process.env.X ?? 'default'` or `process.env.X || 'default'`.
 * Returns the fallback literal if present. We only capture string literals —
 * numeric / boolean / expression fallbacks are ignored since the annotation is
 * for builder eyes (not code generation).
 */
const FALLBACK_PATTERN =
  /(?:process\.env\.[A-Za-z_][A-Za-z0-9_]*|process\.env\[\s*['"][^'"]+['"]\s*\]|import\.meta\.env\.[A-Za-z_][A-Za-z0-9_]*|import\.meta\.env\[\s*['"][^'"]+['"]\s*\])\s*(?:\?\?|\|\|)\s*['"]([^'"]*)['"]/;

export interface ScanStringInput {
  /** Source contents to scan. */
  content: string;
  /** Path label to echo back in each reference (caller owns path semantics). */
  file: string;
}

interface PatternSpec {
  re: RegExp;
  source: EnvVarSource;
}

function iterateMatches(pattern: RegExp, subject: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(subject)) !== null) {
    out.push(m);
    if (m.index === re.lastIndex) re.lastIndex += 1; // avoid zero-length loop
  }
  return out;
}

/**
 * Scan a source string. Pure, synchronous — no fs, no network. Safe to call in
 * hot loops. Returns one entry per unique `(source, var_name, line)` triple to
 * avoid double-counting across overlapping patterns.
 */
export function scanSource({ content, file }: ScanStringInput): EnvVarReference[] {
  const found: EnvVarReference[] = [];
  const seen = new Set<string>();

  const addRef = (ref: EnvVarReference): void => {
    const key = `${ref.source}:${ref.var_name ?? ''}:${ref.line}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(ref);
  };

  const lines = content.split(/\r?\n/);

  const patterns: PatternSpec[] = [
    { re: PROCESS_ENV_DOT, source: 'process.env' },
    { re: PROCESS_ENV_BRACKET, source: 'process.env' },
    { re: IMPORT_META_ENV_DOT, source: 'import.meta.env' },
    { re: IMPORT_META_ENV_BRACKET, source: 'import.meta.env' },
  ];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const lineContent = lines[lineIdx] ?? '';
    const lineNumber = lineIdx + 1;

    for (const { re, source } of patterns) {
      const matches = iterateMatches(re, lineContent);
      for (const match of matches) {
        const varName = match[1] ?? '';
        if (!varName) continue;
        const windowStart = match.index;
        const windowEnd = Math.min(lineContent.length, match.index + match[0].length + 32);
        const window = lineContent.slice(windowStart, windowEnd);
        const fbMatch = FALLBACK_PATTERN.exec(window);
        const ref: EnvVarReference = {
          var_name: varName,
          file,
          line: lineNumber,
          source,
        };
        if (fbMatch && fbMatch[1] !== undefined) {
          ref.fallback = fbMatch[1];
        }
        addRef(ref);
      }
    }

    if (DOTENV_IMPORT.test(lineContent) || DOTENV_REQUIRE.test(lineContent)) {
      addRef({
        var_name: null,
        file,
        line: lineNumber,
        source: 'dotenv-side-effect',
      });
    }

    const configMatch = DOTENV_CONFIG_CALL.exec(lineContent);
    if (configMatch) {
      // Only flag config() calls when the surrounding file also references
      // `dotenv` somewhere — reduces false positives against unrelated APIs
      // that happen to expose a `config()` method.
      const hasDotenvContext =
        /\bdotenv\b/.test(content) || /\bdotenv\s*\.\s*config\b/.test(lineContent);
      if (hasDotenvContext) {
        const ref: EnvVarReference = {
          var_name: null,
          file,
          line: lineNumber,
          source: 'dotenv-config',
        };
        if (configMatch[1]) ref.fallback = configMatch[1];
        addRef(ref);
      }
    }
  }

  return found;
}

/**
 * Read a file and scan it. Convenience wrapper — used by the generate SKILL when
 * iterating over the code-under-test paths reported by the audit findings.
 */
export async function scanFile(filePath: string): Promise<EnvVarReference[]> {
  const content = await fs.readFile(filePath, 'utf8');
  return scanSource({ content, file: filePath });
}

/**
 * Scan a list of files and flatten the results. Preserves the scan order so
 * the caller can attribute findings back to specific files.
 */
export async function scanFiles(filePaths: string[]): Promise<EnvVarReference[]> {
  const all: EnvVarReference[] = [];
  for (const f of filePaths) {
    try {
      const refs = await scanFile(f);
      all.push(...refs);
    } catch {
      // Missing / unreadable files are skipped — the SKILL decides whether the
      // path list from the audit state is still current.
    }
  }
  return all;
}

/**
 * Return the unique set of variable names from a list of references. Useful for
 * composing the CI-stub `env:` block and the inline warning.
 */
export function uniqueVarNames(refs: EnvVarReference[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of refs) {
    if (r.var_name && !seen.has(r.var_name)) {
      seen.add(r.var_name);
      out.push(r.var_name);
    }
  }
  return out;
}

/**
 * Human-readable summary of a scan's findings — the SKILL renders this inline
 * above the generated test file as a comment / warning block.
 */
export function formatInlineWarning(refs: EnvVarReference[]): string {
  const names = uniqueVarNames(refs);
  if (names.length === 0 && refs.some((r) => r.source.startsWith('dotenv'))) {
    return '// This test requires a .env file (dotenv side-effect detected). CI stub will be updated with placeholders.';
  }
  if (names.length === 0) return '';
  const list = names.join(', ');
  return `// This test requires env vars: ${list}. CI stub will be updated with placeholders.`;
}
