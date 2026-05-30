# Vibe-Prompt v0.3 — design spec

**Status:** Drafted 2026-05-29. Builds on v0.2.0 (shipped same day). Existing v0.1+v0.2 specs at `drafts/vibe-prompt/spec.md` and `drafts/vibe-prompt-v0.2/spec.md` cover the underlying static-audit + behavioral-eval design — this spec is additive and assumes that context.
**Repo target:** Same `Vibe-Prompt` solo repo. Marketplace ref bumps from `v0.2.0` to `v0.3.0`.
**Tagline (extension):** "Audit, organize, classify, behaviorally test, AND grade the LLM prompts shipped in your app — with regression tracking and AI-feature discovery."

## 1. What v0.3 adds

Two threads:

**Thread 1 — grading.** Today the plugin produces severity-tagged findings (high/medium/low) but no scores. v0.3 turns findings into scores per dimension, composes those into per-prompt and per-app composite grades, and tracks regression across runs against a monotonic baseline. New `:grade` step-command + scoring extensions to `:audit` and `:eval`.

**Thread 2 — AI-feature discovery.** Given the app's domain + existing prompt inventory, the plugin proposes new prompts the app could add. New `:iterate` step-command. The "creative discovery from inventory + domain signals" pattern is designed to be reusable in vibe-iterate (cross-plugin architecture target for v0.4+).

## 2. Out of scope (v0.3)

- Multi-judge ensembles for grading (defer to v0.4+ if evaluator-drift findings warrant)
- Self-recognition fine-tuning (out of scope architecturally — we don't fine-tune models)
- Agent-evaluation dimensions (Goal Completion Rate, Proactivity Effectiveness, dialogue coherence) — vibe-prompt's workload is structured-output prompts, not agentic dialogue
- Hallucination detection (would need fact-checkers — v0.4+)
- Safety/PII grading (different concern — vibe-sec composes here)
- Direct integration with vibe-cartographer:scope (handoff hints only — user invokes the next plugin themselves)

## 3. v0.3 command surface

| Command | Change | Concern |
|---|---|---|
| `/vibe-prompt:scan` | Unchanged | Inventory |
| `/vibe-prompt:audit` | Extended — fires F1-F7 findings AND scores each on the 4 dimensions; emits `audit.json` with `scores` field added per finding + composite `auditGrade` per prompt | Static smells + static grading |
| `/vibe-prompt:eval` | Extended — LLM-judge uses Anthropic SWRS pattern + Long CoT + Swap-and-Discard; emits per-output scores on the 4 dimensions in `run-result.json` + composite `evalGrade` per (prompt, model) | Behavioral drift + behavioral grading |
| `/vibe-prompt:grade` | **NEW** — synthesizes `audit.json` + latest `eval/state/run-*.json` into per-prompt + per-app composite grades, computes regression vs monotonic baseline, writes `grade.json` + `docs/vibe-prompt/grade-YYYY-MM-DD.md` | Synthesis + regression |
| `/vibe-prompt:iterate` | **NEW** — reads inventory + app-domain signals, dispatches creative-divergent LLM call, emits 3-5 new prompt suggestions with handoff hints to other family plugins | AI-feature discovery |
| `/vibe-prompt:radar` | Unchanged | Model news |
| `/vibe-prompt` (bare) | Extended — router posture surfaces composite grades, regression deltas, and pending `:iterate` suggestions | State-aware routing |
| `/vibe-prompt:evolve-prompt` | Extended — covers `:grade` and `:iterate` session reflection too | L3 self-evolution |

Internal SKILLs (session-logger, friction-logger, guide) unchanged but extended to cover the new commands' lifecycle.

## 4. The four scoring dimensions

Each dimension scores 1-10. Code-level applies during `:audit` (static analysis of the prompt source). Agent-level applies during `:eval` (LLM-judge reads the actual model output).

| # | Dimension | Code-level (static, in `:audit`) | Agent-level (behavioral, in `:eval`) |
|---|---|---|---|
| 1 | **Schema tightness** | Does prompt declare an output schema? Required keys explicit? `templatedVars` complete (no orphan `{{x}}` references)? Penalize loose schemas. | Does the model's actual output conform? Required keys present, value types match, no extra keys leaking? |
| 2 | **Persona consistency** | Does prompt's declared voice/persona match the global directive? F2 finding becomes a numeric score: full violation = 1-3, partial = 4-6, no contradiction = 7-10. | Does the output honor the master directive (no prohibited language like "Pilgrim")? Quantifies what the existing evaluator-drift footer already flags. |
| 3 | **Instruction clarity** | Are instructions specific, unambiguous, free of unfilled placeholders? Use a meta-prompt that scores clarity. | Did the model follow the instruction correctly? Did it answer the actual question? |
| 4 | **Token efficiency** | Is the prompt unnecessarily verbose? Penalize bloat. Reward concision that doesn't lose specificity. | Does the output stay within reasonable length? Penalize verbosity-bias (per Spheron 2026 from the research brief — output padding to game evaluators). |

**Composite formula (per prompt):** weighted average, default equal weights (0.25 each). User can override per-app via `.vibe-prompt/grade/weights.json`. **Agent proactively suggests overrides** when it detects a dimension is brand-load-bearing for the app — e.g., *"Persona consistency carries 60% of your brand voice in Celestia3 — want to weight it 2× the others?"*

**Composite per app:** average of per-prompt composites across inventory.

## 5. Calibration patterns (LLM-judge layer)

Applied in both the `:eval` LLM-judge (drift detection + behavioral scoring) and `:audit`'s clarity-scoring meta-prompt. All four together; not negotiable.

| Pattern | What it does | Source |
|---|---|---|
| **SWRS structure** | Judge returns JSON with `strengths` (array), `weaknesses` (array), `reasoning` (prose), `score` (1-10). Reasoning before verdict prevents middling-6 default. | Anthropic training notes |
| **Long CoT before verdict** | Judge prompt explicitly asks for step-by-step reasoning before the score. Reduces self-preference bias measurably. | Research brief (Chen et al. 2025 framing; verified pattern) |
| **Swap-and-Discard** | For drift-detection runs, evaluate prod-vs-baseline twice — once with prod as Output A, once with prod as Output B. If the judge favors position 1 both times, discard the comparison as a position-bias tie. | Research brief; well-documented LLM-judge calibration |
| **Verbosity penalty** | Judge rubric explicitly instructs: *"Penalize unnecessary elaboration. Quality is not length."* Prevents verbosity-bias inflation. | Anthropic + research brief; standard practice |
| **Lineage-overlap warning** | Already covered by the existing cross-vendor evaluator-drift footer in v0.2 — every judge finding cites the evaluator's identity so the user calibrates accordingly. | Carried forward from v0.2 |

**Cost impact:** Swap-and-Discard doubles judge calls per (prompt, model) pair in `:eval`. Cost gate (default $2.00 ceiling) absorbs this. Long CoT adds ~20-40% token cost per judge call. User can opt out of Swap-and-Discard via `--no-swap` flag for cost-sensitive runs (default: on).

## 6. Regression tracking (monotonic baseline)

The baseline is **"best score so far,"** not "most recent run." This matters for product discipline.

**Model:**
- First `:grade` run establishes baseline at the computed composite.
- Subsequent runs compare composite vs baseline:
  - **Improvement** (current > baseline): baseline advances to current; surface "+X improvement, new baseline."
  - **Regression** (current < baseline): baseline does NOT change; surface "⚠ regression of -X from baseline, investigate before accepting."
  - **No change** (current = baseline): stable.

**State shape (`.vibe-prompt/grade/state/baseline.json`):**

```json
{
  "version": "0.3",
  "establishedAt": "2026-05-29T...",
  "lastAdvancedAt": "2026-06-10T...",
  "perPromptBaseline": {
    "natal_interpretation": {
      "composite": 87,
      "dimensions": {
        "schemaTightness": 8,
        "personaConsistency": 9,
        "instructionClarity": 8,
        "tokenEfficiency": 9
      },
      "establishedInRunId": "run-2026-06-10-1430"
    }
  },
  "appComposite": 78,
  "appCompositeAdvancedAt": "2026-06-10T..."
}
```

**Per-run grade output (`.vibe-prompt/grade/state/grade-<runId>.json`):**
- Per-prompt scores
- Per-prompt deltas vs baseline (positive = improvement, negative = regression)
- App composite + delta
- Flagged regressions (high-severity findings)

**Dashboard rendering** (`docs/vibe-prompt/grade-YYYY-MM-DD.md`):
- Headline: composite + baseline + delta with arrow
- Per-prompt table with trend arrows
- Regression alerts at top with specific dimension callouts
- Recommended next moves

## 7. `:iterate` — discovery shape

**Domain detection cascade** (tightened per user direction):

1. **CLAUDE.md** at app root — highest signal. If found, read; verify with user via one-line confirm: *"I read your CLAUDE.md — your app is [domain summary]. Look right?"* Cache result; proceed.
2. **If CLAUDE.md missing OR user pushes back on the read** — fall back to:
   - `package.json` description + `name` + dependencies (vendor signals like `@google/genai` → AI app)
   - `README.md` if present
   - Other vibe-tool artifacts: `docs/architecture/`, `docs/scope.md` (Cart), `docs/walk/` (Walk), `.vibe-iterate/atlas.jsonl` (Iterate), `.vibe-sec/state/` (Sec) — the family leaves a domain trail
   - The prompts themselves — their subject matter is often the strongest domain signal
3. **Last resort** — short interview: *"Couldn't pin down your app's domain. What's it about in 2-3 sentences?"*

**Caching:** captured domain at `.vibe-prompt/iterate/domain.json`. Next `:iterate` run reads cache; user can invalidate with `--refresh-domain` flag.

**Output shape per suggestion** (3-5 per run, stored in `.vibe-prompt/iterate/state/suggestions-<runId>.json` + rendered in dashboard):

```json
{
  "name": "horary_consultation",
  "purpose": "Question-based astrological reading for specific timing decisions",
  "targetPersona": "Athanor — extend existing voice, no new persona needed",
  "exampleOutputShape": "{ \"chart\": \"...\", \"interpretation\": \"...\", \"timing\": \"...\" }",
  "whyValuable": "Existing prompts cover natal + synastry + ritual but not question-based astrology. Horary is a classical Hermetic technique aligned with Picatrix lineage already in your knowledge base. Fits brand.",
  "handoffHint": "Drop this into /vibe-cartographer:scope OR /vibe-iterate:feature-add to build out the implementation."
}
```

**LLM-judge prompt for `:iterate`:** distinct from `:eval`'s drift judge — uses higher temperature (0.9 vs 0.3), creative-divergent framing, reads domain + inventory + audit findings (so suggestions account for current gaps).

**Cost:** one LLM call per `:iterate` run (single creative-divergent call, NOT per-prompt). Cheap (~$0.01-0.03).

## 8. Cross-plugin architecture note (vibe-iterate target)

The `:iterate` command implements a reusable pattern: **"creative discovery from inventory + domain signals."** Documented for explicit reuse:

- **vibe-prompt v0.3:** inventories = the prompt registry; domain signals = CLAUDE.md + other vibe-tool artifacts; output = new prompts to add
- **vibe-iterate vNEXT (v1.3+ probably):** inventories = the feature registry (Atlas); domain signals = same; output = new AI features to add

The shared shape: `(inventory, domain) → LLM creative-divergent call → structured suggestion JSON with name/purpose/shape/whyValuable/handoffHint`. Spec'd here so vibe-iterate's future `:feature-add-ai` (working name) can lift the architecture without re-deriving.

## 9. State paths + file shapes (additions to v0.2)

| Path | Owner | Purpose |
|---|---|---|
| `.vibe-prompt/grade/state/baseline.json` | `:grade` | Monotonic baseline tracker per prompt + per app |
| `.vibe-prompt/grade/state/grade-<runId>.json` | `:grade` | Per-run grade computation with deltas |
| `.vibe-prompt/grade/weights.json` | user (optional) | Override dimension weights per app |
| `.vibe-prompt/iterate/domain.json` | `:iterate` | Cached app-domain capture (CLAUDE.md summary + cascade result) |
| `.vibe-prompt/iterate/state/suggestions-<runId>.json` | `:iterate` | 3-5 suggestions per run |
| `docs/vibe-prompt/grade-YYYY-MM-DD.md` | `:grade` | Human-readable dashboard with trend rendering |
| `docs/vibe-prompt/iterate-YYYY-MM-DD.md` | `:iterate` | Human-readable suggestion dashboard with handoff hints |

Existing v0.2 paths (`.vibe-prompt/state/inventory.json`, `audit.json`, `eval/state/`, `docs/vibe-prompt/eval-*.md`) unchanged.

## 10. Self-evolution hooks (extension)

`evolve-prompt` reads sessions + friction across all six commands (scan, audit, eval, radar, grade, iterate). New friction triggers added:

| Trigger | Confidence | When |
|---|---|---|
| `weight-override-suggested-and-rejected` | low | Plugin suggested a dimension weight override; user declined. Signal to re-tune the suggestion heuristic. |
| `regression-flagged-and-accepted-as-baseline` | medium | User accepted a regression as the new baseline (overriding monotonic discipline). Signal that the baseline shouldn't actually be monotonic for this dimension, OR that the scoring has a calibration issue. |
| `iterate-suggestion-implemented` | high | User actually built a `:iterate` suggestion (verifiable by next `:scan` finding the new prompt in inventory). Positive signal — these suggestions are valuable. |
| `iterate-suggestion-dismissed-as-off-domain` | medium | User flagged a suggestion as wrong for the app. Signal to tighten domain detection. |
| `swap-and-discard-tie-rate-over-30pct` | medium | More than 30% of judge calls discarded as position-bias ties. Signal to tighten judge prompt OR re-evaluate the model used as judge. |
| `composite-score-flat-after-fix` | medium | User claims to have fixed a prompt finding but composite score didn't move. Signal that the dimension formula isn't sensitive enough, OR the fix didn't land. |

## 11. Validation plan (re-cowpath on Celestia3)

Same cowpath approach that worked for v0.1+v0.2:

1. **Re-run `:audit` against Celestia3** — should produce same F1-F7 findings as v0.2 PLUS scores. Expect persona-consistency score for `natal_interpretation` to land 2-4/10 (the Pilgrim contradiction drags it heavily).
2. **Re-run `:eval` on natal_interpretation** — same Pilgrim leak as v0.2 round-trip, but now Gemini output gets a behavioral persona-consistency score (likely 1-3/10) with SWRS reasoning. Swap-and-Discard should not tie (semantic divergence is clear).
3. **Run `:grade`** — synthesizes audit + eval scores into per-prompt + app composite. First run establishes baseline. Expect Celestia3's app composite to land in the 60-75 range (good infrastructure, real findings drag it down).
4. **Run `:iterate`** — should generate 3-5 Celestia3-specific suggestions. Manual ground truth list: horary astrology, progressed chart interpretation, solar return forecast, composite chart for relationships, tarot spread interpretation, astrological remediation rituals. If plugin generates 3+ overlap with this list (without seeing it), domain detection is working.
5. **Apply F2 fix to Celestia3** (remove "Pilgrim" from natal_interpretation OR remove prohibition from master directive) — re-run `:eval` + `:grade`. Expect persona-consistency score for that prompt to advance significantly. Baseline advances. Verifies regression tracking + monotonic baseline logic.

Validation passes when:
- All 4 dimensions score (no nulls)
- SWRS structure validates against schema in every eval-judge response
- Swap-and-Discard runs without errors; tie-rate logged
- Monotonic baseline advances ONLY when scores improve; flags regressions correctly
- `:iterate` generates suggestions in valid schema with `whyValuable` grounded in Celestia3's domain

## 12. Versioning + tag

- Tag scheme: plain `vX.Y.Z` (matches v0.1, v0.2)
- First stable: `v0.3.0`
- Backward compat: v0.2 commands' output shape gains additional JSON fields (additive); dashboards add sections. Not strictly breaking; CHANGELOG calls out the additions explicitly.
- Users with `VIBE_PROMPT_GEMINI_API_KEY` from v0.2 carry forward unchanged.

## 13. Future scope (v0.4+ candidates)

Carried forward + new from v0.3 design:

- **Multi-judge ensembles** for high-stakes evaluations (Gemini + Claude both judge; consensus scoring)
- **Self-recognition / SGTR** detection (if evidence emerges that judge bias is meaningfully degrading findings)
- **App-callable eval endpoint pattern** (Celestia3 exposes `/api/dev/eval-proxy` for production-fidelity testing) — design at `drafts/vibe-eval/v0.2-app-endpoint-architecture.md`
- **value-type-drift mechanical check** (would have caught bigThree array vs string mechanically rather than via LLM-judge)
- **Knowledge-injection capture during first-run-setup** (current composer-mimic uses placeholder text)
- **vibe-iterate cross-pollination** — lift the `:iterate` architecture into vibe-iterate as `:feature-add-ai` (working name)
- **Outbound cross-plugin handoffs** — `:iterate` could optionally auto-invoke `/vibe-cartographer:scope` with a suggestion pre-populated (`--auto-scope` flag), OR auto-invoke `/vibe-iterate:feature-add` for shipped-product additions. v0.3 ships handoff-hints-only; auto-handoff is the natural v0.4+ extension once we see what makes it useful in practice.
- **Prompt-injection vulnerability grading (new family-composition gap).** vibe-sec audits the app holistically (secrets, deps, supply-chain, config, OWASP survey, etc.) but doesn't have LLM-specific prompt-level security concerns. Output-side PII detection still belongs to vibe-sec, but the prompt-content security surface — injection vulnerability, role-manipulation defense, jailbreak resistance — falls through the cracks today. Natural v0.4+ extension to vibe-prompt as a new finding category (potential F8: *Prompt lacks injection defense* — does user input get escaped, validated, or positionally separated from system instructions?) and a fifth scoring dimension (*injection resistance*). Composes with vibe-sec rather than competing: vibe-sec handles app-level security posture, vibe-prompt handles prompt-content security. Worth cowpathing on Celestia3 first to see what real defenses look like (e.g., does Celestia3's `gemini.ts` composer escape user-provided dream text in `Oneirocriton.tsx` before stacking it onto system instructions?).
- **Hallucination detection via fact-checkers** (would need external knowledge base)
- **OS keychain integration for API keys**
- **CI/cron context support** for autonomous `:grade` + regression alerts
- **Per-vendor judge tuning** — if Claude-as-judge consistently over-rates Claude-baseline outputs, calibrate by vendor

## 14. Open questions resolved during brainstorm (defaults applied)

1. **Composite scoring formula:** weighted average, equal default weights, user-overridable per-app, **agent proactively suggests overrides** when a dimension appears brand-load-bearing.
2. **Domain detection:** CLAUDE.md first → verify with user → fall back to vibe-tool artifacts + prompts themselves → interview only as last resort. Cache result at `.vibe-prompt/iterate/domain.json` for reuse.
3. **Regression baseline:** **monotonic** — baseline = "best score so far." Improvements advance; regressions are flagged but don't reset the bar. Tracks "best honest state ever achieved."
