/**
 * AST walker — thin wrapper around `@typescript-eslint/typescript-estree`.
 *
 * Responsibilities:
 * - Parse a TS/JS/TSX/JSX source file into an ESTree-compatible AST.
 * - Provide sync + async (generator) variants for batch scanning.
 * - Collapse parse errors into a single `AstWalkerError` so callers can decide
 *   whether to skip, log, or abort.
 *
 * Downstream callers (framework-detector, route-inventory, component-inventory,
 * model-inventory, integration-inventory) consume the parsed AST — they never
 * re-parse the same file, and they never reach into `typescript-estree` directly.
 */

import { readFile, readFileSync, statSync } from 'node:fs';
import { promisify } from 'node:util';
import { extname } from 'node:path';

import { parse as estreeParse } from '@typescript-eslint/typescript-estree';

const readFileAsync = promisify(readFile);

export type SupportedExtension = '.ts' | '.tsx' | '.js' | '.jsx' | '.mjs' | '.cjs';
export const SUPPORTED_EXTENSIONS: readonly SupportedExtension[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

export interface ParseOptions {
  /** Track JSX explicitly. Inferred from extension by default. */
  jsx?: boolean;
  /** Whether to include location info (default true — cheap and useful). */
  loc?: boolean;
  /** Whether to include comment nodes (default false). */
  comment?: boolean;
  /** Whether to include range info (default true). */
  range?: boolean;
}

export class AstWalkerError extends Error {
  public readonly filePath: string;
  public readonly cause: unknown;
  public readonly extension: string;
  constructor(filePath: string, extension: string, cause: unknown) {
    const msg =
      cause instanceof Error ? cause.message : String(cause ?? 'unknown parse error');
    super(`ast-walker: failed to parse ${filePath} (${extension}): ${msg}`);
    this.name = 'AstWalkerError';
    this.filePath = filePath;
    this.extension = extension;
    this.cause = cause;
  }
}

/**
 * AST node — typed as `unknown`-compatible. We deliberately avoid exporting the
 * typescript-estree node type hierarchy through our public surface so that a
 * future parser swap (tree-sitter, swc) stays feasible.
 */
export type AstNode = {
  type: string;
  [key: string]: unknown;
};

export interface ParsedFile {
  path: string;
  extension: SupportedExtension;
  /** Root `Program` node. */
  ast: AstNode;
  /** Raw source text — occasionally handy for matchers that want literal text. */
  source: string;
}

function extensionOf(filePath: string): SupportedExtension {
  const ext = extname(filePath).toLowerCase();
  if (!isSupportedExtension(ext)) {
    throw new AstWalkerError(filePath, ext, `Unsupported extension '${ext}'`);
  }
  return ext;
}

export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

function baseParseOptions(filePath: string, extension: SupportedExtension, opts: ParseOptions) {
  const inferredJsx = extension === '.tsx' || extension === '.jsx';
  return {
    jsx: opts.jsx ?? inferredJsx,
    loc: opts.loc ?? true,
    range: opts.range ?? true,
    comment: opts.comment ?? false,
    errorOnUnknownASTType: false,
    errorOnTypeScriptSyntacticAndSemanticIssues: false,
    // Keep parsing resilient — vibe-coded apps are messy.
    tolerant: true as unknown as never, // older field; modern estree accepts loose input
    filePath,
  };
}

export function parseSource(
  source: string,
  filePath: string,
  opts: ParseOptions = {},
): ParsedFile {
  const extension = extensionOf(filePath);
  try {
    const ast = estreeParse(source, baseParseOptions(filePath, extension, opts)) as unknown as AstNode;
    return { path: filePath, extension, ast, source };
  } catch (err) {
    throw new AstWalkerError(filePath, extension, err);
  }
}

export function parseFileSync(filePath: string, opts: ParseOptions = {}): ParsedFile {
  const source = readFileSync(filePath, 'utf8');
  return parseSource(source, filePath, opts);
}

export async function parseFile(filePath: string, opts: ParseOptions = {}): Promise<ParsedFile> {
  const source = await readFileAsync(filePath, 'utf8');
  return parseSource(source, filePath, opts);
}

/**
 * Async generator for batch scanning. Yields successfully-parsed files; swallows
 * per-file parse errors by emitting an error side channel via `onError`.
 * This is the intended interface for scanner/index.ts — it prevents one malformed
 * file from aborting an otherwise-good audit.
 */
export async function* parseFiles(
  filePaths: readonly string[],
  opts: ParseOptions & { onError?: (err: AstWalkerError) => void } = {},
): AsyncGenerator<ParsedFile> {
  for (const p of filePaths) {
    try {
      yield await parseFile(p, opts);
    } catch (err) {
      const wrapped = err instanceof AstWalkerError ? err : new AstWalkerError(p, extname(p), err);
      if (opts.onError) {
        opts.onError(wrapped);
      }
      // else: silently skip. Scanner owns the audit trail.
    }
  }
}

/**
 * Convenience node-walker — depth-first, pre-order. Visitors that return `false`
 * stop descent into that subtree.
 */
export function walk(
  root: AstNode,
  visitor: (node: AstNode, parent: AstNode | null) => boolean | void,
): void {
  function recur(node: AstNode, parent: AstNode | null): void {
    if (!node || typeof node !== 'object') return;
    const descend = visitor(node, parent);
    if (descend === false) return;
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue;
      const child = (node as Record<string, unknown>)[key];
      if (!child) continue;
      if (Array.isArray(child)) {
        for (const sub of child) {
          if (sub && typeof sub === 'object' && 'type' in sub) {
            recur(sub as AstNode, node);
          }
        }
      } else if (typeof child === 'object' && 'type' in (child as object)) {
        recur(child as AstNode, node);
      }
    }
  }
  recur(root, null);
}

/** Exists purely so tests can verify a supported file exists on disk. */
export function fileExistsSync(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}
