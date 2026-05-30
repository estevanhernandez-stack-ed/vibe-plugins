# Vibe-Prompt v0.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship vibe-prompt v0.3.0 — add per-dimension scoring (4 dimensions: schema-tightness, persona-consistency, instruction-clarity, token-efficiency) extending `:audit` + `:eval`, new `/vibe-prompt:grade` (synthesis + monotonic baseline regression), new `/vibe-prompt:iterate` (creative discovery of AI-feature opportunities), with Anthropic SWRS calibration patterns (Long CoT, Swap-and-Discard, verbosity penalty) on the LLM-judge layer.

**Architecture:** Two new step-commands + extensions to two existing ones. All work in the same `Vibe-Prompt` solo repo on a `v0.3-migration` branch off main (currently at `v0.2.0`, SHA `07f69e9`). New SKILL bodies + reference docs follow v0.2 patterns. State paths add `.vibe-prompt/grade/` and `.vibe-prompt/iterate/` subdirs. JSON schemas extend audit + eval result shapes; new schemas for grade-result + iterate-suggestions + baseline.

**Tech Stack:** Markdown (SKILL.md, command files, README, CHANGELOG), JSON (plugin.json, state schemas), Bash (curl-based vendor calls extended, validation tests). Same toolchain as v0.1+v0.2.

**Source spec:** `C:\Users\estev\Projects\vibe-plugins\drafts\vibe-prompt-v0.3\spec.md`. **Validation app:** Celestia3 — re-cowpath grading on natal_interpretation (expect persona-consistency score to drag composite down on Pilgrim contradiction) and `:iterate` (expect 3+ overlap with ground-truth list: horary, progressed chart, solar return, composite chart, tarot spreads, remediation rituals).

**Solo-repo target:** existing `C:\Users\estev\Projects\Vibe-Prompt`. Working branch: `v0.3-migration` off main. First stable: `v0.3.0`. Marketplace ref bumps from `v0.2.0` to `v0.3.0` at end.

---

## File structure (target after v0.3 lands)

```
Vibe-Prompt/plugins/vibe-prompt/
├── plugin.json                                # 0.2.0 → 0.3.0, description extended
├── commands/
│   ├── vibe-prompt.md                         # v0.1+v0.2 unchanged (router SKILL extends)
│   ├── scan.md                                # unchanged
│   ├── audit.md                               # unchanged
│   ├── eval.md                                # unchanged (eval SKILL extends)
│   ├── radar.md                               # unchanged
│   ├── grade.md                               # NEW
│   ├── iterate.md                             # NEW
│   └── evolve-prompt.md                       # unchanged (SKILL extends)
├── skills/
│   ├── guide/                                 # extended for grade + iterate posture
│   │   ├── SKILL.md                           # MODIFIED — covers grade + iterate
│   │   └── references/
│   │       ├── security-hard-rules.md         # unchanged
│   │       ├── cost-gates.md                  # MODIFIED — Swap-and-Discard cost note
│   │       └── calibration-patterns.md        # NEW — SWRS, Long CoT, Swap-and-Discard, verbosity penalty
│   ├── router/SKILL.md                        # MODIFIED — 5 → 7 state branches (grade + iterate)
│   ├── scan/                                  # unchanged
│   ├── audit/                                 # MODIFIED — adds scoring + composite
│   │   ├── SKILL.md                           # MODIFIED
│   │   └── references/
│   │       ├── smell-rubric-f1-f7.md          # MODIFIED — adds scoring guidance per finding
│   │       ├── audit-report-template.md       # MODIFIED — renders scores + composite
│   │       └── scoring-dimensions.md          # NEW — 4 dimensions: schema/persona/clarity/token
│   ├── eval/                                  # MODIFIED — adds SWRS + Swap-and-Discard + scoring
│   │   ├── SKILL.md                           # MODIFIED
│   │   └── references/
│   │       ├── composer-mimic.md              # unchanged
│   │       ├── vendor-clients.md              # unchanged
│   │       ├── fixture-synthesis.md           # unchanged
│   │       ├── mechanical-comparator.md       # unchanged
│   │       ├── llm-judge-prompt.md            # MODIFIED — SWRS + Long CoT + scoring per dimension
│   │       ├── dashboard-template.md          # MODIFIED — renders scores
│   │       └── swap-and-discard.md            # NEW — position-bias mitigation
│   ├── grade/                                 # NEW
│   │   ├── SKILL.md                           # NEW
│   │   └── references/
│   │       ├── monotonic-baseline.md          # NEW — baseline logic + regression detection
│   │       ├── composite-formula.md           # NEW — weighted avg + agent-suggested overrides
│   │       └── grade-dashboard-template.md    # NEW — render scores + deltas + trend
│   ├── iterate/                               # NEW
│   │   ├── SKILL.md                           # NEW
│   │   └── references/
│   │       ├── domain-detection.md            # NEW — CLAUDE.md → artifacts → interview cascade
│   │       ├── creative-discovery-prompt.md   # NEW — LLM prompt template for suggestions
│   │       └── iterate-dashboard-template.md  # NEW — render suggestions + handoff hints
│   ├── radar/                                 # unchanged
│   ├── first-run-setup/                       # unchanged
│   ├── session-logger/                        # unchanged
│   ├── friction-logger/                       # MODIFIED — adds 6 new triggers
│   │   ├── SKILL.md                           # unchanged
│   │   └── references/friction-triggers.md    # MODIFIED — appends grade + iterate triggers
│   └── evolve-prompt/SKILL.md                 # MODIFIED — covers grade + iterate sessions
├── schemas/                                   # v0.2 6 schemas + 3 new
│   ├── inventory.schema.json                  # unchanged
│   ├── audit.schema.json                      # MODIFIED — adds scores field per finding + auditGrade
│   ├── config.schema.json                     # unchanged
│   ├── composer.schema.json                   # unchanged
│   ├── agent.schema.json                      # unchanged
│   ├── run-result.schema.json                 # MODIFIED — adds per-dimension scores + evalGrade
│   ├── grade-result.schema.json               # NEW
│   ├── baseline.schema.json                   # NEW — monotonic baseline state
│   └── iterate-suggestions.schema.json        # NEW
└── tests/
    ├── validate-schemas.sh                    # unchanged (glob picks up new schemas)
    ├── check-skill-references.sh              # unchanged
    └── check-no-keys-in-state.sh              # unchanged
```

**Substitution rules** for SKILL files referencing v0.2 vs v0.3 patterns:
- v0.2's eval SKILL gets updates per v0.3 spec §5 (SWRS, Long CoT, Swap-and-Discard, verbosity penalty)
- v0.2's audit SKILL gets scoring per v0.3 spec §4
- All new files reference `vibe-prompt:*` namespace (no vibe-eval leakage — v0.2 already cleaned that up)

---

## Phase 1 — Branch + scaffold target dirs

### Task 1: Branch from main + create new skill directories

**Files:** (Working tree only — branch + dir creation)

- [ ] **Step 1.1: Verify clean working tree on main**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" status
git -C "C:\Users\estev\Projects\Vibe-Prompt" log -1 --oneline
```

Expected: clean working tree, latest commit shows v0.2.0 ship.

- [ ] **Step 1.2: Create v0.3-migration branch off main**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" checkout -b v0.3-migration
```

- [ ] **Step 1.3: Create new skill directories**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\grade\references"
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\iterate\references"
```

- [ ] **Step 1.4: No commit yet** — empty dirs aren't tracked; commits start when files land.

---

## Phase 2 — Schemas (extend + add new)

### Task 2: Extend audit.schema.json with scoring fields

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\audit.schema.json`

- [ ] **Step 2.1: Read the v0.2 audit.schema.json** to understand current structure.

- [ ] **Step 2.2: Add scoring fields per finding.** Each finding object inside `findings[]` gets a new optional `scores` object:

```json
{
  "scores": {
    "type": "object",
    "properties": {
      "schemaTightness": { "type": "integer", "minimum": 1, "maximum": 10 },
      "personaConsistency": { "type": "integer", "minimum": 1, "maximum": 10 },
      "instructionClarity": { "type": "integer", "minimum": 1, "maximum": 10 },
      "tokenEfficiency": { "type": "integer", "minimum": 1, "maximum": 10 }
    }
  }
}
```

- [ ] **Step 2.3: Add composite auditGrade field** at the top level of the audit result, alongside `findings`:

```json
{
  "auditGrade": {
    "type": "object",
    "properties": {
      "perPrompt": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "composite": { "type": "integer", "minimum": 1, "maximum": 10 },
            "dimensions": {
              "type": "object",
              "properties": {
                "schemaTightness": { "type": "integer", "minimum": 1, "maximum": 10 },
                "personaConsistency": { "type": "integer", "minimum": 1, "maximum": 10 },
                "instructionClarity": { "type": "integer", "minimum": 1, "maximum": 10 },
                "tokenEfficiency": { "type": "integer", "minimum": 1, "maximum": 10 }
              }
            }
          }
        }
      },
      "appComposite": { "type": "integer", "minimum": 1, "maximum": 10 }
    }
  }
}
```

- [ ] **Step 2.4: Verify JSON parses**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\audit.schema.json" | ConvertFrom-Json
```

- [ ] **Step 2.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/audit.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): extend audit schema with 4-dimension scores + auditGrade composite"
```

### Task 3: Extend run-result.schema.json with eval scoring

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\run-result.schema.json`

- [ ] **Step 3.1: Read the v0.2 run-result.schema.json.**

- [ ] **Step 3.2: Add `scores` field to each `llmJudge.findings[]` entry** (same 4-dimension shape as Task 2.2).

- [ ] **Step 3.3: Add SWRS structure to llmJudge** — extend `findings[]` items to include:

```json
{
  "strengths": { "type": "array", "items": { "type": "string" } },
  "weaknesses": { "type": "array", "items": { "type": "string" } },
  "reasoning": { "type": "string" }
}
```

- [ ] **Step 3.4: Add Swap-and-Discard metadata to llmJudge:**

```json
{
  "swapAndDiscard": {
    "type": "object",
    "properties": {
      "enabled": { "type": "boolean" },
      "tiedAndDiscarded": { "type": "boolean" },
      "originalOrderJudgmentSummary": { "type": "string" },
      "swappedOrderJudgmentSummary": { "type": "string" }
    }
  }
}
```

- [ ] **Step 3.5: Add evalGrade composite at prompt level:**

```json
{
  "evalGrade": {
    "type": "object",
    "properties": {
      "composite": { "type": "integer", "minimum": 1, "maximum": 10 },
      "dimensions": {
        "type": "object",
        "properties": {
          "schemaTightness": { "type": "integer", "minimum": 1, "maximum": 10 },
          "personaConsistency": { "type": "integer", "minimum": 1, "maximum": 10 },
          "instructionClarity": { "type": "integer", "minimum": 1, "maximum": 10 },
          "tokenEfficiency": { "type": "integer", "minimum": 1, "maximum": 10 }
        }
      }
    }
  }
}
```

- [ ] **Step 3.6: Verify + commit**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\run-result.schema.json" | ConvertFrom-Json
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/run-result.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): extend run-result with SWRS, Swap-and-Discard metadata, evalGrade"
```

### Task 4: Add grade-result.schema.json + baseline.schema.json + iterate-suggestions.schema.json

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\grade-result.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\baseline.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\iterate-suggestions.schema.json`

- [ ] **Step 4.1: Write grade-result.schema.json verbatim:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-prompt/grade-result",
  "type": "object",
  "required": ["version", "runId", "computedAt", "perPrompt", "appComposite"],
  "properties": {
    "version": { "type": "string", "const": "0.3" },
    "runId": { "type": "string" },
    "computedAt": { "type": "string", "format": "date-time" },
    "sourceAuditRef": { "type": "string" },
    "sourceEvalRunRef": { "type": "string" },
    "perPrompt": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["composite", "dimensions"],
        "properties": {
          "composite": { "type": "integer", "minimum": 1, "maximum": 10 },
          "dimensions": {
            "type": "object",
            "required": ["schemaTightness", "personaConsistency", "instructionClarity", "tokenEfficiency"],
            "properties": {
              "schemaTightness": { "type": "integer", "minimum": 1, "maximum": 10 },
              "personaConsistency": { "type": "integer", "minimum": 1, "maximum": 10 },
              "instructionClarity": { "type": "integer", "minimum": 1, "maximum": 10 },
              "tokenEfficiency": { "type": "integer", "minimum": 1, "maximum": 10 }
            }
          },
          "vsBaseline": {
            "type": "object",
            "properties": {
              "delta": { "type": "integer" },
              "status": { "enum": ["improved", "regressed", "stable", "no-prior-baseline"] }
            }
          }
        }
      }
    },
    "appComposite": { "type": "integer", "minimum": 1, "maximum": 10 },
    "appCompositeVsBaseline": {
      "type": "object",
      "properties": {
        "delta": { "type": "integer" },
        "status": { "enum": ["improved", "regressed", "stable", "no-prior-baseline"] }
      }
    },
    "flaggedRegressions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["promptId", "dimension", "delta"],
        "properties": {
          "promptId": { "type": "string" },
          "dimension": { "type": "string" },
          "delta": { "type": "integer" }
        }
      }
    }
  }
}
```

- [ ] **Step 4.2: Write baseline.schema.json verbatim:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-prompt/baseline",
  "type": "object",
  "required": ["version", "establishedAt", "lastAdvancedAt", "perPromptBaseline", "appComposite"],
  "properties": {
    "version": { "type": "string", "const": "0.3" },
    "establishedAt": { "type": "string", "format": "date-time" },
    "lastAdvancedAt": { "type": "string", "format": "date-time" },
    "perPromptBaseline": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["composite", "dimensions", "establishedInRunId"],
        "properties": {
          "composite": { "type": "integer", "minimum": 1, "maximum": 10 },
          "dimensions": {
            "type": "object",
            "properties": {
              "schemaTightness": { "type": "integer", "minimum": 1, "maximum": 10 },
              "personaConsistency": { "type": "integer", "minimum": 1, "maximum": 10 },
              "instructionClarity": { "type": "integer", "minimum": 1, "maximum": 10 },
              "tokenEfficiency": { "type": "integer", "minimum": 1, "maximum": 10 }
            }
          },
          "establishedInRunId": { "type": "string" }
        }
      }
    },
    "appComposite": { "type": "integer", "minimum": 1, "maximum": 10 },
    "appCompositeAdvancedAt": { "type": "string", "format": "date-time" },
    "appCompositeEstablishedInRunId": { "type": "string" }
  }
}
```

- [ ] **Step 4.3: Write iterate-suggestions.schema.json verbatim:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-prompt/iterate-suggestions",
  "type": "object",
  "required": ["version", "runId", "generatedAt", "domain", "suggestions"],
  "properties": {
    "version": { "type": "string", "const": "0.3" },
    "runId": { "type": "string" },
    "generatedAt": { "type": "string", "format": "date-time" },
    "domain": {
      "type": "object",
      "required": ["summary", "source"],
      "properties": {
        "summary": { "type": "string" },
        "source": { "enum": ["claude-md", "vibe-tool-artifacts", "package-json", "prompt-content", "user-interview", "cached"] }
      }
    },
    "suggestions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["name", "purpose", "targetPersona", "whyValuable"],
        "properties": {
          "name": { "type": "string" },
          "purpose": { "type": "string" },
          "targetPersona": { "type": "string" },
          "exampleOutputShape": { "type": "string" },
          "whyValuable": { "type": "string" },
          "handoffHint": { "type": "string" }
        }
      }
    }
  }
}
```

- [ ] **Step 4.4: Verify all parse**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\grade-result.schema.json" | ConvertFrom-Json
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\baseline.schema.json" | ConvertFrom-Json
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\iterate-suggestions.schema.json" | ConvertFrom-Json
```

- [ ] **Step 4.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): add grade-result + baseline + iterate-suggestions schemas"
```

---

## Phase 3 — Calibration patterns + supporting references

### Task 5: Add calibration-patterns.md to guide references

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\references\calibration-patterns.md`

- [ ] **Step 5.1: Write the file verbatim:**

```markdown
# LLM-judge calibration patterns — vibe-prompt v0.3

All four patterns apply together (not negotiable bundle) in both `:audit`'s clarity-scoring meta-prompt and `:eval`'s drift-detection + behavioral-scoring judge.

## 1. SWRS structure (Strengths/Weaknesses/Reasoning/Score)

Judge returns JSON with this exact shape:

```json
{
  "strengths": ["array of 1-3 specific strengths"],
  "weaknesses": ["array of 1-3 specific weaknesses"],
  "reasoning": "prose explaining the assessment in 2-4 sentences",
  "score": 1-10
}
```

Strengths and weaknesses come BEFORE reasoning. Reasoning comes BEFORE score. The order matters — when the model emits reasoning tokens before committing to a verdict, it substantially reduces the tendency to default to middling scores (Anthropic training notes; verified pattern).

## 2. Long CoT before verdict

Judge prompt explicitly requests step-by-step reasoning before the score. This reduces self-preference bias (Chen et al. 2025-era research). For each criterion in the rubric, the judge must articulate the analysis BEFORE outputting any score.

Example judge prompt fragment:

> "Before scoring, walk through your analysis step by step. For each dimension (schema tightness, persona consistency, instruction clarity, token efficiency), reason through what you observe in the output. Cite specific phrases. THEN provide your scores."

## 3. Swap-and-Discard (position bias mitigation)

For comparative judgments (eval's drift detection: prod output vs baseline output), run the judge TWICE:

- Run 1: Output A = prod, Output B = baseline
- Run 2: Output A = baseline, Output B = prod (swapped)

If the judge favors "Output A" in BOTH runs (i.e., the favored position is the same regardless of content), DISCARD the comparison as a position-bias tie. Log the tie. Do not let it contribute to the drift findings.

If the judge favors the SAME UNDERLYING CONTENT in both runs (favors A in run 1 and B in run 2 — both pointing at the same actual output), accept the finding.

Cost: doubles judge calls per eval pair. Default: enabled. User can opt out with `:eval --no-swap` for cost-sensitive runs.

## 4. Verbosity penalty in rubric

Judge prompt explicitly instructs:

> "Penalize unnecessary elaboration. Quality is not length. An output that says the same thing in fewer words scores higher on token efficiency. Padded outputs that game evaluators should score lower."

This prevents verbosity-bias — the tendency for judges to prefer longer outputs even when shorter ones are better.

## 5. Lineage-overlap warning (carried forward from v0.2)

Every LLM-judge finding ships with the cross-vendor evaluator-drift footer (vibe-prompt v0.2 pattern). The footer names the evaluator identity so the user calibrates accordingly. v0.3 keeps this pattern — see `vibe-prompt:eval` SKILL for the footer template.
```

- [ ] **Step 5.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/guide/references/calibration-patterns.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(guide): add calibration-patterns reference (SWRS, Long CoT, Swap-and-Discard, verbosity penalty)"
```

### Task 6: Add scoring-dimensions reference to audit

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\audit\references\scoring-dimensions.md`

- [ ] **Step 6.1: Write the file verbatim** (define the 4 dimensions with code-level + agent-level criteria per spec §4):

```markdown
# Scoring dimensions — vibe-prompt v0.3

Each dimension scores 1-10. `:audit` scores the code-level criteria from the prompt source. `:eval` scores the agent-level criteria from the actual model output.

## 1. Schema tightness

**Code-level (audit):**
- Score 9-10: Prompt declares an output schema with all required keys named explicitly. `templatedVars` complete and validated (no orphan `{{x}}` references). Output format mandate is unambiguous.
- Score 5-8: Schema partially declared OR templated vars partially complete. Some ambiguity in required output structure.
- Score 1-4: No output schema declared. Loose or absent output format guidance. Multiple `{{}}` placeholders missing from `templatedVars` list.

**Agent-level (eval):**
- Score 9-10: Output strictly conforms — all required keys present, value types match schema, no extra keys.
- Score 5-8: Mostly conforms with minor drift (e.g., array vs string for what should be string).
- Score 1-4: Fails to conform — wrong types, missing required keys, extra unschemaed keys.

## 2. Persona consistency

**Code-level (audit):**
- Score 9-10: Prompt's declared voice/persona aligns perfectly with the global directive. No contradiction.
- Score 5-8: Partial alignment. Some elements reinforce, some weakly contradict.
- Score 1-4: Direct violation of the global directive. F2 finding fired with high severity.

**Agent-level (eval):**
- Score 9-10: Output honors the master directive end-to-end. No prohibited language.
- Score 5-8: Mostly honors with minor lapses.
- Score 1-4: Output contains prohibited language (e.g., "Pilgrim" when prohibited). Quantifies what the existing evaluator-drift footer flags qualitatively.

## 3. Instruction clarity

**Code-level (audit):**
- Score 9-10: Instructions are specific, unambiguous, free of placeholders, action-oriented.
- Score 5-8: Mostly clear with some hedging or ambiguity.
- Score 1-4: Vague, contradictory, or full of unfilled placeholders that would leak to the model.

**Agent-level (eval):**
- Score 9-10: Model followed the instruction correctly, answered the actual question, no off-topic drift.
- Score 5-8: Model followed mostly but missed nuance or partially drifted.
- Score 1-4: Model failed to follow OR answered a different question OR drifted to off-topic.

## 4. Token efficiency

**Code-level (audit):**
- Score 9-10: Prompt is concise and specific. No filler, no redundancy. Every section earns its place.
- Score 5-8: Some bloat — repeated instructions, unnecessarily formal language, redundant examples.
- Score 1-4: Heavy bloat. Verbose persona definitions, padded instructions, unnecessary repetition.

**Agent-level (eval):**
- Score 9-10: Output is appropriately concise. Doesn't pad to game length-based evaluators.
- Score 5-8: Some verbosity but within reasonable bounds.
- Score 1-4: Heavy padding. Output significantly longer than necessary for the task. Verbosity bias flagged.

## Composite formula

Per prompt: weighted average with default equal weights (0.25 each per dimension). User can override at `.vibe-prompt/grade/weights.json` per app.

Per app: average of per-prompt composites across the inventory.

## Agent-suggested weight overrides

When the plugin detects a dimension is brand-load-bearing for the app, it proactively suggests an override. Heuristics:
- If 4+ prompts in the inventory have F2 (persona contradiction) findings → suggest weighting persona consistency 2× (signal: voice is brand-load-bearing)
- If 4+ prompts have schema-related findings → suggest weighting schema tightness 2× (signal: structured-output is load-bearing)
- If average prompt token count > 4000 → suggest weighting token efficiency 2× (signal: cost optimization matters)

User confirms or declines. Confirmed overrides write to `.vibe-prompt/grade/weights.json`.
```

- [ ] **Step 6.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/references/scoring-dimensions.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): add scoring-dimensions reference (4 dims, code + agent level, composite formula)"
```

### Task 7: Add swap-and-discard reference to eval

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\swap-and-discard.md`

- [ ] **Step 7.1: Write the file verbatim:**

```markdown
# Swap-and-Discard — eval

Position-bias mitigation for the LLM-judge layer's comparative judgments.

## When it applies

For every (prompt × model) pair where the judge compares prod output vs baseline output to detect drift.

## Workflow

1. **Run 1 (original order):** dispatch judge subagent with Output A = prod, Output B = baseline. Capture judgment.

2. **Run 2 (swapped order):** dispatch judge subagent with Output A = baseline (swapped to position 1), Output B = prod (swapped to position 2). Capture judgment.

3. **Compare:**
   - **Content-consistent (accept):** judge favors the SAME UNDERLYING OUTPUT in both runs. Example: judge says "Output A is better" in run 1 (pointing at prod), and "Output B is better" in run 2 (still pointing at prod). The judge is responding to the content, not the position. **Accept** the finding.
   - **Position-tied (discard):** judge favors the SAME POSITION in both runs. Example: judge says "Output A is better" in both runs (pointing at prod in run 1, baseline in run 2). The judge is responding to the position, not the content. **Discard** the finding as position-bias artifact.

4. **Log:** in `run-result.json`, the `llmJudge.swapAndDiscard` block records `enabled: true`, `tiedAndDiscarded: <bool>`, and a summary of both judgments.

## Cost note

Swap-and-Discard doubles LLM-judge calls per eval (prod-vs-baseline) pair. For a 14-prompt sweep with one fixture each, this means 28 judge calls instead of 14. Cost gate (default $2.00 ceiling) absorbs this for typical Gemini-tier rates (~$0.02 per judge call on Claude in-session = $0 against ceiling, since in-session calls bill against the user's session not the plugin's vendor budget).

User can disable via `:eval --no-swap` for cost-sensitive runs.

## Friction trigger

If more than 30% of judge calls in a single `:eval` run are discarded as position ties, friction-log `swap-and-discard-tie-rate-over-30pct` with medium confidence. Signal: the judge prompt may need tightening OR a different model should be used as judge.
```

- [ ] **Step 7.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/swap-and-discard.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): add swap-and-discard reference (position-bias mitigation)"
```

---

## Phase 4 — Audit extension (scoring)

### Task 8: Update smell-rubric-f1-f7.md to include scoring

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\audit\references\smell-rubric-f1-f7.md`

- [ ] **Step 8.1: Read the v0.2 rubric.**

- [ ] **Step 8.2: For each finding F1-F7, add a "Score impact" subsection** that maps the finding's severity to dimension scores:

```markdown
### F2 — Voice contradicts itself across the composition stack

[existing content from v0.2]

**Score impact (v0.3):**
- Code-level (audit): Penalizes persona consistency dimension. Each F2 finding deducts 4 points from the persona-consistency score (capped at 1).
- Agent-level (eval): If reproduced in eval output, persona-consistency drops to 1-3.
```

Repeat the pattern for F1, F1b, F3, F4, F5, F6, F7 — map each smell to its primary dimension impact.

- [ ] **Step 8.3: Add a section at the end of the rubric** explaining how individual findings compose into per-prompt composite:

```markdown
## Per-prompt audit composite

After all F1-F7 detections, compute the per-prompt audit composite:

1. Start each dimension at 10 (perfect).
2. For each fired finding, apply its Score impact deduction to the affected dimensions.
3. Floor at 1 (no dimension goes below 1).
4. Per-prompt composite = weighted average of the 4 dimension scores (default equal weights).

App-level composite = average of per-prompt composites across all inventoried prompts.

See `references/scoring-dimensions.md` for the dimension definitions and `references/composite-formula.md` (in `:grade`) for weighting rules.
```

- [ ] **Step 8.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f7.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): extend F1-F7 rubric with score impact per finding + per-prompt composite logic"
```

### Task 9: Update audit-report-template.md to render scores

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\audit\references\audit-report-template.md`

- [ ] **Step 9.1: Read the v0.2 template.**

- [ ] **Step 9.2: Add a "Per-prompt scores" section** to the rendered template:

```markdown
## Per-prompt scores

| Prompt | Schema | Persona | Clarity | Tokens | Composite |
|---|---|---|---|---|---|
{{ for each prompt in audit.auditGrade.perPrompt }}
| {{prompt.id}} | {{prompt.dimensions.schemaTightness}} | {{prompt.dimensions.personaConsistency}} | {{prompt.dimensions.instructionClarity}} | {{prompt.dimensions.tokenEfficiency}} | {{prompt.composite}} |
{{ end for }}

**App composite:** {{audit.auditGrade.appComposite}} / 10
```

Render emoji indicators next to scores: 9-10 = ✓, 5-8 = · , 1-4 = ⚠.

- [ ] **Step 9.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/references/audit-report-template.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): extend report template to render per-prompt scores + app composite"
```

### Task 10: Update audit SKILL to compute scores

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\audit\SKILL.md`

- [ ] **Step 10.1: Read the v0.2 audit SKILL.**

- [ ] **Step 10.2: Add a step to the workflow** between "Apply rubric" and "Compose summary":

```markdown
6. **Compute per-prompt scores.** Per `references/scoring-dimensions.md` and `references/smell-rubric-f1-f7.md` Score impact section:
   - For each prompt in inventory, start each dimension at 10
   - Apply deductions per fired finding
   - Floor at 1
   - Compute composite (default equal weights; check `.vibe-prompt/grade/weights.json` for overrides)
   - Write to audit.json's auditGrade.perPrompt
   - Compute appComposite as average

7. **Check for agent-suggested weight overrides.** Heuristics in `references/scoring-dimensions.md`:
   - If 4+ prompts have F2 findings → suggest persona-consistency 2× weight
   - If 4+ prompts have schema findings → suggest schema-tightness 2× weight
   - If average prompt token count > 4000 → suggest token-efficiency 2× weight
   Present suggestion to user via AskUserQuestion. If accepted, write to `.vibe-prompt/grade/weights.json` and recompute composites.
```

- [ ] **Step 10.3: Update the load list** at top of SKILL to include the new references:

```markdown
Load `vibe-prompt:guide` first. Then load `references/smell-rubric-f1-f7.md`, `references/audit-report-template.md`, `references/scoring-dimensions.md`, and `vibe-prompt:guide/references/calibration-patterns.md`.
```

- [ ] **Step 10.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): compute per-prompt scores + check agent-suggested weight overrides"
```

---

## Phase 5 — Eval extension (SWRS + Swap-and-Discard + scoring)

### Task 11: Update llm-judge-prompt.md to use SWRS + Long CoT + verbosity penalty + per-dimension scoring

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\llm-judge-prompt.md`

- [ ] **Step 11.1: Read the v0.2 llm-judge-prompt.md.**

- [ ] **Step 11.2: Update the judge prompt template** to require SWRS structure + Long CoT + per-dimension scoring. The new template:

```markdown
## Updated judge prompt (v0.3)

The judge prompt now includes:

1. **Long CoT instruction** at top: "Before scoring, walk through your analysis step by step. For each dimension below, reason through what you observe. Cite specific phrases. THEN provide scores."

2. **Per-dimension scoring rubric**: schema tightness, persona consistency, instruction clarity, token efficiency. Each 1-10.

3. **SWRS structure output**: strengths, weaknesses, reasoning, then scores.

4. **Verbosity penalty instruction**: "Penalize unnecessary elaboration. An output that says the same thing in fewer words scores higher on token efficiency. Padded outputs that game evaluators should score lower."

Full template:

\`\`\`
You are {{agent.name}} ({{agent.model}}) acting as an LLM-judge for the vibe-prompt:eval drift detection layer.

You will read two outputs and produce a structured judgment. Before scoring, you MUST walk through your analysis step by step (Long CoT). For each dimension, articulate what you observe in the outputs. Cite specific phrases. THEN provide scores.

## Inputs

The same prompt was sent to two models:
- Output A: from {{prod.model}}
- Output B: from {{baseline.model}}

### Output A:
\`\`\`
{{outputProd}}
\`\`\`

### Output B:
\`\`\`
{{outputBaseline}}
\`\`\`

## Scoring rubric

For EACH of the two outputs, score on these 4 dimensions (1-10 each):

1. **Schema tightness** — does the output strictly conform to the prompt's declared output schema (required keys, value types, no extras)?
2. **Persona consistency** — does the output honor the master directive (no prohibited language, voice aligned)?
3. **Instruction clarity (followed)** — did the model follow the instruction correctly? Answer the actual question?
4. **Token efficiency** — is the output appropriately concise? PENALIZE unnecessary elaboration. Quality is not length. Padded outputs that game evaluators score lower.

## Required output shape

Return ONLY this JSON (no preamble, no postamble):

\`\`\`json
{
  "strengths_A": ["1-3 specific strengths of Output A"],
  "weaknesses_A": ["1-3 specific weaknesses of Output A"],
  "strengths_B": ["1-3 specific strengths of Output B"],
  "weaknesses_B": ["1-3 specific weaknesses of Output B"],
  "reasoning": "2-4 sentences walking through the comparative analysis, citing specific text",
  "scores_A": {
    "schemaTightness": 1-10,
    "personaConsistency": 1-10,
    "instructionClarity": 1-10,
    "tokenEfficiency": 1-10
  },
  "scores_B": {
    "schemaTightness": 1-10,
    "personaConsistency": 1-10,
    "instructionClarity": 1-10,
    "tokenEfficiency": 1-10
  },
  "driftFindings": [
    {
      "category": "persona-drift | voice-tone | topic-adherence | output-structure | length",
      "severity": "high | medium | low",
      "text": "1-2 sentence description naming what diverged, citing specific text"
    }
  ]
}
\`\`\`

## Important

- Be specific. Quote phrases.
- Do NOT score which output is "better" — compute scores independently for each.
- Where your assessment might reflect evaluator drift (your own training style biasing you), name it explicitly in the reasoning.
\`\`\`
```

- [ ] **Step 11.3: Update the post-processing section** to handle the new output shape — extract per-dimension scores for prod and baseline, store separately in `run-result.json`. The drift-detection findings retain the cross-vendor evaluator-drift footer.

- [ ] **Step 11.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/llm-judge-prompt.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): update LLM-judge prompt for SWRS + Long CoT + per-dimension scoring + verbosity penalty"
```

### Task 12: Update eval SKILL to invoke Swap-and-Discard + collect scores

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\SKILL.md`

- [ ] **Step 12.1: Read the v0.2 eval SKILL.**

- [ ] **Step 12.2: Update the load list** to include the new references:

```markdown
Load `vibe-prompt:guide` first. Then load `references/composer-mimic.md`, `references/vendor-clients.md`, `references/fixture-synthesis.md`, `references/mechanical-comparator.md`, `references/llm-judge-prompt.md`, `references/dashboard-template.md`, `references/swap-and-discard.md`, and `vibe-prompt:guide/references/calibration-patterns.md`.
```

- [ ] **Step 12.3: Add `--no-swap` and `--no-judge` flag handling** in the Inputs section.

- [ ] **Step 12.4: Update the workflow step 10 (LLM-judge)** to invoke Swap-and-Discard:

```markdown
10. **LLM-judge with Swap-and-Discard.** Per `references/llm-judge-prompt.md` and `references/swap-and-discard.md`:
    - Run 1: dispatch judge with prod as Output A, baseline as Output B
    - Run 2: dispatch judge with baseline as Output A, prod as Output B (swapped)
    - Compare:
      - If favored position is the same in both runs → discard as position-bias tie; set `swapAndDiscard.tiedAndDiscarded = true`; skip drift findings for this comparison
      - If favored content is the same in both runs → accept findings; set `swapAndDiscard.tiedAndDiscarded = false`
    - Extract per-dimension scores from both runs; average them for the final score_A and score_B in the run-result
    - Attach cross-vendor evaluator-drift footer to each accepted finding (carried forward from v0.2)
    - Skip if --no-judge flag set; skip Swap-and-Discard if --no-swap flag set
```

- [ ] **Step 12.5: Update workflow step 11 (run-result write)** to compute and include evalGrade per prompt:

```markdown
11. **Compute evalGrade per prompt.** Average prod scores and baseline scores per dimension; compute weighted-average composite. Store in run-result's `evalGrade` field. Apply user weight overrides from `.vibe-prompt/grade/weights.json` if present.
```

- [ ] **Step 12.6: Update banner template** to surface evalGrade composite + tie rate.

- [ ] **Step 12.7: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): invoke Swap-and-Discard + collect per-dimension scores + compute evalGrade"
```

### Task 13: Update eval dashboard-template.md to render scores

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\dashboard-template.md`

- [ ] **Step 13.1: Read the v0.2 dashboard template.**

- [ ] **Step 13.2: Add Per-prompt scores section** to the rendered template (same shape as audit's, but rendering eval-side scores):

```markdown
## Per-prompt eval scores

| Prompt | Prod Schema | Prod Persona | Prod Clarity | Prod Tokens | Baseline Schema | Baseline Persona | Baseline Clarity | Baseline Tokens | Composite (Prod) | Composite (Baseline) |
|---|---|---|---|---|---|---|---|---|---|---|
{{ for each prompts[*] }}
| {{prompts[i].id}} | {{prompts[i].evalGrade.dimensions.prod.schemaTightness}} | ... | ... | ... | ... | ... | ... | ... | {{prompts[i].evalGrade.composite.prod}} | {{prompts[i].evalGrade.composite.baseline}} |
{{ end for }}
```

- [ ] **Step 13.3: Add Swap-and-Discard summary section:**

```markdown
## Swap-and-Discard summary

- Pairs evaluated: {{count}}
- Tied (discarded): {{tiedCount}} ({{percentage}}%)
- Net findings: {{acceptedFindings}}

{{ if tied > 30% }}
> ⚠ More than 30% of pairs were tied — possible position-bias issue with the judge prompt OR the judge model. Friction-logged for evolve-prompt review.
{{ end if }}
```

- [ ] **Step 13.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/dashboard-template.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): extend dashboard template with per-prompt scores + Swap-and-Discard summary"
```

---

## Phase 6 — :grade command

### Task 14: Add grade SKILL + references (monotonic-baseline, composite-formula, dashboard-template)

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\grade\SKILL.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\grade\references\monotonic-baseline.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\grade\references\composite-formula.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\grade\references\grade-dashboard-template.md`

- [ ] **Step 14.1: Write grade SKILL** with frontmatter, load list, workflow (read audit + latest eval run → compute composites → compare vs baseline → write grade-result + dashboard).

- [ ] **Step 14.2: Write monotonic-baseline.md** — full baseline logic per spec §6:

```markdown
# Monotonic baseline — grade

Baseline = "best score so far," NOT "most recent run."

## State files

- `.vibe-prompt/grade/state/baseline.json` (validated against `baseline.schema.json`)
- `.vibe-prompt/grade/state/grade-<runId>.json` (validated against `grade-result.schema.json`)

## Algorithm

For each grade computation:

1. Read current per-prompt composites from this run's audit + eval scores.
2. Read `baseline.json` if it exists.

For each prompt:

a. If no prior baseline for this prompt:
   - Establish baseline at current composite
   - status = "no-prior-baseline"
   - delta = 0

b. If current >= baseline:
   - Advance baseline to current
   - status = "improved" (if >) or "stable" (if ==)
   - delta = current - baseline

c. If current < baseline:
   - Do NOT advance baseline
   - status = "regressed"
   - delta = current - baseline (negative)
   - Add to flaggedRegressions

For app composite: same logic.

3. Write updated baseline.json (with new advanced timestamps where applicable).
4. Write grade-result.json with status + delta per prompt + flaggedRegressions list.

## When a regression is flagged

If status = "regressed" with magnitude > 1 point on any dimension:
- Surface prominently in the dashboard with ⚠ icon
- Friction-log `regression-flagged` with high confidence (or `regression-flagged-and-accepted-as-baseline` if user explicitly overrides to advance the baseline anyway via `:grade --accept-regression`)
- Suggest user investigate: which finding caused the regression? Did a fix actually land?
```

- [ ] **Step 14.3: Write composite-formula.md** — weighted average + agent-suggested overrides (mirror of scoring-dimensions.md's composite section + cross-link).

- [ ] **Step 14.4: Write grade-dashboard-template.md** — full dashboard structure with verdict, per-prompt scores + trend arrows, app composite + delta, flagged regressions section, recommended next moves.

- [ ] **Step 14.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/grade/
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(grade): add grade SKILL + monotonic-baseline + composite-formula + dashboard-template references"
```

### Task 15: Create grade command file

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\commands\grade.md`

- [ ] **Step 15.1: Write the command file verbatim:**

```markdown
---
description: Synthesize audit + latest eval into per-prompt + app composite grades. Tracks regression vs monotonic baseline. Writes .vibe-prompt/grade/state/grade-<runId>.json and docs/vibe-prompt/grade-YYYY-MM-DD.md.
---

Invoke the `vibe-prompt:grade` skill.
```

- [ ] **Step 15.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/grade.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(grade): add /vibe-prompt:grade command"
```

---

## Phase 7 — :iterate command

### Task 16: Add iterate SKILL + references (domain-detection, creative-discovery-prompt, dashboard-template)

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\iterate\SKILL.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\iterate\references\domain-detection.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\iterate\references\creative-discovery-prompt.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\iterate\references\iterate-dashboard-template.md`

- [ ] **Step 16.1: Write iterate SKILL** with workflow: detect domain → read inventory + audit findings → dispatch creative-divergent LLM call → validate suggestions against schema → write suggestions.json + dashboard.

- [ ] **Step 16.2: Write domain-detection.md** — full cascade per spec §7:

```markdown
# Domain detection cascade — iterate

Detection order (stop at first confident match):

## 1. CLAUDE.md at app root

Highest signal. If `<target-app>/CLAUDE.md` exists:
- Read it
- Extract: app's stated purpose, persona, domain area, brand voice
- Verify with user via one-line confirm: "I read your CLAUDE.md — your app is [summary]. Look right? (Y/n)"
- If confirmed, cache to `.vibe-prompt/iterate/domain.json` and proceed
- If user pushes back, fall through to step 2

## 2. Vibe-tool artifacts

Sources to check (in priority order):
- `docs/architecture/` — Cart-generated architecture docs
- `docs/scope.md` — Cart's scope document
- `docs/walk/` — Walk's tour configs (signal: user-facing flows + AI features)
- `.vibe-iterate/atlas.jsonl` — Iterate's feature log
- `.vibe-sec/state/` — Sec's audit (signal: security concerns + stack)

Aggregate signals into a domain summary. Verify with user before proceeding.

## 3. Package metadata + prompts

- `package.json` description + name + dependencies (vendor signals like `@google/genai` → AI-app; `firebase` → Firebase stack)
- `README.md` if present
- The prompts themselves — subject matter is often the strongest signal

## 4. Last resort: short interview

If steps 1-3 didn't yield a confident domain summary, ask:

> "Couldn't pin down your app's domain confidently. Tell me in 2-3 sentences what it does."

Cache the user's response.

## Cache

Captured domain at `.vibe-prompt/iterate/domain.json`:

```json
{
  "summary": "Frontier AI meets technomancy: astrology (natal/synastry/horary), Hermeticism (Picatrix, Agrippa), numerology, tarot, dream interpretation. Voice: warm modern oracle, not 16th-century prophet.",
  "source": "claude-md",
  "capturedAt": "2026-05-29T...",
  "verifiedByUser": true
}
```

User can refresh with `:iterate --refresh-domain` flag.
```

- [ ] **Step 16.3: Write creative-discovery-prompt.md** — LLM prompt template for generating suggestions:

```markdown
# Creative discovery prompt — iterate

Dispatched via Agent tool with model="haiku" (cheap; creative-divergent doesn't need top-tier reasoning) and temperature=0.9 (divergent).

## Template

\`\`\`
You are helping a developer extend their app with new AI-powered features. They've inventoried their existing prompts and want suggestions for what's missing.

## Their app

{{domain.summary}}

## Existing prompts

{{ for each prompt in inventory }}
- {{prompt.id}} — {{prompt.name or prompt.purpose summary}}
{{ end for }}

## Current audit findings (gaps)

{{ for each finding in audit.findings where severity == "high" }}
- {{finding.smell}}: {{finding.recommendation}}
{{ end for }}

## Your task

Generate 3-5 new prompts the app COULD add that would surface new value. Each should:
- Fit the app's domain (don't suggest stuff outside scope)
- Complement existing prompts (don't duplicate)
- Address gaps the audit findings hint at (where appropriate)
- Be specific and buildable (not vague concepts)

Return ONLY a JSON array of suggestions. Each:

\`\`\`json
{
  "name": "snake_case_prompt_id",
  "purpose": "1-sentence statement of what this prompt does",
  "targetPersona": "Which existing persona, or 'extend existing voice' or 'new persona: X'",
  "exampleOutputShape": "Brief JSON or prose shape example",
  "whyValuable": "2-3 sentences explaining why this adds value given the app's domain",
  "handoffHint": "Suggested next step: /vibe-cartographer:scope OR /vibe-iterate:feature-add OR direct prompt drafting"
}
\`\`\`

Avoid suggestions that:
- Add new vendors / SDKs the app doesn't already use
- Require infrastructure the app likely doesn't have (DB tables, etc.)
- Duplicate existing prompts under a different name
- Are obviously out of domain
\`\`\`
```

- [ ] **Step 16.4: Write iterate-dashboard-template.md** — render suggestions list with handoff hints, plus brief "Why these now" intro grounded in audit findings.

- [ ] **Step 16.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/iterate/
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(iterate): add iterate SKILL + domain-detection + creative-discovery-prompt + dashboard-template references"
```

### Task 17: Create iterate command file

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\commands\iterate.md`

- [ ] **Step 17.1: Write the command file verbatim:**

```markdown
---
description: Discover new AI-feature opportunities for your app. Reads inventory + audit findings + app domain, dispatches a creative-divergent LLM call, returns 3-5 prompts you could add with handoff hints to /vibe-cartographer:scope or /vibe-iterate:feature-add.
---

Invoke the `vibe-prompt:iterate` skill.
```

- [ ] **Step 17.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/iterate.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(iterate): add /vibe-prompt:iterate command"
```

---

## Phase 8 — Bare router + evolve-prompt + friction-triggers extensions

### Task 18: Extend bare router for 7 state branches (add grade + iterate awareness)

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\router\SKILL.md`

- [ ] **Step 18.1: Read v0.2 router SKILL (5 branches).**

- [ ] **Step 18.2: Add 2 new branches** for grade + iterate state:

```markdown
6. **Eval exists, no grade computed yet** → grade pending.
   - Render: eval summary + "Run `/vibe-prompt:grade` to compute composite scores + check vs baseline?"
   - If yes, hand off to grade.

7. **Grade exists, no iterate suggestions yet** → iterate pending.
   - Render: grade summary (composite + flagged regressions) + "Want me to suggest new prompts your app could add? `/vibe-prompt:iterate` is creative discovery — runs one cheap LLM call (~$0.02) and proposes 3-5 ideas."
   - If yes, hand off to iterate.
```

- [ ] **Step 18.3: Update the "all fresh → full posture" branch** to also render composite grade + trend + most recent iterate suggestions.

- [ ] **Step 18.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/router/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(router): extend to 7 state branches (grade + iterate)"
```

### Task 19: Extend evolve-prompt SKILL + friction-triggers for v0.3

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\evolve-prompt\SKILL.md`
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\friction-logger\references\friction-triggers.md`

- [ ] **Step 19.1: Update evolve-prompt SKILL** to mention grade + iterate sessions in its inputs/coverage section.

- [ ] **Step 19.2: Append 6 new sections to friction-triggers.md:**

```markdown
## grade triggers

| Trigger code | Confidence | When |
|---|---|---|
| `weight-override-suggested-and-rejected` | low | Plugin suggested a dimension weight override; user declined. |
| `regression-flagged` | high | A prompt's composite regressed vs baseline. |
| `regression-flagged-and-accepted-as-baseline` | medium | User accepted a regression as the new baseline via `--accept-regression`. Signal that monotonic discipline may be wrong here, OR scoring has calibration issue. |
| `composite-score-flat-after-fix` | medium | User claims to have fixed a prompt finding but composite didn't move. Signal that dimension formula isn't sensitive enough OR fix didn't land. |
| `swap-and-discard-tie-rate-over-30pct` | medium | More than 30% of judge calls discarded as position-bias ties. Tighten judge prompt or change judge model. |

## iterate triggers

| Trigger code | Confidence | When |
|---|---|---|
| `iterate-suggestion-implemented` | high | User actually built a `:iterate` suggestion (verifiable by next `:scan` finding the new prompt). Positive signal — suggestion engine is valuable. |
| `iterate-suggestion-dismissed-as-off-domain` | medium | User flagged a suggestion as wrong for the app. Signal to tighten domain detection. |
```

- [ ] **Step 19.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/evolve-prompt/SKILL.md plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat: extend evolve-prompt + friction-triggers for grade + iterate sessions"
```

---

## Phase 9 — Plugin.json + README + CHANGELOG + run tests

### Task 20: Bump plugin.json + extend description

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json`

- [ ] **Step 20.1: Read current plugin.json.**

- [ ] **Step 20.2: Bump version 0.2.0 → 0.3.0. Update description to mention grade + iterate.**

- [ ] **Step 20.3: Verify JSON parses + commit.**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json" | ConvertFrom-Json
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/plugin.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "chore(plugin): bump to 0.3.0 + extend description for grade + iterate"
```

### Task 21: Update README with grade + iterate

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\README.md`

- [ ] **Step 21.1: Add `:grade` and `:iterate` to the "What it does" section** with one-line descriptions each.

- [ ] **Step 21.2: Add an "Iteration loop" section** explaining the scan → audit → eval → grade → iterate flow.

- [ ] **Step 21.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add README.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "docs(readme): document v0.3 :grade + :iterate commands + iteration loop"
```

### Task 22: Add v0.3.0 CHANGELOG entry + run all tests

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\CHANGELOG.md`

- [ ] **Step 22.1: Add v0.3.0 entry** above v0.2.0 with date 2026-05-29 documenting:
  - New commands: /vibe-prompt:grade, /vibe-prompt:iterate
  - Audit + eval extensions for scoring on 4 dimensions
  - SWRS + Long CoT + Swap-and-Discard + verbosity penalty calibration
  - Monotonic baseline regression tracking
  - 6 new friction triggers
  - Cross-plugin architecture note for vibe-iterate reuse

- [ ] **Step 22.2: Run all 3 test scripts.**

```bash
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/validate-schemas.sh"
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-skill-references.sh"
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-no-keys-in-state.sh"
```

Expected: validate-schemas: 9 pass, 0 fail (6 v0.2 + 3 new). check-skill-references + check-no-keys: clean.

- [ ] **Step 22.3: Commit CHANGELOG.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add CHANGELOG.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "docs(changelog): v0.3.0 entry + run tests"
```

---

## Phase 10 — Validation on Celestia3 (blocked-on-user-environmental)

### Task 23: Round-trip the v0.3 commands against Celestia3

**Files:** (writes to Celestia3 paths under .vibe-prompt/grade/ and .vibe-prompt/iterate/)

- [ ] **Step 23.1: User pre-flight** — Ensure `VIBE_PROMPT_GEMINI_API_KEY` is set (already set during v0.2). Symlink should still point at the Vibe-Prompt solo repo.

- [ ] **Step 23.2: Run `/vibe-prompt:audit`** on Celestia3 — should produce same F1-F7 findings as v0.2 + new scores. Expected: persona-consistency on natal_interpretation lands 2-4/10 due to Pilgrim contradiction.

- [ ] **Step 23.3: Run `/vibe-prompt:eval`** scoped to natal_interpretation — should produce per-dimension scores + Swap-and-Discard summary. Expected: persona-consistency for Gemini output lands 1-3/10.

- [ ] **Step 23.4: Run `/vibe-prompt:grade`** — synthesizes audit + eval scores into per-prompt + app composite. First run establishes baseline. Expected: app composite in 60-75 range.

- [ ] **Step 23.5: Run `/vibe-prompt:iterate`** — should generate 3-5 Celestia3-specific suggestions. Ground-truth list: horary, progressed chart, solar return, composite chart, tarot spreads, remediation rituals. Expected: 3+ overlap with this list.

- [ ] **Step 23.6: Test regression flow** — manually fix the Pilgrim contradiction in Celestia3's natal_interpretation prompt (e.g., remove "Address as Fellow Pilgrim"). Re-run audit + eval + grade. Expected: persona-consistency score advances, baseline advances, status = "improved."

- [ ] **Step 23.7: Test regression detection** — revert the fix, re-run audit + eval + grade. Expected: persona-consistency regresses but baseline does NOT advance backward; regression is flagged with ⚠ in dashboard.

- [ ] **Step 23.8: Commit any SKILL refinements caught during round-trip**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add -A
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix: v0.3 round-trip polish on Celestia3 namespace" --allow-empty
```

---

## Phase 11 — Merge v0.3-migration into main + ship

### Task 24: Merge + tag + push

- [ ] **Step 24.1: Verify clean working tree.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" status
```

- [ ] **Step 24.2: Checkout main, merge.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" checkout main
git -C "C:\Users\estev\Projects\Vibe-Prompt" merge --no-ff v0.3-migration -m "feat: v0.3.0 — add /vibe-prompt:grade + /vibe-prompt:iterate + 4-dim scoring + monotonic baseline"
```

- [ ] **Step 24.3: Tag v0.3.0 + push main + tag.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" tag v0.3.0
git -C "C:\Users\estev\Projects\Vibe-Prompt" push origin main
git -C "C:\Users\estev\Projects\Vibe-Prompt" push origin v0.3.0
```

- [ ] **Step 24.4: Verify tag resolves on GitHub.**

```powershell
gh api repos/estevanhernandez-stack-ed/Vibe-Prompt/git/refs/tags/v0.3.0 --jq '.object.sha'
```

### Task 25: Marketplace ref bump in vibe-plugins

**Files:**
- Modify: `C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json`

- [ ] **Step 25.1: Bump vibe-prompt entry's ref from v0.2.0 → v0.3.0. Update description to mention grade + iterate.**

- [ ] **Step 25.2: Verify JSON + commit + push.**

```powershell
Get-Content "C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json" | ConvertFrom-Json | Out-Null
git -C "C:\Users\estev\Projects\vibe-plugins" add .claude-plugin/marketplace.json
git -C "C:\Users\estev\Projects\vibe-plugins" commit -m "chore(marketplace): bump vibe-prompt v0.2.0 → v0.3.0

Adds /vibe-prompt:grade (synthesis + monotonic baseline regression)
and /vibe-prompt:iterate (creative discovery of new prompts).
4-dimension scoring extends audit + eval. SWRS + Long CoT +
Swap-and-Discard + verbosity penalty calibration on LLM-judge layer.
Validated on Celestia3."
git -C "C:\Users\estev\Projects\vibe-plugins" push origin main
```

---

## Phase 12 — Dashboard log + memory cleanup

### Task 26: Log v0.3.0 ship via MCP + update memory

- [ ] **Step 26.1: Use `mcp__626labs__manage_decisions`** action `log`, projectId `tyWzqAbCAq6Y9UJvoy8t`. Decision text covers: scoring extensions, new commands, calibration patterns landed, regression tracking, iterate cross-plugin architecture note, v0.4+ candidates queued (prompt-injection grading, auto-handoff, app-callable eval endpoint).

- [ ] **Step 26.2: Create `vibe_prompt_v0_3_architecture.md`** in memory dir.

- [ ] **Step 26.3: Update `MEMORY.md` index** with v0.3 pointer + queue v0.4 candidates as future memory entries.

---

## Self-review

Checking the plan against the spec:

**Spec coverage:**
- §1 thread 1 (grading) → Tasks 2, 3 (schemas), 8-13 (audit+eval scoring), 14-15 (:grade command)
- §1 thread 2 (iterate) → Tasks 4 (schema), 16-17 (:iterate command + references)
- §2 out of scope → not built (verified by absence)
- §3 surface table → 7 commands covered across all tasks
- §4 4 dimensions → Tasks 6 (scoring-dimensions.md), 8 (audit rubric extension), 11 (judge prompt)
- §5 calibration patterns → Task 5 (calibration-patterns.md), 7 (swap-and-discard.md), 11 (judge prompt extension), 12 (eval SKILL invokes)
- §6 monotonic baseline → Task 14 (monotonic-baseline.md + grade SKILL)
- §7 iterate output → Tasks 4 (schema), 16 (all references)
- §8 cross-plugin architecture note → captured in spec; not a build artifact
- §9 state paths → schemas in Task 4 + new state dirs in workflow steps
- §10 6 friction triggers → Task 19
- §11 validation plan → Task 23
- §13 v0.4+ roadmap → captured in CHANGELOG (Task 22) + memory (Task 26)

**Placeholder scan:** No "TBD", no "implement later." Every step has exact paths + content blocks.

**Type/name consistency:**
- 4 dimension names (`schemaTightness`, `personaConsistency`, `instructionClarity`, `tokenEfficiency`) consistent across schemas (Tasks 2, 3, 4), references (5, 6, 7), and SKILLs (10, 12, 14)
- State paths `.vibe-prompt/grade/` and `.vibe-prompt/iterate/` consistent
- Env var `VIBE_PROMPT_GEMINI_API_KEY` (no v0.3 rename)
- Schema `$id` values: `vibe-prompt/grade-result`, `vibe-prompt/baseline`, `vibe-prompt/iterate-suggestions` consistent

**Scope:** Plan covers v0.3 only. v0.4+ candidates explicitly deferred and documented.

Plan is internally consistent and spec-complete.
