# Vibe Keystone v0.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite vibe-keystone so the CLAUDE.md it generates is cut against the derivability test rather than a fixed ten-section skeleton, and apply the same discipline to Keystone's own SKILL.

**Architecture:** Two artifacts change shape. The *generated* keystone moves from ten mostly-ALWAYS sections to seven sections centered on gotchas, governed by a derivability gate and a protected-content guard. *Keystone's own* SKILL drops from 390 lines to roughly 100 plus a `references/` tree, dogfooding the progressive disclosure it now teaches. Five real estate CLAUDE.md files are the test suite: each migration exercises the new skeleton and any hand-correction needed is a skeleton defect, not a migration detail.

**Tech Stack:** Markdown only. No scripts, no dependencies, no build. Claude Code plugin structure (`.claude-plugin/plugin.json`, `skills/<name>/SKILL.md`).

**Source spec:** [`docs/spec-bank/vibe-keystone-v0.3.md`](../../spec-bank/vibe-keystone-v0.3.md)

## Global Constraints

- **Version:** `0.3.0` in `plugins/vibe-keystone/.claude-plugin/plugin.json`. Breaking shape change, pre-1.0.
- **Zero scripts.** `PRIVACY.md` asserts no executable surface and zero outbound calls. No `scripts/` directory is created. All checks stay agent-run.
- **Manifest location:** `.claude-plugin/plugin.json` is the only loader-recognized path. A root-level manifest silently degrades to auto-discovery.
- **Generated-keystone budget:** ~50 lines target, ~100 lines ceiling for a root file. Overflow relocates; it never gets deleted.
- **Propose, never auto-create:** nested keystones, skills, agents, rules, and hooks are proposed. Only the root `CLAUDE.md` is written.
- **Never overwrite an existing CLAUDE.md without showing a diff and confirming.** Applies to the skill's behavior and to every migration task in Phase 2.
- **Promotion is linear:** solo repo first, tag, then bump `ref` in `vibe-plugins/.claude-plugin/marketplace.json`. Never edit both in parallel.
- **Cross-repo discipline:** absolute paths and `git -C <path>` for every git command. Never rely on `cd` persisting.
- **Commits:** conventional. `feat` / `fix` / `docs` / `chore(release)`.
- **File content:** no emoji. Em-dashes minimal; commas, periods, colons by default. ATX headings. Builder-to-builder, second person.

## File Structure

All paths relative to `c:/Users/estev/Projects/vibe-Keystone/` unless stated.

| File | Responsibility | Approx lines |
|---|---|---|
| `plugins/vibe-keystone/skills/keystone/SKILL.md` | **Rewritten.** Frontmatter, the job, the gate and guard in brief, the five-step flow, pointers into references | ~100 |
| `.../keystone/references/derivability-test.md` | **New.** The gate, keep/cut categories, worked-example table | ~60 |
| `.../keystone/references/protected-content.md` | **New.** The three-prong guard | ~45 |
| `.../keystone/references/skeleton.md` | **New.** The seven sections, one short exemplar each | ~90 |
| `.../keystone/references/progressive-disclosure.md` | **New.** Nested keystones, skill extraction, the budget | ~70 |
| `.../keystone/references/tenant-interview.md` | **New.** Step 1 interview plus the exclusion-list use of tenant docs | ~70 |
| `.../keystone/references/repo-types.md` | **New.** Repo types rewritten around gotcha shape, not section lists | ~45 |
| `.../keystone/references/capture.md` | **New.** Opt-in capture, schema v2. Moved out of SKILL (rarely needed = reference material) | ~45 |
| `plugins/vibe-keystone/skills/evolve-keystone/SKILL.md` | **Modified.** Schema v1/v2 comparability note; section-name references updated | +8 |
| `plugins/vibe-keystone/.claude-plugin/plugin.json` | **Modified.** Version 0.3.0, description rewritten | ~3 |
| `README.md` | **Modified.** Lines 20-32 (skeleton list) and 38-43 (repo-type table) describe the old shape | ~40 |
| `CHANGELOG.md` | **Modified.** v0.3.0 entry | +20 |
| `proposed-changes-harness.md` | **Modified.** Status header noting #2/#3/#4 absorbed, #1 still parked | +6 |

Cross-repo, Phase 2 and 3:

| File | Responsibility |
|---|---|
| `Projects/Project-626Labs-1/CLAUDE.md` | Migrated. Multi-surface: exercises nested keystones |
| `Projects/Celestia3/CLAUDE.md` | Migrated |
| `Projects/vibe-cartographer/CLAUDE.md` | Migrated |
| `Projects/vibe-plugins/CLAUDE.md` | Migrated. Smoke test, done first |
| `Projects/CLAUDE.md` | Migrated. Environment keystone; heavy protected content |
| `Projects/vibe-plugins/.claude-plugin/marketplace.json` | `ref` bump to `v0.3.0`, last step |

### Deviation from the spec's migration order, with rationale

The spec orders migration by file size (626Labs-1 first). Executing in that order means discovering skeleton defects on the hardest, most expensive file, after which every correction has to be re-applied backwards.

**This plan reorders:** `vibe-plugins` (147 lines) first as a cheap smoke test on a repo whose gotchas are already well understood, then `Project-626Labs-1` (302, multi-surface) to exercise nested keystones while the skeleton is still cheap to change, then the remainder. Same five files, feedback ordered by information gained per unit of cost.

---

## Phase 1: The new shape

### Task 1: Commit the approved spec and set up the reference tree

**Files:**
- Modify: `c:/Users/estev/Projects/vibe-plugins/docs/spec-bank/README.md` (already edited, uncommitted)
- Create: `c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/.gitkeep` (removed in Task 2 once real files land)

**Interfaces:**
- Produces: a committed spec at a stable path that every later task references.

- [ ] **Step 1: Verify the vibe-plugins working tree**

```bash
git -C "c:/Users/estev/Projects/vibe-plugins" status --short
```

Expected: `M docs/spec-bank/README.md`, `?? docs/spec-bank/vibe-keystone-v0.3.md`, `?? docs/superpowers/plans/`, plus pre-existing untracked `.playwright-mcp/` and `docs/build-story-fable-window-2026-06-12.md` which are NOT part of this change.

- [ ] **Step 2: Commit the spec, index row, and plan**

```bash
git -C "c:/Users/estev/Projects/vibe-plugins" add docs/spec-bank/vibe-keystone-v0.3.md docs/spec-bank/README.md docs/superpowers/plans/2026-07-25-vibe-keystone-v0.3.md
git -C "c:/Users/estev/Projects/vibe-plugins" commit -m "docs(spec-bank): vibe-keystone v0.3 derivability rewrite

Spec and implementation plan for re-cutting Keystone's generated shape
against the derivability test. Evidence sourced from the shipped
/doctor prompt in claude.exe v2.1.220, not the blog post."
```

- [ ] **Step 3: Confirm the Keystone tree is clean before touching it**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" status --short
git -C "c:/Users/estev/Projects/vibe-Keystone" log --oneline -3
```

Expected: clean tree, HEAD at `1cf200f feat(brand): vibe-keystone mark`.

---

### Task 2: The derivability test reference

**Files:**
- Create: `plugins/vibe-keystone/skills/keystone/references/derivability-test.md`

**Interfaces:**
- Produces: the gate that Tasks 4, 6, and every Phase 2 migration apply. Named sections `## The gate`, `## What survives`, `## Worked examples` are linked from `SKILL.md`.

**Content contract.** The file must contain, and must not exceed roughly 60 lines:

1. **The gate**, stated as the single question: could a session obtain this by running `ls`, reading a file, reading the manifest, or running `--help`? If yes, it does not go in the keystone.
2. **Attribution**: the criterion matches Claude Code's own `/doctor` (verified in v2.1.220), quoted once so a reader knows this is not a house opinion.
3. **What survives**, three named categories with a one-line definition each: gotchas, rationale, non-standard conventions.
4. **The worked-example table**, verbatim from the spec's seven rows (stack line, script description, tag-naming divergence, `github` source type, conventional commits, thesis commit verbs, bot-owned directory). Each row: line, verdict, why.
5. **One anti-rule**: the test governs codebase-derivable facts only, with a pointer to `protected-content.md`. This cross-link is load-bearing; without it the gate reads as license to trim voice.

- [ ] **Step 1: Write the file**

Follow the content contract above. Source the worked-example table from the spec's "The derivability test" section.

- [ ] **Step 2: Verify acceptance criteria**

```bash
wc -l "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/derivability-test.md"
grep -c "protected-content.md" "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/derivability-test.md"
```

Expected: line count under 70. The `protected-content.md` cross-link count is at least 1.

- [ ] **Step 3: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/keystone/references/derivability-test.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "feat(keystone): add derivability-test reference

The gate every generated line passes: content obtainable via ls, cat,
manifest read, or --help does not belong in a keystone. Matches the
criterion Claude Code's own /doctor applies."
```

---

### Task 3: The protected-content guard reference

**Files:**
- Create: `plugins/vibe-keystone/skills/keystone/references/protected-content.md`

**Interfaces:**
- Consumes: the gate from Task 2 (cross-links back to it).
- Produces: the guard applied by Task 6's self-check and every Phase 2 migration. Named section `## The three prongs`.

**Content contract.** Roughly 45 lines. Must contain:

1. **The scope statement**: the derivability test governs codebase-derivable facts and has no authority over content that does not live in a codebase.
2. **Prong 1, the test does not apply.** Enumerate protected categories: persona and identity, voice rules, tone, banned phrases, taste, priorities and values, brand tokens, cultural reference material. State the reasoning explicitly: these fail `ls`/`cat`/`--help` by construction, which is exactly why they are worth writing down. Trimming them for length is a category error.
3. **Prong 2, protected does not mean pinned inline.** Route by frequency of need, never by length. Three cases: needed every task (inline), needed in a subset (skill or nested keystone under the subtree it governs), never delete to hit a budget.
4. **Prong 3, dedup points and never deletes the last copy.** Include the concrete failure: running Keystone on the repo that holds the canonical voice guide must not strip it. The check is whether *this* repo is the canonical home before treating content as duplicated.
5. **One worked example** of prong 2 in action: marketing voice rules are non-derivable and only needed on marketing work, so they move to a skill with a keystone pointer rather than sitting always-loaded.

- [ ] **Step 1: Write the file**

Follow the content contract. Prong 3's failure mode is the least obvious of the three; state it concretely rather than abstractly.

- [ ] **Step 2: Verify acceptance criteria**

```bash
wc -l "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/protected-content.md"
grep -c "^### Prong" "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/protected-content.md"
```

Expected: under 55 lines, exactly 3 prong headings.

- [ ] **Step 3: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/keystone/references/protected-content.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "feat(keystone): add protected-content guard

Persona, voice, taste, and priorities fail the derivability test by
construction, which is why they are worth writing down. The guard blocks
trimming them for length, routes them by frequency of need, and stops
dedup from deleting the last copy of content this repo canonically owns."
```

---

### Task 4: The skeleton reference

**Files:**
- Create: `plugins/vibe-keystone/skills/keystone/references/skeleton.md`

**Interfaces:**
- Consumes: the gate (Task 2), the guard (Task 3).
- Produces: the seven-section spec used by Task 6's flow and every Phase 2 migration.

**Content contract.** Roughly 90 lines. Must contain:

1. **The seven sections in order**, each with status and a two-to-three-line spec: Orientation (ALWAYS), Gotchas (ALWAYS), Non-standard conventions (CONDITIONAL), Rationale (CONDITIONAL), Pointers (ALWAYS), Decisions log (CONDITIONAL), What NOT to do (CONDITIONAL).
2. **One short exemplar per section**, drawn from a real repo, two to four lines each. Not fill-in-the-blank templates with `{placeholders}`. The v0.2.1 skill's dozen template blocks are what this replaces; do not reproduce that pattern.
3. **The persona-inheritance blockquote**, carried forward unchanged from v0.2.1 SKILL lines 89-105, including all three cases (inherit, override, none). It is protected content, it is one line in output, and it is the model for how dedup should behave.
4. **An explicit removals note**: What's where, Tech Stack, Common tasks, Design system, and Voice are no longer sections. Each survives only as residue that fails the gate, folded into Gotchas or Pointers. State the surviving-row rule: a path row survives when it carries rationale ("the load-bearing artifact is X"), not when it restates `ls`.
5. **The floor removal**, called out explicitly: "What NOT to do" no longer has a 3-item minimum. Zero is a valid count and drops the heading.

- [ ] **Step 1: Write the file**

Follow the content contract. Pull exemplars from real files: the `vibe-test`/`vibe-sec` tag divergence and the `github` source-type trap are strong Gotchas exemplars; `.claude-plugin/marketplace.json` as load-bearing artifact is a strong Pointers exemplar.

- [ ] **Step 2: Verify acceptance criteria**

```bash
cd "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references"
wc -l skeleton.md
grep -c "^## " skeleton.md
grep -oE "\{[a-z0-9 -]+\}" skeleton.md | sort -u
```

Expected: under 100 lines. The `{placeholder}` scan returns nothing, or only tokens inside the persona blockquote where a name genuinely substitutes.

- [ ] **Step 3: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/keystone/references/skeleton.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "feat(keystone): seven-section skeleton centered on gotchas

Replaces the ten-section skeleton. What's where, Tech Stack, Common
tasks, Design system, and Voice stop being sections and survive only as
residue that fails the gate. The 3-item floor on What NOT to do is gone."
```

---

### Task 5: Progressive disclosure, tenant interview, repo types, and capture

**Files:**
- Create: `plugins/vibe-keystone/skills/keystone/references/progressive-disclosure.md`
- Create: `plugins/vibe-keystone/skills/keystone/references/tenant-interview.md`
- Create: `plugins/vibe-keystone/skills/keystone/references/repo-types.md`
- Create: `plugins/vibe-keystone/skills/keystone/references/capture.md`

**Interfaces:**
- Produces: the four remaining reference files that `SKILL.md` (Task 6) points at. After this task the reference tree is complete at seven files.

**Content contracts.**

`progressive-disclosure.md` (~70 lines):
- **Nested keystones.** State the verified loading model: root file and `.claude/CLAUDE.md` always load; nested-directory CLAUDE.md files load only when working under that directory; `.claude/rules/*.md` also load. Detection signals during inventory: workspace manifests (`pnpm-workspace.yaml`, `packages/`), multiple app roots, distinct deploy targets. The split is proposed, never auto-written.
- **Skill extraction.** Procedural guidance needed only sometimes becomes a proposed skill with a one-line keystone pointer. This is the escape valve that stops the budget from destroying real knowledge.
- **The budget.** ~50 target, ~100 ceiling for a root file. Overflow relocates, never deletes. Always-loaded files matter most, so the budget tightens at the root and relaxes for nested files. The budget is a forcing function for the gate, not an independent rule: a 40-line file full of derivable content still fails.
- **The root-stays rule.** Anything an agent must see on every task stays at the root regardless of which surface it describes. This is the mitigation for knowledge fragmentation.

`tenant-interview.md` (~70 lines):
- Carry forward the v0.2.1 Step 1 interview (SKILL lines 31-84): tenant identity, decisions log, persona inheritance, repo type, existing agents, and the refresh question.
- **Add the exclusion-list use.** Tenant and global docs are read for two purposes now: content to fold in, and content to *not restate*. Anything already stated in an inherited file gets a pointer. Subject to prong 3 of the guard.
- Carry forward the adaptation table (v0.2.1 SKILL lines 78-84) with rows updated to the new section names.

`repo-types.md` (~45 lines):
- Rewrite the four repo types (code platform, marketing/content, long-form writing, infrastructure/mixed) around **what differs in gotcha shape**, not which sections to include. Section selection is now driven by the gate, so a type-to-section mapping would contradict it.
- Example of the reframe: long-form writing's distinguishing feature is no longer "persona override is mandatory, add a citation section" but "the gotchas are citation integrity and mode switching; the persona override is protected content."

`capture.md` (~45 lines):
- Move Step 6 capture out of `SKILL.md` (v0.2.1 lines 313-347). Opt-in, default off, local-only, one JSON line appended to `~/.claude/plugins/data/vibe-keystone/captures.jsonl`.
- **Bump to `schema_version: 2`.** Keep every existing field. `sections_included` / `sections_dropped` / `sections_overridden` now reference the seven new section names.
- Carry forward all four hard privacy rules verbatim (no tenant name, no repo name, no paths, no source, no CLAUDE.md content; opt-in per run; local only; failure never blocks).
- Keep the opt-in prompt text.

- [ ] **Step 1: Write all four files**

- [ ] **Step 2: Verify acceptance criteria**

```bash
cd "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references"
ls -1
wc -l *.md
grep -n "schema_version" capture.md
```

Expected: exactly 7 files present (derivability-test, protected-content, skeleton, progressive-disclosure, tenant-interview, repo-types, capture). Each under its stated ceiling. `capture.md` shows `"schema_version": 2`.

- [ ] **Step 3: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/keystone/references/
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "feat(keystone): progressive disclosure, interview, repo types, capture

Nested keystones and skill extraction become first-class mechanisms.
The tenant interview gains its second use: inherited docs are an
exclusion list, not just a source. Repo types reframed around gotcha
shape. Capture moves to a reference at schema_version 2."
```

---

### Task 6: Rewrite SKILL.md

**Files:**
- Modify: `plugins/vibe-keystone/skills/keystone/SKILL.md` (390 lines, full rewrite)

**Interfaces:**
- Consumes: all seven reference files from Tasks 2-5.
- Produces: the shipped entry point. Frontmatter `name: keystone` is unchanged; `description` is rewritten.

**Content contract.** Target ~100 lines, hard ceiling 130. Structure:

1. **Frontmatter.** `name: keystone` unchanged. `description` rewritten: drop "626Labs-pattern" framing, lead with what it produces and the gate. Keep the trigger phrases ("set up CLAUDE.md", "create the keystone", "bootstrap claude md", "claude md for this repo", "/keystone") since they drive invocation. Do not quote the description value; escaped inner quotes blank the in-session listing (fixed in `4e8bea6`, do not regress).
2. **The job**, three to four lines. What a keystone is for, and the one-sentence gate.
3. **The gate and the guard in brief**, three lines each, each pointing at its reference file. Enough that an agent that reads only `SKILL.md` still does the right thing; the references carry the depth.
4. **The flow**, five steps, each two to five lines with a pointer to its reference:
   - Inventory (carry forward v0.2.1 Step 0's seven inventory items; add multi-surface detection)
   - Interview (→ `tenant-interview.md`)
   - Draft (→ `skeleton.md`, `derivability-test.md`, `protected-content.md`, `progressive-disclosure.md`)
   - Self-check (the eight-item list below, inline; it is needed every run)
   - Propose follow-ups (→ `progressive-disclosure.md` for nested and skill proposals; carry forward agents/rules/hooks proposals from v0.2.1 Step 5)
5. **The self-check, inline**, exactly these eight items:
   - Every line passes the derivability test, or is protected content
   - Protected content was relocated, never deleted, and pointers resolve
   - Nothing restates the inherited global or tenant file, unless this repo is its canonical home
   - Root file is within budget, or the overflow has a named destination
   - Gotchas section is non-empty and each item names a real failure mode
   - Multi-surface repos got a nested-keystone proposal
   - No snapshot lists that rot
   - Every referenced path exists on disk
6. **Capture**, two lines pointing at `capture.md`.
7. **What you do not do**, carried forward from v0.2.1 lines 383-391 with two edits: the "voice rules need a public surface" item is replaced by the guard, and a new item is added for `/doctor` (Keystone births lean; it does not rightsize existing files, `/doctor` does that).

- [ ] **Step 1: Write the rewritten SKILL.md**

- [ ] **Step 2: Verify line budget and pointer integrity**

```bash
cd "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone"
wc -l SKILL.md
for f in $(grep -oE "references/[a-z-]+\.md" SKILL.md | sort -u); do test -f "$f" && echo "OK   $f" || echo "MISS $f"; done
ls -1 references/ | while read r; do grep -q "$r" SKILL.md && echo "LINKED   $r" || echo "ORPHAN   $r"; done
```

Expected: SKILL.md under 130 lines. Every `references/*.md` pointer resolves (`OK`, no `MISS`). Every reference file is linked from SKILL.md (`LINKED`, no `ORPHAN`).

- [ ] **Step 3: Verify frontmatter parses and the description is unquoted**

```bash
head -5 "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/SKILL.md"
```

Expected: `---`, `name: keystone`, `description: ` followed by an unquoted value, `---`. No leading `"` on the description value.

- [ ] **Step 4: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/keystone/SKILL.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "feat(keystone)!: rewrite SKILL around the derivability gate

390 lines to ~100 plus a references tree. The tool that teaches
progressive disclosure now uses it. Inline fill-in-the-blank templates
are gone; the criterion plus one exemplar replaces them.

BREAKING: generated keystones change shape. What's where, Tech Stack,
Common tasks, Design system, and Voice are no longer sections."
```

---

### Task 7: Update evolve-keystone and the parked harness doc

**Files:**
- Modify: `plugins/vibe-keystone/skills/evolve-keystone/SKILL.md:23-24` (capture-log reference) and the aggregation section at lines 38-43
- Modify: `proposed-changes-harness.md:5` (status header)

**Interfaces:**
- Consumes: the schema v2 definition from `capture.md` (Task 5).

- [ ] **Step 1: Add the schema-comparability note to evolve-keystone**

In the "Before You Start" section, update the capture-log bullet to state that captures carry `schema_version` 1 or 2, that v1 section names refer to the pre-v0.3 ten-section skeleton, and that section-name aggregation must not pool v1 and v2 entries. Classifier-miss and requested-but-missing aggregation remain valid across both versions.

Update the "Read the current skeleton" bullet: the skeleton now lives in `references/skeleton.md`, not `SKILL.md` Step 2. Proposals must point at real locations in the reference tree.

- [ ] **Step 2: Verify the pointer resolves**

```bash
grep -n "references/skeleton.md\|schema_version" "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/evolve-keystone/SKILL.md"
test -f "c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/skills/keystone/references/skeleton.md" && echo OK
```

Expected: both grep hits present, `OK` printed.

- [ ] **Step 3: Update the harness proposals status header**

Edit the `> **Status:**` line at `proposed-changes-harness.md:5` to record that proposal #2 became the core of v0.3, #3 shipped as the Knowledge & taste section, #4 shipped as Tier 0 capture plus evolve-keystone, and #1 remains parked to hold the zero-scripts promise. Do not rewrite the proposal bodies; they are dated research and stay as written.

- [ ] **Step 4: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/skills/evolve-keystone/SKILL.md proposed-changes-harness.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "chore(keystone): point evolve at the reference tree, mark harness proposals absorbed

Capture aggregation must not pool v1 and v2 section names. Harness
proposals #2/#3/#4 are shipped or absorbed; #1 stays parked."
```

---

## Phase 2: Validation via estate migration

Every task in this phase follows the same shape. The new skill is applied to a real CLAUDE.md, and any hand-correction needed is recorded as a skeleton defect. **A defect found here goes back to Phase 1 as a fix before the remaining migrations run.** That is the point of the ordering.

**Standing rules for Phase 2:**
- Read the current file in full before proposing a replacement.
- Produce the candidate, show the diff, and confirm with Este before writing. Never overwrite silently.
- Apply the guard: persona, voice, taste, tenant walls, and priorities are protected. Relocate, do not delete.
- Record every hand-correction in a running friction list. That list is the deliverable of Phase 2 as much as the migrated files.
- Each repo commits in its own repo with `git -C`.

### Task 8: Migrate vibe-plugins (smoke test)

**Files:**
- Modify: `c:/Users/estev/Projects/vibe-plugins/CLAUDE.md` (147 lines)

**Why first:** smallest real multi-section file, and its gotchas are already well characterized (tag-naming divergence, `github` source-type SSH trap, don't-edit-both-repos-in-parallel, bot-owned `data/stats/`). If the skeleton cannot produce a good file here, it is broken and every later migration would compound the error.

- [ ] **Step 1: Read the current file and classify every line**

Classify each line as derivable (cut), gotcha, rationale, non-standard convention, or protected. Expected rough split based on prior analysis: ~45 lines derivable, ~15 non-derivable, remainder mixed.

- [ ] **Step 2: Draft the candidate against the new skeleton**

Watch specifically: the plugin roster table is derivable (the CLAUDE.md itself already carries the Node one-liner that regenerates it). The *one-liner and the rule that the manifest wins* are the keepers; the fifteen-row table is not.

- [ ] **Step 3: Show the diff and confirm**

```bash
diff -u "c:/Users/estev/Projects/vibe-plugins/CLAUDE.md" /path/to/candidate
```

Present the diff. Do not write without confirmation.

- [ ] **Step 4: Apply and verify against the self-check**

```bash
wc -l "c:/Users/estev/Projects/vibe-plugins/CLAUDE.md"
```

Expected: within the ~50/~100 budget. Run all eight self-check items. Record any that required judgment the skeleton did not supply.

- [ ] **Step 5: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-plugins" add CLAUDE.md
git -C "c:/Users/estev/Projects/vibe-plugins" commit -m "docs: rightsize keystone against the derivability test

Cuts content a session derives from ls, package.json, and the manifest.
Keeps the tag-naming divergence, the github source-type SSH trap, the
linear-promotion rule, and bot-owned data/stats."
```

- [ ] **Step 6: Record friction**

Write any skeleton defect found to the running friction list. If a defect is structural, stop and fix Phase 1 before Task 9.

---

### Task 9: Migrate Project-626Labs-1 (nested keystone case)

**Files:**
- Modify: `c:/Users/estev/Projects/Project-626Labs-1/CLAUDE.md` (302 lines)
- Propose: nested `CLAUDE.md` files per surface (web, VS Code extension, MCP server)

**Why second:** largest file and the only confirmed multi-surface repo in the migration set. It is the sole real test of the nested-keystone mechanism, and it needs to run while the skeleton is still cheap to change.

- [ ] **Step 1: Inventory the surfaces**

```bash
git -C "c:/Users/estev/Projects/Project-626Labs-1" status --short
ls -1 "c:/Users/estev/Projects/Project-626Labs-1"
```

Confirm the actual surface boundaries before proposing a split. Do not assume the three surfaces named in the spec; verify them.

- [ ] **Step 2: Read the current file and classify every line**

- [ ] **Step 3: Draft the thin root plus per-surface nested proposals**

Apply the root-stays rule: anything an agent must see on every task stays at the root regardless of which surface it describes.

- [ ] **Step 4: Show the diff and the nested proposals, confirm**

Nested files are proposed. Only write them if Este approves; the skill's own rule is propose-never-auto-create, and this migration must honor the rule it is validating.

- [ ] **Step 5: Apply, verify against the self-check, commit**

```bash
git -C "c:/Users/estev/Projects/Project-626Labs-1" add CLAUDE.md
git -C "c:/Users/estev/Projects/Project-626Labs-1" commit -m "docs: rightsize keystone against the derivability test"
```

- [ ] **Step 6: Record friction**

The nested-keystone mechanism is unproven before this task. Record how well `progressive-disclosure.md`'s detection signals and root-stays rule held up.

---

### Task 10: Migrate Celestia3, vibe-cartographer, and Projects

**Files:**
- Modify: `c:/Users/estev/Projects/Celestia3/CLAUDE.md` (205 lines)
- Modify: `c:/Users/estev/Projects/vibe-cartographer/CLAUDE.md` (204 lines)
- Modify: `c:/Users/estev/Projects/CLAUDE.md` (90 lines)

**Note on `Projects/CLAUDE.md`:** it is the environment keystone and carries heavy protected content. The tenant wall (Marcus is employer property, absolute, both directions) and the duplicate-clone verification rule are protected: they are policy and hard-won operational knowledge, not derivable facts. The portfolio table is largely derivable from `ls` and is the main cut candidate, but rows carrying disambiguation ("the `-1` is canonical; the others are older siblings") are rationale and survive.

**Note on `vibe-cartographer/CLAUDE.md`:** flagged in the harness comparison as "enormous, half auto-generated." Check whether any section has a generator before cutting it; cutting generated content without disabling its generator means it returns on the next run.

- [ ] **Step 1: Migrate Celestia3** (read, classify, draft, diff, confirm, apply, commit)

```bash
git -C "c:/Users/estev/Projects/Celestia3" add CLAUDE.md
git -C "c:/Users/estev/Projects/Celestia3" commit -m "docs: rightsize keystone against the derivability test"
```

- [ ] **Step 2: Check vibe-cartographer for generated sections before migrating**

```bash
grep -rn "CLAUDE.md" "c:/Users/estev/Projects/vibe-cartographer/scripts" 2>/dev/null
grep -rn "CLAUDE.md" "c:/Users/estev/Projects/vibe-cartographer/.github" 2>/dev/null
```

If a generator exists, the migration must change the generator, not just the output.

- [ ] **Step 3: Migrate vibe-cartographer** (read, classify, draft, diff, confirm, apply, commit)

```bash
git -C "c:/Users/estev/Projects/vibe-cartographer" add CLAUDE.md
git -C "c:/Users/estev/Projects/vibe-cartographer" commit -m "docs: rightsize keystone against the derivability test"
```

- [ ] **Step 4: Migrate Projects environment keystone** (read, classify, draft, diff, confirm, apply, commit)

Apply the protected-content notes above. `Projects/` is not a git repo in the same sense as the others; verify before running git commands.

```bash
git -C "c:/Users/estev/Projects" status --short 2>&1 | head -3
```

If it is not a repo, the file is edited in place with no commit, and that is recorded.

- [ ] **Step 5: Consolidate the friction list**

Write the full Phase 2 friction list to `c:/Users/estev/Projects/vibe-Keystone/docs/v0.3-migration-friction.md`. Every hand-correction, every skeleton gap, every judgment the references did not supply. This is the evidence that the skeleton works, and the seed for v0.4.

- [ ] **Step 6: Apply any skeleton fixes the friction list demands**

If the friction list shows a recurring gap, fix the reference tree and commit before Phase 3. Shipping a skeleton the migration proved weak would waste the validation.

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add docs/v0.3-migration-friction.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "docs(keystone): v0.3 migration friction log

Five real keystones migrated. Every hand-correction recorded as skeleton
signal."
```

---

## Phase 3: Ship

### Task 11: Version, changelog, README, descriptions

**Files:**
- Modify: `plugins/vibe-keystone/.claude-plugin/plugin.json` (version + description)
- Modify: `CHANGELOG.md`
- Modify: `README.md:20-32` (skeleton list), `README.md:38-43` (repo-type table), `README.md:53-69` (the "Using outside 626Labs" section referencing the old defaults)

**Interfaces:**
- Consumes: the finished skill from Phase 1 and the validation evidence from Phase 2.

- [ ] **Step 1: Bump the version and rewrite the plugin.json description**

Set `"version": "0.3.0"`. The description currently reads "Bootstrap a 626Labs-pattern CLAUDE.md for any repository... adapted to the repo type (code platform / marketing site / long-form writing / mixed)." Both halves describe the old shape. Rewrite around the gate and what survives it.

- [ ] **Step 2: Verify the JSON parses**

```bash
node -e "const p=require('c:/Users/estev/Projects/vibe-Keystone/plugins/vibe-keystone/.claude-plugin/plugin.json'); console.log(p.version, '|', p.description.slice(0,80))"
```

Expected: `0.3.0 | <new description>`.

- [ ] **Step 3: Write the CHANGELOG entry**

Match the existing CHANGELOG format. Lead with the breaking shape change. Name the `/doctor` evidence and the version it was read from (v2.1.220). List the seven sections, the removals, the guard, nested keystones, and the SKILL restructure. Record the five-repo validation with before and after line counts.

- [ ] **Step 4: Rewrite the affected README sections**

The numbered skeleton list at lines 20-32 and the repo-type adaptation table at lines 38-43 both enumerate the old shape. The "Using outside 626Labs" section at lines 53-69 is still accurate on tenant adaptation but its bulleted "things you will NOT get" list references sections that no longer exist. Update all three. Keep the "Validated on" section honest by naming the five migrated repos.

- [ ] **Step 5: Verify no stale section names survive in the README**

```bash
cd "c:/Users/estev/Projects/vibe-Keystone"
grep -n "What's where\|Common tasks\|Tech Stack" README.md
```

Expected: no hits, or only hits that explicitly describe what was removed.

- [ ] **Step 6: Commit**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" add plugins/vibe-keystone/.claude-plugin/plugin.json CHANGELOG.md README.md
git -C "c:/Users/estev/Projects/vibe-Keystone" commit -m "chore(release): vibe-keystone 0.3.0"
```

---

### Task 12: Tag, then promote

**Files:**
- Modify: `c:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json` (the `vibe-keystone` entry's `ref` and `description`)

**Interfaces:**
- Consumes: the `v0.3.0` tag, which must exist on the solo repo before the marketplace entry moves.

- [ ] **Step 1: Push the solo repo and tag**

```bash
git -C "c:/Users/estev/Projects/vibe-Keystone" push origin main
git -C "c:/Users/estev/Projects/vibe-Keystone" tag v0.3.0
git -C "c:/Users/estev/Projects/vibe-Keystone" push origin v0.3.0
```

- [ ] **Step 2: Verify the tag resolves on the remote before bumping anything**

```bash
gh api repos/estevanhernandez-stack-ed/vibe-Keystone/git/refs/tags/v0.3.0 --jq .ref
```

Expected: `refs/tags/v0.3.0`. If this fails, stop. A marketplace ref pinned to a nonexistent tag breaks installs.

- [ ] **Step 3: Verify the plugin manifest exists at that tag**

```bash
gh api repos/estevanhernandez-stack-ed/vibe-Keystone/contents/plugins/vibe-keystone/.claude-plugin/plugin.json?ref=v0.3.0 --jq .name
```

Expected: `plugin.json`. This is the check that catches a path that moved.

- [ ] **Step 4: Bump the marketplace ref and description**

Edit the `vibe-keystone` entry in `c:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json`: `ref` from `v0.2.1` to `v0.3.0`, and rewrite the description (it currently leads with "Bootstrap a 626Labs-pattern CLAUDE.md" and enumerates the repo-type adaptation).

- [ ] **Step 5: Verify the manifest still parses and the entry is correct**

```bash
node -e "const m=require('c:/Users/estev/Projects/vibe-plugins/.claude-plugin/marketplace.json'); const p=m.plugins.find(x=>x.name==='vibe-keystone'); console.log(p.source.ref); console.log(m.plugins.length)"
```

Expected: `v0.3.0`, and the plugin count unchanged from before the edit.

- [ ] **Step 6: Commit and push the promotion**

```bash
git -C "c:/Users/estev/Projects/vibe-plugins" add .claude-plugin/marketplace.json
git -C "c:/Users/estev/Projects/vibe-plugins" commit -m "chore(marketplace): promote vibe-keystone v0.2.1 -> v0.3.0 — the derivability rewrite"
git -C "c:/Users/estev/Projects/vibe-plugins" push origin main
```

- [ ] **Step 7: Log the decision**

Bind and log via the 626 dashboard MCP (`manage_projects findByRepo` on the vibe-plugins remote, then `manage_decisions log`). Two decisions worth recording: the shape change to a shipped generator with its evidence basis, and the `/doctor` positioning call (Keystone births lean, `/doctor` maintains, no overlap built). If the bind returns zero matches, tag with `vibe-plugins` in the description and set `projectId: null`.

---

## Self-Review

**Spec coverage.** Walking the spec section by section: the derivability test maps to Task 2; the protected-content guard to Task 3; the new skeleton to Task 4; progressive disclosure, the budget, the tenant-interview exclusion list, and repo types to Task 5; the SKILL restructure and self-check rewrite to Task 6; the capture schema v2 and evolve-keystone note to Tasks 5 and 7; the estate migration to Tasks 8-10; the ship plan to Tasks 11-12. The spec's "What NOT to build" items appear as Global Constraints rather than tasks, which is correct since they are prohibitions. The spec's four risks are each addressed: over-trim by the Orientation and Pointers ALWAYS status in Task 4 and the budget-is-a-forcing-function line in Task 5; misclassified protected content by Task 3 and the Phase 2 standing rules; nested fragmentation by the root-stays rule in Task 5 and Task 9; capture discontinuity by Task 7.

**Placeholder scan.** No TBD, TODO, or "implement later". The authoring tasks carry content contracts with enumerated required elements rather than prose, which is the deliberate adaptation stated at the top; each contract is specific enough to be checkable and each task has concrete verification commands.

**Consistency.** Section names are identical across Tasks 4, 6, 8, 9, 10, and 11: Orientation, Gotchas, Non-standard conventions, Rationale, Pointers, Decisions log, What NOT to do. The reference filenames are identical across Tasks 2-7 and the verification commands in Task 6 Step 2 enumerate exactly the seven files created in Tasks 2-5. The eight self-check items in Task 6 match the spec verbatim. Budget figures (~50/~100) are consistent in the Global Constraints, Task 5, and Task 8.

**One gap found and closed during review:** Task 10 originally assumed `c:/Users/estev/Projects/` is a git repository. It carries a `CLAUDE.md` and is the estate root, but nothing verified it is version-controlled. Step 4 now checks before committing and defines the fallback.
