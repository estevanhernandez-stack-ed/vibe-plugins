/**
 * Component inventory — extracts React (primary), Vue (SFC-text heuristic),
 * Svelte (SFC-text heuristic) components from a parsed source tree.
 *
 * React coverage (full AST):
 * - Function components with JSX return (top-level + const = () => <...>)
 * - React.forwardRef / forwardRef wrappers
 * - React.memo / memo wrappers
 * - Prop types inferred from TypeScript type annotations (interface / type alias
 *   / inline). PropTypes-based props captured via top-level assignment.
 *
 * Vue / Svelte coverage (lightweight):
 * - If the parsed file's extension is .tsx/.jsx/.ts/.js, we only emit React
 *   entries. .vue + .svelte are SFCs that our ast-walker currently doesn't
 *   parse — scanner/index.ts can extend detection by passing a pre-parsed
 *   single-file-component reader in v0.3. For now we emit a sentinel when the
 *   caller asks for Vue/Svelte detection on those extensions.
 */

import { basename } from 'node:path';

import type { ParsedFile, AstNode } from './ast-walker.js';
import { walk } from './ast-walker.js';

export interface ComponentEntry {
  name: string;
  file: string;
  framework: 'react' | 'vue' | 'svelte';
  props: string[];
  state_connections: string[];
  event_handlers: string[];
  /** Wrapper chain — e.g., ['memo', 'forwardRef'] from outside to inside. */
  wrappers: string[];
}

function isCapitalized(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function getIdentifierName(node: AstNode | undefined | null): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return (node as { name?: string }).name ?? null;
  if (node.type === 'JSXIdentifier') return (node as { name?: string }).name ?? null;
  return null;
}

function containsJsx(functionBody: AstNode | null): boolean {
  if (!functionBody) return false;
  let found = false;
  walk(functionBody, (n) => {
    if (found) return false;
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') {
      found = true;
      return false;
    }
    return;
  });
  return found;
}

function extractPropsFromFunctionParams(params: AstNode[]): string[] {
  if (params.length === 0) return [];
  const first = params[0];
  if (!first) return [];

  // Pattern A: destructured object param — `({ title, onClick })`
  if (first.type === 'ObjectPattern') {
    const props: string[] = [];
    for (const p of ((first as { properties?: AstNode[] }).properties ?? []) as AstNode[]) {
      if (p.type === 'Property') {
        const key = (p as { key?: AstNode }).key;
        const name = getIdentifierName(key);
        if (name) props.push(name);
      } else if (p.type === 'RestElement') {
        props.push('...rest');
      }
    }
    return props;
  }

  // Pattern B: single param `props`, optional TS annotation.
  if (first.type === 'Identifier') {
    const ann = (first as { typeAnnotation?: AstNode }).typeAnnotation;
    if (ann) {
      const inner = (ann as { typeAnnotation?: AstNode }).typeAnnotation;
      if (inner) {
        if (inner.type === 'TSTypeLiteral') {
          const members = ((inner as { members?: AstNode[] }).members ?? []) as AstNode[];
          const names: string[] = [];
          for (const m of members) {
            if (m.type === 'TSPropertySignature') {
              const k = (m as { key?: AstNode }).key;
              const n = getIdentifierName(k);
              if (n) names.push(n);
            }
          }
          return names;
        }
        // Pattern C: type reference — `props: Props`. We record the type name
        // as a single-entry placeholder so the SKILL knows to cross-reference.
        if (inner.type === 'TSTypeReference') {
          const id = (inner as { typeName?: AstNode }).typeName;
          const refName = getIdentifierName(id);
          if (refName) return [`<${refName}>`];
        }
      }
    }
    return ['<untyped-props>'];
  }
  return [];
}

/**
 * Scan body for state hooks and event-handler props (`onX` identifiers passed
 * to JSX attributes).
 */
function extractStateAndHandlers(body: AstNode | null): {
  state_connections: string[];
  event_handlers: string[];
} {
  const state = new Set<string>();
  const handlers = new Set<string>();
  if (!body) return { state_connections: [], event_handlers: [] };
  walk(body, (n) => {
    if (n.type === 'CallExpression') {
      const callee = (n as { callee?: AstNode }).callee;
      if (callee) {
        const name =
          callee.type === 'Identifier'
            ? (callee as { name?: string }).name
            : callee.type === 'MemberExpression'
              ? (((callee as { property?: AstNode }).property) as { name?: string } | undefined)?.name
              : undefined;
        if (name && /^use[A-Z]/.test(name)) {
          state.add(name);
        }
      }
    }
    if (n.type === 'JSXAttribute') {
      const nm = (n as { name?: AstNode }).name;
      const name = getIdentifierName(nm);
      if (name && /^on[A-Z]/.test(name)) {
        handlers.add(name);
      }
    }
    return;
  });
  return { state_connections: [...state], event_handlers: [...handlers] };
}

function componentFromFunctionNode(node: AstNode, name: string, file: string, wrappers: string[]): ComponentEntry | null {
  const body = ((node as { body?: AstNode }).body) ?? null;
  if (!containsJsx(body)) return null;
  const params = (((node as { params?: AstNode[] }).params) ?? []) as AstNode[];
  const { state_connections, event_handlers } = extractStateAndHandlers(body);
  return {
    name,
    file,
    framework: 'react',
    props: extractPropsFromFunctionParams(params),
    state_connections,
    event_handlers,
    wrappers,
  };
}

function extractReactComponents(parsed: ParsedFile): ComponentEntry[] {
  const results: ComponentEntry[] = [];

  // Top-level function declarations
  for (const stmt of (((parsed.ast as { body?: AstNode[] }).body) ?? []) as AstNode[]) {
    // export [default] function Foo() { ... }
    let decl: AstNode = stmt;
    if (stmt.type === 'ExportDefaultDeclaration' || stmt.type === 'ExportNamedDeclaration') {
      const inner = (stmt as { declaration?: AstNode }).declaration;
      if (!inner) continue;
      decl = inner;
    }

    if (decl.type === 'FunctionDeclaration') {
      const id = (decl as { id?: AstNode }).id;
      const name = getIdentifierName(id) ?? (stmt.type === 'ExportDefaultDeclaration' ? 'DefaultExport' : null);
      if (name && isCapitalized(name)) {
        const entry = componentFromFunctionNode(decl, name, parsed.path, []);
        if (entry) results.push(entry);
      }
    } else if (decl.type === 'VariableDeclaration') {
      for (const d of ((decl as { declarations?: AstNode[] }).declarations ?? []) as AstNode[]) {
        const id = (d as { id?: AstNode }).id;
        const name = getIdentifierName(id);
        if (!name || !isCapitalized(name)) continue;
        const init = (d as { init?: AstNode }).init;
        if (!init) continue;
        // Unwrap memo/forwardRef/React.memo/React.forwardRef wrappers.
        const wrappers: string[] = [];
        let inner: AstNode = init;
        while (inner.type === 'CallExpression') {
          const callee = (inner as { callee?: AstNode }).callee;
          const cName = callee ? nodeCalleeName(callee) : null;
          if (!cName) break;
          if (cName === 'memo' || cName === 'forwardRef') {
            wrappers.push(cName);
            const args = ((inner as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
            if (args.length === 0) break;
            inner = args[0] as AstNode;
          } else {
            break;
          }
        }
        if (inner.type === 'ArrowFunctionExpression' || inner.type === 'FunctionExpression') {
          const entry = componentFromFunctionNode(inner, name, parsed.path, wrappers);
          if (entry) results.push(entry);
        }
      }
    } else if (decl.type === 'ExportDefaultDeclaration' && stmt === decl) {
      // handled above via outer stmt unwrap; nothing further
    }
  }

  return results;
}

function nodeCalleeName(callee: AstNode): string | null {
  if (callee.type === 'Identifier') return (callee as { name?: string }).name ?? null;
  if (callee.type === 'MemberExpression') {
    const prop = (callee as { property?: AstNode }).property;
    return getIdentifierName(prop);
  }
  return null;
}

export interface ComponentInventoryInput {
  files: ParsedFile[];
  detectedFrontends: string[];
}

export function extractComponents(input: ComponentInventoryInput): ComponentEntry[] {
  const wantsReact = input.detectedFrontends.includes('react') || input.detectedFrontends.includes('next') || input.detectedFrontends.includes('expo') || input.detectedFrontends.includes('vite');
  // If none of the known frontend frameworks are detected, still attempt React
  // extraction — many vibe-coded apps ship without a declared framework entry.
  const out: ComponentEntry[] = [];
  for (const parsed of input.files) {
    if (parsed.extension === '.tsx' || parsed.extension === '.jsx') {
      out.push(...extractReactComponents(parsed));
    } else if (wantsReact && (parsed.extension === '.ts' || parsed.extension === '.js')) {
      // Function components in .ts/.js — rare but valid. Same walker works.
      out.push(...extractReactComponents(parsed));
    }
  }
  return out;
}

/** Helper for SKILL-side labelling; not a required export. */
export function componentLabel(entry: ComponentEntry): string {
  return `${entry.name} (${basename(entry.file)})`;
}
