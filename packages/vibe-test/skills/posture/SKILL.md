---
name: posture
description: "This skill should be used when the user says `/vibe-test:posture`. A read-only ambient summary — no scans, no generation, no mutations. Renders classification + weighted score vs tier target + gap counts by level + last-audit/generate timestamps in ≤40 terminal lines in <3s on minimal-spa fixture. Detects state freshness (stale audit, pending tests awaiting review, generate-able gaps) and suggests next commands inline as questions — never executes. Emits JSON sidecar for machine consumers."
argument-hint: ""
---

# posture — Ambient Read-Only Summary

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

Posture is the ambient-awareness surface. A builder who runs `/vibe-test:posture` is asking *"where am I, at a glance, and what should I do next?"* — without paying for a scan, a classification pass, or a coverage run. The command is strictly read-only: it reads state files, composes a one-screen summary, and suggests a next command. It never executes that command. It never mutates state beyond the session-log entry.

## What This Command Does, In One Sentence

Read audit state + generate state + pending-queue + beacons → compose ≤40-line summary in <3s → suggest next command as a question → emit three views → never execute.

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Read access to `.vibe-test/`** — if the current directory has no `.vibe-test/` tree, this is an un-audited repo. Posture degrades gracefully:
  > *"No `.vibe-test/` state here — this looks like a fresh repo. Run `/vibe-test:audit` to get started, or `/vibe-test` for the full intro."*
  > Exit cleanly with the pointer. Do NOT scaffold `.vibe-test/` on the builder's behalf (posture is read-only).

No other blocking prereq. The command is defensive: missing files are degraded summaries, not errors.

### Shaping prereqs (Pattern #16 — adapts silently)

- **Recency windows** — "stale audit" is ≥7 days old OR source files have changed since (cheap modtime check on a handful of package.json / config files). "Stale coverage" is ≥1 hour OR commit_hash mismatch. "Stale pending" is ≥24 hours since staging.
- **Pending queue presence** — if `.vibe-test/pending/tests/` has entries, surface the count. If `.vibe-test/pending/fixes/` has entries, surface that separately.

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md). Posture reads ALL state files but writes NONE except the session-log entry and the JSON sidecar `.vibe-test/state/posture.json`.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). No entries specifically tagged `applies_to: posture` — posture is a scan-less summary, not a deferral surface. Teaser mentions allowed but not announcements.
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:posture` section.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('posture', project)` at entry, `end({sessionUUID, command: 'posture', outcome})` at exit.

## Primitive surface

All existing `src/` modules — no new TypeScript introduced:

- **`src/state/project-state`** — `readProjectState`, `projectStatePath`, `projectStateSidecarPath`.
- **`src/state/beacons`** — `readRecent(repoRoot, limit)` for the last-command lookback.
- **`src/state/session-log`** — `readRecent(days)` for cross-day session lookup.
- **`src/reporter`** — `createReportObject`, three renderers, `getLanguageKnobs`.
- **`src/generator/pending-dir-manager`** — `listPending(repoRoot)` (the fix command's pending-dir uses the same layout; posture lists both trees).

**Performance budget: <3 seconds on minimal-spa fixture.** This is the P-posture-1 hard constraint. Every read must be lazy and fail-fast on absence. Never call `scan()`, `runCoverage()`, or any classifier.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('posture', project_basename)`. Hold the returned `sessionUUID` in memory until Step 6.
3. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation). Keep it under 2 lines.

### Step 1 — Blocking prereq check + ambient reads

Check for `.vibe-test/` existence. If absent:

1. Render the degraded-summary banner (≤10 lines total including header / footer):
   ```
   ==============================================================================
                          Vibe Test · Posture · no state
   ==============================================================================

   No `.vibe-test/` state in this repo. Run `/vibe-test:audit` to start, or
   `/vibe-test` bare for the full intro.
   ==============================================================================
   ```
2. Session-logger.end with `outcome: 'completed', key_decisions: ['no state found']`.
3. Exit cleanly.

If `.vibe-test/` exists, proceed to Step 2.

### Step 2 — Read state (parallel, fail-fast)

Parallelize the reads — all are small JSON / directory listings:

1. **`readProjectState(repoRoot)`** — `<repo>/.vibe-test/state.json`. Returns `null` on absence.
2. **`<repo>/.vibe-test/state/audit.json`** — direct read via `fs.readFile` + `JSON.parse`. Absent → note "no audit yet".
3. **`<repo>/.vibe-test/state/coverage.json`** — direct read. Absent → note "no coverage yet".
4. **`<repo>/.vibe-test/state/generate.json`** — direct read. Absent → note "no generate yet".
5. **`<repo>/.vibe-test/state/gate.json`** — direct read. Absent → note "no gate yet".
6. **`listPending(repoRoot)`** for `.vibe-test/pending/tests/` — returns array; empty when absent.
7. **Fixes pending listing** — read `.vibe-test/pending/fixes/` directly (no helper yet); empty when absent.
8. **`readRecent(repoRoot, 10)` on beacons** — last 10 command invocations, newest first.
9. **modtime check on key source files** — `package.json` + detected framework configs. If any is newer than audit's `last_updated`, the audit is source-drift-stale.

Collect all reads into a `PostureState` object in-SKILL:

```
{
  has_state: true,
  classification: <from audit.json or null>,
  score: <from coverage.json / audit's coverage_snapshot>,
  last_audit_at: <iso or null>,
  last_generate_at: <iso or null>,
  last_gate_at: <iso or null>,
  last_gate_verdict: 'pass' | 'fail' | 'tool-error' | null,
  pending_tests_count: <int>,
  pending_fixes_count: <int>,
  gaps_by_level: {smoke: <int>, behavioral: <int>, edge: <int>, integration: <int>, performance: <int>},
  audit_stale: <boolean>,
  audit_stale_reason: 'age' | 'source-drift' | null,
  recent_beacons: <array of last 10>,
}
```

### Step 3 — Classify freshness + next-action suggestions (P2)

Derive the freshness state via simple rules — SKILL reasoning, no heavy logic:

| Condition | Next-action suggestion (question form) |
|-----------|----------------------------------------|
| No audit yet | *"No audit yet — run `/vibe-test:audit`?"* |
| Audit ≥7 days old OR source drift since | *"Audit is {N} days stale and {K} files changed since — want to re-audit?"* |
| Audit fresh + pending tests exist | *"{N} pending tests in staging — accept them first? `/vibe-test:generate` only runs after they're resolved."* |
| Audit fresh + pending fixes exist | *"{N} pending fixes in `.vibe-test/pending/fixes/` — review them? Failing tests won't repair themselves."* |
| Audit fresh + gaps by level > 0 + no pending | *"{score} weighted score; {total-gaps} gaps across {levels}. Close some with `/vibe-test:generate`?"* |
| Audit fresh + coverage fresh + gate stale (>1 day) | *"Last gate was {N} days ago. Run `/vibe-test:gate` to see where you stand on the {tier} threshold."* |
| Audit fresh + coverage fresh + gate fresh + PASS | *"All fresh and passing — ship it, or iterate? `/vibe-test:audit` to re-classify if the app shape is drifting."* |
| Audit fresh + coverage fresh + gate fresh + FAIL | *"Last gate: FAIL on {tier} threshold ({score}/{threshold}). `/vibe-test:generate` for the top gap?"* |

Pick the *most specific* rule that matches. Never execute — always phrase as a question. This is the P-posture-2 core contract.

### Step 4 — Render ≤40-line banner (P1)

The banner has a fixed skeleton — every line is optional except the frame and the next-action question.

```
==============================================================================
                            Vibe Test · Posture
==============================================================================

<PERSONA-ADAPTED OPENING LINE>

Classification
------------------------------------------------------------------------------
  <app_type> · <tier> · confidence <0.XX>
  Modifiers: <m1>, <m2>, …    [omit if empty]

Score
------------------------------------------------------------------------------
  <score>/<threshold>   <PASS | BELOW>  ({tier})
  <per-level breakdown compacted to one line per level, e.g.>
  smoke 20.5%   behavioral 10.0%   edge 0%   integration 0%   performance n/a

Pending
------------------------------------------------------------------------------
  tests: <N>  [omit row entirely when both zero]
  fixes: <M>

Last activity
------------------------------------------------------------------------------
  audit:     <relative timestamp> <(stale)|OK>
  generate:  <relative timestamp or "never">
  gate:      <relative timestamp or "never"> <verdict if any>

<PERSONA-ADAPTED NEXT-ACTION QUESTION from Step 3>
==============================================================================
```

**Line-count discipline (P1 hard constraint — ≤40 lines):**

- Start with the skeleton above — 24-28 lines when all rows are populated.
- Per-level breakdown on ONE line (compacted) so we don't blow the budget.
- Modifiers row is omitted when empty.
- Pending section is omitted when both counts are zero.
- Last activity uses 3 compact lines; if any is "never", collapse to a single line: *"First posture — no prior activity."*

Render via `renderBanner(report, {columns, disableColors: !isTty})` but with a custom proseSlot that overrides the default report sections with the posture-specific skeleton. (The banner renderer takes `{ columns, disableColors }` options — the report itself drives section content; posture populates the report's `classification` + `score` + `next_step_hint` fields so the standard banner already produces a close-to-right layout. Fine-tune the skeleton by setting `findings` to `[]` and `actions_taken` to `[]` so those sections render empty.)

**Performance enforcement:** all reads are in parallel via `Promise.all(...)`. Any read timing out at 500ms is treated as absent (fail-fast). Total wall clock target: <3s.

### Step 5 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'posture', plugin_version, repo_root, scope: null, commit_hash})`. Populate:

- `classification` — from Step 2.1 (audit state's classification).
- `score` — from Step 2.2 / 2.3 (coverage state + audit fallback).
- `findings` — empty (posture is read-only; gaps are counted in the ambient summary but not elevated to finding entries — that's the audit's job).
- `actions_taken` — empty (posture never acts).
- `deferrals` — empty (no Pattern #13 at posture).
- `handoff_artifacts` — `['.vibe-test/state/posture.json']`.
- `next_step_hint` — the question from Step 3.

Render three views:

- `renderBanner(report, {columns, disableColors: !isTty})` → printed to chat. Line count verified ≤40.
- `renderMarkdown(report, {proseSlots})` → `docs/vibe-test/posture-<ISO-date>.md`. The markdown can be longer than 40 lines; the ≤40 constraint is terminal-only.
- `renderJson({report, repoRoot, skipValidation: true})` → `.vibe-test/state/posture.json` (no schema file for posture in v0.2; skip validation). This is the machine-readable artifact for dashboards / dotfile monitors.

### Step 6 — State writes

1. **`session-logger.end({sessionUUID, command: 'posture', outcome: 'completed', key_decisions: [<next-action suggestion chosen>, <staleness classifier>], complements_invoked: [], artifact_generated: '<path to JSON sidecar>'})`** — terminal entry paired to Step 0.

**No beacon write.** Posture is read-only; beacons are action signals. Skipping this preserves the contract that beacons are non-noise.

**No project-state write.** Posture does not update `.vibe-test/state.json`.

### Step 7 — No handoff line

Posture's next-action question IS the handoff. Do NOT append a separate "Run `/vibe-test:<next>` when ready" line — the question already embeds the suggestion as a question, which is the posture contract (never directive, always ask).

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts.

## Tier-Adaptive Language

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Opening line | Warm one-liner | Plain one-liner | "Posture:" + verdict |
| Per-level row | Full plain-English ("20% of small smoke tests covered") | Compact ("smoke 20%") | Compact ("smoke 20.5%") |
| Next-action question | Full explanation + question | Compressed explanation + question | Question only |

JSON output is **level-invariant**.

## Friction Logging

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Builder runs posture 3+ times in a session without acting on any suggestion | `suggestion_ignored` | `low` |
| State read fails (corrupted JSON in any state file) | `state_corruption` | `high` |

Posture is a low-friction SKILL. Most signals come from `/audit`, `/generate`, `/fix`, `/gate`. When in doubt, don't log.

## What the Posture SKILL is NOT

- Not an auditor. Posture reuses audit-state; it never classifies.
- Not a coverage command. Posture reads coverage-state; it never measures.
- Not a gate. Posture reads gate-state; it never decides pass/fail.
- Not an executor. Posture suggests; it never runs commands.
- Not a scaffolder. Missing `.vibe-test/` is a graceful degradation, not a trigger to scaffold.

## Why This SKILL Exists

`git status` is the most-run git command by volume — not because it does anything, but because it answers *"where am I?"* in under a second. Posture is the Vibe Test analog: a zero-cost ambient check that answers *"what's the testing state of this repo, at a glance, and what should I do next?"* — without paying for a scan or a coverage run.

The <3s performance budget is the product. If posture gets slow, builders stop running it, and the entire ambient-awareness loop collapses. Parallelize reads, fail-fast on absence, and never block on anything expensive.

The "never execute — always ask" contract is the integrity mechanism. Posture could trivially auto-run `/vibe-test:audit` when the audit is stale, but that would turn a read-only summary into a surprise action. Every suggestion is a question; every builder has the steering wheel.

The ≤40-line budget is the ergonomics. Any longer and the builder has to scroll to see the next-action question — which defeats the ambient-summary purpose. The ≤40 number is a PRD-adjusted loosening of the ≤20 spec limit; when in doubt, lean compact.
