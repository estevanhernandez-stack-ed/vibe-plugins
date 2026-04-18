# PRD Guide — Agent Reference

This document is for the agent only. It informs how you conduct the /prd conversation and write the PRD. Do not surface PM jargon, framework names, or theory to the builder. Use this knowledge to ask better questions and produce a more rigorous document.

## What Makes a Good PRD

A good PRD is exhaustive about *what* the user wants without touching *how* to build it. It translates a brainstorm (scope.md) into precise behavior descriptions. Every ambiguity, assumption, and edge case the builder didn't know they were making gets surfaced here.

The PRD should be significantly more detailed than the scope doc. The scope doc is a big-picture sketch. The PRD is a zoomed-in, exhaustive accounting of what "done" actually means.

## User Stories

User stories are the backbone of requirements. The format is simple and accessible to anyone:

**"As a [specific person], I want [thing I can do] so that [why it matters to me]."**

What makes a good story:
- The person is specific enough to picture ("a first-time visitor" not "a user")
- The capability describes what they want to accomplish, not how the UI works ("find recipes that use what I have" not "click a dropdown menu")
- The benefit explains the real-world value ("so I don't waste food" not "so the feature works")

Common mistakes to watch for and gently redirect:
- Too vague: "I want the app to work well" — push for specifics
- Prescribing UI: "I want a sidebar with filters" — redirect to the need behind it
- Missing the "so that": stories without benefits are tasks, not stories
- Too big: "I want to manage my account" — help break it into specific capabilities

When the builder describes what they want, translate their casual language into stories naturally. Don't make them write the stories — you write them together through conversation, and the builder confirms they capture what they meant.

## Grouping Stories into Epics

An epic is just a group of related stories that belong together. Use epics to organize the PRD when a project has multiple areas of functionality.

For example, a recipe app might have:
- **Finding recipes**: stories about searching, filtering, browsing
- **Managing ingredients**: stories about adding what's in the fridge, tracking what's used
- **Cooking flow**: stories about following a recipe step by step

Name epics in plain language that describes the area of the app, not PM terminology. The builder should see epics as natural groupings of "things the app does," not as a framework.

**Important:** Give epics clear, stable heading names in the PRD. Downstream commands (/spec, /checklist, /build) reference these headings to trace requirements through the whole process. For example, `/spec` might say "this component implements the stories in `prd.md > Finding Recipes`" and `/checklist` might reference `prd.md > Finding Recipes > no-results story`. This cross-referencing makes the documents work as a connected system, not isolated files.

## Acceptance Criteria

For each story or requirement, write acceptance criteria as simple checklists. These describe specific, testable behaviors — things the builder can verify with their own eyes during /build.

Good acceptance criteria:
- [ ] When I search for "chicken", recipes with chicken appear
- [ ] If I have no ingredients saved, the app shows a helpful empty state
- [ ] Clicking a recipe shows the full ingredient list and steps

Avoid:
- Vague criteria: "the search works well"
- Implementation-specific criteria: "the SQL query returns results in < 100ms"
- Untestable criteria: "the UX is intuitive"

Cover the happy path first, then ask about what happens when things go wrong or are empty. Frame edge cases as "what ifs" the builder will actually encounter during build.

## Asking Sharpening Questions

The core technique is translating vague intentions into precise behaviors. Useful question patterns:

**Zooming in:** "You said users can browse recipes. What do they see first? A list? Cards? How are they sorted?"

**Surfacing assumptions:** "You're assuming people will add their ingredients. But what does the app look like before they've added anything? What's the very first thing a new user sees?"

**Finding contradictions:** "You want it to be simple, but you also want filtering by cuisine, diet, and cook time. Which matters most if you had to pick one?"

**Testing completeness:** "Walk me through this from start to finish. You open the app. Then what? What do you tap first? What happens next?"

**Probing the edges:** "What if someone searches for something and there are no results? What if they have only one ingredient? What if they have fifty?"

Calibrate depth to experience level:
- First-timers: 2-3 "what if" moments that open their eyes to planning value
- Junior devs: push on the interactions between features, state management implications (without using that phrase)
- Senior devs: they'll likely anticipate edge cases — focus on helping them be explicit about decisions they're making implicitly

## Scope Guarding

The PRD naturally wants to expand. Your job is to be exhaustive about what's IN without letting scope grow beyond what's realistic.

Watch for:
- Requirements that keep spawning sub-requirements
- "While we're at it" additions
- Features the builder is excited about but that would significantly extend the build
- Vague requirements that hide enormous complexity ("social features," "real-time sync," "recommendations")

When you spot creep, name it directly: "This is growing. Is this essential for your project, or would you add it with more time?" This naturally sorts requirements into the two sections without teaching prioritization theory.

## Non-Goals

Strong non-goals prevent scope creep during build. They should be specific and named — "we are NOT building user profiles, because the app works fine with anonymous/session-based use" is better than "no extra features."

Pull non-goals from two sources:
1. What was explicitly cut in scope.md
2. Adjacent features that will tempt the builder during build

## Open Questions

Some things won't resolve during the PRD conversation. That's fine — name them explicitly so they don't become surprise roadblocks during build. Flag whether each needs to be answered before /spec or can wait until build time.
