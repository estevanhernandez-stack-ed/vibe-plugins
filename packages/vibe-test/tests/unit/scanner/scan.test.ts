import { describe, it, expect } from 'vitest';
import { join, resolve } from 'node:path';

import { scan } from '../../../src/scanner/index.js';

const FIXTURE_ROOT = resolve(__dirname, '../../fixtures/minimal-spa');

describe('scan(minimal-spa fixture)', () => {
  it('produces a well-formed Inventory', async () => {
    const inv = await scan(FIXTURE_ROOT);
    expect(inv.schema_version).toBe(1);
    expect(inv.root).toBe(FIXTURE_ROOT);
    expect(inv.scope).toBeNull();

    // Framework detection.
    expect(inv.detection.frontend).toContain('react');
    expect(inv.detection.frontend).toContain('vite');
    expect(inv.test_frameworks).toContain('vitest');

    // Components.
    const componentNames = inv.components.map((c) => c.name);
    expect(componentNames).toEqual(expect.arrayContaining(['App', 'BadgeManagerImpl']));

    // Models — zod User + Badge.
    const modelNames = inv.models.map((m) => m.name);
    expect(modelNames).toEqual(expect.arrayContaining(['User', 'Badge']));

    // Integrations — the minimal-spa fixture is intentionally dependency-lean
    // (no stripe/firebase/etc.), so we only assert the scanner ran cleanly.
    expect(Array.isArray(inv.integrations)).toBe(true);

    // Routes — simulated Express sugar in src/api/routes.ts.
    expect(inv.routes.length).toBeGreaterThanOrEqual(2);

    // Parse errors — fixture should parse cleanly.
    expect(inv.parse_errors).toEqual([]);
  });

  it('honors a scope glob', async () => {
    const inv = await scan(FIXTURE_ROOT, 'src/BadgeManager.tsx');
    // Only BadgeManager should be in scanned files.
    const relScanned = inv.scanned_files.map((p) => p.replace(FIXTURE_ROOT, '').replace(/\\/g, '/').replace(/^\//, ''));
    expect(relScanned).toEqual(['src/BadgeManager.tsx']);
    expect(inv.components.map((c) => c.name)).toEqual(['BadgeManagerImpl']);
  });
});
