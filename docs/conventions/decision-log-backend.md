# Family convention: pluggable decision-log backend

**Status:** STANDARD v1 — extracted 2026-06-09 from vibe-wrap's reference implementation (v0.2.1 genericizing + v0.3.0 contract hardening).
**Applies to:** any plugin that reads or writes decision-log entries. Current adopters: vibe-wrap (reference), vibe-taker (applied 2026-06-09), vibe-cartographer / vibe-keystone / vibe-insights (language-level).
**The point:** no plugin in this family hard-requires the 626Labs dashboard. The MCP is one backend among four, auto-detected when present, never assumed.

## The backend contract

Every backend implements three operations with these guarantees:

```
is_reachable() -> bool
  # <500ms liveness check. File backends: path (or parent) writable.
  # MCP: cheap probe, 500ms timeout, False on miss. Disabled: always True.

read(window: {start: iso-ts, end: iso-ts}) -> list[decision]
  # Never raises. Unreachable or empty -> []. Filter in-process.

append(decision) -> {ok: bool, backend: str, ref: str|None, error: str|None}
  # Never raises. Failures return ok=False + error string.
  # Disabled returns ok=True (deliberate no-op).
```

**Canonical decision shape** (portable across backends):

```json
{
  "timestamp": "<ISO 8601 with TZ offset>",   // required
  "title": "<one-liner>",                      // required
  "body": "<markdown ok>",                     // required
  "context_tag": "<plugin-defined>",           // optional — see semantics below
  "link": "<path or URL>"                      // optional
}
```

`context_tag` (wrap v0.x called it `project_tag`): a generic context label each backend interprets — file backends render it as a footer label; the 626Labs MCP backend maps it to the bound project ID. Plugins MUST NOT assume any backend gives it richer meaning than "a string that rides along."

## The four backends

| Backend | What it is | Notes |
|---|---|---|
| `file-md` | Markdown file, date-scoped appends, tolerant parser | Default recommendation — readable, greppable |
| `file-jsonl` | JSONL, atomic line appends | Machine-friendly; use the family's atomic-append helper |
| `626labs-mcp` | `mcp__626labs-cloud__manage_decisions` | Auto-detected; only callable in SKILL context |
| `disabled` | No-op | First-class choice, not an error state |

## Config shape + resolution ladder

Config file: `<plugin-data-dir>/config.json` (global) or `<repo>/.<plugin-name>/config.json` (per-project). See the [data-home convention](data-home.md) for what `<plugin-data-dir>` resolves to.

```json
{
  "schema_version": 1,
  "decision_log": {
    "backend": "file-md | file-jsonl | 626labs-mcp | disabled",
    "file_path": "<required for file-* backends>",
    "auto_detect_mcp": true
  }
}
```

Resolution, first match wins:

1. Per-project config (walk up from cwd).
2. Global config.
3. Auto-detect: MCP reachable → use it silently (unless `auto_detect_mcp: false`).
4. First-run picker (interactive only); non-interactive contexts fall back to `disabled` with a stderr note.

Smart default for file paths: walk up from cwd for a `docs/` dir (stop at the git root) → `<repo>/docs/decisions.md`; fallback `~/.claude/decisions.md`.

## MCP detection — the env-marker pattern

MCP tools are only callable inside SKILL execution, so scripts can't probe them directly. The pattern:

1. The SKILL sets `<PLUGIN>_MCP_AVAILABLE=1` before invoking backend scripts, after confirming the tool exists in its session.
2. `mcp.is_reachable()` checks the marker; absent → False (the correct answer for CLI context).
3. **Fail fast on misconfiguration (MUST):** if config names the MCP backend but the marker is absent at append time, return `ok=False, error="MCP backend requires SKILL context"` — never silently degrade to empty reads.

## First-run UX

Four-option picker (markdown / jsonl / MCP-with-availability-note / disabled), then a global-or-project scope question, then a confirmation naming the config path and the reconfigure command. Fires exactly once (config absence is the trigger); `--reconfigure` re-prompts. Lock your plugin's copy to this shape — the wording can be yours, the structure shouldn't be.

## Scope rulings (v1)

- **MCP config is global-scoped.** Per-project MCP bindings are out of scope for v1; per-project configs exist for file paths. Revisit if a real multi-dashboard case appears.
- **Bridge tools are separate.** `bridge_context_to_architect` and `manage_projects` are NOT decision-log surface; plugins using them follow the same optional/auto-detect framing but outside this contract.
- **The shared implementation lives in vibe-wrap** (`skills/wrap/scripts/decision-log/`) until `@626labs/plugin-core` Phase 2+ absorbs it. New adopters copy the modules and parameterize the plugin name; don't fork the contract.

## Adoption checklist

- [ ] No SKILL text implies the 626Labs MCP is required; framing is "auto-detected when present, file backends are the universal fallback."
- [ ] Backend selection honors the resolution ladder; `disabled` honored everywhere (no orphaned decision-log prose paths).
- [ ] MCP misconfiguration fails loud (env-marker rule).
- [ ] Decision shape matches the canonical schema; `context_tag` used per the semantics above.
- [ ] First-run picker present (or the plugin documents why it defaults silently).
