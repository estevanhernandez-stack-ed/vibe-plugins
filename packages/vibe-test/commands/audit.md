---
description: "Audit — inventory + classify + score. Scans the repo, picks app type + tier + modifiers, measures coverage honestly, and ranks gaps tied back to classification."
argument-hint: "[--path <glob>] [--verbose | --terse]"
---

Use the **audit** skill to handle `/vibe-test:audit`.

Read `skills/audit/SKILL.md` and follow it end to end. The audit:

1. Checks the blocking prereq (git repo OR package.json present) and shapes behavior on `--path <glob>`.
2. Invokes the scanner (`src/scanner/scan`) to build an Inventory JSON.
3. Classifies:
   - App type via deterministic rule match (`classifyAppType`).
   - Tier via fuzzy reasoning — SKILL prose, may prompt the builder for disambiguation.
   - Context modifiers via deterministic helper (`classifyModifiers`).
4. Runs honest-denominator coverage with adaptation-prompt UX (never silent modification); falls back to `c8 --all`.
5. Identifies gaps per test level, ordered by severity × effort, with rationales tied back to classification.
6. Surfaces three harness-level finding types when detected: broken_test_runner, missing_test_binary, cherry_picked_denominator.
7. Handles mixed-stack repos (story A8) by classifying each portion separately and degrading confidence 0.9 → 0.6.
8. Emits three output views in parallel: markdown (`docs/vibe-test/audit-<date>.md`), terminal banner, JSON sidecar (`.vibe-test/state/audit.json` or `audit-<hash>.json` for scoped).
9. Writes `covered-surfaces.json` for vibe-sec consumption (two-way handshake).
10. Pattern #13: announces at most one anchored complement (vibe-doc / vibe-sec / playwright as applicable).
11. Writes session-log + beacons + project-state in the terminal phase.

Every user-facing string respects `src/reporter/tier-adaptive-language.ts` verbosity knobs. JSON output is level-invariant.

Handoff line format is `"Run /vibe-test:generate when ready"` (persona-adapted). Do **not** prescribe `/clear` between commands — Claude Code auto-compacts.
