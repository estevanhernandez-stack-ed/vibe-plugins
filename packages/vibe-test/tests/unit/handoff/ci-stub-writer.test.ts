import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { writeCiStub, renderCiStub } from '../../../src/handoff/ci-stub-writer.js';

describe('ci-stub-writer', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'vibe-test-ci-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('with consent: false returns content without writing to disk', async () => {
    const res = await writeCiStub(
      dir,
      { detectedEnvVars: ['FIREBASE_API_KEY'], packageManager: 'pnpm' },
      { consent: false },
    );
    expect(res.wrote).toBe(false);
    if (!res.wrote) {
      expect(res.reason).toBe('consent-denied');
      expect(res.content).toContain('name: vibe-test-gate');
      expect(res.content).toContain('FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}');
      expect(res.content).toContain('pnpm install --frozen-lockfile');
      expect(res.content).toContain('# Set real values via repo secrets');
    }
    // No file should have been created.
    await expect(fs.access(join(dir, '.github', 'workflows', 'vibe-test-gate.yml'))).rejects.toThrow();
  });

  it('with consent: true writes the file', async () => {
    const res = await writeCiStub(
      dir,
      { detectedEnvVars: ['API_KEY'], packageManager: 'npm' },
      { consent: true },
    );
    expect(res.wrote).toBe(true);
    const content = await fs.readFile(
      join(dir, '.github', 'workflows', 'vibe-test-gate.yml'),
      'utf8',
    );
    expect(content).toContain('npm ci');
    expect(content).toContain('API_KEY: ${{ secrets.API_KEY }}');
    expect(content).toContain('npx @esthernandez/vibe-test-cli gate --ci');
    expect(content).toContain('# How to adapt for other CI');
  });

  it('does not clobber an existing stub', async () => {
    await fs.mkdir(join(dir, '.github', 'workflows'), { recursive: true });
    const path = join(dir, '.github', 'workflows', 'vibe-test-gate.yml');
    await fs.writeFile(path, 'CUSTOM_WORKFLOW_SENTINEL', 'utf8');
    const res = await writeCiStub(dir, { detectedEnvVars: [] }, { consent: true });
    expect(res.wrote).toBe(false);
    if (!res.wrote) {
      expect(res.reason).toBe('already-exists');
    }
    const content = await fs.readFile(path, 'utf8');
    expect(content).toBe('CUSTOM_WORKFLOW_SENTINEL');
  });

  it('emits a "no env vars" comment when the list is empty', async () => {
    const content = await renderCiStub({ detectedEnvVars: [] });
    expect(content).toContain('No env vars detected.');
  });
});
