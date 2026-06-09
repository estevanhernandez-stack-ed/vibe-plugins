# vibe-prompt v0.7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The plan is Workflow-compatible — orchestrator can fan out Phases 2 and 3 in parallel after Phase 1 lands, then resume sequential through Phases 4-9.

**Goal:** Ship vibe-prompt v0.7.0 with **generalization completeness** across multi-composer / multi-call-site / shared-package / monorepo app shapes — closing the 4 structural gaps the cross-app probe surfaced on 626Labs + WeSeeYou + Quiz Show against v0.6.

**Architecture:** Six load-bearing additions on top of v0.6: composer.schema gains `composers[]` array + kind enum; inventory.schema gains workspaces + scan-excludes + registry.kind; audit gains per-composer iteration + F12 severity-decoupling + F6 suspect-model + registry-kind-aware F1; remediate gains Category D migration templates (D-1 inline-to-registry, D-2 typed-renderer, D-3 model-consolidation) + F10+F11+F12 consolidated-diff routing; grade gains per-workspace composites; router gains workspace state branches. All additive to v0.6 — v0.6 composer.json / audit.json / remediate-result.json continue to validate against v0.7 schemas (backward-compat shims for single-composer / single-workspace shapes).

**Tech Stack:** TypeScript/JavaScript schemas (JSON Schema draft-07). Markdown SKILL files. Python pytest test runner. Cart-autonomous compatible; Workflow-orchestratable with 2-way parallel after Phase 1.

**Repo paths:**
- Solo repo: `C:/Users/estev/Projects/Vibe-Prompt/`
- Plugin root: `C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/`
- Schemas: `plugins/vibe-prompt/schemas/`
- Skills: `plugins/vibe-prompt/skills/`
- Tests: `plugins/vibe-prompt/tests/`
- Marketplace: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

**Cross-app round-trip targets:** Celestia3 (regression), Project-626Labs-1, WeSeeYouAtTheMovies, Quiz Show.

---

## Phase 1 — Schema foundations

All schemas extended first. Backward compat: v0.6 artifacts (Celestia3 composer.json, audit.json, remediate-result.json) continue to validate.

### Task 1: Extend composer.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/composer.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_composer_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - Top-level `composers[]` array (each entry: `{kind, path, layers[], globalConfidence, regenerationSource, apiParameterCompleteness}`)
  - `kind` enum: `single-composer` | `multi-composer` | `multi-call-site` | `shared-package`
  - Top-level `compositionShape` enum (`single` | `multi`)
  - Backward compat: v0.6 composer.json (top-level `layers[]`, no `composers[]`) validates AND auto-promotes to `composers[0]` with `kind: "single-composer"` semantics
  - v0.5 composer.json with `directive-field` layer type still validates (deprecated alias preserved from v0.6)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer.schema.json: add `composers[]` array + `compositionShape` enum at top level. Mark old `layers[]` shape as deprecated-but-valid (oneOf branch).

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(composer-schema): add composers[] array + kind enum + compositionShape
  ```

### Task 2: Extend inventory.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/inventory.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_inventory_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `registry[].kind` enum (`prompt-content` | `model-routing` | `task-mapping` | `hybrid`), optional
  - Top-level `workspaces[]` optional array (each: `{name, path, packageJsonPath, inventoryFile}`)
  - Top-level `scanExcludes[]` optional string array
  - Top-level `workspaceKind` enum (`single-workspace` | `npm-workspaces` | `nested-projects` | `unknown`)
  - Backward compat: v0.6 inventory.json without these fields validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit inventory.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(inventory-schema): add registry.kind + workspaces + scanExcludes
  ```

### Task 3: Extend audit.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/audit.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_audit_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `findings[].composerIdentifier` optional string
  - `findings[].workspaceIdentifier` optional string
  - `findings[].consolidatedWith` optional array of finding-id strings
  - `findings[].id` enum gains `F6-suspect-model`
  - Backward compat: v0.6 audit.json (no composer/workspace identifiers, no consolidatedWith) validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit-schema): add composerIdentifier + workspaceIdentifier + consolidatedWith + F6-suspect-model
  ```

### Task 4: Extend remediate-result.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/remediate-result.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_remediate_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `appliedDiffs[].migrationKind` optional enum (`D-1-inline-to-registry` | `D-2-typed-renderer` | `D-3-model-consolidation`)
  - Top-level `consolidatedDiffs[]` optional array (each: `{path, findingIds[], rationale}`)
  - Backward compat: v0.6 remediate-result.json validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit remediate-result.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate-schema): add migrationKind + consolidatedDiffs
  ```

### Task 5: Extend pending-fix.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/pending-fix.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_pending_fix_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `findingCategory` enum gains `D-1`, `D-2`, `D-3`
  - `migrationKind` optional enum (same as Task 4)
  - `consolidatedFindingIds` optional array of strings

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit pending-fix.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(pending-fix-schema): add Category D + migrationKind + consolidated finding IDs
  ```

### Task 6: Extend grade-result.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/grade-result.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_grade_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `appComposite.perWorkspace` optional object (keys = workspace names, values = composite numbers)
  - `appComposite.aggregate` number (existing field semantics preserved)
  - Backward compat: v0.6 grade-result.json (no perWorkspace key) validates; `appComposite` as flat number also still validates via oneOf

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit grade-result.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(grade-schema): add appComposite.perWorkspace + aggregate
  ```

### Task 7: Extend config.schema.json

**Files:**
- Modify: `plugins/vibe-prompt/schemas/config.schema.json`
- Test: `plugins/vibe-prompt/tests/schemas/test_config_schema_v07.py`

- [ ] **Step 1:** Write a failing test:
  - `scan.workspaceDetection` enum (`auto` | `force-single` | `force-monorepo`), default `auto`
  - `scan.excludes` string array
  - `audit.f6.modelIdExceptions` string array
  - `remediate.applyInlineToRegistry` boolean, default false
  - `remediate.applyTypedRenderer` boolean, default false
  - `remediate.applyModelConsolidation` boolean, default false
  - Backward compat: v0.6 config validates

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit config.schema.json.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(config-schema): add workspace detection + Category D toggles + suspect-model exceptions
  ```

---

## Phase 2 — Workspace detection + scan extensions

Independent of Phase 3. Depends on Phase 1 (Task 2). Can run in parallel with Phase 3.

### Task 8: NEW workspace-detection.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/scan/references/workspace-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_workspace_detection_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Contains sections: "npm workspaces detection", "Nested package.json detection (no `workspaces` declaration)", "Exclude defaults", "Confidence calibration"
  - Documents the four `workspaceKind` enum values and detection rules for each
  - Includes default exclude glob list: `vibe-*/`, `*-main/`, `_ARCHIVE_*/`, `node_modules/`, `.git/`, `dist/`, `build/`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create workspace-detection.md per spec §"Monorepo scope-awareness".

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): add workspace-detection reference
  ```

### Task 9: NEW registry-kind-classification.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/scan/references/registry-kind-classification.md`
- Test: `plugins/vibe-prompt/tests/skills/test_registry_kind_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Contains sections: "prompt-content registry", "model-routing registry", "task-mapping registry", "hybrid registry"
  - Each section includes detection heuristics + canonical fixture example
  - `model-routing` section explicitly references the 626Labs `config/modelRegistry.ts` pattern (task-id → model-id mapping)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create registry-kind-classification.md per spec §"Registry-kind classifier".

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): add registry-kind classification reference
  ```

### Task 10: scan workspace detection logic

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_workspace_detection.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture A: package.json with `workspaces: ["packages/*", "apps/*"]` → emits `workspaceKind: "npm-workspaces"` with each glob expanded into `workspaces[]` entries
  - Fixture B: no top-level package.json but 3 nested package.json files in `apps/cinema`, `apps/hotel`, `packages/ai` → emits `workspaceKind: "nested-projects"` with detected nested roots
  - Fixture C: single package.json, no workspaces declaration → emits `workspaceKind: "single-workspace"`
  - Fixture D: no package.json at all → emits `workspaceKind: "unknown"`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md to add workspace-detection step before inventory emission. Reads `config.scan.workspaceDetection` to allow forcing.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): detect workspace kind (npm-workspaces / nested-projects / single / unknown)
  ```

### Task 11: scan per-workspace inventory emission

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_per_workspace_inventory.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: workspaceKind `npm-workspaces` with 3 workspaces → emits 3 files at `.vibe-prompt/state/inventory-<workspace-name>.json` PLUS top-level aggregator `.vibe-prompt/state/inventory.json` that cross-references each via `workspaces[].inventoryFile`
  - Each per-workspace inventory has its own `prompts[]` array scoped to that workspace
  - Top-level aggregator's `prompts[]` is a flat union but each entry has `workspaceIdentifier` field added
  - Fixture: workspaceKind `single-workspace` → emits only the top-level inventory (no per-workspace files), no `workspaces[]` array (v0.6 compatible shape)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md inventory-emission step to branch on workspaceKind. Per-workspace mode writes one file per workspace + the cross-reference aggregator.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): emit per-workspace inventories with top-level aggregator
  ```

### Task 12: scan-excludes config + auto-detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_excludes.py`

- [ ] **Step 1:** Write a failing test:
  - Reads `config.scan.excludes` array; entries treated as glob patterns
  - Auto-detects exclude candidates matching `vibe-*/`, `*-main/`, `_ARCHIVE_*/` and surfaces them via friction `scan-excludes-recommended-but-not-applied` (low) when not in config
  - When excludes applied, files matching globs do NOT appear in `prompts[]`
  - `scanExcludes[]` field in inventory.json reflects the effective exclude set

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md to apply excludes during walk + auto-suggest candidates.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): apply scan.excludes + auto-suggest sub-project candidates
  ```

### Task 13: scan registry-kind classification

**Files:**
- Modify: `plugins/vibe-prompt/skills/scan/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_scan_registry_kind.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture A: file with `export const PROMPTS = { foo: "string content...", bar: "..." }` → `registry.kind: "prompt-content"`
  - Fixture B: file with `export const MODELS = { mainChat: "gemini-2.5-pro", embed: "text-embedding-004" }` → `registry.kind: "model-routing"`
  - Fixture C: file with `export const TASKS = { generate: { description: "...", inputs: [...] } }` → `registry.kind: "task-mapping"`
  - Fixture D: file mixing string prompts AND model IDs → `registry.kind: "hybrid"`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit scan/SKILL.md to add registry classification step per references/registry-kind-classification.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(scan): classify registry kind (prompt-content / model-routing / task-mapping / hybrid)
  ```

---

## Phase 3 — Multi-composer detection + first-run-setup

Independent of Phase 2. Depends on Phase 1 (Task 1). Can run in parallel with Phase 2.

### Task 14: NEW composer-kinds.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/first-run-setup/references/composer-kinds.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_kinds_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Sections: "single-composer", "multi-composer", "multi-call-site", "shared-package"
  - Each section: detection heuristic + canonical example
    - `single-composer` → Celestia3 `src/lib/gemini.ts`
    - `multi-composer` → 626Labs `galaxyCore.ts` + `ChatController.ts`
    - `multi-call-site` → WeSeeYou (no canonical file; 6 inline call sites)
    - `shared-package` → Quiz Show `packages/ai/src/gemini/GeminiService.ts`
  - "Multi-call-site grouping heuristic" subsection: same-SDK + same-persona groups; differing personas don't

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create composer-kinds.md per spec §"Multi-composer / multi-call-site support".

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): add composer-kinds reference
  ```

### Task 15: composer-kind classification heuristic

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/first-run-setup/references/composer-detection.md`
- Test: `plugins/vibe-prompt/tests/skills/test_composer_kind_classification.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture A (one composer file with SDK call) → `kind: "single-composer"`, compositionShape `single`
  - Fixture B (two distinct composer files, both call SDK with their own composition) → `kind: "multi-composer"`, compositionShape `multi`
  - Fixture C (no composer file; SDK calls scattered across N files inline) → `kind: "multi-call-site"`, compositionShape `multi`
  - Fixture D (composer file in `packages/<name>/`; referenced by multiple workspaces) → `kind: "shared-package"`, compositionShape `multi`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit composer-detection.md + first-run-setup/SKILL.md to add kind-classification step before emission.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): classify composer kind via SDK-call topology
  ```

### Task 16: first-run-setup emits composers[] array

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_first_run_setup_composers_array.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture A (single-composer): emits composer.json with `composers[]` of length 1, `compositionShape: "single"`, top-level `layers[]` ALSO present (back-compat shim — same array surfaced both places)
  - Fixture B (multi-composer): emits composer.json with `composers[]` of length 2, each with its own `layers[]` + `globalConfidence`, no top-level `layers[]` field
  - Each composer entry has `path`, `kind`, `layers[]`, `globalConfidence`, `regenerationSource`, `apiParameterCompleteness`
  - Backward compat: v0.6 composer.json (without `composers[]`) reads cleanly when downstream consumers fall back to top-level `layers[]`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit first-run-setup/SKILL.md emission step to emit composers[] array; for single-composer also write top-level layers[] for back-compat.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): emit composers[] array with kind + back-compat shim
  ```

### Task 17: per-composer apiParameter detection

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_per_composer_api_parameter.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: multi-composer app where composer A uses `systemInstruction:` arg and composer B interpolates into `contents[].parts[].text`
  - Each composer's layers carry their own `apiParameter` + `apiParameterConfidence` independently
  - `apiParameterCompleteness` on each composer reports the fraction of layers with detected apiParameter

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit first-run-setup/SKILL.md to run v0.6 apiParameter detection per composer rather than once globally.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): detect apiParameter per composer (not global)
  ```

### Task 18: multi-call-site grouping logic

**Files:**
- Modify: `plugins/vibe-prompt/skills/first-run-setup/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_multi_call_site_grouping.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture: 6 inline call sites, 4 share persona "movie-trivia-bot" + same SDK, 2 share persona "badge-generator" + same SDK
  - Grouping emits 2 composer entries (one per logical group) under `kind: "multi-call-site"`
  - Each composer's `path` lists ALL the call sites it covers (string array, not single path)
  - Confidence per group reflects how cleanly the call sites cluster

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit first-run-setup/SKILL.md to add multi-call-site grouping step per composer-kinds.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(first-run-setup): group multi-call-site composers by SDK + persona
  ```

---

## Phase 4 — Audit extensions

Depends on Phases 1 + 3 (needs composers[] support and audit schema fields).

### Task 19: Audit per-composer iteration

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_audit_per_composer_iteration.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: composer.json with `composers[]` of length 2
  - Audit runs F12 (and all composer-aware findings) ONCE PER composer
  - Each finding emits `composerIdentifier` matching the composer's `path` (or first path for multi-call-site groups)
  - Backward compat: composer.json with no `composers[]` (just top-level `layers[]`) runs as single composer with `composerIdentifier: null`

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md F12 detection step (and other composer-iterating findings) to loop over composers[] when present.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): iterate composer-aware findings per composer
  ```

### Task 20: F12 severity-degrade decoupling

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f13.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f12_severity_decoupling.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture A: composer with apiParameter unambiguous (both layers have confidence ≥0.6) + multi-composer kind + globalConfidence 0.62 (low) → F12 severity stays **critical** (decoupling works; multiplicity does NOT drag severity)
  - Fixture B: composer with apiParameter ambiguous on one layer (confidence 0.4) → F12 severity degrades to **high** (detection ambiguity correctly degrades)
  - Fixture C: both apiParameter null → F12 severity degrades to **high** (existing v0.6 fallback)
  - composer-multiplicity exposed as `findings[].metadata.composerMultiplicityFlag` for context only, not severity input

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md F12 severity-decision step + update smell-rubric-f1-f13.md F12 section to document the decoupling.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): decouple F12 severity-degrade from composer multiplicity
  ```

### Task 21: F6 suspect-model sub-finding

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f13.md`
- Create: `plugins/vibe-prompt/skills/audit/references/known-models.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f6_suspect_model.py`

- [ ] **Step 1:** Write a failing test using synthetic fixtures:
  - Fixture A: prompt references `gemini-3.1-pro` (not in known-models bundled list) → fires `F6-suspect-model` with severity medium; evidence includes lookup result
  - Fixture B: prompt references `gemini-2.5-flash` (in known-models list) → does NOT fire suspect-model
  - Fixture C: model id in `config.audit.f6.modelIdExceptions` array → does NOT fire even if missing from list
  - Fixture D: context7 lookup available → confidence high (vendor-confirmed not-in-published-list); context7 unavailable → confidence medium (bundled-list-only)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create known-models.md with bundled list of known model IDs + last-updated stamp. Edit audit/SKILL.md to add F6-suspect-model step. Add F6-suspect-model section to smell-rubric-f1-f13.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): revive F6 suspect-model sub-finding with context7-aware confidence
  ```

### Task 22: F1 registry-kind awareness

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f13.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f1_registry_kind.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture A: inventory has `registry.kind: "prompt-content"` AND inline systemInstruction at call site → F1 fires (current behavior)
  - Fixture B: inventory has `registry.kind: "model-routing"` AND inline systemInstruction at call site → F1 does NOT fire on the model-routing registry; F1b fires instead (no prompt-content registry detected)
  - Fixture C: inventory has `registry.kind: "hybrid"` → F1 fires (hybrid contains prompt-content)
  - Fixture D: inventory has no registry → F1b fires (unchanged from v0.6)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit audit/SKILL.md F1 step to gate on `registry.kind === "prompt-content"` or `"hybrid"`. Update smell-rubric-f1-f13.md F1 section.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): F1 fires only on prompt-content registries (eliminates 626Labs false-positive)
  ```

### Task 23: F12 absent-system-instruction sub-case

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f13.md`
- Test: `plugins/vibe-prompt/tests/skills/test_f12_absent_system_instruction.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: composer with user-var layer in `contents` but NO system-instruction layer at all (WeSeeYou badge-icon-generator pattern)
  - F12 still fires with severity high (degraded — no structural separation possible when only one layer)
  - Finding emits `apiParameterContext.absentSystemInstructionLayer: true` for clarity

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit F12 detection logic to handle absent-system-instruction case. Update rubric reference.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(audit): F12 handles absent-system-instruction sub-case
  ```

---

## Phase 5 — Remediate Category D + consolidation

Depends on Phases 1 + 4 (needs pending-fix schema + audit findings with consolidatedWith).

### Task 24: NEW migration-templates.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/migration-templates.md`
- Test: `plugins/vibe-prompt/tests/skills/test_migration_templates_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Sections: "D-1 inline-to-registry", "D-2 typed-renderer", "D-3 model-consolidation"
  - Each section: detection trigger, generated diff template, confidence default, routing default
  - D-1 template shows: registry entry generation + call-site replacement + import injection
  - D-2 template shows: requiredVars interface addition + renderPrompt helper + call-site updates
  - D-3 template shows: src/config/ai.ts (or app-conventional path) + DEFAULT_MODEL export + per-site replacement

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create migration-templates.md per spec §"Remediation-coverage expansion for F1 / F4 / F6 / F7".

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add migration-templates reference (D-1/D-2/D-3)
  ```

### Task 25: Category D-1 (inline-to-registry)

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/remediate/references/fix-categories.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_category_d1.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: F1 finding on inline systemInstruction literal at call site
  - `:remediate` generates diff: (1) new registry entry with auto-derived id, (2) call-site replaced with `getPrompt(id)` invocation, (3) registry import added if absent
  - `migrationKind: "D-1-inline-to-registry"`, `findingCategory: "D-1"`, confidence 0.85
  - Routes stage by default; `--apply-inline-to-registry` flag routes to auto-write at confidence ≥0.90
  - Per-call-site independent: multiple D-1 diffs may exist for same finding-id list

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add Category D-1 case to remediate/SKILL.md + fix-categories.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): Category D-1 inline-to-registry migration template
  ```

### Task 26: Category D-2 (typed-renderer)

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/remediate/references/fix-categories.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_category_d2.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: F4 finding on registry-with-no-typed-renderer (raw `{{var}}` interpolation)
  - `:remediate` generates diff: (1) add `requiredVars: string[]` field per registry entry, (2) emit `renderPrompt(id, vars)` helper that throws on missing var, (3) update all call sites to use renderer
  - `migrationKind: "D-2-typed-renderer"`, confidence 0.75 (touches interface + multiple call sites)
  - Routes stage; `--apply-typed-renderer` opt-in for auto-write at ≥0.90

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add Category D-2 case to remediate/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): Category D-2 typed-renderer migration template
  ```

### Task 27: Category D-3 (model-consolidation)

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/remediate/references/fix-categories.md`
- Test: `plugins/vibe-prompt/tests/skills/test_remediate_category_d3.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: F6 finding with 13 occurrences of hardcoded `gemini-2.5-flash` across multiple files
  - `:remediate` generates diff: (1) `src/config/ai.ts` (or app-conventional path) with `export const DEFAULT_MODEL = "gemini-2.5-flash"`, (2) each occurrence replaced with import
  - `migrationKind: "D-3-model-consolidation"`, confidence 0.88, voice-risk 1.0
  - Routes auto-write at top end (confidence ≥0.88 default routes auto)
  - For monorepo apps (workspaceKind `npm-workspaces` / `nested-projects`): emits per-workspace config files when models differ across workspaces

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add Category D-3 case to remediate/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): Category D-3 model-consolidation migration template
  ```

### Task 28: NEW consolidation-rules.md reference

**Files:**
- Create: `plugins/vibe-prompt/skills/remediate/references/consolidation-rules.md`
- Test: `plugins/vibe-prompt/tests/skills/test_consolidation_rules_reference.py`

- [ ] **Step 1:** Write a failing test:
  - File exists
  - Sections: "F10 + F11 consolidation", "F10 + F11 + F12-high consolidation", "Priority order", "When NOT to consolidate"
  - Priority order documented: F10 defense block is the structural change; F11 phrase count satisfied by F10's contract; F12-high comment appended explaining composition restructure deferral
  - "When NOT to consolidate": findings on different call sites; F12-critical (needs auto-handoff path, not Category C subsumption)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Create consolidation-rules.md per spec §"F10+F11+F12 consolidated-diff routing".

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add consolidation-rules reference
  ```

### Task 29: F10+F11(+F12-high) consolidated-diff routing

**Files:**
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_consolidated_diff_routing.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture A: F10 + F11 findings on same call site → ONE consolidated Category C diff emitted; `findingIds[]` references both; v0.6 would have emitted two
  - Fixture B: F10 + F11 + F12-high on same call site → ONE consolidated diff; F12-high tracked in `findingIds` + diff includes commented note about composition restructure
  - Fixture C: F10 on call site A + F11 on call site B → NO consolidation (different sites)
  - Fixture D: F10 + F11 + F12-critical → consolidation does NOT apply (F12-critical needs auto-handoff path)
  - Top-level `consolidatedDiffs[]` array in remediate-result.json populated

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add consolidation step to remediate/SKILL.md per consolidation-rules.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): consolidate F10+F11(+F12-high) into single Category C diff
  ```

### Task 30: Three new remediate flags

**Files:**
- Modify: `plugins/vibe-prompt/commands/remediate.md`
- Modify: `plugins/vibe-prompt/skills/remediate/SKILL.md`
- Test: `plugins/vibe-prompt/tests/commands/test_remediate_category_d_flags.py`

- [ ] **Step 1:** Write a failing test:
  - Command declares `--apply-inline-to-registry`, `--apply-typed-renderer`, `--apply-model-consolidation` flags in remediate.md
  - Each flag flips its respective Category D routing from stage-only to normal routing (auto-write at ≥0.90)
  - Without flag: D-1/D-2/D-3 diffs stage even at high confidence (conservative default)
  - With flag: confidence routing applies as normal

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add three flags to remediate.md + SKILL.md gating logic.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(remediate): add --apply-inline-to-registry / --apply-typed-renderer / --apply-model-consolidation flags
  ```

---

## Phase 6 — Grade per-workspace composites

Depends on Phases 1 + 2 (needs grade schema + per-workspace inventories).

### Task 31: Per-workspace composite computation

**Files:**
- Modify: `plugins/vibe-prompt/skills/grade/SKILL.md`
- Modify: `plugins/vibe-prompt/skills/grade/references/composite-formula.md`
- Test: `plugins/vibe-prompt/tests/skills/test_grade_per_workspace.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: audit.json with findings tagged per `workspaceIdentifier` across 3 workspaces (cinema, hotel, reel-battles)
  - `:grade` computes one composite per workspace under `appComposite.perWorkspace[<name>]`
  - `appComposite.aggregate` reports cross-workspace mean (preserves v0.6 number semantics for back-compat consumers)
  - Workspaces with zero findings get composite null + flag `workspacesWithNoFindings[]`
  - Fixture: single-workspace app (no workspaceIdentifier on findings) → `appComposite` reported as flat number (v0.6 shape preserved)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit grade/SKILL.md to partition findings by workspaceIdentifier + compute per-workspace composites. Update composite-formula.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(grade): emit per-workspace composites with aggregate fallback
  ```

### Task 32: Per-workspace monotonic baseline regression

**Files:**
- Modify: `plugins/vibe-prompt/skills/grade/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_grade_per_workspace_regression.py`

- [ ] **Step 1:** Write a failing test:
  - Fixture: prior grade with `appComposite.perWorkspace.cinema: 6.8` and current grade with `cinema: 5.4` → regression flag fires on cinema workspace
  - Per-workspace regression tracked separately from aggregate regression
  - `grade-result.regressions[].workspaceIdentifier` field populated when regression detected per workspace

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit grade/SKILL.md to run monotonic baseline check per workspace.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(grade): track per-workspace monotonic baseline regression
  ```

---

## Phase 7 — Cross-cutting

Depends on Phases 1-6.

### Task 33: Router workspace state branches

**Files:**
- Modify: `plugins/vibe-prompt/skills/router/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_router_v07_workspace_branches.py`

- [ ] **Step 1:** Write a failing test:
  - When `inventory.json.workspaceKind === "npm-workspaces"` or `"nested-projects"` AND no per-workspace inventory files exist → router suggests `/vibe-prompt:scan` to populate workspace inventories
  - When per-workspace inventories exist but no per-workspace grade results → router suggests `/vibe-prompt:grade`
  - When pending Category D diffs exist → router includes `:remediate --apply-*` flag hints in its next-step recommendation
  - Bare router state branches now 10 → 13 (3 new: `workspace-rescan-needed`, `workspace-grade-needed`, `category-d-pending-review`)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Edit router/SKILL.md to add the three new state branches + their detection rules.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(router): add workspace + Category D state branches
  ```

### Task 34: 9 new friction triggers

**Files:**
- Modify: `plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md`
- Modify: `plugins/vibe-prompt/skills/evolve-prompt/SKILL.md`
- Test: `plugins/vibe-prompt/tests/skills/test_evolve_v07_triggers.py`

- [ ] **Step 1:** Write a failing test asserting trigger catalog includes:
  1. `composer-multiplicity-detected` (positive)
  2. `composer-kind-detection-ambiguous` (medium)
  3. `workspace-detection-confidence-low` (medium)
  4. `scan-excludes-recommended-but-not-applied` (low)
  5. `category-d-migration-applied-and-eval-confirms-no-regression` (positive)
  6. `category-d-migration-rejected` (low)
  7. `f6-suspect-model-detected` (medium)
  8. `consolidated-diff-closes-multiple-findings` (positive)
  9. `f12-severity-no-longer-degraded-by-composer-multiplicity` (positive)

- [ ] **Step 2:** Run test — expect FAIL.

- [ ] **Step 3:** Add 9 triggers to friction-triggers.md + handler templates in evolve-prompt/SKILL.md.

- [ ] **Step 4:** Run test — expect PASS.

- [ ] **Step 5:** Commit:
  ```
  feat(evolve-prompt): add 9 v0.7 friction triggers
  ```

### Task 35: Update guide/SKILL.md

**Files:**
- Modify: `plugins/vibe-prompt/skills/guide/SKILL.md`

- [ ] **Step 1:** Add new section "Generalization completeness (v0.7)" covering: composers[] array + four kinds; workspace-awareness for npm-workspaces and nested-projects; Category D migration templates (D-1/D-2/D-3); F12 severity-decoupling; F6 suspect-model; consolidated-diff routing. Working-register voice — concrete examples from 626Labs / WeSeeYou / Quiz Show.

- [ ] **Step 2:** Commit:
  ```
  docs(guide): add v0.7 generalization-completeness overview
  ```

### Task 36: Update audit-report-template.md

**Files:**
- Modify: `plugins/vibe-prompt/skills/audit/references/audit-report-template.md`

- [ ] **Step 1:** Add: composerIdentifier display per finding; workspaceIdentifier display per finding; consolidatedWith display when present; F6-suspect-model finding render template; multi-composer summary section at top of report.

- [ ] **Step 2:** Commit:
  ```
  docs(audit-template): render composer + workspace identifiers + F6-suspect-model
  ```

---

## Phase 8 — Tests + docs + version

### Task 37: Run full test suite verification

- [ ] **Step 1:** Run `cd plugins/vibe-prompt && python -m pytest tests/ -q`

- [ ] **Step 2:** Verify ALL tests pass. v0.6's 860 + new v0.7 tests (~90-120 expected from Phases 1-7) = ~950-980 total.

- [ ] **Step 3:** If failures: triage. Schema/backward-compat failures must be fixed.

- [ ] **Step 4:** Confirm v0.6 round-trip artifacts (Celestia3 `.vibe-prompt/`) still validate against v0.7 schemas.

### Task 38: Update README.md

**Files:**
- Modify: `plugins/vibe-prompt/README.md`

- [ ] **Step 1:** Update:
  - Add v0.7 section to "What's new"
  - Document `composers[]` array + four kinds (single-composer, multi-composer, multi-call-site, shared-package)
  - Document workspace-awareness (npm-workspaces + nested-projects)
  - Document Category D migration templates + three new flags
  - Add F6-suspect-model row to smell table; note F12 severity decoupling
  - Note F1 registry-kind awareness (eliminates model-routing false-positives)
  - Maintain working-register voice

- [ ] **Step 2:** Commit:
  ```
  docs(readme): document v0.7 generalization-completeness additions
  ```

### Task 39: Update CHANGELOG.md

**Files:**
- Modify: `plugins/vibe-prompt/CHANGELOG.md`

- [ ] **Step 1:** Add v0.7.0 entry:
  - Header: `## [0.7.0] — <date>`
  - Sections: Added, Changed, Schema changes, Migration notes
  - List all P0 + P1 additions
  - No breaking changes — additive release with back-compat shims
  - Migration: v0.6 composer.json validates (composers[] optional; top-level layers[] still emitted on single-composer for back-compat)

- [ ] **Step 2:** Commit:
  ```
  docs(changelog): add v0.7.0 entry
  ```

### Task 40: Bump plugin.json to 0.7.0

**Files:**
- Modify: `plugins/vibe-prompt/plugin.json`

- [ ] **Step 1:** Change `version` from `0.6.0` → `0.7.0`.

- [ ] **Step 2:** Commit:
  ```
  chore(version): bump to 0.7.0
  ```

### Task 41: Tag v0.7.0 (controller)

- [ ] **Step 1:** Verify branch clean.

- [ ] **Step 2:** `git tag -a v0.7.0 -m "..."` with release notes.

- [ ] **Step 3:** `git push origin v0.7.0`.

- [ ] **Step 4:** `git push origin HEAD`.

---

## Phase 9 — Marketplace + round-trip + decision + memory (controller)

### Task 42: Bump vibe-prompt ref in marketplace.json

**Files:**
- Modify: `C:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`

- [ ] **Step 1:** Change vibe-prompt entry `source.ref` from `v0.6.0` → `v0.7.0`.

- [ ] **Step 2:** Update description to mention multi-composer/multi-workspace/Category D.

- [ ] **Step 3:** Commit + push on vibe-plugins.

### Task 43: Cross-app round-trip — Celestia3 (regression)

- [ ] **Step 1:** Run `/vibe-prompt:first-run-setup --regenerate-composer` in Celestia3 — verify composer.json emits `composers[]` of length 1 with `kind: "single-composer"`; top-level `layers[]` preserved for back-compat.

- [ ] **Step 2:** Run `/vibe-prompt:audit` — verify F12 still does NOT fire critical on Oneirocriton (v0.6 deterministic not-fire preserved); F13 still fires on synastry_report; per-composer iteration runs once.

- [ ] **Step 3:** Run `/vibe-prompt:grade` — verify `appComposite` reported as flat number (v0.6 shape preserved for single-workspace).

- [ ] **Step 4:** Confirm v0.6 round-trip artifacts at Celestia3 validate against v0.7 schemas.

- [ ] **Step 5:** Document at `drafts/vibe-prompt-v0.7/celestia3-findings.md`.

### Task 44: Cross-app round-trip — Project-626Labs-1

- [ ] **Step 1:** Run `/vibe-prompt:first-run-setup` — verify composer.json emits `composers[]` with TWO entries (galaxyCore + ChatController), `kind: "multi-composer"`, `compositionShape: "multi"`.

- [ ] **Step 2:** Run `/vibe-prompt:scan` — verify scan-excludes auto-detects sub-projects (vibe-doc/, GitNexus-main/, whiteboard-app/); user-confirmation flow via friction trigger.

- [ ] **Step 3:** Run `/vibe-prompt:audit` — verify F1 does NOT fire on `config/modelRegistry.ts` (registry.kind correctly classified as model-routing); F12 fires deterministic on galaxyCore + correctly suppressed on ChatController.

- [ ] **Step 4:** Document at `drafts/vibe-prompt-v0.7/626labs-findings.md`.

### Task 45: Cross-app round-trip — WeSeeYouAtTheMovies

- [ ] **Step 1:** Run `/vibe-prompt:first-run-setup` — verify composer.json emits `kind: "multi-call-site"` (no canonical composer file); 6 inline call sites grouped per persona heuristic.

- [ ] **Step 2:** Run `/vibe-prompt:audit` — verify multi-SDK detection finds all 3 Gemini paths; F12 severity stays critical on badge-icon-generator (not degraded by composer-multiplicity); F12 absent-system-instruction sub-case fires correctly.

- [ ] **Step 3:** Run `/vibe-prompt:remediate` — verify F4 typed-renderer (Category D-2) staged + F1 inline-to-registry (Category D-1) staged for 6 inline sites.

- [ ] **Step 4:** Document at `drafts/vibe-prompt-v0.7/weseeyou-findings.md`.

### Task 46: Cross-app round-trip — Quiz Show

- [ ] **Step 1:** Run `/vibe-prompt:scan` — verify per-workspace inventories emitted for 7 apps + 8 packages; aggregator inventory.json cross-references workspaces.

- [ ] **Step 2:** Run `/vibe-prompt:first-run-setup` — verify composer.json identifies `packages/ai/src/gemini/GeminiService.ts` as `kind: "shared-package"`.

- [ ] **Step 3:** Run `/vibe-prompt:audit` — verify F6 suspect-model finding fires on `scripts/generate-trivia-pro.mjs:87` (gemini-3.1-pro); F2 fires per-workspace (cinema personas separate from hotel personas).

- [ ] **Step 4:** Run `/vibe-prompt:grade` — verify per-workspace composites emitted (cinema separate from hotel separate from reel-battles).

- [ ] **Step 5:** Run `/vibe-prompt:remediate` — verify F1 Category D-1 diff staged for 35 inline-bypass sites + F6 Category D-3 model-consolidation diff staged for 13 hardcoded `gemini-2.5-flash` sites.

- [ ] **Step 6:** Document at `drafts/vibe-prompt-v0.7/quizshow-findings.md`.

### Task 47: Acceptance criteria verification

- [ ] **Step 1:** Walk all 23 acceptance criteria from spec §"Acceptance criteria for the cross-app round-trip". Mark each PASS/FAIL.

- [ ] **Step 2:** Cost <$0.05 across all 4 apps confirmed (mostly static; F6 suspect-model context7 lookup is only LLM-adjacent cost).

- [ ] **Step 3:** Composite delta verified: 626Labs and WeSeeYou maintain composites within ±0.5; Quiz Show per-workspace composites now exposed.

### Task 48: Decision log + memory + release notes

- [ ] **Step 1:** Log decision to 626Labs Dashboard (project Vibe Plugins, ID `tyWzqAbCAq6Y9UJvoy8t`). Category: feature. Source: claude-code. Title: "vibe-prompt v0.7.0 — generalization completeness."

- [ ] **Step 2:** Write `vibe_prompt_v0_7_architecture.md` covering shipped capabilities (composers[] + kinds, workspace-awareness, Category D, F12 decoupling, F6 suspect-model, consolidated-diff routing), cross-app round-trip results, v0.8+ candidates queued.

- [ ] **Step 3:** Update `MEMORY.md` index.

- [ ] **Step 4:** `gh release create v0.7.0` with release notes.

---

## Self-review

**Spec coverage check:**
- Multi-composer (P0 #1): Tasks 1, 14, 15, 16, 17, 18, 19 ✓
- Monorepo scope-awareness (P0 #2): Tasks 2, 8, 10, 11, 12, 31, 32 ✓
- Remediation-coverage expansion (P0 #3): Tasks 4, 5, 24, 25, 26, 27, 30 ✓
- Registry-kind classifier (P1 #4): Tasks 2, 9, 13, 22 ✓
- F12 severity decoupling (P1 #5): Tasks 3, 20 ✓
- F10+F11+F12 consolidated diffs (P1 #6): Tasks 3, 4, 28, 29 ✓
- F6 suspect-model (Bonus): Tasks 3, 7, 21 ✓
- F12 absent-system-instruction (new gap): Task 23 ✓
- Per-workspace composites (P0 #2 dependency): Tasks 6, 31, 32 ✓
- Cross-cutting (router, friction, guide): Tasks 33-36 ✓
- Docs + version + tag: Tasks 37-41 ✓
- Marketplace + 4-app round-trip + decision + memory: Tasks 42-48 ✓

**Placeholder scan:** none. Every test references real fixture shape or cross-app evidence; every task names exact files and shows expected outcomes.

**Type consistency:**
- `composers[]` array shape consistent across Tasks 1, 15, 16, 17, 18, 19
- `workspaceKind` enum consistent across Tasks 2, 10, 11, 33
- `registry.kind` enum consistent across Tasks 2, 9, 13, 22
- `migrationKind` enum consistent across Tasks 4, 5, 25, 26, 27
- `composerIdentifier` consistent across Tasks 3, 19, 36
- `workspaceIdentifier` consistent across Tasks 3, 11, 31, 32, 36

**Dependencies:**
- Phase 1 (schemas) must complete first.
- Phases 2 (workspace + scan) and 3 (multi-composer + first-run-setup) are MUTUALLY INDEPENDENT after Phase 1 — can run 2-way parallel.
- Phase 4 (audit) depends on Phase 3 (per-composer iteration needs composers[] from Phase 3).
- Phase 5 (remediate Category D + consolidation) depends on Phase 4 (consolidation needs audit findings with `consolidatedWith` capacity).
- Phase 6 (grade per-workspace) depends on Phases 2 + 4 (needs per-workspace inventories + workspaceIdentifier on findings).
- Phase 7 (cross-cutting) depends on Phases 1-6.
- Phase 8 (tests + docs + version) depends on Phase 7.
- Phase 9 (marketplace + round-trip + decision + memory) depends on Phase 8 + tag.

**Workflow batching (suggested):**
- Agent 1: Phase 1 — schemas (7 tasks)
- Agents 2 + 3 (parallel after Phase 1): Phase 2 (workspace + scan, 6 tasks) + Phase 3 (multi-composer + first-run-setup, 5 tasks)
- Agent 4: Phase 4 — audit extensions (5 tasks)
- Agent 5: Phase 5 — remediate Category D + consolidation (7 tasks)
- Agent 6: Phase 6 — grade per-workspace (2 tasks)
- Agent 7: Phase 7 — cross-cutting (4 tasks)
- Agent 8: Phase 8 — tests verification + README + CHANGELOG + version bump (5 tasks)
- 3 adversarial verifiers parallel after Phase 8: spec-compliance, test-coverage, backward-compat
- Controller: Phase 9 — tag, marketplace bump, 4-app round-trip, decision log, memory, release notes

Total: 8 phase agents + 2-way parallel between Phases 2 and 3. ~48 tasks → ~40-50 commits. ~60-90 min wall clock with parallel fan-out (extrapolated from v0.6's 38 min over 34 tasks).

**External-API cost:** v0.7 round-trip is static across all 4 apps EXCEPT the optional F6 suspect-model context7 lookup (~$0.005 per audit when context7 is queried). Expected total round-trip cost <$0.05 across Celestia3 + 626Labs + WeSeeYou + Quiz Show.

Ready for execution.
