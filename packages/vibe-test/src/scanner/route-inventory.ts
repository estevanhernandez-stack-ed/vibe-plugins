/**
 * Route inventory — walks route-definition patterns across common Node.js
 * backends and Next.js conventions.
 *
 * Covers (v0.2):
 * - Express:          app.get/post/put/delete/patch/all('/path', ...handlers)
 * - Fastify:          fastify.get/post/...(path, handler) + fastify.route({ method, url, handler })
 * - Hono:             app.get/post/...('/path', ...handlers)
 * - Next.js App Router: `app/**\/route.ts` exports { GET, POST, ... } handlers
 * - Next.js Pages API: `pages/api/**` default export → method-agnostic route
 *
 * Output shape is intentionally small — SKILL reasoning layers semantics on top.
 */

import { basename, dirname, join, relative, sep } from 'node:path';

import type { ParsedFile, AstNode } from './ast-walker.js';
import { walk } from './ast-walker.js';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'ALL';

export interface RouteEntry {
  path: string;
  method: HttpMethod;
  handler_file: string;
  /** Caller names extracted from the same call expression, in order. */
  middleware_chain: string[];
  /** Which detector produced this entry (for debugging + SKILL reasoning). */
  source: 'express' | 'fastify' | 'hono' | 'nextjs-app' | 'nextjs-pages';
}

const HTTP_VERB_METHODS = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'all',
]);

const NEXT_APP_HANDLERS = new Set([
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
]);

function isStringLiteral(node: AstNode | undefined): node is AstNode & { value: string } {
  return !!node && node.type === 'Literal' && typeof (node as { value?: unknown }).value === 'string';
}

function nodeName(node: AstNode | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return (node as { name?: string }).name ?? null;
  if (node.type === 'MemberExpression') {
    const prop = (node as { property?: AstNode }).property;
    if (prop && prop.type === 'Identifier') {
      return (prop as { name?: string }).name ?? null;
    }
  }
  return null;
}

function memberObject(node: AstNode): AstNode | null {
  if (node.type !== 'MemberExpression') return null;
  return ((node as { object?: AstNode }).object ?? null) as AstNode | null;
}

/**
 * Detects Express-style + Hono-style + Fastify's method-sugar calls.
 * Pattern: <ident>.<method>(<path>, ...handlers)
 *
 * We can't distinguish Express from Hono from Fastify by AST alone — all three
 * share the same sugar — so we attribute based on detected frameworks when
 * provided. If none of the three are detected, default to `express`.
 */
function detectSugarRoutes(
  parsed: ParsedFile,
  attributionHint: 'express' | 'fastify' | 'hono',
  out: RouteEntry[],
): void {
  walk(parsed.ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = (node as { callee?: AstNode }).callee;
    if (!callee || callee.type !== 'MemberExpression') return;
    const methodName = nodeName(callee);
    if (!methodName || !HTTP_VERB_METHODS.has(methodName.toLowerCase())) return;
    const args = ((node as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
    if (args.length < 2) return;
    const pathArg = args[0];
    if (!isStringLiteral(pathArg)) return;

    // Object identifier — must be an Identifier (e.g., `app.get(...)`) or
    // another member expression (e.g., `this.app.get(...)`). Skip globals like
    // `Array.prototype.get` that shouldn't occur in route files anyway.
    const obj = memberObject(callee);
    if (!obj) return;

    const middleware = args
      .slice(1)
      .map((a) => nodeName(a) ?? (a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression' ? 'inline' : null))
      .filter((x): x is string => !!x);

    out.push({
      path: (pathArg as { value: string }).value,
      method: methodName.toUpperCase() as HttpMethod,
      handler_file: parsed.path,
      middleware_chain: middleware,
      source: attributionHint,
    });
  });
}

/**
 * Detects Fastify route-object form:
 *   fastify.route({ method: 'GET', url: '/x', handler: fn })
 */
function detectFastifyRouteObject(parsed: ParsedFile, out: RouteEntry[]): void {
  walk(parsed.ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = (node as { callee?: AstNode }).callee;
    if (!callee || callee.type !== 'MemberExpression') return;
    if (nodeName(callee) !== 'route') return;
    const args = ((node as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
    if (args.length !== 1 || args[0]?.type !== 'ObjectExpression') return;
    const props = ((args[0] as { properties?: AstNode[] }).properties ?? []) as AstNode[];
    let method: HttpMethod | null = null;
    let path: string | null = null;
    const middleware: string[] = [];
    for (const p of props) {
      if (p.type !== 'Property') continue;
      const key = (p as { key?: AstNode }).key;
      const value = (p as { value?: AstNode }).value;
      const keyName =
        key?.type === 'Identifier'
          ? (key as { name?: string }).name
          : isStringLiteral(key)
            ? (key as { value: string }).value
            : null;
      if (!keyName) continue;
      if (keyName === 'method' && isStringLiteral(value)) {
        method = (value as { value: string }).value.toUpperCase() as HttpMethod;
      } else if (keyName === 'url' && isStringLiteral(value)) {
        path = (value as { value: string }).value;
      } else if (keyName === 'handler') {
        const n = nodeName(value);
        if (n) middleware.push(n);
      } else if (keyName === 'preHandler' || keyName === 'onRequest') {
        if (value?.type === 'ArrayExpression') {
          for (const el of ((value as { elements?: AstNode[] }).elements ?? [])) {
            const n = nodeName(el);
            if (n) middleware.push(n);
          }
        } else {
          const n = nodeName(value);
          if (n) middleware.push(n);
        }
      }
    }
    if (method && path) {
      out.push({
        path,
        method,
        handler_file: parsed.path,
        middleware_chain: middleware,
        source: 'fastify',
      });
    }
  });
}

/**
 * Detects Next.js App Router handlers. We go by file path + exported handler
 * names rather than imports — App Router conventions are stable.
 *
 * @param repoRoot used to compute the route path from the file location
 */
function detectNextAppRoutes(parsed: ParsedFile, repoRoot: string, out: RouteEntry[]): void {
  const rel = relative(repoRoot, parsed.path).split(sep).join('/');
  // Match .../app/(...)?/route.(ts|tsx|js|jsx|mjs|cjs)
  if (!/(^|\/)app\/.*route\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) return;

  // Derive route path: strip leading app/, trailing /route.<ext>, and
  // parenthesized group segments like (marketing). Convert [slug] → :slug for readability.
  let routePath = rel
    .replace(/^.*?app\//, '/')
    .replace(/\/route\.(ts|tsx|js|jsx|mjs|cjs)$/, '')
    .split('/')
    .filter((seg) => !/^\(.*\)$/.test(seg))
    .join('/');
  if (!routePath.startsWith('/')) routePath = `/${routePath}`;
  if (routePath === '/') {
    routePath = '/';
  }

  // Scan for named exports named GET/POST/...
  walk(parsed.ast, (node) => {
    if (node.type !== 'ExportNamedDeclaration') return;
    const decl = (node as { declaration?: AstNode }).declaration;
    const specifiers = ((node as { specifiers?: AstNode[] }).specifiers ?? []) as AstNode[];

    function recordIfHandler(name: string): void {
      if (!NEXT_APP_HANDLERS.has(name)) return;
      out.push({
        path: routePath,
        method: name as HttpMethod,
        handler_file: parsed.path,
        middleware_chain: [],
        source: 'nextjs-app',
      });
    }

    if (decl) {
      if (decl.type === 'FunctionDeclaration') {
        const id = (decl as { id?: AstNode }).id;
        if (id && id.type === 'Identifier') {
          recordIfHandler(((id as { name?: string }).name ?? ''));
        }
      } else if (decl.type === 'VariableDeclaration') {
        for (const d of ((decl as { declarations?: AstNode[] }).declarations ?? []) as AstNode[]) {
          const id = (d as { id?: AstNode }).id;
          if (id && id.type === 'Identifier') {
            recordIfHandler(((id as { name?: string }).name ?? ''));
          }
        }
      }
    }
    for (const spec of specifiers) {
      const exported = (spec as { exported?: AstNode }).exported;
      if (exported && exported.type === 'Identifier') {
        recordIfHandler(((exported as { name?: string }).name ?? ''));
      }
    }
  });
}

/** Detects Next.js pages/api/** handlers — default-exported function per file. */
function detectNextPagesRoutes(parsed: ParsedFile, repoRoot: string, out: RouteEntry[]): void {
  const rel = relative(repoRoot, parsed.path).split(sep).join('/');
  if (!/(^|\/)pages\/api\/.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) return;
  // index.ts maps to route = folder
  let routePath = rel
    .replace(/^.*?pages\/api/, '')
    .replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
  if (routePath.endsWith('/index')) routePath = routePath.slice(0, -'/index'.length);
  if (!routePath.startsWith('/')) routePath = `/${routePath}` || '/';
  if (routePath === '') routePath = '/';
  routePath = `/api${routePath}`;

  // Look for a default export — ExportDefaultDeclaration
  let hasDefault = false;
  walk(parsed.ast, (node) => {
    if (node.type === 'ExportDefaultDeclaration') {
      hasDefault = true;
      return false;
    }
    return;
  });
  if (hasDefault) {
    out.push({
      path: routePath,
      method: 'ALL',
      handler_file: parsed.path,
      middleware_chain: [],
      source: 'nextjs-pages',
    });
  }
}

export interface RouteInventoryInput {
  repoRoot: string;
  files: ParsedFile[];
  /** Detected frameworks give us an attribution hint for sugar-style calls. */
  detectedBackends?: Array<'express' | 'fastify' | 'hono' | 'firebase-functions'>;
  detectedFrontends?: Array<string>;
}

export function extractRoutes(input: RouteInventoryInput): RouteEntry[] {
  const results: RouteEntry[] = [];
  const hasNext = (input.detectedFrontends ?? []).includes('next');

  // Prefer the first listed backend for attribution when multiple match. If none,
  // fall back to express (historically most common).
  const backend =
    input.detectedBackends && input.detectedBackends.length > 0
      ? input.detectedBackends[0]
      : 'express';
  const sugarAttribution: 'express' | 'fastify' | 'hono' =
    backend === 'fastify' || backend === 'hono' ? backend : 'express';

  for (const parsed of input.files) {
    // Only attempt route detection on .ts/.js/.mjs/.cjs files, not on .tsx/.jsx
    // (those are almost always components). But Next.js App Router uses .ts in
    // route.ts so we allow .ts/.js/.mjs/.cjs unconditionally.
    const ext = parsed.extension;
    if (ext === '.tsx' || ext === '.jsx') {
      // Still allow nextjs-app/pages detection — App Router can use .tsx
      if (hasNext) {
        detectNextAppRoutes(parsed, input.repoRoot, results);
        detectNextPagesRoutes(parsed, input.repoRoot, results);
      }
      continue;
    }

    detectSugarRoutes(parsed, sugarAttribution, results);
    // Fastify route-object is a specialized form; run it regardless of
    // attribution hint so a mixed-backend app still gets correctly labelled.
    detectFastifyRouteObject(parsed, results);

    if (hasNext) {
      detectNextAppRoutes(parsed, input.repoRoot, results);
      detectNextPagesRoutes(parsed, input.repoRoot, results);
    }
  }

  return results;
}

/** Utility used by the scanner index — resolves a file-basename for debugging. */
export function routeFileLabel(filePath: string): string {
  return `${basename(dirname(filePath))}/${basename(filePath)}`;
}
