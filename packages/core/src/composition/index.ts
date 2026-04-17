/**
 * Composition — Ecosystem-Aware Composition (Pattern #13)
 *
 * Helpers for detecting complementary skills, plugins, and MCPs in the
 * agent's runtime environment, and producing the announcement text
 * each plugin uses when it defers to a complement.
 *
 * The actual *list* of available skills/tools comes from the agent's
 * runtime context — this module doesn't enumerate the user's
 * filesystem or Claude config. It only operates on what the agent
 * already has visibility into. See Pattern #13 in
 * docs/self-evolving-plugins-framework.md for the full privacy
 * contract.
 *
 * Extraction status: STUB. Currently the composition logic lives in
 * each plugin's guide SKILL as instruction text. This module will
 * provide structured helpers for plugins that want to programmatically
 * check, log, and report complement usage.
 */

export type Source = 'plugin' | 'mcp' | 'skill' | 'cli';

export interface Complement {
  source: Source;
  /** e.g. "superpowers:test-driven-development", "mcp:claude_ai_Figma", "cli:gh" */
  name: string;
  /** Human-readable description of when this complement applies */
  appliesAt: string;
  /** The deferral announcement text the plugin should use */
  announcement: string;
}

export interface ComplementTable {
  pluginName: string;
  /** Per-command complement lists keyed by command name */
  byCommand: Record<string, Complement[]>;
}

export interface AvailableTools {
  /** The agent's available skills/tools list as known at runtime */
  skills: string[];
}

/**
 * Given a complement table for a plugin, the current command, and the
 * agent's available tools, return the subset of complements that are
 * actually present in the environment. Plugins should announce these
 * at command start.
 */
export function detectComplements(
  _table: ComplementTable,
  _command: string,
  _available: AvailableTools
): Complement[] {
  throw new Error('@626labs/plugin-core/composition not yet implemented. Phase 2 extraction pending.');
}

/**
 * Format a complement's announcement for the user. Returns a string
 * the plugin can include in its opening message.
 */
export function formatAnnouncement(_complement: Complement): string {
  throw new Error('@626labs/plugin-core/composition not yet implemented. Phase 2 extraction pending.');
}

/**
 * Build a `complements_invoked` array suitable for the session-logger
 * schema. Plugins call this after they've actually deferred to a
 * complement (not just detected its presence).
 */
export function buildSessionLogField(_invoked: Complement[]): string[] {
  throw new Error('@626labs/plugin-core/composition not yet implemented. Phase 2 extraction pending.');
}
