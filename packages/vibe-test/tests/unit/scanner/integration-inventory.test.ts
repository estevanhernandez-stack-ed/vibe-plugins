import { describe, it, expect } from 'vitest';

import { parseSource } from '../../../src/scanner/ast-walker.js';
import { extractIntegrations } from '../../../src/scanner/integration-inventory.js';

describe('integration-inventory', () => {
  it('detects stripe via import + package dep', () => {
    const source = `
      import Stripe from 'stripe';
      const client = new Stripe(process.env.STRIPE_KEY);
      export function createSession() {
        return client.checkout.sessions.create({ line_items: [] });
      }
    `;
    const parsed = parseSource(source, '/virtual/checkout.ts');
    const out = extractIntegrations({
      files: [parsed],
      dependencies: { stripe: '^14.0.0' },
    });
    const stripe = out.find((e) => e.provider === 'stripe');
    expect(stripe).toBeTruthy();
    expect(stripe?.type).toBe('payment');
    expect(stripe?.config_hints.join(' ')).toMatch(/stripe/);
  });

  it('detects firebase from firestore import', () => {
    const source = `
      import { getFirestore } from 'firebase/firestore';
      export const db = getFirestore();
    `;
    const parsed = parseSource(source, '/virtual/db.ts');
    const out = extractIntegrations({
      files: [parsed],
      dependencies: { firebase: '^10.0.0' },
    });
    const fb = out.find((e) => e.provider === 'firebase');
    expect(fb).toBeTruthy();
  });

  it('detects sentry when @sentry/node is imported', () => {
    const source = `
      import * as Sentry from '@sentry/node';
      Sentry.init({ dsn: 'x' });
    `;
    const parsed = parseSource(source, '/virtual/telemetry.ts');
    const out = extractIntegrations({ files: [parsed], dependencies: {} });
    expect(out.some((e) => e.provider === 'sentry')).toBe(true);
  });

  it('returns an empty list when no integrations present', () => {
    const source = `export const x = 1;`;
    const parsed = parseSource(source, '/virtual/x.ts');
    const out = extractIntegrations({ files: [parsed], dependencies: {} });
    expect(out).toEqual([]);
  });
});
