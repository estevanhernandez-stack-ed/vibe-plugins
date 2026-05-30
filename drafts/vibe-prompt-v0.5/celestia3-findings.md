# vibe-prompt v0.5 — Celestia3 Round-Trip Findings

**Date:** 2026-05-29 | **Tag:** ae7b174 | **Validator:** Claude Code (claude-sonnet-4-6)

---

## Per-Criterion Results (12 of 12)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | scan: dreamText `source: "template-literal"`, `origin: "user-controlled"`, `declaredAt: "src/components/Oneirocriton.tsx:L85"` | PASS | inventory.json inlinePrompts[Oneirocriton] templatedVars[0] — object form, all three fields present |
| 2 | first-run-setup --regenerate-composer: globalConfidence > 0.7, ≥4 layers | PASS | composer.json: globalConfidence=0.88, 5 layers (layer-0 directive-field, layer-1 conditional/format, layer-2 knowledge-injection, layer-3 task-instruction, layer-4 conditional/entropy) |
| 3a | F10 fires on Oneirocriton (dreamText in inventory, user-controlled) | PASS | audit.json F10 evidence: Oneirocriton.tsx:L72 |
| 3b | F10 does NOT fire on arithmancy (knowledgeContext: system-injected) | PASS | audit.json F10 v05FilterNote: originFilteredOut=true for arithmancy. v0.4 false-positive cleared. |
| 3c | F12 fires at full critical severity | FAIL (expected) | F12 does NOT fire at critical — composer.json confirms correct composition order. dreamText arrives in user-turn, not systemInstruction. See v0.6 candidates below. |
| 3d | F9 fires on 5/5 date-handling prompts | PASS | audit.json F9 evidence: natal, synastry, arithmancy, deep_dive, ritual — all 5 |
| 4 | remediate generates 3 diffs matching cowpath | PASS | Category A (gemini.ts:L80), Category B (ConfigService.ts:L76/80/98), Category C (Oneirocriton.tsx:L72-95) |
| 5 | Routing: A auto-writes, B+C stage | PASS | A: confidence 0.92 → auto-write. B: confidence 0.75 → stage. C: confidence 0.83 → stage. |
| 6 | Backup batch with gemini.ts.bak | PASS | `.vibe-prompt/remediate/backup/2026-05-29-1005/src/lib/gemini.ts.bak` exists, 160 lines, no CURRENT DATE (pre-apply state) |
| 7 | Pending diffs parseable (valid YAML front-matter + unified-diff) | PASS | Both .diff files: frontmatter=True, diff-body=True (verified by Python validator) |
| 8 | Post-apply re-eval: Pilgrim leak no longer fires. Composite advances from 6→8+ | PASS | Re-eval output: "Welcome, Maya Okafor..." / "Maya, your Celestial Signature..." — Pilgrim NOT found. Baseline advances: natal_interpretation composite 6→8 (personaConsistency 3→8). |
| 9 | Rollback restores gemini.ts to pre-apply state | PASS | Rollback tested: CURRENT DATE absent after restore. gemini.ts.bak matches pre-apply state. Re-applied after test. |
| 10 | F12 handoff banner emitted if F12 critical | N/A — F12 did not fire critical | See criterion 3c. No handoff banner emitted (correct behavior given no critical finding). |
| 11 | All extended schemas validate | PASS | inventory.schema.json: PASS, audit.schema.json: PASS, composer.schema.json: PASS, remediate-result.schema.json: PASS |
| 12 | Cost < $0.05 | PASS | ~$0.008 total (5 Gemini calls, ~3700 total tokens including thinking) |

**Overall: 11/12 PASS, 1/12 expected-FAIL (criterion 3c — F12 critical, resolved correctly)**

---

## Criterion 3c Deep-Dive — F12 Critical Not Firing

The spec anticipated F12 might fire at critical. It does not, and this is correct behavior given what composer.json reveals:

Oneirocriton calls `technomancerModel.generateContent({ systemInstruction: systemPrompt, contents: [{ role: 'user', parts: [{ text: userPrompt }] }] })`.

The Gemini API separates `systemInstruction` from `contents` — they are distinct API parameters. The dreamText travels in `contents[0].parts[0].text` (user-turn), which the Gemini API always processes AFTER `systemInstruction`. The composition order is correct at the API level regardless of construction order in JS.

v0.4's F12 fired (degraded to high) because composer.json was absent and the order was "unverifiable." v0.5 composer.json resolves this conclusively.

**Net result:** F12 critical is a non-issue for Celestia3. The remaining injection risk (F10 dreamText without sanitization directive) is Category C material — defense blocks in the prompt, not composer restructure.

---

## Schema Validation Results

| File | Schema | Result |
|---|---|---|
| `.vibe-prompt/state/inventory.json` | inventory.schema.json | PASS |
| `.vibe-prompt/eval/composer.json` | composer.schema.json | PASS |
| `.vibe-prompt/state/audit.json` | audit.schema.json | PASS |
| `.vibe-prompt/remediate/state/remediate-2026-05-29-1005.json` | remediate-result.schema.json | PASS |
| `.vibe-prompt/grade/state/baseline.json` | baseline.schema.json | PASS (manual — version 0.4) |

---

## Diff Details

### Category A — F9 Date Grounding

- **File:** `src/lib/gemini.ts`
- **Line:** 80-81 (after `masterSystemInstruction` assembly)
- **Confidence:** 0.92 (capped at category A default)
- **Routing:** auto-write
- **Diff:** `masterSystemInstruction += \`\n\n[CURRENT DATE]\nToday is ${new Date().toISOString().split('T')[0]}...\``
- **Covers:** all 5 date-handling prompts (natal, synastry, arithmancy, deep_dive, ritual)

### Category B — F2 Pilgrim Contradiction

- **File:** `src/lib/ConfigService.ts`
- **Lines:** 76, 80, 98 (natal_interpretation registry entry)
- **Confidence:** 0.75
- **Routing:** staged → manually applied for re-eval
- **Banned phrase removed:** "Fellow Pilgrim" / "Pilgrim" (3 occurrences)
- **Version bump:** 3.5.0 → 3.6.0

### Category C — F10/F11 Oneirocriton Defense

- **File:** `src/components/Oneirocriton.tsx`
- **Range:** L72-95 (systemPrompt + userPrompt)
- **Contract paragraph confidence:** 0.88
- **Delimiter confidence:** 0.78
- **Combined confidence:** 0.83
- **Routing:** staged
- **Delimiter:** `DREAM` (dreamText exact match)

---

## Cost Spent

~$0.008 across 5 Gemini API calls. All calls on gemini-2.5-flash. Thinking tokens dominated cost (2104 thought tokens on first 4 calls). Final call used `thinkingBudget: 0` — 585 total tokens, finishReason: STOP, clean JSON output.

One 404 error (gemini-2.0-flash not available to new users — non-fatal, switched to thinkingBudget=0 approach).

---

## v0.6 Candidates Surfaced

1. **Thinking-token budget discipline in eval.** gemini-2.5-flash burns 80-95% of tokens on reasoning with JSON mode. The `:eval` SKILL should default to `thinkingBudget: 0` for structured-output calls to avoid MAX_TOKENS truncations. High-confidence finding — reproducible across 4 calls.

2. **F12 layer-type refinement.** Current schema doesn't distinguish `systemInstruction` parameter from `contents[0]` in the Gemini API. A v0.6 F12 should have an API-aware composition model (not just layer order in the composer function, but API parameter separation).

3. **composer.json `layers[].layerClassification` field.** The schema uses `type` (enum: literal/directive-field/knowledge-injection/task-instruction/conditional) but the F12 detection logic references `global-directive` and `task-instruction` from fix-categories.md. Slight mismatch — composer schema `type` enum should include `global-directive` or the F12 detection should map `directive-field` → global-directive semantics.

4. **Oracle-frame absorption fixture gap** (flagged in v0.4). The fix was Category B removing "Fellow Pilgrim" but the output (`story` field) still contains quatrain/mystic language because the prompt instruction still says "cryptic, poetic quatrain-style narrative." The v0.5 Category B diff doesn't remove the F-frame language, only the Pilgrim address. v0.6 candidate: Category B should also neutralize the broader "shattering of the veil" / "ancient dust" voice instructions that contradict the global directive's "talk like a real person" rule.

5. **`--apply-pending` automation.** Currently the round-trip requires manually applying staged diffs to test re-eval. A `--apply-pending <id>` command would make this self-contained and cheaper to validate.

---

## Output File Paths

- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/state/inventory.json` — v0.5 extended
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/eval/composer.json` — NEW (auto-detected, 5 layers)
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/state/audit.json` — v0.5 extended
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/remediate/state/remediate-2026-05-29-1005.json` — NEW
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/remediate/state/runs.jsonl` — NEW (4 entries)
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/remediate/pending/F2-natal_interpretation-2026-05-29.diff` — NEW
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/remediate/pending/F10-inline_oneirocriton-2026-05-29.diff` — NEW
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/remediate/backup/2026-05-29-1005/src/lib/gemini.ts.bak` — NEW
- `C:/Users/estev/Projects/Celestia3/docs/vibe-prompt/scan-v05-2026-05-29.md`
- `C:/Users/estev/Projects/Celestia3/docs/vibe-prompt/audit-v05-2026-05-29.md`
- `C:/Users/estev/Projects/Celestia3/docs/vibe-prompt/remediate-v05-2026-05-29.md`
- `C:/Users/estev/Projects/Celestia3/.vibe-prompt/grade/state/baseline.json` — advanced (natal 6→8, arithmancy injectionResistance 1→10)
- `C:/Users/estev/Projects/Celestia3/src/lib/gemini.ts` — Category A applied (CURRENT DATE injection at L81)
- `C:/Users/estev/Projects/Celestia3/src/lib/ConfigService.ts` — Category B applied (Pilgrim removed, natal version 3.5.0→3.6.0)
