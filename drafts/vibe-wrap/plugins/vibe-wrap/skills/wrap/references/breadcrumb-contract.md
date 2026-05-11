# Breadcrumb contract

> **Audience:** sibling plugin authors (Cart, Doc, Iterate, Sec, Test, Thesis Engine, Vibe Thesis, Taker, future plugins) and non-vibe tools that want to show up in vibe-wrap's session wrap doc.
> **Status:** schema v1, locked for v0.1.0. Forward-compatible — see § Forward compatibility.

This is the public contract for dropping a breadcrumb. Read it once, code against it forever.

## Why this exists

vibe-wrap reads the trail your toolkit already left during a session — sibling session-logs (Pattern #2), friction logs (Pattern #6), wins logs (Pattern #14) — and renders a handoff doc. Most marketplace siblings already write enough Pattern #2 state to give baseline coverage on day one. The breadcrumb plant mechanism is the **opt-in richer attribution layer** for plugins (or non-vibe tools) that want to mark a moment with more precision than their session-log captures naturally.

Two things to know up front:

1. **You don't have to plant anything.** If your plugin already writes `~/.claude/plugins/data/<plugin>/sessions/<date>.jsonl` per Pattern #2, vibe-wrap reads that automatically. Planting is for richer attribution, not a hard requirement.
2. **Planting is no-op-safe.** If vibe-wrap isn't installed, the call to `:plant` fails silently because the SKILL isn't registered in the user's environment. Your plugin doesn't break, doesn't error, doesn't block.

## How siblings invoke

The plant script is invoked from a sibling SKILL body (or any tool with shell access). The session UUID flows in via the `${CLAUDE_SESSION_ID}` template substitution at SKILL invocation time — Claude Code does not expose the session UUID to scripts via an environment variable, so the substitution-and-pass-as-CLI-arg pattern is the lockstep contract.

**Canonical sibling invocation** (one line, dropped into the sibling's own SKILL body at command start):

```
python ~/.claude/plugins/cache/vibe-plugins/vibe-wrap/<ver>/skills/plant/scripts/plant.py \
  --session-id ${CLAUDE_SESSION_ID} \
  --source vibe-cartographer \
  --command scope \
  --phase start \
  --outcome in_progress
```

The `${CLAUDE_SESSION_ID}` substitution resolves at SKILL invocation time inside the user's environment. If it comes through empty (env not set, hook payload absent, shell wonkiness), the script writes to `_orphan.jsonl` and exits 0. The wrap reader merges orphans into the active session by timestamp proximity at render time.

**The contract is fire-and-forget.** Every failure path — vibe-wrap not installed, missing required arg, malformed payload, atomic-append failure, unhandled Python exception — exits 0 with a one-line stderr warning. Sibling plugin authors do not need to wrap the call in `try/except`. If you ever have to, the contract is broken — file an issue. See § The no-op-safe contract for the full failure-mode matrix.

## File location

```
~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl
```

One file per Claude Code session UUID. Append-only. JSONL — one JSON object per line.

**Orphan fallback:** when the session UUID can't be resolved (env var missing, hook payload absent, shell wonkiness), the plant script writes to:

```
~/.claude/plugins/data/vibe-wrap/breadcrumbs/_orphan.jsonl
```

The wrap reader merges orphan entries into the active session by timestamp proximity at render time. You don't need to do anything special for orphan handling — it's the script's problem, not yours.

## Per-line schema (v1)

Every breadcrumb line is one JSON object with this shape:

```json
{
  "schema_version": 1,
  "ts": "2026-05-10T15:42:00-05:00",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "source": "vibe-cartographer",
  "command": "scope",
  "skill": "scope",
  "phase": "start",
  "outcome": "in_progress",
  "payload": null
}
```

### Field reference

| Field | Type | Required | Definition |
|---|---|---|---|
| `schema_version` | integer | yes | Always `1` for v0.1.0. Bumped when the schema changes (rare). |
| `ts` | string (ISO 8601 with TZ offset) | yes | When the breadcrumb was planted. Match Cart's session-logger format. |
| `sessionUUID` | string (UUID v4) | yes | Claude Code session ID. Falls back to a vibe-wrap-issued UUID if the env var isn't available. |
| `source` | string | yes | Calling plugin's name (e.g., `"vibe-cartographer"`, `"vibe-doc"`, or any non-vibe tool name). |
| `command` | string | yes | Calling slash-command without leading `/` (e.g., `"scope"`, `"audit"`). |
| `skill` | string | no | Invoked SKILL name. Omit if not skill-driven. |
| `phase` | string | yes | One of `"start"`, `"end"`, `"fire"`. `"fire"` is the default for one-shot events. |
| `outcome` | string \| null | no | One of `"in_progress"`, `"completed"`, `"failed"`, or null. |
| `payload` | object \| null | no | Source-defined extras. Anything you want to surface in the wrap. See § Forward compatibility. |

## The `:plant` SKILL call signature

Internal SKILL — siblings (or any plugin / tool that wants to mark a moment) invoke it. Not user-invocable.

```
plant(
  source:   string,         # required — your plugin's name
  command:  string,         # required — the slash command being run
  phase:    string,         # required — "start" | "end" | "fire"
  outcome:  string | null,  # optional — "in_progress" | "completed" | "failed" | null
  payload:  object | null   # optional — source-defined extras
)
```

The script:

1. Resolves the active Claude Code session UUID (env var; falls back to orphan file).
2. Builds the breadcrumb dict per the schema above.
3. Appends one JSONL line via the atomic-append protocol (tmp-file + fsync + rename).
4. Returns nothing. Exit 0 on success, exit 0 on every failure (silent).

## The no-op-safe contract

This is load-bearing for sibling plugin authors. The contract:

- **If vibe-wrap is not installed in the user's environment**, your call to the `:plant` SKILL fails because the SKILL isn't registered. Your plugin must not crash, raise, or block on this failure.
- **If vibe-wrap is installed but the session UUID can't be resolved**, the plant script writes to `_orphan.jsonl` and exits 0. No exception propagates back to your caller.
- **If vibe-wrap is installed but the breadcrumb file is unwritable** (disk full, permissions, anything), the plant script logs the failure to its own friction file and exits 0. Your caller never sees the error.
- **If your payload contains unknown extra fields**, the script writes them verbatim. No schema validation that would reject your write. See § Forward compatibility.
- **If your payload is malformed JSON** (passed via `--payload` as a non-parseable string), the script logs a one-line stderr warning and exits 0. No line written. Your caller never sees the error.
- **If a required arg is missing** (`--source`, `--command`, `--phase`), the script logs a one-line stderr warning and exits 0. No line written.
- **If anything else fails inside the script** (atomic-append failure, unhandled Python exception, anything), the last-resort guard around `main()` catches it and exits 0.

The bar: planting a breadcrumb is fire-and-forget. If you have to wrap your call in try/except to protect against vibe-wrap's failure modes, the contract is broken — file an issue.

## Forward compatibility

vibe-wrap's reader is permissive. The rules:

1. **Unknown fields are tolerated on read.** If a future plugin adds a field that v0.1.0's reader doesn't know about, the reader skips the field and parses what it understands. Your plugin can add `payload.{anything}` and older vibe-wrap installations won't crash — they'll just ignore the extra keys at render time.
2. **Unknown `phase` or `outcome` values are tolerated.** Future schema versions may add `"checkpoint"` or `"abandoned"`. v0.1.0 readers treat unknown enum values as `"fire"` / null and continue.
3. **Schema version bumps are explicit.** When the v2 schema lands, the `schema_version` field bumps from `1` to `2`. Readers route on the version field. v0.1.0 only writes v1.
4. **Field rename / removal is not allowed without a schema_version bump.** If field semantics change, the version bumps. The reader handles both.

**The hidden invariant:** as long as your plant call writes a v1-shaped object with the four required fields (`schema_version`, `ts`, `sessionUUID`, `source`, `command`, `phase`), the wrap doc will surface it correctly forever.

## Why hybrid (sibling-state-read + opt-in `:plant`) — not hook autodetect

Locked answer to PRD Open Question #2 (plant mechanism). Three options were on the table:

- **(a) Internal `:plant` SKILL siblings invoke** — clean attribution, requires sibling plugins to know about vibe-wrap (light coupling).
- **(b) `PreToolUse` hook autodetect** — self-contained, no sibling code changes, but harder to attribute (which plugin owns which Bash call?) and needs aggressive noise filtering.
- **(c) Hybrid — sibling-state-read baseline + opt-in `:plant`** — autodetect via existing Pattern #2 state, richer attribution available for siblings that opt in.

**v0.1.0 ships (c).** Two reasons:

1. **Sibling-state-read already gives baseline attribution.** Every marketplace plugin writes Pattern #2 session-logs. Reading them gives vibe-wrap a reasonable trail on day one with zero coupling and zero plugin code changes.
2. **`PreToolUse` hook autodetect needs noise filtering and double-attribution dedup.** Worth doing eventually; not worth doing in v1. Deferred to `/evolve-wrap` when usage data shows the gap.

The opt-in `:plant` SKILL covers the "marketplace sibling wants richer attribution than its session-log gives naturally" case. The pure-hook-autodetect path stays open for later — schema v1 already supports it; only the hook script is missing.

## Examples

### Example 1 — Cart at command-start

Cart's `/scope` command at invocation:

```python
plant(
  source="vibe-cartographer",
  command="scope",
  phase="start",
  outcome="in_progress",
)
```

### Example 2 — Doc with payload

Vibe-Doc's `/scan` command with a payload of what it found:

```python
plant(
  source="vibe-doc",
  command="scan",
  phase="end",
  outcome="completed",
  payload={
    "gaps_found": 3,
    "tier": "L2",
    "scan_duration_ms": 450,
  },
)
```

The wrap doc surfaces the payload-rich entry under "What shipped" with attribution.

### Example 3 — Non-vibe tool

A custom CLI script (not a Claude Code plugin) that wants to show up in the wrap:

```bash
python ~/.claude/plugins/cache/vibe-plugins/vibe-wrap/<ver>/skills/plant/scripts/plant.py \
  --source my-deploy-script \
  --command deploy-staging \
  --phase fire \
  --outcome completed \
  --payload '{"environment": "staging", "commit": "abc1234"}'
```

The script is callable directly. The contract holds: exit 0 on every failure path.

## See also

- **Storage decision** — see `spec.md > Decision 2` (one file per session UUID, not one per day).
- **Plant SKILL** — see `../../plant/SKILL.md` for the SKILL-side documentation.
- **Schema source of truth** — `spec.md > Data Model > Breadcrumb file` (this doc renders that).
