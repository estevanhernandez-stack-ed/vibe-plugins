---
name: check
description: >
  This skill should be used when the user mentions "check my docs",
  "am I ready to deploy", "documentation check", "CI check",
  "are my docs current", "deployment readiness", or wants to verify
  their project meets documentation requirements before shipping.
---

# Vibe Doc Check Skill

Simple CI-safe validation: verify that Required documentation exists and is current.

**Shared behavior:** Read `skills/guide/SKILL.md` for state management, CLI patterns, and output formatting.

---

## Conversational Flow

### 1. Run Check Command

Execute the validation:

```bash
cd <project-path> && npx vibe-doc check .
```

---

### 2. Present Results

**If check passes:**

```
✓ Documentation Check PASSED

Your project meets all Required documentation standards.

Status Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Classification: Web Application (Regulated, Customer-Facing)

Required Docs:
  ✓ Threat Model
  ✓ Architecture Decision Records
  ✓ Runbook
  ✓ Test Plan

All 4 required documents exist and are current.
Last generated: 2026-04-05 (6 days ago)
Last significant changes: 2026-04-08 (3 commits)

Status: CURRENT (no staleness concerns)

Next steps:
  • Continue development
  • Regenerate docs if major changes land (e.g., new deployment target, architecture pivot)
  • Or just re-run this check before each deployment
```

---

**If check fails:**

```
✗ Documentation Check FAILED

Your project is missing or has stale Required documentation.

Classification: Web Application (Regulated, Customer-Facing)

Required Docs:
  ✓ Threat Model (current)
  ✗ Architecture Decision Records (MISSING)
  ✓ Runbook (STALE — 18 commits, last generated 2026-03-25)
  ✗ Test Plan (MISSING)

Status: 1 of 4 docs current (25%)

Why stale or missing?
  • Runbook: 18 commits landed since generation, including deployment config changes
  • ADRs: No generation history (may never have been created)
  • Test Plan: No generation history (may never have been created)

Risk: HIGH — Cannot deploy with missing Required docs

Next steps to fix:

Option 1: Quick regeneration (5-10 min)
  Run the Generate skill to refresh stale docs and create missing ones.
  
Option 2: Manual review
  If you've already created these docs manually (not via Vibe Doc):
    1. Review docs/generated/ to see what exists
    2. Run Scan skill to update your project profile
    3. Then re-run this check
    
Option 3: Mark as not-applicable
  If a Required doc doesn't apply to your project:
    1. Update your classification in the Scan skill
    2. Re-run this check
```

---

### 3. Next Steps Checkpoint

Ask user how to proceed:

```
[regenerate] → Run the Generate skill to fix gaps
[scan] → Update project profile with Scan skill
[review] → I'll show you what's in docs/generated/
[exit] → Done with check (I'll report failure to CI)
```

**If user picks "regenerate":**
- Transition to Generate skill with pre-selected stale/missing docs

**If user picks "scan":**
- Transition to Scan skill

**If user picks "review":**
- Show contents summary of docs/generated/ folder
- List which Required docs exist and their last-modified dates

**If user picks "exit":**
- Show exit code for CI integration
- Provide command to add to pipeline

---

## CI/CD Integration

The check command is designed to be CI-safe. Show user how to integrate:

```
To add this check to your CI/CD pipeline:

GitHub Actions example:

  name: Documentation Check
  on: [push, pull_request]
  
  jobs:
    vibe-doc-check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm install -g vibe-doc
        - run: npx vibe-doc check .
          # Command exits with:
          #   0 = all Required docs exist and current
          #   1 = missing or stale Required docs
```

Other CI systems (GitLab CI, CircleCI, Jenkins):

```bash
# Run this command in your pipeline
npx vibe-doc check .

# Exit codes:
#   0 = PASS (deploy allowed)
#   1 = FAIL (deploy blocked)
```

---

## Exit Codes & Automation

The `check` command returns standard exit codes:

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| `0` | All Required docs exist and are current | Deployment can proceed |
| `1` | Missing or stale Required docs | Deployment blocked; regenerate docs |

**Use in CI conditionals:**

```yaml
# GitHub Actions
- run: npx vibe-doc check .
  continue-on-error: true  # Optional: allow preview deployments on fail
  
- name: Report Status
  if: success()
  run: echo "Documentation verified ✓"
  
- name: Report Status
  if: failure()
  run: |
    echo "Documentation check failed ✗"
    echo "Regenerate docs before merging: run Generate skill"
    exit 1
```

---

## Error Handling

### No Classification Profile

If no scan has been run:

```
Documentation check requires a project profile.

Run the Scan skill first to:
  • Analyze your project's artifacts
  • Classify your app type
  • Identify what documentation you need

Then re-run this check.
```

### Check Command Fails

```
Check command failed: [error message]

This usually means:
  • No .vibe-doc/state.json file (run Scan first)
  • Corrupted state file
  • File system permissions issue

Next steps:
  1. Run Scan skill to create/repair project profile
  2. Then re-run check
```

### Ambiguous Staleness

If a doc's staleness is unclear (code changed but impact unknown):

```
⚠ Uncertain Staleness: Runbook

This doc was generated on 2026-03-25. Since then:
  • 18 commits (mostly feature work)
  • 3 commits touched deployment configs
  • 1 commit changed environment variables

The doc may be outdated, but I'm not 100% certain.

[regenerate] → Re-create the doc to be safe
[keep] → The doc is still accurate (skip regeneration)
```

---

## State & Output

**Read from `.vibe-doc/state.json`:**
- Classification (which Required docs apply)
- Generated doc metadata (timestamps, file locations)
- Generation history (to detect staleness)

**Output to user:**
- Pass/fail status
- List of missing/stale/current docs
- Exit code for CI

**No files created or modified by this skill.**

---

## Use Cases

**Developer before local deployment:**
```
npx vibe-doc check .
# → Verify docs are current before deploying to staging
```

**CI pipeline (on every push):**
```
# Block merge if Required docs are missing
if ! npx vibe-doc check .; then
  exit 1
fi
```

**CI pipeline (allow preview on fail):**
```
# Allow preview deployments, but warn on missing docs
npx vibe-doc check . || true
```

**Scheduled check (weekly reminder):**
```
# Every Monday, check if docs have gone stale
# If docs are >2 weeks old, alert the team
```

---

**Last updated:** 2026-04-11 | **Version:** 1.0
