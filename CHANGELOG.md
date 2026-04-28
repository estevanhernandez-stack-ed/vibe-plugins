<!-- markdownlint-disable MD024 -->
<!-- Keep-a-Changelog uses duplicate "Added / Changed / Fixed" headings per version by design. -->

# Changelog

All notable structural changes to the **`vibe-plugins` aggregated marketplace** are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Per-plugin changelogs live in each solo repo — this file only covers the marketplace, shared packages, scripts, and docs at the ecosystem level.

**Daily npm download snapshots committed to `data/stats/` are excluded** — they're auto-generated and produce too much noise to belong here.

This marketplace is not versioned with semver tags. Each entry is dated; promotions land via direct push to `main` and propagate to users on next plugin-marketplace sync.

## [Unreleased]

## [2026-04-28] — Foundations layer + ecosystem documentation

### Added

- **Vibe Keystone** added to the aggregated marketplace at `v0.1.0`. Bootstraps a 626Labs-pattern `CLAUDE.md` with tenant-aware adaptation. Joins Thesis Engine in the new "foundations" layer. ([`cd9108e`](../../commit/cd9108e))
- **`INSTALL.md`** at the repo root — full install guide with prerequisites table, decision tree, four install paths (UI / CLI / canary / npm CLI), update mechanics, and troubleshooting recipes baked from real install incidents this week. ([`cbf9956`](../../commit/cbf9956))
- **`docs/adrs/`** — Architecture Decision Records seeded with four real load-bearing decisions: aggregated marketplace pattern (`0001`), knowledge + structural foundations architecture (`0002`), no telemetry (`0003`), solo repo per plugin (`0004`). Plus a Nygard-format template and an index. ([`0c6e586`](../../commit/0c6e586))
- **`docs/test-plan.md`** — scoped to this repo's actual surface (marketplace aggregator, `packages/core`, stats scripts), defers per-plugin behavior testing to each solo repo. Explicit about what's NOT tested today. ([`10e6c43`](../../commit/10e6c43))
- **`docs/runbook.md` + `docs/data-model.md` + `docs/threat-model.md`** — operational, structural, and security companion docs. Runbook reframes "operations" around the evolution lifecycle (plugins learn about you over time; what survives updates / machine swaps / profile resets). Data model catalogs every piece of persistent state in six layers. Threat model names five concrete attack surfaces with current mitigations and open gaps — including the malicious-branch-contributor scenario that prompted the doc. ([`4bba104`](../../commit/4bba104))
- **`docs/api-spec.md`** — declares `marketplace.json` as this repo's API specification (no HTTP service exists; the manifest *is* the contract). Documents stability commitments per field, versioning policy, and the consumer surface. Future scans by any doc-gap tool now find an explicit spec at the expected location.

### Changed

- **Ecosystem description reframed.** "Knowledge as the foundation, plus pillars" → "knowledge **and structural** foundations, plus pillars." Thesis Engine remains the knowledge foundation; Vibe Keystone is now the structural foundation. Pillars (Cart, Doc, Sec, Test, Vibe Thesis) sit on top of both. Marketplace blurb and README updated to match. ([`cd9108e`](../../commit/cd9108e))
- **README architecture diagram updated.** Plugin count six → seven; Foundations table now has two rows (Thesis Engine + Vibe Keystone); install command block adds the Vibe Keystone line; the "Vibe thesis" architecture section explicitly names both foundations. ([`405db66`](../../commit/405db66))
- **README install section** now points at `INSTALL.md` for users / agents who want the deeper walkthrough. ([`cbf9956`](../../commit/cbf9956))

## [2026-04-27] — Thesis layer

### Added

- **Vibe Thesis** added to the aggregated marketplace at `v0.1.2` (beta). Long-form academic authoring — dissertations, master's theses, position essays. Standalone-friendly with bundled templates; pairs optionally with Thesis Engine and the ThesisStudio template. Sixth plugin in the marketplace. ([`6db2687`](../../commit/6db2687))
- **Thesis Engine** bumped `v0.2.0` → `v0.2.1`. ([`2a9aa3c`](../../commit/2a9aa3c))

### Changed

- **Ecosystem reframed (first pass).** Description shifted from "vibe coding course correction, documentation, security, testing for vibe-coded apps" to "knowledge as the foundation, plus pillars for vibe coding course correction, documentation, security, testing, and long-form academic authoring." Established Thesis Engine as foundation; pillars on top. Reframed once more on 2026-04-28 when Vibe Keystone joined as the structural-foundation companion. ([`6db2687`](../../commit/6db2687))

## [2026-04-26] — Vibe Cartographer 1.7.x release cadence

Single afternoon, four Cart releases driven by user-facing friction. The aggregated marketplace's `vibe-cartographer` ref bumped four times in succession.

### Added

- **Thesis Engine** added to the aggregated marketplace at `v0.2.0`. First plugin in what would become the foundations layer. Fifth plugin overall. ([`231ca26`](../../commit/231ca26))

### Changed

- **`vibe-cartographer` ref pinning** stepped through `v1.5.0` → `v1.7.0` → `v1.7.1` → `v1.7.2` → `v1.7.3` over the course of the day. Each bump corresponds to a real Cart release: 1.7.0 (six SKILL changes from `/evolve` + portability hint), 1.7.1 (`/onboard` auto-mode guard), 1.7.2 (autonomous flow end-to-end), 1.7.3 (submission-readiness polish). ([`88b599c`](../../commit/88b599c), [`2106402`](../../commit/2106402), [`28b11d2`](../../commit/28b11d2), [`b776de2`](../../commit/b776de2))

### Fixed

- **`fix(marketplace): add https:// scheme to plugin source URLs`.** Bare hostnames (`github.com/owner/repo`) in `source.url` were being rejected by Claude Code's installer with `Invalid git URL`. Affected all four plugin entries at the time. Symptom hit when adding the marketplace from a fresh machine. ([`0313efd`](../../commit/0313efd))

## [2026-04-21] — Pivot to aggregated-marketplace model

### Changed

- **Repo architecture pivoted** from monorepo (with plugin code inside) to aggregated-marketplace manifest (with plugin code in solo repos and pinned via `git-subdir` source entries). This was the load-bearing decision — captured 2026-04-28 as ADR `0001`. ([`017e402`](../../commit/017e402))

### Added

- **`docs/migration-plan.md`** drafted with the staged plan for moving plugin code out of this repo and into solo repos. Initial `marketplace.json` skeleton drafted. ([`aeae619`](../../commit/aeae619))

## [2026-04-19] — vibe-sec-cli v0.1.0 shipped

### Added

- **`@esthernandez/vibe-sec-cli`** at `v0.1.0` — secret-leak scanner. First CLI surface from the Vibe Sec project. Plugin-host wrapper still in development. ([`b8728d2`](../../commit/b8728d2))

## [2026-04-17] — Stats infrastructure

### Added

- **`scripts/npm-stats.py`** + **`.github/workflows/npm-stats.yml`** — daily cron at 14:00 UTC that writes per-package download snapshots to `data/stats/YYYY-MM-DD.json` and appends to `data/stats/history.jsonl`. Data source for the eventual 626Labs Dashboard widget. ([`monorepo: npm stats cron + daily history`])

## [2026-04-16] — Shared core package

### Added

- **`@626labs/plugin-core@0.0.1`** interface skeleton at `packages/core/`. Phase 2 foundation for shared scanner primitives, session logger schema, state helpers. Consumed by plugins that adopt the framework — not a plugin itself, not listed in the marketplace.

## [2026-04-15] — Initial scaffold

### Added

- **Initial commit.** Vibe Plugins monorepo scaffolded. At this point the repo was intended as a true monorepo holding all plugin code; it pivoted to the aggregated-marketplace model six days later (see 2026-04-21).
