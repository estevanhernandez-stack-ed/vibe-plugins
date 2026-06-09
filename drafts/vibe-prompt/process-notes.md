# Vibe-Prompt — cowpath process-notes

**Date:** 2026-05-28
**Target app:** Celestia3 (`C:\Users\estev\Projects\Celestia3`)
**Goal:** Pave the cowpath. Audit Celestia3's prompts by hand, narrate every decision, then distill the plugin shape from what we actually find. Pattern follows Vibe-Walk on Celestia3 (PR #12).

---

## Phase 0 — first-pass shape of Celestia3

Top-level scan signals:
- Next.js + Firebase Functions architecture (`src/`, `functions/`, `firebase.json`, `firestore.rules`).
- **Two Gemini SDKs installed:** `@google/generative-ai` AND `@google/genai`. That's an immediate audit-worthy finding — dual-SDK state often means an in-flight migration that left prompts split between old + new code paths. Verified server-side: `functions/src/index.ts` uses `@google/genai`. Client side `lib/gemini.ts` calls a proxy route, so the dual-SDK is less load-bearing than feared — but the install still implies a leftover dep.
- Test files exist (`__tests__/Oneirocriton.test.tsx`, `AstrocartographyView.test.tsx`, `ConfigService.test.ts`, `RitualService.test.ts`) — useful evidence of intended prompt behavior.

---

## Phase 1 — inventory

### A. Registry-tracked prompts (in `DEFAULT_PROMPTS` + Firestore `v3_system_prompts`)

| ID | Category | Version | Voice (declared) | Notes |
|---|---|---|---|---|
| `technomancer_grimoire` | system | 3.5.0 | Warm friend, modern oracle (v3.5 voice) | The base system prompt. Aligns with `DEFAULT_DIRECTIVE.persona`. |
| `natal_interpretation` | interpretation | 3.5.0 | **"Resurrected Seer"**, cryptic, ancient, quatrains. **Calls user "Fellow Pilgrim".** | Voice contradicts global directive. v3.5.0 label is misleading — content is stale v3.0 voice. |
| `synastry_report` | interpretation | 1.2.0 | "Athanor, the Resurrected Seer", Picatrix-source | Old voice. Two versions behind the base. |
| `ritual_generation` | ritual | 2.2.0 | "Master Arithmetician", Hermetic engine | Distinct persona label. JSON-out. |
| `arithmancy_natal_integration` | interpretation | 1.2.0 | "Athanor AI", warmth of mentor + magus precision | Persona label drift ("AI" — the global directive bans this self-identifier). |
| `deep_dive_interpretation` | interpretation | 1.0.0 | "Athanor AI, Master Arithmetician and Guide" | Same "AI" drift. Lowest version in registry. |

**Templating:** All registry prompts use `{{variable}}` style. Substitution is done by naive `.replace(/\{\{varName\}\}/g, value)` in callers (`ChatService.ts`, `RitualService.ts`). No type-safe template engine. No validator for "did all `{{vars}}` get filled?" — unfilled placeholders would leak literal `{{chartData}}` strings to the model.

### B. Inline prompts (NOT in registry)

| Site | Persona | Output shape | Notes |
|---|---|---|---|
| `src/components/Oneirocriton.tsx:72-89` | "Oneirocriton Dream Oracle, an ancient Hermetic dream interpreter" | JSON (5 keys: artemidoreanAnalysis, synesianAnalysis, planetaryResonance, incubationRitual, tarotCard) | Schema defined inline as prose-in-prompt. Knowledge sources (Artemidorus, Synesius, Agrippa, Picatrix) embedded — duplicates what's likely in `KnowledgeService`. |
| `src/components/DailyNexusModal.tsx:82-84` | "Celestia Daily Tarot Oracle, mystical Hermetic guide" | Prose, exactly 2 sentences (constraint inline) | 25% reversal probability handled in JS, then passed as text to prompt. |
| `src/components/AstrocartographyView.tsx:251-271` | "Hermetic Astrocartography Oracle" | Prose, 100-140 words (constraint inline) | User prompt also defined inline as template string. |
| `src/components/AuraScanner.tsx:53-70` | "Athanor AI" (F5 confirm — "AI" self-identifier the global directive bans) | JSON (3 keys: colors, frequency, analysis), 25-word constraint inline | Only multimodal site. Has graceful fallback (good practice). Dead code at lines 72-75 — comment lies about entropy behavior. |
| `src/components/TarotSpread.tsx:89-91` | "Athanor, the Resurrected Seer... mystical, poetic voice" | Prose | Same name as `natal_interpretation` but separate definition. |
| `src/lib/CelebrityService.ts:189-191` | **"Chronos Scryer"** | JSON only | New persona. Looks like a tool-call use case (data lookup) — wrong voice for that job. |
| `src/lib/ChatService.ts:143, 328, 405, 606, 638` | varies — some are inline | varies | **Hybrid file**: uses `ConfigService.getPrompt()` for `technomancer_grimoire`/`arithmancy_natal_integration`/`natal_interpretation`/`synastry_report`/`deep_dive_interpretation` AND defines inline prompts for other call sites. Internal inconsistency. |
| `src/lib/RitualService.ts:47-49` | (uses `ritual_generation` from registry, but does inline `.replace()` for `{{intent}}`) | JSON | Mostly correct — uses registry but the templating layer is hand-rolled. |
| `src/lib/OnboardingService.ts:65` | (prompt string built above the call) | JSON | Defines the prompt inline; never touches registry. |

### C. Persona inventory

8 distinct persona labels for one brand voice:

1. Athanor (global `DEFAULT_DIRECTIVE.persona`)
2. Athanor, the Resurrected Seer (`natal_interpretation`, `synastry_report`, `TarotSpread.tsx`)
3. Master Arithmetician (`ritual_generation`)
4. Athanor AI (`arithmancy_natal_integration`, `deep_dive_interpretation`)
5. Oneirocriton Dream Oracle (`Oneirocriton.tsx`)
6. Celestia Daily Tarot Oracle (`DailyNexusModal.tsx`)
7. Hermetic Astrocartography Oracle (`AstrocartographyView.tsx`)
8. Chronos Scryer (`CelebrityService.ts`)

### D. Server-side surface

`functions/src/index.ts` (`geminiProxy` Cloud Function):
- Pure transport — no prompts of its own.
- Hard-codes `"gemini-3.5-flash"` as model fallback at lines 105 + 122. Mirrors client-side hardcode in `gemini.ts:138` and `DEFAULT_DIRECTIVE.defaultModel`.
- Owns rate limiting (20 req/min/user), auth gate, API key secret. **Natural chokepoint** for any future analytics/logging hook.

### E. Suspect model identifier

`"gemini-3.5-flash"` appears in 3 places. Published Gemini lineage is 1.5 / 2.0 / 2.5. **`3.5-flash` is not a real Google model name.** This is either a typo that shipped (intended `2.5-flash`) or a placeholder that escaped. Worth surfacing in any audit.

---

## Phase 2 — structural assessment

### Findings

**F1 — Registry exists, isn't enforced.** Celestia3 has a real prompt registry (`DEFAULT_PROMPTS` + Firestore `v3_system_prompts`), a fallback chain (Firestore → defaults → empty), an admin UI (`AdminView.tsx`), a sync-to-cloud button (`CosmicCalibration.tsx:581`), and a versioning field. But **9+ inline prompt sites bypass it entirely.** Two-class system: tracked vs scattered. The infra is good; the discipline is missing.

**F2 — Voice contradiction baked into the composition stack.** The global directive (v3.5) says *warm friend, never call user "Pilgrim", never identify as "AI"*. But:
- `natal_interpretation` literally says *Address {{name}} as a **Fellow Pilgrim***.
- `arithmancy_natal_integration` and `deep_dive_interpretation` use *"Athanor AI"*.
- When `gemini.ts` stacks them (lines 80-101), the more-specific task instruction usually wins. The warm-friend voice loses in production.

**F3 — Version drift inside the registry.** `technomancer_grimoire` is v3.5.0 (matches global directive). `natal_interpretation` claims v3.5.0 but its content is pre-v3.5 (the contradictions above). The other four are at v1.0.0, v1.2.0, v2.2.0. **No coordinated bump policy.** Version field exists, isn't load-bearing.

**F4 — Naive templating.** `.replace(/\{\{varName\}\}/g, value)` is the substitution mechanism. No validation that required vars are filled. No type safety. Easy to leak unfilled `{{chartData}}` placeholders to the model on a code path that forgot one var.

**F5 — Persona fragmentation.** 8 distinct persona labels for one brand. Some live in the registry, some are inline-only.

**F6 — Hard-coded model in 3 places, possibly a typo.** `gemini-3.5-flash` is not a known Google model. Hardcoded in client default, server default, and the function-level fallback. Single config field would consolidate; the typo (if it is one) would have been caught by a "is this a published model?" sanity check.

**F7 — Hybrid sites (worst of both worlds).** `ChatService.ts` uses the registry for some calls and inline strings for others — within one file. Reader can't tell which prompts are tunable from the admin UI without grepping the whole file.

### Recommended reorg shape (for Celestia3, not the plugin)

1. **One prompt registry, no inline strings.** Move every inline `systemInstruction` literal into `DEFAULT_PROMPTS` with a stable id. Call sites get prompts via `ConfigService.getPrompt(id)`.
2. **Persona consolidation.** Collapse 8 labels into 1-3 (e.g., "Athanor" for human-facing voice, "Chronos Scryer" only if the data-lookup case justifies a tool persona).
3. **Typed templating.** Replace `.replace()` with a small typed renderer: each prompt declares its required vars; renderer throws if any are missing.
4. **Single model config field**, sourced from one place. Fix the `3.5-flash` typo or document why it's intentional.
5. **Coordinated version field.** Bump policy: when the global directive moves a major, every prompt that embeds a persona either re-confirms its voice or gets bumped to match.

---

## Phase 3 — functional classification

Across the 6 registry prompts + 9+ inline sites, the categories that show up:

| Category | What it does | Examples |
|---|---|---|
| `voice` (system) | Establishes persona, tone, format defaults | `technomancer_grimoire`, `DEFAULT_DIRECTIVE.persona` |
| `interpretation` (reading) | Synthesizes data → prose insight | `natal_interpretation`, `synastry_report`, `arithmancy_natal_integration`, `deep_dive_interpretation`, `AstrocartographyView` analysis, `Oneirocriton` |
| `ritual` (generation) | Produces structured artifact (sigil, ritual protocol) | `ritual_generation` |
| `daily` (microcopy) | Short flavor text, one-shot | `DailyNexusModal` tarot guidance |
| `tool` (data lookup) | Function-call-style — fetch facts, return JSON | `CelebrityService.ts` Chronos Scryer |
| `chat` (conversational) | Multi-turn, user-driven flow | `ChatService.ts` call sites |

The existing `category` field in `SystemPrompt` interface has 4 values: `'system' | 'interpretation' | 'ritual' | 'tool'`. Real usage warrants at least 6 distinct ones (above). The `tool` category is declared but unused in `DEFAULT_PROMPTS`.

**Other useful classification dimensions surfaced from the read:**
- Output shape: `prose` | `json-object` | `json-array` | `multimodal-in`
- Voice-bearing? (does it stack with the global directive, or does it override?)
- Templated? (and if so, what vars?)
- Where it lives: registry | inline-component | inline-service | server
- Token weight: estimated prompt size (the master directive + persona + knowledge injection adds ~4-6K tokens before user input)
- Has fallback? (what happens if the LLM call fails — does the feature degrade gracefully like `DailyNexusModal` does with `card.meaningReversed`, or does it just error like `Oneirocriton`?)

---

## Calibration: F6 typo detection dropped from v0.1 (2026-05-28, post-user-verify)

The original audit flagged `gemini-3.5-flash` as a typo ("not a published Google model name"). User verified the SDK type definitions — `gemini-3.5-flash` IS in `Model_2` at `@google/genai/dist/genai.d.ts`. The "published-models pattern list" approach is too brittle to maintain (model names ship faster than rubric updates; bundled list goes stale fast; false positives erode trust). Dropped F6's typo sub-rule for v0.1; F6 is now a pure consolidation finding ("hardcoded in 2+ places"). Model-registry lookup belongs in v0.2 with a fresh source (context7, claude-api, or vendor API). Validated finding from cowpath; would have shipped wrong without the user's verify pass. Captured in `Vibe-Prompt/plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f7.md` §F6 with the rationale inline so future readers know why the suspect-model variant is missing.

## Phase 4 — plugin shape distillation

### What the cowpath taught us

The user's 3-step description ("inventory → org suggestions → analyze what they do") was right, but each step has more depth than expected. The plugin must do, at minimum:

1. **Inventory across two classes.** Find registry-tracked prompts AND inline-component prompts. Most real apps will have both.
2. **Detect structural smells.**
   - Registry exists but is bypassed (F1)
   - Voice contradictions across the composition stack (F2) — needs *semantic* read, not just regex
   - Version drift inside the registry (F3)
   - Naive templating (F4)
   - Persona fragmentation (F5)
   - Hard-coded model values (F6)
   - Hybrid sites (F7)
3. **Classify each prompt** along multiple dimensions (category, output shape, voice-bearing, templated, location, token weight, fallback).
4. **Output an org-aware reorg recommendation.** Not just "you have 9 inline prompts" but "move these 9 into the registry, here's the suggested id naming, here's the persona collapse."

### Proposed plugin shape

**Name:** `vibe-prompt`
**Solo repo:** `Vibe-Prompt`
**Path within solo:** `plugins/vibe-prompt`
**Tagline:** *Audit, organize, and classify the LLM prompts shipped in your app.*

**Skills (commands):**

| Skill | Purpose |
|---|---|
| `/vibe-prompt:scan` | Inventory pass. Find every prompt site (registry + inline). Output a markdown report with location, persona, category guess, output shape, templated vars, fallback presence. |
| `/vibe-prompt:audit` | Structural pass. Flags the 7 smell categories (F1-F7). Severity-tagged. Concrete recommendations per finding. |
| `/vibe-prompt:classify` | Functional pass. For each prompt, label along the classification dimensions (category, output, voice-bearing, location, token weight). Useful for diffing intent vs implementation. |
| `/vibe-prompt:reorg` | Generates a proposed reorganization plan: id naming, persona collapse, registry migration plan for inline prompts. Does NOT mutate code by default. |
| `/vibe-prompt:vibe-prompt` (bare router) | State-aware: if no audit cached, run `:scan`. If audit fresh, recommend next step. |
| `/vibe-prompt:evolve-prompt` | L3 self-evolution. Reads session + friction logs, proposes plugin improvements. |
| Internal: `session-logger`, `friction-logger`, `guide` | Per the self-evolving plugin framework. |

**Output artifacts (in target app):**

- `.vibe-prompt/state/inventory.json` — every prompt site found, source-of-truth for downstream commands
- `.vibe-prompt/state/audit.json` — last audit findings, severity-tagged
- `.vibe-prompt/state/classification.json` — per-prompt classification
- `docs/vibe-prompt/reorg-plan.md` — human-readable reorg recommendation (when `:reorg` runs)

**Detection heuristics (the actual sniffer):**

For Celestia3's stack (TypeScript/JS + Gemini), prompt sites are anywhere with:
- Calls to `generateContent({...systemInstruction: X})` / `messages.create({...system: X})` / `chat.completions.create({...messages: [...{role: 'system', content: X}]})` etc.
- `const X = \`...You are...\`` patterns
- `*Service.ts` files referenced by AI feature components
- Files matching common registry patterns (`PromptService`, `ConfigService`, `prompts/`, `templates/`)

For stack-agnostic v1, support: TS/JS (Gemini, Anthropic, OpenAI), Python (anthropic, openai, google-generativeai). Punt on Go/Rust/Java for v0.1.

**Interview gates (only ask when needed):**

- If app has a registry but `:scan` finds inline prompts, ask: *"Should `:reorg` propose migrating these into the registry, or leave them inline (treat as intentional escape hatches)?"*
- If multiple personas detected, ask: *"Is multi-persona intentional (different products), or is this drift (one brand)?"*

**Self-evolution log triggers:**

- Friction: registry not found in expected location → log + propose adding to classifier
- Friction: model name unrecognized → log + propose updating the published-models reference list
- Win: audit caught a finding the user said "yes, fix that" to → log as validated heuristic

**What this plugin does NOT do (YAGNI):**

- Does not run the prompts (no eval harness, no behavioral testing). That's a different plugin — `vibe-eval` maybe — later.
- Does not write code changes by default. `:reorg` outputs a plan; user (or Cart) applies it.
- Does not measure quality of prompt outputs. Static audit only.
- Does not benchmark token cost in production. Static estimate only.

---

## Open questions for the user

1. **Cowpath deliverable for Celestia3:** Should we ship a `docs/prompt-audit-2026-05-28.md` back to Celestia3 with these findings (cowpath produces a working artifact on the way), or just keep the process-notes as the seed?
2. **Plugin scope v0.1 vs v0.x:** Start with `:scan` + `:audit` only (smallest valuable shape), or include `:classify` + `:reorg` from day one? My rec: ship `:scan` + `:audit` first, dogfood, then add `:classify` + `:reorg` once the heuristics are proven.
3. **Eval pass — same plugin or separate?** "Eval" (run the prompts, check outputs) was in the original ask phrasing ("prompt eval skill"). Static audit + reorg is one product; running prompts + scoring outputs is a different product surface. Recommend keeping them separate — `vibe-prompt` for static, `vibe-eval` (later) for behavioral. Confirm or push back.
