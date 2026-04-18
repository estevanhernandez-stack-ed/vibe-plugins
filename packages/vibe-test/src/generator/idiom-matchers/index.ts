/**
 * Idiom-matchers barrel — returns the framework-specific template bundle the
 * generate SKILL consumes at candidate-composition time.
 *
 * Add a new framework: create `<name>.ts` exporting an `IdiomMatcher`, then add
 * it to `MATCHERS` below. See `README.md` in this directory for the full
 * contributor guide.
 */

export type TestLevel = 'smoke' | 'behavioral' | 'edge' | 'integration';

export type SubjectKind = 'component' | 'function' | 'route' | 'module';

export interface IdiomRenderInput {
  /** Import path as it would appear in the generated test file. */
  subject_import_path: string;
  /** Bare name of the symbol being tested. */
  subject_name: string;
  /** Semantic kind — used to pick rendering (component vs function). */
  subject_kind: SubjectKind;
  /**
   * Optional — SKILL-authored behavioral description for the `it()` title.
   * Example: `"opens the drawer when clicked"`. Defaults to a generic phrase.
   */
  behavior_hint?: string;
}

export interface IdiomTemplate {
  level: TestLevel;
  description: string;
  render: (input: IdiomRenderInput) => string;
}

export interface IdiomMatcher {
  framework: 'vitest' | 'jest';
  templates: Record<TestLevel, IdiomTemplate>;
  /**
   * Header comment attached to auto-written tests per PRD G2.
   */
  renderHeader: (
    input: IdiomRenderInput & {
      plugin_version: string;
      iso_date: string;
      confidence_label: 'HIGH' | 'MEDIUM' | 'LOW';
      finding_id: string;
    },
  ) => string;
}

// Deferred imports so the barrel can be tree-shaken per-framework.
import { vitestMatcher } from './vitest.js';
import { jestMatcher } from './jest.js';

const MATCHERS: Record<string, IdiomMatcher> = {
  vitest: vitestMatcher,
  jest: jestMatcher,
};

/**
 * Return the idiom matcher for the detected framework. Defaults to `vitest`
 * when the framework name isn't recognized — vitest is the house standard and
 * the least surprising fallback.
 */
export function getIdiomMatcher(framework: string | null | undefined): IdiomMatcher {
  if (!framework) return vitestMatcher;
  const key = framework.toLowerCase();
  return MATCHERS[key] ?? vitestMatcher;
}

export { vitestMatcher, jestMatcher };
