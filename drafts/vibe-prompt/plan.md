# Vibe-Prompt v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `vibe-prompt` v0.1 — a static prompt-audit Claude Code plugin with two user commands (`:scan`, `:audit`), a bare router, and the L2/L3 self-evolution stack. Validated by round-tripping the gold-standard audit shipped to Celestia3 (`docs/prompt-audit-2026-05-28.md`).

**Architecture:** Skills-only Claude Code plugin following the Vibe-Walk / Vibe-Iterate / Vibe-Doc family pattern. Commands route to skills; skills hold the agent behavior in prose. State lives in the target app under `.vibe-prompt/state/`; human-readable audit reports under `docs/vibe-prompt/`. No code beyond bash validation scripts.

**Tech Stack:** Markdown (SKILL.md, command files, README), JSON (plugin.json, state schemas), Bash (validation tests). Plugin runtime is the agent itself — SKILL bodies are the program.

**Source spec:** `drafts/vibe-prompt/spec.md`. **Gold-standard reference:** `C:\Users\estev\Projects\Celestia3\docs\prompt-audit-2026-05-28.md`. **Validation app:** Celestia3 (`C:\Users\estev\Projects\Celestia3`).

**Solo-repo target:** `Vibe-Prompt` under `estevanhernandez-stack-ed`. Plugin path within solo: `plugins/vibe-prompt`. Tag scheme: plain `vX.Y.Z`. First stable: `v0.1.0`. Marketplace ref bump in `vibe-plugins/.claude-plugin/marketplace.json` is the very last step.

---

## File structure (locked at plan-time)

```
Vibe-Prompt/                                # solo repo root
├── README.md                               # storefront + install
├── CHANGELOG.md                            # v0.1.0 entry
├── LICENSE                                 # MIT (family default)
├── .gitignore
└── plugins/
    └── vibe-prompt/
        ├── plugin.json                     # manifest
        ├── commands/                       # user-invocable slash commands
        │   ├── vibe-prompt.md              # bare router
        │   ├── scan.md
        │   ├── audit.md
        │   └── evolve-prompt.md
        ├── skills/                         # agent behavior
        │   ├── guide/
        │   │   └── SKILL.md                # shared persona + conventions
        │   ├── router/
        │   │   └── SKILL.md                # bare-router logic (state-aware)
        │   ├── scan/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── detection-heuristics.md
        │   │       └── persona-extraction.md
        │   ├── audit/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── smell-rubric-f1-f7.md
        │   │       └── audit-report-template.md
        │   ├── session-logger/
        │   │   └── SKILL.md
        │   ├── friction-logger/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       └── friction-triggers.md
        │   └── evolve-prompt/
        │       └── SKILL.md
        ├── schemas/
        │   ├── inventory.schema.json
        │   └── audit.schema.json
        └── tests/
            ├── validate-schemas.sh
            └── check-skill-references.sh
```

**Conventions inherited from the family (locked):**

- SKILL.md files use YAML frontmatter (`name`, `description`, optionally `metadata`).
- `references/` subdirectories hold content the SKILL.md body links to but doesn't inline.
- State files (`.vibe-prompt/state/*.json`) live in the TARGET app, not the plugin repo.
- Self-evolution data path: `~/.claude/plugins/data/vibe-prompt/` (sessions.jsonl + friction.jsonl).
- No telemetry. No network calls beyond what's already in the agent's tools.

---

## Phase 1 — Scaffold the plugin

### Task 1: Create solo repo + base files

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\.gitignore`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\LICENSE`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\README.md`
- Create: `C:\Users\estev\Projects\Vibe-Prompt\CHANGELOG.md`

- [ ] **Step 1.1: Create the solo repo directory and initialize git**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt"
git -C "C:\Users\estev\Projects\Vibe-Prompt" init -b main
```

- [ ] **Step 1.2: Write `.gitignore`**

```
node_modules/
.vibe-prompt/
*.log
.DS_Store
```

- [ ] **Step 1.3: Write `LICENSE`** (MIT, copyright `626Labs LLC`, year `2026`). Use the standard MIT template.

- [ ] **Step 1.4: Write `README.md`** with the family voice (builder-to-builder, second person, sentence case, tagline "Audit, organize, and classify the LLM prompts shipped in your app.").

Header skeleton:

```markdown
# Vibe-Prompt

Audit, organize, and classify the LLM prompts shipped in your app.

Vibe-Prompt is the static prompt-audit layer for vibe-coded apps that ship LLM features. Point it at your repo and it inventories every prompt site (registry-tracked and inline), names the structural smells, and recommends a reorg. Read-only by default; no behavioral testing, no auto-mutation.

## Install

[Stable channel via the vibe-plugins marketplace]
[Canary channel: this repo directly]

## What it does

- `/vibe-prompt:scan` — inventory pass. Finds every prompt site in your app.
- `/vibe-prompt:audit` — structural pass. Flags 7 smell categories with file:line evidence.
- `/vibe-prompt` (bare) — state-aware router; recommends the next move.

## What it does NOT do

- Behavioral eval (run prompts, score outputs). That's a future `vibe-eval`.
- Auto-mutation. Audit recommendations are plans, not patches.
- Token-cost benchmarking against production logs.

## Stack coverage (v0.1)

TS/JS (Gemini, Anthropic, OpenAI) + Python (anthropic, openai, google-generativeai).

## State

State lives in your target app under `.vibe-prompt/state/`. Audit reports go to `docs/vibe-prompt/`. No telemetry.
```

- [ ] **Step 1.5: Write `CHANGELOG.md`** with one entry for `v0.1.0` (placeholder date `Unreleased` — bumped on tag).

```markdown
# Changelog

## Unreleased — v0.1.0

Initial release. Static prompt audit for vibe-coded apps.

**Commands:**
- `/vibe-prompt:scan` — inventory every prompt site (registry + inline)
- `/vibe-prompt:audit` — flag the 7 structural smells (F1-F7)
- `/vibe-prompt` — state-aware bare router
- `/vibe-prompt:evolve-prompt` — L3 self-evolution

**Stack coverage:** TypeScript/JavaScript and Python.

**Validation:** round-tripped against Celestia3's prompt audit (16 sites, 8 personas, 7 findings).
```

- [ ] **Step 1.6: Verify file presence and commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add -A
git -C "C:\Users\estev\Projects\Vibe-Prompt" status
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "chore: scaffold Vibe-Prompt solo repo"
```

Expected: clean commit, no untracked files outside what's listed above.

---

### Task 2: Plugin manifest

**Files:**
- Create: `C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json`

- [ ] **Step 2.1: Create the plugin directory tree**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\commands" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas" -Force
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\tests" -Force
```

- [ ] **Step 2.2: Write `plugin.json`**

```json
{
  "name": "vibe-prompt",
  "version": "0.1.0",
  "description": "Audit, organize, and classify the LLM prompts shipped in your app. Static inventory + 7-smell audit (F1-F7) over registry-tracked and inline prompt sites. TS/JS + Python coverage. No behavioral eval, no auto-mutation, no telemetry.",
  "author": {
    "name": "626Labs LLC",
    "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Prompt"
  }
}
```

- [ ] **Step 2.3: Verify JSON parses**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\plugin.json" | ConvertFrom-Json
```

Expected: object prints with `name`, `version`, `description`, `author` fields.

- [ ] **Step 2.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/plugin.json
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(plugin): add plugin.json manifest"
```

---

### Task 3: Guide SKILL (shared persona + conventions)

**Files:**
- Create: `plugins/vibe-prompt/skills/guide/SKILL.md`

- [ ] **Step 3.1: Write the guide SKILL**

```markdown
---
name: vibe-prompt:guide
description: Shared behavior, persona, and technical conventions used internally by the other Vibe Prompt skills. Loaded as a reference by the command skills for consistent agent behavior. Not a slash command — do not invoke directly.
---

# Vibe-Prompt guide (internal)

This SKILL is loaded by every Vibe-Prompt command SKILL. It defines shared agent behavior.

## Persona

You are the Vibe-Prompt auditor: a calm, precise reader of LLM prompt code. You inventory before you opine, name evidence before you recommend, and never speculate about behavior you can't verify from the source. Read-only by default. You do not run prompts, do not score outputs, do not patch code.

## Posture

- **Static-only.** You read source files. You do not invoke any LLM. You do not benchmark.
- **Evidence-first.** Every finding cites file path + line number. No claim without a citation.
- **Two-class inventory.** Prompts live in (A) a central registry (constants, Firestore-mirrored constants, YAML/JSON tables) and (B) inline `systemInstruction` / `system_message` / template-string literals at call sites. Both are in scope.
- **Reorg recommendation, not mutation.** You write plans to `docs/vibe-prompt/`. You do not edit source.
- **No telemetry.** Nothing leaves the target app or `~/.claude/plugins/data/vibe-prompt/`.

## Output conventions

- **State files** are JSON, validated against `plugins/vibe-prompt/schemas/`.
- **Reports** are markdown under `docs/vibe-prompt/`, dated `audit-YYYY-MM-DD.md`.
- **Severity** is `high | medium | low`. F1, F2, F4, F6 default high; F7, F3 medium; F5 low.

## Stack detection

Detect the stack from `package.json`, `pyproject.toml`, `requirements.txt`, file extensions, and imports of known SDKs. Currently in scope: TypeScript/JavaScript (Gemini, Anthropic, OpenAI) + Python (anthropic, openai, google-generativeai). Out of scope for v0.1: Go, Rust, Java.

## When state is missing

`scan` is the prerequisite for `audit`. If `.vibe-prompt/state/inventory.json` does not exist when `audit` is invoked, instruct the user to run `/vibe-prompt:scan` first. Never silently re-scan from within audit.

## Self-evolution

All command skills invoke `session-logger` at start + end and `friction-logger` at the triggers in `friction-triggers.md`. `evolve-prompt` reads those logs and proposes changes — never auto-applies.
```

- [ ] **Step 3.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/guide
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(guide): add shared persona + conventions SKILL"
```

---

### Task 4: JSON schemas (lock the data shapes early)

**Files:**
- Create: `plugins/vibe-prompt/schemas/inventory.schema.json`
- Create: `plugins/vibe-prompt/schemas/audit.schema.json`

- [ ] **Step 4.1: Write `inventory.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-prompt/inventory",
  "type": "object",
  "required": ["version", "scannedAt", "targetApp", "registry", "inlinePrompts", "personas", "modelIdentifiers"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "scannedAt": { "type": "string", "format": "date-time" },
    "targetApp": {
      "type": "object",
      "required": ["name", "stack", "aiProviders"],
      "properties": {
        "name": { "type": "string" },
        "stack": { "type": "array", "items": { "type": "string" } },
        "aiProviders": { "type": "array", "items": { "enum": ["gemini", "anthropic", "openai", "other"] } }
      }
    },
    "registry": {
      "type": "object",
      "required": ["detected", "entries"],
      "properties": {
        "detected": { "type": "boolean" },
        "location": { "type": ["string", "null"] },
        "format": { "type": ["string", "null"] },
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "category", "version", "outputShape", "voiceBearing"],
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "category": { "type": "string" },
              "version": { "type": "string" },
              "outputShape": { "enum": ["prose", "json-object", "json-array", "multimodal-in"] },
              "templatedVars": { "type": "array", "items": { "type": "string" } },
              "voiceBearing": { "type": "boolean" },
              "personaLabel": { "type": ["string", "null"] }
            }
          }
        }
      }
    },
    "inlinePrompts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file", "startLine", "endLine", "outputShape", "voiceBearing"],
        "properties": {
          "file": { "type": "string" },
          "startLine": { "type": "integer" },
          "endLine": { "type": "integer" },
          "personaLabel": { "type": ["string", "null"] },
          "outputShape": { "enum": ["prose", "json-object", "json-array", "multimodal-in"] },
          "templatedVars": { "type": "array", "items": { "type": "string" } },
          "voiceBearing": { "type": "boolean" },
          "hasFallback": { "type": "boolean" },
          "estimatedTokens": { "type": "integer" }
        }
      }
    },
    "personas": { "type": "array", "items": { "type": "string" } },
    "modelIdentifiers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["value", "occurrences"],
        "properties": {
          "value": { "type": "string" },
          "occurrences": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["file", "line"],
              "properties": {
                "file": { "type": "string" },
                "line": { "type": "integer" }
              }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4.2: Write `audit.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "vibe-prompt/audit",
  "type": "object",
  "required": ["version", "auditedAt", "inventoryRef", "findings", "summary"],
  "properties": {
    "version": { "type": "string", "const": "0.1" },
    "auditedAt": { "type": "string", "format": "date-time" },
    "inventoryRef": { "type": "string" },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "smell", "severity", "evidence", "recommendation"],
        "properties": {
          "id": { "enum": ["F1", "F1b", "F2", "F3", "F4", "F5", "F6", "F7"] },
          "smell": { "type": "string" },
          "severity": { "enum": ["high", "medium", "low", "advisory"] },
          "evidence": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["file", "line"],
              "properties": {
                "file": { "type": "string" },
                "line": { "type": "integer" },
                "note": { "type": "string" }
              }
            }
          },
          "recommendation": { "type": "string" }
        }
      }
    },
    "summary": {
      "type": "object",
      "required": ["totalFindings", "byCategory"],
      "properties": {
        "totalFindings": { "type": "integer" },
        "byCategory": {
          "type": "object",
          "properties": {
            "high": { "type": "integer" },
            "medium": { "type": "integer" },
            "low": { "type": "integer" },
            "advisory": { "type": "integer" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4.3: Verify both schemas parse**

```powershell
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\inventory.schema.json" | ConvertFrom-Json
Get-Content "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\schemas\audit.schema.json" | ConvertFrom-Json
```

Expected: both parse without error.

- [ ] **Step 4.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/schemas
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(schemas): lock inventory + audit JSON schemas"
```

---

## Phase 2 — Scan command

### Task 5: Detection heuristics reference

**Files:**
- Create: `plugins/vibe-prompt/skills/scan/references/detection-heuristics.md`
- Create: `plugins/vibe-prompt/skills/scan/references/persona-extraction.md`

- [ ] **Step 5.1: Create reference directory**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\scan\references" -Force
```

- [ ] **Step 5.2: Write `detection-heuristics.md`**

```markdown
# Detection heuristics — scan

Read these before any inventory pass. Heuristics are best-effort; the SKILL must flag low-confidence detections.

## Step 1: Stack detection

| Signal | Stack class |
|---|---|
| `package.json` + `"typescript"` dep or `tsconfig.json` | typescript |
| `package.json` without `typescript` | javascript |
| `pyproject.toml` or `requirements.txt` or `setup.py` | python |
| Mixed (both `package.json` and `pyproject.toml`) | multi (scan both, report under one inventory) |

## Step 2: AI provider detection

Look for these imports in source files (exclude `node_modules/`, `.venv/`, `venv/`, `dist/`, `build/`):

| Import / require pattern | Provider |
|---|---|
| `@google/generative-ai`, `@google/genai`, `google.generativeai` | gemini |
| `@anthropic-ai/sdk`, `from anthropic` | anthropic |
| `openai` (TS/JS), `from openai` | openai |
| Other vendor SDKs | "other" |

Multiple providers in one app is normal; record all.

## Step 3: Registry detection

A "registry" is a central data structure mapping prompt IDs → content. Detection patterns:

- **Default-export-record (TS/JS):** const object literal with entries shaped `{ id, content, category, version }` or similar. Common in `*ConfigService.ts`, `*PromptService.ts`, `lib/prompts/*.ts`.
- **Class-static method (TS/JS):** `class ... { static async getPrompt(id) { ... } }` with a Firestore/DB-backed fetch.
- **Module-level dict (Python):** `PROMPTS = { "id": "..." }` in a `prompts.py` / `templates.py` / `system_prompts.py`.
- **YAML/JSON tables:** `prompts.yaml`, `prompts.json` files at any level.

Mark `registry.detected = true` if any match. Record `location` (file path) and `format` (one of: `default-export-record`, `class-static-fetcher`, `module-dict`, `yaml-table`, `json-table`).

## Step 4: Inline prompt detection

For each detected AI provider, search for these patterns:

**TypeScript/JavaScript:**
- Calls to `generateContent(...)`, `messages.create(...)`, `chat.completions.create(...)`, `client.complete(...)` with a `systemInstruction` / `system` / `system_message` field that is a string literal (not a registry-fetched value).
- Template strings (` ``...`` `) assigned to `const systemPrompt`, `const prompt`, etc., followed by use in an AI call within the same scope.
- Triple-quoted-equivalents in JSX strings starting with `You are`, `You must`, `Your role`, `Respond as`, `Act as`.

**Python:**
- `client.messages.create(...)`, `client.chat.completions.create(...)`, `model.generate_content(...)`, `model.invoke(...)` where the system field is a string literal.
- Triple-quoted strings `"""You are..."""` assigned to a name that's then used in an AI call.

For each hit, capture: file path, start line, end line of the literal, persona label (extracted), output shape, templated vars, voice-bearing flag, fallback presence, estimated token count.

## Step 5: Confidence flags

Tag every detection with confidence:

- **high:** matched a known SDK call site pattern directly.
- **medium:** matched a string-literal-assigned-to-named-const pattern but didn't confirm AI-call usage in the same file.
- **low:** matched persona-language regex (`You are the ...`) but no SDK call nearby. Likely a false positive; include but flag.

Aggregate confidence per inventory; if >40% of inline detections are low-confidence, note it in the scan output banner.

## What NOT to scan

- `node_modules/`, `.venv/`, `venv/`, `dist/`, `build/`, `coverage/`, `.next/`, `out/`, generated `*.lib.*` and `*.d.ts` files.
- Anything in `.git/`.
- Files larger than 500 KB (likely generated or non-source).
- Test files (`__tests__/`, `*.test.*`, `*.spec.*`) — include them in inventory but tag `testFile: true` so audit can de-prioritize.
```

- [ ] **Step 5.3: Write `persona-extraction.md`**

```markdown
# Persona extraction — scan

After detecting a prompt site, extract the persona label.

## Extraction order

1. **From declared persona field** (registry only): if the registry entry has a `name` field or `persona` field, use that.
2. **From "You are" anchor:** regex `/You are (the |an? )?([A-Z][A-Za-z0-9 ,.'-]+?)(\.|,|;|\n|$)/` on the prompt text. Capture group 2 is the persona label. Strip trailing punctuation.
3. **Fallback:** if no "You are" anchor, look for `Act as ...`, `Respond as ...`, `You will play ...`. Same capture rule.
4. **Last resort:** persona label = null. Flag the site as `personaLabel: null` with `confidence: low`.

## Normalization

- Strip extra whitespace, collapse internal spaces.
- Preserve case (the label is brand-identifying).
- Keep parenthetical qualifiers ("Athanor (the Resurrected Seer)" → "Athanor, the Resurrected Seer" — replace inner parens with comma+space, but only when the qualifier reads as appositive).

## De-duplication for the `personas` top-level array

- Case-sensitive exact match → dedupe.
- Case-insensitive near-match WITHOUT exact match → do NOT dedupe (this is signal for F5 persona fragmentation — surface both).
- Maintain insertion order in the array.

## Examples (from Celestia3)

- "You are the **Athanor** — a modern oracle" → `Athanor`
- "You are the Oneirocriton Dream Oracle, an ancient Hermetic dream interpreter" → `Oneirocriton Dream Oracle`
- "You are the **Athanor**, the Resurrected Seer" → `Athanor, the Resurrected Seer`
- "You are the **Athanor AI** performing a multimodal energy scan" → `Athanor AI`
- "You are the Chronos Scryer" → `Chronos Scryer`
```

- [ ] **Step 5.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/scan/references
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(scan): add detection heuristics + persona extraction references"
```

---

### Task 6: Scan SKILL

**Files:**
- Create: `plugins/vibe-prompt/skills/scan/SKILL.md`

- [ ] **Step 6.1: Write the scan SKILL**

```markdown
---
name: vibe-prompt:scan
description: This skill should be used when the user says "/vibe-prompt:scan", "scan my prompts", "inventory my LLM prompts", "find all my prompt sites", or wants a full prompt inventory across an app. Reads source files autonomously, detects registry + inline prompt sites, extracts personas, identifies hardcoded model identifiers, and writes `.vibe-prompt/state/inventory.json` in the target app. Read-only. Defers structural analysis to `/vibe-prompt:audit`.
---

# /vibe-prompt:scan

Load `vibe-prompt:guide` first.

Inventory every LLM prompt site in the target app. Writes one machine-readable state file + a short banner.

## Inputs

- Target app: the current working directory (or path argument if provided).
- No flags in v0.1. Always full scan.

## Workflow

1. **Pre-flight.** Invoke `session-logger` (sentinel start entry). Verify there's a recognized stack (`package.json` or `pyproject.toml`). If none, friction-log `no-recognized-stack` and abort with a clean message.
2. **Stack + provider detection.** Per `references/detection-heuristics.md` §1-2. Record `targetApp.stack` and `targetApp.aiProviders`.
3. **Registry detection.** Per `references/detection-heuristics.md` §3. If found, extract every entry: id, name, category, version, outputShape (inferred from content — look for JSON schemas, "return only JSON", "respond in markdown"), templatedVars (regex `\{\{(\w+)\}\}` on content), voiceBearing (true if content includes "You are" / "Act as" / persona declaration), personaLabel (per `references/persona-extraction.md`).
4. **Inline prompt detection.** Per `references/detection-heuristics.md` §4. For each hit, capture the same fields as registry entries plus `hasFallback` (look at the enclosing try/catch — if there's a fallback value returned in the catch block, true) and `estimatedTokens` (rough: characters / 4).
5. **Persona collection.** Dedupe per `references/persona-extraction.md`. Write to `personas` top-level array.
6. **Model identifier collection.** Grep for known model name patterns across all detected provider call sites: `gemini-[\d.]+-(flash|pro|ultra)`, `claude-[\d.]+-(opus|sonnet|haiku)(-\d+)?`, `gpt-[\d.]+(-turbo)?`, `o[\d]+(-mini)?`. Record every occurrence with file + line. Group by `value`.
7. **Write inventory.** Atomic write to `.vibe-prompt/state/inventory.json`. Validate against `plugins/vibe-prompt/schemas/inventory.schema.json` before write.
8. **Render banner.** ≤ 25 lines. Includes: stack, providers, registry detected?, registered count, inline count, persona count, model identifiers count, confidence summary. End with the suggestion: *"Run `/vibe-prompt:audit` to surface structural smells."*
9. **Post-flight.** `session-logger` terminal entry.

## Banner template

```
═══ Vibe-Prompt scan ═══
Stack:      typescript + python
Providers:  gemini, anthropic

Registry:   detected (src/lib/ConfigService.ts, default-export-record)
            6 entries
Inline:     10 sites
Personas:   8 distinct labels
Models:     1 identifier in use ("gemini-3.5-flash") across 4 sites

Confidence: 14/16 sites high-confidence, 2 medium
Written:    .vibe-prompt/state/inventory.json (45 KB)

Next: /vibe-prompt:audit
```

## Friction triggers

See `friction-triggers.md`. Highlights:
- `registry-detected-but-empty-entries` — confidence: high
- `model-identifier-unrecognized` (matches no known published model name) — confidence: high
- `inline-prompt-without-fallback` (only logged once per scan, as aggregate)
- `low-confidence-detections-over-40pct` — confidence: medium

## Never

- Run any prompt.
- Modify any source file.
- Re-write `inventory.json` after a partial scan (must be atomic — write to tempfile, rename).
```

- [ ] **Step 6.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/scan/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(scan): add scan SKILL"
```

---

### Task 7: Scan command file

**Files:**
- Create: `plugins/vibe-prompt/commands/scan.md`

- [ ] **Step 7.1: Write the command file**

```markdown
---
description: Inventory every LLM prompt site (registry + inline) in your app. Writes .vibe-prompt/state/inventory.json. Read-only.
---

Invoke the `vibe-prompt:scan` skill.
```

- [ ] **Step 7.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/scan.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(scan): add /vibe-prompt:scan command"
```

---

### Task 8: Validate scan against Celestia3 (gold-standard round-trip)

**Files (no edits, only reads):**
- Read: `C:\Users\estev\Projects\Celestia3\` (target)
- Read: `C:\Users\estev\Projects\vibe-plugins\drafts\vibe-prompt\process-notes.md` (gold-standard inventory)
- Read: `C:\Users\estev\Projects\Celestia3\docs\prompt-audit-2026-05-28.md` (gold-standard audit)

- [ ] **Step 8.1: Install the plugin canary-style into a test Claude Code session**

Link the plugin solo repo to the local plugins dir:

```powershell
# Symlink so edits in the solo repo are picked up live
New-Item -ItemType SymbolicLink -Path "C:\Users\estev\.claude\plugins\vibe-prompt" -Target "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt"
```

- [ ] **Step 8.2: Run /vibe-prompt:scan against Celestia3**

From a Claude Code session in `C:\Users\estev\Projects\Celestia3`, invoke `/vibe-prompt:scan`. Observe the banner.

Expected: writes `.vibe-prompt/state/inventory.json` in Celestia3.

- [ ] **Step 8.3: Verify inventory matches process-notes**

Required round-trip targets (from `process-notes.md` Phase 1):

| Field | Expected value | Pass if |
|---|---|---|
| `registry.detected` | true | exact |
| `registry.entries.length` | 6 | exact |
| `registry.entries[*].id` includes | technomancer_grimoire, natal_interpretation, synastry_report, ritual_generation, arithmancy_natal_integration, deep_dive_interpretation | all present |
| `inlinePrompts.length` | 10 | within ±1 |
| `inlinePrompts[*].file` includes | Oneirocriton.tsx, DailyNexusModal.tsx, AstrocartographyView.tsx, AuraScanner.tsx, TarotSpread.tsx, CelebrityService.ts, OnboardingService.ts | all present |
| `personas.length` | 8 | within ±1 |
| `modelIdentifiers[*].value` includes | gemini-3.5-flash | exact |
| Total occurrences of gemini-3.5-flash | 4 (ConfigService:39, gemini.ts:138, functions:105, functions:122) | within ±1 |

```powershell
Get-Content "C:\Users\estev\Projects\Celestia3\.vibe-prompt\state\inventory.json" | ConvertFrom-Json | Format-List
```

- [ ] **Step 8.4: If any target misses, friction-log + iterate scan SKILL**

If the scan misses (e.g., only finds 7 inline sites instead of 10), the gap names the heuristic to refine. Common gaps to expect on first round-trip:
- **ChatService.ts hybrid sites** — the 5 inline call sites inside the file may be missed if the heuristic stops at the first registry hit. Fix: don't short-circuit — scan the whole file.
- **OnboardingService.ts** — the prompt may be constructed via string concat above the call, making the literal harder to find. Fix: widen the search window to the function body, not just the SDK call's immediate args.

Iterate scan SKILL prose until inventory matches. **Do not move to audit until scan round-trips clean.**

- [ ] **Step 8.5: Commit any scan SKILL refinements**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/scan
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix(scan): refine heuristics to match Celestia3 gold standard"
```

---

## Phase 3 — Audit command

### Task 9: F1-F7 smell rubric reference

**Files:**
- Create: `plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f7.md`

- [ ] **Step 9.1: Create reference directory**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\audit\references" -Force
```

- [ ] **Step 9.2: Write the rubric**

```markdown
# F1-F7 smell rubric — audit

Each finding has: ID, Smell, Severity default, Detection rule (reads from inventory.json), Recommendation template. The audit SKILL applies these in order.

---

## F1 — Registry exists, isn't enforced

**Severity (default):** high
**Detection:** `inventory.registry.detected === true` AND `inventory.inlinePrompts.length > 0`.
**Evidence:** every entry of `inlinePrompts`.
**Recommendation template:**
> Move each inline `systemInstruction` literal into the registry at `{registry.location}` with a stable id (e.g., `<feature>_<role>`). Call sites switch to the registry's fetch method ({inferred method name}). The hybrid sites (see F7) are the highest priority.

## F1b — No central registry detected

**Severity (default):** advisory
**Detection:** `inventory.registry.detected === false` AND `inventory.inlinePrompts.length >= 3`.
**Evidence:** the top 5 inline sites (by token count).
**Recommendation template:**
> No central registry detected. With {N} inline prompts, consider introducing one — a const map of `id → content` in `src/lib/prompts.ts` or equivalent. Registry + admin UI unlocks production tuning without code deploys.

## F2 — Voice contradicts itself across the composition stack

**Severity (default):** high
**Detection:** for each voice-bearing prompt (registry or inline), extract directives that look like bans or persona rules (regex on phrases like "never", "do not", "always", "you are not"). Compare across the composition stack (global persona + each task prompt). A finding fires when:
- A global directive declares a ban (e.g., "never call the user X") AND
- A task prompt that gets stacked on top instructs the model to do the banned thing (e.g., addresses the user as X).

The detection is best-effort and may require the agent to read the actual content semantically rather than purely lexically. v0.1 trace depth: 1 hop (global directive → task prompt). Deeper graph analysis is v0.2.

**Evidence:** file + line of the global directive rule AND file + line of the violating task prompt.
**Recommendation template:**
> Hold persona at the global directive only. Strip per-prompt persona overrides from `{violating prompt id}` so the composer doesn't stack contradictions. Per-prompt content becomes task-only.

## F3 — Version drift inside the registry

**Severity (default):** medium
**Detection:** `inventory.registry.entries[*].version` values where the major numbers diverge by ≥ 2, OR where one entry's content version label (e.g., "v3.5.0") doesn't match the voice rules implied by another entry at the same major (manual reading required — agent makes a best-effort call).
**Evidence:** the diverging version values.
**Recommendation template:**
> Coordinate registry version bumps. When the global directive changes major, every voice-bearing prompt either re-confirms voice at the new version or gets re-touched and bumped. Highest-priority correction: any entry whose version label doesn't match its content (silent staleness).

## F4 — Naive templating without unfilled-var validation

**Severity (default):** high
**Detection:** `inventory.registry.entries[*].templatedVars.length > 0` OR `inventory.inlinePrompts[*].templatedVars.length > 0`, AND no `requiredVars` field exists in the registry entry interface (i.e., no validator path detected).
**Evidence:** call sites that pass user data through `.replace()` or string substitution without validation. Detect by grepping target source for `.replace(/\\{\\{[^}]+\\}\\}/g` patterns.
**Recommendation template:**
> Add a typed renderer: each prompt declares its required vars; the renderer throws if any are missing. ~30 LOC. Catches unfilled-placeholder leakage at the boundary.

## F5 — Persona fragmentation

**Severity (default):** low
**Detection:** `inventory.personas.length > 3`.
**Evidence:** full `inventory.personas` array.
**Recommendation template:**
> {N} distinct persona labels detected for what may be one brand voice. Decide consciously: collapse to 1-3 personas, or document the intentional per-feature split. If unsure, the registry version of each persona is the authoritative source.

## F6 — Hard-coded model identifier (with typo detection)

**Severity (default):** high
**Detection:** for each `inventory.modelIdentifiers[*]`:
- If `occurrences.length >= 2`: hardcoding finding.
- If `value` doesn't match a known published model pattern (use a local list of known names: gemini-1.5-*, gemini-2.0-*, gemini-2.5-*, claude-3*, claude-opus-4*, claude-sonnet-4*, claude-haiku-4*, gpt-4*, gpt-3.5-*, o1-*, o3-*): suspect-model finding (separate, also high severity).
**Evidence:** every occurrence (file + line) of the suspect identifier.
**Recommendation template:**
> Consolidate model identifier to one config source. {If suspect:} Verify what model Google's API actually serves when "{value}" is requested — likely a typo (closest published name: {nearest match}). Log an API response, confirm, then pick the intended name.

## F7 — Hybrid call sites

**Severity (default):** medium
**Detection:** any single source file that contains BOTH a `getPrompt(...)` (or equivalent registry fetch) call AND an inline `systemInstruction` literal.
**Evidence:** file + line of registry calls AND file + line of inline calls within that file.
**Recommendation template:**
> Pick one pattern per service. `{file}` mixes registry-fetched and inline prompts; route the inline call sites through the registry once they exist there (depends on F1 fix). Improves reader-comprehension for future contributors.
```

- [ ] **Step 9.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f7.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): add F1-F7 smell rubric reference"
```

---

### Task 10: Audit report template reference

**Files:**
- Create: `plugins/vibe-prompt/skills/audit/references/audit-report-template.md`

- [ ] **Step 10.1: Write the template**

```markdown
# Audit report template — audit

The audit SKILL renders findings into a dated markdown file at `docs/vibe-prompt/audit-YYYY-MM-DD.md` in the TARGET app. Template structure:

````markdown
# {targetApp.name} prompt audit — {YYYY-MM-DD}

**Auditor:** Vibe-Prompt v{plugin.version}
**Scope:** every LLM prompt site in {targetApp.stack joined with " + "}. Static read only — no prompts run.
**Verdict:** {one-sentence headline derived from highest-severity findings}.

## Headline findings

| # | Smell | Severity | Where |
|---|---|---|---|
{for each finding, in severity order then ID order}
| {finding.id} | {finding.smell} | **{Severity}** | {summary of evidence locations} |

---

{for each finding, in same order}

## {finding.id} — {finding.smell} ({Severity})

**Evidence.** {prose render of evidence; cite file:line for each entry}

**Why it matters.** {one-paragraph explanation tailored to this app's specifics}

**Recommended fix.** {finding.recommendation, parameterized with target-specific values}

---

## Recommended sequence of fixes

{prioritize by: severity × estimated effort. Default ordering — F6 verify first (cheapest), then F4, then F2+F3+F5 together, then F1, then F7. Adjust per app.}

---

## Inventory appendix

**Registry-tracked ({N}):** {comma-separated list of IDs}. All in `{registry.location}`. {Notes about mirror destinations if known.}

**Inline ({N}):** {comma-separated list of files}.

**Personas:** {N} distinct labels (full list under F5).

**Composer:** {if a central composer file was identified during scan, name it; otherwise "no central composer detected"}.

**Auditor note.** This audit was generated by Vibe-Prompt v{plugin.version}. Re-run `/vibe-prompt:audit` after fixes ship to verify findings clear.
````

## Rendering rules

- Always use the smell ID + severity in the headline table for grep-ability.
- Evidence sections cite `file:line` format so editors auto-link.
- Recommendation prose must be specific to the target app — fill in the recommendation template variables from inventory data, do not leave placeholders.
- The "Recommended sequence" section orders by `severity × cheapness`. F6 verify-model is always first if F6 fired (5-minute test, highest signal).
- Never invent findings not in `audit.json`. The report is a render of the state file; the state file is the source of truth.
```

- [ ] **Step 10.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/references/audit-report-template.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): add audit report template"
```

---

### Task 11: Audit SKILL

**Files:**
- Create: `plugins/vibe-prompt/skills/audit/SKILL.md`

- [ ] **Step 11.1: Write the audit SKILL**

```markdown
---
name: vibe-prompt:audit
description: This skill should be used when the user says "/vibe-prompt:audit", "audit my prompts", "what's wrong with my prompts", "find prompt smells", "structural prompt review", or wants a structural audit of LLM prompts in their app. Reads `.vibe-prompt/state/inventory.json` (required prerequisite — created by `/vibe-prompt:scan`), applies the F1-F7 rubric, writes `.vibe-prompt/state/audit.json` and a human-readable `docs/vibe-prompt/audit-YYYY-MM-DD.md`. Read-only — no source mutation.
---

# /vibe-prompt:audit

Load `vibe-prompt:guide` first. Then load `references/smell-rubric-f1-f7.md` and `references/audit-report-template.md`.

Apply the F1-F7 rubric to the cached inventory. Emit machine-readable findings + human-readable dated report.

## Inputs

- `.vibe-prompt/state/inventory.json` in the target app — REQUIRED.
- No flags in v0.1.

## Workflow

1. **Pre-flight.** Invoke `session-logger` start. Read `.vibe-prompt/state/inventory.json`. If missing, instruct the user to run `/vibe-prompt:scan` first and exit. Validate inventory against `plugins/vibe-prompt/schemas/inventory.schema.json` — if invalid, friction-log `inventory-schema-violation` and abort.
2. **Apply rubric.** Walk `references/smell-rubric-f1-f7.md` in order F1 → F1b → F2 → F3 → F4 → F5 → F6 → F7. For each smell, run the detection rule against `inventory.json`. If it fires, build a finding object: `{ id, smell, severity, evidence[], recommendation }`. Use the recommendation template, filling in concrete values from inventory (file paths, IDs, counts).
3. **F2 semantic pass.** Voice-contradiction detection cannot run from inventory alone — it needs prompt content. Re-read each voice-bearing prompt's content from the target source. Compare global directive (if present in registry as a `*directive` / `*persona` entry) against each task prompt. Surface contradictions with specific file:line citations on BOTH the rule and the violation.
4. **F6 known-model lookup.** Compare each `modelIdentifiers[*].value` against the bundled known-models list (in `references/smell-rubric-f1-f7.md` §F6). If unrecognized, the suspect-model variant of F6 fires with elevated severity language and a "verify what's actually served" recommendation.
5. **Compose summary.** Count findings by severity → `summary.byCategory`. Total → `summary.totalFindings`.
6. **Write audit.json.** Atomic write to `.vibe-prompt/state/audit.json`. Validate against schema before write.
7. **Render report.** Apply `references/audit-report-template.md` to write `docs/vibe-prompt/audit-{YYYY-MM-DD}.md` in the target app. Date is today's date in the target's local time zone — but use UTC YYYY-MM-DD for the filename to keep ordering stable.
8. **Render banner.** ≤ 25 lines. Includes finding count by severity, the highest-severity finding's one-liner, the report path, the next recommended step.
9. **Post-flight.** `session-logger` terminal entry.

## Banner template

```
═══ Vibe-Prompt audit ═══
Findings:   7 total
  High:     4 (F1, F2, F4, F6)
  Medium:   2 (F3, F7)
  Low:      1 (F5)

Headline:   Registry exists but 10 inline sites bypass it (F1, high)
Report:     docs/vibe-prompt/audit-2026-05-28.md
State:      .vibe-prompt/state/audit.json

Suggested first move: F6 verify-model (cheapest, highest signal).
```

## Friction triggers

See `friction-triggers.md`. Highlights:
- `f6-suspect-model-detected` — high confidence
- `f2-contradiction-cross-file-attempted` (when v0.1 1-hop trace surfaced what looks like a deeper conflict but couldn't resolve it) — medium
- `rubric-default-recommendation-felt-generic` (heuristic — the agent's own read of whether the recommendation it just emitted is specific enough)

## Never

- Run any prompt.
- Re-scan from within audit. Audit reads cached inventory; scan owns inventory.
- Modify source.
```

- [ ] **Step 11.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit/SKILL.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): add audit SKILL"
```

---

### Task 12: Audit command file

**Files:**
- Create: `plugins/vibe-prompt/commands/audit.md`

- [ ] **Step 12.1: Write the command file**

```markdown
---
description: Audit your prompts for the 7 structural smells (F1-F7). Reads cached inventory, writes findings + a dated markdown report. Read-only.
---

Invoke the `vibe-prompt:audit` skill.
```

- [ ] **Step 12.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/commands/audit.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(audit): add /vibe-prompt:audit command"
```

---

### Task 13: Validate audit against Celestia3 gold standard

**Files (no edits, only reads):**
- Read: `C:\Users\estev\Projects\Celestia3\docs\prompt-audit-2026-05-28.md` (gold standard)

- [ ] **Step 13.1: Run /vibe-prompt:audit against Celestia3**

In a Claude Code session at Celestia3 (after Task 8 confirmed scan round-trips):

Invoke `/vibe-prompt:audit`. Expect: writes `.vibe-prompt/state/audit.json` AND `docs/vibe-prompt/audit-<today>.md`.

- [ ] **Step 13.2: Verify findings match gold standard**

Required round-trip targets (from `Celestia3\docs\prompt-audit-2026-05-28.md`):

| Finding | Severity | Pass if |
|---|---|---|
| F1 | high | present, evidence cites at least 8 of the 10 inline files |
| F2 | high | present, evidence cites both natal_interpretation:76 AND DEFAULT_DIRECTIVE:34 |
| F3 | medium | present, evidence cites the version values |
| F4 | high | present, evidence cites RitualService.ts:47 |
| F5 | low | present, evidence lists at least 6 of the 8 personas |
| F6 | high | present (suspect-model variant), evidence cites all 4 occurrences of gemini-3.5-flash |
| F7 | medium | present, evidence cites ChatService.ts |

```powershell
Get-Content "C:\Users\estev\Projects\Celestia3\docs\vibe-prompt\audit-*.md" | Select-String -Pattern "^## F[0-9]"
```

- [ ] **Step 13.3: Iterate audit SKILL until all 7 findings round-trip**

Common gaps to expect:
- **F2 cross-file semantic pass** — the rubric may not catch the contradiction without re-reading content. Fix: ensure step 3 of the workflow does the second-pass content read.
- **F4 detection** — if templating regex misses some `.replace()` variants, widen the search pattern.
- **F6 suspect-model lookup** — verify the bundled known-models list in the rubric reference is complete enough.

**Do not move to bare router until audit round-trips clean against the gold standard.**

- [ ] **Step 13.4: Commit refinements**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/audit
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix(audit): refine rubric matching to round-trip Celestia3 gold standard"
```

---

## Phase 4 — Bare router

### Task 14: Router SKILL (state-aware next-step)

**Files:**
- Create: `plugins/vibe-prompt/skills/router/SKILL.md`

- [ ] **Step 14.1: Write the router SKILL**

```markdown
---
name: vibe-prompt:router
description: This skill should be used when the user says "/vibe-prompt" (bare, no subcommand). Reads target-app state (inventory + audit freshness), introduces Vibe-Prompt, and recommends the next move — never executes destructively without confirmation.
---

# /vibe-prompt (bare router)

Load `vibe-prompt:guide`. Then read target-app state and route.

## State checks

1. **No `.vibe-prompt/state/inventory.json`** → first run.
   - Render: "No inventory cached. Want me to run `/vibe-prompt:scan` to inventory your prompts? (read-only)"
   - Wait for confirm. If yes, hand off to scan. If no, exit.

2. **Inventory exists, no `audit.json`** → audit pending.
   - Render: inventory summary (counts) + "No audit yet. Want me to run `/vibe-prompt:audit` against the cached inventory?"
   - Wait for confirm. If yes, hand off to audit.

3. **Audit exists** → posture summary.
   - Read inventory + audit.
   - Render: ≤ 30 lines summary. Counts, top 3 findings, audit age (days since last run).
   - If audit > 14 days old, suggest `/vibe-prompt:scan` to refresh.
   - Otherwise close with: "All caught up. Re-run `/vibe-prompt:scan` after prompt changes to re-check."

## Workflow

1. Invoke `session-logger` start.
2. Read state. Pick branch.
3. Render banner.
4. If asking a question, use AskUserQuestion. Wait for response.
5. If handing off, defer to the target skill.
6. `session-logger` terminal entry.

## Never

- Run scan or audit without explicit user confirmation, even on first run.
- Suggest a state-mutating fix from inside the router. Routing only.
```

- [ ] **Step 14.2: Write bare command file** `plugins/vibe-prompt/commands/vibe-prompt.md`

```markdown
---
description: State-aware router for Vibe-Prompt. Recommends your next move based on cached state.
---

Invoke the `vibe-prompt:router` skill.
```

- [ ] **Step 14.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/router plugins/vibe-prompt/commands/vibe-prompt.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(router): add bare /vibe-prompt router"
```

---

### Task 15: Validate router on Celestia3

- [ ] **Step 15.1: Test each state branch**

In a Claude Code session at Celestia3:

| State | Action | Expected |
|---|---|---|
| Remove `.vibe-prompt/state/inventory.json`, invoke `/vibe-prompt` | router asks to run scan | matches "No inventory cached" prompt |
| With inventory, remove `audit.json`, invoke `/vibe-prompt` | router asks to run audit | matches "No audit yet" prompt |
| With both, invoke `/vibe-prompt` | router renders posture | shows finding counts + top 3 + audit age |

- [ ] **Step 15.2: Iterate router SKILL until all 3 branches behave**

- [ ] **Step 15.3: Commit refinements**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/router
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix(router): polish state-branch behavior"
```

---

## Phase 5 — Self-evolution stack

### Task 16: Session-logger SKILL

**Files:**
- Create: `plugins/vibe-prompt/skills/session-logger/SKILL.md`

- [ ] **Step 16.1: Write the SKILL** (modeled on Vibe-Iterate's session-logger pattern)

```markdown
---
name: vibe-prompt:session-logger
description: Internal SKILL — not a slash command. Two-phase append-only session log for Vibe-Prompt. Invoked by every command SKILL at start (sentinel entry, outcome=in_progress) and at end (terminal entry, paired by sessionUUID). Part of Level 2 (session memory) of the Self-Evolving Plugin Framework.
---

# Session logger (internal)

Append-only JSONL log of every command invocation. Two phases: sentinel at start, terminal at end. Paired by `sessionUUID`.

## Storage

File path: `~/.claude/plugins/data/vibe-prompt/sessions.jsonl`. Create directory if missing. Append-only — never truncate.

## Sentinel entry shape (written at command start)

```json
{
  "sessionUUID": "<uuid v4>",
  "timestamp": "<ISO 8601>",
  "command": "scan | audit | router | evolve-prompt",
  "targetApp": "<basename of cwd>",
  "outcome": "in_progress"
}
```

## Terminal entry shape (written at command end)

```json
{
  "sessionUUID": "<same uuid>",
  "timestamp": "<ISO 8601>",
  "command": "...",
  "targetApp": "...",
  "outcome": "completed | aborted | error",
  "durationMs": <integer>,
  "summary": {
    "findingsCount": <integer or null>,
    "stackDetected": "...",
    "inlineCount": <integer or null>
  }
}
```

## Workflow (per command using it)

1. **At command start:** generate UUID, write sentinel entry. Stash UUID + start time in agent memory for the duration.
2. **At command end:** write terminal entry with the same UUID. Outcome reflects what actually happened.

## Rules

- Atomic append: open file with `a` flag (single open + write + close). Never rewrite.
- If write fails, do NOT abort the command — log to stderr and continue.
- No PII. No source content. Just shape + count + UUID.
```

- [ ] **Step 16.2: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/session-logger
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(self-evolve): add session-logger SKILL"
```

---

### Task 17: Friction-logger SKILL + triggers

**Files:**
- Create: `plugins/vibe-prompt/skills/friction-logger/SKILL.md`
- Create: `plugins/vibe-prompt/skills/friction-logger/references/friction-triggers.md`

- [ ] **Step 17.1: Create reference directory**

```powershell
New-Item -ItemType Directory -Path "C:\Users\estev\Projects\Vibe-Prompt\plugins\vibe-prompt\skills\friction-logger\references" -Force
```

- [ ] **Step 17.2: Write the friction-logger SKILL**

```markdown
---
name: vibe-prompt:friction-logger
description: Internal SKILL — not a slash command. Append-only friction capture for Vibe-Prompt. Invoked by every command SKILL at the triggers listed in `references/friction-triggers.md`. Part of Level 2 of the Self-Evolving Plugin Framework.
---

# Friction logger (internal)

Append-only JSONL log of friction events. Used by `/vibe-prompt:evolve-prompt` to propose improvements.

## Storage

File path: `~/.claude/plugins/data/vibe-prompt/friction.jsonl`. Append-only.

## Entry shape

```json
{
  "timestamp": "<ISO 8601>",
  "sessionUUID": "<from session-logger>",
  "command": "scan | audit | router | evolve-prompt",
  "trigger": "<one of the codes in friction-triggers.md>",
  "confidence": "low | medium | high",
  "context": {
    "<trigger-specific fields>"
  }
}
```

## Workflow

1. When a command hits one of the triggers in `references/friction-triggers.md`, append a friction entry.
2. Confidence is set per trigger in that reference file — agents do NOT tune per-call.

## Rules

- Atomic append.
- No source content. Only paths, counts, and trigger codes.
- If a single command fires the same trigger multiple times, log once with `context.occurrences` count.
```

- [ ] **Step 17.3: Write `references/friction-triggers.md`**

```markdown
# Friction triggers — vibe-prompt

Single source of truth for which command logs which friction at which confidence. Agents do NOT tune per call.

## scan triggers

| Trigger code | Confidence | When |
|---|---|---|
| `no-recognized-stack` | high | No `package.json` AND no `pyproject.toml`/`requirements.txt` |
| `registry-detected-but-empty-entries` | high | Registry found, but extraction yielded zero entries |
| `model-identifier-unrecognized` | high | Model string matches no published-model regex (per F6 list) |
| `low-confidence-detections-over-40pct` | medium | More than 40% of inline detections are low-confidence (per persona-extraction.md §confidence) |
| `inline-prompt-without-fallback-aggregate` | low | At least 3 inline sites with no fallback (logged once per scan) |

## audit triggers

| Trigger code | Confidence | When |
|---|---|---|
| `f6-suspect-model-detected` | high | F6 fires with the suspect-model variant |
| `f2-contradiction-cross-file-attempted` | medium | F2 detection surfaced a likely contradiction but the 1-hop trace couldn't fully resolve it |
| `rubric-default-recommendation-felt-generic` | medium | Agent's self-read of the just-rendered recommendation says it lacks app-specific detail |
| `inventory-schema-violation` | high | inventory.json failed schema validation on read |

## router triggers

| Trigger code | Confidence | When |
|---|---|---|
| `audit-older-than-14-days` | low | Posture branch detects stale audit |

## evolve-prompt triggers

| Trigger code | Confidence | When |
|---|---|---|
| `no-sessions-in-30-days` | low | Insufficient data to make any proposal |
```

- [ ] **Step 17.4: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/friction-logger
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(self-evolve): add friction-logger SKILL + triggers reference"
```

---

### Task 18: Evolve-prompt SKILL + command

**Files:**
- Create: `plugins/vibe-prompt/skills/evolve-prompt/SKILL.md`
- Create: `plugins/vibe-prompt/commands/evolve-prompt.md`

- [ ] **Step 18.1: Write the evolve SKILL** (modeled on `vibe-iterate:evolve-iterate`)

```markdown
---
name: vibe-prompt:evolve-prompt
description: This skill should be used when the user says "/vibe-prompt:evolve-prompt" and wants Vibe-Prompt to reflect on past sessions and propose improvements to itself. Reads ~/.claude/plugins/data/vibe-prompt/ session + friction logs, weights findings, writes proposed SKILL/rubric/heuristic edits to docs/proposed-changes.md in the Vibe-Prompt solo repo. Never auto-applies. L3 self-evolution.
---

# /vibe-prompt:evolve-prompt

Reflect on the last N days of Vibe-Prompt usage and propose changes to the plugin itself.

## Inputs

- `~/.claude/plugins/data/vibe-prompt/sessions.jsonl`
- `~/.claude/plugins/data/vibe-prompt/friction.jsonl`
- `~/.claude/plugins/data/vibe-prompt/wins.jsonl` (if exists in v0.2+)
- Default window: last 30 days. CLI arg `--days N` overrides.

## Workflow

1. **Pre-flight.** session-logger start. If `sessions.jsonl` has zero entries in the window, friction-log `no-sessions-in-30-days` and exit.
2. **Weight friction.** Group by trigger code. Score: `count × confidenceWeight` where confidenceWeight = {high: 3, medium: 2, low: 1}.
3. **Surface patterns.** Top 5 triggers by score. For each, identify which SKILL/reference document needs revision.
4. **Propose changes.** Write `docs/proposed-changes.md` in the Vibe-Prompt solo repo (NOT the target app — this proposes changes to the plugin itself). One section per pattern:
   - **Pattern:** trigger code + count + score
   - **Affected:** which SKILL or reference file
   - **Proposed change:** concrete prose diff (existing text → proposed text)
   - **Confidence:** the agent's self-confidence in the proposal
5. **Banner.** ≤ 20 lines. Top 3 patterns. Path to `proposed-changes.md`.
6. **Post-flight.** session-logger terminal.

## Rules

- **Never auto-apply.** Output is always a diff proposal for human review.
- If a pattern's score is below 5 (i.e., low signal), include in proposed-changes but flag as low-confidence.
- Respect the absence-of-friction-inference rule: if a SKILL fires zero friction in 30 days of regular use, that's a positive signal worth noting (don't propose changes to working SKILLs).
```

- [ ] **Step 18.2: Write the command file**

```markdown
---
description: Reflect on past Vibe-Prompt sessions and propose self-improvements. Reads session + friction logs, writes proposed-changes.md. Never auto-applies.
---

Invoke the `vibe-prompt:evolve-prompt` skill.
```

- [ ] **Step 18.3: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/skills/evolve-prompt plugins/vibe-prompt/commands/evolve-prompt.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "feat(self-evolve): add evolve-prompt SKILL + command"
```

---

## Phase 6 — Tests, polish, ship

### Task 19: Validation test scripts

**Files:**
- Create: `plugins/vibe-prompt/tests/validate-schemas.sh`
- Create: `plugins/vibe-prompt/tests/check-skill-references.sh`

- [ ] **Step 19.1: Write `validate-schemas.sh`** (modeled on Vibe-Iterate's pattern)

```bash
#!/usr/bin/env bash
# Validate JSON schemas parse + at least one fixture per schema passes.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMAS_DIR="$PLUGIN_ROOT/schemas"
FIXTURES_DIR="$PLUGIN_ROOT/tests/fixtures"

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

- [ ] **Step 19.2: Write `check-skill-references.sh`**

```bash
#!/usr/bin/env bash
# Verify every reference link in every SKILL.md points to an existing file.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$PLUGIN_ROOT/skills"

PASS=0
FAIL=0

# Find all SKILL.md files
while IFS= read -r skill_md; do
    skill_dir="$(dirname "$skill_md")"
    # Extract references/*.md links
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

- [ ] **Step 19.3: Make scripts executable**

```bash
chmod +x plugins/vibe-prompt/tests/*.sh
```

- [ ] **Step 19.4: Run both tests, verify green**

```bash
bash plugins/vibe-prompt/tests/validate-schemas.sh
bash plugins/vibe-prompt/tests/check-skill-references.sh
```

Expected: `0 fail` from both.

- [ ] **Step 19.5: Commit**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt/tests
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "test: add schema validation + skill-reference checks"
```

---

### Task 20: Final round-trip on Celestia3

- [ ] **Step 20.1: Full clean round-trip**

Delete `Celestia3/.vibe-prompt/` and `Celestia3/docs/vibe-prompt/`. From a Claude Code session at Celestia3:

1. Invoke `/vibe-prompt` (bare) → expect first-run banner.
2. Confirm scan → expect inventory matching gold standard (per Task 8 targets).
3. Invoke `/vibe-prompt:audit` → expect audit matching gold standard (per Task 13 targets).
4. Invoke `/vibe-prompt` (bare again) → expect posture summary branch.

- [ ] **Step 20.2: Diff the audit report against the gold standard**

```powershell
$generated = Get-Content "C:\Users\estev\Projects\Celestia3\docs\vibe-prompt\audit-2026-05-28.md" -Raw
$gold = Get-Content "C:\Users\estev\Projects\Celestia3\docs\prompt-audit-2026-05-28.md" -Raw

# Confirm all 7 finding IDs appear
@("F1","F2","F3","F4","F5","F6","F7") | ForEach-Object {
    if ($generated -match "##\s+$_\s") { "$_ : PASS" } else { "$_ : FAIL (missing)" }
}
```

Expected: all 7 PASS.

- [ ] **Step 20.3: Commit any final SKILL adjustments**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add plugins/vibe-prompt
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "fix: final SKILL polish from full round-trip"
```

---

### Task 21: Tag v0.1.0 + push solo repo

- [ ] **Step 21.1: Update CHANGELOG.md** — change `Unreleased — v0.1.0` heading to `v0.1.0 — 2026-MM-DD`.

- [ ] **Step 21.2: Commit CHANGELOG**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" add CHANGELOG.md
git -C "C:\Users\estev\Projects\Vibe-Prompt" commit -m "chore(release): v0.1.0"
```

- [ ] **Step 21.3: Create the GitHub repo via gh CLI**

```powershell
gh repo create estevanhernandez-stack-ed/Vibe-Prompt --public --source "C:\Users\estev\Projects\Vibe-Prompt" --remote origin --push
```

- [ ] **Step 21.4: Tag and push v0.1.0**

```powershell
git -C "C:\Users\estev\Projects\Vibe-Prompt" tag v0.1.0
git -C "C:\Users\estev\Projects\Vibe-Prompt" push origin v0.1.0
```

- [ ] **Step 21.5: Verify the tag resolves on GitHub**

```powershell
gh api repos/estevanhernandez-stack-ed/Vibe-Prompt/git/refs/tags/v0.1.0
```

Expected: JSON response with the tag's SHA. No 404.

---

### Task 22: Marketplace ref bump (in vibe-plugins)

**Files:**
- Modify: `C:\Users\estev\Projects\vibe-plugins\.claude-plugin\marketplace.json`

- [ ] **Step 22.1: Verify pwd before editing** (per CLAUDE.md hygiene rule #2)

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" status
```

- [ ] **Step 22.2: Add the vibe-prompt entry to marketplace.json**

Insert this entry into the `plugins` array (alphabetical position — between `vibe-keystone` and `vibe-sec`, OR end of array — pick to match existing ordering):

```json
{
  "name": "vibe-prompt",
  "description": "Audit, organize, and classify the LLM prompts shipped in your app. Static inventory + 7-smell audit (F1-F7) over registry-tracked and inline prompt sites. TS/JS + Python coverage. No behavioral eval, no auto-mutation, no telemetry. Validated against Celestia3 (16 sites, 8 personas, 7 findings).",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Prompt",
    "path": "plugins/vibe-prompt",
    "ref": "v0.1.0"
  }
}
```

- [ ] **Step 22.3: Verify the ref resolves**

```powershell
gh api repos/estevanhernandez-stack-ed/Vibe-Prompt/git/refs/tags/v0.1.0
```

Expected: 200 OK.

- [ ] **Step 22.4: Commit + push the marketplace bump**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" add .claude-plugin/marketplace.json
git -C "C:\Users\estev\Projects\vibe-plugins" commit -m "feat(marketplace): add vibe-prompt (git-subdir, v0.1.0)"
git -C "C:\Users\estev\Projects\vibe-plugins" push origin main
```

- [ ] **Step 22.5: Update vibe-plugins CLAUDE.md plugin table** (mirror, not source-of-truth, but should match)

Edit the plugin table in `C:\Users\estev\Projects\vibe-plugins\CLAUDE.md` to add the `vibe-prompt` row. Increment the "X plugins" count.

- [ ] **Step 22.6: Final commit**

```powershell
git -C "C:\Users\estev\Projects\vibe-plugins" add CLAUDE.md
git -C "C:\Users\estev\Projects\vibe-plugins" commit -m "docs(claude-md): list vibe-prompt + bump plugin count"
git -C "C:\Users\estev\Projects\vibe-plugins" push
```

---

## Phase 7 — Log + close out

### Task 23: 626Labs Dashboard decision log

- [ ] **Step 23.1: Log the ship decision**

Use `mcp__626labs__manage_decisions` with action `log`. Tag with the bound project ID (or `projectId: null` + description `vibe-plugins` if unbound).

Decision content:
```
vibe-prompt v0.1.0 shipped 2026-MM-DD.

What's in: /vibe-prompt:scan + /vibe-prompt:audit + bare router + evolve-prompt + session/friction loggers. Stack coverage: TS/JS + Python. F1-F7 rubric.

Why now: Cowpath on Celestia3 surfaced 7 findings + 16 sites + 8 personas in one read. The static-audit shape generalized cleanly from that evidence.

Validation: round-tripped against the Celestia3 gold-standard audit (docs/prompt-audit-2026-05-28.md). All 7 findings reproduced with correct severity.

Not in v0.1: behavioral eval (future vibe-eval), auto-mutation, classify-as-standalone-command (v0.2), reorg command (v0.3).
```

- [ ] **Step 23.2: Update memory in vibe-plugins project memory**

Add a memory entry at `C:\Users\estev\.claude-personal\projects\C--Users-estev-Projects-vibe-plugins\memory\` for the new plugin (one-liner in MEMORY.md + small file).

---

## Self-review

Reviewing the plan against the spec before handoff:

**Spec coverage check:**
- §1 Identity → Task 1.4 (README) covers.
- §2 Out of scope → README + audit SKILL guardrails (no LLM invocation, no mutation) covered in Tasks 6.1, 11.1.
- §3 Cowpath evidence → not a build artifact; referenced in plan header.
- §4 v0.1 surface (scan, audit, router, evolve, internal loggers) → Tasks 6, 11, 14, 18, 16, 17.
- §5 F1-F7 rubric → Task 9.2.
- §6 Detection heuristics → Task 5.2.
- §7 Classification dimensions → embedded in inventory schema (Task 4.1) + rubric (Task 9.2).
- §8 Interview gates → covered in scan + audit SKILL workflow prose.
- §9 State paths → Task 4 (schemas), Tasks 6 + 11 (atomic writes).
- §10 Self-evolution hooks → Tasks 16, 17, 18.
- §11 Validation plan → Tasks 8, 13, 20.
- §12 Versioning + tag naming → Tasks 21, 22.
- §13 Future scope → not built in v0.1, but README sets expectations.
- §14 Open questions → resolved with defaults baked into rubric reference (Task 9.2).

**Placeholder scan:** No "TBD", no "implement later", every step contains exact paths/content/commands.

**Type/name consistency:** `inventory.json` shape used in scan SKILL (Task 6.1) matches schema (Task 4.1). `audit.json` shape used in audit SKILL (Task 11.1) matches schema (Task 4.2). State paths `.vibe-prompt/state/` consistent across all tasks. Friction-trigger codes referenced in scan/audit SKILLs all appear in `friction-triggers.md` (Task 17.3).

**Scope:** Plan covers v0.1 only. v0.2+ commands (`classify`, `reorg`) explicitly deferred. No gold-plating.

Plan is internally consistent and spec-complete.
