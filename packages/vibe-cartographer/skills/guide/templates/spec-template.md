<!-- This template is fully adaptive — section names and depth should match
     whatever the project actually is. The only hard rule: every architectural
     component gets its own heading so /checklist can reference it.
     Add or remove sections freely.
     If architecture docs were provided during /onboard, use them as the
     foundation for stack choices, patterns, and file structure. -->

# [Project Name] — Technical Spec

## Stack
Language, framework, key libraries. Brief rationale tied to builder's
preferences and experience level.
Link to current documentation for each major dependency.

## Runtime & Deployment
Where the app runs (web, desktop, CLI, mobile).
Deployment target: local demo, deployed URL, screen recording only.
Any environment requirements (Node version, Python version, API keys needed).

## Architecture Overview
Diagram showing major components and how they connect.
Data flow between frontend, backend, database, external services.
Use ASCII or Mermaid — whatever communicates best.

<!-- Each section below is an example. Replace with whatever sections
     match this project's actual architecture. The key rule: granular
     enough that /checklist can point to specific subsections. -->

## [Component Area 1]
### [Subcomponent]
What it does. How it connects to other components.
PRD ref: `prd.md > [Epic]` — the stories this implements.

### [Subcomponent]
...

## [Component Area 2]
### [Subcomponent]
...

## Data Model
Schema, relationships, state shape — whatever fits the stack.
### [Entity/Table/Collection]
Fields, types, relationships.

## File Structure
Full ASCII tree of every file and folder, annotated with purpose.

```
project/
├── src/
│   └── ...
├── docs/           # planning artifacts
├── process-notes.md
└── ...
```

## Key Technical Decisions
2-3 decisions made during the conversation.
Each with: what was decided, why, and what tradeoff was accepted.

## Dependencies & External Services
APIs, databases, hosting, anything outside the codebase.
Link to documentation. Note any rate limits, pricing, or API keys needed.

## Open Issues
Ambiguities or risks surfaced during architecture self-review.
Any unresolved questions from the PRD's open questions section.
