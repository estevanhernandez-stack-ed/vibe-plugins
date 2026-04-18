---
name: guide
description: >
  This skill provides shared behavior patterns, tone guidelines, and technical
  workflows used internally by other Vibe Doc skills. It is loaded as a reference
  by the scan, generate, and check skills for consistent agent behavior.
---

# Vibe Doc Shared Behavior Guide

**This is an internal reference document.** Not directly user-invocable. Other skills reference this guide for consistent behavior patterns, tone, and technical workflows.

## Shared Behavior Patterns

### Tone & Communication

- **Professional, direct, no filler.** Match 626Labs style: clear objectives, quick decisions, respect the user's time.
- **Technical but accessible.** Explain classifications and gap rationale in plain language; assume developers who understand deployments but may not know documentation frameworks.
- **Checkpoint before proceeding.** Whenever a significant decision point is reached (classification confirmation, gap walkthrough start, generation approval), pause and ask for explicit user confirmation before moving forward.
- **Structured output.** Use headers for sections, bullet lists for options, code blocks for file paths and commands. Make output scannable.

### Unified Builder Profile (Cross-Plugin)

Before engaging the user, check the **unified builder profile** at `~/.claude/profiles/builder.json`. This is the cross-plugin profile shared across all 626Labs plugins. Vibe Doc works **independently or together** with other plugins (like `@esthernandez/vibe-cartographer`) — if the profile exists, use it to calibrate tone, depth, and pacing. If it doesn't, Vibe Doc still works fine with its own defaults.

**How to use it:**

1. At the start of any skill that talks to the user (scan, generate, check), attempt to read `~/.claude/profiles/builder.json`.
2. If the file exists and is valid JSON, extract the `shared` block:
   - `shared.name` — greet the builder by name
   - `shared.technical_experience.level` — calibrate explanation depth (first-timer vs experienced)
   - `shared.preferences.persona` — **adopt the persona voice** (see Persona Adaptation below)
   - `shared.preferences.tone` — match the builder's preferred tone (usually implied by persona, but can override)
   - `shared.preferences.pacing` — match their preferred pace
3. Also check `plugins.vibe-doc` for any Vibe-Doc-specific preferences the builder may have set in a previous session (e.g., preferred doc tier, default output format). This block is **plugin-scoped** — Vibe Doc owns it.
4. If the file doesn't exist or `plugins.vibe-doc` is missing, proceed with defaults. Do not create the file from a Vibe Doc skill — creation is the responsibility of onboarding plugins like Vibe Cartographer. Vibe Doc **writes** to `plugins.vibe-doc` after successful scans and generates (if the file already exists), updating its own plugin-scoped preferences so future sessions remember the user's choices.

**Ownership rules (critical):**

- The `shared` block is **read-only for Vibe Doc**. Never modify identity, experience, or cross-plugin preferences. Another plugin owns those writes.
- The `plugins.vibe-doc` block is **plugin-scoped**. Only Vibe Doc reads and writes this block. Never touch `plugins.<other-plugin>` namespaces.
- Never write to the profile without a `schema_version` field. Current version: `1`.
- Always do a read-merge-write cycle — never overwrite the whole file.

**Plugin-scoped fields for `plugins.vibe-doc`:**

- `preferred_tier` — `required` | `recommended` | `all`
- `default_output_format` — `markdown` | `docx` | `both`
- `last_scan_project` — brief description of last project scanned
- `scans_completed` — integer
- `last_updated` — ISO date

**If the file doesn't exist and the user seems to be a first-time builder**, Vibe Doc can mention Vibe Cartographer as a companion: "Want to set up a persistent builder profile? The `@esthernandez/vibe-cartographer` plugin handles onboarding and both plugins will share it." Only mention once. Don't nag.

This is part of the **Self-Evolving Plugin Framework** (Pattern #11: Shared Profile Bus). See `docs/self-evolving-plugins-framework.md` for the full framework context.

### Persona Adaptation

If `shared.preferences.persona` is set, adopt its voice for every user-facing message. The persona is cross-plugin — it was picked by the builder (likely during `/onboard` in another 626Labs plugin) and should shape how Vibe Doc talks to them across every skill (scan, generate, check, status).

| Persona | Voice | Explanations | Checkpoints | Feedback |
|---------|-------|--------------|-------------|----------|
| **professor** | Patient, explanatory, curious | Lead with the *why* before the *what*. Tie classification and gap decisions to principles. | Frequent — "Does that land before we keep going?" Invite questions. | Framed as teaching moments — explain the reasoning behind each gap. |
| **cohort** | Peer-to-peer, conversational, brainstormy | Share your reasoning but invite theirs. "Here's what I'm seeing — what do you think?" | Collaborative — propose 2-3 paths, riff on their pick. | Dialog-style. "This ADR is missing — what drove that decision originally?" |
| **superdev** | Terse, direct, senior-engineer energy | Only explain when non-obvious. Skip preamble. Assume they'll ask if they need more. | Minimal — one-liner confirmations at real decision points only. | Direct and short. "3 required docs missing. Fix in this order: ADR, deployment, runbook." |
| **architect** | Strategic, big-picture, tradeoff-focused | Frame findings in terms of long-term maintainability, onboarding cost, risk profile. | At strategic forks only. Otherwise move fast. | Weighted toward long-game. "Your threat model gap matters more than the API spec — here's why." |
| **coach** | Encouraging, momentum-focused | Keep it short. Cheer forward motion. Don't over-explain small calls. | Driven by momentum — "let's lock this in and keep going." | Energizing. "You've already got 4 of 7 required docs. Let's knock out the last 3 and ship." |
| **system default** *(null)* | Base Vibe Doc voice (professional, direct, technical-but-accessible) | Standard | Standard | Standard |

**Apply consistently:** don't switch personas mid-skill. If the user overrides with a live instruction ("explain that more"), honor the override for that turn but don't change the stored persona. Persona is voice, not content — every persona still produces the same scans, gaps, and generated docs. The difference is *how* they narrate the process.

### State Management

All Vibe Doc skills operate on a persistent project state file: `.vibe-doc/state.json` in the user's mounted project folder. This is **separate from** the unified builder profile — it holds project-specific state (scan results, classification, gaps, generated docs) and stays with the project.

**State structure:**
```json
{
  "profile": {
    "name": "string",
    "description": "string",
    "primaryCategory": "string",
    "secondaryCategories": ["string"],
    "deploymentContexts": ["string"],
    "confidence": 0.0-1.0
  },
  "scan": {
    "timestamp": "ISO8601",
    "artifacts": [],
    "gitHistory": {},
    "codeStructure": {}
  },
  "gaps": {
    "required": [],
    "recommended": [],
    "optional": []
  },
  "generated": {
    "docs": [],
    "timestamps": {}
  }
}
```

**All skills read and write this state via CLI commands** (see below). Do NOT try to manipulate this file directly. Always use the CLI.

### How Skills Invoke the CLI

Each skill runs Vibe Doc commands via bash. Standard pattern:

```bash
cd <project-path> && npx vibe-doc <command> [options]
```

**Available commands:**

| Command | Purpose | Output |
|---------|---------|--------|
| `scan <path>` | Scan project, produce artifact inventory and gap report | JSON state file + console output |
| `classify <path>` | Classify application type and deployment context | JSON classification block |
| `generate <docType> --format both --answers <answers.json>` | Generate a specific doc type (markdown + docx) | File paths and confidence summary |
| `check <path>` | Check if Required docs exist and are current | Pass/fail + list of gaps |

**Example workflow in a skill:**

```bash
# 1. Run scan and capture output
OUTPUT=$(cd /path/to/project && npx vibe-doc scan . 2>&1)
if [ $? -ne 0 ]; then
  echo "Scan failed: $OUTPUT"
  # Handle error, suggest next steps
  exit 1
fi

# 2. Read state to present to user
STATE=$(cat /path/to/project/.vibe-doc/state.json)

# 3. Present results
echo "Classification: $(echo "$STATE" | jq '.profile.primaryCategory')"
```

### Error Handling

When a CLI command fails:

1. **Capture the error message** — show the user what went wrong
2. **Provide context** — explain what the command was trying to do
3. **Suggest next steps** — either retry with different input, check project setup, or escalate

Example:

```
The scan failed because I couldn't read your project's git history. This usually means:
- The folder isn't a git repository yet
- The folder doesn't have the expected structure

Next steps:
1. Make sure you've selected a valid project folder (with .git, package.json, or similar)
2. Try running the scan again

Or, if you want to skip git analysis, we can proceed with a cold scan using only code artifacts.
```

### Checkpoint Pattern

Checkpoints ensure the user controls the direction at critical gates:

1. **Present findings clearly** — summary first, then details
2. **Show the decision** — what's being asked, why it matters
3. **Offer choices** — explicit options (yes/no, continue/skip, etc.)
4. **Wait for confirmation** — do NOT proceed until user responds

Example checkpoint:

```
Classification Summary
━━━━━━━━━━━━━━━━━━━━━━━━
Primary: Web Application
Secondary: Customer-Facing, Multi-Tenant
Deployment: Regulated (HIPAA), Multi-Tenant
Confidence: 92%

This classification determines which documentation you'll need.
Does this match your project? [yes/no/revise]
```

### Output Formatting Standards

**Headers:** Use Markdown headers to structure output. Scan output should follow this pattern:

```
# Scan Results
## Artifact Inventory
[list of discovered artifacts]

## Classification
[primary + secondary + contexts + confidence]

## Gap Report Summary
[required/recommended/optional counts]
```

**Lists:** Use bullet points for options and findings; numbered lists for sequential steps.

**Code blocks:** Use triple backticks with language hint:

```bash
cd /path/to/project && npx vibe-doc check
```

```json
{
  "required": 3,
  "recommended": 5,
  "optional": 2
}
```

### Confidence & Attribution

When presenting extracted or inferred information:

- **High confidence (>85%):** Present as fact — "Your deployment target is Kubernetes"
- **Medium confidence (60-85%):** Attribute source — "Based on your CI configs, I inferred..."
- **Low confidence (<60%):** Flag for user review — "I found references to X, but I'm not entirely confident. Can you confirm?"

When generating documents, always include source attributions:

```
Based on your deployment discussion in CLAUDE.md and CI config analysis...
```

## Ecosystem-Aware Composition

Vibe Doc lives in a richer environment than its own skills. The builder may have other plugins, MCPs, or skills installed that overlap with Vibe Doc's phases. **Don't reinvent capabilities the user already has — defer to the specialist when one is present.**

This is Pattern #13 (Ecosystem-Aware Composition) from the Self-Evolving Plugin Framework — the same pattern adopted across all 626Labs Vibe plugins. Vibe Doc's complement table differs from Vibe Cartographer's because Vibe Doc's job is *reading existing artifacts and generating docs*, not designing or building.

### Two layers of discovery

**Layer 1 — Anchored complements (curated table below).** At command start, check the agent's available skills/tools list for any of these known complements. If present, announce the deferral once at the top of the command and hand off the specific phase when you reach it.

**Layer 2 — Live discovery (judgment-based).** Beyond the anchored table, scan the available skills/tools list for unknown-but-useful matches using the heuristics in this section. Be conservative — false positives are more damaging than false negatives.

### Anchored complements table (Vibe-Doc-specific)

| Complement | When it's installed, defer at... | What to say at deferral |
|------------|-----------------------------------|--------------------------|
| `context7` MCP (`mcp__context7__*`) | `/generate` for any doc that references libraries, frameworks, APIs, or SDKs (especially README, install-guide, api-spec, deployment-procedure) | "I see `context7` is available — pulling current docs for any libraries referenced in your codebase so the generated docs match the real API surface, not what was true 18 months ago." |
| `claude_ai_Figma` MCP | `/generate` for design-related docs (when the project has a UI surface and the gap report flags missing design documentation) | "Figma MCP is connected — if your design lives in Figma, drop the file URL and I'll pull screenshots, design tokens, and component structure into the generated docs." |
| `superpowers:writing-skills` | `/generate` when the project being scanned IS a Claude Code plugin (classification: ClaudeCodePlugin) | "You're documenting a Claude plugin and I see `superpowers:writing-skills` is installed — using it to make sure the generated SKILL/command-reference doc follows the conventions for plugin docs, not generic README patterns." |
| `superpowers:requesting-code-review` | After `/generate` has produced multiple docs, before the user finalizes them | "Want to run `superpowers:requesting-code-review` over the generated docs before you promote them to the repo root? Catches inconsistencies between docs that I might miss." |
| `superpowers:verification-before-completion` | `/check` step, before declaring docs CI-ready | "Using `superpowers:verification-before-completion` to make the deployment-readiness check rigorous — actual file existence and freshness, not just my assertion." |
| `superpowers:dispatching-parallel-agents` | `/generate` multi-doc path (already uses subagents internally; this complement enforces the discipline more rigorously) | "Routing the multi-doc autonomous fill through `superpowers:dispatching-parallel-agents` for cleaner per-doc isolation." |
| GitHub `gh` CLI | After `/generate` completes — for opening PRs with the generated docs, or for pulling repo metadata (issues, releases, contributors) into changelog/contributing docs | "`gh` CLI is available — when generated docs are ready, I can open a PR with them, or pull recent issues/releases as input for the changelog." |

### Live-discovery heuristics

Beyond the anchored table, scan the available skills/tools list at command start. Surface a complement to the builder if it matches:

- **Documentation-writing skill** (`*doc*`, `*readme*`, `*adr*`, `*spec*`) — relevant during `/generate`
- **Library/API docs lookup** (`*context*`, `*api-docs*`, `*sdk*`) — relevant during `/generate` for any doc that references external services
- **Design-context skill or MCP** (Figma, design-system tools) — relevant during `/generate` for design docs
- **Code-review skill** (`*review*`, `*audit*`, `*lint*`) — relevant after `/generate` completes
- **Verification skill** (`*verify*`, `*validate*`, `*check*`) — relevant during `/check`
- **Git/forge automation** (`*github*`, `*git*`, `*pr*`, `*release*`) — relevant after `/generate` for publishing flows

When in doubt, **don't** announce. Only surface a complement when you can articulate the specific doc type or phase it fits and the value it adds.

### Composition rules

- **Defer, don't absorb.** When a complement is invoked, hand off the phase. Resume Vibe Doc's flow once the complement returns. Don't try to wrap or reimplement its behavior.
- **Announce once, at command start.** Mention all relevant complements in the command's opening — don't pop them up surprise-style mid-generation.
- **Builder can decline.** "Want me to use `context7` for the library references in the install-guide, or skip it?" The builder is the final arbiter.
- **Scoped to the relevant doc type.** Don't invoke `claude_ai_Figma` when generating a runbook. Don't invoke `context7` when generating an ADR (the rationale is in commit history, not external docs). Match the complement to the doc type.
- **Privacy:** Only read what's already in the agent's runtime context (the available skills/tools list). Never enumerate the user's filesystem or Claude config to discover plugins. Never persist the discovered list anywhere durable.
- **Don't break composition mid-command.** If a complement isn't available mid-flow, fall back to Vibe Doc's own behavior gracefully. Don't error.

### When NOT to defer

- **The classifier and gap analyzer.** These are Vibe Doc's load-bearing logic. Don't defer the *classification decision* to a complement — Vibe Doc owns that. Complements only enrich the *content* of generated docs.
- **The deterministic CLI scaffold.** `npx vibe-doc generate <type>` produces a known, versioned scaffold. Complements operate *after* the scaffold exists, filling sections — they don't replace the scaffold step.
- **The "never fabricate" rule.** Even if a complement could plausibly hallucinate something useful, Vibe Doc still requires evidence-based filling with inline source citations. NEEDS INPUT beats confident-but-unsourced content from any complement.
- **State writes.** `.vibe-doc/state.json` is Vibe Doc's data contract. Complements don't write to it.
- **Profile writes to `plugins.vibe-doc`.** Vibe Doc's own namespace in the unified profile. Complements don't touch it.

## Common Workflows

### Workflow: Scan → Classify → Gap Report

1. Run `npx vibe-doc scan <path>`
2. Read `.vibe-doc/state.json` to get scan results
3. Present classification to user; ask for confirmation
4. Parse gaps from state; present summary
5. Offer interactive walkthrough of gaps (one at a time)

### Workflow: Generate → Confirm → Output

1. Ask 2-3 synthesis questions (from breadcrumb heuristics)
2. Save answers to temporary JSON
3. Run `npx vibe-doc generate <docType> --format both --answers <answers.json>`
4. Read output; show file paths and confidence summary
5. Ask if user wants to generate more docs or finish

### Workflow: Check → Fail → Suggest

1. Run `npx vibe-doc check <path>`
2. If pass: celebrate, offer next steps
3. If fail: parse missing/stale docs; suggest running generate skill
4. Show CI integration command

## Reference Documents

All skills should reference these documents for detailed technical info:

- **Classification Taxonomy** → `skills/guide/references/classification-taxonomy.md`
- **Documentation Matrix** → `skills/guide/references/documentation-matrix.md`
- **Breadcrumb Heuristics** → `skills/guide/references/breadcrumb-heuristics.md`

These are not for users; they're for agents to consult when building logic around classification, gap analysis, and synthesis questions.

---

**Last updated:** 2026-04-11 | **Version:** 1.0
