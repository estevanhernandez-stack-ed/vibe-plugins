/**
 * Playwright runtime hook — Path B for UI apps.
 *
 * Thin orchestration layer over `src/generator/playwright-bridge.ts`. The
 * bridge already detects Playwright MCP availability and composes deferral /
 * present prose for the audit + generate SKILLs. This module wraps the bridge
 * with the runtime-side helpers the dev-server probe needs:
 *
 *   - `isAvailable(availableSkills)` — boolean check (delegates to the bridge)
 *   - `composeProbeIntent(uiFlow)`   — natural-language intent the SKILL
 *     passes to Playwright MCP via tool calls
 *   - `formatDeferralFinding(uiFlows)` — markdown finding text the SKILL
 *     surfaces when MCP is missing
 *
 * This module does NOT invoke any MCP tool calls. The agent runtime is the
 * only layer that can issue MCP calls; we just compose the intent text and
 * detect availability. Per spec Decision 3, there is no native E2E fallback.
 */

import {
  isPlaywrightMcpAvailable,
  formatDeferralAnnouncement,
} from '../generator/playwright-bridge.js';

export interface UiFlow {
  /** Entry URL or route path the flow starts at (e.g., `'/login'`). */
  entry: string;
  /** Ordered natural-language steps describing the flow. */
  steps: string[];
  /** Optional flow name — surfaced in the probe intent + finding. */
  name?: string;
}

export interface ProbeIntent {
  /** Human-readable intent text the SKILL passes to Playwright MCP. */
  text: string;
  /** Suggested filename for the resulting `.spec.ts` (no path, just basename). */
  suggestedSpecBasename: string;
  /** Original flow input (echoed for traceability). */
  flow: UiFlow;
}

/**
 * Boolean check — true when Playwright MCP is in the agent's available-skills
 * list. Delegates to the bridge so detection rules stay in one place.
 */
export function isAvailable(availableSkills: string[]): boolean {
  return isPlaywrightMcpAvailable(availableSkills);
}

/**
 * Compose the natural-language probe intent the SKILL feeds to Playwright MCP.
 * The intent reads as a brief prompt — Playwright's `--codegen typescript`
 * authors the actual `.spec.ts` based on this guidance.
 *
 * Example output for a sign-in flow:
 *
 *   Generate a Playwright spec at tests/e2e/sign-in.spec.ts that:
 *     1. Navigates to /login
 *     2. Fills the email field with a fixture user
 *     3. Submits the form
 *     4. Asserts the dashboard loads
 *
 *   Use the playwright codegen typescript output style. Capture the test in
 *   a single test() block. Prefer role-based selectors over CSS where possible.
 */
export function composeProbeIntent(uiFlow: UiFlow): ProbeIntent {
  const name = uiFlow.name ?? slugifyEntry(uiFlow.entry) ?? 'flow';
  const basename = `${slugifyForFilename(name)}.spec.ts`;
  const stepsList = uiFlow.steps
    .map((s, i) => `  ${i + 1}. ${s.trim()}`)
    .join('\n');
  const text = [
    `Generate a Playwright spec at tests/e2e/${basename} that:`,
    `  Navigates to ${uiFlow.entry}`,
    stepsList,
    '',
    'Use the playwright codegen typescript output style. Capture the test in',
    'a single test() block. Prefer role-based selectors over CSS where possible.',
  ].join('\n');
  return {
    text,
    suggestedSpecBasename: basename,
    flow: uiFlow,
  };
}

/**
 * Compose the markdown finding text the SKILL emits when Playwright MCP is
 * NOT available. Reuses the bridge's `formatDeferralAnnouncement` so the
 * prose stays consistent across audit + generate + runtime hooks.
 */
export function formatDeferralFinding(uiFlows: UiFlow[]): string {
  const flowDescriptions = uiFlows.map((f) => describeFlow(f));
  return formatDeferralAnnouncement(flowDescriptions);
}

function describeFlow(flow: UiFlow): string {
  const name = flow.name ?? slugifyEntry(flow.entry) ?? 'flow';
  const stepCount = flow.steps.length;
  return `${name} — entry ${flow.entry}, ${stepCount} step${stepCount === 1 ? '' : 's'}`;
}

function slugifyEntry(entry: string): string | null {
  const cleaned = entry.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').replace(/\?.*$/, '');
  if (!cleaned) return null;
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const base = segments[segments.length - 1];
  return base ? base.toLowerCase() : null;
}

function slugifyForFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'flow';
}
