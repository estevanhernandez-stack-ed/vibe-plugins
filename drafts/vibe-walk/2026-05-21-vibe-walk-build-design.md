# Vibe-Walk — research-seeded build design

> Date: 2026-05-21 · Status: approved, pre-execution
> Builds the Vibe-Walk plugin (onboarding-tour + training generator) via a research swarm that
> strengthens the starting point, a superpowers grand plan, and an autonomous Cart build.
> Prior art: the cowpath (`drafts/vibe-walk/process-notes.md`) + the Celestia3 inaugural tour.

## Decisions (locked 2026-05-21)

- **Swarm topology:** tree + waves + shared context (Director branches into personified researchers; context compounds across waves).
- **Research breadth:** walkthrough-weighted (deep on consumer spotlight tours / first-run; light on B2B training, noted for the future training mode).
- **Cart autonomy:** auto-build with phase checkpoints (autonomous within each phase; artifact surfaced at scope / prd / spec / checklist boundaries for a quick yes before `/build`).
- **Build home:** new local solo repo `C:\Users\estev\Projects\Vibe-Walk` (`git init`, no remote yet — confirm before any GitHub push). Matches the marketplace solo-repo channel model.
- **Plan rigor:** keep the full superpowers spine. The research seed + cowpath feed **superpowers:writing-plans** to produce the grand implementation plan — we do NOT skip writing-plans. Cart then executes that plan auto-style.

## Three phases, sequential

```
Phase A  research tree            -> _seed.md (best tour + training patterns + Vibe-Walk recs)
Phase B  superpowers:writing-plans -> grand plan (seed + cowpath as inputs)
Phase C  Cart auto-build           -> the Vibe-Walk plugin in the new solo repo
```

A finishes and Este eyeballs `_seed.md` before B. The grand plan from B is reviewed before C builds.

## Phase A — the research tree

### Roster (personified)

**Root — "Sherpa" (Research Director).** Scopes the research questions (Wave 0), merges Wave 1 into
shared context, spawns Wave 2 deep-dives to fill gaps, writes the final `_seed.md`. Named for a
guide who leads the walk.

**Wave 1 — six researchers, parallel** (depth reflects walkthrough-weighting):

| Persona | Lens | Depth |
|---|---|---|
| Onboarding UX Veteran | first-run flows, spotlight tours, progressive disclosure, aha-moment sequencing | DEEP |
| Activation / PLG Analyst | what makes onboarding convert — time-to-value, completion vs skip, when tours help vs hurt | DEEP |
| Tour-Tech Scout | Driver.js / Shepherd / Intro.js / Reactour / NextStep; output shapes (config vs library vs markup), anchoring | DEEP |
| Dev-Tools Onboarding Expert | onboarding for technical products / CLIs / SaaS dev tools | MEDIUM |
| Anti-Pattern Contrarian | onboarding that annoys — forced tours, modal fatigue, layout-fragile tours; what NOT to generate | MEDIUM |
| L&D / Training Specialist | B2B curriculum, exercises, mastery tracking | LIGHT (note for future training mode) |

**Wave 2 — deep-dive sub-agents** Sherpa defines after reading the merged shared context, to fill
the 2-3 biggest gaps (likely candidates: anchor-stability strategies, tour-completion analytics,
AI-generated tour-copy quality, framework-agnostic output portability).

### Shared-context flow

1. **Wave 0:** Sherpa writes `_questions.md` — a per-persona research brief, derived from the
   cowpath's open questions + the two modes.
2. **Wave 1:** the six researchers run in parallel; each reads `_questions.md` + the cowpath, writes
   `findings/<persona>.md`.
3. **Merge:** controller merges Wave 1 into `_shared-context.md` (cross-cutting themes + gaps).
4. **Wave 2:** Sherpa reads shared context, names the gaps; controller dispatches deep-dive agents
   that read `_shared-context.md` and build on it → `deep-dives/*.md`.
5. **Synthesis:** Sherpa writes `_seed.md` — patterns + real examples + explicit
   **recommendations for Vibe-Walk** (phases, interview gates, output shape, what to generate, what
   to avoid). This is the input to Phase B.

### Output contract (every researcher)

Each findings doc ends with the same five-part shape:
`patterns -> real named examples -> what works -> what fails -> implications for Vibe-Walk`.
Grounded in real apps/products via WebSearch + WebFetch; tour libraries verified via context7.
No unsourced claims — name the app or cite the source.

### Directory layout (staging, beside the cowpath)

```
vibe-plugins/drafts/vibe-walk/research/
  _questions.md          # Sherpa, Wave 0 — the tree root
  findings/<persona>.md  # Wave 1
  _shared-context.md     # merged synthesis (controller)
  deep-dives/<topic>.md  # Wave 2
  _seed.md               # Sherpa synthesis -> Phase B input
```

## Phase B — the grand plan (superpowers:writing-plans)

Invoke superpowers:writing-plans with `_seed.md` + `process-notes.md` as inputs. Produces the grand,
bite-sized, TDD implementation plan for the Vibe-Walk plugin — phases, SKILLs, the two-phase
discovery+build engine, the interview gates, the output generators. Reviewed before Phase C.

## Phase C — Cart auto-build

1. `git init` `C:\Users\estev\Projects\Vibe-Walk` (local; remote only on explicit go).
2. Seed `Vibe-Walk/docs/inputs/` with `_seed.md`, `process-notes.md`, and the grand plan.
3. Run Cart auto-style with phase checkpoints: `/onboard -> /scope -> /prd -> /spec -> /checklist
   -> /build (auto) -> /reflect`. Cart's artifacts and the superpowers grand plan reconcile at
   `/checklist`; build executes against the reconciled plan (subagent-driven, like the Celestia3 tour).

## What strengthens the starting point

The cowpath gave us one validated walkthrough-mode job. The research tree adds the field's best
patterns across consumer onboarding, activation science, tour-tech, dev-tools, anti-patterns, and a
light training read — so Vibe-Walk's design is grounded in what actually works at scale, not just
our single Celestia3 data point.
```
