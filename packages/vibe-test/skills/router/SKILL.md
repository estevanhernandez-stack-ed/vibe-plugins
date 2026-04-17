---
name: router
description: "This skill should be used when the user says `/vibe-test` (bare, no subcommand). The entry point to the Vibe Test plugin — greets the builder with plugin identity, detects first-run vs returning state, lists the 6 subcommands in plain language, and asks in natural language what they want to do next. No scanning. Under 10 seconds on first render."
---

# router — `/vibe-test` Bare Entry Point

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level language adaptation, Pattern #13 composition rules, version resolution), then follow this command end-to-end.

You are the front door of Vibe Test. This is the first thing a builder sees when they type `/vibe-test` with no arguments. Your job is four things, in order:

1. Resolve the plugin version deterministically (Pattern #15).
2. Detect whether this is a first-run or a returning-builder invocation (Pattern #16 shaping prereq).
3. Render a persona-adapted banner that explains what Vibe Test does and lists the 6 subcommands in plain language.
4. End with an **open-ended natural-language question** (*"want to start with an audit?"*) — never a numbered menu, never a forced choice.

You do **not** scan the repo. You do **not** classify. You do **not** write to `.vibe-test/` beyond the session-log append. First render must complete in under 10 seconds.

## Prerequisites

None. This is the plugin entry point. The router runs against any directory (unbound is fine).

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md) is your overall behavior reference. Every rule about persona, experience-level adaptation, Pattern #13 composition, version resolution, and prereq shaping flows through that file.
- **Version resolution rules** — [guide > "Version Resolution (Pattern #15)"](../guide/SKILL.md#version-resolution-pattern-15).
- **Prereq shaping rules** — [guide > "Prereq Shaping (Pattern #16)"](../guide/SKILL.md#prereq-shaping-pattern-16). The returning-vs-first-run detection here is a **shaping** prereq, not a blocking one.
- **Pattern #13 anchored registry** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). The router only announces complements whose `applies_to` array includes `router` or whose `phase` is explicitly entry-level. Most anchored complements apply to commands like `audit` / `generate` and are deferred to those commands — the router does NOT pre-announce them.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). Two-phase: `start(command='router', project)` at entry, `end({sessionUUID, command:'router', outcome})` before handoff.
- **Builder profile** — `~/.claude/profiles/builder.json`. Read `shared.preferences.persona`, `shared.technical_experience.level`, and `plugins.vibe-test.testing_experience` if present. Defaults documented below.

## Step 1 — Resolve Plugin Version (Pattern #15)

Read `~/.claude/plugins/installed_plugins.json` and look for the `vibe-test` entry. Expected shape varies slightly by Claude Code version, but every shape exposes a `version` field and/or a path that contains the installed version. Use the version from this file if present.

If `installed_plugins.json` is missing, unreadable, or does not contain a `vibe-test` entry:

1. Fall back to `.claude-plugin/active-path.json` at the plugin root. That file has a `version` field written at install time.
2. If `active-path.json` is missing or unreadable, fall back to `.claude-plugin/plugin.json`'s `version` field.
3. If all three fail, use the literal string `"unknown"` and log a short notice in the body (not an error — just transparency).

**Never fall back to ad-hoc `find` / `ls -R`.** The resolution order above is the entire allowed path.

The resolved version string is what you render as the plugin identity on the banner (*"Vibe Test v0.2.0"*). It also becomes the `plugin_version` field on the session-log entries you write.

## Step 2 — Session Logger: Sentinel Entry

Before any user-facing output, invoke session-logger `start`:

- `command` = `'router'`
- `project` = basename of the current working directory, or `null` if `process.cwd()` is unbound (e.g., the user is in a raw home directory).

Hold the returned `sessionUUID` in memory for the rest of the run. Follow [`../session-logger/SKILL.md`](../session-logger/SKILL.md) for the exact invocation pattern.

## Step 3 — Read Builder Profile (for persona + experience adaptation)

Read `~/.claude/profiles/builder.json`. Three fields matter to the router:

| Field | Source | Use | Fallback |
|-------|--------|-----|----------|
| `shared.preferences.persona` | Shared bus | Opening line voice | `null` (system default — neutral, short, professional) |
| `shared.technical_experience.level` | Shared bus | Banner verbosity + jargon level | `"intermediate"` (balanced verbosity) |
| `plugins.vibe-test.testing_experience` | Vibe Test namespace | Prefers this over `shared.technical_experience.level` if present | falls back to `shared.technical_experience.level` |

If the profile file is **absent**, you are a truly new builder — there is no stored persona. Apply the system default (neutral register, `intermediate` language level).

Apply the persona to the **opening line** only (per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation)). The banner body stays neutral so identity + command list render consistently across personas. Experience level adapts the body verbosity per [guide > "Experience-Level Language Adaptation (SE7)"](../guide/SKILL.md#experience-level-language-adaptation-se7).

**Important:** if you read the profile for an adaptation hint, you do NOT mutate it. The router is read-only on the profile.

## Step 4 — Detect First-Run vs Returning Builder (Pattern #16 shaping prereq)

Check for `.vibe-test/state.json` in the current working directory. This is a **shaping** prereq — both branches are valid, the banner just adapts. The user never sees the detection logic.

**First-run branch** (`.vibe-test/state.json` is absent or unreadable):
- Banner emphasizes identity + pitch + *what each subcommand does*.
- Natural-language prompt is *open-ended about where to start* — usually pointing at `audit` as the natural first move, but framed as a question, not a directive.
- No "last audit was …" line (there is none).

**Returning-builder branch** (`.vibe-test/state.json` exists and parses):
- Banner still shows identity + subcommand list, but compressed.
- Adds a single line summarizing *last command + timestamp* if the state file has enough data. Example: *"Last audit: 3 days ago — public-facing tier, 27.5% weighted score, 5 gaps ranked."*
- Natural-language prompt suggests the natural-next-step in the flow (audit → generate → gate → …). Still framed as a question.

Parse the state file with tolerance: if the schema_version is unfamiliar or fields are missing, degrade to a generic *"you've been here before"* line rather than erroring. Never block the router on a state-parse failure.

## Step 5 — Detect Complements (Pattern #13)

At the router level, the anchored registry is **mostly not relevant** — the 7 complements in [`plays-well-with.md`](../guide/references/plays-well-with.md) all apply to `audit` / `generate` / `fix` / `coverage` / `gate`, not to `router`. You do not pre-announce those deferrals on the bare `/vibe-test` screen.

However, do the following so the banner can hint at composition when it matters:

1. Read the list of available skills the agent currently sees (the runtime context lists them in system reminders under "The following skills are available").
2. Parse the anchored registry via `src/composition/anchored-registry.ts` (`parseAnchoredSync` — the content is a markdown file with YAML blocks; the parser handles both fenced and inline YAML).
3. Call `detectComplements({availableSkills, anchored, currentCommand: 'router'})` — because no anchored entry has `applies_to: [router]`, this returns an empty-ish map. That's expected.
4. If at least one of the 7 anchored complements IS available (regardless of the `router` filter), add a single compressed line to the banner body: *"Plays well with: `<name1>`, `<name2>`, … (active commands see deferral announcements)"*. This is a **teaser**, not a full Pattern #13 announcement.

If zero anchored complements are present, skip the "plays well with" line entirely.

Do **not** run dynamic-discovery heuristic at router level — that's a generate/gate/coverage/fix surface. The conservative cap is at most one total per-invocation suggestion, and the router never consumes that budget.

## Step 6 — Render the Banner

The banner is **text-first**, plain prose with a thin ASCII frame. Keep it under **40 lines** on first-run. Wider terminals may expand the divider width, but line count stays disciplined.

### Banner template (first-run, persona=null, experience=intermediate)

```
================================================================================
                        Vibe Test  ·  v<VERSION>
================================================================================

<PERSONA-ADAPTED OPENING LINE>

Vibe Test is a test auditor and generator for vibe-coded apps. It reads your
code, classifies it by app type and maturity tier, and generates the tests you
actually need — proportional to deployment risk, explained like a teacher.

Subcommands
--------------------------------------------------------------------------------
  /vibe-test:audit      Diagnose your whole testing posture — inventory, app
                        classification, honest coverage, ranked gaps.
  /vibe-test:generate   Generate tests for identified gaps. Confidence-tiered:
                        auto-writes / stages for review / shows inline.
  /vibe-test:fix        Diagnose and repair broken tests or harnesses.
  /vibe-test:coverage   Honest-denominator coverage with tier interpretation.
  /vibe-test:gate       CI pass/fail against your app's tier threshold.
  /vibe-test:posture    Read-only ambient summary — no scans, no writes.

<OPTIONAL: "Plays well with" teaser line — only when complements detected>

<PERSONA-ADAPTED NEXT-STEP QUESTION>
================================================================================
```

### Banner template (returning-builder)

```
================================================================================
                        Vibe Test  ·  v<VERSION>
================================================================================

<PERSONA-ADAPTED OPENING LINE>

Last <COMMAND>: <RELATIVE_TIMESTAMP> — <ONE-LINE STATE SUMMARY>

Subcommands
--------------------------------------------------------------------------------
  /vibe-test:audit      · diagnose testing posture
  /vibe-test:generate   · generate tests for gaps
  /vibe-test:fix        · repair broken tests / harnesses
  /vibe-test:coverage   · honest-denominator measurement
  /vibe-test:gate       · CI threshold pass/fail
  /vibe-test:posture    · ambient summary

<OPTIONAL: "Plays well with" teaser line>

<PERSONA-ADAPTED NEXT-STEP QUESTION — suggests the natural next step>
================================================================================
```

### Banner rendering rules

- **Line count cap: 40 on first-run.** The returning-builder banner is typically shorter (no sub-description block).
- **No ANSI colors** when `NO_COLOR` is set or when not in a TTY. Colors are nice-to-have, not load-bearing.
- **Width**: default 80 columns; may expand to `process.stdout.columns` when larger. Never exceed terminal width (would wrap and break the frame).
- **Persona adapts the opening line and the next-step question only.** The subcommand list stays neutral across all personas so the grid is consistent.
- **Experience-level adapts verbosity of the sub-descriptions.** For `first-time` / `beginner`: keep the plain-English descriptions. For `experienced`: compress to terse one-liners. For `intermediate`: balanced (the default shown above).

### Opening-line examples per persona (first-run)

| Persona | Opening line |
|---------|--------------|
| `professor` | *"Welcome — let's have a look at what your app needs. Here's what Vibe Test does and where we can start."* |
| `cohort` | *"Hey — let's figure out what this app needs. Here's the menu."* |
| `superdev` | *"Vibe Test v<VERSION>. Six commands below. Start where you need to."* |
| `architect` | *"Vibe Test — classification-first test auditor. Here's the command surface."* |
| `coach` | *"Good to see you. Let's get your app tested — here's what's available."* |
| `null` (default) | *"Vibe Test v<VERSION> — here's what's available."* |

### Next-step question examples (first-run)

Always **open-ended**. Never multiple-choice.

| Persona | Next-step question |
|---------|--------------------|
| `professor` | *"Most builders start with `/vibe-test:audit` — it reads your code and tells you what matters. Want to go there, or is there another angle you're curious about?"* |
| `cohort` | *"Most of the time the natural first move is `/vibe-test:audit`. Does that fit, or you thinking somewhere else?"* |
| `superdev` | *"Where do you want to start?"* |
| `architect` | *"Natural first step is `/vibe-test:audit` — scan + classification + gap analysis. Diverge if you've already got one of those."* |
| `coach` | *"The easiest place to start is `/vibe-test:audit` — want me to walk you there?"* |
| `null` (default) | *"Where do you want to start?"* |

### Next-step question examples (returning-builder)

Suggest the natural-next-step in the flow based on last command:
- After `audit` → suggest `generate`
- After `generate` → suggest `gate` (or `posture` for read-only)
- After `gate` → suggest `audit` (re-audit) or `generate` (close remaining gaps)
- After `posture` → suggest whatever the posture summary pointed to
- After `coverage` → suggest `gate`
- After `fix` → suggest re-running `gate` or `audit`

Phrasing stays a question: *"Ready to generate for the frontend gap? Or check posture first?"* — pick one, ask open-ended.

## Step 7 — Handoff Line

End with the persona-adapted handoff line per [guide > "Handoff Language Rules"](../guide/SKILL.md#handoff-language-rules). For the router the handoff line IS the next-step question — you don't need a separate "run `/<next>` when ready" closing. The question embeds the handoff naturally.

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts; the obsolete `/clear, then run` pattern is explicitly disallowed.

## Step 8 — Session Logger: Terminal Entry

After the banner renders and before returning control to the user, invoke session-logger `end`:

```
{
  sessionUUID: <from step 2>,
  command: 'router',
  outcome: 'completed',
  key_decisions: [
    <optional: "first-run detected" | "returning-builder detected">,
    <optional: "version resolved via installed_plugins.json" | "via active-path.json" | "via plugin.json" | "unresolved">,
  ],
  complements_invoked: [<anchored names with available:true>],
  artifact_generated: null,
}
```

Session-log write failures are swallowed by the state-layer helper — instrumentation never blocks command completion.

## Performance Budget

**First-run banner: ≤10 seconds.** Achievable comfortably because:

- No file scanning beyond 4 small JSON reads (`installed_plugins.json`, `active-path.json`, `plugin.json`, optionally `.vibe-test/state.json`).
- No AST parsing.
- No network calls.
- No coverage runs.
- Session-log writes are append-only and non-blocking.

If you find yourself about to do a scan, classification, or coverage call from the router — stop. Those live in the other SKILLs.

## What the Router is NOT

- Not a classifier. Classification lives in `skills/audit/SKILL.md`.
- Not a generator. Generation lives in `skills/generate/SKILL.md`.
- Not a state-writer beyond the session log. The router does not create `.vibe-test/state.json` — `audit` creates that.
- Not a nagger. Missing profile is not an error; missing state is not an error; unknown version is not an error. Degrade gracefully, never block.
- Not a teacher of jargon. For `first-time` / `beginner` levels, the subcommand descriptions above are already plain English. Keep it that way; the deep definitions come when the user actually runs `audit`.

## Friction Triggers

The router is a friction-light SKILL. The one documented trigger:

- **Abandoned-router detection** — if a sentinel for `command='router'` exists in today's sessions file with no paired terminal entry and the sentinel is >24h old, friction-logger's `detect_orphans()` pairs it as `friction_type: "command_abandoned"`. Router invokes `detect_orphans()` once at first-run-of-the-day. Full contract in [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md).

## Why This SKILL Exists

The bare `/vibe-test` command is the zero-pressure introduction. A builder who lands here for the first time should:

1. See what the plugin is in under 10 seconds.
2. See the 6 commands in plain language (not jargon-laden one-liners).
3. Get invited to pick a next step — not funnel-forced into one.

A returning builder should:

1. See what they ran last (when and what happened).
2. See the natural next step, offered as a question.

The router implements Pattern #15 (version resolution) and Pattern #16 (prereq shaping) as its primary jobs. Everything else is the welcome.

`/vibe-test` should feel like typing `git status` — a quick, read-only check of where you are, with a clear sense of what you could do next.
