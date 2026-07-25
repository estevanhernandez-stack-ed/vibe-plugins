# Vibe Plugins (the marketplace)

> **Persona:** This repo inherits The Architect from `~/.claude/CLAUDE.md`. No need to re-establish — just adds project context below.

Marketplace aggregation manifest for the Vibe plugin family. Plugin source lives in solo repos; this repo pins each one to a stable tag. **The load-bearing artifact is `.claude-plugin/marketplace.json`** — not the README, not `package.json`. Most commits here are a one-line `ref` bump.

Two channels: **stable** is this repo (tagged, promoted), **canary** is a plugin's own solo repo (latest `main`).

## Gotchas

- **Never edit `marketplace.json` and a solo repo in parallel.** The flow is linear: ship on the solo, tag, verify the tag resolves (`gh api repos/<owner>/<repo>/git/refs/tags/<tag>`), then bump the `ref` here. Editing both at once breaks the promotion-is-a-deliberate-act invariant the whole channel model rests on.
- **Never pin a `ref` to `main` or a SHA.** No usable tag yet means leave users on canary. "Stable" has to mean something.
- **Don't reintroduce the `github` source type.** It resolves SSH clone URLs and fails publickey-denied for users without GitHub SSH keys. `vibe-insights` was switched to `url` on 2026-06-09 for exactly this reason; everything else uses `git-subdir` with a `path`. Script against both branches.
- **`data/stats/` is bot-owned.** The workflow assumes it is the only writer. If the cron is wrong, fix `scripts/npm-stats.py` or the workflow, never the output.
- **`bundles/` is legacy.** Pre-aggregation artifacts. Don't add to it.
- **Don't hand-count the roster or freeze it in a doc.** Derive it from the manifest. A hardcoded count goes stale silently and nothing catches it.

## Non-standard conventions

- **Tag naming diverges on purpose.** Plain `vX.Y.Z` everywhere except `vibe-test` and `vibe-sec`, which use `<plugin>-vX.Y.Z` from their `git-filter-repo` extraction history. It reads like a mistake. It is not. Check the solo repo's actual tag list before "fixing" it.
- **No formatter is enforced.** Match the existing file's style instead of reaching for prettier.
- **Real-app validation is the ship bar,** not the exception. Every plugin is proven against a real app before it ships.
- **`marketplace.json` is the canonical roster.** Anything else that lists plugins — README, docs — is downstream and updates when it changes.

## Rationale

`packages/core/` ships stub implementations that throw "not yet implemented." That is deliberate: it is an interface skeleton downstream plugins pin against at `^0.x.x` and move with in lockstep. Don't implement it to make something pass, and don't republish it casually — a version bump is cross-plugin coordination, not a chore.

## Pointers

- **Roster and count** — derive, never hardcode:
  ```bash
  node -e "console.log(require('./.claude-plugin/marketplace.json').plugins.length)"
  node -e "for(const p of require('./.claude-plugin/marketplace.json').plugins){const s=p.source;const r=(s.url||'https://github.com/'+s.repo).replace('https://github.com/','');console.log([p.name,r,s.path||'(root)',s.ref].join(' | '))}"
  ```
- Family conventions — promotion checklist, decision-log backend, data home, model tiering, operating doctrine: `docs/conventions/`
- Build-ready specs: `docs/spec-bank/`
- Aggregation pivot history: `docs/migration-plan.md`
- Shared core extraction order: `packages/core/README.md`
- **Voice** for the README and manifest descriptions inherits the 626Labs rules in `~/.claude/CLAUDE.md`. Repo-specific only: the README is the storefront, tagline *Imagine Something Else.*, no emoji in marketing copy.

## Decisions log

Significant decisions log to a decision-log MCP when one is available — the 626Labs Dashboard is auto-detected. It is optional: fall back to a file or your tracker, or skip. Tag with the bound project ID; if unbound, name `vibe-plugins` in the description and set `projectId: null`.

The bar: would someone asking "why this approach?" want to know in 3-6 months. Especially promotion calls (why this ref, why now), cross-plugin coordination, channel-model changes, and schema or tag-naming changes. Skip routine ref bumps, bot stats commits, and copy edits.
