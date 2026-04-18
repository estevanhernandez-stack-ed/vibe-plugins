/**
 * `.github/workflows/vibe-test-gate.yml` writer — Builder-Sustainable Handoff (PRD H4).
 *
 * Opt-in only: the `consent` argument must be `true` to write. When `false`,
 * the writer returns the would-be file content as a string so the SKILL can
 * show the builder a preview before they commit.
 *
 * Env-var integration: item #7 (generate SKILL) owns the env-var scanner.
 * For now this writer accepts a `detectedEnvVars: string[]` argument and
 * renders them as placeholders in the YAML `env:` block. The scanner can be
 * wired in later without a writer-shape change.
 */
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

import { atomicWrite } from '../state/atomic-write.js';
import { loadTemplate, substitute } from './template-loader.js';

export interface CiStubPayload {
  /** Env var names detected from the project source (via env-var-scanner). */
  detectedEnvVars: string[];
  /**
   * Install command for the project. The writer picks a sensible default
   * based on a `packageManager` hint: `pnpm install --frozen-lockfile` for
   * pnpm, `npm ci` for npm (default), `yarn install --frozen-lockfile` for yarn.
   */
  packageManager?: 'npm' | 'pnpm' | 'yarn';
}

export type CiStubWriteResult =
  | {
      wrote: true;
      path: string;
      content: string;
    }
  | {
      wrote: false;
      path: string;
      content: string;
      reason: 'consent-denied' | 'already-exists';
    };

/**
 * Write the CI stub, or — when `consent: false` — return the would-be content
 * without writing.
 *
 * Never overwrites an existing `vibe-test-gate.yml`: if the file already
 * exists, returns `{wrote: false, reason: 'already-exists'}` even when
 * consent is true. Re-authoring the file is a deliberate builder action (they
 * can delete it and re-run).
 */
export async function writeCiStub(
  targetRoot: string,
  payload: CiStubPayload,
  options: { consent: boolean },
): Promise<CiStubWriteResult> {
  const path = join(targetRoot, '.github', 'workflows', 'vibe-test-gate.yml');
  const content = await renderCiStub(payload);

  if (!options.consent) {
    return { wrote: false, path, content, reason: 'consent-denied' };
  }

  // Don't clobber an existing stub.
  try {
    await fs.access(path);
    return { wrote: false, path, content, reason: 'already-exists' };
  } catch {
    // File doesn't exist — proceed.
  }

  await fs.mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, content);
  return { wrote: true, path, content };
}

/** Pure render — exposed so SKILL can preview the content without filesystem side effects. */
export async function renderCiStub(payload: CiStubPayload): Promise<string> {
  const template = await loadTemplate('ci-stub.yml.template');
  const installStep = renderInstallStep(payload.packageManager ?? 'npm');
  const envBlock = renderEnvBlock(payload.detectedEnvVars);
  return substitute(template, {
    install_step: installStep,
    env_vars: envBlock,
  });
}

function renderInstallStep(pm: 'npm' | 'pnpm' | 'yarn'): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm install --frozen-lockfile';
    case 'yarn':
      return 'yarn install --frozen-lockfile';
    case 'npm':
    default:
      return 'npm ci';
  }
}

function renderEnvBlock(envVars: string[]): string {
  if (envVars.length === 0) {
    return '          # No env vars detected. Set real values via repo secrets if/when added.';
  }
  const lines: string[] = [];
  lines.push('          # Set real values via repo secrets');
  for (const name of envVars) {
    // YAML indent: 10 spaces matches `        env:` at 8 spaces + 2 under.
    lines.push(`          ${name}: \${{ secrets.${name} }}`);
  }
  return lines.join('\n');
}
