# RFC: model-tiering annotations for dispatch sites

**Status:** PROPOSED — 2026-06-09, written inside the Fable 5 window. Ratification + three reference implementations turn this into a STANDARD.
**The idea:** skills that instruct spawning subagents should declare *what kind of work* each dispatch is, so the orchestrating session can route bulk work to cheaper/faster models and keep judgment on the strongest available — without any skill ever pinning a model ID.

## Why now

The family survey (2026-06-09) found dispatch instructions in vibe-doc (`:generate` fans out one subagent per doc type), vibe-cartographer (`:build` dispatches per checklist item; `:spec` self-review; `:evolve-cart`), vibe-prompt (`:eval` judge dispatches, `:iterate` creative call), and vibe-thesis (sub-skill dispatch). Exactly **one** site carries model guidance today (vibe-prompt `:iterate` → haiku, with a written rationale). Everywhere else, a session running on an expensive model spends it on bulk file-reading, and a session on a fast model spends it on judgment calls. The capability now exists to route per-dispatch (the Agent tool takes a model override; Workflow `agent()` takes `opts.model`); the skills just never say which tier a dispatch deserves.

## The vocabulary — three tiers, no model names

| Tier | What it marks | Routing guidance |
|---|---|---|
| `judgment` | Review gates, synthesis, adversarial verification, anything where the model's verdict IS the deliverable | The session's model. Never downgrade. |
| `bulk` | Volume execution from a tight spec: reading many files, generating from a checklist item, grinding tests, mechanical migration | A strong-but-cheaper tier than the session model when one exists; the session model otherwise. |
| `creative-divergent` | Brainstorm/ideation where breadth beats rigor | The cheap/fast tier. (The existing vibe-prompt `:iterate` haiku call is this tier, retroactively.) |

**Hard rule: tiers, never model IDs.** Model names drift (vibe-prompt's F6 finding class exists because apps pin IDs). A SKILL says `tier: bulk`; the *orchestrator/session* owns the tier→model mapping for its era. Skills MAY note a rationale, never a model string.

## The annotation format

At each dispatch site in a SKILL, one line in the dispatch instruction:

```
Dispatch tier: bulk — workers execute checklist items from the written spec;
the orchestrating session reviews each result (judgment stays here).
```

And one mapping note in each plugin's guide SKILL (shared, not per-site):

```
Model tiering: this plugin annotates dispatch sites with tiers per the
family RFC (vibe-plugins docs/conventions/model-tiering-rfc.md). The
session maps tiers to models; when no cheaper tier is available, all
tiers run on the session model — annotations are routing hints, never
requirements.
```

## Reference implementations (the ratification path)

1. **vibe-doc `:generate`** — the parallel per-doc fan-out: doc-drafting subagents = `bulk`; the synthesis/interview beats stay `judgment`. Best first case: N-way parallelism multiplies the savings.
2. **vibe-cartographer `:build`** — autonomous-mode per-checklist-item dispatch = `bulk`; the orchestrator's verification + the spec self-review = `judgment`. Pairs naturally with the new Autonomy Mode contract (v1.10.0).
3. **vibe-prompt `:eval`** — judge dispatches = `judgment` (calibration is the product); fixture composition = `bulk`; and `:iterate`'s existing haiku call gets formalized as `creative-divergent`.

## Non-goals

- No tier annotations for main-session work (tiers describe *dispatches*).
- No cost accounting in SKILLs (sessions own spend; cost lines belong to external API hits only).
- No mandatory routing: a session without multi-model access ignores the annotations at zero cost.

## Open questions for ratification

1. Tier names final? (`bulk` reads slightly pejorative; alternatives: `execute` / `review` / `diverge`.)
2. Should the evolve skills' L3 reflection dispatches default to `judgment` family-wide (proposals are verdicts), or stay unannotated until each plugin's next evolve cycle decides?
