# vibe-prompt v0.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The plan is also Workflow-compatible — orchestrator will batch tasks into subagent dispatches by phase.

**Goal:** Ship vibe-prompt v0.5.0 with four bundled additions: the headline `/vibe-prompt:remediate` command (audit-to-fix loop with confidence-routed diff generation), inventory scan completeness for template-literal vars, system-injected var detection, and composer.json auto-generation during first-run-setup.

**Architecture:** All four are additive to v0.4. `:remediate` reads audit findings + composer.json + inventory → generates per-finding diffs via category-mapped templates → routes by confidence (≥0.90 auto-write w/ backup; 0.70-0.89 stage; <0.70 inline-only) → emits F12 handoff banner instead of proposing. Scan + var-origin + composer.json work feeds remediate's locate-confidence and Category-A/C targeting. No breaking changes to the v0.4 surface.

**Tech Stack:** TypeScript/JavaScript schemas (JSON Schema draft-07). Markdown SKILL files. Python pytest test runner. Cart-autonomous compatible; Workflow-orchestratable.

**Repo paths:**
- Solo repo: `C:/Users/estev/Projects/Vibe-Prompt/`
- Plugin root: `C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/`
- Schemas: `plugins/vibe-prompt/schemas/`
- Skills: `plugins/vibe-prompt/skills/`
- Tests: `plugins/vibe-prompt/tests/`
- Marketplace: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

---

## Phase 1 — Schema foundations

All schemas extended/created first so SKILL/command work in later phases has stable targets. Tests at this phase: schema-only structural validation. Backwards compat: v0.4 artifacts continue to validate.

### Task 1: Extend inventory.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/inventory.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_inventory_schema_v05.py`

- [ ] **Step 1:** Write a failing test that:
  - Asserts `inlinePrompts[].templatedVars[]` items can be objects with `name`, `source` enum (`handlebars` | `template-literal` | `concat` | `jsx-attr`), `declaredAt` (string, file:line), `origin` enum (`user-controlled` | `system-injected` | `unknown`), `originConfidence` (number 0-1).
  - Backward compat: simple string templatedVars items still validate (v0.4 shape).

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit inventory.schema.json — change `templatedVars[]` to `oneOf: [{type: string}, {type: object, properties: {...}}]`.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(inventory-schema): extend templatedVars with source + origin + declaredAt
  ```

### Task 2: Extend composer.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/composer.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_composer_schema_v05.py`

- [ ] **Step 1:** Write a failing test:
  - `layers[].confidence` number 0-1
  - Top-level `globalConfidence` number 0-1
  - Top-level `regenerationSource` enum (`manual` | `auto-detected` | `hybrid`)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(composer-schema): add per-layer confidence + global confidence + regeneration source
  ```

### Task 3: Extend audit.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/audit.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_audit_schema_v05.py`

- [ ] **Step 1:** Write a failing test:
  - `findings[].originFilteredOut` optional boolean
  - `findings[].varOriginUsed` optional enum (`user-controlled` | `system-injected` | `unknown`)
  - Backward compat: v0.4 audit.json validates.

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit-schema): add originFilteredOut + varOriginUsed to findings
  ```

### Task 4: Extend config.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/config.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_config_schema_v05.py`

- [ ] **Step 1:** Write a failing test:
  - `remediate.autoApplyThreshold` (number, default 0.90)
  - `remediate.stageThreshold` (number, default 0.70)
  - `remediate.backupRetentionDays` (integer, default 30)
  - `audit.varOriginOverrides` (object, additionalProperties enum [user-controlled, system-injected])

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit config.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(config-schema): add remediate + varOriginOverrides sections
  ```

### Task 5: NEW remediate-result.schema.json + pending-fix.schema.json

**Files:**
- Create: `plugins/vibe-prompt/schemas/remediate-result.schema.json`
- Create: `plugins/vibe-prompt/schemas/pending-fix.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_remediate_schemas.py`

- [ ] **Step 1:** Write a failing test validating these samples:
  
  remediate-result sample:
  ```json
  {
    "runId": "remediate-2026-05-30-0900",
    "timestamp": "2026-05-30T09:00:00Z",
    "auditRunId": "audit-2026-05-29-1830",
    "totalFindings": 7,
    "diffsByCategory": {"categoryA": 1, "categoryB": 2, "categoryC": 4},
    "appliedDiffs": [],
    "stagedDiffs": [],
    "inlineOnlyDiffs": [],
    "f12HandoffsEmitted": [],
    "backupBatchPath": ".vibe-prompt/remediate/backup/2026-05-30-0900/"
  }
  ```
  
  pending-fix front-matter sample:
  ```yaml
  findingId: F2-natal_interpretation-2026-05-29
  findingCategory: B
  confidence: 0.75
  targetFile: src/lib/ConfigService.ts
  targetRange: L67-L102
  backupPath: .vibe-prompt/remediate/backup/2026-05-30-0900/ConfigService.ts.bak
  recommendationSource: audit-2026-05-29-1830
  postApplyRecommendation: "Re-run /vibe-prompt:eval --prompts natal_interpretation"
  versionBumpRequired: true
  suggestedVersion: "3.6.0"
  ```

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create both schemas per spec §1d.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(schema): add remediate-result + pending-fix schemas
  ```

---

## Phase 2 — Inventory scan completeness

Independent of Phase 3; can run parallel. Both feed Phase 4 (:remediate locate-confidence).

### Task 6: Template-literal interpolation detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/scan/references/inline-prompt-detection.md` (NEW or extend)
- Test: `plugins/vibe-prompt/tests/skills/test_scan_template_literal_detection.py`

- [ ] **Step 1:** Write a failing test using a synthetic fixture:
  - Source file content: `const systemPrompt = \`You are X.\`; const userPrompt = \`Dream: "${dreamText}"\``;
  - Expect inventory output `inlinePrompts[].templatedVars` includes `{name: "dreamText", source: "template-literal", declaredAt: "<file>:L<n>"}`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md + new references/inline-prompt-detection.md to declare the template-literal `\`...${varName}...\`` detection regex + capture rules.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): detect template-literal ${var} interpolations in inline prompts
  ```

### Task 7: String concatenation detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/scan/references/inline-prompt-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_concat_detection.py`

- [ ] **Step 1:** Write a failing test:
  - Source: `const prompt = 'You are X. User said: ' + userMessage + ' Respond as Y.'`
  - Expect templatedVars includes `{name: "userMessage", source: "concat", declaredAt: ...}`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan SKILL prose to declare concat detection (regex on `+ varName +` and `'...' + var` patterns).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): detect string-concat user-var insertions in inline prompts
  ```

### Task 8: JSX attribute detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/scan/references/inline-prompt-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_jsx_attr_detection.py`

- [ ] **Step 1:** Write a failing test:
  - Source: `<DreamComponent systemPrompt={\`...${persona}...\`} userPrompt={\`Dream: "${dreamText}"\`} />`
  - Expect templatedVars from BOTH attrs detected with `source: "jsx-attr"`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan prose to declare JSX-attr detection.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): detect JSX-attr inline prompts with var interpolations
  ```

### Task 9: declaredAt + source tracking integration

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_var_tracking_integration.py`

- [ ] **Step 1:** Write a failing test:
  - Multi-pattern fixture (handlebars + template-literal + concat) in same source file
  - Expect each var has correct source + declaredAt; v0.4 handlebars vars retain string-only form when no source needed
  - Inventory output validates against extended schema from Task 1

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md to produce the unified output with backward-compatible shape (handlebars stays string; new patterns emit object form).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): unified declaredAt + source tracking across detection patterns
  ```

---

## Phase 3 — System-injected var detection + composer.json auto-generation

Independent of Phase 2; can run parallel. Composer.json auto-gen feeds Phase 4's Category A locate-confidence; var origin feeds Phase 4's Category C var-targeting.

### Task 10: var origin Signal 1 (naming heuristic)

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/scan/references/var-origin-detection.md` (NEW)
- Test: `plugins/vibe-prompt/tests/skills/test_var_origin_naming.py`

- [ ] **Step 1:** Write a failing test:
  - Vars: `dreamText` (user-keyword) → `user-controlled` w/ confidence ≥0.85
  - `knowledgeContext` (system-keyword) → `system-injected` w/ confidence ≥0.85
  - `prompt` (no signal) → `unknown` w/ confidence ≤0.50
  - `userContext` (both match) → falls through to Signal 2

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create scan/references/var-origin-detection.md with the user-keyword + system-keyword regex lists per spec §3 Signal 1. Edit scan/SKILL.md to apply Signal 1 during var capture.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): var-origin Signal 1 (naming heuristic) — user vs system classification
  ```

### Task 11: var origin Signal 2 (call-graph proximity)

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/scan/references/var-origin-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_var_origin_callgraph.py`

- [ ] **Step 1:** Write a failing test:
  - Var assigned from `await KnowledgeService.get(...)` → `system-injected` w/ confidence ≥0.80
  - Var assigned from form input field (e.g., `useState('')` + `onChange={e => setX(e.target.value)}`) → `user-controlled` w/ confidence ≥0.80
  - Var with no traceable assignment → `unknown` w/ confidence 0.40 (conservative: classify as `user-controlled` for F10 purposes per spec)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Extend var-origin-detection.md with Signal 2 patterns (await ServiceName.method, useState + setter pattern, prop drilling from form).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): var-origin Signal 2 (call-graph proximity) + conservative fallback
  ```

### Task 12: composer file detection in first-run-setup

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/first-run-setup/references/composer-detection.md` (NEW)
- Test: `plugins/vibe-prompt/tests/skills/test_composer_file_detection.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture repo: `src/lib/gemini.ts` (imports `@google/genai`), `src/lib/openai.ts` (imports `openai`), `src/lib/ai.ts` (filename match)
  - Expect first-run-setup detects all 3 as composer-file candidates with reason strings

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create composer-detection.md with heuristic catalog per spec §4 step 1. Update first-run-setup/SKILL.md to invoke detection during setup.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): detect composer files by filename + SDK import
  ```

### Task 13: composer layer tracing + classification

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/first-run-setup/references/composer-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_layer_classification.py`

- [ ] **Step 1:** Write a failing test using Celestia3 gemini.ts as fixture (or synthetic equivalent):
  - `${directive.persona}` → layer `global-directive`
  - `[MASTER DIRECTIVE]\n${directive.masterDirective}` → layer `global-directive` (continuation)
  - `[DEFAULT FORMAT]\n${directive.defaultFormat}` → layer `format-directive`
  - `KnowledgeService.getSmartLore(...)` → layer `knowledge-context`
  - `[TASK SPECIFIC INSTRUCTIONS]\n${systemInstructionContent}` → layer `task-instruction`
  - User-supplied var interpolation (where applicable) → layer `user-data`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Extend composer-detection.md with layer classification heuristics per spec §4 step 3. Update first-run-setup/SKILL.md to walk concatenation patterns + classify.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): classify composer layers (directive/format/knowledge/task/user-data)
  ```

### Task 14: composer.json emission with confidence

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_json_emission.py`

- [ ] **Step 1:** Write a failing test:
  - When 4+ layers identified with classification → composer.json written w/ globalConfidence ≥0.7
  - When <2 layers identified → globalConfidence ≤0.4 + warning emitted asking user to verify manually
  - regenerationSource set correctly (`auto-detected` for clean auto-gen, `hybrid` for partial detection)
  - Output validates against composer.schema.json (Task 2)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Update first-run-setup/SKILL.md emission step per spec §4 step 4-5.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): emit composer.json with per-layer + global confidence
  ```

---

## Phase 4 — `:remediate` command + SKILL (the headline)

Depends on Phases 1-3. The substantial new command surface.

### Task 15: NEW skills/remediate/SKILL.md (main workflow)

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_workflow.py`

- [ ] **Step 1:** Write a failing test asserting SKILL.md exists + declares workflow sections per spec §1a:
  - "Read state" step
  - "Group findings by fix category"
  - "Generate proposed diff + score confidence"
  - "Route by confidence"
  - "Present plan + user gate"
  - "Apply or stage"
  - "Post-apply guidance"
  - "Friction-log"

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create SKILL.md per spec §1a. Reference the support files (created in subsequent tasks). Use working-register voice from user's CLAUDE.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add main SKILL with full workflow
  ```

### Task 16: NEW remediate/references/fix-categories.md

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/fix-categories.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_fix_categories.py`

- [ ] **Step 1:** Write a failing test asserting file declares all three categories per spec §1b:
  - Category A: composer-level additions (F9), default confidence 0.92
  - Category B: contradiction removal (F2), default confidence 0.75
  - Category C: defense addition (F10/F11), default confidence 0.88 contract / 0.78 delimiter
  - Each category's diff template included

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create fix-categories.md per spec §1b. Include the verbatim diff templates from the spec.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): document A/B/C fix categories with diff templates
  ```

### Task 17: NEW remediate/references/confidence-rubric.md

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/confidence-rubric.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_confidence_rubric.py`

- [ ] **Step 1:** Write a failing test asserting:
  - All 5 dimensions declared with their weights (locate 0.30, diff-shape 0.25, voice-risk 0.20, schema-impact 0.15, version-bump 0.10)
  - Sum of weights = 1.0
  - Routing thresholds: ≥0.90 auto-write, 0.70-0.89 stage, <0.70 inline-only
  - Worked example: Category A composer-fix on F9 with composer.json present → confidence ~0.95

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create confidence-rubric.md per spec §1c.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add 5-dimension confidence rubric
  ```

### Task 18: NEW remediate/references/delimiter-naming.md

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/delimiter-naming.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_delimiter_naming.py`

- [ ] **Step 1:** Write a failing test:
  - `dreamText` → `DREAM`
  - `userMessage` → `MESSAGE`
  - `userQuery` → `QUERY`
  - `prompt` → `INPUT` (fallback)
  - Custom delimiter via `audit.varOriginOverrides` (extended config schema from Phase 1) supported

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create delimiter-naming.md with the mapping table + fallback rule.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add user-var → delimiter name mapping reference
  ```

### Task 19: NEW remediate/references/diff-patch-helpers.md

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/diff-patch-helpers.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_diff_helpers.py`

- [ ] **Step 1:** Write a failing test asserting file declares:
  - Unified diff format reference
  - Patch application algorithm (line-context match + apply)
  - Conflict detection (target lines drifted since audit)
  - Recovery: skip + friction-log when conflict

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create diff-patch-helpers.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): document unified-diff helpers + conflict recovery
  ```

### Task 20: NEW remediate/references/rollback-workflow.md

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/rollback-workflow.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_rollback.py`

- [ ] **Step 1:** Write a failing test:
  - Rollback finds backup batch dir by timestamp
  - Restores each `.bak` to its original path (atomic — all or none)
  - Logs to runs.jsonl
  - Errors gracefully when backup missing or partial

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create rollback-workflow.md per spec §1e.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): document backup batch + atomic rollback workflow
  ```

### Task 21: NEW /vibe-prompt:remediate command

**Files:**
- Create: `plugins/vibe-prompt/commands/remediate.md`
- Test: `plugins/vibe-prompt/tests/commands/test_remediate_command.py`

- [ ] **Step 1:** Write a failing test asserting commands/remediate.md exists, declares the command name `/vibe-prompt:remediate`, and lists all 7 flags per spec §"Command additions":
  - `--apply-pending <findingId>`
  - `--reject-pending <findingId>`
  - `--rollback <ISO-timestamp>`
  - `--interactive`
  - `--auto-apply`
  - `--skip-f12`
  - `--apply-contradictions`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create commands/remediate.md following existing v0.4 command file patterns (look at commands/eval.md as template). Each flag documented with usage example.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(command): add /vibe-prompt:remediate with 7 flags
  ```

### Task 22: Backup + rollback infrastructure (state files)

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md` (add state-file management section)
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_state_files.py`

- [ ] **Step 1:** Write a failing test:
  - `.vibe-prompt/remediate/state/runs.jsonl` append-only ledger format
  - Each entry: `{timestamp, runId, action, findingIds, confidence, fileTouched, backupPath}`
  - Backup dir naming convention: `.vibe-prompt/remediate/backup/<ISO-timestamp>/`
  - Pending dir layout: `.vibe-prompt/remediate/pending/<finding-id>.diff`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add state-file section to remediate/SKILL.md describing the layout + ledger entry shape.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): document state file layout + append-only ledger
  ```

---

## Phase 5 — Cross-cutting (router + audit filter + friction + guide)

### Task 23: Router state branch "review-pending-remediations"

**Files:**
- Modify: `plugins/vibe-prompt/skills/router/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_router_v05_branches.py`

- [ ] **Step 1:** Write a failing test asserting bare `/vibe-prompt` router has new state branch fired when `.vibe-prompt/remediate/pending/*.diff` exists.

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit router/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(router): add review-pending-remediations state branch
  ```

### Task 24: 4 new friction triggers

**Files:**
- Modify: `plugins/vibe-prompt/skills/evolve-prompt/SKILL.md` (and friction-triggers.md if separate)
- Modify: `plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md` (from v0.4 work)
- Test: `plugins/vibe-prompt/tests/skills/test_evolve_v05_triggers.py`

- [ ] **Step 1:** Write a failing test asserting trigger catalog includes:
  - `staged-fix-applied-and-eval-confirms-improvement` (positive)
  - `staged-fix-rejected` (medium)
  - `auto-write-rolled-back` (high)
  - `composer-auto-generation-confidence-low` (medium)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add 4 triggers per spec §Friction-triggers.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(evolve-prompt): add 4 v0.5 friction triggers
  ```

### Task 25: audit SKILL filters system-injected vars

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_audit_origin_filtering.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture inventory has prompt with `templatedVars: [{name: "userInput", origin: "user-controlled"}, {name: "knowledgeContext", origin: "system-injected"}]`
  - F10/F11/F12 fire ONLY on `userInput`
  - Audit findings include `originFilteredOut: true` annotation for the `knowledgeContext` skip

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md F10-F12 detection prose to filter `templatedVars[].origin === "user-controlled"` before applying detection. Document the `originFilteredOut` annotation.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): filter F10-F12 by var origin (user-controlled only)
  ```

### Task 26: scoring-dimensions note on filtering

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/references/scoring-dimensions.md`

- [ ] **Step 1:** Add a paragraph under `injectionResistance` dimension noting that system-injected vars are excluded from the dimension's input set. v0.5 behavior change.

- [ ] **Step 2:** Commit:
  ```
  docs(audit): note system-injected var exclusion in injectionResistance dimension
  ```

### Task 27: guide SKILL updated for :remediate

**Files:**
- Modify: `plugins/vibe-prompt/skills/guide/SKILL.md`

- [ ] **Step 1:** Read guide/SKILL.md and add a new section "Remediating findings (v0.5)" covering: what :remediate does, the A/B/C category system, confidence routing, backup + rollback, F12 handoff, recommended workflow (audit → eval → grade → remediate → re-eval). Use working-register voice.

- [ ] **Step 2:** Commit:
  ```
  docs(guide): add v0.5 remediate overview
  ```

### Task 28: F12 handoff banner integration

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_f12_handoff.py`

- [ ] **Step 1:** Write a failing test:
  - When F12 critical present in audit, :remediate emits handoff banner with composer file path + vibe-sec recommendation; does NOT propose a fix
  - When `--skip-f12` flag passed, banner suppressed
  - F12 high severity (confidence-degraded) still proposes via Category C fallback

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add F12 handoff section to remediate/SKILL.md per spec §1f.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): emit F12 handoff banner (no auto-proposal for composition-order)
  ```

---

## Phase 6 — Tests + docs + version

### Task 29: Run full test suite verification

- [ ] **Step 1:** Run `cd plugins/vibe-prompt && python -m pytest tests/ -q`

- [ ] **Step 2:** Verify ALL tests pass. v0.4's 319 + estimated 60-90 new tests from Phases 1-5 = 380-410 total.

- [ ] **Step 3:** If failures: triage. Schema-level failures must be fixed before tagging. Backward-compat regressions must be fixed.

- [ ] **Step 4:** Confirm v0.4 round-trip artifacts at `Celestia3/.vibe-prompt/` still validate against v0.5 schemas (backward compat — additive changes only).

### Task 30: Update README.md

**Files:**
- Modify: `plugins/vibe-prompt/README.md`

- [ ] **Step 1:** Update:
  - Add v0.5 section to "What's new"
  - Add `/vibe-prompt:remediate` to the command surface table
  - Document A/B/C fix categories
  - Document `:scan` new var detection patterns
  - Document `:first-run-setup` composer.json auto-gen
  - Document var-origin filtering in `:audit`
  - Maintain v0.4 working-register voice

- [ ] **Step 2:** Commit:
  ```
  docs(readme): document v0.5 additions
  ```

### Task 31: Update CHANGELOG.md

**Files:**
- Modify: `plugins/vibe-prompt/CHANGELOG.md`

- [ ] **Step 1:** Add v0.5.0 entry:
  - Header: `## [0.5.0] — 2026-05-29`
  - Sections: Added, Changed, Schema changes, Migration notes
  - List all 4 additions (headline + 3 supporting)
  - No breaking changes — additive release
  - Migration note: v0.4 audit.json validates; v0.4 inventory.json validates (templatedVars as string still allowed)

- [ ] **Step 2:** Commit:
  ```
  docs(changelog): add v0.5.0 entry
  ```

### Task 32: Bump plugin.json to 0.5.0

**Files:**
- Modify: `plugins/vibe-prompt/plugin.json`

- [ ] **Step 1:** Change `version` from `0.4.0` → `0.5.0`.

- [ ] **Step 2:** Commit:
  ```
  chore(version): bump to 0.5.0
  ```

### Task 33: Tag v0.5.0 (controller)

- [ ] **Step 1:** Verify branch clean.

- [ ] **Step 2:** `git tag -a v0.5.0 -m "..."` with release notes.

- [ ] **Step 3:** `git push origin v0.5.0`.

- [ ] **Step 4:** `git push origin HEAD`.

---

## Phase 7 — Marketplace + round-trip + decision + memory (controller)

### Task 34: Bump vibe-prompt ref in marketplace.json

**Files:**
- Modify: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

- [ ] **Step 1:** Change vibe-prompt entry `source.ref` from `v0.4.0` → `v0.5.0`.

- [ ] **Step 2:** Update description: add :remediate to the command-surface enumeration; add A/B/C fix categories; add var-origin filtering note. Working-register voice maintained.

- [ ] **Step 3:** Commit on vibe-plugins:
  ```
  chore(marketplace): bump vibe-prompt v0.4.0 → v0.5.0
  ```

- [ ] **Step 4:** Push.

### Task 35: Round-trip on Celestia3 (12 acceptance criteria from spec)

- [ ] **Step 1:** Run `/vibe-prompt:scan` against Celestia3 — verify Oneirocriton's dreamText now in inventory; arithmancy's knowledgeContext detected as system-injected.

- [ ] **Step 2:** Run `/vibe-prompt:first-run-setup --regenerate-composer` — verify composer.json globalConfidence > 0.7 with ≥4 layers.

- [ ] **Step 3:** Run `/vibe-prompt:audit` — verify F10 fires on Oneirocriton; F10 does NOT fire on arithmancy; F12 fires at critical (composer.json now present); F9 fires on 5/5 date prompts.

- [ ] **Step 4:** Run `/vibe-prompt:remediate` — verify 3 cowpath-matching diffs generated:
  - Category A for gemini.ts:80 date injection (confidence ≥0.92)
  - Category B for ConfigService.ts Pilgrim leak (confidence ~0.75, 3 occurrences)
  - Category C for Oneirocriton defense (confidence ≥0.88 contract, ~0.78 delimiter)

- [ ] **Step 5:** Verify routing: A auto-writes (after confirmation); B + C stage to `.vibe-prompt/remediate/pending/`.

- [ ] **Step 6:** Verify backup at `.vibe-prompt/remediate/backup/<timestamp>/gemini.ts.bak`.

- [ ] **Step 7:** Verify pending diffs are valid (front-matter + unified-diff body).

- [ ] **Step 8:** Apply staged Category B fix; re-run `:eval --prompts natal_interpretation`; verify Pilgrim leak no longer fires. Verify composite advances 6 → 8+.

- [ ] **Step 9:** `:remediate --rollback <timestamp>` — verify gemini.ts restored to pre-application state.

- [ ] **Step 10:** F12 handoff banner emitted (if F12 critical fires) — verify text mentions composer file + vibe-sec recommendation.

- [ ] **Step 11:** All extended schemas validate on output state files.

- [ ] **Step 12:** Total cost < $0.05 (the re-eval call is the only LLM cost).

- [ ] **Step 13:** Document round-trip results at `drafts/vibe-prompt-v0.5/celestia3-findings.md`.

### Task 36: Log decision to dashboard

- [ ] **Step 1:** Log decision via `mcp__626labs-cloud__manage_decisions` to project Vibe Plugins (ID `tyWzqAbCAq6Y9UJvoy8t`). Category: `feature`. Source: `claude-code`. Decision text summarizes v0.5 addition (:remediate + 3 supporting fixes); rationale references the 12 round-trip criteria results; nextSteps lists v0.6 candidates carried over from v0.5 brainstorm.

### Task 37: Memory + GitHub release

- [ ] **Step 1:** Write `vibe_prompt_v0_5_architecture.md` covering shipped capabilities, 3 fix categories, confidence rubric, var-origin filtering, composer.json auto-gen, v0.5 round-trip results, v0.6+ candidates queued.

- [ ] **Step 2:** Update `MEMORY.md` index.

- [ ] **Step 3:** `gh release create v0.5.0` with release notes (similar to v0.4 release format).

---

## Self-review

**Spec coverage check:**
- `:remediate` command covered: Tasks 15, 21, 22, 28 ✓
- 3 fix categories covered: Tasks 16, 25, 28 ✓
- Confidence rubric covered: Task 17 ✓
- Delimiter naming covered: Task 18 ✓
- Diff helpers + rollback covered: Tasks 19, 20 ✓
- Inventory scan completeness covered: Tasks 6, 7, 8, 9 ✓
- Var origin detection covered: Tasks 10, 11, 25 ✓
- composer.json auto-gen covered: Tasks 12, 13, 14 ✓
- Schemas covered: Tasks 1-5 ✓
- Friction triggers covered: Task 24 ✓
- Router + guide covered: Tasks 23, 27 ✓
- Docs + version + tag covered: Tasks 29-33 ✓
- Marketplace + round-trip + decision + memory covered: Tasks 34-37 ✓

**Placeholder scan:** none. Every test references real fixture content, every task names exact files and shows expected outcomes.

**Type consistency:**
- `templatedVars[].source` enum consistent across Tasks 1 + 6 + 7 + 8 + 9
- `templatedVars[].origin` enum consistent across Tasks 1 + 10 + 11 + 25
- `composer.layers[].confidence` consistent across Tasks 2 + 13 + 14
- Confidence routing thresholds (0.90 / 0.70) consistent across Tasks 17 + 22 + spec §1c

**Dependencies:**
- Phase 1 (schemas) must complete first.
- Phase 2 and 3 are INDEPENDENT of each other — can run parallel.
- Phase 4 depends on Phases 1, 2, 3 (uses inventory shapes + composer.json + schemas).
- Phase 5 depends on Phase 4 (router needs :remediate to point at; audit filter needs origin from Phase 2-3).
- Phase 6 depends on everything.
- Phase 7 depends on Phase 6 + tag.

**Workflow batching (suggested for Workflow-tool orchestration):**
- Agent 1: Phase 1 — schemas
- Agent 2 + Agent 3 (parallel): Phase 2 (scan completeness) + Phase 3 (var-origin + composer.json)
- Agent 4: Phase 4 — :remediate command + SKILL + references
- Agent 5: Phase 5 — cross-cutting (router, audit filter, friction, guide, F12 handoff)
- Agent 6: Phase 6 — tests verification + README + CHANGELOG + version bump
- Adversarial verifier: confirms Phases 1-6 met spec acceptance criteria before controller proceeds to Phase 7
- Controller: tag, marketplace bump, round-trip, decision log, memory, release notes

Six subagent dispatches + 1 verifier; matches v0.4's pacing of 6 dispatches.
