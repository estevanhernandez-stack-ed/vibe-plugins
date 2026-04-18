# Review Dimensions — Agent Reference

This document is for the agent only. It defines how you reason about the builder's work in /reflect. Use these dimensions to structure your thinking, but your output is qualitative observations — what landed and what to tighten — not scores or grades.

## How to Use This

For each dimension:
1. **Read the relevant artifacts.** Know what you're looking at before forming opinions.
2. **Reason through the evidence.** What's there, what's missing, what it means.
3. **Cite specifics.** Quote or reference exact passages from the artifacts. No vague claims.
4. **Calibrate to the builder.** The same artifact quality means different things for a first-timer vs a senior dev. Read their technical background and adjust accordingly.
5. **Output one strength and one improvement area per dimension.** Keep each to 2-3 sentences with evidence.

## Guards

Apply these throughout every review:

- **Calibrate to project context.** Don't expect production-quality code or professional-grade documents from a rapid build.
- **Brevity that nails the idea beats length.** A concise scope doc that's sharp is better than a long one full of filler. Judge substance, not word count.
- **Evaluate against the PRD, not your own taste.** The PRD's acceptance criteria are the anchor. Did the app do what the builder said it should do?
- **If evidence is insufficient, say so.** Don't fill gaps with charitable assumptions or harsh ones. Note what's missing.
- **Ownership matters.** A polished app built by a passive builder is less notable than a rougher app built by someone who drove every decision.

## Dimensions

### 1. Scope & Idea Clarity

How well-defined is the idea? Does `scope.md` give a clear picture of what's being built and why?

**What to look at:**
- Is the idea stated clearly enough that someone could picture the app?
- Is a specific user and problem identified (not "everyone" or "people")?
- Does "What's Explicitly Cut" name real features with rationale?
- Is "What Done Looks Like" concrete enough to verify?
- Is the scope realistic given the builder's experience?

**Strong:** The idea is sharp — one sentence and you get it. The user, problem, and constraints are specific and grounded. Scope cuts show genuine prioritization.

**Needs tightening:** The idea is vague, no specific user, nothing explicitly cut, "done" is described in generalities.

### 2. Requirements Thinking

Does `prd.md` define complete, testable requirements? Were edge cases surfaced? Did the builder invest in specification depth?

**What to look at:**
- Do user stories cover the core user journey?
- Are acceptance criteria specific and testable (not vague like "works well")?
- Are edge cases and error states addressed (empty states, bad input, no results)?
- Does "What we're building" vs "What we'd add" show genuine prioritization?
- Is the PRD substantially more detailed than the scope doc?
- How many deepening rounds did the builder choose? (Check process notes.) Did extra rounds produce materially better requirements, or did the builder stop at the minimum?

**Strong:** Stories are comprehensive and grouped meaningfully. Every acceptance criterion is specific enough to verify by looking at the screen. Multiple edge cases addressed. Extra deepening rounds (if taken) produced tangible improvements.

**Needs tightening:** PRD is a reformatted copy of the scope doc. Acceptance criteria say "it should work." No edge cases mentioned. Skipped deepening rounds and the gaps show in the build.

### 3. Technical Decisions

Does `spec.md` show intentional architecture choices? Does the checklist sequence make sense? Did specification depth prevent build problems?

**What to look at:**
- Are stack choices explained with rationale tied to the builder's experience?
- Are file structure and data flow documented clearly enough for building?
- Do architecture decisions reference PRD epics — is there traceability?
- Is the checklist sequenced logically (dependencies respected)?
- Does the spec address how the submission will work?
- Did deepening rounds in /spec catch issues that would have caused problems during /build? Or did skipping them leave gaps?

**Strong:** Every decision has clear rationale. File structure is annotated. Data flow is diagrammed. PRD cross-references are thorough. The builder actively shaped the architecture. Deepening round investment shows in build smoothness.

**Needs tightening:** Stack listed without rationale. No file structure. No PRD connection. Checklist is a flat list with no dependency logic. Shallow specification led to build problems that deeper planning would have caught.

### 4. Plan vs. Reality

Does the finished app do what the PRD said it should do?

**What to look at:**
- Does the app run without crashing on the core flow?
- How many "What we're building" acceptance criteria are met?
- Is the core user journey functional end-to-end?
- Where did the build drift from the plan, and did the builder adapt?

**Strong:** The app does what the PRD said. Most acceptance criteria are met. The gap between plan and execution is small, or the builder noticed drift and adjusted.

**Needs tightening:** Major gap between plan and build. Core features missing or broken. The builder didn't notice or address the drift.

### 5. How You Worked

From `process-notes.md` and comprehension check answers: did the builder actively shape the project?

**What to look at:**
- Did the builder make real decisions (not just agree to everything)?
- Did they push back on or modify agent suggestions?
- Were comprehension check answers engaged and accurate (if they opted in)?
- Did the builder contribute ideas the agent hadn't suggested?
- Did the builder's decision-making sharpen across the phases?
- How did they approach deepening rounds? Strategic investment or rushing through?

**Strong:** Process notes show full engagement at every step. Multiple instances of pushing back, redirecting, adding ideas. Comprehension checks are concise and accurate. Deepening rounds were used strategically. The project distinctly reflects the builder's vision.

**Needs tightening:** The builder accepted most suggestions without pushback. Comprehension checks are vague or confused. Skipped all deepening rounds and the documents are thin. The project feels like the agent built what the agent wanted.

**If the builder was mostly passive,** say it directly: "On longer projects, passive acceptance means you end up with code you can't debug, extend, or explain. Own every decision — push back, redirect, make it yours."
