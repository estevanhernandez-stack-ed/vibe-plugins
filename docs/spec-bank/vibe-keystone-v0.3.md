# Spec: vibe-keystone v0.3 — the derivability rewrite

**Status: SHIPPED 2026-07-25 as v0.3.0.** Built via Cart cycle #18. This document is the as-designed spec; four things changed during the build and the sections below have been corrected in place. The as-built record, including all fourteen dogfood findings, is [`vibe-Keystone/docs/v0.3-migration-friction.md`](https://github.com/estevanhernandez-stack-ed/vibe-Keystone/blob/main/docs/v0.3-migration-friction.md).

**Corrections applied after design approval:**

1. **The gate is two-axis, not one.** Cut requires *both* derivable *and* the-default-would-be-right. Sourced to the Fable field guide's under-specification passage, surfaced during `/scope` research. The single-axis version specced below would have cut load-bearing content from every keystone the tool touched.
2. **Skills and nested keystones are not interchangeable.** Nested files are location-gated; skills are invocable anywhere. Protected-but-situational content defaults to a skill.
3. **Inside a persona, identity is not procedure.** Protected content is protected from the gate, not from deduplication or from the over-constraint test.
4. **File ownership is its own concern**, split into an eighth reference during the build: generated files, tool-owned marker regions, and the colonized case where every owner is something else.

## The job

Vibe Keystone generates the CLAUDE.md that every agent decision in a repo rests on. Its skeleton was calibrated for a pre-Claude-5 generation of models, and the calibration has inverted: the sections it marks ALWAYS are the exact sections Anthropic's own tooling now identifies as dead weight, and the content Anthropic says to keep has no dedicated section in the skeleton at all.

v0.3 rewrites the generated shape around a single gate (the derivability test), adds the two progressive-disclosure mechanisms Keystone currently knows nothing about (nested keystones, skill extraction), protects human-supplied context from the trim, and applies the same discipline to Keystone's own 390-line SKILL.

## Evidence

### What `/doctor` actually does

Read from the shipped Claude Code binary, v2.1.220, not from the blog post. The in-session `/doctor` is described by the CLI as "a full checkup that can also fix issues"; `claude doctor` on the command line is installation health only.

Its memory-file instruction, verbatim:

> "find unused skills, MCP servers, and plugins versus their context cost and disable dead weight; deduplicate local CLAUDE.md files against checked-in ones; **trim checked-in CLAUDE.md files by cutting content a session could derive from the codebase (directory layouts, tech-stack lists, architecture overviews) while keeping gotchas, rationale, and non-standard conventions; migrate always-loaded CLAUDE.md guidance into lazy skills and nested CLAUDE.md files**; flag slow hooks and context-heavy extensions; check the installed version is current; make auto mode the default permission mode"

Its derivability criterion, verbatim:

> "(`ls`, `cat`, reading the manifest, `--help`) is dead weight every session it loads into pays for. Scan each checked-in CLAUDE.md file — the root file and `.claude/CLAUDE.md` (always loaded), nested-directory CLAUDE.md files (loaded when working under that directory), and `.claude/rules/*.md` — for content that is derivable from the codebase and propose deleting it outright. Always-loaded files matter most"

Two facts follow that the current skill does not encode:

1. **The three named cut targets map one-to-one onto Keystone's ALWAYS sections.** Directory layouts is "What's where" (SKILL §2.4). Tech-stack lists is "Tech Stack" (§2.2). Architecture overviews is the domain section (§2.5), which the skill calls "the operational center of gravity."
2. **The three named keep targets have no home in the skeleton.** Gotchas, rationale, and non-standard conventions are scattered across "What NOT to do" (framed as guardrails with a 3-item floor, not gotchas) and "Conventions" (which mandates commit-style content that `git log` already reveals).

### Nested keystones are a real loading mechanism

Verified in the same binary: nested-directory CLAUDE.md files load only when working under that directory. Keystone writes exactly one root file and has no notion of this. Most multi-surface repos in the estate would be better served by a thin root plus per-surface nested files that cost nothing when you are working elsewhere.

### The estate is the proof

Keystone's own descendants, line counts as of 2026-07-25:

| File | Lines |
|---|---|
| `Project-626Labs-1/CLAUDE.md` | 302 |
| `.claude-personal/CLAUDE.md` | 269 (persona file, see the guard) |
| `Celestia3/CLAUDE.md` | 205 |
| `vibe-cartographer/CLAUDE.md` | 204 |
| `vibe-plugins/CLAUDE.md` | 147 |
| `Projects/CLAUDE.md` | 90 |

In `vibe-plugins/CLAUDE.md` the ratio is roughly 3:1 inventory to gotcha. Around 45 lines are tables that mirror the filesystem (a 15-row "What's where", a 15-row plugin roster, a 10-row task table). Around 15 lines carry content a session could not derive: the `vibe-test`/`vibe-sec` tag-naming divergence, the `github` source-type SSH-clone trap, and the rule against editing the manifest and a solo repo in parallel. The prescribed ratio is the inverse.

## Locked decisions (from the 2026-07-25 brainstorm)

1. **Scope:** generated output, plus Keystone's own SKILL, plus an estate migration pass as the real-app validation.
2. **Break, don't branch:** the new shape replaces the current skeleton. No lean/full mode selection. `v0.3.0`.
3. **Audience:** frontier-model-first. Assume Opus 5 / Fable 5 reads the produced file. Cut what a capable model infers.
4. **`/doctor` posture:** complement, verified rather than assumed. Keystone births lean; `/doctor` maintains files that drifted. No rightsizing capability gets built into Keystone, and the produced keystone names `/doctor` as the maintenance path.
5. **Protected-content guard ships for all users**, not as a migration exception.

### On the operating-doctrine tension

The family [operating doctrine](../conventions/operating-doctrine.md) opens with "a model's tier sets its instincts; a written procedure is tier-portable," and deliberately writes procedure down so weaker models walk the same gates. Anthropic's guidance assumes a frontier model reading. Both hold, and progressive disclosure is what reconciles them: the keystone body is written frontier-first, and tier-portable procedure moves into referenced skills and docs that any model can be pointed at explicitly. Nothing is lost; it stops being always-loaded.

## The derivability test

The gate every generated line must pass. It replaces "which sections does this repo type need?" as Keystone's generating question.

> **Two questions. Both must be yes to cut.**
> 1. Could a session obtain this by running `ls`, reading a file, reading the manifest, or running `--help`?
> 2. If this line were absent, would the model's default assumption be correct?
>
> Uncertain on the second means keep. *(Axis 2 added during the build — see the corrections at the top.)*

What survives, stated positively:

- **Gotchas** — traps, invariants, and behaviors that surprise a competent agent. Bias toward things that have actually bitten someone.
- **Rationale** — why the repo is the way it is, specifically where an agent would otherwise "fix" something deliberate.
- **Non-standard conventions** — only where the repo diverges from what a competent agent would assume by default.

Worked examples, drawn from real estate files:

| Line | Verdict | Why |
|---|---|---|
| "Stack: Node ≥20, pnpm ≥9 workspace" | **Cut** | `cat package.json` |
| "`scripts/npm-stats.py` — daily npm download collector" | **Cut** | The file's docstring and the workflow say so |
| "all plugins use `vX.Y.Z` except `vibe-test` and `vibe-sec`, which use `<plugin>-vX.Y.Z`" | **Keep** | Non-standard convention. No file states it; the divergence looks like a mistake to fix |
| "don't reintroduce the `github` source type — it resolves SSH clone URLs and fails for users without keys" | **Keep** | Gotcha with rationale. A live incident, invisible in the code |
| "Commits: conventional commits" | **Cut** | `git log` reveals it in one command |
| "thesis repos use `draft`/`revise`/`cite`/`respond`/`meta`" | **Keep** | Non-standard; not inferable from a short log |
| "`data/stats/` is bot-owned, don't hand-edit" | **Keep** | Invariant with a real failure mode behind it |

## The protected-content guard

Ships for every user. The derivability test governs codebase-derivable facts. It has no authority over content that does not live in a codebase.

**Prong 1 — the test does not apply to human-supplied context.** Persona and identity, voice rules, tone, banned phrases, taste ("we don't do it that way here"), priorities and values, brand tokens, and cultural reference material all fail `ls`/`cat`/`--help` by construction. That is precisely why they are worth writing down. Trimming them for length is a category error: it cuts the only content an agent genuinely cannot reconstruct from the repo.

**Prong 2 — protected does not mean pinned inline.** Route protected content by how often it is needed, never by how long it is:

- Needed on every task in the repo (a persona the repo operates under, a voice rule that governs all output) — stays inline.
- Needed only in a subset of work (marketing voice rules, brand tokens used when building UI, citation discipline for a prose subtree) — moves to a skill or a nested keystone under the subtree it governs.
- Never delete protected content to hit a line budget. Relocate it, and leave a pointer.

**Prong 3 — dedup points, it never deletes the last copy.** When a repo keystone restates a global or tenant file, the fix is a one-line inheritance pointer, not deletion of the content everywhere. Keystone must check whether the repo it is writing in *is* the canonical home of that content before treating it as a duplicate. Running Keystone on the repo that holds the voice guide must not strip the voice guide.

The guard is a named section in the shipped skill, and a line in the self-check.

## The new skeleton

Replaces the ten-section skeleton at SKILL.md lines 85-279.

| # | Section | Status | Content |
|---|---|---|---|
| 1 | Orientation | ALWAYS | 3-5 lines. What the repo is for and its role among its siblings. Not derivable: a repo cannot tell you it is the marketplace front door rather than a plugin. |
| 2 | Gotchas | ALWAYS | The center of gravity. Traps, invariants, and surprises, each earning its line by naming a failure that happened or would. |
| 3 | Non-standard conventions | CONDITIONAL | Only divergences from a sane default. Most repos have at least one; zero is valid and drops the heading. |
| 4 | Rationale | CONDITIONAL | Decisions an agent would otherwise undo. Fold into Gotchas when thin. |
| 5 | Pointers | ALWAYS | The progressive-disclosure spine. Where the deep material lives: skills, `docs/`, nested keystones, agents. Replaces inlined architecture. |
| 6 | Decisions log | CONDITIONAL | Mechanics unchanged from v0.2.1, including the family [decision-log backend convention](../conventions/decision-log-backend.md). |
| 7 | What NOT to do | CONDITIONAL, floor removed | Survives only for repo-specific, non-obvious don'ts. The 3-item floor is deleted; zero is a valid count. |

Removed as ALWAYS sections: "What's where", "Tech Stack", "Common tasks", "Design system", "Voice". Each survives only as the residue that fails the derivability test, folded into Gotchas or Pointers. A path table row survives when it carries rationale ("the load-bearing artifact is `.claude-plugin/marketplace.json`"), not when it restates `ls`.

The persona-inheritance blockquote (SKILL §2.1) survives unchanged. It is protected content, it is one line, and it is the model for how dedup should behave everywhere else.

## Progressive disclosure: three mechanisms Keystone learns

**Nested keystones.** For multi-surface repos, propose a thin root plus per-surface `CLAUDE.md` files that load only when work happens under that directory. Keystone must detect the multi-surface case during Step 0 inventory (workspace manifests, multiple app roots, a `packages/`-style layout) and propose the split rather than defaulting to one fat root. The split is proposed, never auto-written beyond the root file, consistent with the existing don't-auto-create discipline.

**Skill extraction.** Procedural guidance that is needed only sometimes (a verification ritual, a release procedure, a deep architecture explainer) becomes a proposed skill, with the keystone carrying a one-line pointer. This is the "lazy skills" half of the `/doctor` instruction and the escape valve that keeps the line budget from destroying real knowledge.

**Dedup against inherited context.** Step 1 currently reads tenant docs only to fold content in. It gains a second use: the inherited global and tenant files become an exclusion list. Anything already stated there gets a pointer, not a restatement. Subject to prong 3 of the guard.

## Budget

Replace the section-count framing with a line budget for the root keystone:

- **Target: ~50 lines. Ceiling: ~100.**
- Overflow does not get cut. It goes to a nested keystone, a skill, or a `docs/` file with a pointer.
- Always-loaded files matter most, so the budget tightens at the root and relaxes for nested files that load situationally.
- The budget is a forcing function for the derivability test, not an independent rule. A 40-line file full of derivable content still fails.

## Keystone's own SKILL restructure

The tool that teaches context engineering currently ships 390 lines with a dozen inline fill-in-the-blank templates. Per "give Claude examples" giving way to "design interfaces," those templates constrain the output shape rather than communicating the criterion.

Target: a SKILL of roughly 100 lines plus a `references/` tree.

| File | Contents |
|---|---|
| `skills/keystone/SKILL.md` | Frontmatter, the job, the derivability test in brief, the guard in brief, the flow (inventory, interview, draft, self-check, propose), pointers into references |
| `references/derivability-test.md` | The gate, the keep/cut categories, the worked-example table |
| `references/protected-content.md` | The three prongs of the guard |
| `references/skeleton.md` | Section specs, one short exemplar each rather than fill-in-the-blank blocks |
| `references/tenant-interview.md` | The Step 1 interview, plus the exclusion-list use of tenant docs |
| `references/progressive-disclosure.md` | Nested keystones, skill extraction, the budget |
| `references/repo-types.md` | The repo-type quick reference, rewritten around what differs in gotcha shape rather than which sections to include |

Step 6 capture (opt-in, `captures.jsonl`) and the `evolve-keystone` skill carry forward. The capture schema needs one revision: `sections_included`/`sections_dropped` reference section names that no longer exist. Add a `schema_version: 2` and map the new section set; `evolve-keystone` gains a note that v1 and v2 captures are not directly comparable on section names.

## Self-check rewrite

Replaces SKILL Step 4 (lines 291-301). Derivability-driven, not presence-driven:

- [ ] Every line passes the derivability test, or is protected content
- [ ] Protected content was relocated, never deleted, and pointers resolve
- [ ] Nothing restates the inherited global or tenant file, unless this repo is its canonical home
- [ ] Root file is within budget, or the overflow has a named destination
- [ ] Gotchas section is non-empty and each item names a real failure mode
- [ ] Multi-surface repos got a nested-keystone proposal
- [ ] No snapshot lists that rot (carried forward from v0.2.1)
- [ ] Every referenced path exists on disk

The last item is the one mechanical check worth keeping from the parked harness proposal #1. It stays agent-run; no validator script ships, and `PRIVACY.md`'s zero-scripts promise holds.

## Estate migration (validation pass)

The family norm is real-app validation before ship. Five repos, each its own commit in its own repo, diff shown before applying. Absolute paths and `git -C` throughout, per the estate's stuck-cwd failure mode.

| Order | Repo | From | Notes |
|---|---|---|---|
| 1 | `Project-626Labs-1` | 302 | Multi-surface (web, VS Code extension, MCP server). The nested-keystone case. |
| 2 | `Celestia3` | 205 | |
| 3 | `vibe-cartographer` | 204 | Flagged in the harness comparison as "enormous, half auto-generated" |
| 4 | `vibe-plugins` | 147 | Marketplace repo. Watch the manifest-derived roster table: the Node one-liner that regenerates it is itself a gotcha worth keeping |
| 5 | `Projects` | 90 | Environment keystone. Tenant walls and duplicate-clone rules are protected content, not derivable |

**Excluded: `.claude-personal/CLAUDE.md` (269 lines).** It is a persona file, not a repo keystone. Under the guard it is almost entirely protected content. It may still benefit from prong 2 relocation (the coder-voice synthesis and the reference wells are needed on writing tasks, not every task), but that is a separate judgment call with Este in the loop, not part of this migration.

Migration is not a mechanical trim. Each file gets read for what a session could not derive, and the residue becomes the new file. Where content is protected but situational, it moves to a skill or nested file rather than disappearing.

## Ship plan

1. Build on the `vibe-Keystone` solo repo. `v0.3.0` in `plugins/vibe-keystone/.claude-plugin/plugin.json`.
2. `CHANGELOG.md` entry naming the breaking shape change and the `/doctor` evidence.
3. `README.md` rewrite. It currently advertises the ten-section skeleton (lines 20-32) and the repo-type adaptation table (lines 38-43); both describe the old shape and would ship stale.
4. Estate migration as the validation pass. Record which produced files needed hand-correction; that is the real signal on whether the skeleton works.
5. Tag `v0.3.0` on the solo repo.
6. Only then bump `ref` in `vibe-plugins/.claude-plugin/marketplace.json`. Linear promotion: solo first, tag, then bump. Never both in parallel.
7. Both descriptions need a pass. `plugin.json` and the marketplace entry each lead with "Bootstrap a 626Labs-pattern CLAUDE.md" and enumerate the repo-type adaptation, and the pattern is the thing that changed. The skill frontmatter `description` is the third copy; it drives triggering, so it changes with them.
8. Log a decision. Category: schema/shape change in a shipped generator, plus the `/doctor` positioning call.

## What NOT to build

- **No validator script.** `PRIVACY.md` asserts no executable surface and zero outbound calls. That is a selling point. The self-check stays agent-run.
- **No rightsizing capability.** `/doctor` does that, verified. Keystone births lean and hands off.
- **No lean/full mode toggle.** Rejected during brainstorm. One opinion, no selection burden.
- **No auto-writing of nested keystones, skills, agents, rules, or hooks.** Propose; the user decides. Carried forward from v0.2.1.
- **Do not port Cartographer's full evolution stack.** The Tier 0 + Tier 1 pair already shipped is the right ceiling for a once-per-repo generator.

## Risks

**Over-trim.** A keystone stripped to nothing loses orientation value. Orientation and Pointers are ALWAYS specifically so the file still answers "what is this, and where do I look." The budget is a forcing function, never a target to hit by deletion.

**Protected content misclassified as derivable.** The failure mode is an agent trimming voice or taste because a file is long. Prong 1 exists to block exactly this, and it is the reason the guard is a named section rather than a footnote.

**Nested keystones fragmenting knowledge.** Splitting a root file across five surfaces can bury a rule that mattered everywhere. Mitigation: anything an agent must see on every task stays at the root, regardless of which surface it describes.

**Capture-schema discontinuity.** v1 captures reference section names that no longer exist. Handled by `schema_version: 2` and a comparability note in `evolve-keystone`, not by discarding the existing log.

**README and marketplace drift.** Both describe the old shape in specifics. Both are in the ship plan; neither is optional.
