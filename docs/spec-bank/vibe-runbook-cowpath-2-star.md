# Cowpath 2: the runbook pillar, walked on STAR

**Status:** walked 2026-08-13, in the 626 estate, by hand. Companion to
[`vibe-runbook-seed.md`](./vibe-runbook-seed.md), which called for exactly this walk before any
build starts.

**Target:** [STAR](https://github.com/estevanhernandez-stack-ed/STAR), the Agentic Cinema hackathon
entry. Runbook under test: `docs/smoke-2026-08-12.md`.
**Environment:** live Cloud Run, `https://star-390753828501.us-central1.run.app`.
**Constraints, set before the walk:** read-only, zero spend, one runbook.

**Headline:** the walk verified 5 claims, failed 3, and could not reach 8 of 8 numbered steps. The
three failures were all in the runbook's preamble, all checkable in one command each, and none of
them cost a cent. The eight unreachable steps are the ones the plugin's shape sketch was designed
around. That inversion is the finding.

---

## The verdict

| Claim | Verdict | Evidence |
|---|---|---|
| "Working tree in sync with `origin/main`" | **PASS** | clean tree, `0 0` ahead/behind |
| Room export answers 401 unauthenticated (`.csv`) | **PASS** | `GET /api/rooms/{id}.csv` → 401 |
| Room export answers 401 unauthenticated (`.csv?chain=true`) | **PASS** | → 401 |
| `/api/rooms`, `/sweeps`, `/scenes`, `/import` answer 401 | **PASS** | all → 401 |
| MCP door refuses anonymous callers | **PASS** | `POST /mcp` → 401 + `WWW-Authenticate: Bearer resource_metadata=...` |
| "Revision `star-00049-j5r`" | **FAIL** | serving revision is `star-00050-wgc`, 100% traffic |
| "HEAD `0855bd2`" | **FAIL** | HEAD is `216b917`, two commits ahead |
| "**Every** new route answers 401 unauthenticated" | **FAIL** | 5 of 7 write routes answer **422**, before auth, with the field name |
| "931 tests green" | **BLOCKED** | grep finds 912 `def test_`, but parametrize expands at collection. Not a falsification. Needs a real run. |
| Steps 1 through 8 (all numbered steps) | **BLOCKED / HUMAN** | see below |

Steps 1-8 break down as: **BLOCKED (credential)** on all eight, because every one begins inside a
signed-in browser session. Layered under that, **BLOCKED (cost)** on 1, 7, 8a and 8e, which spend
real Gemini or Parallel budget, and **HUMAN** on 2, 3, 4 and 5, which ask a person to read a
rendered page, print a PDF, judge contrast, or open a file in Excel and Sheets.

Zero of eight numbered steps were walkable. Five of the preamble's summary claims were, and three
of those were wrong.

---

## What the walk found in STAR

Ranked by what Este should actually do about it, with 23 days to the Sep 5 submission.

### 1. The 401 claim is false, and it hands the API schema to anonymous callers

The runbook states, in its own "what I could verify" block: *"Every new route answers **401**
unauthenticated on the live service."*

Five of seven write routes answer **422** instead, because FastAPI validates the request body before
the auth dependency raises:

```
POST /api/rooms                  {}  -> 422  {"loc":["body","treatment"],"msg":"Field required"}
POST /api/rooms/{id}/sweep       {}  -> 422  {"loc":["body","scenes"],  "msg":"Field required"}
POST /api/rooms/{id}/questions   {}  -> 422
POST /api/rooms/{id}/scenes      {}  -> 422
POST /api/rooms/import           {}  -> 422
POST /api/rooms/{id}/bible       {}  -> 401   <- correct
POST /api/tokens                 {}  -> 401   <- correct
```

Control, proving auth does still run: `POST /api/rooms` with `{"treatment":"x"}` returns **401**.
The guard is intact. The ordering is what leaks. An anonymous caller can enumerate every required
field of every write route, one 422 at a time, without a credential.

Severity is low as a breach: nothing executes, no data moves, no money is spent. It matters for two
other reasons. It falsifies a claim the runbook makes about itself, and the runbook's own suite
asserts the 401 on the routes it happened to pick, which are the GET routes. That is the third time
in this build that a passing test has sat over an unasserted outcome, and the runbook already
confesses the first two: *"both times the test was asserting the input rather than the outcome."*

Fix is one line of ordering, making auth a router-level dependency rather than a per-route one.

### 2. An entire user-reachable surface shipped with no runbook coverage

The runbook was last edited at `12147aa`. Then `216b917` landed:

```
star/mcp/tools.py      | 650 +++++++++++++++++++++
star/server.py         | 373 +++++++++++++--------
star/mcp/router.py     |  16 +-
star/oauth/validate.py |  21 +
4 files changed, 919 insertions(+), 141 deletions(-)
```

That is the agent door, and it exposes 14 tools: `list_rooms`, `get_room`, `ask_room`,
`defend_claim`, `get_sweep`, `export_room`, `link_room`, `import_rooms`, `delete_room`,
`build_room`, `check_scene`, `sweep_draft`, `research_question`, `write_bible`. Three of them spend
money and one of them deletes a room.

The smoke list does not mention the agent door. Not one step. The README documents it well, so this
is drift between two docs rather than an undocumented feature, but the artifact whose entire job is
"here is what to check before you demo this" is silent on the newest and most destructive surface in
the app.

### 3. Both header pins are stale

`Revision star-00049-j5r` against a service now serving `star-00050-wgc`. `HEAD 0855bd2` against a
HEAD of `216b917`. Each is one command to check, needs no credential, and costs nothing.

Cheap to check, and load-bearing: the pins are what let a reader know whether the rest of the
document is describing the thing in front of them.

---

## What generalized from cowpath 1

Five of the seed's claims held under a completely different stack.

**The four-state verdict held, and BLOCKED did most of the work.** Without it this walk reports as a
catastrophe: 8 of 8 steps not passing. With it, the report is accurate and useful. PASS/FAIL alone
would have been actively misleading.

**Credential preflight, hard-stopping, held.** It was also the single largest determinant of
coverage. Preflight is not a nicety at the top of the run, it is the thing that decides how much of
the run exists.

**"The contract source beats the guess" earned itself inside sixty seconds.** The first probe used
invented export paths and got four 404s. Read as verdicts, those are a false FAIL against a runbook
that was telling the truth. Reading the decorator table out of `star/server.py` produced the real
paths, which answered 401 exactly as documented. A walker that guesses does not merely miss
findings, it manufactures them.

**Never print a secret held trivially,** and cost nothing to honor. `.env` was read for key names
only.

**Read-only against anything deployed held,** and proved insufficient. See below.

---

## What did not generalize

**Cost.** The seed has no notion of it, because the walled-tenant cowpath walked internal services
that do not bill per call. STAR bills per Gemini and per Parallel call, and its runbook annotates
every step accordingly: `no spend`, `spends one check`, `this spends`. Read-only and free are
different properties, and the first does not imply the second.

Two authors in this repo reached for a cost taxonomy independently and without prompting. The
runbook annotates steps; the README classifies all 14 MCP tools as `free` / `writes` / `spends`.
When the artifact and its documentation both invent the same axis, the axis is real.

**The machine-checkable fraction.** Cowpath 1 walked service and API surfaces. STAR's runbook is
browser-first: *"Open the room, press Sweep, wait, now reload"*, *"read it on screen, then Ctrl+P and
read the PDF"*. The numbered steps of a browser-first runbook are a script for a human, and no
amount of walker sophistication converts them.

**Role-scoping is still unproven.** One runbook, one audience. The walk could not test it.
**Environment-as-a-parameter is still unproven.** Only live was walked, by choice.

---

## What is new, and what it changes about the design

### SPENDS belongs in the verdict, not in a footnote

The seed's four states are PASS, FAIL, BLOCKED, HUMAN. STAR argues for distinguishing *blocked
because I could not* from *blocked because it would cost money*. They read identically in a report
and they mean opposite things to the person holding the budget: one is a defect in the environment,
the other is a deliberate, re-runnable choice. A spend budget should be an invocation argument
alongside environment, and the report should total what a full walk would have cost.

### A read-only walker cannot verify a write route's guard without attempting the write

This is the sharp edge, and it is general. The routes most worth protecting are exactly the ones a
read-only walker must refuse to touch. The guard can only be observed by doing the thing the guard
exists to prevent.

The escape hatch, which worked and which found finding 1: **send a request that will fail
validation, against a resource that does not exist.** If auth runs first you get 401 and the claim
is verified at zero cost. If validation runs first you get 422, which is itself the finding, and
still nothing was spent or written. The nonexistent-resource id is the second safety net: even a
fully broken guard has nothing to act on.

That technique is worth shipping as a primitive. It is the only way found so far to verify a write
route's documented refusal without risking the write.

### Claims cluster in the preamble; steps are where the humans live

Every claim this walk could verify came from the runbook's header and its "what I could verify"
block. Every claim it could not came from the numbered steps. A plugin built around walking numbered
steps would report near-zero coverage on STAR and read as useless, while three real, cheap,
currently-false claims sat unchecked four lines above step 1.

The design consequence: parse claims by **shape**, not by position. A pin (`revision X`, `HEAD Y`,
`N tests green`), a status assertion (`route R answers code C`), and a rendered-output judgment
(`anachronisms near the top, not buried`) are three different verification problems, and only the
first two are the plugin's business.

### Pins are the highest-value assertion in any runbook

Cheapest to check, most likely to be stale, and they gate the credibility of everything below them.
Had the plugin shipped with **nothing but pin-checking**, it would have earned its place on this
runbook today: two of two pins false, both caught in one command each, zero cost, no credential.

That is a viable v0.1 scope on its own.

### Drift is measured from the runbook's last commit, not its date or its pin

The file is named `smoke-2026-08-12.md` and its header pins `0855bd2`. It was actually last edited
at `12147aa`. All three disagree. Using the filename date or the self-reported pin both mislead;
`git log -1 -- <runbook>` then diffing that commit to HEAD is the honest measure, and it is what
surfaced the 919-line uncovered agent door.

---

## The seed's open questions, revisited

**"Does it author runbooks, or only verify?"** Verify-only still looks right, with one amendment: it
must report drift precisely enough that authoring the correction is mechanical. The most valuable
output of this walk was not a verdict, it was *"your pins say 00049 and 0855bd2, the truth is 00050
and 216b917."*

**"Where do walkers come from?"** Still unproven, but the preamble/steps split says generation should
key on claim shape rather than on role. Role-scoping was not exercised at all here.

**"How is a HUMAN step handled on re-run?"** Untouched. Still open.

---

## Next act

The seed asked for two independent walks before a build. There are now two. The recommendation is a
**v0.1 scoped to pins and status assertions**, which is defensible on this evidence alone, with
role-scoping and walker generation left explicitly unproven rather than designed on one data point.

Separately and immediately, three items belong back in STAR before Sep 5: fix the auth/validation
ordering, add an agent-door step to the smoke list, and refresh both header pins.

---

## Evidence appendix

Every command run, all read-only, all zero spend.

```bash
U=https://star-390753828501.us-central1.run.app
RID=00000000-0000-0000-0000-000000000000

# route contract, read from source rather than guessed
grep -rnE '@(app|router)\.(get|post|put|delete|patch)\(' star/

# unauthenticated GET surface
curl -s -o /dev/null -w '%{http_code}' "$U/api/rooms/$RID.csv"
curl -s -o /dev/null -w '%{http_code}' "$U/api/rooms/$RID.csv?chain=true"

# safe write-guard probe: invalid body, nonexistent resource
curl -s -X POST -H 'Content-Type: application/json' -d '{}' "$U/api/rooms"

# MCP discovery hop
curl -s -D - -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' "$U/mcp"

# pins
gcloud run services describe star --region us-central1 --project star-research-dept \
  --format='value(status.traffic[0].revisionName)'
git log -1 --format=%h                        # HEAD
git log -1 --format=%h -- docs/smoke-2026-08-12.md   # runbook's own last commit
git diff --stat 12147aa..HEAD -- star/ web/
```

One claim was checked and refuted rather than reported: the MCP metadata advertises
`https://star.626labs.dev` while the service is deployed at a `run.app` address. The custom domain
resolves to `ghs.googlehosted.com` and serves 200 on both `/` and the protected-resource endpoint.
Correctly mapped, not a finding.
