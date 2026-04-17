import { describe, it, expect } from 'vitest';

import { parseSource } from '../../../src/scanner/ast-walker.js';
import { extractComponents } from '../../../src/scanner/component-inventory.js';

describe('component-inventory', () => {
  it('extracts a React function component with destructured props', () => {
    const source = `
      export function Widget({ title, onClick }) {
        return <div onClick={onClick}>{title}</div>;
      }
    `;
    const parsed = parseSource(source, '/virtual/Widget.tsx');
    const out = extractComponents({ files: [parsed], detectedFrontends: ['react'] });
    expect(out).toHaveLength(1);
    const [w] = out;
    expect(w?.name).toBe('Widget');
    expect(w?.props).toEqual(expect.arrayContaining(['title', 'onClick']));
    expect(w?.event_handlers).toContain('onClick');
  });

  it('unwraps memo + forwardRef wrappers', () => {
    const source = `
      const Inner = memo(({ label }) => <span>{label}</span>);
      export const Wrapped = forwardRef(Inner);
    `;
    const parsed = parseSource(source, '/virtual/Wrapped.tsx');
    const out = extractComponents({ files: [parsed], detectedFrontends: ['react'] });
    // Inner is the component with the actual JSX; we expect it to be found.
    const names = out.map((c) => c.name);
    expect(names).toContain('Inner');
  });

  it('extracts state hooks from the body', () => {
    const source = `
      import { useState, useEffect } from 'react';
      export function Counter() {
        const [n, setN] = useState(0);
        useEffect(() => {}, []);
        return <button>{n}</button>;
      }
    `;
    const parsed = parseSource(source, '/virtual/Counter.tsx');
    const [comp] = extractComponents({ files: [parsed], detectedFrontends: ['react'] });
    expect(comp?.state_connections).toEqual(expect.arrayContaining(['useState', 'useEffect']));
  });

  it('skips non-component functions (lowercase)', () => {
    const source = `
      export function helper(x) { return x + 1; }
      export function Widget() { return <div/>; }
    `;
    const parsed = parseSource(source, '/virtual/mixed.tsx');
    const out = extractComponents({ files: [parsed], detectedFrontends: ['react'] });
    expect(out.map((c) => c.name)).toEqual(['Widget']);
  });
});
