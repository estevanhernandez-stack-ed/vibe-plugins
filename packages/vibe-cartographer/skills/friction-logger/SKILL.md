---
name: friction-logger
description: "Internal SKILL — not a slash command. Append-only friction capture for Vibe Cartographer. Invoked by every command SKILL at the trigger points listed in skills/guide/references/friction-triggers.md. Implements Pattern #6 (Friction Log) from the Self-Evolving Plugin Framework."
---

# friction-logger — Append-Only Friction Capture

Internal SKILL. Not a user-invocable slash command. Loaded by every command SKILL at the trigger points listed in [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md), and by `/onboard` once at startup for orphan detection.

This skill describes two procedures the agent runs whenever it detects user friction. Friction is captured silently — no confirmation prompts, no user-facing chatter. False positives poison `/evolve`, so when in doubt, **don't log**.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "Friction log" section. The seven canonical `friction_type` values, required field set, and confidence semantics live there.
- **Schema:** [`../guide/schemas/friction.schema.json`](../guide/schemas/friction.schema.json) — JSON Schema Draft-07. Validate against this before appending. Defensive default: malformed entries silently drop.
- **Trigger map:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — one section per command SKILL, listing the conditions that produce each friction type plus default confidence. Source of truth for "when does /scope log what." `/vibe-cartographer:vitals` check #6 audits both directions of this map.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #6 — Friction Log. The pillar is **self-repair**: the plugin notices friction and feeds the signal forward to `/evolve` so future runs get smoother. The framework's first rule is "be conservative: only log clear friction, not every correction." That conservatism is encoded here as the schema-validation silent-drop and the `repeat_question` quoted-prior gate.
- **Atomic appends only:** all writes go through `node scripts/atomic-append-jsonl.js ~/.claude/plugins/data/vibe-cartographer/friction.jsonl` (stdin = one JSON object). Never `>>` from a shell.

## Catalog-Wide Invariant

> When in doubt, don't log.

A missed friction signal is recoverable through the `/reflect` calibration check-in. A false positive corrupts `/evolve`'s weighting and is much harder to undo. Every defensive default in this SKILL exists to honor that asymmetry.

## Defensive Defaults

These are the load-bearing rules. Every code path through `log()` honors all four.

1. **Schema validation silent-drop.** If the entry fails `friction.schema.json` validation, exit silently. Do not retry. Do not surface the error to the user. Do not log a partial entry. Do log a one-line note to stderr for debugging — it goes nowhere user-visible but helps `/vitals` check #6 if it later notices a missing trigger.
2. **`repeat_question` requires `quoted_prior_message`.** This friction type only logs when the entry includes a non-empty `quoted_prior_message` field carrying the actual prior message text the user is referencing. Without that, the agent is guessing whether the user is repeating a question — and guessed friction is exactly the noise the defensive default exists to prevent. (The `quoted_prior_message` field is conveyed via `symptom` in the canonical schema; concretely: when `friction_type === "repeat_question"`, refuse to log if `symptom` is empty or doesn't include a quoted snippet of the prior turn.)
3. **No append blocks the command.** If `atomic-append-jsonl.js` exits non-zero (locked file, full disk, permission error), surface the stderr to the calling SKILL but never block the user-facing command. Friction capture is best-effort plumbing.
4. **Per-trigger confidence is fixed.** The `confidence` value comes from `friction-triggers.md`, not from agent judgment in the moment. Hand-tuning confidence per call drifts the calibration model. If a trigger feels mis-tuned, fix it in `friction-triggers.md` (and let `/evolve` propose the change) — don't override at log time.

## Procedure: `log(entry)`

**Argument:** caller-provided partial entry. The caller supplies the friction-specific fields; this procedure fills in the audit fields (schema_version, timestamp, plugin_version) and writes.

**Returns:** nothing on success. Exits silently on validation failure. Surfaces atomic-append errors to the caller without blocking the command.

1. **Build the full entry.** Start from the caller's partial entry. Then add:
   - `schema_version: 1`
   - `timestamp: <now ISO datetime with timezone offset>` (e.g., `2026-04-16T14:23:00-05:00`)
   - `plugin_version: <read from .claude-plugin/plugin.json's "version" field>`
   - Caller-provided fields take precedence for everything else (the trigger knows the friction context; this procedure knows the audit context).
2. **Apply the `repeat_question` gate.** If `friction_type === "repeat_question"` and the entry's `symptom` field is missing, empty, or contains no quoted prior-turn snippet, exit silently. This is the defensive default: the agent had to guess and we'd rather miss than poison.
3. **Validate against `friction.schema.json`.** Check:
   - All required fields present: `schema_version`, `timestamp`, `plugin_version`, `command`, `project_dir`, `sessionUUID`, `friction_type`, `confidence`.
   - `schema_version === 1`.
   - `friction_type` is one of the seven enum values.
   - `confidence` is one of `high`, `medium`, `low`.
   - `complement_involved` is a string or null (and conventionally only non-null when `friction_type === "complement_rejected"`).
   - No unknown top-level keys (the schema is `additionalProperties: false`).
   - On any failure: exit silently. Better to miss than poison.
4. **Atomic append.** Pipe the JSON-stringified entry to `node scripts/atomic-append-jsonl.js ~/.claude/plugins/data/vibe-cartographer/friction.jsonl`. On non-zero exit, surface the stderr to the caller. Do not retry — the caller owns retry policy.

The procedure is intentionally narrow. All semantic decisions about *whether* a friction signal exists live in `friction-triggers.md` and the calling SKILL. This procedure only handles validation, audit fields, and the write.

## Procedure: `detect_orphans()`

**Returns:** nothing. Side-effect: emits one `command_abandoned` friction entry per orphan via `log()`.

A sentinel session-log entry without a matching terminal entry within 24 hours is the signal that a command was abandoned mid-flight. This procedure scans for that pattern and converts each orphan into a friction entry. Invoked by `/onboard` at the very start of each run (after the sentinel for this `/onboard` is written but before the welcome message), and as auto-fix `(b)` from `/vitals`.

1. **Read the session log window.** Enumerate `~/.claude/plugins/data/vibe-cartographer/sessions/*.jsonl`. Filter to files whose date is within the last 7 days. (UTC dates per the file naming convention in `data-contracts.md`.) Parse each line as JSON; skip and silently drop any malformed line. (`/vitals` check #8 owns repair of malformed lines — this procedure is read-only.)
2. **Index sentinels.** For each entry with `outcome === "in_progress"`, key it by the triple `(command, project_dir, sessionUUID)`. Hold the timestamp.
3. **Index terminals.** For each entry with `outcome` in `{"completed", "abandoned", "error", "partial"}`, mark the matching `(command, project_dir, sessionUUID)` triple as terminated.
4. **Find orphans.** For each sentinel triple with no matching terminal, compute `age = now - timestamp`. If `age >= 24 hours`, treat as orphan. (Sentinels younger than 24 hours are still considered "in flight" — the user might just have a long-running session.)
5. **Emit one friction entry per orphan.** For each orphan, call `log(...)` with:
   - `friction_type: "command_abandoned"`
   - `command: <orphaned command>`
   - `project_dir: <orphaned project_dir>`
   - `sessionUUID: <orphaned sessionUUID>`
   - `confidence: "high"` (the signal is concrete: a real sentinel exists with no terminal, well past the 24h threshold)
   - `symptom: <"command <X> in <project_dir> never reached a terminal entry — sentinel timestamp <T>, age <hours>h">`
   - `original_command: <orphaned command>` and `original_timestamp: <orphaned timestamp>` are fine to capture in `agent_guess_at_cause` for auditability, but the schema's required fields are what matter.
6. **No orphans →** return without writing. Idempotent on repeat runs because each orphan, once logged, generates its own terminal-less sentinel-like trace in `friction.jsonl` rather than the session log; subsequent `detect_orphans()` calls would re-emit. **Suppress duplicates** by reading the last 7 days of `friction.jsonl` first and skipping any orphan whose `(command, project_dir, sessionUUID)` triple already appears as a `command_abandoned` entry.

## Wiring

| Caller | Invocation | Notes |
|--------|------------|-------|
| `/onboard` | `detect_orphans()` once at startup, after the sentinel write | Auto-emits any backlog of abandoned commands so `/evolve` and `/vitals` see them. |
| Every command SKILL | `log(entry)` at trigger points listed in `friction-triggers.md` | One call per detected trigger. Conservative — when in doubt, skip. |
| `/vitals` auto-fix `(b)` | `detect_orphans()` on demand | Same procedure, surfaced as an explicit user-confirmed fix. |

## Failure Modes

- **`friction.schema.json` missing or malformed:** `log()` cannot validate. Defensive default: exit silently. `/vitals` check #1 catches the missing-file case; check #8 owns malformed-schema repair.
- **`scripts/atomic-append-jsonl.js` missing:** caller's invocation will fail with "command not found." Surface to the caller; do not block the command. `/vitals` check #1 catches missing scripts.
- **Sessions directory missing:** `detect_orphans()` returns without writing. There are no sentinels to check.
- **`plugin.json` missing or unparseable:** fall back to `plugin_version: "unknown"` and continue. The audit field is informational; the rest of the entry is still valid.
- **Concurrent appends from two commands within the same minute:** atomic-append handles ordering. Worst case on Windows is a malformed line, caught by `/vitals` check #8 with auto-fix `(f)`.

## Why This SKILL Exists

Friction signals are the empirical input to `/evolve`. Without them, `/evolve` can only reason from session logs (what happened) and process notes (what the agent thought) — both filtered through the agent. Friction adds the unfiltered third channel: what the user actually did when the agent's choice didn't fit. Pattern #6's whole point is that this signal must be cheap to write, conservative in scope, and safe to ignore on a per-call basis. This SKILL is the implementation of that contract.

The two procedures split cleanly: `log()` is the per-event hot path, called dozens of times per session; `detect_orphans()` is the cold scan, run once per `/onboard` to recover signals that the per-event path couldn't capture (because the command never finished). Together they close the loop on Pattern #6 without ever requiring the user to think about it.
