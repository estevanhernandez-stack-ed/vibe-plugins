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
