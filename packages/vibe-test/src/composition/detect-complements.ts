/**
 * Detect complements — Pattern #13 runtime check.
 *
 * At runtime (inside a Claude Code session) we cannot introspect the agent's
 * available-skills list from TypeScript; the SKILL layer passes the list in.
 * This module accepts the list + returns per-complement availability info,
 * normalized against the anchored registry.
 */

import type { AnchoredEntry } from './anchored-registry.js';

export interface ComplementStatus {
  available: boolean;
  version?: string;
  /** Where the availability hint came from. */
  source?: 'exact-match' | 'wildcard-match' | 'registry-only';
}

export interface DetectInput {
  /**
   * Names of skills the agent currently sees. Example entries:
   *   'superpowers:test-driven-development'
   *   'playwright'
   *   'vibe-doc:generate'
   *
   * SKILLs pass the literal list they read from the agent's runtime context.
   */
  availableSkills: string[];
  /** The anchored-registry complements we check against. */
  anchored: AnchoredEntry[];
  /** Current command — used to filter which complements are relevant right now. */
  currentCommand?: string;
}

/**
 * Match a registry complement name against an available-skill name. Two forms:
 * - exact:  `superpowers:test-driven-development` === `superpowers:test-driven-development`
 * - plugin: `playwright (plugin + MCP)` — we split on whitespace and match the
 *   first token.
 */
function complementMatches(registryName: string, skillName: string): boolean {
  if (registryName === skillName) return true;
  const registryToken = registryName.split(/\s+/)[0]?.toLowerCase();
  const skillToken = skillName.split(/\s+/)[0]?.toLowerCase();
  if (registryToken && skillToken && registryToken === skillToken) return true;
  // Plugin-name prefix match (e.g., `vibe-doc` matches `vibe-doc:generate`).
  if (registryToken && skillName.toLowerCase().startsWith(registryToken + ':')) return true;
  return false;
}

export function detectComplements(input: DetectInput): Map<string, ComplementStatus> {
  const result = new Map<string, ComplementStatus>();
  const filtered = input.currentCommand
    ? input.anchored.filter((e) => e.applies_to.includes(input.currentCommand ?? ''))
    : input.anchored;

  for (const entry of filtered) {
    let available = false;
    let source: ComplementStatus['source'] = 'registry-only';
    for (const skillName of input.availableSkills) {
      if (complementMatches(entry.complement, skillName)) {
        available = true;
        source = 'exact-match';
        break;
      }
    }
    const status: ComplementStatus = { available };
    if (source) status.source = source;
    result.set(entry.complement, status);
  }
  return result;
}

/**
 * Dynamic-discovery heuristic — surfaces *at most one* unknown skill per
 * invocation when it looks relevant. Called by the guide SKILL when the current
 * command is generate / gate / coverage / fix.
 *
 * Conservative — we prefer false negatives over false positives.
 */
export function suggestDynamic(input: DetectInput): string | null {
  const relevantCommands = new Set(['generate', 'gate', 'coverage', 'fix']);
  if (input.currentCommand && !relevantCommands.has(input.currentCommand)) return null;
  const anchoredNames = new Set(input.anchored.map((e) => e.complement.toLowerCase()));
  const patterns = [/test/i, /tdd/i, /verify/i, /coverage/i, /playwright/i];
  for (const skill of input.availableSkills) {
    const lower = skill.toLowerCase();
    if (anchoredNames.has(lower)) continue;
    if (patterns.some((re) => re.test(skill))) {
      return skill;
    }
  }
  return null;
}
