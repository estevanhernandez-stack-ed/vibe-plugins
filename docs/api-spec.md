# API Specification — Vibe Plugins

The `vibe-plugins` repo doesn't expose a network API. There is no REST endpoint, no GraphQL schema, no RPC contract. **The aggregated marketplace's "API" is its `.claude-plugin/marketplace.json` manifest** — that file is the load-bearing contract between this repo and the plugin host (Claude Code / Claude Desktop / Cowork).

This document tells consumers exactly what they can rely on, what's free to change, and where to look for the canonical schema.

> **For agents and tooling:** if you're scanning this repo for an "API specification" doc and expecting OpenAPI / GraphQL / proto definitions, you're looking in the wrong place. For an aggregated Claude Code plugin marketplace, `marketplace.json` is the spec. See [Why this is the API](#why-this-is-the-api) below.

## The contract surface

`.claude-plugin/marketplace.json` declares which plugins are available, where their source code lives, which tag is currently promoted, and what subdirectory holds the plugin code within each solo repo. Consumers (the plugin host, agents that programmatically install plugins, automation pipelines) read it and act on its contents.

### Required fields per plugin entry

| Field | Type | Stability |
|---|---|---|
| `name` | string | **Stable.** Used as the install identifier (`<name>@vibe-plugins`). Renaming would break every existing user's installs. |
| `description` | string | **Stable enough.** May be edited for clarity; substantive meaning shouldn't drift. |
| `source.source` | string literal `"git-subdir"` | **Stable.** Don't change without documented migration. |
| `source.url` | URL | **Stable.** Must be fully-qualified (`https://github.com/...`); bare hostnames are rejected by the plugin host. |
| `source.path` | string | **Stable.** The subdirectory inside the solo repo containing the plugin's `.claude-plugin/plugin.json`. |
| `source.ref` | string (git tag) | **Mutable, intentionally.** Bumping `ref` is the promotion mechanism; consumers expect this to change over time. |

### Marketplace-level fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | The marketplace name (`vibe-plugins`). Used in `<plugin>@<marketplace>` install paths. |
| `owner.name` | string | Display string only. |
| `description` | string | Surfaces in the plugin host's marketplace browser. |
| `plugins[]` | array | Order in this array is not significant. Adding entries is additive; removing entries is a breaking change for users with that plugin installed. |

### Schema authority

The canonical marketplace schema lives in Claude Code's official documentation: [`https://code.claude.com/docs/en/plugin-marketplaces`](https://code.claude.com/docs/en/plugin-marketplaces). This file describes how *this specific marketplace* uses the schema, not the schema itself.

## Versioning policy

The aggregated marketplace itself is **not semver-versioned.** Every push to `main` is effectively a release of the manifest. Promotions (a `ref:` bump for any plugin entry) are the unit of release.

- **Breaking changes** to consumers: removing a plugin entry, renaming a plugin, changing the `source.url` for an existing entry. Avoid these. If unavoidable, document in [`CHANGELOG.md`](../CHANGELOG.md) under that day's section.
- **Non-breaking changes**: adding new plugin entries, bumping `ref:` fields, editing descriptions, refining metadata.

Per-plugin solo repos follow semver in their own tag spaces (e.g., `vibe-cartographer@v1.7.3`); that's their contract, not this marketplace's.

## Consumers

| Consumer | What they read |
|---|---|
| **Plugin host** (Claude Code / Claude Desktop / Cowork) | The full `marketplace.json`. Resolves `source` entries to clone the pinned subdirectory of each plugin's solo repo. |
| **`extraKnownMarketplaces` in user settings.json** | Just the marketplace registration metadata — the manifest is fetched at sync time, not at registration. |
| **Automation / CI pipelines** that programmatically inspect available plugins | The full `marketplace.json` via raw GitHub URL. |
| **Agents reading repo docs** to understand the project's surface | This file plus the manifest. |

## Why this is the API

Most repos that need an `api-spec.md` are exposing an HTTP service, an SDK, or a programmatic library. None of those apply here:

- The plugins themselves run inside the user's plugin host (Claude Code / Desktop). They don't expose endpoints; they expose **slash commands**, which are documented per-plugin in each solo repo's README and skill manifest.
- This repo is a **distribution layer** — it tells the plugin host *what's available* and *where to fetch it*. That's the entire surface. The contract is structural, not behavioral.

If you're building tooling against the marketplace (e.g., a script that auto-generates install instructions, or a dashboard showing what's pinned), this is the file you parse. If you're building tooling against a specific plugin's behavior, go to that plugin's solo repo.

## Stability commitments

- **Existing plugin entries** won't be renamed or removed without a deprecation window documented in `CHANGELOG.md`.
- **`source.url` for existing entries** won't be changed underfoot. The vibe-cartographer entry currently points at the canonical `vibe-cartographer` repo; we won't silently re-point it elsewhere.
- **`ref:` bumps may happen at any time** — that's the design. Consumers should expect them and treat each sync as picking up the latest pinned versions.
- **Schema additions** (new optional fields permitted by the upstream Claude Code marketplace schema) may land without notice. Consumers should ignore unknown fields rather than fail on them.
- **No removal of fields** without deprecation.

## Companion docs

- [`docs/data-model.md`](./data-model.md) — full state catalog, including marketplace.json's role in the data model (Layer 4).
- [`docs/test-plan.md`](./test-plan.md) — validation checks we run against this manifest.
- [`docs/threat-model.md`](./threat-model.md) — what happens if this contract is compromised.
- [`docs/adrs/0001-aggregated-marketplace-pattern.md`](./adrs/0001-aggregated-marketplace-pattern.md) — why this is the architecture.
