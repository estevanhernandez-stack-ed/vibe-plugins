# vibe-wrap — Product Requirements

> **Anchor:** Sessions wrap themselves when the trail is already there.

## Problem Statement

Builders running long, multi-plugin Claude Code sessions lose ten-plus minutes
at session end reconstructing "what got done today" from `git log` + memory +
scattered tool output — and the cost compounds when work hasn't been committed
in steady passes. Vibe-wrap collapses that cost by reading the breadcrumb trail
sibling vibe plugins (and optional auto-detect) already left during the session,
then producing a clean handoff doc and gating commit + push interactively. It
is the session-scoped wrap surface the marketplace has been missing — Cart's
`/reflect` is project-scoped, not session-scoped.

## User Stories

<!-- Stories grouped by epic. Epic headings are stable; downstream commands
     (/spec, /checklist, /build) reference them. -->

### Epic: Wrapping a session

- As a builder closing out a session, I want to type `/vibe-wrap` and get a
  readable handoff doc, so I don't burn ten minutes reconstructing the day's
  work from `git log` and memory.
  - [ ] Running `/vibe-wrap` in a repo with breadcrumbs produces a markdown
        wrap doc within ~10 seconds (no LLM-heavy reconstruction).
  - [ ] The wrap names: files changed, commits made (subjects), decisions
        logged (when MCP available), friction signals captured, anything still
        uncommitted, anything still unpushed, session start/end timestamps.
  - [ ] The wrap is readable, shareable, and pasteable into a status update —
        builder-to-builder voice, sentence case headings, no emoji, no
        corporate speak.
  - [ ] Empty-session edge case: if there are zero breadcrumbs and zero git
        activity, the wrap says so clearly and exits without error.
  - [ ] Repo with no git remote edge case: the wrap omits push-related
        sections and notes the local-only state; no error.
  - [ ] Detached HEAD / mid-rebase edge case: the wrap detects the unusual
        state, warns the user, and skips the commit/push gates rather than
        guessing.

- As a builder mid-session, I want `/vibe-wrap:status` to show me what trail
  has been picked up so far, so I have visibility into whether the eventual
  wrap will be useful before I close out.
  - [ ] `/vibe-wrap:status` runs in <3 seconds and outputs: count of
        breadcrumbs captured, list of source plugins seen, count of friction
        signals, count of decisions surfaceable from MCP (if available).
  - [ ] No mutations — read-only against breadcrumbs, MCP, git state.
  - [ ] Empty-trail case: clear "no breadcrumbs captured this session yet"
        message; suggests checking that sibling plugins are running the
        plant mechanism.

### Epic: The breadcrumb trail

- As a sibling plugin author, I want a stable, documented way for my plugin to
  drop a breadcrumb when one of my commands fires, so my plugin's work shows up
  in the wrap without my plugin tightly coupling to vibe-wrap.
  - [ ] Breadcrumb plant mechanism is documented in
        `references/breadcrumb-contract.md` (location, schema, opt-in pattern,
        failure mode if vibe-wrap is absent).
  - [ ] Plant mechanism is no-op-safe: if vibe-wrap is not installed, the
        sibling's command does not error, raise, or block.
  - [ ] Schema is small enough to be obvious (timestamp, source-plugin,
        command, optional payload) and extensible enough that siblings can
        enrich without breaking older readers.
  - [ ] Vibe-wrap parses unknown / future schema fields without crashing
        (forward compatibility — siblings can add fields).

- As a builder running plugins that don't drop breadcrumbs (older versions,
  third-party tools, plain-CLI work), I want the wrap to fall back gracefully,
  so a less-instrumented session still produces a useful doc from git +
  uncommitted state alone.
  - [ ] With zero breadcrumbs but real git activity, the wrap still names
        commits, files changed, and uncommitted state — just thinner on the
        "what did the toolkit do" sections.
  - [ ] Mixed-instrumentation sessions (some plugins planted, others didn't)
        produce a wrap that reflects what's there without flagging the gap as
        an error.

### Epic: Commit and push gates

- As a builder, I want vibe-wrap to surface uncommitted files and ask before
  committing, so I never get unexpected commits.
  - [ ] Wrap doc lists uncommitted files in a dedicated section before any
        commit prompt.
  - [ ] Wrap never commits without an explicit `y` (or equivalent) per
        gesture. Default is no-action.
  - [ ] When committing, the message is drafted from the wrap summary; the
        user can accept, edit, or skip.
  - [ ] Files matching common-secret patterns (`.env*`, `*credentials*`,
        `*.pem`) trigger a warning and require an additional confirmation.

- As a builder, I want vibe-wrap to ask before pushing, gated on commits being
  ahead of remote, so push is always a deliberate act.
  - [ ] Push prompt only appears when local is ahead of the tracked remote.
  - [ ] No tracked remote → push gate is skipped silently (no error, no
        prompt).
  - [ ] Multiple remotes edge case: wrap names which remote it would push to
        (the upstream of the current branch) and lets the user override or
        skip.
  - [ ] Force-push is never offered; if the branch has diverged, the wrap
        surfaces it as a state to resolve manually.

- As a builder closing out, I want to skip every gate and just read the wrap,
  so vibe-wrap stays bumpers-not-gutter — never blocks the close.
  - [ ] Every interactive gate has a clear skip path. The wrap doc is always
        produced, regardless of whether commit/push gates were used.
  - [ ] Pressing enter / typing `n` at any prompt is non-destructive.

### Epic: Decision log composition

> The decision log is a pluggable backend, not a 626Labs-specific surface.
> This epic generalized in /spec — the storefront pitch is for any user,
> and a fallback that just shrugs when MCP isn't available shipped a
> half-feature. Three backends in v0.1.0 (Markdown file, JSONL file,
> 626Labs MCP) plus a "disabled" mode. Smart default with first-run UX
> that proposes a Markdown file in the right place — `<repo>/docs/decisions.md`
> when the repo has a `docs/`, else `~/.claude/decisions.md` (user-scoped,
> cloud-sync friendly).

- As any builder, I want vibe-wrap to pull session decisions from a
  decision log, so they appear in the wrap doc without me re-typing them —
  no matter which log I use.
  - [ ] vibe-wrap supports at least three decision-log backends in v0.1.0:
        Markdown file, JSONL file, 626Labs MCP. Plus a "disabled" mode.
  - [ ] The active backend is chosen via per-project config (per-project
        overrides global default). Auto-detect: if 626Labs MCP is reachable
        and no explicit config exists, MCP wins; otherwise the Markdown
        file backend wins.
  - [ ] Each backend implements the same read contract: given a session
        time window, return decisions logged within it. The wrap doc renders
        them identically regardless of backend.
  - [ ] When the active backend is unreachable or the log is empty, the
        wrap section reads "no decisions logged this session" — never an
        error, never a silent omission.

- As a first-time vibe-wrap user without a decision log configured, I want
  the plugin to offer me sensible options on first run, so I can pick
  something useful in one beat — and feel inspired to actually keep a
  decision log.
  - [ ] First wrap with no config + no MCP detected triggers a one-time
        prompt naming the four backend options with the recommended default
        (Markdown file at the smart-default path) labeled.
  - [ ] User's choice persists to `~/.claude/plugins/data/vibe-wrap/config.json`
        (global) or `<repo>/.vibe-wrap/config.json` (per-project, if user
        chose project-scoped path).
  - [ ] User can re-run the picker via a `--reconfigure` flag on `:wrap`,
        or by editing the config file directly.

- As a builder closing a session worth recording, I want vibe-wrap to
  optionally append a session-end decision to my active decision log, so
  the wrap itself becomes a decision the log captures.
  - [ ] Append is opt-in per gesture (prompted at gate time, not automatic).
  - [ ] Append works on every backend: Markdown (new section under the
        date heading), JSONL (new line), 626Labs MCP (`manage_decisions log`
        call). Disabled backend silently skips this gate entirely.
  - [ ] When appending, the entry includes: timestamp, summary excerpt
        from the wrap, link/path to the wrap doc, optional project tag.

- As a builder closing a strategic 626Labs session, I want vibe-wrap to
  optionally bridge context to the dashboard's Architect AI via
  `bridge_context_to_architect`, so strategic stakes get visibility at the
  trajectory layer.
  - [ ] Bridge gate appears only when the active backend is `626labs-mcp`
        AND a configurable threshold is met. (Threshold rule itself is a
        /spec decision.)
  - [ ] Bridge is opt-in per gesture even when the threshold fires.
  - [ ] Bridge is silently absent for every other backend — it's a
        626Labs-specific composition that other backends may implement
        later via their own bridge contracts.

### Epic: Self-evolution from day one

- As a future maintainer of vibe-wrap, I want `/vibe-wrap:evolve-wrap` to read
  past wrap sessions and friction signals and propose plugin improvements, so
  vibe-wrap gets sharper with usage.
  - [ ] `evolve-wrap` follows Pattern #1 from the Self-Evolving Plugin
        Framework — reads from `~/.claude/plugins/data/vibe-wrap/`
        session-logger + friction-logger output.
  - [ ] Output is a `proposed-changes.md` file in the plugin source —
        never auto-applies.
  - [ ] Skill is named `evolve-wrap` from v0.1.0 (not `evolve`) so the new
        marketplace naming convention is established.

### Epic: Plugin shape and marketplace fit

- As the marketplace maintainer, I want vibe-wrap to ship under the same
  solo-repo + tagged-ref + canary/stable pattern as the other six plugins, so
  promotion is one `ref` bump in `marketplace.json`.
  - [ ] Solo repo `estevanhernandez-stack-ed/vibe-wrap` (created later, not
        in this cycle).
  - [ ] Plugin lives at `plugins/vibe-wrap/` within the solo repo.
  - [ ] Tag naming `vX.Y.Z` (matches Cart, Doc, Thesis Engine, Vibe Thesis,
        Taker; not the `<plugin>-vX.Y.Z` form Test/Sec inherited).
  - [ ] State directory is `~/.claude/plugins/data/vibe-wrap/` —
        vibe-wrap owns this namespace and writes nowhere else.

- As a builder reading the wrap doc later, I want a durable file, so I can
  link to it, paste from it, or reference it in a status update.
  - [ ] Wrap output destination is configurable (see Open Questions for the
        default — the requirement is that file output is supported, not that
        any specific path is mandated).
  - [ ] When written to file, the path is named with a session timestamp so
        multiple wraps in one day don't collide.

## What We're Building

Everything above under User Stories. Specifically the v0.1.0 ship:

- A `vibe-wrap:wrap` skill that produces the handoff doc.
- A breadcrumb plant mechanism (option a, b, or hybrid — locked in /spec).
- A `vibe-wrap:status` skill for in-session visibility.
- A `vibe-wrap:guide` skill for shared behavior, voice, tone (Cart pattern).
- A `vibe-wrap:evolve-wrap` skill from day one (Pattern #1).
- A `vibe-wrap:session-logger` and `vibe-wrap:friction-logger` per Patterns
  #2 and #6.
- Documentation: `references/breadcrumb-contract.md`, `README.md`, plugin
  manifest.
- Clean MCP fallback (silent local-only mode).
- Bumper-lanes invariant honored at every gate.

## What We'd Add With More Time

- **Cross-session digests.** Weekly/monthly rollups of multiple wraps. Likely
  a `:digest` skill that reads many session-wraps and renders a summary.
  Sketched in scope as `/evolve-wrap-cycle` work.
- **Multi-repo wraps.** Single invocation that wraps across all repos worked
  in during the session. v1 wraps cwd only.
- **Non-vibe tool autodetect.** Heuristic detection of activity from
  third-party CLI tools (anything noisy enough to attribute) so wraps reflect
  more than the vibe ecosystem. Risky — false attribution is worse than
  silence.
- **Richer wrap formats.** PDF / HTML / blog-shaped output. v1 is markdown
  only; downstream tools (Vibe Thesis, etc.) handle other shapes.
- **Auto-fire of `:wrap` on high-confidence session-end signals.** v1 is
  user-invoked; a hook may surface a one-line nudge but never auto-fire.
- **Per-plugin breadcrumb richness controls.** A way for the user to mute
  noisy plugins or boost quiet ones in the wrap.
- **Editing or rewriting prior dashboard decisions.** Read-mostly is the
  right default; this would change the composition contract.

## Non-Goals

- **No subagent dispatch in v1.** The wrap SKILL reads files and renders
  markdown. Reason: keeps blast radius small and shipping fast; subagent
  composition is a downstream extension when the shape is proven.
- **No built-in scheduler.** Use `claude-code:schedule` if you want recurring
  wraps. Reason: scheduling is a generic capability already provided by the
  CLI; reimplementing it would create overlap and confusion.
- **No edits or deletions of dashboard decisions.** Read-mostly against MCP;
  the only write is the optional session-end summary. Reason: vibe-wrap is a
  reader of the strategic layer, not a curator of it.
- **No introspection of arbitrary third-party CLI tools.** v1 reads
  breadcrumbs from vibe plugins (and optional autodetect for opted-in noisy
  signals). Reason: false attribution is worse than silence — any heuristic
  here needs proof before we ship it.
- **No three-sibling rename in this cycle.** `vibe-cartographer:evolve`,
  `vibe-doc:evolve`, `vibe-iterate:evolve` stay as-is; renames ship from each
  plugin's next earned `:evolve` cycle. Reason: don't churn working plugins
  for a naming consistency that's already captured in
  `drafts/_pending-renames.md`.
- **No solo repo creation in this cycle.** Stage everything under
  `drafts/vibe-wrap/` until the user signals "ready to migrate." Reason:
  promotion is a deliberate act; the draft has to firm up first.
- **No `marketplace.json` edits in this cycle.** Stable channel ref-bump
  happens after the solo repo's first stable tag exists. Reason: stable
  means stable.

## Open Questions

These are explicitly /spec-level — needs answering **before /spec generates
the technical design**, since each one has architectural ripples.

1. **Breadcrumb storage location + JSONL schema.**
   Proposal:
   `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`.
   Schema: timestamp, source-plugin, command, optional payload. **Verify
   against existing `~/.claude/plugins/data/<plugin>/` conventions before
   locking.** Needed before /spec.

2. **Plant mechanism.** Three options on the table:
   - (a) Internal `vibe-wrap:plant` SKILL siblings invoke at command-start.
         Clean attribution; requires sibling plugins to know about vibe-wrap
         (coupling).
   - (b) vibe-wrap-owned hook (likely `PreToolUse` or `SessionStart`) that
         auto-detects sibling activity. Self-contained; harder to attribute
         and may need noise filtering.
   - (c) Hybrid — hook for autodetect baseline, opt-in `:plant` SKILL for
         siblings that want richer attribution.
   **Strong lean toward (c)**, but locks in /spec. Needed before /spec.

3. **End-of-session hook strategy.** Candidates: `Stop`, `SessionEnd`,
   `PreCompact`, `UserPromptSubmit` filtered for end-of-session signals.
   **Constraint locked: no auto-fire of `:wrap`; at most a one-line nudge
   when the signal is high-confidence.** /spec picks the hook event(s).
   Needed before /spec.

4. **Wrap output destination.** Inline only / file at
   `docs/session-wraps/YYYY-MM-DD.md` / both / fully configurable.
   **Strong lean toward "both, with file as default and inline-only as a
   flag."** Locks in /spec. Needed before /spec.

5. **626Labs Dashboard composition threshold.** Every wrap bridges via
   `bridge_context_to_architect` / on-demand only / threshold-gated (e.g.,
   the wrap touched an architectural decision or scope change).
   **Strong lean toward threshold-gated**, but the rule itself locks in
   /spec. Needed before /spec.

These five carry over verbatim from scope.md's "Open architectural decisions
to settle in /spec." They are the load-bearing /spec inputs — locking them
unblocks the rest of the technical design.
