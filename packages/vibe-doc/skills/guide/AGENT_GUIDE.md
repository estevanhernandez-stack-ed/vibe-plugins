# Agent Guide — How to Use Vibe Doc Skills

**This is for agents.** When a user invokes a Vibe Doc skill, read the corresponding SKILL.md file and follow its conversational pipeline exactly.

---

## Quick Reference

| Skill | File | Purpose | User-Facing? |
|-------|------|---------|--------------|
| **scan** | `scan/SKILL.md` | Scan artifacts, classify app, report gaps | YES |
| **generate** | `generate/SKILL.md` | Generate selected documentation | YES |
| **check** | `check/SKILL.md` | Validate Required docs exist and are current | YES |
| **guide** | `guide/SKILL.md` | Shared behavior (reference only) | NO |

---

## Skill Invocation Pattern

When a user says something like:
- "Scan my project for documentation gaps"
- "Help me generate missing docs"
- "Check if my docs are current"

The agent should:

1. **Identify the skill:** Map user request to scan/generate/check
2. **Read the SKILL.md:** Open the corresponding file and read the full conversational flow
3. **Follow the pipeline:** Execute step-by-step as defined in the SKILL.md
4. **Reference guides:** Consult `skills/guide/references/` when needed (see below)
5. **Maintain state:** All skills interact with `.vibe-doc/state.json` via CLI commands
6. **Respect checkpoints:** Pause and ask for user confirmation at critical gates

---

## Step-by-Step: Scan Skill

User: "Scan my project for documentation gaps"

1. **Read** `skills/scan/SKILL.md`
2. **Section 1 — Entry Gate:**
   - Greet user
   - Present two paths: "Add context first" or "Start scanning"
   - Wait for choice
3. **If Path A (Add context):**
   - Go to section 2 (Intake Interview)
   - Ask 6 questions, save answers
4. **If Path B (Cold start):**
   - Jump to section 3 (Run Scan)
5. **Section 3 — Run Scan:**
   - Execute: `cd <project-path> && npx vibe-doc scan .`
   - If fails: show error, suggest next steps, exit
   - If succeeds: proceed
6. **Section 4 — Present Classification:**
   - Read `.vibe-doc/state.json` to get classification
   - Show it to user in formatted output
   - Checkpoint: ask user to confirm/revise/dispute
7. **Section 5 — Present Gap Report:**
   - Show summary (counts by tier)
   - Checkpoint: ask how to proceed (walkthrough/generate/check/exit)
8. **Section 6 — Interactive Walkthrough (optional):**
   - If user picked walkthrough, go through gaps 1-by-1
   - For each gap: show rationale, what was found, what's missing
   - Ask: generate now, skip, or see details
9. **Section 7 — Completion:**
   - Show final summary
   - Offer next steps (generate, save, check)

---

## Step-by-Step: Generate Skill

User: "Help me generate the missing documentation"

1. **Read** `skills/generate/SKILL.md`
2. **Entry check:**
   - Verify `.vibe-doc/state.json` exists
   - If not: redirect to Scan skill and exit
3. **Section 1 — Show Gaps:**
   - Read state
   - Display gaps organized by tier
   - Ask: generate Required/pick specific/generate all
4. **Section 2a — Sequential Generation:**
   - For each selected gap:
     - Consult `skills/guide/references/breadcrumb-heuristics.md` for the doc type
     - Extract the "Gap Questions" section
     - Ask user those 2-3 questions
     - Save answers to temporary JSON
     - Execute: `cd <project-path> && npx vibe-doc generate <docType> --format both --answers '<json>'`
     - Parse output: show file paths, confidence per section
     - Checkpoint: approve/revise/skip
5. **Section 7 — Completion:**
   - Show summary of what was generated
   - Offer: generate more/check/done

---

## Step-by-Step: Check Skill

User: "Check if my documentation is current"

1. **Read** `skills/check/SKILL.md`
2. **Section 1 — Run Check:**
   - Execute: `cd <project-path> && npx vibe-doc check .`
3. **Section 2 — Present Results:**
   - If pass: celebrate, show status, offer next steps
   - If fail: show what's missing/stale, suggest fixes
4. **Section 3 — Checkpoint:**
   - Ask: regenerate/scan/review/exit
5. **CI Integration:**
   - If user asks about CI/CD, show the example in section "CI/CD Integration"

---

## When to Consult Reference Guides

### Use `classification-taxonomy.md` when:
- Classifying an ambiguous application (could be Web App OR API)
- Determining what docs are appropriate for a category
- Explaining why a context modifier matters

**Example:** User says "My app is both a web app and an API." Consult taxonomy to explain primary vs. secondary categories.

### Use `documentation-matrix.md` when:
- Explaining which docs are Required vs. Recommended for their app type
- Showing why a doc tier changed (due to modifiers)
- Justifying a doc as "required for HIPAA compliance"

**Example:** Generate skill shows "Test Plan is Recommended for your Web App. However, because you're Customer-Facing, it's elevated to Required."

### Use `breadcrumb-heuristics.md` when:
- Generating a specific document (to get synthesis questions)
- Explaining confidence levels (why a section was low-confidence)
- Helping user understand what the scanner looks for

**Example:** Generate skill for "Threat Model" doc → consult breadcrumb-heuristics to extract Gap Questions → ask user "Beyond authentication and data encryption, what other sensitive operations exist?"

---

## State Management

All skills operate on `.vibe-doc/state.json` in the mounted project folder.

**Never edit this file directly.** Always use CLI commands:

```bash
# Scan produces/updates:
npx vibe-doc scan <path>

# Generate updates:
npx vibe-doc generate <docType> --format both --answers <json>

# Check reads (no modifications):
npx vibe-doc check <path>
```

**State structure** (from `guide/SKILL.md`):
```json
{
  "profile": {
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

---

## Error Handling

When a CLI command fails, **always:**

1. Show the error message to the user
2. Explain what was being attempted
3. Suggest concrete next steps
4. Offer fallback options (if any)

See each SKILL.md's "Error Handling" section for specific error patterns and responses.

---

## Checkpoint Pattern (Critical)

Vibe Doc uses checkpoints to ensure user control at critical gates:

1. **Present findings clearly** (summary first, then details)
2. **Show the decision** (what's being asked, why it matters)
3. **Offer explicit choices** (yes/no/revise/skip/etc.)
4. **Wait for confirmation** (do NOT proceed without user response)

Examples of checkpoints:
- Classification confirmation ("Does this match your project?")
- Gap walkthrough start ("Would you like to walk through gaps one by one?")
- Document approval ("Approve this doc before moving to next?")
- Generation selection ("You've selected 2 docs. Ready to start?")

---

## Output Formatting Standards

From `guide/SKILL.md`:

**Headers:** Use Markdown. Structure output with H1, H2, H3.

**Lists:** Bullet points for options/findings, numbered for steps.

**Code blocks:**
```bash
cd /project && npx vibe-doc scan .
```

**Checkpoints:** Use clear formatting with options in brackets:
```
[yes] → Proceed to next step
[no] → Go back and adjust
```

**Status indicators:** Use consistent symbols:
- ✓ Complete/Found
- ✗ Missing/Failed
- ⚠ Warning/Low confidence
- → Next step/redirect

---

## Example: Full Scan → Generate → Check Flow

```
User: "Help me document my project"

Agent reads: skills/scan/SKILL.md
Agent runs scan pipeline (sections 1-7)
Output: gaps listed, user prompted next steps

User: "Let's generate the required docs"

Agent reads: skills/generate/SKILL.md
Agent checks state, shows gaps, lets user pick
For each gap:
  - Agent reads: breadcrumb-heuristics.md (for that doc type)
  - Agent asks synthesis questions
  - Agent runs generate CLI
  - Agent shows results + checkpoint

User: "Before I commit these, can you verify everything?"

Agent reads: skills/check/SKILL.md
Agent runs check pipeline
Output: pass/fail status, recommendations

Done!
```

---

## Tone & Style

All skills follow 626Labs communication style:
- **Direct and clear** — no filler, respect user's time
- **Technical but accessible** — explain concepts in plain language
- **Action-oriented** — lead with what to do, not why
- **Responsive to energy** — match user's pace (quick/thoughtful)

From `guide/SKILL.md`:
- Professional, direct, no filler
- Technical but accessible
- Checkpoint before proceeding
- Structured output (headers, lists, code blocks)

---

## Testing Your Implementation

When integrating these skills, verify:

1. **Scan skill:**
   - Entry gate works (context vs. cold)
   - Classification resolves correctly
   - Gap report shows Required/Recommended/Optional
   - Interactive walkthrough processes gaps one by one

2. **Generate skill:**
   - State check works (redirects if no scan)
   - Synthesis questions asked and saved
   - CLI commands execute and produce files
   - Checkpoints work at each approval point

3. **Check skill:**
   - CLI returns correct exit codes (0/1)
   - Output is CI-safe (no prompts)
   - Suggestions for fixes are clear

4. **Reference docs:**
   - Agents can consult taxonomy for edge cases
   - Matrix accurately maps categories to doc types
   - Breadcrumbs provide useful synthesis questions

---

**Last updated:** 2026-04-11  
**For:** Agents implementing Vibe Doc skills
