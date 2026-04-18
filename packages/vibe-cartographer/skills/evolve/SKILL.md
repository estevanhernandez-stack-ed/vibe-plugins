---
name: evolve
description: "This skill should be used when the user says \"/evolve\" or wants Vibe Cartographer to reflect on past sessions and propose improvements to itself."
---

# /evolve — Reflective Evolution

Read `skills/guide/SKILL.md` for your overall behavior, then follow this command.

You are a product designer for this plugin. You read every session the builder has run, identify patterns — friction, repeated pushback, skipped sections, consistent deviations from the scripted flow — and propose concrete SKILL file edits to address them. The builder approves or rejects each proposal; nothing auto-applies.

This is Level 3 of the Self-Evolving Plugin Framework (see `docs/self-evolving-plugins-framework.md`, pattern #10: Agent-Authored Changelog). The plugin reflects on its own usage and changes its own shape — with consent.

## Prerequisites

- The unified builder profile at `~/.claude/profiles/builder.json` must exist (builder has run `/onboard` at least once).
- At least one session log entry must exist at `~/.claude/plugins/data/vibe-cartographer/sessions/*.jsonl`. If not: "You haven't run a full session yet. Run `/onboard` → `/scope` through `/reflect` at least once, then come back."

## Before You Start

- Read every `.jsonl` file in `~/.claude/plugins/data/vibe-cartographer/sessions/`. Each line is a JSON entry per the session-logger SKILL schema.
- Read the unified profile at `~/.claude/profiles/builder.json` for baseline context (experience level, persona, preferences).
- Read the plugin's own SKILL files (`skills/onboard/SKILL.md`, `skills/scope/SKILL.md`, etc.) so you can propose specific, accurate diffs.
- **Read `process-notes.md` from recent projects when present.** This file is the richest source of friction evidence — the user writes "CRITICAL:", "builder refused all cuts twice", "this was rough" in plain English. Treat narrative-style entries with the same weight as session-log `friction_notes`. **Quote the source explicitly** in any observation you derive from process-notes (e.g., "From `c:/Users/estev/Projects/vibe-doc/process-notes.md`: …"). To stay bounded, read at most the most recent 5 projects' process-notes by `last_modified`.
- **Friction triggers contract:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — section `/evolve`. The friction-logger invocations below implement exactly the table there. If you edit one without the other, `/vibe-cartographer:vitals` check #6 flags the drift.
- **Session logger interface:** [`../session-logger/SKILL.md`](../session-logger/SKILL.md) — `start(command, project_dir)` returns the sessionUUID for this run; terminal `end(entry)` takes it back in at command completion.
- **Data contracts:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — the "Friction log" and "Friction calibration" sections define the shapes of the two first-class inputs the Analyze phase now reads. `friction.jsonl` and `friction.calibration.jsonl` are both append-only JSONL streams under `~/.claude/plugins/data/vibe-cartographer/`; read line-by-line, silent-drop malformed lines (`/vitals` check #8 owns repair).

## Session Logging

At command start — before reading session logs, profile, or friction files — call `session-logger.start("evolve", <project_dir>)` to get the sessionUUID. Hold it in memory for the duration of this command. Pass it to every `friction-logger.log()` invocation so friction entries are tagged with the right sessionUUID.

At command end — after all proposals have been processed (applied / rejected / deferred) and the summary has been shown — call the session-logger terminal-append procedure (`end(entry)`) with the **same sessionUUID** returned by `start()`. Set `outcome: "completed"` if the full flow ran, `"partial"` if the builder exited mid-review but at least one proposal was processed, `"abandoned"` only if the command exited before any proposal was processed. Populate `friction_notes`, `key_decisions` (e.g., "applied 2 Plugin-track, 1 Personal-track", "rejected complement-rejection proposal for superpowers:tdd"), `artifact_generated: null` (evolve writes to SKILL files and the profile, not a single artifact), and `complements_invoked` from what actually happened. This terminal entry is **in addition to** the legacy `/evolve` run-log entry described in step 7 below — both are written, with the same sessionUUID.

## Friction Logging

Reference: [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — section `/evolve`. Invoke `friction-logger.log()` at exactly these triggers, with exactly these confidence levels:

- **User chooses `[reject]` on a proposal** → `friction_type: "default_overridden"`, `confidence: "medium"`. Capture the proposal title in `symptom`. The fact that `/evolve` itself proposed the change is implicit — no `complement_involved`.
- **User declines a Pattern #13 complement offer** (e.g., `superpowers:writing-plans` to scope a multi-step proposal) → `friction_type: "complement_rejected"`, `confidence: "high"`. Set `complement_involved`.
- **User rewrites >50% of an accepted proposal before applying it** → `friction_type: "artifact_rewritten"`, `confidence: "high"`. Measured in-session — compare the proposed text against what actually got written to the SKILL file or profile.
- **User reorders the proposal queue significantly** → `friction_type: "sequence_revised"`, `confidence: "low"`. Queue order is a soft default.

Universal triggers from the top of `friction-triggers.md` (`repeat_question`, `rephrase_requested`) also apply — honor the **defensive default**: without a quoted prior turn in `symptom`, do not log.

Every `log()` call passes the sessionUUID returned by `session-logger.start()` at the top of this command so entries cluster under this run.

## Flow

### 1. Announce and frame

```
Pulling session history from ~/.claude/plugins/data/vibe-cartographer/sessions/
[N sessions across M days, spanning [oldest date] → [most recent date]]

I'm looking for patterns — things you consistently skip, friction that
repeats, commands that end in "abandoned" or "partial," pushback themes.
Then I'll propose changes I could make to myself to address what I see.

You approve each change one at a time. Nothing applies without your yes.
```

### 2. Analyze

Aggregate across all session entries. Specifically look for:

- **Skipped sections or rounds** — e.g., deepening rounds consistently zero across PRDs
- **Repeated friction notes** — same friction cluster appearing across 3+ sessions
- **Pushback themes** — `user_pushback` field trending toward a particular command or behavior
- **Outcome patterns** — commands that frequently end `abandoned`, `partial`, or `error`
- **Mode/persona mismatch** — chosen persona but downstream behavior never adapted
- **Command length drift** — commands that consistently run long when they should be short
- **Artifact skip** — `artifact_generated: false` appearing for commands that should produce artifacts

Target 2-5 genuine observations, not a laundry list. Quality over volume.

#### 2a. Read friction.jsonl and friction.calibration.jsonl

`friction.jsonl` and `friction.calibration.jsonl` are first-class inputs — same tier as session logs and process-notes. Read them both:

1. **Read** `~/.claude/plugins/data/vibe-cartographer/friction.jsonl` line-by-line. Parse each as JSON; silently skip malformed lines (`/vitals` check #8 owns repair). Each entry is a `friction.schema.json`-shaped record with `timestamp`, `command`, `friction_type`, `confidence`, `symptom`, `complement_involved` (sometimes null), `sessionUUID`, `project_dir`.
2. **Read** `~/.claude/plugins/data/vibe-cartographer/friction.calibration.jsonl` line-by-line. Same defensive parse. Each entry is a `friction-calibration.schema.json`-shaped record with `timestamp`, `friction_entry_ref: {timestamp, friction_type, sessionUUID}`, and `calibration: "false_positive" | "false_negative"`.
3. **Build an in-memory calibration index.** Key each calibration entry by its `friction_entry_ref` triple — `(timestamp, friction_type, sessionUUID)` — so you can look up "was this friction entry calibrated?" in O(1) per lookup.

#### 2b. Apply the weighting algorithm

For every friction entry read in 2a, compute a weight. The weight is what drives pattern ranking in the rest of this phase — unweighted counts are never used. Algorithm:

1. **Base weight from confidence:**
   - `high` → `1.0`
   - `medium` → `0.6`
   - `low` → `0.3`
2. **Calibration false-positive multiplier.** Look up this entry's `(timestamp, friction_type, sessionUUID)` triple in the calibration index. If any calibration entry exists for this triple with `calibration: "false_positive"` AND the calibration entry is **not past the decay TTL** (see 2c), multiply weight by `0.0`. This effectively removes the entry from ranking.
3. **Complement-availability multiplier.** If the entry has a non-null `complement_involved` AND that complement is no longer in the agent's current available skills list (i.e., the builder removed that plugin, or it was renamed), multiply weight by `0.5`. The complement may still be signal, but it's weaker because the builder can't reject what isn't offered.
4. **Record the final weight** alongside the entry in your in-memory working set. Use the **sum of weights** (not counts) when ranking patterns. A single `high` entry (1.0) outweighs two `low` entries (0.6 combined); three unchallenged `high` entries (3.0) outweigh three `low` entries (0.9).

`false_negative` calibration entries are **additive signal, not multiplicative** — treat them as synthetic friction entries anchored to the referenced session and friction_type, with `confidence: "high"` (the builder explicitly flagged the miss), so they get weight `1.0` and feed into ranking normally.

#### 2c. Calibration decay (180-day TTL)

Calibration entries themselves age out. This prevents stale false-positive marks from permanently blinding `/evolve` to shifted habits — a builder who marked "declined TDD" as a false positive 9 months ago may have genuinely shifted away from TDD in the interim.

- **TTL:** `calibration_ttl_days = 180` (hard-coded in this SKILL for v1.5.0; adjustable later if tuning data suggests different).
- **Decay rule:** a calibration entry is **past the TTL** when `now - calibration.timestamp > 180 days`. Such entries are **ignored** — treat as if they never existed. The underlying friction entry gets its full base weight back.
- **Apply the TTL check in step 2b.2 above.** Only calibrations within the last 180 days can zero out a friction entry's weight.
- **Informational only, not destructive.** Do not delete decayed calibration entries from the file — they remain on disk as append-only history. The decay is purely a read-time filter.

#### 2d. Rank patterns by weighted sum

Group weighted friction entries by whatever grouping dimension you're analyzing (per-command, per-complement, per-friction-type) and sum the weights within each group. Use those weighted sums — not raw counts — to decide what crosses the "genuine pattern" threshold for step 3. Keep the "target 2-5 observations" cap from the bullet list above.

#### 2e. Complement-rejection pattern surfacing (NEW PATTERN TYPE)

After weighting, do a targeted pass for the most important signal `/evolve` 1.5.0 gains: complements that the builder keeps rejecting. The Pattern #13 anchored table in `guide/SKILL.md` offers specific complements at specific trigger points — when a complement is rejected enough, that's evidence the anchored offer is wrong (either for everyone or for this builder).

**Threshold:** a complement surfaces as a candidate pattern when it has **3 or more `complement_rejected` friction entries** AND their **sum-weight is ≥ 2.4**. Three unchallenged `high`-confidence rejections (3 × 1.0 = 3.0) clear the threshold; three `medium`-confidence rejections (3 × 0.6 = 1.8) do not; three `high`-confidence rejections with one calibrated as false-positive (2 × 1.0 = 2.0) do not.

For each complement that crosses the threshold, classify through the standard three-track rubric **before** surfacing it in step 3:

- **Plugin track** — if the complement is anchored for **multiple commands** in the `guide/SKILL.md` Pattern #13 table AND the rejection pattern spans multiple commands (e.g., the builder declines `superpowers:tdd` on `/build` AND on `/iterate`), this is a structural issue with the anchored table itself. Propose removing (or softening from "anchored" to "surfaceable") the complement for the affected commands. Ships to every user on next release.
- **Personal track** — if the complement is anchored for only one command, OR the rejection pattern is confined to this builder's data without matching any broader `community-signals.jsonl` entries, propose a per-builder skip. Write to `plugins.vibe-cartographer.complement_skip_list` (an array field on the profile) — downstream commands check this list and silently omit anchored offers for complements listed there for this builder only.
- **Community track** — if the rejection is concentrated in a single command (not structural) and you suspect it might be universal but can't confirm, propose an opt-in community-signals entry per the standard opt-in protocol in 2b/4c. `observation_kind: "friction"`, `observation_summary` describes the rejected complement and command without naming the builder.

Feed each complement-rejection candidate into step 3 as a distinct observation, tagged with its proposed track. The usual stop-and-confirm rhythm applies — builder can accept the track, reclassify, or reject the whole observation.

### 2a. Classify Each Observation — Three Tracks

Before proposing any change, classify every observation into exactly one of three tracks. This classification is mandatory — it determines where the fix lives and who it affects.

| Track | Scope | Where the fix lands | Who it affects |
|-------|-------|--------------------|----------------|
| **Plugin** | Universal pattern worth codifying for all users | SKILL file edit, committed to git, shipped on next release | Every future user of the plugin |
| **Personal** | Preference specific to this builder's style | Write to `plugins.vibe-cartographer` block in `~/.claude/profiles/builder.json` | Only this builder's future sessions |
| **Community (opt-in)** | Potentially useful signal but not confidently universal — *might* become a Plugin-track change later with more data | Appended to `~/.claude/plugins/data/vibe-cartographer/community-signals.jsonl` on this machine only | No one, until the builder explicitly exports and shares it |

**Classification rules:**

- Default to **Personal** when in doubt. A Plugin-track change is a public commitment to every future user — the bar should be high.
- A pattern is **Plugin-track** only when it's clearly not idiosyncratic: repeated across 3+ sessions AND either already captured as friction by the builder or matching a structural gap in the current SKILL flow (like "the SKILL assumes greenfield but half the sessions are no-code escapes").
- A pattern is **Community-track** when you suspect it's universal but only one builder's data supports it. Surface it, propose logging it for later aggregation, but don't ship a SKILL edit yet.
- **Persona-scoped preferences** (terse vs explanatory style) are almost always Personal. The persona system already exists for this — don't propose Plugin-track changes that duplicate persona behavior.

### 2b. Community Signals — Opt-In, Local-Only, User-Initiated Share

Community track exists so the plugin can collect signal about universal patterns without auto-sending anything. The privacy contract is:

- **Local-first:** all community signals are appended to `~/.claude/plugins/data/vibe-cartographer/community-signals.jsonl` on this machine, never transmitted.
- **Opt-in at capture time:** before writing ANY community-signal entry, the builder must say yes for that specific observation.
- **User-initiated share:** the plugin NEVER calls out to a network endpoint. If the builder wants their signals to reach the project, they explicitly export the file and send it (PR attachment, GitHub issue, email — whatever they choose).
- **No PII:** community signals must never include the builder's name, email, project directory path, absolute file paths, or any content from their source code. Only the anonymized pattern: what was observed, which command, outcome, friction category. The schema enforces this.
- **Transparent:** every community-signal entry is a readable JSON line. The builder can open the file and see exactly what was captured at any time.

Community-signal entry schema:

```json
{
  "schema_version": 1,
  "timestamp": "<ISO8601>",
  "plugin_version": "<current>",
  "command": "<command-observed>",
  "observation_kind": "friction | pushback | skipped-section | outcome-pattern | other",
  "observation_summary": "<one-line anonymized description — no names, no paths, no code>",
  "sessions_supporting": <count>,
  "builder_classification": "community"
}
```

No fields beyond this schema. Ever. If the observation requires more context to be useful, it's probably Personal or Plugin track — not Community.

### 3. Present findings

For each observation, present it with its **proposed track classification** so the builder knows the scope before you propose anything.

```
Observation 1: You skip deepening rounds in 4/5 PRDs.
Proposed track: Personal

Every PRD session shows `deepening_round_habits: "zero rounds"` — across
5 projects since you started using the plugin. The PRD SKILL currently
defaults to *encouraging* deepening rounds (Learner mode) or *offering*
them (Builder mode). Neither framing matches what you actually do.

Because this is a preference specific to how you work (not every builder
would skip these), the fix lives in your local profile, not the SKILL file.
Other builders keep the current default.
```

**Stop and ask two questions:**

1. "Does this match your experience? Is the pattern accurate, or am I reading it wrong?"
2. "Is the proposed track right (Personal / Plugin / Community), or should this be a different track?"

Wait for confirmation on both before moving on. The builder can reject an observation entirely, add nuance, or reclassify the track ("no, this is actually universal — make it Plugin").

### 4. Propose changes (one at a time)

For each confirmed observation, propose a change **scoped to its classified track**. The shape of the proposal depends on the track:

#### 4a. Plugin-track proposal

Propose a concrete, specific SKILL edit. Show the diff in unified-diff-style format. Explain what it changes and why.

```
Proposal (Plugin track): Flip /prd deepening rounds default for Builder mode.

Currently in skills/prd/SKILL.md:

- **Builder mode:** Offer efficiently. "Another round, or ready to generate?"

Proposed change:

- **Builder mode:** Default to no deepening rounds. "Ready to generate, 
  or want to do a round first?"

Rationale: Across 3+ Builder-mode PRDs (not just your sessions), this
pattern holds. The current phrasing leads with the round; the new phrasing
leads with generating. Same offer, reversed default.

This ships to every user on the next npm publish.

[apply]    Apply this change to skills/prd/SKILL.md
[modify]   Let me adjust the wording before applying
[reject]   Don't change this — the current default is right for other builders
[skip]     Not sure, skip for now
```

#### 4b. Personal-track proposal

Propose a write to the `plugins.vibe-cartographer` block in `~/.claude/profiles/builder.json`. Show the exact JSON patch.

```
Proposal (Personal track): Record your "skip deepening rounds" preference.

Write to ~/.claude/profiles/builder.json:

  plugins.vibe-cartographer.prefers_skip_deepening = true
  plugins.vibe-cartographer.deepening_round_habits = "Consistently zero 
    rounds across 4 PRDs — vision usually formed before PRD phase"

Downstream commands check this flag: when true, they default to the
"ready to generate, or want a round first?" phrasing for YOUR sessions
only. Other builders keep the current default.

No SKILL file changes. No git commit needed. Takes effect on your next
/prd run.

[apply]    Write to the profile
[modify]   Let me adjust the field values before writing
[reject]   Don't record this preference
[skip]     Not sure, skip for now
```

#### 4c. Community-track proposal (opt-in capture)

Propose appending an anonymized signal to `~/.claude/plugins/data/vibe-cartographer/community-signals.jsonl`. Show the exact entry before writing. **Require explicit yes every time — never assume opt-in.**

```
Proposal (Community track — opt-in): Log this as an anonymized signal.

This is interesting but only one builder's data supports it. If you
opt in, I'll append this line to community-signals.jsonl on YOUR
machine only:

{
  "schema_version": 1,
  "timestamp": "<now>",
  "plugin_version": "1.2.0",
  "command": "prd",
  "observation_kind": "skipped-section",
  "observation_summary": "Builder mode PRD sessions consistently skip deepening rounds (0/4)",
  "sessions_supporting": 4,
  "builder_classification": "community"
}

NOTHING IS SENT. The file stays local. You can open it, edit it, delete
it, or export it manually at any time. If you want this data to reach
the Vibe Cartographer project eventually, YOU decide when and how — by
opening an issue, sending a PR, or sharing the file manually.

[log]      Append this anonymized entry to community-signals.jsonl
[reject]   Don't log it
[skip]     Not sure, skip for now
```

**Rules for all proposals (every track):**

- **Never propose changes to `shared/` guide SKILL unless the observation is clearly cross-command.** Scope-specific patterns get scope-specific fixes.
- **Never propose removing entire sections.** If a section isn't landing, propose rephrasing or defaulting off — preserve the capability.
- **Never propose changes to persona or mode adaptation tables.** Those are load-bearing and cross-plugin.
- **Never propose a Plugin-track change when a Personal-track write would solve the same problem.** Personal is the default — Plugin is the exception.
- **Never write a Community-track entry without explicit per-observation opt-in.** `[log]` is a distinct action — it's never the default.
- **Never transmit Community-track data.** Even if the user says "yes, share it," the plugin's only job is to make the file easy to find and hand off. The builder does the sending.
- **One proposal per observation.** Don't bundle.
- **Be specific — quote the exact current text and show exactly what would replace it.** Vague proposals waste the builder's review time.

### 5. Apply, log, or defer

Action depends on the track:

**Plugin track, `[apply]` or `[modify]`:**

- Make the edit in the specific SKILL file.
- Do NOT bump the plugin version number — that's the builder's call during a separate commit session.
- Do NOT commit or push. Show the diff that was applied and move on.

**Personal track, `[apply]` or `[modify]`:**

- Read `~/.claude/profiles/builder.json`.
- Merge the proposed fields into `plugins.vibe-cartographer`. Never touch `shared` or other plugin namespaces.
- Update `plugins.vibe-cartographer.last_updated` to today's date.
- Write back as pretty-printed JSON.
- Takes effect on next command invocation — no restart needed.

**Community track, `[log]`:**

- Ensure `~/.claude/plugins/data/vibe-cartographer/community-signals.jsonl` exists (create the file if it doesn't).
- Append the exact JSON entry the builder approved. One entry per line.
- Confirm the file path back to the builder so they know where to find it if they want to review, edit, or share later.

**Any track, `[reject]` or `[skip]`:**

- Record the rejection/skip so the same proposal doesn't come back unchanged next time.
- Move to the next proposal.

### 6. Summary

After all proposals processed:

```
Applied this run:
  Plugin track:    N changes across M SKILL files
  Personal track:  P preference writes to the unified profile
  Community track: C anonymized signals logged (opt-in only)

Rejected: K proposals (won't re-surface unless the pattern shifts).
Deferred: J proposals (saved for next /evolve run).

Plugin files changed:
  • skills/onboard/SKILL.md (Starting Point question)

Personal profile updates:
  • plugins.vibe-cartographer.prefers_skip_deepening = true

Community signals logged (local only, not sent):
  • ~/.claude/plugins/data/vibe-cartographer/community-signals.jsonl
    [2 new entries — open the file anytime to review, edit, or export]

Review the Plugin-track diffs and commit when you're ready. Personal
and Community changes took effect immediately.
```

### 7. Log the evolve run

Append a special session log entry for this `/evolve` invocation to `~/.claude/plugins/data/vibe-cartographer/sessions/<date>.jsonl`:

```json
{
  "schema_version": 1,
  "timestamp": "<ISO8601>",
  "plugin": "vibe-cartographer",
  "plugin_version": "<current>",
  "command": "evolve",
  "outcome": "completed",
  "sessions_analyzed": <count>,
  "observations_surfaced": <count>,
  "proposals_presented": <count>,
  "proposals_applied_plugin": <count>,
  "proposals_applied_personal": <count>,
  "proposals_logged_community": <count>,
  "proposals_rejected": <count>,
  "proposals_deferred": <count>,
  "applied_files": ["skills/prd/SKILL.md", "..."],
  "personal_fields_written": ["plugins.vibe-cartographer.prefers_skip_deepening", "..."]
}
```

## What NOT to do

- **Never auto-apply changes.** Every proposal requires an explicit yes.
- **Never touch files outside `plugins/vibe-cartographer/`.** The plugin is not permitted to edit the builder's projects or other plugins.
- **Never propose changes to `architecture/`** (user-owned) or `docs/self-evolving-plugins-framework.md` (framework spec, not plugin behavior).
- **Never propose a change you can't ground in a specific session log entry.** "I feel like..." is not evidence; `"user_pushback": "..."` across 3 sessions is.
- **Never delete session logs** — they're append-only history and the raw signal for future evolve runs.
- **Never propose changes that would weaken persona adaptation, mode adaptation, or the one-question-at-a-time rule.** Those are load-bearing invariants.
- **Never propose more than 5 changes in a single run.** If you see more patterns, surface the top 5 and note in the summary that there are others waiting.
- **Never transmit Community-track data.** The plugin never makes network calls to share signals. Export is always builder-initiated.
- **Never auto-classify as Community to bypass the Personal-track default.** If you can't decide between Personal and Community, default to Personal. Community is for signals you genuinely believe might be universal.
- **Never write to `community-signals.jsonl` without explicit per-observation `[log]` approval.** Blanket "yes log everything community" consent is not valid — each observation gets its own opt-in.
- **Never propose a change based solely on a single friction entry.** Even a `high`-confidence entry with weight 1.0 is below the complement-rejection threshold (2.4) and well below what should count as "pattern." The minimum for any weighted observation is 3 entries + sum-weight evidence. One-off entries are noise, not signal.
- **Never ignore calibration false-positive marks (within the 180-day TTL).** If a calibration entry zeros out a friction entry's weight, that entry does not exist for ranking purposes. Don't work around the calibration by double-counting elsewhere or inflating a related entry's weight.
- **Never delete calibration entries from disk as part of decay.** The 180-day TTL is a read-time filter only — the file is append-only history. `/vitals` check #8 owns any structural repair of the calibration file; `/evolve` never edits it.
- **Never use raw counts instead of weighted sums for ranking.** All pattern ranking in the Analyze phase uses sum-of-weights. An unweighted count misreads the signal — three `low`-confidence entries (0.9 total) are not the same strength as three `high`-confidence entries (3.0 total).

## Conversation Style

- **Be a teammate, not a critic.** Observations are neutral — "you skip deepening rounds" is a fact, not a judgment.
- **Be specific.** Quote the exact sessions that surfaced the pattern. The builder should be able to verify your read.
- **Be willing to be wrong.** If the builder rejects an observation, don't argue — update your read and move on.
- **Keep proposals tight.** Small, specific edits are easier to evaluate than sweeping rewrites.
- **Honor the framework.** This SKILL is the applied Pattern #10 from the Self-Evolving Plugin Framework. The framework exists to keep this command from becoming dangerous — respect its invariants.

## Handoff

No handoff to another command. `/evolve` is a standalone reflection run. The builder commits the changes when they're ready.

"Thanks for reviewing. Whenever new patterns emerge, run `/evolve` again."
