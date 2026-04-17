# RESOLVE.md — How Vibe Test Resolves Its Own Version

> Pattern #15 (Canonical Self-Resolution) — human-readable explanation of the machine-readable `.claude-plugin/active-path.json`.

## The problem

A cold-loaded Claude Code agent invoking `/vibe-test:audit` in a session it didn't create has **no implicit knowledge** of where its SKILL files live. The plugin cache path changes per version. Relying on ad-hoc `find` / `ls -R` is slow, non-deterministic, and wrong when multiple versions are present.

## The resolution order

Every Vibe Test command resolves its own version **before any other logic** via this ordered sequence:

1. **`~/.claude/plugins/installed_plugins.json`** — Claude Code's authoritative registry. If an entry for `vibe-test` exists with a populated `path`, use it. This is the fast, correct, documented path.
2. **`.claude-plugin/active-path.json`** (this plugin's own file) — the fallback beacon. Written at install time and every version bump. Contains:
   - `version` — the semver this resolve file was written for
   - `active_path` — the absolute (or `~`-relative) path to the plugin root
   - `last_updated` — ISO date of the last write
3. **Never fall back to filesystem scanning.** If neither source resolves, the command fails loudly with a version-resolution error and prompts the builder to reinstall.

## Why two files?

`installed_plugins.json` is the source of truth for the Claude Code runtime. `active-path.json` is a self-authored beacon that lives *inside* the plugin so even a partially corrupt registry can be recovered from the plugin's own files. It's defense-in-depth, not redundancy.

## What writes `active-path.json`?

- **Install** — the marketplace install flow writes it to reflect the chosen version's cache path.
- **Version bump** — any `npm publish` or marketplace update triggers a rewrite.
- **`/vibe-test:vitals`** — the self-test SKILL can detect drift and offer a patch.

## What reads it?

- Every SKILL's first block of instructions (Pattern #15 prereq).
- The CLI entry point (`@esthernandez/vibe-test-cli`) when resolving plugin-adjacent assets.
- `/vibe-test:vitals` during the resolution-check step.

## Relation to `installed_plugins.json`

| Source | Authority | Updated by | Risk |
|---|---|---|---|
| `installed_plugins.json` | Claude Code runtime | Claude Code install/uninstall | Can be stale mid-transition |
| `active-path.json` | This plugin | Plugin install script + version bump | Can drift if install script broken |

If they disagree, `installed_plugins.json` wins — but the disagreement itself is surfaced by `/vibe-test:vitals`.

## See also

- `docs/self-evolving-plugins-framework.md` > Pattern #15
- `.claude-plugin/active-path.json` — the machine-readable companion
- `skills/vitals/SKILL.md` — self-test that validates this contract
