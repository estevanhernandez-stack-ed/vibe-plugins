---
description: "Gate — single pass/fail for tier enforcement. Runs audit + coverage (reusing fresh state when available), applies tier threshold via the locked weighted-score formula, and exits 0 (pass) / 1 (threshold breach) / 2 (tool error). Auto-detects CI mode via `GITHUB_ACTIONS=true` or `--ci` flag; emits `::error::` / `::warning::` annotations + writes summary markdown to `$GITHUB_STEP_SUMMARY`. Local mode: diagnostic banner with 'what would it take to pass' guidance. Co-invokes `superpowers:verification-before-completion` when present (gate owns tier-threshold; discipline skill owns per-task completion)."
argument-hint: "[--ci] [--dry-run] [--tier <tier>]"
---

Use the **gate** skill to handle `/vibe-test:gate`.

Read `skills/gate/SKILL.md` and follow it end to end. The gate command:

1. Checks the blocking prereq — tier must be known (via fresh audit-state, `--tier <tier>` flag, or inline fast classification). If none succeed, halt with a pointer to `/vibe-test:audit`.
2. Auto-detects CI mode: `process.env.GITHUB_ACTIONS === 'true'` OR `--ci` flag. CI mode changes output format (annotations + `$GITHUB_STEP_SUMMARY`), not logic.
3. Pattern #13: announces `superpowers:verification-before-completion` for co-invoke contract — gate owns tier-threshold call; discipline skill owns per-task completion call. Explicitly no double verification.
4. Ga1 state resolution (Pattern #16 shaping prereq):
   - Audit-state fresh (<24h) → reuse; otherwise do a lightweight inline scan + classify (NOT a full audit).
   - Coverage-state fresh (<1h AND commit_hash matches current HEAD) → reuse; otherwise run coverage non-interactively (no adapter prompt — gate is decision, not measurement).
5. Ga1 verdict: calls `computeWeightedScore({perLevel, applicability, tier})` with the locked formula. Exit codes: 0 (pass), 1 (threshold breach), 2 (tool error — e.g., coverage run crashed, classification failed). `--dry-run` computes + renders but exits 0; real verdict lives in `gate.json.would_exit`.
6. Ga2 local-mode "what would it take to pass" guidance: for each applicable test level, computes marginal contribution if that level rose to 100%; sorts by highest marginal contribution per effort unit (smoke < behavioral < edge < integration). Top 3 shown with exact math.
7. Ga3 verification co-invoke: when `superpowers:verification-before-completion` is in available-skills AND verdict is PASS, announces the co-invoke. Skipped on FAIL or tool error (don't verify incomplete work).
8. Three output views — mode-dependent:
   - Local: markdown (`docs/vibe-test/gate-<date>.md`), banner, JSON (`.vibe-test/state/gate.json` with skipValidation since no gate-state.schema.json in v0.2).
   - CI: `::notice::` / `::warning::` / `::error::` annotations to stdout, summary markdown to `$GITHUB_STEP_SUMMARY` (when env var set), same `.vibe-test/state/gate.json` durable record.
9. Writes session-log (outcome: completed | errored) + beacons with verdict summary in the terminal phase.
10. Exits with the verdict code (0/1/2); `--dry-run` exits 0 regardless.

Every user-facing string respects `src/reporter/tier-adaptive-language.ts` verbosity knobs. JSON output is level-invariant. Annotations are level-invariant (CI consumers read structured output).

Handoff line format is *"Gate passed. Ship it."* on PASS or *"Run `/vibe-test:generate` to close the gaps."* on FAIL (persona-adapted). Do **not** prescribe `/clear` between commands — Claude Code auto-compacts.
