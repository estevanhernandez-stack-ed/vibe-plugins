---
description: "Posture — read-only ambient summary. No scans, no generation, no mutations. Renders classification + weighted score vs tier target + gap counts by level + last-audit/generate timestamps in ≤40 terminal lines in <3s on the minimal-spa fixture. Detects state freshness (stale audit, pending tests, generate-able gaps) and suggests next commands inline as questions — never executes."
argument-hint: ""
---

Use the **posture** skill to handle `/vibe-test:posture`.

Read `skills/posture/SKILL.md` and follow it end to end. The posture command:

1. Checks the blocking prereq — `.vibe-test/` must exist. If absent, render a ≤10-line degraded-summary banner pointing at `/vibe-test:audit` and exit cleanly. Do NOT scaffold `.vibe-test/` on the builder's behalf (posture is read-only).
2. Parallel state reads (fail-fast on absence, 500ms timeout per read): project-state, audit.json, coverage.json, generate.json, gate.json, pending tests listing, pending fixes listing, last 10 beacons, modtime check on package.json + detected framework configs.
3. Composes a `PostureState` in-SKILL: classification, score, last-*-at timestamps, last-gate verdict, pending counts, gaps by level, audit_stale flag + reason.
4. P2 next-action routing (SKILL reasoning, picks most-specific rule):
   - No audit yet → "run `/vibe-test:audit`?"
   - Audit ≥7 days OR source drift → "audit is stale — re-audit?"
   - Pending tests > 0 → "accept staged tests first?"
   - Pending fixes > 0 → "review staged fixes?"
   - Gaps present + no pending → "close some with `/vibe-test:generate`?"
   - All fresh + gate FAIL → "`/vibe-test:generate` for the top gap?"
   - All fresh + gate PASS → "ship it, or iterate?"
   Every suggestion is phrased as a **question**. Posture never executes.
5. P1 ≤40-line banner — fixed skeleton with conditional sections (modifiers row, pending section, last-activity block all omit when empty); per-level breakdown compacted to one line.
6. Emits three output views in parallel: banner to chat (line-count verified ≤40), markdown (`docs/vibe-test/posture-<date>.md`, longer allowed), JSON sidecar (`.vibe-test/state/posture.json`, skipValidation since no posture-state schema in v0.2).
7. Writes only session-log terminal entry — NO beacon write (posture is read-only; beacons are action signals) and NO project-state mutation.
8. Performance budget: **<3 seconds on minimal-spa fixture** (P1 hard constraint). Parallelize reads; never call `scan()`, `runCoverage()`, or any classifier.
9. No explicit handoff line — the next-action question IS the handoff.

Every user-facing string respects `src/reporter/tier-adaptive-language.ts` verbosity knobs. JSON output is level-invariant.

Do **not** prescribe `/clear` between commands — Claude Code auto-compacts.
