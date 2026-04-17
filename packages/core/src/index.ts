/**
 * @626labs/plugin-core
 *
 * Shared infrastructure for the 626Labs Vibe Plugins ecosystem.
 *
 * Each subdirectory is a focused module with its own index.ts. Import
 * specific modules via subpath imports (`@626labs/plugin-core/scanner`)
 * to avoid pulling in everything when you only need one capability.
 *
 * Modules:
 * - scanner: File walker, git scanner, dotfile allowlist, artifact inventory primitives
 * - classifier: Hybrid rules + LLM classification scaffold (each plugin provides its own signal table)
 * - session-logger: Append-only JSONL writer for the Self-Evolving Plugin Framework Level 2 schema
 * - state: Read-merge-write helpers for .vibe-<plugin>/state.json files
 * - ci-check: Tier-gated pass/fail pattern used by every plugin's check command
 * - profile: Read/write helpers for ~/.claude/profiles/builder.json with strict namespace isolation
 * - composition: Ecosystem-Aware Composition (Pattern #13) helpers for detecting and deferring to complementary skills
 */

export * as scanner from './scanner';
export * as classifier from './classifier';
export * as sessionLogger from './session-logger';
export * as state from './state';
export * as ciCheck from './ci-check';
export * as profile from './profile';
export * as composition from './composition';
