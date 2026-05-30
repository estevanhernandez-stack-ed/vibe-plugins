# vibe-prompt v0.7 spec

**Status:** Draft. Source of truth for the v0.7 release. Mirror to `docs/vibe-prompt-v0.7/` before Cart autonomous build.

**Predecessor:** v0.6.0 (tagged `5de0510`, shipped 2026-05-29) — detection sharpness theme: F12 API-parameter-aware + composer.schema `global-directive` enum + F13 (Implicit output format) + Category B voice-frame depth + `:remediate --auto-handoff-vibe-sec`.

**Theme:** **Generalization completeness.** v0.4 was breadth. v0.5 was depth. v0.6 was detection sharpness. v0.7 closes the structural gaps that the cross-app validation surfaced — taking the plugin from **PARTIAL → STRONG** generalization across multi-composer, monorepo, multi-SDK app shapes.

**Why v0.7 now:** Cross-app probe (2026-05-29, workflow `wf_acd83749-96d`) ran the live v0.6 plugin against three unseen apps (Project-626Labs-1 PM app, WeSeeYouAtTheMovies social/trivia, Quiz Show 7-app monorepo). v0.6 *survived* all three without crashing at $0 LLM cost — that's the load-bearing positive. But four named structural gaps hit **3 of 3** new apps deterministically:

1. Single-composer assumption (composer.schema has no `composers[]` array)
2. Monorepo scope-flattening (no per-workspace inventories)
3. Remediation-coverage gap (F1/F4/F6/F7 stuck at inline-only routing — diagnose-but-can't-help on the highest-severity findings)
4. Registry-kind classifier missing (prompt-content vs model-routing conflated)

Composer `globalConfidence` decayed cleanly across the app gradient — **Celestia3 0.89 → 626Labs 0.78 → WeSeeYou 0.62 → Quiz Show 0.35** — and F12 severity dragged with it on three of four. The detection heuristics that DID transfer (voice-frame quiet-test, F13 quiet-test, F10/F11/F12 stack identification, apiParameter-aware F12 suppression) prove the static-analysis layer is fundamentally general. It's the schema model + the apply layer that's Celestia3-shaped.

**The synthesis agent's verdict:** "Do NOT split. The pattern across four apps is consistent enough that a single v0.7 release covering P0 + P1 will lift the plugin from PARTIAL to STRONG generalization. Splitting would leave the static heuristics correct but the apply-the-fix layer broken — which is the current shape and the dominant friction."

---

## What ships

### P0 — Must ship (the load-bearing structural work)

#### 1. Multi-composer / multi-call-site support

**Problem:** `composer.schema.json` models ONE composer per app. Three of three new apps had multiple distinct composers:
- Project-626Labs-1: `galaxyCore.ts` + `ChatController.ts` (two distinct composition shapes)
- WeSeeYouAtTheMovies: 6 inline call sites, NO canonical composer file
- Quiz Show: 4 distinct composer shapes across workspaces

Only Celestia3 has a single canonical composer (`gemini.ts`). Without multi-composer support, F12 runs on the "primary" composer and silently misses the others.

**Fix:**
- `composer.schema.json` gains `composers[]` array (top-level). Each entry: `{kind, path, layers[], globalConfidence, regenerationSource}`.
- New `kind` enum: `single-composer` | `multi-composer` | `multi-call-site` | `shared-package`.
  - `single-composer`: Celestia3 shape (v0.6 backward-compat default — single-element composers[])
  - `multi-composer`: one app has multiple distinct composer files (626Labs galaxyCore + ChatController)
  - `multi-call-site`: no canonical composer file; inline call sites with their own composition (WeSeeYou)
  - `shared-package`: composer lives in a shared monorepo package (Quiz Show packages/ai/GeminiService.ts)
- `first-run-setup` detects kind via heuristic + emits per-composer entries.
- F12 detection runs **per composer** (not global). Each composer's apiParameter mapping is independent.
- audit.json finding emits `composerIdentifier` field to disambiguate which composer the finding targets.

**Backward compat:** v0.5/v0.6 composer.json with single composer-shape stays valid (treated as `composers[0]` with `kind: "single-composer"`).

**Score impact:** none directly. F12 detection accuracy improves; severity calibration improves.

#### 2. Monorepo scope-awareness

**Problem:** Quiz Show emitted ONE flat 40-site inventory across 7 apps + 8 packages. Cross-app voice contradictions folded into one F2. App composites are non-comparable (cinema 3-4/10 hidden by hotel 7-8/10 averaging). Project-626Labs-1 leaked sub-project noise (vibe-doc/, GitNexus-main/, whiteboard-app/) into the inventory because no exclude config exists.

**Fix:**
- `:scan` detects npm workspaces (package.json `workspaces` field) AND nested package.json roots without `workspaces` declaration.
- Per-workspace inventories: `.vibe-prompt/state/inventory-<workspace>.json` PLUS top-level aggregation `.vibe-prompt/state/inventory.json` (cross-references workspaces).
- Per-workspace composites in `:grade` output. `appComposite` becomes `appComposite.perWorkspace[<name>]` + `appComposite.aggregate`.
- NEW config: `.vibe-prompt/config/scan-excludes.json` — array of glob patterns. Default suggestions auto-populated from common patterns (`vibe-*/`, `*-main/`, `_ARCHIVE_*/`, `node_modules/`).
- On first scan in nested-project mode, plugin prompts user via AskUserQuestion (or surfaces as friction) for confirmation of detected workspace roots.

**Backward compat:** single-workspace apps (Celestia3) get `kind: "single-workspace"` and behave identically to v0.6. The workspace-aware logic is opt-in via detection.

**Score impact:** none directly. Cross-workspace findings (e.g., F2 across cinema + hotel personas) now route correctly to per-workspace audit not aggregate confusion.

#### 3. Remediation-coverage expansion for F1 / F4 / F6 / F7

**Problem:** v0.5/v0.6 confidence-routing caps F1, F4, F6, F7 at **inline-only** — the plugin diagnoses but cannot help on three of the five highest-severity finding categories. Cross-app evidence:
- Quiz Show: 35 inline-bypass sites (F1), 13 hardcoded `gemini-2.5-flash` model ids (F6), no `requiredVars` typed-renderer (F4) — all inline-only
- WeSeeYou: F4 typed-renderer recommendation is the highest-value missed fix
- Project-626Labs-1: F4/F6/F7 deferred to inline-only per spec

**Fix:** add Category D (Migration template) to `:remediate`. Three migration templates ship in v0.7:

- **F1 → inline-to-registry migration** (Category D-1)
  - Detect inline `systemInstruction` literal at call site
  - Generate diff: extract literal to registry (new entry in registry file with auto-derived id), replace call-site with `getPrompt(id)` invocation, add registry import if missing
  - Confidence: 0.85 default (mechanical refactor, low semantic risk)
  - Routes stage by default; `--apply-inline-to-registry` opt-in for auto-write
  - Per-call-site; multiple inline sites can be migrated independently
- **F4 → typed-renderer addition** (Category D-2)
  - Generate diff: add `requiredVars` field to registry interface, generate `renderPrompt(id, vars)` helper that throws on missing var, update call sites to use renderer
  - Confidence: 0.75 (touches interface + multiple call sites)
  - Routes stage
- **F6 → model-id consolidation** (Category D-3)
  - Generate diff: create `src/config/ai.ts` (or app-conventional path) exporting `DEFAULT_MODEL`, replace each occurrence with import
  - For monorepo apps: emit per-workspace `package.json` patches if needed
  - Confidence: 0.88 (mechanical; voice-risk = 1.0)
  - Routes auto-write at top end

F7 (hybrid call sites) stays inline-only — it's a stylistic preference, low actionable severity.

**Schema:** `remediate-result.schema.json` extended with Category D sub-categories. `pending-fix.schema.json` gains `migrationKind` enum (D-1 / D-2 / D-3).

**Why this is P0:** the cross-app audit produced rich findings, but ~70% of the highest-impact ones routed to inline-only and the user has to fix them by hand. The whole point of v0.5's `:remediate` work was to close the audit→fix gap; v0.7 finishes the job.

### P1 — Should ship (quality + accuracy improvements)

#### 4. Registry-kind classifier

**Problem:** F1 treats any detected registry as a prompt-content registry. Project-626Labs-1's `config/modelRegistry.ts` is a model-routing table (task-id → model-id); F1 would have fired high (hand-downgraded to F1b by orchestrator during the probe).

**Fix:** registry detection in `:scan` emits `registryKind` enum:
- `prompt-content` — contains prompt strings keyed by id (Celestia3 ConfigService.ts)
- `model-routing` — contains model identifiers keyed by task (626Labs modelRegistry.ts)
- `task-mapping` — contains task definitions keyed by id
- `hybrid` — multiple kinds in one file

F1 fires only when `registryKind === "prompt-content"`. F1b fires when no prompt-content registry detected (current logic).

**Schema:** `inventory.schema.json` extends `registry` block with `kind` enum.

#### 5. F12 severity-degrade decoupling

**Problem:** F12 detection logic was CORRECT on Quiz Show `firebaseAIService:422` and WeSeeYou `badge-icon-generator` — user-var and directive share `contents` API parameter, structural separation absent. But severity degraded critical→high because composer `globalConfidence` dropped below 0.7 due to **composer multiplicity** (legitimate monorepo / multi-call-site shape), not detection ambiguity.

**Fix:** decouple composer-multiplicity from composer-detection confidence. F12 severity-degrade triggers on **detection ambiguity** (`apiParameter: null` or `apiParameterConfidence < 0.6`), NOT on `globalConfidence` itself.

**Implementation:** F12 severity logic updates:
- If apiParameter is unambiguous on both layers (both have confidence ≥0.6) → use those values; severity stays critical
- If apiParameter is ambiguous → confidence-degrade to high
- composer-multiplicity is a separate metadata flag, surfaced for context but NOT used to drag severity

#### 6. F10+F11+F12 consolidated-diff routing

**Problem:** When all three findings fire on the same call site (Oneirocriton scenario from Celestia3, also WeSeeYou badge-icon, Quiz Show firebaseAIService), `:remediate` emits 3 separate pending diffs that all touch the same prompt content. F10's Category C defense wrapper SUBSUMES F11 (defense-in-depth) — the same `[INTERPRETATION CONTRACT]` block satisfies both. Currently the plugin emits two pending-diff files when one closes both.

**Fix:** consolidated-diff detection in `:remediate`. When F10 + F11 (or F10 + F11 + F12-high) fire on the same call site:
- Generate ONE consolidated Category C diff
- `findingIds` array references all three findings
- Diff includes both the defense block (closes F10) AND extra defense-in-depth phrases (closes F11)
- If F12-high also fires: include note about Category C as F12-high fallback

**Schema:** `pending-fix.schema.json` already supports `findingIds` array (added in v0.5). v0.7 extends consolidation logic in remediate SKILL.

### P2 — Opportunistic (fold in only if Phase 1-5 ship clean)

Carry-overs from Celestia3 v0.6 round-trip:
- F13 fix for arithmancy_natal_integration (same pattern as synastry — bonus catch)
- ritual_generation `JSON ONLY` header detection blind spot — verify if `JSON output` substring escapes step B
- `--test-f12-synthetic` flag on `:remediate` — automate auto-handoff testing
- Voice-frame counter-instruction detection (TechnomancerGrimoire.ts pattern)
- F11 minimum-threshold advisory (2/6 floor warning)

### Bonus — Suspect-model / typo detection revival

Quiz Show `scripts/generate-trivia-pro.mjs:87` declares `gemini-3.1-pro` which is not a real Google model. v0.1 removed this check after a Celestia3 cowpath false-positive on `gemini-3.5-flash`. Quiz Show is the **true-positive** that justifies revisiting.

**Fix:** revive F6 sub-finding: suspect model identifier. Detection sources:
- context7 lookup against `@google/genai` Model_2 type union (fresh data)
- Fallback to bundled known-good list with last-updated stamp
- Confidence-tiered: high if context7 hit returns "not in published list," medium if bundled-list-only mismatch
- Suppression: `audit.f6.modelIdExceptions` config array

Plus a small set of new gaps from the cross-app probe:
- **Raw-fetch REST as first-class SDK kind** (WeSeeYou Backend + functions use raw fetch to `generativelanguage.googleapis.com`)
- **F12 absent-system-instruction sub-case** (WeSeeYou badge-icon-generator has NO system-instruction layer at all)
- **F9 contextual narrowing** (date-MATH verbs vs reference-data verbs — WeSeeYou scout-report over-fires on "year" hitting athlete-movie-year reference)

---

## Schema additions / changes

### Extended: `composer.schema.json`
- Top-level `composers[]` array (each: `{kind, path, layers[], globalConfidence, regenerationSource, apiParameterCompleteness}`)
- `kind` enum: `single-composer` | `multi-composer` | `multi-call-site` | `shared-package`
- Top-level `compositionShape` enum (`single` | `multi`) for fast routing
- Backward compat: single-composer v0.6 shape validates as `composers[0]` with auto-injected kind

### Extended: `inventory.schema.json`
- `registry.kind` enum (`prompt-content` | `model-routing` | `task-mapping` | `hybrid`)
- `inventory.workspaces[]` array (when monorepo detected): `{name, path, packageJsonPath, inventoryFile}`
- `inventory.scanExcludes` array (from config + auto-detected)

### Extended: `audit.schema.json`
- `findings[].composerIdentifier` optional string (which composer the finding targets in multi-composer apps)
- `findings[].workspaceIdentifier` optional string (which monorepo workspace)
- `findings[].consolidatedWith` optional array of finding IDs (for F10+F11+F12 consolidation)
- F6 sub-finding `F6-suspect-model` added to id enum

### Extended: `remediate-result.schema.json`
- `appliedDiffs[].migrationKind` enum (`D-1-inline-to-registry` | `D-2-typed-renderer` | `D-3-model-consolidation`)
- `consolidatedDiffs[]` array — references diffs that close multiple findings

### Extended: `pending-fix.schema.json`
- `findingCategory` enum gains `D-1`, `D-2`, `D-3`
- `migrationKind` optional string
- `consolidatedFindingIds` optional array of strings

### Extended: `grade-result.schema.json`
- `appComposite.perWorkspace` object (per-workspace composites)
- `appComposite.aggregate` number (cross-workspace average for backward compat)

### Extended: `config.schema.json`
- `scan.workspaceDetection` enum (`auto` | `force-single` | `force-monorepo`)
- `scan.excludes` string array
- `audit.f6.modelIdExceptions` string array (for suspect-model suppression)
- `remediate.applyInlineToRegistry` boolean (default false)
- `remediate.applyTypedRenderer` boolean (default false)
- `remediate.applyModelConsolidation` boolean (default false)

---

## SKILL additions / changes

### Extended
- `scan/SKILL.md` — workspace detection step + per-workspace inventory emission + scan-excludes
- `scan/references/workspace-detection.md` (NEW) — npm workspaces detection + nested package.json detection + exclude defaults
- `scan/references/registry-kind-classification.md` (NEW) — classification heuristics for prompt-content vs model-routing vs task-mapping
- `audit/SKILL.md` — F1 reads registryKind; F6 includes suspect-model sub-finding; F12 severity-degrade decoupled from globalConfidence; composer iteration when `composers[]` has multiple entries
- `audit/references/smell-rubric-f1-f13.md` → `smell-rubric-f1-f13.md` (extended in place, adds F6-suspect-model sub-finding section)
- `first-run-setup/SKILL.md` — composer-kind classification + per-composer emission
- `first-run-setup/references/composer-detection.md` — kind heuristics
- `first-run-setup/references/composer-kinds.md` (NEW) — definitions of each kind + detection rules
- `remediate/SKILL.md` — Category D migration templates + consolidated-diff detection + F12-handoff inline pickup
- `remediate/references/fix-categories.md` — Category D added (D-1, D-2, D-3)
- `remediate/references/migration-templates.md` (NEW) — D-1 / D-2 / D-3 diff templates
- `remediate/references/consolidation-rules.md` (NEW) — F10+F11+F12 consolidation logic
- `grade/SKILL.md` — per-workspace composites
- `grade/references/composite-formula.md` — aggregation logic for monorepo
- `evolve-prompt/SKILL.md` — new friction triggers
- `friction-logger/references/friction-triggers.md` — new triggers per below
- `guide/SKILL.md` — v0.7 generalization-completeness overview

---

## Command additions / changes

### Extended
- `/vibe-prompt:remediate` gains three new flags:
  - `--apply-inline-to-registry` (Category D-1 opt-in)
  - `--apply-typed-renderer` (Category D-2 opt-in)
  - `--apply-model-consolidation` (Category D-3 opt-in)
- `/vibe-prompt:scan` extended for workspace detection (no command-shape change)
- `/vibe-prompt:audit` extended for per-composer iteration (no command-shape change)
- `/vibe-prompt:grade` extended for per-workspace composites (no command-shape change)
- `/vibe-prompt:first-run-setup` extended for multi-composer detection (no command-shape change)

### Unchanged
- `:eval`, `:iterate`, `:radar`, `:evolve-prompt`, bare router (router gains workspace state branches but no command-shape change)

---

## Friction triggers (new)

1. `composer-multiplicity-detected` (positive) — multi-composer or shared-package kind correctly identified
2. `composer-kind-detection-ambiguous` (medium) — first-run-setup can't confidently pick a kind; user manual selection needed
3. `workspace-detection-confidence-low` (medium) — npm workspaces declared but `:scan` can't determine boundaries
4. `scan-excludes-recommended-but-not-applied` (low) — auto-detected exclude candidates that user hasn't approved
5. `category-d-migration-applied-and-eval-confirms-no-regression` (positive)
6. `category-d-migration-rejected` (low)
7. `f6-suspect-model-detected` (medium) — model identifier not in known-good list; verify via context7 if available
8. `consolidated-diff-closes-multiple-findings` (positive) — F10+F11 or F10+F11+F12 closed via one diff
9. `f12-severity-no-longer-degraded-by-composer-multiplicity` (positive) — v0.7 decoupling correctly preserved critical severity

---

## Cost / scope controls

- Audit cost: all P0/P1 work is static. F6 suspect-model check optionally uses context7 (small WebFetch cost, ~$0.005 per audit if used).
- Remediate cost without new flags: identical to v0.6.
- Category D migration diffs: template-based, no LLM call. Same cost as v0.6.
- Workspace detection: static (filesystem walk + package.json parse).

---

## Out of scope (v0.8+)

Deferred from v0.7 to keep the release focused on P0+P1+Bonus:
- **F6b cross-model drift** (portfolio of 3+ distinct models as a smell, separate from single-model hardcoding) — WeSeeYou + Quiz Show evidence. New finding category, deserves dedicated cycle.
- **Persona-cycling experiment recognition** (intentional A/B vs accidental fragmentation) — Quiz Show cinema personas evidence. Subtle; needs more design.
- **Dead-SDK detection** (declared-but-no-call-sites) — 626Labs + WeSeeYou evidence. Small but stylistic; fits anywhere.
- **F12 handoff inline pickup polish** — handoff banner has no "invoke vibe-sec now?" prompt. Minor UX.
- **Eval `thinkingBudget: 0` for Gemini structured-output** — v0.5 round-trip friction; v0.6 didn't ship it; v0.8 candidate.
- **Oracle-frame-bypass injection fixtures** — strongest v0.4 round-trip signal; new fixture category deserves dedicated cycle.
- **Schema-injection fixtures**, **multi-turn injection patterns**, **OpenAI vendor for inject-attack eval** — all carry-overs.
- **CI/cron alerts when injectionResistance drops below threshold** — composes with vibe-sec gate.
- **AI-assisted Category B rewrites** — currently template-based; future could dispatch creative LLM call.

---

## Acceptance criteria for the cross-app round-trip

After build, re-run the v0.7 pipeline against all four apps and verify:

### Celestia3 (regression check)
1. v0.7 doesn't break v0.6's deterministic F12 not-fire on Oneirocriton
2. v0.7 composer.json validates against extended schema with `composers[0].kind: "single-composer"`
3. v0.6 audit/remediate artifacts still validate

### Project-626Labs-1
4. composer.json emits `composers[]` with TWO entries (galaxyCore + ChatController) at `kind: "multi-composer"`
5. F1 does NOT fire on `config/modelRegistry.ts` (correctly classified as `model-routing`)
6. F12 fires deterministic on galaxyCore; correctly suppressed on ChatController
7. scan-excludes auto-detects nested sub-projects (vibe-doc/, GitNexus-main/) and prompts user

### WeSeeYouAtTheMovies
8. composer.json emits `kind: "multi-call-site"` (no canonical composer file)
9. Multi-SDK detection finds all 3 Gemini paths
10. F4 typed-renderer Category D-2 diff staged
11. F1 inline-to-registry Category D-1 diff staged for 6 inline sites
12. F12 severity stays critical on badge-icon-generator (not degraded by composer-multiplicity)

### Quiz Show
13. `:scan` emits per-workspace inventories for 7 apps + 8 packages
14. `:grade` emits per-workspace composites (cinema separate from hotel separate from reel-battles)
15. F6 suspect-model finding fires on `scripts/generate-trivia-pro.mjs:87` (gemini-3.1-pro)
16. F1 Category D-1 diff staged for 35 inline-bypass sites
17. F6 Category D-3 model-consolidation diff staged for 13 hardcoded gemini-2.5-flash sites
18. composer.json identifies `packages/ai/src/gemini/GeminiService.ts` as `kind: "shared-package"`
19. F2 fires per-workspace (cinema personas separate from hotel personas)

### Overall
20. v0.6 plugin commands all preserved (additive only)
21. All extended schemas validate
22. Cross-app composite delta: 626Labs and WeSeeYou maintain composites within ±0.5; Quiz Show per-workspace composites now exposed (no longer hidden by aggregation)
23. Cost <$0.05 across all 4 apps (mostly static)

---

## Validation evidence (will be filled at ship time)

- Solo repo tag: `v0.7.0`
- Commit SHA: `(filled at ship)`
- Marketplace bump commit: `(filled at ship)`
- Round-trip artifacts: `Celestia3/.vibe-prompt/`, `Project-626Labs-1/.vibe-prompt/`, `WeSeeYouAtTheMovies/.vibe-prompt/`, `Quiz Show/.vibe-prompt/`
- Decision logged: `(decision ID)`
- Memory updated: `vibe_prompt_v0_7_architecture.md`

---

## Self-review

**Placeholder scan:** none. Every detection rule, score impact, schema extension, migration template, and acceptance criterion is concrete.

**Internal consistency:**
- Multi-composer support (P0 #1) is prerequisite for F12 per-composer evaluation (P1 #5) — explicit
- Workspace-awareness (P0 #2) is prerequisite for per-workspace composites in grade — explicit
- Category D (P0 #3) depends on workspace-awareness for monorepo per-package.json patches — explicit
- Registry-kind classifier (P1 #4) eliminates the F1 false-positive risk seen in 626Labs probe

**Scope check:** 6 P0+P1 items + 1 Bonus + ~3 carry-from-newGaps. Estimated commit count: 35-45 (slightly larger than v0.6's 29 because remediation templates are substantive new code). Plan should sequence:
- Phase 1: Schemas (foundational)
- Phase 2: Workspace detection + scan extensions (independent)
- Phase 3: Multi-composer detection + first-run-setup extensions (parallel to Phase 2)
- Phase 4: Audit extensions — F12 decoupling + F6 suspect-model + registry-kind + per-composer iteration
- Phase 5: Remediate Category D migration templates + consolidated-diff routing
- Phase 6: Grade per-workspace composites
- Phase 7: Cross-cutting (router workspace branches + friction + guide)
- Phase 8: Tests + docs + version bump
- Phase 9: Marketplace + cross-app round-trip + decision + memory

Phases 2 and 3 are mutually independent → 2-way parallel after Phase 1.
Phases 4 and 5 depend on Phase 3 → sequential.
Phase 6 depends on Phases 2+4 → sequential.

**Workflow batching (suggested):**
- Agent 1: Phase 1 (schemas)
- Agents 2 + 3 (parallel): Phase 2 (workspace + scan) + Phase 3 (multi-composer + first-run-setup)
- Agent 4: Phase 4 (audit extensions)
- Agent 5: Phase 5 (remediate Category D + consolidation)
- Agent 6: Phase 6 (grade per-workspace)
- Agent 7: Phase 7 (cross-cutting)
- Agent 8: Phase 8 (tests + docs + version)
- 3 adversarial verifiers parallel after Phase 8

Total: ~9 agents. Larger than v0.6 because of Category D migration template work. Estimated 60-90 min wall clock with the parallel fan-outs. ~$15-30 build cost.

**Ambiguity check:**
- "Multi-call-site composer kind" — when there's no canonical composer file, the plugin needs to decide per-call-site whether each is its own composer or part of a logical group. Heuristic: if multiple call sites import the same SDK with the same persona, they group; if personas differ, they don't. composer-kinds.md catalogs the heuristics.
- "Workspace boundary detection" — npm `workspaces` field is unambiguous. Nested package.json without workspaces declaration is fuzzier; auto-detect prompts for user confirmation.
- "Consolidation rule" — when F10 + F11 + F12-high fire on same call site, what's the priority order in the consolidated diff? Spec: F10 defense block is the structural change; F11 phrase count satisfied by F10's contract; F12-high note appended as comment explaining why composition restructure was deferred.

Ready for plan task. Mirror to docs/vibe-prompt-v0.7/ before Cart autonomous build.
