# 0001 — Aggregated marketplace pattern

## Status

Accepted (2026-04-15, codified 2026-04-28)

## Context

626Labs ships seven Claude Code plugins (Cartographer, Doc, Test, Sec,
Thesis, Thesis Engine, Keystone). Each plugin has its own development
cadence, version line, and README. Without coordination, users would
need to register seven separate marketplaces in Claude Desktop / Cowork
or paste seven `/plugin marketplace add` commands in Claude Code CLI to
get the full ecosystem.

That's friction. New users would never finish; agents using the plugins
across projects would miss the connection between them.

## Decision

This repo (`vibe-plugins`) is the **aggregated marketplace manifest** for
the entire 626Labs ecosystem. A single `owner/repo` paste —
`estevanhernandez-stack-ed/vibe-plugins` — gives Claude Code users access
to all seven plugins. The actual plugin source code lives in dedicated
solo repos (one per plugin); this marketplace is a thin manifest in
`.claude-plugin/marketplace.json` that pins each plugin to a stable tag
via `git-subdir` source entries.

Plugins are independently versioned. Promotion is a one-commit change to
this repo: bump the `ref` field on a plugin entry, push.

## Consequences

**Positive:**
- One-paste install for the entire ecosystem.
- Each plugin keeps full release autonomy in its own repo.
- The aggregated marketplace acts as a curation gate — only stable
  tags get promoted here. Bleeding-edge work happens on solo-repo `main`
  branches that beta testers can opt into directly.
- Plugin-host clients auto-refresh registered marketplaces, so a
  one-commit ref bump propagates to all users on next sync.

**Negative:**
- Drift risk: each ref-bump is a manual promotion step. If we forget,
  users on the stable channel lag the solo repo's actual state.
- Two-channel mental model (stable / canary) adds documentation surface.

**Neutral:**
- Each new plugin requires a marketplace.json edit. Trivial overhead.

## Alternatives considered

- **One mono-repo with all plugins inside.** Rejected — would force a
  single release cadence and tangle plugin histories. Hurts independent
  iteration.
- **No aggregated marketplace; users add each solo repo separately.**
  Rejected — discovery hostile, friction-heavy for first-time users.
- **Publish each plugin to npm only, no marketplace.** Rejected — npm
  doesn't surface in Claude Desktop / Cowork's plugin panel; npm
  packages don't auto-update on use. Marketplace is the right
  distribution layer for plugin-host clients.

## Notes

- See [`README.md`](../../README.md) and [`INSTALL.md`](../../INSTALL.md)
  for the user-facing description.
- Reference: marketplace manifest at
  [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json).
- Pattern hardened on 2026-04-26 after a real incident: bare hostnames
  in `source.url` (e.g., `github.com/owner/repo` without `https://`)
  caused install failures on a fresh machine. Fix in commit `0313efd`.
