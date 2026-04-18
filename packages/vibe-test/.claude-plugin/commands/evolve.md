---
description: "Evolve — reflective Level-3 loop for Vibe Test itself. Reads the last 30 days of friction / wins / session logs, weights them with absence-of-friction inference (Pattern #14), and proposes SKILL edits in packages/vibe-test/proposed-changes.md. Never auto-applies. NOTE: this command improves Vibe Test, not your app — for your app run /vibe-test:audit."
argument-hint: "(no args — reads from ~/.claude/plugins/data/vibe-test/)"
---

Use the **evolve** skill to handle `/vibe-test:evolve`.

Read `skills/evolve/SKILL.md` and follow it end-to-end. This command is for Vibe Test's own self-improvement — it reads the Vibe Test usage logs (friction, wins, sessions) under `~/.claude/plugins/data/vibe-test/` and proposes SKILL-file edits that land in `packages/vibe-test/proposed-changes.md`. Nothing auto-applies.

Key discipline:

1. Pre-flight via `skills/vitals/SKILL.md` (Pattern #8) — abort if the house is dirty unless builder overrides.
2. Read 30-day friction + wins + session history, weight by confidence (high=1.0 / medium=0.6 / low=0.3).
3. Apply Pattern #14 absence-of-friction: count clean runs per command — those baselines weight against the proposal.
4. Cap at 5 proposals per run. Write to `packages/vibe-test/proposed-changes.md` with `status: pending`.
5. Builder accepts manually → moves entry into `packages/vibe-test/applied-changes.md` with commit hash.
6. Three-render output (markdown + banner + JSON sidecar under `.vibe-test/state/evolve-<ISO>.json`).
7. Session-log at start + end per two-phase protocol.

Do **not** touch the user's app — `/vibe-test:evolve` never scans, classifies, or modifies project code. For the user's app run `/vibe-test:audit`. Do **not** prescribe `/clear` between commands — Claude Code auto-compacts.
