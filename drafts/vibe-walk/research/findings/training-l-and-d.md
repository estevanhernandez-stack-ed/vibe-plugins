# Training Mode Research — L&D / Training Specialist (LIGHT)

> **Researcher:** L&D / Training Specialist  
> **Date:** 2026-05-21  
> **Scope:** Three research questions on B2B enterprise training mode (deferred for v2)  
> **Depth:** LIGHT — patterns and prior art only, no schema depth  

---

## Patterns

**Structural separation is real.** Consumer spotlight tours (walkthrough mode) are contextual, moment-of-need, overlaid on the app during active use. Enterprise training modules are scaffolded, curriculum-structured, and often live outside the app, with foundational knowledge established before users touch the tool in anger.

**Tours don't scale to adoption.** A 6-step spotlight tour answers "how do I click this?" Training mode answers "why does this exist, what problem does it solve, how do I do this in context of my role and my organization's configuration." Tours assume the user knows they *want* to do the thing; training establishes that the thing is worth doing.

**The components diverge immediately.** Tours: steps, anchors, copy. Training modules: learning objectives, content blocks, exercises, quizzes/assessments, progress tracking, role-based branching, sometimes certificates or mastery gates. A training module is a course unit; a tour is a UI overlay.

**Both platforms and products prove the gap.** Pendo, Whatfix, and WalkMe all treat "guides" (tours) and "training" as separate product tiers. NetSuite, Workday, and SAP all require structured training separate from in-app guidance. Quick-start guides and tours alone are documented as insufficient for enterprise adoption.

---

## Real named examples

**Pendo**: Combines tooltips, onboarding flows, and checklists (5–7 step guidance, contextual, in-app). Does not replace formal training modules; training is an adjacent service. [Source: Pendo Blog, 2025](https://www.pendo.io/pendo-blog/the-top-8-in-app-guidance-tools-in-2025/)

**Whatfix**: Offers digital adoption (tours, walkthroughs) and structured **training modules** as separate products. Training modules include learning objectives, exercises, assessments, and progress tracking. [Source: Whatfix Blog, 2025–2026](https://whatfix.com/blog/training-module/)

**WalkMe**: Digital adoption platform for employee onboarding in enterprises (tours, step-by-step guidance). Positioned as *complementary* to formal LMS/training, not a replacement. (SAP acquired WalkMe for $1.5B in 2024, integrating it deeper into enterprise adoption workflows, not as a substitute for role-based training.) [Source: WalkMe comparisons](https://www.walkme.com/walkme-vs-pendo-vs-whatfix/)

**Intercom**: Product Tours ($99/month add-on) handles spotlight guidance. Separate from formal customer education curriculum/training. Tours are moment-of-need; training is structured onboarding. [Source: Intercom Product Tours](https://productfruits.com/blog/intercom-product-tours-alternatives)

**Salesforce**: Trailhead (in-app interactive learning) + quick-start guides (tours-like, contextual) + role-based structured training (admin certification, sales training) as *layered* offerings. No single product covers all three; each serves a distinct purpose. [Source: Salesforce Trailhead & Learning Paths](https://help.salesforce.com/s/articleView?id=platform.customhelp_lex_learning_helpmenu_best_practices.htm&language=en_US&type=5)

**Workday**: Enterprise implementations use role-based structured curricula (3-day admin training, hands-on workshops), not quick-start tours. Quote: "Generic training that teaches employees what Workday is capable of does not drive adoption — what works is training that shows specific people how to complete their specific tasks within your specific configuration." Quick-start guides alone fail. [Source: Workday implementation guides](https://www.zeneesha.com/workday-implementation-checklist-a-step-by-step-guide/)

**NetSuite (Oracle)**: Implementations require structured training via SuiteSuccess methodology (role-defined learning paths, industry-specific best practices, ongoing Learning Cloud Support). Tours/walkthroughs are insufficient for large-scale adoption. [Source: NetSuite training resources](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/preface_3710623483.html)

**SAP**: Cloud ERP embeds "guided tours to encourage daily use," but requires "significant amount of training" to use effectively — tours are add-on, not substitute. Enterprise implementations depend on structured role-based training curricula. [Source: SAP vs Oracle comparison](https://www.sap.com/resources/sap-vs-oracle-netsuite)

**Jira (Atlassian)**: Offers 1-day quick-start tours and half-day beginner classes. Enterprise implementations use 3-day structured admin training + role-based hands-on workshops (managers vs. contributors vs. admins). Quote: "Organizations benefit from live, hands-on, interactive instructor-led Jira training courses fully tailored to user and business needs." Generic tours are entry-level; adoption requires structured curriculum. [Source: Atlassian training & adoption guides](https://www.catapultlabs.com/blog/driving-enterprise-agile-adoption-with-jira-and-confluence)

**Figma**: Offers certification programs (4-week mentor-led, design systems deep-dive, with certification) separate from in-app onboarding or quick guides. Enterprise design teams onboard via structured curriculum, not tours. [Source: Designlab Figma Advanced Course](https://designlab.com/blog/best-figma-certification-courses-for-2026/)

---

## What works

**Structural curricula beat piecemeal tours for complex software.** When software configures per customer (Workday, NetSuite, Jira, SAP), users need role-specific, context-aware training that teaches "how our org configured this" — not a generic tour. Tours show UI; training shows workflow within a specific organizational config.

**In-app guidance + structured training are complementary, not competing.** Effective enterprise implementations layer: foundational training (eLearning, workshops, instructor-led) establishes baseline, then in-app guides/tours reinforce and provide moment-of-need support. Whatfix, Pendo, and WalkMe all position themselves as *part of* a training strategy, not the whole strategy.

**Modular, self-contained units drive completion.** Training modules work best when broken into small, focused learning units (not one 2-hour course). Each module = one learning objective, one or two exercises, one quiz. Progress is visible. Quotes from the research: "Large, monolithic courses are difficult to navigate" and "modular units allow learners to focus on specific topics."

**Role-based branching is non-negotiable.** Salesforce admins need different training than sales reps. Workday HR managers need different paths than payroll specialists. A spotlight tour cannot branch on role; a training curriculum must. This is TABLE STAKES for B2B software.

**Exercises and quizzes drive retention.** Passive consumption (watch a video) does not transfer to workplace performance. Effective training includes hands-on exercises, scenario-based practice, and assessments. Whatfix docs: "Practice should be built in, not just consumption."

**Enterprise implementations rely on separate training platforms or curricula.** No "tour library" replaced the need for formal training at Workday, NetSuite, SAP, or Jira. These are mature products; if tours alone worked, they wouldn't invest in structured training programs.

---

## What fails

**Tours alone, without role-specific context, lead to low adoption.** Workday: "Lack of or inadequate training and employee support can hurt adoption, hurt productivity, and undermine the entire ERP project." Failures caused by "poor planning, lack of alignment, and insufficient user adoption — not the software itself." Generic, non-contextualized tours contribute to this gap. [Source: Workday implementation guides](https://www.zeneesha.com/workday-implementation-checklist-a-step-by-step-guide/)

**Unsearchable, recorded training trapped in video format.** ERP consultancies report: "Millions of dollars in training videos that cannot be searched, referenced, or reused across client engagements." Senior architects spend 15–20 hours per week re-recording identical training. Tours as a primary training vehicle leave no searchable reference library. [Source: Financial Content / ERP training crisis, 2026](https://www.barchart.com/story/news/37332252/enterprise-erp-consultancies-struggle-with-unsearchable-training-libraries-as-sap-oracle-and-netsuite-implementations-multiply)

**Underinvestment in training kills ROI.** Workday implementations often treat training as "a box to check before go-live rather than an ongoing investment." Tours don't fix this; they accelerate initial use but don't build sustained competency. Post-launch monitoring and reinforcement training are required.

**Tours don't transfer learning to workplace behavior.** Whatfix research: "Product knowledge assessed only through multiple-choice questions does not transfer to conversational fluency." Tours show UI; they don't build fluency. Enterprise training requires practice, feedback, real-scenario exercises, and social reinforcement (peer learning, manager coaching).

**Lack of progress tracking and mastery gates limits adoption.** Tours are "fire and forget" or "replay on demand" — no persistent progress, no mastery assessment, no adaptive routing (did the user understand this enough to move forward?). Training modules require completion tracking and conditional gating.

---

## Implications for Vibe-Walk

**Walkthrough mode (v1) is correct in scope.** Consumer spotlight tours and simple first-run guides are Vibe-Walk's v1 target. This is a validated, shipping product category (Driver.js, Shepherd.js, Appcues, Intercom Product Tours all handle this successfully). Do not try to serve both tour and training in v1 — the requirements diverge.

**Training mode (v2) will require a different architecture entirely.** When training mode ships, Vibe-Walk will need to:
- Emit structured module definitions (objectives, content blocks, exercises, quizzes, progress checkpoints)
- Support role-based branching (detect user role, serve role-specific learning path)
- Integrate with progress tracking (the host app or an LMS tracks completion, mastery, certification)
- Generate exercise and assessment scaffolds (not just UI walkthroughs)
- Output a module config schema that's fundamentally different from tour-step configs

**Don't merge tour and training configs.** A tour config is `{ steps: [{ anchor, copy, ... }] }`. A training module config is `{ modules: [{ objective, content, exercises, quiz, nextModule: ..., roleGates: ... }] }`. Different schemas, different templates, different output patterns. The plugin's Phase 1 interview must distinguish mode (walkthrough vs. training) early and route to different build templates.

**Flag the training-mode dependencies upfront.** Training mode requires the host app to:
1. Expose user role (or allow Vibe-Walk to infer it from the app)
2. Have a place to store progress/completion (app state, LMS integration, or Vibe-Walk provides a lightweight tracker)
3. Support branching logic (conditionally show modules based on role or prior completion)

These are blockers. If the host app is a simple single-role CRUD UI, training mode doesn't apply — stick with walkthrough.

**Use the Whatfix / Pendo / WalkMe model as pattern precedent.** These platforms separate "guides" (tours) from "training modules." Study their output schemas and module definitions when designing training mode's config format. The difference in feature set is not cosmetic — it's architectural.

**Training mode is B2B / large-org focused.** Walkthrough mode targets consumer apps (Celestia3, simple SaaS). Training mode targets enterprises running Workday, NetSuite, Jira, Figma at scale. Different buyers, different success metrics, different implementation effort. Phase 1 interview should ask: "Are you selling to a single-team SaaS or a multi-team enterprise?" to route correctly.

**Encode the "tours alone are insufficient for adoption" lesson as a guardrail.** When Phase 1 flags that a product is complex, multi-role, or enterprise-targeted, recommend training mode over walkthrough mode and surface the evidence (e.g., "This looks like Workday complexity — quick tours won't drive adoption; consider structured training curriculum instead").

