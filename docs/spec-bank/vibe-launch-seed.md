# Seed: vibe-launch — the release-engineering pillar

**Status:** COWPATH-EVIDENCED SEED, written 2026-06-09 (GAP-04 of `../quality-net-gap-analysis-2026-06-09.md`). The cowpath was walked nine times in one day — every release + promotion of the gap-analysis remediation waves ran the loop by hand through the new marketplace gate. This document is the process-notes capture; the birth (solo repo, cowpath-first doctrine satisfied) can execute from here.

## The job nobody owns

Ship/release engineering across 13 solo repos: version coherence, changelogs, tags, marketplace promotion, drift. Cart's spec SKILL already defers to "vibe-launch" by name. Until today the loop was entirely manual; today it ran 9 times (thesis-engine v0.2.3, cart v1.10.1, vibe-doc v0.8.1 + v0.8.2, vibe-sec v0.7.1 + v0.8.0, vibe-test v0.3.0, vibe-walk v0.3.0, vibe-iterate v1.3.0) and the manual loop's failure modes showed up on schedule.

## The loop, as actually walked (per release)

1. Version bump in **2–4 places** that must agree: `plugin.json`, `package.json` (when npm-published), SKILL frontmatter `version:` (when present), CHANGELOG heading. Real slip caught today: thesis-engine's SKILL frontmatter sat at 0.2.1 while plugin.json said 0.2.2 — two releases of drift.
2. CHANGELOG entry — **three repos had no CHANGELOG at all** (walk's was backfilled today with an owed migration note; thesis-engine and the vibe-doc package still have none).
3. Test suite green — real slip: vibe-sec **v0.7.0 was tagged with a red test** (the CLI parity suite spawned a deleted file); nothing gated the tag.
4. Conventional commit (per-repo flavor varies) + **annotated tag** — two naming conventions (`vX.Y.Z` vs `<plugin>-vX.Y.Z`, extraction lineage; never normalize).
5. Push main + tag.
6. Marketplace: ref bump, **description sync when the release changes the storefront story** (vibe-sec's ten→eleven concerns, walk's a11y clause — easy to forget), gate run (`scripts/marketplace_gate.py --only <plugin>`), burn-down row strike when cleared, `chore(marketplace)` commit, push.
7. Decision log when non-routine.

Other slips the day surfaced: vibe-test's pnpm-lock was stale against a committed package.json (frozen installs failing since the standalone-bundling commit); keystone main 5 ahead of its tag **including a real fix** with both channels self-reporting the same version; taker 6 ahead with its entire test suite unreleased; vibe-sec-cli's banner prints v0.2.0 while its package.json says 0.6.0.

## Plugin shape (three commands, thin by design)

- **`:release`** — the pre-tag coherence gate, run in a solo repo: all version sites agree with each other and with the proposed tag; CHANGELOG top entry matches; suite green; lockfile fresh against manifests; this repo's burn-down rows clear; then (gated, explicit) bump → CHANGELOG scaffold → commit → annotated tag (convention-aware) → push. Every failure above becomes a check here.
- **`:promote`** — the marketplace side: ref bump, prompts for description sync when CHANGELOG signals user-facing change, runs the gate, strikes burn-down rows, writes the `chore(marketplace)` commit, prompts the decision log per the checklist's row 9.
- **`:drift`** — commits-ahead sweep across all pins, flagging unreleased *fixes* (not just docs) sitting on main — the keystone/taker class. Note: the gate's drift column already reports ahead-counts; `:drift` adds the fix-vs-docs classification and the nag.

Composes with, never duplicates: `scripts/marketplace_gate.py` (the mechanical checks), `docs/conventions/promotion-checklist.md` (the contract — `:release`/`:promote` are its executable form), vibe-test's vitals #8 (tag-vs-manifest, the per-plugin precedent to generalize). Deploy-target rails beyond the marketplace (npm publish, MS Store/Partner Center checklist, gh release) are v2 — the marketplace loop is the proven cowpath; don't speculate the rest.

## Family conventions to honor at birth

Solo repo (`vibe-launch`), no telemetry, session+friction loggers + `:evolve-launch` from day 1, state in `.vibe-launch/`, real-app validation = run `:release` + `:promote` on the next actual plugin release and diff against the hand loop. Tag-convention table and the gate invocation are read from this repo, not duplicated.

## Strengthened 2026-10-01: smoke the published artifact, not the dev tree

The same rule surfaced three times in the Sonnet 5.5 sweep window, in three products, and belongs in `:release`:

- **Sanduhr PR #55** (decision 2026-09-13, verified): three defects, each of which would have made the shipped MCP feature a no-op or a crash for Store and Velopack users, passed the unit suites and the dev-tree live smoke. Only publishing with the exact release-script arguments and cold-running the published artifact exposed them (the after-build copy invisible to `dotnet publish -o`, a per-home config path, and a trimmer crash on `tools/list`). The fix added `scripts/smoke-mcp.ps1` plus a runbook step that cold-runs the published exe.
- **SnapSnip's Settings window** was dead on the shipped build for three months while the dev tree opened it fine (sweep brief).
- **RBX15 v4.0.0** had its Store tile rejected on a defect the repo build never showed (sweep brief).

A fourth from July makes the same point from the installer side: Sanduhr's first Velopack release used a packId that installed into the app's own data directory, and the installer's rollback-rename-then-delete destroyed the usage vault at install time. The pre-publish install test caught it; publish-then-discover would have shipped a vault-destroyer (decision 2026-07-14, verified).

So `:release` gains a step between "suite green" and "tag": **build with the exact release arguments, install or cold-run the produced artifact, and exercise the surfaces the release notes and reviewer letter promise.** It is a per-repo script the plugin calls, never a check the plugin invents, and it reports what it ran. A release whose repo has no such script gets the finding, not a pass.

Two smaller additions from the same window:

- **Version-bound text must open with the version.** Sanduhr 3.4.0 published with 3.3's description; RORORO 1.32's six localized sheets still carried the 1.31 what's-new, and the only signal was a console warning. `:release` checks CHANGELOG, release notes and any what's-new sheet for the version it is about to tag, and hands copy quality to `vibe-market :lint` when that exists (see `vibe-market-seed.md`).
- **The release caller is itself a release check.** Six of thirteen plugin repos carry the ten-line tag-push caller that makes tagging into releasing; the seven without it are the worst release-lag cases in the 2026-09-11 sweep. `:release` reports a missing caller as a finding, so the "shipped but unreleased" class stops depending on memory.

**The v2 boundary moves.** The Store and Partner Center leg the seed deferred now has a walked cowpath in `store-listing-console`: listings written through the Store API, packages uploaded by hand, read-back verification before a commit that happens only on a typed word, and a measured correction of the "one-way door" rule (a mixed submission is not uncommittable; each side simply cannot see the other's edits until the commit). A `:promote`-for-store can be specced from that record rather than speculated. It is still not v1; the marketplace loop remains the proven cowpath.
