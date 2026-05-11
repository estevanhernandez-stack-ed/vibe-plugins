---
name: plant
description: Internal SKILL — not a user-invocable slash command. Sibling vibe plugins (or non-vibe tools that opt in) invoke `plant(source, command, phase, outcome=null, payload=null)` at command-start (or any point worth marking) to drop one breadcrumb line into the active session's breadcrumb file. No-op-safe — silent failure if vibe-wrap isn't installed or the session UUID can't be resolved (falls back to `_orphan.jsonl`). Writes one JSONL line to `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`. Forward-compat — unknown payload fields are written verbatim. See `references/breadcrumb-contract.md` for the full schema and contract for sibling plugin authors.
---

# plant — Drop one breadcrumb into the session trail

Internal SKILL. **Not a user-invocable slash command.** Sibling plugins (or non-vibe tools that want to opt in) invoke this at command-start, command-end, or any other moment they want vibe-wrap to surface in the session wrap doc. One call writes one JSONL line.

Read [`../guide/SKILL.md`](../guide/SKILL.md) first for shared behavior — voice, namespace isolation, atomic-append discipline, and the no-op-safe contract framing this SKILL implements.

The full public schema and contract live at [`../wrap/references/breadcrumb-contract.md`](../wrap/references/breadcrumb-contract.md). That doc is what sibling plugin authors read once and code against forever. This SKILL body documents the implementation side.

## Before you start

- **Atomic protocol.** Every breadcrumb write goes through `python skills/wrap/scripts/atomic-append-jsonl.py`. Never `>>` from a shell.
- **Pattern #11 namespace isolation.** This SKILL writes to exactly one place: `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl` (or `_orphan.jsonl` on UUID-resolution failure). Never any sibling namespace, never `~/.claude/profiles/builder.json`.
- **No-op-safe is load-bearing.** Sibling plugin authors rely on this. Every failure path — missing required args, malformed payload, atomic-append failure, unhandled exception — logs a one-line stderr warning and exits 0. Never raise to the caller.
- **Session UUID is passed in, not discovered.** Claude Code does not expose the session UUID as an environment variable to scripts directly. The SKILL caller resolves it via the `${CLAUDE_SESSION_ID}` template substitution and passes it as `--session-id`. Empty / unresolvable → orphan fallback.

## How siblings invoke

The script is designed to be called from a sibling SKILL body (or any tool with shell access). The session UUID flows in via the `${CLAUDE_SESSION_ID}` template substitution at SKILL invocation time.

**Canonical sibling invocation** (one line, dropped into the sibling's own SKILL body at command start):

```
python ~/.claude/plugins/cache/vibe-plugins/vibe-wrap/<ver>/skills/plant/scripts/plant.py \
  --session-id ${CLAUDE_SESSION_ID} \
  --source vibe-cartographer \
  --command scope \
  --phase start \
  --outcome in_progress
```

The `${CLAUDE_SESSION_ID}` substitution resolves at SKILL invocation time inside the user's environment. If the substitution comes through empty (env not set, hook payload absent, shell wonkiness), the script writes to `_orphan.jsonl` and exits 0. The wrap reader merges orphans into the active session by timestamp proximity at render time.

**With a payload:**

```
python ~/.claude/plugins/cache/vibe-plugins/vibe-wrap/<ver>/skills/plant/scripts/plant.py \
  --session-id ${CLAUDE_SESSION_ID} \
  --source vibe-doc \
  --command scan \
  --phase end \
  --outcome completed \
  --payload '{"gaps_found": 3, "tier": "L2"}'
```

The payload is a JSON-encoded object. Unknown fields are written verbatim — see [`../wrap/references/breadcrumb-contract.md`](../wrap/references/breadcrumb-contract.md) § Forward compatibility.

## Call signature

```
plant(
  source:      string,         # required — calling plugin's name
  command:     string,         # required — slash command without leading "/"
  phase:       string,         # required — "start" | "end" | "fire"
  outcome:     string | null,  # optional — "in_progress" | "completed" | "failed" | null
  payload:     object | null,  # optional — source-defined extras (any JSON object)
)
```

Implemented as `scripts/plant.py` with the CLI flags:

| Flag | Required | Purpose |
|---|---|---|
| `--session-id` | yes (may be empty) | Claude Code session UUID. Empty → orphan fallback. Caller substitutes `${CLAUDE_SESSION_ID}`. |
| `--source` | yes | Calling plugin's name. |
| `--command` | yes | Slash-command without leading `/`. |
| `--phase` | yes | One of `start`, `end`, `fire`. |
| `--skill` | no | Invoked SKILL name. Omitted from the entry when not supplied. |
| `--outcome` | no | One of `in_progress`, `completed`, `failed`. Empty → null. |
| `--payload` | no | JSON-encoded object. Bad JSON → no line written, exit 0, stderr warning. |

## Where the file lives

Per-session file:

```
~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl
```

Orphan fallback (when `--session-id` is empty or whitespace):

```
~/.claude/plugins/data/vibe-wrap/breadcrumbs/_orphan.jsonl
```

One file per Claude Code session. Append-only. JSONL — one JSON object per line. The atomic-append script handles `mkdir -p` on first use.

## Per-line schema (v1)

The script emits exactly this shape per call. Reference schema lives in [`../../docs/spec.md`](../../../../docs/spec.md) § Data Model > Breadcrumb file and the public contract at [`../wrap/references/breadcrumb-contract.md`](../wrap/references/breadcrumb-contract.md).

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

Field rules:

- `schema_version` — always `1` for v0.1.0.
- `ts` — ISO 8601 with timezone offset, set at write time.
- `sessionUUID` — the value passed via `--session-id`, or `null` when the orphan fallback fires.
- `source`, `command`, `phase` — pass-through from CLI args. Required.
- `skill` — only present when `--skill` is supplied. Omitted from the entry otherwise (saves bytes, matches the contract's "optional" framing).
- `outcome` — pass-through from `--outcome`, or `null` when omitted / empty.
- `payload` — parsed from `--payload` JSON, or `null` when omitted.

## The no-op-safe contract

Every failure path exits 0. Without exception. The contract:

| Failure | What happens |
|---|---|
| `argparse` rejects an unrecognized flag | Stderr warning + exit 0. |
| Required flag missing (`--source`, `--command`, `--phase`) | Stderr warning + exit 0. No line written. |
| `--phase` value not in `{start, end, fire}` | Stderr warning + write the line anyway (forward-compat). |
| `--outcome` value not in `{in_progress, completed, failed}` | Stderr warning + write the line anyway (forward-compat). |
| `--payload` is malformed JSON | Stderr warning + exit 0. No line written. |
| Atomic-append script not found / unreadable | Stderr warning + exit 0. No line written. |
| Atomic-append exits non-zero (disk full, permissions, etc.) | Stderr warning + exit 0. |
| Unhandled Python exception anywhere in main() | Stderr warning + exit 0 (last-resort guard). |

This is load-bearing for sibling plugin authors. The contract is fire-and-forget. If a sibling has to wrap their `plant` call in `try/except` to protect against vibe-wrap's failure modes, the contract is broken — file an issue.

## Forward compatibility

Per [`../wrap/references/breadcrumb-contract.md`](../wrap/references/breadcrumb-contract.md) § Forward compatibility:

- **Unknown `--payload` fields are written verbatim.** No schema validation that would reject the write. A future plugin can add `payload.{anything}` and v0.1.0's reader will pass them through (and skip what it doesn't understand at render time).
- **Unknown `phase` / `outcome` enum values are tolerated on write.** The script warns to stderr but writes the line anyway. v1 readers treat unknown enum values as `"fire"` / null.
- **The `schema_version` field is always `1` for v0.1.0.** When v2 lands, it bumps and the reader routes on the version field.

## Pattern #11 namespace isolation

This SKILL writes to exactly one place:

`~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl` (or `_orphan.jsonl`)

It does NOT write to:

- `~/.claude/profiles/builder.json` — the unified builder profile is owned by the user / Cart, not vibe-wrap.
- Any sibling plugin's data namespace.
- vibe-wrap's session log (`~/.claude/plugins/data/vibe-wrap/sessions/<date>.jsonl`) — that's `session-logger`'s territory. Breadcrumbs and session-logs are deliberately separate files with different shapes and purposes.

## Distinct from `session-logger`

`session-logger` writes vibe-wrap's OWN session-log entries (Pattern #2 — sentinel + terminal pairs for vibe-wrap's self-evolution). `plant` writes the cross-plugin breadcrumb trail that vibe-wrap reads at wrap time. Different files, different shapes, different purposes:

| | `session-logger` | `plant` |
|---|---|---|
| What | vibe-wrap's own self-evolution instrumentation | Cross-plugin breadcrumb trail |
| Who writes | Every vibe-wrap command at start + end | Sibling plugins (or vibe-wrap itself for its own commands) |
| File | `data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl` | `data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl` |
| Schema | Sentinel + terminal entry pair | One entry per call |
| Read by | `evolve-wrap` | `wrap`, `status` |

## Example sibling invocation (Cart at command-start)

What a Cart SKILL author drops at the top of `/scope`'s SKILL body:

```
python ~/.claude/plugins/cache/vibe-plugins/vibe-wrap/<ver>/skills/plant/scripts/plant.py \
  --session-id ${CLAUDE_SESSION_ID} \
  --source vibe-cartographer \
  --command scope \
  --phase start \
  --outcome in_progress
```

That's the whole integration. No imports, no try/except wrappers, no library. The substitution resolves at SKILL invocation time; the script handles every failure path silently. Cart's SKILL body keeps running whether vibe-wrap is installed or not.

## Why no env var read

Investigated 2026-05-10 by `claude-code-guide`: Claude Code does not expose the session UUID as an environment variable to scripts directly. The two surfaces that do carry it:

1. **SKILL bodies** — `${CLAUDE_SESSION_ID}` template substitution resolves at SKILL invocation time. The SKILL caller passes the resolved value to `plant.py` as `--session-id`. This is the canonical path.
2. **Hook scripts** — `SessionStart`, `SessionEnd`, `PreToolUse`, etc. receive a JSON payload on stdin with `session_id` as a top-level field. vibe-wrap's `SessionEnd` hook uses this in Item 9.

Pulling the env var directly from `plant.py` would be unreliable. The CLI-arg + template-substitution pattern is the lockstep contract.

## Reference

- [`scripts/plant.py`](scripts/plant.py) — the actual breadcrumb writer.
- [`../wrap/scripts/atomic-append-jsonl.py`](../wrap/scripts/atomic-append-jsonl.py) — atomic single-line append protocol.
- [`../wrap/references/breadcrumb-contract.md`](../wrap/references/breadcrumb-contract.md) — public schema + sibling-author contract.
- [`../guide/SKILL.md`](../guide/SKILL.md) — shared behavior, voice, namespace isolation.
- [`../session-logger/SKILL.md`](../session-logger/SKILL.md) — distinct from `plant`; instrumentation for vibe-wrap's own commands.
- [`../../docs/spec.md`](../../../../docs/spec.md) § Data Model > Breadcrumb file — schema source of truth.
