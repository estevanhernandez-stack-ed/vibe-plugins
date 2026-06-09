# Vibe-Prompt v0.2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the behavioral eval + model-radar capabilities from the unpublished Vibe-Eval solo repo into the existing Vibe-Prompt v0.1.0 solo repo as new step-commands, ship as vibe-prompt v0.2.0, archive Vibe-Eval as superseded.

**Architecture:** Mostly mechanical file moves + renames + text substitutions. Source paths in `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\` get re-homed under `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\`. SKILL frontmatter names, env var names, state paths, and dashboard output paths shift from the `vibe-eval` / `VIBE_EVAL_*` / `.vibe-eval/` namespace into the `vibe-prompt` / `VIBE_PROMPT_*` / `.vibe-prompt/eval/` namespace. v0.1 commands and behavior remain unchanged — additions only.

**Tech Stack:** Markdown (SKILL.md, command files, README), JSON (plugin.json, state schemas, config), Bash (validation tests, vendor API calls via curl). Same toolchain as v0.1.

**Source spec:** `C:\Users\estev\Projects\vibe-plugins\drafts\vibe-prompt-v0.2\spec.md`. **Vibe-Eval source (for porting):** `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\`. **Validation app:** Celestia3 — re-runs the round-trip already proven in the vibe-eval namespace, this time under vibe-prompt's namespace.

**Solo-repo target:** Existing `C:\Users\estev\Projects\Vibe-Prompt\`. Working branch: `v0.2-migration` off `main` (currently at `108593c` = v0.1.0 tag). First stable: `v0.2.0`. Marketplace ref bumps from `v0.1.0` to `v0.2.0` at end.

---

## File structure (target after migration)

```
Vibe-Prompt/plugins/vibe-prompt/
├── plugin.json                           # version 0.1.0 → 0.2.0, description extended
├── commands/
│   ├── vibe-prompt.md                    # v0.1 (unchanged content; router SKILL changes)
│   ├── scan.md                           # v0.1 (unchanged)
│   ├── audit.md                          # v0.1 (unchanged)
│   ├── eval.md                           # NEW — invokes vibe-prompt:eval
│   ├── radar.md                          # NEW — invokes vibe-prompt:radar
│   └── evolve-prompt.md                  # v0.1 (unchanged content; SKILL extended)
├── skills/
│   ├── guide/
│   │   ├── SKILL.md                      # MODIFIED — merge eval guidance
│   │   └── references/
│   │       ├── security-hard-rules.md    # MODIFIED — merge eval security
│   │       └── cost-gates.md             # NEW — ported from Vibe-Eval
│   ├── router/SKILL.md                   # MODIFIED — 5 state branches now
│   ├── scan/                             # v0.1 unchanged
│   ├── audit/                            # v0.1 unchanged
│   ├── eval/                             # NEW — ported from Vibe-Eval/skills/run/
│   │   ├── SKILL.md                      # NEW (renamed from run/SKILL.md, frontmatter updated)
│   │   └── references/
│   │       ├── composer-mimic.md         # NEW (ported)
│   │       ├── vendor-clients.md         # NEW (ported with env var rename)
│   │       ├── fixture-synthesis.md      # NEW (ported)
│   │       ├── mechanical-comparator.md  # NEW (ported)
│   │       ├── llm-judge-prompt.md       # NEW (ported)
│   │       └── dashboard-template.md     # NEW (ported with output-path rename)
│   ├── radar/                            # NEW — ported from Vibe-Eval
│   │   ├── SKILL.md                      # NEW (frontmatter updated)
│   │   └── references/
│   │       └── vendor-news-sources.md    # NEW (ported)
│   ├── first-run-setup/                  # NEW — ported from Vibe-Eval (eval setup)
│   │   ├── SKILL.md                      # NEW (frontmatter + state-path updates)
│   │   └── references/
│   │       ├── composer-interview.md     # NEW (ported with .vibe-eval → .vibe-prompt/eval/)
│   │       └── agent-self-id.md          # NEW (ported)
│   ├── session-logger/SKILL.md           # v0.1 unchanged (data dir: ~/.claude/plugins/data/vibe-prompt/ already)
│   ├── friction-logger/
│   │   ├── SKILL.md                      # v0.1 unchanged
│   │   └── references/friction-triggers.md   # MODIFIED — merge eval+radar triggers
│   └── evolve-prompt/SKILL.md            # MODIFIED — reflect on eval+radar sessions too
├── schemas/                              # 2 existing v0.1 + 4 new from Vibe-Eval
│   ├── inventory.schema.json             # v0.1 unchanged
│   ├── audit.schema.json                 # v0.1 unchanged
│   ├── config.schema.json                # NEW (ported, $id updated to vibe-prompt/eval-config)
│   ├── composer.schema.json              # NEW (ported, $id updated)
│   ├── agent.schema.json                 # NEW (ported, $id updated)
│   └── run-result.schema.json            # NEW (ported, $id updated)
└── tests/
    ├── validate-schemas.sh               # v0.1 — covers 6 schemas now (no script change; glob finds them)
    ├── check-skill-references.sh         # v0.1 unchanged
    └── check-no-keys-in-state.sh         # NEW (ported)
```

**Substitution rules applied during port** (apply consistently across every ported file):

| From (vibe-eval) | To (vibe-prompt v0.2) |
|---|---|
| `vibe-eval:guide` | `vibe-prompt:guide` |
| `vibe-eval:run` | `vibe-prompt:eval` |
| `vibe-eval:radar` | `vibe-prompt:radar` |
| `vibe-eval:first-run-setup` | `vibe-prompt:first-run-setup` |
| `vibe-eval:session-logger` | `vibe-prompt:session-logger` |
| `vibe-eval:friction-logger` | `vibe-prompt:friction-logger` |
| `vibe-eval:evolve-eval` | `vibe-prompt:evolve-prompt` (consolidated) |
| `/vibe-eval:run` (command) | `/vibe-prompt:eval` |
| `/vibe-eval:radar` (command) | `/vibe-prompt:radar` |
| `/vibe-eval` (bare) | `/vibe-prompt` (bare router; consolidated, no separate eval router) |
| `VIBE_EVAL_GEMINI_API_KEY` | `VIBE_PROMPT_GEMINI_API_KEY` |
| `VIBE_EVAL_GEMINI_REFERER` | `VIBE_PROMPT_GEMINI_REFERER` |
| `.vibe-eval/state/` | `.vibe-prompt/eval/state/` |
| `.vibe-eval/composer.json` | `.vibe-prompt/eval/composer.json` |
| `.vibe-eval/agent.json` | `.vibe-prompt/eval/agent.json` |
| `.vibe-eval/config.json` | `.vibe-prompt/eval/config.json` |
| `.vibe-eval/fixtures/` | `.vibe-prompt/eval/fixtures/` |
| `.vibe-eval/cache/radar.json` | `.vibe-prompt/eval/cache/radar.json` |
| `docs/vibe-eval/report-*.md` | `docs/vibe-prompt/eval-*.md` |
| `~/.claude/plugins/data/vibe-eval/` | `~/.claude/plugins/data/vibe-prompt/` |
| `Vibe-Eval/plugins/vibe-eval/` (cross-refs in prose) | `Vibe-Prompt/plugins/vibe-prompt/` |
| Schema `$id: vibe-eval/<name>` | `$id: vibe-prompt/eval-<name>` |

---

## Phase 1 — Branch + scaffold target dirs

### Task 1: Branch from main for v0.2 work

**Files:**
- (Working tree state only — branch creation)

- [ ] **Step 1.1: Verify clean working tree on main**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" status
git -C "C:\Users\estev\Projects\Vibe-Prompt" log -1 --oneline
```

Expected: `nothing to commit, working tree clean`. Latest commit SHA visible.

- [ ] **Step 1.2: Create + checkout v0.2-migration branch**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" checkout -b v0.2-migration
```

Expected: `Switched to a new branch 'v0.2-migration'`.

- [ ] **Step 1.3: Create new skill directories**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references"
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\radar\references"
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\first-run-setup\references"
```

Expected: 6 directories created (3 skill dirs + 3 references subdirs).

- [ ] **Step 1.4: No commit yet** — the empty dirs aren't tracked by git anyway; commits start when files land.

---

## Phase 2 — Port the four eval-side schemas

### Task 2: Port config.schema.json

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\config.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\config.schema.json`

- [ ] **Step 2.1: Read the source file** verbatim.

- [ ] **Step 2.2: Update `$id`** from `vibe-eval/config` to `vibe-prompt/eval-config`. All other content unchanged.

- [ ] **Step 2.3: Write the updated content** to the target path.

- [ ] **Step 2.4: Verify JSON parses**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\config.schema.json" | ConvertFrom-Json
```

Expected: object printed with `$schema`, `$id`, `type: object`, `required`, `properties`.

- [ ] **Step 2.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/config.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): port eval config schema from Vibe-Eval"
```

### Task 3: Port composer.schema.json

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\composer.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\composer.schema.json`

- [ ] **Step 3.1: Read source verbatim.**
- [ ] **Step 3.2: Update `$id`** from `vibe-eval/composer` to `vibe-prompt/eval-composer`.
- [ ] **Step 3.3: Write to target path.**
- [ ] **Step 3.4: Verify with `ConvertFrom-Json`.**
- [ ] **Step 3.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/composer.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): port eval composer schema from Vibe-Eval"
```

### Task 4: Port agent.schema.json

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\agent.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\agent.schema.json`

- [ ] **Step 4.1: Read source verbatim.**
- [ ] **Step 4.2: Update `$id`** from `vibe-eval/agent` to `vibe-prompt/eval-agent`.
- [ ] **Step 4.3: Write to target.**
- [ ] **Step 4.4: Verify parses.**
- [ ] **Step 4.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/agent.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): port eval agent schema from Vibe-Eval"
```

### Task 5: Port run-result.schema.json

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\run-result.schema.json`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\run-result.schema.json`

- [ ] **Step 5.1: Read source verbatim.**
- [ ] **Step 5.2: Update `$id`** from `vibe-eval/run-result` to `vibe-prompt/eval-run-result`.
- [ ] **Step 5.3: Write to target.**
- [ ] **Step 5.4: Verify parses.**
- [ ] **Step 5.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas/run-result.schema.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): port eval run-result schema from Vibe-Eval"
```

---

## Phase 3 — Port the eval SKILL + its references

### Task 6: Port composer-mimic reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\composer-mimic.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\composer-mimic.md`

- [ ] **Step 6.1: Read source verbatim.**

- [ ] **Step 6.2: Apply substitutions** per the substitution table at top of plan. For this file specifically: any `.vibe-eval/` → `.vibe-prompt/eval/`, any `vibe-eval:*` skill names → `vibe-prompt:*`.

- [ ] **Step 6.3: Write to target path.**

- [ ] **Step 6.4: Verify content** — open the new file, confirm first line is `# Composer mimic — eval` (renamed from `# Composer mimic — run` to match the new skill name `eval`).

- [ ] **Step 6.5: Update the H1 heading** from `# Composer mimic — run` to `# Composer mimic — eval` (small text edit).

- [ ] **Step 6.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/composer-mimic.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port composer-mimic reference from Vibe-Eval"
```

### Task 7: Port vendor-clients reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\vendor-clients.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\vendor-clients.md`

- [ ] **Step 7.1: Read source verbatim.**

- [ ] **Step 7.2: Apply substitutions.** Specifically: every `VIBE_EVAL_GEMINI_API_KEY` → `VIBE_PROMPT_GEMINI_API_KEY`, every `VIBE_EVAL_GEMINI_REFERER` → `VIBE_PROMPT_GEMINI_REFERER`. The bash example code blocks contain these refs — update them too.

- [ ] **Step 7.3: Update H1** from `# Vendor clients — run` to `# Vendor clients — eval`.

- [ ] **Step 7.4: Write to target.**

- [ ] **Step 7.5: Spot-check the env var section** — confirm `VIBE_PROMPT_GEMINI_API_KEY` appears in the API key setup section AND in the bash call-shape example. No leftover `VIBE_EVAL_*` references.

```powershell
Select-String -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\vendor-clients.md" -Pattern "VIBE_EVAL"
```

Expected: zero matches (no output).

- [ ] **Step 7.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/vendor-clients.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port vendor-clients reference from Vibe-Eval (env vars renamed VIBE_PROMPT_*)"
```

### Task 8: Port fixture-synthesis reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\fixture-synthesis.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\fixture-synthesis.md`

- [ ] **Step 8.1: Read source verbatim.**
- [ ] **Step 8.2: Apply substitutions** — `.vibe-eval/fixtures/` → `.vibe-prompt/eval/fixtures/`, any `vibe-eval` mentions → `vibe-prompt`.
- [ ] **Step 8.3: Update H1** from `# Fixture synthesis — run` to `# Fixture synthesis — eval`.
- [ ] **Step 8.4: Write target.**
- [ ] **Step 8.5: Verify** `Select-String -Pattern "vibe-eval|VIBE_EVAL"` returns zero matches.
- [ ] **Step 8.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/fixture-synthesis.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port fixture-synthesis reference from Vibe-Eval"
```

### Task 9: Port mechanical-comparator reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\mechanical-comparator.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\mechanical-comparator.md`

- [ ] **Step 9.1: Read source verbatim.**
- [ ] **Step 9.2: Apply substitutions** (this file mostly has internal logic; the substitutions are about cross-references in prose).
- [ ] **Step 9.3: Update H1** from `# Mechanical comparator — run` to `# Mechanical comparator — eval`.
- [ ] **Step 9.4: Write target.**
- [ ] **Step 9.5: Verify** `Select-String -Pattern "vibe-eval"` returns zero matches.
- [ ] **Step 9.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/mechanical-comparator.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port mechanical-comparator reference from Vibe-Eval"
```

### Task 10: Port llm-judge-prompt reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\llm-judge-prompt.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\llm-judge-prompt.md`

- [ ] **Step 10.1: Read source verbatim.**
- [ ] **Step 10.2: Apply substitutions** — `agent.name` template placeholder stays (it's parameterized at runtime). Footer copy mentions agent names; no static substitution needed beyond the global `vibe-eval` → `vibe-prompt` swap.
- [ ] **Step 10.3: Update H1** from `# LLM-judge prompt — run` to `# LLM-judge prompt — eval`.
- [ ] **Step 10.4: Write target.**
- [ ] **Step 10.5: Verify** zero `vibe-eval` matches.
- [ ] **Step 10.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/llm-judge-prompt.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port llm-judge-prompt reference from Vibe-Eval"
```

### Task 11: Port dashboard-template reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references\dashboard-template.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\references\dashboard-template.md`

- [ ] **Step 11.1: Read source verbatim.**

- [ ] **Step 11.2: Apply substitutions** — CRITICAL for this file:
  - `docs/vibe-eval/report-<timestamp>.md` → `docs/vibe-prompt/eval-<timestamp>.md`
  - `run-result.json` references inside `.vibe-eval/state/` → `.vibe-prompt/eval/state/`
  - Auditor note's "Generated by Vibe-Eval v{plugin.version}" → "Generated by Vibe-Prompt v{plugin.version}"

- [ ] **Step 11.3: Update H1** from `# Dashboard template — run` to `# Dashboard template — eval`.

- [ ] **Step 11.4: Write target.**

- [ ] **Step 11.5: Verify** zero `vibe-eval` matches.

- [ ] **Step 11.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/references/dashboard-template.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port dashboard-template reference (output path → docs/vibe-prompt/eval-*.md)"
```

### Task 12: Port the eval SKILL (renamed from run)

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\SKILL.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\SKILL.md`

- [ ] **Step 12.1: Read source verbatim.**

- [ ] **Step 12.2: Apply substitutions** — the SKILL has multiple internal cross-references:
  - Frontmatter `name: vibe-eval:run` → `name: vibe-prompt:eval`
  - Frontmatter description: replace `/vibe-eval:run` mentions with `/vibe-prompt:eval`; replace `.vibe-eval/state/run-<timestamp>.json` with `.vibe-prompt/eval/state/run-<timestamp>.json`; replace `docs/vibe-eval/report-<timestamp>.md` with `docs/vibe-prompt/eval-<timestamp>.md`
  - Body H1: `# /vibe-eval:run` → `# /vibe-prompt:eval`
  - `Load \`vibe-eval:guide\` first` → `Load \`vibe-prompt:guide\` first`
  - All state path references shift to `.vibe-prompt/eval/`
  - Banner template inside the SKILL body: replace `═══ Vibe-Eval run ═══` with `═══ Vibe-Prompt eval ═══`; replace `Report:` line `docs/vibe-eval/...` with `docs/vibe-prompt/eval-...`; replace `State:` line `.vibe-eval/state/...` with `.vibe-prompt/eval/state/...`

- [ ] **Step 12.3: Write target.**

- [ ] **Step 12.4: Verify** the file's frontmatter parses (starts and ends with `---` lines correctly).

```powershell
$content = Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\SKILL.md" -Raw
$first = ($content -split "---", 3)[1]
if ($first -match "name: vibe-prompt:eval") { Write-Host "frontmatter OK" } else { Write-Host "FRONTMATTER FAIL" }
```

Expected: `frontmatter OK`.

- [ ] **Step 12.5: Verify** no leftover `vibe-eval` references.

```powershell
Select-String -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\eval\SKILL.md" -Pattern "vibe-eval|VIBE_EVAL"
```

Expected: zero matches.

- [ ] **Step 12.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/eval/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): port eval SKILL from Vibe-Eval run SKILL (renamed, namespace updated)"
```

### Task 13: Create the eval command file

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\commands\run.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\commands\eval.md`

- [ ] **Step 13.1: Write the command file** — only 5 lines, content below verbatim:

```markdown
---
description: Behaviorally test the prompts inventoried by /vibe-prompt:scan. Runs each prompt against the production model + an in-session Claude baseline; surfaces drift mechanically + via LLM-judge with explicit cross-vendor evaluator-drift warnings. Cost-gated.
---

Invoke the `vibe-prompt:eval` skill.
```

- [ ] **Step 13.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/eval.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(eval): add /vibe-prompt:eval command"
```

---

## Phase 4 — Port the radar SKILL + reference

### Task 14: Port vendor-news-sources reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\radar\references\vendor-news-sources.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\radar\references\vendor-news-sources.md`

- [ ] **Step 14.1: Read source verbatim.**
- [ ] **Step 14.2: Apply substitutions** — `.vibe-eval/cache/radar.json` → `.vibe-prompt/eval/cache/radar.json`; mention of `cost-gates.md` cross-reference unchanged (lives in guide/references/ in both layouts).
- [ ] **Step 14.3: Write target.**
- [ ] **Step 14.4: Verify** zero `vibe-eval` matches.
- [ ] **Step 14.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/radar/references/vendor-news-sources.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(radar): port vendor-news-sources reference from Vibe-Eval"
```

### Task 15: Port the radar SKILL

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\radar\SKILL.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\radar\SKILL.md`

- [ ] **Step 15.1: Read source verbatim.**
- [ ] **Step 15.2: Apply substitutions:**
  - Frontmatter `name: vibe-eval:radar` → `name: vibe-prompt:radar`
  - Description: `/vibe-eval:radar` → `/vibe-prompt:radar`; `vibe-eval:guide` → `vibe-prompt:guide`
  - H1: `# /vibe-eval:radar` → `# /vibe-prompt:radar`
  - `Load \`vibe-eval:guide\` first` → `Load \`vibe-prompt:guide\` first`
  - Banner: `═══ Vibe-Eval radar ═══` → `═══ Vibe-Prompt radar ═══`
  - Path: `.vibe-eval/cache/radar.json` → `.vibe-prompt/eval/cache/radar.json`
  - Next-step suggestion: `/vibe-eval:run --mode upgrade-test --candidate gemini-3.0-flash` → `/vibe-prompt:eval --mode upgrade-test --candidate gemini-3.0-flash`
- [ ] **Step 15.3: Write target.**
- [ ] **Step 15.4: Verify** zero `vibe-eval` matches.
- [ ] **Step 15.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/radar/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(radar): port radar SKILL from Vibe-Eval (namespace updated)"
```

### Task 16: Create the radar command file

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\commands\radar.md`

- [ ] **Step 16.1: Write the command file** verbatim:

```markdown
---
description: Read-only digest of what's new in the model space for vendors your app uses. Zero LLM calls; cached weekly.
---

Invoke the `vibe-prompt:radar` skill.
```

- [ ] **Step 16.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/radar.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(radar): add /vibe-prompt:radar command"
```

---

## Phase 5 — Port first-run-setup + references

### Task 17: Port composer-interview reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\first-run-setup\references\composer-interview.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\first-run-setup\references\composer-interview.md`

- [ ] **Step 17.1: Read source verbatim.**
- [ ] **Step 17.2: Apply substitutions** — `.vibe-eval/composer.json` → `.vibe-prompt/eval/composer.json`; `vibe-eval:*` → `vibe-prompt:*`.
- [ ] **Step 17.3: Write target.**
- [ ] **Step 17.4: Verify** zero `vibe-eval` matches.
- [ ] **Step 17.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/first-run-setup/references/composer-interview.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(first-run-setup): port composer-interview reference from Vibe-Eval"
```

### Task 18: Port agent-self-id reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\first-run-setup\references\agent-self-id.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\first-run-setup\references\agent-self-id.md`

- [ ] **Step 18.1: Read source verbatim.**
- [ ] **Step 18.2: Apply substitutions** — `.vibe-eval/agent.json` → `.vibe-prompt/eval/agent.json`; `/vibe-eval:run` → `/vibe-prompt:eval`; any `vibe-eval` → `vibe-prompt`.
- [ ] **Step 18.3: Write target.**
- [ ] **Step 18.4: Verify** zero `vibe-eval` matches.
- [ ] **Step 18.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/first-run-setup/references/agent-self-id.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(first-run-setup): port agent-self-id reference from Vibe-Eval"
```

### Task 19: Port first-run-setup SKILL

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\first-run-setup\SKILL.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\first-run-setup\SKILL.md`

- [ ] **Step 19.1: Read source verbatim.**
- [ ] **Step 19.2: Apply substitutions:**
  - Frontmatter `name: vibe-eval:first-run-setup` → `name: vibe-prompt:first-run-setup`
  - All `.vibe-eval/` → `.vibe-prompt/eval/`
  - `Load \`vibe-eval:guide\` first` → `Load \`vibe-prompt:guide\` first`
  - References to `:run` (the old eval command name) → `:eval`
  - Banner template: `═══ Vibe-Eval first-run setup ═══` → `═══ Vibe-Prompt first-run setup ═══`; `Ready: /vibe-eval:run` → `Ready: /vibe-prompt:eval`
  - Auth-check section references: `VIBE_EVAL_GEMINI_API_KEY` → `VIBE_PROMPT_GEMINI_API_KEY`
- [ ] **Step 19.3: Write target.**
- [ ] **Step 19.4: Verify** zero `vibe-eval|VIBE_EVAL` matches.
- [ ] **Step 19.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/first-run-setup/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(first-run-setup): port first-run-setup SKILL from Vibe-Eval"
```

---

## Phase 6 — Merge guide + security + add cost-gates

### Task 20: Port cost-gates reference

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\guide\references\cost-gates.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\references\cost-gates.md`

- [ ] **Step 20.1: Read source verbatim.**
- [ ] **Step 20.2: Apply substitutions** — `.vibe-eval/` → `.vibe-prompt/eval/`; `vibe-eval` mentions → `vibe-prompt`. Cost table rates stay numeric and unchanged.
- [ ] **Step 20.3: Write target.**
- [ ] **Step 20.4: Verify** zero `vibe-eval` matches.
- [ ] **Step 20.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/guide/references/cost-gates.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(guide): port cost-gates reference from Vibe-Eval"
```

### Task 21: Merge security-hard-rules with v0.1 guide reference

**Files:**
- Read v0.1: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\references\security-hard-rules.md` (does it exist? v0.1 may not have this file)
- Read v0.2 source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\guide\references\security-hard-rules.md`
- Output: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\references\security-hard-rules.md`

- [ ] **Step 21.1: Check if v0.1 has security-hard-rules.md.**

```powershell
Test-Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\references\security-hard-rules.md"
```

If False: just port the Vibe-Eval version with substitutions applied. If True: read both, merge — preserving any v0.1-specific content + adding the eval auth section from Vibe-Eval.

- [ ] **Step 21.2: Read the Vibe-Eval source.**
- [ ] **Step 21.3: Apply substitutions** — `VIBE_EVAL_*` → `VIBE_PROMPT_*`; `vibe-eval` references → `vibe-prompt`; state paths.
- [ ] **Step 21.4: Write to target.** (If v0.1 had a file, merge: keep all v0.1 sections, append eval-specific sections from Vibe-Eval after them.)
- [ ] **Step 21.5: Verify** zero `vibe-eval` matches.
- [ ] **Step 21.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/guide/references/security-hard-rules.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(guide): merge security-hard-rules from Vibe-Eval"
```

### Task 22: Update guide SKILL to cover both static + behavioral concerns

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\guide\SKILL.md`

- [ ] **Step 22.1: Read the current v0.1 guide SKILL** to understand its existing structure (persona, posture, output conventions, etc.).

- [ ] **Step 22.2: Read the Vibe-Eval guide SKILL** at `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\guide\SKILL.md` to see what its posture covers.

- [ ] **Step 22.3: Edit the v0.1 guide SKILL** to incorporate the eval-side posture. Specifically extend the "Posture" section to mention:
  - Behavioral test capability via `:eval` (calls real models with real cost)
  - Cost-conscious pre-run estimate + ceiling
  - Evaluator-drift warnings on LLM-judge findings
  - Composer-mimic to preserve production fidelity
  - Reference to `cost-gates.md` and `security-hard-rules.md`

The persona stays the same (single Vibe-Prompt persona — both static auditor + behavioral evaluator roles). Add a brief paragraph noting that the plugin operates in two modes: static (reads source, free) and behavioral (calls models, costs money, requires API keys).

- [ ] **Step 22.4: Verify** the updated SKILL still has the required v0.1 sections (persona, posture, output conventions, stack detection, when state is missing, self-evolution) PLUS the new eval-aware content.

- [ ] **Step 22.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/guide/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(guide): extend SKILL to cover behavioral eval posture"
```

---

## Phase 7 — Update existing v0.1 SKILLs (router, evolve, friction-triggers)

### Task 23: Update bare router for 5-branch state awareness

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\router\SKILL.md`

- [ ] **Step 23.1: Read the current v0.1 router SKILL.**

- [ ] **Step 23.2: Extend the state-check section** to cover 5 branches in this order:

```markdown
## State checks (in order)

1. **No `.vibe-prompt/state/inventory.json`** → first run (scan).
   - Render intro + "Want me to run `/vibe-prompt:scan` to inventory your prompts? (read-only, free)"
   - If yes, hand off to scan.

2. **Inventory exists, no `.vibe-prompt/state/audit.json`** → audit pending.
   - Render: inventory summary + "Run `/vibe-prompt:audit` against the cached inventory?"
   - If yes, hand off to audit.

3. **Audit exists, no `.vibe-prompt/eval/state/run-*.json`** → eval pending.
   - Render: audit summary + "Now behaviorally test the prompts? `/vibe-prompt:eval` runs them against the prod model and surfaces drift. Costs ~$0.01-0.20 per full sweep — gated by a confirm step."
   - If yes, hand off to eval (which invokes first-run-setup if needed).

4. **All three states exist, radar cache > 7 days old** → model news refresh suggested.
   - Render summary + "Radar cache is stale — `/vibe-prompt:radar` to refresh? (zero LLM cost)"

5. **All fresh** → full posture summary.
   - Read inventory + audit + latest run-result + radar cache.
   - Render: top 3 audit findings, top 3 eval findings (with evaluator-drift caveat), any new-model alerts from radar.
   - Suggest re-running `/vibe-prompt:scan` if a code change pushed prompts since last scan.
```

- [ ] **Step 23.3: Verify** the SKILL still has frontmatter + workflow + never section.

- [ ] **Step 23.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/router/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(router): extend bare router to 5 state branches (eval + radar)"
```

### Task 24: Update evolve-prompt SKILL to cover eval + radar sessions

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\evolve-prompt\SKILL.md`

- [ ] **Step 24.1: Read the v0.1 evolve-prompt SKILL.**

- [ ] **Step 24.2: Extend the inputs list** to include eval/radar session traces (same `~/.claude/plugins/data/vibe-prompt/sessions.jsonl` and `friction.jsonl` — those already aggregate ALL command sessions under one data dir per family convention).

- [ ] **Step 24.3: Update the description in frontmatter** to mention eval + radar coverage. Example new description:

> "L3 self-evolution loop. Reads `~/.claude/plugins/data/vibe-prompt/` session + friction logs covering scan + audit + eval + radar invocations. Weights findings, writes proposed SKILL/rubric/heuristic edits to `docs/proposed-changes.md` in the Vibe-Prompt solo repo. Never auto-applies."

- [ ] **Step 24.4: Update body prose** to mention which SKILLs each set of triggers maps to (so the evolution loop knows scan-specific friction goes to scan SKILL, eval-specific friction goes to eval SKILL or its references, etc.).

- [ ] **Step 24.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/evolve-prompt/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(evolve-prompt): extend to cover eval + radar session reflection"
```

### Task 25: Merge friction-triggers with eval + radar triggers

**Files:**
- Read v0.1: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\friction-logger\references\friction-triggers.md`
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\friction-logger\references\friction-triggers.md`
- Output: same as v0.1 path (modified)

- [ ] **Step 25.1: Read the v0.1 friction-triggers.md.** Note the sections it has (likely: scan triggers, audit triggers, router triggers, evolve-prompt triggers).

- [ ] **Step 25.2: Read the Vibe-Eval friction-triggers.md.** Note the additional sections it has: first-run-setup, eval-side (named `run` in source), radar, evolve-eval.

- [ ] **Step 25.3: Merge** — keep all v0.1 sections; append new sections from Vibe-Eval (rename `## run triggers` to `## eval triggers`, drop `## evolve-eval triggers` because evolution is consolidated into evolve-prompt, merge any unique evolve-eval triggers into the existing evolve-prompt section).

- [ ] **Step 25.4: Apply substitutions** — `vibe-eval` → `vibe-prompt`; any trigger codes mentioning eval state paths shift.

- [ ] **Step 25.5: Write to target.**

- [ ] **Step 25.6: Verify** the merged file has these sections (in order): scan triggers, audit triggers, first-run-setup triggers, eval triggers, radar triggers, router triggers, evolve-prompt triggers.

- [ ] **Step 25.7: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(friction-logger): merge eval + radar + first-run-setup triggers"
```

---

## Phase 8 — Add new validation test + update plugin.json + README + CHANGELOG

### Task 26: Port check-no-keys-in-state test

**Files:**
- Read source: `C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\tests\check-no-keys-in-state.sh`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\tests\check-no-keys-in-state.sh`

- [ ] **Step 26.1: Read source.** It should scan the plugin tree for vendor API key patterns.

- [ ] **Step 26.2: No substitutions needed** — this script just greps for key patterns; doesn't reference vibe-eval-specific paths.

- [ ] **Step 26.3: Write target.**

- [ ] **Step 26.4: Make executable.**

```bash
chmod +x "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-no-keys-in-state.sh"
```

- [ ] **Step 26.5: Run it** against the current plugin tree.

```bash
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-no-keys-in-state.sh"
```

Expected: PASS (no key patterns in the ported files).

- [ ] **Step 26.6: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/tests/check-no-keys-in-state.sh
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "test: add check-no-keys-in-state script from Vibe-Eval"
```

### Task 27: Run full test suite + fix any failures

**Files:**
- Test only — no source changes expected unless something breaks.

- [ ] **Step 27.1: Run all three test scripts.**

```bash
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/validate-schemas.sh"
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-skill-references.sh"
bash "C:/Users/estev/Projects/Vibe-Prompt/plugins/vibe-prompt/tests/check-no-keys-in-state.sh"
```

Expected:
- validate-schemas: `Total: 6 pass, 0 fail` (4 new + 2 existing)
- check-skill-references: `Total: N pass, 0 fail` (N depends on count after migration)
- check-no-keys-in-state: PASS

- [ ] **Step 27.2: If a `check-skill-references` failure surfaces** for `friction-triggers.md` cross-skill references (a known false-positive pattern from v0.1 ship), accept it as DONE_WITH_CONCERNS and document — same as v0.1.

- [ ] **Step 27.3: If anything else fails**, diagnose and fix; commit the fix(es) with appropriate messages. If fix is trivial (e.g., a missed substitution), make the edit and re-run.

- [ ] **Step 27.4: If all pass clean,** no commit needed (no changes).

### Task 28: Bump plugin.json version + update description

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json`

- [ ] **Step 28.1: Read the current plugin.json.**

- [ ] **Step 28.2: Edit** — change `version` from `0.1.0` to `0.2.0`. Update `description` to mention the new step-commands. New description:

```
"description": "Audit, organize, and classify the LLM prompts shipped in your app. Static inventory + 7-smell audit (F1-F7) + behavioral drift testing with cross-vendor evaluator-drift warnings + model-news radar. /vibe-prompt:scan inventories every prompt site; /vibe-prompt:audit fires structural findings; /vibe-prompt:eval runs prompts against the prod model and an in-session Claude baseline, surfacing semantic drift with explicit evaluator-bias caveats; /vibe-prompt:radar tracks what's new in the model space for your vendors. TS/JS + Python coverage. Env-var-only key handling; composes with vibe-sec. Validated on Celestia3 (Next.js + Firebase + Gemini)."
```

- [ ] **Step 28.3: Verify** JSON parses.

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json" | ConvertFrom-Json
```

- [ ] **Step 28.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/plugin.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "chore(plugin): bump to 0.2.0 + extend description for new step-commands"
```

### Task 29: Update README with v0.2 commands

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\README.md`

- [ ] **Step 29.1: Read the current README.**

- [ ] **Step 29.2: Edit the "What it does" section** to include the new step-commands:

```markdown
## What it does

- `/vibe-prompt:scan` — inventory pass. Finds every prompt site in your app.
- `/vibe-prompt:audit` — structural pass. Flags 7 smell categories with file:line evidence.
- `/vibe-prompt:eval` — behavioral pass. Runs each prompt against the production model + an in-session Claude baseline; surfaces drift mechanically + via LLM-judge with explicit cross-vendor evaluator-drift warnings. Cost-gated.
- `/vibe-prompt:radar` — model-news digest for vendors your prompts target. Zero LLM calls; cached weekly.
- `/vibe-prompt` (bare) — state-aware router; recommends the next move.
```

- [ ] **Step 29.3: Edit the "What it does NOT do" section** to reflect v0.2 reality (eval no longer in "out of scope"; instead document what behavioral testing v0.2 specifically does NOT do):

```markdown
## What it does NOT do (v0.2)

- No `:pick` mode for greenfield model selection. v0.3.
- No backup-test mode. v0.3.
- No OpenAI vendor implementation for `:eval` yet — Gemini-stack apps only. v0.3.
- No app-callable eval endpoint pattern (where the app exposes its own composer-bound eval surface). Designed as v0.3 — see drafts in the marketplace repo.
- No OS keychain integration for API keys. v0.3.
```

- [ ] **Step 29.4: Add a "Required setup for :eval" section.**

```markdown
## Required setup for :eval (behavioral testing)

- `VIBE_PROMPT_GEMINI_API_KEY` in your shell env. Get from https://aistudio.google.com/app/apikey (simplest) OR Google Cloud Console with service-account binding. NEVER commit.
- (Optional) `VIBE_PROMPT_GEMINI_REFERER` if your key has an HTTP referrer allowlist.
- First-run setup walks you through a composer capture for your target app.
```

- [ ] **Step 29.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add README.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "docs(readme): document v0.2 :eval + :radar commands"
```

### Task 30: Update CHANGELOG with v0.2.0 entry

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Prompt\CHANGELOG.md`

- [ ] **Step 30.1: Read current CHANGELOG.**

- [ ] **Step 30.2: Add v0.2.0 entry** at the top (above the v0.1.0 entry):

```markdown
## v0.2.0 — 2026-05-29

Behavioral prompt testing + model-news digest added as new step-commands. Re-homed from a planned standalone `vibe-eval` plugin after architectural correction: the concern is *prompts* and eval is a step in operating on prompts, same as audit and scan.

**New commands:**
- `/vibe-prompt:eval` — behavioral drift dashboard. Runs each prompt against the production model + an in-session Claude baseline; mechanical + LLM-judge comparator with cross-vendor evaluator-drift footer on every finding.
- `/vibe-prompt:radar` — model-news digest for vendors your prompts target; cached weekly.

**Behind the scenes:**
- New internal SKILL `vibe-prompt:first-run-setup` captures the app's composer pattern + agent self-identification + cost-ceiling config on first `:eval` invocation.
- New vendor client abstraction (`vibe-prompt:eval/references/vendor-clients.md`) supports Gemini AI Studio endpoint + API key + optional Referer header. OpenAI is stub in v0.2.
- Bare router (`/vibe-prompt`) extended to 5 state branches covering eval + radar.
- L3 evolution loop (`/vibe-prompt:evolve-prompt`) extended to reflect on eval + radar sessions.

**Env var naming convention:** `VIBE_PROMPT_GEMINI_API_KEY` (NOT `GEMINI_API_KEY` — namespaced to avoid Firebase deploy tooling collisions).

**Validation:** round-tripped against Celestia3's `natal_interpretation` prompt. Real cross-vendor drift detected (Gemini leaked "Fellow Pilgrim" despite master directive prohibiting it; baseline honored the prohibition). 5 LLM-judge findings produced, all carrying the cross-vendor evaluator-drift footer. Cost: $0.000198.

**Architectural note:** the behavioral capabilities went through a brief standalone-plugin design phase (Vibe-Eval solo repo at github.com/estevanhernandez-stack-ed/Vibe-Eval — never published) before being re-homed into vibe-prompt. The Vibe-Eval repo stays as historical record of the auth-iteration journey (4 attempts navigating Google's API restriction model).

## v0.1.0 — 2026-05-28

[existing v0.1.0 entry stays unchanged]
```

- [ ] **Step 30.3: Verify** the CHANGELOG renders cleanly (no markdown issues).

- [ ] **Step 30.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add CHANGELOG.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "docs(changelog): v0.2.0 entry"
```

---

## Phase 9 — Validate on Celestia3 (round-trip under vibe-prompt namespace)

### Task 31: Symlink updated plugin, install canary-style

**Files:**
- Touch: `C:\Users\estev\.claude\plugins\vibe-prompt` (symlink — may already exist pointing at solo repo)

- [ ] **Step 31.1: Check existing symlink.**

```powershell
Get-Item "C:\Users\estev\.claude\plugins\vibe-prompt"
```

If it exists and points at `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt`, it picks up the v0.2 changes automatically (since solo repo is editable). If it points elsewhere or doesn't exist, recreate.

- [ ] **Step 31.2: If recreating, recreate the symlink:**

```powershell
Remove-Item -Force "C:\Users\estev\.claude\plugins\vibe-prompt" -ErrorAction SilentlyContinue
New-Item -ItemType SymbolicLink -Path "C:\Users\estev\.claude\plugins\vibe-prompt" -Target "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt"
```

### Task 32: Re-run vibe-prompt:scan against Celestia3 (sanity check v0.1 still works)

- [ ] **Step 32.1: Confirm inventory still parseable.**

```powershell
Get-Content "C:\Users\estev\Projects\Celestia3\.vibe-prompt\state\inventory.json" | ConvertFrom-Json
```

Expected: object with 14 inline + 6 registry prompts (from the v0.1 round-trip). No new scan needed for the migration — existing state is valid.

- [ ] **Step 32.2: Confirm audit.json still valid** under v0.1 schema. Same Get-Content + ConvertFrom-Json check.

- [ ] **Step 32.3: If any state-file issue:** re-run the v0.1 scan + audit. Otherwise, skip — v0.1 state continues working as documented.

### Task 33: Round-trip the new :eval command against natal_interpretation

**Files:**
- Reads: Celestia3 source, plugin SKILLs
- Writes: `.vibe-prompt/eval/state/run-<timestamp>.json`, `docs/vibe-prompt/eval-<timestamp>.md`
- Reads (env): `VIBE_PROMPT_GEMINI_API_KEY` (user must have this set under the new namespace)

- [ ] **Step 33.1: User pre-flight** (blocking — controller cannot do this on user's behalf):
  - Set `VIBE_PROMPT_GEMINI_API_KEY` at User scope to the existing AI-Studio or service-account-bound Gemini API key (renamed from `VIBE_EVAL_GEMINI_API_KEY` if applicable):
    ```powershell
    $v = [Environment]::GetEnvironmentVariable('VIBE_EVAL_GEMINI_API_KEY', 'User')
    [Environment]::SetEnvironmentVariable('VIBE_PROMPT_GEMINI_API_KEY', $v, 'User')
    [Environment]::SetEnvironmentVariable('VIBE_EVAL_GEMINI_API_KEY', $null, 'User')
    $v = $null
    ```
  - Similarly migrate REFERER:
    ```powershell
    $v = [Environment]::GetEnvironmentVariable('VIBE_EVAL_GEMINI_REFERER', 'User')
    [Environment]::SetEnvironmentVariable('VIBE_PROMPT_GEMINI_REFERER', $v, 'User')
    [Environment]::SetEnvironmentVariable('VIBE_EVAL_GEMINI_REFERER', $null, 'User')
    $v = $null
    ```

- [ ] **Step 33.2: Migrate state files** from `.vibe-eval/` to `.vibe-prompt/eval/` (controller can do this):

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\estev\Projects\Celestia3\.vibe-prompt\eval\state"
Copy-Item "C:\Users\estev\Projects\Celestia3\.vibe-eval\composer.json" "C:\Users\estev\Projects\Celestia3\.vibe-prompt\eval\composer.json" -Force
Copy-Item "C:\Users\estev\Projects\Celestia3\.vibe-eval\agent.json" "C:\Users\estev\Projects\Celestia3\.vibe-prompt\eval\agent.json" -Force
Copy-Item "C:\Users\estev\Projects\Celestia3\.vibe-eval\config.json" "C:\Users\estev\Projects\Celestia3\.vibe-prompt\eval\config.json" -Force
```

- [ ] **Step 33.3: Dispatch round-trip subagent** following the same pattern as the vibe-eval round-trip 4 that succeeded. Subagent reads the v0.2 SKILLs from the updated paths, scopes to `natal_interpretation`, uses `gemini-2.5-flash`, uses the namespaced env var (`VIBE_PROMPT_GEMINI_API_KEY`). Expected outcome: same Pilgrim-leak finding the prior round-trip surfaced, now under vibe-prompt namespace, written to `Celestia3/.vibe-prompt/eval/state/run-*.json` + `Celestia3/docs/vibe-prompt/eval-*.md`.

- [ ] **Step 33.4: Verify parity** with the prior validated run by reading the new dashboard markdown. Critical assertions:
  - Persona-drift finding fires (HIGH)
  - "Fellow Pilgrim" present in Gemini output
  - Evaluator-drift footer attached to each LLM-judge finding (cross-vendor variant)
  - Mechanical comparator behaves consistently (likely 0 of 8 fired again)

- [ ] **Step 33.5: If parity holds,** the migration is functionally validated. Commit any plugin SKILL polish caught during round-trip:

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix: round-trip Celestia3 polish on v0.2 namespace" --allow-empty
```

(`--allow-empty` for the case where no fixes were needed.)

---

## Phase 10 — Merge v0.2-migration into main + ship

### Task 34: Merge v0.2-migration into main

- [ ] **Step 34.1: Verify working tree clean.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" status
```

- [ ] **Step 34.2: Checkout main, merge.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" checkout main
git -C "C:\Users\estev\Projects\Vibe-Prompt" merge --no-ff v0.2-migration -m "feat: v0.2.0 — add /vibe-prompt:eval + /vibe-prompt:radar step-commands"
```

Expected: merge commit lands on main.

- [ ] **Step 34.3: Verify main is in good shape.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" log --oneline -5
```

### Task 35: Tag v0.2.0 + push

- [ ] **Step 35.1: Tag.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" tag v0.2.0
```

- [ ] **Step 35.2: Push main + tag.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" push origin main
git -C "C:\Users\estev\Projects\Vibe-Prompt" push origin v0.2.0
```

- [ ] **Step 35.3: Verify tag resolves on GitHub.**

```powershell
gh api repos/estevanhernandez-stack-ed/Vibe-Prompt/git/refs/tags/v0.2.0 --jq '.object.sha'
```

Expected: SHA printed.

### Task 36: Marketplace ref bump in vibe-plugins

**Files:**
- Modify: `C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json`
- Modify: `C:\Users\estev\Projects\vibe-plugins\CLAUDE.md`

- [ ] **Step 36.1: Verify cwd before editing.**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" status
```

- [ ] **Step 36.2: Update marketplace.json** — find the `vibe-prompt` entry, bump `ref` from `v0.1.0` to `v0.2.0`. Also update the description to mention the new commands (use the description text from plugin.json Task 28 as the source).

- [ ] **Step 36.3: Verify JSON parses.**

```powershell
Get-Content "C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json" | ConvertFrom-Json | Out-Null
```

- [ ] **Step 36.4: Update CLAUDE.md** vibe-prompt row in the plugin table — no row change needed (paths same), but update the date in the "As of YYYY-MM-DD" line above the table to `2026-05-29` if changing. Plugin count stays at fifteen.

- [ ] **Step 36.5: Commit + push.**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" add .claude-plugin/marketplace.json CLAUDE.md
git -C "C:\Users\estev\Projects\vibe-plugins" commit -m "chore(marketplace): bump vibe-prompt v0.1.0 → v0.2.0

Adds /vibe-prompt:eval (behavioral drift testing) and /vibe-prompt:radar
(model-news digest) as new step-commands. Validated on Celestia3.
Architectural pivot: the behavioral work was briefly designed as a
standalone vibe-eval plugin, then re-homed into vibe-prompt because
'eval' as a plugin name doesn't name its concern — prompts are the
concern and eval is a step in operating on them.

Vibe-Eval solo repo (github.com/estevanhernandez-stack-ed/Vibe-Eval)
stays unpublished as historical record of the auth-iteration journey."
git -C "C:\Users\estev\Projects\vibe-plugins" push origin main
```

---

## Phase 11 — Archive Vibe-Eval solo repo

### Task 37: Update Vibe-Eval README to mark superseded

**Files:**
- Modify: `C:\Users\estev\Projects\Vibe-Eval\README.md`

- [ ] **Step 37.1: Replace the README content** with a single short note:

```markdown
# Vibe-Eval (superseded)

This solo repo was a brief architectural exploration during the v0.1 build of [Vibe-Prompt](https://github.com/estevanhernandez-stack-ed/Vibe-Prompt). The behavioral testing capabilities developed here (`/vibe-eval:run`, `/vibe-eval:radar`, first-run-setup, vendor-clients, composer-mimic) were re-homed into vibe-prompt as new step-commands in v0.2.0:

- `/vibe-eval:run` → `/vibe-prompt:eval`
- `/vibe-eval:radar` → `/vibe-prompt:radar`

This repo stays as historical record of:
- The auth-iteration journey through Google's API restriction model (4 round-trip attempts surfacing IP restrictions, gcloud OAuth scope incompatibility for personal Gmail, HTTP referrer + service restriction layering, and the eventual service-account-bound API key path)
- The decision to consolidate plugins by concern rather than by infrastructure

**Use [Vibe-Prompt v0.2+](https://github.com/estevanhernandez-stack-ed/Vibe-Prompt) for behavioral prompt testing.**

This repo is archived. No further commits planned.
```

- [ ] **Step 37.2: Commit + push.**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add README.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "docs: mark superseded by vibe-prompt v0.2.0"
# If repo not yet pushed to GitHub, skip push. If it was pushed during exploration, push the README update.
git -C "C:\Users\estev\Projects\Vibe-Eval" push 2>&1 | Out-String
```

(`2>&1 | Out-String` captures any "no remote" or "nothing to push" output without failing the task.)

---

## Phase 12 — Dashboard log + memory cleanup

### Task 38: Log v0.2.0 ship to 626Labs Dashboard via MCP

- [ ] **Step 38.1: Use `mcp__626labs__manage_decisions`** with action `log`, projectId `tyWzqAbCAq6Y9UJvoy8t` (Vibe Plugins project from prior decisions).

Decision text:

```
vibe-prompt v0.2.0 shipped 2026-05-29.

Adds /vibe-prompt:eval (behavioral drift testing) and /vibe-prompt:radar (model-news digest) as new step-commands. Re-homed from a planned standalone vibe-eval plugin after architectural correction surfaced during round-trip: the concern is *prompts* and eval is a step, same family pattern as scan + audit. Spawning a separate plugin for behavioral capability was overweighting infrastructure differences (API keys, vendor SDKs) against concern boundaries.

Validated on Celestia3 natal_interpretation prompt. Real cross-vendor drift detected: Gemini-2.5-flash leaked "Fellow Pilgrim" despite master directive prohibiting it, baseline (Claude in-session) honored the prohibition. 5 LLM-judge findings all carrying the cross-vendor evaluator-drift footer. Evaluator named its own bias risk in voice-tone finding ("as a Claude model, I may be biased toward Output B's register because it resembles my own training style"). Cost of full validation: $0.000198.

Auth-iteration journey through 4 attempts navigating Google's API restriction model is captured in the unpublished Vibe-Eval solo repo (github.com/estevanhernandez-stack-ed/Vibe-Eval) — kept as historical reference. Key finding for future plugin work in Gemini ecosystem: Google's AI Studio endpoint (generativelanguage.googleapis.com) doesn't accept OAuth Bearer from personal Gmail accounts; v0.1 path is API key + optional Referer header.

3 v0.3 candidates queued for /vibe-prompt:evolve-prompt:
1. value-type-drift check in mechanical comparator (would have caught the bigThree array vs string finding mechanically)
2. App-callable eval endpoint pattern (Celestia3 exposes /api/dev/eval-proxy, vibe-prompt:eval calls it instead of vendor-direct) — design captured at drafts/vibe-eval/v0.2-app-endpoint-architecture.md
3. Knowledge-injection capture during first-run-setup (current composer-mimic uses placeholder text, understating real prod token count)
```

- [ ] **Step 38.2: Capture the decision ID** from the MCP response for reference.

### Task 39: Update project memory

**Files:**
- Update: `C:\Users\estev\.claude-personal\projects\C--Users-estev-Projects-vibe-plugins\memory\MEMORY.md`
- Create: `C:\Users\estev\.claude-personal\projects\C--Users-estev-Projects-vibe-plugins\memory\vibe_prompt_v0_2_architecture.md`
- Modify/rename: existing `queued_plugin_vibe_eval.md` → describe the architectural pivot

- [ ] **Step 39.1: Read the current MEMORY.md** to know which entries exist.

- [ ] **Step 39.2: Update the `vibe-prompt v0.1` entry** in MEMORY.md to add a hook about v0.2 superseding parts of it (or link to the new memory file).

- [ ] **Step 39.3: Update or replace `queued_plugin_vibe_eval.md`** with a "historical pivot" memory:

```markdown
---
name: historical pivot — vibe-eval consolidated into vibe-prompt v0.2
description: The behavioral eval capabilities briefly designed as a standalone vibe-eval plugin were re-homed into vibe-prompt as step-commands after architectural correction. Lesson: concern boundaries justify plugin separation; infrastructure differences do not.
metadata:
  type: project
---

[brief 1-paragraph summary of the pivot, lesson, and where the capability now lives]
```

- [ ] **Step 39.4: Create `vibe_prompt_v0_2_architecture.md`** with the v0.2 ship summary, capabilities, validation status, v0.3 candidates queued.

- [ ] **Step 39.5: Update MEMORY.md index** to add the new architecture file pointer.

---

## Self-review

Checking the plan against the spec:

**Spec coverage check:**
- §1 (architectural correction) → captured in Task 38 (dashboard log) + Task 39 (memory).
- §2 (new commands) → Tasks 12 (eval SKILL) + 13 (eval command) + 15 (radar SKILL) + 16 (radar command).
- §3 (what doesn't change) → no tasks needed; v0.1 files left untouched.
- §4 (substantive design imported) → all reference + SKILL ports (Tasks 6-19) preserve substantive design verbatim with surface-level substitutions.
- §5 (file structure) → exactly matches Phase 1-9 outputs.
- §6 (16-step migration sequence) → mapped to 39 tasks across 12 phases (more granular for subagent execution).
- §7 (validation status) → Task 33 confirms re-validation. Prior round-trip findings transfer.
- §8 (v0.3 candidates) → captured in Tasks 38 + 39 (dashboard log + memory).
- §9 (open questions) — defaults applied:
  - Bare router auto-handoff after each step: Task 23 router SKILL implements this (5 branches with handoff suggestions).
  - First-run-setup discoverability: Task 19 SKILL invokes itself automatically when state files missing; bare router doesn't need a separate branch.
  - Env var rename hard-cut: Task 33.1 migrates the user's existing env var; no soft-fallback code.

**Placeholder scan:** No "TBD", no "implement later", no "add appropriate handling." Every step has exact paths + exact commands + concrete substitution rules.

**Type/name consistency:**
- Env var names: `VIBE_PROMPT_GEMINI_API_KEY` + `VIBE_PROMPT_GEMINI_REFERER` consistent across Tasks 7, 19, 22, 26 (test), 29 (README), 33 (round-trip env migration).
- State paths: `.vibe-prompt/eval/{state,fixtures,cache}/` consistent across all relevant tasks.
- Dashboard output path: `docs/vibe-prompt/eval-<timestamp>.md` consistent in Tasks 11 (template), 12 (eval SKILL).
- SKILL frontmatter names: `vibe-prompt:eval`, `vibe-prompt:radar`, `vibe-prompt:first-run-setup` consistent across Task 12, 15, 19 ports + Task 23 router cross-references.
- Schema `$id` values: `vibe-prompt/eval-config`, `vibe-prompt/eval-composer`, `vibe-prompt/eval-agent`, `vibe-prompt/eval-run-result` consistent in Tasks 2-5.

**Scope check:** Single subsystem — migration of one plugin's capabilities. No decomposition needed. ~39 tasks, each bite-sized.

Plan is internally consistent and spec-complete.
