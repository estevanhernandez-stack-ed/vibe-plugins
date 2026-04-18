---
name: session-logger
description: "Internal SKILL — not a slash command. Two-phase append-only session log for Vibe Cartographer: a sentinel entry at command start (outcome=in_progress) and a terminal entry at command end, paired by sessionUUID. Also updates plugins.vibe-cartographer._meta.last_seen_complements on the unified profile at terminal time. Referenced by the guide SKILL; invoked by every command at start and end. Part of Level 2 (session memory) of the Self-Evolving Plugin Framework."
---

# session-logger — Sentinel + Terminal Session Log

Internal SKILL. Not a user-invocable slash command. Every Vibe Cartographer command calls `start()` at invocation and the terminal-append procedure at completion. The two entries share a `sessionUUID` so `friction-logger.detect_orphans()` can pair them.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "Session log" section. The sentinel vs terminal shapes, required fields, and sessionUUID pairing contract live there.
- **Session log schema:** [`../guide/schemas/session-log.schema.json`](../guide/schemas/session-log.schema.json) — JSON Schema Draft-07. The schema's `oneOf` splits sentinel (outcome=in_progress) from terminal (outcome in completed/abandoned/error/partial). Every write validates against this.
- **Unified profile schema:** [`../guide/schemas/builder-profile.schema.json`](../guide/schemas/builder-profile.schema.json) — the `plugins.vibe-cartographer._meta.last_seen_complements` sub-shape (list / timestamp / previous_diff_count / notable_change_at) is defined here. Pattern #11 namespace isolation: this SKILL writes ONLY inside `plugins.vibe-cartographer._meta`, never into `shared.*` or any other plugin's namespace.
- **Atomic protocol:** all session log writes go through `node scripts/atomic-append-jsonl.js`; all profile writes go through `node scripts/atomic-write-json.js`. Never `>>` from a shell.
- **Orphan pairing:** the sentinel's `sessionUUID` is the load-bearing field. `friction-logger.detect_orphans()` scans 7 days of session files looking for sentinels whose `(command, project_dir, sessionUUID)` has no matching terminal entry.

## Where the Log Lives

`~/.claude/plugins/data/vibe-cartographer/sessions/<YYYY-MM-DD>.jsonl`

- One file per day. Append-only. Never rewrite existing lines.
- `mkdir -p` the directory on first use (the atomic-append script handles this).
- Cross-project: a single user's logs from all their projects land here.
- Every command run produces **two** entries in the same daily file: one sentinel at start, one terminal at end, paired by `sessionUUID`.

**Legacy logs** from v0.5.0 and earlier live at `~/.claude/plugins/data/app-project-readiness/sessions/`. These are preserved untouched — append-only history is never migrated. Future recall commands read both locations.

## Entry Shapes

Two entries per command run. Both live in the same daily file. Both carry the same `sessionUUID`.

### Sentinel entry (written by `start()`)

Minimal shape — no outcome data exists yet. `outcome` is hard-coded to `"in_progress"`.

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T01:20:00-05:00",
  "plugin": "vibe-cartographer",
  "plugin_version": "1.5.0",
  "command": "scope",
  "project_id": "6vJ7tx2eeW5eZxN9NKrB",
  "project_dir": "my-new-app",
  "mode": "builder",
  "persona": "superdev",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "in_progress"
}
```

### Terminal entry (written by the terminal-append procedure)

Full shape with outcome metadata, friction notes, key decisions, and complement attribution. Carries the **same `sessionUUID`** as its paired sentinel.

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T01:50:00-05:00",
  "plugin": "vibe-cartographer",
  "plugin_version": "1.5.0",
  "command": "scope",
  "project_id": "6vJ7tx2eeW5eZxN9NKrB",
  "project_dir": "my-new-app",
  "mode": "builder",
  "persona": "superdev",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "completed",
  "user_pushback": false,
  "friction_notes": ["artifact_rewritten"],
  "key_decisions": ["cut feature X from scope"],
  "artifact_generated": "docs/scope.md",
  "complements_invoked": ["superpowers:brainstorming"]
}
```

### Field definitions

Shared by both entries unless noted.

- **schema_version** — always `1` for now. Bump when the schema changes.
- **timestamp** — ISO 8601 with timezone offset. Sentinel captures start time; terminal captures end time.
- **plugin** — always `"vibe-cartographer"`.
- **plugin_version** — read from `plugins/vibe-cartographer/.claude-plugin/plugin.json`. If you can't determine it, use `"unknown"`.
- **command** — which of the 10 commands is running: `onboard`, `scope`, `prd`, `spec`, `checklist`, `build`, `iterate`, `reflect`, `evolve`, `vitals`, `friction`.
- **project_id** — the 626Labs dashboard project ID if the session is bound. Otherwise omit or `null`.
- **project_dir** — basename of the current working directory. Not the full path.
- **mode** — `learner` or `builder` from the builder profile. `null` if not yet set (e.g., mid-onboard).
- **persona** — `professor` | `cohort` | `superdev` | `architect` | `coach` | `null` (system default).
- **sessionUUID** — UUID v4 issued by `start()`. The terminal entry and any `friction.jsonl` / `friction.calibration.jsonl` entries written during this command all carry the same value. Required for orphan pairing.
- **outcome** — sentinel: always `"in_progress"`. Terminal: `completed` | `abandoned` | `error` | `partial`. (Terminal `abandoned` should be rare — the normal abandonment signal is an orphan sentinel with no terminal, caught by `detect_orphans()`.)

**Terminal-only fields:**

- **user_pushback** — boolean. `true` if the user rejected, heavily edited, or overrode an agent suggestion. Be conservative — minor tweaks don't count.
- **friction_notes** — array of short strings. Human-facing recap for `/reflect`. The actual structured friction signal goes to `friction.jsonl` via `friction-logger.log()`.
- **key_decisions** — array of short strings. High-signal decisions only. Examples: `"chose Builder mode"`, `"skipped deepening rounds"`, `"cut feature X from scope"`.
- **artifact_generated** — relative path to the doc this command produced, or `null`.
- **complements_invoked** — Pattern #13 complements that *actually ran* during this command. Format: `"<source>:<name>"` (e.g., `"superpowers:brainstorming"`). **Distinct from `last_seen_complements`** — `complements_invoked` is what got used this run; `last_seen_complements` is what was available in the environment. Both surface via `/evolve`; they answer different questions.

## Procedure: `start(command, project_dir)`

Called by a command SKILL at invocation. Returns the `sessionUUID` the command must hold in memory until it calls the terminal-append procedure.

**Arguments:**
- `command` — the command name (`scope`, `prd`, etc.).
- `project_dir` — basename of the cwd.

**Returns:** the `sessionUUID` string (UUID v4).

**Steps:**

1. **Generate sessionUUID.** Use Node's `crypto.randomUUID()` (Node 18+ stdlib, no deps). Never reuse a UUID from a prior session, a friction entry, or elsewhere.
2. **Determine audit fields.**
   - `schema_version: 1`.
   - `timestamp: <now ISO datetime with timezone offset>`.
   - `plugin: "vibe-cartographer"`.
   - `plugin_version`: read from `plugins/vibe-cartographer/.claude-plugin/plugin.json`'s `"version"`. Fall back to `"unknown"`.
   - `project_id`: from the 626 Labs session bind if available; otherwise omit.
   - `mode` / `persona`: read from the unified profile at `~/.claude/profiles/builder.json`. Pass through as-is; `null` if unset.
3. **Build the sentinel entry** using the shape above with `outcome: "in_progress"`.
4. **Validate against `session-log.schema.json`** (the `sentinelEntry` branch of the `oneOf`). On validation failure, exit silently — do not block command startup. Friction capture without a sentinel still works; missing the sentinel only weakens orphan detection for this one run.
5. **Atomic append.** Pipe the JSON-stringified entry to:
   ```bash
   node scripts/atomic-append-jsonl.js ~/.claude/plugins/data/vibe-cartographer/sessions/<today>.jsonl
   ```
   where `<today>` is `YYYY-MM-DD` in local time. On non-zero exit, log a one-line note to stderr and continue — session logging is instrumentation, not critical path.
6. **Return the `sessionUUID`** to the caller. The command SKILL holds it in memory for the duration of the run and passes it back in when calling the terminal-append procedure.

**Concurrency note:** two commands started in the same minute in different projects will get different UUIDs. That's the whole point of Decision #3 in the spec — timestamps alone can collide; UUIDs can't.

## Procedure: terminal append (`end(entry)`)

Called by a command SKILL at completion, after embedded feedback and before the handoff to the next command. Takes the sessionUUID issued by `start()` plus the terminal fields that weren't known at start time.

**Argument:** a partial entry with at minimum `sessionUUID`, `command`, `outcome`, and whatever other terminal fields the command wants to record. The caller supplies the semantic fields; this procedure fills audit fields and validates.

**Steps:**

1. **Build the full entry.**
   - Start with the caller's partial entry (it carries `sessionUUID`, `command`, `outcome`, `user_pushback`, `friction_notes`, `key_decisions`, `artifact_generated`, `complements_invoked`).
   - Overlay/fill audit fields:
     - `schema_version: 1`
     - `timestamp: <now ISO datetime with timezone offset>`
     - `plugin: "vibe-cartographer"`
     - `plugin_version`: as in `start()`.
     - `project_id`, `project_dir`, `mode`, `persona`: pulled the same way as in `start()` so the pair is internally consistent.
2. **Match the sessionUUID.** The entry's `sessionUUID` MUST equal the value returned by `start()` for this same command run. Never mint a new UUID here — that breaks orphan pairing and invalidates every friction entry tagged with the original UUID.
3. **Validate against `session-log.schema.json`** (the `terminalEntry` branch of the `oneOf`). Required: `schema_version`, `timestamp`, `plugin`, `plugin_version`, `command`, `project_dir`, `sessionUUID`, `outcome`. `outcome` must be one of `completed` | `abandoned` | `error` | `partial`.
4. **Atomic append to today's session file** exactly as in `start()` step 5:
   ```bash
   node scripts/atomic-append-jsonl.js ~/.claude/plugins/data/vibe-cartographer/sessions/<today>.jsonl
   ```
5. **Update `plugins.vibe-cartographer._meta.last_seen_complements`.** See the dedicated procedure below. This runs whether or not the atomic-append in step 4 succeeded — the two writes are independent instruments. If the unified profile write fails, surface the stderr and continue; don't retry and don't block the handoff.

**Failure handling:** same as `start()` — session logging is instrumentation. A failed append logs a one-line warning to stderr and the command proceeds to handoff. The user never sees a session-logger error.

## Procedure: `update_last_seen_complements(available_complements)`

Runs as step 5 of the terminal append. Writes Vibe Cartographer's snapshot of Pattern #13 complements currently **available in the environment** (not necessarily invoked — for "invoked," use the `complements_invoked` field on the terminal entry). Lives in the plugin's own namespace (Pattern #11).

**Argument:**
- `available_complements` — array of complement identifiers detected at the tail of this command run (e.g., `["superpowers:brainstorming", "vibe-doc:scan", "mcp:context7"]`). Whatever's visible in the agent's available-skills surface at terminal time.

**Target shape on the unified profile:**

```jsonc
"plugins": {
  "vibe-cartographer": {
    "_meta": {
      "last_seen_complements": {
        "list": ["superpowers:brainstorming", "vibe-doc:scan", "mcp:context7"],
        "timestamp": "2026-04-17T01:50:00-05:00",
        "previous_diff_count": 3,
        "notable_change_at": "2026-04-17T01:50:00-05:00"
      }
    }
  }
}
```

**Steps:**

1. **Read the current unified profile** from `~/.claude/profiles/builder.json`. If the file doesn't exist, start from the minimal shape `{ "schema_version": 1, "shared": {}, "plugins": {} }`.
2. **Extract previous snapshot.** Look up `profile.plugins["vibe-cartographer"]._meta.last_seen_complements`. If absent (first-ever run), treat previous list as "unknown" — the diff count is `0` and `notable_change_at` stays `null`. Do NOT set `notable_change_at` on the first run, even if the new list is large.
3. **Compute `previous_diff_count`.**
   - If no previous snapshot: `previous_diff_count = 0`.
   - Otherwise: treat the new list and the previous list as sets. `gained = new \ previous`, `lost = previous \ new`. `previous_diff_count = |gained| + |lost|`. (Symmetric difference count, i.e., the size of `gained ∪ lost`.)
4. **Compute `notable_change_at`.**
   - If previous snapshot exists AND `previous_diff_count >= 2`: set `notable_change_at = <now ISO datetime with timezone offset>`.
   - Else: preserve the previous `notable_change_at` value (or `null` if first run). The field is **sticky** — once stamped, it persists across subsequent non-material runs so `/evolve` and `/vitals` can see "there was a material env shift at T." A later material shift overwrites it with the newer timestamp.
5. **Build the updated profile.** Mutate a deep copy of the profile (do not touch `shared.*` or any other `plugins.<name>.*` block — Pattern #11 namespace isolation).
   - Ensure `profile.plugins` exists as an object.
   - Ensure `profile.plugins["vibe-cartographer"]` exists as an object.
   - Ensure `profile.plugins["vibe-cartographer"]._meta` exists as an object.
   - Set `profile.plugins["vibe-cartographer"]._meta.last_seen_complements = { list, timestamp, previous_diff_count, notable_change_at }`.
   - Update `profile.last_updated = <now ISO date>`.
6. **Atomic write.** Pipe the JSON-stringified updated profile to:
   ```bash
   node scripts/atomic-write-json.js ~/.claude/profiles/builder.json
   ```
   `atomic-write-json.js` handles the `.tmp` + `fsync` + `rename` sequence. On non-zero exit, surface the stderr and continue — the terminal session-log entry has already been appended, so orphan pairing still works.
7. **Invariant check (defensive).** Before writing, assert the root profile still has `shared` and `plugins` keys and that no keys outside `plugins["vibe-cartographer"]` were mutated. If the assertion fails, abort the write and surface an error to stderr. Pattern #11 violations must never reach disk.

## Namespace Isolation (Pattern #11)

This SKILL writes to exactly two places:

1. **`~/.claude/plugins/data/vibe-cartographer/sessions/<date>.jsonl`** — session log file (plugin-owned directory, append-only).
2. **`~/.claude/profiles/builder.json`** — ONLY inside `plugins.vibe-cartographer._meta.last_seen_complements`. Never `shared.*`. Never `plugins.<other-name>.*`. The step-7 invariant check above exists specifically to prevent accidental cross-namespace writes.

`shared.*` updates are the job of the dedicated `update_shared_profile` step on commands like `/onboard` and `/reflect`, not this SKILL. `last_seen_complements` is Cart-specific telemetry — it lives under the plugin's own block because Vibe Doc, Vibe Sec, and friends will adopt Pattern #4 with their own complement snapshots later. A top-level `_meta.last_seen_complements` would create cross-plugin write coordination problems (see Key Technical Decision #1 in `spec.md`).

## What NOT to Log

- **No PII beyond the `project_dir` basename.** Never the full path. Never the user's name (that's in the profile, not the log).
- **No secrets.** Ever.
- **No command arguments or conversational content.** The log is structured feedback signal, not a transcript.
- **Nothing sensitive from the builder profile.** Don't duplicate profile contents into the session log.

## Size and Rotation

- One file per day keeps rotation natural.
- If a single day's file grows past ~1 MB (roughly 5,000 entries), something is wrong — investigate rather than rotate.
- Old files can be archived or deleted by the user at any time. The plugin never auto-deletes.

## Privacy Posture

- Local-first. The log lives in the user's home directory and never leaves their machine unless they explicitly share it.
- User-inspectable. `/vibe-cartographer:friction` reads the adjacent friction log; a future `/what-do-you-know` command will dump the session log in human-readable form.
- User-deletable. The user can `rm` the sessions directory at any time and the plugin continues working — it just loses the memory and treats subsequent runs like a fresh install for evolution purposes.

## Why This Exists

The session log is raw material for **Level 3** of the Self-Evolving Plugin Framework. `/evolve` reads these entries (alongside `friction.jsonl`) to propose plugin improvements based on observed patterns.

The **sentinel pattern** (Story 2.2) lets `friction-logger.detect_orphans()` distinguish "user abandoned the command" from "command never ran" — abandonment is friction signal worth surfacing; non-execution isn't.

The **`last_seen_complements` snapshot** (Story 4.2) gives `/evolve` and `/vitals` a way to detect material environment shifts. When two or more complements appear or disappear between runs, `notable_change_at` gets stamped — `/evolve` uses this to reweight complement-rejection patterns (the user may have rejected a complement because a better one just became available, not because the complement is bad).

See `docs/self-evolving-plugins-framework.md` for the full framework context and `docs/spec.md > Key Technical Decisions` for the sessionUUID and namespace-isolation rationale.
