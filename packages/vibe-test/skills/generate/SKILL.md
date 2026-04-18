---
name: generate
description: "This skill should be used when the user says `/vibe-test:generate`. Generates tests for the gaps the most recent audit identified. Confidence-tiered routing — high-confidence tests auto-write, medium-confidence stage in `.vibe-test/pending/` for batch review, low-confidence show inline in chat for per-test accept/reject. Honors scoped audits, env-var detection, detected framework idioms, and prior team decisions. Playwright E2E generation defers to the `playwright` plugin via Pattern #13."
argument-hint: "[--path <glob>] [--full] [--force] [--dry-run] [--apply-last-dry-run]"
---

# generate — Confidence-Tiered Test Generation

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

Generate turns audit findings into test files. Three confidence lanes decide *how*: high-confidence tests auto-write, medium-confidence stage for batch review, low-confidence land inline for per-test judgment. The command's job is to make writing tests the easiest thing the builder does today.

## What This Command Does, In One Sentence

Read audit findings → for each gap, compose a candidate test → assign confidence → auto-write, stage, or show inline → honor prior rejections → hand off to TESTING.md + test-plan.md.

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Audit-state exists for the current scope.** If the builder ran `/vibe-test:audit` with `--path <glob>`, the audit wrote to `<repo>/.vibe-test/state/audit-<scope-hash>.json`. Full-repo audits wrote to `<repo>/.vibe-test/state/audit.json` + `<repo>/.vibe-test/state.json`. Generate reads whichever matches the current scope.
- If the matching audit-state is missing:
  > *"Generate needs a prior audit for this scope to know which gaps to close. Run `/vibe-test:audit{scope_flag}` first — it's fast, usually under 10s on a repo this size. Want me to run it now?"*
  >
  > Wait for the builder's decision. Never generate tests against a scope that hasn't been audited.

### Shaping prereqs (Pattern #16 — adapt silently)

- **Scope inheritance.** The scope is inherited from the most recent audit:
  - If `--path <glob>` is passed, use it (and require a matching `audit-<hash>.json`).
  - If `--full` is passed, use the full-repo `audit.json`; error if it doesn't exist (*"No full-repo audit found — run `/vibe-test:audit` first, or drop `--full` to reuse your last scoped audit."*).
  - Otherwise: use whatever the most recent audit-state covers. Surface the inherited scope in the opening banner so the builder can catch drift.
- **Pending queue state.** If `.vibe-test/pending/` has staged tests from a prior run, surface the count in the opening banner (*"3 tests already staged from your last run — accept/reject those before generating more?"*). Builder can skip ahead, accept-all, or continue generating and batch the accept step.

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) section "generate-state". You own writes to the generated tests themselves (to `tests/` or `.vibe-test/pending/`), `.vibe-test/pending/index.md`, and the generate-state JSON sidecar. You read `audit.json` (or scoped variant), `accepted.json` / `rejected.json`, and any pre-existing pending-dir contents.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). Entries with `applies_to: generate` are `superpowers:test-driven-development`, `playwright`, `vibe-doc`, `vibe-sec`.
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:generate` section.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`. Every user-facing string respects verbosity / technical-detail / expansion knobs. JSON output is level-invariant.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('generate', project)` at entry, `end({sessionUUID, command: 'generate', outcome})` at exit.
- **Friction logger** — [`../friction-logger/SKILL.md`](../friction-logger/SKILL.md). Per-reject entries when builders supply rejection reasons. The rejection-*pattern* probe (3-consecutive-rejects) is item #8; this command captures each reject individually.

## The Generator `src/` primitives

Import surface (from `@esthernandez/vibe-test/generator`):

- `scanSource`, `scanFile`, `scanFiles`, `uniqueVarNames`, `formatInlineWarning` — env-var detection per PRD G2.
- `stagePendingTest`, `acceptPendingTest`, `rejectPendingTest`, `listPending`, `writePendingIndex`, `getCurrentHeadHash` — atomic ops on `.vibe-test/pending/` per PRD G3.
- `isPlaywrightMcpAvailable`, `resolvePlaywrightBridge` — Pattern #13 Playwright deferral per PRD G7.
- `getIdiomMatcher`, `vitestMatcher`, `jestMatcher` — framework-specific test-file fragments per PRD G6.

Confidence assignment is **SKILL reasoning** per spec Decision 1 — there is no deterministic `confidence-heuristics.ts`. You reason about each gap against the four framework-idiom templates + the 2-3 similar existing tests you read, and pick a number.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('generate', project_basename)`. Hold the returned `sessionUUID` until Step 10.
3. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation).

### Step 1 — Read audit-state + prior decisions

1. Resolve the audit-state path:
   - `--path <glob>` → `.vibe-test/state/audit-<scope-hash>.json` (use `scopeHash(scope)` from `src/state/project-state.ts`).
   - `--full` → `.vibe-test/state/audit.json`.
   - Default → most-recent audit (check both, pick the newer `timestamp`).
2. Read + validate against `audit-state.schema.json`. If invalid, halt with a gentle error that names the schema field that failed (*"Your audit-state schema is an older version — run `/vibe-test:audit` again to refresh it."*).
3. Read the prior accepted/rejected history:
   - `.vibe-test/state/accepted.json` (if present) — tests previously auto-written or accepted-from-pending.
   - `.vibe-test/state/rejected.json` (if present) — tests rejected with reasons.
   - Session memory from prior runs in this session via `session-log.readRecent(7)` — surfaces in-session decisions even when the project-state files were wiped.
4. Surface the pending-queue count in the opening banner (Step 0b of the shaping-prereq list).

### Step 2 — Pattern #13 announcement

Parse [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) via `loadAnchoredRegistry()`. Filter to entries whose `applies_to` includes `generate`. For each entry present in the agent's available-skills list (cross-checked via `detectComplements()`), surface the verbatim `deferral_contract`.

Generate-specific rules:

- **superpowers:test-driven-development** — if present, announce verbatim: *"TDD skill drives NEW-feature tests; this command focuses on retrofit/audit-gap tests. If you're writing something new from scratch, reach for TDD instead. If you're filling gaps in existing code, stay here."*
- **playwright** — use `resolvePlaywrightBridge({availableSkills, detectedE2eGaps})` to compose the announcement. If absent, the E2E-flagged findings from the audit become ecosystem recommendations (no native Playwright fallback per spec Decision 3).
- **vibe-sec** — if `.vibe-sec/state/findings.jsonl` exists, elevate the priority of audit findings whose `category` names a vibe-sec-flagged surface.
- **vibe-doc** — offer to co-author `docs/TESTING.md` at handoff time (Step 9).

Surface at most ONE anchored announcement per invocation per the guide's cap. Dynamic discovery is capped at one additional suggestion when the `/vibe-test:generate` command is the current command (per the guide's heuristic table).

### Step 3 — Per-gap generation loop

For each gap in the audit-state's `findings[]` array, in priority order (`severity × effort`, already sorted by the audit):

#### 3a — Skip rejected + already-covered

- If `rejected.json` has an entry whose `target_test_path` matches the gap's expected test path, skip. Surface in the per-gap summary: *"skipped — previously rejected with reason: '<reason>'"*. Story G5.
- If `accepted.json` has an entry whose `target_test_path` matches, skip with *"skipped — already covered"*.
- If the pending-queue already has an entry for this gap, skip with *"skipped — already staged (see `.vibe-test/pending/index.md`)"*.

#### 3b — Read 2-3 similar existing tests (G6 idiom matching)

From the audit's `inventory.existing_test_files`, pick 2-3 tests that share the gap's level (smoke/behavioral/edge/integration) AND the target's kind (component/function/route). Read them. Note:

- Import style (named vs default, relative vs alias).
- Assertion style (`expect(...).toBe(...)` vs `assert.equal(...)` vs custom matchers).
- Fixture approach (inline literals vs factory imports vs shared `beforeEach`).
- Test location (colocated vs centralized under `tests/`).

If no matching tests exist, fall back to the idiom-matcher template for the detected framework (`getIdiomMatcher(inventory.test_frameworks[0] ?? 'vitest')`).

#### 3c — Compose candidate test

1. Pick the matcher template for the gap's level via `matcher.templates[level].render({subject_import_path, subject_name, subject_kind, behavior_hint})`.
2. Adapt the template to the project idiom from 3b — rewrite imports, assertion wording, fixture approach. The template is a starting point; the SKILL's reasoning bridges the gap.
3. Compose an `it()` description that names the observable behavior, not the implementation detail. *"shows the badge when the user has an active subscription"*, not *"calls BadgeManager with user.hasSub === true"*.

#### 3d — Env-var annotation (G2)

1. `scanFiles([...codeUnderTestPaths])` where the paths are the gap's `subject_file_paths` from the audit.
2. If `refs.length > 0`, prepend `formatInlineWarning(refs)` to the candidate test.
3. If any refs have `source === 'dotenv-side-effect'` or `source === 'dotenv-config'`, add a `// TODO: set up a .env.test fixture` line above the first `describe(` block.
4. Remember `uniqueVarNames(refs)` for the CI-stub writer (item #6 — `writeCiStub` in `handoff/ci-stub-writer.ts`). The CI stub gets updated at Step 9, not here.

#### 3e — Assign confidence

SKILL reasoning. Use the following heuristic calibration (not a deterministic formula):

- **0.90+ (auto-write)** — template matched cleanly, idiom is well-established in the repo, no ambiguity about what the test should assert. Typical: smoke render on a component that already has other smoke tests; input-boundary test on a function with existing unit tests.
- **0.70–0.89 (stage for batch review)** — template matched but the idiom is novel / the test exercises a less-obvious path / fixture setup required judgment. Typical: behavioral tests that mock a specific interaction sequence; edge tests where "the right boundary" depends on product context.
- **<0.70 (inline)** — you're genuinely uncertain this test is what the builder wants. Typical: integration-level tests that depend on mocking a complex dependency; tests that exercise unstable UI surfaces; tests for code that's actively being refactored (per recent beacons).

Confidence must be persisted per test in the final report-object + JSON sidecar. The number is part of the SKILL's contract with the builder — not a hidden field.

#### 3f — Route per confidence

- **≥0.90 auto-write (G2):**
  1. Compose the header via `matcher.renderHeader({plugin_version, iso_date, confidence_label: 'HIGH', finding_id})`.
  2. Combine: `header + env_warning + test_body`.
  3. Detect the test location per the project convention (use `inventory.existing_test_files` patterns if possible; fall back to `tests/<path>.test.ts` colocation heuristic).
  4. If the file already exists, abort the auto-write for that gap and stage it instead — never overwrite existing tests.
  5. Write atomically via `fs.writeFile` (the `handoff` layer already uses atomic-write; direct writes are acceptable here per the data contract).
  6. `accepted.json` gets an entry `{target_test_path, confidence, status: 'auto-written', finding_id, generated_at}`.
- **0.70–0.89 stage (G3):**
  1. Compose `header + env_warning + test_body` as above, but with `confidence_label: 'MEDIUM'` in the header.
  2. `stagePendingTest({repoRoot, targetTestPath, content, confidence, rationale, auditFindingId})` — the manager records HEAD hash automatically.
  3. The rationale is your 1-2 sentence explanation of *why* this gap is worth closing now — it appears in `pending/index.md`.
- **<0.70 inline (G4 lightweight — full rejection-probe is item #8):**
  1. Render the candidate inline in the chat with the rationale *"this test covers X because Y — [accept / reject / reject-with-reason]"*.
  2. On accept: write to the test location as with auto-write, but label `confidence_label: 'LOW'` in the header.
  3. On reject: log a session-memory entry with `friction_type: "generation_pattern_mismatch"` (per friction-triggers) if the builder provided a reason; otherwise just record the reject count for the session summary.

### Step 4 — Pending-queue prompt (G3 accept flow)

After the per-gap loop completes, if any tests were staged:

1. `listPending(repoRoot)` → fresh listing.
2. `writePendingIndex(repoRoot, entries)` → overwrites `.vibe-test/pending/index.md`.
3. Prompt the builder (tier-adapted wording):
   > *"{N} tests staged for review at `.vibe-test/pending/index.md`. Accept-all / accept `<path>` / reject `<path>` --reason "..." / come back later?"*
4. For each accept, call `acceptPendingTest({repoRoot, pendingPath, currentHeadHash: undefined})`. The manager computes HEAD automatically.
5. **Branch-switch check (G3).** If the result is `{accepted: false, branch_switched: true}`:
   > *"These tests were generated against commit `{recorded_hash.slice(0,7)}`; you're now on `{current_hash.slice(0,7)}`. Source may have changed — re-review before accepting? Re-run `/vibe-test:generate` against current HEAD, force-accept with `--force`, or leave the tests staged."*
6. On force-accept: re-call `acceptPendingTest({..., force: true})`. Log `friction_type: "artifact_rewritten"` at confidence `low` — the builder overrode a safety check; worth noticing in `/evolve`.
7. On reject: call `rejectPendingTest({pendingPath, reason})`. Persist the `friction_entry` from the return value via `friction-log.append({sessionUUID, ...})`. Add a `rejected.json` entry keyed on `target_test_path`.

### Step 5 — Inline (G4) reconciliation

For each low-confidence candidate that was accepted inline in Step 3f, confirm the test file was written and add an `accepted.json` entry. For each rejected, add a `rejected.json` entry (plus the friction-log entry if a reason was supplied — item #7 captures per-reject friction; the rejection-*pattern* probe is item #8).

### Step 6 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'generate', plugin_version, repo_root, scope, commit_hash})`. Populate:

- `classification` — carry forward from the audit-state; generate doesn't re-classify.
- `score` — carry forward the last `coverage_snapshot` from audit-state; generate doesn't re-run coverage (that's coverage's job).
- `findings` — convert each gap the generator addressed into an `Action` in `actions_taken`, not a new finding. Only emit a `finding` for errors (e.g., *"gap #N wasn't generated — no matching idiom template for detected framework `<name>`"*).
- `actions_taken` — one `Action` per gap: `{kind: 'write' | 'stage' | 'inline' | 'skip', description, target}`. The `description` names the gap and the outcome; the `target` is the final or staged path.
- `deferrals` — any Pattern #13 matches from Step 2 (verbatim `deferral_contract` prose).
- `handoff_artifacts` — list of files written / staged / appended this run (including `docs/TESTING.md` and `docs/test-plan.md` from Step 9).
- `next_step_hint` — persona-adapted. Default: *"Run `/vibe-test:coverage` to measure the gap we just closed, or `/vibe-test:fix` if any of the generated tests fail."*

Render in parallel:

- `renderMarkdown(report, {proseSlots})` → `docs/vibe-test/generate-<ISO-date>.md`.
- `renderBanner(report, {columns, disableColors: !isTty})` → printed to chat.
- `renderJson({report, repoRoot})` → `.vibe-test/state/generate.json` (and scoped `generate-<hash>.json` mirror). Schema-validated.

### Step 7 — Builder-Sustainable Handoff writes (Epic 8)

Import surface: `import { writeTestingMd, appendTestPlanSession } from '@esthernandez/vibe-test/handoff'`.

1. **Append to `docs/test-plan.md`** via `appendTestPlanSession(repoRoot, {command: 'generate', timestamp, sessionUUID, classification: <one-line prose from audit>, generated_tests: [...per-candidate status, confidence, rationale], rejected_with_reason: [...], notes})`. This is chronological append-only. L2 consumes it.

2. **Update `docs/TESTING.md`** via `writeTestingMd(repoRoot, payload)`. Payload fields carry forward from the prior audit's TESTING.md (read + pass through), with updates to:
   - `add_test_instructions` — add a bullet naming the new tests + the idiom they use.
   - `coverage_posture` — add a note about what levels / surfaces are now covered.
   - Leave `graduating_section` and `ecosystem_section` alone unless the audit wrote them.
   If `vibe-doc` is installed and the builder opted in, defer the `testing_overview` / `classification_summary` / `add_test_instructions` prose composition to `/vibe-doc:generate` instead — per Pattern #13 deferral_contract. The writer still runs; `vibe-doc` just authored the sections.

3. **Fixtures / factories scaffold.** If any generated test imports from `tests/fixtures/` or `tests/factories/` and the imported module doesn't exist, write a stub with a `// TODO:` comment. Builder fills it in. This is the "smallest useful scaffold" per H3.

4. **CI stub — offer opt-in (H4).** If `.github/workflows/vibe-test-gate.yml` doesn't exist, prompt once:
   > *"Want me to add a CI stub at `.github/workflows/vibe-test-gate.yml`? It runs `@esthernandez/vibe-test-cli gate --ci` on PRs and block-fails the job when coverage drops below your tier threshold. Opt-in — I won't add it without a yes."*
   If accepted, invoke `writeCiStub(repoRoot, {framework: inventory.test_frameworks[0], env_vars: uniqueVarNamesAcrossAllGaps, pluginVersion})`. If declined, never ask again in this project — record the decline in `.vibe-test/state.json` so future runs skip the prompt silently.

### Step 8 — State writes

1. **`project-state.ts writeProjectState(repoRoot, state)`** — update `generated_tests[]` and `rejected_tests[]` arrays. Leave classification / inventory / coverage_snapshot untouched (those are audit's to manage). Scoped runs write to the scoped sidecar only.
2. **`accepted.json` + `rejected.json`** — write atomic full updates via `atomicWriteJson`. These are the source of truth for G5 deduplication across future runs.
3. **`session-logger.end({sessionUUID, command: 'generate', outcome: 'completed', tests_generated, tests_accepted, tests_rejected, rejection_reasons, levels_covered, framework_used, complements_invoked, artifact_generated: '<path to markdown>'})`** — terminal entry.
4. **`beacons.append(repoRoot, {command: 'generate', sessionUUID, outcome: 'completed', hint: '<N generated, M staged, K rejected>'})`** — Pattern #12.

On any state-write failure (other than the generated test files themselves): log a `runtime_hook_failure` friction entry and continue — the builder already saw the banner + markdown.

### Step 9 — Handoff line

Persona-adapted handoff line per [guide > "Handoff Language Rules"](../guide/SKILL.md#handoff-language-rules):

| Persona | Handoff line |
|---------|--------------|
| `professor` | *"When you're ready, run `/vibe-test:coverage` to see the gap close. If any generated tests fail, `/vibe-test:fix` will walk the failures."* |
| `cohort` | *"Run `/vibe-test:coverage` next — we'll see how much we moved the needle. If any tests are red, `/vibe-test:fix`."* |
| `superdev` | *"Run `/vibe-test:coverage`. If anything's red, `/vibe-test:fix`."* |
| `architect` | *"Run `/vibe-test:coverage` to quantify the gap closure. `/vibe-test:fix` if CI surfaces any harness-level breaks."* |
| `coach` | *"When you're ready, run `/vibe-test:coverage` and I'll walk through what we covered. `/vibe-test:fix` if anything needs repair."* |
| `null` (default) | *"Run `/vibe-test:coverage` when ready. Run `/vibe-test:fix` if any tests fail."* |

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts; this is a user-tested correction.

## Confidence routing table — quick reference

| Band | Action | Header label | Destination | Builder interaction |
|------|--------|--------------|-------------|---------------------|
| ≥0.90 | Auto-write | `HIGH` | Detected test location (e.g., `tests/foo.test.ts`) | Banner lists paths, git status reflects the diff |
| 0.70–0.89 | Stage | `MEDIUM` | `.vibe-test/pending/<mirror-of-target>` | accept-all / accept `<path>` / reject `<path>` --reason `"..."` |
| <0.70 | Inline | `LOW` | Chat render, written on accept | Per-test accept / reject / reject-with-reason |

## Tier-Adaptive Language

Every user-facing string — banner prose, markdown section text, inline prompts, candidate-test rationales — respects the knobs returned by `getLanguageKnobs()`:

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Rationale length | 3-4 sentences, plain-English, inline glosses for *smoke*, *behavioral*, *fixture*, *mock* | 2-3 sentences, technical terms first-use-glossed | 1 sentence, pure technical |
| Pending-index layout | Full table + expanded rationales | Compact table | Path + confidence only |
| Per-test inline rendering | Show rationale + full test body | Show rationale + truncated body with expand prompt | Show path + confidence + `accept/reject` |
| Reject prompt | *"Mind sharing why? Helps me get closer next time."* | *"Reject reason?"* | *"Reject reason (optional):"* |

JSON output is **level-invariant**. Machines don't care about verbosity.

## Friction Logging

Hook `friction-logger.log({sessionUUID, friction_type, symptom, confidence, ...})` at these trigger points:

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Builder rejects a staged test with a reason | `generation_pattern_mismatch` | `medium` |
| Builder force-accepts past a branch-switch warning | `artifact_rewritten` | `low` |
| Builder declines the coverage / CI stub offer | `complement_rejected` | `medium` |
| Builder declines a Pattern #13 complement offer | `complement_rejected` | `high` |
| Auto-write target path collision (existing file) | `artifact_rewritten` | `low` |
| No matching idiom template for detected framework | `idiom_mismatch` | `high` |

The rejection-*pattern* probe (≥3 consecutive low-confidence rejects in one session) is item #8 — not this item. This item logs each reject individually.

When in doubt, don't log. False positives poison `/evolve`.

## What the Generate SKILL is NOT

- Not an auditor. Generate assumes the audit already happened and consumes its state.
- Not a coverage command. `/vibe-test:coverage` is the standalone measurement command; generate invokes it only indirectly via the audit-state it reads.
- Not a fixer. If a generated test fails, `/vibe-test:fix` owns that repair — including the rollback-to-pending path for auto-written tests that broke CI.
- Dry-run previewer behavior (`--dry-run` / `--apply-last-dry-run`) is defined in the "Safety Features > A. Dry-run mode (G9)" section above.
- Rejection-pattern probe behavior (≥3 consecutive low-confidence rejects) is defined in "Safety Features > B. Rejection-pattern probe (G4)" above.
- Not a Playwright author. E2E generation defers entirely to the `playwright` plugin via Pattern #13.
- Not a TDD stand-in. If `superpowers:test-driven-development` is installed and the builder is authoring NEW features, defer.

## Safety Features

The base flow above is the happy path. Three safety features extend it: dry-run preview (G9), rejection-pattern probe (G4), and L2 feedback capture (feeds `/evolve`). These are *additive* — they do not change Steps 0–9 when the builder runs the command without `--dry-run` and without hitting a probe trigger.

### A. Dry-run mode (G9) — `--dry-run` and `--apply-last-dry-run`

**Trigger:** the builder passes `--dry-run` (preview) or `--apply-last-dry-run` (replay the cached preview within the 24h TTL).

**Import surface (from `@esthernandez/vibe-test/state`):**

- `cacheDryRun(repoRoot, {payload, plannedWrites, ttlSeconds?, pluginVersion?, scope?, headHashAtGeneration?, sessionUUID?})`
- `readDryRunCache(repoRoot)` — returns `DryRunCache | CacheExpired | null`
- `clearDryRunCache(repoRoot)`
- `dryRunCachePath(repoRoot)` — `<repo>/.vibe-test/state/last-dry-run.json`
- `formatExpiredCacheReason(expired)` — canonical "expired" prose

#### `--dry-run` semantics

1. Run the full generate flow described above **up to Step 3d** (compose candidate test, env-var annotation, confidence assignment).
2. **Suppress every filesystem write** that Steps 3f, 4, 5, 6, 7, 8 would normally perform. That means:
   - **No writes to `tests/`** (auto-write lane is a no-op; the candidate is held in memory for the cache).
   - **No stages to `.vibe-test/pending/`** — do not call `stagePendingTest`; instead collect the intent into `plannedWrites`.
   - **No writes to `docs/TESTING.md`, `docs/test-plan.md`, `docs/vibe-test/generate-<ISO>.md`, `.github/workflows/vibe-test-gate.yml`**.
   - **No `project-state.ts writeProjectState` call; no `accepted.json` / `rejected.json` updates.**
   - **No `beacons.append` call.** Beacons are post-action signals; dry-run took no action.
3. **Session-log policy during dry-run.** The session-logger *sentinel* at Step 0 still fires (so the dry-run itself is discoverable in L2). All *other* session-log writes (accept/reject events, probe-fired marker, terminal entry) are deferred-with-tag: if the SKILL writes them at all, include `context.dry_run: true` so `/evolve` filters them out of L2 aggregation. Default policy: write only the sentinel + terminal entries (both tagged `dry_run: true`); skip per-test accept/reject events entirely — dry-run is a preview, not real feedback.
4. **Render the three output views** (markdown body, banner, generate-state JSON) with `WOULD WRITE` annotations instead of post-action summaries:
   - Banner header line: `Vibe Test · Generate · DRY-RUN PREVIEW — no files were written`.
   - Banner footer line: `DRY-RUN ended — run /vibe-test:generate --apply-last-dry-run to commit this preview (TTL 24h).`
   - Markdown artifact (held in memory, not written) uses the same heading + annotation.
   - JSON sidecar sets `dry_run: true` and `dry_run_cached_at: <ISO>` (the existing `generate-state.schema.json` already supports these fields).
5. **Cache the would-be output** via `cacheDryRun(repoRoot, {payload, plannedWrites, ...})`:
   - `payload` — SKILL-authored bag with the three rendered views + any per-test artifacts the replay will need (markdown body, banner string, generate-state object, per-test content bodies keyed by target path).
   - `plannedWrites[]` — ordered list `{path, action, content_summary, confidence?, lane?, audit_finding_id?, content?}`. Include full `content` for small writes (tests, test-plan entry, CI stub); omit for large markdown artifacts that can be re-composed at apply time.
   - `ttlSeconds` — default `DEFAULT_DRY_RUN_TTL_SECONDS` (86400). Do not override unless the builder explicitly requested a shorter window.
   - `headHashAtGeneration` — grab via `getCurrentHeadHash(repoRoot)` so apply-time can warn on branch switch.
   - `sessionUUID` — the session's UUID, so provenance is traceable.
6. **Surface the cache path in the banner footer**: `Dry-run cache: .vibe-test/state/last-dry-run.json (expires <ISO>).`

#### `--apply-last-dry-run` semantics

1. Call `readDryRunCache(repoRoot)`.
2. Branch on the result:
   - **`null`** (absent/unparseable) → halt: *"No dry-run cache found. Run `/vibe-test:generate --dry-run` first, then `--apply-last-dry-run` within 24h."*
   - **`{expired: true, ...}`** → halt using `formatExpiredCacheReason(...)` verbatim: *"dry-run cache expired; re-run --dry-run for fresh output (cached Xh ago, TTL 86400s)"*.
   - **`DryRunCache` (fresh)** → proceed.
3. **Branch-switch check.** If the cache's `head_hash_at_generation` differs from `getCurrentHeadHash(repoRoot)`, warn verbatim: *"Dry-run was produced against `<recorded_hash>`; you're now on `<current_hash>`. Source may have changed — re-run `--dry-run` for fresh output, or pass `--force` to apply anyway."* Do not proceed without explicit `--force`.
4. **Replay every `planned_writes` entry in order.** For each action:
   - `write-test` → atomic write of `content` to `path`.
   - `stage-pending` → `stagePendingTest({...})` rebuilt from `content` + `audit_finding_id` + `confidence`.
   - `write-pending-index` → `writePendingIndex(repoRoot, listPending(repoRoot))` after all stage-pending entries complete.
   - `append-test-plan` → `appendTestPlanSession` with the cached payload.
   - `update-testing-md` → `writeTestingMd` with the cached payload.
   - `write-ci-stub` → `writeCiStub` with the cached payload.
   - `update-project-state` → `writeProjectState` with the cached state.
   - `update-accepted-json` / `update-rejected-json` → atomic JSON writes.
   - `write-generate-state` → atomic JSON write to `.vibe-test/state/generate.json` (or scoped sidecar).
   - `write-markdown-artifact` → write the markdown body to `docs/vibe-test/generate-<ISO-date>.md`.
5. After every planned write succeeds, `clearDryRunCache(repoRoot)`. The cache is single-use.
6. Append a session-log terminal entry with `context.applied_dry_run_session_uuid: <session_uuid>` so provenance links the apply session to the originating dry-run session.
7. Render the three output views in *post-action* shape (no WOULD-WRITE annotations) with a banner footer: `Applied from dry-run cached at <ISO>.`

**If any replay step fails**, halt and surface the error. Do NOT clear the cache on failure — the builder may want to fix the environmental issue and retry.

### B. Rejection-pattern probe (G4)

**Trigger:** inside Step 5 (inline reconciliation) and Step 4 (pending-queue prompt) — after every reject, check the probe.

**Import surface (from `@esthernandez/vibe-test/generator`):**

- `recordFeedbackEvent({sessionUUID, event: 'test_rejected', ...})` — called per reject (Feature C below).
- `shouldFireProbe(sessionUUID, threshold = 3)` — returns `true` iff ≥3 trailing consecutive rejects AND probe hasn't fired this session.
- `markProbeFired(sessionUUID)` — appends a marker so the probe doesn't re-fire.

**Flow:**

1. After writing the reject feedback event (Feature C), call `shouldFireProbe(sessionUUID)`.
2. If `true`:
   1. **Pause the per-gap loop.** Do not generate the next candidate until the builder has answered.
   2. Prompt verbatim (tier-adapted glosses allowed — see Tier-Adaptive Language):
      > *"I'm generating tests you keep rejecting — something in my approach is off. Want to tell me what's wrong? Helps me do better now and on your next project."*
   3. `markProbeFired(sessionUUID)` immediately — avoids a race where a re-prompt fires on the same sessionUUID before the builder answers.
   4. Read the builder's response. Branch on **SKILL reasoning**:

      | Response signal | Branch | Heuristic cue |
      |---|---|---|
      | **Friction-flavored** | `friction_log.append({friction_type: 'generation_pattern_mismatch', symptom: <full response>, confidence: 'medium', agent_guess_at_cause: '<one-line agent guess>'})` | Explicit critique of the generation approach: *"you're generating X that don't apply"*, *"the fixture pattern is wrong"*, *"tests reference an API that doesn't exist"*, *"you keep assuming vitest but this is jest"*. Anything that names a mistake the generator made. |
      | **Wins-flavored** | `wins_log.append({event: 'high_quality_pruning', working_as_designed: true, symptom: <full response>, context: '3-consecutive-reject probe'})` (Pattern #14 explicit-success-marker) | Builder says the tests are fine, rejection is pruning: *"you're doing fine, I'm just selective"*, *"these are good but I only want smoke right now"*, *"approach is right, I'm curating hard"*, *"tests are fine, I don't need that many"*. Acceptance with stylistic/scope constraint. |

      When in doubt between the two branches, prefer the friction branch. False-positive friction poisons `/evolve` less than false-positive wins (which would let a real problem sit unfixed).

   5. Reset the internal consecutive-reject counter for the session — the probe marker already short-circuits `shouldFireProbe` on the next call, but the SKILL should also visually reset its own "counter" in its reasoning so it doesn't nag the builder a second time.
   6. Thank the builder concisely and resume the per-gap loop with the next gap (not a re-generation of the rejected ones).

3. If `false`, continue normally. No probe prompt, no extra logs.

**Per-session fire-once:** the probe fires at most once per sessionUUID. A second wave of rejects later in the same session does NOT re-trigger. Rationale: if the builder is still rejecting after a probe, the guidance they gave either didn't stick in our reasoning or the problem is deeper than one conversational correction. Let `/evolve` aggregate the pattern across sessions instead of nagging in-flight.

**Dry-run interaction:** during `--dry-run`, the probe does not fire (there are no real rejects — the SKILL doesn't prompt for inline accept/reject in preview mode). `--apply-last-dry-run` also skips the probe (the decisions were already cached).

### C. L2 feedback capture during normal flow

**Every accept and every reject writes a session-log entry.** This is *additive* to Steps 3f, 4, and 5 — the state writes in Step 8 still happen. The feedback entries feed `/evolve` at Level 2 (session memory); without them, `/evolve` can see counts but not individual decision context.

**Import surface:**

```ts
import {
  recordFeedbackEvent,
  ACCEPT_EVENT,   // 'test_accepted'
  REJECT_EVENT,   // 'test_rejected'
} from '@esthernandez/vibe-test/generator';
```

**Trigger points:**

| Flow step | Event | Required fields |
|---|---|---|
| Step 3f auto-write success | `test_accepted` (tier `high`) | `sessionUUID, event, confidenceTier: 'high', auditFindingId, framework` |
| Step 3f inline accept | `test_accepted` (tier `low`) | `sessionUUID, event, confidenceTier: 'low', auditFindingId, framework` |
| Step 3f inline reject | `test_rejected` (tier `low`) | `sessionUUID, event, confidenceTier: 'low', auditFindingId, framework, rejectionReason` (if supplied) |
| Step 4 pending accept (no branch switch) | `test_accepted` (tier `medium`) | `sessionUUID, event, confidenceTier: 'medium', auditFindingId, framework` |
| Step 4 pending reject with reason | `test_rejected` (tier `medium`) | `sessionUUID, event, confidenceTier: 'medium', auditFindingId, framework, rejectionReason` |
| Step 4 force-accept past branch-switch | `test_accepted` (tier `medium`) + friction entry as in Step 4 | Same as pending accept |

**Call pattern:**

```ts
await recordFeedbackEvent({
  sessionUUID,
  event: REJECT_EVENT,
  auditFindingId: gap.id,
  framework: inventory.test_frameworks[0] ?? 'vitest',
  confidenceTier: 'medium',
  rejectionReason: builderReason, // omit or null when no reason supplied
});
```

**Dry-run guard:** during `--dry-run`, **do not** call `recordFeedbackEvent` — preview mode has no real decisions. If for some reason the SKILL decides to write during dry-run, pass `dryRun: true` to tag the entry; `/evolve` filters those out.

**Relationship to Friction/Wins logs:** the feedback events are *raw signal*; they live in the session log. Friction/wins entries are *interpreted signal* — the SKILL creates them only when the rejection signal carries a reason that fits a `friction_type` (pattern mismatch, idiom mismatch, etc.) or when the probe response fires a wins entry. Do not log friction for every reject automatically; the reason has to *say something*.

### Dry-run cache schema

Schema file: `skills/guide/schemas/dry-run-cache.schema.json` (draft-07). Required fields: `schema_version`, `cached_at`, `ttl_seconds`, `payload`, `planned_writes`. Optional: `plugin_version`, `repo_root`, `scope`, `head_hash_at_generation`, `session_uuid`. Validation runs inside `cacheDryRun` — a schema miss throws with the ajv errors surfaced to the SKILL verbatim so the builder sees a clear error. Reads are permissive: `readDryRunCache` returns the raw cache even on schema drift so the apply path can decide.

## Why This SKILL Exists

The hard part of testing isn't writing the first test — it's the momentum to write the hundredth. Audit produces the gap list. Generate turns each gap into a concrete file the builder either stages, accepts, or rejects. The three confidence lanes exist because different gaps deserve different levels of ceremony: a smoke render on a well-patterned component doesn't need a committee; a behavioral test that mocks a complex interaction does.

G2 (auto-write) is the fast lane for obvious wins. G3 (staged batch review) is the focus lane for medium-stakes judgment calls — the builder can review 20 tests in 5 minutes instead of 20 individual 30-second decisions. G4 (inline) is the judgment lane for genuinely novel cases where the SKILL needs the builder's eyes.

The `accepted.json` / `rejected.json` files plus the session-memory thread turn those individual decisions into team-level patterns over time. *"Your team has rejected 4 Unicode edge-case tests — still skip?"* is only possible because the history is there.

The env-var annotation + CI-stub integration means the builder never gets surprised by *"test works locally, fails in CI because the env var isn't in the pipeline."* The rejection-*pattern* probe (item #8) closes the feedback loop when the SKILL is generating tests the builder keeps refusing.

Pattern #13 deferrals keep Vibe Test honest about its own boundaries: TDD skill owns new-feature tests; Playwright owns E2E; Tessl owns raw coverage parsing. Vibe Test coordinates; it doesn't re-implement.
