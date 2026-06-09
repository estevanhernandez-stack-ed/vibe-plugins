# Vibe-Walk — `_seed.md`

> **Author:** Sherpa (Research Director)
> **Date:** 2026-05-21
> **Status:** DONE_WITH_CONCERNS
> **What this is:** The single design input for building the Vibe-Walk plugin. Feeds `superpowers:writing-plans` and an autonomous Cart build. Decision-dense by design — a builder should be able to design the plugin from this without re-reading the underlying findings.
> **Expedition closed:** Wave 1 (six researchers) + Wave 2 (three deep-dives) + the Celestia3 cowpath. Sources: `_shared-context.md`, `deep-dives/chameleon-benchmark-verification.md`, `deep-dives/output-shape-decision.md`, `deep-dives/anchor-injection-and-substrate.md`, `process-notes.md`.

---

## 1. Executive summary

Vibe-Walk reads an app's user-facing surface area autonomously, names the aha moment, and generates a short, skippable, instrumented spotlight tour — same DNA as vibe-doc and vibe-iterate, but the read target is end-user surfaces and the audience is end users, not developers. The single most important reframe from the research: **"don't build a tour" is a first-class Phase 1 output, not a failure path.** The strongest cross-lens signal in the corpus is that the best PLG products in the world — Slack, Notion, Canva, and every dev tool studied (Stripe, Twilio, Linear, Vercel, Supabase, Retool) — reject spotlight tours as their primary mechanism, and a tour layered on an already-intuitive UI does net-negative damage by training a dismiss reflex. So the plugin's first job is to earn the tour, then build a good one. The build itself is settled: a 5-step hard ceiling (default 3–4), Driver.js as the default substrate, `data-tour` attribute anchoring, a 6-event analytics schema wired to substrate hooks, and a persistent ungated replay. The evidential spine — the step-count completion cliff — is real in direction but is single-vendor data (Chameleon) that no independent source has replicated, so the guardrail must be stated honestly. Output shape is decided: drop-in module by default, config-only JSON only when three specific conditions all hold. The anchor-injection pass is partly automatable via codemod (jscodeshift/ts-morph) with a mandatory `REVIEW_NEEDED.md` human gate for the cases automation can't safely handle.

---

## 2. Resolved design decisions

Each is a one-line decision + one-line rationale, with the deep-dive that settled it.

| # | Decision | Rationale | Source |
|---|---|---|---|
| D1 | **Hard-cap generated tours at 5 steps; default 3–4.** | Completion nosedives past 5 (≈72% at 3 → ≈16% at 7+); curve direction is consistent across all sources and grounded in cognitive-load theory. | chameleon-benchmark-verification §6–7 |
| D1-honest | **State the ceiling as single-vendor directional data, NOT a proven constant.** | The 72%/16% numbers are Chameleon's own platform data (550M+ in-app interactions, 2025 report; 15M tour-only, 2019 article — two different reports, resolving the Wave-1 37× discrepancy), never independently replicated. Cite the curve shape + theory, not the decimals. The 5-step ceiling sits conservatively *below* Chameleon's stated cliff. | chameleon-benchmark-verification §1, §7–8 |
| D2 | **Default output shape = dropped-in module (Shape A).** | Version skew is loud (TS/import errors), not silent; "you own the code" (shadcn model) fits a 50–100-line TS module; one emitter template, not two. | output-shape-decision DECISION |
| D2-config | **Emit config-only JSON (Shape B) ONLY when all three hold:** (1) a non-dev (PM/designer/CS) owns ongoing tour-content editing, (2) driver.js version is stable + pinned, (3) content-update cycle is decoupled from deploy. | Shape B's failure mode on version skew is *silent* (wrong keys ignored, no error) — the worst class. Worth it only when non-engineer editability is a real, stated need. The cowpath/Celestia3/typical vibe-coded app meets none of the three. | output-shape-decision §4–6, DECISION |
| D3 | **Substrate default = Driver.js** (5.9KB gzip, MIT, zero-dep, vanilla, JSON-serializable, `setSteps()` runtime config, function-form lazy eval). | Smallest, framework-agnostic, the only library with fully serializable steps — which is what makes config-only and cross-framework output real. | anchor-injection-and-substrate §2, ARTIFACT B |
| D3-override | **Override Driver.js only on these conditions** (see decision tree in §3): non-React → Driver.js mandatory; Next.js App Router multi-route → NextStep.js; heavy re-rendering/animated surfaces → Reactour; need to *async-wait* for element mount → React Joyride; idiomatic-React-wanted + bundle-not-a-concern → React Joyride; config-only requested → Driver.js mandatory. | Each override maps to a capability no other library has natively. | anchor-injection-and-substrate ARTIFACT B |
| D3-nextstep | **NextStep.js exception: anchor with `id="tour-<name>"`, NOT `data-tour`.** It reads `id` only — no class, no data-attr. Also carries a ~30KB Framer Motion peer dep — confirm it's already in the bundle or budget it. | Verified id-only against live nextstepjs.com docs. The universal `data-tour` contract does not apply to NextStep. | anchor-injection-and-substrate §2, ARTIFACT B |
| D3-shadow | **Shadow DOM is a hard wall.** Any tour stop inside a shadow boundary (Web Components, Stencil, lit-element) → emit "UNTOURABLE SURFACE"; remove the stop or scope around it. No substrate fixes this. | `querySelector` and AST traversal both fail at the shadow boundary. | anchor-injection-and-substrate §1, §2 |
| D3-reject | **Reject Intro.js anywhere.** AGPL-3 — commercial license required. | License poison for typical host apps. | anchor-injection-and-substrate ARTIFACT B |
| D4 | **Anchor contract: `data-tour="<kebab-case-semantic-name>"`, globally unique, no step numbers in the value.** | Class selectors rot (CSS Modules hash per build; Tailwind utilities non-unique). `data-*` is the production-proven resilient strategy (Intercom, TourGuide.js, `data-testid`). NextStep is the lone `id`-only exception (D3-nextstep). | _shared-context 1.6, 2.4 |
| D5 | **Analytics: wire the 6-event schema to substrate hooks** — `tour_started`, `tour_step_viewed`, `tour_step_advanced`, `tour_skipped`, `tour_completed`, `tour_replayed` — plus the host's own activation event. | Driver.js fires NO analytics by default: `onHighlightStarted`→`tour_step_viewed`, `onNextClick`→`tour_step_advanced`, `onDestroyStarted`→skip/complete. Celestia3 shipped uninstrumented, so its activation data is dark — don't repeat that. Success criterion is downstream activation (7d/14d window), not completion (a trap metric). | _shared-context 1.5, §3 instrumentation |
| D6 | **Anchor-injection automation boundary:** AUTO-INJECT only when all four hold — (a) intrinsic HTML tag or directly-imported named component, (b) single unambiguous root return, (c) no HOC/dynamic-import/render-prop, (d) `data-tour` absent (idempotency). Everything else → `REVIEW_NEEDED.md` with a per-item reason code. **Phase 2 does not proceed until the human resolves the list.** | Automation breaks hard on HOCs, conditional roots, untyped spread-props, shadow DOM, dynamic components, render-props, third-party components, conditional SSR, CSS-Module-only ID, and fragment roots. Tool: jscodeshift `--parser tsx` (default), ts-morph for strict-TS prop-forwarding inference. | anchor-injection-and-substrate §1, ARTIFACT A |

---

## 3. Vibe-Walk's shape

The plugin's spine: a two-phase pattern with an interview gate between them, validated by the Celestia3 cowpath and sharpened by the research. v1 = walkthrough mode only; training mode is deferred to v2 (architecture noted in §3.4).

### Phase 1 — autonomous discovery (incl. the "should we even build a tour?" verdict)

**Reads:** orientation docs (README, DOCS, THEME, CLAUDE.md); the route surface; page files + the components they compose; existing onboarding/tour/tooltip code.

**Produces:**
1. A 3–4 sentence product summary + audience read (B2C / B2B / technical — sets copy register).
2. A user-facing surface inventory: panels, regions, tabs, modals, floating widgets — each with name, user-facing purpose, file path, host view.
3. **The named aha-moment candidate** — the single action that makes a new user say "this is worth it." This is the organizing principle; step 1 of any built tour routes here.
4. A ranked shortlist of 8–12 candidate stops, ranked by **centrality to first-success**.
5. An **anchor-readiness verdict** + risk flags: CSS-Modules / Tailwind-only / dynamic mount / SSR / shadow DOM / cross-origin iframe / no-stable-selectors. This gates the effort estimate (config job vs edit-every-component job).
6. **THE FIRST-CLASS VERDICT: "should we even build a tour here?"** — a real recommendation, equal in weight to a "yes, build." Emit "don't build a tour" (or "do something cheaper first") when any of these fire:
   - Fewer than ~5 interactive surfaces.
   - Domain-expert / power-user audience.
   - Existing comprehensive onboarding already present (don't stack — trains a dismiss reflex).
   - Single-purpose tool.
   - No stable selectors anywhere AND host won't accept an anchor pass.
   - High-urgency use context (users won't sit through a tour).
   - CLI / code-surface product (out of substrate scope).
   - Untourable surfaces dominate (shadow DOM / cross-origin iframe).
   - **The first-run surface is a blank canvas** → recommend empty-state / sample-data enhancement *before or instead of* a tour (higher ROI; Linear/Supabase pattern).

**Asks:** nothing yet — Phase 1 is autonomous. It surfaces the verdict and the shortlist for Phase 1.5.

### Phase 1.5 — interview gates

Refines the cowpath's three into five. Keep per-question; don't merge.

1. **Mode** — walkthrough (v1) vs training (v2). Usually inferable from Phase 1 audience read; confirm, don't assume. Picks the output template family.
2. **Trigger model** — auto-once+replay (default) / on-demand only / auto-once-no-replay. **Default = auto-once gated on a qualifying first action, skippable, with persistent replay.** Includes the overlay-sequencing sub-question: **"What other modals/banners/overlays fire on first login?"** — queue, don't stack; gate the tour behind the welcome modal AND a qualifying first action, not just modal-close.
3. **Substrate** — Driver.js (default) / React Joyride / Reactour / NextStep / config-only. Execute the decision tree (below) before asking; ask only to confirm or to resolve an override condition. For config-only or NextStep paths, the version sub-question fires: "What version of driver.js does your app use?" (not v1.x → fall back to Shape A).
4. **(from research) Aha moment** — "What single action makes a new user say 'this is worth it'?" Confirms the Phase 1 candidate; anchors stop selection.
5. **(from research) Primary user role** — for role-diverse products: setup/admin persona vs operate/day-to-day persona. May branch into two tours.

**Substrate decision tree (the plugin executes this; ask only to confirm):**

```
Not React (Svelte/Vue/vanilla/Alpine/Astro)?      → DRIVER.JS (mandatory)
Any tour stop inside shadow DOM?                   → UNTOURABLE — remove/scope around it
Output shape config-only JSON?                     → DRIVER.JS (mandatory; only serializable steps)
Next.js App Router AND tour spans multiple routes? → NEXTSTEP.JS (id="tour-name", +Framer Motion ~30KB)
Any stop must ASYNC-WAIT for element mount?        → REACT JOYRIDE (before: async hook)
Heavily animated / re-rendering stop elements?     → REACTOUR (mutationObservables auto-reposition)
Host wants idiomatic React AND bundle not a concern? → REACT JOYRIDE
DEFAULT                                            → DRIVER.JS
ALWAYS BLOCK: Intro.js anywhere                    → REJECT (AGPL-3)
```

### Phase 2 — build

**Reads:** the Phase 1 shortlist + readiness verdict, the Phase 1.5 answers, the host's existing onboarding-state system.

**Generates:**
1. **Tour module** (Shape A default) OR `tour-config.json` + `tour-bootstrap.js` (Shape B, only when D2-config holds). Steps config + a `start(onDone)` driver, themed to the app's look.
2. **Anchor-injection pass** — additive `data-tour="<semantic-name>"` (or `id="tour-<name>"` for NextStep), no logic changes. Runs the codemod for the auto-injectable subset; emits modified files + diff patch AND `REVIEW_NEEDED.md` for everything else. **Halts for human resolution of REVIEW_NEEDED before proceeding.** Documents the anchor map.
3. **Analytics hooks** — the 6-event schema wired to substrate callbacks + a `TOUR_ANALYTICS.md` naming the 6 events, the host's activation event, and the attribution windows (7d/14d).
4. **Replay export** — a persistent, zero-hunt, ungated replay entry point.
5. **SSR guard** in every emitted module (dynamic import `ssr:false` / `useEffect`), per the substrate's row in the cross-reference table.
6. **Onboarding-state reuse** — extend the app's existing first-run flag (Celestia3 added `hasSeenSpotlight` beside `hasSeenWelcome`); never invent a parallel store.
7. **Progress indicator** (e.g., "3 of 5") — +12% completion, cheap, ship by default.
8. **Copy** — benefit-led, ≤25 words/step, register chosen from the Phase 1 audience read (B2C warm / B2B authoritative-ROI / technical sparse).

**Asks:** confirmation on the REVIEW_NEEDED anchor items (the only mid-build human gate). Otherwise builds against the resolved decisions.

### v2 — Training mode (noted, NOT built)

Architecturally distinct: `{ modules: [{ objective, content, exercises, quiz, roleGates, nextModule }] }` vs walkthrough's `{ steps: [...] }`. Requires host role exposure, progress/completion storage, branching logic. Precedents: Whatfix, Pendo, WalkMe (all separate "guides" from "training" as product tiers). Trigger: enterprise / multi-role / Workday-complexity products. **Do not collapse into v1 — route at the mode gate.**

---

## 4. GENERATE / ASK / AVOID

### GENERATE (by default)
- A 3–5 step (default 3–4), single-view spotlight tour with step 1 routed to the aha moment.
- A progress indicator ("3 of 5").
- `data-tour="<kebab-semantic-name>"` anchors (or `id="tour-<name>"` on NextStep), additive only.
- A dropped-in module (Shape A) on Driver.js (the default substrate).
- The 6-event analytics wiring + `TOUR_ANALYTICS.md` (events + host activation event + 7d/14d windows).
- A persistent, ungated replay entry point.
- An SSR guard in every emitted module.
- Onboarding-state reuse (extend the existing first-run flag).
- Benefit-led copy ≤25 words/step, register matched to audience.
- Theme matching the app's look.
- An anchor map + a `REVIEW_NEEDED.md` whenever the codemod skips elements.

### ASK (the human, always)
- **The aha moment** (confirm Phase 1's candidate).
- **Trigger model** + **"what other overlays fire on first login?"** (sequencing).
- **Substrate** — only to confirm the decision-tree result or resolve an override condition.
- **Mode** (walkthrough v1 / training v2) — confirm even when inferable.
- **Primary user role** when the product is role-diverse (may branch into two tours).
- **driver.js version** when on the config-only or NextStep path.
- **Resolution of every `REVIEW_NEEDED.md` item** before Phase 2 completes.
- Explicit approval if a tour wants to exceed 5 steps.

### AVOID (hard guardrails the plugin must enforce)
- **>5 steps** (warn + require explicit approval; suggest splitting into first-run + feature-discovery).
- **Auto-fire on raw page load** into existing onboarding debt; auto-once-no-replay (locks out the ~38% who dismiss in <4s).
- **Class-name anchoring** (CSS Modules hash / Tailwind utility).
- **Feature-labeling copy** ("This is the X"), directive condescension ("Click here"), >25-word tooltips.
- **Anchoring inside shadow DOM or cross-origin iframes** (hard walls).
- **Intro.js** (AGPL-3).
- **Auto-injecting anchors** into HOC / conditional-root / untyped-spread / dynamic / render-prop / third-party / conditional-SSR / CSS-Module-only / fragment-root cases — route to `REVIEW_NEEDED.md` instead.
- **Maintaining two emitter templates by default** — drop-in is the single template; config-only is the gated exception, not a co-equal mode.
- **Merging tour + training configs** (different schemas; route at the mode gate).
- **Don't build a tour at all when** any "don't-build" condition fires (Phase 1 step 6): <5 interactive surfaces · domain-expert audience · existing comprehensive onboarding · single-purpose tool · no stable selectors + no anchor pass · high-urgency context · CLI/code-surface product · untourable surfaces dominate · blank-canvas first-run (recommend empty-state/sample-data first).

---

## 5. Open risks carried into the build

What's still weak, and how to hedge.

1. **The step-ceiling's evidential basis is single-vendor.** The 72%/16% curve is Chameleon's own platform data, never independently replicated; the 2025 "550M" figure spans all in-app experience types, not tours alone, and the per-step numbers may be carried forward from the 2019 chart. **Hedge:** keep the 5-step ceiling (curve direction + cognitive-load theory are solid), but state it honestly in user-facing copy and docs — "conservative guardrail below a single-vendor observed cliff," not a proven constant. Don't headline the decimals.

2. **No control-group evidence that tours help.** Zero named public case studies of a tour beating a no-tour holdout; the strongest honest evidence (Slack/Notion/Canva rejecting tours) cuts *against* building. **Hedge:** this is exactly why the "don't build" verdict is first-class and why the success metric is downstream activation, not completion. The plugin must be willing to recommend against itself.

3. **ts-morph / jscodeshift JSX edge cases.** jscodeshift adds cosmetic extra parens (bug #534, triggers linter warnings) and silently skips custom components not on its tag whitelist; ts-morph's JSX APIs are underdocumented and fall back to blunt `.replaceWithText()` on spreads/fragments. **Hedge:** the four-gate AUTO-INJECT rule + mandatory `REVIEW_NEEDED.md` is the containment — automation only touches the provably-safe subset; everything ambiguous is human-gated. Run the host's linter/formatter after the codemod pass to absorb the cosmetic paren noise.

4. **Config-only (Shape B) silent version skew.** A stale JSON against a newer driver.js silently ignores renamed/removed keys (e.g., `onReset`→`onDestroyStarted` drops all analytics with no error). **Hedge:** Shape B is gated behind three conditions; when emitted, it must include a `// generated for driver.js ^1.x` header, a peer-dependency comment, and a runtime version guard in the bootstrap that warns if `major !== 1`.

5. **Cross-platform is open.** Web is proven; desktop / mobile-native / CLI are not. Mobile-web breakpoint behavior (responsive-layout failure mode) is unexamined. **Hedge:** scope v1 to web explicitly. State the boundary in the plugin's own docs so it doesn't silently overpromise.

6. **Co-presence / cross-view orchestration.** A selector tour can only highlight elements mounted in the current view. **Hedge:** v1 default = single view. Treat view-orchestration as a real v2 feature with real complexity — flag it, don't hand-wave it.

---

## 6. Recommendation to the build

What the `writing-plans` grand plan should prioritize, in order.

1. **Build Phase 1 discovery + the "should we build a tour?" verdict first — it's the differentiator.** Any tour vendor can emit a Driver.js config; the thing that makes Vibe-Walk trustworthy (and that a vendor would never ship) is the willingness to say "don't build one here." Make the verdict a real, weighted output of Phase 1, with the don't-build condition list as an explicit check. This earns the rest of the plugin.

2. **Ship the drop-in module path (Shape A) only for v1. Defer config-only to a flagged follow-up.** D2 is decided: one emitter template, loud failures, shadcn ownership model. Don't build two templates on day one — config-only is a gated exception serving a narrow profile (non-dev tour editors), not a co-equal mode. Building both up front doubles every future feature's surface.

3. **Make the anchor-injection codemod a contract, not a black box.** The four-gate AUTO-INJECT rule + `REVIEW_NEEDED.md` + the Phase-2 halt is the spine of trust here. jscodeshift `--parser tsx` default, ts-morph for strict-TS. Treat the readiness-bucket ratio (Phase 1) as the effort estimate the user sees before committing.

4. **Wire analytics from step one — don't repeat Celestia3's dark-data mistake.** The 6-event schema bound to substrate hooks + `TOUR_ANALYTICS.md` is non-optional output. Without it the tour's only measurable signal is the trap metric (completion). The whole success criterion is downstream activation; the instrumentation is what makes that measurable.

5. **Encode the honest framing of the step-ceiling into the plugin's own copy.** When the plugin warns about step count or explains its 5-step cap, it should cite the curve direction and theory, not a fake-precise "72%." The plugin's credibility tracks the honesty of its evidence — and the research is explicit that the numbers are directional, single-vendor, unreplicated.
