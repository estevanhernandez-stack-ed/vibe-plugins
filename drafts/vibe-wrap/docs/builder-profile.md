<!-- Project-local builder profile for vibe-wrap (Cart cycle #16). Synthesized
     2026-05-10 from ~/.claude/profiles/builder.json + ~/.claude/CLAUDE.md +
     drafts/vibe-wrap/_handoff-prompt.md. No interview — Este is a fully-autonomous
     Cart-mode builder with 15 completed cycles; the upstream brief is thorough
     enough to skip /onboard's interview steps. -->

# Builder Profile

## Who They Are

Estevan ("Mr. Solo Dolo"). Builds and ships 626Labs out of Fort Worth, TX. 20+ years
PC/Windows experience. Vibe coder — architects and ships through AI agents rather
than writing code directly. Active Vibe Cartographer plugin contributor. Has shipped
15 Cart cycles to completion across theatre ops tools, hackathon apps, Roblox games,
Claude Code plugins (Cartographer, Doc, Test, Sec, Thesis Engine, Vibe Thesis,
Taker), Discord bots, creative writing, and Microsoft Store apps.

**This cycle (#16):** building `vibe-wrap` — a session wrap-up plugin for the
626Labs marketplace. Same shape as the six existing marketplace plugins. First
plugin built under the new `evolve-<short>` namespace convention.

## Technical Experience

- **Level:** experienced.
- **Languages:** TypeScript, Python, JavaScript, Luau, C#, HTML/CSS, C++.
- **Frameworks:** React 19, Next.js, Vite, Tailwind, Firebase, FastAPI, Flask,
  Express, .NET 8/9, Azure, Expo, React Native, Drizzle ORM, Playwright, WPF,
  C++/WinRT, Windows App SDK / WinUI 3, MSIX, Ollama, Gemma 4.
- **AI agent experience:** Deep. Built and shipped 6 Claude Code plugins to
  marketplace. Runs Claude Code as autonomous build system with structured
  checklists + subagent delegation. Proven across 15+ Cart cycles.
- **Plugin-stack specifics:** Claude Code SKILL conventions, plugin.json manifest
  format, marketplace.json aggregation pattern, `~/.claude/plugins/data/<plugin>/`
  state convention, Self-Evolving Plugin Framework patterns (session-logger,
  friction-logger, evolve), 626Labs MCP (`mcp__626Labs__*`) for cross-session
  state.

## Mode

**Builder.** Brisk pacing. Streamlined flow. No script-following — adapt to what's
in front of you. Compact decision matrices over serial questions when substrate is
well-understood (pattern (j) from prior cycles). Zero deepening rounds is the
default for mature-substrate cycles; offer rounds but don't push.

## Project Goals

Build `vibe-wrap` as the sixth durable marketplace plugin under the 626Labs vibe
namespace. Specifically:

- **End-of-session reconstruction is expensive** when work hasn't been committed
  in steady passes. Vibe-wrap fixes that with a **breadcrumb pattern**: sibling
  plugins drop trail markers when their commands fire; vibe-wrap reads the trail
  at session end instead of cold-reconstructing from `git log` + memory.
- **The wrap output is a "what got done" doc**, not a prompt for the next agent.
  Read it, share it, paste it into a status update.
- **Commit/push gate.** Surface uncommitted work, ask whether to commit, ask
  whether to push (gated on commits ahead of remote).
- **626Labs MCP composition.** When MCP is available: pull decisions for the
  session, optionally write a wrap-summary decision, optionally bridge strategic
  context to the dashboard Architect AI. When unavailable: fall back to local
  state cleanly (no error).
- **Self-evolution from day one.** Ship `vibe-wrap:evolve-wrap` named correctly
  from the start (not `evolve` — see pending-renames.md).

**Ship gates (carry into /prd):**

1. `/vibe-wrap` (or `/vibe-wrap:wrap`) produces a coherent end-of-session wrap
   doc from breadcrumbs + git state + (optionally) MCP decisions.
2. Sibling plugins can drop breadcrumbs via the chosen plant mechanism without
   coupling tightly to vibe-wrap.
3. Commit/push gates work without surprising the user.
4. Fall-back to local-only mode when MCP unavailable is clean and silent.
5. Plugin ships to canary (solo repo `estevanhernandez-stack-ed/vibe-wrap`) and
   stable (vibe-plugins marketplace ref-bump) — but **not in this cycle**. The
   draft lands under `drafts/vibe-wrap/` and gets promoted as a deliberate
   later step.

## Design Direction

CLI plugin — no UI surface, no visual design beyond markdown output shape. The
"design" decisions are:

- **Wrap output format** — markdown only. Structured headings (what shipped, what's
  uncommitted, decisions logged, friction, push gate). Sentence-case headings.
  Em-dashes welcome. No emoji. Builder-to-builder voice. Match the marketplace
  README + sibling SKILL voice.
- **Breadcrumb format** — JSONL one-line-per-event. Schema small enough to be
  obvious, extensible enough that siblings can enrich.
- **No corporate speak.** No "I'd be happy to," no "leverage / empower / unleash."

## Prior SDD Experience

Heavy. 15 completed Cart cycles. The Spec-prep-upstream-then-Cart-wraps-up pattern
(mm) is the dominant operating mode — the handoff doc IS most of the spec already;
Cart's job is to formalize it through /scope → /prd → /spec → /checklist → /build
and ship the structure. Skip the discovery questions; lean into the formalization.

Cycle-builder identity: **self** (human operator).
Autonomy level: **fully-autonomous.**

## Architecture Docs

**Architecture is the 626Labs marketplace plugin convention.** Pattern doc:
[`vibe-cartographer/docs/self-evolving-plugins-framework.md`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md).

Pattern references inherited from sibling plugins:

- **Pattern #2 — Two-phase session log.** `vibe-cartographer:session-logger`,
  `vibe-doc:session-logger`, `vibe-iterate:session-logger`. Sentinel + terminal
  entry paired by sessionUUID.
- **Pattern #6 — Friction log.** `vibe-cartographer:friction-logger`,
  `vibe-doc:friction-logger`, `vibe-iterate:friction-logger`. Append-only JSONL.
- **Pattern #1 — Self-evolution.** `vibe-cartographer:evolve`, `vibe-doc:evolve`,
  `vibe-iterate:evolve` (all to be renamed to `evolve-<short>` per
  drafts/_pending-renames.md). Vibe-wrap ships `evolve-wrap` from day one.
- **Cached-state read pattern.** `vibe-iterate:radar` — read cached state, render
  digest, no PR/mutation. Closest shape to `vibe-wrap:wrap`.
- **Closest sibling skill (retro).** `vibe-cartographer:reflect` — but
  project-scoped, not session-scoped. Vibe-wrap is session-scoped.

**Conventions to honor:**

- `~/.claude/plugins/data/vibe-wrap/` for state (matches existing plugins).
- SKILL bodies under ~500 lines (progressive disclosure — push detail to
  `references/`, scripts to `scripts/`, templates to `assets/`).
- `allowed-tools` discipline per skill (wrap is read-heavy + selective write).
- Solo repo `estevanhernandez-stack-ed/vibe-wrap`, plugin lives at
  `plugins/vibe-wrap/` within it (marketplace consistency, pattern (pp)).
- Tag naming: `vX.Y.Z` (matches Cart, Doc, Thesis Engine, Vibe Thesis, Taker; not
  the `<plugin>-vX.Y.Z` form Test/Sec inherited from filter-repo extraction).

**Open architectural decisions to settle during /scope and /spec:**

1. Breadcrumb storage location (proposed: `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`).
2. Breadcrumb schema (at minimum: timestamp, source-plugin, command/skill, payload).
3. Plant mechanism: (a) `vibe-wrap:plant` SKILL siblings invoke at command-start,
   (b) auto-detect hook in vibe-wrap, (c) hybrid.
4. Hook strategy: `Stop`, `SessionEnd`, `PreCompact`, `UserPromptSubmit` — eval fit.
   No auto-fire of `:wrap` unsolicited; at most a one-line nudge.
5. Wrap output destination: inline only, file at `docs/session-wraps/YYYY-MM-DD.md`,
   both, configurable.
6. 626Labs Dashboard composition threshold: every wrap bridges, on-demand only,
   or threshold-gated (e.g., wrap touched strategic decisions).
