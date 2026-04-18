---
name: gate
description: "This skill should be used when the user says `/vibe-test:gate`. The single pass/fail for tier enforcement — runs audit + coverage (reusing fresh state when available), applies tier threshold via the locked weighted-score formula, and exits with 0 (pass) / 1 (threshold breach) / 2 (tool error). Auto-detects CI mode via `GITHUB_ACTIONS=true` or `--ci` flag and emits `::error::` / `::warning::` annotations + writes GitHub Actions summary markdown to `$GITHUB_STEP_SUMMARY`. In local mode: a diagnostic banner with 'what would it take to pass' guidance. Co-invokes `superpowers:verification-before-completion` when present for verification-frame decisions."
argument-hint: "[--ci] [--dry-run]"
---

# gate — Tier-Threshold Pass/Fail

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

Gate is the decision surface. Every other Vibe Test command measures, proposes, or repairs; gate *decides*. A builder who runs `/vibe-test:gate` is asking *"given this repo's app type + tier + current coverage — does it clear the bar, yes or no?"*. The answer is a single exit code: 0 for pass, 1 for threshold breach, 2 for tool error. In CI mode the same logic emits GitHub Actions annotations; in local mode it renders a diagnostic banner with concrete "what would it take to pass" guidance.

## What This Command Does, In One Sentence

Run audit (or reuse fresh state) → run coverage (or reuse fresh state) → apply tier threshold → emit three views → exit 0 / 1 / 2 based on the verdict.

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Tier known** — either via a fresh audit-state OR explicit `--tier <tier>` flag. If neither, attempt a fast inline classification via `scan()` + `classifyAppType()` (Pattern #16 shaping prereq — see Step 3 below). If even that fails (no framework detected, empty repo):
  > *"I can't determine your app type — gate needs a tier to apply the threshold against. Run `/vibe-test:audit` first, or pass `--tier <prototype|internal|public-facing|customer-facing-saas|regulated>` explicitly."*
  >
  > Wait. Never guess tier silently for a pass/fail verdict.

### Shaping prereqs (Pattern #16 — adapts silently)

- **Fresh audit state** — if `<repo>/.vibe-test/state/audit.json` exists and its `last_updated` is within the last 24 hours, reuse it. Otherwise scan + classify inline (~3s).
- **Fresh coverage state** — if `<repo>/.vibe-test/state/coverage.json` exists and its `measured_at` is within the last 1 hour AND it's from the current HEAD commit, reuse it. Otherwise run coverage inline.
- **CI mode auto-detect** — `process.env.GITHUB_ACTIONS === 'true'` OR `--ci` flag. CI mode changes output format (annotations instead of banner), not logic.
- **`--dry-run`** — available for hook-chained local runs. Computes + renders everything but exits 0 regardless of verdict. The `would_exit` field in the JSON sidecar carries the actual verdict the real run would have produced.

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) section "gate". You read `audit.json`, `coverage.json`, `covered-surfaces.json`. You write a `gate.json` summary sidecar at `<repo>/.vibe-test/state/gate.json`.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). Entries with `applies_to: gate` are `superpowers:verification-before-completion` (co-invoke for verification-frame decisions).
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:gate` section.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('gate', project)` at entry, `end({sessionUUID, command: 'gate', outcome})` at exit.

## Primitive surface

All existing `src/` modules — no new TypeScript introduced:

- **`src/coverage/computeWeightedScore` / `TIER_THRESHOLDS`** — the locked formula.
- **`src/coverage/runCoverage`** — for inline coverage runs when state is stale.
- **`src/scanner/scan`, `classifyAppType`, `classifyModifiers`** — for inline classification when audit-state is stale or absent.
- **`src/state/project-state`** — `readProjectState`, `projectStateSidecarPath`, `scopeHash`.
- **`src/state/atomic-write`** — for the `gate.json` sidecar write.
- **`src/state/session-log` / `beacons`** — instrumentation.
- **`src/reporter`** — `createReportObject`, three renderers, `getLanguageKnobs`.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('gate', project_basename)`. Hold the returned `sessionUUID` in memory until Step 8.
3. Detect CI mode: `const ci = process.env.GITHUB_ACTIONS === 'true' || argsHave('--ci')`. Hold this flag for the rest of the flow.
4. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation) — suppress in CI mode (annotations are the only stdout).

### Step 1 — Pattern #13 announcement (anchored complements)

Parse [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) via `loadAnchoredRegistry()`. Filter to entries whose `applies_to` includes `gate`.

- **`superpowers:verification-before-completion`** — announce verbatim when present: *"verification-before-completion owns per-task 'is this complete?' decisions. Gate owns the tier-threshold call. When we're both in scope, we co-invoke — no double verification."* (Ga3 — gate owns tier-threshold; discipline skill owns per-task completion.)

Surface at most ONE anchored complement announcement per invocation. In CI mode, compress to a single `::notice::` line.

### Step 2 — Resolve state (fresh or generate)

#### 2a — Audit state (Ga1 — Pattern #16 shaping prereq)

1. Try to read `<repo>/.vibe-test/state/audit.json`. If present AND `last_updated` is within 24h:
   - Extract `classification.app_type`, `classification.tier`, `classification.modifiers`, `classification.confidence`.
   - Record `audit_state_source: 'reused'`.
2. If absent or stale:
   - Invoke `scan(repoRoot)` → Inventory.
   - Invoke `classifyAppType({detection, routes, models, componentCount})` + `classifyModifiers(...)`.
   - Tier — use `--tier` flag if passed; otherwise default to a conservative `public-facing` with a warning in the banner. Log `friction_type: "default_tier_applied"` at confidence `low`.
   - Record `audit_state_source: 'fresh-scan'`.

Attach the resulting classification to the ReportObject.

#### 2b — Coverage state (Ga1 — Pattern #16 shaping prereq)

1. Try to read `<repo>/.vibe-test/state/coverage.json`. If present AND `measured_at` is within 1h AND commit_hash matches current HEAD:
   - Extract `per_level`, `weighted_score`, `denominator_honest`.
   - Record `coverage_state_source: 'reused'`.
2. If absent or stale:
   - Invoke `runCoverage({framework, cwd, adapterAccepted: <cached decline or null>, actualSourceFiles, c8TestCommand})` with the builder's most recent adapter decision (read from `.vibe-test/state.json.coverage_adapter_declined`). Do NOT prompt for adaptation in gate mode — gate is the decision surface, not the measurement surface. If the adapter has never been proposed, fall back to `c8 --all`.
   - Parse `per_level` from output (Tessl-deferred if present).
   - Record `coverage_state_source: 'fresh-run'`.
3. If coverage fails outright (child process error): exit 2 ("tool error") with a clear message. Do NOT conflate tool errors with threshold breaches.

### Step 3 — Apply weighted-score formula (Ga1)

Call `computeWeightedScore({perLevel, applicability, tier})` using:

- `perLevel` from the coverage state (Step 2b).
- `applicability` from the classification matrix for the audit's `app_type` (audit-state contributes this when reused; inline classification rebuilds it).
- `tier` from the audit-state's `classification.tier`.

The result: `{score, threshold, passes, contributions}`.

The verdict is a function of `passes`:

| Verdict | Exit code | Stdout (CI mode) | Banner (local mode) |
|---------|-----------|------------------|---------------------|
| `passes === true` | **0** | `::notice::Vibe Test gate passed — {score} ≥ {threshold} ({tier})` | Green PASS section with score + threshold + tier |
| `passes === false` | **1** | `::error::Vibe Test gate failed — {score} < {threshold} ({tier})` | Red BELOW section + "what would it take to pass" prescription |
| Tool error (coverage failed / tier undetectable / classification crash) | **2** | `::error::Vibe Test gate tool error — {reason}` | Red "tool error" section + pointer to `/vibe-test:fix` |

If `--dry-run` was passed: compute the verdict, render banner, write `gate.json` with `would_exit: <code>`, then exit 0. The `would_exit` field is the real verdict.

### Step 4 — "What would it take to pass" guidance (Ga2 — local mode only)

When `passes === false` AND not in CI mode, compose concrete guidance. For each test level where `applicability[level] === true`:

1. Compute the marginal contribution to the weighted score if this level's coverage rose to 100% (pure function — walk the formula).
2. Sort levels by *highest marginal contribution per effort unit*. Effort heuristic: `smoke` is cheapest (high component count × low per-test cost); `integration` is costliest.
3. Surface the top 3 levels with the exact math:
   > *"To clear the {tier} threshold ({threshold}), you need +{delta} weighted points. The cheapest path:*
   > *- Raise smoke coverage from {current}% → {target}% (+{contribution} pts)*
   > *- Raise behavioral coverage from {current}% → {target}% (+{contribution} pts)*
   > *- …"*

This mirrors the audit's gap ranking but from the threshold's perspective. Close the gap → clear the threshold.

In CI mode, collapse this to a single `::warning::` annotation per level with the math inline.

### Step 5 — Pattern #13 co-invoke: verification-before-completion (Ga3)

When `superpowers:verification-before-completion` is in the agent's available-skills list AND the verdict is PASS:

- Announce the co-invoke:
  > *"Gate says this passes the {tier} threshold. Handing off to superpowers:verification-before-completion for the per-task 'is this actually complete?' check — gate owns tier-threshold; that skill owns task-completion."*
- Gate owns the tier-threshold call; discipline skill owns per-task "is this complete?" — explicitly **no double verification**.
- When `verification-before-completion` is absent: skip the co-invoke; the builder can always re-run `/vibe-test:audit` if they want a fresh gap list.

When the verdict is FAIL or tool error: do NOT co-invoke — the work isn't complete and verification would waste the discipline skill's cycles.

Record the co-invoke as `complements_invoked` on the terminal session entry.

### Step 6 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'gate', plugin_version, repo_root, scope, commit_hash})`. Populate:

- `classification` — from Step 2a.
- `score` — `{current: score, target: threshold, per_level}` from Step 3.
- `findings` — threshold-breach finding (severity: high, category: `gap-<weakest-level>`) if FAIL; tool-error finding (severity: critical, category: `harness-break`) if exit 2.
- `actions_taken` — `{kind: 'other', description: 'tier threshold evaluated', target: '<tier>'}`.
- `deferrals` — any Pattern #13 matches from Step 1.
- `handoff_artifacts` — `['docs/vibe-test/gate-<ISO>.md', '.vibe-test/state/gate.json']`.
- `next_step_hint` — persona-adapted. Default on PASS: *"Gate passed. Ship it."*. Default on FAIL: *"Run `/vibe-test:generate` to close the gaps. Re-run `/vibe-test:gate` after."*

Render views — mode-dependent:

**Local mode:**
- `renderMarkdown(report, {proseSlots})` → `docs/vibe-test/gate-<ISO-date>.md`.
- `renderBanner(report, {columns, disableColors: !isTty})` → printed to chat.
- `renderJson({report, repoRoot})` → `.vibe-test/state/gate.json` (skip schema validation — no `gate-state.schema.json` in v0.2; use `skipValidation: true`).

**CI mode:**
- Write GitHub Actions summary markdown to `$GITHUB_STEP_SUMMARY` file when the env var is set. Use the same markdown body as the local-mode render.
- Emit `::notice::` / `::warning::` / `::error::` annotation prefixes to stdout instead of the banner. One annotation per finding (severity maps: critical|high → `::error::`, medium → `::warning::`, low|info → `::notice::`).
- Still write `.vibe-test/state/gate.json` — CI systems consume this for downstream gating beyond GitHub Actions.

### Step 7 — State writes

1. **`session-logger.end({sessionUUID, command: 'gate', outcome: 'completed' | 'errored', key_decisions: [<verdict>, <sources: audit/coverage reused vs fresh>], complements_invoked, artifact_generated})`** — terminal entry. `outcome` is `'completed'` for exit 0/1 and `'errored'` for exit 2.
2. **`beacons.append(repoRoot, {command: 'gate', sessionUUID, outcome: <as above>, hint: '<verdict>: {score}/{threshold} ({tier})'})`** — Pattern #12.
3. **`gate.json`** at `<repo>/.vibe-test/state/gate.json`. Fields: `schema_version: 1`, `last_updated`, `plugin_version`, `project`, `verdict: 'pass' | 'fail' | 'tool-error'`, `exit_code: 0 | 1 | 2`, `would_exit: 0 | 1 | 2` (only under `--dry-run`), `score`, `threshold`, `tier`, `audit_state_source`, `coverage_state_source`, `ci_mode: boolean`.

On any state-write failure: log a `runtime_hook_failure` friction entry and continue — the exit code has already decided; logging is instrumentation.

### Step 8 — Exit

Exit with the verdict-derived code. For `--dry-run`: exit 0 regardless (per the contract above). Never exit with any other code (3+).

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts.

## Tier-Adaptive Language

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Verdict framing | Plain-English + threshold math in words | One-line verdict + math | Verdict + exit code + math |
| "What would it take" guidance | Full table + effort glosses + analogy | Compressed table | Top 1 level + delta |
| CI annotation verbosity | Same as intermediate (annotations have no tier knob — CI consumers read structured output) | Same | Same |

JSON output is **level-invariant**.

## Friction Logging

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Default tier applied (no audit-state, no --tier) | `default_tier_applied` | `low` |
| Coverage run crashed (tool error → exit 2) | `harness_break` | `high` |
| Builder overrides verdict via `--force` (not v0.2; reserved for v0.3) | `verdict_overridden` | `medium` |
| Builder declines a Pattern #13 complement offer | `complement_rejected` | `high` |

When in doubt, don't log.

## What the Gate SKILL is NOT

- Not an auditor. Gate reuses audit-state when fresh; if stale, it does a lightweight inline scan — not a full audit flow.
- Not a coverage command. Gate reuses coverage-state when fresh; if stale, it runs coverage non-interactively (no adapter prompt).
- Not a fixer. Gate exits 2 on tool errors and points at `/vibe-test:fix`; it does not attempt repair.
- Not a verifier. `superpowers:verification-before-completion` owns per-task completion checks; gate owns tier-threshold verdicts. Explicitly no double verification.
- Not a gate for individual tests. Exit codes reflect the tier-threshold verdict, not whether any individual test passed or failed.

## Why This SKILL Exists

CI pipelines need a single source of truth for pass/fail. Gate is that source. Exit 0 for pass, 1 for threshold breach, 2 for tool error — no ambiguity, no stacking of "warnings" that nobody reads. The `passes_tier_threshold` flag in coverage.json is the same logic; gate is the command-line ergonomics around it.

Local mode adds the "what would it take to pass" prescription because a verdict is only half the value — the other half is knowing the cheapest path to clear the bar. The weighted-score formula is a pure function of per-level coverage × level weight × tier applicability; the delta analysis is the same formula in reverse.

CI mode collapses to GitHub Actions annotations because that's the ergonomics CI consumers expect. The structured `.vibe-test/state/gate.json` is the durable record; annotations are the in-PR surface.

Pattern #13 co-invoke with `verification-before-completion` is about composition boundaries. Gate is not a completion check — it's a quality gate. Verification-before-completion is a per-task discipline. Both are valuable; neither subsumes the other. The SKILL announces the boundary and defers cleanly.
