# Doctrine transcript mining

**Status:** build-ready. **Runs:** estate-side only (reads private session transcripts). **Consumes:** [../conventions/operating-doctrine.md](../conventions/operating-doctrine.md) v1.0.0. **Produces:** validation report + proposed doctrine diffs + per-plugin trigger-phrase bank.

## Objective

Validate the doctrine's 12-move inventory empirically against 30+ days of real Claude Code sessions, find moves that should exist but don't, and harvest real user phrasings for the trigger-quality convention. The v1.0 inventory is a self-report; this job is its peer review.

## Inputs and prerequisites

- Raw session JSONLs under each personal config home's `projects/<project>/<session-uuid>.jsonl`. Discovery of homes and machines reuses vibe-insights' resolution logic — including its work/personal wall. **Work-tenant sessions are excluded** (anything under the Marcus seat or matching its wall rules).
- **Raw transcripts only.** Do not use the insights burn view: it recursively bundles subagent transcripts and will double-count or misattribute move instances.
- The canonical doctrine document, for the per-move rubrics.

## Unit of analysis

A **move instance**: a transcript span where a doctrine move fired, or observably should have and didn't. Record per instance:

| Field | Content |
|---|---|
| `move` | move number/name, or `candidate` for novel patterns |
| `session` | session file ref + approximate location |
| `evidence` | short quote or paraphrase of the cue and the response |
| `outcome` | `worked` (fired, gate met) / `missed` (cue present, move absent or gate unmet) / `partial` |
| `notes` | free text; for `missed`, what the procedure would have changed |

## Method

1. **Cheap pass** — filter sessions by cue keywords per move (e.g., move 3: `ahead`, `behind`, `unpushed`, `force`; move 6: `token`, `secret`, `.env`, `api key`; move 5: `rebase`, `conflict`, `stale`). A session with zero cue hits for a move skips that move's deep pass.
2. **Deep pass** — for each hit, apply the move's rubric: was the fires-when cue really present? Did the response follow the procedure? Was the gate met (and is the gate's evidence visible in the transcript — a command that ran, a citation in a message)? Classify the outcome.
3. **Novel-pattern sweep** — flag recurring response shapes that resemble move anatomy (cue → steps → check) but match no existing move. Three or more independent instances make a candidate.
4. **Trigger-phrase harvest** — wherever a plugin skill fired (or a user asked for something a family plugin covers and nothing fired), record the user's literal phrasing and the plugin it did/should route to.

## Outputs

1. **Validation report** — per move: instance count, worked/missed/partial rates, representative examples. A move with near-zero instances across 30 days is flagged for demotion review (not auto-removed).
2. **Proposed doctrine diffs** — new candidate moves (minor bump), rewordings sharpened by evidence (patch), demotion proposals (major). Delivered as a proposals doc in the family evolve pipeline. **Never auto-applied.**
3. **Trigger-phrase bank** — per plugin, the harvested real phrasings, ready to replace the hand-seeded trigger lists per the trigger-quality convention.

## Acceptance gates

- Work-tenant exclusion verified before any scan (list the homes scanned and the wall rule applied).
- Every `missed` classification quotes the cue it claims was present.
- Report distinguishes "move absent" from "gate not visible in transcript" — absence of evidence is classified `partial`, not `missed`.
- Candidate moves ship with all supporting instances attached.

## Constraints

- Read-only over transcripts. No transcript content leaves the estate; the product-side output (doctrine diffs, phrase bank) must contain no verbatim private content beyond short anonymized phrasings.
- Token budget: prefer the cheap-pass filter aggressively; deep-read only hits.
