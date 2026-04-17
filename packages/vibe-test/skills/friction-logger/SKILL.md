---
name: friction-logger
description: "Internal SKILL — not a slash command. Append-only friction capture for Vibe Test. Invoked by every command SKILL at the trigger points listed in skills/guide/references/friction-triggers.md. Implements Pattern #6 (Friction Log) from the Self-Evolving Plugin Framework."
---

<!-- Derived from vibe-cartographer 1.5.0 friction-logger SKILL (own-impl per Spec Decision 5 / Option a; migrate to @626labs/plugin-core in Phase 3) -->

# friction-logger — Append-Only Friction Capture

Internal SKILL. Not a user-invocable slash command. Loaded by every command SKILL at the trigger points listed in [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md), and by the router SKILL once at first-run-of-the-day for orphan detection.

This skill describes two procedures the agent runs whenever it detects user friction. Friction is captured silently — no confirmation prompts, no user-facing chatter. False positives poison `/evolve`, so when in doubt, **don't log**.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "friction.jsonl" section. Field set and confidence semantics live there.
- **Schema:** the `FrictionEntry` TypeScript type in `src/state/friction-log.ts` is the v0.2 source of truth. A dedicated `friction.schema.json` may land in v0.3.
- **Trigger map:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — one section per command, listing the conditions that produce each friction type plus default confidence. Source of truth for *"when does /vibe-test:audit log what"*.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #6 — Friction Log. The pillar is **self-repair**: the plugin notices friction and feeds the signal forward to `/evolve` so future runs get smoother. The framework's first rule is *"be conservative: only log clear friction, not every correction."* That conservatism is encoded here as the defensive defaults below.
- **Atomic appends only:** all writes go through `src/state/friction-log.ts` `append()`, which wraps `appendJsonl()` from `src/state/atomic-write.ts`. Never `>>` from a shell.

## Catalog-Wide Invariant

> When in doubt, don't log.

A missed friction signal is recoverable. A false positive corrupts `/evolve`'s weighting and is much harder to undo. Every defensive default in this SKILL exists to honor that asymmetry.

## Defensive Defaults

These are the load-bearing rules. Every code path through `log()` honors all four.

1. **Validation silent-drop.** If the entry is malformed (missing required fields, bad enum values), exit silently. Do not retry. Do not surface the error to the user.
2. **`repeat_question` requires `symptom` with quoted prior.** This friction type only logs when the entry includes a non-empty `symptom` field carrying the actual prior message text the user is referencing. The state-layer `append()` in `src/state/friction-log.ts` enforces this gate — the SKILL relies on it rather than re-implementing the check.
3. **No append blocks the command.** If the file write fails (locked file, full disk, permission error), surface to stderr but never block the user-facing command. Friction capture is best-effort plumbing.
4. **Per-trigger confidence is fixed.** The `confidence` value comes from `friction-triggers.md`, not from agent judgment in the moment. Hand-tuning confidence per call drifts the calibration model.

## Where the Log Lives

`~/.claude/plugins/data/vibe-test/friction.jsonl`

On Windows: `C:\Users\<user>\.claude\plugins\data\vibe-test\friction.jsonl`

- One file total. Append-only. Never rewrite existing lines.
- `mkdir -p` via `atomic-write.ts` `ensureDir: true`.

## Entry Shape

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T14:15:00.000Z",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "plugin_version": "0.2.0",
  "friction_type": "generation_pattern_mismatch",
  "symptom": "3 consecutive rejects of Unicode edge-case tests",
  "confidence": "high",
  "agent_guess_at_cause": "SKILL is generating tests that don't match builder's edge-case coverage style",
  "command": "generate",
  "project": "my-app",
  "complement_involved": null
}
```

### Required fields

- `schema_version`, `timestamp`, `sessionUUID`, `plugin_version`, `friction_type`, `symptom`, `confidence`.

### Optional fields

- `agent_guess_at_cause` — short string; the agent's best guess at *why* this happened. Nullable.
- `command` — which command was running.
- `project` — project basename.
- `complement_involved` — the complement identifier when `friction_type === "complement_rejected"`.

### Canonical friction types

See `src/state/friction-log.ts` for the full enum. Common v0.2 types:

- `classification_mismatch`, `generation_pattern_mismatch`, `idiom_mismatch`
- `coverage_adapter_refused`, `harness_break`, `tier_threshold_dispute`
- `runtime_hook_failure`, `composition_deferral_confusion`
- `command_abandoned` (emitted only by `detect_orphans()`)
- `default_overridden`, `complement_rejected`, `repeat_question`, `artifact_rewritten`, `sequence_revised`, `rephrase_requested`
- `other`

## Procedure: `log(entry)`

**Argument:** caller-provided partial entry. The caller supplies the friction-specific fields; the state-layer `append()` fills audit fields and writes.

**Steps (what the calling SKILL does):**

1. **Build the partial entry** from the trigger context:
   - `friction_type` — from the trigger map row.
   - `confidence` — from the trigger map row (never agent-judged at log time).
   - `symptom` — short string describing what the user did / said. For `repeat_question` / `rephrase_requested`, must include a quoted snippet of the prior turn.
   - `sessionUUID` — the UUID held since `session-logger.start()`.
   - `command` — the current command name.
   - `project` — current project basename.
   - `complement_involved` — only set when the trigger is `complement_rejected`.
   - `agent_guess_at_cause` — optional free-form string.

2. **Invoke the state-layer helper.** Run a short node snippet that imports `frictionLog.append` from `@esthernandez/vibe-test/state` and passes the partial entry. The helper fills `schema_version`, `timestamp`, `plugin_version`, and enforces the `repeat_question` gate before appending.

3. **Continue the command.** Friction logging is instrumentation; a write failure surfaces to stderr but never blocks the command.

## Procedure: `detect_orphans()`

**Returns:** nothing. Side-effect: emits one `command_abandoned` friction entry per orphan via `log()`.

A sentinel session-log entry without a matching terminal entry within 24 hours is the signal that a command was abandoned mid-flight. This procedure scans for that pattern and converts each orphan into a friction entry. Invoked by the router SKILL once per first-run-of-the-day.

1. **Read the session log window.** Enumerate `~/.claude/plugins/data/vibe-test/sessions/*.jsonl`. Filter to files whose date is within the last 7 days. Parse each line as JSON; silently skip malformed lines.
2. **Index sentinels.** For each entry with `outcome === "in_progress"`, key it by the triple `(command, project, sessionUUID)`. Hold the timestamp.
3. **Index terminals.** For each entry with `outcome` in `{"completed", "aborted", "errored", "partial"}`, mark the matching triple as terminated.
4. **Find orphans.** For each sentinel triple with no matching terminal, compute `age = now - timestamp`. If `age >= 24 hours`, treat as orphan.
5. **Deduplicate against prior emissions.** Read the last 7 days of `friction.jsonl` and skip any orphan whose `(command, project, sessionUUID)` triple already appears as a `command_abandoned` entry.
6. **Emit one friction entry per orphan** via `log()` with:
   - `friction_type: "command_abandoned"`
   - `confidence: "high"`
   - `symptom: "command <X> in <project> never reached a terminal entry — sentinel timestamp <T>, age <hours>h"`
   - `sessionUUID`, `command`, `project` pulled from the orphan sentinel.

## Wiring

| Caller | Invocation | Notes |
|--------|------------|-------|
| Router SKILL | `detect_orphans()` once per first-run-of-the-day | Auto-emits backlog so `/evolve` sees it. |
| Every command SKILL | `log(entry)` at trigger points in `friction-triggers.md` | One call per detected trigger. Conservative — when in doubt, skip. |
| Future `/vibe-test:vitals` auto-fix | `detect_orphans()` on demand | Same procedure, surfaced as an explicit user-confirmed fix. |

## Failure Modes

- **File write fails:** `log()` surfaces stderr; caller does not block. The next successful write will include the entry that should have been written (only if the caller retried — this SKILL does not retry).
- **Sessions directory missing:** `detect_orphans()` returns without writing. No sentinels to check.
- **`plugin.json` missing:** the state-layer helper falls back to `plugin_version: "0.2.0"` (hardcoded default).

## Why This SKILL Exists

Friction signals are the empirical input to `/evolve`. Without them, `/evolve` can only reason from session logs (what happened) and process notes (what the agent thought) — both filtered through the agent. Friction adds the unfiltered third channel: what the user actually did when the agent's choice didn't fit. Pattern #6's whole point is that this signal must be cheap to write, conservative in scope, and safe to ignore on a per-call basis. This SKILL is the implementation of that contract.

The two procedures split cleanly: `log()` is the per-event hot path, called dozens of times per session; `detect_orphans()` is the cold scan, run once per day to recover signals that the per-event path couldn't capture (because the command never finished).
