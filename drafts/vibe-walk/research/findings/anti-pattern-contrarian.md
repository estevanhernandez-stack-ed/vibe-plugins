# Anti-Pattern Contrarian — Research Findings

> **Persona:** Anti-Pattern Contrarian
> **Date:** 2026-05-21
> **Depth:** MEDIUM
> **Assignment:** 5 questions from `_questions.md` → Anti-Pattern Contrarian section
> **Purpose:** Feed Vibe-Walk guardrails — what the plugin must never generate

---

## Research summary

Five questions. All answered with named products, sourced claims, and production failure specifics. The throughline: product tours fail because they treat themselves as the product instead of serving the user's immediate goal. The failure modes cluster into four buckets — timing collisions, length overshoot, copy condescension, and selector fragility — and the "don't build it" signal is its own bucket that the field consistently under-serves.

---

## Q1 — Top documented complaints about product tours, with named products

**The dominant failure modes, named:**

**Slack** — Documented (UserGuiding teardown, 2024) as deliberately avoiding "big modals or several tooltips that users might just dismiss right away." Slack's design is explicitly structured to prevent fatigue. The implication: Slack studied what didn't work and built away from it. Earlier Slack product tour iterations were criticized in HN threads (hn/48028546) for re-showing tours to experienced users across new workspace setups.

**GitHub / Discord / Slack** (HN thread hn/48028546, 2024) — Repeatedly showing tours to users re-creating accounts. Experienced users who already know the product encounter the full first-run flow again. Cited as one of the most consistent complaints across forum comments.

**JIRA / Confluence (Atlassian)** (HN thread hn/48028546) — Forcing intro sequences on returning users. The specific criticism: modal interruption on re-entry, not just first-run. Atlassian's products are cited as repeated offenders for "you're being shown this again" fatigue.

**Heap** (UserGuiding bad-onboarding article, 2024) — Onboarding elements "crashed into each other" — overlapping modals making interaction impossible. A technical failure rather than a design one, but the user experience of it is indistinguishable from malice.

**Pendo** (UserGuiding bad-onboarding article) — Dumps excessive copy on users without proper formatting. The irony: Pendo is an onboarding and analytics platform. Their own onboarding used walls of unformatted text.

**Notion** (UserGuiding bad-onboarding article) — Mobile app prompts users to download the app they are already using. Logical inconsistency — the system doesn't know its own state.

**Spotify** (UserGuiding bad-onboarding article) — Tooltips pointing at wrong UI elements; inconsistent onboarding timing. Selector drift in production: the tour was built against one layout, the layout moved.

**Vieworks** (UserGuiding bad-onboarding article) — 14-step guide as first-run experience. The cited ceiling for where tours nosedive (5 steps, per Chameleon Benchmark 2025) is tripled here.

**Zoom** (HN thread hn/48028546) — Forcing update prompts when users need to join calls. The timing violation in its most brutal form: user has 20 seconds before a meeting starts; Zoom wants to show a walkthrough.

**Adobe CC suite — Lightroom, Acrobat, Photoshop** (HN thread hn/48028546) — Modal dialogs interrupting active workflow. Not onboarding specifically, but the same class of forced overlay at the wrong moment.

**Miro / Figma** (HN thread hn/48028546) — Multiple overlapping notifications and modals cited in community comments.

**Apple** (UserGuiding bad-onboarding article) — Inconsistent approach: full-screen modals mixed with isolated tooltips across different apps. Not a single failure mode; a coherence failure.

**The HN meta-complaint** (hn/48028546 and hn/32507041): Users enter "get out of the tutorial at any cost" mode and start scrambling for a hide, skip, or close button. If they don't find one quickly, they close the app and give it a 1-star rating for having unskippable tutorials. This was documented as a concrete behavioral pattern in 2022, remains consistent in 2024 threads.

---

## Q2 — Modal fatigue threshold: how many overlays before users habitually dismiss everything?

**Hard threshold — 1 modal stacked on another:**

The field consensus (LogRocket, Smashing Magazine, Plotline 2026) is that using more than one modal consecutively annoys users and decreases overall engagement. Not "many modals" — just two in sequence is the documented trigger for learned dismissal.

**Quantitative data (Chameleon User Onboarding Benchmark Report 2025):**

- 38% of users close modals within 4 seconds — before they've read the content
- Only 37% of dismissals AND 40% of completions occur after 10+ seconds; the first 4 seconds determine most outcomes
- Well-timed modals (triggered by specific user action, not auto-fire) can achieve ~47% completion
- User-triggered tours double engagement compared to automated blanket-triggered tours
- Tours exceeding 5 steps see completion rates "nosedive sharply," losing more than half of users
- Top 1% of performing tours stayed under the 5-step limit

**The "guidance fatigue" behavioral mechanism:**

Chameleon (2025) documents "guidance fatigue" — a learned behavior where users automatically dismiss instructional elements without processing their content. Only 11.2% of static tooltip appearances result in users taking the suggested action. The mechanism is Pavlovian: enough false-alarm interruptions and the user's finger moves to the X before reading. This is indistinguishable from banner blindness.

**The stacking multiplier:**

The research points consistently to this rule: each additional overlay layer reduces the effectiveness of all subsequent ones. A welcome modal + cookie consent banner + product tour tooltip + chat widget pop-up is the full stack. By the time the tour fires, the user's dismiss reflex is already warm. Celestia3's lesson — gate the tour to fire *after* the welcome modal, not simultaneously — is the correct mitigation, but even sequencing doesn't reset a user who's already annoyed.

**Sourced data gap:** No study provides a precise "N overlays = X% completion collapse" curve. The Chameleon threshold (>5 steps = majority abandon) is the closest numeric anchor. The "2 consecutive modals = degraded engagement" is the qualitative threshold with the most consistent expert backing. Mark any stronger precision claim `[unverified]`.

---

## Q3 — What makes tour copy patronizing? Bad patterns vs better alternatives

**The identified failure register:**

HN thread commentary (hn/48028546) named this explicitly: tour copy that makes users "feel like 5 year olds" — the canonical example cited is "THIS IS THE SEARCH BAR" for an audience that has used search bars for 25 years. The failure is explaining what a thing is to a user who already knows what a thing is.

**Failure pattern taxonomy:**

| Bad pattern | Why it fails | Named offender |
|---|---|---|
| Feature-labeling copy: "This is the Dashboard" | Describes what users can see; adds zero value | Generic — cited in Appcues, Userpilot, UserGuiding teardowns without naming one company |
| Directive condescension: "Click here to begin" | Treats adults as children; assumes they don't know how to click | Sony forced-onboarding pattern (HN hn/48028546, July 2023) |
| Wall-of-text tooltips | Cognitive overload; most copy goes unread when unformatted | Pendo (UserGuiding bad-onboarding article, 2024) |
| Stating the obvious for domain experts | "The chart shows your data" to users who built the chart | Generic but consistent across SaaS B2B complaints |
| Over-instructed empty verbs: "Let's get started!" | Filler; no information content | Appcues bad-onboarding article (pattern, not named company) |

**The reading-level trap:**

Writing copy at a "simple language" level for a technical B2B product signals to expert users that the product doesn't know its own audience. Pendo — an onboarding platform — demonstrated this by delivering walls of unformatted text in their own onboarding flow. The irony is load-bearing: if the company building the onboarding tool can't write good onboarding copy, the signal about difficulty is clear.

**Better alternatives (sourced from Appcues, Userpilot, UserGuiding):**

- Benefit-led over feature-descriptive: "See every data source in one view" vs "This is the Data panel"
- Outcome-anchored: "Add your first workspace to start tracking" vs "Click here to add a workspace"
- Contextual, not sequential: fire the copy when the user needs it, not in order 1→2→3
- Assume competence by default, explain only the non-obvious

**The B2C vs B2B split:**

For technical users (developer tools, data platforms, admin dashboards), the patronizing threshold is lower. GitHub's documented approach — minimal, sparse, one-card tours that link to docs — is calibrated for an audience that reads documentation and resents being shown what a button does. Consumer apps like Canva or Dropbox earn more latitude for explanatory copy because their audiences span all skill levels.

---

## Q4 — How selector-based tours break in production

Five documented failure modes, ordered by frequency in the field:

**1. AJAX / lazy-load timing mismatch (most common)**

Shepherd.js GitHub issue #1201 (shipshapecode/shepherd) documents this exactly: tour steps built against dynamically loaded table data via AJAX calls fail inconsistently — the highlight box doesn't cover the content even when the popup and arrow position correctly. Root cause: Shepherd calculates element dimensions at step-fire time; if the element's content hasn't fully loaded yet, the bounding box is wrong. No documented workaround in the issue thread. The failure is non-deterministic: same AJAX call pattern, same step, different outcomes depending on load timing.

Shepherd.js issue #319 (shipshapecode/shepherd): scrolling to an element causes the modal overlay to appear in the wrong place — covering where the element *was* before scroll, not where it is. The library doesn't recompute position on scroll.

**2. Hashed / utility class selectors (Tailwind, CSS Modules)**

Product tour libraries anchor to CSS selectors. Tailwind generates utility classes that are semantically meaningless as anchors (`flex items-center text-sm`). CSS Modules generate hashed class names per build (`_button_x7f3a`). Both change unpredictably across builds. A tour config that anchored to `.dashboard-sidebar` breaks if that class is renamed, purged, or replaced. This is the most common production breakage pattern for tours built against CSS Modules apps without explicit anchor prep.

Mitigation that works: `data-tour="element-name"` attributes or stable `id` values. These survive class renames and build changes. The mitigation requires anchor-injection as a deliberate step — it doesn't happen automatically.

**3. Shadow DOM encapsulation**

CSS variables and selectors do not cross the Shadow DOM boundary. If the host app uses Web Components with Shadow DOM (lit-element, Stencil, native custom elements), a tour library querying the outer document cannot see elements inside shadow roots. `document.querySelector('#my-element')` returns null when the element is inside a shadow root. There is no general workaround short of the tour library itself being built into the shadow component — which defeats the purpose of a standalone tour layer.

Documented in Tailwind issues #15556 and #15799: even CSS variable propagation breaks at the shadow boundary. Tour library highlight overlays are a harder problem than CSS variables.

**4. Cross-origin iframes**

Same-origin policy (SOP) blocks JavaScript in the parent document from reading or manipulating elements inside cross-origin iframes. Tour libraries that work by querying and overlaying DOM elements cannot highlight elements inside iframes from a different origin. `postMessage` can theoretically coordinate parent-to-iframe state, but requires the iframe's origin to cooperate. Most third-party embedded content (embedded dashboards, embedded payment widgets, embedded map providers) will never cooperate.

This is a hard wall, not a soft failure. If a tour stop needs to point at something inside a cross-origin iframe, the tour cannot be built.

**5. Responsive layout shifts / breakpoint-conditional rendering**

At mobile breakpoints, many apps hide elements (collapsed navs, off-canvas sidebars, stacked panels) that are visible on desktop. A tour built and tested at 1280px may fire a step pointing at an element that is `display: none` or conditionally unmounted at 375px. The library either renders a tooltip with no visible anchor (floating in void) or crashes the step silently.

The v1 default for Vibe-Walk (single-view tours on desktop layouts) partially mitigates this, but mobile-first apps or apps that must work across breakpoints need explicit conditional step logic per viewport, or must restrict tours to desktop-only explicitly.

**Less common but documented:**

- z-index wars: the tour's spotlight overlay gets buried under a sticky header or a modal with `z-index: 9999`. The overlay renders but is invisible to the user.
- SSR hydration timing: Next.js and Remix apps render HTML server-side; interactive components hydrate asynchronously. A tour that fires immediately on page load may target pre-hydration placeholder elements and get the wrong bounding box.

---

## Q5 — The strongest argument against generating a tour for a given app

**The field consensus (non-promotional sources):**

Multiple designers and UX writers have articulated this: building a tour is sometimes an admission that the UI has a UX problem. If users need a guided tour to understand where to click, the tour is treating the symptom, not the disease. The correct first question is not "how do we build the tour" but "why does the product need one."

Cited formulation (UX Patterns for Developers, ui-patterns.com): "a product tour should solve a real problem for the user onboarding process and make the experience smoother. If it doesn't, skip it."

Designer community consensus (Medium/Helppier, referenced in search results): many product designers hold that interactive walkthroughs are "derogatory to website/web-app design" — the presence of a tour signals the product isn't self-explanatory. This view is a minority position in the field, but it surfaces consistently in design forums and is worth encoding as a friction signal.

**The strongest single argument:**

A product tour that fires on top of an already-intuitive UI trains users to dismiss all overlay content. The activation cost of a bad tour is not zero — it's negative. Users who skip a tour for a product they already understand exit their first session having learned that "dismiss everything that pops up here." That conditioned reflex will suppress future contextual help, in-app announcements, and even error modals they should actually read. The tour did net damage.

**Product / audience signals that mean "don't build this":**

1. **The app has fewer than ~5 interactive surfaces.** If a user can see everything from the landing state, a tour explains less than a glance does.

2. **The intended audience consists of domain experts who chose the app specifically because they know the domain.** A code editor, a developer dashboard, a financial analytics tool for traders — these users resent being told what "the chart" does. GitHub's documented pattern (sparse, one-card, optional, links to docs) is the correct calibration; a 6-stop spotlight tour is too much.

3. **The app already has effective onboarding in another form.** Empty state guidance, inline placeholder copy, Slackbot-style conversational onboarding, sample data, or an interactive first-run wizard that teaches by doing — any of these can fully substitute for a spotlight tour. Adding a tour on top creates duplication and fatigue.

4. **The app has high abandonment at the tour itself in prior analytics.** If a previous tour showed >80% drop-off at step 2, the correct response is not "redesign the tour" — it's to question whether the tour should exist at all and whether the product has a clarity problem that a tour cannot fix.

5. **The primary users access the app in high-urgency contexts** — joining a call, filing a form, viewing a time-sensitive report. Tours that fire in urgency contexts are the Zoom problem: a user who needs to be somewhere in 20 seconds does not want a spotlight overlay.

6. **The app is a single-purpose tool.** A calculator, a timer, a single-action form — the learning curve is the time it takes to read the one button.

7. **The selector-readiness verdict is "anchor injection required everywhere."** If Phase 1 finds that no component has stable selectors and the entire app would need to be edited to support tour anchors, the engineering cost may exceed the activation benefit. This is a pragmatic argument, not a UX one, but it's a real stopping condition.

---

## Patterns

- **The stacking problem is universal.** Every criticized product that made the news did so by firing a tour into a session already carrying onboarding debt (welcome modal + cookie banner + chat widget + feature announcement). The tour isn't evaluated in isolation — it's evaluated as the fifth thing that interrupted the user today.
- **Fatigue is learned, not innate.** Users aren't born dismissing overlays. Each irrelevant interruption trains the reflex. The Chameleon 38%-in-4-seconds stat is the result of that training, compounded across thousands of apps.
- **The technical failures are timing failures.** AJAX content, lazy-loaded panels, SSR hydration, scroll position — every selector-based tour breakage reduces to: the element was not where the library expected it to be at step-fire time. The fix in every case is the same: defer step execution until the target element is confirmed mounted and in view.
- **Copy fails the moment it explains what a user can already see.** Feature-labeling copy ("This is the Dashboard") is the canonical failure. The label is visible. The tooltip adds nothing.
- **"Don't build it" is underleveraged.** The entire product tour industry has commercial incentive to argue for building tours. The anti-argument — that a tour is sometimes a sign of product debt, not a cure — surfaces mainly in design forums and HN threads, not vendor blogs. Vibe-Walk must encode this argument as a first-class Phase 1 output.

---

## Real named examples

| Product | Failure mode | Source |
|---|---|---|
| Heap | Overlapping modals — technical crash during onboarding | UserGuiding bad-onboarding article (2024) |
| Pendo | Wall-of-text tooltips, unformatted copy | UserGuiding bad-onboarding article (2024) |
| Vieworks | 14-step first-run guide (nearly 3× the documented ceiling) | UserGuiding bad-onboarding article (2024) |
| Notion (mobile) | Prompts user to download the app they are already using | UserGuiding bad-onboarding article (2024) |
| Spotify | Tooltips pointing at wrong UI elements; inconsistent timing | UserGuiding bad-onboarding article (2024) |
| Atlassian (JIRA/Confluence) | Forces intro sequences on returning users | HN thread hn/48028546 (2024) |
| Zoom | Update prompt fires when user needs to join a call in <20 seconds | HN thread hn/48028546 (2024) |
| GitHub / Slack / Discord | Re-shows tour flow to experienced users creating new accounts | HN thread hn/48028546 (2024) |
| Adobe CC (Lightroom, Acrobat, Photoshop) | Workflow-interrupting modal dialogs | HN thread hn/48028546 (2024) |
| Apple | Inconsistent onboarding style across apps (full-screen modals mixed with isolated tooltips) | UserGuiding bad-onboarding article (2024) |
| Shepherd.js (library) | AJAX-loaded content: highlight box doesn't cover dynamically populated table even when popup/arrow position correctly | GitHub issue #1201, shepherd-pro/shepherd |
| Shepherd.js (library) | Scroll-position mismatch: overlay covers where element *was* before scroll | GitHub issue #319, shipshapecode/shepherd |
| Sony (hardware setup) | Forces full onboarding on every new device — cited as worse than Apple's non-forced approach | HN thread hn/48028546 (July 2023) |

---

## What works

- **User-triggered tours double engagement vs auto-fire** — Chameleon Benchmark 2025. The user opted in; they're primed to receive the content.
- **Tours under 5 steps.** All top 1% performing tours in Chameleon's dataset stayed under the 5-step limit. Completion drops sharply above that ceiling.
- **Progress indicators improve completion by 12%** — Chameleon 2025. Users who know they're at step 3 of 4 behave differently than users who don't know when it ends.
- **Triggering after user action** (specific interaction, not page load) produces well-timed tours that can reach ~47% completion — vs automatic tours at much lower rates.
- **Sequencing after existing onboarding.** Celestia3's hard-won lesson: fire the tour *after* the welcome modal, not simultaneously. This is also the canonical pattern in Chameleon's best-practice guidance.
- **Sparse, optional tours for expert audiences.** GitHub's pattern — minimal, one-card, section-specific, links to docs — is documented as effective for technical users who prefer self-directed exploration. [Source: userpilot.com product tour examples article, 2025]
- **Benefit-led copy** ("See every data source in one view") outperforms feature-description copy ("This is the Data panel") — consistent across Appcues, Userpilot, UserGuiding documentation.
- **data-tour attributes and stable id conventions** make selector-based tours resilient to Tailwind class changes, CSS Module hash changes, and build-time renames. They are the only reliable anchor strategy across frameworks.
- **Embedded experiences over pop-ups** produce 1.5× more action likelihood — Chameleon 2025. Contextual in-page guidance that doesn't block the UI outperforms overlay-based tours for sustained engagement.

---

## What fails

- **More than 5 steps** — majority of users bail. Documented ceiling from Chameleon 2025.
- **Auto-fire on page load into a session carrying existing onboarding debt** — the stacking problem. Each prior overlay reduces completion probability for the next.
- **Re-firing tours to returning users** — GitHub, Slack, Discord cited in HN threads as the most persistent complaint from technical users.
- **Unskippable or hard-to-dismiss tours** — users enter "find the X at any cost" mode; the product gets 1-star reviews for it. HN thread hn/48028546, consistently documented since 2022.
- **Tours built against hashed or utility class selectors without anchor prep** — Tailwind and CSS Module apps break tour selectors on rebuild. Not a maybe; a when.
- **Selector-based tours anchoring to elements inside shadow DOM** — JavaScript from the parent document cannot cross the shadow boundary. Hard wall, no workaround without library-level shadow DOM support.
- **Tours anchoring to cross-origin iframe content** — same-origin policy blocks DOM access. The step simply cannot highlight what it intends to.
- **Lazy-loaded / AJAX-populated content at step-fire time** — Shepherd.js issue #1201 documents this exactly. Non-deterministic failure: works sometimes, breaks silently on timing misses.
- **Feature-labeling tooltip copy** — explains what users can already see. Trains dismiss reflex without delivering value.
- **Tours for expert or domain-specialist audiences using consumer-oriented instructional copy** — makes users feel condescended to. B2B technical products are particularly sensitive to this.
- **Firing a tour in high-urgency contexts** — Zoom's documented pattern. User need (joining a call now) is incompatible with tour patience.
- **Tours as a UX debt patch.** If the product needs a tour because the UI is confusing, the tour does not fix the confusion; it masks it. Downstream: the confusion re-emerges without the tour (mobile view, direct URL, API access), and users who complete the tour still can't use the product without it.

---

## Implications for Vibe-Walk

### Guardrail checklist (encode in Phase 1 and Phase 2)

**Phase 1 — Before building anything:**

- [ ] **Existing onboarding audit is mandatory.** Detect welcome modals, cookie banners, onboarding wizards, Slackbot-style flows, empty state guidance, interactive tutorials, inline placeholder copy. If comprehensive guidance already exists, surface a "duplication risk: HIGH" flag and require explicit user confirmation before proceeding.
- [ ] **Selector readiness verdict gates effort estimate.** If no component has stable `id` or `data-*` anchors and the full app would require anchor injection, flag this explicitly: "Anchor prep required for all N target components — estimate is config + component edits, not config only."
- [ ] **Shadow DOM scan.** If the app uses Web Components, custom elements, or any library that encapsulates DOM (lit-element, Stencil), flag the affected surfaces as "untourable without library cooperation." Do not attempt to anchor tour steps inside shadow roots.
- [ ] **Cross-origin iframe scan.** Identify any embedded third-party iframes in candidate tour-stop areas. Flag those surfaces as "inaccessible to selector-based tour — hard wall."
- [ ] **Audience/complexity assessment.** If the intended audience consists of domain experts or technical practitioners (developers, analysts, traders, administrators), recommend the GitHub pattern: sparse, optional, section-specific, links-to-docs. Flag a 6-stop auto-fire tour as a mismatch for this audience.
- [ ] **Surface count check.** If the app has fewer than 5 meaningful interactive surfaces visible from the landing state, generate a "no tour needed" recommendation with rationale. A glance does what a tour would do.
- [ ] **Urgency context check.** If the app's primary use case is task-completion in a time-sensitive context (joining meetings, filing forms, viewing live data), flag the auto-fire trigger model as HIGH RISK. Recommend on-demand/replay-only instead.

**Phase 2 — While building:**

- [ ] **Hard step ceiling: 5.** Generate no more than 5 steps in the default output. If the user's scope requires more, surface a warning and ask for explicit approval: "6+ steps are above the documented completion threshold. Consider splitting into two tours (first-run + feature-discovery)."
- [ ] **Trigger sequencing.** Auto-fire must be gated to fire *after* any detected existing onboarding (welcome modal, flyby, wizard). Never fire simultaneously.
- [ ] **Lazy-load guard.** Any step anchoring to content that loads asynchronously (AJAX tables, lazy panels, route-gated views) must include a wait-for-element check before advancing. Do not anchor to a selector; anchor to a "selector + confirmed-mounted" condition.
- [ ] **Mobile viewport check.** If tour stops target elements that are conditionally hidden or unmounted at mobile breakpoints, either (a) restrict the tour to desktop-only with a viewport gate, or (b) generate separate step configs per breakpoint. Never silently skip a step when the element is missing.
- [ ] **Anchor strategy enforcement.** Generated step configs must anchor to `id` attributes or `data-tour` attributes. Never anchor to Tailwind utility classes, CSS Module hash classes, or tag+class combinator selectors that are not stable across builds.
- [ ] **Copy register check.** Flag or rewrite any generated tooltip copy that (a) describes what the user can already see ("This is the X panel"), (b) uses directive condescension ("Click here to begin"), or (c) exceeds 25 words per tooltip. The default register is benefit-led and assumes competence.
- [ ] **z-index audit.** Before emitting a tour config, check whether the app has fixed-position elements (sticky headers, modals, chat widgets) that may have z-index values conflicting with the tour overlay. Surface the conflict; do not assume the tour renders on top.

### "Don't build a tour when..." list

The plugin should surface a "no-tour" recommendation with this rationale when any of the following are true:

1. **The app has fewer than 5 interactive surfaces visible from the landing state.** The tour explains less than a glance.
2. **The app already has comprehensive onboarding** (welcome wizard + empty state guidance + inline contextual tooltips) that covers the same surfaces. Building on top creates stacking fatigue with no new value.
3. **The intended audience consists of domain experts who chose this tool because they know the domain.** Developer tools, financial platforms, admin panels, analytics dashboards for analysts. The tour will condescend.
4. **The app is a single-purpose tool.** Timer, calculator, single-action form. There is nothing to tour.
5. **The anchor-readiness verdict is "no stable selectors anywhere."** Engineering cost exceeds activation benefit unless the user explicitly accepts the anchor-injection scope.
6. **The primary use context is high-urgency task completion.** Tour fires exactly when the user has the least patience for it.
7. **Prior tour analytics show >80% drop-off at step 2 and the user is asking to rebuild the tour.** The correct answer is: the tour is not the problem; the product may have a clarity issue the tour cannot fix. Surface this before building again.
8. **Any candidate tour stop is inside a cross-origin iframe or shadow DOM encapsulation boundary.** Those surfaces are untourable. If they represent the core value prop, there is no viable tour.

---

*Sources consulted:*
- [Why Most Product Tours Get Skipped | Hacker News thread](https://news.ycombinator.com/item?id=48028546)
- [Driver.js HN thread](https://news.ycombinator.com/item?id=36846520)
- [UserGuiding — Bad Onboarding Experience](https://userguiding.com/blog/bad-onboarding-experience)
- [Chameleon User Onboarding Benchmark Report 2025](https://www.chameleon.io/benchmark-report)
- [Shepherd.js issue #1201 — dynamic content inconsistency](https://github.com/shipshapecode/shepherd/issues/1201)
- [Shepherd.js issue #319 — scroll position overlay mismatch](https://github.com/shipshapecode/shepherd/issues/319)
- [Appcues — bad user onboarding](https://www.appcues.com/blog/bad-user-onboarding)
- [UserGuiding — Slack onboarding teardown](https://userguiding.com/blog/slack-user-onboarding-teardown)
- [UI Patterns — Guided Tour pattern](https://ui-patterns.com/patterns/Guided-tour)
- [Tailwind / Shadow DOM compatibility issues — GitHub #15556](https://github.com/tailwindlabs/tailwindcss/discussions/15556)
- [Userpilot — product tour best practices](https://userpilot.com/blog/create-product-tours/)
- [SaasFactor — Why Most Product Tours Fail](https://www.saasfactor.co/blogs/why-most-product-tours-fail-and-how-to-implement-contextual-onboarding)
