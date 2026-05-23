# vibe-wrap

> **Anchor:** Sessions wrap themselves when the trail is already there.

## Idea

End-of-session wrap-up for Claude Code sessions that **reads the breadcrumb
trail your toolkit already left, instead of cold-reconstructing from `git log`
and memory**. Sibling vibe plugins (Cart, Doc, Iterate, Test, Sec, Thesis
Engine, Vibe Thesis, Taker — anyone who opts in) drop small markers when their
commands fire; vibe-wrap reads the trail at session end and produces a clean
"what got done today" handoff doc, then gates commit and push.

It's the wrap surface the marketplace has been missing — Cart's `/reflect` is
project-scoped, not session-scoped. vibe-wrap is session-scoped, runs in any
repo, and composes with everything the rest of the toolkit emits.

## Who It's For

**Estevan first** — but more usefully, anyone running 626Labs-style
multi-plugin Cart cycles, autonomous chain-advance builds, or long
mixed-context sessions where end-of-session reconstruction is expensive.

The user has a specific shape:

- Runs Claude Code (CLI / IDE / Cowork) as a primary work surface.
- Has at least one vibe plugin installed (often three to seven).
- Ships uncommitted at non-trivial frequency (real working pattern, not a bug).
- Loses time at end-of-day reconstructing "what did we actually do today,"
  especially across multi-repo sessions.
- Wants a wrap that's useful — readable, shareable, status-update-pasteable —
  not another agent prompt.

## Inspiration & References

- **Handoff brief:** `drafts/vibe-wrap/_handoff-prompt.md` — the upstream spec
  and the brain dump for this cycle.
- **Self-Evolving Plugin Framework:**
  [`vibe-cartographer/docs/self-evolving-plugins-framework.md`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md)
  — Pattern #1 (Self-Evolution), Pattern #2 (Two-Phase Session Log), Pattern #6
  (Friction Log), Pattern #13 (Ecosystem-Aware Composition).
- **Cart `session-logger` SKILL** — Pattern #2 reference. The breadcrumb pattern
  is the same shape: append-only JSONL keyed by sessionUUID, written to
  `~/.claude/plugins/data/<plugin>/`. Vibe-wrap reads what siblings write.
- **Cart `friction-logger` SKILL** — Pattern #6 reference. Same JSONL append
  discipline. Vibe-wrap can also surface friction entries in the wrap.
- **`vibe-iterate:radar`** — cached-state read pattern. Closest functional
  cousin: read prior state, render digest, no mutation.
- **`vibe-cartographer:reflect`** — closest sibling skill (a retro), but
  project-scoped, not session-scoped. Vibe-wrap is the session-scoped surface.
- **`vibe-taker`** — most recent marketplace plugin shipped (v0.1.1 currently
  pinned). Reference shape for solo-repo + canary-and-stable channel model.
- **626Labs Dashboard** — the strategic-layer counterpart. Decisions log to
  `mcp__626Labs__manage_decisions`; sessions can bridge to the dashboard's
  Architect AI via `bridge_context_to_architect` when stakes are strategic.
  vibe-wrap composes with this when MCP is available.

## Goals

What `vibe-wrap` should accomplish, in priority order:

1. **Cut end-of-session reconstruction cost from "tens of minutes of agent
   work" to "one command + a read."** The cost reduction has to be real.
2. **Make session wraps a durable artifact** the builder can read, share, or
   paste into a status update — useful enough that wrapping becomes a habit,
   not a chore.
3. **Be the first marketplace plugin built under the new `evolve-<short>`
   convention** — set the pattern from day one.
4. **Compose cleanly with the rest of the vibe ecosystem** — read what siblings
   write, don't duplicate their work, fall back gracefully when they're absent.
5. **Honor the bumper-lanes contract.** The wrap is bumpers, not gutter — never
   block the user, never auto-fire unsolicited, always allow override.
6. **Ship a useful self-evolution loop (`evolve-wrap`) from v0.1.0** so the
   plugin gets sharper with usage.

## What "Done" Looks Like

**The shipped v1 is a plugin that:**

- Installs from canary (`estevanhernandez-stack-ed/vibe-wrap`) and stable
  (`vibe-plugins` marketplace ref-bump) following the same shape as the six
  existing marketplace plugins.
- Exposes a primary command — `/vibe-wrap` (or `/vibe-wrap:wrap`) — that the
  user runs at session end.
- Produces a wrap doc that names: files changed, commits made (with subjects),
  decisions logged via MCP if available, friction signals captured, anything
  still uncommitted, anything still unpushed, and the session's start/end
  timestamps.
- Reads breadcrumbs from sibling plugins via the chosen plant mechanism.
- Gates commit and push interactively — surfaces uncommitted work, asks
  whether to commit, asks whether to push (gated on commits ahead of remote).
- Falls back to local-only mode (git log + breadcrumbs + filesystem) when MCP
  isn't available. No errors; the wrap just gets thinner.
- Ships a `vibe-wrap:status` skill for in-session "what's been picked up so
  far" visibility.
- Ships `vibe-wrap:evolve-wrap` from day one, named correctly under the new
  convention.

**A successful v1 user gesture looks like this:**

> User finishes a long Cart cycle. Types `/vibe-wrap`. Wrap doc materializes
> at `docs/session-wraps/2026-05-10.md` (or wherever /spec settles). Lists 14
> commits, 2 decisions logged to dashboard, 3 friction signals captured, 1
> uncommitted file (config.json — flagged for review). User reads it, decides
> to commit + push, types `y`/`y`. vibe-wrap stages the commit, writes the
> message from the wrap summary, pushes. Session closed. Total wall-clock: ~30
> seconds. Cost replaced: ~10 minutes of agent reconstruction.

## What's Explicitly Cut

- **Cross-session wrap doc consolidation.** v1 wraps one session at a time;
  rolling up weekly/monthly digests is /evolve-wrap-cycle work, not v1.
- **Automatic invocation of `/vibe-wrap` on session-end signals.** v1 is
  user-invoked. A hook may surface a *one-line nudge* if session-end is
  detected ("session looks done — want me to wrap?"), but no auto-fire.
  Reason: bumpers, not gutter.
- **Multi-repo wraps in a single invocation.** v1 wraps the cwd repo only.
  Cross-repo session reconstruction is a /evolve-wrap topic.
- **A built-in scheduler.** Use `claude-code:schedule` if you want recurring
  wraps. vibe-wrap composes with it; it doesn't replace it.
- **Heavy formatting / publishing flows.** The wrap is markdown. No PDF, no
  HTML, no portal upload. If the user wants to ship a wrap to a blog or
  dashboard, that's a downstream tool's job.
- **Detection / reconstruction for non-vibe tools.** v1 reads breadcrumbs from
  vibe plugins (and the optional auto-detect hook from anything noisy enough
  to attribute). It does *not* try to introspect arbitrary third-party CLI
  tools or external services beyond what's already in the trail.
- **A separate wrap "agent."** No subagent dispatch in v1. The wrap SKILL
  reads files and renders markdown. If a future cycle needs depth (e.g.,
  blog-shaped wraps), that's a downstream extension.
- **Editing or rewriting decisions in the 626Labs Dashboard.** vibe-wrap is
  read-mostly against MCP. The only write is optional — a session-end
  decision summarizing the wrap. No edits to prior decisions, no deletions.
- **The three sibling-plugin renames** (`vibe-cartographer:evolve` →
  `evolve-cart`, etc). Captured in `drafts/_pending-renames.md`; ship from
  each plugin's next earned `:evolve` cycle, not this one.

## Loose Implementation Notes

These are deferred to `/spec` and `/checklist` — captured here so /spec doesn't
have to re-derive them from the handoff.

**Plugin shape**

- Solo repo `estevanhernandez-stack-ed/vibe-wrap`. Plugin lives at
  `plugins/vibe-wrap/` within the repo (marketplace convention, pattern (pp)).
- Tag naming `vX.Y.Z` (matches Cart, Doc, Thesis Engine, Vibe Thesis, Taker;
  not the `<plugin>-vX.Y.Z` form Test/Sec inherited from filter-repo lineage).
- State directory `~/.claude/plugins/data/vibe-wrap/` (matches sibling pattern).
- All SKILL bodies under ~500 lines (progressive disclosure: detail to
  `references/`, scripts to `scripts/`, templates to `assets/`).
- Voice: builder-to-builder, sentence-case headings, em-dashes welcome, no
  emoji in SKILL bodies, no corporate speak. Match marketplace README + sibling
  SKILL voice.

**Likely skill inventory** (final list locked in /spec)

| Skill | Purpose |
|---|---|
| `vibe-wrap:wrap` | Main end-of-session command. User-invocable. |
| `vibe-wrap:plant` | Internal SKILL siblings invoke at command-start (if option a or hybrid wins for plant mechanism). |
| `vibe-wrap:status` | "What's the trail look like right now?" Debug + visibility. |
| `vibe-wrap:guide` | Shared behavior, voice, tone (Cart pattern). Not user-invocable. |
| `vibe-wrap:evolve-wrap` | Pattern #1 self-evolution. Named correctly from day one. |
| `vibe-wrap:session-logger` | Pattern #2 two-phase session log (internal). |
| `vibe-wrap:friction-logger` | Pattern #6 append-only friction log (internal). |

**Open architectural decisions to settle in /spec** (load-bearing — surface
for user before locking)

1. **Breadcrumb storage location and JSONL schema.** Proposal:
   `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`. Schema:
   timestamp, source-plugin, command/skill, optional payload. Verify against
   existing `~/.claude/plugins/data/<plugin>/` conventions.
2. **Plant mechanism** — (a) internal `vibe-wrap:plant` SKILL siblings invoke,
   (b) vibe-wrap-owned hook auto-detects sibling activity, (c) hybrid (hook
   for autodetection + opt-in `:plant` SKILL for enrichment). Each has
   tradeoffs around coupling, attribution, noise filtering.
3. **End-of-session hook strategy.** Candidates: `Stop`, `SessionEnd`,
   `PreCompact`, `UserPromptSubmit` (filter for end-of-session signals).
   Constraint: no auto-fire of `:wrap`; at most a one-line nudge if signal is
   high-confidence.
4. **Wrap output destination.** Inline only, file at
   `docs/session-wraps/YYYY-MM-DD.md`, both, or configurable. (Strong lean
   toward "both, with file as default and inline-only as a flag.")
5. **626Labs Dashboard composition threshold.** Every wrap bridges to the
   dashboard's Architect AI via `bridge_context_to_architect`, on-demand only,
   or threshold-gated (e.g., wrap touched an architectural decision or scope
   change). Stake: noise vs signal at the strategic layer.

**Composition contract**

- Read-mostly against `mcp__626Labs__*`. Single optional write: a session-end
  decision summarizing the wrap.
- Read-only against sibling plugin state directories (Cart sessions, Doc
  friction, etc.) when those exist. Never write to a sibling's namespace.
- Hard isolation: vibe-wrap owns `~/.claude/plugins/data/vibe-wrap/` and
  nothing else.

**The bumper-lanes invariant**

vibe-wrap is **bumpers, never gutter**. Specifically:

- Never auto-fire `:wrap`. Hook surfaces a one-line nudge at most.
- Never commit or push without explicit user confirmation per gesture.
- Never bridge to dashboard Architect AI without satisfying the chosen
  threshold (or user opt-in).
- Always allow the user to skip any gate and just read the wrap.
- Falling back to local-only when MCP is unavailable is silent — no error,
  just a thinner wrap.
