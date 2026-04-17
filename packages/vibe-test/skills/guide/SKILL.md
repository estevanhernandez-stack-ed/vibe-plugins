---
name: guide
description: "Shared behavior for Vibe Test commands — persona adaptation, experience-level language adaptation, classification matrix, Pattern #13 deferrals, dynamic discovery rules. Referenced by every command SKILL."
---

# guide — Shared Behavior for Vibe Test

Internal SKILL. Not a user-invocable slash command. Every Vibe Test command SKILL (`router`, `audit`, `generate`, `fix`, `coverage`, `gate`, `posture`) loads this SKILL at its "Before You Start" step to adopt the house voice, the classification frame, and the composition rules.

If you are a command SKILL that says *"follow `skills/guide/SKILL.md` for persona, experience, and composition rules"*, this is that file.

## Catalog-Wide Invariants

1. **The user is the final arbiter of self-evolution.** Classification, generation, adaptation — all of it is a negotiation, never a decree.
2. **Builder-sustainable handoffs.** Every artifact Vibe Test leaves on disk must continue to work if the plugin is uninstalled tomorrow. No imports, no magic. Patterns, not dependencies.
3. **Work from the future.** Surface what the tier *would need* to ship safely, even when current work is ahead of that bar. A gap acknowledged is not a gap enforced.
4. **F2 above all.** If the harness is broken — missing binary, cherry-picked denominator, forks-pool timeout — say so before anything else. A pretty score on a broken harness is worse than no score.

## Where Shared Context Lives

- **Data contracts:** [`references/data-contracts.md`](./references/data-contracts.md) — every state file, who writes, who reads, when, schema version.
- **Plays well with (Pattern #13 anchored):** [`references/plays-well-with.md`](./references/plays-well-with.md) — the 7 complement entries with deferral contracts.
- **Friction triggers:** [`references/friction-triggers.md`](./references/friction-triggers.md) — per-command trigger contracts. Every command SKILL's "Friction Logging" section mirrors a row here.
- **Schemas:** [`schemas/`](./schemas/) — JSON Schema Draft-07 for every state file.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Patterns #4, #6, #10, #12, #13, #14, #15, #16.

## Persona Adaptation

Read `shared.preferences.persona` from `~/.claude/profiles/builder.json`. Six supported personas; one is the system default. Every command SKILL applies the persona to its *opening line* and its *handoff line* — the body stays neutral so banners and reports render consistently across voices.

| Persona | Opening register | Handoff register | Command-level hint |
|---------|------------------|------------------|--------------------|
| `professor` | Explanatory, multi-clause, offers reasoning for choices. "Here's what the scanner found, and why the classifier landed on *public-facing*." | "When you're ready, run `/vibe-test:generate` — it will pick up this audit's scope." | Errs toward *showing the work*. Expands rationale sections. |
| `cohort` | Peer tone, first-person plural, inclusive pacing. "Let's see what the audit caught." | "Run `/vibe-test:generate` next — we'll work through the gaps together." | Errs toward co-authoring language ("we", "let's"). |
| `superdev` | Terse, bias-to-action, zero ceremony. "Audit: 3 findings, 1 harness break." | "Run `/vibe-test:generate`." | Compresses every surface. No narrative unless load-bearing. |
| `architect` | Systems-first, names patterns explicitly, surfaces tradeoffs. "Classification: public-facing — tier threshold 70, current weighted 27.5." | "Run `/vibe-test:generate` to close the frontend gap under this tier." | Names patterns (#13 deferral, F2 harness-break) inline. |
| `coach` | Warm, encouragement-forward, next-action-first. "Nice — here's what we learned." | "When you're ready, run `/vibe-test:generate` and I'll walk through the gaps." | Errs toward *what's next* over *what just happened*. |
| `null` (system default) | Neutral, short, professional. "Audit complete." | "Run `/vibe-test:generate` when ready." | Default when persona is unset. |

**One-line rule:** the opening line is never more than one sentence. The handoff line is never more than one sentence. If you need more, put it in the body.

## Mode Adaptation

Read `shared.preferences.pacing` (Vibe Cart calls this `mode`). Two values matter for Vibe Test:

- **`learner`** — SKILL prompts for confirmation at non-trivial forks (tier disambiguation, coverage adaptation, auto-write threshold). Wraps rationale around each decision.
- **`builder`** — SKILL takes the highest-confidence default and announces it inline. Only prompts when confidence is genuinely below threshold.

When `mode` is unset: default to `builder` in CI/CLI contexts (`GITHUB_ACTIONS=true` or TTY-less), default to `learner` in first-run plugin contexts (`.vibe-test/state.json` absent).

## Experience-Level Language Adaptation (SE7)

Read `plugins.vibe-test.testing_experience` (fallback: `shared.technical_experience.level`). Four supported levels. `src/reporter/tier-adaptive-language.ts` returns the config knobs; this table is the contract.

| Level | Verbosity | Technical details | Details expansion | Language register |
|-------|-----------|-------------------|--------------------|-------------------|
| `first-time` | plain | hidden | never | Plain English. "We scan your code and look at which tests exist." No jargon without a definition in-line. |
| `beginner` | plain | summary only | on request | Plain English with one-sentence definitions for terms like *coverage*, *harness*, *assertion*. |
| `intermediate` | balanced | shown inline | collapsible | Hybrid: technical terms used freely, but one-sentence gloss on the first use of a term like *forks-pool timeout* or *cherry-picked denominator*. |
| `experienced` | terse | shown inline | expanded | Dense technical prose. No gloss. Uses pattern names (#13, F2) without expansion. |

**Per-invocation overrides:**
- `--verbose` → bump one level toward `first-time` (show more).
- `--terse` → bump one level toward `experienced` (show less).

Apply the level to **every user-facing surface** — banner, markdown, SKILL prompts, inline messages, findings rationale. The JSON renderer is level-invariant (machines don't care).

**Applied to dual-audience cases:** when a command writes to both CI stdout (machine-read) and terminal (human-read), the CI view stays terse-neutral regardless of level; only the human view adapts.

## Classification Matrix

Read `framework.md` (monorepo root) for the full matrix; the condensed reference lives here so command SKILLs don't need to re-load the framework doc.

**6 app types** × **5 tiers** × context modifiers.

### App types (deterministic rule match)

| app_type | Detection heuristic |
|----------|---------------------|
| `static` | No server code, no SPA framework. Flat HTML/CSS/JS. |
| `spa` | React/Vue/Svelte/etc., no detected API routes. |
| `spa-api` | SPA + one API surface (Express/Fastify/Next API routes/Hono). |
| `full-stack-db` | `spa-api` + database layer (Prisma/Drizzle/raw pg/mysql). |
| `api-service` | Server code with routes, no UI layer. |
| `multi-tenant-saas` | `full-stack-db` + auth + tenant boundary (RLS hints, org scope, user_id plumbing in routes). |

### Tiers (fuzzy — SKILL may prompt)

| Tier | Score target | Signals |
|------|--------------|---------|
| `prototype` | ≥40 | Personal scratch, no deploy target, no secrets, README says "WIP" / "experiment". |
| `internal` | ≥55 | Internal tool, team <10, no external users, deployed but auth-gated. |
| `public-facing` | ≥70 | Public URL, organic users, no PII beyond basic. |
| `customer-facing-saas` | ≥85 | Paid users, billing, uptime commitments. |
| `regulated` | ≥95 | HIPAA / SOC2 / financial / healthcare / government. |

### Context modifiers

`customer-facing`, `b2b`, `internal-only`, `auth-required`, `pii-present`, `payment-flow`, `file-uploads`, `realtime`, `offline-capable`.

The classifier applies deterministic rules where it can and prompts the builder when the signal is genuinely ambiguous (A1). When it prompts, the question format is *"Looks like public-facing based on [signals] — still match?"* — never *"What tier is this?"*. Confidence starts at 0.9 for clean matches, degrades to 0.6 for mixed-stack splits (A8).

### Weighted score formula

See `src/coverage/weighted-score.ts` for the locked formula. The classifier and gate share the same pure function — identical input, identical output. No inference drift allowed between the two call sites.

## Pattern #13 — Ecosystem Composition

Two modes of composition, both surfaced at most **once per command invocation**.

### Anchored complements (deterministic)

Parse [`references/plays-well-with.md`](./references/plays-well-with.md). For each entry whose `applies_to` array includes the current command, announce the deferral at the appropriate phase. Each entry declares its own `deferral_contract` — follow it verbatim.

Anchored announcements are allowed to co-exist with dynamic discovery in the same invocation, but only one of each kind per invocation.

### Dynamic discovery (heuristic)

Scan the agent's available-skills list at command entry. Apply the heuristic:

- Pattern match: skill name matches `*test*` / `*tdd*` / `*verify*` / `*coverage*` / `*playwright*` / `*mock*` / `*fixture*`.
- Gate: current command ∈ `{generate, gate}` (other commands don't suggest).
- Gate: skill is **not** already in the anchored registry.
- Gate: confidence is high — the skill's description explicitly references testing or verification.

If all gates pass, surface **at most one** suggestion per command invocation. Format:

> *"Noticed `<skill-name>` in your available skills — it may complement this step. Want me to defer that part to it?"*

Conservative threshold applies: **when in doubt, don't suggest**. False positives damage trust faster than false negatives cost opportunity.

**Never persist discovered skills.** Dynamic discovery is runtime-context-only. The anchored registry is the persisted source of truth.

## Session Memory Interfaces

Every command SKILL wraps its run with these calls. All four interfaces are SKILL-level; the state-layer TypeScript under `src/state/` is invoked via the file tools / `node -e` patterns the SKILLs describe.

### session-logger

[`../session-logger/SKILL.md`](../session-logger/SKILL.md)

- `start(command, project_dir)` → sessionUUID. Called at command entry, after persona read, before any user-facing output.
- `end(entry)` → terminal append. Called at command exit, after persona-adapted handoff line.
- The same sessionUUID threads through every friction / wins / beacon entry emitted during the run.

### friction-logger

[`../friction-logger/SKILL.md`](../friction-logger/SKILL.md)

- `log(entry)` → appends to `~/.claude/plugins/data/vibe-test/friction.jsonl`. Called at the trigger points listed in [`references/friction-triggers.md`](./references/friction-triggers.md).
- `detect_orphans()` → catches sentinels without a terminal past 24h. Router owns the invocation (once at first-run-of-the-day).
- Defensive default: when in doubt, don't log. False positives poison `/evolve`.

### wins-logger

[`../wins-logger/SKILL.md`](../wins-logger/SKILL.md)

- `log(entry)` → appends to `~/.claude/plugins/data/vibe-test/wins.jsonl`.
- Three capture techniques (Pattern #14):
  1. Absence-of-friction inference (applied by `/evolve` at aggregation time, not inline).
  2. Explicit success markers — unambiguous positive reaction from the builder.
  3. External validation — cold-load success, testimonial, shared screenshot.
- Conservative threshold: never auto-inferred from a single signal. The SKILL enforces the guardrails; the state layer is the dumb write path.

### decay

[`../decay/SKILL.md`](../decay/SKILL.md)

- `check_decay()` → returns the highest-priority stale field path, or `null`.
- `stamp(field_path)` → refreshes `last_confirmed` for a decay-eligible field.
- Router invokes `check_decay()` at first-run-of-the-day; each command invokes `stamp()` when the user implicitly or explicitly re-confirms a preference.

## Handoff Language Rules

Every command ends with a **natural-language handoff line** in the persona voice of the moment. The format is:

> *"Run `/<next-command>` when ready"*

or any paraphrase that keeps the same structure: **imperative verb + backticked command + "when ready"**.

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts the conversation as context fills — the system prompt explicitly states the conversation is not limited by the context window. The `/clear`-between-commands pattern is obsolete guidance that predates auto-compaction. Every Vibe Test command SKILL uses the "run `/<next>` when ready" phrasing and never the "`/clear`, then run" variant.

Rationale is in `C:\Users\estev\.claude\projects\C--Users-estev-Projects-vibe-test\memory\feedback_no_manual_clear.md` — this is a user-tested correction.

## Version Resolution (Pattern #15)

Every command resolves its running version via:

1. Read `~/.claude/plugins/installed_plugins.json` — this is the canonical source for Claude Code.
2. If unavailable or doesn't list `vibe-test`, fall back to `.claude-plugin/active-path.json` in the plugin root.
3. If both fail, fall back to `plugin.json`'s `version` field.
4. If all three fail, use the literal string `"unknown"`.

`RESOLVE.md` at the plugin root is the human-readable walkthrough of this resolution. The SKILL never asks the user — resolution is fully deterministic.

## Prereq Shaping (Pattern #16)

Two kinds of prereqs:

- **Blocking prereqs** — the command genuinely can't run without them. Example: `/vibe-test:generate` without prior audit state for the current scope. Present as a gentle block: *"Need an audit first. Want me to run `/vibe-test:audit` now, or will you scope manually?"*
- **Shaping prereqs** — the command runs either way but branches based on state. Example: returning-vs-first-run detection in `/vibe-test` router. Present as an invisible branch — the banner adapts; the user never sees the detection logic.

The distinction matters because blocking prereqs carry an explicit user confirmation step; shaping prereqs never do.

## What the Guide SKILL is *NOT*

- Not a classifier. The classifier logic lives in `skills/audit/SKILL.md` and `src/coverage/weighted-score.ts`.
- Not a generator. Generation lives in `skills/generate/SKILL.md` and `src/generator/`.
- Not a renderer. Rendering lives in `src/reporter/`.
- Not a state writer. State writes go through `src/state/` via the internal SKILLs above.

This SKILL is the shared vocabulary: persona, experience, composition rules, handoff phrasing. Every command loads it; none of them modify it mid-run.

## Why This SKILL Exists

Every Vibe Test command needs the same five things at entry: persona, experience level, mode, composition surface, session memory handles. Without a shared guide, each command would re-implement those lookups with drift. The guide is the seam where consistency is enforced — once, here, and then every command references it.

Pattern #13 (composition), Pattern #4 (decay), Pattern #6 (friction), Pattern #14 (wins), Pattern #15 (version resolution), Pattern #16 (prereq shaping) all flow through this file. Touching any of them means touching the guide first.
