# Sonnet 5.5 arrival: Cart first, then the family

**Date:** 2026-09-30 (release day, late evening). **Method:** arrival play from model-window: sourced capability sheet, Cart dispatch-site sweep, cross-pollinator sweep over 39 dashboard projects (90 days of decisions), claims re-verified on disk before they got a line here. Sibling of [opus-5-5-window-2026-09-22.md](opus-5-5-window-2026-09-22.md), eight days apart.

## Verdict

Opus 5.5 collapsed the judgment/bulk split. Sonnet 5.5 re-opens it in the useful direction: a fast model at $2/$10 that Anthropic rates as the best speed-intelligence trade, with the same 1M context and 128K output as Opus 5.5. The family's `bulk` and `creative-divergent` tiers finally have a model to route to, and the routing now exists. The one thing the RFC left to "the session" (the tier-to-model map) was never written anywhere the session loads; it is now in the seat `CLAUDE.md`, so every annotated dispatch routes from the next session on.

Haiku 5.5 did not ship. The instrument tier stays on Haiku 4.5.

## Capability facts that matter here

- **ID** `claude-sonnet-5-5` (Bedrock `anthropic.claude-sonnet-5-5`). **$2/$10**, same as Sonnet 5, batch 50% off, cache reads 10% of input. 1M context, 128K output (300K via batch beta). Same tokenizer as Sonnet 5. Retirement not sooner than 2027-09-28.
- **Default effort is `high`** on the API (Opus 5.5 defaults to medium). Anthropic's agentic-coding guidance: start at `medium` for well-specified tasks, `high` for harder or longer ones. At `low` and `medium` it may stop to check in before finishing and may skip a verification run. Cart's worker brief is written for exactly that.
- **Breaking changes, same family as Opus 5.5** plus two of its own: `thinking: disabled` → 400 (the replacement is `between_tools`, accepted at `high` effort or below; `between_tools` at `xhigh`/`max` → 400), forced `tool_choice` → 400, `computer_20251124` → 400 on the Claude API and Google Cloud, thinking blocks bound to model and conversation, and the advisor tool rejects Opus 4.8 / 4.7 / Sonnet 5 advisors. Text between tool calls arrives as progress-update thinking blocks.
- **Lineup today:** Fable 5.1 ($10/$50, high), Opus 5.5 ($4/$20, medium), Sonnet 5.5 ($2/$10, high), Haiku 4.5 ($1/$5, 200K, no effort parameter). Sonnet 5 moved to legacy. Haiku 5.5 not shipped.
- **Deprecated today:** Sonnet 4.5 (`claude-sonnet-4-5-20250929`), retires 2026-11-30, replacement Sonnet 5.5. Nothing live in the estate pins it.
- **Haiku 4.5's 2026-10-15 date is a floor, not a retirement.** Anthropic commits to 60 days' notice and has posted none, so it cannot retire before late November. That defuses the 6deux6 panic without removing the item.
- **Claude Code:** Sonnet 5.5 needs 2.1.284+; this machine is on 2.1.286. The `sonnet` alias resolves to `claude-sonnet-5-5` on the Anthropic API (Bedrock and GCP still resolve it to Sonnet 4.6). Subagent frontmatter takes `model:` and `effort:`; `modelSettings["claude-sonnet-5-5"].effortLevel` sets a per-model effort. Cyber-flagged turns on Sonnet 5.5 re-run on Sonnet 5.

Sources: platform.claude.com models overview, Sonnet 5.5 what's-new and prompting guide, deprecations page; code.claude.com model-config. All fetched 2026-09-30.

## Landed tonight

| Item | Where |
|---|---|
| **Seat era map.** judgment → session model (`opus`); bulk and creative-divergent → `sonnet`; instrument → pinned `haiku` class. Routes through Claude Code aliases, so it survives point releases. | `~/.claude-personal/CLAUDE.md` (`83be45c` in `dotclaude-personal`), pointer added in the model-window skill |
| **Cart v1.12.0** (`aca0509`, release cut by CI, canary). Five-part worker brief on every bulk dispatch (done-when lines, carry it through, hold the scope, prove it, report shape); effort note at the annotation; collect-and-verify reads a return as a report and follows up on missing evidence (two tries, then When Something Breaks). Closes the Opus board's P2. No model names in the SKILL. | `vibe-cartographer` |
| **Cart promotion review: ship.** 4 ahead / 0 behind v1.11.0, manifest 1.12.0 at the right path, rosters identical, prose-only diff. Ref bump not made; it's the promotion call below. | reviewer report |
| **vibe-prompt v0.8.1** (`fdf8dbf`, release cut, canary; 1329 tests): `claude-sonnet-5-5` in known-models, Sonnet 5 to legacy, Sonnet 4.5 row to scheduled 2026-11-30, F14 extended to Sonnet 5.5 with the `between_tools` nuance. The computer-tool break is recorded for Opus 5.5 and Sonnet 5.5 only; Fable 5.1's what's-new doesn't name it. | `Vibe-Prompt` |
| **Mirror model retired.** `dotclaude` was archived tonight; `~/.claude-personal` is now its own repo (`dotclaude-personal`). Memory saved so no session resyncs a mirror again. The estate keystone's three dotclaude lines are stale. | memory file, `Projects/CLAUDE.md` (yours) |

## The board

### Ready (verified, cheap)

| # | Move | Evidence |
|---|---|---|
| 1 | **Register Vibe-Runbook v0.2.0 and Vibe-Recall v0.1.1.** Both are tagged, public, tag == main, and in no registry: not in `marketplace.json` (16 plugins), not in `live-versions.json`, no dashboard project. Recall's `plugin.json` reads 0.1.0 under tag v0.1.1 (fix the pair, re-tag v0.1.2, then promote). Two promotion reviews, two marketplace entries, two dashboard projects, two spec-bank rows. | verified on disk and via `findByRepo` tonight |
| 2 | **Promote Cart v1.12.0 and vibe-prompt v0.8.1 same day.** Stable v0.8.0 fires F6-suspect-model on any app that adopts `claude-sonnet-5-5` until v0.8.1 lands; the v0.8.0 same-day precedent applies. | reviewer report; known-models detection rule |
| 3 | **bgremove → `claude-opus-5-5`** (Opus board "do now" #5, still open; `626labs-hub/tools/bgremove/agent.py:235,293` still pins `claude-opus-4-7`). | verified by the sweep |
| 4 | **Run vibe-prompt D-3 model-consolidation on the four pinning apps** (QuizShow, The-Vector, 6deux6, bgremove) so the next era swap is one registry line per app. QuizShow is already N-1 (`claude-sonnet-5`) one week after its fix. | sweep, verified |

### At risk

- **6deux6 pins Haiku 4.5.** Not urgent (floor, no notice posted), but the interim if notice lands is Sonnet 5.5, since Haiku 5.5 isn't here. Watch the deprecations page; vibe-prompt's F6-retiring-model will flag it the day the row changes to scheduled.
- **Judgment on Sonnet sessions.** The era map says judgment runs on the session model. Dashboard decisions already schedule whole Cart builds "on Sonnet 5.5 via /build" (Ur Golem, 2026-10-04; the SnapSnip hotfix ran that way). In a Sonnet session, Cart's collect-and-verify beats run on Sonnet too, which the RFC's "never downgrade" was written against. Two honest readings: (a) run Cart builds from an Opus session and let the map route bulk to Sonnet, which is what the map is for; (b) declare a "Sonnet session, Opus escalation after a measured miss" row. Your call (c below).
- **Celestia3 keeps `gemini-3-pro-preview` in `ALLOWED_MODELS`** (`src/lib/usageLimits.ts:9`) while known-models lists it retired 2026-03-09. One of them is wrong; a `/vibe-prompt:audit` on Celestia3 settles it.
- **PAIR local inference is a fourth routing path with no row.** qwen3-8b and gpt-oss-20b sit behind `pair_chat` on Dunder and Neb, and The Lab's nightly summary assumes Phoenix-local inference. The map has no tier for local. This is a "shape the company" question (a self-hosted inference lane); bridge it to the dashboard Architect on your nod.

### Family plan: where Sonnet 5.5 changes a plugin

Dispatch sites exist in only four skills today (Cart build, Cart spec, vibe-doc generate, vibe-prompt eval/iterate) and all are annotated; they route to Sonnet via the map with no plugin change. The enhancement list is the volume work that runs **inline** today and should become a `bulk` dispatch:

| Plugin | Skill | Why Sonnet changes it | Shape |
|---|---|---|---|
| vibe-lingual | `:localize` translate stage | Celestia alone has ~670 untranslated keys per locale (es 247, ja 240 of 918). Translation is bulk by definition; the Translation Verification project is the gate. | per-locale `bulk` fan-out, `judgment` on the guard |
| vibe-sec | `:audit` (twelve concerns) | Twelve independent concerns run sequentially inline. Fan out one `bulk` reader per concern; synthesis and severity stay `judgment`. Provenance note still owed: cyber-flagged turns reroute (to Sonnet 5 from a Sonnet 5.5 session). | per-concern `bulk`, synthesis `judgment` |
| vibe-access | `:describe` | Doc-hole closers generate descriptions in volume (the v0.2 lesson: 84/85 were templates). Generation is bulk; the "is this a real description" check is judgment. | `bulk` generate, `judgment` accept |
| vibe-recall | deep cards | Deep cards were demand-gated behind a queue for cost. At bulk pricing they can run estate-wide (86 repos) in one pass. | `bulk` |
| vibe-doc | `:generate` | Already annotated `bulk`; gains automatically. Worth re-validating the per-doc fan-out on a real app at Sonnet medium. | none |
| vibe-prompt | `:eval` judge | **Do not move.** Instrument tier; a class change resets the baseline. Re-baseline target stays Haiku 5.5, fallback Sonnet 5.5 by 2026-11-01 if Haiku 5.5 hasn't shipped. | none |
| Cart | Quick Build | The natural home for cheap fast workers. Needs a design pass on how it composes with the enforcer gates and checkpoints before it's built. | v1.13 |

Doctrine eval: the full 3× run should use **Sonnet 5.5 as the driver**, because bulk dispatches now land there and the pilot's "native on that model" results were measured on Opus 5.5 only. Bulk pricing also makes the transcript-mining spec (deferred since July) cheap enough to run.

### New plugin seeds, with what the sweep did to them

- **vibe-market (new).** Named in three decisions across two projects: a portable copy linter, cross-repo `/announce`, one canonical banned list. Store-listing-console's per-app `voice.md` plus copy-reviewer sandwich is the cowpath. Not in the spec-bank yet; it should be.
- **vibe-ops: strengthened.** Seven instruments lied in eight weeks (Field Notes without GoatCounter May–Sep, GitHub counts 99% polling, Store installs window, Sanduhr publishing dark 09-13 to 09-30, vibe-insights bucketing, PAIR health probe blind, PriceScout cron unpersisted). The pulse needs an "instrument liveness" leg: did the counter move since last pulse.
- **vibe-launch: strengthened; v2 boundary moves.** "Smoke the published artifact, not the dev tree" appeared three times (SnapSnip's dead Settings window for three months, Sanduhr PR #55, RBX15 v4.0.0 tile rejection) and belongs in `:release`. The Store/Partner Center leg the seed deferred now has a walked cowpath.
- **vibe-runbook: strengthened, and already shipped (#1 above).** Fresh evidence for its thesis: stale pins in keystones (WSYATM's reCAPTCHA line, RORORO's warning baseline, store console's `config.toml` ref). Seed: a runbook walk over CLAUDE.md pins.
- **Headless-run convention (speculative).** Three projects hit the same class (PriceScout env binding unset headless, doctrine eval drivers contaminated by the Workflow relay, vibe-insights scheduled `claude -p`). One convention doc: env pin, binding, tripwire log for anything run by schtasks or `claude -p`.
- **vibe-recall × Cart prior-art seam (speculative).** dotclaude hand-curated `shared.prior_art` because Cart only reads `shared.preferences.persona`; a `:spec` seam reading recall output retires the hand index.

## Decisions for Este

- **a. Effort for bulk.** Set `modelSettings["claude-sonnet-5-5"].effortLevel = "medium"` in the seat? It runs bulk workers at the effort the brief is written for; it also applies when you `/model sonnet` yourself. *Recommend:* yes, and re-run Cart on a real cycle to measure.
- **b. Promotions.** Cart v1.12.0 (reviewer: ship) and vibe-prompt v0.8.1 (once green) to stable. *Recommend:* both, same day.
- **c. Sonnet sessions for Cart builds.** (a) Opus session, Sonnet dispatches, or (b) a declared Sonnet-session row with Opus escalation. *Recommend:* (a) for builds that matter, (b) written down as the hotfix mode so it's a choice and not a drift.
- **d. Runbook and Recall registration.** Register both now (two reviews, two entries, two dashboard projects), or hold Recall until the version pair is fixed and re-tagged. *Recommend:* fix the pair first (it's a 1-line slip), then register both in one marketplace commit.
- **e. PAIR local inference on the map.** Bridge the "self-hosted inference lane" question to the dashboard Architect? *Recommend:* yes.
- **f. Instrument re-baseline fallback date.** Haiku 5.5 by 2026-11-01, else Sonnet 5.5 as a versioned vibe-prompt release. *Recommend:* yes.

## Cut

Re-tiering the vibe-prompt judge to Sonnet because it's cheap (resets the baseline); moving the Opus 5.5 era map into the RFC (it forbids model names); building Quick Build tonight (undesigned composition with gates and checkpoints); treating Haiku 4.5's floor as a deadline.
