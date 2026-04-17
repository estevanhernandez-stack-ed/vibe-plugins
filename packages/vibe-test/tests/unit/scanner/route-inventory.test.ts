import { describe, it, expect } from 'vitest';

import { parseSource } from '../../../src/scanner/ast-walker.js';
import { extractRoutes } from '../../../src/scanner/route-inventory.js';

describe('route-inventory', () => {
  it('detects Express sugar routes', () => {
    const source = `
      app.get('/api/health', healthHandler);
      app.post('/api/users', authMiddleware, createUser);
    `;
    const parsed = parseSource(source, '/virtual/routes.ts');
    const out = extractRoutes({
      repoRoot: '/virtual',
      files: [parsed],
      detectedBackends: ['express'],
      detectedFrontends: [],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ method: 'GET', path: '/api/health' });
    expect(out[1]).toMatchObject({ method: 'POST', path: '/api/users' });
    expect(out[1]?.middleware_chain).toContain('authMiddleware');
    expect(out[1]?.middleware_chain).toContain('createUser');
  });

  it('detects Fastify route-object form', () => {
    const source = `
      fastify.route({
        method: 'PUT',
        url: '/widgets/:id',
        handler: updateWidget,
        preHandler: [requireAuth]
      });
    `;
    const parsed = parseSource(source, '/virtual/fastify-routes.ts');
    const out = extractRoutes({
      repoRoot: '/virtual',
      files: [parsed],
      detectedBackends: ['fastify'],
      detectedFrontends: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ method: 'PUT', path: '/widgets/:id' });
  });

  it('detects Next.js App Router handlers', () => {
    const source = `
      export async function GET(request) { return new Response('ok'); }
      export async function POST(request) { return new Response('ok'); }
    `;
    const parsed = parseSource(source, '/repo/app/api/posts/route.ts');
    const out = extractRoutes({
      repoRoot: '/repo',
      files: [parsed],
      detectedBackends: [],
      detectedFrontends: ['next'],
    });
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.some((r) => r.method === 'GET' && r.path === '/api/posts')).toBe(true);
    expect(out.some((r) => r.method === 'POST' && r.path === '/api/posts')).toBe(true);
  });
});
