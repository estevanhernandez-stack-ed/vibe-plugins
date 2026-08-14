# vibe-runbook v0.2 — authoring

**Status:** design, approved in conversation 2026-08-13. Not built. Depends on v0.1 shipping first.
**Predecessor:** [`2026-08-13-vibe-runbook-v0.1-design.md`](./2026-08-13-vibe-runbook-v0.1-design.md),
built and tested at 139 passing, unpublished pending three extraction fixes.
**Evidence:** two cowpath walks, one remediation, and a dogfood pass across five real runbooks in the
626 estate on 2026-08-13.

## Why this reopens a settled decision

v0.1 was scoped verify-only, deliberately, because the cowpath only ever verified. That held until the
plugin met documents nobody wrote for it.

On PriceScout's operations runbook it extracted **0 claims from 321 blocks**, because the document
writes `Should be "closed"` where the extractor wanted `**Should:**`. On STAR's own runbook, freshly
remediated on this plugin's advice, it found **0 pins from 26 claims**, because a human wrote
``- revision: `gcloud …` `` where the extractor wanted ``Revision — run: `gcloud …` ``. Across five
foreign runbooks: **zero bolded markers, total.**

Both failures are one failure. The author stated the claim plainly and the tool insisted on a
different spelling. Widening the marker vocabulary fixes the hand-written case, and it ships in v0.1.

Authoring closes the same gap from the other end, and more completely: **a generated runbook is
machine-checkable by construction**, because the thing that writes it is the thing that reads it.

## What v0.2 is

`:author` inspects an application, drafts an operations runbook, verifies every claim before writing
it down, and emits a document that arrives having already passed its own walk.

## What v0.2 is not

- **Not a wizard.** An interview per application is the friction that kills "I need a lot of these."
  Questions are a last resort for the residue, asked only after inference has exhausted itself.
- **Not a per-stack adapter farm.** See *Evidence gatherers*.
- **Not an overwriter.** It never replaces a runbook you wrote.
- **Not an executor.** It reads, navigates and enumerates. It never deploys, never submits a form,
  never calls a tool that bills.

## Command surface

Adds one command to v0.1's six (`vibe-runbook`, `scan`, `walk`, `remediate`, `vitals`,
`evolve-runbook`).

```
/vibe-runbook:author [--project <path>] [--out <path>]
```

`--project` is the application root, matching v0.1's flag exactly. `--out` names the destination
document and defaults to `docs/RUNBOOK.md` under the project root; when that file already exists the
proposal is written beside it rather than into it, per *never clobbers* below.

Ends by running `:walk` against what it just wrote, so generation and verification are one act.

## Evidence gatherers

The load-bearing architectural decision: the generator does not "read the repo," it runs a set of
**gatherers**, each optional, each reporting what it found *and what it could not*.

| Gatherer | Yields | Absent means |
|---|---|---|
| `source` | scripts, Dockerfile, CI config, `.env.example` key names, route tables, test commands | never absent |
| `git` | current revision, remote, deploy tags | not a git repo, header pins thinner |
| `browser` | operational surfaces actually navigated and rendered, via Playwright | no surfaces section |
| `mcp` | a live tool surface, arguments, declared cost tiers | no agent-door section |
| `process` | running services, bound ports, log locations | thinner observability section |
| `manifest` | vibe-access `agent-access.json` where present: routes, auth model, baseUrls | re-derive from `source` |

These are **sources, not stacks.** That distinction is the point. vibe-access spent most of its
complexity on a per-stack adapter seam and still only ever went deep on one stack; a portfolio
spanning Node, Python, Firebase, Cloud Run, WPF and Roblox cannot afford that tax six times. A
gatherer asks "what evidence can I collect here," not "what framework is this."

**Every gatherer degrades honestly.** No Playwright, no surfaces section, and the runbook says which
sections are thinner and why. A missing gatherer is a stated limitation, never a silent omission.

## The loop: gather → draft → verify → emit

Nothing is written down that was not confirmed.

1. **Gather.** Run every available gatherer. Record what each could not reach.
2. **Draft.** Assemble candidate claims per section.
3. **Verify.** Walk each candidate through the v0.1 verifier *before* it reaches the page.
4. **Emit.** A claim that verified is written as a passing claim with its evidence. A claim that could
   not be verified is written with its real verdict, or not written at all if it was speculative.

The consequence worth stating plainly: **a generated runbook arrives having passed its own walk.**
Pins are emitted as commands rather than values from the first line, so they are self-answering by
construction and the staleness problem never starts.

## Emission taxonomy

| Section | Derived from | Verified at birth |
|---|---|---|
| Header pins | `git`, deploy config, live service | Yes, as self-answering commands |
| Run it locally | `package.json` scripts, Dockerfile, `.env.example` key names | Script exists, port declared |
| Health check | probe, `browser` | Yes, or it says the endpoint did not answer |
| Deploy / rollback | `scripts/*.sh`, CI workflows | Existence and invocation only, never execution |
| Logs and observability | `process`, cloud config | Command exists and resolves |
| Operational surfaces | `browser` | Yes: it rendered, or it is not in the document |
| Agent door | `mcp` `tools/list` plus cost tiers | Yes, enumeration is free |
| Incident response | little to nothing | No. This is the residue. |

**`.env` key names are emitted; values never are.** Inherited from v0.1's never-print-a-secret rule,
and it applies to a generator with more force, because a generator writes to a file that gets
committed.

## Unwritten sections are a document property, not a verdict

The design decision most likely to be got wrong, so it is stated explicitly.

The six verdicts answer *what happened when I checked this claim*. An unwritten section is not a
claim, so it has no verdict. Adding a seventh state for it would inflate the vocabulary that is
already this plugin's hardest thing to keep legible.

Instead `:author` emits stubs carrying their own question:

```markdown
**Unwritten:** Who gets paged when the error rate crosses its threshold, and what is the threshold?
```

`:scan` recognizes those and counts them **separately from claims**. The report gains a completeness
line beside the coverage line it already prints:

```
read 41 of 210 content blocks in the document
checked 12 of 18 enumerated
3 sections unwritten — escalation, degraded-but-acceptable, on-call ownership
```

No new verdict, no new shape. Every walk reports the document as incomplete, and exactly where, until
the gaps are filled. The runbook becomes self-describing about what it does not say.

This is the same move as the value-to-command rewrite: rather than remembering to invalidate
something, make it structurally unable to go quiet.

## Safety during generation

v0.1 was read-only against a target it never touched. Generation drives the application, so the
discipline needs teeth:

- **The browser gatherer navigates and observes.** It never submits a form, never clicks a control
  that mutates, never authenticates as anyone but the invoking user.
- **Nothing spends.** Enumerating an MCP tool surface is free; calling a tool that bills is not. The
  `SPENDS` accounting from v0.1 applies to generation unchanged.
- **Deploy and rollback invocations are recorded, never run.** Their presence is verified by the
  script existing, not by executing it.
- **Never print a secret**, extended: never write one to a file either.

A generator that pokes production while documenting production is a worse failure than a stale
document.

## `:author` never clobbers

If no runbook exists, write it. If one exists, write a proposal alongside and show the diff for the
user to merge. Backup before any write, per v0.1's `backupFile`.

A tool whose product is trustworthiness does not overwrite a person's documentation because it
believed it knew better.

## Composition with v0.1

`:author` → `:walk` → `:remediate` is one loop, and each part already exists or is being added here:

- **author** writes it, machine-checkable by construction.
- **walk** keeps it true as the application moves.
- **remediate** rewrites what drifted, and its `value-to-command` template produces exactly the
  self-answering form `:author` emits natively.

Generated runbooks and hand-written ones converge on the same shape, from opposite directions.

## Testing

- **Round-trip on a real application:** author a runbook, walk it immediately, and require every
  emitted claim to pass or carry an honest non-PASS verdict. A generated claim that fails its own
  birth walk is a defect in the generator, not in the application.
- **The negative control matters as much as the positive.** Run against an application with no
  deploy script, no Dockerfile, no MCP surface and no reachable environment. The output must be a
  thin, honest runbook that names what it could not gather, never a plausible-looking fiction.
- **Secret leakage:** assert no `.env` value reaches an emitted document, on a fixture whose
  `.env` holds recognizable sentinel values.
- **Non-clobber:** assert an existing runbook is byte-identical after `:author` runs against it.
- Real-application validation before stable, per family convention. PriceScout and Reel-Battles are
  the obvious first targets: both have hand-written operations runbooks already, so generated output
  can be read against a human's version of the same document.

## Open questions

1. **How much does `browser` need to log in?** Most operational surfaces sit behind auth. Reusing
   v0.1's credential preflight is the obvious answer and it is unproven for a browser session.
2. **What is the residue, actually?** The claim that inference plus tooling shrinks "institutional
   knowledge" to business thresholds and escalation ownership is a hypothesis from one conversation.
   The first real `:author` run against PriceScout tests it, by comparing what was generated to the
   hand-written runbook that already exists.
3. **Does a generated runbook earn a vibe-walk tour?** The seed positions this pillar as walk's
   precursor. An authored, verified path is a better tour input than an inferred one. Untested in
   both directions.
