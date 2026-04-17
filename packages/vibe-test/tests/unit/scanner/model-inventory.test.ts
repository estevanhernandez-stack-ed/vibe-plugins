import { describe, it, expect } from 'vitest';

import { parseSource } from '../../../src/scanner/ast-walker.js';
import {
  extractModels,
  extractFromPrismaSchema,
  extractFromSqlText,
} from '../../../src/scanner/model-inventory.js';

describe('model-inventory', () => {
  it('extracts a zod object schema with optional fields', () => {
    const source = `
      import { z } from 'zod';
      export const User = z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().optional(),
      });
    `;
    const parsed = parseSource(source, '/virtual/models.ts');
    const out = extractModels({ files: [parsed] });
    expect(out).toHaveLength(1);
    const [m] = out;
    expect(m?.name).toBe('User');
    expect(m?.source).toBe('zod');
    const names = m?.fields.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['id', 'email', 'name']));
    const nameField = m?.fields.find((f) => f.name === 'name');
    expect(nameField?.nullable).toBe(true);
  });

  it('parses prisma schema text for models + relationships', () => {
    const schema = `
      model User {
        id    String  @id
        email String  @unique
        posts Post[]
      }

      model Post {
        id      String @id
        title   String
        authorId String
        author  User   @relation(fields: [authorId], references: [id])
      }
    `;
    const models = extractFromPrismaSchema(schema, '/virtual/schema.prisma');
    expect(models).toHaveLength(2);
    const user = models.find((m) => m.name === 'User');
    expect(user?.fields.map((f) => f.name)).toEqual(expect.arrayContaining(['id', 'email', 'posts']));
    expect(user?.relationships.length).toBeGreaterThan(0);
  });

  it('parses raw SQL CREATE TABLE blocks', () => {
    const sql = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const models = extractFromSqlText(sql, '/virtual/schema.sql');
    expect(models).toHaveLength(1);
    const [m] = models;
    expect(m?.name).toBe('users');
    const emailField = m?.fields.find((f) => f.name === 'email');
    expect(emailField?.nullable).toBe(false);
  });
});
