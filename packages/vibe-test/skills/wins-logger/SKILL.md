---
name: wins-logger
description: "Internal SKILL — not a slash command. Append-only wins capture for Vibe Test. Pattern #14 implementation — three capture techniques: absence-of-friction inference, explicit success markers, external validation. Counter-balance to friction in /evolve weighting."
---

<!-- New for Vibe Test v0.2 — not ported from Cart. Cart may co-author a shared version later per the PRD open issue (wins.jsonl field schema co-authoring with Cart). For now, Vibe Test owns its own shape. -->

# wins-logger — Append-Only Wins Capture

Internal SKILL. Not a user-invocable slash command. Implements Pattern #14 from the Self-Evolving Plugin Framework — the signal asymmetry hedge. Friction logs capture when things go wrong; wins capture when things go right so `/evolve` has both sides of the ledger.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "wins.jsonl" section.
- **Schema:** the `WinEntry` TypeScript type in `src/state/wins-log.ts` is the v0.2 source of truth.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #14 — Signal Asymmetry / wins.jsonl. The pillar is that friction alone skews `/evolve` toward negativity — the plugin appears to be failing even when it's mostly succeeding. Wins rebalance the picture.
- **Atomic appends only:** all writes go through `src/state/wins-log.ts` `append()`, which wraps `appendJsonl()` from `src/state/atomic-write.ts`.

## Catalog-Wide Invariant

> Never auto-inferred from a single signal.

Wins are precious and sparse by design. A generous wins log looks good but corrupts `/evolve`'s weighting as badly as a generous friction log — the opposite direction, same problem. Capture wins conservatively.

## The Three Capture Techniques

### Technique 1 — Absence-of-friction inference

**Captured by:** `/vibe-test:evolve` at aggregation time. **Not inline.**

Procedure:
1. At `/evolve` run, scan the last 30 days of session-log terminal entries.
2. For each terminal entry, look for a matching friction entry within ±1 hour of the terminal timestamp with the same sessionUUID.
3. If no friction entry exists AND the session outcome is `completed` AND the command is one where friction is common (generate, gate), emit a `wins.jsonl` entry with `event: "absence_of_friction"` and `working_as_designed: true`.

Inference cap: at most 1 absence-of-friction win per (command, project) pair per 7-day window. Over-emission here is what kills the signal.

### Technique 2 — Explicit success markers

**Captured by:** command SKILLs inline, when they observe an unambiguous positive reaction.

Triggers (conservative — each requires an unambiguous signal):
- User accepts every staged test in a generate batch without rewriting any of them → `event: "generation_accepted_all"`.
- User says something like *"nice"*, *"perfect"*, *"exactly what I needed"* within 2 turns of a command's output → `event: "explicit_positive_reaction"`.
- Gate passes in CI on the first try after a generate run → `event: "gate_passed_in_ci"` (captured when `GITHUB_ACTIONS=true` and exit 0).
- First audit of a repo surfaces a finding the builder confirms is real → `event: "first_audit_useful"`.

Every explicit-marker emission requires the calling SKILL to quote the user's exact words in `symptom` (for the user-reaction markers) or the structural evidence (for the machine-detected markers). A win without a quoted signal is noise — don't log.

### Technique 3 — External validation capture

**Captured by:** command SKILLs when the evidence is structural and out-of-band.

Triggers:
- **Cold-load success** — user runs a Vibe Test command in a fresh shell after some time away, and the command succeeds on first try (`event: "graceful_cold_load"`). Captured at the *next* session's router SKILL via session-log analysis of the gap between this and previous session.
- **Dogfood finding reproduced** — audit against a known fixture (WSYATM) reproduces the three documented findings (`event: "dogfood_finding_reproduced"`). Captured in integration tests and manually by the builder via a CLI flag (TBD v0.3).
- **Testimonial** — user shares a screenshot / quote / commit message that namechecks Vibe Test positively. Captured manually via a CLI `vibe-test wins add --testimonial "..."` command (v0.3+).

## Entry Shape

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T14:20:00.000Z",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "plugin_version": "0.2.0",
  "command": "audit",
  "event": "dogfood_finding_reproduced",
  "context": "WSYATM audit reproduced the broken forks-pool finding",
  "working_as_designed": true,
  "symptom": "Audit flagged vitest forks-pool timeout as a harness-break finding, matching the known issue",
  "project": "WeSeeYouAtTheMovies"
}
```

### Required fields

- `schema_version`, `timestamp`, `sessionUUID`, `plugin_version`, `command`, `event`, `context`, `working_as_designed`, `symptom`.

### Field semantics

- **event** — one of the canonical events in `src/state/wins-log.ts` `WinEvent` type.
- **context** — one-sentence framing of *where this happened*. Example: `"post-ship WSYATM dogfood audit"`.
- **working_as_designed** — boolean. `true` when the win is aligned with explicit plugin design intent (the common case). `false` when the win was incidental or serendipitous — still valuable signal, but flagged differently for `/evolve` weighting.
- **symptom** — the structural or quoted evidence. Required — a win without evidence is noise.
- **project** — project basename or `null`.

## Where the Log Lives

`~/.claude/plugins/data/vibe-test/wins.jsonl`

On Windows: `C:\Users\<user>\.claude\plugins\data\vibe-test\wins.jsonl`

One file total. Append-only. Never rewrite existing lines.

## Procedure: `log(entry)`

**Argument:** caller-provided partial entry. The caller supplies the win-specific fields; the state-layer `append()` fills audit fields.

**Steps (what the calling SKILL does):**

1. **Confirm the guardrails.** Before calling `log()`:
   - For Technique 1 (absence-of-friction), confirm the 1-per-(command, project)-per-7d cap hasn't already been hit. `/evolve` owns this bookkeeping — command SKILLs don't emit Technique 1 inline.
   - For Technique 2 (explicit markers), confirm the quoted signal is actually present — not inferred from ambiguous context.
   - For Technique 3 (external validation), confirm the structural evidence is real and capturable (a screenshot path, a commit SHA, a CLI flag).

2. **Build the partial entry** with the required fields.

3. **Invoke the state-layer helper.** Run a short node snippet that imports `winsLog.append` from `@esthernandez/vibe-test/state`. The helper fills `schema_version`, `timestamp`, `plugin_version`, and appends.

4. **Continue the command.** Wins logging is instrumentation — a write failure surfaces to stderr but never blocks the command.

## Wiring

| Caller | Technique | Invocation |
|--------|-----------|------------|
| `/vibe-test:evolve` | 1 (absence-of-friction) | At aggregation time, batched. One emission per eligible (command, project, 7d) triple. |
| `skills/generate/SKILL.md` | 2 (explicit marker) | `event: "generation_accepted_all"` when builder accepts every staged test without rewrite. |
| `skills/audit/SKILL.md` | 2 (explicit marker) | `event: "first_audit_useful"` when builder confirms a finding is real. |
| `skills/gate/SKILL.md` | 2 (explicit marker) | `event: "gate_passed_in_ci"` on first-try CI pass. |
| `skills/router/SKILL.md` | 3 (cold-load) | `event: "graceful_cold_load"` when session gap >= 72h and first command succeeds. |
| CLI `vibe-test wins add` | 3 (testimonial) | Manual builder-invoked capture. v0.3+. |
| Integration tests | 3 (dogfood) | `event: "dogfood_finding_reproduced"` when WSYATM fixture reproduces the three documented findings. |

## Why This SKILL Exists

Without wins, `/evolve` operates on half the signal. Friction alone makes the plugin look like it's failing, even in the common case where most sessions succeed quietly. Wins counter-balance that — they're the structural evidence that the plugin is working as designed.

Pattern #14's whole point is that success needs the same capture discipline as failure. Silent success is invisible success; invisible success gets optimized away. This SKILL is the capture seam.

The conservative threshold is load-bearing. An over-generous wins log is as corrupting as an over-generous friction log — just in the opposite direction. When in doubt, don't log. The evidence-required contract (quoted signal, structural marker, out-of-band validation) is the enforcement mechanism.
