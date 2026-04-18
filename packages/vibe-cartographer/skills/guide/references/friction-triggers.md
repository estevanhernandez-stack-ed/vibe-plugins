# Friction Triggers

Source of truth for "when does each command log which friction type." Every command SKILL references this doc in its "Before You Start" section. The friction-logger SKILL reads from here at log time only via the calling SKILL — this file is for humans and for `/vibe-cartographer:vitals` check #6, which audits the bidirectional consistency between this map and the actual `friction-logger.log()` invocations sprinkled across the command SKILLs.

## How to read this file

Each section covers one command. Within a section, a markdown table lists every condition under which that command should call `friction-logger.log()`, the friction type it emits, the default confidence, and any required-field notes.

| Column | Meaning |
|--------|---------|
| **Trigger** | The observable user-or-agent behavior that should produce a friction entry. |
| **Friction type** | One of the seven canonical types from [`friction.schema.json`](../schemas/friction.schema.json) and [`data-contracts.md`](./data-contracts.md). |
| **Confidence** | `high` / `medium` / `low`. Fixed per trigger — never overridden at log time (defensive default #4 in `friction-logger/SKILL.md`). |
| **Notes** | Required additional fields, defensive-default reminders, complement attribution. |

The seven canonical friction types: `command_abandoned`, `default_overridden`, `complement_rejected`, `repeat_question`, `artifact_rewritten`, `sequence_revised`, `rephrase_requested`.

`/evolve` weighting at high/medium/low: `1.0 / 0.6 / 0.3`. Calibration entries can zero a row out post-hoc.

**Universal trigger (applies to every command):** `command_abandoned` is never emitted directly by a command SKILL — it surfaces only via `friction-logger.detect_orphans()`, which runs at `/onboard` startup and as `/vitals` auto-fix `(b)`. Don't list it in per-command tables; it's accounted for once, here.

## Universal triggers (any command)

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| Sentinel session-log entry has no terminal pair after 24h (detected by `friction-logger.detect_orphans()`) | `command_abandoned` | high | Emitted out-of-band by `/onboard` startup or `/vitals` (b). Per-command sections do **not** call this. |
| User asks the agent to re-explain or simplify a previous answer, AND the prior turn is captured in `symptom` as a quoted snippet | `repeat_question` | high | **Defensive default:** without a quoted prior in `symptom`, do not log. Better to miss than poison. |
| User asks for a rephrase or restatement (e.g., "say that more plainly", "TLDR") with a quoted prior | `rephrase_requested` | medium | Capture the topic and the quoted prior in `symptom`. Same quoted-prior discipline as `repeat_question`. |

The two question-style triggers (`repeat_question`, `rephrase_requested`) apply to every command. Per-command tables below do not repeat them — they're listed once here.

---

## /onboard

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User explicitly chooses opposite of recommended persona based on stored profile (e.g., decay prompt offers "still superdev?" and user switches) | `default_overridden` | low | The decay flow is *designed* to surface change — this is borderline noise. Confidence stays `low` so `/evolve` doesn't over-react to expected drift. |
| User says "no" or "skip" when offered to create the standard `docs/` folder structure | `default_overridden` | medium | Capture choice in `symptom`. |
| User declines a Pattern #13 complement offered during onboarding (e.g., links to `superpowers:brainstorming` for project ideation) | `complement_rejected` | high | Set `complement_involved` to the complement name (e.g., `superpowers:brainstorming`). |
| User abandons mid-onboarding, picks back up later, but skips the resumed prompts and re-runs `/onboard` from scratch | `sequence_revised` | medium | Detected by sentinel-without-terminal followed by a fresh sentinel for the same project within 24h. Surface in `symptom`. |

---

## /scope

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User says "no" or "skip" to a Pattern #13 complement offer (typically `superpowers:brainstorming` deepening) | `complement_rejected` | high | Set `complement_involved` field. |
| User explicitly chooses opposite of recommended deepening default (agent recommends "go deeper", user says "lock it in" — or vice versa) | `default_overridden` | medium | Quote the recommendation in `symptom`. |
| User rewrites >50% of the generated `scope.md` post-write (measured by line diff between agent-generated and committed version) | `artifact_rewritten` | high | Measure at `/reflect` time, not in-line. Confidence stays high because line-diff is concrete. |
| User skips ahead to `/prd` or `/spec` without `/scope` finishing | `sequence_revised` | medium | Detected by next-command sentinel from same project within 1h, no `/scope` terminal. |

---

## /prd

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User says "no" or "skip" to a Pattern #13 complement offer (typically `vibe-doc:scan` for prior-art context) | `complement_rejected` | high | Set `complement_involved`. |
| User explicitly opts out of the recommended "walk through stories one at a time" default and asks for a batch dump instead (or vice versa) | `default_overridden` | medium | Quote the recommendation in `symptom`. |
| User rewrites >50% of generated `prd.md` (line diff at `/reflect` time) | `artifact_rewritten` | high | Same measurement protocol as `/scope`. |
| User reorders the epic sequence agent proposed | `sequence_revised` | low | The epic order is a soft default; reorders are common. Confidence stays low. |

---

## /spec

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User declines a Pattern #13 complement offer (e.g., `claude-api`, `frontend-design:frontend-design`) for stack-specific guidance | `complement_rejected` | high | Set `complement_involved`. |
| User explicitly overrides agent's recommended architecture pattern (e.g., agent suggests "monolith", user says "split into services") | `default_overridden` | medium | Quote both options in `symptom`. |
| User rewrites >50% of generated `spec.md`, especially the Stack or Component sections | `artifact_rewritten` | high | Section-level diff is fine; doesn't need to be whole-file. |
| User asks the agent to "show me alternatives" or "what would X look like instead" mid-spec — implying the first answer didn't land | `default_overridden` | low | Confidence is low because alternative-seeking is also healthy exploration. |

---

## /checklist

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User reorders >25% of the generated checklist items before starting `/build` | `sequence_revised` | high | Concrete signal — the agent's dependency analysis was off. |
| User says "no" or "skip" when offered to split a large step into smaller items (or the reverse — collapses items the agent split) | `default_overridden` | medium | Quote the offered shape in `symptom`. |
| User rewrites >50% of generated `checklist.md` (item descriptions, not order — order changes are `sequence_revised`) | `artifact_rewritten` | medium | Distinguish content rewrite from order rewrite. |
| User declines a Pattern #13 complement offer (e.g., `superpowers:writing-plans` for plan-style scoping) | `complement_rejected` | high | Set `complement_involved`. |

---

## /build

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User overrides the recommended autonomy mode (agent recommends step-by-step, user picks autonomous, or vice versa) | `default_overridden` | medium | Quote the recommendation and the override in `symptom`. |
| User declines a Pattern #13 complement offer (e.g., `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:verification-before-completion`) | `complement_rejected` | high | Set `complement_involved`. Build is the single biggest complement-density command — expect multiple offers per session. |
| User asks the agent to skip a checklist item, then later un-skips it and asks for it after all | `sequence_revised` | high | The skip was the wrong call — concrete reversal signal. |
| User stops the build mid-checklist and re-runs `/checklist` (signaling the plan was wrong, not the build) | `sequence_revised` | medium | Detected by `/checklist` sentinel after a `/build` sentinel-without-terminal in the same project. |
| User rewrites a generated source file (>50% line diff) within the same `/build` session before continuing | `artifact_rewritten` | medium | Build artifacts are noisy by nature — confidence stays medium. |

---

## /iterate

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User declines a Pattern #13 complement offer (e.g., `simplify`, `frontend-design:frontend-design` for polish) | `complement_rejected` | high | Set `complement_involved`. |
| User overrides the recommended iteration scope (agent recommends "tighten errors", user picks "polish UI") | `default_overridden` | low | Iteration-scope picks are taste calls — confidence low. |
| User rewrites >50% of code the agent iterated on within the same session | `artifact_rewritten` | medium | Use commit-diff or live-buffer-diff at session end. |
| User abandons `/iterate` mid-flow without producing a terminal entry | (none here) | — | Caught by universal `command_abandoned`. |

---

## /reflect

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User declines the calibration check-in (`[skip]` to "want to mark false positives?") | `default_overridden` | low | The check-in is itself optional — declines are expected. Confidence low so it doesn't pollute the calibration signal. |
| User declines a Pattern #13 complement offer (e.g., `superpowers:requesting-code-review`) | `complement_rejected` | high | Set `complement_involved`. |
| User rewrites >50% of generated `reflection.md` | `artifact_rewritten` | medium | Reflections are personal — confidence medium. |
| User marks 3+ entries `false_positive` during the calibration check-in | (none — calibration is its own signal channel) | — | Calibration entries go to `friction.calibration.jsonl`, not `friction.jsonl`. /reflect should never log friction-about-friction. |

---

## /evolve

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User rejects a proposal in `proposed-changes.md` (chooses `[reject]` interactively or removes it from the queue) | `default_overridden` | medium | Capture proposal title in `symptom`. The fact that `/evolve` itself proposed the change is implicit. |
| User declines a Pattern #13 complement offer (e.g., `superpowers:writing-plans` to scope a multi-step proposal) | `complement_rejected` | high | Set `complement_involved`. |
| User rewrites >50% of an accepted proposal before applying it | `artifact_rewritten` | high | Strong signal — the proposal was directionally right but executed wrong. |
| User reorders the proposal queue significantly | `sequence_revised` | low | Queue order is a soft default. Confidence low. |

---

## /vitals

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| (none) | — | — | `/vitals` is a self-diagnostic. User declines on auto-fix prompts (`[n]` to a fix offer) are the **expected** mode of interaction — not friction. Logging them would flood `/evolve` with noise about a user simply choosing not to apply a fix. By spec scope, `/vitals` does not call `friction-logger.log()`. The check #6 audit confirms this absence is intentional, not an oversight. |

> **Forward-looking note:** This row stays empty by design through 1.5.0. If a future version of `/vitals` grows interactive behavior beyond pure check + offer-fix (e.g., asks the user to choose between two repair strategies), revisit this section.

---

## /friction (a.k.a. /vibe-cartographer:friction)

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| (none) | — | — | `/friction` is a read-only inspection command over `friction.jsonl`. Filters and displays existing entries; never writes. By spec scope, it does not call `friction-logger.log()`. |

> **Forward-looking note:** Same caveat as `/vitals` — if a future version grows interactive marking (e.g., "mark this entry false positive from the inspection view"), those marks should write to `friction.calibration.jsonl`, not generate new friction entries.

---

## Adding a new trigger

When a command SKILL grows a new condition that should produce friction:

1. Add a row to that command's section above (or `Universal triggers` if it applies broadly).
2. Pick the friction type from the canonical seven. If none fit, that's a signal the type set itself needs revisiting — open an `/evolve` proposal rather than coining a new type silently.
3. Pick confidence based on signal strength: high = concrete and unambiguous (line-diff, explicit reject); medium = behavioral inference; low = could plausibly be normal exploration.
4. Add the matching `friction-logger.log()` invocation in the command SKILL at the trigger point. `/vibe-cartographer:vitals` check #6 audits both directions — if you add the trigger here without the call, or vice versa, the next `/vitals` flags the drift.
