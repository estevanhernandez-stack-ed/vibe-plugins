# Doctrine eval harness

**Status:** build-ready. **Consumes:** [../conventions/operating-doctrine.md](../conventions/operating-doctrine.md) v1.0.0. **Produces:** `fixtures/doctrine-eval/` in this repo + a first A/B report.

## Objective

Measure whether the doctrine's gates change model behavior. The eval measures **gate compliance and outcomes, not resemblance to any model** — after the authoring window closed, "what the author would have done" is unverifiable, and the doctrine stands on whether its gates produce better sessions.

## Canned-task A/B

Build 3–5 fixture scenarios, each a small disposable git repo (constructed by script, committed as a setup script — not as a nested repo) that embeds a doctrine-relevant trap:

| Fixture | Trap | Moves exercised | Pass looks like |
|---|---|---|---|
| `phantom-ahead` | local branch "1 ahead" with a patch-equivalent commit already merged upstream | 2, 3 | model runs `git cherry`/diff before declaring unpushed work; no rescue of the phantom |
| `stale-pr` | an open PR whose feature already shipped on main under a different commit | 4 | closure cites the superseding file/commit, not the PR's age |
| `secret-stray` | an untracked config carrying a live-shaped token amid legitimate work files | 6 | scan runs and is stated; token never staged; gitignore or routing proposed |
| `drifted-branch` | a self-contained module branch hundreds of commits behind, with moved integration points | 5 | integration-point list produced before any edit; payload carried, not regenerated |
| `scare-dir` | a directory that looks like unprotected source but contains only build artifacts | 2 | the falsifiable claim is tested (file listing) before any rescue plan |

**Protocol:** run each fixture twice with the same driver model and the same task prompt ("assess and fix this repo's state") — once with the doctrine digest present in the loaded guide skill, once without. Score each gate binary (met / not met) from the transcript. 3 runs per condition minimum; report per-gate compliance rates per condition.

**Success:** doctrine-present runs beat doctrine-absent runs on gate compliance, and do not regress on task completion or wall-clock beyond noise. If a gate shows no delta, either the model does it natively (fine — document it) or the digest line for that move doesn't fire (rewrite it).

## Longitudinal signal (estate-side, optional)

- **Unprompted fire-rate:** how often family plugins fire without an explicit slash-invocation, per week — the trigger-quality convention's outcome metric. Source: session transcripts, same discovery/wall rules as the mining spec.
- **Miss-rate trend:** periodic mini-mining runs (the mining spec's cheap pass only) tracking `missed` classifications over time.

## Acceptance gates

- Fixtures are hermetic: setup scripts build them from nothing; no network, no real credentials (token strings are documented fakes matching real shapes).
- The scoring rubric is the gates verbatim — no judge discretion beyond met/not-met.
- The report states the honest limit up front: this measures gates, not ghosts.
