---
name: fix
description: "This skill should be used when the user says `/vibe-test:fix`. Diagnoses broken tests and test harnesses, routes repairs by confidence (high → auto-repair with rationale; medium → stage in `.vibe-test/pending/fixes/`; low / complex → defer to `superpowers:systematic-debugging`). Detects harness-level breaks (broken runner, missing binary, cherry-picked denominator) distinctly from test-logic breaks. Rolls back auto-written generated tests to pending when they are the source of CI breakage."
argument-hint: "[--path <glob>]"
---

# fix — Diagnose + Repair Broken Tests & Harnesses

Read [`../guide/SKILL.md`](../guide/SKILL.md) for your overall behavior (persona, experience-level adaptation, Pattern #13 composition rules, version resolution). Then follow this command end to end.

Fix is the repair surface of Vibe Test. A builder who runs `/vibe-test:fix` is asking *"something is broken — diagnose it honestly, propose the smallest correct repair, and stay out of my way when the problem is deeper than you can responsibly solve."* The command distinguishes **test-logic breaks** (an assertion that doesn't match reality, a mock wired wrong, a fixture that drifted) from **harness-level breaks** (the runner pool timed out, the test binary isn't installed, the coverage denominator is cherry-picked). Harness breaks are reported *separately* — they're the WSYATM-class failures audit already named, but fix is where they get repaired.

## What This Command Does, In One Sentence

Detect failures → diagnose each + assign confidence → route high / medium / low per confidence → hand deep-diagnosis cases to `superpowers:systematic-debugging` when present → offer rollback for auto-generated tests that are the actual source of breakage → emit three output views.

## Prerequisites

### Blocking prereq (Pattern #16 — must confirm)

- **Failure signal available** — one of:
  - A recent test run output file (check `.vibe-test/state/last-run.json` if present, or builder-provided output pasted into chat), OR
  - Ability to invoke `src/coverage/runCoverage()` and capture the child process exit + stderr, OR
  - Builder explicitly describes the failure symptom.
- If NONE of those are available:
  > *"I can run your tests to capture failures, or you can paste the last failing output. Either way works — which do you want?"*
  >
  > Wait for the builder's decision. Never fabricate a failure to fix.

### Shaping prereqs (Pattern #16 — adapts silently)

- **Scope (F3)** — if `--path <glob>` is passed, narrow the fix scope. Read the matching scoped audit-state (`audit-<hash>.json`) if present — it carries the classification + prior gap context that improves diagnosis quality. Full-repo fixes read `audit.json` when available.
- **State freshness** — a prior audit is *useful but not required*. Without audit context, fix's harness-break detection degrades to "symptom-only" mode (no tier-aware severity shaping). Warn the builder once and continue.
- **Prior generated tests** — read `.vibe-test/state/accepted.json` to identify auto-written tests. These become candidates for the F1 rollback hook if their failure is the trigger.

## Before You Start

- **Guide SKILL** — [`../guide/SKILL.md`](../guide/SKILL.md). Persona opening/handoff lines, experience-level verbosity, Pattern #13 anchored + dynamic, session memory interfaces.
- **Data contract** — [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) section "fix". You own writes to `.vibe-test/pending/fixes/` (proposed staged repairs), `.vibe-test/state/fix.json` (state sidecar), and updates to `accepted.json` / `rejected.json` when a rollback moves an auto-written test back to pending. You read audit-state and last-run outputs.
- **Plays well with** — [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md). Entries with `applies_to: fix` are `superpowers:systematic-debugging` (flagship deferral) and `superpowers:verification-before-completion` (post-repair verification co-invoke).
- **Friction triggers** — [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) `/vibe-test:fix` section.
- **Tier-adaptive language** — `src/reporter/tier-adaptive-language.ts`.
- **Session logger** — [`../session-logger/SKILL.md`](../session-logger/SKILL.md). `start('fix', project)` at entry, `end({sessionUUID, command: 'fix', outcome})` at exit.
- **Friction logger** — [`../friction-logger/SKILL.md`](../friction-logger/SKILL.md). Entries when a rollback happens (signals that auto-write confidence mis-calibrated) or when a complex diagnosis is deferred.

## Primitive surface

Import surface (reusing existing `src/` modules — no new TypeScript modules introduced by fix):

- **`src/coverage/runCoverage`** — to re-run tests and capture exit + stderr when no cached run-output exists.
- **`src/scanner/scan`** — for the framework / dependency detection that powers harness-break classification.
- **`src/state/project-state`** — `readProjectState`, `scopeHash`, `projectStateSidecarPath` for audit-state load.
- **`src/state/atomic-write`** — `atomicWriteJson`, `atomicWrite` for staged-fix writes.
- **`src/state/friction-log`** — per-rollback entries.
- **`src/state/session-log`** — sentinel + terminal.
- **`src/state/beacons`** — terminal beacon.
- **`src/reporter`** — `createReportObject`, `renderBanner`, `renderMarkdown`, `renderJson`, `getLanguageKnobs`.
- **`src/handoff`** — `appendTestPlanSession` (to record the fix session chronologically).
- **`src/generator/pending-dir-manager`** — `listPending`, `writePendingIndex`, `getCurrentHeadHash` (the fix's pending-dir layout mirrors generate's; fixes go under `.vibe-test/pending/fixes/` while generated tests go under `.vibe-test/pending/tests/` so the two never collide).

Confidence assignment is **SKILL reasoning** — no deterministic `fix-confidence.ts`. Reason over the failure signature + the repair scope + how many downstream tests depend on the change.

## Flow

### Step 0 — Session-logger sentinel

Before any user-facing output:

1. Read `shared.preferences.persona`, `shared.preferences.pacing`, and `plugins.vibe-test.testing_experience` (fallback `shared.technical_experience.level`) from `~/.claude/profiles/builder.json`.
2. Invoke `session-logger.start('fix', project_basename)`. Hold the returned `sessionUUID` in memory until Step 9.
3. Compose the persona-adapted opening line per [guide > "Persona Adaptation"](../guide/SKILL.md#persona-adaptation).

### Step 1 — Blocking prereq check

Run the blocking prereq described above. If the check fails, render a gentle block and halt. Do NOT proceed; do invoke `session-logger.end({outcome: 'aborted'})`.

### Step 2 — Pattern #13 announcement (anchored complements)

Parse [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) via `loadAnchoredRegistry()`. Filter to entries whose `applies_to` includes `fix`. For each entry present in the agent's available-skills list:

- **`superpowers:systematic-debugging`** — announce verbatim: *"When a diagnosis is deeper than a one-shot repair, I'll hand off to superpowers:systematic-debugging so we reason through the failure systematically before committing code."* This deferral is the flagship — low-confidence diagnoses go there.
- **`superpowers:verification-before-completion`** — announce verbatim: *"After a repair lands, verification-before-completion owns the 'is it actually fixed?' check. I won't declare the repair complete without its sign-off."*

Surface at most ONE anchored complement announcement per invocation. Prefer systematic-debugging over verification-before-completion when both are present (debugging fires first in the flow; verification fires last).

### Step 3 — Collect failure signals

Three input paths, in priority order:

1. **Builder-provided failure output** — if the builder pasted test-run stderr / stdout into the current conversation, parse it. Look for signatures:
   - `FAIL` lines naming the test file + assertion.
   - `Timeout of Xms exceeded` (harness-level — broken runner).
   - `Cannot find module '<pkg>'` (missing dep or typo).
   - `SyntaxError` / `ReferenceError` at the top of the output (harness bootstrapping failure).
2. **Cached last-run state** — read `.vibe-test/state/last-run.json` if present. Writers of this file are `gate` + `coverage`; if the builder just ran either, the output is fresh.
3. **Live run** — invoke `runCoverage({framework, cwd, adapterAccepted: true, actualSourceFiles, c8TestCommand})` if no output is available and the builder opted in. Do NOT run silently — always ask first (*"Want me to run your tests now to capture the failures? Takes about {T}s."*).

For each failure found, build a `Failure` record in-SKILL:

```
{
  id: 'fail-<counter>',
  source: 'builder-pasted' | 'last-run' | 'live-run',
  kind: 'test-logic' | 'harness-break',
  subkind: 'broken_test_runner' | 'missing_test_binary' | 'cherry_picked_denominator' | 'assertion-mismatch' | 'mock-drift' | 'fixture-drift' | 'import-missing' | 'unknown',
  test_file: '<path>' | null,
  assertion_excerpt: '<one-line>' | null,
  raw_output_excerpt: '<up to 20 lines>',
  stack_top_frame: '<path:line>' | null,
}
```

### Step 4 — Harness-break detection (F2)

Three distinct harness-level finding types — these must be surfaced separately from test-logic failures because the repair pattern is different (config edit / install command) and the severity is critical by default.

1. **`broken_test_runner`** — e.g., vitest forks-pool timeout signature, jest circular require, mocha global timeout. Pattern-match on the failure excerpt:
   - Vitest + *"Test timed out in 5000ms"* or *"forks worker exited"* → pool mis-configured; propose switching to `pool: 'threads'` or `pool: 'forks', poolOptions.forks.singleFork: true`.
   - Jest + *"Jest worker encountered 4 child process exceptions"* → propose `--runInBand` in the test script.
   - Mocha + *"Error: Timeout of 2000ms exceeded"* on every suite simultaneously → propose `--timeout 10000` at the suite level (not global).
2. **`missing_test_binary`** — `package.json` script references e.g. `jest/bin/jest.js` or `vitest` but the package is not in `dependencies` / `devDependencies`. Cross-check against `inventory.detection.allDependencies`. Propose the minimal install command: `npm install -D <pkg>@<inferred-version-or-latest>`.
3. **`cherry_picked_denominator`** — if the audit already flagged this, carry it through as a finding and point at the coverage SKILL: *"This is a coverage-denominator break, not a test-logic break — `/vibe-test:coverage` owns the adaptation-prompt UX for that. I'll surface it here as a finding and let that command do the repair."*

Each harness-break finding goes into the ReportObject with:
- `category: 'harness-break'`
- `severity: 'critical'` (harness breaks make every downstream number a lie)
- `rationale` naming the exact signature and the one-line config fix
- `example_pattern` showing the minimal-diff fix tailored to the framework

Harness breaks take precedence in the banner ordering — builders need to know when their tool is lying to them before they fix individual tests.

### Step 5 — Diagnose test-logic failures (F1)

For each `Failure` with `kind === 'test-logic'`, compose a diagnosis. SKILL reasoning — read the failing test + the code under test, form a hypothesis, and name it:

- **`assertion-mismatch`** — the assertion expects X, the code produces Y. Diagnosis includes the concrete diff between X and Y.
- **`mock-drift`** — a mock returns shape A, but the code has since started consuming shape B. Diagnosis names the mock definition file + the consumer.
- **`fixture-drift`** — a test fixture references a schema field that has been renamed / removed. Diagnosis names the fixture + the affected schema.
- **`import-missing`** — the test imports a symbol that no longer exists at the import path. Diagnosis names the missing symbol.
- **`unknown`** — the failure doesn't fit a known pattern. This triggers Step 6 (defer).

### Step 6 — Assign confidence + route

For each diagnosed failure, assign confidence using SKILL reasoning:

- **High (≥0.90 auto-repair)** — the fix is a single-file, mechanical edit with no behavior change and no downstream impact. Typical: assertion number off-by-one, import path typo, fixture field renamed identically in one place.
- **Medium (0.70–0.89 stage in pending/fixes)** — the fix is correct but involves judgment. Typical: mock shape update that might affect other tests, fixture refactor that touches factories, test-logic where the "right" assertion depends on intent.
- **Low (<0.70) / unknown** — the diagnosis is uncertain, the fix would touch multiple files, or the failure has multiple plausible causes. **Defer to `superpowers:systematic-debugging` when present; otherwise surface the diagnosis + ask the builder.**

Route per confidence:

#### High — auto-repair

1. Compose the patch (unified diff format, one hunk per file).
2. Apply atomically via `atomicWrite` — never streaming partial edits.
3. Add an `Action` to the report: `{kind: 'write', description: '<one-line diagnosis>', target: '<path>'}`.
4. If the file is an auto-generated test (header includes *"Generated by Vibe Test"*), handle via Step 7 (rollback hook) FIRST; do not auto-repair.

#### Medium — stage in `.vibe-test/pending/fixes/`

1. Create `.vibe-test/pending/fixes/<mirror-of-target>.fix.md` containing:
   - A markdown header with the diagnosis + confidence + HEAD hash at generation time.
   - The unified diff of the proposed repair.
   - A one-sentence rationale naming what the fix changes and why.
2. Add the entry to `.vibe-test/pending/fixes/index.md` (overwrite with full listing on each run).
3. Add an `Action` to the report: `{kind: 'stage', description: '<one-line diagnosis>', target: '<staged path>'}`.
4. At prompt time, ask the builder:
   > *"{N} fixes staged at `.vibe-test/pending/fixes/index.md`. Accept-all / accept `<path>` / reject `<path>` --reason "..." / come back later?"*

#### Low / unknown — defer or ask

1. If `superpowers:systematic-debugging` is present → announce the deferral:
   > *"Handing this one off to superpowers:systematic-debugging — the failure signature has more than one plausible cause and I'd rather reason through it properly than guess. Follow that skill's flow, then come back to `/vibe-test:fix` once you know the root cause."*
   Add an `Action`: `{kind: 'other', description: 'deferred to superpowers:systematic-debugging', target: '<failure id>'}`.
2. If the discipline skill is absent → ask the builder for context:
   > *"The failure in `{test_file}` has more than one plausible cause — `{hypotheses}`. Which one matches your recent changes? I'll tailor the diagnosis from there."*

Log `friction_type: "complex_diagnosis_deferred"` at confidence `medium` whenever a failure takes the defer path — the aggregate signal tells /evolve where fix's automatic diagnosis is weakest.

### Step 7 — Rollback hook (F1 — auto-generated test broke CI)

For every `Failure` whose `test_file` matches an entry in `accepted.json` AND whose file content starts with a header matching `/^\/\/ Generated by Vibe Test v[\d.]+ on .+\. Confidence: HIGH\. Audit finding: #\S+\./m`, the failing test IS an auto-written generated test. The proper move is *not* to auto-repair — the correct move is **revert to pending for re-review**:

1. Read the current content of the failing test.
2. Compute the pending path: `<repoRoot>/.vibe-test/pending/tests/<mirror-of-target>`.
3. Atomically write the current content (preserving the header) to the pending path.
4. Delete the original test file (or `git rm`-equivalent so diff shows cleanly).
5. Remove the entry from `accepted.json`.
6. Ask the builder:
   > *"The failing test `{test_file}` was auto-written at HIGH confidence — it's now at `.vibe-test/pending/tests/{path}` for re-review. I didn't try to repair it in place because auto-write confidence was miscalibrated for this case. Re-review, edit, or reject?"*
7. Log `friction_type: "artifact_rewritten"` at confidence `high` — high confidence because this is a direct miscalibration signal for the generator.
8. Add an `Action`: `{kind: 'revert', description: 'auto-written test reverted to pending after CI break', target: '<pending path>'}`.

The rollback hook is the integrity mechanism. It admits that the generator was wrong and gives the builder the steering wheel back without silent overwrites.

### Step 8 — Pattern #13 co-invoke: verification-before-completion

After all high-confidence repairs are applied AND after the builder has accepted any medium-tier staged fixes:

- If `superpowers:verification-before-completion` is present, announce the co-invoke:
  > *"Handing off to superpowers:verification-before-completion to run the 'is it actually fixed?' check — I won't declare the repair complete without its sign-off."*
- The co-invoke is advisory; if the discipline skill isn't present, ask the builder to run the failing tests once (*"Want me to re-run the failing tests to confirm the fix held?"*) — never claim the fix is complete without evidence.

Log the co-invoke as `complements_invoked` on the terminal session entry.

### Step 9 — Assemble ReportObject + render three views

Build the `ReportObject` via `createReportObject({command: 'fix', plugin_version, repo_root, scope, commit_hash})`. Populate:

- `classification` — carry forward from audit-state if present; otherwise null.
- `score` — carry forward the last `coverage_snapshot` from audit-state if present; otherwise null. Fix does not re-score.
- `findings` — one entry per `Failure` the SKILL surfaced. Harness breaks come first (severity: critical), test-logic breaks next (severity derived from diagnosis + tier).
- `actions_taken` — all the `Action` records from Steps 6 + 7.
- `deferrals` — the Pattern #13 matches from Step 2 (verbatim `deferral_contract` prose).
- `handoff_artifacts` — list of files written / modified / staged this run.
- `next_step_hint` — persona-adapted. Default: *"Re-run your tests to confirm the repair held. `/vibe-test:gate` when you're ready for CI threshold check."*

Render three views in parallel:

- `renderMarkdown(report, {proseSlots})` → `docs/vibe-test/fix-<ISO-date>.md`.
- `renderBanner(report, {columns, disableColors: !isTty})` → printed to chat.
- `renderJson({report, repoRoot, skipValidation: true})` → `.vibe-test/state/fix.json`. (No `fix-state.schema.json` exists in v0.2 — validation is skipped; the report-object shape is stable enough for consumers.)

### Step 10 — State writes

1. **`session-logger.end({sessionUUID, command: 'fix', outcome: 'completed', key_decisions, complements_invoked, artifact_generated})`** — terminal entry paired to Step 0.
2. **`beacons.append(repoRoot, {command: 'fix', sessionUUID, outcome: 'completed', hint: '<N repaired, M staged, K deferred, R rolled back>'})`** — Pattern #12.
3. **`appendTestPlanSession(repoRoot, {command: 'fix', timestamp: nowIso, sessionUUID, classification: <one-line from audit>, generated_tests: [], rejected_with_reason: [], notes: <one-line summary>})`** — chronological log entry.

On any state-write failure: log a `runtime_hook_failure` friction entry and continue — the builder already saw the banner + markdown.

### Step 11 — Handoff line

Persona-adapted handoff line per [guide > "Handoff Language Rules"](../guide/SKILL.md#handoff-language-rules):

| Persona | Handoff line |
|---------|--------------|
| `professor` | *"Run your tests to confirm, then `/vibe-test:gate` when you're ready for CI. If anything else breaks, come back here."* |
| `cohort` | *"Re-run tests, then `/vibe-test:gate`. Any new breakage, back to `/vibe-test:fix`."* |
| `superdev` | *"Re-run. Then `/vibe-test:gate`."* |
| `architect` | *"Verify repair via `superpowers:verification-before-completion`, then `/vibe-test:gate` for CI threshold."* |
| `coach` | *"When you're ready, re-run the failing tests, then `/vibe-test:gate` for the CI check. I'm here if anything else breaks."* |
| `null` (default) | *"Re-run tests; `/vibe-test:gate` when ready."* |

**Do NOT prescribe `/clear` between commands.** Claude Code auto-compacts.

## Tier-Adaptive Language

| Knob | `first-time` / `beginner` | `intermediate` | `experienced` |
|------|---------------------------|----------------|---------------|
| Diagnosis length | 3-4 sentences, plain-English, inline glosses for *harness*, *fixture*, *mock* | 2-3 sentences, technical terms first-use-glossed | 1 sentence, pure technical |
| Rollback prompt | Explanatory paragraph | One-line explanation + path | Path + confidence + `revert/keep` |
| Defer announcement | Full deferral prose | Compressed prose + path | Path + one-line reason |

JSON output is **level-invariant**.

## Friction Logging

| Trigger | friction_type | confidence |
|---------|---------------|------------|
| Rollback hook fires (auto-written test reverted) | `artifact_rewritten` | `high` |
| Builder rejects a staged fix with a reason | `fix_rejected` | `medium` |
| Complex diagnosis deferred to systematic-debugging | `complex_diagnosis_deferred` | `medium` |
| Builder declines a Pattern #13 complement offer | `complement_rejected` | `high` |
| Repeated same-failure runs across sessions (>=3) | `recurring_failure` | `low` |

When in doubt, don't log. False positives poison `/evolve`.

## What the Fix SKILL is NOT

- Not an auditor. Fix does not re-classify or re-score; it reads prior audit context when available.
- Not a generator. If a test is missing, `/vibe-test:generate` owns authoring — fix only repairs existing tests.
- Not a coverage command. Cherry-picked denominator surfaces here as a harness-break *finding*, but the adaptation-prompt UX for the repair is owned by `/vibe-test:coverage`.
- Not a gate. Fix produces a repair report; `/vibe-test:gate` decides pass/fail against tier threshold.
- Not a systematic-debugger stand-in. Deep diagnoses defer to `superpowers:systematic-debugging` by design.

## Why This SKILL Exists

Broken tests are the single biggest drag on a vibe-coded app's velocity. When the test harness itself is broken, the scoreboard lies — and fixing the wrong layer is worse than doing nothing. Fix draws a bright line between harness-level breaks and test-logic breaks, names them separately in every output, and reserves auto-repair only for cases where the edit is genuinely mechanical. Every other case either stages for review (so the builder can see what's about to change before it lands) or defers to a skill that specializes in methodical root-cause work.

The rollback hook exists because every generator eventually writes a test at HIGH confidence that turns out wrong in CI. Auto-generated tests get a different social contract than hand-written ones: when they break, the default is to revert to pending for re-review, not to patch in place. That contract is the integrity mechanism that lets the generator be aggressive about confidence without gaslighting the builder.

Pattern #13 deferrals keep fix honest about its own boundaries: `superpowers:systematic-debugging` owns deep-cause reasoning; `superpowers:verification-before-completion` owns the "is it actually fixed?" check. Fix coordinates; it doesn't pretend to own either of those disciplines.
