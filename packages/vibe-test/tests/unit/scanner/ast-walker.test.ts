import { describe, it, expect } from 'vitest';

import { parseSource, walk, SUPPORTED_EXTENSIONS, isSupportedExtension } from '../../../src/scanner/ast-walker.js';

describe('ast-walker', () => {
  it('parses a .tsx file and exposes a Program root', () => {
    const source = `
      import { useState } from 'react';
      export function App() {
        const [n, setN] = useState(0);
        return <div>{n}</div>;
      }
    `;
    const parsed = parseSource(source, '/virtual/App.tsx');
    expect(parsed.extension).toBe('.tsx');
    expect(parsed.ast.type).toBe('Program');
    expect(Array.isArray((parsed.ast as unknown as { body: unknown[] }).body)).toBe(true);
  });

  it('walks the tree pre-order and stops descent when visitor returns false', () => {
    const source = `const x = { a: 1, b: { c: 2 } };`;
    const parsed = parseSource(source, '/virtual/x.ts');
    const types: string[] = [];
    walk(parsed.ast, (node) => {
      types.push(node.type);
      if (node.type === 'ObjectExpression') return false;
      return;
    });
    // Should include Program, VariableDeclaration, etc., but NOT descend into Properties.
    expect(types).toContain('Program');
    expect(types).toContain('ObjectExpression');
    expect(types).not.toContain('Property');
  });

  it('supports the declared extension list', () => {
    expect(SUPPORTED_EXTENSIONS).toEqual(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
    expect(isSupportedExtension('.ts')).toBe(true);
    expect(isSupportedExtension('.py')).toBe(false);
  });

  it('throws an AstWalkerError on unsupported extension', () => {
    expect(() => parseSource('x', '/virtual/x.py')).toThrow(/Unsupported extension/);
  });
});
