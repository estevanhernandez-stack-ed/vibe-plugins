# vibe-recall (codename BT4) — design

**Date:** 2026-08-11
**Status:** design approved, plan pending
**Tagline:** You already built this.
**Codename origin:** BT4, "the hook brings you back." Internal only; the shipped name is `vibe-recall`.

## The problem

86 git repos under the estate. The work in them is invisible at the moment it would help most: the spec/build phase of the next app. Features get rebuilt that already exist two directories over, and the only index of that prior art is human memory.

vibe-taker already ships the transport half of the fix: `:capture` lifts a feature out of a repo as a portable bundle, `:plant` drops it into another with stack-aware adaptation. But the shelf at `~/.vibe-taker/library/` only holds what someone remembered to capture. Nothing sweeps the estate and says *you already solved this, twice, here.*

vibe-recall is that missing half.

## Concern boundary

vibe-recall owns **recall**: index, match, verified brief. vibe-taker owns **transport**: capture, plant. Neither reaches into the other.

This split follows the precedent set when Vibe-Eval was folded back into vibe-prompt: concern boundaries justify plugin separation, infrastructure similarity does not. Recall and transport are genuinely different concerns. Recall answers "where did I do this and was it any good," transport answers "move it here without breaking it."

**The seam is one handoff, and it requires no change to vibe-taker.** `/vibe-taker:capture` takes `<path|file|glob>` with no flags and operates on the current repo. vibe-recall therefore emits the source repo path plus a ready-to-paste capture argument, and states that capture runs from that repo. A `--repo` flag on capture would be cross-plugin contract surgery and is explicitly out of v0.1 scope.

## Architecture

Four units, each independently testable, each with one job.

### Corpus resolver

Decides what is in scope. Two sources:

- **Local**: git repos under the configured estate root.
- **Remote-only**: repos under the configured GitHub account(s) whose remote matches no local clone, enumerated via `gh repo list`.

Three filters, applied in order:

1. **Tenant walls (hard).** A configurable list of path prefixes that are never indexed and never surfaced. `Marcus\` is seeded from the estate keystone and is not a preference: a walled path is a refusal, not a warning. Asserted by test.
2. **Archive exclusion.** Underscore-prefixed directories (`_old-*`, `_scratch`, `_gitnexus-runner`) plus a configurable `exclude[]`.
3. **Duplicate-clone collapse.** Group by normalized remote URL. Where two local directories share a remote, pick the canonical by most recent commit date and record the sibling on the card. **Where the pair has diverged, flag it rather than silently picking** — the estate documents at least one diverged pair (`Sanduhr` / `Sanduhr_f-r_Claude`) and a silent pick would launder that ambiguity into a recommendation.

Output: a repo list carrying `origin: local | remote`, `canonical: bool`, `siblings[]`.

### Indexer

Writes one card per repo at one of two depths.

**Shallow card** (cheap, built for every in-scope repo):

```json
{
  "schemaVersion": 1,
  "repo": "Celestia3",
  "origin": "local",
  "path": "C:/Users/estev/Projects/Celestia3",
  "remote": "github.com/estevanhernandez-stack-ed/Celestia3",
  "canonical": true,
  "siblings": [],
  "head": "a3f9c21",
  "indexedAt": "2026-08-11T14:02:00Z",
  "depth": "shallow",
  "stack": { "runtime": "node", "framework": "next@15", "services": ["firebase", "gemini"] },
  "deps": ["next", "firebase-admin", "@google/generative-ai"],
  "entrypoints": ["app/api/*/route.ts", "functions/index.ts"],
  "symbols": ["createCheckoutSession", "verifyIdToken"],
  "claims": ["swiss ephemeris", "natal chart", "i18n 9 locales"],
  "gotchas": ["ephemeris engine patched locally, see CLAUDE.md"],
  "recallHits": 0
}
```

Sources for a shallow card: manifests (`package.json`, `pyproject.toml`, `*.csproj`, `go.mod`, `Cargo.toml`), top-level tree, exported symbols and route/entrypoint globs, README claims, and the repo's `CLAUDE.md` gotchas where one exists. A keystone-bearing repo indexes richer for free, which is a nice second-order argument for keystoning the estate.

Remote-only repos index from `gh api`: README, language breakdown, top-level tree. Marked `depth: "shallow-remote"`, and every downstream surface says so.

**Deep card** (earned, not universal): adds a `features[]` array, each entry carrying `name`, `files[] {path, lines}`, `contract`, `patterns[]`, `gotchas[]`, `wouldRedo[]`.

**Cards store shapes, never content.** Symbol names, paths, dependency names, short claim strings. No file bodies, no `.env` contents, no matched secret values. Card construction runs a secret-shape scan and skips on hit. An index of 86 repos is a concentrated target; it does not get to be a credential store.

### Matcher

Query (a phrase, or a whole spec file) to ranked hits. Reads cards only. Never touches source, never hits the network.

Deterministic, documented score:

- Term hits, field-weighted: `claims` > `symbols` > `deps` > tree.
- Stack affinity to the current repo (a Next+Firebase hit ranks above a WPF hit when you are in a Next app).
- Card depth: deep outranks shallow at equal term score.
- Recency of last commit.
- Canonical bonus; non-canonical sibling penalty.

**Zero hits is a first-class output.** "No prior art in your estate" is a real answer and gets said plainly, following vibe-walk's don't-build precedent. A recall tool that always finds something is a recall tool that is lying.

### Verifier and briefer

The rule that makes the whole thing trustworthy: **the index can suggest, only a live read can claim.**

On a confirmed hit, re-read that repo at current HEAD and produce the brief:

```
PRIOR ART  stripe checkout
source     PriceScout @ 8c1f04a  (local, deep card, indexed 2026-08-09)

shape      src/lib/stripe/checkout.ts:14-96
           webhook  functions/stripe-webhook.ts:22-140
contract   createSession(items, uid) -> {url, id}
gotcha     idempotency key required on retry; test-mode webhook
           secret differs from live
redo       price ids were inlined — move to a catalog

take it    cd to PriceScout, then:
           /vibe-taker:capture src/lib/stripe/
```

No path reaches a brief without being re-read this session. A card whose HEAD has moved is marked stale in the hit list and re-verified before briefing; the brief always cites current reality, never the card's snapshot. This is the doctrine's recon-before-verdict and verify-before-synthesizing rules applied to a stateful index.

For a `shallow-remote` hit the brief is honestly limited: it names what the API could see, says the repo is not on this machine, and offers to clone before going further.

## Surfaces

```
/vibe-recall           router — state-aware next move
/vibe-recall:index     build/refresh shallow cards; staleness by HEAD hash
/vibe-recall:sweep     mine a phrase or a spec file for prior art
/vibe-recall:brief     verified brief on one hit + vibe-taker handoff
/vibe-recall:deepen    drain the deep-index queue
/vibe-recall:vitals    index coverage, staleness, queue depth
```

Plus `guide`, `session-logger`, `friction-logger` per family doctrine. `evolve-recall` lands at v0.2 once there are sessions to reflect on.

### The hook

A `UserPromptSubmit` hook, silent unless the prompt carries build intent ("build a", "add auth to", "we need X", "start a new"). On fire it injects a banner of at most three hits, one line each:

```
BT4 — you have built this before
  PriceScout    full checkout + webhooks     deep
  Celestia3     payment intent only          shallow
  626labs-hub   stripe customer portal       shallow
  /vibe-recall:sweep stripe checkout   for the evidence
```

**Hook budget is absolute: index reads only. No source reads, no network, no git calls.** If the banner cannot be produced inside that budget it does not fire.

Because the hook may not shell out to git, it cannot check HEAD. Staleness at hook time is therefore **time-based**: it compares each card's `indexedAt` against a configurable age threshold. HEAD-hash staleness is the stricter check and belongs to `:index`, `:sweep`, and `:brief`, which are allowed to call git. When the index is missing, or every candidate card is past the age threshold, the hook emits one nudge line instead of a hit list.

### The Cart seam

vibe-cartographer's `:spec` and `:checklist` call `:sweep` against their own artifact when vibe-recall is installed, and skip silently when it is not. Same optional-composition pattern vibe-iterate already uses with Cart. Cart never hard-depends on vibe-recall.

## The queue

`:index` writes every repo shallow. Recall hits increment a repo's `recallHits`. `:deepen` drains the queue in demand order, so the repos actually reached for get deep cards first and the long tail never costs a token.

**The queue is a derived view, not a second source of truth.** It is computed from the cards themselves: everything at `depth: "shallow"`, ordered by `recallHits` descending, then last-commit recency. There is no separate queue file to drift out of sync with the index.

Cards and their derived queue live centrally in the plugin data home. **Nothing is written into the 86 repos**: no dirty trees, no gitignore decisions, no index churn in anyone's diff.

**Data home** implements the family resolution ladder from birth:

```
1. ${CLAUDE_PLUGIN_DATA}                      # blessed, gated on the family verification
2. ~/.claude/plugins/data/vibe-recall/        # legacy family location
3. fail LOUD                                  # never silently skip a write
```

This matters more here than for most plugins: this estate runs a second config home (`~/.claude-personal`), which is exactly the split-brain case the convention was written against.

## Configuration

First-run setup captures and writes one file:

- `estateRoot` — where the local repos live.
- `githubAccounts[]` — accounts to enumerate for remote-only repos.
- `walls[]` — tenant walls, seeded from the estate keystone, `Marcus\` pre-populated.
- `exclude[]` — additional path exclusions beyond the underscore rule.

Idempotent and re-runnable to refresh, per family first-run-setup convention.

## Error and edge handling

| Condition | Behavior |
|---|---|
| Card stale (HEAD moved) | Ranked normally, marked stale; brief re-reads live and cites current paths |
| Zero hits | Say so plainly. Not a failure state |
| Walled path encountered | Hard refuse. Never indexed, never surfaced, stated once |
| Diverged duplicate clones | Flag the pair and ask. Do not pick silently |
| Remote-only hit | Brief limited to API-visible detail, labeled, offers to clone |
| `gh` absent or unauthenticated | Local-only index, stated once, not an error |
| Secret shape found while indexing | Skip the file, record nothing, note the skip count |
| Index missing when hook fires | One nudge line, no hit list |

## Testing

Fixture-based, hermetic, following the family's validate-real-artifacts rule.

1. **Recall**: fixture repos with known prior art; assert the right repo ranks first.
2. **Wall**: a fixture under a walled prefix never appears in any card, hit, or brief. Non-negotiable.
3. **Dedup**: two clones of one remote collapse to a single hit with the sibling named; a diverged pair raises the flag instead.
4. **Staleness**: card built at HEAD A, repo advanced to HEAD B, brief cites B's paths.
5. **Secret hygiene**: fixture with a `.env` and a hardcoded key; assert neither value appears anywhere in the card.
6. **Hook budget**: assert the hook path performs zero file reads, zero network calls, zero git invocations.
7. **Zero-hit**: a query with no prior art returns the honest empty answer, not a stretched match.

## Not in v0.1

Held deliberately, so the first version ships:

- Public and open-source code search. Widening past your own work makes it a different product and puts licensing on every hit.
- Comparative briefs across multiple hits ("which of these three aged best"). Real value on repeated patterns like auth and Firebase init; costs 3x the reading. v0.2 candidate.
- A `--repo` flag on `/vibe-taker:capture`. Cross-plugin contract change, needs its own coordination.
- Cross-machine index sync.
- Any automatic planting. vibe-recall never writes code into a target.

## Validation bar

Real-app validation is this repo's ship bar, not its exception. vibe-recall ships when a live sweep against the actual estate surfaces prior art that would have changed a build decision, and the brief's cited paths verify by hand. The cowpath comes first: run the recall loop manually against one real spec, capture the process notes, then build from those notes.
