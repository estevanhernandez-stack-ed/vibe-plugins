/**
 * Ecosystem recommendations section writer — Builder-Sustainable Handoff (PRD H7).
 *
 * Produces the TESTING.md "Ecosystem" section from a SKILL-supplied list of
 * plugin recommendations. The SKILL (with LLM reasoning) decides which
 * plugins to recommend and authors the `why` prose; this writer filters out
 * already-installed plugins and renders the remaining list into the template.
 *
 * The writer does NOT itself call out to Claude — it's deterministic plumbing
 * that composes the SKILL's structured recommendations into markdown.
 */
import { loadTemplate, substitute } from './template-loader.js';

export interface EcosystemRecommendation {
  /** Plugin slug, matching what appears in an available-skills list (e.g., `superpowers:test-driven-development`, `playwright`). */
  plugin: string;
  /** One-sentence description of the gap this plugin would close. */
  gap: string;
  /** Shell-ready install command (e.g., `/plugin install superpowers`). */
  install_command: string;
  /** 1-2 sentence rationale authored by the SKILL. */
  why: string;
}

export interface EcosystemSectionPayload {
  recommendations: EcosystemRecommendation[];
  /**
   * List of plugin slugs currently available (e.g., from the Claude Code
   * available-skills context). Any recommendation whose `plugin` appears in
   * this list is filtered out.
   */
  availableSkills: string[];
}

export interface EcosystemRenderResult {
  /** Rendered markdown content. Empty string if no recommendations remain after filtering. */
  content: string;
  /** Recommendations that passed the filter. */
  included: EcosystemRecommendation[];
  /** Recommendations filtered out because they were already installed. */
  excluded: EcosystemRecommendation[];
}

/**
 * Filter + render. Returns empty content when no uninstalled recommendations
 * survive — SKILL can decide whether to omit the section entirely.
 */
export async function renderEcosystemSection(
  payload: EcosystemSectionPayload,
): Promise<EcosystemRenderResult> {
  const availableSet = new Set(payload.availableSkills.map((s) => s.toLowerCase()));

  const included: EcosystemRecommendation[] = [];
  const excluded: EcosystemRecommendation[] = [];

  for (const rec of payload.recommendations) {
    if (isInstalled(rec.plugin, availableSet)) {
      excluded.push(rec);
    } else {
      included.push(rec);
    }
  }

  if (included.length === 0) {
    return { content: '', included, excluded };
  }

  const template = await loadTemplate('testing-md-ecosystem.template.md');
  const recBlock = included.map(renderRecommendation).join('\n\n');
  const content = substitute(template, { recommendations: recBlock });
  return { content, included, excluded };
}

function renderRecommendation(rec: EcosystemRecommendation): string {
  return [
    `### ${rec.plugin}`,
    '',
    `**Gap it closes:** ${rec.gap.trim()}`,
    '',
    `**Why:** ${rec.why.trim()}`,
    '',
    '```bash',
    rec.install_command.trim(),
    '```',
  ].join('\n');
}

/**
 * A plugin counts as installed when its slug matches an entry in
 * `availableSkills`, OR when its slug's plugin prefix matches an entry.
 * E.g., the availability of `superpowers:test-driven-development` also
 * implies `superpowers` is installed, so a recommendation for
 * `superpowers:systematic-debugging` would still be eligible (a different
 * skill inside an installed plugin) — but a recommendation for the umbrella
 * `superpowers` slug itself would be filtered.
 */
function isInstalled(slug: string, available: Set<string>): boolean {
  const lower = slug.toLowerCase();
  if (available.has(lower)) return true;
  // Plugin-level slug: if the recommendation is for `playwright` and any
  // available skill starts with `playwright:`, count it as installed.
  if (!lower.includes(':')) {
    for (const entry of available) {
      if (entry.startsWith(`${lower}:`)) return true;
    }
  }
  return false;
}
