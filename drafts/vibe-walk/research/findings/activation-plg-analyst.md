# Activation / PLG Analyst — Findings
> **Researcher role:** Activation / PLG Analyst
> **Date:** 2026-05-21
> **Assignment:** Six questions on what makes onboarding tours convert — metrics, completion data, failure modes, time-to-value, opt-in vs auto-fire, and analytics event schema.
> **Depth:** DEEP
> **Status:** FINAL

---

## Research questions answered

### Q1 — What activation metrics do PLG / product teams actually use?

The PLG measurement stack has a short primary list and a longer supporting one.

**Primary metrics — what teams actually optimize:**

- **Time-to-First-Key-Action (TTFKA)** — how long from signup to the user completing the activation milestone (e.g., sent first message, created first project, imported first dataset). Userpilot's 2024 benchmark across 547 SaaS companies found the average TTV is **1 day, 12 hours, 23 minutes**. Every hour beyond a user's first session increases uncertainty and erodes trust. Source: [Userpilot TTV Benchmark 2024](https://userpilot.com/blog/time-to-value-benchmark-report-2024/).

- **User Activation Rate** — the percentage of signups who complete the defined activation milestone. Userpilot's 2024 report across 62 B2B companies found the average is **37.5%**, with the median also at 37%. Industry variance is dramatic: AI/ML products hit 54.8%; FinTech and insurance hit 5%. Source: [Userpilot Activation Rate Benchmark 2024](https://userpilot.com/blog/user-activation-rate-benchmark-report-2024/).

- **Feature Discovery Rate** — the percentage of users who engage with a specific feature within a defined window (usually 7 or 14 days). Pendo's feature adoption analytics tracks first-use cohorts and can apply a "guide viewers" segment to determine how much a specific guide accelerated first-use vs. the baseline cohort. Source: [Pendo Feature Adoption](https://www.pendo.io/product/features/feature-adoption-analytics/).

- **Day-7 / Day-30 Retention** — the percentage of activated users who return 7 and 30 days after first activation. Pendo's retention analytics lets teams apply cohort filters (e.g., "users who saw onboarding guide X") and compare against the full population. Recommended attribution windows: **7–14 days** for guide experiments. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).

- **Tour Completion Rate** — the percentage of users who complete all steps of a guided tour without skipping. Used as an engagement proxy but explicitly not a success metric on its own (see Q3).

- **Free-to-Paid Conversion Rate** — Appcues cites an average of **14%** for free-to-paid conversion in SaaS products. Tours are measured against this as a downstream outcome. Source: [Appcues Onboarding Guide](https://www.appcues.com/blog/the-ultimate-guide-to-product-onboarding).

**Tools that instrument these metrics:**

- **Amplitude** — retention curves, funnel breakdowns, activation rate improvements, A/B holdout experiments. Best-in-class for event-based cohort analysis and predictive analytics. Source: [Amplitude Product Tour Software](https://amplitude.com/compare/best-product-tour-software-growth-teams).

- **Mixpanel** — event-based product analytics, funnel analysis, feature adoption tracking. Stronger for real-time self-serve insight; better fit for smaller/mid-size teams than Amplitude's enterprise tier. Source: [Mixpanel PLG Guide](https://mixpanel.com/blog/product-led-growth/).

- **Pendo** — purpose-built for in-app onboarding measurement. Uniquely integrates guide delivery + analytics, enabling cohort comparison of "users who saw guide" vs. full population on the same retention/adoption dashboards. Offers native A/B testing (Guide Experiments) with 95% confidence thresholds and 7–14 day attribution windows. Source: [Pendo Guide Metrics](https://support.pendo.io/hc/en-us/articles/26251637016219-Guide-metrics).

- **Appcues** — flow-level analytics including step-by-step drop-off, goal tracking, and integration with Mixpanel, Heap, and Amplitude. Fires built-in `Flow Started`, `Flow Completed`, and `Step Skipped` events to downstream analytics. Source: [Appcues Analytics](https://www.appcues.com/university/appcues-basics/analytics-and-integrations).

---

### Q2 — What does the data say about tour completion rates in the wild?

**Aggregate benchmarks (Chameleon benchmark, 550M+ interactions):**

| Tour length | Completion rate |
|---|---|
| 3–4 steps | 72–74% |
| 5 steps (max optimal) | "Top 1% performer" threshold |
| 7+ steps | **16%** |

Source: [Chameleon Benchmark Report 2025](https://www.chameleon.io/benchmark-report); confirmed by [Appcues blog](https://www.appcues.com/blog/the-ultimate-guide-to-product-onboarding).

**Trigger-type effect on completion:**
- User-triggered (opt-in) tours: **~2x the engagement** vs. auto-triggered blanket tours
- Behavior/event-triggered (smart timing): **2–3x** vs. time-delayed auto triggers
- Checklist-triggered tours outperform time-delayed tours by **21%**

Source: [Chameleon Benchmark 2025](https://www.chameleon.io/benchmark-report).

**Progress indicator effect:** Adding a progress indicator (step 2 of 4) improves completion by **~12%**.

**Overall landscape:** Chameleon's benchmark across 550M interactions found the average tour completion rate is **61%** when tours are 3–4 steps and well-targeted. When considering all tours in the wild (including long, untargeted ones), the picture is bleaker — multiple sources report that **nearly 70% of users skip traditional linear product tours**. The claim that "76.3% of static tooltips are dismissed within 3 seconds" is widely circulated and attributed to Amplitude's 2024 Product Analytics Report, but could not be verified against the original Amplitude publication. **[unverified — mark with suspicion; do not cite in downstream materials without primary source]**

**Product-specific data:**
- Pendo Guide Experiments documented an **18% increase in event registrations** when a text-only guide was replaced with a guide that included a 10-second video preview. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).
- Launcher-driven tours (where users pull up the tour themselves) reach **~67% completion** vs. lower rates for auto-shown pop-ups. Source: [Chameleon effective tour metrics](https://www.chameleon.io/blog/effective-product-tour-metrics).

---

### Q3 — When do onboarding tours *hurt* activation?

This is the most important question for Vibe-Walk's guardrails. The evidence is clear: tours frequently hurt activation, and the failure modes are specific.

**Documented failure modes:**

**1. One-size-fits-all targeting.** A single tour designed for all users fails for every segment. A tour designed for admins setting up a workspace actively confuses end users experiencing the product for the first time. The result: poor relevance, high skip rate, and distrust. Source: [Guideflow best practices](https://www.guideflow.com/blog/product-tour-best-practices).

**2. Length-driven abandonment — the cliff at step 5.** Tours with 5+ steps lose more than half of users. This is not a linear drop — it's described as a "nosedive." The research from Chameleon's 550M-interaction dataset is unambiguous. Five or fewer steps is the ceiling, not a suggestion. Source: [Chameleon Benchmark 2025](https://www.chameleon.io/benchmark-report).

**3. Completion ≠ activation.** Tours can have strong completion rates while producing zero activation lift — a case Guideflow explicitly identifies. "Raw completion rates without an activation comparison tell you how engaging the tour is, not whether it's working." Tours that teach users to click UI elements without connecting those clicks to value are engagement-theater. Source: [Guideflow product tour best practices](https://www.guideflow.com/blog/product-tour-best-practices).

**4. Wrong trigger timing.** Tours auto-fired before the user has oriented to the product — or before an existing welcome modal/flyby sequence completes — create overlay collision that causes users to dismiss everything, including content they might have engaged with. The Celestia3 cowpath documented this directly: the tour had to sequence *after* the existing flyby + welcome modal to avoid piling on.

**5. Forced/unskippable tours.** "Nearly 70% of users skip traditional, linear product tours" that feel imposed. Optional tours with visible exit options see **123% higher completion** among users who choose to engage. The paradox: making a tour skippable increases the quality of the completion population. Source: [Guideflow product tour best practices](https://www.guideflow.com/blog/product-tour-best-practices).

**6. Outdated anchors / "onboarding rot."** Tours pointing to moved UI elements, renamed labels, or features behind a paywall wall actively harm user confidence. "Broken steps destroy trust faster than no tour at all." Source: [Guideflow product tour best practices](https://www.guideflow.com/blog/product-tour-best-practices).

**7. Tours for expert users.** When users already understand the product's value (power users, returning churned users, users who were referred by an existing user with a specific task), a tutorial tour is patronizing and adds friction without value. Slack, Notion, and Canva — three of the most successful PLG products — **do not use spotlight tours as a primary onboarding mechanism**. They rely on behavioral triggers, inline hints, and template-first flows instead. Source: [Venue: Slack/Notion/Canva PLG Playbook](https://venue.cloud/news/insights/from-signup-to-sticky-slack-notion-canva-s-plg-onboarding-playbook).

**Control group evidence (what exists):**
- A single-step tooltip anchored to the key action has been documented to outperform a 6-step guided tour in activation lift for certain product types [unverified — no named product or peer-reviewed study located; sourced from tour vendor commentary].
- Pendo Guide Experiments methodology explicitly calls for a **10–20% holdout group** to run clean no-tour control comparisons. This suggests the field has learned that "before/after" comparisons without holdouts are unreliable — which implies the industry knows tours can disappoint vs. control. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).
- **Direct named case study of tours hurting activation:** None located with public-facing data. This absence is itself signal — vendors who sell tour tooling don't publish the "our tool hurt your activation" cases. The strongest honest evidence is negative-space: Slack, Notion, Canva all rejected the tour model at scale.

---

### Q4 — What is the time-to-value argument for spotlight tours specifically?

**The case for tours:**

Interactive product tours have been shown to increase feature adoption by **42%** and interactive onboarding flows achieve **50% higher activation rates** vs. static tutorials. The mechanism: users learn-by-doing in context rather than reading docs and trying to correlate instructions to UI. Source: [UserGuiding stats](https://userguiding.com/blog/user-onboarding-statistics).

**The case against (self-directed exploration):**

The counterfactual — self-directed exploration — wins when the product's value is visible, the UI is obvious, or the user has domain expertise. Slack, Notion, and Canva are the clearest examples: all three drive activation through **behavioral triggers and templates** rather than spotlight walkthroughs. Slack's aha-moment (2,000 messages sent ↔ 93% retention) is reached through Slackbot conversation, not a step-by-step tour.

**The resolution — it's user-type-dependent:**

The evidence points to a segmentation model, not a universal answer:

- **Power users / referred users / technical audiences:** Self-directed exploration outperforms. Contextual tooltips (behavior-triggered single hints) perform better than walkthroughs.
- **New-to-category users / SMB users / multi-player onboarding:** Guided tours accelerate TTV by showing the path to the first key action that unlocks value.
- **The product-complexity axis:** Simple, single-player products (Canva) can get away without tours. Multi-player, workflow-dependent products (project management, CRM) benefit from structured walkthrough because the aha moment requires a workflow, not a single click.

Source: [Appcues self-directed learning](https://www.appcues.com/blog/self-directed-learning-user-onboarding); [SaaS Designer guided vs self-service](https://saasdesigner.com/self-service-vs-guided-onboarding-which-works-best-for-saas/).

**Average TTV across SaaS:** 1 day, 12 hours, 23 minutes (Userpilot, 547 companies). Cutting TTV by 20% was correlated with an **18% ARR growth lift** for mid-market SaaS in a 2024 Amplitude study [unverified — sourced from secondary citation, original Amplitude report not directly fetched].

---

### Q5 — Does tour opt-in vs auto-fire produce meaningfully different outcomes? Is there a PLG consensus?

**Yes — and the gap is large.**

The data from Chameleon's benchmark (550M interactions) is the clearest evidence:

- **User-triggered tours:** ~2x engagement vs. auto-triggered blanket tours
- **Behavior/event-triggered ("smart triggers"):** 2–3x completion vs. time-delayed auto-fire
- **Launcher-driven tours** (user pulls up the tour): ~67% completion

**The consensus position (2024–2025):**

The PLG community has moved toward **behavior/event-triggered** as the default, with pure auto-fire reserved for explicit first-run moments where context is unambiguous (e.g., the first time a user lands on a blank dashboard, nothing else is competing for attention). This is not the same as "opt-in only" — it's "auto-fire when context is right."

The formulation that has emerged: **auto-once + skippable + replay** is the pragmatic default. Auto-fires exactly once, surfaced at the right behavioral trigger (post-onboarding-modal, post-first-login, post-first-feature-use), always skippable, with a persistent replay entry so users who skip can return.

This matches the Celestia3 cowpath exactly (auto-once with replay, sequenced after the existing welcome modal).

**What PLG does not recommend:**

- Auto-fire on every login until completion
- Auto-fire competing with other overlays (chat widget + cookie consent + welcome modal + tour = every user dismisses everything)
- Forcing tour completion before accessing the product

Source: [Chameleon Benchmark 2025](https://www.chameleon.io/benchmark-report); [Userpilot checklist completion benchmark](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/).

---

### Q6 — What analytics hooks does Vibe-Walk need to recommend the host app instrument?

**The minimum viable event schema:**

The industry's two most referenced platforms (Appcues and Pendo) converge on this event set:

| Event name | When fired | Key properties |
|---|---|---|
| `tour_started` | User sees step 1 (first display) | `tour_id`, `user_id`, `trigger_type` (auto / manual), `timestamp` |
| `tour_step_viewed` | Each step rendered | `tour_id`, `step_index`, `step_label`, `user_id`, `timestamp` |
| `tour_step_advanced` | User clicks "Next" / advances | `tour_id`, `step_index`, `user_id`, `timestamp` |
| `tour_skipped` | User dismisses before completion | `tour_id`, `step_index_at_skip`, `user_id`, `trigger_type`, `timestamp` |
| `tour_completed` | All steps finished | `tour_id`, `user_id`, `time_to_complete_ms`, `timestamp` |
| `tour_replayed` | User triggers replay (not first-run) | `tour_id`, `user_id`, `replay_source` (menu / prompt), `timestamp` |

**What Appcues fires automatically** (built-in, no custom code needed): `Flow Started`, `Flow Completed`, `Step Skipped`. These flow to Amplitude/Mixpanel/Heap via integration. Source: [Appcues Analytics](https://www.appcues.com/university/appcues-basics/analytics-and-integrations).

**What Pendo tracks natively per guide:** `Displayed`, `Advanced` (multi-step advance past step 1), `Completed`, `Closed/Dismissed`. Source: [Pendo Guide Metrics](https://support.pendo.io/hc/en-us/articles/26251637016219-Guide-metrics).

**Attribution window recommendation:**

- **7 days** is the standard for tour → feature-adoption attribution (Pendo's documented recommendation)
- **14 days** for tour → retention attribution (Pendo Guide Experiments default)
- **Trial window** (full trial duration) for tour → trial-to-paid conversion

The critical measurement the host app must instrument **beyond** tour events: the **key activation event** (the first-key-action that defines activation for that specific product). Without that downstream event, tour completion data is engagement-theater. Pendo's methodology: create a segment of "users who saw guide X," compare their 7/14/30-day feature adoption and retention curves against the non-guide cohort.

**What to avoid instrumenting as success metrics:**
- Tour completion rate alone — does not predict activation
- Time-on-tour — does not predict retention
- Step click-through — vanity metric unless correlated to downstream behavior

Source: [Chameleon effective tour metrics](https://www.chameleon.io/blog/effective-product-tour-metrics); [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).

---

## Patterns

1. **The 5-step cliff is a hard ceiling, not a recommendation.** Completion rates collapse after step 5 — from 72%+ to 16% by step 7 — based on 550M interactions. No research contradicts this. Every additional step above 5 is a bet against the user.

2. **Trigger type matters as much as content.** Smart/behavioral triggers outperform auto-fire by 2–3x; user-triggered outperforms auto by 2x. The tour content can be excellent and the trigger can kill it.

3. **Completion rate is a trap metric.** Tours can show high completion while producing zero activation lift. The only measurement that matters is the downstream behavior: did the tour user complete the key activation event sooner, and do they retain longer?

4. **Tours fail expert users.** The PLG success stories (Slack, Notion, Canva) all rejected the tour model for their primary activation mechanic. Contextual tooltips, behavioral nudges, and template-first flows scale better at large volume because they adapt to user readiness rather than assuming first-timer status.

5. **Opt-in is paradoxically better.** Making a tour skippable and optional increases the quality of completers. 123% higher completion for optional tours vs. forced ones — the users who engage have chosen to, which predicts their behavior downstream.

6. **Measurement requires a holdout group.** The industry (Pendo, Usertourly, Guideflow) now explicitly recommends a 10–20% holdout group of users who never see the tour. Before/after comparisons without a holdout cannot establish causality. This means the host app needs to support tour-suppression segmentation.

---

## Real named examples

- **Slack** — activation milestone: 2,000 messages sent across multiple teammates (93% retention). Primary onboarding mechanism: Slackbot conversational guidance, not a spotlight tour. Source: [GrowthHackers Slack case study](https://growthhackers.com/growth-studies/slack/).

- **Notion** — activation: pages created + collaborator invited. Onboarding: template-first, inline coach marks triggered by behavior, not a front-loaded spotlight tour. Source: [Venue PLG Playbook](https://venue.cloud/news/insights/from-signup-to-sticky-slack-notion-canva-s-plg-onboarding-playbook).

- **Canva** — activation: complete and export a design. Onboarding: template selection leads to first creation; premium prompts appear after users see results. No spotlight tour. Source: [Venue PLG Playbook](https://venue.cloud/news/insights/from-signup-to-sticky-slack-notion-canva-s-plg-onboarding-playbook).

- **Pendo's own guide experiment** — 18% lift in event registrations by replacing a text-only onboarding step with a step containing a 10-second video preview. A/B tested via Guide Experiments with 95% confidence threshold. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).

- **Chameleon benchmark** — 550M+ in-app interactions, 3-step tours at 72-74% completion, 7-step tours at 16% completion. User-triggered tours double engagement vs. auto-triggered. Source: [Chameleon Benchmark Report 2025](https://www.chameleon.io/benchmark-report).

- **Appcues** — built-in events: `Flow Started`, `Flow Completed`, `Step Skipped`. Integrates with Amplitude, Mixpanel, Heap. Documents free-to-paid conversion avg of 14% and avg user activation of 30% as baseline context for measuring tour impact. Source: [Appcues](https://www.appcues.com/blog/the-ultimate-guide-to-product-onboarding).

- **Userpilot** — 2024 benchmark across 547 companies: avg TTV = 1 day 12 hours 23 minutes; avg activation rate = 37.5%. 80% of companies with 50%+ activation rates use multimedia (video/animation) in onboarding. Source: [Userpilot 2024 Benchmark](https://userpilot.com/blog/user-activation-rate-benchmark-report-2024/).

---

## What works

- **3–5 step tours with behavioral triggers** — the highest completion rates in the field. The Chameleon 550M-interaction dataset puts 3-4 step tours at 72-74% completion. Triggered by an event (post-dashboard-load, 60-second inactivity, post-checklist-item) rather than timer or page-load.

- **Auto-once + skippable + persistent replay** — fires once at the right moment, always dismissable, with a "take the tour" entry permanently available. The Celestia3 cowpath is consistent with this consensus.

- **Progress indicators** — add 12% to completion. Cheap to implement, consistent payoff.

- **Connecting each step to a user outcome, not a UI label** — benefit-led copy ("See every move in context") outperforms directive copy ("Click the chart"). The mechanism: users who understand *why* a feature matters are more likely to use it after the tour. Source: [Guideflow best practices](https://www.guideflow.com/blog/product-tour-best-practices).

- **A/B testing with a holdout group** — the only clean way to measure whether a tour is lifting activation vs. measuring a correlated selection effect. Pendo Guide Experiments provides the cleanest native implementation. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).

- **Sequencing tour after existing onboarding flows** — the Celestia3 lesson validated against best practice. If the app has a welcome modal, the tour fires *after* the modal completes, not simultaneously.

---

## What fails

- **Tours longer than 5 steps** — completion nosedives to 16% at step 7. No exception in the benchmark data.

- **Treating completion rate as success** — completion without a downstream activation event is vanity. Tour showed users how to click; did they come back tomorrow? Source: [Chameleon effective tour metrics](https://www.chameleon.io/blog/effective-product-tour-metrics).

- **Forced/unskippable tours** — 70% skip rate on linear tours that feel imposed. Optional tours with exit options see 123% higher completion from the users who choose to engage. Source: [Guideflow best practices](https://www.guideflow.com/blog/product-tour-best-practices).

- **Overlay collision** — auto-firing a tour when a welcome modal, cookie banner, or chat widget is already present. Users learn to dismiss everything on first click and the tour content never registers.

- **One tour for all users** — a tour designed for one job-to-be-done (admin setup) actively misleads users with a different JTBD (end-user first use). Segmentation is not optional; it's a precondition for tours at scale. Source: [Guideflow best practices](https://www.guideflow.com/blog/product-tour-best-practices).

- **Outdated anchors ("onboarding rot")** — tours pointing to moved elements, renamed labels, or features behind a paywall wall actively hurt trust. Broken steps are worse than no steps. Source: [Guideflow best practices](https://www.guideflow.com/blog/product-tour-best-practices).

- **Tours for expert users** — Slack, Notion, and Canva all reject the spotlight tour model at scale. For products where users are opinionated about their workflow (power users, technical users, domain experts), a prescriptive walkthrough is friction, not help.

- **Measuring activation rate without an attribution window** — tour events must be correlated to downstream behavior within a defined window (7–14 days for feature adoption, 30 days for retention). Without the window, correlation is noise. Source: [Pendo Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/).

---

## Implications for Vibe-Walk

**1. Build the 5-step ceiling into Phase 1 output.** The anchor-readiness verdict should include a step-count gate: if Phase 1 discovery surfaces 10+ candidate stops, the plugin must select the 5 that are closest to the aha moment — not generate a 10-stop tour. The activation data makes this non-negotiable.

**2. The trigger model interview question is not a preference question — it's a risk question.** The default recommendation Vibe-Walk should give hosts is: auto-once + skippable + persistent replay, sequenced after any existing welcome/modal flow. The plugin should detect existing onboarding sequences (Phase 1 step 7) and flag overlay-collision risk explicitly in its Phase 1 report.

**3. Vibe-Walk must recommend that the host instrument 6 events.** The plugin's Phase 2 output should include a code comment (or a `TOUR_ANALYTICS.md`) specifying the exact events to fire and their property shapes:
   - `tour_started` (tour_id, user_id, trigger_type, timestamp)
   - `tour_step_viewed` (tour_id, step_index, step_label, user_id, timestamp)
   - `tour_step_advanced` (tour_id, step_index, user_id, timestamp)
   - `tour_skipped` (tour_id, step_index_at_skip, user_id, trigger_type, timestamp)
   - `tour_completed` (tour_id, user_id, time_to_complete_ms, timestamp)
   - `tour_replayed` (tour_id, user_id, replay_source, timestamp)

   Plus the host's own **activation event** (e.g., `project_created`, `first_analysis_run`) as the attribution target. Without the activation event, the tour events are noise.

**4. Add a "should we build this tour?" verdict gate in Phase 1.** If Phase 1 surfaces that the app's primary audience is expert/technical users, or that the app's aha moment is reached through workflow and collaboration (not single-session feature discovery), Vibe-Walk should flag "tour may add friction rather than reduce TTV" and surface the alternative: contextual tooltip system instead.

**5. Completion rate is not in Vibe-Walk's success criteria.** The plugin's output quality should not be measured by how many users finish the tour. It should be measured by whether users who saw the tour reach the key activation event faster and return at higher rates. Vibe-Walk's Phase 2 documentation should name the activation event it's optimizing for, not the tour's internal completion metric.

**6. Attribution window to recommend to hosts: 7 days for feature adoption, 14 days for retention.** This is Pendo's documented guidance and the field consensus. Vibe-Walk should include this in the analytics instrumentation recommendation so hosts can set up the right cohort windows in their analytics tool.

**7. For Driver.js tours (the default substrate), Appcues-style events must be manually instrumented.** Driver.js does not auto-fire analytics events. The plugin's tour module should wire these Driver.js hooks to the event schema above:
   - `onHighlightStarted` → fire `tour_step_viewed`
   - `onNextClick` → fire `tour_step_advanced`
   - `onDestroyStarted` → fire `tour_skipped` (with `step_index_at_skip` from the driver's current state) or `tour_completed` (check `state.activeIndex === steps.length - 1`)
   - `onDeselected` → fire on step exit if needed for step-level dwell time

   This is a concrete addition to the Phase 2 build template — the Celestia3 tour module did not instrument these, so activation data from that tour is currently dark. Source: [Driver.js Configuration Docs](https://driverjs.com/docs/configuration).

---

*Sources:*
- [Chameleon Benchmark Report 2025](https://www.chameleon.io/benchmark-report)
- [Chameleon: Effective Product Tour Metrics](https://www.chameleon.io/blog/effective-product-tour-metrics)
- [Userpilot Activation Rate Benchmark 2024](https://userpilot.com/blog/user-activation-rate-benchmark-report-2024/)
- [Userpilot TTV Benchmark 2024](https://userpilot.com/blog/time-to-value-benchmark-report-2024/)
- [Appcues: Ultimate Guide to Product Onboarding](https://www.appcues.com/blog/the-ultimate-guide-to-product-onboarding)
- [Appcues: Analytics and Integrations](https://www.appcues.com/university/appcues-basics/analytics-and-integrations)
- [Appcues: Track Events in Web App](https://docs.appcues.com/install-appcues-web/track-events-in-your-web-app)
- [Pendo: Guide Experiments](https://www.pendo.io/pendo-blog/how-to-use-pendo-guide-experiments/)
- [Pendo: Measuring Onboarding Effectiveness](https://www.pendo.io/resources/measuring-onboarding-effectiveness/)
- [Pendo: Feature Adoption Analytics](https://www.pendo.io/product/features/feature-adoption-analytics/)
- [Guideflow: Product Tour Best Practices 2026](https://www.guideflow.com/blog/product-tour-best-practices)
- [UserGuiding: 100+ Onboarding Statistics 2026](https://userguiding.com/blog/user-onboarding-statistics)
- [Mixpanel: PLG Guide](https://mixpanel.com/blog/product-led-growth/)
- [Amplitude: Best Product Tour Software](https://amplitude.com/compare/best-product-tour-software-growth-teams)
- [Venue: Slack/Notion/Canva PLG Playbook](https://venue.cloud/news/insights/from-signup-to-sticky-slack-notion-canva-s-plg-onboarding-playbook)
- [GrowthHackers: Slack Case Study](https://growthhackers.com/growth-studies/slack/)
- [Usertourly: Interactive Product Tours Conversion](https://usertourly.com/blog/conversion-optimization/interactive-product-tours-do-they-really-improve-conversions-2)
- [Appcues: Self-Directed Learning in Onboarding](https://www.appcues.com/blog/self-directed-learning-user-onboarding)
- [SaaS Designer: Self-Service vs Guided Onboarding](https://saasdesigner.com/self-service-vs-guided-onboarding-which-works-best-for-saas/)
- [Userpilot: Onboarding Checklist Completion Rate 2025](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/)
