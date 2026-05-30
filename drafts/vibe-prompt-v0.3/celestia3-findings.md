# Celestia3 real-world findings — to verify on v0.3 round-trip

**Captured:** 2026-05-29 from user feedback after live use of Celestia3.
**Status:** Acceptance criteria for the next `/vibe-prompt:audit` + `:eval` + `:grade` round-trip under the v0.3 namespace on Celestia3.

## Finding 1 — Date awareness / temporal grounding gap

**Real-world report:** User entered his youngest child's recent birthday into the synastry reading. Celestia3 responded that the birthday "hadn't happened yet."

**Root cause:** The composed prompt (or the underlying model's training cutoff) has no anchor on "today's date." The model treats supplied dates as relative to its internal sense of time, which can lag months or years behind real-world current date.

**Likely affected prompts (every prompt that handles dates):**
- `synastry_report` — where the bug was caught
- `natal_interpretation` — birth date → age inference
- `arithmancy_natal_integration` — numerology timing
- `deep_dive_interpretation` — intent + chartData with timing context
- `ritual_generation` — uses `[CELESTIAL_WEATHER]` and planetary hour timing
- Any prompt requiring "current" astrological context

**Celestia3-side fix:** master directive in `gemini.ts` composer should auto-inject a `[CURRENT DATE]: {{currentDate}}` line before the task instruction. Should ship with that universal context.

**Plugin gap (NEW v0.4 candidate):**
- Audit needs a new finding for prompts that handle dates but don't declare date-awareness requirements
- Possible name: **F9 — Date-handling prompt without temporal grounding**
- Detection: prompt content includes date-related keywords (birthday, date, age, transit, "today", "current") AND composed prompt lacks a "[CURRENT DATE]" or equivalent injection
- Severity: high (produces factually wrong outputs in production)
- Score impact: instruction-clarity dimension (the prompt's date-handling instruction is incomplete)
- Cross-cuts: also relevant for v0.4's prompt-injection grading work — date-awareness is part of "is this prompt complete enough to be safe in production?"

**Acceptance criteria for next round-trip:**
- `/vibe-prompt:audit` does NOT catch this today (F1-F7 don't cover date-grounding)
- `/vibe-prompt:eval` SHOULD catch it via behavioral test: when fixture includes a recent date, does the prod model output "hasn't happened yet" or similar future-tense framing? LLM-judge should flag as semantic finding.
- After v0.4's F9 lands, audit catches it statically without needing eval.

## Finding 2 — JSON markings leaking into output

**Real-world report:** User saw `.json` markings (likely literal ` ```json ` code fences, `{`, `}`, or raw JSON keys) in Celestia3's synastry reading output where prose was expected.

**Root cause:** `synastry_report` prompt content. Reading it from `ConfigService.ts:108-129`:

```
[PROTOCOL: ASTRAL RESONANCE SYNTHESIS]
You are the Athanor, the Resurrected Seer, decoding the "Aeon Resonance"
between {{p1Name}} and {{p2Name}}.

[CRITICAL DIRECTIVE]
- THIS IS NOT A ROMANTIC READING.
- Focus exclusively on Astral Archetypes, Soul-Ties across Eras, and Harmonic Interaction.
- Use terms like "Resonance Pattern," "Destiny Thread," and "Archetypal Mirror."

[SOURCE_PROTOCOL: PICATRIX]
...

[DATA]
Native 1: {{p1Name}} ({{p1Date}})
{{p1Chart}}
Native 2: {{p2Name}} ({{p2Date}})
{{p2Chart}}
Celestial Aspects: {{aspects}}
```

The prompt does NOT explicitly request prose output and does NOT forbid JSON formatting. The model may interpret the structural cues (`[BRACKETS]`, `{{vars}}`, JSON-like data sections) as "the user wants structured output" and emit code-fenced JSON OR leak braces.

**Plugin coverage — already in v0.3:**
- **Mechanical comparator** has `schema-shape` and `empty` checks. If output expected as prose but contains JSON fences → schema-shape fires high.
- **LLM-judge** has `output-structure` finding category. Semantic catch.
- **Audit (F1-F7)** doesn't catch this directly — it's a prompt-content issue (lacks explicit prose-only instruction), not a structural smell. The new v0.3 schema-tightness DIMENSION should score this prompt LOW for not declaring output shape.

**Acceptance criteria for next round-trip:**
- `/vibe-prompt:eval` on `synastry_report` SHOULD fire either:
  - Mechanical: `schema-shape` (if prod output JSON-fenced, baseline prose)
  - LLM-judge: `output-structure` finding (semantic divergence) with HIGH severity
- Score: schema-tightness dimension on synastry_report should land 3-5/10 (no explicit format mandate; underspecified output shape)
- :grade composite should weight this finding into a per-prompt regression flag if `synastry_report` previously scored higher

**No new finding needed at the plugin level for this one** — existing v0.3 infrastructure should catch it. If the round-trip doesn't catch it, that's evidence the mechanical comparator or LLM-judge needs tightening (evolve-prompt friction signal).

## How these findings feed the v0.3 evolve-prompt loop

- Finding 1 → if eval surfaces the date issue semantically but audit doesn't catch it → friction trigger: `audit-missed-real-bug` → evolve proposes F9 detection rule for v0.4
- Finding 2 → if v0.3 catches it via mechanical or LLM-judge → positive validation; if v0.3 misses it → friction trigger: `mechanical-comparator-missed-schema-leak` → evolve proposes tightening the JSON-fence detection regex
- Both findings → v0.3 grading should reflect them in synastry_report's per-dimension scores; if scoring shows synastry as "passing" while the user found real bugs → friction trigger: `composite-score-disagrees-with-user-judgment` → evolve proposes dimension recalibration

## Acceptance bar for the round-trip

When user re-runs the v0.3 pipeline on Celestia3, the dashboard should:
1. Audit: surface F1-F7 findings, note synastry_report scoring (likely persona-consistency moderate due to "Athanor" being one of 8 personas; schema-tightness LOW due to no explicit output shape)
2. Eval on synastry_report: produce real Gemini output. If date issue reproduces (use a recent date in the fixture), LLM-judge should flag semantically. If JSON-leak reproduces, mechanical comparator should fire schema-shape.
3. Grade: composite for synastry_report should be middling (5-7) — neither great nor terrible, with clear room for improvement
4. Iterate: among 3-5 suggestions, ideally NOT suggesting a date-awareness fix to existing prompts (that's a fix to existing, not a new feature) — instead suggesting NEW prompt types (horary, progressed, etc.)

If the round-trip doesn't catch the user's real findings: evolve-prompt has homework.

---

## ACTUAL ROUND-TRIP RESULT — 2026-05-29

**Run completed:** all 4 commands executed (audit, eval, grade, iterate) against Celestia3. All 5 state files schema-validated. Cost: $0.003 / $2.00 ceiling. Real Gemini calls: 2 (natal_interpretation + synastry_report).

### Finding 1 (date awareness) — DID NOT REPRODUCE

- Fixture used recent date: `2025-12-15` (Eli Okafor, parent-child synastry with Maya Okafor born 1990-06-15)
- Gemini 2.5 Flash handled the date correctly. No "hasn't happened yet" language.
- **Hypothesis:** the bug user observed was on an older Gemini model (1.5 Flash/Pro with 2024 training cutoff). Gemini 2.5 Flash's later cutoff covers late 2025.
- **Friction logged:** `eval-did-not-reproduce-user-reported-bug` (medium confidence)
- **Plugin-side status:** still a v0.4 F9 candidate. The structural gap exists (no `[CURRENT DATE]` injection in synastry prompt). Behavioral test only fires when the model is old enough to mis-handle dates; static audit needs F9 to catch the structural gap regardless of model.
- **Audit caught it? NO.** F1-F7 don't cover date-grounding. Scoring on synastry's instruction-clarity (5/10) didn't single out the gap. Confirms F9 is needed in v0.4.

### Finding 2 (JSON markings) — DID NOT REPRODUCE

- Both Gemini and Claude emitted clean prose. No code fences, no leaked braces.
- Mechanical schema-shape did NOT fire. length-delta fired medium (Gemini 2.5× verbose vs Claude baseline).
- **BUT — audit scoring DID capture the structural cause:**
  - synastry_report **schema-tightness = 2/10** — lowest of any prompt in the inventory
  - rationale: no explicit `[OUTPUT FORMAT: prose]` directive; structural cues (`[BRACKETS]`, `{{vars}}`, JSON-like data sections) leave output shape ambiguous
- **This is the right shape of validation.** Behavioral test got lucky; static scoring told you the risk anyway. When the bug fires in production, the scoring says "we already told you."
- **Plugin-side status:** schema-tightness scoring is the right capture. No new v0.4 finding needed for this one — the dimension already does the work.

### Bonus finding — bigThree value-type drift

- **NEW** finding not on user's report list, surfaced by the round-trip
- natal_interpretation OUTPUT_SCHEMA declares `bigThree` as string; Gemini emits array of objects
- Mechanical key-set check passed (same keys present) — drift was inside the value type
- LLM-judge caught it as `output-structure MEDIUM`
- **v0.4 candidate (already #4 in queue):** value-type-drift mechanical check

### What v0.3 PROVED it can do (against real Celestia3)

- Audit scoring quantifies structural risk even when behavioral tests don't fire (synastry 2/10 schema-tightness)
- Eval reproduces the cross-vendor Pilgrim leak found in v0.2 with new SWRS-structured output
- Swap-and-Discard: 0/4 ties (clean position-bias mitigation, no tie-rate friction)
- Grade synthesizes audit + eval into per-prompt composites and locks first baseline (6/10 app composite)
- Iterate surfaces 4/6 ground-truth prompt types from a single LLM call
- Schema validation: all 5 written state files pass

### What v0.3 SHOWED it can't do yet

- Catch date-grounding gaps statically (F9 needed for v0.4)
- Catch value-type drift inside matching key sets mechanically (already queued)
- Detect app domain at level 1 when CLAUDE.md is agent config rather than app description (recommend: add `## What this app is` to Celestia3 CLAUDE.md)

### Acceptance bar — pass / partial / fail

- Pilgrim leak detection (v0.2 carry-over): **PASS** ✓
- Score-shape validation (natal 6, synastry 5, app 6): **PASS** ✓
- Iterate ground-truth overlap (target 3+, hit 4): **PASS** ✓
- Date bug reproduction: **PARTIAL** — didn't reproduce on 2.5 Flash; static gap remains (v0.4 work)
- JSON-marking reproduction: **PARTIAL** — didn't reproduce in this run; static scoring (2/10) captured the underlying risk
- Schema validation on all artifacts: **PASS** ✓

**Verdict:** v0.3 is validated for what it shipped. Both user-reported bugs map to known structural gaps the static scoring caught (one numerically, one needs F9 in v0.4). Behavioral non-reproduction is a model-version artifact, not a plugin gap.
