---
name: generate
description: >
  This skill should be used when the user mentions "generate docs",
  "write my documentation", "fix my gaps", "create a runbook",
  "write the threat model", "generate missing docs", or wants to
  produce technical documentation from their project artifacts.
  Runs an autonomous-first workflow: reads project files, synthesizes
  as much as possible without asking, then interviews the user only
  for the sections that genuinely need human judgment.
---

# Vibe Doc Generate Skill

Autonomous-first pipeline: read the project, fill what you can, then ask the user only for the sections that need human judgment.

**Shared behavior:** Read `skills/guide/SKILL.md` for state management, CLI patterns, checkpoints, and output formatting.

---

## Design Intent

The old model was **agent-interviewed, user-informed**: the agent asked 2-3 synthesis questions per doc type and the user answered them all. That's overkill for factual docs whose content lives in the codebase.

The new model is **autonomous-first**:

1. **Read the project files directly** — README, CLAUDE.md, package.json, SKILL files, source entry points, git history, CI configs
2. **Synthesize confidently** from what you read — fill in template sections where you have strong evidence
3. **Interview only for the gaps** — ask targeted questions for the sections where code can't tell you the answer (security judgment, business intent, operational context the team knows but hasn't written down yet)
4. **Present the result** — show the user what you filled in, what you left as NEEDS INPUT, and let them review

The CLI (`vibe-doc generate <doctype>`) still produces the deterministic scaffold. This skill layers intelligence on top: same scaffold, but the agent keeps going and fills it in from the codebase before handing off to the user.

---

## Entry: Verify Scan State

```bash
if [ ! -f "<project-path>/.vibe-doc/state.json" ]; then
  echo "No project profile found. Run the Scan skill first."
  exit 1
fi
```

If state doesn't exist, redirect to the **Scan skill** and exit.

---

## Main Flow

### 1. Present Gaps and Confirm Selection

Read state and show gaps grouped by tier:

```
Documentation Gaps — <Category>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Required (ship blockers) — N missing:
  □ README
  □ Install Guide
  □ Skill/Command Reference

Recommended (should do) — M missing:
  □ ADRs
  □ Test Plan
  □ Changelog / Contributing

Which would you like to generate?

[required] Start with all Required docs (runs autonomous fill in parallel)
[pick]     Let me choose specific docs
[<name>]   Single doc by name
[all]      Every missing doc, Required + Recommended + Optional
```

**Do not default to "all"** unless the user asks for it. More docs = slower, more tokens, more noise.

---

### 2. Route by Count

- **Single doc selected** → go to **Section 3: Autonomous Fill (single doc)**
- **Multiple docs selected** → go to **Section 4: Parallel Dispatch (multiple docs)**

---

### 3. Autonomous Fill (Single Doc)

Follow these steps, in order, for each doc to generate.

#### 3a. Run the CLI for the scaffold

```bash
cd <project-path> && npx vibe-doc generate <docType> --format both
```

This produces `docs/generated/<docType>.md` with deterministic-extractor fields pre-filled and `NEEDS INPUT` comments marking the gaps.

Read the scaffold back so you can edit it in place.

#### 3b. Gather source material

Read the files most relevant to this doc type. Use the hint table below; add files based on what the scan inventory shows.

| Doc Type | Read These Files |
|----------|------------------|
| **readme** | `package.json`, `CLAUDE.md`, any existing `README.md`, main source entry file (e.g., `src/index.ts`), `docs/` summaries |
| **install-guide** | `package.json` (engines, scripts, bin), any existing `INSTALL.md`, CI configs (`.github/workflows/*.yml`), install-related scripts |
| **skill-command-reference** | every `skills/*/SKILL.md`, every `commands/*.md`, `.claude-plugin/plugin.json` |
| **changelog-contributing** | `git log --oneline -100`, any existing `CHANGELOG.md`, any existing `CONTRIBUTING.md`, `package.json` version history |
| **adr** | `CLAUDE.md`, commit messages with "decision:" or "arch:" prefixes, any `docs/adr/` or `docs/decisions/` folder |
| **runbook** | `package.json` scripts, `Dockerfile`, `.github/workflows/*.yml`, any `scripts/` folder, any deploy config |
| **api-spec** | Route/controller source files, `openapi.yaml`, `swagger.json`, any existing API docs |
| **deployment-procedure** | `.github/workflows/*.yml`, `Dockerfile`, deploy scripts, cloud infra configs (terraform, cdk, pulumi) |
| **test-plan** | Test files, test runner configs (`jest.config.*`, `pytest.ini`), CI test stages |
| **data-model** | Schema/migration files, ORM model files, database config |
| **threat-model** | Auth code, permission logic, sensitive-data handling, external API clients, secrets config |

For each file, extract what's relevant to the template's sections. Ignore irrelevant content.

#### 3c. Fill the template autonomously

Open the scaffold at `docs/generated/<docType>.md`. For each `NEEDS INPUT` comment:

1. **Can you synthesize this section from what you read?** If yes, replace the empty block (or the `{{user.*}}` placeholder still sitting there) with real content. Remove the `NEEDS INPUT` comment to signal the section is filled.
2. **Do you need human judgment?** If yes, leave the `NEEDS INPUT` comment in place. These will become the questions you ask the user in the next step.

**Rules for autonomous fills:**

- **Cite your sources inline** — at the end of a section you wrote, add a markdown comment: `<!-- Source: package.json, README.md -->`. This lets the user verify your work quickly.
- **Don't fabricate.** If a section would require making something up (an SLA target you don't see, a rollback procedure that isn't documented), leave it as NEEDS INPUT. Confident content only.
- **Prefer brevity over padding.** A 3-sentence section filled from real evidence beats a 3-paragraph section of boilerplate.
- **Match the existing doc's voice.** Read at least one existing doc in the repo (README is usually a good reference) to calibrate tone.

Write the filled-in doc back to `docs/generated/<docType>.md`.

#### 3d. Interview the user for remaining gaps

Present a summary:

```
✓ Autonomous pass complete — docs/generated/<docType>.md

Filled from codebase:
  • <section A> — from <source files>
  • <section B> — from <source files>
  • <section C> — from <source files>

Still need your input:
  • <section X> — <why the agent couldn't fill it>
  • <section Y> — <why the agent couldn't fill it>

I'll ask about those two now. If you'd rather fill them yourself
later, say "defer" and I'll leave the NEEDS INPUT comments.
```

Then ask **one question at a time** for each remaining gap. Each question should be specific, reference the context, and accept short answers:

```
Question 1 of 2: <section X>

<one-sentence explanation of what this section is for>

From what I read, you have <X, Y, Z>. What's the <specific thing>?
```

Capture each answer and update the doc in place. When all questions are answered, remove the `NEEDS INPUT` comments for those sections.

#### 3e. Present for review

```
✓ <docType>.md is ready for review.

Coverage:
  • Sections filled autonomously: N
  • Sections filled from your answers: M
  • Sections still marked NEEDS INPUT: 0 (or K if deferred)

Open: docs/generated/<docType>.md

[approve]  Move to next doc (or finish if last)
[revise]   Ask different questions / read more files / regenerate
[edit]     I'll wait while you edit manually, then approve
[defer]    Mark remaining gaps as NEEDS INPUT and move on
```

---

### 4. Parallel Dispatch (Multiple Docs)

When the user selects multiple docs, **dispatch one subagent per doc type in parallel** using the Task tool. This is the recommended path — it's faster and each agent gets a focused slice of the codebase to read.

#### 4a. Plan the dispatch

For each selected doc, build a subagent prompt that covers Section 3a-c (scaffold + read sources + fill autonomously). Do **not** include the conversational interview (Section 3d) in the subagent prompt — that happens in the main agent after all subagents return, so questions don't interleave.

Subagent prompt template:

```
You are generating documentation for a <Category> project at <project-path>.

Task: Produce a fully-filled `docs/generated/<docType>.md` from the project's
existing artifacts. Do NOT ask the user questions — fill only what you can
confidently synthesize from source files, and leave NEEDS INPUT comments for
anything you can't.

Steps:
1. Run: `cd <project-path> && npx vibe-doc generate <docType> --format both`
2. Read the generated scaffold at docs/generated/<docType>.md
3. Read these source files: <from the hint table, plus inventory-specific adds>
4. For each NEEDS INPUT section in the scaffold:
   - If you can fill it confidently from what you read, replace it with real
     content and add an inline <!-- Source: ... --> comment
   - If you can't, leave the NEEDS INPUT comment so the main agent can ask the user
5. Write the updated doc back to docs/generated/<docType>.md
6. Report back with: (a) which sections you filled, (b) which sections still
   need human input, (c) anything suspicious you noticed in the artifacts

Do not dispatch further subagents. Do not run the interview. Return findings
to the main agent.
```

#### 4b. Dispatch in parallel

Use the Task tool to fire all subagents in the same message. Each subagent runs independently and edits its own doc.

#### 4c. Collect results

When all subagents return, aggregate their findings:

```
✓ Autonomous pass complete — <N> docs

docs/generated/readme.md
  Filled: overview, install, usage, license
  Needs input: configuration (no .env.example found)

docs/generated/install-guide.md
  Filled: prerequisites, install steps, verification
  Needs input: troubleshooting (no existing error documentation)

docs/generated/skill-command-reference.md
  Filled: all sections (found 8 SKILL files and 4 command definitions)
  Needs input: none — ready to ship

Total: <X> sections filled autonomously, <Y> need your input.
```

#### 4d. Sequential interview for gaps

Now run the interview phase (Section 3d) **sequentially** across all docs — for each doc that has unfilled gaps, ask its questions one at a time, update the doc, move to the next. Don't interleave questions across docs; the user needs to stay focused on one doc at a time.

#### 4e. Present all docs for review

```
Generation complete ✓

Ready for review:
  • docs/generated/readme.md             (0 gaps remaining)
  • docs/generated/install-guide.md      (0 gaps remaining)
  • docs/generated/skill-command-reference.md  (0 gaps remaining)

Coverage improved: <before>% → <after>% (<n> Required docs satisfied)

Open each file to review. When you're ready, you can promote them to the
repo root (README.md, INSTALL.md, etc.) or keep them in docs/generated/
as a staging area.

[approve-all]  Done, docs are good
[revise <name>]  Re-run autonomous fill on one doc with different focus
[promote]     Move files from docs/generated/ to the repo root
```

---

## Update Unified Builder Profile

After any successful generation (single or parallel), update the `plugins.vibe-doc` namespace in `~/.claude/profiles/builder.json` — but **only if the file already exists**.

1. Read `~/.claude/profiles/builder.json`. If it doesn't exist or isn't valid JSON, skip this step.
2. Read-merge-write: update only `plugins.vibe-doc`, never touch `shared` or other plugin namespaces.
3. Set/update these fields:

```json
{
  "plugins": {
    "vibe-doc": {
      "last_generated_docs": ["<docType1>", "<docType2>"],
      "preferred_tier": "<tier the user chose, if they expressed a preference>",
      "default_output_format": "<format used, if not 'both'>",
      "last_updated": "<today's ISO date>"
    }
  }
}
```

4. Preserve existing fields (`scans_completed`, `last_scan_project`, etc.) — only update what changed.
5. If the user explicitly stated a preference during the session (e.g., "always generate markdown only" or "I only care about required docs"), capture it so future runs respect it without re-asking.

---

## When to Fall Back to the Pure Interview Flow

The autonomous-first flow works well for docs whose content lives in the codebase. It works **less well** for docs where the substance is judgment, intent, or future plans — specifically:

- **Threat Model** — requires security reasoning the agent shouldn't invent
- **ADRs for decisions not yet documented** — the "why" is in someone's head
- **Deployment Procedure for an app that hasn't deployed yet** — no evidence exists
- **Data Model for a pre-alpha app** — no schema yet

For these, default to a **short autonomous pass** (fill only what's obviously there) and spend most of the time in the interview phase. Lean on the synthesis questions from `skills/guide/references/breadcrumb-heuristics.md`.

---

## Anti-Patterns

- **Never fabricate.** If you don't have evidence, leave NEEDS INPUT. A scaffold with honest gaps is better than a polished doc that's half hallucination.
- **Never cite sources you didn't read.** Inline source comments must point to files the agent actually opened.
- **Don't auto-promote generated files.** `docs/generated/` is a staging area. Moving files to the repo root (README.md, INSTALL.md, CHANGELOG.md) is always an explicit user action.
- **Don't ask questions the code already answers.** Before asking a question, re-verify you couldn't have derived it from a file you haven't read yet.
- **Don't interleave questions across docs** in the parallel path. One doc at a time for the interview phase, even if the autonomous passes ran in parallel.

---

## Error Handling

### CLI scaffold generation fails

```
The scaffold step failed: <error>

This usually means:
  • The doc type isn't registered (check `vibe-doc templates list`)
  • The template file is missing from the install
  • A filesystem error blocked writing to docs/generated/

[retry] Try again
[skip]  Skip this doc and move to the next
```

### Autonomous pass runs out of context

If reading too many source files would exceed a reasonable context budget, narrow the scope:

- Read only the top 10-15 files most relevant to the doc type
- Prefer summary files (READMEs, CLAUDE.md, SKILL.md) over large source files
- Skim rather than read exhaustively — you're looking for evidence, not comprehension

### Subagent returns with everything marked NEEDS INPUT

If a subagent couldn't fill any sections, it probably got the wrong doc type or the repo genuinely has no evidence. Options:

- Fall back to the pure interview flow for that doc
- Skip that doc (not everything should be generated for every project)
- Ask the user to point the agent at the right files manually

---

## State & Output

**Read from `.vibe-doc/state.json`:**
- Classification (to pick the right doc types)
- Gaps list (to know what's missing)
- Artifact inventory (to know which files to read during autonomous pass)

**Write to:**
- `docs/generated/<docType>.md` — the filled-in doc (autonomous + interview results)
- `docs/generated/<docType>.docx` — DOCX version from the CLI scaffold pass
- `.vibe-doc/state.json` — generation history (file paths, timestamps)

**Files the agent should NOT modify:**
- Repo-root docs (README.md, INSTALL.md, CHANGELOG.md) — promotion is explicit user action
- Source code — docs generation is read-only on the codebase
- `.vibe-doc/state.json`'s `classification` or `gapReport` blocks — those are owned by scan/check skills

---

## Synthesis Questions Reference

When the interview phase is needed, question sets per doc type live in `skills/guide/references/breadcrumb-heuristics.md`. Each breadcrumb's `gapQuestions` field is a pre-written list of targeted questions for that doc type — use them as a starting point and adapt to what you already filled in.

---

**Last updated:** 2026-04-15 | **Version:** 2.0 (autonomous-first)
