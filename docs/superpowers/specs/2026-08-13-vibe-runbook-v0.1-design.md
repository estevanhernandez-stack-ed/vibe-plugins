# vibe-runbook v0.1 — design

**Status:** design, approved in conversation 2026-08-13. Not built.
**Provenance:** two cowpath walks plus one remediation and re-walk.
[`../../spec-bank/vibe-runbook-seed.md`](../../spec-bank/vibe-runbook-seed.md) (walk 1, walled
tenant, pattern only) and
[`../../spec-bank/vibe-runbook-cowpath-2-star.md`](../../spec-bank/vibe-runbook-cowpath-2-star.md)
(walk 2, STAR, live).

**Name:** settled as `vibe-runbook`. The seed worried it names the artifact rather than the verb.
Keeping it, because the family names plugins after what they operate on — vibe-doc, vibe-test,
vibe-prompt, vibe-thesis, vibe-access — and consistency beats precision here. The description line
carries the verb.

## The job

A runbook says: do X, then Y, and you will see W. Nothing checks whether that is still true. Code has
tests, docs have linters that check they parse, and nothing walks the documented path against a
running system to report which promises still hold.

Every claim below is earned by a walk. Nothing here is invented.

## What v0.1 is

Three things, and nothing else:

1. **It finds the claims in a runbook and tells you what kind each one is.**
2. **It verifies the two kinds that can be verified, against a named environment, read-only and
   free.**
3. **It offers two rewrites for a stale pin, and a rule that picks between them.** Either the value
   becomes the command that answers it, or the value is deleted in favor of what it summarized.

## What v0.1 is not

Left unproven rather than designed on thin evidence. Each of these was reachable and was
deliberately not reached:

- **Role-scoped walkers.** Walk 1 hand-wrote one per audience; walk 2 had one runbook and one
  audience and could not test it.
- **Walker generation from a runbook's structure.** Unproven in both walks.
- **Environment as a parameter.** Walk 2 went live-only by choice, so "the same runbook against
  local, staging and prod" remains an idea. v0.1 takes an environment *name*, and that name is a
  label on the report, not a switch that reconfigures the walk.
- **HUMAN-step handling on re-run.** Untouched twice.
- **Authoring runbooks.** vibe-doc is adjacent. Verify-only, with one amendment: the report must be
  precise enough that authoring the correction is mechanical.
- **A walker that spends.** See *Cost*, below.

## Command surface

```
/vibe-runbook                                   router, state-aware, never auto-fires
/vibe-runbook:scan                              inventory runbooks, extract + classify claims
/vibe-runbook:walk <runbook> [--env <name>]     verify. Read-only on the target.
/vibe-runbook:remediate                         value-to-command rewrite. Opt-in, backed up.
/vibe-runbook:vitals                            health of the local state
evolve-runbook                                  L3 loop, per family convention
```

### Why `:scan` and `:walk` are separate

The classifier is the highest risk in this design. Splitting extraction from verification makes its
output inspectable *before anything acts on it*: read `claims.json`, confirm it called
`Revision star-00049-j5r` a pin and `the chain walk over all 17 stored rooms` a receipt, correct it,
then walk. A single pass hides the component most likely to be wrong.

Matches vibe-prompt's `scan → audit` and vibe-access's `scan → map → verify`.

### `:remediate` is a command, not a flag

The mutating path must be impossible to trigger by muscle memory. It is still **part of the
protocol, not a side door**: every walk report ends by naming the remediation available for what it
found, and the bare router offers it as a next move. Nobody needs to know the command exists to be
told it applies. It never fires without an explicit invocation.

## The claim model

A runbook is parsed into claims. Every claim carries a **shape**, and shape decides everything
downstream.

| Shape | What it is | Walked? | Example from STAR |
|---|---|---|---|
| `pin` | A present-tense identifying value. A promise about what you are looking at. | Yes | `Revision star-00049-j5r` |
| `status-assertion` | A checkable statement about behavior. | Yes | `every new route answers 401 unauthenticated` |
| `receipt` | Past-tense evidence of what was tested. Drifts by nature. | **No** | `the chain walk over all 17 stored rooms` |
| `human` | Real but not machine-verifiable. | No | `read it on screen, then Ctrl+P and read the PDF` |
| `unknown` | Could not classify. | No | — |

A receipt is **reported as a receipt and never failed.** This is the central correctness requirement
of the whole plugin. On STAR's runbook, three numbers had drifted innocently (17 rooms → 12,
Liverpool's 58 sources → 124, the test count) against one pin that had drifted for real. A tool that
flags all four is noise, and a tool that flags none misses the one that matters.

An `unknown` is reported as **QUESTION**, never guessed. Earned: `source_count` versus drawer
citations on STAR looked like a defect and resolved as undocumented-but-correct. Filing it as a
failure would have been wrong.

### Claim schema

Cached at `.vibe-runbook/state/claims.json`. Fields load-bearing enough to name here:

- `id`, `source` (file, line), `text` (verbatim)
- `shape` (above), `confidence`, `classifier_rule` — which rule fired, so a wrong call is debuggable
- `cost` — what verifying it would spend. **Required from v0.1** even though nothing spends. Two
  parts: `cost.raw`, the runbook's own words lifted verbatim (`"spends one check"`, `"no spend"`),
  and `cost.count`, an integer parsed from it when one is unambiguous, else null. **Units are
  runbook-defined strings and are never normalized across runbooks** — a "check" in one app has
  nothing to do with a "check" in another, and inventing a common currency would be the kind of
  asserted number this whole pillar exists to catch. Aggregation in the report groups by the raw
  unit string, which is how `"4 checks and 1 sweep"` is produced. See *Cost*.
- `venue` — whether this claim sits somewhere its reader can run a command. Input to the remediation
  rule; see *Remediation*. A runbook step is executable-venue, a served API description is not.
- `verdict`, `evidence`, `checked_at` (populated by `:walk`)

## The classifier

Grammatical heuristic first, escalate on doubt.

The signal is tense and function. A pin is **present-tense and identifying**: `Revision X`, `HEAD Y`,
`N tests green`. A receipt is **past-tense and narrative**: *"the chain walk over all 17"*, *"I proved
the chain wiring [...] at no cost"*. Rules are inspectable and named in the output, so a misfire is a
rule to fix rather than a black box to distrust.

Ambiguous claims become `unknown` and are reported as QUESTION. **The classifier never guesses**, and
a low-confidence classification is a QUESTION rather than a quiet default.

Rejected alternatives, with the reason:

- **Author markup** — zero false positives by construction, but only works on runbooks someone has
  already prepared. The runbooks that go stale are the ones nobody has touched.
- **Model judgment per claim** — handles the long tail, but costs a call per claim, is not
  inspectable when wrong, and can disagree with itself across runs. Fatal for a tool whose only
  product is being trusted about staleness.

## Verdict states

Six. The first four are from walk 1; SPENDS and QUESTION are earned by walk 2.

| State | Meaning |
|---|---|
| `PASS` | Verified against the environment, with evidence. |
| `FAIL` | Verified false, with evidence. |
| `BLOCKED` | Could not be tested. Environment down, credential missing, dependency unavailable. Not evidence the doc is wrong. |
| `SPENDS` | Verifiable only by spending. Reported, never incurred. |
| `HUMAN` | Real but not machine-verifiable. Named so it is not quietly scored as a pass. |
| `QUESTION` | Undocumented rather than untrue. |

### Coverage is mandatory output

Every report states `checked N of M enumerated`. This is not a feature, it is the fix for a defect
the second walk had: it extracted STAR's full route table, then probed seven of nine POST routes,
choosing the seven by judgment. The fix found six leaking routes; the walk had found five. A silently
sampled green report is worthless.

**Enumeration is mechanical and exhaustive, or the run is BLOCKED.** There is no sampling mode.

## The walk protocol

1. **Credential preflight, hard-stop.** Check before starting. Missing or expired means stop and
   report BLOCKED with the exact ask. **Never silently fall back to a local environment** — a green
   run against the wrong target is worse than no run, because it reads as evidence.
2. **Enumerate exhaustively** from the contract source, never from the runbook's prose. *The contract
   source beats the guess:* walk 2's first probe used invented paths and got four 404s, which read as
   verdicts would have been false FAILs against a runbook that was telling the truth. Reading the
   route table produced the real paths, which passed.
3. **Walk pins and status assertions only.**
4. **Probe write guards safely.** A read-only walker cannot verify a write route's documented refusal
   without attempting the write. The technique that works: **send a request that will fail validation,
   against a resource that does not exist.** Auth-first returns 401 and the claim is verified at zero
   cost; validation-first returns 422, which is itself the finding, and still nothing was written or
   spent. This found a real defect on STAR.
5. **Ask for the cheapest sufficient shape.** Reading four STAR rooms at the API's `full` default
   would have cost ~120,000 tokens to check counts and one chain link; the `summary` shape did it for
   a fraction. Verification that costs more than the thing it verifies does not get run twice.
6. **Never print a secret.** Report shapes, statuses and counts.

## The report is a decision point

The report does not end at a verdict table. It ends by naming what the reader can do, because a
SPENDS or a FAIL is the start of a decision rather than the end of one. Two exits, both named
explicitly:

- **Authorize the expensive claims.** The report states what a full walk *would* have cost, in the
  runbook's own units: *"a full walk would cost 4 checks and 1 sweep; I verified none of them."*
- **Rewrite the claims so they do not need spending.** The more interesting move, and the same
  insight as value-to-command: a claim that costs money to verify may be better restated as one that
  does not.

## Remediation: two templates, and the rule that picks between them

Both templates fix the **same** claim shape, a stale pin. They are not two features covering more
ground. Shipping one alone is a correctness defect, because the tool would then confidently offer the
wrong rewrite for a whole class of pins: `value-to-command` applied to *"There are six tools"* yields
something like *"run `tools/list` and count them"*, which is absurd. The right fix there was to stop
counting.

### The discriminator: can the reader execute?

| Where the claim lives | Fix | Because |
|---|---|---|
| A doc read by a human at a terminal | `value-to-command` | They have a shell. The value can be replaced by the invocation that produces it. |
| Static text with no execution context — served API descriptions, tool instructions, prose for a reader without the repo | `name-not-count` | A command is meaningless there. Replace the summary with the enumerable thing it was summarizing. |

This adds one field to the claim schema: **`venue`**, whether the claim sits somewhere its reader can
run a command. It is the input to the rule, and getting it wrong is how the tool offers nonsense.

### `value-to-command`

A stale pin becomes the invocation that produces it. STAR's remediation replaced
`Revision star-00049-j5r` with
`gcloud run services describe star [...] --format='value(status.latestReadyRevisionName)'`, and HEAD
with `git rev-parse --short HEAD`. **A pin that names its command cannot go stale, because there is no
stored value to diverge from.** That retires the highest-yield finding class rather than resetting
its clock.

### `name-not-count`

A summarizing value in unexecutable text is deleted in favor of what it summarized. STAR's fix
removed *"There are six tools"* rather than changing it to fourteen, and made the test assert that
**no** count string appears at all:

> *"A count in prose is a second source of truth that only ever drifts one way."*

Correcting the number resets the clock. Removing the class of claim stops it.

### Both

Confidence-routed per vibe-prompt precedent, with per-file backup and rollback. Opt-in only, via
`:remediate`, and always named in the walk report so the reader is told the fix exists.

**The discriminator is the part to test, not the templates.** Each template has one observation behind
it, which is thin — but the *rule* has one example on each side of the line, which is exactly enough
to state it and check it. STAR's fixture holds both answers.

## Cost

`cost` is a required field on every claim from v0.1, and **nothing in v0.1 spends.**

The asymmetry is deliberate. The field is expensive to retrofit: add it later and every cached
inventory is invalid, and worse, no user's runbook carries cost annotations because the convention
for declaring "this step spends" was never established. The knob is cheap to add and has no evidence
behind it — both walks were zero-spend by choice, so a spending walker has never been observed.

STAR's runbook annotates cost on nearly every step (`no spend`, `spends one check`, `this spends`),
and its README independently classifies all fourteen MCP tools as `free` / `writes` / `spends`. Two
authors in one repo reached for a cost taxonomy without prompting. The axis is real; the automation
of it is not yet earned.

**Open for v0.2:** whether a continuation walk spends on the user's behalf, or hands them the list to
run themselves. v0.1 is the latter, because a tool that spends unattended is what both walks
deliberately avoided.

## Dual-tenant, from day one

Per the seed, a design constraint rather than an afterthought:

- No 626 branding, personas, or dashboard coupling in anything emitted. The
  `decision-log-backend` convention already makes `none` a first-class answer; honor it without
  degrading.
- No telemetry. No outbound calls beyond the walk the user asked for, against the target they named.
- Tenant-neutral output. Reports name the runbook and the environment, nothing about who owns them.
- Data home follows the resolution ladder in `../../conventions/data-home.md`: `${CLAUDE_PLUGIN_DATA}`,
  then the legacy path, then **fail loud**. Never silently skip a write.

## Testing

TDD throughout. The corpus is the lucky part.

**STAR's smoke list is a ground-truth fixture.** It contains three pins that were genuinely false,
three receipts that drifted innocently, eight steps that are HUMAN by nature, one status assertion
that was false on six routes, and a remediation that has already happened — so the before and the
after both exist in git. The classifier can be tested against a known answer rather than against the
author's judgment.

Required before any ship:

- Classifier accuracy on the STAR fixture, stated as a number, with every misclassification named.
- A test that a receipt is **never** emitted as FAIL. This is the one that protects the product.
- A test that the remediation discriminator picks correctly on both STAR pins: the revision pin gets
  `value-to-command`, the tool count gets `name-not-count`. Both answers are known, and offering the
  wrong template is worse than offering none.
- A test that enumeration is exhaustive and that coverage is reported as a fraction.
- Round-trip on a second, non-STAR runbook before stable. Real-app validation is the family ship bar.

## Open questions

1. **Where does `:scan` look?** Runbooks have no naming convention. `docs/*.md` heuristics plus a
   config list is the obvious start, and it is a guess.
2. **How are claims extracted from prose?** The claim model assumes claims can be located. STAR's
   runbook uses a clean `Right:` / `Wrong and worth reporting:` structure that makes this easy, and
   that structure is Este's habit rather than a standard.
3. **What happens on the second walk of the same runbook?** Verdict history, drift-over-time, and
   HUMAN caching all live here, and all are unproven.

Question 2 is the one that could invalidate the design. If claims cannot be reliably located in an
arbitrary runbook, the classifier never gets a chance to be wrong.
