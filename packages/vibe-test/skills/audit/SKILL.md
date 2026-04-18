---
name: audit
description: "This skill should be used when the user says `/vibe-test:audit`. The first real diagnostic command: scans the repo, classifies app type + tier + context modifiers, runs honest-denominator coverage, and produces ranked gaps with rationales tied back to classification. Emits three output views (markdown, terminal banner, JSON sidecar) and writes covered-surfaces.json for vibe-sec consumption."
argument-hint: "[--path <glob>] [--verbose | --terse]"
---

# audit — Inventory + Classify + Score

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

You are the first real diagnostic surface of Vibe Test. A builder who runs `/vibe-test:audit` is asking *"what's the state of testing in this repo, and what should I do about it?"*. Your answer has to be grounded in what you actually scanned — no hand-waving, no hallucinated frameworks, no invented findings.

## What This Command Does, In One Sentence

Scan → classify (app type + tier + modifiers) → measure coverage honestly → rank gaps → emit three output views → write state for the next command.

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Repo detectable** — the current working directory must be either a git repo OR contain a `package.json`. If neither:
  > *"I can't find a git repo or package.json here — audit needs one to anchor the scan. Want me to run against a different directory, or should we scaffold a minimal package.json first?"*
  >
  > Wait for the builder's decision. Never scan a directory blindly.

### Shaping prereq (Pattern #16 — adapts silently)

- **Scope** — if the builder passed `--path <glob>`, narrow the scan. Otherwise scan the whole repo.
  - Full-repo audits write to `<repo>/.vibe-test/state/audit.json` + `<repo>/.vibe-test/state.json`.
  - Scoped audits write to `<repo>/.vibe-test/state/audit-<scope-hash>.json` and do NOT overwrite full-repo state. Use `scopeHash(scope)` from `src/state/project-state.ts` for the hash.
- **State freshness** — if a prior audit exists under the same scope, load it. The audit still re-scans (scanner is fast), but the SKILL diffs prior classification against current to surface "same since last audit" / "classification drifted" at the end of the run (story A3).

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) section "audit-state". You own writes to `project-state.ts` + `audit.json` + `audit-<hash>.json` + `covered-surfaces.json`. You read `findings.jsonl` from vibe-sec when present.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). Entries with `applies_to: audit` are `vibe-doc`, `vibe-sec`, and `playwright` (for UI-heavy repos).
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:audit` section. Hook `friction-logger.log()` at the six trigger points listed there.
- **Classification matrix** — [guide > "Classification Matrix"](../guide/SKILL.md#classification-matrix). This is the single source of truth for app types + tiers + modifiers.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`. Every user-facing string (banner, markdown prose, inline prompts) respects the verbosity/technical-detail/expansion knobs. JSON output is level-invariant.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('audit', project)` at entry, `end({sessionUUID, command: 'audit', outcome})` at exit. Same sessionUUID threads through friction + wins + beacon writes during the run.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('audit', project_basename)`. Hold the returned `sessionUUID` in memory until Step 11.
3. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation).

### Step 1 — Blocking prereq check

Run the blocking prereq described above. If the check fails, render a gentle block and halt. Do NOT proceed with any scanning or state writes; do invoke `session-logger.end({outcome: 'aborted'})`.

### Step 2 — Pattern #13 announcement (anchored complements)

Parse [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) via `src/composition/anchored-registry.ts` → `loadAnchoredRegistry()`. Filter to entries whose `applies_to` includes `audit`. For each entry present in the agent's available-skills list (cross-checked via `src/composition/detect-complements.ts`), include a `Deferral` record in the `ReportObject` with the verbatim `deferral_contract`. The final banner renders a "Plays well with" section when any deferrals are present.

Complements relevant to audit:

- **vibe-doc** — co-author `docs/TESTING.md`. Opt-in per run; don't auto-invoke.
- **vibe-sec** — read `.vibe-sec/state/findings.jsonl` before classification; elevate matching surfaces' priority in the gap ranking. Two-way handshake: audit writes `covered-surfaces.json` at exit.
- **playwright** — if the repo is UI-heavy, the E2E deferral at generate time is relevant; announce once at audit so the builder can plan.

Surface at most ONE anchored complement announcement per invocation. If multiple are present, pick the tightest match (vibe-sec > vibe-doc > playwright for audit).

### Step 3 — Scan (scanner → Inventory JSON)

Invoke `scan(rootPath, scopeGlob)` from `@esthernandez/vibe-test/scanner`. The scanner is fast (AST-level, no network, no process spawn).

Result shape is `Inventory` (see `src/scanner/index.ts`). Validate:

- `inventory.detection.packageJsonPath` is non-null (else the blocking prereq should have caught this already).
- `inventory.scanned_files.length > 0` (else the scope glob matched nothing — warn the builder and offer to retry with `--path` removed or broadened).
- `inventory.parse_errors.length === 0` is ideal; if the walker emitted errors, surface them as `low`-severity findings under category `harness-break` so the builder sees them but they don't blow up classification.

### Step 4 — Classify (SKILL-primary reasoning)

#### 4a — App type (deterministic)

Call `classifyAppType({detection, routes, models, componentCount})` from `@esthernandez/vibe-test/scanner`. The function returns `{app_type, reason, confidence}` via a first-match-wins rule matrix. Do NOT second-guess the rule result; instead, surface the `reason` field verbatim in the banner and markdown so the builder can audit the call.

The rule order (most specific → least specific):

1. Multi-tenant signals + frontend + (backend or db) → `multi-tenant-saas`
2. Frontend + database → `full-stack-db`
3. Frontend + (backend or any route) → `spa-api`
4. Backend or routes only, no frontend → `api-service`
5. Frontend only, no routes, no backend → `spa`
6. None of the above → `static`

#### 4b — Tier (fuzzy — you reason)

App type is deterministic; tier is fuzzy. You read the inventory + extra signals (CI workflow content, READMEs, integration detections) and pick one of five tiers. The classifier helpers do not decide this — you do, in prose, and you MAY prompt the builder for disambiguation per story A1.

**Rules of thumb (not hard rules):**

- `prototype` → no CI deploy target, no secrets, README says "WIP" / "experiment" / "playground", no users beyond the author.
- `internal` → auth-gated backend, no public URL in README, team <10 users.
- `public-facing` → production deploy target present (`NODE_ENV=production` in CI, deploy-firebase / deploy-vercel / deploy-netlify markers), Sentry or error-monitoring wired, but no paid-user plumbing.
- `customer-facing-saas` → payment flow (stripe / paypal / billing tables) + PII fields (email, name, address) + production deploy target + auth provider. *Multiple co-present signals required* — any single one is not enough.
- `regulated` → HIPAA / PCI / GDPR / SOC2 markers in docs or deps, OR auth + payments + health data.

**Disambiguation prompt (story A1):** when the signal is genuinely mixed — e.g., SPA+API with production deploy markers but no payments and no PII — ask the builder, and ONLY then. The format is:

> *"I see this app has [signals X, Y, Z] but no clear deployment target. Which best fits — prototype, internal tool, public-facing, customer-facing SaaS, or regulated?"*

Never ask an open-ended *"what tier is this?"* — always frame with the detected signals so the builder can correct rather than invent. If the builder rejects your tier pick, log `friction_type: "default_overridden"` with confidence `medium` per the friction-triggers contract.

Confidence starts at `0.9` for a clean single-framework match, degrades to `0.7` when you asked the builder, `0.6` for mixed-stack splits (see Step 7), and `0.5` when the builder explicitly overrode your pick.

#### 4c — Context modifiers (deterministic)

Call `classifyModifiers({detection, models, integrations, extraSignals})` from `@esthernandez/vibe-test/scanner`. Pass `extraSignals` as a list of strings you noticed — CI workflow file snippets, Dockerfile contents, README headings about compliance. The helper returns a flat string array — attach to `classification.modifiers` verbatim.

### Step 5 — Coverage (honest-denominator measurement)

#### 5a — Detect the test command

From the inventory you know which test framework is in use. Find the builder's `test:coverage` (or fallback `test`) script in `package.json`.

#### 5b — Propose adaptation (never silent modification)

Call `runCoverage({framework, cwd, adapterAccepted: null, actualSourceFiles, c8TestCommand})` from `@esthernandez/vibe-test/coverage`. This returns a `Coverage` object containing the proposed adapter diff (`adapter_proposal`). SKILL-side, show the builder the diff and ask:

> *"Your current `test:coverage` command measures only files imported by tests — that's a cherry-picked denominator. Here's a one-line diff that adds `--coverage.all` so every source file ends up in the denominator. Apply? [y/N]"*

If the builder accepts (`y`), re-invoke `runCoverage({..., adapterAccepted: true})` and run the adapted command. If they decline or there's no framework detected, fall back to `c8 --all` via the same helper (it shells `npx c8 --all --reporter json --reporter text <cmd>`). Declining is not failure — log it as `friction_type: "coverage_adapter_refused"` with confidence `medium`.

If coverage fails outright (child process crashes, command missing), attach a `harness-break` finding with `severity: critical` and continue with a zeroed score — better to report honestly than fake numbers.

#### 5c — Denominator honesty check

`coverage.denominator` already carries the `is_cherry_picked` flag. When `true`:

- Emit finding: `category: "cherry-picked-denominator"`, `severity: "high"`, with the reported-vs-actual count in the rationale, and the list of `missing_files` (truncated to 10 for the banner).
- The finding's `example_pattern` section shows the minimal-diff fix tailored to the framework (vitest / jest / c8).

This is F2 flagship — the whole product hinges on catching this. Never suppress.

### Step 6 — Weighted score

Call `computeWeightedScore({perLevel, applicability, tier})` from `@esthernandez/vibe-test/coverage`. The `perLevel` map comes from parsing the coverage output (assign all coverage to `smoke` + `behavioral` for v0.2 — finer-grained level attribution is deferred to v0.3). `applicability` comes from the classification matrix per app type. `tier` is your step-4b call.

Attach the full `WeightedScoreResult` (score + threshold + pass flag + per-level contributions) to the ReportObject's `score` field.

### Step 7 — Mixed-stack handling (story A8)

If the scanner detected multiple coherent portions — e.g., `react/` frontend + `server.py` backend, or `frontend/` + `backend/` monorepo split — do NOT emit a single classification. Instead:

1. Partition the inventory by portion (by top-level folder or language).
2. Call `classifyAppType` and pick tier for each portion separately.
3. Set top-level `classification.confidence` to `0.6` (degraded from default `0.9`).
4. Attach `classification.mixed_stack_portions` as an array of `{path_glob, app_type, tier, confidence}` entries.
5. Surface a single line in the banner: *"Mixed-stack repo: classifying each portion separately. See markdown for per-portion breakdown."*
6. Markdown renderer shows a per-portion table.

Most repos are single-portion; mixed-stack is the uncommon branch. When in doubt, assume single-portion and let the next audit catch drift.

### Step 8 — Identify gaps, compose rationales

For each test level the classification matrix marks *required* or *recommended* for this `app_type` + `tier` + `modifiers`:

1. Check current per-level coverage vs a simple "is this level materially present?" threshold (we use `≥10%` for v0.2).
2. If below threshold, emit a finding:
   - `id`: `gap-<level>` (unique per run — append a counter if multiple scope-portions)
   - `severity`: derived from tier + level required-ness (regulated+integration missing → critical; prototype+edge missing → low)
   - `category`: `gap-<level>`
   - `title`: short phrase like *"Missing behavioral tests on customer-facing routes"*
   - `rationale`: 2-3 sentences tying the gap back to classification. Example: *"SPA+API at Public-facing tier → auth behavioral tests required because this repo has a `/login` route and customer-facing context elevates the cost of silent regressions."*
   - `effort`: `low` / `medium` / `high` — your call; err toward `low` when the generator can pattern-match existing tests.
   - `example_pattern`: a short code snippet the builder could copy.

Order findings by **priority = severity_weight × effort_ratio** where:
- severity_weight: `critical=5, high=4, medium=3, low=2, info=1`
- effort_ratio: `low=1.0, medium=0.6, high=0.3` (low-effort, high-severity wins)

Surface the top 20 in the banner; the markdown carries all of them; the JSON sidecar carries all of them too.

### Step 9 — Harness-break detection (story A6)

Three distinct finding types the audit MUST surface when detected:

1. **broken_test_runner** — e.g., vitest `forks-pool` timeout signature in CI logs, jest circular require, mocha timeout on all suites simultaneously. If you have access to prior CI run output, pattern-match. Emit finding with `category: "harness-break"`, `severity: "critical"`, rationale naming the exact signature + the one-line config fix.
2. **missing_test_binary** — `package.json` script references e.g. `jest/bin/jest.js` but jest is not in `dependencies` / `devDependencies`. Detect by scanning script strings against `allDependencies` keys. Emit finding with `category: "harness-break"`, `severity: "critical"`, rationale naming the missing package + the install command.
3. **cherry_picked_denominator** — surfaced from Step 5c. Already handled there.

These three are what sets Vibe Test apart from every other test tool. Do NOT suppress them under any circumstance.

### Step 10 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'audit', plugin_version, repo_root, scope, commit_hash})`. Populate:

- `classification` from Step 4
- `score` from Step 6
- `findings` from Steps 8 + 9
- `actions_taken` — if you ran coverage via adapter-accepted, note *"applied vitest coverage-all adapter"*; if c8 fallback, *"fell back to c8 --all"*
- `deferrals` — the Pattern #13 matches from Step 2 (verbatim deferral_contract prose)
- `handoff_artifacts` — list of files you're about to write in Step 11 (even before the write completes; if a write fails, that's a separate finding)
- `next_step_hint` — persona-adapted handoff phrasing. Default: *"Run `/vibe-test:generate` when ready to close the top gaps."*

Then invoke the three renderers **in parallel**:

- `renderMarkdown(report, {proseSlots})` → writes to `docs/vibe-test/audit-<ISO-date>.md`. `proseSlots` carries your SKILL-authored rationale prose.
- `renderBanner(report, {columns, disableColors: !isTty})` → captured as a string, printed to the chat.
- `renderJson({report, repoRoot})` → writes `.vibe-test/state/audit.json` (or `audit-<hash>.json` for scoped) + history copy. JSON is schema-validated against `audit-state.schema.json`.

### Step 11 — State writes

After the three renders succeed, commit state:

1. **`project-state.ts writeProjectState(repoRoot, state)`** — the full project state at `<repo>/.vibe-test/state.json`. Overwrite classification + inventory (InventorySnapshot shape) + coverage_snapshot + framework. Leave `generated_tests` + `rejected_tests` untouched (those are generate's to manage). Update `covered_surfaces_written_at`. Scoped audits do NOT overwrite this file — they only write their sidecar.
2. **`session-logger.end({sessionUUID, command: 'audit', outcome: 'completed', key_decisions, complements_invoked, artifact_generated})`** — terminal entry paired to the Step 0 sentinel.
3. **`beacons.append(repoRoot, {command: 'audit', sessionUUID, outcome: 'completed', hint: '<one-line summary>'})`** — Pattern #12 cross-plugin coordination.
4. **`covered-surfaces.json`** — write `<repo>/.vibe-test/state/covered-surfaces.json` via `extractCoveredSurfaces({inventory, testFileContents, pluginVersion, commitHash})` from `@esthernandez/vibe-test/scanner`. Validate against the `covered-surfaces.schema.json` before write.

On any state-write failure other than `covered-surfaces.json`: log a `runtime_hook_failure` friction entry and continue — the user already saw the banner + markdown. On a `covered-surfaces.json` failure: log the same but also add a `harness-break` finding to the audit state so the next run notices.

### Step 11a — Builder-Sustainable Handoff writes (Epic 8)

Immediately after state writes, invoke the handoff writers in the order below. These produce the plain-markdown artifacts that survive an uninstall of Vibe Test (stories H1, H2, H5, H7). Each writer is deterministic plumbing — compose the prose in this SKILL and pass it as the writer's `payload`.

Import surface: `import { writeTestingMd, appendTestPlanSession, renderGraduatingSection, renderEcosystemSection, detectTierTransition } from '@esthernandez/vibe-test/handoff'` (via `dist/handoff/index.js`).

1. **Tier transition check** — call `detectTierTransition(prior?.classification?.tier, current.classification.tier)` against the prior-audit `project-state.json` (loaded in Step 11.1). If transitioned, the graduating section MUST be regenerated for the new tier. Log `friction_type: "classification_mismatch"` with confidence `low` if the transition was unexpected (e.g., builder overrode the picked tier).

2. **Render graduating section** — call `renderGraduatingSection({current_tier, transition_summary, changes_list, new_tests_list, new_patterns_list})`. `transition_summary` is YOUR 2-3 sentence prose; the three list payloads are bullet-line content (no leading `-`) that you compose from the classification matrix. At the top tier (`regulated`), the writer emits a sentinel "already at top tier" section automatically.

3. **Render ecosystem section** — call `renderEcosystemSection({recommendations, availableSkills})`. `recommendations` is your SKILL-composed list (see the 7 anchored complements in `plays-well-with.md` + any dynamic-discovery hits). `availableSkills` comes from the agent's available-skills context. The writer filters out already-installed plugins; if every recommendation is filtered out, the returned `content` is empty — skip the ecosystem section in the payload.

4. **Write `docs/TESTING.md`** — call `writeTestingMd(repoRoot, payload)`. Payload fields: `project_name` (use repo basename), `testing_overview` / `classification_summary` / `coverage_posture` / `run_instructions` / `add_test_instructions` (YOUR prose), `graduating_section` (the output of step 2 above), `ecosystem_section` (the `content` from step 3). The writer preserves any builder edits placed OUTSIDE the `<!-- vibe-test:start/end:X -->` markers.

5. **Append to `docs/test-plan.md`** — call `appendTestPlanSession(repoRoot, entry)` with `entry.command: 'audit'`, `entry.timestamp` = ISO now, `entry.sessionUUID` from Step 0, `entry.classification` = a 1-2 sentence prose summary of your step-4 reasoning, `entry.generated_tests: []` (audit generates no tests), `entry.rejected_with_reason: []`. This is chronological, append-only.

6. **CI stub — DO NOT invoke at audit time.** `writeCiStub` is opt-in and belongs in the generate SKILL (story H4). Audit MAY mention in the banner that a CI stub would be offered at generate time; do not write it here.

On any handoff-writer failure: log `friction_type: "runtime_hook_failure"` with confidence `low`, attach `harness-break` finding with `severity: "low"` to the ReportObject (so the next audit notices), and continue — these artifacts are nice-to-have, not core to the audit's diagnostic value.

### Step 12 — Handoff line

Persona-adapted handoff line per [guide > "Handoff Language Rules"](../guide/SKILL.md#handoff-language-rules):

| Persona | Handoff line |
|---------|--------------|
| `professor` | *"When you're ready, run `/vibe-test:generate` — it will pick up this audit's scope."* |
| `cohort` | *"Run `/vibe-test:generate` next — we'll work through the gaps together."* |
| `superdev` | *"Run `/vibe-test:generate`."* |
| `architect` | *"Run `/vibe-test:generate` to close the frontend gap under this tier."* |
| `coach` | *"When you're ready, run `/vibe-test:generate` and I'll walk through the gaps."* |
| `null` (default) | *"Run `/vibe-test:generate` when ready."* |

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts; this is a user-tested correction (see `memory/feedback_no_manual_clear.md`).

## Tier-Adaptive Language

Every user-facing string — banner prose, markdown section text, inline prompts, finding rationales — respects the knobs returned by `getLanguageKnobs()`:

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Rationale length | 3-4 sentences, plain-English, inline glosses for *coverage* / *denominator* / *harness* | 2-3 sentences, technical terms first-use-glossed | 1 sentence, pure technical |
| Finding expansions | Always-visible | Collapsible | Pre-collapsed |
| Gap priority reasoning | Shown as prose paragraph | Shown as one-line summary | Shown as `sev×effort` math only |

JSON output is **level-invariant**. Machines don't care about verbosity.

## Friction Logging

Hook `friction-logger.log({sessionUUID, friction_type, symptom, confidence, ...})` at these trigger points (per [friction-triggers.md](../guide/references/friction-triggers.md) audit section):

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Builder explicitly overrides your tier classification | `default_overridden` | `medium` |
| Builder overrides the auto-detected `app_type` | `default_overridden` | `medium` |
| Builder declines the coverage adapter proposal | `coverage_adapter_refused` | `medium` |
| Back-to-back audit runs on same HEAD produce different tier/app_type | `classification_mismatch` | `low` |
| Builder declines a Pattern #13 complement offer | `complement_rejected` | `high` |
| Builder asserts a finding is wrong | `classification_mismatch` | `medium` |

When in doubt, don't log. The friction-logger has a quoted-prior gate for question-type triggers — if you're about to log `repeat_question` / `rephrase_requested`, the `symptom` must contain a quoted snippet of the prior turn.

## What the Audit SKILL is NOT

- Not a generator. Generate lives in `skills/generate/SKILL.md`. Audit produces the gap findings that generate consumes.
- Not a fixer. Fix lives in `skills/fix/SKILL.md`. If audit finds a broken test harness, it reports; fix repairs.
- Not a gate. Gate lives in `skills/gate/SKILL.md`. Audit measures; gate decides pass/fail against tier threshold.
- Not a coverage command. `/vibe-test:coverage` is the standalone coverage-measurement command; audit invokes it as a sub-step.
- Not a first-time-setup wizard. The router's job is to welcome and orient; audit assumes the builder already knows why they're here.

## Why This SKILL Exists

Most test tools treat coverage as a number. Vibe Test treats coverage as a claim that has to match deployment risk. Audit is where that claim is assembled: app type says *"what does the test pyramid look like for this shape of app?"*; tier says *"how high does the pyramid need to stack?"*; modifiers say *"which specific levels become non-negotiable?"*.

The output isn't just a score. It's a *structured set of gap findings* — each tied back to a specific classification reason, each with an effort estimate, each with an example pattern the generator can pattern-match against. The SKILL's job is to compose those rationales honestly: tied to what was actually scanned, calibrated to what the tier actually requires.

F2 is the flagship claim. Every test tool can score coverage. Vibe Test catches the harness-level breaks that make the score lie. Broken runner, missing binary, cherry-picked denominator — these three finding types are what a builder will remember from their first audit run.
