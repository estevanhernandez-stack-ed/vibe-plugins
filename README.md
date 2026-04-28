# Vibe Plugins

**The 626Labs plugin marketplace — one place, seven plugins, the full Vibe ecosystem.**

This repo is the **aggregated marketplace manifest** for 626Labs's seven Claude Code plugins. It exists so a single `owner/repo` paste — `estevanhernandez-stack-ed/vibe-plugins` — gives Claude Code users access to the whole Vibe ecosystem. The actual plugin code lives in dedicated solo repos, linked here via the `git-subdir` source type in `.claude-plugin/marketplace.json`.

The architecture: **foundations underneath, process pillars on top.** Foundation tools establish *what* you're working on (knowledge) and *the structural file every agent decision rests on* (CLAUDE.md). Pillar tools shape *how* you work on it.

## The plugins

### Foundations

| Plugin | Solo repo | Stable ref pinned here | Purpose |
|---|---|---|---|
| **Thesis Engine** | [`Thesis-Engine`](https://github.com/estevanhernandez-stack-ed/Thesis-Engine) | `v0.2.1` | **Knowledge foundation.** Research feeder. Discovers cutting-edge thesis topics, gathers primary sources, opposing positions, and methodological precedents across five research axes. Emits research notes + a Pandoc-ready BibTeX bibliography. Today: academic-research-shaped output for vibe-thesis projects. Roadmap: software-project-shaped briefs for Cart's `/scope` and Sec's threat-model. |
| **Vibe Keystone** | [`vibe-Keystone`](https://github.com/estevanhernandez-stack-ed/vibe-Keystone) | `v0.1.0` | **Structural foundation.** Bootstraps a 626Labs-pattern `CLAUDE.md` — the load-bearing file every agent decision rests on. Tenant-aware: interviews for org, decision surface, voice rules, and persona before drafting, so the produced file reflects YOUR conventions, not 626Labs defaults. Adapts to repo type (code platform / marketing site / long-form writing / mixed). Use when starting a new repo or when an existing CLAUDE.md is stale. |

### Pillars — process

| Plugin | Solo repo | Stable ref pinned here | Purpose |
|---|---|---|---|
| **Vibe Cartographer** | [`vibe-cartographer`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer) | `v1.7.3` | Plot your course from idea to shipped app. Vibe coding course correction — eight slash commands: onboard, scope, prd, spec, checklist, build, iterate, reflect. Plus Level-3.5 self-evolution: `/evolve`, `/vitals`, `/friction`. |
| **Vibe Doc** | [`Vibe-Doc`](https://github.com/estevanhernandez-stack-ed/Vibe-Doc) | `v1.0.0` | AI-powered documentation gap analyzer. Scans, classifies, identifies missing technical documentation, generates professional docs from existing artifacts. |
| **Vibe Sec** | [`vibe-sec`](https://github.com/estevanhernandez-stack-ed/vibe-sec) | `vibe-sec-v0.0.2` | Security gap finder — leaked secrets, sketchy auth, missing input validation, stale dependencies. Full plugin in development; secret-leak scanner CLI shipping now via `@esthernandez/vibe-sec-cli`. |
| **Vibe Test** | [`vibe-test`](https://github.com/estevanhernandez-stack-ed/vibe-test) | `vibe-test-v0.2.4` | Test analyzer + generator. Classifies by app type and maturity tier, measures coverage honestly (no cherry-picked denominators), generates tests proportional to deployment risk — catches the broken harnesses every other test tool assumes away. |
| **Vibe Thesis** *(beta)* | [`Vibe-Thesis`](https://github.com/estevanhernandez-stack-ed/Vibe-Thesis) | `v0.1.2` | Long-form academic authoring — dissertations, master's theses, position essays. Scaffolds a styled PDF skeleton plus a working render pipeline in roughly 30 minutes. Standalone-friendly with bundled templates; pairs with Thesis Engine and the [ThesisStudio](https://github.com/estevanhernandez-stack-ed/ThesisStudio) template, but neither is required. |

Each plugin is independently versioned. This marketplace pins to **stable tags** on each solo repo; updates are deliberate promotions, not bleeding-edge tracking.

## Two release channels

### 🟢 Stable (this repo) — for most users

Paste `estevanhernandez-stack-ed/vibe-plugins` into Claude Code's Add Marketplace dialog. You get the versions pinned above — tested, promoted, stable. New releases land when the `ref` field in `.claude-plugin/marketplace.json` gets bumped.

### 🟠 Canary / Edge (solo repos) — for beta testers

Paste any individual solo repo URL (`estevanhernandez-stack-ed/vibe-cartographer`, `estevanhernandez-stack-ed/Vibe-Thesis`, `estevanhernandez-stack-ed/Thesis-Engine`, etc.) to track that plugin's `main` branch. You see edge work the moment it's pushed. Faster feedback, occasional breakage.

## Install

### Claude Desktop / Cowork (UI)

1. Personal plugins → **+** → **Add marketplace**
2. Enter: `estevanhernandez-stack-ed/vibe-plugins`
3. Click **Sync**
4. Install whichever plugins you want

### Claude Code CLI

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install thesis-engine@vibe-plugins
/plugin install vibe-cartographer@vibe-plugins
/plugin install vibe-doc@vibe-plugins
/plugin install vibe-keystone@vibe-plugins
/plugin install vibe-sec@vibe-plugins
/plugin install vibe-test@vibe-plugins
/plugin install vibe-thesis@vibe-plugins
```

### CLI packages on npm (for CI pipelines)

```bash
npm install -g @esthernandez/vibe-test-cli @esthernandez/vibe-sec-cli
vibe-test audit --cwd .
vibe-test gate --ci
vibe-sec scan .
```

## What's actually in this repo

- **`.claude-plugin/marketplace.json`** — the aggregation manifest. Load-bearing file.
- **`packages/core/`** — `@626labs/plugin-core`, shared npm package for plugin infrastructure (scanner primitives, session logger schema, state helpers). Not a plugin; not listed in the marketplace; referenced as a workspace dependency by plugins that adopt it (Phase 3).
- **`packages/vibe-doc/`** — transitional copy pending reconciliation with the solo repo (see `docs/migration-plan.md` Phase C). The marketplace.json already points at the solo; this directory will be removed once reconciliation completes.
- **`docs/`** — ecosystem-level documentation, migration plan, the Self-Evolving Plugin Framework thesis.
- **Stats snapshots** — daily npm download counts per plugin CLI.

Plugin source code does **not** live here. Find it in the solo repos linked above.

## Promotion from canary → stable

A one-commit change on this repo:

1. Work lands on a solo repo's `main` and gets tagged (`vX.Y.Z`)
2. Edit `.claude-plugin/marketplace.json` — bump that plugin's `ref` field to the new tag
3. Commit + push

Stable-channel users pick up the new version on their next `/plugin marketplace sync`.

## The "Vibe" thesis

AI-assisted creation has predictable patterns of friction — in software (vibe-coded apps cut corners on docs, security, testing, scope discipline) and in long-form authoring (theses and articles drift without a strong opening stance, fade into self-praise, lack a research-grounded foundation). The Vibe ecosystem closes those gaps with **foundations underneath and process pillars on top**:

- **Foundations.** Establish what you're working on (knowledge) and the structural file every agent decision rests on (CLAUDE.md).
  - **Thesis Engine** — knowledge foundation: research feeder (topics, primary sources, opposing positions, methodology, prior art)
  - **Vibe Keystone** — structural foundation: bootstraps a tenant-aware `CLAUDE.md` so every other plugin operates on a consistent contract
- **Pillars — process.** Shape how you work once foundations are in place.
  - **Vibe Cartographer** — plot the course from idea to shipped app (vibe coding course correction)
  - **Vibe Doc** — close the documentation vacuum (ADRs, runbooks, threat models, etc.)
  - **Vibe Sec** — close the security vacuum (secrets, auth, input validation, dependencies)
  - **Vibe Test** — close the testing vacuum (smoke → behavioral → edge → integration)
  - **Vibe Thesis** — long-form academic authoring (dissertations, theses, position essays)

Each plugin knows its scope. None pretends to replace specialist tools or professional review. Together they're the baseline hygiene kit for AI-assisted creation in 2026.

## Architecture: classification-driven, tier-appropriate

Every plugin in this ecosystem classifies the target work (project type, deployment context, risk profile, audience) and measures against a tier-appropriate bar — not an absolute bar. Prototypes get prototype-level scrutiny. Regulated apps get regulated-level scrutiny. Class papers get class-level review; dissertations get dissertation-level review. The plugin tells you what's missing for *your situation*, not for a theoretical ideal.

## Self-Evolving Plugin Framework

All plugins adopt the framework documented at [vibe-cartographer/docs/self-evolving-plugins-framework.md](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md):

- **Level 1** — Persistent builder profile at `~/.claude/profiles/builder.json`
- **Level 2** — Session memory at `~/.claude/plugins/data/<plugin>/sessions/*.jsonl`
- **Level 3** — Reflective evolution (the plugin reads its own session logs and proposes SKILL improvements)

New Vibe plugins ship with Level 2 from day 1.

## Credits

Built by [626Labs LLC](https://626labs.dev) — Fort Worth, TX.

## License

MIT

## Ecosystem stats

Daily npm download counts for every tracked package are collected by [`scripts/npm-stats.py`](./scripts/npm-stats.py) and committed to [`data/stats/`](./data/stats/) by the `npm download stats` workflow at 14:00 UTC daily. The append-only [`history.jsonl`](./data/stats/history.jsonl) is the data source for the eventual 626Labs Dashboard widget; `data/stats/YYYY-MM-DD.json` holds the latest snapshot for each day.
