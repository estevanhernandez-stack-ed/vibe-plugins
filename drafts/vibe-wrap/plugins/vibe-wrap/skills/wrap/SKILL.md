---
name: wrap
description: This skill should be used when the user says `/vibe-wrap` (or `/vibe-wrap:wrap`) and wants a session-end handoff doc that reads the breadcrumb trail sibling vibe plugins already left, surfaces what shipped + what's uncommitted + what's unpushed, and gates commit + push interactively. Reads breadcrumbs, sibling session-logs / friction / wins, git state, and the active decision-log backend. Writes a markdown wrap doc to `docs/session-wraps/<ts>.md` (fallback `.vibe-wrap/wraps/<ts>.md`) and prints inline. Bumper-lanes invariant — every gate defaults to no-action and has a clear skip path. Flags: `--inline-only`, `--bridge`, `--session-window <hours>`.
---

# wrap — Read the trail, render the handoff, gate the rest

The user-facing session wrap. Read the breadcrumb trail the toolkit already left, surface what shipped + what's uncommitted + what's unpushed, render a durable handoff doc, then surface the commit / push / decision-log / bridge gates interactively. **The doc always lands. The gates are bumpers, never walls.**

Read [`../guide/SKILL.md`](../guide/SKILL.md) first for shared behavior — voice rules, the bumper-lanes invariant, persona adaptation, friction-trigger contract, namespace isolation, and ecosystem-aware composition.

## Before you start

- **Session logging.** Call `session-logger.start("wrap", <cwd>)` at command start, `session-logger.end(<entry>)` at command end. Per [`../session-logger/SKILL.md`](../session-logger/SKILL.md).
- **Persona + mode.** Read `shared.preferences.persona` and `shared.preferences.mode` from the unified profile per the guide. Persona shapes the prose voice; mode shapes pacing. The bumper-lanes invariant never changes.
- **Hard dependency: Python 3.11+.** If the runtime is older or absent, fail at command start with a clear next step. Git CLI is a soft dependency — if absent, the wrap still renders from breadcrumbs + sibling reads + decision-log, with a one-line note that git state is unavailable.
- **The division of labor.** `scripts/render-wrap.py` does the deterministic read + render + gate-state computation. It performs **no mutations**. This SKILL drives the interactive gestures (commit, push, decision-log append, bridge) based on the gate state the script reports. Keep that boundary — the script is reproducible; the gates are conversational.

## How the user invokes

```
/vibe-wrap
/vibe-wrap:wrap
```

Three flags:

| Flag | Default | Purpose |
|---|---|---|
| `--inline-only` | off | Skip the file write. The wrap still prints inline; gates still surface. |
| `--bridge` | off | Force the dashboard-bridge gate to register eligible regardless of threshold (still MCP-only). |
| `--session-window <hours>` | 4 | Fallback window when `${CLAUDE_SESSION_ID}` is unavailable or yields no breadcrumbs. |

## Step 1 — Decision-log first-run (interactive, once)

Before rendering, resolve the decision-log backend. The render script is read-only and will report `backend: "pending"` if no config exists — it never triggers the interactive picker. **This SKILL owns the first-run gesture.**

At command start, import the dispatcher and call `active_backend(cwd)`. If it returns `None` (first-run pending) AND the session is interactive:

- Run the first-run picker per [`references/decision-log-backends.md`](references/decision-log-backends.md) § First-run UX. Four options, recommended default labeled, `[skip — disabled]` as the fourth choice.
- Persist the user's choice to the chosen config path.
- Then proceed to render.

If `active_backend(cwd)` returns a real backend, skip the picker — config already exists.

## Step 2 — Render (deterministic)

Run the render core, passing the resolved session UUID:

```
python ${CLAUDE_PLUGIN_ROOT}/skills/wrap/scripts/render-wrap.py \
  --session-id ${CLAUDE_SESSION_ID} \
  [--session-window <hours>] \
  [--inline-only] \
  [--bridge]
```

The script:

1. Resolves the session window (earliest breadcrumb ts, else `now − window-hours`).
2. Runs the three reader scripts (`read-breadcrumbs.py`, `read-sibling-state.py`, `git-state.py`).
3. Reads decisions via the decision-log dispatcher (read-only).
4. Assembles the markdown wrap from [`assets/wrap-template.md`](assets/wrap-template.md).
5. Writes to `docs/session-wraps/<YYYY-MM-DD-HHmm>.md` (fallback `.vibe-wrap/wraps/<ts>.md` if no `docs/`), unless `--inline-only`.
6. Emits the rendered doc, then a fenced JSON block tagged ` ```VIBE-WRAP-GATE-STATE ` describing which gates are eligible.

**Print the rendered wrap doc inline to the user.** Then parse the gate-state JSON block — do not show that block to the user; it's the SKILL's control channel.

The wrap doc has six sections: What shipped, Decisions logged, Friction signals captured, Still uncommitted, Still unpushed, Session bounds. Each renders an empty-state line when there's nothing to report — never a silent gap.

## Step 3 — Gates (interactive, default no-action)

Read [`references/gate-design.md`](references/gate-design.md) for the full per-gate contract. Surface each gate only when the gate-state block marks it `eligible: true`. **Every gate defaults to no-action. Pressing enter or typing `n` skips it.**

### Gate 1 — Commit

When `gates.commit.eligible` is true:

1. List the uncommitted files (already in the wrap doc's "Still uncommitted" section).
2. If `gates.commit.suppressed_reason` is set (detached HEAD / mid-rebase), do NOT offer the commit gate — surface the reason as state to resolve manually and skip to the next eligible gate.
3. Ask `commit these? [y/N]`. Default `N`.
4. On `y`: draft a commit message from the wrap summary. Ask `accept message? [y/N/edit]`. On `y` stage the listed files and commit; on `edit` open `$EDITOR`; on `N` skip.
5. **Secret-pattern path:** for each entry in `gates.commit.secret_matches`, fire an additional `commit despite secret-pattern match? [y/N]` per [`references/secret-patterns.md`](references/secret-patterns.md). Default `N` excludes the matched file. Record any override in the wrap doc's notes.

Never `git add -A`. Never `--no-verify`. Never amend. Never empty-commit.

### Gate 2 — Push

When `gates.push.eligible` is true (local ahead of a tracked remote, no unusual git state):

1. Name the remote from `gates.push.remote` and the ahead count from `gates.push.ahead`.
2. Ask `push to <remote>? [y/N]`. Default `N`.
3. Multi-remote: after the answer, offer one follow-up `push to a different remote? [y/N]` per `gate-design.md` § Multi-remote path. List remotes excluding the upstream just handled; let the user pick.

Force-push is never offered. Diverged branches surface as state to resolve manually.

### Gate 3 — Decision-log write

When `gates.decision_log.eligible` is true (active backend is not `disabled` / `pending` / `unknown`):

1. Ask the backend-specific prompt per `gate-design.md` § Gate 3 (e.g., `append a session-end decision to your Markdown decision log? [y/N]`).
2. On `y`: build the decision dict — title from the wrap summary, body excerpt, `link` = wrap doc path, `project_tag` = bound 626Labs project ID (MCP) or repo name (file backends) or `null` (unbound). Call the dispatcher's `append(decision, cwd)`.
3. On append failure (`{"ok": False}`), surface the error string and continue. The wrap doc still stands.

### Gate 4 — Dashboard bridge

When `gates.bridge.eligible` is true (backend is `626labs-mcp` AND threshold met):

1. Name the signals from `gates.bridge.threshold_signals` (decisions logged, commits in window, bridge flag).
2. Ask `bridge strategic context to the dashboard's Architect AI? [y/N]`. Default `N`.
3. On `y`: call `mcp__626Labs__bridge_context_to_architect` with the wrap summary as context. If MCP is unreachable at gate time, surface a one-line note and skip silently.

Bridge is opt-in per gesture even when the threshold fires. Never autonomous.

## Step 4 — Close

End with a one-line handoff:

- If the doc was written: `Wrap saved to <path>.` plus a note on any gates the user declined (still uncommitted / still unpushed).
- If `--inline-only`: `Wrap printed inline (no file written).`
- Call `session-logger.end()` with `complements_invoked` listing each sibling whose state the wrap pulled from, plus the gates the user accepted.

## Edge cases (all six PRD cases handled by the script + this flow)

- **Empty session** — zero breadcrumbs, zero git activity. The doc says so in each section's empty-state line and exits without error.
- **No git remote** — `gates.push.eligible` is false; the "Still unpushed" section notes local-only state. No push prompt.
- **Detached HEAD** — `gate-state.unusual_git_state.detached_head` is true; commit/push gates are suppressed with a reason. The doc still renders.
- **Mid-rebase** — same suppression path via `mid_rebase`.
- **Multiple remotes** — the push gate names the upstream first, then offers the different-remote follow-up.
- **Secret-pattern match** — surfaced in "Still uncommitted" with a `WARNING` marker; the commit gate fires the extra confirmation per match.

## Performance budget (spec Open Issue #5)

Target <10s for the non-interactive portion: trail reader ≤4s, decision-log read ≤2s, render ≤1s. Gates are interactive and not budgeted. If a subsystem ships over budget against a real session, flag it for `/evolve-wrap`.

## Friction triggers

Per [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) § /vibe-wrap. Fire `friction-logger.log()` at the documented trigger points — gate declined after the doc surfaced a high-signal commit, repeated re-runs in one session, first-run picker abandoned, etc. Confidence is fixed per trigger; never override at log time.

## Reference

- [`scripts/render-wrap.py`](scripts/render-wrap.py) — the render core (read + render + gate state).
- [`assets/wrap-template.md`](assets/wrap-template.md) — the markdown template.
- [`scripts/read-breadcrumbs.py`](scripts/read-breadcrumbs.py) · [`scripts/read-sibling-state.py`](scripts/read-sibling-state.py) · [`scripts/git-state.py`](scripts/git-state.py) — trail readers.
- [`scripts/decision-log/__init__.py`](scripts/decision-log/__init__.py) — decision-log dispatcher.
- [`references/gate-design.md`](references/gate-design.md) — bumper-lanes invariant per gate.
- [`references/secret-patterns.md`](references/secret-patterns.md) — the patterns that trigger the secrets warning.
- [`references/decision-log-backends.md`](references/decision-log-backends.md) — backend contract, config precedence, first-run UX.
- [`references/breadcrumb-contract.md`](references/breadcrumb-contract.md) — schema + plant contract for sibling authors.
- [`../guide/SKILL.md`](../guide/SKILL.md) — shared behavior, voice, persona adaptation.
