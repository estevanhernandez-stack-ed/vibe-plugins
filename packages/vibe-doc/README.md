# Vibe Doc

AI-powered documentation gap analyzer for modern codebases. Scan your project, identify missing technical documentation, and generate professional docs from your existing artifacts in minutes.

## The Problem

Vibe coding produces real artifacts fast — working code, architecture decisions, test suites, deployment configs. But corporate documentation requirements don't care about your momentum. You need ADRs, runbooks, threat models, API specs, and deployment procedures. Writing them by hand is bureaucratic overhead. Ignoring them is a shipping risk.

Vibe Doc bridges the gap. It analyzes what you've actually built, finds the documentation holes, and generates the docs you need.

## How It Works

Vibe Doc operates in four stages:

1. **Scan** — Walk your codebase. Extract artifacts, identify patterns, build a project profile.
2. **Classify** — Hybrid classifier (rules + LLM) determines your project type and architecture patterns.
3. **Gap Analysis** — Cross-reference your artifacts against the 7-doc v1 standard. Generate a prioritized gap report.
4. **Generate** — Create missing docs from your existing code, configs, and conversations.

The dual-layer design means you get intelligent recommendations in conversations (Skills) and deterministic, reproducible outputs from the CLI.

## Installation

Pick whichever matches how you're running Claude Code. All three lead to the same plugin working.

### Option 1: Claude Desktop — Add marketplace (recommended)

The cleanest install. Pulls straight from GitHub, no file download, supports `Sync` to update.

1. Open Claude Desktop → **Personal plugins** panel
2. Click the **+** button → **Add marketplace**
3. Enter: `estevanhernandez-stack-ed/Vibe-Doc`
4. Click **Sync**

Claude Desktop reads `.claude-plugin/marketplace.json` at the repo root and loads the `vibe-doc` plugin from inside `./packages/vibe-doc`. The slash commands (`/scan`, `/generate`, `/check`, `/status`) become available.

### Option 2: Claude Code CLI + terminal CLI — npm

The only path that gives you both the Claude Code plugin surface **and** a standalone `vibe-doc` binary you can run from any terminal.

```bash
npm install -g @esthernandez/vibe-doc
vibe-doc --version
# 0.3.0
```

Now you can run Vibe Doc either conversationally via Claude Code slash commands (install Option 1 alongside this), or deterministically from any shell:

```bash
cd ~/Projects/my-app
vibe-doc scan
vibe-doc generate adr
vibe-doc check --threshold 20
```

The dual-layer design means CI/CD pipelines use the CLI (reproducible, no conversational loop), and interactive sessions use the skills (agent-interviewed, conversational fill).

### Option 3: Claude Desktop — Upload plugin (for local iteration)

For testing plugin changes locally before pushing to GitHub.

1. Clone the repo: `git clone https://github.com/estevanhernandez-stack-ed/Vibe-Doc`
2. Build a `.plugin` bundle:

   ```bash
   python scripts/build-plugin.py
   ```

   This writes `bundles/vibe-doc-<version>.plugin` — a zip archive Cowork accepts directly. The script excludes `dist/`, `node_modules/`, and other runtime artifacts per Cowork's plugin spec.
3. In Claude Desktop → **Personal plugins** → **+** → **Upload plugin**, pick the `.plugin` file.

You can also download a pre-built `.plugin` file from the [GitHub releases page](https://github.com/estevanhernandez-stack-ed/Vibe-Doc/releases) — each tagged release ships a ready-to-upload asset.

### Which option should I use?

| Situation                                                    | Option                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| I want to use Vibe Doc conversationally in Claude Desktop    | **Option 1** (Add marketplace)                                |
| I want the `vibe-doc` CLI available in my terminal / CI / IDE | **Option 2** (npm) — pair with Option 1 for full coverage    |
| I'm developing or testing plugin changes locally             | **Option 3** (Upload plugin)                                  |
| I want to install without an internet connection             | **Option 3** — download `.plugin` from releases ahead of time |

## Quick Start

### Step 1: Scan Your Project

```bash
/scan
# or via CLI:
npx vibe-doc scan
```

Vibe Doc examines your codebase, classifies your architecture, and generates a gap report showing which docs are missing and their priority.

### Step 2: Review Gaps

The gap report categorizes findings by three tiers:
- **Required** — Essential for shipping (ADRs, deployment procedures)
- **Recommended** — Professional standard (runbooks, API specs, threat models)
- **Optional** — Nice-to-have (test plans, data models)

### Step 3: Generate

```bash
/generate
# or via CLI:
npx vibe-doc generate
```

Select which gaps to fill, review the generated docs, and refine them in conversation. Export to your repository.

## Available Skills

**Scan Skill**
Analyzes your project structure, detects architecture patterns, and generates a comprehensive gap report. Classifies your codebase (backend service, frontend app, monorepo, etc.) and identifies which documents are missing.

**Generate Skill**
Creates professional documentation from your artifacts. Takes scan results, your input on specific areas, and generates high-quality ADRs, runbooks, threat models, API specs, deployment procedures, test plans, and data models.

**Check Skill**
Validates that your documentation meets deployment requirements. Ensures all Required-tier docs exist, formatting is correct, and docs are up-to-date with current artifacts.

## Available Commands

`/scan` — Scan your project for documentation gaps and generate a report.

`/generate` — Generate missing documentation based on scan results.

`/check` — Validate documentation completeness for deployment readiness.

`/status` — Display current Vibe Doc state and recent activity.

## CLI Usage

```bash
# Scan your project
npx vibe-doc scan

# Generate documentation
npx vibe-doc generate

# Check deployment readiness
npx vibe-doc check

# Show status
npx vibe-doc status

# View available templates
npx vibe-doc templates
```

## Document Types (v1 Standard)

Vibe Doc generates seven core document types:

**Architecture Decision Record (ADR)**
Captures why a major architectural choice was made, its context, and trade-offs. Essential for onboarding and future decisions.

**Runbook**
Step-by-step operational procedures: deployment, incident response, disaster recovery, scaling. Keeps your ops team sane at 3am.

**Threat Model**
Security analysis of your system. What can go wrong? What are the attack surfaces? What's the risk profile?

**API Specification**
OpenAPI 3.0 or equivalent. Every endpoint, schema, auth method, error code. The contract between frontend and backend.

**Deployment Procedure**
How code gets from your laptop to production. Environments, prerequisites, rollback strategy, validation steps.

**Test Plan**
Unit, integration, E2E coverage strategy. What gets tested, what's out of scope, how you validate quality gates.

**Data Model**
Database schema, relationships, constraints, indexes. The shape of your state.

## Architecture Overview

Vibe Doc is built as a dual-layer system:

**Conversation Layer (Skills)**
Flexible, adaptive analysis using LLMs. Scan, classify, generate, refine. Everything happens in natural language with the user driving the direction.

**Deterministic Layer (CLI)**
Reproducible operations. Scans are cached and versioned. Generations are deterministic given the same inputs. Perfect for CI/CD integration and batch processing.

Both layers share the same classification engine and document templates, so you get consistent results whether you're in a conversation or running automated checks.

## Classification System

Projects vary wildly. Vibe Doc uses a hybrid classifier:

**Rules-based Layer**
Patterns that are obvious: presence of Dockerfiles, package.json structure, framework detection, cloud config patterns. Fast, deterministic, no hallucination.

**LLM Fallback**
When patterns are ambiguous or custom, ask Claude. Classifies your project type, architecture style, and risk profile based on artifacts and code structure.

The result is a project profile that guides both gap analysis and doc generation.

## Three-Tier Priority System

Every gap gets a priority:

**Required** — Must exist before shipping. Includes ADRs for major decisions, deployment procedures, and API specs if you have an API surface. Typically 2-3 docs.

**Recommended** — Professional standard. Runbooks, threat models, test plans. Makes your codebase maintainable and professional. Typically 3-4 docs.

**Optional** — Nice-to-have. Data models for internal use, architectural diagrams, backup procedures. Typically 1-2 docs.

This means you can ship after filling Required docs, improve gradually with Recommended, and polish with Optional.

## Works Independently or Together

Vibe Doc is part of the **626Labs plugin ecosystem**. It runs standalone or alongside other 626Labs plugins like [`@esthernandez/app-project-readiness`](https://www.npmjs.com/package/@esthernandez/app-project-readiness) — when both are installed, they share a **unified builder profile** at `~/.claude/profiles/builder.json` so you only onboard once across all 626Labs plugins.

Vibe Doc respects the [Self-Evolving Plugin Framework](docs/self-evolving-plugins-framework.md) — it reads the shared profile to calibrate tone and depth, writes only to its own `plugins.vibe-doc` namespace, and never stomps other plugins' data. See the framework doc for the full thesis, 12-pattern catalog, and applied playbook.

## Contributing

Found a bug? Missing a document type? Want to improve the classifier? Open an issue or PR at [the Vibe Doc repository](https://github.com/estevanhernandez-stack-ed/Vibe-Doc).

## License

MIT
