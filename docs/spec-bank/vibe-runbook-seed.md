# Seed: the runbook pillar — documentation that proves itself

**Status:** cowpath-evidenced, unnamed, unbuilt. Seeded 2026-07-25.
**Working name:** `vibe-runbook`. Not settled — the plugin verifies runbooks more than it writes them, and the name should probably say so.

**Provenance note, load-bearing:** the cowpath was walked in a walled employer tenant. **Nothing in this document carries implementation detail from it** — no endpoints, hostnames, credential paths, service names, or wire contracts. What is captured is the shape of the pattern, which is Este's and portable. Any build starts clean from this document, never from an extraction.

## The job

A runbook says: do X, then Y, then Z, and you will see W.

Nothing checks whether that is still true. Code has tests. Docs have linters that check they exist and parse. Nothing walks the documented path against a running system and reports which promises still hold.

This plugin treats **the runbook as an executable test spec**: the runbook is the specification, the running environment is the system under test, and every numbered step and parenthetical claim is a testable assertion. It reports per-section, with evidence, and it tests the documented behavior rather than the code.

## Why the family needs it

| Plugin | The question it answers |
|---|---|
| vibe-doc | Does documentation exist, and is it complete? |
| vibe-test | Does the code do what the *tests* say? |
| vibe-access | What surface can an agent actually reach? |
| vibe-walk | Does this app warrant an onboarding tour, and what is the aha moment? |
| **this** | **Does the doc still tell the truth about the running system?** |

Nothing currently catches a runbook that quietly went stale. That is the gap.

## The vibe-walk relationship — precursor, not sibling

Este's framing, and it reshapes the design.

A runbook and an onboarding tour are **the same artifact at two fidelities**: both describe the path a person takes through the app. Prose first, rendered second. That yields a pipeline:

```
author the path  ->  verify it against the running app  ->  render it as a tour
   (a runbook)          (this plugin)                        (vibe-walk)
```

Two consequences worth building for:

1. **A verified runbook is a strictly better input to vibe-walk than inference.** Walk currently reads UI surfaces and infers the path. A human-authored, machine-verified path is higher-signal than an inferred one, and it already encodes what matters versus what is incidental.
2. **This plugin's output feeds walk's "does it earn a tour" verdict.** A runbook that passes end-to-end and is genuinely non-obvious is evidence a tour is warranted. A runbook that is three trivial steps is evidence against. Walk shipped that verdict as its differentiator; this supplies better evidence for it.

The composition is one-directional and optional in both directions. Neither plugin should hard-depend on the other.

## What the cowpath proved

Walked three times, independently, by role. What held up:

**Role-scoped walkers.** One walker per audience, because a runbook's claims are audience-specific and a single walker either over-tests or under-tests. Each walker knows which sections apply to it and which are out of scope.

**Environment as a parameter.** The same runbook is walked against local, a shared pre-production environment, or production, with different auth and different permissions at each. Environment is an invocation argument, not a fork of the runbook.

**A four-state verdict, not pass/fail.** PASS, FAIL, **BLOCKED**, **HUMAN**. The last two are what make it usable:
- **BLOCKED** — the walker could not test the claim (environment down, credential expired, dependency unavailable). Distinct from FAIL, because a BLOCKED run is not evidence the doc is wrong.
- **HUMAN** — the claim is real but not machine-verifiable (a visual judgment, a physical action, something requiring a second person). Naming these keeps the report honest instead of quietly scoring them as passes.

**Read-only against anything deployed.** The walker reads. Writes are opt-in, deliberate, and never incidental. A verification pass must be safe to run against a live system.

**Credential preflight that hard-stops.** Check the credential before starting; if it is missing or expired, stop and report BLOCKED with the exact ask. **Never silently fall back to a local environment** — a green run against the wrong target is worse than no run, because it reads as evidence.

**Never print a secret.** Command output lands in a transcript. Report shapes, statuses, and counts; never tokens.

**The contract source beats the guess.** When the runbook is ambiguous about an interface, the walker reads the actual client or contract definition rather than inferring. Runbooks drift; contracts are checked by a compiler.

## Dual-tenant from day one

Este's stated intent: usable in both the walled employer tenant and the 626 estate. That is a design constraint, not an afterthought.

- **No 626 branding, personas, or dashboard coupling in anything the plugin emits.** The family decision-log-backend convention already makes "none" a first-class answer; this plugin must honor it without degrading.
- **No telemetry, no outbound calls** beyond what the walk itself performs against the target the user names.
- **Tenant-neutral output.** Reports name the runbook and the environment, nothing about who owns them.
- The vibe-keystone v0.3 tenant-interview pattern is the reference implementation for getting this right — read tenant docs as both a source and an exclusion list.

## Shape sketch

Command surface, provisional:

- `:scan` — inventory runbooks in the repo, classify each by audience and by how much of it is machine-checkable. Read-only.
- `:walk <runbook> [env=...]` — the core loop. Walk it, report per section with evidence.
- `:verdict` — the roll-up across walks: which runbooks are trustworthy, which are stale, which are mostly HUMAN and therefore unverifiable by design.
- Router + `:vitals` + evolve loop per family convention.

Open on shape:

- **Does it author runbooks, or only verify them?** The cowpath only verified. Authoring is a larger and different job, and vibe-doc is adjacent. Leaning verify-only for v0.1.
- **Where do walkers come from?** The cowpath hand-wrote one per role. Generating them from the runbook's own structure is the obvious next step and is unproven.
- **How is a HUMAN step handled on re-run?** Cached last-known answer with an age, or asked every time. Unresolved.

## What is unproven

- Everything above was walked against **one application** in one stack. The role-scoping and four-state verdict are likely general; the specifics of preflight and contract-reading may not be.
- No evidence yet that walker generation from a runbook's structure works.
- The vibe-walk composition is a design idea, not a tested one. Neither side has been built against the other.

## Next act

Walk the cowpath once more **in the 626 estate**, on an app with a real runbook, to separate what is general from what was specific to one stack. That is the same birthing pattern the family already uses: hand-build the real job, capture the notes, then build the plugin from two independent walks rather than one.
