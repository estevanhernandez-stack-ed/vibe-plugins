# Dev-Tools Onboarding Expert — Findings

> **Persona:** Dev-Tools Onboarding Expert
> **Depth:** MEDIUM
> **Date:** 2026-05-21
> **Questions covered:** 4 (Q1–Q4 from Dev-Tools Onboarding Expert brief)

---

## Research notes

Sources are cited by name where available. Claims that could not be directly verified from a
named product or published source are marked `[unverified]`. No speculation is presented as fact.

---

## Q1 — Dominant onboarding patterns for SaaS dev tools

The six named products — Vercel, Linear, Retool, Supabase, Stripe, GitHub — each occupy a
different position on a spectrum from **docs-first** to **interactive-first**, with a secondary
axis between **self-directed** and **guided**. The pattern correlates with product complexity and
user sophistication.

### Stripe — docs-first with in-line interaction

Stripe's primary onboarding surface is its documentation, not a spotlight tour. The docs use a
three-column layout (navigation / content / live code execution) where hovering over a concept
highlights the corresponding code in the right panel. Stripe built and open-sourced Markdoc to
power this interactive documentation. Their internal policy: a feature is not shipped until its
documentation is written, reviewed, and published — documentation counts toward engineer
performance reviews.

The dashboard's **test mode** acts as a persistent "safe sandbox" that new users land in by
default, allowing real API calls against fake data without any spotlight tour or wizard. The
onboarding contract is: here are the docs, here is a safe environment to run code in, go.

*Source: [Stripe Developer Experience and Docs Teardown — Moesif](https://www.moesif.com/blog/best-practices/api-product-management/the-stripe-developer-experience-and-docs-teardown/),
[Why Stripe's API Docs Are the Benchmark — APIdog](https://apidog.com/blog/stripe-docs/),
[Building Developer-Centric Products — Eleken](https://www.eleken.co/blog-posts/stripe-developer-experience)*

### Twilio — interactive console replaces the tour

Twilio's redesigned onboarding eliminated the traditional new-user tour in favor of a
**personalized interactive console**. On first login, users complete a brief survey (role, code
preference, use case). The console then generates a personalized "For You" page with prioritized
next steps.

The centerpiece is a **Virtual Phone** in the console — a software-based handset that works over
real APIs — so developers can send a test SMS, see the response in the message log, and review the
API call, all from one screen, without waiting for compliance phone number registration.

Measured results vs. prior onboarding:
- **62% improvement** in first-message activation rate
- **33% improvement** in production launches within 7 days

The activation metric is "first message sent" — Twilio defined the aha moment (developer sends
first text or makes a phone ring with code) and built the entire first-run experience around
reaching it as fast as possible.

*Source: [Twilio Blog — Redesigning Twilio Onboarding Experience](https://www.twilio.com/en-us/blog/developers/redesigning-twilio-onboarding-experience-whats-new),
[SignalFire — DevRel for Startups](https://www.signalfire.com/blog/devrel-for-startups)*

### Linear — "teach by doing," no passive tour

Linear's onboarding does not use a spotlight tour overlay. Instead it uses a **task-driven
checklist** that exposes the full issue workflow through action. The command menu (`Cmd+K`) is
introduced as a *required step*, not a tip — users must use it to complete the guided path. Sample
content is pre-populated in the workspace so users are not staring at an empty state.

The activation event is completing and resolving the first issue within the onboarding session.
Linear's design philosophy (per published analysis): the onboarding has 10+ steps but doesn't
feel like it because each step is a real action, not instruction text.

*Source: [Hands-on Learning — Lulu Wang, Medium](https://medium.com/design-bootcamp/hands-on-learning-cinematic-transition-linears-thoughtful-onboarding-aa4f16c33d90),
[Linear Onboarding Flow — Supademo teardown](https://supademo.com/user-flow-examples/linear),
[How Linear Welcomes New Users — @fmerian, Medium](https://fmerian.medium.com/delightful-onboarding-experience-the-linear-ftux-cf56f3bc318c)*

### Vercel — zero-config deployment as the onboarding

Vercel's onboarding is the product: connect a Git repository, push code, get a live URL.
The aha moment is a deployed URL appearing in the dashboard within seconds of import.
There is no spotlight tour; the value is self-evident from the first deploy. Vercel's dashboard
uses an **import wizard** (select provider → pick repo → configure environment vars → deploy) that
acts as structured first-run guidance without a tooltip overlay.

New team members arriving via invite land in the same flow — the first deployment is the
activation event regardless of who triggered it.

*Source: [Getting Started with Vercel — Vercel Docs](https://vercel.com/docs/getting-started-with-vercel),
[Improved Team Onboarding — Vercel Changelog](https://vercel.com/changelog/improved-team-onboarding-experience),
[Vercel Onboarding Flow — PageFlows](https://pageflows.com/post/desktop-web/onboarding/vercel/)*

### Supabase — empty-but-ready project, docs alongside

Supabase onboarding creates a live PostgreSQL database with Auth, Storage, and instant APIs
within ~30 seconds of project creation. The first-run experience lands users in the **Table
Editor** dashboard. There is no guided spotlight tour in the main product; instead, the dashboard
has an in-app quickstart panel (code snippets, "connect your app" tab) and links out to docs.

The pattern: get the infrastructure real and running first, then let the developer pull the docs
at their own pace. The aha moment is "I have a running database with an API key and I didn't write
any SQL."

*Source: [Getting Started with Supabase — Ottomatik](https://ottomatik.io/post/getting-started-with-supabase-a-quick-guide)*

### Retool — heavy setup onboarding, role-specific training

Retool's first-run experience is documentation-heavy and role-gated (see Q4). There is no
spotlight tour in the traditional consumer sense. Instead, the platform has a formal
**Customer Journey framework** with distinct onboarding phases per role (Platform Architect,
Platform Administrator, Retool Developer, Operator). The platform opens inside an application
canvas with drag-and-drop components visible — the visual canvas itself serves as a "here is the
surface" orientation.

*Source: [Retool Customer Journey — Retool Docs](https://docs.retool.com/education/coe/phases/formation/customer-journey)*

---

### Pattern by product type (Q1 synthesis)

| Product type | Dominant pattern | Spotlight tour? |
|---|---|---|
| API platform (Stripe, Twilio) | Docs-first or interactive console; sandbox environment | No / replaced by sandbox |
| Infrastructure/deploy (Vercel, Supabase) | Zero-config activation; product IS the onboarding | No |
| Workflow/project tool (Linear) | Task-driven checklist with sample content | No — checklist instead |
| Low-code builder (Retool) | Role-gated multi-phase training curriculum | No — formal curriculum |

**The finding:** none of these six products lean on consumer-style spotlight tours. They either
eliminate tour friction via zero-config activation (Vercel, Supabase), replace tours with an
interactive console or sandbox (Twilio, Stripe), or use task checklists that teach by action
(Linear). Retool's complexity pushes it to formal curriculum.

---

## Q2 — Interactive tutorials vs. docs-first: where each wins

### Where docs-first wins

Docs-first works when the product's primary integration surface is **code** — an API, SDK, or
CLI — and the user's primary relationship with the product happens outside the UI (in their
editor, terminal, or CI pipeline). Stripe and Stripe's positioning as the benchmark for API docs
confirm this: for a payments API, what the developer needs is a correct mental model and working
code samples, not a UI walkthrough.

Docs-first also wins when the user population is **expert-by-default**. Stripe's developers are
integrating payment rails — they don't need to be led by the hand through the dashboard.

Cue to use docs-first: product is an API / SDK / CLI; user's aha moment happens in their own
codebase, not in your UI.

*Source: [SignalFire — DevRel for Startups](https://www.signalfire.com/blog/devrel-for-startups),
[Stripe docs analysis — APIdog](https://apidog.com/blog/stripe-docs/)*

### Where interactive tutorials win

Interactive tutorials win when:
1. **The aha moment lives inside your UI**, not in the user's codebase (Twilio's Virtual Phone,
   Linear's first-resolved issue, Retool's first-built app).
2. **Time-to-first-success matters more than deep comprehension.** Twilio's 62%/33% improvement
   from switching to interactive console onboarding is the clearest quantitative signal in this
   research.
3. **The product is wide.** Twilio's "wide range of products" problem meant that docs-first
   created navigation paralysis — users didn't know which doc to start with. The personalized
   console solved this with role detection + curated first steps.

Cue to use interactive: product has a visual UI where the aha moment occurs; product catalogue is
wide enough that docs-first creates choice paralysis; audience includes mixed technical levels.

### Hybrid pattern

Stripe's three-column docs-with-live-code-execution is the hybrid model: docs are the surface,
but the docs are interactive. This is the dominant pattern for API products with strong
engineering orgs and a commitment to docs-as-product.

*Source: [Twilio Blog — onboarding redesign](https://www.twilio.com/en-us/blog/developers/redesigning-twilio-onboarding-experience-whats-new),
[Eleken — Stripe developer experience](https://www.eleken.co/blog-posts/stripe-developer-experience)*

---

## Q3 — CLI and API onboarding: no visual UI to anchor

### The pattern set

CLI tools use four analogous patterns in place of visual spotlight tours:

**1. Interactive setup wizard (`create-*` scaffolding)**
`npm create next-app@latest` and `create-react-app` demonstrate: prompted questions in sequence
(project name → TypeScript? → ESLint? → Tailwind?) with a progress indicator as the project
scaffolds. The user performs one action per step, sees the result immediately, and ends with
a working artifact. This is a CLI-native spotlight tour — same sequenced-step model, zero UI.

*Source: [npm init docs](https://docs.npmjs.com/cli/v11/commands/npm-init/)*

**2. Auth-gate with browser redirect (`gh auth login`, `stripe login`)**
GitHub CLI (`gh auth login`) and Stripe CLI (`stripe login`) both use a pairing-code pattern:
the CLI prints a short code, prompts the user to press Enter to open a browser, completes auth
in the browser, and writes a token to `~/.config`. This is structured onboarding — each CLI
step is a named gate — but the human-readable feedback (device code, "paired successfully",
color-coded status) is the visual feedback equivalent of a tooltip.

The Stripe CLI adds `--interactive` flag for headless/CI paths, demonstrating awareness that
developers have multiple usage contexts.

*Source: [Stripe CLI docs](https://docs.stripe.com/stripe-cli),
[WorkOS CLI authentication guide](https://workos.com/blog/cli-authentication-guide)*

**3. `--help` as the always-available replay**
Well-designed CLI tools treat `--help` output as their persistent "tour replay" surface — it's
the equivalent of "Take the tour again" in a visual product. `gh --help`, `stripe --help`, and
`vercel --help` all produce structured command trees that double as a navigation index. This is
the CLI's answer to the "where to find it after skip" problem.

**4. Quickstart sample project**
Stripe's sample repos (`stripe-samples/`) and Supabase's quickstart templates ("start with this
Next.js template") serve the same function as an interactive tutorial for API/SDK products: a
runnable working project that demonstrates the aha moment (payment form accepts a charge,
database query returns real data) without requiring the user to write setup code from scratch.

*Source: [Stripe CLI samples — GitHub](https://github.com/stripe-samples/),
[Supabase quickstart — Refine](https://refine.dev/blog/supabase-database-setup/)*

### The spotlight-tour analogue for CLIs

The closest CLI equivalent to a visual spotlight tour is a **first-run `setup` or `init`
subcommand** — a sequenced, interactive wizard that collects config, shows progress, and confirms
success at each step. OpenClaw's `openclaw onboard` command is an explicit implementation of
this: guided setup wizard covering gateway, workspace, channels, and skills in sequence, designed
as the "recommended first-run setup experience."

*Source: [OpenClaw onboarding wizard docs](https://docs.openclaw.ai/start/wizard)*

### What does not transfer from visual to CLI

- Selector-anchored spotlight highlights (no DOM, no element targeting)
- Persistent tooltip overlays
- Driver.js / Shepherd.js / any visual tour library

The CLI constraint forces every onboarding pattern into the **text-only + interactive-prompt**
model. The quality bar is: clear labeling of each step, a success/failure signal per step, a
recovery path on failure, and a completion summary.

---

## Q4 — Developer/end-user onboarding split: role detection and separate flows

### The canonical split

Products with both a developer/admin setup persona and a distinct end-user operate persona handle
this one of three ways:

**A. Explicit role detection at signup (Twilio, Segment)**

Twilio's redesigned onboarding collects role at first login via a brief survey ("what's your
role?", "code preference?", "use case?") and uses those answers to drive the personalized
console. Segment does the same — developers see API docs and code snippets; marketers see
campaign tracking; product managers see analytics dashboards. Segment reported 30–50% activation
rate improvement from role-targeted messaging.

These products treat the same tool as doing completely different things depending on who is
logging in, and they surface this upfront rather than delivering a generic first-run.

*Source: [Twilio onboarding blog](https://www.twilio.com/en-us/blog/developers/redesigning-twilio-onboarding-experience-whats-new),
[Eleken — user onboarding best practices](https://www.eleken.co/blog-posts/user-onboarding-best-practices),
[Auth0 — user onboarding strategies B2B SaaS](https://auth0.com/blog/user-onboarding-strategies-b2b-saas/)*

**B. Phased curriculum, role-gated (Retool)**

Retool's Customer Journey framework separates setup from operation into explicit sequential
phases with distinct training tracks per role:

1. **Platform Architect** → completes infrastructure + security training before anyone else gets
   access
2. **Platform Administrator** → handles SSO, data sources, permissions
3. **Retool Developer** → receives developer-specific training, provisioned into dev environment
4. **Operator (end-user)** → receives separate training on how to use the finished application;
   never sees the builder canvas

This is the most complete dev/end-user separation found in this research: end-users are not
onboarded into the platform — they are onboarded into *the specific app* built on the platform.
Retool's onboarding contract is: the developer builds the tour/onboarding inside the app they
build for their end-users; Retool itself only onboards builders.

*Source: [Retool Customer Journey — Retool Docs](https://docs.retool.com/education/coe/phases/formation/customer-journey)*

**C. Implicit routing by invitation path (Vercel, GitHub)**

Vercel and GitHub route users differently based on how they arrive rather than asking a role
question. A Vercel user who creates an account and connects a repo is implicitly a builder/owner;
a team member who joins via invite lands in a team context and may have a different role (Viewer,
Developer, or Owner) that governs what they see. GitHub similarly distinguishes repo owners,
collaborators, and read-only viewers by access level, not by an explicit "what are you here to
do?" onboarding step.

These products route by access contract rather than by declared intent.

*Source: [Vercel RBAC docs](https://vercel.com/docs/rbac/access-roles),
[Vercel Team Members docs](https://vercel.com/docs/accounts/team-members-and-roles)*

**D. Progressive disclosure by action history (Linear)**

Linear doesn't ask about role at first login. It offers two tracks — **beginner** and **advanced
user** — during the initial onboarding sequence. The separation is preference-declared, not
detected. After the initial path, the product surfaces more advanced features (keyboard shortcuts,
project templates) as the user completes more complex actions.

*Source: [Linear onboarding analysis — Supademo](https://supademo.com/user-flow-examples/linear)*

---

## Patterns

1. **Docs-first wins for code-surface products; interactive wins for UI-surface products.** The
   determining variable is where the aha moment lives — inside your UI or inside the user's
   codebase. Stripe (API) → docs. Twilio (API + console-based aha moment) → interactive console.
   Vercel (deploy-is-the-product) → zero-config activation.

2. **The best dev-tool onboarding compresses time to aha, not time to feature tour.** Twilio's
   62%/33% improvement came from removing barriers before the first API call, not from adding
   more explanation. Linear activates users by having them complete a real issue, not read about
   the issue workflow.

3. **CLI onboarding is sequenced-prompt + success-signal, every time.** There is no spotlight
   tour analogue in terminals — the pattern is interactive wizard (scaffolding CLI), auth-gate
   with browser redirect, `--help` as permanent nav index, and sample project as activation
   artifact.

4. **Role split is handled earlier and more explicitly in dev tools than in consumer products.**
   Technical audiences are diverse in their relationship to a product (builder vs. operator vs.
   API consumer vs. admin) and the best products make this split visible at or near first login
   rather than serving generic onboarding.

5. **Sample projects and sandbox environments substitute for spotlight tours in API/SDK
   products.** The function is identical — show the user what is possible before they've built
   anything — but the medium shifts from overlay tooltips to runnable code.

---

## Real named examples

| Product | Pattern | Onboarding surface | Aha moment |
|---|---|---|---|
| **Stripe** | Docs-first + interactive docs | Three-column docs with live code execution; test-mode sandbox | First successful API call (from their own codebase) |
| **Twilio** | Role-detected interactive console | Virtual Phone, personalized "For You" page | First message sent via Virtual Phone |
| **Linear** | Task-driven checklist + sample content | Guided checklist inside populated workspace | First issue resolved |
| **Vercel** | Zero-config activation | Import wizard → deploy | Live URL appears in dashboard |
| **Supabase** | Zero-config activation + docs alongside | Table Editor; in-app connect-your-app tab | Running database with API key, no SQL |
| **Retool** | Multi-role curriculum | Phased role training (Architect → Admin → Developer → Operator) | First working app deployed to end-users |
| **GitHub CLI** | Auth-gate wizard | `gh auth login` pairing-code flow | Authenticated, terminal connected to GitHub |
| **Stripe CLI** | Auth-gate + sample project | `stripe login` flow; `stripe-samples/` repos | Test webhook firing locally |
| **create-next-app** | Scaffolding wizard | Prompted init sequence | Runnable Next.js project in seconds |
| **Segment** | Role-detected personalization | Role survey at signup → tailored first steps | [activation metric not cited; 30–50% improvement sourced] |
| **OpenClaw** | First-run setup wizard CLI | `openclaw onboard` interactive wizard | Gateway + workspace configured |

---

## What works

- **Defining and targeting the aha moment explicitly.** Twilio rebuilt their entire onboarding
  around a single metric (first message activated) and got 62% improvement. The aha moment is
  not a UX concept to decorate — it is the product metric to optimize.

- **Interactive consoles with embedded docs outperform separate docs for API products.** Stripe's
  in-docs code execution and Twilio's embedded-logging console both demonstrate that moving the
  learning surface closer to the execution surface reduces friction.

- **Personalization by role at first login improves activation meaningfully.** Segment reports
  30–50% activation improvement; Twilio's numbers confirm the pattern. The cost is one short
  survey; the return is irrelevant steps eliminated.

- **Sample content / sample projects / sandbox environments eliminate the empty-state problem.**
  Linear pre-populates a workspace. Stripe's test mode is always on. Supabase starts with a live
  database. The user is never staring at a blank canvas asking "what do I do first?"

- **CLI scaffolding wizards (`create-*`) are the CLI's spotlight tour.** They sequence steps,
  show progress, produce a concrete artifact, and end with a success state. They work because
  every step is an action, not an explanation.

- **`--help` as the permanent nav index.** Well-maintained CLIs treat `--help` output as the
  first-class onboarding replay surface. It is always available, has zero trigger-logic
  complexity, and doesn't require the user to remember where the "tour" was.

---

## What fails

- **Spotlight tours on dev tools with technical users [unverified — no named product found with
  published negative data specific to technical audience + spotlight tour].** The inference from
  the research is strong: none of the six named reference products (Stripe, Twilio, Linear,
  Vercel, Supabase, Retool) use consumer-style spotlight tour overlays. The absence is the
  signal.

- **Generic onboarding for role-diverse products.** Segment and Twilio both switched away from
  undifferentiated first-run flows. The failure mode: developer users see marketing copy for
  non-technical use cases, which erodes trust. Technical audiences are especially sensitive to
  this mismatch.

- **Docs-first for products where the aha moment is visual.** Twilio's pre-redesign state was
  effectively docs-first for a product whose aha moment (first call ringing) was experiential.
  The mismatch cost measurable activation. Docs-first is not a universal default — it is the
  right choice only when code is the activation surface.

- **Wide product catalogs without role detection create navigation paralysis.** Twilio named this
  explicitly as a driver for the redesign: their product breadth meant that docs-first created
  decision paralysis about where to start.

- **CLI onboarding without a success signal per step.** The failure mode for CLI first-run is
  opaque progress — a long-running command with no intermediate feedback that looks like a hang.
  `create-next-app` and `gh auth login` both use explicit step labels and status indicators to
  avoid this.

---

## Implications for Vibe-Walk

**1. Detect product type before deciding whether to generate a tour.**
When Vibe-Walk's Phase 1 analysis identifies a developer-facing product (dashboard for an API
platform, admin panel for a dev tool), the Phase 1 report should flag: "this audience may not
respond to consumer-style spotlight tours." The plugin should surface this as a mode question in
Phase 1.5, not default to spotlight tour output.

**2. For API/SDK products: recommend interactive console or docs-based pattern, not a Driver.js
tour.**
If Vibe-Walk runs against a Stripe-like or Twilio-like product, its output recommendation should
be a sandbox environment and in-context code samples rather than a DOM-anchored overlay tour.
This is architecturally out of scope for the current tour-generation substrate — Vibe-Walk should
note the pattern and defer, not try to generate docs.

**3. For dev-tool dashboards and admin panels: a tour is viable, but step selection must be
role-aware.**
Retool's builder canvas, Supabase's Table Editor, and Vercel's project dashboard are all
UI-surface products where a spotlight tour could land. But the step selection must match the
user's role (setup/config vs. operate/use). Vibe-Walk's Phase 1.5 interview should add a
"primary user role" gate: *"who is this tour for — the person who set this product up, or the
person who uses it day-to-day?"* The answer changes which surfaces deserve stops.

**4. CLI apps: flag as out-of-scope for current output substrate.**
Vibe-Walk v1 generates selector-anchored DOM tours. CLIs have no DOM. When Phase 1 identifies
a CLI-primary product (or a product whose aha moment lives in the terminal, not the UI), the
Phase 1 report should emit: "CLI-first product — spotlight tour substrate does not apply. Consider
documenting CLI quickstart wizard patterns instead." Do not attempt to generate a Driver.js tour
for a command-line tool.

**5. Role split surfaces a concrete output branching decision.**
When Phase 1 detects a developer-setup persona and a separate end-user operator persona (visible
from auth patterns, role docs, or admin/settings surfaces vs. operational dashboards), Vibe-Walk
should offer two outputs: one tour for setup/admin surfaces, one for the operational day-to-day
surfaces. This matches how Retool, Twilio, and Segment actually handle the split. Single-tour
output for role-diverse products produces the "generic onboarding failure" documented above.

**6. The aha moment question belongs in Phase 1.5.**
None of the successful examples here generated a tour without defining the aha moment first.
Vibe-Walk's Phase 1.5 interview should add: *"What is the single action that makes a new user
say 'this is worth it'?"* The answer anchors stop selection — the aha-moment stop should come
as early as structurally possible in the tour, not at the end after five setup-context stops.

**7. For dev-tool dashboards, sample content / prefilled data is more important than tour copy.**
Linear and Supabase both demonstrate that a pre-populated environment removes onboarding friction
more effectively than an overlay tour. When Vibe-Walk's Phase 1 detects an empty-state risk
(the product's first-run surface is a blank canvas — a Retool canvas, a Linear empty project, a
Supabase empty schema), it should recommend a sample-data/template first-run path in addition
to or instead of a tour, and flag this in the Phase 1 report.
