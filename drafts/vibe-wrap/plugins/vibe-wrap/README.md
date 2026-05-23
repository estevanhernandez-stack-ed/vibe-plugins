# vibe-wrap

**Sessions wrap themselves when the trail is already there.**

You just spent two hours across Cart, Doc, and a pile of commits. Now you're closing out, and the last ten minutes go to reconstructing "what got done today" from `git log`, memory, and scattered tool output — and it's worse when the work hasn't been committed in steady passes. vibe-wrap collapses that cost. It reads the breadcrumb trail your sibling vibe plugins already left during the session — their session-logs, friction logs, wins logs — plus git state and your decision log, then renders a clean handoff doc and gates commit + push interactively. It's the session-scoped wrap surface the marketplace was missing. Cart's `/reflect` is project-scoped; this is for the close of a single working session.

## What it does

- Reads the trail: breadcrumbs, sibling session-logs / friction / wins, git state, and your active decision-log backend.
- Renders a markdown wrap doc — what shipped, decisions logged, friction captured, what's still uncommitted, what's still unpushed, session bounds.
- Writes it to `docs/session-wraps/<timestamp>.md` (fallback `.vibe-wrap/wraps/`) and prints it inline.
- Surfaces commit / push / decision-log-write / dashboard-bridge gates — every one interactive, every one default no-action. The doc lands regardless of which gates you accept or skip. Bumpers, not walls.

## Install

vibe-wrap ships under the same solo-repo + tagged-ref + canary/stable model as the rest of the Vibe family.

**Canary (edge) — track `main` on the solo repo:**

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-wrap
/plugin install vibe-wrap@vibe-wrap
```

**Stable — via the marketplace (once the first stable tag is promoted):**

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install vibe-wrap@vibe-plugins
```

Requirements: Python 3.11+ on `PATH`, Git CLI on `PATH`. The 626Labs MCP is optional — one of four decision-log backends.

## Commands

| Command | What it does |
|---|---|
| `/vibe-wrap` | Render the session wrap doc and surface the commit / push / decision-log / bridge gates. Flags: `--inline-only` (skip the file write), `--bridge` (force the dashboard-bridge gate), `--session-window <hours>` (fallback window, default 4). |
| `/vibe-wrap:status` | Read-only mid-session check — breadcrumb count, source plugins detected, friction count, decisions in window. Runs in under 3 seconds. No mutations. |
| `/vibe-wrap:plant` | Internal — not user-invocable. Sibling plugins call this to drop a breadcrumb. See the composition contract below. |
| `/vibe-wrap:evolve-wrap` | vibe-wrap reflects on its own sessions and writes a review-only `proposed-changes.md`. Never auto-applies. |

## Decision-log backend setup

vibe-wrap pulls session decisions from a pluggable decision log — not a 626Labs-specific surface. Four backends in v0.1.0:

- **`file-md`** — a Markdown decision log. The recommended default for most users.
- **`file-jsonl`** — a JSONL decision log, one decision per line.
- **`626labs-mcp`** — the 626Labs Dashboard via MCP. Auto-selected when the MCP is reachable.
- **`disabled`** — no decision log. The decision-log gate is skipped entirely.

On your first `/vibe-wrap` with no config and no MCP detected, a one-time picker names the four options with the recommended default labeled:

```text
No decision log configured yet. Pick one:

  1. Markdown file   (recommended)  →  docs/decisions.md
  2. JSONL file                     →  docs/decisions.jsonl
  3. 626Labs Dashboard (MCP)
  4. Skip — disabled

Your choice persists to .vibe-wrap/config.json (this repo) or
~/.claude/plugins/data/vibe-wrap/config.json (global).
```

Smart default path: when the repo has a `docs/` directory, the file backend lands at `<repo>/docs/decisions.md`; otherwise `~/.claude/decisions.md` (user-scoped, cloud-sync friendly). Per-project config overrides global. Re-run the picker any time by editing the config file directly.

## Composition contract for sibling plugin authors

vibe-wrap reads what your plugin already writes. If your plugin emits Pattern #2 session-logs at `~/.claude/plugins/data/<plugin>/sessions/<date>.jsonl`, vibe-wrap surfaces that work automatically — zero coupling, no code change on your side.

For richer attribution, drop a breadcrumb at command-start (or any moment worth marking). The plant call is fire-and-forget and no-op-safe — if vibe-wrap isn't installed, the call fails silently and your plugin doesn't break.

Read the full contract — schema, call signature, failure-mode matrix, forward-compatibility rules — in [`skills/wrap/references/breadcrumb-contract.md`](skills/wrap/references/breadcrumb-contract.md). Read it once, code against it forever.

## Where vibe-wrap writes

vibe-wrap owns exactly one namespace: `~/.claude/plugins/data/vibe-wrap/` (breadcrumbs, its own session log, its own friction log, global config). It reads — never writes — sibling plugin state. The decision-log backend you choose writes to your own decision log, outside vibe-wrap's namespace by design.

## License

MIT.
