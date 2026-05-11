---
name: session-logger
description: Internal SKILL — not a slash command. Two-phase append-only session log for vibe-wrap's OWN sessions: a sentinel entry at command start (`outcome=in_progress`) and a terminal entry at command end, paired by sessionUUID. Distinct from breadcrumb capture — this is vibe-wrap's self-evolution instrumentation (Pattern #2), not the cross-plugin trail. Storage: `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`. Pattern #11 namespace isolation — writes ONLY inside vibe-wrap's data dir. Invoked by every vibe-wrap command at start and end.
---

# session-logger — Sentinel + Terminal Session Log

Internal SKILL. Not a user-invocable slash command. Every vibe-wrap command calls `start()` at invocation and the terminal-append procedure at completion. The two entries share a `sessionUUID` so future tooling (`/vibe-wrap:evolve-wrap`, an eventual `friction-logger.detect_orphans()`) can pair them.

Read [`../guide/SKILL.md`](../guide/SKILL.md) first for shared behavior — voice, namespace isolation, atomic-append discipline.

## Before You Start

- **Atomic protocol:** all session log writes go through `python skills/wrap/scripts/atomic-append-jsonl.py`. Never `>>` from a shell.
- **sessionUUID is load-bearing.** The sentinel's `sessionUUID` is what pairs the terminal entry back to the right command run. Never mint a second UUID at terminal time — reuse the one `start()` returned.
- **Pattern #11 namespace isolation.** This SKILL writes to exactly one place: `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`. Never `shared.*`, never any sibling namespace, never `~/.claude/profiles/builder.json`. Cart's session-logger updates `last_seen_complements` on the unified profile; vibe-wrap v0.1.0 deliberately does NOT — that snapshot is deferred to `/evolve-wrap`.
- **No-op-safe.** A failed atomic append logs a one-line note to stderr and continues. The SKILL never raises to the caller. Instrumentation is not critical path; the user-facing command keeps running.

## Where the Log Lives

`~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`

- One file per day. Append-only. Never rewrite existing lines.
- The atomic-append script handles `mkdir -p` on first use.
- Cross-project: a single user's logs from all their projects land here.
- Every command run produces **two** entries in the same daily file: one sentinel at start, one terminal at end, paired by `sessionUUID`.

## Entry Shapes

Two entries per command run. Both live in the same daily file. Both carry the same `sessionUUID`.

### Sentinel entry (written by `start()`)

Minimal shape — no outcome data exists yet. `outcome` is hard-coded to `"in_progress"`.

```json
{
  "schema_version": 1,
  "timestamp": "2026-05-10T15:42:00-05:00",
  "plugin": "vibe-wrap",
  "plugin_version": "0.1.0",
  "command": "wrap",
  "project_dir": "vibe-plugins",
  "mode": "builder",
  "persona": "architect",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "in_progress"
}
```

### Terminal entry (written by `end()`)

Full shape with outcome metadata, friction notes, key decisions, and complement attribution. Carries the **same `sessionUUID`** as its paired sentinel.

```json
{
  "schema_version": 1,
  "timestamp": "2026-05-10T16:14:00-05:00",
  "plugin": "vibe-wrap",
  "plugin_version": "0.1.0",
  "command": "wrap",
  "project_dir": "vibe-plugins",
  "mode": "builder",
  "persona": "architect",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "completed",
  "user_pushback": false,
  "friction_notes": ["default_overridden"],
  "key_decisions": ["picked file-md backend on first run"],
  "artifact_generated": "docs/session-wraps/2026-05-10-1614.md",
  "complements_invoked": ["vibe-cartographer:state-read"]
}
```

### Field definitions

Shared by both entries unless noted.

- **schema_version** — always `1` for now. Bump when the schema changes.
- **timestamp** — ISO 8601 with timezone offset. Sentinel captures start time; terminal captures end time.
- **plugin** — always `"vibe-wrap"`.
- **plugin_version** — read from `plugins/vibe-wrap/.claude-plugin/plugin.json`. If unreadable, use `"unknown"`.
- **command** — which vibe-wrap command is running: `wrap`, `status`, `plant`, `evolve-wrap`. (Internal SKILLs `guide`, `session-logger`, `friction-logger` don't write their own session entries — they're invoked from commands that already wrote one.)
- **project_dir** — basename of the current working directory. Not the full path. PII discipline.
- **mode** — `learner` | `builder` | `null`. Read from `~/.claude/profiles/builder.json` at `shared.preferences.mode`.
- **persona** — `professor` | `cohort` | `superdev` | `architect` | `coach` | `null`. Read from `shared.preferences.persona`.
- **sessionUUID** — UUID v4 issued by `start()`. Required for sentinel/terminal pairing.
- **outcome** — sentinel: always `"in_progress"`. Terminal: `completed` | `abandoned` | `error` | `partial`.

**Terminal-only fields:**

- **user_pushback** — boolean. `true` if the user rejected, heavily edited, or overrode an agent suggestion. Be conservative; minor tweaks don't count.
- **friction_notes** — array of short strings. Human-facing recap. The actual structured friction signal goes to `friction.jsonl` via `friction-logger.log()`.
- **key_decisions** — array of short strings. High-signal only. Examples: `"picked file-md backend"`, `"declined commit gate"`, `"forced bridge with --bridge"`.
- **artifact_generated** — relative path to the doc this command produced (the wrap doc, the proposed-changes doc), or `null`.
- **complements_invoked** — Pattern #13 complements that *actually ran* during this command. Format: `"<source>:<name>"` (e.g., `"vibe-cartographer:state-read"`, `"626Labs MCP:manage_decisions"`). What got used this run, not what was available.

## Procedure: `start(command, project_dir)`

Called by a command SKILL at invocation. Returns the `sessionUUID` the command must hold in memory until it calls `end()`.

**Arguments:**
- `command` — the command name (`wrap`, `status`, `plant`, `evolve-wrap`).
- `project_dir` — basename of the cwd.

**Returns:** the `sessionUUID` string (UUID v4) on stdout from `scripts/start.py`.

**Steps:**

1. **Generate sessionUUID.** Use Python's `uuid.uuid4()`. Never reuse a UUID from a prior session, a friction entry, or anywhere else.
2. **Determine audit fields.**
   - `schema_version: 1`.
   - `timestamp`: now, ISO 8601 with timezone offset.
   - `plugin: "vibe-wrap"`.
   - `plugin_version`: read from `.claude-plugin/plugin.json`'s `"version"`. Fall back to `"unknown"`.
   - `mode` / `persona`: read from `~/.claude/profiles/builder.json`. Pass through as-is; `null` if unset or file missing.
3. **Build the sentinel entry** using the shape above with `outcome: "in_progress"`.
4. **Atomic append.** Pipe the JSON entry to:
   ```
   python skills/wrap/scripts/atomic-append-jsonl.py ~/.claude/plugins/data/vibe-wrap/sessions/<today>.jsonl
   ```
   where `<today>` is `YYYY-MM-DD` in local time. On non-zero exit, log a one-line note to stderr and continue — session logging is instrumentation, not critical path.
5. **Return the `sessionUUID`** to the caller. The command SKILL holds it in memory and passes it back when calling `end()`.

**Concurrency note:** two commands started in the same second in different projects will get different UUIDs. That's the whole point — timestamps alone can collide; UUIDs can't.

## Procedure: `end(entry)`

Called by a command SKILL at completion. Takes the sessionUUID issued by `start()` plus the terminal fields that weren't known at start time.

**Argument:** a partial entry with at minimum `sessionUUID`, `command`, `outcome`, and whatever other terminal fields the command wants to record. The caller supplies the semantic fields; this procedure fills audit fields.

**Steps:**

1. **Build the full entry.**
   - Start with the caller's partial entry (it carries `sessionUUID`, `command`, `outcome`, `user_pushback`, `friction_notes`, `key_decisions`, `artifact_generated`, `complements_invoked`).
   - Overlay/fill audit fields:
     - `schema_version: 1`
     - `timestamp`: now, ISO 8601 with timezone offset.
     - `plugin: "vibe-wrap"`
     - `plugin_version`: as in `start()`.
     - `project_dir`, `mode`, `persona`: pulled the same way as in `start()` so the pair is internally consistent.
2. **Match the sessionUUID.** The entry's `sessionUUID` MUST equal the value returned by `start()`. Never mint a new UUID here — that breaks pairing.
3. **Validate `outcome`.** Must be one of `completed` | `abandoned` | `error` | `partial`. If not, log a stderr note and force `error`. Don't block the caller.
4. **Atomic append to today's session file** exactly as in `start()` step 4.

**Failure handling:** same as `start()` — a failed append logs a one-line warning to stderr and the command proceeds. The user never sees a session-logger error.

## Namespace Isolation (Pattern #11)

This SKILL writes to exactly one place:

`~/.claude/plugins/data/vibe-wrap/sessions/<date>.jsonl` — session log file (vibe-wrap's own data directory, append-only).

It does NOT write to:
- `~/.claude/profiles/builder.json` — Cart's session-logger updates `plugins.vibe-cartographer._meta.last_seen_complements` here; vibe-wrap v0.1.0 does not. The `last_seen_complements` snapshot is deferred to `/evolve-wrap`. When that lands, the analogous block under `plugins.vibe-wrap._meta.last_seen_complements` will be the only profile field vibe-wrap touches — never `shared.*`, never any other plugin's namespace.
- Any sibling plugin's data namespace.
- Any decision-log backend file (those are the `wrap` SKILL's territory, owned by user-chosen log).

## Orchestrator-context fallback

When a vibe-wrap SKILL runs outside vibe-wrap's normal runtime — for example, the user invokes vibe-wrap commands inside a multi-command chat where the orchestrator can't shell out to `start.py` / `end.py` directly — the SKILLs may fall back to recording session activity in a project-local `process-notes.md` or the chat transcript, instead of the JSONL session log.

In that case, two consequences:
1. The session JSONL stays empty for that run. `/vibe-wrap:evolve-wrap` will see no entry — friction signals from that run are recoverable only from the chat transcript or process-notes.
2. The next native runtime invocation re-establishes JSONL coverage. Past orchestrator-only runs are not auto-backfilled.

A future `:reconnect`-style backfill SKILL (mirroring Cart's reconnect procedure) could parse process-notes and synthesize sentinel + terminal entries deterministically. Not implemented in v0.1.0. Documented here so the contract is stable for when it lands.

## What NOT to Log

- **No PII beyond the `project_dir` basename.** Never the full path. Never the user's name (that's in the profile, not the log).
- **No secrets.** Ever.
- **No command arguments or conversational content.** The log is structured feedback signal, not a transcript.
- **Nothing sensitive from the builder profile.** Don't duplicate profile contents into the session log.

## Size and Rotation

- One file per day keeps rotation natural.
- If a single day's file grows past ~1 MB (roughly 5,000 entries), something is wrong — investigate rather than rotate.
- The user can `rm` old session files at any time. The plugin never auto-deletes.

## Privacy Posture

- Local-first. The log lives in the user's home directory and never leaves their machine unless they explicitly share it.
- User-inspectable. `cat ~/.claude/plugins/data/vibe-wrap/sessions/<date>.jsonl` is the read surface in v0.1.0; later versions may ship a friendlier viewer.
- User-deletable. `rm` the sessions directory at any time and the plugin continues working — it just loses the memory and `evolve-wrap` treats subsequent runs like a fresh install.

## Why This Exists

The session log is raw material for **Level 3** of the Self-Evolving Plugin Framework. `/vibe-wrap:evolve-wrap` reads these entries (alongside `friction.jsonl` and the wrap docs themselves) to propose plugin improvements based on observed patterns.

The **sentinel pattern** lets future orphan detection distinguish "user abandoned the command" from "command never ran" — abandonment is friction signal worth surfacing; non-execution isn't.

See [`../guide/SKILL.md`](../guide/SKILL.md) for the broader Pattern #11 / Pattern #13 contract and the Self-Evolving Plugin Framework reference.

## Wiring (forward note)

Every future vibe-wrap command SKILL (`wrap`, `status`, `plant`, `evolve-wrap`) calls `start.py` at command start to mint a sessionUUID, holds the UUID in memory for the duration of the run, passes it to `friction-logger.log()` for any friction events, and calls `end.py` at command end with the partial terminal entry. SKILL bodies that get implemented in later checklist items will wire this in. Item 3 builds the infrastructure; the wire-up is per-command.

## Reference

- [`scripts/start.py`](scripts/start.py) — sentinel write.
- [`scripts/end.py`](scripts/end.py) — terminal write.
- [`../wrap/scripts/atomic-append-jsonl.py`](../wrap/scripts/atomic-append-jsonl.py) — atomic single-line append.
- [`../guide/SKILL.md`](../guide/SKILL.md) — shared behavior, voice, namespace isolation.
- [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — per-command friction-trigger contract that `friction-logger.log()` honors.
