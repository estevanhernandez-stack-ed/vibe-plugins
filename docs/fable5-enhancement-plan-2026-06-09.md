# Fable 5 enhancement sprint — vibe-plugins family

**Date:** 2026-06-09. **Window:** a few days of Fable 5, then back to Opus.
**Surveyed:** all 13 plugins (4 parallel survey agents across the solo repos) + this marketplace repo + the `~/.claude/plugins/data/` evolution logs.

## Doctrine: spending Fable 5 vs Opus

The window is short, so the sequencing rule is simple: **spend Fable on judgment, spend Opus on volume.**

1. **Fable 5 (scarce, now):** architecture and contract design, adversarial review gates, evolve-proposal triage, skill-quality verdicts, cross-plugin conventions. Anything where the model's judgment IS the deliverable.
2. **Opus 4.8 (abundant, persists):** bulk implementation from tight specs, test-suite grinding, mechanical migrations, README regeneration. Driven as subagents (`Agent` with `model: "opus"`) inside Fable-orchestrated sessions, or as plain Opus sessions after the window closes.
3. **Sequencing invariant:** anything Opus can execute from a spec gets *specced* in-window and built whenever. Anything needing Fable-grade judgment happens *inside* the window. By day 3, the leftover backlog should be 100% Opus-shaped.
4. **Stretch:** encode model-tiering into the plugins themselves (Track 4b) so the family exploits multi-model dispatch even after the window closes.

What NOT to spend Fable on: ref-bump commits, doc footer normalization, test grinding, anything a `marketplace-validator` run already proves.

## Estate snapshot (2026-06-09)

| Plugin | Pinned | Local state | Unpromoted work | Tests | Backlog signal |
|---|---|---|---|---|---|
| vibe-cartographer | v1.9.1 | dirty (AGENTS.md, CLAUDE.md) + **ahead of origin** | 4 docs commits | 0 | none on file; 8 session logs feed `:evolve-cart` |
| vibe-doc | v0.8.0 | 5 dirty files | 3 commits (incl. npm rename to `@esthernandez/vibe-doc-cli`) | 8 files | proposed-changes.md mostly applied |
| vibe-test | vibe-test-v0.2.4 | **local dir is scratch, NOT a git repo — real solo repo not cloned** | unknown | unknown | `drafts/vibe-test/proposed-changes.md` lives here; friction + wins logs exist |
| vibe-sec | vibe-sec-v0.6.0 | clean | 4 commits **incl. feat: vibe-sec-cli full tier-aware audit** | 30 files | 6 active research docs |
| thesis-engine | v0.2.1 | clean (local dir: `Thesis-Engine-readme-work`) | 7 commits **incl. fix: Windows lowercase EPERM** | 0 | none |
| vibe-thesis | v0.1.2 | 5 dirty incl. untracked `skills/audit/` | **v0.2.0 in tree, untagged** (6 commits, synthesis-smooth skill) | 0 | none |
| vibe-keystone | v0.2.1 | clean | 3 docs commits | 0 | **4 ranked harness proposals** in proposed-changes-harness.md |
| vibe-iterate | v1.2.0 | clean | none | **0 (18 skills)** | autonomy-gate watch item; 4 modes never invoked in 30d |
| vibe-taker | v0.1.2 | clean | 3 docs commits | **0** | BYO decision-log MCP (deferred) |
| vibe-walk | v0.1.0 | **on feature branch `docs/strikethrough-item-5`** | **32 commits past tag, version unbumped** | 9 files | followups #3–#6 (tour i18n, drift-aware anchor audit, jest 30, tmp CVE) |
| vibe-insights | v0.3.0 | 5 untracked (AGENTS.md, CLAUDE.md, build-story) | none | 12 files | none |
| vibe-wrap | v0.2.1 | clean | 2 docs commits | 1 file | BYO decision-log MCP (deferred) — **already has the pluggable pattern** |
| vibe-prompt | v0.7.0 | pycache junk untracked | none | 39 files (1223 tests) | v0.8 hints only; **cross-app round-trip user-gated** |

**Marketplace repo itself:**
- `marketplace.json`: the vibe-prompt description is ~700 words — it absorbed seven changelogs. Family norm is 2–6 sentences. Storefront voice violation; the capability story belongs in the solo README.
- `drafts/` nursery never committed: vibe-prompt v0.1–v0.7 spec/plan sets (shipped → archivable), vibe-eval (resolved into v0.2 → archivable), vibe-walk research corpus (shipped), vibe-wrap `.pyc` junk (source long since moved to solo → delete), vibe-test proposed-changes (real repo not local → triage).
- `docs/spec.md` + `docs/checklist.md` are misfiled vibe-prompt v0.3 artifacts; `docs/build-story-2026-05-23.md` is an unrouted blog draft (Evolve-day story → candidate for 626Labs-Publishing/BlogStudio).
- Dashboard bind: `findByRepo` returns **two exact matches** — "Vibe Launch" (Idea Lab, linked 2026-04-17) and "Vibe Plugins" (Launched, linked 2026-05-25). Duplicate project; needs a pick or a merge.

**Cross-repo pattern:** AGENTS.md + CLAUDE.md sit dirty/untracked in cart, doc, thesis, insights — some earlier cross-repo context pass never got committed. One hygiene sweep closes it.

**Skill-surfacing bug (live, observed this session):** several skills surface in-session with EMPTY descriptions (e.g., `vibe-keystone:evolve-keystone`, and duplicate listings where one copy has a description and the other doesn't). The SKILL.md files DO have descriptions (verified on keystone), so the drop happens at packaging/surfacing — likely command-vs-skill frontmatter parity. Empty descriptions = skills that never trigger. Diagnose first, then fleet-fix.

## Tracks, ranked

### T1 — Clear the decks (promotions + hygiene)
Reconcile Vibe-Walk branch state → merge to main → tag **v0.2.0**. Tag vibe-thesis **v0.2.0** (already in tree). Tag vibe-sec **v0.7.0** (feat warrants minor). Tag thesis-engine **v0.2.2** (fix). Optional patch tags for doc/taker/wrap/cart docs drift. Each bump goes through `marketplace-promotion-reviewer`, ends with one `marketplace-validator` run. Then: archive-or-commit the `drafts/` nursery, rewrite the vibe-prompt manifest description to family length, sweep the dirty AGENTS/CLAUDE.md across repos, clone the real vibe-test repo. *Fable orchestrates, Opus workers execute per-repo.*

### T2 — Skill-surface fleet audit (the "skills within them" ask)
~100 skills + ~30 commands across 13 plugins. Audit: trigger-description quality (does the description make the skill FIRE at the right moment), the empty-description surfacing bug, frontmatter parity, dead references, voice drift. Output: per-plugin findings → fixes as solo-repo PRs. The session-visible empty-description bug is the entry probe. *Fleet-shaped: this is Workflow territory if you opt in ("use a workflow"); otherwise parallel Agent batches.*

### T3 — Test harnesses where there are none
vibe-iterate (18 skills, 0 tests) and vibe-taker (0 tests) first; keystone/thesis-engine/vibe-thesis as stretch. Fable writes the test contract per plugin (what's load-bearing, what to pin); Opus agents grind the suites green. The family norm is real suites (prompt 1223, sec 30, insights 12, walk 9) — iterate and taker are the outliers.

### T4 — Cross-plugin architecture (Fable-signature work)
- **4a. BYO decision-log MCP as family standard.** wrap and taker both queued it independently; wrap already ships the pluggable pattern (Markdown / JSONL / 626Labs MCP / off). Extract it as the family convention, apply to taker, document in each guide skill. Decouples the public family from the 626Labs dashboard.
- **4b. Model-tiering convention.** Skills that dispatch subagents declare model tiers (judgment steps vs bulk steps) — cart `:build` workers, vibe-prompt LLM-judge calls. The "use Opus to better advantage" idea, baked into the product family. RFC + 2 reference implementations.
- **4c. plugin-core Phase 2, spec-only.** Extract-order spec for scanner/classifier reference impls from doc + cart. Too big to build in-window; exactly right to spec in-window (Opus builds it after).

### T5 — Evolve harvest (cheap, do early)
Run the plugins' own L3 machinery where the logs are fed: `:evolve-cart` (8 session files), `:evolve-iterate` (friction + 4 sessions), `:evolve-wrap` (1 session). Keystone's harvest already exists (4 ranked proposals — review them, pick the low-effort slice). vibe-test has friction + wins logs but no local repo (T1 unblocks). Fold all outputs into this backlog.

### User-gated (needs Este, not the model)
- vibe-prompt v0.7 cross-app round-trip: blocked on `/plugin marketplace sync` + update install, then run on Celestia3 + 626Labs + WeSeeYou + Quiz Show.
- migration-plan 10c: human UI verification.
- Dashboard duplicate-project resolution (pick or merge).

## Day plan

| When | Work | Division of labor |
|---|---|---|
| **Day 1 AM** | Ratify plan. T1 deck-clearing: walk reconcile + 4 tags + ref bumps + nursery archive + prompt description rewrite | Fable orchestrates; Opus per-repo workers; promotion-reviewer per bump; validator at end |
| **Day 1 PM** | T5 evolve harvest + T2 entry probe (empty-description mechanism) + launch T2 fleet audit | Fable triages harvest; audit fans out |
| **Day 2** | T2 fixes land as solo PRs; T3 test contracts (Fable) → suites (Opus fleet) → review gates (Fable) | Fable review, Opus volume |
| **Day 3** | T4a BYO-MCP standard shipped; T4b model-tiering RFC; T4c plugin-core Phase 2 spec. Wrap: decision logs, storefront refresh, spec-bank handoff | Fable-dense day |

End state: estate clean, 4+ promotions shipped, fleet-audited skills, two test suites born, one family convention shipped, and a spec bank Opus can execute without me.

## Decision asks

- **A. Dashboard bind:** "Vibe Plugins" (Launched) or "Vibe Launch" (Idea Lab)? Recommend binding **Vibe Plugins** and merging Vibe Launch into it (merge deletes the source project — your call).
- **B. Ratify or re-rank the tracks** (and cut anything that doesn't fit the window).
- **C. Workflow opt-in** for the T2/T3 fleet ops — say the word and they run as orchestrated workflows instead of flat agent batches.
- **D. Schedule the v0.7 round-trip install** (the only thing on the board only you can unblock).
