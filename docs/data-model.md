# Data Model — Vibe Plugins ecosystem

This document catalogs every piece of persistent state the 626Labs Vibe Plugins ecosystem reads or writes. Where it lives, what shape it has, who owns it, and what survives various lifecycle events (plugin update, machine swap, profile reset, repo clone).

**Companion docs:**
- [`docs/runbook.md`](./runbook.md) — operational implications of this state (evolution lifecycle, recovery, migration).
- [`docs/threat-model.md`](./threat-model.md) — risks against this state and the surfaces that read it.

## Layer 1 — Cross-plugin shared state

State written by any plugin and readable by all of them. Lives outside any single project — follows the user across machines (when they choose to copy it).

### `~/.claude/profiles/builder.json`

The unified builder profile. Single source of truth for builder identity and preferences across every 626Labs plugin.

| Field | Description |
|---|---|
| **Path** | `~/.claude/profiles/builder.json` (Windows: `C:\Users\<name>\.claude\profiles\builder.json`) |
| **Owner** | Vibe Cartographer's `/onboard` writes; any 626Labs plugin reads. Other plugins may write to their own `plugins.<name>` namespace. |
| **Schema version** | `schema_version: 1`. |
| **Top-level shape** | `shared.*` (cross-plugin) + `plugins.<name>.*` (plugin-scoped). |
| **`shared` block** | name, identity, technical_experience (level, languages, frameworks, ai_agent_experience), preferences (persona, tone, pacing, communication_style), creative_sensibility, `_meta` decay timestamps. |
| **`plugins.vibe-cartographer` block** | mode, deepening_round_habits, build_mode_preference, projects_started, projects_completed, last_project, last_updated, deployment_target, notes. |
| **Other plugin blocks** | Each plugin has its own namespace: `plugins.vibe-doc`, `plugins.vibe-test`, etc. |
| **Lifecycle** | Persists indefinitely on the local filesystem. Survives plugin updates (the file is at the user level, not inside any plugin's install path). Migrates between machines by file copy. |
| **Sensitive?** | Identity-adjacent (name, languages, project counts). No secrets, no PII beyond what the user voluntarily shares with the plugin during `/onboard`. |

### `~/.claude/profiles/_meta`

Reserved for future cross-profile metadata (decay timestamps, last-seen complements). Currently embedded inside `shared._meta` and `plugins.<name>._meta`.

## Layer 2 — Per-plugin session memory

Append-only logs written during plugin command execution. Each plugin owns its own subdirectory.

### `~/.claude/plugins/data/<plugin>/sessions/*.jsonl`

Two-phase append-only session log. Sentinel entry written at command start (`outcome: in_progress`); terminal entry appended at command end with the same `sessionUUID`.

| Field | Description |
|---|---|
| **Path** | `~/.claude/plugins/data/<plugin>/sessions/<YYYY-MM-DD>.jsonl` |
| **Owner** | Per-plugin (each plugin's session-logger SKILL writes its own). |
| **Schema** | JSON Schema at `plugins/<plugin>/skills/guide/schemas/session-log.schema.json` (Cart's version is canonical; others mirror). |
| **Lifecycle** | Append-only, never rewritten. Read by `/<plugin>:evolve` and `/<plugin>:vitals`. |
| **Sensitive?** | Project paths, command names, friction notes. May reveal what the user is working on. |

### `~/.claude/plugins/data/<plugin>/friction.jsonl`

Real-time friction signal capture. Each entry: `friction_type`, `confidence`, `symptom`, `complement_involved`, `sessionUUID`.

| Field | Description |
|---|---|
| **Path** | `~/.claude/plugins/data/<plugin>/friction.jsonl` |
| **Schema** | JSON Schema at `plugins/<plugin>/skills/guide/schemas/friction.schema.json`. |
| **Lifecycle** | Append-only. Read by `/<plugin>:evolve` for self-improvement proposals. |
| **Sensitive?** | Same as session logs. |

### `~/.claude/plugins/data/<plugin>/wins.jsonl`

Counter-balance to friction (Vibe Test's Pattern #14 — absence-of-friction inference). Same shape, different signal.

## Layer 3 — Per-project artifacts

State written into the user's project directory (not under `~/.claude/`). Lives with the project; commits to the project's git repo if the user chooses.

### `docs/*.md` (in any project where Cart runs)

Cart's eight-command flow produces these artifacts inside the project:

| File | Produced by | Read by |
|---|---|---|
| `docs/builder-profile.md` | `/onboard` | All Cart commands |
| `docs/scope.md` | `/scope` | `/prd`, `/spec`, `/build`, `/reflect` |
| `docs/prd.md` | `/prd` | `/spec`, `/build`, `/reflect` |
| `docs/spec.md` | `/spec` | `/checklist`, `/build`, `/reflect` |
| `docs/checklist.md` | `/checklist` | `/build`, `/iterate`, `/reflect` |
| `docs/reflection.md` | `/reflect` | `/evolve` |

Each file is plain Markdown. The user owns them; Cart reads them as input to subsequent commands.

### `process-notes.md` (in any project where Cart runs)

Per-project running journal. Sections appended by each Cart command. Used as a fallback when `session-logger.start()` returns null (orchestrator-runtime gap).

## Layer 4 — Marketplace state

State that lives inside this repo and ships to users via Claude Code's plugin-marketplace mechanism.

### `.claude-plugin/marketplace.json`

The aggregated marketplace manifest. Load-bearing — defines the entire ecosystem's installable surface.

| Field | Description |
|---|---|
| **Path** | `.claude-plugin/marketplace.json` (in this repo) |
| **Schema** | Claude Code's marketplace schema (see [`https://code.claude.com/docs/en/plugin-marketplaces`](https://code.claude.com/docs/en/plugin-marketplaces)). |
| **Shape** | `name`, `owner`, `description`, `plugins[]` (each entry: `name`, `description`, `source` with `git-subdir` URL + `path` + `ref`). |
| **Lifecycle** | Mutated by direct push to `main`; promoted version pins reach users on next plugin-marketplace sync. |
| **Sensitive?** | Public manifest. No secrets. |

### `~/.claude/plugins/marketplaces/<marketplace>/.claude-plugin/marketplace.json`

The local cache of each registered marketplace. Refreshed on `/plugin marketplace sync` or auto-refresh (depending on `extraKnownMarketplaces.<name>.autoUpdate` in user settings).

| Field | Description |
|---|---|
| **Path** | `~/.claude/plugins/marketplaces/<marketplace-name>/.claude-plugin/marketplace.json` |
| **Owner** | Claude Code itself. |
| **Lifecycle** | Mirror of the upstream marketplace.json. Cleared by `/plugin marketplace remove`. |

### `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`

The actual cloned plugin code at the version pinned by the marketplace. Where `/<plugin>:<command>` actually runs from.

## Layer 5 — Stats infrastructure (this repo)

Auto-generated daily download counts for each tracked npm package.

### `data/stats/<YYYY-MM-DD>.json`

Daily snapshot of npm download counts for every tracked package.

| Field | Description |
|---|---|
| **Path** | `data/stats/2026-04-28.json` (one per day) |
| **Owner** | `scripts/npm-stats.py`, run daily by `.github/workflows/npm-stats.yml`. |
| **Schema** | Top-level `timestamp`, `day`, `packages` keys. Each package entry: `last_day`, `last_week`, `last_month` (number or null on 404). |
| **Lifecycle** | One file per day, never rewritten. Daily cron at 14:00 UTC. |

### `data/stats/history.jsonl`

Append-only roll-up of every daily snapshot. The data source for the eventual 626Labs Dashboard widget.

| Field | Description |
|---|---|
| **Path** | `data/stats/history.jsonl` |
| **Lifecycle** | Append-only. Same workflow that writes the daily snapshots appends here. |

## Layer 6 — JSON schemas

Canonical schemas for the structured files above. Each plugin ships its own copy under `plugins/<plugin>/skills/guide/schemas/`. Cart's are the de-facto reference.

| Schema | Validates |
|---|---|
| `builder-profile.schema.json` | The unified builder profile (`~/.claude/profiles/builder.json`). |
| `session-log.schema.json` | Each session log line in `sessions/*.jsonl`. |
| `friction.schema.json` | Each friction log line in `friction.jsonl`. |
| `friction-calibration.schema.json` | Friction calibration data used by `/evolve`. |

## State ownership summary

| Layer | Plugin namespace | Cross-machine | Survives plugin update |
|---|---|---|---|
| L1 — Builder profile | Shared (cross-plugin) | If user copies | ✅ Yes (lives at user level) |
| L2 — Session memory | Per-plugin | If user copies | ✅ Yes (lives at user level) |
| L3 — Project artifacts | Per-project | Travels with project | ✅ Yes (lives in project repo) |
| L4 — Marketplace | This repo | Public | N/A |
| L5 — Stats | This repo | Public | N/A |
| L6 — Schemas | Plugin-scoped | Ships with plugin | Updated by plugin update |

## What does NOT persist

- **No telemetry** is collected. See [`docs/adrs/0003-no-telemetry.md`](./adrs/0003-no-telemetry.md). Nothing in this ecosystem phones home.
- **No global usage analytics**. The only state above is local-filesystem; no remote backing store.
- **No PII beyond what users voluntarily share** with `/onboard`. The unified profile carries identity facts (name, experience level) only because the user typed them in.
