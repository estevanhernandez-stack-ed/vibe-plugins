/**
 * Playwright bridge — thin MCP availability check + deferral-stub composer.
 *
 * v0.2 policy (per spec Decision 3 + PRD G7): no native E2E emission. When
 * Playwright MCP is present, the SKILL constructs natural-language probe
 * intents and lets Playwright MCP's `--codegen typescript` emit the `.spec.ts`
 * files. When absent, this module composes the finding text the audit /
 * generate SKILLs surface as an ecosystem recommendation.
 *
 * No subprocess calls happen here. The actual MCP tool call is the SKILL's
 * responsibility — TypeScript cannot issue MCP tool calls from outside the
 * agent runtime.
 */

export interface PlaywrightAvailabilityInput {
  /**
   * Names of skills / plugins the agent currently sees. Same list the
   * composition / detect-complements module consumes.
   */
  availableSkills: string[];
}

/**
 * Match rules:
 * - exact `'playwright'` token match
 * - plugin-prefix match (e.g., `'playwright:codegen'`)
 * - case-insensitive
 */
export function isPlaywrightMcpAvailable(availableSkills: string[]): boolean {
  for (const skill of availableSkills) {
    if (!skill) continue;
    const lower = skill.toLowerCase();
    if (lower === 'playwright') return true;
    if (lower.startsWith('playwright:')) return true;
    if (lower.startsWith('playwright ')) return true; // e.g., "playwright (plugin + MCP)"
  }
  return false;
}

/**
 * Compose the finding text the SKILL surfaces when E2E-worthy gaps are detected
 * but the Playwright plugin is NOT installed. This text lands in:
 *   - the markdown audit / generate report
 *   - the ecosystem-recommendations section of `docs/TESTING.md`
 *   - the banner "Plays well with" block
 *
 * The text is intentionally prescriptive — it names the specific flows the
 * SKILL wants Playwright to cover. No vague "consider installing" phrasing.
 */
export function formatDeferralAnnouncement(detectedE2eGaps: string[]): string {
  if (detectedE2eGaps.length === 0) {
    return '';
  }
  const gaps = detectedE2eGaps
    .map((g) => `  - ${g}`)
    .join('\n');
  return [
    'E2E coverage gaps detected. Vibe Test defers E2E generation to Playwright.',
    '',
    'Install the `playwright` plugin to generate E2E tests for these flows:',
    gaps,
    '',
    'Once installed, re-run `/vibe-test:generate` — Vibe Test will emit probe intents and Playwright will run `--codegen typescript` to author the `.spec.ts` files.',
  ].join('\n');
}

/**
 * When Playwright MCP IS available, compose the announcement the SKILL surfaces
 * at generate command start. The SKILL uses this verbatim.
 */
export function formatPresentAnnouncement(detectedE2eGaps: string[]): string {
  const base =
    'Playwright MCP detected. E2E generation defers to Playwright — Vibe Test will emit probe intents; Playwright runs `--codegen typescript` to author the `.spec.ts` output.';
  if (detectedE2eGaps.length === 0) return base;
  const gaps = detectedE2eGaps.map((g) => `  - ${g}`).join('\n');
  return `${base}\n\nFlows queued for Playwright:\n${gaps}`;
}

/**
 * Bundle the two pieces the SKILL needs in one check: availability + the
 * verbatim announcement text for the detected case. The SKILL supplies its
 * own list of detected E2E gap descriptions (SKILL-authored prose).
 */
export interface PlaywrightBridgeResult {
  available: boolean;
  /** Verbatim prose the SKILL surfaces in the banner + markdown. */
  announcement: string;
}

export function resolvePlaywrightBridge(input: {
  availableSkills: string[];
  detectedE2eGaps: string[];
}): PlaywrightBridgeResult {
  const available = isPlaywrightMcpAvailable(input.availableSkills);
  const announcement = available
    ? formatPresentAnnouncement(input.detectedE2eGaps)
    : formatDeferralAnnouncement(input.detectedE2eGaps);
  return { available, announcement };
}
