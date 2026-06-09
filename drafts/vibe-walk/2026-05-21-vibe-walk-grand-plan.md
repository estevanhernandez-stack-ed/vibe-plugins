# Vibe-Walk Plugin — Grand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan. This is a MASTER plan: it decomposes a multi-subsystem plugin into sequenced milestones (M0–M6). Each milestone is bite-sized into TDD tasks **at build time** (via Cart's `/checklist` in auto-build, or a just-in-time writing-plans pass) — pre-writing every line for all seven milestones before Cart shapes the plugin would be premature and would be re-derived by `/checklist`. Milestone 1 is the differentiator; build it first.

**Goal:** Build the Vibe-Walk plugin — autonomously read an app's user-facing surfaces, decide whether a tour is even warranted, and (when it is) generate a short, instrumented, replayable Driver.js spotlight tour with a human-gated anchor-injection pass.

**Architecture:** A vibe-* family plugin (same DNA as vibe-doc / vibe-iterate): SKILL-driven, autonomous-first, with Level 2/3 self-evolution scaffolding. Two-phase engine (autonomous discovery → build) with an interview gate between, validated by the Celestia3 cowpath and the research seed. v1 = walkthrough mode, drop-in module output, web only.

**Tech Stack:** Claude Code plugin (SKILL.md + `.claude-plugin/plugin.json`); Python 3.11 + Node for scripts (surface reader, anchor codemod via jscodeshift, generators); Driver.js as the default emitted substrate. Built in a new solo repo `C:\Users\estev\Projects\Vibe-Walk`, pinned into `vibe-plugins/.claude-plugin/marketplace.json` later.

**Inputs (carried into the repo):** `research/_seed.md` (12 resolved decisions + GENERATE/ASK/AVOID), `process-notes.md` (the cowpath), this plan.

---

## Locked decisions (build constraints — from `_seed.md`)

These are non-negotiable constraints every milestone honors. Cited by `_seed.md` decision id.

- **D1/D1-honest** — Tours hard-capped at **5 steps**, default 3–4. State the ceiling as single-vendor directional data (curve shape + cognitive-load theory), never fake-precise percentages.
- **D2** — Output = **drop-in module** (Shape A) only for v1. **D2-config** (config-only JSON) is **deferred** — gated exception, not built in v1.
- **D3/D3-override** — Substrate default **Driver.js**; override tree for NextStep/Reactour/React Joyride per condition. **D3-nextstep**: NextStep uses `id="tour-<name>"`. **D3-shadow**: shadow DOM = hard wall. **D3-reject**: never Intro.js (AGPL-3).
- **D4** — Anchor contract `data-tour="<kebab-semantic-name>"`, globally unique, no step numbers.
- **D5** — Wire the **6-event analytics schema** + host activation event; emit `TOUR_ANALYTICS.md`. Never ship dark (the Celestia3 mistake).
- **D6** — Anchor-injection auto-injects only the 4-gate-safe subset; everything else → `REVIEW_NEEDED.md` with reason codes; **Phase 2 halts** for human resolution.
- **Verdict-first** — "Don't build a tour" is a first-class Phase 1 output, equal-weight to "build."
- **Deferred to v2:** training mode, config-only Shape B, cross-view orchestration, non-web platforms.

---

## Plugin file structure (matches the vibe-* convention)

```
C:\Users\estev\Projects\Vibe-Walk\
  .claude-plugin/plugin.json
  plugins/vibe-walk/
    .claude-plugin/plugin.json
    skills/
      vibe-walk/SKILL.md          # bare router (reads state, recommends next step)
      bootstrap/SKILL.md          # first-run config -> .vibe-walk/config.json
      guide/
        SKILL.md                  # shared behavior, loaded by command skills
        references/
          sherpa-persona.md       # the plugin's voice (the guide who leads the walk)
          posture.md              # autonomous-first, honest-evidence, earn-the-tour
          conventions.md          # anchor contract, output conventions, naming
          friction-triggers.md    # where friction-logger fires
      discover/SKILL.md           # PHASE 1 — surface discovery + the "should we build?" verdict
      walk/SKILL.md               # PHASE 1.5 interview gates + PHASE 2 build (the generator)
      session-logger/SKILL.md     # L2 self-evolution
      friction-logger/SKILL.md    # L2 self-evolution
      evolve-walk/SKILL.md        # L3 self-evolution (named evolve-walk per pending-renames)
      vitals/SKILL.md             # plugin self-test (optional, M6)
    scripts/
      discovery/
        inventory_surfaces.py     # reads routes/components -> surface inventory JSON
        anchor_readiness.py       # selector scan -> readiness verdict + risk flags
        build_verdict.py          # the "should we build a tour?" decision (don't-build checks)
      build/
        emit_tour_module.py       # Driver.js Shape A module emitter (steps + start + theme)
        emit_analytics.py         # 6-event wiring + TOUR_ANALYTICS.md
        substrate_tree.py         # substrate decision-tree resolver
      anchors/
        inject_anchors.js         # jscodeshift codemod (4-gate AUTO-INJECT) + REVIEW_NEEDED emitter
    docs/
      inputs/                     # _seed.md, process-notes.md, this plan (carried in)
      README.md
```

---

## Milestones (sequenced; each produces working, testable software)

> Each milestone is bite-sized into TDD tasks at build time. Listed here: goal · files · key tasks · test strategy · acceptance · Cart mapping.

### M0 — Repo + plugin scaffold

**Goal:** A valid, installable (empty-behavior) vibe-walk plugin in a new solo repo, with self-evolution scaffolding and the Sherpa persona.
**Files:** `Vibe-Walk/.claude-plugin/plugin.json`, `plugins/vibe-walk/.claude-plugin/plugin.json`, `skills/vibe-walk/SKILL.md` (bare router), `skills/guide/SKILL.md` + references (sherpa-persona, posture, conventions, friction-triggers), `skills/bootstrap/SKILL.md`, `skills/session-logger/SKILL.md`, `skills/friction-logger/SKILL.md`, `skills/evolve-walk/SKILL.md`, `docs/inputs/*` (carry the seed/cowpath/plan in).
**Key tasks:** git init; author plugin.json (name `vibe-walk`, description in the marketplace voice); scaffold guide + persona from `_seed.md` posture (earn-the-tour, honest-evidence); copy the vibe-iterate self-evolution skills as the template and adapt; bare router that reads `.vibe-walk/` state and recommends the next step.
**Test strategy:** plugin-validator agent (structure + plugin.json valid); a smoke check that SKILL frontmatter parses.
**Acceptance:** plugin loads; `/vibe-walk` bare router runs and hands off to bootstrap on first run; self-evolution skills present and structurally valid.
**Cart mapping:** Cart `/onboard` sets builder profile + persona + architecture here; `/scope` is largely pre-satisfied by `_seed.md`.

### M1 — Phase 1 discovery + the "should we build a tour?" verdict (THE DIFFERENTIATOR)

**Goal:** Autonomously inventory an app's user-facing surfaces, produce the ranked stop shortlist + aha-moment candidate + anchor-readiness verdict, and emit a first-class build/don't-build recommendation.
**Files:** `scripts/discovery/inventory_surfaces.py`, `scripts/discovery/anchor_readiness.py`, `scripts/discovery/build_verdict.py`, `skills/discover/SKILL.md`.
**Key tasks:**
- `inventory_surfaces.py` — read README/DOCS/CLAUDE.md + route surface + page/component composition → structured surface inventory (name, purpose, file, view). Mirrors the Explore pass from the cowpath.
- `anchor_readiness.py` — scan for stable selectors (`id`/`data-*`) → readiness verdict + risk flags (CSS-Modules / Tailwind-only / dynamic mount / SSR / shadow DOM / iframe).
- `build_verdict.py` — apply the don't-build condition list (`_seed.md` §3 Phase 1 step 6); output `build` | `don't-build` | `cheaper-first (empty-state/sample-data)` with rationale.
- `discover/SKILL.md` — orchestrate the three, rank stops by centrality-to-first-success, name the aha candidate, present the verdict.
**Test strategy:** unit tests on each script with fixture repos (a tour-worthy app, a single-purpose tool → don't-build, a no-stable-selectors app → anchor-pass-needed). The verdict logic gets a truth-table test over the don't-build conditions.
**Acceptance:** against a fixture app, produces a correct inventory, a sane ranked shortlist, an accurate readiness verdict, and the right build/don't-build call on the don't-build fixtures.
**Cart mapping:** `/prd` + `/spec` formalize the discovery contract; `/build` (auto) implements; subagent-driven per task.

### M2 — Phase 1.5 interview gates + substrate decision tree

**Goal:** The five interview gates (mode, trigger model + overlay-sequencing sub-q, substrate via the decision tree, aha moment, primary role) feeding the build.
**Files:** `scripts/build/substrate_tree.py`, gate logic in `skills/walk/SKILL.md`.
**Key tasks:** implement the substrate decision tree (`_seed.md` §3) as a resolver that's run before asking (ask only to confirm/resolve overrides); encode the five gates with their defaults; the overlay-sequencing question ("what else fires on first login?").
**Test strategy:** unit-test `substrate_tree.py` over each branch (non-React→Driver.js, Next.js multi-route→NextStep, shadow DOM→untourable, config-only→Driver.js mandatory, etc.).
**Acceptance:** given Phase 1 output + answers, resolves the correct substrate and gate set; never asks a question the tree already answers.
**Cart mapping:** part of `/spec` + `/build`.

### M3 — Phase 2 tour generator (drop-in module, Shape A)

**Goal:** Emit a working Driver.js drop-in tour module themed to the app, with replay export, SSR guard, progress indicator, onboarding-state reuse, and benefit-led copy.
**Files:** `scripts/build/emit_tour_module.py`, generator logic in `skills/walk/SKILL.md`.
**Key tasks:** steps-config + `start(onDone)` emitter; ≤5 steps enforced (warn+approve to exceed); copy ≤25 words/step in the audience register; replay export; SSR guard; reuse the host's existing first-run flag (don't invent one); progress indicator default.
**Test strategy:** snapshot-test the emitted module against fixtures (a 4-stop tour); assert the 5-step cap enforcement; assert SSR guard + replay export present.
**Acceptance:** emits a module that matches the Celestia3-quality bar, honoring all D1–D4 constraints.
**Cart mapping:** `/build` (auto).

### M4 — Anchor-injection codemod (the trust spine)

**Goal:** The jscodeshift codemod that auto-injects `data-tour` only on the 4-gate-safe subset and emits `REVIEW_NEEDED.md` for everything else, halting for human resolution.
**Files:** `scripts/anchors/inject_anchors.js`.
**Key tasks:** jscodeshift `--parser tsx` transform; the four AUTO-INJECT gates (intrinsic/imported-named, single root return, no HOC/dynamic/render-prop, idempotent); reason-coded `REVIEW_NEEDED.md` for skips; emit diff patch; never touch logic.
**Test strategy:** codemod tests over JSX fixtures — a clean component (auto-injects), an HOC-wrapped one (→ REVIEW_NEEDED), a fragment-root (→ REVIEW_NEEDED), an already-anchored one (idempotent skip).
**Acceptance:** auto-injects the safe subset correctly, routes the rest to REVIEW_NEEDED with accurate reason codes, idempotent on re-run.
**Cart mapping:** `/build` (auto); this is the milestone most worth a careful review gate.

### M5 — Analytics wiring + replay

**Goal:** The 6-event schema bound to Driver.js substrate hooks + `TOUR_ANALYTICS.md`, so no tour ships dark.
**Files:** `scripts/build/emit_analytics.py`.
**Key tasks:** map the 6 events to substrate callbacks (onHighlightStarted/onNextClick/onDestroyStarted); emit `TOUR_ANALYTICS.md` naming events + host activation event + 7d/14d windows.
**Test strategy:** snapshot-test the emitted wiring; assert all 6 events present + the doc lists windows.
**Acceptance:** emitted tour fires all 6 events; doc is accurate.
**Cart mapping:** `/build` (auto).

### M6 — Self-evolution, vitals, docs, marketplace prep

**Goal:** Wire L3 evolve-walk + friction triggers, add vitals self-test, write README in the marketplace voice, prep the marketplace.json entry (not pinned until tagged).
**Files:** `skills/evolve-walk/SKILL.md` (complete), `skills/vitals/SKILL.md`, `docs/README.md`, friction-trigger wiring across skills.
**Test strategy:** vitals self-test runs green; evolve-walk reads session/friction logs without error.
**Acceptance:** plugin self-tests pass; README explains the earn-the-tour philosophy + the honest step-ceiling framing.
**Cart mapping:** `/iterate` + `/reflect`.

---

## How this executes (auto with Cart + checkpoints)

1. Phase C kickoff: `git init Vibe-Walk`; carry `_seed.md` + cowpath + this plan into `docs/inputs/`.
2. Cart `/onboard` (auto) — builder profile, Sherpa persona, architecture; seeded by the inputs.
3. Cart `/scope → /prd → /spec → /checklist`, auto within each phase, **artifact surfaced at each boundary for a quick yes** (the Q3 decision). `_seed.md` pre-satisfies most of scope/prd/spec; `/checklist` bite-sizes the current milestone.
4. Cart `/build` (auto) executes the milestone, subagent-driven (fresh implementer per task + two-stage review, as on the Celestia3 tour). Milestones built in order M0→M6; M1 is the priority differentiator.
5. Cart `/reflect` closes; tag the solo repo; bump `vibe-plugins/.claude-plugin/marketplace.json` (separate, deliberate step).

## Test strategy (cross-cutting)

- Plugin scripts (Python/JS) are unit-tested against fixture repos — the discovery readers, the verdict logic, the substrate tree, the emitters, and the codemod all get fixture-driven tests. This is where TDD bites.
- SKILL behavior is verified by the plugin-validator + skill-reviewer agents and by dogfooding against a real app (Celestia3 is the natural first dogfood — re-generate its tour through the plugin and compare to the hand-built one).
- The "don't-build" verdict gets a truth-table test over every condition.

## Risks carried from the seed

Step-ceiling is single-vendor data (state honestly in copy) · no control-group proof tours help (why verdict-first matters) · jscodeshift/ts-morph JSX edge cases (contained by the 4-gate rule + REVIEW_NEEDED) · web-only v1 (state the boundary). See `_seed.md` §5.

## Self-Review

**Spec coverage:** every `_seed.md` section maps to a milestone — Phase 1 + verdict → M1; interview gates + substrate tree → M2; generators → M3/M5; codemod → M4; GENERATE/ASK/AVOID enforced across M3–M5; self-evolution → M0/M6; deferred items explicitly out of scope. Covered.
**Decomposition rationale:** master-plan + per-milestone bite-sizing is the writing-plans-sanctioned pattern for a multi-subsystem build; Cart's `/checklist` provides the per-milestone bite-sized expansion at build time, avoiding premature/duplicated detail.
**Consistency:** decision ids (D1–D6), file paths, and the substrate/anchor contracts are used identically across milestones and match `_seed.md`.
