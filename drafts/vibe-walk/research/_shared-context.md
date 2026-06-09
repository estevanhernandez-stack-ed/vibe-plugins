# Vibe-Walk — Shared Context (Wave 1 synthesis)

> **Author:** Sherpa (Research Director)
> **Date:** 2026-05-21
> **Status:** Wave 1 merged. This is the working document Wave 2 reads and the backbone of the final seed.
> **Sources:** 6 Wave 1 findings (onboarding-ux-veteran, activation-plg-analyst, tour-tech-scout, devtools-onboarding-expert, anti-pattern-contrarian, training-l-and-d) + the Celestia3 cowpath.
> **How to read this:** Section 1 is settled. Section 2 is what NOT to cite without resolving. Section 4 is the first-draft plugin shape. Section 5 is what Wave 2 must close.

---

## 1. Strong consensus

Claims multiple researchers reached independently. These are load-bearing — design on them.

### 1.1 The 5-step ceiling is a hard wall, not a guideline

Three researchers (UX Veteran, PLG Analyst, Contrarian) land on the same curve, all tracing to the **Chameleon benchmark**:

| Tour length | Completion |
|---|---|
| 3 steps | ~72% |
| 3–4 steps | 72–74% |
| 5 steps | top-1%-performer threshold, "still defensible" |
| 7 steps | **16%** — functionally abandoned |

The drop past 5 is described identically across all three as a "nosedive," not a linear decline. **Design verdict: hard-cap generated tours at 5, default to 3–4.** No researcher dissents.

### 1.2 User-triggered beats auto-fire by 2–3×

- User-triggered (opt-in) tours: ~2× engagement vs auto-fire (UX Veteran, PLG Analyst, Contrarian — all cite Chameleon).
- Behavior/event-triggered ("smart timing"): 2–3× vs time-delayed auto.
- Launcher-driven tours: ~67% completion (the highest observed).
- Optional/skippable tours: **123% higher completion** than forced ones (UX Veteran, PLG Analyst). Making it skippable improves the *quality* of the completing population.
- 38% of users close a page-load modal in **under 4 seconds** — before they can read the headline (UX Veteran, Contrarian, both Chameleon 2025).

**Design verdict: default trigger = auto-once + skippable + persistent replay, gated behind any existing onboarding.** This is also exactly what Celestia3 shipped.

### 1.3 Aha-first sequencing; speed-to-value is the retention lever

- Users who hit their aha moment within 5 minutes retain **3× better** at week 1 (UX Veteran, citing Intercom).
- Twilio rebuilt onboarding around a single aha metric (first message sent) → **62% activation lift, 33% more 7-day production launches** (Dev-Tools Expert). The hardest causal number in the corpus.
- Every step that precedes the aha is a hurdle. The aha stop must be step 1 or 2, never buried at step 5.

**Design verdict: Phase 1 must explicitly name the aha-moment candidate and route the tour to it first.**

### 1.4 Progress indicator = +12% completion

UX Veteran, PLG Analyst, Contrarian — all cite +12% from a "3 of 5" indicator (Chameleon 2025). Cheap, consistent. **Ship it by default.**

### 1.5 Completion rate is a trap metric

PLG Analyst and Contrarian both: tours can show high completion while producing zero activation lift ("engagement-theater"). The only measurement that matters is the downstream activation event within an attribution window (7d feature-adoption, 14d retention). **Vibe-Walk's success criterion is downstream activation, not tour completion.**

### 1.6 `data-tour` attribute anchoring is the only resilient strategy

Tour-Tech Scout and Contrarian converge hard. Class selectors rot:
- CSS Modules hash class names per build → silent break on next deploy.
- Tailwind utilities are non-unique → `querySelector('.flex')` grabs the wrong element.

The fix used in production by Intercom (`data-intercom-target`), TourGuide.js (`data-tg-tour`), and QA tooling (`data-testid`) is a stable `data-*` attribute. **Contract: `data-tour="<kebab-case-semantic-name>"`, globally unique, no step numbers in the value.** (NextStep.js is the lone exception — id-only; see 2.4.)

### 1.7 Discover existing onboarding before building — and "don't build" is a real verdict

Every researcher hits this from a different angle:
- Overlay stacking trains a "mash X" dismiss reflex (UX Veteran, Contrarian — NNGroup "Overlay Overload": Magnolia, Best Buy, Local Eclectic, Leesa).
- A tour on top of an intuitive UI does **net-negative** damage — it conditions users to dismiss future legitimate help (Contrarian).
- The PLG exemplars **Slack, Notion, Canva all reject spotlight tours** as their primary mechanism (PLG Analyst, UX Veteran, Dev-Tools Expert independently). Three of the most successful PLG products in the world chose not to do the thing Vibe-Walk generates.
- Dev tools (Stripe, Twilio, Linear, Vercel, Supabase, Retool) **none** use consumer-style spotlight tours (Dev-Tools Expert).

**Design verdict: "do not build a tour" must be a first-class Phase 1 output, not a failure path.** This is the strongest cross-lens signal in the corpus and the one a tour-vendor would never tell you.

### 1.8 Benefit-led copy, ≤25 words, assume competence

UX Veteran, PLG Analyst, Contrarian all agree: directive copy ("Click the chart") condescends; descriptive copy ("This is the chart") states the obvious. Benefit-led ("See every move in context") wins. Body target **15–25 words/step**. Feature-labeling copy ("THIS IS THE SEARCH BAR") is the canonical failure (Contrarian, HN).

### 1.9 Single-view scoping (co-presence rule)

UX Veteran and the cowpath: a selector tour can only highlight elements mounted in the current view. **v1 default = single view.** Cross-view orchestration is real complexity — flag it, don't hand-wave it.

---

## 2. Contradictions / figures to verify

Do NOT cite these downstream without resolving. Marked `[verify]`.

### 2.1 `[verify]` — Chameleon benchmark interaction count: 15M vs 550M

- **UX Veteran:** "15 million+ tour interactions."
- **PLG Analyst:** "550M+ interactions" (used repeatedly, including the 61% average and 67% launcher figures).

Same source (Chameleon 2025 Benchmark Report), ~37× apart. Both can't be the report's headline number. **This matters because the 550M figure is what gives the completion curve its authority** — if the real number is 15M, the claim is weaker than the PLG findings imply. **Resolution: fetch chameleon.io/benchmark-report directly and read the stated methodology N. Until then, cite the curve shape (3-step ~72%, 7-step ~16%), not the interaction count.**

### 2.2 `[verify]` — completion percentages drift between researchers

- 3-step completion cited as **72%** (UX Veteran) and **72–74%** (PLG Analyst). Minor, reconcilable.
- "Average tour completion = **61%**" (PLG Analyst) vs "~70% of users skip traditional tours" (all three). These describe different populations (well-targeted 3–4 step tours vs all tours in the wild) but are stated close enough together to read as contradictory. **Resolution: when citing, always attach the population — "61% for well-targeted 3–4 step" vs "~70% skip for untargeted linear tours."**

### 2.3 `[verify]` — "76.3% of static tooltips dismissed within 3 seconds"

PLG Analyst flagged this himself: attributed to "Amplitude 2024 Product Analytics Report," **could not verify against the primary source.** Contrarian cites an adjacent but different stat — "only 11.2% of static tooltip appearances result in the suggested action" (Chameleon 2025). These are not the same claim. **Do not use the 76.3% figure in the seed.** The 11.2% Chameleon figure is the safer one if a tooltip-ineffectiveness stat is needed.

### 2.4 `[verify-resolved]` — NextStep.js breaks the `data-tour` contract

Not a disagreement, a documented exception: NextStep.js targets **by `id` only** — no class, no data-attribute, no arbitrary selector (Tour-Tech Scout, GitHub-verified). The universal `data-tour` contract (1.6) does not apply to it; NextStep needs `id="tour-<name>"`. Flagged so Wave 2 / the seed don't assert "data-tour works everywhere."

### 2.5 `[verify]` — secondary activation numbers sourced from citations-of-citations

- "Cutting TTV 20% → 18% ARR lift" (PLG Analyst) — explicitly "original Amplitude report not directly fetched."
- "Interactive tours +42% feature adoption / +50% activation" (PLG Analyst, UserGuiding) — vendor-sourced, not independently replicated.
- "Single-step tooltip outperforms 6-step tour in activation" (PLG Analyst) — no named product or study.
- Segment "30–50% activation improvement from role targeting" (Dev-Tools Expert) — vendor-sourced.

None are load-bearing for the core design. **Treat as directional, not as evidence. Don't headline any of them.**

### 2.6 Soft tension — opt-in vs auto-fire framing

UX Veteran leans "user-triggered outperforms, always." PLG Analyst nuances it: the consensus default is **auto-once + behavior-gate** (auto-fire *when context is unambiguous*), not pure opt-in. **Not a real contradiction — resolve as: auto-once gated on a qualifying first action, skippable, with replay. Pure opt-in is the safest but auto-once-behavior-gated is the pragmatic default.**

---

## 3. Cross-cutting themes

Patterns that show up across lenses, not just within one.

**Output shape.** Tour-Tech Scout confirms two viable shapes: **(a) dropped-in full module** (Celestia3) and **(b) config-only JSON** (`tour-config.json` + a ~5-line Driver.js bootstrap, loaded at runtime via `setSteps()`). Config-only is viable *only* with vanilla-JS substrates (Driver.js, Shepherd.js) — React libs embed JSX in step content and can't serialize. Recommendation: **offer both; Driver.js is the substrate that makes config-only real.**

**Anchoring.** The single most cross-cutting technical theme. `data-tour` attributes (1.6) plus lazy/function-form element targeting for dynamic mounts. Four of six libraries support lazy eval (Driver.js, Shepherd.js, React Joyride, Reactour); Intro.js and NextStep.js do not. This feeds Phase 1 risk flags directly.

**Instrumentation.** PLG Analyst's 6-event schema (`tour_started`, `tour_step_viewed`, `tour_step_advanced`, `tour_skipped`, `tour_completed`, `tour_replayed`) + the host's own activation event. Critical detail: **Driver.js fires no analytics by default** — the module must wire `onHighlightStarted` → `tour_step_viewed`, `onNextClick` → `tour_step_advanced`, `onDestroyStarted` → skip/complete. Celestia3's tour did NOT instrument these, so its activation data is currently dark.

**The "don't build" verdict.** Cross-lens (1.7). Concrete trigger conditions assembled from Contrarian + Dev-Tools Expert + PLG Analyst: <5 interactive surfaces, domain-expert audience, existing comprehensive onboarding, single-purpose tool, no stable selectors anywhere, high-urgency use context, CLI/code-surface product, untourable surfaces (shadow DOM / cross-origin iframe).

**Overlay sequencing.** UX Veteran + Contrarian + PLG Analyst: queue, don't stack; one overlay per session until interaction; gate the tour behind welcome modal AND a qualifying first action (not just modal-close). This is the generalized form of Celestia3's hard-won lesson.

**Copy voice.** Benefit-led baseline (1.8), but register shifts by audience: warm/personable for B2C (Slack, Canva, Notion); authoritative/ROI-framed for B2B (HubSpot, Pendo); sparse/one-card/links-to-docs for technical (GitHub). The plugin should pick register from the Phase 1 audience read.

**Aha-moment-as-anchor.** UX Veteran, PLG Analyst, Dev-Tools Expert all independently make the aha moment the organizing principle — Phase 1 names it, Phase 1.5 confirms it, Phase 2 routes step 1 to it.

**Empty states / sample data as the higher-ROI alternative.** UX Veteran (empty states are primary, tours secondary) and Dev-Tools Expert (Linear/Supabase pre-populate; sample data beats tour copy) converge: when the first-run surface is a blank canvas, recommend empty-state/sample-data enhancement *before or instead of* a tour.

---

## 4. The emerging shape of Vibe-Walk

First-draft consolidation. v1 = walkthrough mode only; training mode (L&D findings) is deferred to v2 with architecture noted.

### DOES
- Reads the app's **user-facing surface area** autonomously (Phase 1), names the aha-moment candidate, ranks 8–12 candidate stops by centrality to first-success.
- Emits an **anchor-readiness verdict** + risk flags (CSS Modules / Tailwind-only / dynamic mount / SSR / shadow DOM / cross-origin iframe / no-stable-selectors).
- Generates a **3–5 step** (default 3–4) single-view spotlight tour with a progress indicator.
- Defaults substrate to **Driver.js** (5.9KB gzip, MIT, vanilla, JSON-serializable, `setSteps()` runtime config).
- Offers **two output shapes**: dropped-in module or config-only JSON + bootstrap.
- Wires the **6-event analytics schema** to substrate hooks; documents the host's activation event + attribution windows (7d/14d).
- Generates a **persistent, zero-hunt replay** entry (non-optional).
- Reuses the app's existing onboarding-state flag; gates auto-fire **after** existing onboarding.
- Picks **copy register** (B2C warm / B2B authoritative / technical sparse) from the Phase 1 audience read; benefit-led, ≤25 words/step.

### ASKS (Phase 1.5 interview gates — expanded from 3 to ~5)
1. **Mode** — walkthrough (v1) vs training (v2). Often inferable; confirm.
2. **Trigger model** — auto-once+replay / on-demand / auto-once-no-replay — *with* an overlay-sequencing sub-question: "What other modals/banners fire on first login?"
3. **Substrate** — Driver.js default / React Joyride / Reactour / config-only.
4. **(NEW) Aha moment** — "What single action makes a new user say 'this is worth it'?" Anchors stop selection.
5. **(NEW) Primary user role** — for role-diverse products: setup/admin persona vs operate/day-to-day persona. May branch into two tours.

### GENERATES
- Tour module OR `tour-config.json` + bootstrap.
- `data-tour="<semantic-name>"` anchor-injection pass (additive, no logic change). Anchor map documented.
- Analytics wiring + a `TOUR_ANALYTICS.md` naming the 6 events + the host activation event + attribution windows.
- SSR guard in every emitted module (dynamic import `ssr:false` / `useEffect`).
- Replay entry point, ungated.
- Theme matching the app's look.

### AVOIDS (hard guardrails)
- >5 steps (warn + require explicit approval; suggest splitting into first-run + feature-discovery).
- Auto-fire on raw page load into existing onboarding debt.
- Class-name anchoring (CSS Modules hash / Tailwind utility).
- Feature-labeling copy ("This is the X"), directive condescension ("Click here"), >25-word tooltips.
- Auto-once-no-replay (locks out the 38% who dismiss in <4s).
- Anchoring inside shadow DOM or cross-origin iframes (hard walls).
- Building a tour at all when the "don't build" conditions fire (1.7 / Section 3).
- Generating docs/CLI onboarding (out of substrate scope — note & defer).
- Merging tour and training configs (different schemas; route at mode gate).

### TRAINING MODE (v2 — noted, not built)
Architecturally distinct: `{ modules: [{ objective, content, exercises, quiz, roleGates, nextModule }] }` vs `{ steps: [...] }`. Requires host role exposure, progress/completion storage, branching logic. Precedents: Whatfix, Pendo, WalkMe (all separate "guides" from "training" as product tiers). Trigger: enterprise/multi-role/Workday-complexity products. **Do not collapse into v1.**

---

## 5. Open gaps

What the research has NOT yet answered well enough to design on.

1. **The Chameleon number must be pinned (2.1).** The entire completion curve — the spine of the "5-step ceiling" design verdict — rests on a benchmark whose interaction count two researchers reported 37× apart. Until the primary report is read, the headline evidence is on soft ground.

2. **Output-shape decision is described but not decided.** Tour-Tech Scout proved config-only is *possible* with Driver.js, but no one tested whether real host apps prefer drop-in vs config-only, or what the maintenance/ownership tradeoff actually is in practice. The plugin defaults to "offer both" — but "offer both" may be a punt that doubles the build template surface. **Needs a decision, not just an option list.**

3. **No real control-group evidence that tours help.** PLG Analyst searched and found **zero** named public case studies of a tour beating a no-tour holdout — and the strongest honest evidence (Slack/Notion/Canva rejecting tours) cuts *against* building them. The plugin generates tours; the corpus's best evidence is ambivalent about whether it should. The "don't build" verdict (1.7) is well-supported; the "here's when a tour demonstrably wins" case is thin.

4. **Anchor-injection automation boundary is unresolved (cowpath open Q).** How much of the Phase 2 `data-tour` pass can be safely automated vs needs human review per component? No researcher addressed this directly. It's the difference between a config job and an edit-every-component job — a core effort-estimate driver.

5. **Cross-platform is entirely open.** Web is proven. Desktop / mobile-native / CLI tours: Dev-Tools Expert ruled CLI out-of-substrate, but mobile-web breakpoint behavior (Contrarian's responsive-layout failure mode) and desktop apps are unexamined. v1 can scope to web — but the boundary should be explicit in the seed.

6. **Substrate decision tree is implicit.** Six libraries profiled, Driver.js defaulted — but the *rule* for when to override the default (React app wanting idiomatic integration → Joyride/Reactour; Next.js multi-page → NextStep) isn't formalized as a decision tree the plugin can execute. Tour-Tech Scout has the raw material; it needs assembly.
