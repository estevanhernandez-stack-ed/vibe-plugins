/**
 * Graduating-to-Next-Tier section writer — Builder-Sustainable Handoff (PRD H5).
 *
 * Produces a TESTING.md section tailored to the current classification tier,
 * describing what would be required to advance to the next tier. Called by
 * the audit SKILL; typically consumed by `testing-md-writer.ts` as the
 * `graduating_section` payload field, but can also be written directly.
 *
 * The writer is deterministic: SKILL-authored prose is passed in; this module
 * composes it into the template at `skills/guide/templates/graduating-to-next-tier.template.md`.
 *
 * Tier transition mapping (static — no upward path from the top tier):
 *   prototype            → internal
 *   internal             → public-facing
 *   public-facing        → customer-facing-saas
 *   customer-facing-saas → regulated
 *   regulated            → (no advancement; writer emits a sentinel section)
 */
import type { Tier } from '../state/project-state.js';

import { loadTemplate, substitute } from './template-loader.js';

export interface GraduatingGuidePayload {
  /** Current tier of the project (from audit classification). */
  current_tier: Tier;
  /** SKILL-authored 2-3 sentence summary of what the transition looks like. */
  transition_summary: string;
  /** Bullet list lines (without the leading dash). */
  changes_list: string[];
  new_tests_list: string[];
  new_patterns_list: string[];
}

const TIER_ORDER: Tier[] = [
  'prototype',
  'internal',
  'public-facing',
  'customer-facing-saas',
  'regulated',
];

/** Return the next tier up from `current`, or `null` if already at the top. */
export function nextTier(current: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1] ?? null;
}

/**
 * Render the graduating-to-next-tier section. Returns markdown content
 * (NOT wrapped in start/end markers — that's the testing-md-writer's job).
 */
export async function renderGraduatingSection(
  payload: GraduatingGuidePayload,
): Promise<string> {
  const target = nextTier(payload.current_tier);

  if (target === null) {
    return [
      `### Already at the top tier (\`${payload.current_tier}\`)`,
      '',
      'No further graduation path. Focus instead on raising test density within this tier.',
    ].join('\n');
  }

  const template = await loadTemplate('graduating-to-next-tier.template.md');
  return substitute(template, {
    current_tier: payload.current_tier,
    next_tier: target,
    transition_summary: payload.transition_summary.trim(),
    changes_list: renderBulletList(payload.changes_list),
    new_tests_list: renderBulletList(payload.new_tests_list),
    new_patterns_list: renderBulletList(payload.new_patterns_list),
  });
}

/** Detect a tier transition between a prior and current audit. */
export function detectTierTransition(
  prior: Tier | null | undefined,
  current: Tier,
): { transitioned: boolean; from: Tier | null; to: Tier } {
  if (!prior || prior === current) {
    return { transitioned: false, from: prior ?? null, to: current };
  }
  return { transitioned: true, from: prior, to: current };
}

function renderBulletList(items: string[]): string {
  if (items.length === 0) return '_None._';
  return items.map((line) => `- ${line}`).join('\n');
}
