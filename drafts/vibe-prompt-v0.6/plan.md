# vibe-prompt v0.6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The plan is Workflow-compatible — orchestrator can fan out Phases 2-5 in parallel after Phase 1 lands.

**Goal:** Ship vibe-prompt v0.6.0 with five additions in the "detection sharpness" theme: F12 API-parameter-aware detection, composer.schema `global-directive` enum, F13 (Implicit output format finding), Category B voice-frame depth extension, and `:remediate --auto-handoff-vibe-sec` flag.

**Architecture:** All five are additive to v0.5. F12 detection extension reads new `apiParameter` field from composer.json layers. F13 is a new static audit finding. Category B extension adds voice-frame pattern detection to v0.5's contradiction-removal logic. Auto-handoff invokes vibe-sec when F12 critical fires (opt-in). No breaking changes to the v0.5 surface.

**Tech Stack:** TypeScript/JavaScript schemas (JSON Schema draft-07). Markdown SKILL files. Python pytest test runner. Cart-autonomous compatible; Workflow-orchestratable with 4-way parallel fan-out after Phase 1.

**Repo paths:**
- Solo repo: `C:/Users/estev/Projects/Vibe-Prompt/`
- Plugin root: `C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/`
- Schemas: `plugins/vibe-prompt/schemas/`
- Skills: `plugins/vibe-prompt/skills/`
- Tests: `plugins/vibe-prompt/tests/`
- Marketplace: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

---

## Phase 1 — Schema foundations

All schemas extended/created first. Tests at this phase: schema-only structural validation. Backwards compat: v0.5 artifacts continue to validate.

### Task 1: Extend composer.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/composer.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_composer_schema_v06.py`

- [ ] **Step 1:** Write a failing test:
  - `layers[].apiParameter` enum (`systemInstruction` | `contents` | `messages` | `instructions` | `prompt` | `null`), optional
  - `layers[].apiParameterConfidence` number 0-1, optional
  - Layer `type` enum extended to include `global-directive`; `directive-field` STILL validates (deprecated alias preserved)
  - Backward compat: v0.5 composer.json validates against v0.6 schema

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(composer-schema): add apiParameter + global-directive enum
  ```

### Task 2: Extend audit.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/audit.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_audit_schema_v06.py`

- [ ] **Step 1:** Write a failing test:
  - `findings[].id` enum includes `F13`
  - `findings[].apiParameterContext` optional object with `{userVarApiParameter, systemInstructionApiParameter, separationVerified}`
  - `findings[].voiceFrameContradictions` optional array of `{phrase, location, banSource}`
  - Backward compat: v0.5 audit.json validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit-schema): add F13 + apiParameterContext + voiceFrameContradictions
  ```

### Task 3: Extend remediate-result.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/remediate-result.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_remediate_schema_v06.py`

- [ ] **Step 1:** Write a failing test:
  - `appliedDiffs[].subCategory` optional string
  - `f12HandoffsEmitted[].autoHandoffInvoked` optional boolean
  - `f12HandoffsEmitted[].vibeSecResultPath` optional string
  - Backward compat: v0.5 remediate-result.json validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit remediate-result.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate-schema): add subCategory + auto-handoff fields
  ```

### Task 4: Extend pending-fix.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/pending-fix.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_pending_fix_schema_v06.py`

- [ ] **Step 1:** Write a failing test:
  - `findingCategory` enum gains documented sub-category notation (B-voice-frame as valid value alongside A, B, C)
  - `voiceFrameRewriteRationale` optional string

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit pending-fix.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(pending-fix-schema): add B-voice-frame sub-category + rewrite rationale
  ```

### Task 5: Extend config.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/config.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_config_schema_v06.py`

- [ ] **Step 1:** Write a failing test:
  - `remediate.autoHandoffVibeSec` boolean (default false)
  - `remediate.applyVoiceFrameFixes` boolean (default false)
  - `audit.f13.outputFormatExceptions` string array

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit config.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(config-schema): add auto-handoff + voice-frame + F13 exception toggles
  ```

### Task 6: NEW handoff-vibe-sec.schema.json

**Files:**
- Create: `plugins/vibe-prompt/schemas/handoff-vibe-sec.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_handoff_vibe_sec_schema.py`

- [ ] **Step 1:** Write a failing test validating sample:
  ```json
  {
    "runId": "handoff-2026-06-15-1430",
    "timestamp": "2026-06-15T14:30:00Z",
    "triggeringFinding": "F12-inline_oneirocriton-2026-06-15",
    "vibeSecVersion": "0.6.0",
    "vibeSecFindings": [],
    "exitCode": 0,
    "scope": "user-input-boundary"
  }
  ```

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create schema per spec §3 (NEW schema section).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(schema): add handoff-vibe-sec schema
  ```

---

## Phase 2 — F12 API-parameter-aware detection + composer.schema global-directive

Independent of Phases 3, 4, 5. Depends on Phase 1.

### Task 7: composer detection — apiParameter heuristics

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/first-run-setup/references/composer-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_apiparameter_detection.py`

- [ ] **Step 1:** Write a failing test using synthetic composer fixtures:
  - Layer concatenated into `systemInstruction:` arg → detects `apiParameter: "systemInstruction"`, confidence ≥0.9
  - Layer interpolated into `contents[].parts[].text` → detects `apiParameter: "contents"`, confidence ≥0.85
  - Layer interpolated into OpenAI `messages[].content` → detects `apiParameter: "messages"`
  - Unknown call pattern → `apiParameter: null`, confidence 0.0

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer-detection.md to add the apiParameter heuristics catalog. Edit first-run-setup/SKILL.md to invoke apiParameter detection during layer classification.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): detect apiParameter per composer layer
  ```

### Task 8: composer emission with apiParameter populated

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_emission_v06.py`

- [ ] **Step 1:** Write a failing test:
  - When apiParameter detection runs successfully, composer.json layers each have `apiParameter` + `apiParameterConfidence` populated
  - Aggregate confidence reported in `globalConfidence` reflects apiParameter signal too
  - Backward compat: composer.json without apiParameter still validates (optional field)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit first-run-setup/SKILL.md emission step to include apiParameter in output.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): emit apiParameter in composer.json
  ```

### Task 9: composer detection emits global-directive (was directive-field)

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/first-run-setup/references/composer-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_global_directive_emission.py`

- [ ] **Step 1:** Write a failing test:
  - Layer matching persona/master-directive heuristics emits `type: "global-directive"` (was `directive-field` in v0.5)
  - Existing v0.5 composer.json with `directive-field` still validates (deprecated alias preserved)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer-detection.md heuristic table to map persona/master-directive content to `global-directive` enum value.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): emit global-directive instead of directive-field
  ```

### Task 10: F12 detection — API-parameter-aware logic

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f12.md` (will be renamed in Phase 3)
- Test: `plugins/vibe-prompt/tests/skills/test_f12_api_parameter_logic.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: composer.json with user-var layer at `apiParameter: "contents"` AND system-instruction layer at `apiParameter: "systemInstruction"` → F12 does NOT fire (structurally segregated)
  - Fixture: both layers at `apiParameter: "systemInstruction"` AND user-var layer before system-instruction layer → F12 fires per v0.5 rule
  - Fixture: either layer at `apiParameter: null` → F12 fires with confidence-degraded severity (high not critical) per v0.5 fallback
  - Audit finding includes `apiParameterContext` field with separation analysis

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md F12 detection step to check apiParameter first; only fall through to layer-order check when apiParameter unknown OR same. Emit `apiParameterContext` evidence.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): F12 API-parameter-aware detection — structurally safe when separated
  ```

---

## Phase 3 — F13 (Implicit output format)

Independent of Phases 2, 4, 5. Depends on Phase 1.

### Task 11: Rename smell rubric reference

**Files:**
- Rename: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f12.md` → `smell-rubric-f1-f13.md`
- Update cross-references in all SKILL files
- Test: `plugins/vibe-prompt/tests/skills/test_audit_rubric_f1_f13.py`

- [ ] **Step 1:** Write a failing test:
  - File `smell-rubric-f1-f13.md` exists
  - File `smell-rubric-f1-f12.md` does NOT exist
  - File contains `## F13 — Implicit output format` section

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** `git mv` the file, then add F13 section per spec §4. Grep for `smell-rubric-f1-f12.md` references in SKILL.md files and update to `smell-rubric-f1-f13.md`.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit-rubric): rename to f1-f13 + add F13 finding definition
  ```

### Task 12: F13 detection logic in audit SKILL

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f13_detection.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture: prompt with `[BRACKETS]` blocks + 3+ `{{vars}}` + no `[OUTPUT FORMAT:` declaration → F13 fires; evidence includes `detectedCues: ["BRACKETS-blocks", "templated-vars-3x"]`
  - Fixture: prompt with same cues BUT explicit `[OUTPUT FORMAT: prose, no JSON]` → F13 does NOT fire
  - Fixture: prompt with same cues BUT `[OUTPUT_SCHEMA]` block → F13 does NOT fire
  - Fixture: prompt with prompt id in `audit.f13.outputFormatExceptions` config array → F13 does NOT fire

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md to add F13 detection step (step 4f or similar) per spec §4. Read `audit.f13.outputFormatExceptions` from config.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): add F13 detection (implicit output format)
  ```

### Task 13: F13 score impact in scoring-dimensions

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/references/scoring-dimensions.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f13_scoring.py`

- [ ] **Step 1:** Write a failing test:
  - When F13 fires on a prompt with otherwise perfect dimensions, schema-tightness drops by 2, instruction-clarity drops by 1

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add F13 score impact entry to scoring-dimensions.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): wire F13 score impact (schema-tightness -2, clarity -1)
  ```

---

## Phase 4 — Category B voice-frame depth

Independent of Phases 2, 3, 5. Depends on Phase 1.

### Task 14: NEW voice-frame-detection.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/voice-frame-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_voice_frame_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Contains sections: "Voice-rule extraction from global directive", "Voice-frame phrase patterns", "Confidence calibration"
  - Includes regex pattern table for archaic vocabulary + ritualistic framing + capitalized abstract nouns

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create voice-frame-detection.md per spec §5.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add voice-frame detection reference
  ```

### Task 15: Voice-rule extraction from global directive

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_voice_rule_extraction.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture global directive: `'Plain modern language. Contractions. Second person ("you," never "Fellow Pilgrim"). ...not a 16th-century prophet.'`
  - Voice-rule extraction returns: bans = ["Fellow Pilgrim", "archaic", "16th-century prophet"], positive guidance = ["plain modern language", "contractions", "second person", "warm friend"]
  - Confidence on extraction reported per rule

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit remediate/SKILL.md to add voice-rule extraction step (called from Category B detection when generating diff).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): extract voice rules from global directive
  ```

### Task 16: Voice-frame phrase pattern detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/remediate/references/voice-frame-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_voice_frame_phrase_detection.py`

- [ ] **Step 1:** Write a failing test using Celestia3 natal_interpretation fixture:
  - Fixture: prompt content includes "quatrain-style narrative", "shattering of the veil", "ancient dust", "mirrors of mercury", "prophetic shadows"
  - Detection returns voice-frame contradictions array with each phrase, location, and ban-source (which voice rule it contradicts)
  - Audit finding emits `voiceFrameContradictions` field populated

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit remediate/SKILL.md + voice-frame-detection.md to scan task prompt content for voice-frame phrase clusters using patterns from §5 detection rule.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): detect voice-frame phrase contradictions in task prompts
  ```

### Task 17: Category B sub-category (banned-phrase vs voice-frame)

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/references/fix-categories.md`
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_category_b_subcategory.py`

- [ ] **Step 1:** Write a failing test:
  - When Category B fires on a direct banned phrase → diff emitted with `subCategory: "banned-phrase-removal"`, confidence 0.75
  - When Category B fires on voice-frame contradiction → diff emitted with `subCategory: "voice-frame-rewrite"`, confidence 0.65, ALWAYS staged (no auto-write)
  - Both can fire on same prompt (separate diffs)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit fix-categories.md + remediate/SKILL.md to declare the sub-category split, confidence difference, and routing.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): split Category B into banned-phrase + voice-frame sub-categories
  ```

### Task 18: --apply-voice-frame-fixes flag

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/commands/remediate.md`
- Test: `plugins/vibe-prompt/tests/commands/test_remediate_voice_frame_flag.py`

- [ ] **Step 1:** Write a failing test:
  - Without flag: voice-frame Category B diffs stage (don't auto-write) even at confidence ≥0.90 (because conservative default for voice-drift risk)
  - With `--apply-voice-frame-fixes` flag: voice-frame Category B diffs follow normal routing (auto-write if confidence ≥0.90)
  - Command declares flag in remediate.md

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add flag to remediate.md + SKILL.md gating logic.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add --apply-voice-frame-fixes opt-in flag
  ```

---

## Phase 5 — Auto-handoff `:remediate --auto-handoff-vibe-sec`

Independent of Phases 2, 3, 4. Depends on Phase 1.

### Task 19: --auto-handoff-vibe-sec flag

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/commands/remediate.md`
- Test: `plugins/vibe-prompt/tests/commands/test_remediate_auto_handoff_flag.py`

- [ ] **Step 1:** Write a failing test:
  - Command declares `--auto-handoff-vibe-sec` flag in remediate.md
  - Default behavior unchanged when flag absent (v0.5 banner-only handoff)
  - When flag present + F12 critical fires → SKILL.md workflow includes vibe-sec invocation step

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add flag to remediate.md + SKILL.md. Add conditional workflow branch for auto-handoff.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add --auto-handoff-vibe-sec opt-in flag
  ```

### Task 20: vibe-sec invocation workflow

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_vibe_sec_invocation.py`

- [ ] **Step 1:** Write a failing test:
  - When `--auto-handoff-vibe-sec` flag set + F12 critical fires + vibe-sec installed:
    - SKILL workflow invokes vibe-sec:audit (via Skill tool)
    - Passes `--scope user-input-boundary` argument (with fallback to full audit if not accepted)
    - Captures vibe-sec exit code + findings
  - Workflow declared in SKILL.md (no actual vibe-sec call during test — just prose verification)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add vibe-sec invocation step to remediate/SKILL.md per spec §5b (composability rules).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): invoke vibe-sec:audit on F12 critical when flag set
  ```

### Task 21: handoff-vibe-sec result file

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_handoff_result_file.py`

- [ ] **Step 1:** Write a failing test:
  - When auto-handoff invokes vibe-sec successfully, result file written to `.vibe-prompt/remediate/state/handoff-vibe-sec-<timestamp>.json`
  - File validates against handoff-vibe-sec.schema.json (Task 6)
  - Contains: runId, timestamp, triggeringFinding, vibeSecVersion, vibeSecFindings, exitCode, scope

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add result-file write step to remediate/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): write handoff-vibe-sec result file
  ```

### Task 22: vibe-sec availability check + fallback

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_vibe_sec_fallback.py`

- [ ] **Step 1:** Write a failing test:
  - When `--auto-handoff-vibe-sec` flag set BUT vibe-sec not installed:
    - SKILL workflow detects unavailability via Skill tool absence
    - Falls back to v0.5 banner-only behavior
    - Friction-logs `auto-handoff-vibe-sec-unavailable` (medium)
    - Does NOT block the rest of :remediate run

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add availability-check step + fallback branch to SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): graceful fallback when vibe-sec unavailable for auto-handoff
  ```

---

## Phase 6 — Cross-cutting

Depends on Phases 1-5.

### Task 23: Router state branch (handoff-vibe-sec results)

**Files:**
- Modify: `plugins/vibe-prompt/skills/router/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_router_v06_handoff_branch.py`

- [ ] **Step 1:** Write a failing test:
  - When `.vibe-prompt/remediate/state/handoff-vibe-sec-*.json` files exist, bare `/vibe-prompt` router goes to new branch "review-vibe-sec-handoff-results"

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit router/SKILL.md to add the new state branch + transition logic.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(router): add review-vibe-sec-handoff-results state branch
  ```

### Task 24: 7 new friction triggers

**Files:**
- Modify: `plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md`
- Modify: `plugins/vibe-prompt/skills/evolve-prompt/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_evolve_v06_triggers.py`

- [ ] **Step 1:** Write a failing test asserting trigger catalog includes:
  1. `f12-api-parameter-detection-low-confidence` (medium)
  2. `auto-handoff-vibe-sec-completed` (positive)
  3. `auto-handoff-vibe-sec-unavailable` (medium)
  4. `f13-fired-but-prompt-intentionally-flexible-output` (low)
  5. `f13-recommended-fix-applied-and-eval-confirms-output-stability` (positive)
  6. `category-b-voice-frame-detection-confidence-low` (medium)
  7. `category-b-voice-frame-rewrite-rejected` (low)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add 7 triggers to friction-triggers.md + handler templates in evolve-prompt/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(evolve-prompt): add 7 v0.6 friction triggers
  ```

### Task 25: Update guide/SKILL.md

**Files:**
- Modify: `plugins/vibe-prompt/skills/guide/SKILL.md`

- [ ] **Step 1:** Add new section "Detection sharpness (v0.6)" covering: F12 API-parameter awareness, F13 implicit output format, Category B voice-frame depth, --auto-handoff-vibe-sec flag. Working-register voice.

- [ ] **Step 2:** Commit:
  ```
  docs(guide): add v0.6 detection-sharpness overview
  ```

### Task 26: Update audit-report-template.md

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/references/audit-report-template.md`

- [ ] **Step 1:** Add F13 finding render template + apiParameterContext display for F12 findings + voiceFrameContradictions display.

- [ ] **Step 2:** Commit:
  ```
  docs(audit-template): render F13 + apiParameterContext + voiceFrameContradictions
  ```

---

## Phase 7 — Tests + docs + version

### Task 27: Run full test suite verification

- [ ] **Step 1:** Run `cd plugins/vibe-prompt && python -m pytest tests/ -q`

- [ ] **Step 2:** Verify ALL tests pass. v0.5's 607 + new v0.6 tests (~80-100 expected from Phases 1-6) = 690-710 total.

- [ ] **Step 3:** If failures: triage. Schema/backward-compat failures must be fixed.

- [ ] **Step 4:** Confirm v0.5 round-trip artifacts at Celestia3 still validate against v0.6 schemas.

### Task 28: Update README.md

**Files:**
- Modify: `plugins/vibe-prompt/README.md`

- [ ] **Step 1:** Update:
  - Add v0.6 section to "What's new"
  - Update smell table to F1-F13 (add F13 row)
  - Note F12 API-parameter-aware deterministic detection
  - Document `--auto-handoff-vibe-sec` and `--apply-voice-frame-fixes` flags
  - Maintain working-register voice

- [ ] **Step 2:** Commit:
  ```
  docs(readme): document v0.6 detection-sharpness additions
  ```

### Task 29: Update CHANGELOG.md

**Files:**
- Modify: `plugins/vibe-prompt/CHANGELOG.md`

- [ ] **Step 1:** Add v0.6.0 entry:
  - Header: `## [0.6.0] — <date>`
  - Sections: Added, Changed, Schema changes, Migration notes
  - List all 5 additions
  - No breaking changes — additive release
  - Migration: v0.5 composer.json validates (apiParameter optional; directive-field deprecated but still accepted)

- [ ] **Step 2:** Commit:
  ```
  docs(changelog): add v0.6.0 entry
  ```

### Task 30: Bump plugin.json to 0.6.0

**Files:**
- Modify: `plugins/vibe-prompt/plugin.json`

- [ ] **Step 1:** Change `version` from `0.5.0` → `0.6.0`.

- [ ] **Step 2:** Commit:
  ```
  chore(version): bump to 0.6.0
  ```

### Task 31: Tag v0.6.0 (controller)

- [ ] **Step 1:** Verify branch clean.

- [ ] **Step 2:** `git tag -a v0.6.0 -m "..."` with release notes.

- [ ] **Step 3:** `git push origin v0.6.0`.

- [ ] **Step 4:** `git push origin HEAD`.

---

## Phase 8 — Marketplace + round-trip + decision + memory (controller)

### Task 32: Bump vibe-prompt ref in marketplace.json

**Files:**
- Modify: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

- [ ] **Step 1:** Change vibe-prompt entry `source.ref` from `v0.5.0` → `v0.6.0`.

- [ ] **Step 2:** Update description to mention F13, F12 API-param awareness, Category B voice-frame depth, auto-handoff-vibe-sec.

- [ ] **Step 3:** Commit + push on vibe-plugins.

### Task 33: Round-trip on Celestia3 (acceptance criteria from spec §"Acceptance")

- [ ] **Step 1:** Run `/vibe-prompt:first-run-setup --regenerate-composer` — verify composer.json layers have `apiParameter` populated.

- [ ] **Step 2:** Run `/vibe-prompt:audit` — verify F12 does NOT fire critical on Oneirocriton (API-param separation); F13 fires on synastry_report; F9 fires on 5/5 date prompts (v0.4 carry-over); F10 does NOT refire on Oneirocriton (Category C defense from v0.5 round-trip detected as sanitization).

- [ ] **Step 3:** Run `/vibe-prompt:remediate` — verify F13 fix diff for synastry_report (Category A or C); Category B voice-frame rewrite for natal_interpretation staged with confidence ~0.65.

- [ ] **Step 4:** Test `:remediate --auto-handoff-vibe-sec` with synthetic F12 critical scenario; verify vibe-sec invocation OR graceful fallback.

- [ ] **Step 5:** Confirm all extended schemas validate.

- [ ] **Step 6:** Total cost <$0.05 (auto-handoff vibe-sec excluded from regular cost; tested separately).

- [ ] **Step 7:** Document results at `drafts/vibe-prompt-v0.6/celestia3-findings.md`.

### Task 34: Decision log + memory + release notes

- [ ] **Step 1:** Log decision to 626Labs Dashboard (project Vibe Plugins, ID `tyWzqAbCAq6Y9UJvoy8t`). Category: feature. Source: claude-code.

- [ ] **Step 2:** Write `vibe_prompt_v0_6_architecture.md` covering shipped capabilities, F12 API-param model, F13 finding, Category B voice-frame depth, auto-handoff workflow, v0.7+ candidates queued.

- [ ] **Step 3:** Update `MEMORY.md` index.

- [ ] **Step 4:** `gh release create v0.6.0` with release notes.

---

## Self-review

**Spec coverage check:**
- F12 API-parameter-aware: Tasks 7, 8, 10 ✓
- composer.schema global-directive: Tasks 1, 9 ✓
- F13: Tasks 11, 12, 13 ✓
- Category B voice-frame depth: Tasks 14, 15, 16, 17, 18 ✓
- Auto-handoff vibe-sec: Tasks 19, 20, 21, 22 ✓
- Schemas: Tasks 1-6 ✓
- Cross-cutting: Tasks 23-26 ✓
- Docs + version + tag: Tasks 27-31 ✓
- Marketplace + round-trip + decision + memory: Tasks 32-34 ✓

**Placeholder scan:** none. Every test references real fixture content, every task names exact files and shows expected outcomes.

**Type consistency:**
- `apiParameter` enum consistent across Tasks 1, 7, 8, 10
- `global-directive` enum value consistent across Tasks 1, 9
- F13 + scoring consistent across Tasks 12, 13, 26
- Category B sub-category consistent across Tasks 4, 17, 18, 23

**Dependencies:**
- Phase 1 (schemas) must complete first.
- Phases 2, 3, 4, 5 are MUTUALLY INDEPENDENT after Phase 1 — can run 4-way parallel.
- Phase 6 depends on Phase 4 (router needs F12 detection rule from Phase 2; friction triggers reference all phases).
- Phase 7 depends on everything.
- Phase 8 depends on Phase 7 + tag.

**Workflow batching (suggested):**
- Agent 1: Phase 1 — schemas
- Agents 2, 3, 4, 5 (parallel after Phase 1): Phase 2 (F12 API-aware), Phase 3 (F13), Phase 4 (Category B voice-frame), Phase 5 (auto-handoff)
- Agent 6: Phase 6 — cross-cutting
- Agent 7: Phase 7 — tests verification + README + CHANGELOG + version bump
- Adversarial verifier (parallel after Phase 7): spec-compliance, test-coverage, backward-compat lenses
- Controller: tag, marketplace bump, round-trip, decision log, memory, release notes

Total: 7 sequential + 4-way parallel between Phases 1 and 6. ~25-35 commits. Estimated $15-25 build cost, ~30-45 min wall clock.

Ready for execution.
