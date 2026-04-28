# 0002 — Knowledge and structural foundations, process pillars on top

## Status

Accepted (2026-04-27)

## Context

The 626Labs ecosystem grew from four plugins (Cartographer / Doc /
Sec / Test) — collectively framed as "vibe coding course correction"
plus three quality pillars — to seven, after Thesis Engine (research
feeder) and Vibe Thesis (academic authoring) shipped, and Vibe Keystone
(CLAUDE.md bootstrap) followed.

The original "four pillars" framing didn't accommodate the new plugins
cleanly. Thesis Engine isn't a process pillar; it produces knowledge
that the process pillars later operate on. Vibe Keystone produces the
structural file (CLAUDE.md) that every other plugin's agent decisions
rest on — it's even more upstream than knowledge.

We needed a frame that:
1. Made room for Thesis Engine and Vibe Keystone without forcing them
   into the wrong category.
2. Held up if more foundational tools landed later.
3. Communicated the architecture cleanly to first-time users (and AI
   agents) reading the marketplace description.

## Decision

The ecosystem has **two architectural layers**:

- **Foundations** — establish what you're working on and the contract
  agents operate against.
  - `thesis-engine` — *knowledge foundation.* Research feeder. Produces
    inputs (topics, sources, opposing positions, methodology) that
    downstream pillars later act on.
  - `vibe-keystone` — *structural foundation.* Bootstraps a tenant-aware
    `CLAUDE.md` so every agent invocation in the repo operates against
    a consistent contract.
- **Pillars** — process tools that shape how you work once foundations
  are in place.
  - `vibe-cartographer` — vibe coding course correction (idea →
    shipped app).
  - `vibe-doc` — documentation gap analyzer + generator.
  - `vibe-sec` — security gap finder.
  - `vibe-test` — test analyzer + generator.
  - `vibe-thesis` — long-form academic authoring.

The marketplace description, README, and `0001`'s aggregated-manifest
pattern all speak in this vocabulary.

## Consequences

**Positive:**
- New plugins have a clear architectural slot to fit into. A future
  "secrets-foundation" or "compliance-foundation" tool would land
  alongside `thesis-engine` and `vibe-keystone` without restructuring.
- The two-layer description is short enough to fit in a marketplace
  blurb and rich enough that a reader can predict each plugin's role
  before installing it.
- Cross-plugin orchestration logic can assume foundations run before
  pillars, not the reverse.

**Negative:**
- Today, `thesis-engine`'s output is academic-research-shaped, not
  software-project-shaped. To deliver fully on "knowledge foundation
  for the entire ecosystem," it eventually needs to also output briefs
  Cart's `/scope` or Sec's threat-model could ingest. The architectural
  framing writes a check that the implementation is still cashing.

**Neutral:**
- The "Vibe" prefix is descriptive but the framing is what carries the
  architecture. Plugin names are not load-bearing here.

## Alternatives considered

- **Five pillars (treat both new plugins as additional pillars).**
  Rejected — Thesis Engine and Vibe Keystone aren't process tools; they
  produce *inputs* that process tools consume. Calling them pillars
  collapses a real distinction.
- **Single "tools" frame with no architectural layering.** Rejected —
  loses the load-bearing ordering (foundations run before pillars), which
  matters for orchestration and for new-user comprehension.
- **Reframe Cart as the foundation (it produces the spec other tools
  follow).** Rejected — Cart is a *process* applied to a starting
  point; it doesn't establish the starting point itself.

## Notes

- Frame surfaced during a 2026-04-27 conversation captured in
  `data/stats/` adjacent decision logs and in the user's auto-memory.
- Marketplace blurb updated in commit `6db2687`; README architecture
  section updated in `405db66`; Vibe Keystone added in `cd9108e`.
