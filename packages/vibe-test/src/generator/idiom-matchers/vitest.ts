/**
 * Vitest idiom-matcher — framework-specific test-file fragments the SKILL
 * composes into candidate tests at generation time.
 *
 * These are NOT drop-in generated tests. They're idiom templates the SKILL
 * pattern-matches against 2-3 similar existing tests in the repo, then adapts
 * to the code-under-test via SKILL reasoning. Exporting shapes rather than
 * strings lets the SKILL fill in:
 *   - import path + component / function name
 *   - expected behavior + example inputs
 *   - fixture-shape hints
 *
 * All fragments use the vitest `expect` API, `describe`/`it` structure, and
 * `@testing-library/react` when a component target is specified (most SPA
 * tests). The fragments are deliberately concise — a 5-line smoke test is
 * better than a 20-line "everything bagel" template the SKILL has to trim.
 */

import type { IdiomMatcher, IdiomRenderInput, IdiomTemplate } from './index.js';

const SMOKE: IdiomTemplate = {
  level: 'smoke',
  description: 'Basic render — does the target export/mount without throwing?',
  render: ({ subject_import_path, subject_name, subject_kind }) => {
    if (subject_kind === 'component') {
      return [
        `import { describe, it, expect } from 'vitest';`,
        `import { render } from '@testing-library/react';`,
        `import { ${subject_name} } from '${subject_import_path}';`,
        ``,
        `describe('${subject_name}', () => {`,
        `  it('renders without crashing', () => {`,
        `    const { container } = render(<${subject_name} />);`,
        `    expect(container).toBeTruthy();`,
        `  });`,
        `});`,
        '',
      ].join('\n');
    }
    // Default: function / module smoke — call with no args, expect non-throw.
    return [
      `import { describe, it, expect } from 'vitest';`,
      `import { ${subject_name} } from '${subject_import_path}';`,
      ``,
      `describe('${subject_name}', () => {`,
      `  it('is defined', () => {`,
      `    expect(${subject_name}).toBeDefined();`,
      `  });`,
      `});`,
      '',
    ].join('\n');
  },
};

const BEHAVIORAL: IdiomTemplate = {
  level: 'behavioral',
  description: 'User-facing behavior — click / event / state-change assertion.',
  render: ({ subject_import_path, subject_name, subject_kind, behavior_hint }) => {
    const hint = behavior_hint ?? 'responds to user interaction';
    if (subject_kind === 'component') {
      return [
        `import { describe, it, expect } from 'vitest';`,
        `import { render, screen } from '@testing-library/react';`,
        `import userEvent from '@testing-library/user-event';`,
        `import { ${subject_name} } from '${subject_import_path}';`,
        ``,
        `describe('${subject_name}', () => {`,
        `  it('${hint}', async () => {`,
        `    const user = userEvent.setup();`,
        `    render(<${subject_name} />);`,
        `    // TODO: drive interaction, assert on screen query`,
        `    expect(screen).toBeTruthy();`,
        `  });`,
        `});`,
        '',
      ].join('\n');
    }
    return [
      `import { describe, it, expect } from 'vitest';`,
      `import { ${subject_name} } from '${subject_import_path}';`,
      ``,
      `describe('${subject_name}', () => {`,
      `  it('${hint}', () => {`,
      `    // TODO: call with representative input, assert on result`,
      `    expect(${subject_name}).toBeDefined();`,
      `  });`,
      `});`,
      '',
    ].join('\n');
  },
};

const EDGE: IdiomTemplate = {
  level: 'edge',
  description: 'Boundary / error-path — empty, max, invalid inputs.',
  render: ({ subject_import_path, subject_name, subject_kind }) => {
    return [
      `import { describe, it, expect } from 'vitest';`,
      `import { ${subject_name} } from '${subject_import_path}';`,
      ``,
      `describe('${subject_name} — edges', () => {`,
      `  it('handles empty input', () => {`,
      `    // TODO: call with empty / null / undefined, assert graceful handling`,
      `    expect(${subject_name}).toBeDefined();`,
      `  });`,
      `  it('handles max-boundary input', () => {`,
      `    // TODO: call with max-sized input, assert no throw / correct truncation`,
      `    expect(${subject_kind === 'component' ? 'true' : `${subject_name}`}).toBeTruthy();`,
      `  });`,
      `});`,
      '',
    ].join('\n');
  },
};

const INTEGRATION: IdiomTemplate = {
  level: 'integration',
  description: 'Integration — mocked fetch / API / third-party.',
  render: ({ subject_import_path, subject_name }) => {
    return [
      `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`,
      `import { ${subject_name} } from '${subject_import_path}';`,
      ``,
      `describe('${subject_name} — integration', () => {`,
      `  beforeEach(() => {`,
      `    vi.spyOn(globalThis, 'fetch').mockResolvedValue(`,
      `      new Response(JSON.stringify({ ok: true }), { status: 200 }),`,
      `    );`,
      `  });`,
      `  afterEach(() => {`,
      `    vi.restoreAllMocks();`,
      `  });`,
      `  it('makes the expected request and handles the response', async () => {`,
      `    // TODO: invoke ${subject_name}, assert on mock call args + resolved value`,
      `    expect(globalThis.fetch).toBeDefined();`,
      `  });`,
      `});`,
      '',
    ].join('\n');
  },
};

export const vitestMatcher: IdiomMatcher = {
  framework: 'vitest',
  templates: {
    smoke: SMOKE,
    behavioral: BEHAVIORAL,
    edge: EDGE,
    integration: INTEGRATION,
  },
  /**
   * Header comment written at the top of every auto-written test per PRD G2.
   * SKILL fills in `plugin_version`, `iso_date`, `confidence`, `finding_id`.
   */
  renderHeader(input: IdiomRenderInput & {
    plugin_version: string;
    iso_date: string;
    confidence_label: 'HIGH' | 'MEDIUM' | 'LOW';
    finding_id: string;
  }): string {
    return [
      `// Generated by Vibe Test v${input.plugin_version} on ${input.iso_date}.`,
      `// Confidence: ${input.confidence_label}. Audit finding: ${input.finding_id}.`,
      '',
    ].join('\n');
  },
};
