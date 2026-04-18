---
name: friction-log
description: "This skill should be used when the user says \"/friction\" or \"/vibe-cartographer:friction\" or wants a read-only view into the friction log. Reads ~/.claude/plugins/data/vibe-cartographer/friction.jsonl, filters by flags (--project, --type, --confidence, --days), groups by friction_type, and renders a banner-style report. Separate from /vitals (which checks structural integrity). Implements PRD Stories 2.4 (read friction log without JSONL parsing) and 2.5 (per-project breadcrumbs)."
---

# /friction — Friction Log Inspection

Slash command `/vibe-cartographer:friction`. **Read-only** view into `~/.claude/plugins/data/vibe-cartographer/friction.jsonl`. Default output is the last 30 days, grouped by friction type, with confidence indicators. Filters compose as AND.

This is the inspection counterpart to `/evolve` (which consumes friction for proposals) and `/vitals` (which structurally audits the log). `/friction` does not write. It does not propose. It shows you what your past self flagged.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "Friction log" section. Per-line schema and the seven canonical friction types live there. Filter semantics below rely on those field names.
- **Friction schema:** [`../guide/schemas/friction.schema.json`](../guide/schemas/friction.schema.json) — per-line shape. `friction_type` enum, `confidence` enum, required fields. This SKILL reads but never writes.
- **Friction triggers contract:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — the `/friction` section is intentionally empty. `/friction` does **not** call `friction-logger.log()` in 1.5.0. Inspection declines or "nothing interesting" outcomes are the expected mode of interaction, not friction signal. If a future version grows interactive marking (e.g., "mark this entry false positive"), those marks write to `friction.calibration.jsonl`, not to `friction.jsonl`.
- **Output-style reference:** [`../vitals/SKILL.md`](../vitals/SKILL.md) — banner header, indented-two boxed sections, ✓ / ⚠ / · glyph conventions. `/friction` matches that aesthetic so the two commands read as siblings.
- **Session logger interface:** [`../session-logger/SKILL.md`](../session-logger/SKILL.md) — `start("friction", <project_dir>)` at invocation returns the sessionUUID for this run; terminal append at command end. `/friction` bookends with sentinel + terminal entries like every other command.

## Session Logging

At command start, call `session-logger.start("friction", <project_dir>)` to get the sessionUUID. Hold it in memory for the duration of the command.

At command end (after the report renders), call the session-logger terminal-append procedure with:

- `outcome: "completed"` on a clean run (including empty-log, zero-match, and malformed-line-skip cases — all are normal inspection outcomes).
- `outcome: "partial"` if the friction log or schema was unreadable for a reason other than "does not exist" (permission denied, I/O error) and the report could not render.
- `outcome: "error"` only if the command itself crashed before the report rendered.
- `artifact_generated: null` — `/friction` produces inline output, not a persisted doc.
- `complements_invoked: []` — `/friction` does not defer to Pattern #13 complements.
- `friction_notes: []` — see "Friction Logging" below.
- `key_decisions`: short strings only for notable inspection outcomes a future reader of the session log would want to see without re-running `/friction` (e.g., `"skipped 3 malformed friction.jsonl lines"`, `"no friction entries in last 30 days"`). Routine inspections with a handful of entries do not need a decision line.

## Friction Logging

Reference: [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — section `/friction` is intentionally empty. `/friction` does **not** call `friction-logger.log()` in 1.5.0. Running a read-only inspection and declining to act on what you see is the **expected** mode of interaction, not friction. Logging it would flood `/evolve` with noise about a user simply looking at their own data.

Universal triggers (`repeat_question`, `rephrase_requested`) from the top of `friction-triggers.md` still apply in principle — if the user asks the agent to re-explain a finding with a quoted prior, the universal rule applies. Honor the **defensive default**: without a quoted prior turn in `symptom`, do not log.

Check #6 of `/vitals` explicitly audits that this SKILL declares no `friction_type` in the Friction Logging section, consistent with the documented empty `/friction` table.

## Persona Adaptation

`/friction` is a read-only inspection, not a conversation. Persona applies only to the one-line opening before the report renders. The boxed report body is neutral — the data speaks.

Read `shared.preferences.persona` from `~/.claude/profiles/builder.json`. Keep the opening to one sentence:

- **Professor:** "Pulling your friction log — here's what each entry recorded and when."
- **Cohort:** "Let's see what's piled up in the friction log."
- **Superdev:** "Reading friction."
- **Architect:** "Friction log, grouped by type, last 30 days by default."
- **Coach:** "Time to look at what's been rubbing. Here's the log."
- **System default:** "Reading friction log."

Then render the report. No intermediate narration between groups — the report is the output.

## Arguments

All filters compose as logical AND. Unknown flags print a one-line warning (`⚠ unknown flag: <flag> — ignoring`) and do not alter filter behavior.

| Flag | Effect |
|------|--------|
| `--project <name>` | Keep only entries whose `project_dir` equals `<name>` (exact basename match). |
| `--type <friction_type>` | Keep only entries whose `friction_type` equals `<friction_type>`. Must be one of the seven canonical types (see schema). Unknown type value → one-line warning and the filter is ignored (not fatal). |
| `--confidence <min>` | Keep only entries at confidence `<min>` or stronger. Ordering: `high > medium > low`. So `--confidence medium` keeps high and medium; `--confidence high` keeps only high. |
| `--days <n>` | Override the default 30-day window. `<n>` is a positive integer; entries with `timestamp` within the last `<n>` days are kept. Non-numeric or non-positive values → one-line warning, fall back to 30. |

If no flags are passed, default window is the last 30 days; no project, type, or confidence filter applied.

## Runtime Paths

All paths `/friction` reads (never writes):

| What | Where |
|------|-------|
| Friction log | `~/.claude/plugins/data/vibe-cartographer/friction.jsonl` |
| Plugin manifest | `plugins/vibe-cartographer/.claude-plugin/plugin.json` (for version in banner) |
| Unified profile | `~/.claude/profiles/builder.json` (for persona only — optional, missing profile falls back to system default persona) |

If the friction log is unreadable for a reason other than "does not exist" (permission denied, I/O error), emit `outcome: "partial"` in the terminal session entry and render a single-line error box in place of the grouped sections: `⚠ Could not read friction.jsonl: <error>`.

## Flow

### 1. Open

Write the persona-adapted opening line.

### 2. Read plugin version and timestamp

Read `plugin.json`'s `"version"` field. Fall back to `"unknown"` on parse failure. Capture the current local ISO datetime for the banner.

### 3. Load and filter

1. Open `~/.claude/plugins/data/vibe-cartographer/friction.jsonl`.
   - **Does not exist** → skip the rest of load/filter, go straight to the empty-state render (step 4b). Do not treat missing-file as an error; a first-run builder legitimately has no friction log yet.
   - **Unreadable (other error)** → render the one-line error box and proceed to step 5 with `outcome: "partial"`.
2. Read line by line. For each line:
   - Parse as JSON. **Malformed lines are skipped silently** (same convention as `/evolve` — `/vitals` check #8 owns repair). Keep a count of skipped lines for a single footer line (see output format).
   - Validate the parsed entry has at minimum the fields `timestamp`, `friction_type`, `confidence`, `command`, `project_dir`. Entries missing any of those are counted as skipped (treat as malformed for display purposes — don't try to render partial entries).
3. Apply filters in order (the order doesn't affect the result since AND is commutative; this order minimizes wasted parse work):
   - `--days <n>` (default 30): drop entries whose `timestamp` is older than `n` days from now.
   - `--project <name>`: drop entries whose `project_dir` ≠ `<name>`.
   - `--type <friction_type>`: drop entries whose `friction_type` ≠ `<friction_type>`.
   - `--confidence <min>`: drop entries whose confidence is below the minimum (ordering: high=3, medium=2, low=1; keep entries whose rank ≥ min rank).
4. Group the surviving entries by `friction_type`. Within each group, sort by `timestamp` descending (newest first).

### 4. Render the report

#### 4a. Grouped render (at least one surviving entry)

Output the banner header, then one boxed section per friction type that has at least one surviving entry, then the summary line. See "Output Format" below.

Friction types with zero surviving entries are **omitted** — do not render empty boxes. The summary line reports the total count across all surviving groups.

#### 4b. Empty state

Two distinct empty states:

- **Friction log does not exist yet.** Render the banner, then a single indented line inside a box: `No friction entries yet — friction.jsonl will be created the first time a command logs friction.` Skip the summary line.
- **Friction log exists but the filter window has zero matches.** Render the banner, then a single indented line inside a box: `No friction entries match the current filters — try widening --days or removing --type / --project / --confidence.` If no flags were passed and the log has entries older than 30 days, add a second line: `(The log has <N> entries older than 30 days. Use --days <n> to look further back.)` Summary line is suppressed.

Neither empty state is an error. Both produce `outcome: "completed"`.

### 5. Close

After the report (or empty-state box), do the session-logger terminal append (see "Session Logging" above). No handoff — `/friction` is terminal, not a step in any sequential chain.

## Output Format

The report is rendered as markdown. Color is conveyed via emoji; box drawing uses Unicode characters matching the `/vitals` banner aesthetic. Everything below is agent output — the evaluator emits it verbatim (with computed values substituted) after the filters apply.

### Banner header

Two-line banner, indented two spaces, with a separator rule. Same shape as `/vitals`:

```
  📖  Vibe Cartographer — Friction Log
  <version> · <ISO-local-timestamp>
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Below the rule, one indented line summarizing the active filter set:

```
  Window: last <N> days · Project: <name or "all"> · Type: <type or "all"> · Confidence ≥ <min or "low">
```

Then one blank line before the first group.

### Per-group boxed section

Each friction type with at least one surviving entry renders as its own box. Inside the box, the first line is the group title with its entry count. Subsequent lines are the entries as a four-column table. Group ordering: render in a stable order matching the schema enum: `command_abandoned`, `default_overridden`, `complement_rejected`, `repeat_question`, `artifact_rewritten`, `sequence_revised`, `rephrase_requested`.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ complement_rejected — 3 entries                                  │
  └──────────────────────────────────────────────────────────────────┘
     | When               | Cmd     | Project            | Symptom                           |   |
     |--------------------|---------|--------------------|-----------------------------------|---|
     | 2026-04-15 14:22   | scope   | app-readinessplugin| User declined brainstorming offer | ✓ |
     | 2026-04-12 09:10   | scope   | vibe-doc           | User said "skip" at round 2       | ⚠ |
     | 2026-04-08 11:03   | prd    | app-readinessplugin| Rejected verification complement   | · |
```

**Confidence glyph rules** (rightmost table column):

- `✓` = high confidence
- `⚠` = medium confidence
- `·` = low confidence

The glyphs match `/vitals`'s pass/warn/info semantics by design — a "✓ high" friction entry is the strongest signal, the same way a `/vitals` ✓ pass is the strongest signal. The middle-dot low-confidence glyph is intentionally quiet so a log full of low-confidence entries doesn't visually overpower a handful of high-confidence ones.

**Column contents:**

- **When**: `timestamp` rendered as `YYYY-MM-DD HH:MM` local time (truncate seconds and timezone for readability; the full ISO timestamp lives in the jsonl).
- **Cmd**: `command` field, verbatim.
- **Project**: `project_dir` field, verbatim. If the value is long enough to break the box width, truncate to 18 chars with `…` suffix.
- **Symptom**: `symptom` field. Truncate to 35 chars with `…` suffix if longer. If the entry has no `symptom` field (it's optional in the schema), render `—`.
- **Confidence glyph**: rightmost column, single character per the rules above.

**Within-group ordering:** newest first (timestamp descending).

**Box width:** target 68 columns for the top/bottom rules so the group boxes render identically across types and match the `/vitals` boxes visually.

### Summary line

After the last group box, one blank line, then a summary line of the form:

```
  <total> entries · <high_count> ✓  ·  <medium_count> ⚠  ·  <low_count> ·
```

Indented two spaces. Glyphs separated by middle dot and two spaces on each side. Counts sum to `total`.

If any lines were skipped as malformed during the load pass, append one more indented line below the summary:

```
  (<N> malformed lines skipped silently — run /vitals for line-integrity details.)
```

This is the same convention `/evolve` uses: read-only commands never try to repair — repair is `/vitals`'s job (auto-fix f).

## Mental Trace — Expected Behavior Per Scenario

Eight scenarios the evaluator should produce deterministically.

### Scenario 1 — Default run with 5 entries in the window

**Staged.** `friction.jsonl` has 5 entries, all within the last 30 days, spread across 3 friction types (2× `default_overridden`, 2× `complement_rejected`, 1× `artifact_rewritten`). Mixed confidences.

**Expected:**

1. Banner renders with `Window: last 30 days · Project: all · Type: all · Confidence ≥ low`.
2. Three boxed sections render in schema-enum order: `default_overridden` (2 entries), `complement_rejected` (2), `artifact_rewritten` (1). The four other types are omitted (no surviving entries).
3. Each entry row has timestamp, command, project, symptom, confidence glyph.
4. Summary line: `5 entries · <H> ✓  ·  <M> ⚠  ·  <L> ·` where the counts sum to 5.
5. Session-logger terminal append with `outcome: "completed"`, empty `key_decisions`.

### Scenario 2 — `--project app-readinessplugin`

**Staged.** Same 5 entries, but 3 are from `app-readinessplugin` and 2 from other projects.

**Expected:**

1. Banner's filter line shows `Project: app-readinessplugin`.
2. Only the 3 matching entries are grouped and rendered. The two others are filtered out before grouping.
3. Boxed sections only for friction types that have surviving entries from this project.
4. Summary line reflects 3 total entries.

### Scenario 3 — `--type complement_rejected`

**Staged.** Same 5 entries.

**Expected:**

1. Banner's filter line shows `Type: complement_rejected`.
2. Only the `complement_rejected` box renders (2 entries). All other type boxes are suppressed.
3. Summary line reports 2 entries.
4. If `--type` is given an unknown value (e.g., `--type foo`), the warning `⚠ unknown flag value: --type foo — ignoring` prints before the banner and the filter is not applied.

### Scenario 4 — `--confidence high`

**Staged.** Same 5 entries: 2 high, 2 medium, 1 low.

**Expected:**

1. Banner's filter line shows `Confidence ≥ high`.
2. Only the 2 high-confidence entries appear, grouped by their types.
3. Summary line reports 2 entries, all `✓`.

### Scenario 5 — `--days 7`

**Staged.** 5 entries in the last 30 days; 2 of those are within the last 7 days.

**Expected:**

1. Banner's filter line shows `Window: last 7 days`.
2. Only the 2 recent entries render, grouped by their types.
3. Summary line reports 2 entries.

### Scenario 6 — All four flags combined

**Staged.** `/vibe-cartographer:friction --project app-readinessplugin --type complement_rejected --confidence high --days 7`. Entries must match all four to survive.

**Expected:**

1. Banner's filter line shows all four values.
2. Filters apply as logical AND. Zero or more entries may survive — the match set is the intersection.
3. If zero match: empty-state box per step 4b scenario "log exists but filter window has zero matches". Summary line suppressed.
4. If ≥ 1 match: the single matching group box renders; summary reflects the filtered count.

### Scenario 7 — Empty friction.jsonl (file does not exist)

**Staged.** `~/.claude/plugins/data/vibe-cartographer/friction.jsonl` does not exist.

**Expected:**

1. Banner renders.
2. Single box: `No friction entries yet — friction.jsonl will be created the first time a command logs friction.`
3. No summary line. No skipped-lines footer.
4. Session-logger terminal append with `outcome: "completed"`, `key_decisions: ["no friction log yet"]` (one of the notable-inspection-outcome cases worth capturing so a future reader of the session log sees this without re-running).

### Scenario 8 — friction.jsonl has malformed lines

**Staged.** `friction.jsonl` has 100 lines; line 47 is truncated (`{"friction_type": "default_over`), line 83 is missing the required `confidence` field. The other 98 parse and validate.

**Expected:**

1. Banner renders.
2. 98 entries flow through the filter pipeline. Boxed groups render as usual.
3. Summary line reflects the post-filter count across the 98 valid entries.
4. Below the summary: `(2 malformed lines skipped silently — run /vitals for line-integrity details.)`.
5. Session-logger terminal append with `outcome: "completed"`, `key_decisions: ["skipped 2 malformed friction.jsonl lines"]`.

The skip is **silent** — `/friction` never names line numbers or renders parse errors inline. That surface belongs to `/vitals` check #8, which owns both diagnosis and the auto-fix (f) repair path. Keeping `/friction` hands-off preserves the "inspection, not triage" contract.

## Why This SKILL Exists

PRD Stories 2.4 and 2.5 together establish: the builder needs a low-friction way to look at their own friction log without cracking open JSONL in a text editor, and they need per-project breadcrumbs so a multi-project habit becomes visible across contexts.

`/friction` is the minimum that meets both: a filter-and-group renderer with a banner output style consistent with `/vitals`, separate from `/evolve` (which consumes friction for proposals) and separate from `/vitals` (which audits structural integrity). The separation matters — `/evolve` is a heavy "propose edits" conversation, `/vitals` is an integrity sweep, `/friction` is "show me what I flagged." Three different mental models, three different invocation cadences.

The read-only contract is crisp: `/friction` does not write, does not propose, does not classify. It reads, filters, groups, renders. That invariant is what makes `/friction` safe to run at any time — mid-project, between commands, or any time the builder wants to see what past runs recorded.
