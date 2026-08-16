# Cowpath 2: the runbook pillar, walked on STAR

**Status:** walked 2026-08-13, in the 626 estate, by hand. Companion to
[`vibe-runbook-seed.md`](./vibe-runbook-seed.md), which called for exactly this walk before any
build starts.

**Target:** [STAR](https://github.com/estevanhernandez-stack-ed/STAR), the Agentic Cinema hackathon
entry. Runbook under test: `docs/smoke-2026-08-12.md`.
**Environment:** live Cloud Run, `https://star-390753828501.us-central1.run.app`.
**Constraints, set before the walk:** read-only, zero spend, one runbook.

Walked in two passes. The first, unauthenticated, against the HTTP surface. The second, after the
MCP connector was authorized, against the agent door — the surface the runbook does not cover, where
the thing under test became the door's own documentation.

**Headline:** the walk verified 5 claims, failed 3, and could not reach 8 of 8 numbered steps. The
three failures were all in the runbook's preamble, all checkable in one command each, and none of
them cost a cent. The eight unreachable steps are the ones the plugin's shape sketch was designed
around. That inversion is the finding.

**The second headline, from the door:** three more numbers in the same runbook drifted, and **none
of them are defects**. Telling those apart from the revision pin that *is* a defect turned out to be
the hardest and most important problem the walk surfaced.

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

## The agent door, walked

Added after the first pass, once the MCP connector was authorized. Same constraints: read-only,
zero spend. All six read tools state in their own contracts *"Costs nothing, spends no searches, and
is never rate-limited"*, so the zero-spend guarantee came from the contract rather than from a
guess.

The door is the surface the runbook does not cover, so there was no runbook to walk. What was walked
instead is the door's **own** documentation: the MCP server instructions and the tool descriptions,
which are the runbook an agent actually reads. They drift the same way.

### 4. The door's instructions say there are six tools. There are fourteen.

> *"There are six tools. `list_rooms`, `get_room` and `ask_room` read; `build_room` and `check_scene`
> spend; `delete_room` removes."*

Exposed: `ask_room`, `build_room`, `check_scene`, `defend_claim`, `delete_room`, `export_room`,
`get_room`, `get_sweep`, `import_rooms`, `link_room`, `list_rooms`, `research_question`,
`sweep_draft`, `write_bible`.

Eight are undocumented in the block an agent reads first: `defend_claim`, `export_room`, `get_sweep`,
`import_rooms`, `link_room`, `research_question`, `sweep_draft`, `write_bible`. Two of those mutate
(`import_rooms`, `link_room`) and three spend (`research_question`, `sweep_draft`, `write_bible`).

The individual tool descriptions are excellent and current. It is the summary that is stale, and the
summary is what an agent uses to decide what is available. Note the sentence *"`delete_room` is the
only call here that destroys anything"* is still strictly true, so the safety claim survives even
though the inventory does not.

### 5. An `error` room's `note` is empty, and the contract promises it is not

`list_rooms` documents the field:

> *"A `status` of `error` or `partial` means the build did not finish, and `note` is that room's
> account of why, in the words the writer was given at the time. [...] Rooms that finished carry an
> empty `note` and need none."*

Room `d04477363a9a` returns `status: "error"`, `search_count: 0`, `note: ""`. It is the only failed
room in the account, and it carries exactly the empty note the contract reserves for rooms that
succeeded.

Partial credit where due: `get_room` on that id does explain itself in the envelope prose, *"This
build failed and filed nothing [...] a shorter, more specific treatment usually gets further."* So
the information is not entirely absent. It is generic rather than *that room's account of why*, and
it is not where the contract says to look. A caller reading `note` to find out what happened gets
nothing, and cannot distinguish that room from a healthy one on the strength of the field the
contract points at.

### 6. `source_count` and the drawer citations disagree by about 2x, undocumented

Not filed as a defect, because the relationship between the two may be intentional and is simply
not stated anywhere read during this walk. Raising it because of where it sits.

| Room | `source_count` | sum of drawer `citations` |
|---|---|---|
| Doctor Who: Liverpool and Hamburg | 123 | 73 |
| Doctor Who Special: Liverpool | 124 | 59 |

Two numbers, both describing sources, differing by roughly a factor of two, with no documented
relationship in the tool contracts. On most apps that is a curiosity. On this one it sits directly
on the thesis: STAR's entire design argument is that a number about sources is *computed from a
ledger of what search actually returned*, never asserted. Step 8c of the smoke list already makes
exactly this the check that matters, on imported rooms: *"the source count [...] is counted from the
urls that actually arrived, not from the number the file claims."*

Worth one sentence in the `get_room` contract saying which is which.

### What the door got right

Recording the passes, because a report that only lists failures is not a report.

**The shape-cut announcement works exactly as documented.** `get_room` promises *"Whatever a shape
leaves out, the reply says so, so a cut is never mistaken for an empty room."* Every `summary` call
returned: *"This is a `summary`: counts and the story profile, with no findings, no sources and no
bible. Nothing here is missing from the room."* That is the anti-false-green discipline the rest of
the app argues for, applied to its own output. **PASS.**

**The chain is real and correctly directed.** `1fd837bdd99e` carries `continues: "01c41bcf266a"`,
Doctor Who following Liverpool, which is what smoke-list step 6 claims was built. **PASS.**

**The `researchers flagged` line is the honesty thesis, working.** Both complete rooms returned
explicit statements of what could not be isolated from the archives, unprompted, at the top of the
reply. Nothing claims to have verified what it did not.

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

### A pin and a coverage record look identical on the page, and must not be walked alike

The sharpest thing the agent door surfaced, and it would have generated three false FAILs on this
runbook alone.

STAR's smoke list contains both of these, in the same voice, four lines apart:

- *"Revision `star-00049-j5r`"* — a **pin**. A promise about what you are looking at. Stale means
  broken, and the report should say FAIL.
- *"The chain walk over all **17** stored rooms"* — a **coverage record**. Evidence of what was
  tested, in the past tense. `list_rooms` now returns **12**. Nothing is broken. Rooms were built and
  deleted, which is what an account does.

Same for *"your Liverpool export says 58"* against a Liverpool room that now reports 124 sources,
because it was rebuilt on 2026-08-13, after the list was written. And for *"931 tests green"*.

A walker that cannot tell a promise from a receipt does one of two things, both fatal. Flag every
drifted number and the report is mostly noise, which trains the reader to skip it. Flag none and the
stale revision pin, which is the one that actually matters, goes unreported alongside them.

The distinguishing signal is grammatical and looks tractable: a pin is present-tense and
identifying (`Revision X`, `HEAD Y`), a coverage record is past-tense and narrative (*"the chain walk
**over all 17**"*, *"I proved [...] **at no cost**"*). That is a hypothesis worth testing early in a
build, because getting it wrong is what makes the difference between a tool someone reads and a tool
someone mutes.

### Drift is measured from the runbook's last commit, not its date or its pin

The file is named `smoke-2026-08-12.md` and its header pins `0855bd2`. It was actually last edited
at `12147aa`. All three disagree. Using the filename date or the self-reported pin both mislead;
`git log -1 -- <runbook>` then diffing that commit to HEAD is the honest measure, and it is what
surfaced the 919-line uncovered agent door.

---

## The re-run, and what remediation taught that the walk did not

STAR remediated the same day, across `22bbf52` and `72a6d42`, and the re-walk cost four commands.
All six items closed, deployed at `star-00052-7jb`. Two of the fixes are better than what was
recommended, and the difference is the most useful thing in this document.

### Deleting a claim beats correcting it

The recommendation was to change *"There are six tools"* to fourteen. What shipped instead removes
the count:

> *"NAMED, NEVER COUNTED. This said "There are six tools" while the door served fourteen, and a test
> pinned the literal "six tools" — so the sentence could not be corrected without the test failing,
> which is what made the staleness durable. A count in prose is a second source of truth that only
> ever drifts one way."*

The test now asserts that **no** count string appears at all. Correcting the number would have reset
the clock; deleting the class of claim stops it. A walker that only reports *"this number is wrong"*
invites the weaker fix. Worth reporting the shape of the claim alongside the drift, so the reader
can see that some claims should not exist rather than be updated.

### The best fix for a stale pin is the command that answers it

This is the one to build. The recommendation was to refresh or drop the pins. What shipped replaces
each value with the invocation that produces it:

> *"They now name the command that answers instead of a value somebody has to remember to retype:
> revision: `gcloud run services describe star [...]`, HEAD: `git rev-parse --short HEAD`, tests:
> `python -m pytest -q`. A pin nobody updates is worse than no pin."*

A pin that names its command cannot go stale, because there is no stored value to diverge from. That
converts the single highest-yield finding class into a class that cannot recur.

**The product consequence:** the plugin should not stop at reporting a stale pin. It should offer the
rewrite — value to command — the way `vibe-prompt:remediate` offers a diff rather than a complaint.
That is a v0.1 remediation mode with exactly one template, the highest-confidence transformation in
the whole pillar, and it is already validated by a human reaching for it unprompted.

The header also keeps the failure as documentation: *"Pins go stale, and these two did [...] Caught
by a runbook walk, not by anything here."* A runbook that records its own staleness event is
better evidence than one that quietly got fixed.

### The walk sampled a table it had already enumerated

`72a6d42` is titled *"Six write routes stop handing a stranger their schema."* The walk found five.
The miss was `/api/rooms/{run_id}/sweeps/{sweep_id}/annotations`, and the failure is not that it was
unknown — it was printed in the route table extracted in the walk's second command, then not probed,
along with `/restore`. Seven of nine POST routes were checked, and which seven was decided by
judgment about which looked interesting.

That is a walker defect, not a runbook defect, and it is the one most likely to survive into a
build: enumeration must be mechanical and exhaustive, and coverage must be reported as a fraction of
the enumerated set. A walker that silently checks a subset produces a green report that means
nothing, which is the same false-green this runbook has now confessed to three times.

### The two contract amendments were the honest option

The `note` promise was softened to *"`note` is **usually** that room's account of why"* rather than
backfilling a reason nobody recorded onto a room that failed in August. Correct call: the alternative
is inventing a cause after the fact, which on this app would be the exact overclaim the whole design
refuses.

And the `source_count` question got a real answer, worth recording because it resolves as a
non-finding: *"It counts every distinct page a search actually returned during the build — what the
department SAW. A citation is a page a researcher then chose to stand a finding on. [...] the two
numbers differ by design and neither is the other's total."*

Filing that as a defect would have been wrong. Raising it as a question was right, and the
distinction between the two is worth encoding: a walker should be able to emit **QUESTION** as well
as a verdict, for claims that are undocumented rather than untrue.

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

The seed asked for two independent walks before a build. There are now two, plus a remediation and a
re-walk, which the seed did not ask for and which produced the best evidence of the three.

Recommended **v0.1**, defensible on this evidence alone:

1. **Pin checking.** Highest yield, cheapest, needs no credential. Two of two false on first contact.
2. **Status assertions** against a named environment, with credential preflight that hard-stops.
3. **One remediation template: value-to-command.** Rewrite a stale pin as the invocation that answers
   it. Validated by a human reaching for exactly this transformation unprompted, and it retires the
   finding class rather than resetting its clock.
4. **Exhaustive enumeration with a reported coverage fraction.** Non-negotiable, because the walk
   itself failed here and a silently-sampled green report is worthless.
5. **Verdict states: PASS, FAIL, BLOCKED, SPENDS, HUMAN, QUESTION.** The last is for claims that are
   undocumented rather than untrue, and it kept `source_count` out of the defect list correctly.

Left explicitly unproven rather than designed on one data point: role-scoping, walker generation,
environment-as-a-parameter, and HUMAN-step handling on re-run.

The open design problem for the build is the promise-versus-receipt classifier. Everything above is
worthless if the report cries wolf on three receipts for every real pin.

Separately and immediately, five items belong back in STAR before Sep 5, in rough order of what a
judge would notice:

1. Fix the auth/validation ordering, so the documented 401 is what a write route actually answers.
2. Update the MCP server instructions from six tools to fourteen. An agent reads that block to decide
   what exists, and eight tools are currently invisible to it, two of which mutate.
3. Add an agent-door step to the smoke list. It is the newest surface and the only one with a
   destructive call on it.
4. Refresh both header pins, or drop them. A pin nobody updates is worse than no pin.
5. Give a failed room a `note`, or amend the `list_rooms` contract to stop promising one.

---

## Appendix: the smoke-list step that does not exist

Written in the smoke list's own voice, ready to paste as step 9. Offered rather than committed —
nothing was written into the STAR repo during this walk.

---

### 9. The agent door · 6 min · no spend until you choose to · **newest surface, least walked**

Built in `216b917`, after this list was written, which is why it is at the bottom rather than
beside the exports it belongs with.

1. Connect the door. In an interactive Claude Code session, `/mcp`, choose STAR, authorize.
   The consent screen offers `rooms:read`, `rooms:write` and `rooms:delete`. **Take only
   `rooms:read` unless you have a reason.** Whatever you grant, the agent can call.
2. Ask it to list your rooms.
3. Ask it to read one, and watch which shape it asks for.

**Right:** the room list comes back newest first, with `continues` filled on the Doctor Who room
and empty on Liverpool. A room read at `summary` says out loud what it left out: *"Nothing here is
missing from the room."* An agent that reads at `full` is spending about 30,000 tokens a room, most
of it excerpts it already has the urls for. That is not wrong, but it is worth seeing once.

**Wrong and worth reporting:** a room from somebody else's account; a `continues` pointing at a room
that is not in the list; a shape that quietly returns less without saying so, which is the same
false-green this list already caught twice on the 401.

**The check that matters:** ask it what tools it has. The door's instructions say **six**. It serves
**fourteen** — `defend_claim`, `export_room`, `get_sweep`, `import_rooms`, `link_room`,
`research_question`, `sweep_draft` and `write_bible` are all live and none are named in the block an
agent reads first. Two of them write and three of them spend. Until that block is updated, the
honest reading is that the door's inventory is documentation-by-accident: the individual tool
descriptions are current and excellent, and the summary above them is from a smaller app.

**Do not walk the delete arming on a room you want.** It takes two calls, the first hands back a
one-time token and destroys nothing, and a deleted room is recoverable **only in the web app**, for
a window. An agent can take a room out of your workspace and cannot put it back.

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

Agent-door pass, all six read tools, each stating in its own contract that it costs nothing and
spends no searches:

```
list_rooms                                  -> 12 rooms, one status=error with note=""
get_room  d04477363a9a  shape=summary       -> the failed room; note still ""
get_room  1fd837bdd99e  shape=summary       -> continues=01c41bcf266a, source_count=123
get_room  01c41bcf266a  shape=summary       -> source_count=124
```

`shape=summary` was used throughout rather than the `full` default. Per the `get_room` contract a
full room is about 30,000 tokens, roughly 72% of it quoted excerpts. Reading four rooms at `full`
would have cost about 120,000 tokens to check counts and a chain link. Worth recording as its own
small lesson: a walker needs a cheapest-sufficient-shape rule, or verification costs more than the
thing it verifies.

Two claims were checked and refuted rather than reported. The MCP metadata advertises
`https://star.626labs.dev` while the service is deployed at a `run.app` address. The custom domain
resolves to `ghs.googlehosted.com` and serves 200 on both `/` and the protected-resource endpoint.
Correctly mapped, not a finding.

And `source_count: 124` on the Liverpool room against the runbook's *"your Liverpool export says
58"* is not a falsification either: that room was rebuilt on 2026-08-13, after the list was written.
Reporting it as a FAIL would have been the exact mistake the pin-versus-coverage-record section
exists to prevent, and it was caught by reading `created_at` rather than by being careful.

