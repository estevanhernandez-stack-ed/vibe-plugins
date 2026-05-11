---
name: status
description: This skill should be used when the user says `/vibe-wrap:status` and wants mid-session visibility into what trail vibe-wrap has captured so far — before they invoke the full wrap. Read-only. Runs in <3 seconds. Outputs ≤20 lines: breadcrumb count, source plugins detected, friction signal count, decision count from active backend, empty-state guidance if no trail. No mutations, no git invocation, no gates.
---

# status — The smallest verifiable read surface

Read-only mid-session visibility. Counts breadcrumbs, names the sibling plugins seen, surfaces the active decision-log backend's reach. **No mutations. No git invocation. No gates.** That's `:wrap`'s job.

Read [`../guide/SKILL.md`](../guide/SKILL.md) first for shared behavior — voice, persona adaptation, namespace isolation, friction-trigger contract.

## Before you start

- **Read-only contract.** Three reader scripts + one decision-log read. Nothing writes anywhere. If a future change to this SKILL would mutate state, that change belongs in `:wrap`, not here.
- **<3 second budget.** The whole gesture must feel instant. The decision-log backend's `is_reachable()` check is the only call with potential latency; the dispatcher already short-circuits unreachable backends.
- **≤20-line output.** Hard ceiling. If the data forces more, truncate the source-plugin list, not the structural sections.
- **No git.** `:status` answers "what trail does vibe-wrap see?", not "what does git see?". The latter is `:wrap`'s territory and shows up in the wrap doc.
- **Friction triggers — minimal.** Per [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) § /vibe-wrap:status, this command has no command-specific triggers. Only the universal `repeat_question` and `rephrase_requested` triggers apply. If `:status` ever grows interactive behavior, revisit that section.

## How the user invokes

Slash command at any point during a session:

```
/vibe-wrap:status
```

No flags. No arguments.

## What the script does

`scripts/status.py` runs three reads in sequence:

1. **Breadcrumbs** — calls `../../wrap/scripts/read-breadcrumbs.py --session-id ${CLAUDE_SESSION_ID} --include-orphans`. Counts entries; tallies the distinct `source` values to name detected plugins.
2. **Sibling state** — calls `../../wrap/scripts/read-sibling-state.py --session-start <ts>`. The `<ts>` is the earliest breadcrumb timestamp when breadcrumbs exist; otherwise `now − 4 hours` (best-effort window).
3. **Decision log** — imports the dispatcher at `../../wrap/scripts/decision-log/__init__.py` and calls `read({"start": <ts>, "end": <now-iso>})`. Reports the active backend name and the count returned. Import failure → counts = 0 + one-line stderr note (no crash).

The script then renders a compact summary to stdout. Output never exceeds 20 lines.

## Inputs (CLI flags)

The SKILL caller substitutes `${CLAUDE_SESSION_ID}` and passes the resolved value. The script also accepts an explicit `--session-start` for the best-effort window override.

| Flag | Required | Default | Purpose |
|---|---|---|---|
| `--session-id` | no | empty string | Claude Code session UUID. Empty → "best-effort" mode (orphan breadcrumbs read; sibling-state window = last 4 hours). |
| `--session-start` | no | computed | ISO 8601 timestamp. If omitted: derived from the earliest breadcrumb ts when breadcrumbs exist, else `now − 4 hours`. |

**Canonical SKILL invocation:**

```
python ${CLAUDE_PLUGIN_ROOT}/skills/status/scripts/status.py \
  --session-id ${CLAUDE_SESSION_ID}
```

## Outputs

A compact stdout summary. Per the spec output format:

```
vibe-wrap status — session-id 550e8400... (or "best-effort, no session-id")

Breadcrumbs:    14 entries from 3 source plugins
  Sources: vibe-cartographer (8), vibe-test (4), vibe-doc (2)

Sibling state (since 2026-05-11T13:50:00-05:00):
  vibe-cartographer  3 sessions  1 friction
  vibe-iterate       1 sessions  0 friction
  vibe-test          2 sessions  0 friction  1 wins

Decision log (active backend: file-md):
  2 decisions in session window
```

**Empty state** (no breadcrumbs, no sibling state, no decisions):

```
vibe-wrap status — session-id 550e8400... (or "best-effort")

No breadcrumbs captured this session yet — check that sibling plugins
have run any commands.
No sibling state in window. No decisions logged in window.
```

stderr is reserved for genuine errors (failed import of the dispatcher, unreadable files). Normal "no data" is not an error.

## Behavior

- **Session-id resolution.** When `--session-id` is supplied and non-empty, it flows into `read-breadcrumbs.py` directly. When empty (substitution missing or shell wonkiness), the script enters **best-effort mode**: passes the empty string to `read-breadcrumbs.py` (which reads `_orphan.jsonl` thanks to `--include-orphans`), and uses `now − 4 hours` as the sibling-state window.
- **Window derivation.** When breadcrumbs exist, the earliest `ts` becomes the sibling-state window start — that's the truest "session start." Otherwise we fall back to the heuristic. This keeps the `:status` output internally consistent even when env-var resolution is partial.
- **Decision-log import.** The dispatcher lives under a hyphenated directory (`decision-log/`), which Python can't import via a normal `import` statement. The script uses `importlib.util.spec_from_file_location` to load the package's `__init__.py`. Import failure (file missing, syntax error, dependency import inside the dispatcher chain) is caught — the script emits one stderr line and reports `decisions = 0`, backend = "unknown". `:status` never crashes because the decision log is unconfigured.
- **Source plugin names** are taken from each breadcrumb entry's `source` field. Counts are line-counts per source. Listed in descending count order; ties break alphabetically. The script truncates the list at 5 sources to honor the 20-line output ceiling, with a "... and N more" suffix if needed.
- **Active backend** is queried via `dispatcher.active_backend()`. When config isn't yet persisted (first-run pending), the script reports `pending` rather than triggering the picker — `:status` is read-only and must not change config state.

## Edge cases

- **No breadcrumbs file at all** — `read-breadcrumbs.py` returns `[]`. Status shows "0 entries from 0 source plugins" or the empty-state block (when sibling and decision counts are also zero).
- **Orphan breadcrumbs only** — `--include-orphans` brings them in. They appear in the count and contribute to the source-plugin tally. The session-id line still says "best-effort" if `--session-id` was empty.
- **Decision-log dispatcher unimportable** — stderr note, counts = 0, backend = unknown. Output remains within the 20-line ceiling.
- **Sibling data dir missing entirely** (fresh install with no plugins yet) — `read-sibling-state.py` returns `{}`. Status renders "No sibling state in window." in place of the per-sibling table.
- **Many sibling plugins active** — each shipped sibling that has session/friction/wins data in the window gets one line. With all 8 marketplace siblings active, that's 8 lines under the sibling section, well within the 20-line ceiling.
- **Pending first-run config** — `active_backend()` returns `None` → backend rendered as "pending"; decision count = 0 with no backend invocation (the dispatcher's `_resolve_or_prompt` is bypassed by the `:status` script for read-only safety).

## Examples

**Mid-session, after Cart and Test have run a few commands, file-md decision log:**

```
$ /vibe-wrap:status
vibe-wrap status — session-id 550e8400...

Breadcrumbs:    9 entries from 2 source plugins
  Sources: vibe-cartographer (6), vibe-test (3)

Sibling state (since 2026-05-11T13:50:00-05:00):
  vibe-cartographer  2 sessions  0 friction
  vibe-test          1 sessions  0 friction  1 wins

Decision log (active backend: file-md):
  1 decisions in session window
```

**Fresh session, nothing planted yet:**

```
$ /vibe-wrap:status
vibe-wrap status — session-id 550e8400...

No breadcrumbs captured this session yet — check that sibling plugins
have run any commands.
No sibling state in window. No decisions logged in window.
```

**Best-effort fallback (env-var resolution failed):**

```
$ /vibe-wrap:status
vibe-wrap status — best-effort, no session-id

Breadcrumbs:    2 entries from 1 source plugins
  Sources: vibe-cartographer (2)

Sibling state (since 2026-05-11T11:42:18-05:00):
  vibe-cartographer  1 sessions  0 friction

Decision log (active backend: file-md):
  0 decisions in session window
```

## Reference

- [`scripts/status.py`](scripts/status.py) — the implementation.
- [`../wrap/scripts/read-breadcrumbs.py`](../wrap/scripts/read-breadcrumbs.py) — breadcrumb reader.
- [`../wrap/scripts/read-sibling-state.py`](../wrap/scripts/read-sibling-state.py) — sibling-state scanner.
- [`../wrap/scripts/decision-log/__init__.py`](../wrap/scripts/decision-log/__init__.py) — decision-log dispatcher.
- [`../guide/SKILL.md`](../guide/SKILL.md) — shared behavior, voice, persona adaptation.
- [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) § /vibe-wrap:status — friction-trigger contract (minimal — universal triggers only).
- [`../../docs/spec.md`](../../../../docs/spec.md) § Component Architecture > vibe-wrap:status — spec source of truth.
