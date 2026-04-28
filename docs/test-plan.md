# Test Plan — Vibe Plugins (aggregated marketplace)

This file describes what gets tested in the `vibe-plugins` repo
specifically — the aggregation layer, shared packages, and stats
infrastructure. **Per-plugin behavior is tested in each plugin's solo
repo.** This repo's test surface is intentionally small.

## Scope

What lives in this repo and is in scope for this test plan:

- **`.claude-plugin/marketplace.json`** — load-bearing manifest pinning
  each plugin to a stable tag.
- **`packages/core/`** — `@626labs/plugin-core`, the shared TypeScript
  npm package (scanner primitives, session logger schema, state helpers).
- **`packages/vibe-doc/`** — transitional copy pending reconciliation
  with the solo repo (see `docs/migration-plan.md`). **Out of scope**
  here; covered by the solo-repo test plan after reconciliation.
- **`scripts/npm-stats.py`** + **`scripts/build-plugin.py`** — daily
  stats collector and plugin bundler.
- **`.github/workflows/npm-stats.yml`** — daily cron that runs the
  stats collector.
- **`.claude/agents/*`** — custom agent definitions (`marketplace-promotion-reviewer`,
  `marketplace-validator`).

Out of scope (each tested in its own solo repo):
- Vibe Cartographer behavior (`vibe-cartographer` repo).
- Vibe Doc / Test / Sec / Thesis / Thesis Engine / Keystone behavior.

## Test surfaces

### 1. Marketplace manifest validation

The single highest-leverage test in this repo. A malformed manifest
breaks installs for every user. **`marketplace.json` is also this repo's
[API specification](./api-spec.md)** — these checks are the spec
enforcement gate. Validate on every PR that touches
`.claude-plugin/marketplace.json`:

| Check | What | Why |
|---|---|---|
| Valid JSON | `python -m json.tool < .claude-plugin/marketplace.json` | Syntax errors silently disable the marketplace. |
| Schema shape | Each plugin entry has `name`, `description`, `source` (with `source`, `url`, `path`, `ref` for `git-subdir` entries). | Missing fields cause the plugin host to skip the entry. |
| Fully-qualified URLs | `source.url` starts with `https://` or `git@` (not bare `github.com/...`). | Bare hostnames produce "Invalid git URL" — exact failure mode hit on 2026-04-26 (commit `0313efd`). |
| Ref existence | For each entry: `git ls-remote --tags <url> refs/tags/<ref>` returns a SHA. | Pinning to a non-existent tag breaks installs without warning. |
| Path resolution | The `path` (e.g., `plugins/vibe-cartographer`) contains `.claude-plugin/plugin.json` at the pinned ref. | Otherwise the plugin host can't find the plugin manifest within the cloned subdirectory. |
| Unique names | No two plugin entries share a `name`. | Plugin host install path is `<name>@<marketplace>`; collisions are ambiguous. |

**Manual run:** there is currently no CI gate enforcing these. Run by
hand before pushing a marketplace bump. **Automate this** as the next
test-plan-evolution step (see "Future automation").

### 2. Shared package — `@626labs/plugin-core`

| Check | Command | Pass criteria |
|---|---|---|
| Install | `pnpm install` from repo root | Exit 0, no peer-dep warnings on supported Node versions. |
| Build | `pnpm --filter @626labs/plugin-core build` | TypeScript compiles with zero errors. |
| Type-check | `pnpm --filter @626labs/plugin-core type-check` | No type errors. |
| Exports | Importable surface matches what consumers (`vibe-test`, `vibe-doc`) expect. | Smoke-import `import { /* known exports */ } from '@626labs/plugin-core'` in a fresh project works. |

**No unit tests yet for `packages/core`.** This is a real coverage gap
for a shared package consumed by multiple plugins. Tracked as a future
work item in `0004-solo-repo-per-plugin.md`'s consequences (cross-plugin
refactoring is harder without test coverage on the shared layer).

### 3. Stats scripts (`scripts/npm-stats.py`)

The daily npm download collector. Failure = silent gap in
`data/stats/`; bad data = misleading download counts.

| Check | What |
|---|---|
| Idempotent | Running twice on the same day produces identical `data/stats/YYYY-MM-DD.json`. |
| Append-only | `data/stats/history.jsonl` only grows, never rewrites past entries. |
| Schema stable | Each `data/stats/YYYY-MM-DD.json` has top-level `timestamp`, `day`, `packages` keys. Each package entry has `last_day`, `last_week`, `last_month` (number or null). |
| Resilient to missing packages | A 404 on one npm package (e.g., not yet published) results in `null` values, not a crash. |
| Workflow runs daily | `.github/workflows/npm-stats.yml` cron fires at 14:00 UTC; commits land in `main`. |

**Manual smoke:** `python scripts/npm-stats.py` should run from repo
root, fetch all tracked packages from npm, and write a fresh snapshot.

### 4. Documentation integrity

| Check | What |
|---|---|
| README links resolve | `README.md` table links to each solo repo's GitHub URL — all should return 200. |
| INSTALL.md commands accurate | The `/plugin marketplace add` and `/plugin install` commands actually work end-to-end on a fresh Claude Code install. (Manual.) |
| ADR index in sync | `docs/adrs/README.md` index lists every file in `docs/adrs/` (excluding `template.md`). |
| Marketplace description matches README | The `description` field in `.claude-plugin/marketplace.json` should be consistent with the README's opening sentence. Drift is a smell. |

### 5. Per-plugin smoke (cross-repo)

This repo doesn't run plugin behavior tests. Each solo repo owns its
own test plan and CI:

| Plugin | Test plan location |
|---|---|
| Vibe Cartographer | `vibe-cartographer/docs/test-plan.md` (or successor) |
| Vibe Doc | `Vibe-Doc/docs/test-plan.md` |
| Vibe Test | `vibe-test/docs/test-plan.md` (Vibe Test is itself a test framework — meta-tests in `vibe-test/tests/`) |
| Vibe Sec | `vibe-sec/docs/test-plan.md` |
| Vibe Thesis | `Vibe-Thesis/docs/test-plan.md` |
| Thesis Engine | `Thesis-Engine/docs/test-plan.md` |
| Vibe Keystone | `vibe-Keystone/docs/test-plan.md` |

If a solo repo lacks a test plan, that's tracked as a per-plugin doc
gap, not a vibe-plugins gap.

## CI gate strategy

**Today:** No automated CI gate runs on this repo. Marketplace bumps
land via direct push to `main` and rely on human review.

**Near-term target** (worth filing): A GitHub Actions workflow that:

1. Triggers on PR to `main` modifying `.claude-plugin/marketplace.json`.
2. Runs surface 1 (manifest validation) checks.
3. Blocks merge on any failure.
4. Posts a summary comment showing each plugin entry's resolved
   tag SHA.

This closes the most painful failure mode (broken installs from a
typo'd ref) without burdening solo-repo test plans.

## Manual test scenarios

Run these on every release-cycle promotion (i.e., when bumping a
plugin's `ref` in the marketplace):

1. **Fresh install — Claude Desktop / Cowork (UI):** Add the
   marketplace from a clean profile, sync, install one plugin, run a
   slash command from it.
2. **Fresh install — Claude Code CLI:** `/plugin marketplace add ...`
   then `/plugin install <plugin>@vibe-plugins`. Confirm the slash
   commands appear after `/reload-plugins`.
3. **Cache-stale recovery:** With the marketplace already added,
   `/plugin marketplace remove vibe-plugins` then re-add. New ref
   bump should resolve.
4. **npm CLI path:** `npm install -g @esthernandez/vibe-test-cli`,
   then run `vibe-test audit --cwd .` in any project. Should produce
   output without erroring.
5. **Anthropic's official marketplace** (Cart only): install Cart
   from Anthropic's curated catalog, confirm slash commands match
   what the solo-repo install produces.

## Future automation

In rough priority order:

1. **CI manifest validator** — surface 1 checks as a GitHub Actions
   workflow. Blocks merge on broken refs / bare URLs / schema gaps.
2. **`packages/core` unit tests** — at least smoke-test each exported
   function. Vitest is already in use in sibling packages.
3. **Stats schema validator** — JSON Schema for
   `data/stats/YYYY-MM-DD.json`; CI run on PRs that touch the
   stats workflow.
4. **Cross-repo smoke** — periodic (weekly?) workflow that, for each
   plugin in the marketplace, clones the pinned tag and confirms the
   plugin manifest is parseable. Catches drift if a solo repo
   force-deletes or rewrites a tag.

Each of these is a tracked gap, not a current test. Pending until the
ecosystem stabilizes enough that the CI investment pays back.
