---
name: coverage
description: "This skill should be used when the user says `/vibe-test:coverage`. Standalone honest-denominator coverage measurement with builder-facing adaptation-prompt UX. Detects the test framework, proposes the diff to add `--coverage.all` (vitest) or `--collectCoverageFrom` glob (jest); only applies on builder opt-in. Falls back to `c8 --all` when adaptation is refused. Defers raw coverage parsing to `tessl:analyzing-test-coverage` when present. Emits a CI-friendly JSON sidecar at `.vibe-test/state/coverage.json` for machine consumers; exits 0 regardless of threshold (gate decides pass/fail)."
argument-hint: "[--path <glob>]"
---

# coverage — Honest-Denominator Measurement

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

Coverage is the standalone measurement surface. A builder who runs `/vibe-test:coverage` is asking *"what does this repo actually cover, honestly?"* The command's flagship claim — honesty — is operationalized two ways: (1) the denominator matches the actual source tree, not just files the tests happened to import; (2) the builder, not the SKILL, chooses whether to mutate their test command. The SKILL proposes the diff, explains the cost, and applies only on opt-in.

## What This Command Does, In One Sentence

Detect framework → propose adaptation diff → apply on opt-in or fall back to `c8 --all` → run coverage → compute weighted score per level → emit three views (markdown / banner / JSON sidecar) → exit 0 regardless of threshold (gate decides pass/fail).

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Test framework detectable** — the current directory must contain a `package.json` with a test runner in `dependencies` / `devDependencies` (vitest, jest, mocha) OR a framework config file (`vitest.config.*`, `jest.config.*`). If none:
  > *"I don't see vitest, jest, or mocha in this repo. Coverage needs a test runner to measure against. Want to install one, or point me at a subdirectory that has one?"*
  >
  > Wait for the builder's decision. Never measure "coverage" without a runner.

### Shaping prereqs (Pattern #16 — adapts silently)

- **Scope** — if `--path <glob>` is passed, narrow the source-file denominator to files matching the glob. Scoped coverage writes to `.vibe-test/state/coverage-<scope-hash>.json` to avoid clobbering full-repo state.
- **Prior audit** — if `audit.json` (or `audit-<hash>.json`) exists, use its `inventory.scanned_files` as the denominator's source-of-truth. Without prior audit, scan live via `src/scanner/scan()` — takes 1-3s on most repos.
- **Builder has opted out of adaptation before** — check `.vibe-test/state.json` for a cached decline; if present, skip the proposal and go straight to `c8 --all` fallback.

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) section "coverage-state". You own writes to `<repo>/.vibe-test/state/coverage.json` (and scoped variant) + its history copy. You read `audit.json` for source-file list when present.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). Entries with `applies_to: coverage` are `tessl:analyzing-test-coverage` (raw parsing deferral).
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:coverage` section.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('coverage', project)` at entry, `end({sessionUUID, command: 'coverage', outcome})` at exit.

## Primitive surface

Import surface (all existing `src/` modules — no new TypeScript introduced):

- **`src/coverage/runCoverage`** — orchestrates adapter proposal → adapter apply or c8 fallback → denominator-honesty check.
- **`src/coverage/computeWeightedScore` / `TIER_THRESHOLDS` / `LEVEL_WEIGHTS`** — the locked formula.
- **`src/coverage/checkDenominator`** — cherry-picked denominator detection.
- **`src/coverage/proposeVitestCoverageAll` / `proposeJestCollectCoverageFrom`** — framework-specific proposals (exposed for direct use when coverage needs to show the diff separately from running).
- **`src/scanner/scan`** — for live-scanning when no cached inventory is present.
- **`src/scanner/framework-detector`** — detect the active test framework.
- **`src/state/project-state`** — audit-state reads, sidecar path resolution.
- **`src/state/session-log` / `beacons`** — instrumentation.
- **`src/reporter`** — `createReportObject`, three renderers, `getLanguageKnobs`.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('coverage', project_basename)`. Hold the returned `sessionUUID` in memory until Step 8.
3. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation).

### Step 1 — Blocking prereq check

Run the blocking prereq described above. If the check fails, render a gentle block and halt. Do NOT proceed; do invoke `session-logger.end({outcome: 'aborted'})`.

### Step 2 — Pattern #13 announcement (anchored complements)

Parse [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) via `loadAnchoredRegistry()`. Filter to entries whose `applies_to` includes `coverage`.

- **`tessl:analyzing-test-coverage`** — announce verbatim when present: *"Tessl's coverage skill owns raw coverage parsing — I'll defer the numbers to it and overlay tier-appropriate interpretation on top. You'll see the same per-level breakdown either way."* In practice, when Tessl is present: Vibe Test still runs the adapter / c8 fallback (we need the denominator-honesty check), but parsing the JSON reporter output is deferred — Tessl's output becomes the `per_level` source rather than our `parseC8Json()` fallback.

Surface at most ONE anchored complement announcement per invocation. Dynamic discovery is capped at one additional suggestion per the guide's heuristic table.

### Step 3 — Detect framework + current coverage command

1. Load the audit-state's `inventory` if present; otherwise invoke `scan(repoRoot, scopeGlob)` to build a fresh one (takes 1-3s).
2. From `inventory.detection.test`, pick the most-specific framework (`vitest` > `jest` > `mocha` > `c8-standalone`).
3. Find the existing coverage command. Priority:
   - `package.json` → `scripts["test:coverage"]`
   - `package.json` → `scripts["coverage"]`
   - `package.json` → `scripts["test"]` with `--coverage` already present
   - Fallback: reconstruct default (`vitest run --coverage` / `jest --coverage`)
4. Build `actualSourceFiles` from `inventory.scanned_files` filtered to testable sources (exclude `node_modules`, `dist`, test files themselves).

### Step 4 — Propose adaptation (never silent modification)

Call `runCoverage({framework, cwd, adapterAccepted: null, actualSourceFiles, c8TestCommand})`. With `adapterAccepted: null`, the helper returns the `adapter_proposal` (diff string + target file) but does not mutate anything and does not run c8 either.

**Adaptation-prompt UX (C1 — the flagship):**

Render the diff to the builder with tier-appropriate framing:

- **first-time / beginner:**
  > *"Your current coverage command measures only files that tests import — that's a cherry-picked denominator. Think of it like grading a test where you only answer questions you like: the score looks great, but it's measuring a different thing than you think. Here's a one-line change that adds `--coverage.all` so every source file ends up in the denominator:*
  > *`<diff block>`*
  > *Apply? [y/N]. If you skip it, I'll fall back to `c8 --all` for this run — same honest denominator, just measured out-of-band."*
- **intermediate:**
  > *"Coverage command is cherry-picked — denominator excludes unimported source files. Diff adds `--coverage.all` for vitest (or `collectCoverageFrom` glob for jest). `<diff block>` Apply? [y/N]."*
- **experienced:**
  > *"Adapter diff for honest denominator: `<diff block>`. [y/N]. Fallback: c8 --all."*

**Apply path:**
- Builder says `y` → re-invoke `runCoverage({..., adapterAccepted: true})`. The helper applies the proposal (mutating the target file atomically) and runs the adapted command via `c8TestCommand` or falls through to `c8 --all`.
- Builder says `n` → re-invoke `runCoverage({..., adapterAccepted: false})`. The helper falls through to `c8 --all` shelling `npx c8 --all --reporter json --reporter text <cmd>`. **Announce the extra run in the banner**: *"Declined adaptation — falling back to c8 --all for this run. The adapter diff is still available if you want to apply it later."*
- Log `friction_type: "coverage_adapter_refused"` at confidence `medium` when builder declines. Cache the decline in `.vibe-test/state.json.coverage_adapter_declined = true` so future runs skip the prompt silently (builder can clear by removing the key).

If coverage fails outright (child process crashes, command missing): attach a `harness-break` finding with `severity: critical` to the ReportObject and continue with a zeroed score — better to report honestly than fake numbers. Point the builder at `/vibe-test:fix` for the repair.

### Step 5 — Denominator honesty check (C1 — enforcement)

`coverage.denominator` from `runCoverage()` already carries `is_cherry_picked`. When `true` (ratio < 0.75 threshold):

- Emit finding: `category: 'cherry-picked-denominator'`, `severity: 'high'`, rationale naming reported-vs-actual count + list of `missing_files` (truncated to 10 for the banner).
- `example_pattern` shows the minimal-diff fix tailored to framework.

If `is_cherry_picked === false` but the builder declined adaptation earlier: note this in the banner as *"Denominator honest via c8 --all fallback — no config change applied."*. The adapter diff is stashed in the JSON sidecar for future reference.

### Step 6 — Compute weighted score + per-level breakdown

1. Parse the coverage output's per-level map:
   - If `tessl:analyzing-test-coverage` is present AND the builder authorized deferral → call into Tessl and use its per-level result.
   - Otherwise → fall back to v0.2 heuristic: assign all measured coverage to `smoke` + `behavioral` in equal split (finer attribution deferred to v0.3).
2. Load `applicability` per test level from the classification matrix for the audit's `app_type` — if no audit exists, default to `{smoke: true, behavioral: true, edge: true, integration: false, performance: false}`.
3. Call `computeWeightedScore({perLevel, applicability, tier})`. Use `audit.classification.tier` when available; otherwise `'public-facing'` as a conservative default.
4. Attach the full `WeightedScoreResult` (score + threshold + pass flag + contributions) to the ReportObject's `score` field.

The `score.per_level` rendered in the banner shows each level's raw coverage %, not the weighted contribution — the weighted value lives in the overall score.

### Step 7 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'coverage', plugin_version, repo_root, scope, commit_hash})`. Populate:

- `classification` — carry forward from audit-state if present; otherwise synthesize a minimal `{app_type: 'spa' | ..., tier: 'public-facing', modifiers: [], confidence: 0.5}` placeholder. The banner renders "classification pulled from audit" vs "default" in the dim section.
- `score` — from Step 6. Includes current + target + per-level.
- `findings` — cherry-picked-denominator finding if detected; harness-break finding if coverage failed to run.
- `actions_taken` — record what actually happened: `{kind: 'write', description: 'applied vitest coverage-all adapter', target: 'vitest.config.ts'}` OR `{kind: 'other', description: 'fell back to c8 --all', target: null}`.
- `deferrals` — the Pattern #13 matches from Step 2 (verbatim deferral_contract prose).
- `handoff_artifacts` — `['docs/vibe-test/coverage-<ISO>.md', '.vibe-test/state/coverage.json']`.
- `next_step_hint` — persona-adapted. Default: *"Run `/vibe-test:gate` when ready to check the tier threshold, or `/vibe-test:generate` to close gaps."*

Render three views in parallel:

- `renderMarkdown(report, {proseSlots})` → `docs/vibe-test/coverage-<ISO-date>.md`.
- `renderBanner(report, {columns, disableColors: !isTty})` → printed to chat.
- `renderJson({report, repoRoot})` → `.vibe-test/state/coverage.json` (scoped variant when `--path` set). **Schema-validated against `coverage-state.schema.json`**. This is the C3 machine-readable artifact — CI consumers read this file directly.

**Critical CI semantic (C3):** the JSON sidecar carries `passes_tier_threshold: boolean` but the coverage command itself exits 0 regardless of pass/fail. The gate command (`/vibe-test:gate`) owns the exit-code contract. Coverage is a measurement, not a decision.

### Step 8 — State writes

1. **`session-logger.end({sessionUUID, command: 'coverage', outcome: 'completed', key_decisions: [<adapter accepted/declined>, <denominator honest flag>], complements_invoked, artifact_generated})`** — terminal entry paired to Step 0.
2. **`beacons.append(repoRoot, {command: 'coverage', sessionUUID, outcome: 'completed', hint: '<score>/<threshold> - <pass|below>'})`** — Pattern #12.
3. **Update `.vibe-test/state.json`** — persist the adapter decline flag if builder said no; otherwise leave `coverage_adapter_declined` unset. Coverage does not touch classification / inventory / gap lists (audit owns those).

On any state-write failure: log a `runtime_hook_failure` friction entry and continue.

### Step 9 — Handoff line

Persona-adapted handoff line per [guide > "Handoff Language Rules"](../guide/SKILL.md#handoff-language-rules):

| Persona | Handoff line |
|---------|--------------|
| `professor` | *"When you're ready, run `/vibe-test:gate` for the tier-threshold check, or `/vibe-test:generate` if you want to close specific gaps first."* |
| `cohort` | *"`/vibe-test:gate` next for CI check, or `/vibe-test:generate` to close gaps."* |
| `superdev` | *"Run `/vibe-test:gate`."* |
| `architect` | *"`/vibe-test:gate` for the tier-threshold verdict. JSON sidecar at `.vibe-test/state/coverage.json` is CI-ready."* |
| `coach` | *"When you're ready, `/vibe-test:gate` will check whether this clears your tier threshold."* |
| `null` (default) | *"Run `/vibe-test:gate` when ready."* |

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts.

## Tier-Adaptive Language

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Adapter-prompt framing | Analogy + diff + "fallback is c8 --all" | 2-line explanation + diff | Diff + `[y/N]` + fallback reference |
| Per-level table | Full table with plain-English level descriptions | Compact table | Path + percentage only |
| Cherry-picked-denominator rationale | Plain-English + list of missing files | One-line summary + missing count | Ratio + missing count |

JSON output is **level-invariant**.

## Friction Logging

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Builder declines the adapter proposal | `coverage_adapter_refused` | `medium` |
| Coverage run crashes (harness-break surfaced) | `harness_break` | `high` |
| Builder declines a Pattern #13 complement offer | `complement_rejected` | `high` |
| Cherry-picked denominator detected at runtime | `cherry_picked_denominator` | `medium` |

When in doubt, don't log. False positives poison `/evolve`.

## What the Coverage SKILL is NOT

- Not an auditor. Coverage does not classify app type or rank gaps — it measures.
- Not a gate. Coverage emits `passes_tier_threshold` in the JSON sidecar but exits 0 regardless; `/vibe-test:gate` owns the exit-code contract.
- Not a fixer. When coverage fails to run (harness break), coverage surfaces the finding and points at `/vibe-test:fix`.
- Not a raw-coverage parser when Tessl is present. Pattern #13 — defer raw parsing to `tessl:analyzing-test-coverage`.

## Why This SKILL Exists

A score is only as honest as the denominator it's measured against. Most coverage tools report against "files the tests imported" because that's cheaper to compute — and it gives you 88% when the truth is 6%. The adapter-prompt UX is the product: it names the cherry-picked denominator problem out loud, shows the builder the exact diff that fixes it, and lets them opt in instead of silently mutating their config.

The c8 fallback exists because some builders won't want the config change (maybe their coverage config is tangled up in some CI pipeline, maybe they're auditing someone else's repo and don't want to edit anything). The fallback gives them the honest number without touching their code.

C3 — the JSON sidecar — is the machine-readable artifact. `/vibe-test:gate` reads it under CI mode; external CI systems can read it too. Keeping coverage's exit code at 0 regardless of pass/fail preserves the separation of concerns: coverage measures, gate decides.

Pattern #13 deferral to Tessl keeps Vibe Test honest about its own boundaries: if a dedicated coverage-analysis skill is installed, parsing raw coverage output is its job, not ours. We overlay tier-appropriate interpretation on top of the raw numbers — not re-parse them.
