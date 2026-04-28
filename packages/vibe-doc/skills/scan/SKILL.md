---
name: scan
description: >
  This skill should be used when the user mentions "scan my project",
  "check my documentation", "run vibe doc", "what docs am I missing",
  "documentation gaps", "doc coverage", or wants to analyze their codebase
  for missing technical documentation.
---

# Vibe Doc Scan Skill

Conversational pipeline to scan a project, classify its type, and produce a documentation gap report.

**Shared behavior:** Read `skills/guide/SKILL.md` for state management, CLI patterns, checkpoints, and output formatting.

---

## Conversational Flow

### 1. Entry Gate — Context vs. Cold Start

Greet the user and present two paths:

```
Welcome to Vibe Doc. I'll scan your project's artifacts, classify your app, 
and show you what documentation you need.

How would you like to start?

1. Add project context first (4-6 questions, ~5 min)
   → Helps me understand your goals, users, and deployment target
   
2. Start scanning now (no questions)
   → I'll analyze your artifacts and infer everything I can
```

**User chooses:**
- **Path A: Add context** → Go to step 2 (Intake Interview)
- **Path B: Start scanning** → Go to step 3 (Run Scan)

---

### 2. Intake Interview — Context Gathering (Path A)

If user chooses context, run a focused interview. Max 6 questions. Save answers to a temporary profile that will seed the classification step.

**Questions to ask (in this order):**

1. **Project name & description** → "What's your project called, and what does it do in one sentence?"
2. **Primary purpose** → "Is this primarily a web app, API, data pipeline, infrastructure, mobile app, AI/ML system, or integration? Or something else?"
3. **Deployment target** → "Where does this run? (Cloud provider, on-prem, edge, customer infrastructure?)"
4. **Users & compliance** → "Who uses this? (Internal team, customers, public?) Any regulatory requirements? (HIPAA, SOC2, PCI, etc.)"
5. **Architecture style** → "Monolith, microservices, serverless, or hybrid?"
6. **Team context** → "Solo dev or team? Any deployments soon?"

**After collecting answers:**

```
Got it. Here's what I heard:
- Project: [name]
- Purpose: [type]
- Deployment: [target]
- Users: [internal/customers/public] + [compliance]
- Architecture: [style]

I'll use this context when scanning your artifacts.
```

Save this profile. Then proceed to step 3 (Run Scan).

---

### 3. Run Scan — Artifact Inventory

Execute the scan command:

```bash
cd <project-path> && npx vibe-doc scan .
```

**If scan succeeds:**
- Read `.vibe-doc/state.json`
- Show artifact inventory summary to user

**If scan fails:**
- Show error message and suggest next steps
- Offer retry or code-only mode

---

### 4. Present Classification

After successful scan, show the classification:

```
Classification Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary Category:     Web Application
Secondary Categories: Customer-Facing, Multi-Tenant
Deployment Context:   Regulated (HIPAA), Cloud (AWS)
Confidence:           94%
```

**Checkpoint:** Ask user to confirm or revise

```
Does this match your project?

[yes] → Proceed to gap report
[no] → Let me ask follow-up questions
[revise] → I'll adjust manually
```

---

### 5. Present Gap Report — Summary First

Show gap summary with Required/Recommended/Optional breakdown:

```
Documentation Gap Report
━━━━━━━━━━━━━━━━━━━━━━━━

Required Tier (Deployment Blockers): 1 of 4 exist (25%)
Recommended Tier (Should Do):         1 of 4 exist (25%)
Optional Tier (Nice to Have):         0 of 3 exist (0%)

Overall Coverage: 28% (2 of 7 critical docs)

Key Risks:
⚠ No threat model — required before HIPAA submission
⚠ No runbook — operational procedures missing
```

**Checkpoint:** Ask how to proceed

```
[walkthrough] → Go through gaps one at a time
[generate] → Pick which gaps to fill now
[check] → Run CI validation
[exit] → Save and come back later
```

---

### 6. Interactive Walkthrough (Optional)

If user chooses "walkthrough", process gaps tier by tier, starting with Required.

**For each gap:**
- Show tier, rationale, what was found, what's missing
- Ask: Generate this doc now, skip, or see details?

---

### 7. Update Unified Builder Profile

After a successful scan, update the `plugins.vibe-doc` namespace in `~/.claude/profiles/builder.json` — but **only if the file already exists** (another plugin like Vibe Cartographer creates it during onboarding).

1. Read `~/.claude/profiles/builder.json`. If it doesn't exist or isn't valid JSON, skip this step entirely.
2. Read-merge-write: update only the `plugins.vibe-doc` block, never touch `shared` or other plugin namespaces.
3. Set these fields:

```json
{
  "plugins": {
    "vibe-doc": {
      "last_scan_project": "<project name> — <one-line description from classification>",
      "scans_completed": <increment previous value by 1, or 1 if first run>,
      "last_scan_category": "<primaryCategory from classification>",
      "last_updated": "<today's ISO date>"
    }
  }
}
```

4. Preserve any existing fields in `plugins.vibe-doc` that aren't listed above (e.g., `preferred_tier`, `default_output_format` from a previous generate run).

---

### 8. Completion & Next Steps

```
Scan Complete ✓
Your project: Web Application (Customer-Facing, Regulated)
Artifacts: 28 found
Coverage: 28% of required docs
Risk: High (missing Threat Model, Runbook)

Next: Generate required docs or save and return later?
```

---

## Error Handling

### Scan Command Fails

If the CLI command errors:

```
Scan failed: [error]

Common causes:
1. Folder isn't readable (permissions)
2. Not a valid project (missing package.json, git repo)
3. Git history corrupted or too large

Next steps:
→ Check folder is valid project root
→ Try again
→ Or skip git analysis for code-only scan
```

### Ambiguous Classification

If multiple categories match equally:

```
I found signals for both "API/Microservice" and "Web Application".
Which is primary for deployment?

[api] → API is primary (frontend is secondary)
[web] → Web app is primary (API is backend)
```

---

## State & Output

**Saved to `.vibe-doc/state.json`:**
- Classification profile
- Artifact inventory
- Gap lists (required/recommended/optional)

**User sees:**
- Artifact summary
- Classification + rationale
- Gap report with risk assessment

---

**Last updated:** 2026-04-11 | **Version:** 1.0
