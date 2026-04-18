---
name: evolve
description: "This skill should be used when the user says \"/vibe-test:evolve\" — reflective Level-3 loop for Vibe Test itself. Reads friction.jsonl + wins.jsonl + session logs from the last 30 days, weights them with Pattern #14 absence-of-friction inference, and writes proposed SKILL edits to packages/vibe-test/proposed-changes.md. Never auto-applies. This command improves Vibe Test; it does NOT improve the user's app."
---

<!-- Derived from vibe-cartographer 1.5.0 evolve SKILL (own-impl per Spec Decision 5 / Option a; migrate to @626labs/plugin-core in Phase 3). Scope narrowed to Vibe Test's file set + weighting algorithm tuned with Pattern #14 inference added. -->

# /vibe-test:evolve — Reflective Evolution (Pattern #10)

Read `skills/guide/SKILL.md` for baseline behavior, then execute this command.

You are a product designer for **Vibe Test itself**. You read every session, friction entry, and win the builder has logged; you identify patterns — friction clustered by command, repeated pushback, absence-of-friction signal weighting against change proposals — and you propose concrete SKILL file edits to address what you see. **The builder reviews and accepts manually; nothing auto-applies.**

This is Level 3 of the Self-Evolving Plugin Framework (see `docs/self-evolving-plugins-framework.md`, Patterns #8 Plugin Self-Test, #10 Agent-Authored Changelog, #14 Signal Asymmetry). The plugin reflects on its own usage and proposes its own shape — with consent, with evidence, and with the `proposed-changes.md` / `applied-changes.md` paper trail.

> **/vibe-test:evolve is for Vibe Test's self-improvement.** It does **not** touch the user's app, its tests, or its coverage. For the user's app, run `/vibe-test:audit` → `/vibe-test:generate` → `/vibe-test:fix`.

## Prerequisites

- **Blocking:** at least one session-log entry must exist under `~/.claude/plugins/data/vibe-test/sessions/`. If not: *"You haven't run any Vibe Test command yet. Run `/vibe-test` then `/vibe-test:audit` on a real project first, then come back."*
- **Blocking:** the builder must be invoking this from inside the Vibe Plugins monorepo (`packages/vibe-test/` reachable from cwd). If not: refuse — the SKILL writes to `packages/vibe-test/proposed-changes.md`, which requires the repo context.

## Before You Start

- **Data contracts:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — friction + wins + session-log shapes. Read every file listed there.
- **Friction triggers:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — per-command trigger map. Use this to decide what friction counts as signal for which command.
- **Plays-well-with:** [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) — anchored complements. Pattern-13 proposals against this map get extra scrutiny (they're universal commitments).
- **Vitals (pre-flight):** [`../vitals/SKILL.md`](../vitals/SKILL.md) — invoke at the top as a read-only structural check. If vitals reports ✗ failures, surface them in a "house is not clean" banner and ask the builder whether to proceed anyway. The default is **abort**; clean house first.
- **SKILL files you can propose edits to:** `packages/vibe-test/skills/**/SKILL.md`. Never propose edits to `docs/`, `tests/`, or `src/`.

## Session Logging

At command start, call `session-logger.start("evolve", <repo-root>)` (the vibe-plugins root, resolved from the SKILL's own file location). Hold the sessionUUID for the duration of this command. Pass it to any `friction-logger.log()` invocation (evolve itself does not emit friction per `friction-triggers.md`; proposal rejections become `default_overridden` against the **target** command — see Step 5b).

At command end, call `session-logger.end({ sessionUUID, command: "evolve", outcome })`:
- `completed` — full flow ran, proposals written to disk.
- `partial` — builder exited mid-review but vitals + analysis succeeded.
- `aborted` — pre-flight blocked on vitals or no data.
- `errored` — command crashed before the summary.

## Friction Logging

Per `friction-triggers.md` section `/vibe-test:evolve`: **this command emits no friction of its own.** Proposal rejections are logged as `default_overridden` against the SKILL the proposal targets (e.g., rejecting a `/vibe-test:audit` proposal emits `friction_type: "default_overridden"` with `command: "audit"`). Universal `repeat_question` / `rephrase_requested` rules still apply under the quoted-prior gate.

## Flow

### 1. Pre-flight: invoke vitals

Run `skills/vitals/SKILL.md` as a read-only structural check. Render its banner in-line. If vitals reports any ✗ **fail**, show:

```
  House is not clean — vitals found <N> fail(s).
  /evolve works best against a consistent install. Fix vitals first, then retry.

  [Proceed anyway]  [Abort]
```

Default to `[Abort]`. Proceeding is only for advanced use (builder knows the failure is harmless, e.g., a missing `~/.claude/plugins/data/vibe-test/` because they haven't run commands yet).

### 2. Read inputs

Read the following over the last **30 days**, line-by-line, silently skipping malformed lines:

1. `~/.claude/plugins/data/vibe-test/friction.jsonl` — friction entries.
2. `~/.claude/plugins/data/vibe-test/wins.jsonl` — win entries (Pattern #14 baseline).
3. `~/.claude/plugins/data/vibe-test/sessions/*.jsonl` — session logs.

Then read every SKILL file in `packages/vibe-test/skills/**/SKILL.md` so your proposed diffs quote exact current text.

### 3. Analyze — weighted aggregation with absence-of-friction inference

**3a. Base weight by confidence:**

| Confidence | Weight |
|------------|--------|
| `high`     | 1.0    |
| `medium`   | 0.6    |
| `low`      | 0.3    |

**3b. Aggregate friction by `(command, friction_type)` pair.** Sum the weights within each pair. The *ranking* dimension is always weighted sum — never raw count.

**3c. Pattern #14 absence-of-friction multiplier.** For each `(command, friction_type)` group:

1. Count clean runs for that `command` in the session log — terminal entries with `outcome: completed` AND no matching friction entries in the window.
2. Count wins with `working_as_designed: true` for the same `command`.
3. Compute `baseline_strength = clean_runs + wins_weight * 1.0`.
4. If `baseline_strength >= 5` AND `friction_weight < baseline_strength`, **demote the proposal** (tag as `baseline-earned-its-place`). The command is working more often than it's failing — don't ship a SKILL edit for what is probably just signal noise.

**3d. Threshold for a genuine pattern:**

- Minimum **3 friction entries** in the window with **sum-weight ≥ 1.8**.
- **AND** not demoted by Step 3c.

Example: 3 `high`-confidence `idiom_mismatch` entries on `/vibe-test:generate` (sum = 3.0) with only 2 clean `generate` runs → pattern clears. Same 3 entries with 12 clean `generate` runs → demoted.

### 4. Generate proposals

For each surviving pattern (max 5 per run), generate a proposal with this shape:

```json
{
  "proposal_id": "<generated>",
  "status": "pending",
  "observation": "<one-line summary of the pattern>",
  "pattern_count": <friction_count>,
  "pattern_weight": <weighted_sum>,
  "baseline_clean_runs": <n>,
  "baseline_wins": <n>,
  "command_affected": "<audit|generate|fix|...>",
  "proposed_skill_edit": {
    "file": "packages/vibe-test/skills/<command>/SKILL.md",
    "diff": "<unified-diff-style patch>"
  },
  "justification": "<why this edit addresses the pattern>",
  "evidence_refs": [
    { "source": "friction.jsonl", "sessionUUID": "...", "timestamp": "..." }
  ]
}
```

Render human-readable form alongside JSON for the builder's review (the `proposed-changes.md` writer below handles both).

### 5. Write to `packages/vibe-test/proposed-changes.md`

Append (or create if missing) the markdown file. Structure:

```markdown
# Proposed Changes — <ISO local date>

Generated by `/vibe-test:evolve` session `<UUID>`.

## Proposal <id> — status: pending

**Command affected:** `<command>`
**Pattern weight:** <weight> (from <n> friction entries across <m> sessions)
**Baseline:** <clean-runs> clean runs, <wins-count> explicit wins

### Observation
<observation prose>

### Proposed diff
```diff
<unified diff>
```

### Justification
<why>

### Evidence
- friction.jsonl: `<sessionUUID>` @ `<timestamp>` — `<friction_type>` / `<confidence>`
- ...

---
```

**Never auto-apply.** The SKILL writes to `proposed-changes.md` and stops. The builder reviews manually. When a proposal is accepted, the builder (not the agent) runs the edit + commits + moves the proposal entry into `packages/vibe-test/applied-changes.md` with:

```markdown
## Proposal <id> — status: applied

- Commit: `<hash>`
- Applied at: `<ISO>`
- Original observation + diff preserved above.
```

This is the paper trail. `proposed-changes.md` is *working memory*; `applied-changes.md` is *audit log*. Both are project-internal — they ship in the repo but are not customer-facing documentation.

### 6. Summary banner

Emit a three-render report (markdown section above + terminal banner + JSON sidecar at `.vibe-test/state/evolve-<ISO>.json`).

Banner shape:

```
  ⟢  Vibe Test — /evolve
  <version> · <ISO>
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  <N> friction entries in last 30 days  ·  <M> wins  ·  <K> sessions
  <P> proposals pending review  ·  <D> demoted by absence-of-friction

  Review  packages/vibe-test/proposed-changes.md
  Accept  — edit the SKILL manually, commit, move the proposal into applied-changes.md.
  Reject  — mark the proposal `status: rejected` with a one-line reason.
```

### 7. JSON sidecar

Write `.vibe-test/state/evolve-<ISO>.json`:

```json
{
  "schema_version": 1,
  "command": "evolve",
  "timestamp": "...",
  "sessionUUID": "...",
  "friction_entries_analyzed": <N>,
  "wins_entries_analyzed": <M>,
  "sessions_analyzed": <K>,
  "proposals_generated": <P>,
  "proposals_demoted": <D>,
  "proposals_file": "packages/vibe-test/proposed-changes.md"
}
```

## What NOT to do

- **Never auto-apply changes.** Every proposal is a `pending` markdown entry; the builder applies manually.
- **Never edit `docs/`, `tests/`, `src/`.** `/evolve` operates on SKILL prose only. Code changes require a human-designed PR.
- **Never edit `data-contracts.md`, `friction-triggers.md`, or the anchored `plays-well-with.md` table** without cross-command evidence. Those are load-bearing invariants.
- **Never propose more than 5 changes in a run.** If you see more, emit the top 5 and note the queue in the summary.
- **Never ignore absence-of-friction.** If `baseline_strength ≥ 5` and `friction_weight < baseline_strength`, the current behavior has earned its place — demote.
- **Never touch the user's app.** `/evolve` reads logs about Vibe Test usage; it never scans, classifies, or rewrites the user's code.
- **Never use raw counts instead of weighted sums for ranking.** Three `low` entries (0.9 total) are not the same strength as three `high` entries (3.0 total).
- **Never delete friction, wins, or session-log entries.** Append-only history is the raw signal for future evolve runs.

## Conversation Style

- **Teammate, not critic.** Observations are neutral. "User rejected 4 auto-generated tests in last week" is a fact, not a judgment.
- **Specific, quoted.** Every proposal cites the exact friction entries (sessionUUID + timestamp) that support it. The builder should be able to verify your read.
- **Tight diffs.** Small, local SKILL edits are easier to accept than sweeping rewrites.
- **Willing to be wrong.** If the builder rejects, don't argue — mark the proposal `rejected` and move on. It won't re-surface unless the pattern shifts.

## Handoff

No handoff. `/evolve` is a standalone reflection run. Builder reviews `proposed-changes.md` when ready.

"Proposals written to `packages/vibe-test/proposed-changes.md`. Review, accept one-by-one, move accepted entries into `applied-changes.md` with the commit hash. Run `/vibe-test:evolve` again when new patterns emerge."
