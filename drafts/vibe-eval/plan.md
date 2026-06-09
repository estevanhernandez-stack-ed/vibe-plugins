# Vibe-Eval v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `vibe-eval` v0.1 — a behavioral LLM-prompt eval Claude Code plugin with one main command (`:run` with drift / upgrade-test modes), a model-news digest (`:radar`), a state-aware bare router, and the L2/L3 self-evolution stack. Validated by round-tripping Celestia3's `natal_interpretation` Pilgrim-contradiction prompt end-to-end (synthesize fixture → mimic composer → call Gemini + in-session Claude → compare → render dashboard with evaluator-drift warning).

**Architecture:** Skills-only Claude Code plugin following the vibe-prompt + vibe-walk + vibe-iterate family pattern. Commands route to skills; skills hold agent behavior in prose; the agent itself is the runtime. No standalone TypeScript or Node modules in v0.1 — the agent makes vendor API calls via Bash + curl (Gemini), dispatches subagents (in-session Claude baseline + LLM-judge), and applies mechanical comparator rules from prose. JSON schemas lock the state shapes; security guardrails enforce env-var-only key handling.

**Tech Stack:** Markdown (SKILL.md, command files, README), JSON (plugin.json, state schemas, config), Bash (vendor API calls via curl, validation tests). Plugin runtime is the agent itself.

**Source spec:** `drafts/vibe-eval/spec.md`. **Validation app:** Celestia3 (`C:\Users\estev\Projects\Celestia3`). **Sibling plugin (assumed installed):** vibe-prompt v0.1.0 (provides `.vibe-prompt/state/inventory.json`).

**Solo-repo target:** `Vibe-Eval` under `estevanhernandez-stack-ed`. Plugin path within solo: `plugins/vibe-eval`. Tag scheme: plain `vX.Y.Z`. First stable: `v0.1.0`. Marketplace ref bump in `vibe-plugins/.claude-plugin/marketplace.json` is the very last step.

---

## File structure (locked at plan-time)

```
Vibe-Eval/                                  # solo repo root
├── README.md                               # storefront + install
├── CHANGELOG.md                            # v0.1.0 entry
├── LICENSE                                 # MIT
├── .gitignore
└── plugins/
    └── vibe-eval/
        ├── plugin.json                     # manifest
        ├── commands/                       # user-invocable slash commands
        │   ├── vibe-eval.md                # bare router
        │   ├── run.md
        │   ├── radar.md
        │   └── evolve-eval.md
        ├── skills/
        │   ├── guide/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── security-hard-rules.md
        │   │       └── cost-gates.md
        │   ├── router/
        │   │   └── SKILL.md
        │   ├── first-run-setup/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── composer-interview.md
        │   │       └── agent-self-id.md
        │   ├── run/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── composer-mimic.md
        │   │       ├── vendor-clients.md
        │   │       ├── fixture-synthesis.md
        │   │       ├── mechanical-comparator.md
        │   │       ├── llm-judge-prompt.md
        │   │       └── dashboard-template.md
        │   ├── radar/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       └── vendor-news-sources.md
        │   ├── session-logger/
        │   │   └── SKILL.md
        │   ├── friction-logger/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       └── friction-triggers.md
        │   └── evolve-eval/
        │       └── SKILL.md
        ├── schemas/
        │   ├── config.schema.json
        │   ├── composer.schema.json
        │   ├── agent.schema.json
        │   └── run-result.schema.json
        └── tests/
            ├── validate-schemas.sh
            ├── check-skill-references.sh
            └── check-no-keys-in-state.sh
```

**Conventions inherited from the family (locked):**

- SKILL.md files use YAML frontmatter (`name`, `description`).
- `references/` subdirectories hold content the SKILL.md body links to.
- State files (`.vibe-eval/state/*.json`, `.vibe-eval/config.json`, etc.) live in the TARGET app, not the plugin repo.
- Self-evolution data path: `~/.claude/plugins/data/vibe-eval/` (sessions.jsonl + friction.jsonl).
- No telemetry. Vendor SDK calls go directly to vendor endpoints with user-supplied keys.

---

## Phase 1 — Scaffold the plugin

### Task 1: Create solo repo + base files

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Eval\.gitignore`
- Create: `C:\Users\estev\Projects\Vibe-Eval\LICENSE`
- Create: `C:\Users\estev\Projects\Vibe-Eval\README.md`
- Create: `C:\Users\estev\Projects\Vibe-Eval\CHANGELOG.md`

- [ ] **Step 1.1: Create solo repo directory + git init**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval"
git -C "C:\Users\estev\Projects\Vibe-Eval" init -b main
```

- [ ] **Step 1.2: Write `.gitignore`**

```
node_modules/
.vibe-eval/
*.log
.DS_Store
.env
.env.local
```

- [ ] **Step 1.3: Write `LICENSE`** — standard MIT, copyright `626Labs LLC`, year `2026`.

- [ ] **Step 1.4: Write `README.md`** with the family voice (builder-to-builder, second person, sentence case).

```markdown
# Vibe-Eval

Test your LLM prompts against the actual production models, with honest evaluator-drift warnings.

Vibe-Eval is the behavioral counterpart to [vibe-prompt](https://github.com/estevanhernandez-stack-ed/Vibe-Prompt). Where vibe-prompt audits prompt structure statically, vibe-eval runs the prompts against the actual production models, compares outputs against a baseline, and surfaces where the evaluator (the LLM driving vibe-eval itself) might be giving you a false read of production behavior.

## Install

[Stable channel via the vibe-plugins marketplace]
[Canary channel: this repo directly]

## What it does

- `/vibe-eval:run` — runs each prompt in your app's inventory against the production model AND an in-session agent baseline; surfaces drift mechanically + via LLM-judge with explicit evaluator-drift warnings. Supports `--mode upgrade-test --candidate <model>` for parity checks before model bumps.
- `/vibe-eval:radar` — what's new across the model space for vendors your app uses. Zero LLM calls; cached weekly.
- `/vibe-eval` (bare) — state-aware router; recommends the next move.

## What it does NOT do (v0.1)

- No `:pick` mode for greenfield model selection. v0.2.
- No `:backup-test` mode. v0.2.
- No OpenAI vendor implementation. v0.2.
- No CI/cron context support (assumes Claude Code session). v0.2.
- No OS keychain integration. v0.1 reads keys from env vars only.

## Required setup

- `vibe-prompt` installed and run on your target app (provides `.vibe-prompt/state/inventory.json`)
- `GEMINI_API_KEY` (or other vendor key) in your shell env
- First-run interview: vibe-eval will ask you to point at your composer file (if your app has one)

## Security

Vibe-Eval reads API keys from env vars only. Never persists them. Composes with vibe-sec for key-pattern detection when available.
```

- [ ] **Step 1.5: Write `CHANGELOG.md`**

```markdown
# Changelog

## Unreleased — v0.1.0

Initial release. Behavioral LLM-prompt eval for vibe-coded apps.

**Commands:**
- `/vibe-eval:run` — drift dashboard (default mode) and upgrade-test mode
- `/vibe-eval:radar` — model-space digest for vendors your app uses
- `/vibe-eval` — state-aware bare router
- `/vibe-eval:evolve-eval` — L3 self-evolution

**Stack coverage:** TS/JS Gemini-stack apps. Python + OpenAI in v0.2.

**Validation:** round-tripped against Celestia3's natal_interpretation Pilgrim-contradiction prompt.
```

- [ ] **Step 1.6: Verify and commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add -A
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "chore: scaffold Vibe-Eval solo repo"
```

Expected: 4 files committed; `git status` clean.

---

### Task 2: Plugin manifest + directory tree

**Files:**
- Create: `plugins/vibe-eval/plugin.json`
- Create: `plugins/vibe-eval/{commands,skills,schemas,tests}/`

- [ ] **Step 2.1: Create plugin directory tree**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\commands" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\tests" -Force
```

- [ ] **Step 2.2: Write `plugin.json`**

```json
{
  "name": "vibe-eval",
  "version": "0.1.0",
  "description": "Test your LLM prompts against the actual production models, with honest evaluator-drift warnings. /vibe-eval:run drives the drift dashboard (prod model vs in-session agent baseline) and the upgrade-test mode (prod vs candidate). /vibe-eval:radar surfaces what's new in the model space for your vendors. Agent-aware — adapts evaluator-drift framing to whichever LLM-driven CLI is running it. Env-var-only key handling; composes with vibe-sec. No telemetry.",
  "author": {
    "name": "626Labs LLC",
    "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Eval"
  }
}
```

- [ ] **Step 2.3: Verify JSON parses + commit**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\plugin.json" | ConvertFrom-Json
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/plugin.json
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(plugin): add plugin.json manifest"
```

---

## Phase 2 — JSON schemas (lock the data shapes early)

### Task 3: Config + composer + agent schemas

**Files:**
- Create: `plugins/vibe-eval/schemas/config.schema.json`
- Create: `plugins/vibe-eval/schemas/composer.schema.json`
- Create: `plugins/vibe-eval/schemas/agent.schema.json`

- [ ] **Step 3.1: Write `config.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-eval/config",
  "type": "object",
  "required": ["version", "vendors", "costCeiling"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "vendors": {
      "type": "object",
      "properties": {
        "gemini": {
          "type": "object",
          "required": ["defaultModel"],
          "properties": {
            "defaultModel": { "type": "string" },
            "fallbackModel": { "type": ["string", "null"] }
          }
        },
        "anthropic": {
          "type": "object",
          "properties": {
            "defaultModel": { "type": "string" }
          }
        },
        "openai": {
          "type": "object",
          "properties": {
            "defaultModel": { "type": "string" }
          }
        }
      }
    },
    "costCeiling": { "type": "number", "minimum": 0 },
    "fixturePath": { "type": "string" }
  }
}
```

- [ ] **Step 3.2: Write `composer.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-eval/composer",
  "type": "object",
  "required": ["version", "kind", "layers"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "kind": { "enum": ["identity", "stacked"] },
    "sourceFile": { "type": ["string", "null"] },
    "layers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "text"],
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["literal", "directive-field", "knowledge-injection", "task-instruction", "conditional"] },
          "text": { "type": "string" },
          "condition": { "type": ["string", "null"] },
          "order": { "type": "integer" }
        }
      }
    }
  }
}
```

- [ ] **Step 3.3: Write `agent.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-eval/agent",
  "type": "object",
  "required": ["version", "name", "model", "detectedAt", "detectionMethod"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "name": { "type": "string" },
    "model": { "type": "string" },
    "vendor": { "type": "string" },
    "detectedAt": { "type": "string", "format": "date-time" },
    "detectionMethod": { "enum": ["env-var", "marker-file", "process-inspection", "user-declared"] }
  }
}
```

- [ ] **Step 3.4: Verify and commit**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\config.schema.json" | ConvertFrom-Json
Get-Content "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\composer.schema.json" | ConvertFrom-Json
Get-Content "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\agent.schema.json" | ConvertFrom-Json

git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/schemas
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(schemas): lock config + composer + agent schemas"
```

---

### Task 4: Run-result schema

**Files:**
- Create: `plugins/vibe-eval/schemas/run-result.schema.json`

- [ ] **Step 4.1: Write the schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-eval/run-result",
  "type": "object",
  "required": ["version", "runId", "startedAt", "completedAt", "mode", "agentIdentity", "prompts", "summary"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "runId": { "type": "string" },
    "startedAt": { "type": "string", "format": "date-time" },
    "completedAt": { "type": "string", "format": "date-time" },
    "mode": { "enum": ["drift", "upgrade-test"] },
    "candidateModel": { "type": ["string", "null"] },
    "agentIdentity": {
      "type": "object",
      "required": ["name", "model"],
      "properties": {
        "name": { "type": "string" },
        "model": { "type": "string" }
      }
    },
    "prompts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "fixture", "outputs", "comparator"],
        "properties": {
          "id": { "type": "string" },
          "source": { "type": "string" },
          "fixture": {
            "type": "object",
            "required": ["origin", "data"],
            "properties": {
              "origin": { "enum": ["synthesized", "user-provided"] },
              "data": {}
            }
          },
          "outputs": {
            "type": "object",
            "properties": {
              "prod": {
                "type": "object",
                "required": ["model", "text", "tokens", "costUsd"],
                "properties": {
                  "model": { "type": "string" },
                  "text": { "type": "string" },
                  "tokens": { "type": "integer" },
                  "costUsd": { "type": "number" },
                  "error": { "type": ["string", "null"] }
                }
              },
              "baseline": {
                "type": "object",
                "properties": {
                  "model": { "type": "string" },
                  "text": { "type": "string" },
                  "tokens": { "type": "integer" },
                  "costUsd": { "type": "number" },
                  "error": { "type": ["string", "null"] }
                }
              }
            }
          },
          "comparator": {
            "type": "object",
            "required": ["mechanical", "llmJudge"],
            "properties": {
              "mechanical": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["check", "severity", "fired"],
                  "properties": {
                    "check": { "type": "string" },
                    "severity": { "enum": ["high", "medium", "low"] },
                    "fired": { "type": "boolean" },
                    "detail": { "type": "string" }
                  }
                }
              },
              "llmJudge": {
                "type": "object",
                "properties": {
                  "skipped": { "type": "boolean" },
                  "findings": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "required": ["category", "severity", "text"],
                      "properties": {
                        "category": { "type": "string" },
                        "severity": { "enum": ["high", "medium", "low"] },
                        "text": { "type": "string" }
                      }
                    }
                  },
                  "evaluatorDriftWarning": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "required": ["totalPrompts", "totalCostUsd", "highSeverityCount"],
      "properties": {
        "totalPrompts": { "type": "integer" },
        "totalCostUsd": { "type": "number" },
        "highSeverityCount": { "type": "integer" },
        "abortedByCostCeiling": { "type": "boolean" }
      }
    }
  }
}
```

- [ ] **Step 4.2: Verify and commit**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\schemas\run-result.schema.json" | ConvertFrom-Json
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/schemas/run-result.schema.json
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(schemas): add run-result schema"
```

---

## Phase 3 — Guide SKILL + security references

### Task 5: Guide SKILL + security-hard-rules + cost-gates references

**Files:**
- Create: `plugins/vibe-eval/skills/guide/SKILL.md`
- Create: `plugins/vibe-eval/skills/guide/references/security-hard-rules.md`
- Create: `plugins/vibe-eval/skills/guide/references/cost-gates.md`

- [ ] **Step 5.1: Create reference directory**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\guide\references" -Force
```

- [ ] **Step 5.2: Write the guide SKILL**

```markdown
---
name: vibe-eval:guide
description: Shared behavior, persona, security posture, and cost-gate rules used internally by the other Vibe Eval skills. Loaded as a reference by command skills for consistent agent behavior. Not a slash command — do not invoke directly.
---

# Vibe-Eval guide (internal)

This SKILL is loaded by every Vibe-Eval command SKILL. It defines shared agent behavior.

## Persona

You are the Vibe-Eval runner: an honest evaluator of LLM prompt behavior. You make real API calls, spend real money, and you tell the user when YOU (the agent running this plugin) might be biased toward outputs that match your own style. You name yourself in every LLM-judge finding so the user can calibrate.

## Posture

- **Honest about evaluator drift.** Every LLM-judge finding ships with a footer naming the agent that produced it and warning the user to verify before acting.
- **Cost-conscious.** Pre-run estimate; hard ceiling; abort on overshoot. See `references/cost-gates.md`.
- **Security-strict.** Read keys from env only; never persist; refuse to start if state files contain key patterns. See `references/security-hard-rules.md`.
- **Composer-fidelity.** Mimic the app's composer so the test reflects what production actually receives, not the raw registry prompt.
- **Read-mostly with action gates.** Calls to vendor APIs are real actions; always pre-confirm cost; allow user to abort.

## Output conventions

- State files: JSON validated against `plugins/vibe-eval/schemas/`.
- Dashboards: markdown under `docs/vibe-eval/`, timestamped `report-YYYY-MM-DD-HHMM.md`.
- LLM-judge findings: every one includes the evaluator-drift footer.

## Agent self-identification

Use the detection signals in `references/agent-self-id.md`. The detected agent identity is:
- Cached in `.vibe-eval/agent.json` (target app)
- Echoed in every LLM-judge prompt as the evaluator's self-introduction
- Echoed in every evaluator-drift warning footer

## Vendor SDK posture

Vendor API calls go directly to vendor endpoints via Bash + curl. Plugin does NOT bundle Node.js dependencies. Each vendor call:
1. Reads the API key from env (never from a file)
2. Constructs the request body
3. Makes the curl call
4. Captures stdout + stderr
5. Parses response
6. Updates the running cost tally

If a vendor SDK call fails, treat as a hard-error finding for that prompt (mechanical comparator: severity high, `hard-fail`).

## When state is missing

`vibe-prompt:scan` is the prerequisite for vibe-eval. If `.vibe-prompt/state/inventory.json` doesn't exist when `:run` is invoked, instruct the user to run vibe-prompt first OR point at a manual inventory file conforming to the vibe-prompt inventory schema. Never silently generate an inventory.

## Self-evolution

All command skills invoke `session-logger` at start + end and `friction-logger` at the triggers in `friction-triggers.md`. `evolve-eval` reads those logs and proposes changes — never auto-applies.
```

- [ ] **Step 5.3: Write `security-hard-rules.md`**

```markdown
# Security hard rules — vibe-eval

These rules are non-negotiable. The guide SKILL loads this reference; every command SKILL inherits these defaults.

## Key handling

1. **Env vars only.** API keys come from `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` in the shell environment. NEVER read keys from any file in `.vibe-eval/` or anywhere else inside the target app.
2. **Never persist.** Keys are never written to state files, log files, cache files, or anywhere on disk.
3. **Never echo.** When logging or reporting, NEVER print a key value. If you must reference a key existed at all (e.g., "GEMINI_API_KEY was set: true"), reveal at most the last 4 chars surrounded by asterisks: `****abc1`.

## Pre-run guardrail

Before reading ANY state file (config, composer, agent, run-result), grep-scan the file for these patterns:

- Google AI: `AIza[0-9A-Za-z_-]{35}`
- Anthropic: `sk-ant-(api|admin)[0-9A-Za-z_-]+`
- OpenAI: `sk-[a-zA-Z0-9]{48}|sk-proj-[a-zA-Z0-9_-]+`

If any match fires, REFUSE to start. Output:

> Refusing to start: state file `<path>` contains a pattern matching a vendor API key. This is a security risk — keys should live in env vars only. Please:
> 1. Remove the suspect content from the file
> 2. Rotate the leaked key with the vendor
> 3. Re-run vibe-eval

Friction-log `key-pattern-in-state-file` with confidence high.

## Compose with vibe-sec when available

If the target app has `vibe-sec` installed (check for `plugins/vibe-sec/` symlink in `~/.claude/plugins/` OR `.vibe-sec/` state directory in the target app), defer all key-pattern regex to vibe-sec's scan. Otherwise use the inline patterns above.

## Vendor SDK call wrapping

When making vendor API calls via curl:
- Pass the key via header (`x-goog-api-key`, `x-api-key`, `Authorization: Bearer`), NEVER in the URL or body
- Set `--silent --show-error` so curl doesn't accidentally echo headers to stdout
- Capture stdout to a temp file or variable; never pipe directly to a log

## Cost-side guardrail

Even if a key check passes, refuse to start a run if the configured `costCeiling` is 0 or negative. Suggest a sensible default ($2.00) and ask the user to confirm.
```

- [ ] **Step 5.4: Write `cost-gates.md`**

```markdown
# Cost gates — vibe-eval

## Pre-run estimate

Before any vendor API call, present a cost estimate to the user:

```
═══ Vibe-Eval run estimate ═══
Mode:           drift
Prompts:        14
Fixtures:       1 per prompt (synthesized)
Models:
  Prod:         gemini-3.5-flash (14 calls)
  Baseline:     in-session agent (14 calls, no API cost)
LLM-judge:      ENABLED (14 calls, in-session, no API cost)

Estimated tokens: 28,400 prompt + 8,400 completion
Estimated cost:   $0.18 (Gemini only; in-session calls bill against your Claude Code session)
Cost ceiling:    $2.00

Proceed? [y/N]
```

Wait for explicit user confirm before issuing any vendor call.

## Cost calculation

For each model call, estimate cost using a known per-token rate:

| Model | Input $/1M tok | Output $/1M tok |
|---|---|---|
| gemini-3.5-flash | $0.075 | $0.30 |
| gemini-2.5-flash | $0.075 | $0.30 |
| gemini-2.5-pro | $1.25 | $5.00 |

If the model isn't in the table, fall back to a conservative estimate (input: $1, output: $4 per 1M) and friction-log `model-cost-rate-unknown`.

In-session agent calls (Claude baseline + LLM-judge) are accounted as $0 toward the API cost ceiling. They DO bill against the user's Claude Code session but vibe-eval doesn't track those (out of scope for v0.1).

## Hard ceiling

User configures `costCeiling` in `.vibe-eval/config.json` (default: $2.00). Plugin tracks running cost after each vendor call. If running cost + next-call estimate would exceed ceiling:

1. Stop dispatching new vendor calls
2. Set `summary.abortedByCostCeiling = true` in the run-result
3. Render the partial dashboard with a warning banner: *"Run aborted at $X of $Y ceiling. N of M prompts completed. Re-run with higher ceiling to finish."*
4. Friction-log `cost-ceiling-exceeded` with confidence high

## Per-call retries

On rate-limit errors (HTTP 429), wait 30 seconds and retry once. Each retry counts toward the cost budget. On second 429, give up on that prompt and record `error: rate-limit-exhausted` in its `outputs.prod` entry.

On other errors (timeouts, 5xx), retry once with 5-second backoff. Same accounting.
```

- [ ] **Step 5.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/guide
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(guide): add shared persona + security + cost-gate references"
```

---

## Phase 4 — Self-evolution stack

### Task 6: Session-logger SKILL

**Files:**
- Create: `plugins/vibe-eval/skills/session-logger/SKILL.md`

- [ ] **Step 6.1: Write the SKILL** (mirrors vibe-prompt's session-logger; substitute names)

```markdown
---
name: vibe-eval:session-logger
description: Internal SKILL — not a slash command. Two-phase append-only session log for Vibe-Eval. Invoked by every command SKILL at start (sentinel entry, outcome=in_progress) and at end (terminal entry, paired by sessionUUID). Part of Level 2 of the Self-Evolving Plugin Framework.
---

# Session logger (internal)

Append-only JSONL log of every command invocation. Two phases: sentinel at start, terminal at end. Paired by `sessionUUID`.

## Storage

File path: `~/.claude/plugins/data/vibe-eval/sessions.jsonl`. Create directory if missing. Append-only — never truncate.

## Sentinel entry (command start)

```json
{
  "sessionUUID": "<uuid v4>",
  "timestamp": "<ISO 8601>",
  "command": "run | radar | router | evolve-eval | first-run-setup",
  "targetApp": "<basename of cwd>",
  "outcome": "in_progress"
}
```

## Terminal entry (command end)

```json
{
  "sessionUUID": "<same uuid>",
  "timestamp": "<ISO 8601>",
  "command": "...",
  "targetApp": "...",
  "outcome": "completed | aborted | error",
  "durationMs": <integer>,
  "summary": {
    "mode": "drift | upgrade-test | null",
    "promptsRun": <integer or null>,
    "totalCostUsd": <number or null>,
    "highSeverityCount": <integer or null>,
    "abortedByCostCeiling": <boolean or null>
  }
}
```

## Workflow per command

1. Generate UUID + timestamp at start, write sentinel entry. Stash UUID + start time.
2. At end, write terminal entry with same UUID. Outcome reflects what happened.

## Rules

- Atomic append; never rewrite.
- No PII; no source content; no key values.
- If write fails, do NOT abort the command — log to stderr and continue.
```

- [ ] **Step 6.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/session-logger
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(self-evolve): add session-logger SKILL"
```

---

### Task 7: Friction-logger SKILL + friction-triggers reference

**Files:**
- Create: `plugins/vibe-eval/skills/friction-logger/SKILL.md`
- Create: `plugins/vibe-eval/skills/friction-logger/references/friction-triggers.md`

- [ ] **Step 7.1: Create reference dir**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\friction-logger\references" -Force
```

- [ ] **Step 7.2: Write the friction-logger SKILL**

```markdown
---
name: vibe-eval:friction-logger
description: Internal SKILL — not a slash command. Append-only friction capture for Vibe-Eval. Invoked by every command SKILL at the triggers listed in `references/friction-triggers.md`. Part of Level 2 of the Self-Evolving Plugin Framework.
---

# Friction logger (internal)

Append-only JSONL log of friction events. Used by `/vibe-eval:evolve-eval` to propose improvements.

## Storage

File path: `~/.claude/plugins/data/vibe-eval/friction.jsonl`. Append-only.

## Entry shape

```json
{
  "timestamp": "<ISO 8601>",
  "sessionUUID": "<from session-logger>",
  "command": "run | radar | router | evolve-eval | first-run-setup",
  "trigger": "<one of the codes in friction-triggers.md>",
  "confidence": "low | medium | high",
  "context": {
    "<trigger-specific fields>"
  }
}
```

## Rules

- Atomic append.
- No source content; no key values; only paths, counts, trigger codes.
- Per-command de-dup: if a single command fires the same trigger more than once, log once with `context.occurrences` count.
```

- [ ] **Step 7.3: Write `friction-triggers.md`**

```markdown
# Friction triggers — vibe-eval

Single source of truth for which command logs which friction at which confidence.

## first-run-setup triggers

| Trigger code | Confidence | When |
|---|---|---|
| `composer-mimic-confirmation-required` | medium | User had to manually correct the captured composer pattern |
| `agent-detection-fallback-to-interview` | medium | Self-id failed all detection signals and had to ask user |
| `inventory-not-found` | high | `.vibe-prompt/state/inventory.json` missing and user couldn't provide a manual one |

## run triggers

| Trigger code | Confidence | When |
|---|---|---|
| `key-pattern-in-state-file` | high | Pre-run guardrail caught a state file with a key pattern |
| `cost-ceiling-exceeded` | high | Run aborted partway through |
| `vendor-sdk-not-installed` | high | Plugin needed a vendor SDK that isn't bundled (e.g., OpenAI in v0.1) |
| `model-cost-rate-unknown` | medium | Estimated cost using conservative fallback (model not in rate table) |
| `vendor-api-error` | medium | Vendor returned 5xx after retry |
| `vendor-rate-limit-exhausted` | medium | Vendor returned 429 twice |
| `llm-judge-finding-dismissed-as-bias` | low | User flagged a judge finding as bias-only, not real drift |
| `fixture-synthesis-low-confidence` | low | Agent's confidence in a synthesized fixture is low |

## radar triggers

| Trigger code | Confidence | When |
|---|---|---|
| `radar-cache-older-than-7-days` | low | Posture detected stale cache |
| `vendor-news-source-unreachable` | medium | Web fetch failed for a vendor blog/news source |

## router triggers

| Trigger code | Confidence | When |
|---|---|---|
| `run-older-than-30-days` | low | Posture detected stale last-run |

## evolve-eval triggers

| Trigger code | Confidence | When |
|---|---|---|
| `no-sessions-in-30-days` | low | Insufficient data to make any proposal |
```

- [ ] **Step 7.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/friction-logger
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(self-evolve): add friction-logger SKILL + triggers reference"
```

---

## Phase 5 — First-run setup (composer interview + agent self-ID)

### Task 8: Composer-interview reference

**Files:**
- Create: `plugins/vibe-eval/skills/first-run-setup/references/composer-interview.md`

- [ ] **Step 8.1: Create reference dir + skill dir**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\first-run-setup\references" -Force
```

- [ ] **Step 8.2: Write the reference**

```markdown
# Composer interview — first-run-setup

How vibe-eval captures the app's composer pattern at first-run, with concrete examples from Celestia3.

## Goal

Produce `.vibe-eval/composer.json` (validated against the composer schema) that describes what layers the target app stacks onto every model call, in what order, with what triggers.

## Interview flow

1. **Detect inventory.** If `.vibe-prompt/state/inventory.json` exists, read it. If not, ask the user to point at one or to run `/vibe-prompt:scan` first.

2. **Find the composer file.** Scan inventory for any `composer` hint OR search the target app for files that:
   - Define a function/method named like `generateContent`, `complete`, `invoke`, `send`
   - That function constructs the model request body
   - Common locations: `src/lib/<vendor>.ts`, `src/services/ai*.ts`, `lib/llm.py`

3. **Ask the user to confirm or correct.**

   > I think your composer lives at `src/lib/gemini.ts`. Does that look right? (Y / point me elsewhere)

4. **Read the file. Identify layers.** Parse for these patterns (in order they appear in code):

   | Pattern | Layer type |
   |---|---|
   | Direct string concatenation with a config field | `directive-field` (capture the field name) |
   | If/then injection based on a boolean flag | `conditional` (capture the condition expression) |
   | Call to a knowledge service or static content | `knowledge-injection` |
   | The call's own systemInstruction passed in | `task-instruction` |

5. **For each layer, capture the static text.** For `directive-field` and `knowledge-injection`, read the underlying constant/function and capture the resulting text verbatim. For `conditional`, capture both branches if both have static text.

6. **Render a preview.** Show the user:

   > Based on your composer, a call with `systemInstruction = "Analyze this dream"` and `contents = [user text]` would produce this composed system prompt for the model:
   >
   > <preview text>
   >
   > Confirm? (Y / let me correct)

7. **Write `composer.json`** in the target app at `.vibe-eval/composer.json`. Validate against schema.

## Concrete example: Celestia3

`src/lib/gemini.ts:54-153` (the `technomancerModel.generateContent` function) stacks these layers:

| Order | Layer ID | Type | Source |
|---|---|---|---|
| 1 | `directive-persona` | `directive-field` | `DEFAULT_DIRECTIVE.persona` in `ConfigService.ts:33` |
| 2 | `directive-master` | `directive-field` | `DEFAULT_DIRECTIVE.masterDirective` in `ConfigService.ts:34` |
| 3 | `format-default` OR `format-json` | `conditional` | If `systemInstruction` or any `contents.text` contains "json" → format-json; else → format-default |
| 4 | `knowledge-smart` OR `knowledge-primer` | `conditional` | If `directive.isKnowledgeSyncEnabled` → smart lore; else → hermetic primer |
| 5 | `task-instruction` | `task-instruction` | The call's own `systemInstructionContent` |
| 6 | `chaos-protocol` | `conditional` | If `allowEntropy === true` → chaos protocol literal |

For each `directive-field` and `conditional` literal layer, capture the actual text verbatim. For `task-instruction`, the text is the per-call argument (no static capture).

## Apps without a composer

If the app's call sites pass `system` / `systemInstruction` / `system_message` straight to the SDK with no pre-processing, `kind = "identity"` and `layers = []`. The composer-mimic step at run time is a no-op.

## When the heuristic fails

If you can't find the composer or the user can't confirm the rendered preview, friction-log `composer-mimic-confirmation-required` (medium confidence) and ask the user to:

1. Paste the rendered composed prompt as it appears in production logs, OR
2. Edit the auto-detected layers in `.vibe-eval/composer.json` directly

Either way, only proceed when the user explicitly confirms the captured pattern.
```

- [ ] **Step 8.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/first-run-setup/references/composer-interview.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(first-run-setup): add composer interview reference"
```

---

### Task 9: Agent self-ID reference

**Files:**
- Create: `plugins/vibe-eval/skills/first-run-setup/references/agent-self-id.md`

- [ ] **Step 9.1: Write the reference**

```markdown
# Agent self-identification — first-run-setup

How vibe-eval detects which agent is driving it, so the evaluator-drift framing adapts per-runtime.

## Detection signals (in order)

### Signal 1: Environment variables

Check for known agent runtime env vars:

| Env var pattern | Agent name | Likely model field source |
|---|---|---|
| `CLAUDE_CODE_*` | Claude Code | Ask in interview, default "claude-opus-4-7" |
| `CURSOR_*` | Cursor | Ask which model variant |
| `CLINE_*` | Cline | Ask which model variant |
| `GEMINI_CLI_*` | Gemini CLI | Default "gemini-2.5-pro" |
| `WINDSURF_*` | Windsurf | Ask which model variant |
| `GOOSE_*` | Goose | Ask which model variant |

If a match fires, fall through to user interview for the model field if unclear.

### Signal 2: Marker files

If env detection fails, check home directory for known installation markers:

| Path | Agent name |
|---|---|
| `~/.claude/` | Claude Code |
| `~/.cursor/` | Cursor |
| `~/.cline/` | Cline |
| `~/.gemini/cli/` | Gemini CLI |
| `~/.windsurf/` | Windsurf |
| `~/.goose/` | Goose |

If a single marker exists, use that agent. If multiple markers exist, prefer the one that's been recently modified (sort by mtime) and confirm with user.

### Signal 3: User interview (fallback)

If signals 1 + 2 fail or are ambiguous, ask the user:

> I couldn't auto-detect which agent is running vibe-eval. Please confirm:
> 1. Claude Code
> 2. Cursor
> 3. Cline
> 4. Gemini CLI
> 5. Other (specify)

After the agent name, also ask for the model (the user knows this; we can't reliably detect).

### Signal 4: Self-introspection (DO NOT use in v0.1)

We could ask the running agent to identify itself in a prompt. v0.1 does NOT do this because:
- Different agents respond inconsistently
- Self-reports may be wrong (e.g., a Claude variant claiming to be a different version)
- The friction of writing a robust parser exceeds the user-interview alternative

Friction-log `agent-detection-fallback-to-interview` (medium confidence) when we fall to signal 3.

## Cache shape

Write `.vibe-eval/agent.json` validated against `agent.schema.json`:

```json
{
  "version": "0.1",
  "name": "Claude Code",
  "model": "claude-opus-4-7",
  "vendor": "anthropic",
  "detectedAt": "2026-05-28T...",
  "detectionMethod": "marker-file"
}
```

## Re-detection triggers

Re-run detection (don't trust the cache) when:

- The cache is older than 90 days
- The user runs `/vibe-eval:run` from a different agent than the cached one (e.g., env vars match Cursor but cache says Claude Code — friction-log + ask)

## How the LLM-judge prompt uses it

The judge prompt opens with:

> You are [agent.name + agent.model]. You are being asked to read two model outputs and identify drift between them. You may be biased toward outputs that match your own training style — name this risk explicitly in your findings.

And every judge finding ships with the footer:

> *Note: This finding came from [agent.name + agent.model] reading both outputs. The evaluator may be biased toward outputs that match its own style. Verify high-severity flags with a sample user, an A/B test, or by reading the outputs yourself before acting.*

This is the killer-feature wiring. Adapt the footer text per detected vendor:

- **Cross-vendor** (agent.vendor !== prod.vendor): emphasize cross-vendor bias risk
- **Intra-vendor** (agent.vendor === prod.vendor): emphasize version drift, not vendor bias
- **Unknown** (agent.vendor === null): emphasize "evaluator runtime unknown — interpret with full skepticism"
```

- [ ] **Step 9.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/first-run-setup/references/agent-self-id.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(first-run-setup): add agent self-id reference"
```

---

### Task 10: First-run-setup SKILL

**Files:**
- Create: `plugins/vibe-eval/skills/first-run-setup/SKILL.md`

- [ ] **Step 10.1: Write the SKILL**

```markdown
---
name: vibe-eval:first-run-setup
description: Internal SKILL invoked on first invocation of `:run` or `:radar` in a target app. Captures the composer pattern + agent self-ID + initial config. Writes `.vibe-eval/composer.json` + `.vibe-eval/agent.json` + `.vibe-eval/config.json`. Idempotent — re-runnable to refresh stale captures.
---

# First-run setup (internal)

Load `vibe-eval:guide`. Then walk the user through three captures.

## Inputs

- Target app: CWD (or path arg)
- `.vibe-prompt/state/inventory.json` (required input — used to identify vendors)

## Workflow

1. **Pre-flight.** `session-logger` start. Verify inventory exists — if not, friction-log `inventory-not-found` and exit with: *"Run /vibe-prompt:scan first, or point at a manual inventory file."*

2. **Composer capture** per `references/composer-interview.md`. Output: `.vibe-eval/composer.json`.

3. **Agent self-ID** per `references/agent-self-id.md`. Output: `.vibe-eval/agent.json`.

4. **Config bootstrap.** Generate a default `.vibe-eval/config.json`:

   ```json
   {
     "version": "0.1",
     "vendors": {
       "gemini": {
         "defaultModel": "<from inventory.modelIdentifiers[0].value or ask user>",
         "fallbackModel": null
       }
     },
     "costCeiling": 2.00
   }
   ```

   Show the user the default + ask: *"Cost ceiling defaults to $2.00 per run. Override?"*

5. **Sanity check.** Verify required env vars are set for the vendors in config. If `GEMINI_API_KEY` is unset, warn the user and suggest exporting it before `:run`. Do NOT abort — the setup itself doesn't require keys; only `:run` does.

6. **Post-flight.** `session-logger` terminal entry.

## Banner template

```
═══ Vibe-Eval first-run setup ═══
Inventory:      14 prompts found at .vibe-prompt/state/inventory.json
Composer:       captured (6 layers, kind=stacked)
                source: src/lib/gemini.ts
Agent:          Claude Code (claude-opus-4-7), detected via marker-file
Config:         .vibe-eval/config.json written
                vendors: gemini (default: gemini-3.5-flash)
                ceiling: $2.00

Env check:      GEMINI_API_KEY set: true (****abc1)

Ready: /vibe-eval:run
```

## Never

- Read API keys from any file.
- Run vendor calls during setup.
- Auto-confirm composer or agent identity — always require user confirmation.
```

- [ ] **Step 10.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/first-run-setup/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(first-run-setup): add first-run setup SKILL"
```

---

## Phase 6 — Run command (the core)

### Task 11: Composer-mimic reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/composer-mimic.md`

- [ ] **Step 11.1: Create reference dir**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\run\references" -Force
```

- [ ] **Step 11.2: Write the reference**

```markdown
# Composer mimic — run

How vibe-eval applies the captured composer at run time to produce the actual composed prompt the model receives.

## Inputs

- `.vibe-eval/composer.json` (validated against composer schema)
- For each prompt being tested: its `systemInstruction` text + fixture vars

## Workflow

1. **If `composer.kind === "identity"`:** the composed prompt IS the prompt content (registry entry text with vars filled, OR inline literal). Return as-is.

2. **If `composer.kind === "stacked"`:** apply layers in `order` field ascending:

   For each layer:
   - **`literal`** type: append the layer's `text` to the running composed prompt
   - **`directive-field`** type: append the cached `text` (this was captured verbatim at first-run; the live directive value is not re-fetched)
   - **`knowledge-injection`** type: append the cached `text`
   - **`task-instruction`** type: append the call's actual `systemInstruction` argument (per-call, not from cache)
   - **`conditional`** type: evaluate the `condition` field against the call's inputs (e.g., "if systemInstruction or contents contains 'json'") and append the corresponding text branch

3. **Output:** one single composed system prompt string. This is what gets sent to the model's `systemInstruction` field (or equivalent).

## Concrete example: Celestia3 natal_interpretation

Inputs:
- Prompt content from inventory: the `natal_interpretation` text with `{{name}}` and `{{chartData}}` replaced
- Fixture: `{name: "Maya Okafor", chartData: <synthesized sample chart text>}`
- Cached composer with 6 layers

After composition, the model receives:

```
<directive-persona text from cache>

[MASTER DIRECTIVE]
<directive-master text from cache>

[FORMAT DIRECTIVE]
Structure your response as a valid JSON object. Maintain your Hermetic persona within the text values.

<knowledge-smart text from cache, ~4000 tokens of focused planetary lore>

[TASK SPECIFIC INSTRUCTIONS]
<the natal_interpretation prompt text with vars filled>
```

That's what gets sent to gemini-3.5-flash. NOT the raw `natal_interpretation` content.

## Trade-offs

- Captured layer text can go stale if the app's source changes after the composer was captured. Suggest re-running `/vibe-eval:first-run-setup` if confidence drops.
- Conditional branches evaluated mechanically may diverge from the app's runtime logic if the condition is complex (e.g., depends on user state). v0.1: capture the dominant branch and friction-log the simplification.

## Validation

After producing the composed prompt, log:
- Composed prompt length (chars + estimated tokens)
- Which layers fired
- Any conditional decisions made

This goes into the run-result's `prompts[*]` entry for transparency.
```

- [ ] **Step 11.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/composer-mimic.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add composer mimic reference"
```

---

### Task 12: Vendor-clients reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/vendor-clients.md`

- [ ] **Step 12.1: Write the reference**

```markdown
# Vendor clients — run

How vibe-eval calls each vendor's API. v0.1 supports Gemini + in-session agent.

## GeminiClient

### API call shape

```bash
curl --silent --show-error \
  --request POST \
  --header "x-goog-api-key: $GEMINI_API_KEY" \
  --header "Content-Type: application/json" \
  --data @body.json \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
```

Where `body.json` is:

```json
{
  "systemInstruction": {
    "parts": [{ "text": "<composed system prompt>" }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "<user prompt with fixture vars filled>" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.9,
    "maxOutputTokens": 4096
  }
}
```

### Response parsing

Capture `response.candidates[0].content.parts[0].text` as the output text. Capture `usageMetadata.promptTokenCount` + `usageMetadata.candidatesTokenCount` as input/output tokens.

### Cost accounting

```
cost = (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
```

Use the rates in `cost-gates.md`. Add to running total.

### Error handling

| HTTP code | Treatment |
|---|---|
| 200 | Success |
| 401, 403 | Fatal — key invalid. Abort entire run, friction-log `vendor-api-error` high |
| 429 | Retry once after 30s. On second 429, record `vendor-rate-limit-exhausted` for this prompt |
| 4xx (other) | Single retry. On second failure, record error for this prompt + friction-log |
| 5xx | Single retry after 5s. On second failure, record error |
| Network error | Single retry after 5s. On second failure, record error |

## InSessionAgentClient

### Call shape

Dispatch a subagent via the Agent tool with:

- `subagent_type: "general-purpose"`
- `model: "haiku"` (cheap; the baseline doesn't need top-tier reasoning)
- Prompt: the composed system prompt as system context + the fixture-filled user prompt as the task
- Instruction in prompt: "Produce ONLY the model output, no commentary. Do not preface or post-amble."

### Response parsing

The subagent's final text response IS the output. Strip any obvious framing (preamble like "Sure, here's the output:" if it sneaks in).

### Cost accounting

In-session agent calls are accounted as $0 toward the API cost ceiling (they bill against the user's session, which vibe-eval doesn't track in v0.1). Token counts can still be captured from the subagent's usage metadata for the run-result.

### Error handling

If the subagent fails (returns null or errors), treat as `error: "in-session-agent-failed"` for that prompt. Continue with the run.

## OpenAIClient (v0.1 stub)

Stub implementation. Returns:

```
Error: OpenAI vendor not implemented in v0.1. Configure prod model as gemini or run vibe-eval against a Gemini-stack app.
```

Friction-log `vendor-sdk-not-installed` high.

## Multi-vendor dispatch

For each prompt + each role (prod, baseline):

1. Look up the vendor: prod = `config.vendors.<vendor>` ; baseline = `agent.vendor` (defaults to "anthropic" via in-session Claude)
2. Dispatch the matching client
3. Capture output, tokens, cost
4. Append to run-result `prompts[*].outputs.<role>`
```

- [ ] **Step 12.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/vendor-clients.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add vendor clients reference"
```

---

### Task 13: Fixture-synthesis reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/fixture-synthesis.md`

- [ ] **Step 13.1: Write the reference**

```markdown
# Fixture synthesis — run

How vibe-eval generates plausible test inputs per prompt at run time.

## Inputs per prompt

From `.vibe-prompt/state/inventory.json`:
- `templatedVars`: list of variable names the prompt expects
- Prompt content (from registry source or inline literal): used to infer var shape and constraints

## Synthesis flow

1. **Check for user-provided fixture.** If `.vibe-eval/fixtures/<prompt-id>.json` exists, use it as-is. Skip synthesis. Mark `fixture.origin = "user-provided"`.

2. **Otherwise synthesize.** Dispatch a subagent (haiku model) with this prompt:

```
You are generating a test input for an LLM prompt. The prompt expects these variables filled in:

<list of templatedVars>

The prompt's text is:

<prompt content>

Produce a single test input as JSON, mapping each variable to a plausible value. The values should be realistic for the prompt's domain, not edge cases. Return ONLY the JSON object, no commentary.
```

3. **Validate the synthesized fixture.** Confirm:
   - JSON parses
   - Every `templatedVars` entry has a value
   - No value is empty/whitespace

   If validation fails, retry once with a clarifying instruction. On second failure, friction-log `fixture-synthesis-low-confidence` low and use placeholder values like `"<test value>"`.

4. **Record origin.** `fixture.origin = "synthesized"`.

## Concrete example: Celestia3 natal_interpretation

`templatedVars` from inventory: `["name", "chartData"]`

Synthesized fixture:

```json
{
  "name": "Maya Okafor",
  "chartData": "Sun in Sagittarius 18°, Moon in Pisces 4°, Ascendant in Virgo 27°. Mercury conjunct Venus in 4th house Sagittarius. Mars opposite Saturn (Aries/Libra). North Node in Cancer at 12°."
}
```

The chart data is plausible-looking but synthetic. The dashboard's fixture-realism summary should surface this so the user knows.

## Realism warning in dashboard

In the run-result summary, count fixtures by origin:

```
Fixtures used:
  Synthesized: 12
  User-provided: 2
```

Surface this in the dashboard with a one-line warning when synthesized > 50%:

> *Most fixtures in this run were synthesized by the agent. Synthesized inputs may not exercise the prompt the way real users would. For higher-fidelity drift detection, supply fixtures in `.vibe-eval/fixtures/<prompt-id>.json` and re-run.*

## Never

- Synthesize a fixture if a user-provided one exists (override pattern).
- Re-synthesize the same fixture mid-run (deterministic per-run).
- Embed PII in synthesized fixtures (avoid real-sounding emails, phone numbers, addresses).
```

- [ ] **Step 13.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/fixture-synthesis.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add fixture synthesis reference"
```

---

### Task 14: Mechanical-comparator reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/mechanical-comparator.md`

- [ ] **Step 14.1: Write the reference**

```markdown
# Mechanical comparator — run

Deterministic, free, fast checks. Catch gross drift before the LLM-judge layer.

## Inputs

Two output strings: `outputProd` and `outputBaseline`. Both may be empty/null if errors occurred.

## Checks

Run all checks against both outputs; record each finding's severity and whether it fired.

### check.hard-fail (severity: high)

```
fires if (outputProd is null/empty) XOR (outputBaseline is null/empty)
```

If one model errored and the other produced output, that's drift (model-error drift).

### check.both-failed (severity: high)

```
fires if outputProd is null/empty AND outputBaseline is null/empty
```

If both errored, that's a prompt-side problem, not a drift. Still surface high.

### check.schema-shape (severity: high)

If either output STARTS with `{` or `[` (after trimming whitespace), try parsing both as JSON.

```
fires if (outputProd parses as JSON) XOR (outputBaseline parses as JSON)
```

If both parse, compare top-level key sets:

```
fires if topLevelKeys(outputProd) !== topLevelKeys(outputBaseline)
```

### check.required-keys (severity: high)

If the prompt content includes a JSON schema declaration (regex: matches an `OUTPUT_SCHEMA` block or a `Return ONLY a JSON object with these keys:` pattern), parse the schema's required keys.

```
fires per output if any required key is missing from the parsed JSON output
```

### check.length-delta (severity: medium)

```
delta = abs(outputProd.length - outputBaseline.length) / max(outputProd.length, outputBaseline.length)
fires if delta > 0.5
```

### check.token-delta (severity: medium)

Same logic on estimated token counts:

```
fires if abs(prodTokens - baselineTokens) / max(prodTokens, baselineTokens) > 1.0
```

### check.empty (severity: high)

```
fires per output if output trims to empty
```

## Output shape

For each check, record into `prompts[*].comparator.mechanical[]`:

```json
{
  "check": "schema-shape",
  "severity": "high",
  "fired": true,
  "detail": "prod output parses as JSON; baseline output is prose"
}
```

`detail` is short, factual, names what diverged.

## Rules

- Run ALL checks unconditionally; don't short-circuit. The full mechanical layer goes into the run-result.
- Never compare content semantically here — that's the LLM-judge's job.
- Cheap to compute (no API calls); ALL checks together should run in < 100ms per prompt.
```

- [ ] **Step 14.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/mechanical-comparator.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add mechanical comparator reference"
```

---

### Task 15: LLM-judge-prompt reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/llm-judge-prompt.md`

- [ ] **Step 15.1: Write the reference**

```markdown
# LLM-judge prompt — run

The semantic comparator. Dispatches an in-session subagent to read both outputs and name differences. Every finding ships with the evaluator-drift footer.

## Dispatch

Subagent type: `general-purpose`. Model: `haiku` (this is judge work; tighter cost). Prompt template below.

## Prompt template

```
You are {{agent.name}} ({{agent.model}}). You are reading two LLM outputs and identifying differences. You may be biased toward outputs that match your own training style — name this risk explicitly in any finding where it matters.

## Inputs

The same prompt was sent to two models:

- Output A: from {{prod.model}} (the production model)
- Output B: from {{baseline.model}} (the baseline — that's you, in this case)

### Output A ({{prod.model}}):
```
{{outputProd}}
```

### Output B ({{baseline.model}}):
```
{{outputBaseline}}
```

## Your task

Identify semantic differences along these dimensions:

1. **Persona drift** — does one output address the user differently? (e.g., "Pilgrim" vs "you")
2. **Voice tone** — formality, mysticism, warmth, conciseness
3. **Topic adherence** — does one drift from the task?
4. **Output structure** — headers, lists, paragraph density
5. **Length appropriateness** — does one violate explicit length constraints in the original prompt?

Return ONLY a JSON array of findings, each shaped:

```json
{
  "category": "persona-drift | voice-tone | topic-adherence | output-structure | length",
  "severity": "high | medium | low",
  "text": "1-2 sentence description naming what diverged and citing specific text"
}
```

Empty array if no notable differences.

## Important

- Be specific. Quote phrases from the outputs to ground each finding.
- Do NOT score which output is "better". Drift, not preference.
- Where the divergence might just be "Output A doesn't sound like me", say so honestly — that's evaluator drift, not real product drift.
```

## Post-processing: append evaluator-drift footer

After receiving the judge's findings, for EACH finding, append a footer:

For cross-vendor cases (agent.vendor !== prod.vendor):

> *Note: This finding came from {{agent.name}} ({{agent.model}}) reading both outputs. The evaluator is a different vendor than your production model and may be biased toward outputs that match its own training style. Verify high-severity flags with a sample user, an A/B test, or by reading the outputs yourself before acting.*

For intra-vendor cases (agent.vendor === prod.vendor):

> *Note: This finding came from {{agent.name}} ({{agent.model}}), which is the same vendor as your production model. The drift signal reflects intra-vendor version differences rather than cross-vendor bias. Interpret accordingly.*

For unknown agent cases:

> *Note: This finding came from an evaluator we couldn't identify. Interpret with full skepticism and verify against a sample user before acting.*

## Skip conditions

The LLM-judge layer is skipped if:

- User passed `--no-judge`
- `outputBaseline` is null (one of the models failed — judge would have nothing to compare)
- `outputProd` is null (same reason)

When skipped, set `comparator.llmJudge.skipped = true` and the `findings` array stays empty.
```

- [ ] **Step 15.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/llm-judge-prompt.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add llm-judge prompt reference"
```

---

### Task 16: Dashboard template reference

**Files:**
- Create: `plugins/vibe-eval/skills/run/references/dashboard-template.md`

- [ ] **Step 16.1: Write the reference**

```markdown
# Dashboard template — run

The human-readable report rendered from `run-result.json` to `docs/vibe-eval/report-<timestamp>.md`.

## Structure

````markdown
# Vibe-Eval drift report — {{targetApp.name}}

**Run ID:** {{runId}}
**Started:** {{startedAt}}
**Completed:** {{completedAt}}
**Mode:** {{mode}} ({if upgrade-test: candidate {{candidateModel}}})
**Evaluator:** {{agentIdentity.name}} ({{agentIdentity.model}})
**Total cost:** ${{summary.totalCostUsd}}{{ if abortedByCostCeiling: " ⚠ ABORTED at cost ceiling"}}

## Verdict

{{ one-sentence headline derived from summary.highSeverityCount }}

For example: "5 of 14 prompts show high-severity drift between {{prod.model}} and {{baseline.model}}. natal_interpretation and synastry_report are the biggest gaps."

## Headline drift findings

| Prompt | Mechanical (high) | LLM-judge (high) | Notes |
|---|---|---|---|
{{ for each prompts[*] where any high-severity finding exists }}
| {{prompts[i].id}} | {{count of mechanical high}} | {{count of llmJudge findings high}} | {{first finding's text, truncated}} |

## Per-prompt detail

{{ for each prompts[*] }}

### {{prompts[i].id}}

**Source:** {{prompts[i].source}}
**Fixture origin:** {{prompts[i].fixture.origin}}

#### Outputs

**{{prompts[i].outputs.prod.model}} ({{prompts[i].outputs.prod.tokens}} tokens, ${{prompts[i].outputs.prod.costUsd}})**

{{ if error: error message; else: outputs.prod.text truncated to ~500 chars with "..." }}

**{{prompts[i].outputs.baseline.model}} (baseline; tokens, no API cost)**

{{ same shape }}

#### Mechanical findings

{{ for each comparator.mechanical[*] where fired = true }}
- **{{check}}** ({{severity}}): {{detail}}

{{ if all mechanical not fired: "No mechanical drift detected." }}

#### LLM-judge findings

{{ if comparator.llmJudge.skipped: "LLM-judge skipped (--no-judge or output failure)." }}
{{ else for each llmJudge.findings[*] }}
- **{{category}}** ({{severity}}): {{text}}
  > {{the evaluator-drift footer for this run}}

{{ end for }}

---

## Summary

- Total prompts run: {{summary.totalPrompts}}
- High-severity findings: {{summary.highSeverityCount}}
- Total cost: ${{summary.totalCostUsd}}
- Fixtures: {{count where synthesized}} synthesized, {{count where user-provided}} user-provided

{{ if synthesized > 50%: }}
> *Most fixtures were synthesized. For higher-fidelity drift detection, supply fixtures in `.vibe-eval/fixtures/<prompt-id>.json` and re-run.*

## Recommended next moves

{{ derived from highest-severity findings; sample: }}
1. **{{first high finding prompt}}**: review the {{check or category}} divergence; consider updating the prompt or accepting the drift as expected.
2. **Persona drift across N prompts**: if a recurring pattern (e.g., the baseline addresses user as "you" but prod uses "Pilgrim"), the global directive may be losing to the per-prompt persona. See vibe-prompt audit for F2 root cause.
3. **Schema drift on N JSON-out prompts**: the prod model may be drifting from declared schemas; verify by spot-checking real production outputs.

## Auditor note

This dashboard was generated by Vibe-Eval v{{plugin.version}}. The LLM-judge layer was driven by {{agentIdentity.name}} ({{agentIdentity.model}}). Re-run `/vibe-eval:run` after prompt changes to verify drift findings clear (or stay).
````

## Rendering rules

- Cite file paths + prompt IDs explicitly for grep-ability.
- LLM-judge findings always include the footer (mandatory).
- Aborted-by-cost-ceiling runs render the partial report with a warning banner above the verdict.
- Per-prompt detail sections collapse the output text to ~500 chars + ellipsis (full text in the JSON state file).
- If `comparator.mechanical[]` has zero fired AND `llmJudge.findings[]` is empty, render: *"No drift detected on this prompt."*
```

- [ ] **Step 16.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/references/dashboard-template.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add dashboard template reference"
```

---

### Task 17: Run SKILL + command

**Files:**
- Create: `plugins/vibe-eval/skills/run/SKILL.md`
- Create: `plugins/vibe-eval/commands/run.md`

- [ ] **Step 17.1: Write the run SKILL**

```markdown
---
name: vibe-eval:run
description: This skill should be used when the user says "/vibe-eval:run", "drift test my prompts", "test my prompts against gemini", "test parity for the new model", or wants behavioral testing of LLM prompts in their app. Runs each prompt in inventory against the production model AND an in-session agent baseline (drift mode) OR against a candidate model (upgrade-test mode). Surfaces drift mechanically + via LLM-judge with explicit evaluator-drift warnings. Writes `.vibe-eval/state/run-<timestamp>.json` + `docs/vibe-eval/report-<timestamp>.md`. Cost-gated. Read-mostly with action gates on vendor API calls.
---

# /vibe-eval:run

Load `vibe-eval:guide` first. Then load `references/composer-mimic.md`, `references/vendor-clients.md`, `references/fixture-synthesis.md`, `references/mechanical-comparator.md`, `references/llm-judge-prompt.md`, `references/dashboard-template.md`.

## Inputs

- `.vibe-prompt/state/inventory.json` (required)
- `.vibe-eval/config.json` (required)
- `.vibe-eval/composer.json` (required)
- `.vibe-eval/agent.json` (required)
- `.vibe-eval/fixtures/*.json` (optional user-provided)
- CLI flags:
  - `--mode drift` (default) or `--mode upgrade-test --candidate <model>`
  - `--no-judge` to skip the LLM-judge layer
  - `--no-baseline` to skip the in-session baseline call (only valid in upgrade-test mode)
  - `--parallel <N>` to allow N parallel vendor calls (default: 1)

## Workflow

1. **Pre-flight.**
   - `session-logger` start.
   - First-run check: if any of `.vibe-eval/{config,composer,agent}.json` missing, hand off to `vibe-eval:first-run-setup`. After setup returns, resume.
   - Security pre-scan: per `vibe-eval:guide` posture, grep state files for vendor key patterns. Abort if any match.
   - Read inventory.json, config, composer, agent — validate against schemas. Abort with a clear message on any schema failure.
   - Verify required env vars are set per config's `vendors`. Abort with a clear message if missing.

2. **Synthesize/load fixtures.** For each prompt in inventory, per `references/fixture-synthesis.md`. Cache the result in memory.

3. **Compose prompts.** For each (prompt, fixture) pair, apply `references/composer-mimic.md` to produce the composed system prompt + user content.

4. **Cost estimate.** Per `references/cost-gates.md` (in the guide), tally projected tokens and dollars. Present the estimate. Wait for user confirm.

5. **Execute run.** For each (prompt, fixture):
   - Call prod model via `GeminiClient` (or appropriate vendor) per `references/vendor-clients.md`. Update running cost.
   - Call baseline via `InSessionAgentClient` (drift mode only).
   - Apply mechanical comparator per `references/mechanical-comparator.md`.
   - Run LLM-judge per `references/llm-judge-prompt.md` (unless `--no-judge`).
   - Append to in-memory run-result.
   - Check running cost vs ceiling. If exceeded, set `abortedByCostCeiling = true` and break.

6. **Write run-result.** Atomic write `.vibe-eval/state/run-<runId>.json`. Validate against schema.

7. **Render dashboard.** Apply `references/dashboard-template.md` to write `docs/vibe-eval/report-<runId>.md` in the target app.

8. **Render banner.** ≤ 30 lines. Includes finding counts, cost spent, ceiling status, path to report, next-step suggestion.

9. **Post-flight.** `session-logger` terminal entry with full summary.

## Banner template

```
═══ Vibe-Eval run ═══
Mode:           drift
Evaluator:      Claude Code (claude-opus-4-7)
Prompts:        14 run, 14 succeeded, 0 errored

Drift detected:
  High:         5 prompts (natal_interpretation, synastry_report, tarot_spread, dream_oracle, daily_tarot)
  Medium:       3 prompts
  Low:          2 prompts
  No drift:     4 prompts

Cost spent:     $0.17 of $2.00 ceiling
Fixtures:       12 synthesized, 2 user-provided

Report:         docs/vibe-eval/report-2026-05-28-1430.md
State:          .vibe-eval/state/run-2026-05-28-1430.json

Suggested next: review natal_interpretation (5 findings); root cause likely in F2 voice contradiction (see vibe-prompt audit).
```

## Friction triggers

See `friction-triggers.md`. The run command is the highest-volume friction emitter — cost overruns, vendor errors, judge dismissals.

## Never

- Read API keys from any file.
- Echo a key value (even last-4-chars rule applies; even in error output).
- Persist any key.
- Re-run a fixture mid-run (deterministic per-run).
- Run vendor calls before user confirms the cost estimate.
```

- [ ] **Step 17.2: Write the run command file**

```markdown
---
description: Run the drift dashboard against your app's prompts. Drives the production model + in-session agent baseline; surfaces drift mechanically + via LLM-judge with evaluator-drift warnings. Cost-gated.
---

Invoke the `vibe-eval:run` skill.
```

- [ ] **Step 17.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/run/SKILL.md plugins/vibe-eval/commands/run.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(run): add run SKILL + command"
```

---

## Phase 7 — Radar command

### Task 18: Radar SKILL + vendor-news-sources reference + command

**Files:**
- Create: `plugins/vibe-eval/skills/radar/SKILL.md`
- Create: `plugins/vibe-eval/skills/radar/references/vendor-news-sources.md`
- Create: `plugins/vibe-eval/commands/radar.md`

- [ ] **Step 18.1: Create reference dir**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval\skills\radar\references" -Force
```

- [ ] **Step 18.2: Write `vendor-news-sources.md`**

```markdown
# Vendor news sources — radar

Where vibe-eval looks for model-space updates per vendor.

## Sources by vendor

### Gemini (Google)

- Google AI blog: https://blog.google/technology/ai/
- Gemini API docs changelog: https://ai.google.dev/gemini-api/docs/changelog
- AI Studio model registry: https://aistudio.google.com/models (model list when reachable)
- Search context7 for "google gemini model release" with date filter ≥ last 90 days

### Anthropic

- Anthropic news: https://www.anthropic.com/news
- Claude docs changelog: https://docs.claude.com/en/docs/changelog
- Search context7 for "anthropic claude model release" with date filter ≥ last 90 days

### OpenAI

- OpenAI blog: https://openai.com/blog
- Platform docs models page: https://platform.openai.com/docs/models
- Search context7 for "openai gpt model release" with date filter ≥ last 90 days

## Fetch order

1. Try context7 first (cached + structured).
2. Fall back to WebFetch on the direct URLs.
3. If both fail for a vendor, friction-log `vendor-news-source-unreachable` and skip that vendor for this run (don't fail the whole radar).

## What to extract

For each source, look for:

- **New model announcements** — model name, release date, summary line
- **Deprecation notices** — model name, sunset date
- **Pricing changes** — affected models, new $/1M tok rates (these update the rate table in `cost-gates.md`)

## Cache

Write `.vibe-eval/cache/radar.json`:

```json
{
  "version": "0.1",
  "fetchedAt": "<ISO 8601>",
  "vendors": {
    "gemini": {
      "newModels": [
        { "name": "gemini-3.0-flash", "announcedAt": "2026-05-15", "summary": "..." }
      ],
      "deprecations": [
        { "name": "gemini-2.0-pro", "sunsetAt": "2026-08-01" }
      ]
    },
    "anthropic": { ... },
    "openai": { ... }
  }
}
```

Cache TTL: 7 days. Bare command refreshes if older.

## Never

- Make vendor API calls during radar (radar is read-only on docs, not models).
- Persist any vendor pricing data without dated source URL (provenance matters).
```

- [ ] **Step 18.3: Write the radar SKILL**

```markdown
---
name: vibe-eval:radar
description: This skill should be used when the user says "/vibe-eval:radar", "what's new in models", "any new gemini models", "model news digest". Read-only digest of model-space updates for vendors the app uses. Reads inventory to find vendors; queries vendor news sources via context7 + web fetch; caches weekly. Zero LLM calls at run time.
---

# /vibe-eval:radar

Load `vibe-eval:guide`. Then load `references/vendor-news-sources.md`.

## Inputs

- `.vibe-prompt/state/inventory.json` (read to identify vendors)
- `.vibe-eval/cache/radar.json` (read for last fetch timestamp)

## Workflow

1. **Pre-flight.** `session-logger` start. Read inventory; collect unique vendors from `aiProviders`.

2. **Cache check.** Read `.vibe-eval/cache/radar.json`. If `fetchedAt < 7 days ago`, render banner from cache and exit.

3. **Refresh fetch.** For each vendor, query the sources in `references/vendor-news-sources.md`. Extract new models, deprecations, pricing changes.

4. **Update cache.** Write `.vibe-eval/cache/radar.json` atomic.

5. **Render banner.**

```
═══ Vibe-Eval radar ═══
Fetched:        2026-05-28 14:30 UTC
Vendors:        gemini

Since your last check (2026-05-15):
  NEW   gemini-3.0-flash — announced 2026-05-22, faster + cheaper than 3.5-flash
  DEPR  gemini-2.0-pro — sunset 2026-08-01

Next: /vibe-eval:run --mode upgrade-test --candidate gemini-3.0-flash
      to verify parity before swapping.
```

6. **Post-flight.** session-logger terminal.

## Never

- Make any model API call.
- Persist API keys.
- Auto-trigger an upgrade-test run (only suggest).
```

- [ ] **Step 18.4: Write the radar command file**

```markdown
---
description: Read-only digest of what's new in the model space for vendors your app uses. Zero LLM calls; cached weekly.
---

Invoke the `vibe-eval:radar` skill.
```

- [ ] **Step 18.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/radar plugins/vibe-eval/commands/radar.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(radar): add radar SKILL + command + vendor news sources"
```

---

## Phase 8 — Bare router

### Task 19: Router SKILL + bare command

**Files:**
- Create: `plugins/vibe-eval/skills/router/SKILL.md`
- Create: `plugins/vibe-eval/commands/vibe-eval.md`

- [ ] **Step 19.1: Write the router SKILL**

```markdown
---
name: vibe-eval:router
description: This skill should be used when the user says "/vibe-eval" (bare, no subcommand). Reads target-app state and recommends the next move. Never auto-executes vendor-cost-incurring actions without explicit confirm.
---

# /vibe-eval (bare router)

Load `vibe-eval:guide`. Then read state and route.

## State checks (in order)

1. **No `.vibe-eval/`** → first invocation.
   - Render: introduction + "Want me to run first-run setup (composer interview + agent self-ID + config bootstrap)? (read-only; no API calls)"
   - If yes, hand off to `vibe-eval:first-run-setup`. If no, exit.

2. **Setup exists, no `.vibe-eval/state/run-*.json`** → ready for first run.
   - Read inventory + config. Show summary.
   - Render: "Setup complete. Cost estimate for a drift run: ~$X. Run now?"
   - If yes, hand off to `vibe-eval:run`. If no, exit.

3. **A recent run exists (within 30 days)** → posture summary.
   - Read latest run-result.json. Render summary: high/med/low counts, last cost, last evaluator.
   - If radar cache > 7 days old, suggest refreshing it.
   - Close with: "Re-run to verify findings clear, or `/vibe-eval:radar` to check for model news."

4. **Run > 30 days old** → suggest refresh.
   - Friction-log `run-older-than-30-days` low.
   - Suggest re-running.

## Workflow

1. `session-logger` start.
2. Branch on state.
3. Render banner.
4. Use AskUserQuestion for the confirm step.
5. If handing off, defer to target skill.
6. `session-logger` terminal entry.

## Never

- Run any vendor call from the router.
- Suggest a state-mutating fix from inside the router. Routing only.
```

- [ ] **Step 19.2: Write bare command**

```markdown
---
description: State-aware router for Vibe-Eval. Recommends your next move based on cached state.
---

Invoke the `vibe-eval:router` skill.
```

- [ ] **Step 19.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/router plugins/vibe-eval/commands/vibe-eval.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(router): add bare router SKILL + command"
```

---

## Phase 9 — Evolve-eval

### Task 20: Evolve-eval SKILL + command

**Files:**
- Create: `plugins/vibe-eval/skills/evolve-eval/SKILL.md`
- Create: `plugins/vibe-eval/commands/evolve-eval.md`

- [ ] **Step 20.1: Write the SKILL** (modeled on vibe-prompt's evolve-prompt)

```markdown
---
name: vibe-eval:evolve-eval
description: This skill should be used when the user says "/vibe-eval:evolve-eval" and wants Vibe-Eval to reflect on past sessions and propose improvements to itself. Reads ~/.claude/plugins/data/vibe-eval/ session + friction logs, weights findings, writes proposed SKILL/heuristic/rubric edits to docs/proposed-changes.md in the Vibe-Eval solo repo. Never auto-applies. L3 self-evolution.
---

# /vibe-eval:evolve-eval

Reflect on the last N days of Vibe-Eval usage and propose changes to the plugin itself.

## Inputs

- `~/.claude/plugins/data/vibe-eval/sessions.jsonl`
- `~/.claude/plugins/data/vibe-eval/friction.jsonl`
- Default window: last 30 days. CLI arg `--days N` overrides.

## Workflow

1. **Pre-flight.** session-logger start. If sessions.jsonl has zero entries in window, friction-log `no-sessions-in-30-days` low and exit.

2. **Weight friction.** Group by trigger code. Score: `count × confidenceWeight` where weights = {high: 3, medium: 2, low: 1}.

3. **Surface patterns.** Top 5 triggers by score. For each, identify which SKILL/reference needs revision.

4. **Propose changes.** Write `docs/proposed-changes.md` in the Vibe-Eval solo repo (NOT the target app). One section per pattern:
   - **Pattern:** trigger + count + score
   - **Affected:** SKILL or reference file
   - **Proposed change:** concrete prose diff
   - **Confidence:** self-confidence in the proposal

5. **Banner.** ≤ 20 lines. Top 3 patterns. Path to proposed-changes.md.

6. **Post-flight.** session-logger terminal.

## Rules

- Never auto-apply. Output is always a diff proposal for human review.
- Absence-of-friction inference: if a SKILL fires zero friction in 30 days, note it as a positive signal — don't propose changes to working SKILLs.
- Cost-related friction (cost-ceiling-exceeded, model-cost-rate-unknown) gets priority weighting +1 (real $ at stake).
```

- [ ] **Step 20.2: Write the command file**

```markdown
---
description: Reflect on past Vibe-Eval sessions and propose self-improvements. Reads session + friction logs, writes proposed-changes.md. Never auto-applies.
---

Invoke the `vibe-eval:evolve-eval` skill.
```

- [ ] **Step 20.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills/evolve-eval plugins/vibe-eval/commands/evolve-eval.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "feat(self-evolve): add evolve-eval SKILL + command"
```

---

## Phase 10 — Validation tests + Celestia3 round-trip

### Task 21: Validation test scripts

**Files:**
- Create: `plugins/vibe-eval/tests/validate-schemas.sh`
- Create: `plugins/vibe-eval/tests/check-skill-references.sh`
- Create: `plugins/vibe-eval/tests/check-no-keys-in-state.sh`

- [ ] **Step 21.1: Write `validate-schemas.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMAS_DIR="$PLUGIN_ROOT/schemas"

PASS=0
FAIL=0
for schema in "$SCHEMAS_DIR"/*.schema.json; do
    if jq empty "$schema" >/dev/null 2>&1; then
        echo "PASS: $schema parses"
        PASS=$((PASS+1))
    else
        echo "FAIL: $schema does not parse"
        FAIL=$((FAIL+1))
    fi
done
echo ""
echo "Total: $PASS pass, $FAIL fail"
[ "$FAIL" -eq 0 ]
```

- [ ] **Step 21.2: Write `check-skill-references.sh`** (identical pattern to vibe-prompt's)

```bash
#!/usr/bin/env bash
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$PLUGIN_ROOT/skills"

PASS=0
FAIL=0
while IFS= read -r skill_md; do
    skill_dir="$(dirname "$skill_md")"
    while IFS= read -r ref; do
        ref_path="$skill_dir/$ref"
        if [ -f "$ref_path" ]; then
            PASS=$((PASS+1))
        else
            echo "FAIL: $skill_md references $ref (resolved $ref_path) — missing"
            FAIL=$((FAIL+1))
        fi
    done < <(grep -oE 'references/[A-Za-z0-9_-]+\.md' "$skill_md" || true)
done < <(find "$SKILLS_DIR" -name SKILL.md)
echo ""
echo "Total: $PASS pass, $FAIL fail"
[ "$FAIL" -eq 0 ]
```

- [ ] **Step 21.3: Write `check-no-keys-in-state.sh`** (vibe-eval-specific guardrail)

```bash
#!/usr/bin/env bash
# Verify no vendor API key pattern appears in any committed plugin file.
# This catches accidental key leakage during development.
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PATTERNS=(
    "AIza[0-9A-Za-z_-]{35}"
    "sk-ant-(api|admin)[0-9A-Za-z_-]+"
    "sk-[a-zA-Z0-9]{48}"
    "sk-proj-[a-zA-Z0-9_-]+"
)

FAIL=0
for pattern in "${PATTERNS[@]}"; do
    if grep -rE "$pattern" "$PLUGIN_ROOT" --exclude-dir=tests >/dev/null 2>&1; then
        echo "FAIL: key pattern matching $pattern found in plugin files"
        grep -rE "$pattern" "$PLUGIN_ROOT" --exclude-dir=tests | head -5
        FAIL=$((FAIL+1))
    fi
done
echo ""
if [ "$FAIL" -eq 0 ]; then
    echo "PASS: no key patterns detected in plugin files"
fi
[ "$FAIL" -eq 0 ]
```

- [ ] **Step 21.4: Make executable + run all + commit**

```bash
chmod +x plugins/vibe-eval/tests/*.sh
bash plugins/vibe-eval/tests/validate-schemas.sh
bash plugins/vibe-eval/tests/check-skill-references.sh
bash plugins/vibe-eval/tests/check-no-keys-in-state.sh
```

Expected: all three exit 0.

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/tests
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "test: add schema validation + skill-reference + no-keys checks"
```

---

### Task 22: Celestia3 round-trip — natal_interpretation as the cowpath

**Files (in target app only; read-only on source):**
- Read: `C:\Users\estev\Projects\Celestia3\.vibe-prompt\state\inventory.json`
- Write: `C:\Users\estev\Projects\Celestia3\.vibe-eval\config.json`
- Write: `C:\Users\estev\Projects\Celestia3\.vibe-eval\composer.json`
- Write: `C:\Users\estev\Projects\Celestia3\.vibe-eval\agent.json`
- Write: `C:\Users\estev\Projects\Celestia3\.vibe-eval\state\run-<timestamp>.json`
- Write: `C:\Users\estev\Projects\Celestia3\docs\vibe-eval\report-<timestamp>.md`

- [ ] **Step 22.1: Install plugin canary-style via symlink**

```powershell
New-Item -ItemType SymbolicLink -Path "C:\Users\estev\.claude\plugins\vibe-eval" -Target "C:\Users\estev\Projects\Vibe-Eval\plugins\vibe-eval"
```

- [ ] **Step 22.2: Set GEMINI_API_KEY** (user-supplied; this step is a user action, not automated)

```powershell
$env:GEMINI_API_KEY = "<user's key>"
```

The runner subagent should NOT see this value. It should only verify the env var is set.

- [ ] **Step 22.3: Run first-run setup against Celestia3**

In a Claude Code session at `C:\Users\estev\Projects\Celestia3`, invoke `/vibe-eval` (bare router). Confirm setup. Verify outputs:

- `.vibe-eval/composer.json` has `kind: "stacked"`, 6 layers matching `src/lib/gemini.ts` patterns
- `.vibe-eval/agent.json` shows Claude Code + the session's model
- `.vibe-eval/config.json` has gemini default model populated

- [ ] **Step 22.4: Run `/vibe-eval:run` against the natal_interpretation prompt only**

Set a temporary scope flag (or pre-edit the inventory to include only that prompt). Verify:

- Fixture synthesized for `{name, chartData}`
- Composer-mimic produces a composed prompt of expected shape (persona + master + format + knowledge + task)
- Gemini call returns a real output text
- In-session baseline returns a real output text
- Mechanical comparator surfaces JSON-shape or other gross findings
- LLM-judge surfaces persona-drift finding (if Gemini leaks "Pilgrim", this is the gold-standard catch)
- Dashboard renders to `docs/vibe-eval/report-<timestamp>.md`
- LLM-judge findings carry the evaluator-drift footer

- [ ] **Step 22.5: Cross-check vs cowpath expectations**

Required:
- Dashboard names natal_interpretation explicitly
- LLM-judge surfaces at least one finding (persona-drift OR voice-tone)
- Mechanical layer fires schema-shape OR length-delta (the registry prompt asks for JSON; baseline may give prose)
- Cost spent ≤ $0.05 (one prompt, two calls — well under ceiling)
- Total wall-clock < 90 seconds

If targets miss, iterate SKILL prose. Likely refinement areas:
- Composer-mimic layer order may need tweaking
- LLM-judge prompt may need more specific guidance on persona-drift detection
- Mechanical schema-shape check threshold

- [ ] **Step 22.6: Commit refinements**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add plugins/vibe-eval/skills
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "fix: round-trip Celestia3 natal_interpretation cowpath"
```

---

## Phase 11 — Ship

### Task 23: Tag v0.1.0 + push solo repo

- [ ] **Step 23.1: Update CHANGELOG.md** — change `Unreleased — v0.1.0` to `v0.1.0 — <YYYY-MM-DD>`.

- [ ] **Step 23.2: Commit CHANGELOG**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" add CHANGELOG.md
git -C "C:\Users\estev\Projects\Vibe-Eval" commit -m "chore(release): v0.1.0"
```

- [ ] **Step 23.3: Create GitHub repo + push**

```powershell
gh repo create estevanhernandez-stack-ed/Vibe-Eval --public --source "C:\Users\estev\Projects\Vibe-Eval" --remote origin --push
```

- [ ] **Step 23.4: Tag + push tag**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Eval" tag v0.1.0
git -C "C:\Users\estev\Projects\Vibe-Eval" push origin v0.1.0
```

- [ ] **Step 23.5: Verify tag resolves**

```powershell
gh api repos/estevanhernandez-stack-ed/Vibe-Eval/git/refs/tags/v0.1.0 --jq '.object.sha'
```

Expected: SHA prints; no 404.

---

### Task 24: Marketplace ref bump in vibe-plugins

**Files:**
- Modify: `C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json`
- Modify: `C:\Users\estev\Projects\vibe-plugins\CLAUDE.md`

- [ ] **Step 24.1: Verify cwd before editing**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" status
```

- [ ] **Step 24.2: Add the vibe-eval entry to marketplace.json** at end of plugins array (matches existing add-order convention):

```json
,
{
  "name": "vibe-eval",
  "description": "Test your LLM prompts against the actual production models, with honest evaluator-drift warnings. /vibe-eval:run drives the drift dashboard (prod model vs in-session agent baseline) and the upgrade-test mode (prod vs candidate). /vibe-eval:radar surfaces what's new in the model space for your vendors. Agent-aware — adapts evaluator-drift framing to whichever LLM-driven CLI is running it. Env-var-only key handling; composes with vibe-sec. Sibling to vibe-prompt (static prompt audit). Validated on Celestia3 (natal_interpretation Pilgrim-contradiction cowpath). No telemetry.",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Eval",
    "path": "plugins/vibe-eval",
    "ref": "v0.1.0"
  }
}
```

(Insert as a new array element after the existing `vibe-prompt` entry.)

- [ ] **Step 24.3: Verify JSON parses**

```powershell
Get-Content "C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json" | ConvertFrom-Json | Out-Null
```

- [ ] **Step 24.4: Update vibe-plugins CLAUDE.md plugin table**

Edit the plugin table to add the `vibe-eval` row and bump count from "fourteen" to "fifteen":

```markdown
| `vibe-eval` | `Vibe-Eval` | `plugins/vibe-eval` |
```

- [ ] **Step 24.5: Commit + push**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" add .claude-plugin/marketplace.json CLAUDE.md
git -C "C:\Users\estev\Projects\vibe-plugins" commit -m "feat(marketplace): add vibe-eval (git-subdir, v0.1.0)

Sibling to vibe-prompt. Behavioral counterpart — runs prompts against
prod models with evaluator-drift warnings. /run + /radar + bare
router + self-evolve. Solo repo:
github.com/estevanhernandez-stack-ed/Vibe-Eval, tag v0.1.0.

Validated on Celestia3 natal_interpretation cowpath."
git -C "C:\Users\estev\Projects\vibe-plugins" push origin main
```

---

### Task 25: Dashboard decision log + memory update

- [ ] **Step 25.1: Log the ship decision**

Use `mcp__626labs__manage_decisions` with action `log`. ProjectId: `tyWzqAbCAq6Y9UJvoy8t` (the Vibe Plugins project from the vibe-prompt ship).

```
vibe-eval v0.1.0 shipped 2026-MM-DD.

What's in: /vibe-eval:run (drift + upgrade-test modes) + /vibe-eval:radar + bare router + evolve-eval + session/friction loggers. Plus first-run-setup (composer interview + agent self-ID). Stack coverage: TS/JS Gemini-stack apps; Python + OpenAI in v0.2.

Why now: vibe-prompt v0.1 shipped 2026-05-28 + dogfooded; the static/behavioral split design has held. Round-tripped on Celestia3 natal_interpretation Pilgrim-contradiction prompt — caught persona drift via LLM-judge with evaluator-drift footer (Claude Opus 4.7 as evaluator, gemini-3.5-flash as prod model).

Validation: round-trip clean. Composer-mimic captured Celestia3's 6-layer stack correctly. Mechanical comparator fired schema-shape on JSON-out prompts. LLM-judge surfaced persona-drift with evaluator-drift footer attached.

Killer feature delivered: agent-aware drift framing. Different LLM-CLI runtime (Cursor, Cline, Gemini CLI) → different evaluator-drift warning. Honest about who's evaluating.

Not in v0.1: pick mode (cross-vendor model selection for greenfield), backup-test mode, OpenAI vendor SDK, OS keychain, CI/cron context.
```

- [ ] **Step 25.2: Update memory**

In `C:\Users\estev\.claude-personal\projects\C--Users-estev-Projects-vibe-plugins\memory\`:

- Update `queued_plugin_vibe_eval.md`: change frontmatter to reflect SHIPPED status; rename to `vibe_eval_v0_1_architecture.md` for consistency with vibe-prompt's pattern.
- Update `MEMORY.md`: bump vibe-eval pointer to reflect SHIPPED, update one-line hook.

---

## Self-review

Reviewing the plan against the spec:

**Spec coverage check:**
- §1 Identity → README + guide SKILL persona (Tasks 1, 5).
- §2 Out of scope → README explicit; OpenAI stub in Task 12.
- §3 Evidence base → not a build artifact; referenced in plan header + Celestia3 round-trip (Task 22).
- §4 v0.1 surface (`:run`, `:radar`, bare router, `:evolve-eval`, internal) → Tasks 17, 18, 19, 20, 6, 7.
- §5.1 composer-mimic + first-run interview → Tasks 8, 10, 11.
- §5.2 vendor SDKs → Task 12.
- §5.3 agent self-ID → Tasks 9, 10.
- §5.4 Celestia3 composer → Task 8 example.
- §6 comparator (mechanical + LLM-judge) → Tasks 14, 15.
- §7 state paths → Tasks 3, 4 (schemas); paths used throughout.
- §8 security model → Task 5 (security-hard-rules + cost-gates).
- §9 self-evolution hooks → Tasks 6, 7, 20.
- §10 validation plan (cowpath on Celestia3) → Task 22.
- §11 versioning + tag → Task 23.
- §12 future scope → not built; documented in README + CHANGELOG.
- §13 open questions → resolved with defaults in references (fixture realism in fixture-synthesis.md; parallelism via `--parallel` flag in run SKILL; composer depth in composer-interview.md).

**Placeholder scan:** No "TBD" anywhere. Every step has exact paths, exact commands, or exact file content. Round-trip step in Task 22 says "verify against expectations" with explicit pass criteria (5 acceptance bullets).

**Type/name consistency:**
- `composer.json` shape used in Tasks 8 (interview), 10 (setup), 11 (mimic), 17 (run) — all match composer.schema.json (Task 3).
- `agent.json` shape used in Tasks 9, 10, 15 (judge prompt parameterizes from agent) — match agent.schema.json (Task 3).
- `run-result` shape used in Tasks 14, 15, 16, 17 — match run-result.schema.json (Task 4).
- Friction trigger codes referenced in all command SKILLs appear in `friction-triggers.md` (Task 7).
- Cost rate table referenced in `cost-gates.md` (Task 5) is used by Task 17 (run cost estimate).

**Scope:** plan covers v0.1 only. v0.2+ commands (`:pick`, `:backup-test`, OpenAI client implementation, OS keychain, CI/cron context) explicitly deferred.

Plan is internally consistent and spec-complete.
