# Vibe Plugins (the marketplace)

> **Persona:** This repo inherits The Architect from `~/.claude/CLAUDE.md`. No need to re-establish — just adds project context below.

## Tech Stack & Voice

- **Stack:** Node ≥20, pnpm ≥9 workspace. TypeScript in `packages/core/` (built with `tsc`). Python 3.11 for the stats + bundle scripts. GitHub Actions for the daily stats job.
- **Repo role:** **Marketplace aggregation manifest.** The load-bearing artifact is `.claude-plugin/marketplace.json`. Plugin source code lives in solo repos; this repo points at stable tags via the `git-subdir` source type.
- **Voice (README + marketplace.json descriptions):** Builder-to-builder, second person, sentence case. No "empower / leverage / seamlessly / unlock / unleash." Em-dashes welcome. No emoji in marketing copy. The README is the storefront — keep it sharp. Tagline: *Imagine Something Else.*

## What's where

| Path | What it is |
|---|---|
| `.claude-plugin/marketplace.json` | **The load-bearing file.** Stable-channel manifest. Each plugin entry pins a `ref` to a tag on its solo repo. |
| `README.md` | Public storefront. Explains the plugins (see `marketplace.json` for the live roster), the canary/stable channel model, install steps. |
| `packages/core/` | `@626labs/plugin-core` — shared npm package (scanner, classifier, session-logger, state, ci-check, profile, composition). Currently v0.0.1 — interface skeleton with stub implementations. Not a plugin; not in marketplace.json. |
| `scripts/npm-stats.py` | Daily npm download snapshot collector. Run by GitHub Actions at 14:00 UTC daily. |
| `scripts/build-plugin.py` | Plugin bundler — produces `.plugin` archives in `bundles/`. Mostly historical; aggregation model doesn't need it. |
| `data/stats/YYYY-MM-DD.json` | Daily snapshot of npm download counts. |
| `data/stats/history.jsonl` | Append-only history of all snapshots — data source for the eventual 626Labs Dashboard widget. |
| `bundles/` | Built `.plugin` archives. Pre-aggregation artifacts; mostly stale. |
| `docs/migration-plan.md` | Monorepo → solo-repo aggregation pivot. Steps 1–10b complete; 10c (human UI verification) pending. |
| `.github/workflows/npm-stats.yml` | Daily stats automation (cron `0 14 * * *`). |

## How this marketplace works

### The two-channel model

| Channel | URL users paste | What they get |
|---|---|---|
| **Stable** | `estevanhernandez-stack-ed/vibe-plugins` (this repo) | Tagged versions pinned in `marketplace.json` — promoted, tested |
| **Canary** | `estevanhernandez-stack-ed/<plugin>` (solo repo) | Latest `main` — bleeding edge, occasional breakage |

### Promotion flow (canary → stable)

1. Work lands on a solo repo's `main`.
2. Solo repo gets tagged (`vX.Y.Z` or `<plugin>-vX.Y.Z` — see naming note below).
3. Edit `.claude-plugin/marketplace.json` here — bump that plugin's `ref` field to the new tag.
4. Commit + push. Stable users pick up the new version on next `/plugin marketplace sync`.

That's the entire stable-channel ship process. Most commits to this repo are exactly that one-line ref bump.

### The plugins

**`.claude-plugin/marketplace.json` is the source of truth for the live roster.** Don't hand-count the family or trust a frozen number in this file — derive both from the manifest (Node ≥20 is already a repo dependency, so this runs anywhere):

```bash
# count
node -e "console.log(require('./.claude-plugin/marketplace.json').plugins.length)"
# roster: name | solo repo | path | pinned ref
node -e "for(const p of require('./.claude-plugin/marketplace.json').plugins){const s=p.source;const r=(s.url||'https://github.com/'+s.repo).replace('https://github.com/','');console.log([p.name,r,s.path||'(root)',s.ref].join(' | '))}"
```

The table below is a convenience snapshot regenerated from that command — if it disagrees with the manifest, the manifest wins; re-run the roster one-liner to refresh it.

| Plugin | Solo repo | Path within solo |
|---|---|---|
| `vibe-cartographer` | `vibe-cartographer` | `plugins/vibe-cartographer` |
| `vibe-doc` | `Vibe-Doc` | `packages/vibe-doc` |
| `vibe-test` | `vibe-test` | `packages/vibe-test` |
| `vibe-sec` | `vibe-sec` | `packages/vibe-sec` |
| `thesis-engine` | `Thesis-Engine` | `plugins/thesis-engine` |
| `vibe-thesis` | `Vibe-Thesis` | `plugins/vibe-thesis` |
| `vibe-keystone` | `vibe-Keystone` | `plugins/vibe-keystone` |
| `vibe-iterate` | `vibe-iterate` | `plugins/vibe-iterate` |
| `vibe-taker` | `vibe-taker` | `plugins/vibe-taker` |
| `vibe-walk` | `Vibe-Walk` | `plugins/vibe-walk` |
| `vibe-insights` | `vibe-insights` | — (whole-repo) |
| `vibe-wrap` | `vibe-wrap` | `plugins/vibe-wrap` |
| `vibe-prompt` | `Vibe-Prompt` | `plugins/vibe-prompt` |

`vibe-insights` uses the `url` source type (whole-repo over explicit HTTPS, manifest at root, no subpath — switched from `github` on 2026-06-09 because that type resolves SSH clone URLs and fails with publickey-denied for users without GitHub SSH keys); the other 12 use `git-subdir` with a `path`. Account for both branches when scripting against the manifest — the one-liner above already does. Don't reintroduce the `github` source type here.

**Validation norm:** every plugin in the family is proven against a real app before it ships — Cart is dogfooded across build cycles (it builds the others), Taker was proven on the bgremove + Sanduhr features, Doc scanned the 626 hub, Walk was dogfooded on Celestia3, etc. Real-app validation is the bar, not the exception.

**Tag-naming drift:** all plugins use plain `vX.Y.Z` **except** `vibe-test` and `vibe-sec`, which use `<plugin>-vX.Y.Z` (rooted in their `git-filter-repo` extraction history). Don't normalize without checking the solo repo's actual tag list.

### `@626labs/plugin-core`

Shared TypeScript package eventually consumed by every plugin. Status: **v0.0.1 — interface skeleton.** Modules export typed interfaces with stub implementations that throw "not yet implemented." Phase 2 of the migration extracts reference implementations from Vibe Doc and Vibe Cartographer. See `packages/core/README.md` for the extraction order.

Plugins pin to `^0.x.x` and move in lockstep on minor bumps. Breaking changes are major bumps with migration notes.

### Daily npm download stats

GitHub Actions runs `scripts/npm-stats.py` at 14:00 UTC, writes `data/stats/YYYY-MM-DD.json`, appends to `data/stats/history.jsonl`, and auto-commits as `github-actions[bot]`. The history file is the long-term data source; daily files are convenient for spot-checks.

## Common tasks

| You want to… | Path / command |
|---|---|
| Promote a plugin from canary to stable | Edit the relevant `ref` in `.claude-plugin/marketplace.json`, commit, push |
| Verify a pinned ref actually resolves | `gh api repos/<owner>/<repo>/git/refs/tags/<tag>` per pinned ref |
| Build the shared core package | `pnpm --filter @626labs/plugin-core build` (or root `pnpm build`) |
| Type-check everything | `pnpm type-check` |
| Run tests | `pnpm test` (only `packages/core/` runs anything today) |
| Inspect long-run stats | `data/stats/history.jsonl` (append-only JSONL) |
| Inspect a recent stats snapshot | `data/stats/YYYY-MM-DD.json` |
| See what changed in the migration | `docs/migration-plan.md` |

## Conventions

- **Commits:** Conventional commits. Common types in this repo:
  - `chore(marketplace)` — ref bumps and manifest edits
  - `stats:` — automated daily snapshots (bot-authored)
  - `docs:` — README / migration-plan changes
  - `fix(marketplace)` — manifest fixes
  - `feat` — adding a plugin entry
  - `chore` — tooling and workflow changes
- **Style:** TypeScript strict in `packages/core/`. Python scripts target 3.11. No formatter is enforced repo-wide — match the existing file's style.
- **File rules:**
  - `.claude-plugin/marketplace.json` is the **canonical aggregation source.** Anything else that lists plugins (README, docs) is downstream and must update when this changes.
  - `data/stats/` is **bot-owned.** Don't hand-edit; the workflow assumes it's the only writer.
  - `bundles/` is **legacy** — pre-aggregation artifacts. Don't add to it.

## Decisions log

Significant decisions log to the **626Labs Dashboard** via MCP (`mcp__626Labs__manage_decisions log`). Tag with the bound project ID. The bar: *would future-you (or someone asking "why this approach?") want to know this in 3–6 months?*

Especially:
- **Promotion calls** — *why* a given plugin got bumped to a new ref now (timing, what's in the release, who asked).
- **Cross-plugin coordination** — when ref bumps need to ship together (e.g., a `@626labs/plugin-core` minor bump that several plugins depend on).
- **Channel-model changes** — anything touching the canary/stable boundary or how users discover the marketplace.
- **Schema or tag-naming changes in `marketplace.json`** — even small ones; downstream tooling reads this.
Skip the routine: ref-bump commits with no surprises, automated stats commits, typo fixes, copy edits.

If unbound (no 626Labs project): tag the decision with `vibe-plugins` in the description and set `projectId: null`.

## What NOT to do

- **Don't edit `marketplace.json` and the solo repo in parallel.** The flow is linear: ship on the solo first, tag, then bump the ref here. Editing both at once breaks the promotion-is-a-deliberate-act invariant that the whole channel model rests on.
- **Don't pin a plugin's `ref` to `main` or a SHA.** Stable channel means stable tags. If a plugin doesn't have a usable tag yet, either tag it on the solo or leave users on canary. "Stable" has to mean something.
- **Don't hand-edit `data/stats/`** — bot territory. If the cron job is wrong, fix `scripts/npm-stats.py` or `.github/workflows/npm-stats.yml`, not the output.
- **Don't republish `@626labs/plugin-core` casually.** It's v0.0.1 with stub implementations; downstream plugins import it expecting interface stability. Coordinate any version bump with the plugins that depend on it.
- **Don't normalize tag naming across plugins without checking actual tag history.** Test and Sec use `<plugin>-vX.Y.Z`; others use `vX.Y.Z`. There's a reason rooted in their extraction lineage — verify before "fixing."
- **Don't commit secrets.** No `.env`, no npm tokens. The stats workflow uses the auto-injected `GITHUB_TOKEN`; nothing else here needs auth.

## References

- Migration plan (monorepo → aggregation): `docs/migration-plan.md`
- Self-Evolving Plugin Framework: [vibe-cartographer/docs/self-evolving-plugins-framework.md](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md)
- Shared core package details: `packages/core/README.md`
- Stats automation: `.github/workflows/npm-stats.yml`, `scripts/npm-stats.py`
- Public storefront: `README.md`
