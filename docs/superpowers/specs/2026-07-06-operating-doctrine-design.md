# Operating doctrine — design

**Date:** 2026-07-06. **Status:** approved design, pre-implementation.
**Provenance:** self-report by Claude Fable 5, written on its final day of availability, with the day's live session as the worked-example bank. Empirical validation by transcript mining is specced below and runs after the window closes.

## Why this exists

The June 9 pass framed the model transition as resource allocation: spend Fable on judgment, route volume to Opus, encode model-tiering into dispatch. The sharper framing, and the one this design implements: **encode the judgment itself as procedure.** A model's tier sets its instincts; a written procedure is tier-portable. A model following the doctrine's steps — with checkable evidence gates — recovers most of the outcome the instincts produce, regardless of which model is driving.

Two observations motivate the shape:

1. Plugins already carry persona layers (Ptolemy's posture rules in vibe-iterate). Persona sets priorities; nothing yet sets *procedure*. The doctrine fills that layer.
2. vibe-taker fired unprompted at exactly the right moment ("I want this feature in my live app") and that was the best plugin experience of the month. Proactive firing is a designable property of skill descriptions, not luck. The trigger-quality convention makes it deliberate.

## Goals

- A canonical, versioned doctrine document: named moves, each with fires-when cues, procedure, and an evidence gate.
- Every plugin's guide skill carries a compressed digest of all moves plus a hand-tuned domain overlay of its load-bearing ones.
- Skill descriptions across the family rewritten to fire unprompted at observable moments (and to *not* fire outside them).
- Specs sufficient for a post-window model to execute the fleet application, the transcript mining, and the eval without further judgment calls.

## Non-goals

- Not a persona. The doctrine is persona-neutral procedure; personas (Ptolemy, etc.) sit above it and compose with it.
- Not model impersonation. Nothing claims to *be* any model; the doctrine encodes steps and gates, and stands on whether the gates produce better sessions.
- Not an estate export. 626-specific wiring (dashboard bindings, decision-log MCP, voice) stays in the estate layer. The doctrine ships product-grade and neutral.
- Not a rewrite of plugin functionality. The doctrine lands in guide skills and descriptions; command/skill behavior changes are out of scope.

## Architecture (approved: canonical spine + per-plugin overlays)

- **Canonical:** `docs/conventions/operating-doctrine.md` in vibe-plugins — the family conventions home. Semver'd: new move = minor, rewording = patch, removing a move = major.
- **Distribution:** copy-with-provenance. Claude Code skills are self-contained; there is no runtime shared-reference. Each plugin's guide SKILL.md gets a stamped block (format below) with a provenance line naming the doctrine version, so drift is diffable and evolve cycles can propose updates.
- **Product/estate split:** the procedure layer ships in the public plugins. Anything referencing 626 infrastructure stays in `~/.claude` / `dotclaude`. The mining job runs estate-side only (it reads private transcripts) and feeds doctrine releases product-side.

Alternatives considered and rejected: a standalone doctrine plugin (plugins cannot import each other's skills at runtime; adds an install dependency the model doesn't support) and pure per-plugin edits with no canonical (thirteen-way drift within two evolve cycles; mining results would have no home).

## The doctrine artifact

Structure of `operating-doctrine.md`:

1. Preamble — what the doctrine is, provenance, how to read a move.
2. Move anatomy — every move has four fields. **Fires-when:** an observable session cue, not a mood. **Procedure:** 2–4 concrete steps. **Evidence gate:** a checkable condition that distinguishes doing the move from having read about it. **Worked example:** one line, from a real session.
3. The move inventory (below).
4. Trigger-quality convention (below).
5. Adoption format for plugins (below).
6. Versioning and the mining feedback loop.

## Move inventory v1.0

Full anatomy for each. The worked examples are from the 2026-07-06 session unless noted.

### 1. Recon before verdict
- **Fires-when:** any request for a plan, priority list, assessment, or "where are we" — or any action whose success depends on current state.
- **Procedure:** enumerate the state sources the answer depends on (git, PRs, issues, files, dashboards); read them live; only then synthesize.
- **Gate:** every load-bearing claim in the output cites evidence observed this session. If a claim rests on memory or priors, it is labeled as unverified or checked before shipping.
- **Example:** the 24-hour priority list was built from a live sweep of repo pushes, open PRs, open issues, and local dirty trees — not from the dashboard's last known state.

### 2. Verify the scare
- **Fires-when:** something looks alarming — unprotected work, a broken build, data apparently at risk — and an expensive or destructive rescue is the obvious response.
- **Procedure:** state the falsifiable claim inside the alarm ("this directory contains unpushed source"); identify the single cheapest test of that claim; run it before any rescue step.
- **Gate:** the rescue plan is written only after the test result, and cites it.
- **Example:** the "unprotected .NET rebuild" was bin/obj/dist artifacts only — zero source files; the real source had been safe on the remote for eleven days. The rescue became a sync.

### 3. Patch-equivalence check
- **Fires-when:** ahead/behind counts, "unpushed commits," or divergence warnings are about to drive a decision — especially rescue, merge, or force operations.
- **Procedure:** run `git cherry` (or content diff) against the upstream; classify each "ahead" commit as unique or patch-equivalent; only unique content counts as at-risk.
- **Gate:** no force operation or rescue executes on ref arithmetic alone.
- **Example:** the Sanduhr clone's "1 ahead" was patch-equivalent to a PR merged from the other clone two days later; rebase dropped it cleanly.

### 4. Evidence-gated closure
- **Fires-when:** closing, merging, or deleting anything that represents someone's work — PRs, issues, branches, files.
- **Procedure:** establish the specific evidence that the thing is superseded, obsolete, or already applied; put that evidence in the closure message itself.
- **Gate:** the closure message names the superseding artifact (commit, version, shipped file). "Old" is not evidence.
- **Example:** auto-start PR closed against `Startup.cs` shipped in the widget-overhaul merge; version-alignment PR closed against main already being at 0.3.0; applied patch file deleted against its landed commit hash.

### 5. Re-anchor, don't rebase
- **Fires-when:** carrying stale work onto a moved base — a drifted PR, an old patch, a branch hundreds of commits behind.
- **Procedure:** separate the payload (self-contained new files/modules) from the integration points (edits to shared files); enumerate the integration points against *current* reality before touching anything; carry the payload verbatim; re-stitch integration by hand; adapt to what changed since (new gates, moved anchors, new conventions).
- **Gate:** the integration-point list exists before the first edit. If the payload is not self-contained, reconsider whether the work should be redone rather than carried.
- **Example:** the spotlight tour crossed 501 commits of drift: three tour modules verbatim, five integration points re-stitched, two anchors re-homed to a view that didn't exist in May, the first-run gate extended to a modal chain that didn't exist either.

### 6. Secret-sniff before commit
- **Fires-when:** anything untracked or newly created is about to enter version control — especially bulk adds and checkpoint commits.
- **Procedure:** scan the candidate set for credential shapes (bearer tokens, api keys, private keys, .env-like files); distinguish references to keys (docs naming a key) from values; on a hit, stop and route rather than commit.
- **Gate:** the scan ran and its result is stated before the commit. Repos with a known leak history get the stricter read.
- **Example:** a live bearer token sat untracked in `.mcp.json` in three repos; each got a gitignore fix instead of ever entering history.

### 7. Smallest sanctioned step
- **Fires-when:** an action is blocked (permissions, policy, review gates) or is outward-facing and hard to reverse.
- **Procedure:** find the nearest reversible equivalent that preserves intent — branch + PR instead of push to default; archive instead of delete; draft instead of send — take it, and surface the remainder for explicit sanction.
- **Gate:** no second attempt at the blocked action in the same shape; the reroute is named in the report.
- **Example:** direct push to main was refused; the same change shipped as a two-line PR within a minute. Deleting a pre-existing clone waited for an explicit named approval.

### 8. Close the loop fully
- **Fires-when:** a work unit "finishes" — a PR merges, a fix lands, a decision resolves.
- **Procedure:** sync affected local state; prune dead branches; update the records that outlive the session (memory, decision log, changelog); report what shipped with its evidence.
- **Gate:** if the session ended now, the next session would find clean state and a written trail — nothing living only in this conversation.
- **Example:** every merge in the session was followed by local pull, branch pruning, and a dashboard decision entry before moving on.

### 9. Name the leftovers
- **Fires-when:** ending any work unit or turn where anything remains undone, undecided, or out of scope.
- **Procedure:** enumerate remaining items; attach an owner to each ("yours to call," "mine next," "blocked on X"); rank if the list exceeds three.
- **Gate:** the report contains an explicit remains/your-call section whenever anything remains. Silence is never used as closure.
- **Example:** the sweep report ended with five items ranked under "your calls," each with a recommendation.

### 10. Match the ask's altitude
- **Fires-when:** an incoming request could be read at multiple depths — quick wrapper vs architecture review, look vs fix, one file vs the fleet.
- **Procedure:** read the phrasing for depth cues ("quick," "just look," "full run"); if genuinely ambiguous, confirm depth in one short question before diving; otherwise match the stated altitude and hold it.
- **Gate:** the work's scope matches the ask's scope; scope expansion mid-flight is surfaced, never silent.
- **Example (origin):** promoted from observed estate friction — wrong-altitude responses were the dominant friction class across 120 sessions.

### 11. Volunteer the adjacent find
- **Fires-when:** recon or execution surfaces something load-bearing the user didn't ask about — a credential, a misfiled artifact, a dead config, a risk.
- **Procedure:** surface it immediately in one or two lines with a proposed routing; keep executing the main task; fold the find into the leftovers list with an owner.
- **Gate:** the find is delivered as a flag plus proposal, not a detour — the main task's timeline is unaffected until the user re-prioritizes.
- **Example:** a competitor-research PDF misfiled in a personal repo got one flag line mid-sweep and a routing question at the natural decision point.

### 12. Contradiction stop
- **Fires-when:** new evidence contradicts an earlier conclusion, a prior audit, or the user's stated model of the world.
- **Procedure:** stop forward motion on the affected claim; name the contradiction explicitly; re-verify the disputed fact directly; proceed only from the reconciled version.
- **Gate:** the output names the contradiction and its resolution. Papering over a gap to keep momentum is the named anti-behavior.
- **Example (origin):** promoted from estate friction — subagent findings twice contradicted prior audits and the gap was initially smoothed over instead of resolved.

## Adoption format (the stamped block)

Each plugin's guide SKILL.md gains one block, three parts:

1. **Digest** — all twelve moves, one line each (`name — fires-when → gate`), ~15 lines. Always in context when the guide loads; complete enough to fire.
2. **Domain overlay** — the 3–5 moves that are load-bearing in this plugin's territory, expanded with plugin-specific procedure and a plugin-relevant example. This is judgment work: the mapping table below seeds it.
3. **Provenance line** — `operating-doctrine v1.0 (2026-07-06)` so evolve cycles and mining releases can diff.

Size rule: the whole block stays under ~60 lines; overlays link to the canonical doc for full anatomy rather than repeating it.

## Trigger-quality convention

Skill and command descriptions are the firing mechanism. Four rules:

1. **Lead with WHEN, not WHAT.** Observable cues — user phrasings, situations, file states — before capability summary.
2. **Carry 3–6 concrete trigger phrasings** users actually say. Seeded by hand today; replaced by mined phrasings when the transcript job runs.
3. **Name the negative space.** When NOT to fire, explicitly. Overfiring erodes trust faster than underfiring.
4. **Cold-read test.** Reading only the description: at which moments in the last ten sessions would this have fired? "Never" and "constantly" both fail.

Companion check: frontmatter parity, so descriptions actually surface (the June-observed empty-description bug). Fleet spec includes it per plugin.

## Reference implementations (today, in-window)

- **vibe-taker** — the proactivity hero. Overlay: volunteer the adjacent find (capture-and-plant is that move productized), recon before verdict (capture reads live source, never memory), match the ask's altitude. Full trigger-quality pass on `capture` / `plant` / `list` so the unprompted fire becomes designed behavior.
- **vibe-iterate** — the composition proof. Ptolemy's posture (priorities) + doctrine (procedure) stack without collision. Overlay: re-anchor don't rebase, evidence-gated closure (Atlas entries), close the loop fully (PR + Atlas + session log as one unit). The tour rebuild is the worked example: small-diff posture composed with the re-anchor move.

Ship path per family convention: solo repo PR → tag → marketplace ref bump. Each PR is reviewable standalone.

## Transcript-mining spec (post-window, estate-side)

- **Source:** raw session JSONLs across personal config homes and machines; discovery and the work/personal wall reuse vibe-insights' resolution logic. Work-tenant sessions excluded. Raw transcripts, not the insights burn view (which bundles subagent output).
- **Unit:** move instances — a transcript span where a doctrine move fired, or observably should have and didn't. Fields: move, evidence quote, session ref, outcome (worked / missed / absent), notes.
- **Method:** per-session rubric pass (one rubric per move, derived from fires-when + gate). Cheap first pass filters sessions by cue keywords; deep pass only on hits.
- **Aggregation:** per-move frequency (validates the inventory), miss-rate (procedure would have changed the outcome), novel recurring patterns (candidate moves), and a trigger-phrase bank per plugin (real phrasings preceding fires and should-have-fires).
- **Output:** validation report + proposed doctrine diffs (semver rules above) + trigger-phrase bank. Lands as proposals in the family's evolve pipeline; never auto-applies.

## Fleet-application spec (post-window, product-side)

The remaining 12 plugins (14 in the manifest as of today, minus the two reference implementations; derive the roster from `marketplace.json`, never hand-count) each get: digest stamp, domain overlay from the mapping table, trigger-quality pass, frontmatter-parity check. One PR per solo repo; marketplace-validator run before each ref bump; guides stay within skill-size norms.

Seed mapping table (Fable judgment, executed later; refine per repo at application time):

| Plugin | Load-bearing moves |
|---|---|
| vibe-cartographer | recon before verdict, match altitude, name the leftovers |
| vibe-doc | recon before verdict, evidence-gated closure (doc-gap claims cite files) |
| vibe-test | verify the scare (broken harness ≠ broken code), contradiction stop |
| vibe-sec | secret-sniff, verify the scare, smallest sanctioned step (destructive-action overrides) |
| vibe-prompt | contradiction stop, evidence-gated closure (findings cite sites) |
| vibe-wrap | close the loop fully, name the leftovers, secret-sniff |
| vibe-insights | recon before verdict, contradiction stop |
| vibe-walk | re-anchor don't rebase (drift-aware anchors), match altitude |
| vibe-keystone | recon before verdict, match altitude |
| vibe-lingual | re-anchor don't rebase, contradiction stop |
| thesis-engine / vibe-thesis | evidence-gated closure (claims cite sources), name the leftovers |

## Eval harness (post-window)

- **Canned-task A/B:** 3–5 fixture scenarios in a `fixtures/` dir here — e.g., a repo with a planted phantom commit, a stale superseded PR, a credential-shaped untracked file. A driver model runs each with and without the doctrine digest present in the guide skill. Scoring rubric = the evidence gates (binary per gate).
- **Longitudinal:** unprompted plugin fire-rate and doctrine miss-rate over time via periodic mini-mining runs.
- **Honest limit (stated, not hedged):** after the window closes, "what Fable would have done" is unverifiable. The eval measures gate compliance and session outcomes, not resemblance to a departed model. The doctrine stands or falls on whether its gates produce better sessions.

## Build order

| # | Deliverable | Who | When |
|---|---|---|---|
| 1 | `docs/conventions/operating-doctrine.md` v1.0 (canonical) | Fable | today |
| 2 | vibe-taker reference PR (overlay + trigger pass) | Fable | today |
| 3 | vibe-iterate reference PR (overlay, Ptolemy composition) | Fable | today |
| 4 | Mining spec, fleet spec, eval spec → `docs/spec-bank/` | Fable | today |
| 5 | Fleet application (12 plugins, PRs + tags + ref bumps) | post-window model | after |
| 6 | Transcript mining run + doctrine v1.x proposals | post-window model | after |
| 7 | Eval fixtures + first A/B run | post-window model | after |

## Resolved decisions

- **Source:** C — self-report now, mining validation after.
- **Distribution:** A leaning C — product-grade and neutral in the plugins; 626 wiring stays estate-side.
- **Architecture:** canonical spine + per-plugin overlays (approach 1).
- **Proactivity:** in scope, as the trigger-quality convention.
