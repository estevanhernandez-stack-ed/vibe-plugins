# Vibe Test — proposed changes (external design review)

> Born 2026-05-22 from a candid "does this pass the litmus test" conversation.
>
> **This file is NOT the output of `/vibe-test:evolve`.** Evolve writes auto-generated,
> friction-derived proposals with unified diffs against specific SKILL prose. This file
> captures *external design review* — a peer-style read on whether vibe-test's frame
> holds up against the industry stack. Same destination spirit (the paper trail for
> what to change), different provenance (human reasoning + outside comparison, not
> friction.jsonl aggregation).
>
> When entries here mature into concrete SKILL edits, move them into a sibling
> `applied-changes.md` with the commit hash, same as the evolve flow expects.

---

## 2026-05-22 — External litmus-test review

**Provenance:** conversation with Claude (Cowork session), unprompted design review
in response to "does this pass the litmus test, is there something better?"

**Frame of the review:** how does vibe-test's score-the-repo-against-a-tier-threshold
approach hold up against the industry stack a stranger would reach for — SonarQube,
Stryker, OWASP ASVS, Snyk, CodeQL, DORA, the Joel Test.

### What's working (don't break these)

1. **Honest-denominator coverage is real, underserved value.** Most tools — Codecov,
   Jest's defaults, CodeClimate — let the project cherry-pick the denominator and walk
   away with a lying number. Forcing `--coverage.all` (vitest) / `collectCoverageFrom`
   glob (jest) and surfacing the adaptation prompt to the builder is a genuine
   correctness call, not a stylistic preference. Keep this front-and-center; it is
   probably the single most defensible thing the plugin does today.

2. **App-type × tier × modifiers as the frame.** Better than "% coverage" alone. The
   closest industry analog is **OWASP ASVS L1/L2/L3** — same shape (verification
   intensity scaled to risk), just battle-tested by a standards body. The fact that
   nobody else publicly frames test coverage this way for general apps is opportunity,
   not a sign the frame is wrong.

3. **Single locked formula shared between `audit` and `gate`.** Pure function, same
   input → same output across the two call sites. Real CI systems often get this
   wrong and the audit/gate drift becomes a trust-erosion bug. Don't unlock it.

4. **F2-above-all (harness break > everything).** Most CIs conflate "the test runner
   crashed" with "a test failed" and people stop trusting the signal. Calling this
   out as a first-class state is right.

5. **Exit code semantics (0 / 1 / 2).** Sounds boring. Matters a lot for CI ergonomics.

### Where it's load-bearing on guesses

1. **The tier thresholds (40 / 55 / 70 / 85 / 95) are hand-picked, not validated.**
   SonarQube's quality gates have the same problem, but they have millions of repos
   calibrating them. Yours has yours. This is the single biggest credibility gap for
   someone who didn't build the tool.

2. **The weighted-score formula's weights are author judgment.** Fine for one person.
   A leap of faith for a team. Either document the rationale per weight in
   `src/coverage/weighted-score.ts` (so future-you and others can challenge specific
   numbers), or treat the weights as defaults overridable per repo.

3. **Coverage % — even honest — is necessary but nowhere near sufficient.** Classic
   failure mode: 95% coverage with assertions that don't catch bugs. **Mutation
   testing** (Stryker for JS/TS, Pitest for Java, Mutmut for Python) measures whether
   tests *kill mutants* — i.e., fail when the code is wrong. This is the single
   biggest "are these tests real" signal in the industry and vibe-test doesn't have
   it. Adding it would more than double the defensibility of the score.

4. **Scope omissions.** Vibe-test does not touch code smells, duplication, dependency
   vulnerabilities, or maintainability. SonarQube, CodeClimate, Snyk, and GitHub
   Advanced Security each own a piece. Not necessarily a bug — just be honest about
   the slice.

### What "better" looks like, by question being asked

| Question | What you'd actually want |
|---|---|
| "Are my tests *meaningful*?" | Stryker (mutation testing) — kills coverage theater |
| "Is this code well-engineered?" | SonarQube / SonarCloud — smells + duplication + maintainability + coverage with industry-calibrated gates |
| "Is this secure?" | OWASP ASVS at the right tier + Snyk or GitHub Advanced Security (CodeQL) |
| "Are we shipping well?" | DORA metrics — deploy frequency, lead time, MTTR, change failure rate |
| "Just give me a human checklist" | The Joel Test (12 yes/no questions, from 2000, still works) |

### The verdict on the verdict

Vibe-test **passes** the litmus test of *"is there a useful gate that ties test
posture to risk tier for this app type."* That's a real, underserved question and
vibe-test answers it cleanly.

Vibe-test does **not** pass the litmus test of *"can I delete SonarQube and use this
instead."* It's a thinner slice than that, and pretending otherwise would be the
wrong positioning.

### Proposed unlocks (ranked by credibility gain per effort)

1. **Layer in mutation testing.** Defer Stryker via Pattern #13 when present in the
   ecosystem; treat mutation score as a parallel signal to coverage in the weighted
   formula (at tier ≥ `public-facing` it should arguably *replace* raw coverage in
   the weight). This is the single biggest "are these tests real" credibility win
   and it composes cleanly with the existing locked formula.

2. **Calibrate tier thresholds against an external standard.** Map `prototype` /
   `internal` / `public-facing` / `customer-facing-saas` / `regulated` to **OWASP
   ASVS L1 / L2 / L3** (plus a noted extension for the bottom two and an explicit
   regulatory overlay for the top one). Cite the mapping in the SKILL prose. Removes
   the "where did these numbers come from" objection in one move.

3. **Reframe as a thin orchestrator over SonarQube / Stryker / Snyk rather than as
   a competitor.** Vibe-test's app-type × tier × modifiers classification is the
   legitimately novel layer. Keep that. Defer the underlying measurement to the
   established tools when they're available (Pattern #13 already supports this
   posture; expand the anchored complements registry to cover them).

### Meta-observation (worth flagging separately)

**The `/vibe-test:evolve` SKILL's documented write target — `packages/vibe-test/
proposed-changes.md` — no longer exists in this monorepo.** The refactor that left
only `packages/core/` under `packages/` orphaned that path. Today, an actual
`/evolve` run would either hit its blocking prereq (*"the builder must be invoking
this from inside the Vibe Plugins monorepo (`packages/vibe-test/` reachable from
cwd)"*) and refuse, or — worse — silently create a phantom package directory.

That's a real bug in the evolve SKILL's prereq check or in the SKILL's documented
contract — depending on which is the source of truth post-refactor. Two fixes:

- **If the package path is gone for good:** update `skills/evolve/SKILL.md` to write
  to wherever the paper trail actually lives now (this file's location:
  `drafts/vibe-test/proposed-changes.md`) and update the blocking-prereq check to
  match.
- **If `packages/vibe-test/` should be restored:** restore it before the next evolve
  run; the prereq check is correct and the repo is just in a broken intermediate
  state.

Either way, the evolve flow can't ship a proposal today without one of those two
edits landing first. Worth catching before the next time `/vibe-test:evolve` is
invoked in anger.

---
