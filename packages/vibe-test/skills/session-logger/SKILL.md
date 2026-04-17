---
name: session-logger
description: "Internal SKILL — not a slash command. Two-phase append-only session log for Vibe Test: a sentinel entry at command start (outcome=in_progress) and a terminal entry at command end, paired by sessionUUID. Referenced by the guide SKILL; invoked by every command at start and end. Part of Level 2 (session memory) of the Self-Evolving Plugin Framework."
---

<!-- Derived from vibe-cartographer 1.5.0 session-logger SKILL (own-impl per Spec Decision 5 / Option a; migrate to @626labs/plugin-core in Phase 3) -->

# session-logger — Sentinel + Terminal Session Log

Internal SKILL. Not a user-invocable slash command. Every Vibe Test command calls `start()` at invocation and `end()` at completion. The two entries share a `sessionUUID` so friction / wins / beacon entries written during the same run can pair back to it.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "sessions" section. The sentinel vs terminal shapes, required fields, and sessionUUID pairing contract live there.
- **Schemas:** [`../guide/schemas/`](../guide/schemas/) — the session-log JSONL uses the inline shape documented in the TypeScript types at `src/state/session-log.ts`. No separate JSON Schema file in v0.2 — schema is per-entry via `schema_version: 1`.
- **Guide reference:** [`../guide/SKILL.md`](../guide/SKILL.md) — session memory interfaces section. This SKILL is the referent.
- **Atomic protocol:** all session log writes go through `src/state/session-log.ts` `start()` / `end()` / `append()` helpers. Those wrap `appendJsonl()` from `src/state/atomic-write.ts`. Never `>>` from a shell.

## Where the Log Lives

`~/.claude/plugins/data/vibe-test/sessions/<YYYY-MM-DD>.jsonl`

On Windows: `C:\Users\<user>\.claude\plugins\data\vibe-test\sessions\<YYYY-MM-DD>.jsonl`

- One file per day. Append-only. Never rewrite existing lines.
- `mkdir -p` the directory on first use (`appendJsonl` in `atomic-write.ts` handles this via `ensureDir: true`).
- Cross-project: a single user's logs from all their projects land here.
- Every command run produces **two** entries in the same daily file: one sentinel at start, one terminal at end, paired by `sessionUUID`.

## Entry Shapes

Two entries per command run. Both live in the same daily file. Both carry the same `sessionUUID`.

### Sentinel entry (written by `start()`)

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T01:20:00.000Z",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "command": "audit",
  "project": "my-app",
  "plugin": "vibe-test",
  "plugin_version": "0.2.0",
  "outcome": "in_progress"
}
```

### Terminal entry (written by `end()`)

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-17T01:50:00.000Z",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "command": "audit",
  "project": "my-app",
  "plugin": "vibe-test",
  "plugin_version": "0.2.0",
  "outcome": "completed",
  "tests_generated": 0,
  "friction_notes": ["user adjusted tier from spa-api to full-stack-db"],
  "key_decisions": ["classified as public-facing with 0.85 confidence"],
  "artifact_generated": "docs/vibe-test/audit-2026-04-17.md",
  "complements_invoked": ["vibe-sec"]
}
```

### Field definitions

Shared by both entries unless noted.

- **schema_version** — always `1` in v0.2.
- **timestamp** — ISO 8601 with timezone. Sentinel captures start time; terminal captures end time.
- **sessionUUID** — UUID v4 issued by `start()`. Load-bearing for pairing friction / wins / beacon entries and for orphan detection.
- **command** — one of `router`, `audit`, `generate`, `fix`, `coverage`, `gate`, `posture`, `evolve`, `vitals`.
- **project** — basename of the current working directory, or `null` if unbound.
- **plugin** — always `"vibe-test"`.
- **plugin_version** — read from `.claude-plugin/plugin.json`'s `"version"`. Fall back to `"unknown"` if unreadable.
- **outcome** — sentinel: `"in_progress"`. Terminal: `"completed" | "aborted" | "errored" | "partial"`.

**Terminal-only fields** (all optional):
- **tests_generated** / **tests_accepted** / **tests_rejected** / **rejection_reasons** — generate-command specific counts.
- **levels_covered** — array of test levels (smoke / behavioral / edge / integration / performance).
- **framework_used** — the framework the command actually generated for.
- **friction_notes** — short human-facing recap; the structured friction goes to `friction.jsonl`.
- **key_decisions** — high-signal decisions only. Examples: `"classified as public-facing"`, `"rejected coverage adapter"`.
- **artifact_generated** — relative path to any doc the command produced.
- **complements_invoked** — Pattern #13 complements that *actually ran* during this command. Format: `"<source>:<name>"` (e.g., `"superpowers:test-driven-development"`).

## Procedure: `start(command, project_dir)`

Called by a command SKILL at invocation. Returns the `sessionUUID` the command must hold in memory until it calls `end()`.

**Arguments:**
- `command` — the command name.
- `project_dir` — basename of cwd (or `null` for unbound).

**Returns:** the `sessionUUID` string (UUID v4).

**Steps (what the calling SKILL does — implemented in `src/state/session-log.ts`):**

1. **Invoke the state-layer helper.** The SKILL runs a short node snippet that imports `start` from `@esthernandez/vibe-test/state` and calls it:
   ```
   node -e "import('@esthernandez/vibe-test/state').then(m => m.sessionLog.start('audit','my-app').then(uuid => console.log(uuid)))"
   ```
   Or from a built dist, the equivalent direct-file invocation.
2. **Capture the returned sessionUUID** and hold it in memory for the duration of the command.
3. **On write failure**, the helper swallows the error — session logging is instrumentation. The command proceeds.

The `start()` implementation:
- Generates a sessionUUID via `crypto.randomUUID()`.
- Builds the sentinel entry with `outcome: "in_progress"`.
- Appends to `~/.claude/plugins/data/vibe-test/sessions/<today>.jsonl` via `appendJsonl()`.
- Returns the sessionUUID.

**Concurrency note:** two commands started in the same minute in different projects get different UUIDs. That's the whole point of the UUID pairing — timestamps alone can collide.

## Procedure: `end(entry)`

Called by a command SKILL at completion, after the handoff line prints but before control returns. Takes the sessionUUID issued by `start()` plus the terminal fields that weren't known at start.

**Argument:** a partial entry with at minimum `sessionUUID`, `command`, and `outcome`. The caller supplies the semantic fields; the state-layer helper fills audit fields and appends.

**Steps (what the calling SKILL does):**

1. **Invoke the state-layer helper.** Run a short node snippet that imports `end` from `@esthernandez/vibe-test/state` and passes the terminal entry.
2. **Match the sessionUUID.** The entry's `sessionUUID` MUST equal the value returned by `start()` for this same command run. Never mint a new UUID at end time — that breaks pairing for every friction / wins / beacon entry tagged with the original UUID.
3. **On write failure**, the helper swallows the error. The command's handoff line has already rendered; the user doesn't see a session-logger error.

The `end()` implementation:
- Fills `schema_version: 1`, `timestamp: <now>`, `plugin: "vibe-test"`, `plugin_version`.
- Appends the terminal entry to today's session file via `appendJsonl()`.

## What NOT to Log

- **No PII beyond the `project` basename.** Never the full path. Never the user's name.
- **No secrets.** Ever.
- **No command arguments or conversational content.** The log is structured feedback signal, not a transcript.
- **Nothing sensitive from the builder profile.** Don't duplicate profile contents into the session log.

## Size and Rotation

- One file per day keeps rotation natural.
- If a single day's file grows past ~1 MB (roughly 5,000 entries), something is wrong — investigate rather than rotate.
- Old files can be archived or deleted by the user at any time. The plugin never auto-deletes.

## Privacy Posture

- Local-first. The log lives in the user's home directory and never leaves their machine unless they explicitly share it.
- User-inspectable. `/vibe-test:posture` surfaces recent session counts; a future `/vibe-test:friction` will dump friction adjacent to sessions.
- User-deletable. The user can delete the sessions directory at any time; the plugin continues working and treats subsequent runs as fresh for evolution purposes.

## Why This SKILL Exists

The session log is raw material for Level 3 (self-evolution). `/vibe-test:evolve` reads these entries — alongside `friction.jsonl` and `wins.jsonl` — to propose plugin improvements based on observed patterns.

The **sentinel pattern** lets `friction-logger.detect_orphans()` distinguish *"user abandoned the command"* (orphan sentinel = `command_abandoned` entry) from *"command never ran"* (no entry at all — not friction).

See `docs/self-evolving-plugins-framework.md` for the full framework context.
