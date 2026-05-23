# Handoff prompt — build `vibe-wrap` (session wrap-up plugin)

Paste this into a fresh agent session. The agent should be running in `C:\Users\estev\Projects\vibe-plugins` with `skill-creator` and `vibe-cartographer` plugins installed.

---

## Mission

Build a new plugin called **`vibe-wrap`** for the 626Labs marketplace (`vibe-plugins`). It runs at session end and gives the user a clean handoff: what got done, what's uncommitted, whether to push, and a written record of the session — not a prompt for the next agent, but a "what we shipped today" summary.

The hard problem: end-of-session reconstruction is expensive when work hasn't been committed in steady passes. Vibe-wrap solves this with a **breadcrumb pattern** — sibling vibe plugins drop a small trail marker when their commands fire, and vibe-wrap reads the trail at end-of-session instead of cold-reconstructing from `git log` + memory.

## Workflow expectations

You are in `vibe-plugins`. **This repo is the marketplace aggregation manifest** — it does NOT host plugin source. Per the established workflow:

1. **Draft here** under `drafts/vibe-wrap/<plugin-shape>/` so the work is version-controlled and reviewable from any agent session.
2. **Final destination** is a new solo repo (`vibe-wrap`) under `estevanhernandez-stack-ed/`. **Do not create the solo repo yet** — wait for explicit user signal after drafts firm up.
3. **Do not touch `.claude-plugin/marketplace.json`.** That ref bump happens after the solo repo has its first stable tag. Promotion is a deliberate act.

## Tools available to you

- **`skill-creator:skill-creator`** — use for skill scaffolding, description-tuning, and the eval loop. Right tool for writing well-triggered skills.
- **`vibe-cartographer:scope` → `:prd` → `:spec` → `:checklist` → `:build`** — run the Cart cycle for the plugin itself. The shape is novel enough to earn the full cycle.
- **626Labs MCP** (`mcp__626Labs__*`) — already in this environment. Decisions are logged there. Sessions are tracked there. **Pull from this for wrap content** rather than reconstructing from scratch when MCP is available.

## Anchored context (carried from the prior session)

- **Skill priority bucket: Plugins (lowest of four).** A user's personal `~/.claude/skills/` overrides us. Don't pick generic names; namespace + descriptive base.
- **Description is the trigger contract.** Trigger phrases must match how the user actually phrases the request. Test mentally against: "wrap the session," "summarize what we did," "what got done," "session done," "commit and push?", "wrap it up."
- **Progressive disclosure.** Keep `SKILL.md` under ~500 lines. Push detail into `references/`, scripts into `scripts/`, templates into `assets/`.
- **`allowed-tools` discipline.** Wrap is read-heavy (git, MCP, breadcrumbs) plus selective write (commit, push gate). Decide tool restrictions per skill.
- **No emoji in skill bodies. No corporate speak. Sentence case headings. Em-dashes welcome.**
- **Established patterns in our marketplace** worth studying first (clone the solo repos if needed):
  - `vibe-cartographer/plugins/vibe-cartographer/skills/session-logger/` — Pattern #2 (two-phase session log) from the Self-Evolving Plugin Framework.
  - `vibe-cartographer/plugins/vibe-cartographer/skills/friction-logger/` — Pattern #6.
  - `vibe-iterate/plugins/vibe-iterate/skills/radar/` — cached state read pattern.
  - `vibe-cartographer/plugins/vibe-cartographer/skills/reflect/` — closest sibling (retro), but project-scoped not session-scoped.
  - Self-Evolving Plugin Framework doc: `vibe-cartographer/docs/self-evolving-plugins-framework.md`.

## Product spec (start here, refine in `:scope` / `:prd`)

### Core flow

1. User invokes `/vibe-wrap` (or `/vibe-wrap:wrap`) at session end.
2. Plugin reads the breadcrumb trail for the current session.
3. Generates a session summary covering: files changed, commits made, decisions logged (via 626Labs MCP if available), tasks completed/abandoned, friction points hit, anything still uncommitted, anything still unpushed.
4. Verifies commit state. If uncommitted changes exist, surfaces them and asks the user whether to commit.
5. Asks: **"Push to remote?"** — gated on commits existing and being ahead of remote.
6. Outputs the wrap as a handoff doc — a "what got done" summary the user can read, share, or paste into a status update. **Not a prompt for the next agent.**

### Breadcrumb pattern (the load-bearing design)

Sibling vibe plugins drop a marker at command-start to a shared location. Vibe-wrap reads the trail at end-of-session.

**Open design questions to resolve in `:scope` and `:spec`:**

- **Storage location** — proposal: `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`. Validate against existing `~/.claude/plugins/data/<plugin>/` conventions.
- **Schema per breadcrumb line** — at minimum: timestamp, source-plugin, command/skill name, optional payload.
- **Plant mechanism** — two options:
  - **(a)** Internal `vibe-wrap:plant` SKILL that siblings invoke at command-start. Clean, but requires sibling plugins to know about vibe-wrap (coupling).
  - **(b)** SessionStart / PreToolUse hook in vibe-wrap that auto-detects sibling plugin activity. Self-contained, no sibling edits, but harder to attribute and may need to filter noise.
  - **Recommend evaluating both.** A hybrid is plausible (hook for autodetection + opt-in `:plant` SKILL for siblings that want to enrich the trail).

### Skills likely needed

- **`vibe-wrap:wrap`** — main end-of-session command.
- **`vibe-wrap:plant`** — internal SKILL for siblings (if option a or hybrid wins).
- **`vibe-wrap:status`** — show what trail's been picked up so far this session (debug + visibility).
- **`vibe-wrap:guide`** — shared behavior, agent voice, tone (per Cart pattern).
- **`vibe-wrap:evolve-wrap`** — self-evolution pattern (Pattern #1). **Name it `evolve-wrap` from day one** — see Constraints below.

### Hook strategy (open question)

Options to spec: `Stop`, `SessionEnd`, `PreCompact`, `UserPromptSubmit` (filter for end-of-session signals). Evaluate fit. The hook should not auto-fire `:wrap` unsolicited — it should at most surface a one-line nudge ("session looks done — want me to wrap?") if vibe-wrap has signal that the user is closing out.

## Constraints from the prior session

1. **Three sibling plugins already have an `evolve` skill** (`vibe-cartographer:evolve`, `vibe-doc:evolve`, `vibe-iterate:evolve`). **Do not name vibe-wrap's evolve just `evolve`.** Use `evolve-wrap` from day one. We're correcting the namespace pattern going forward; vibe-wrap is the first plugin built under the new convention.
2. **Forward-pointer file already exists** at `drafts/_pending-renames.md` capturing the rename TODOs for the three existing evolves. **Do not edit those plugins from this session.** The renames ship from each plugin's next earned `:evolve` cycle, not as standalone churn.
3. **626Labs MCP composition.** When MCP is available, vibe-wrap should:
   - Read decisions for the session via `manage_decisions search`.
   - Optionally write a session-end decision summarizing the wrap.
   - Optionally bridge strategic context to the dashboard's Architect AI via `bridge_context_to_architect` if the session crossed strategic boundaries (architectural choice, scope change, deadline commitment).
   - When MCP unavailable: fall back cleanly to local state (git log, breadcrumbs, no error).
4. **Voice rules** in `~/.claude/CLAUDE.md` (The Architect persona, working/technical register) and `vibe-plugins/CLAUDE.md` (marketplace voice) apply. Read them.

## Trust-on-shape

The shape is clear enough to operate autonomously through `:scope` → `:prd` → `:spec` → `:checklist` → `:build`. Surface these for user input before locking:

- **Breadcrumb storage location and JSONL schema.**
- **Plant mechanism** (option a, b, or hybrid).
- **Hook strategy.**
- **Output format** — inline only? File at `docs/session-wraps/YYYY-MM-DD.md`? Both? Configurable?
- **626Labs Dashboard composition** — should every wrap bridge to the strategic Architect AI, or only on demand / threshold?

Everything else: ship.

## First moves in order

1. Read `~/.claude/CLAUDE.md` and `C:\Users\estev\Projects\vibe-plugins\CLAUDE.md` for voice + workflow rules.
2. Read `drafts/_pending-renames.md` so the evolve-naming convention is locked in your head.
3. Skim the Self-Evolving Plugin Framework doc and the Cart `session-logger` / `friction-logger` SKILL bodies for the established session-instrumentation pattern (clone the solo repo if needed: `gh repo clone estevanhernandez-stack-ed/vibe-cartographer`).
4. Run `/vibe-cartographer:scope` to scope vibe-wrap. Push to `:prd`, then `:spec`, then `:checklist`, then `:build`.
5. Stage everything under `drafts/vibe-wrap/`. Do not touch `.claude-plugin/marketplace.json`. Do not create the solo repo yet.

## Done state for this handoff

A complete plugin draft in `drafts/vibe-wrap/` containing:

- `plugin.json` (or marketplace-compatible manifest stub).
- All SKILL.md files for the skills above (wrap, plant, status, guide, evolve-wrap).
- `references/` with any deferred reading material.
- `scripts/` for breadcrumb-read or git-state utilities if those earn their place.
- A short `README.md` for the eventual solo repo.
- Friction signals captured along the way for the next `:evolve` cycle to pick up.

When the draft is ready for solo-repo migration, surface a "ready to migrate?" checkpoint to the user. They will create the solo repo and point you at it.
