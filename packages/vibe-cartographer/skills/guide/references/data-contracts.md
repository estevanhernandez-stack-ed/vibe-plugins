# Data Contracts

Single source of truth for every persistent data file Vibe Cartographer reads or writes. Every SKILL that touches one of these files MUST link to this document in its "Before You Start" section. If the shapes here disagree with code, this doc is authoritative — fix the code.

## Files at a glance

| File | Path | Format | Schema | Writer |
|------|------|--------|--------|--------|
| Unified profile | `~/.claude/profiles/builder.json` | JSON object | [`../schemas/builder-profile.schema.json`](../schemas/builder-profile.schema.json) | atomic-write |
| Friction log | `~/.claude/plugins/data/vibe-cartographer/friction.jsonl` | JSONL | [`../schemas/friction.schema.json`](../schemas/friction.schema.json) | atomic-append |
| Friction calibration | `~/.claude/plugins/data/vibe-cartographer/friction.calibration.jsonl` | JSONL | [`../schemas/friction-calibration.schema.json`](../schemas/friction-calibration.schema.json) | atomic-append |
| Session log | `~/.claude/plugins/data/vibe-cartographer/sessions/<date>.jsonl` | JSONL | [`../schemas/session-log.schema.json`](../schemas/session-log.schema.json) | atomic-append |

All schemas are JSON Schema Draft-07. `/vibe-cartographer:vitals` check #3 validates the unified profile against its schema directly. Check #8 validates each friction.jsonl line against its schema.

---

## Unified profile (`builder.json`)

JSON object. One file per builder. Read by every plugin that participates in the Pattern #11 shared bus; written namespace-by-namespace by each plugin.

Top-level keys (see schema for the full shape):

- `schema_version` (int, currently `1`)
- `last_updated` (ISO date / datetime)
- `decay_disabled` (bool, default `false`) — opt-out flag for the decay subsystem
- `shared` — cross-plugin fields (`name`, `identity`, `technical_experience`, `preferences`, `creative_sensibility`) plus a `_meta` block keyed by dotted field path with `last_confirmed` / `stale` / `ttl_days`
- `plugins.<name>` — one block per participating plugin. Each block carries its own `_meta` block following the same dotted-path convention. `plugins.vibe-cartographer._meta.last_seen_complements` is a special sub-shape with `list` / `timestamp` / `previous_diff_count` / `notable_change_at`

### Pattern #11 namespace isolation rules

This is the load-bearing invariant from `docs/self-evolving-plugins-framework.md > Pattern 11 — Shared User Profile Bus`. Every plugin MUST follow these rules without exception:

1. **Read shared, write own.** A plugin reads any field it likes. A plugin writes only inside `shared.*` (through the named `update_shared_profile` step) or inside its own `plugins.<plugin-name>.*` block. **Never write into another plugin's namespace.** Cross-plugin mutation is the failure mode this pattern exists to prevent.
2. **Each namespace owns its own `_meta`.** Decay metadata is nested per namespace (Spec Decision #1). `shared._meta` holds decay entries for shared fields; `plugins.vibe-cartographer._meta` holds entries for cartographer fields. There is no top-level `_meta`.
3. **`_meta` keys are dotted field paths inside the same namespace.** A `shared._meta` entry like `"preferences.persona"` decays `shared.preferences.persona`. A `plugins.vibe-cartographer._meta` entry like `"deepening_round_habits"` decays `plugins.vibe-cartographer.deepening_round_habits`. `_meta` keys never cross namespace boundaries.
4. **Conflicting writes refuse silently.** If two plugins try to write the same shared field with different values within one session, the second writer surfaces the conflict and refuses rather than overwriting (Pattern #11 framework rule).
5. **Plugin-scoped fields stay plugin-scoped.** Don't promote a field into `shared` until at least two plugins genuinely need it. Premature promotion is harder to undo than late promotion.
6. **Removing a plugin removes only `plugins.<name>`.** Uninstalling Vibe Cartographer must not touch `shared.*` or any other plugins' blocks. `/vitals` and `/evolve` rely on this.

### Decay metadata shape

Inside any `_meta` block, each entry is keyed by the dotted path of the field it decays:

```jsonc
"_meta": {
  "preferences.persona": {
    "last_confirmed": "2026-04-17",
    "stale": false,
    "ttl_days": 180
  }
}
```

Default TTLs (set by `decay.stamp()` on first stamp if missing):

| Field | TTL |
|-------|-----|
| `preferences.persona`, `preferences.tone`, `preferences.pacing`, `preferences.communication_style` | 180 days |
| `technical_experience.level` | 365 days |
| `technical_experience.languages`, `technical_experience.frameworks` | 90 days |
| `name`, `identity`, `creative_sensibility` | never decays — no `_meta` entry |

Plugin-specific fields like `plugins.vibe-cartographer._meta.last_seen_complements` carry their own sub-shape and live alongside dotted-path entries within the same `_meta` block.

---

## Friction log (`friction.jsonl`)

JSONL, append-only. One entry per detected friction signal. See [`../schemas/friction.schema.json`](../schemas/friction.schema.json).

Required fields: `schema_version`, `timestamp`, `plugin_version`, `command`, `project_dir`, `sessionUUID`, `friction_type`, `confidence`. Optional: `project_id`, `symptom`, `agent_guess_at_cause`, `complement_involved`.

The seven canonical `friction_type` values:

| Type | Meaning |
|------|---------|
| `command_abandoned` | Sentinel session-log entry without a terminal pair after 24h. Emitted by `friction-logger.detect_orphans()`. |
| `default_overridden` | User explicitly chose the opposite of a recommended default. |
| `complement_rejected` | User declined a Pattern #13 complement offer. Set `complement_involved`. |
| `repeat_question` | User asked the agent to re-explain or re-pose. Capture topic in `symptom`. |
| `artifact_rewritten` | User rewrote >50% of a generated artifact (line-diff). |
| `sequence_revised` | User reordered or skipped commands relative to the documented happy path. |
| `rephrase_requested` | User asked the agent to simplify or restate. |

`confidence` is one of `high`, `medium`, `low`. `/evolve` weighting: `high=1.0`, `medium=0.6`, `low=0.3`. Calibration entries can zero an entry's weight.

When in doubt, **don't log** (Spec Key Decision #6). False positives poison `/evolve`; false negatives are recoverable through the `/reflect` calibration check-in.

Each command's specific trigger conditions live in [`./friction-triggers.md`](./friction-triggers.md). That file and this one stay in sync — `/vibe-cartographer:vitals` check #6 audits both directions.

---

## Friction calibration (`friction.calibration.jsonl`)

JSONL, append-only. Written by `/reflect`'s calibration check-in. See [`../schemas/friction-calibration.schema.json`](../schemas/friction-calibration.schema.json).

Required: `schema_version`, `timestamp`, `plugin_version`, `friction_entry_ref`, `calibration`.

`friction_entry_ref` is the composite triple `(timestamp, friction_type, sessionUUID)` — these three together uniquely identify a friction.jsonl entry without requiring a stable line ID.

`calibration` is one of:

- `false_positive` — the referenced friction entry wasn't real. `/evolve` multiplies its weight by 0.0 (effectively removes it).
- `false_negative` — friction the logger missed; the builder describes it after the fact in `builder_note`. There may be no matching friction entry; `friction_entry_ref` may point at a nearby anchor entry from the same session.

`builder_note` is optional free-text context.

---

## Session log (`sessions/<date>.jsonl`)

JSONL, append-only. One file per UTC date. See [`../schemas/session-log.schema.json`](../schemas/session-log.schema.json).

Two entry shapes share a `sessionUUID`:

**Sentinel entry** — written by `session-logger.start(command, project_dir)` at command invocation. Required fields: `schema_version`, `timestamp`, `plugin`, `plugin_version`, `command`, `project_dir`, `sessionUUID`, `outcome: "in_progress"`. Plus optional `project_id`, `mode`, `persona`. The `outcome: "in_progress"` value is the literal sentinel marker — `friction-logger.detect_orphans()` looks for sentinels older than 24h with no matching terminal entry.

**Terminal entry** — written at command end. Same identifying fields plus `outcome: "completed" | "abandoned" | "error" | "partial"`, `user_pushback` (bool), `friction_notes` (array of strings), `key_decisions` (array of strings), `artifact_generated` (string or null), `complements_invoked` (array of strings).

The orphan detector pairs entries by `(command, project_dir, sessionUUID)`. Concurrent commands in different projects may collide on `(command, project_dir)` within the same minute, so `sessionUUID` is the actual disambiguator (Spec Key Decision #3).

At terminal write time, `session-logger` ALSO updates `plugins.vibe-cartographer._meta.last_seen_complements` in the unified profile via atomic-write — that's the only profile mutation tied to the session log.

---

## Atomic-write protocol

**When to use:** any write to the unified profile JSON (`~/.claude/profiles/builder.json`). Anywhere you need to rewrite an entire file and need to guarantee that a reader either sees the previous full version or the new full version, never a half-written file.

**How:** pipe the new JSON object to `node scripts/atomic-write-json.js <target-path>`. The script:

1. Reads stdin, parses as JSON (exit 1 on parse failure).
2. `mkdirSync(parent, { recursive: true })`.
3. Writes the serialized JSON to `<target-path>.tmp`.
4. `fs.fsyncSync` on the temp file's fd.
5. `fs.renameSync(<target-path>.tmp, <target-path>)` — POSIX-atomic.

**Failure semantics:**

- Step 3 or 4 fails → original file unchanged, `.tmp` debris left behind. `/vitals` check #7 detects and offers cleanup `(e)`.
- Step 5 fails (rare; only on filesystems without atomic rename) → original unchanged, `.tmp` debris.
- The script never retries. Caller (the SKILL) decides retry policy. Failed atomic-writes surface up the SKILL chain as errors.

**Why a script and not inline Node:** Phase 2 will lift this into `@626labs/plugin-core/state` as a typed function call. Keeping the interface as a stdin-fed script today means the SKILL contracts don't change at migration time (Spec Key Decision #2).

---

## Atomic-append protocol

**When to use:** any append to a `.jsonl` log — friction.jsonl, friction.calibration.jsonl, sessions/*.jsonl. Use this for all per-line appends; never `>>` from a shell.

**How:** pipe one JSON object to `node scripts/atomic-append-jsonl.js <target-path>`. The script:

1. Reads stdin, parses as JSON (exit 1 on parse failure).
2. Re-serializes to a single line (no embedded newlines in the JSON value).
3. `mkdirSync(parent, { recursive: true })`.
4. `fs.openSync` with `O_APPEND | O_WRONLY | O_CREAT` — the kernel guarantees atomicity for appends ≤ PIPE_BUF on POSIX.
5. `fs.writeSync(fd, line + "\n")`.
6. Close, exit 0.

**Cross-platform notes:**

- POSIX (Mac/Linux): O_APPEND atomicity covers our entry sizes (well under PIPE_BUF).
- Windows: O_APPEND atomicity is weaker. For 1.5.0 this is accepted — friction entries are small and concurrent same-user same-machine writes are rare. If corruption appears in the wild, post-1.5.0 patch adds a lockfile fallback.

**Failure semantics:**

- File locked by another process → exit 1 with `"could not acquire append: <reason>"`. Caller decides retry; SKILLs typically surface to the user but do not block the command.
- Concurrent-write corruption (Windows edge case) → malformed lines detected by `/vitals` check #8 with auto-fix `(f)` repair (rewrites file dropping malformed lines, backs up to `.bak`).

---

## Adding a new data file

When adding a new file under `~/.claude/plugins/data/vibe-cartographer/` or a new namespace block to the profile:

1. Add a JSON Schema under `../schemas/`.
2. Add a section to this doc with format, schema link, required fields, and which atomic protocol applies.
3. If it's a new profile namespace, restate the Pattern #11 isolation rules — new contributors will read this doc, not the framework doc.
4. Add a `/vitals` check if the file's integrity is load-bearing.
5. Update `friction-triggers.md` if any command newly emits friction tied to the file.
