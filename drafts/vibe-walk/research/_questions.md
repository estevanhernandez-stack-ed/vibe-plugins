# Vibe-Walk — Research Questions (Wave 0)

> **Authored by:** Sherpa (Research Director)
> **Date:** 2026-05-21
> **Status:** Ready for Wave 1 parallel dispatch
> **Grounding:** `../process-notes.md` (cowpath) + `../2026-05-21-vibe-walk-build-design.md`

---

## Research mission

The Celestia3 inaugural job validated a two-phase spine (autonomous UI-surface discovery → build) and three interview gates (mode, trigger model, substrate), but one real app is a sample of one. This expedition must determine what actually works at scale across consumer first-run onboarding — what sequencing, length, trigger timing, and copy patterns drive real activation vs what causes users to mash "skip" and never look back. It must also resolve Vibe-Walk's open output-shape question: does the plugin drop in a full tour module, emit a declarative config the host wires up, or produce something in between — and which library substrates make that output genuinely portable across frameworks. Finally, it must draw a clean boundary between walkthrough mode (consumer spotlight tours, the v1 target) and training mode (B2B curriculum, noted for a future build cycle), so Vibe-Walk's v1 scope is tight and its future scope is preserved rather than prematurely collapsed. The research is walkthrough-weighted: go deep on consumer first-run and tour-tech; bring back just enough on training mode to recognize it when the time comes.

---

## Per-persona research briefs

---

### Onboarding UX Veteran — DEEP

**Lens:** First-run flows, spotlight tours, progressive disclosure, aha-moment sequencing, empty states, step count, trigger timing, skip/replay.

**Grounding context from the cowpath:** Celestia3 shipped a 6-stop Driver.js tour, auto-once with replay, gated to fire *after* an existing welcome modal. The hard-won lesson was that the app already had a flyby + welcome modal — the tour had to sequence *after* those, not pile on. The Phase 1.5 interview asks about trigger model (auto-once+replay / on-demand only / auto-once-no-replay) because this varies by app and matters enormously for the user experience.

**Research questions:**

1. What is the empirical optimal step count for consumer B2C spotlight tours — where does tour completion drop, and what is the step-count ceiling beyond which most users bail? Name specific products and, where available, data.

2. How should tour stops be sequenced to hit the aha moment as early as possible? Is there a canonical "aha moment first vs context first" debate in the field, and what does the evidence say? Name apps that got this right.

3. What are the best-practice patterns for empty states in onboarding — when does an empty-state tour fire vs a first-run spotlight tour, and are these complementary or competing patterns? Name real apps that use each.

4. What triggers are used in the wild — auto-on-first-login, manual/replay-only, day-N re-engagement tours, feature-flag-gated new-feature tours — and what trigger-sequencing rules exist to avoid firing multiple overlays at once on the same session?

5. What is the accepted copy voice for tour tooltips — directive ("Click the chart"), descriptive ("The chart shows your history"), or benefit-led ("See every move in context here") — and does it vary by B2C vs B2B app type?

6. How do the best apps handle "skip" and "replay" — is replay surfaced in the product (e.g., a persistent "Take the tour" entry in a menu), and what percentage of users who skip actually come back via replay?

---

### Activation / PLG Analyst — DEEP

**Lens:** What makes onboarding *convert* — time-to-value, tour completion vs skip rates, when tours help vs hurt activation and retention, measurable outcomes.

**Grounding context from the cowpath:** Vibe-Walk's core job is to generate a tour the app's *real users benefit from*. "Benefit" here has to be operationalized — what does a well-designed tour move in terms of measurable activation, engagement, or retention? The research should surface the numbers that make the case (or the counter-case) for tour-based onboarding vs alternatives.

**Research questions:**

1. What activation metrics do PLG / product teams actually use to measure whether a spotlight tour is working? Name the specific metrics (e.g., time-to-first-key-action, day-7 retention, feature discovery rate) and at least two real tools or platforms that instrument them (e.g., Amplitude, Mixpanel, Pendo, Appcues).

2. What does the data say about tour completion rates in the wild? What is a "good" completion rate for a consumer B2C spotlight tour, and what is the typical skip rate? Name specific products or studies, not just averages.

3. When do onboarding tours *hurt* activation? Are there documented cases where a product shipped a tour and saw lower activation or retention vs a control group with no tour? What were the failure modes (too long, wrong timing, irrelevant steps)?

4. What is the "time-to-value" argument for spotlight tours specifically — do tours reliably shorten time to first meaningful action, or is there evidence that self-directed exploration outperforms guided tours for certain user types or product categories?

5. Does tour opt-in (user-triggered) vs tour auto-fire produce meaningfully different completion and activation outcomes? Is there a PLG consensus on this tradeoff?

6. What analytics hooks does Vibe-Walk need to recommend that the host app instrument so tour effectiveness can actually be measured post-deployment? Specifically: which events (tour_started, tour_step_viewed, tour_completed, tour_skipped_at_step_N) and which attribution window?

---

### Tour-Tech Scout — DEEP

**Lens:** Driver.js, Shepherd.js, Intro.js, Reactour, NextStep.js, and peers. Output shapes (tour-config JSON vs full library code vs markup-driven). Element-anchoring strategies and layout resilience. Framework-agnostic vs framework-specific tradeoffs.

**Grounding context from the cowpath:** Vibe-Walk defaulted to Driver.js as the substrate because it is framework-agnostic — the plugin's output pattern needs to generalize beyond React. The open question is whether the plugin should emit a dropped-in tour module (as in Celestia3), a declarative config the host app wires up itself, or something in between. Anchor-readiness is a hard gate: components with no stable selectors turn a config job into an edit-every-component job.

**Use context7 to verify library docs, APIs, and current version status for all libraries named below.**

**Research questions:**

1. For Driver.js, Shepherd.js, Intro.js, Reactour, and NextStep.js: what is each library's current maintenance status, bundle size, and minimum browser/framework requirements? Which are actively maintained as of 2025-2026? (Verify via context7.)

2. What is each library's tour-step config schema — specifically, what anchor-targeting mechanisms does each support (CSS selector, element id, data-attribute, DOM ref, XPath)? Which anchor strategies are most resilient to layout change and component re-renders, and why?

3. Driver.js supports a declarative `steps[]` config that a driver instance reads. Does any of the competing libraries support a fully self-contained, framework-agnostic JSON-only config that a host app could load at runtime without bundling the tour config at build time? This is the "config-only output shape" option — document what's possible.

4. For React-specific tour libraries (Reactour, NextStep.js, React Joyride): what does the integration surface look like — provider wrapping, step prop shapes, ref-based vs selector-based anchoring — and what breaks when the host app is not React (Next.js, Remix, Vite+React vs non-React frameworks)?

5. What are the known failure modes for selector-based tour anchoring when apps use CSS Modules, Tailwind (hash-based class names), or server-side rendering? What defensive patterns exist (data-tour attributes, stable id conventions) and which libraries explicitly support them?

6. Given Vibe-Walk's Phase 1 anchor-readiness verdict (does the app need anchor injection before the tour can be built?), what is the minimum viable anchor contract a plugin could specify to a host app — i.e., what naming convention for `data-tour` or `id` attributes makes any library's step config portable and low-maintenance over time?

---

### Dev-Tools Onboarding Expert — MEDIUM

**Lens:** Onboarding for technical products — CLIs, SaaS dev tools, IDEs, APIs. Docs-as-onboarding, interactive tutorials, sample projects.

**Grounding context from the cowpath:** Vibe-Walk's first job was a web app (Celestia3). But the plugin will run against developer-facing products too — dashboards, admin panels, internal tools, dev-platform UIs. This persona covers what makes onboarding land differently for a technical audience and what patterns transfer from consumer UX to technical UX.

**Research questions:**

1. What are the dominant onboarding patterns for SaaS dev tools (e.g., Vercel, Linear, Retool, Supabase)? Specifically: do these products lean on spotlight tours, interactive tutorials, sample projects, docs-first, or some combination — and is there a discernible pattern by product type?

2. Interactive in-product tutorials (e.g., Stripe's old "test mode" onboarding, GitHub's contribution graph explainer) vs docs-first onboarding: where does each pattern win, and what cues in a product's audience or complexity signal which to use?

3. What onboarding patterns work for CLI tools and APIs where there is no visual UI to anchor a spotlight tour? Name real examples (e.g., `npm init`, `gh auth login` prompts, Stripe CLI quickstart). Are there analogues to spotlight tours in terminal/text-based products?

4. When a product has both a developer user (sets it up) and an end user (operates it), how do well-designed tools handle the onboarding split — separate tours, role-detection at first login, progressive disclosure by detected role? Name real products.

---

### Anti-Pattern Contrarian — MEDIUM

**Lens:** Onboarding that annoys and backfires — forced/unskippable tours, modal fatigue, layout-fragile tours, over-long tours, patronizing copy. What Vibe-Walk must NOT generate.

**Grounding context from the cowpath:** The hard-won lesson "discover existing onboarding before designing" came from nearly duplicating Celestia3's flyby + welcome modal. The anti-pattern threat for Vibe-Walk is generating tours that pile on top of existing onboarding, or generating tours so long that users skip them, or generating copy that talks down to users who already know their own domain. These must be encoded as plugin guardrails.

**Research questions:**

1. What are the top documented user-experience complaints about product tours? Name specific products that have been publicly criticized for their onboarding (blog posts, HN threads, UX teardowns) and describe the specific failure mode in each case.

2. What is the "modal fatigue" threshold — how many overlays (welcome modal + cookie consent + tour + chat widget + feedback prompt) does it take before users habitually dismiss everything on sight, and is there data on what this does to tour completion?

3. What makes tour copy patronizing or annoying? Specifically: what tone, reading level, or instructional register causes technical and intermediate users to disengage? Name examples of bad copy patterns and contrast them with better alternatives.

4. What are the known ways that selector-based spotlight tours break in production — responsive layout shifts, dynamically mounted components, shadow DOM, iframes, lazy-loaded panels — and which failure modes are most common? These must map to Phase 1 risk flags Vibe-Walk surfaces before building.

5. What is the strongest argument *against* generating a tour for a given app — i.e., what product/audience signals mean "don't build this, the app doesn't need it"? This feeds the plugin's Phase 1 "should we even build a tour here" verdict.

---

### L&D / Training Specialist — LIGHT

**Lens:** B2B/enterprise training — curriculum structure, exercises, mastery/completion tracking, when training mode beats walkthrough mode. Note patterns for future; do not over-invest.

**Grounding context from the cowpath:** Training mode is entirely unexercised — it was deferred after the Celestia3 walkthrough-mode job. This persona's job is to establish just enough signal that, when training mode gets its own first job, the design choices have prior art.

**Research questions:**

1. What is the structural difference between a consumer spotlight tour and an enterprise training module, from a UX and content architecture perspective? What are the minimum additional components a training mode needs (exercises, progress tracking, certificates, branching paths) that walkthrough mode doesn't?

2. What are the dominant platforms/libraries used to embed training-mode experiences inside web apps (e.g., Intercom Product Tours on steroids, WalkMe, Whatfix, Pendo Guides in training mode)? What does their step/module config schema look like vs a simple spotlight tour config?

3. When is training mode the right choice over walkthrough mode? Name at least three real enterprise products where a lightweight spotlight tour would have been insufficient — and explain why structured training was necessary.

---

## Shared output contract (all six researchers)

Every findings document must close with this five-part shape — in this order, no exceptions:

```
## Patterns
[Cross-cutting patterns across the research, abstracted from specific examples]

## Real named examples
[Specific products, apps, or tools — named, with observable detail. No "many products do X" without naming them.]

## What works
[Evidence-backed claims about what produces good outcomes. Cite source or name product where possible.]

## What fails
[Evidence-backed claims about what produces bad outcomes. Same citation standard.]

## Implications for Vibe-Walk
[Explicit recommendations: what the plugin should do, avoid, or flag — grounded in the findings above. No generic advice.]
```

**Sourcing rules:**
- Real apps and products must be named — no anonymous "a popular SaaS product."
- Tour library claims (APIs, config schemas, maintenance status) must be verified via context7 before asserting.
- WebSearch and WebFetch are the primary evidence-gathering tools for product examples, teardowns, and published data.
- If a claim cannot be sourced, mark it `[unverified]` and note what evidence would resolve it. Do not present speculation as fact.
