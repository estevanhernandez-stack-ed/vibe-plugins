# vibe-prompt v0.6 spec

**Status:** Draft. Source of truth for the v0.6 release. Mirror to `docs/vibe-prompt-v0.6/` before Cart autonomous build.

**Predecessor:** v0.5.0 (tagged `ae7b174`, shipped 2026-05-29) — added `/vibe-prompt:remediate` audit-to-fix loop with 3 fix categories + 5-dim confidence rubric + backup/rollback + scan completeness + system-injected var detection + composer.json auto-gen.

**Theme:** **Detection sharpness.** v0.4 was breadth (5th dimension + injection family). v0.5 was depth (audit-to-fix loop + supporting fixes). v0.6 sharpens what the plugin already DOES — making detection truthful where it was confidence-degraded, and closing the JSON-markings explicit-finding gap the user reported manually.

**Why v0.6 now:** v0.5 round-trip exposed two genuine accuracy gaps that v0.4/v0.5 surface only via low dimension scores or confidence degradation, not as explicit fire-able findings. Plus the user's original "JSON markings in synastry" manual finding (from v0.3 era) still has no explicit F-finding — it only shows up as synastry's 2/10 schema-tightness score.

---

## What ships

### 1. F12 API-parameter-aware detection (Cluster C #6)

**Severity:** F12 stays critical; v0.6 makes the detection deterministic instead of confidence-degraded.

**Problem:** v0.5's F12 fires on layer-order comparison from composer.json. But that model treats all composition as if it's at the same API boundary. Reality: when user content is passed in Gemini's `contents[]` parameter (user-turn) or OpenAI's `messages` array, it's structurally segregated from the `systemInstruction` parameter regardless of "layer" order. The API enforces the separation.

The Celestia3 round-trip showed this concretely: `dreamText` is passed in `contents[]`, NOT in `systemInstruction`. The v0.5 F12 detection couldn't see this distinction so it fired confidence-degraded (high not critical). With API-param awareness, it correctly does NOT fire — composition order is structurally safe.

**Detection rule extension:**
1. **composer.json layer extension** (see §1a schema change): each layer gains `apiParameter` field — one of `systemInstruction` | `contents` | `messages` | `instructions` | `prompt` | `null` (unknown).
2. **first-run-setup detection extension:** when classifying composer layers, identify which API parameter each layer is destined for. Heuristics:
   - Layer concatenated into `systemInstruction:` arg → `apiParameter: "systemInstruction"`
   - Layer interpolated into `contents[].parts[].text` (Gemini) or `messages[].content` (OpenAI/Anthropic) → `apiParameter: "contents"` / `"messages"`
   - Layer interpolated into a single `prompt:` string passed to OpenAI completions → `apiParameter: "prompt"`
   - Unknown → `null` (degrades F12 detection to v0.5 behavior for that layer)
3. **F12 detection rule update:**
   - If user-var layer's `apiParameter === "contents"` (or `"messages"`) AND system-instruction layer's `apiParameter === "systemInstruction"` → user content is structurally segregated; F12 does NOT fire (regardless of layer order)
   - If both layers share the same `apiParameter` (e.g., both interpolated into the same `systemInstruction` string) → F12 fires per v0.5 rule (composition order matters)
   - If either layer's `apiParameter === null` → confidence-degrade per v0.5 (severity high instead of critical)

**Acceptance:** F12 on Celestia3's Oneirocriton should NOT fire critical in v0.6 round-trip. (It also didn't fire critical in v0.5, but for the wrong reason — v0.5 fired confidence-degraded because composer.json was absent, then once composer.json was generated, the layer-order check passed. v0.6 fires the correct verdict deterministically: API parameter separates them, fully resolved.)

**Friction trigger:** `f12-api-parameter-detection-low-confidence` (medium) — apiParameter is null for one or more layers → recommend manual composer.json review.

### 2. composer.schema `global-directive` enum (Cluster C #7)

**Problem:** v0.5's first-run-setup composer detection emits `directive-field` for what should be `global-directive`. The detection picked the wrong enum value because `composer.schema.json`'s layer type enum doesn't have `global-directive`.

**Fix:** extend layer type enum to include `global-directive`. Keep `directive-field` as a deprecated alias (validates to true but emits warning). first-run-setup detection updated to emit `global-directive`.

**Score impact:** none directly — cosmetic + semantic.

### 3. Auto-handoff to /vibe-sec:audit on F12 critical (Cluster C #8)

**Problem:** v0.5 emits a handoff banner when F12 critical fires, recommending `/vibe-sec:audit` — but advisory only. User has to invoke vibe-sec manually.

**Fix:** new flag `:remediate --auto-handoff-vibe-sec`. When set AND F12 critical fires, `:remediate` invokes vibe-sec:audit before completing. Default: false (opt-in only).

**Composability rules:**
- `:remediate --auto-handoff-vibe-sec` requires vibe-sec to be installed; checks via `Skill` tool availability before invoking
- If vibe-sec not installed, falls back to v0.5 banner-only behavior + friction-log `auto-handoff-vibe-sec-unavailable`
- vibe-sec invocation passes `--scope user-input-boundary` to focus on the F12-relevant concern (assumes vibe-sec accepts this flag; if not, falls back to full audit)
- Cross-plugin coordination: vibe-sec's findings get appended to `.vibe-prompt/remediate/state/handoff-vibe-sec-<timestamp>.json` for cross-reference

**Friction triggers:**
- `auto-handoff-vibe-sec-completed` (positive) — handoff succeeded; vibe-sec returned findings
- `auto-handoff-vibe-sec-unavailable` (medium) — vibe-sec not installed; fell back to banner

### 4. F13 — Implicit output format (#9, the JSON-markings gap)

**Severity:** medium
**Score impact:** schema-tightness −2, instruction-clarity −1
**Detection method:** static analysis on inventory.json — no LLM call

**Why it's there:** the user's v0.3-era manual finding (JSON markings appearing in synastry reading output) is still not caught as an explicit finding in v0.4/v0.5. The structural cause is captured implicitly via synastry_report's 2/10 schema-tightness score (lowest in inventory), but there's no F-finding that says "this prompt uses structural cues but never declares prose-only, so the model may interpret the cues as 'output JSON.'" F13 closes this gap.

**Detection rule:**
1. **Structural-cue match (step A):** prompt content matches at least one of:
   - `[BRACKETS]` blocks (regex `\[[A-Z_]+\]`)
   - `{{var}}` templated sections more than 2× in the same prompt
   - JSON-like data sections (regex matching `^\s*\{[^}]*\}\s*$` block fences OR `: "[^"]+"` repeated 3+ times)
2. **Output-format declaration absence (step B):** prompt content does NOT contain any of:
   - `[OUTPUT FORMAT:` (any case)
   - `[OUTPUT_SCHEMA]` block
   - `Respond in JSON` / `Return JSON` / `JSON output` (explicit format declarations)
   - `prose only` / `no JSON` / `narrative response`
3. **Fire when:** step A matches AND step B finds nothing.

**Evidence:**
- `evidence.promptId`, `evidence.promptLocation`
- `evidence.detectedCues` — array of structural cues found (`["BRACKETS-blocks", "templated-vars-3x", "json-shaped-data"]`)
- `evidence.missingDeclarations` — what was looked for but not found

**Recommendation template:**
> The `{promptId}` prompt uses structural cues (`{detectedCuesList}`) that the model may interpret as a request for structured (JSON) output, but the prompt does not declare its expected output format. The model may emit JSON, code fences, or partial structure when prose was expected, or vice versa. Two fixes (pick one):
> 1. **If prose output expected:** add `[OUTPUT FORMAT: prose, no JSON or code fences. Respond in conversational narrative.]` directive near the persona statement.
> 2. **If structured output expected:** add an `[OUTPUT_SCHEMA]` block with the JSON schema declaration (use the existing schema if available; declare a new one otherwise).

**Edge cases:**
- A prompt with structural cues that intentionally requests flexible output (e.g., "respond as you see fit, structured or prose") would fire false-positively. Mitigation: explicit `[OUTPUT FORMAT: flexible]` directive suppresses F13.
- A prompt with `[OUTPUT_SCHEMA]` that DOES declare structured output gets F13 suppressed even if it has other structural cues.

**Friction triggers:**
- `f13-fired-but-prompt-intentionally-flexible-output` (low) — false positive on flexible-output prompts; user adds explicit suppression directive
- `f13-recommended-fix-applied-and-eval-confirms-output-stability` (positive) — F13 fix landed; subsequent eval shows consistent output shape

**Acceptance:** F13 should fire on `synastry_report` in Celestia3 round-trip. After applying the recommended fix (`[OUTPUT FORMAT: prose, no JSON or code fences]`), `:eval --prompts synastry_report` should produce consistent prose without JSON-marking leaks across multiple runs.

### 5. Category B voice-frame depth (#10)

**Problem:** v0.5's Category B detection regex matches banned-address phrases (e.g., "Fellow Pilgrim"). The natal_interpretation fix removed "Fellow Pilgrim" but left "quatrain-style narrative", "shattering of the veil", "ancient dust", "mirrors of mercury", "prophetic shadows" — all still echoing the prophet voice that the global directive bans. The Category B contradiction-removal fix only catches direct banned-phrase matches, not the voice-frame language patterns.

**Fix:** extend Category B detection to identify voice-frame contradictions.

**Detection rule extension:**
1. **Voice-frame extraction from global directive:** parse global directive for voice rules. Detect "ban" patterns:
   - Explicit bans: `(?i)never (use|say|call|address)`, `(?i)not (a|the) X`, `(?i)avoid X`
   - Persona affirmations that imply bans: `(?i)plain (modern|simple) language` (bans archaic), `(?i)contractions` (bans formal), `(?i)warm.{1,30}friend` (bans formal-priest)
2. **Voice-frame match in task prompt:** scan task prompt content for phrases that pattern-match the banned voice frame:
   - Archaic vocabulary (regex on known archaic patterns: "thou", "verily", "ancient", "veil", "mercury", "prophetic", "quatrain", "Fellow")
   - Ritualistic framing ("the cosmos", "the divine", "the source")
   - Capitalized abstract nouns ("the Pilgrim", "the Way", "the Source")
3. **Category B diff template extension:**
   - Existing: locate-and-rephrase banned phrase
   - NEW: detect voice-frame phrase clusters AND propose rewrites that preserve TASK intent while removing voice-frame contradiction
   - The proposed rewrite uses a per-app voice-rule extraction (from global directive's positive guidance) to inform the rewrite tone

**Confidence change:**
- Category B base confidence stays 0.75 for direct banned-phrase removal
- Voice-frame extension confidence drops to 0.65 (more semantic; higher voice-drift risk)
- Routes stage by default; `--apply-voice-frame-fixes` flag opt-in for auto-write

**Acceptance:** Re-run `:remediate` on Celestia3's natal_interpretation; v0.6 should generate an additional Category B diff that proposes rewriting "quatrain-style narrative" and "shattering of the veil" to align with the "plain modern language, warm friend" voice rule from the global directive. Staged for user review.

**Friction triggers:**
- `category-b-voice-frame-detection-confidence-low` (medium) — voice-frame phrases detected but per-app voice-rule extraction confidence < 0.6; user manual review needed
- `category-b-voice-frame-rewrite-rejected` (low) — user rejected the auto-generated rewrite; tune voice-rule extraction

---

## Schema additions / changes

### Extended: `composer.schema.json`
- `layers[].apiParameter` enum (`systemInstruction` | `contents` | `messages` | `instructions` | `prompt` | `null`)
- `layers[].apiParameterConfidence` number 0-1
- Layer type enum extended: add `global-directive`; `directive-field` deprecated but still validates (emit warning during schema validation)

### Extended: `audit.schema.json`
- `findings[].id` enum extended to include `F13`
- `findings[].apiParameterContext` optional object — populated when F12 fires; describes the API parameter separation analysis
- `findings[].voiceFrameContradictions` optional array — populated when Category B voice-frame extension fires; lists detected voice-frame phrases

### Extended: `remediate-result.schema.json`
- `appliedDiffs[].subCategory` optional string — for Category B, distinguishes `banned-phrase-removal` vs `voice-frame-rewrite`
- `f12HandoffsEmitted[].autoHandoffInvoked` optional boolean — true when `--auto-handoff-vibe-sec` triggered vibe-sec
- `f12HandoffsEmitted[].vibeSecResultPath` optional string — path to vibe-sec result file

### Extended: `pending-fix.schema.json`
- `findingCategory` enum gains optional sub-category for `B-voice-frame` distinction
- `voiceFrameRewriteRationale` optional string — explains how the rewrite aligns with global directive voice rule

### Extended: `config.schema.json`
- `remediate.autoHandoffVibeSec` boolean (default false)
- `remediate.applyVoiceFrameFixes` boolean (default false)
- `audit.f13.outputFormatExceptions` string array — user override for prompts intentionally flexible (suppresses F13)

### NEW: `handoff-vibe-sec.schema.json`
Records the vibe-sec invocation triggered by `--auto-handoff-vibe-sec`:
```json
{
  "type": "object",
  "required": ["runId", "timestamp", "triggeringFinding", "vibeSecVersion", "vibeSecFindings", "exitCode"],
  "properties": {
    "runId": {"type": "string"},
    "timestamp": {"type": "string", "format": "date-time"},
    "triggeringFinding": {"type": "string"},
    "vibeSecVersion": {"type": "string"},
    "vibeSecFindings": {"type": "array"},
    "exitCode": {"type": "integer"},
    "scope": {"type": "string"}
  }
}
```

---

## SKILL additions / changes

### Extended
- `skills/audit/SKILL.md` — F12 detection updated for API-parameter-aware logic; F13 detection added; voice-frame extraction step added for Category B context
- `skills/audit/references/smell-rubric-f1-f12.md` → `smell-rubric-f1-f13.md` (rename + add F13)
- `skills/audit/references/scoring-dimensions.md` — F13 score impact + voice-frame extension note
- `skills/first-run-setup/SKILL.md` — composer layer detection extended for apiParameter; emits `global-directive` instead of `directive-field`
- `skills/first-run-setup/references/composer-detection.md` — apiParameter heuristics catalog
- `skills/remediate/SKILL.md` — Category B voice-frame extension; auto-handoff-vibe-sec workflow
- `skills/remediate/references/fix-categories.md` — Category B sub-categories (banned-phrase vs voice-frame)
- `skills/remediate/references/voice-frame-detection.md` (NEW) — voice-rule extraction from global directive; voice-frame phrase patterns
- `skills/router/SKILL.md` — handoff-vibe-sec state branch (when handoff-vibe-sec-<timestamp>.json files exist)
- `skills/evolve-prompt/SKILL.md` — 4 new friction triggers added to handler table
- `skills/friction-logger/references/friction-triggers.md` — 4 new triggers
- `skills/guide/SKILL.md` — v0.6 overview section

### Renamed
- `audit/references/smell-rubric-f1-f12.md` → `smell-rubric-f1-f13.md`

---

## Command additions / changes

### Extended
- `/vibe-prompt:remediate` gains `--auto-handoff-vibe-sec` flag
- `/vibe-prompt:remediate` gains `--apply-voice-frame-fixes` flag (opt-in for Category B voice-frame auto-write)
- `/vibe-prompt:audit` extended for F12 API-param logic + F13 detection (no command-level shape change)
- `/vibe-prompt:first-run-setup` extended for apiParameter detection (no command-level shape change)

### Unchanged
- `:scan`, `:eval`, `:grade`, `:iterate`, `:radar`, `:evolve-prompt`, bare router (router gains a new state branch but no command shape change)

---

## Friction triggers (4 new)

1. `f12-api-parameter-detection-low-confidence` (medium)
2. `auto-handoff-vibe-sec-completed` (positive)
3. `auto-handoff-vibe-sec-unavailable` (medium)
4. `f13-fired-but-prompt-intentionally-flexible-output` (low)
5. `f13-recommended-fix-applied-and-eval-confirms-output-stability` (positive)
6. `category-b-voice-frame-detection-confidence-low` (medium)
7. `category-b-voice-frame-rewrite-rejected` (low)

Total: 7 (3 medium + 2 low + 2 positive).

---

## Cost / scope controls

- **Audit cost:** F13 is static (no LLM). F12 API-param check is static (reads composer.json). Voice-frame extraction is static (regex + parse). No incremental cost vs v0.5.
- **Remediate cost without `--auto-handoff-vibe-sec`:** identical to v0.5.
- **Remediate cost with `--auto-handoff-vibe-sec`:** depends on vibe-sec's scope and tier; typically $0.05-0.30 for the user-input-boundary scope.
- **Remediate cost with `--apply-voice-frame-fixes`:** still template-based (no LLM call); same as v0.5 Category B.

---

## Cross-plugin handoff updates

- **F12 critical findings** still emit `handoffHint: "vibe-sec:audit"` (v0.5 behavior preserved). The new behavior is OPT-IN auto-invocation via `--auto-handoff-vibe-sec`.
- **vibe-sec integration boundary:** vibe-prompt OWNS the prompt-content-level finding (F12). vibe-sec OWNS the app-level user-input boundary review. The auto-handoff just orchestrates; vibe-sec's findings flow back into vibe-prompt state at `.vibe-prompt/remediate/state/handoff-vibe-sec-<timestamp>.json` for cross-reference but do NOT merge into vibe-prompt's audit.json (separate concerns).

---

## Out of scope (v0.7+ roadmap)

- **Oracle-frame-bypass injection fixtures** (Cluster A, deferred from v0.6) — the strongest v0.4 round-trip signal; deserves its own cycle because new fixture category requires new judge prompt + cross-vendor validation. v0.7 candidate.
- **Schema-injection fixtures** (Cluster A, deferred) — companion to oracle-frame-bypass.
- **Multi-turn injection patterns** (Cluster A, deferred).
- **OpenAI vendor implementation for inject-attack eval** (Cluster B #5).
- **CI/cron alerts when injectionResistance drops** (Cluster E #13).
- **`:remediate` for cross-prompt findings (F3, F5)** — currently per-prompt only.
- **AI-assisted Category B rewrites** — currently template-based; future could dispatch creative LLM call.
- **Eval `thinkingBudget: 0`** — Cluster B #4. This is a small but observed-friction fix; consider as a v0.6.1 patch release if encountered again before v0.7 spec.

---

## Acceptance criteria for the Celestia3 round-trip

After build, run the v0.6 pipeline against Celestia3 and verify:

1. **`:first-run-setup --regenerate-composer`** produces composer.json where each layer has `apiParameter` populated. `dreamText` layer should have `apiParameter: "contents"`; persona/directive layers should have `apiParameter: "systemInstruction"`.

2. **`:audit` re-run:**
   - F12 does NOT fire on Oneirocriton (apiParameter separation makes composition structurally safe) — DETERMINISTIC verdict, not confidence-degraded
   - **F13 fires on synastry_report** (structural cues + no output format declaration). Evidence includes detected cues like `["BRACKETS-blocks", "templated-vars-3x"]`.
   - F9 fires on 5/5 date-handling prompts (v0.4 behavior preserved)
   - F10 fires on Oneirocriton — wait, the v0.5 round-trip already applied the Category C defense, so F10 should NOT fire if the [INTERPRETATION CONTRACT] is detected as sanitization directive. Verify the F10 detection sees the applied fix and doesn't refire.
   - Category B voice-frame extension detects "quatrain-style", "shattering of the veil" etc. in natal_interpretation; adds to audit findings

3. **`:remediate` generates new diffs:**
   - **F13 fix for synastry_report** — Category A or Category C (depending on whether the fix lives in the composer or the prompt content). Confidence ≥0.85.
   - **Category B voice-frame rewrite for natal_interpretation** — confidence ~0.65, staged.

4. **`:remediate --auto-handoff-vibe-sec` test path:**
   - Construct a synthetic F12 critical scenario (would require modifying composer.json or temporarily breaking composition)
   - Verify vibe-sec gets invoked
   - Verify handoff-vibe-sec-<timestamp>.json gets written
   - If vibe-sec not installed: friction-log `auto-handoff-vibe-sec-unavailable` fires; falls back to banner

5. **All extended schemas validate.** No regressions vs v0.5 artifacts.

6. **Cost stays under $0.05** (vibe-sec invocation deliberately skipped during regular round-trip; tested separately).

---

## Validation evidence (will be filled at ship time)

- Solo repo tag: `v0.6.0`
- Commit SHA: `(filled at ship)`
- Marketplace bump commit: `(filled at ship)`
- Round-trip artifacts: per acceptance criteria
- Decision logged: `(decision ID)`
- Memory updated: `vibe_prompt_v0_6_architecture.md`

---

## Self-review

**Placeholder scan:** none. Every detection rule, score impact, severity, evidence shape, recommendation template, and schema change is concrete.

**Internal consistency:**
- F12 API-param-aware detection depends on first-run-setup detecting `apiParameter` per layer — explicit dependency.
- Category B voice-frame extension depends on voice-rule extraction from global directive — new reference file `voice-frame-detection.md`.
- F13 is independent of other v0.6 work; can be built in parallel.
- Auto-handoff-vibe-sec is an isolated `:remediate` flag addition; doesn't interact with F12 detection logic.

**Scope check:** five bundled additions, each in service of the "detection sharpness" theme. Estimated commit count: 25-35 (slightly smaller than v0.5 because no new command, only flag additions + finding addition + detection logic extensions). Plan should sequence: schemas first → F12 API-aware + composer.schema global-directive → F13 → Category B voice-frame depth → auto-handoff-vibe-sec → cross-cutting → tests + README + CHANGELOG → tag.

**Ambiguity check:**
- "Voice-frame phrase patterns" is heuristic. Detection lives in `voice-frame-detection.md` reference file; expect tuning over time via friction triggers.
- "API parameter detection heuristics" — first-run-setup needs to trace call patterns; new reference file extension.
- "vibe-sec --scope" flag — assumes vibe-sec accepts this; if not, falls back to full audit. Spec is explicit about fallback.

**Dependencies (build sequencing):**
- Phase 1: schemas (foundational)
- Phase 2: F12 API-aware + composer.schema global-directive (depends on Phase 1)
- Phase 3: F13 (independent of Phase 2; depends only on Phase 1)
- Phase 4: Category B voice-frame depth (depends on Phase 1; independent of Phase 2 + 3)
- Phase 5: Auto-handoff-vibe-sec (depends on Phase 1; independent of Phases 2-4)
- Phase 6: Cross-cutting (router, evolve-prompt, guide)
- Phase 7: Tests + docs + version + tag
- Phase 8: Marketplace + round-trip + decision log + memory

Parallelization opportunity: Phases 2, 3, 4, 5 are mutually independent given Phase 1 schemas. Workflow can fan out 4-way after Phase 1 lands.

Workflow batching (suggested for Workflow-tool orchestration):
- Agent 1: Phase 1 — schemas
- Agents 2 + 3 + 4 + 5 (parallel after Phase 1): Phase 2 + Phase 3 + Phase 4 + Phase 5
- Agent 6: Phase 6 — cross-cutting
- Agent 7: Phase 7 — tests verification + README + CHANGELOG + version bump
- Adversarial verifier: 3 lenses (spec-compliance, test-coverage, backward-compat)
- Controller: tag, marketplace bump, round-trip, decision log, memory, release notes

Seven sequential + 4-way parallel after Phase 1; matches v0.5's "shape with adversarial verify" pattern.

Ready for plan task.
