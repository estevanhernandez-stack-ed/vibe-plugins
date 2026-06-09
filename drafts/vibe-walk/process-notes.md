# Vibe-Walk — process notes (the cowpath)

> Born 2026-05-21, paving from the first real job: a spotlight tour for the Celestia3 webapp.
> This file captures the *generalizable pattern* extracted while building one tour by hand, so the
> eventual `/onboard` Cart cycle for Vibe-Walk has a grounded spine instead of a blank page.
>
> Tour spec for the inaugural job: `Celestia3/docs/superpowers/specs/2026-05-21-spotlight-tour-design.md`.
> Plugin idea of record: memory note `queued plugin — Vibe-Walk`.

## What Vibe-Walk is (confirmed by the first job)

A plugin that generates user-facing onboarding tours for an app, autonomous-first: it reads the
app to figure out what surfaces exist and which deserve a tour stop, asks a few load-bearing
questions, then builds the tour. Same DNA as vibe-doc (reads codebase → technical docs) and
vibe-iterate (reads codebase + competitors → next features); Vibe-Walk's read target is the
**user-facing surface area**, and its output audience is **end users, not developers**.

Two output modes that branch on app focus (from the memory note, both still valid):
- **Walkthrough mode** — consumer / B2C. First-run spotlight tours, dismissable overlays. *This is
  the mode the Celestia3 job exercised.*
- **Training mode** — B2B / internal tooling. Heavier: curriculum, exercises, completion tracking.
  Not exercised yet.

## The two-phase spine (validated against the Celestia3 job)

### Phase 1 — autonomous UI-surface discovery

The Explore pass run for Celestia3 *is* the algorithm. Generalized:

1. Read the orientation docs (README, DOCS, THEME, CLAUDE.md) → 3-4 sentence product summary.
2. Map the route surface. **Watch for thin routers**: Celestia3's App Router had only
   `layout/page/manifest-aura` — the whole app is one or two interactive canvases composed in
   `src/components/`. Tour stops there are UI regions, not pages. Don't assume route = stop.
3. Trace what's composed where (read the page files, then the components they pull in).
4. Inventory user-facing surfaces: panels, regions, tabs, modals, floating widgets — name, what it
   does for the user, file path, which view it lives on.
5. Rank candidate stops by **centrality to first-success** (8–12 shortlist).
6. Emit an **anchor-readiness verdict**: do components already have stable selectors
   (`id` / `data-*`), or must the build add anchors first? This gates the effort estimate.
7. Detect existing onboarding/tour/tooltip code — *do not duplicate what's already there.*

### Phase 1.5 — interview gates (the questions Vibe-Walk must ask)

Exactly three decisions carried the Celestia3 design. These are the plugin's interview:

1. **Mode** — consumer→walkthrough vs B2B→training. Load-bearing: picks the output template family.
   (Often inferable from Phase 1; confirm, don't assume.)
2. **Trigger model** — auto-once+replay / on-demand only / auto-once-no-replay. Must account for
   onboarding the app *already* auto-plays so the tour doesn't pile on.
3. **Substrate** — Driver.js (framework-agnostic, smallest, generalizes) / React Joyride
   (React-idiomatic, React-only) / hand-rolled (max control, least reuse). **Default Driver.js** —
   framework-agnostic substrate is what lets the plugin output generalize beyond React.

### Phase 2 — build

1. Add the chosen substrate dependency.
2. **Anchor-injection pass** — add stable `id`/`data-tour` anchors to the chosen stops. Purely
   additive; no logic changes.
3. Tour module (steps config + a `start(onDone)` driver) + theme that matches the app's look.
4. **Reuse the app's existing onboarding-state system** for the "seen it" flag — don't invent a
   parallel store. (Celestia3: added `hasSeenSpotlight` next to `hasSeenWelcome`.)
5. Trigger wiring — gate auto-fire so it sequences *after* any existing welcome/modal.
6. Replay entry point — ungated, always available.
7. Manual verify against acceptance criteria.

## Hard-won lessons (encode these in the plugin)

- **Co-presence rule.** A selector-driven tour can only highlight elements mounted in the current
  view. Either scope stops to a single view, or the tour must orchestrate view-switching between
  steps. v1 default: single view. View-orchestration is a real feature with real complexity —
  flag it, don't hand-wave it.
- **Reuse, don't reinvent, onboarding state.** Apps that need a tour usually already track some
  first-run state. Find it and extend it.
- **Discover existing onboarding before designing.** Celestia3 had a full flyby + welcome modal.
  Building a tour blind would have duplicated it. Phase 1 step 7 exists because of this.
- **Anchor-readiness gates the estimate.** "Components have no stable selectors" turns a config job
  into a config + edit-every-component job. Surface this in the Phase 1 report.
- **Substrate choice is a plugin-generality decision, not just an app decision.** Framework-agnostic
  substrate → the plugin's output pattern works for any web app.

## Open questions (carry into the real `/onboard`)

- Output shape across apps: does Vibe-Walk emit tour-config the app wires up, or full module code
  it drops in? (Celestia3 got dropped-in module code. Config-only may suit some hosts.)
- Cross-platform: web is proven. Desktop / mobile / CLI-app tours still open.
- Training mode: entirely unexercised — needs its own first job to pave.
- How much of Phase 2's anchor pass can be safely automated vs needs human review per component.

## Status

Queued as a real plugin candidate. The Celestia3 job is the inaugural walkthrough-mode run; this
file + the tour spec are the seed for Vibe-Walk's `/onboard`.

**2026-05-21 — cowpath walked.** The inaugural Celestia3 spotlight tour was built (Driver.js, 6
stops, auto-once + replay) and shipped as a PR: `estevanhernandez-stack-ed/Celestia3` PR #12.
Artifacts: `Celestia3/docs/superpowers/specs/2026-05-21-spotlight-tour-design.md` (spec),
`Celestia3/docs/superpowers/plans/2026-05-21-spotlight-tour.md` (10-task plan), and this file.
The two-phase spine, the three interview gates, and the hard-won lessons above are now validated
against a real job — ready to formalize via a fresh Cart `/onboard` for the Vibe-Walk plugin when
the moment comes. Training mode is still unexercised (needs its own first job).
