# Decision-log backends

> **Audience:** vibe-wrap maintainers + builders configuring their decision log.
> **Status:** four backends locked for v0.1.0 — `file-md`, `file-jsonl`, `626labs-mcp`, `disabled`.

The decision log is a pluggable backend. vibe-wrap is a marketplace plugin shipped to any user — treating 626Labs MCP as the only decision-log surface would silently break the value prop for every non-626Labs user. This doc covers the contract every backend implements, the four shipped backends, the config precedence, the first-run UX, and the canonical decision shape.

## The canonical decision shape

Every backend reads and writes this shape. The render layer in vibe-wrap doesn't care which backend produced it.

```python
{
    "timestamp": "2026-05-10T15:42:00-05:00",   # ISO 8601 with TZ offset
    "title": "Locked breadcrumb storage at session-uuid.jsonl",
    "body": "Decided breadcrumb files partition by Claude Code session UUID...",
    "project_tag": "vibe-wrap",                  # optional; backend-specific use
    "link": "docs/session-wraps/2026-05-10-1542.md",  # optional
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `timestamp` | string (ISO 8601 + TZ) | yes | Match the shape sibling session-loggers use. |
| `title` | string | yes | One-line headline. Renders as a level-3 heading in `file-md`. |
| `body` | string | yes | Multi-paragraph allowed. Markdown OK. |
| `project_tag` | string | no | Backend-specific use. MCP backend maps this to the bound 626Labs project ID; file backends append it as a footer tag. |
| `link` | string | no | Path or URL to the originating wrap doc. File backends render as a footer link; MCP backend includes in the decision body. |

## The backend contract

Every backend implements three methods.

### `read(session_window) -> list[Decision]`

Return all decisions logged within the time window. `session_window` is a tuple of (start_ts, end_ts) — both ISO 8601 with TZ offset.

- **Empty window** → return `[]`.
- **Backend unreachable** → return `[]` and let `is_reachable()` flag the failure separately. Never raise.
- **Backend reads more than expected** (file has 10,000 entries, window covers 5) → filter in-process, return only matching entries.

### `append(decision) -> AppendResult`

Append one decision. Returns a small dict with backend-specific reference info.

```python
{
    "ok": True | False,
    "backend": "file-md" | "file-jsonl" | "626labs-mcp" | "disabled",
    "ref": "/path/to/decisions.md:line-45" | "<mcp-decision-id>" | None,
    "error": None | "<short error string>",
}
```

- **Append failure** → return `{"ok": False, "error": "..."}` rather than raising. The wrap flow surfaces the failure in chat without aborting.
- **Disabled backend** → returns `{"ok": True, "backend": "disabled", "ref": None}` — append is a no-op.

### `is_reachable() -> bool`

Quick (<500ms) liveness check. Used by the wrap flow to decide whether to surface a fallback note.

| Backend | `is_reachable` semantics |
|---|---|
| `file-md` | File at the resolved path is readable + writable (or the parent dir is writable for first append). |
| `file-jsonl` | Same as `file-md`. |
| `626labs-mcp` | Cheap MCP call — pings `mcp__626Labs__manage_decisions` with a no-op or trivial query. Times out at 500ms. |
| `disabled` | Always returns `True` (nothing to fail). |

## The four backends

### `file-md` — Markdown file

**Default for any user without 626Labs MCP.**

Reads and writes a Markdown file. Smart default path resolves at first run:

- If the bound repo has a `docs/` directory → `<repo>/docs/decisions.md`.
- Else → `~/.claude/decisions.md` (user-scoped, lands next to cloud-syncable personal files — Dropbox, iCloud, OneDrive territory).

**Append strategy** (locked answer to spec Open Issue #8):

1. If today's date heading (`## YYYY-MM-DD`) exists in the file → append a new `### HH:mm — <title>` section under it.
2. Else → append a fresh `## YYYY-MM-DD` heading at end-of-file followed by the new `### HH:mm — <title>` section.
3. If the user's existing file uses no heading structure (flat append-style) → append in flat style at end-of-file with a separator.

**Read strategy:**

1. Parse any level-3 heading under any level-2 date heading (the canonical shape).
2. Tolerate flat-no-heading files (treat each `### ...` block at any depth as a decision).
3. Tolerate reverse-chrono ordering — sort by parsed `timestamp` after read.
4. Skip any heading that doesn't have a parseable date/time prefix; surface a one-line warning at wrap time so the user knows the file has structural drift.

**Render shape per decision:**

```markdown
### 15:42 — Locked breadcrumb storage at session-uuid.jsonl

Decided breadcrumb files partition by Claude Code session UUID...

— [Wrap doc](docs/session-wraps/2026-05-10-1542.md) · `vibe-wrap`
```

### `file-jsonl` — JSONL file

Same path resolution as `file-md`. Each decision is one JSON object per line, exactly the canonical decision shape with no extra wrapping. Append uses the shared `atomic-append-jsonl.py` script (tmp-file + fsync + rename, atomic per-line). Read = parse line-by-line, filter by `timestamp` window.

JSONL is the right choice when the user wants a machine-readable log they can pipe through `jq` or feed into other tooling. Markdown is the right choice when the user wants a log they read directly.

### `626labs-mcp` — 626Labs Dashboard

Wraps the MCP tools.

| Method | MCP call |
|---|---|
| `read(window)` | `mcp__626Labs__manage_decisions` with `action: "search"` + `since: window.start` + `until: window.end`. Maps the response into the canonical decision shape. |
| `append(decision)` | `mcp__626Labs__manage_decisions` with `action: "log"` + `title` + `body` + `projectId: <bound>` + `link` in body. Returns the MCP-issued decision ID as `ref`. |
| `is_reachable()` | Cheap MCP probe — read a known-empty query with a 500ms timeout. |

The MCP backend respects the project-binding convention from `~/.claude/CLAUDE.md`. If the current repo is bound to a 626Labs project, the decision tags with that project's ID. If unbound, `projectId: null` and the description includes the repo name as a fallback tag (matching the existing decision-logging discipline).

**The dashboard bridge stays MCP-only.** `bridge_context_to_architect` is a 626Labs-specific composition — the strategic-layer counterpart to the operating-layer decision log. Other backends may add their own bridge contracts in future versions (e.g., a Linear backend could bridge to a Linear project; a Notion backend could bridge to a Notion database). For v0.1.0, the bridge gate appears only when the active backend is `626labs-mcp` and the threshold (see `spec.md > Decision 3`) fires.

### `disabled` — no-op

Read returns `[]`. Append is a no-op (returns `{"ok": True, "backend": "disabled", "ref": None}`). `is_reachable` returns `True` because there's nothing to fail.

The wrap flow detects `disabled` backend and skips the decision-log read section ("decision logging is disabled"), the decision-log append gate (no prompt at all), and the dashboard bridge gate (since bridge requires `626labs-mcp`). Clean opt-out for users who don't want a decision log surface.

## Config precedence

Active backend is resolved in this order:

1. **Per-project config** — `<repo>/.vibe-wrap/config.json`. Highest priority.
2. **Global config** — `~/.claude/plugins/data/vibe-wrap/config.json`.
3. **Auto-detect** — if `mcp__626Labs__manage_decisions` is reachable → `626labs-mcp`. No prompt.
4. **First-run prompt** — when none of the above resolve.

### Config schema

```json
{
  "schema_version": 1,
  "decision_log": {
    "backend": "file-md",
    "file_path": "~/.claude/decisions.md",
    "auto_detect_mcp": true
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | integer | yes | Always `1` for v0.1.0. |
| `decision_log.backend` | string | yes | One of `"file-md"`, `"file-jsonl"`, `"626labs-mcp"`, `"disabled"`. |
| `decision_log.file_path` | string | conditional | Required for `file-md` and `file-jsonl`. Ignored otherwise. Tilde expansion supported. |
| `decision_log.auto_detect_mcp` | boolean | no | Default `true`. When `false`, never auto-promote to `626labs-mcp` even if reachable. |

### Edge cases

- **Both global and per-project config exist** → per-project wins. Document this clearly in any wrap-time warning if the global is more permissive.
- **Per-project file_path doesn't resolve** (file deleted, dir gone) → fall back to global. If global also fails → trigger first-run prompt with a one-line note explaining the fallback.
- **Per-project config has invalid JSON** → log a warning, fall back to global.

## First-run UX

When config doesn't resolve and MCP isn't reachable, vibe-wrap shows the four-option picker exactly once. After the user picks, the choice persists to the chosen scope (global by default; per-project if the user picks a per-project file path).

### Picker copy (locked v0.1.0)

```
vibe-wrap doesn't see a decision log yet. pick one — you can change it
later by re-running with --reconfigure or editing the config file.

  1. Markdown file at <smart-default>/decisions.md   ← recommended
     human-readable, lives in your repo (or ~/.claude/), easy to share

  2. JSONL file at <smart-default>/decisions.jsonl
     machine-readable, pipeable through jq, append-only

  3. 626Labs Dashboard (MCP)
     unavailable in this environment — install MCP first

  4. disabled
     skip decision logging entirely; wrap doc just won't include this section

choose [1-4]:
```

When MCP is reachable, option 3 reads `available — pings to mcp__626Labs__manage_decisions succeed` and is shown enabled. Auto-detect already picks it in that case, so the picker only fires when the user has explicitly disabled auto-detect or MCP just dropped.

### Persistence confirmation

After the user picks:

```
saved <backend-name> as your default decision log.
config: <path-to-config.json>

run /vibe-wrap --reconfigure anytime to change.
```

Two-line confirmation. No emoji. Clear next move.

## Why pluggable

- vibe-wrap is a marketplace plugin shipped to any user. Treating 626Labs MCP as the only decision-log surface silently breaks the value prop for every non-626Labs user — which is the whole marketplace audience.
- A useful default (Markdown file at the smart-default path) inspires users to keep a decision log even if they didn't have one before. The wrap section names what's there; the user starts to see the value of having something there.
- The contract is small enough that future backends (Linear, Notion, a user's own scripted log) can be added in `/evolve-wrap` cycles without breaking v0.1.0 backends.

## See also

- **Decision rationale** — `spec.md > Decision 6` is the source of truth for why pluggable, what tradeoffs were accepted, what's deferred.
- **Subsystem layout** — `spec.md > Decision-log subsystem` lists the seven Python modules under `skills/wrap/scripts/decision-log/`.
- **Bridge gate threshold** — `spec.md > Decision 3` and `gate-design.md` cover when the dashboard bridge gate appears (MCP backend + threshold met).
