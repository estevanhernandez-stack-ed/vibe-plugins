# Friction Triggers

Source of truth for *"when does each Vibe Test command log which friction type"*. Every command SKILL references this doc in its "Friction Logging" section. The friction-logger SKILL reads from here at log time only via the calling SKILL — this file is for humans and for future `/vitals` check #6, which audits the bidirectional consistency between this map and the actual `friction-logger.log()` invocations sprinkled across the command SKILLs.

## How to read this file

Each section covers one command. Within a section, a markdown table lists every condition under which that command should call `friction-logger.log()`, the friction type it emits, the default confidence, and any required-field notes.

| Column | Meaning |
|--------|---------|
| **Trigger** | The observable user-or-agent behavior that should produce a friction entry. |
| **Friction type** | One of the canonical types from `friction-log.ts`. |
| **Confidence** | `high` / `medium` / `low`. Fixed per trigger — never overridden at log time (defensive default). |
| **Notes** | Required additional fields, defensive-default reminders, complement attribution. |

**`/evolve` weighting at high/medium/low:** `1.0 / 0.6 / 0.3`. Calibration entries can zero a row out post-hoc.

## Catalog-wide invariant

> When in doubt, don't log.

A missed friction signal is recoverable through manual `/evolve` calibration. A false positive corrupts `/evolve`'s weighting and is much harder to undo.

## Universal triggers (apply to every command)

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| Sentinel session-log entry has no terminal pair after 24h (detected by `friction-logger.detect_orphans()`) | `command_abandoned` | high | Emitted out-of-band by router's first-run-of-the-day invocation. Per-command sections do **not** call this. |
| User asks the agent to re-explain a previous answer, AND the prior turn is captured in `symptom` as a quoted snippet | `repeat_question` | high | **Defensive default:** without a quoted prior in `symptom`, do not log. Better to miss than poison. The friction-logger module enforces this gate in `friction-log.ts` before it writes. |
| User asks for a rephrase or restatement ("say that more plainly", "TLDR") with a quoted prior | `rephrase_requested` | medium | Same quoted-prior discipline as `repeat_question`. |

The two question-style triggers apply to every command. Per-command tables below do not repeat them.

---

## /vibe-test (router)

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User dismisses the router banner and immediately runs a non-Vibe-Test command | `default_overridden` | low | Low confidence — the user may simply have been in passing. Only logs when the dismissal is within 30s of the banner render. |
| User declines a Pattern #13 complement offer shown in the banner (e.g., "plays well with vibe-sec — install?") | `complement_rejected` | medium | Set `complement_involved`. Medium confidence because router offers are ambient, not solicited. |

---

## /vibe-test:audit

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User explicitly overrides auto-detected tier classification (agent said `public-facing`, user says `internal`) | `default_overridden` | medium | Quote both options in `symptom`. The classifier is fuzzy by design — overrides are useful calibration, not failure. |
| User overrides auto-detected app_type (agent said `spa-api`, user says `full-stack-db`) | `default_overridden` | medium | App-type detection is more deterministic than tier; overrides here are a stronger signal the rules need review. |
| User rejects the "adapt your existing test:coverage command" proposal and forces `c8 --all` fallback | `coverage_adapter_refused` | medium | The adaptation prompt is the UX surface; refusal is legitimate preference for some builders. |
| Audit run produces wildly inconsistent classification between two back-to-back invocations on the same repo (same git HEAD, different tier or app_type) | `classification_mismatch` | low | Low because some flakiness is expected from mixed-stack repos; two inconsistent runs is pattern-detection input, not immediate action. |
| User declines a Pattern #13 complement offer (typically `vibe-doc` for runbook co-authoring, or `vibe-sec` for security-aware prioritization) | `complement_rejected` | high | Set `complement_involved`. |
| Audit produces a finding the builder asserts is wrong ("there's no cherry-picked denominator, the coverage is honest") | `classification_mismatch` | medium | Capture the contested finding in `symptom`. Medium because the agent may also be right. |

---

## /vibe-test:generate

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User rejects ≥3 consecutive generated tests in one session (rejection-pattern probe G4) | `generation_pattern_mismatch` | high | The probe's whole purpose is to surface this pattern. Emit once per triggered probe, not per reject. |
| User rewrites >50% of an accepted test's content before committing | `artifact_rewritten` | high | Measured on first save of the accepted file — subsequent edits are noise. |
| User rejects an auto-written (confidence ≥0.90) test | `generation_pattern_mismatch` | high | Auto-writes are the plugin's most confident outputs. A reject is a sharp calibration signal. |
| User overrides the framework idiom the generator chose (said "use jest-style", got vitest-style) | `idiom_mismatch` | medium | Set `symptom` to "expected <X>, generator picked <Y>". |
| User overrides the auto-generate threshold (asks for a different confidence cutoff mid-session) | `default_overridden` | low | Low because threshold tuning is ordinary preference. |
| User declines a Pattern #13 complement offer (typically `superpowers:test-driven-development`, `playwright`) | `complement_rejected` | high | Set `complement_involved`. |
| `--with-runtime=dev-server` or `--with-runtime=playwright` fails (process crash, MCP unavailable, port collision) | `runtime_hook_failure` | high | Capture the failure mode in `symptom`. High because runtime hooks are explicitly opt-in; failure is directly actionable. |
| User asks mid-generation for the agent to "show me what this would look like in Playwright instead" — implying the static-only output didn't fit | `composition_deferral_confusion` | medium | The deferral to playwright MCP was needed but not offered, or offered and misunderstood. |
| Generated test causes CI breakage that fix-SKILL rolls back to pending | `artifact_rewritten` | medium | Different failure mode than explicit edit — but same signal that the generated shape was wrong. |

---

## /vibe-test:fix

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User overrides fix's proposed remediation and picks a manual patch | `default_overridden` | medium | Quote both fixes in `symptom`. |
| Fix flags a harness-level break (F2) that the builder says is intentional ("yes, forks-pool timeout is a known CI quirk") | `harness_break` | medium | Harness findings are Vibe Test's flagship claim; a false positive is worth logging even if the user didn't complain. |
| User declines a Pattern #13 complement offer (typically `superpowers:systematic-debugging` for complex diagnoses) | `complement_rejected` | high | Set `complement_involved`. |
| Auto-written test rollback leaves the test suite in a worse state than before fix was invoked | `generation_pattern_mismatch` | high | The fix is supposed to be a safety net. When it makes things worse, that's a flagship failure. |

---

## /vibe-test:coverage

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User rejects the adaptation proposal (e.g., `--coverage.all` addition) | `coverage_adapter_refused` | medium | Same trigger as audit's; logged separately here because coverage may be invoked standalone. |
| User disputes the tier threshold the weighted score is measured against ("I'm internal-only, don't hold me to public-facing 70") | `tier_threshold_dispute` | medium | Capture claimed tier + measured tier in `symptom`. |
| User declines a Pattern #13 complement offer (typically `tessl:analyzing-test-coverage`) | `complement_rejected` | medium | Set `complement_involved`. Medium because Tessl-specific users self-select. |
| `c8 --all` fallback fails or produces a clearly wrong denominator | `harness_break` | high | The whole point of the fallback is honest coverage. Failure there is flagship. |

---

## /vibe-test:gate

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| Gate exits with code 1 (threshold breach) and the builder asserts the threshold is wrong for their context | `tier_threshold_dispute` | medium | Capture the threshold + weighted score + builder's claimed tier in `symptom`. |
| Gate exits with code 2 (tool error) repeatedly on the same repo | `harness_break` | high | Exit 2 is "something broke in the tool chain"; repeated same-shape failures are actionable. |
| User declines a Pattern #13 complement offer (typically `superpowers:verification-before-completion`) | `complement_rejected` | medium | Set `complement_involved`. Medium because gate is often invoked headless in CI where complement offers don't apply. |
| CI annotation format is misread by the build system (stdout contract mismatch) | `runtime_hook_failure` | medium | Surface the CI product + observed parse failure in `symptom`. |

---

## /vibe-test:posture

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| Posture takes longer than 3s to render (budget breach) | `runtime_hook_failure` | medium | Posture is the ambient-check surface; a slow posture defeats its purpose. Capture scan duration in `symptom`. |
| User asks posture to *do* something (run an audit, generate a test) — rather than just read | `sequence_revised` | low | Posture is read-only by contract; action requests suggest the user wanted a different command. Low because ordinary navigation. |

---

## /vibe-test:evolve (internal)

`/evolve` is a reflection command — it reads the logs and proposes SKILL changes. It does not emit friction itself; proposal rejections are captured as `default_overridden` against the specific command the proposal targets, not against evolve.

---

## /vibe-test:vitals (internal)

`/vitals` is a self-diagnostic — checks that files, schemas, and references resolve. User declines on auto-fix prompts are the **expected** mode of interaction, not friction. Logging them would flood `/evolve` with noise about users simply choosing not to apply a fix. By spec scope, `/vitals` does not call `friction-logger.log()`. Only the universal `repeat_question` / `rephrase_requested` triggers apply, and only under the quoted-prior gate.

---

## Adding a new trigger

When a command SKILL grows a new condition that should produce friction:

1. Add a row to that command's section above (or `Universal triggers` if it applies broadly).
2. Pick the friction type from the canonical list in `src/state/friction-log.ts`. If none fit, that's a signal the type set itself needs revisiting — open an `/evolve` proposal rather than coining a new type silently.
3. Pick confidence based on signal strength: high = concrete and unambiguous (explicit reject, harness break, measurable diff); medium = behavioral inference; low = could plausibly be normal exploration.
4. Add the matching `friction-logger.log()` invocation in the command SKILL at the trigger point.
5. Re-run `/vibe-test:vitals` to confirm check #6 passes both directions of the map.
