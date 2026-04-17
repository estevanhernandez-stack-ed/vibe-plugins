/**
 * Model inventory — extracts data-model definitions from common sources.
 *
 * Supported in v0.2:
 * - Zod schemas:   `const X = z.object({ field: z.string(), ... })`
 * - Yup schemas:   `const X = yup.object({ field: yup.string() })`
 * - Joi schemas:   `const X = Joi.object({ field: Joi.string() })`
 * - Prisma schema:  parses `schema.prisma` files textually (no full grammar —
 *                   extracts `model Foo { ... }` blocks + field lines)
 * - Drizzle schema: AST detection of `pgTable(name, { ... })` / `sqliteTable` /
 *                   `mysqlTable`
 * - Raw SQL:        grep-like capture of `CREATE TABLE name (...)` blocks
 */

import { promises as fs } from 'node:fs';

import type { ParsedFile, AstNode } from './ast-walker.js';
import { walk } from './ast-walker.js';

export interface ModelField {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export interface ModelRelationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one' | 'unknown';
  target_model: string;
}

export interface ModelEntry {
  name: string;
  source: 'zod' | 'yup' | 'joi' | 'prisma' | 'drizzle' | 'sql';
  file: string;
  fields: ModelField[];
  relationships: ModelRelationship[];
}

function isCallToName(node: AstNode, names: string[]): { name: string; args: AstNode[]; rootHint: string | null } | null {
  if (node.type !== 'CallExpression') return null;
  const callee = (node as { callee?: AstNode }).callee;
  if (!callee) return null;
  let name: string | null = null;
  let root: string | null = null;
  if (callee.type === 'MemberExpression') {
    const prop = (callee as { property?: AstNode }).property;
    const propName = prop && prop.type === 'Identifier' ? (prop as { name?: string }).name ?? null : null;
    const obj = (callee as { object?: AstNode }).object;
    if (obj && obj.type === 'Identifier') {
      root = (obj as { name?: string }).name ?? null;
    }
    name = propName;
  } else if (callee.type === 'Identifier') {
    name = (callee as { name?: string }).name ?? null;
  }
  if (!name || !names.includes(name)) return null;
  const args = ((node as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
  return { name, args, rootHint: root };
}

function fieldsFromObjectExpression(obj: AstNode): ModelField[] {
  if (obj.type !== 'ObjectExpression') return [];
  const fields: ModelField[] = [];
  for (const p of ((obj as { properties?: AstNode[] }).properties ?? []) as AstNode[]) {
    if (p.type !== 'Property') continue;
    const key = (p as { key?: AstNode }).key;
    const value = (p as { value?: AstNode }).value;
    const keyName =
      key?.type === 'Identifier'
        ? (key as { name?: string }).name
        : key?.type === 'Literal'
          ? String((key as { value?: unknown }).value ?? '')
          : '';
    if (!keyName) continue;
    const { type, nullable } = fieldTypeFromValue(value);
    fields.push({ name: keyName, type, nullable });
  }
  return fields;
}

function fieldTypeFromValue(value: AstNode | null | undefined): { type: string; nullable: boolean } {
  if (!value) return { type: 'unknown', nullable: true };
  // zod/yup/joi: chain of method calls ending in a base type.
  let cursor: AstNode | null = value;
  let nullable = false;
  while (cursor && cursor.type === 'CallExpression') {
    const callee: AstNode | undefined = (cursor as { callee?: AstNode }).callee;
    if (!callee) break;
    if (callee.type === 'MemberExpression') {
      const prop = (callee as { property?: AstNode }).property;
      const propName = prop && prop.type === 'Identifier' ? (prop as { name?: string }).name : undefined;
      if (propName === 'optional' || propName === 'nullable') {
        nullable = true;
      }
      cursor = ((callee as { object?: AstNode }).object) ?? null;
    } else {
      break;
    }
  }
  if (cursor && cursor.type === 'MemberExpression') {
    const prop = (cursor as { property?: AstNode }).property;
    const propName = prop && prop.type === 'Identifier' ? (prop as { name?: string }).name : undefined;
    return { type: propName ?? 'unknown', nullable };
  }
  return { type: 'unknown', nullable };
}

function extractFromValidationLibs(parsed: ParsedFile): ModelEntry[] {
  const out: ModelEntry[] = [];
  walk(parsed.ast, (node) => {
    if (node.type !== 'VariableDeclarator') return;
    const id = (node as { id?: AstNode }).id;
    if (!id || id.type !== 'Identifier') return;
    const modelName = (id as { name?: string }).name;
    if (!modelName) return;
    const init = (node as { init?: AstNode }).init;
    if (!init || init.type !== 'CallExpression') return;
    const called = isCallToName(init, ['object']);
    if (!called) return;
    const rootHint = called.rootHint ?? '';
    let source: 'zod' | 'yup' | 'joi' | null = null;
    if (rootHint === 'z' || rootHint === 'Zod') source = 'zod';
    else if (rootHint === 'yup') source = 'yup';
    else if (rootHint === 'Joi' || rootHint === 'joi') source = 'joi';
    if (!source) return;
    const arg = called.args[0];
    if (!arg) return;
    const fields = fieldsFromObjectExpression(arg);
    out.push({ name: modelName, source, file: parsed.path, fields, relationships: [] });
  });
  return out;
}

function extractFromDrizzle(parsed: ParsedFile): ModelEntry[] {
  const out: ModelEntry[] = [];
  walk(parsed.ast, (node) => {
    if (node.type !== 'VariableDeclarator') return;
    const id = (node as { id?: AstNode }).id;
    if (!id || id.type !== 'Identifier') return;
    const modelName = (id as { name?: string }).name;
    if (!modelName) return;
    const init = (node as { init?: AstNode }).init;
    if (!init || init.type !== 'CallExpression') return;
    const callee = (init as { callee?: AstNode }).callee;
    if (!callee || callee.type !== 'Identifier') return;
    const fnName = (callee as { name?: string }).name;
    if (!fnName || !/^(pgTable|sqliteTable|mysqlTable|mssqlTable)$/.test(fnName)) return;
    const args = ((init as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
    if (args.length < 2) return;
    const [, shape] = args;
    const fields = shape ? fieldsFromObjectExpression(shape) : [];
    out.push({
      name: modelName,
      source: 'drizzle',
      file: parsed.path,
      fields,
      relationships: [],
    });
  });
  return out;
}

export function extractFromPrismaSchema(content: string, filePath: string): ModelEntry[] {
  const out: ModelEntry[] = [];
  const blockRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content))) {
    const [, name, body] = match;
    if (!name || !body) continue;
    const fields: ModelField[] = [];
    const relationships: ModelRelationship[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      const m = /^(\w+)\s+(\w+)(\?)?(\[\])?/.exec(trimmed);
      if (!m) continue;
      const [, fieldName, fieldType, optionalMark, arrayMark] = m;
      if (!fieldName || !fieldType) continue;
      const nullable = !!optionalMark;
      const isArray = !!arrayMark;
      const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt']);
      if (!primitives.has(fieldType)) {
        relationships.push({
          type: isArray ? 'one-to-many' : 'one-to-one',
          target_model: fieldType,
        });
      }
      fields.push({
        name: fieldName,
        type: fieldType + (isArray ? '[]' : ''),
        nullable,
      });
    }
    out.push({ name, source: 'prisma', file: filePath, fields, relationships });
  }
  return out;
}

export function extractFromSqlText(content: string, filePath: string): ModelEntry[] {
  const out: ModelEntry[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    const [, tableName, body] = match;
    if (!tableName || !body) continue;
    const fields: ModelField[] = [];
    for (const rawLine of body.split(',')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('PRIMARY KEY') || line.startsWith('FOREIGN KEY')) continue;
      const m = /^["`]?(\w+)["`]?\s+(\w+)/.exec(line);
      if (!m) continue;
      const [, fieldName, fieldType] = m;
      if (!fieldName || !fieldType) continue;
      const nullable = !/NOT\s+NULL/i.test(line);
      const defaultMatch = /DEFAULT\s+([^\s,]+)/i.exec(line);
      const field: ModelField = {
        name: fieldName,
        type: fieldType,
        nullable,
      };
      if (defaultMatch && defaultMatch[1]) field.default = defaultMatch[1];
      fields.push(field);
    }
    out.push({ name: tableName, source: 'sql', file: filePath, fields, relationships: [] });
  }
  return out;
}

export interface ModelInventoryInput {
  files: ParsedFile[];
  textFiles?: Array<{ path: string; content: string }>;
}

export function extractModels(input: ModelInventoryInput): ModelEntry[] {
  const out: ModelEntry[] = [];
  for (const parsed of input.files) {
    out.push(...extractFromValidationLibs(parsed));
    out.push(...extractFromDrizzle(parsed));
  }
  for (const tf of input.textFiles ?? []) {
    if (tf.path.endsWith('.prisma')) {
      out.push(...extractFromPrismaSchema(tf.content, tf.path));
    } else if (tf.path.endsWith('.sql')) {
      out.push(...extractFromSqlText(tf.content, tf.path));
    }
  }
  return out;
}

export async function loadTextModelSources(
  paths: string[],
): Promise<Array<{ path: string; content: string }>> {
  const out: Array<{ path: string; content: string }> = [];
  for (const p of paths) {
    try {
      const content = await fs.readFile(p, 'utf8');
      out.push({ path: p, content });
    } catch {
      // skip
    }
  }
  return out;
}
