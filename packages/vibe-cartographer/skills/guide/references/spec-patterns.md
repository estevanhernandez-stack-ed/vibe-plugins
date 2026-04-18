# Spec Patterns — Agent Reference

This document is for the agent only. It informs how you conduct the /spec conversation, choose architectures, and produce the technical specification.

**Important:** If the builder provided architecture docs during `/onboard`, those take precedence over the patterns in this file. Use this file as a fallback when no architecture docs are provided, or to supplement architecture docs that are incomplete.

For default stack patterns and recommendations, see `architecture/default-patterns.md`.

## Adapting to Architecture Docs

When architecture docs are provided:
- Use the specified stack, patterns, and conventions as your starting point
- Still validate choices against the builder's experience level
- Still discuss tradeoffs and alternatives, but frame them relative to the provided architecture
- Propose modifications only when the architecture docs conflict with the project requirements from the PRD

When no architecture docs are provided:
- Use the patterns in `architecture/default-patterns.md` to recommend a stack
- Propose whichever fits the builder's project and experience level

## Diagramming

Use whatever format communicates best. Options:

**ASCII box diagrams** — work everywhere, no rendering dependencies:
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────→│   API    │────→│ Database │
└──────────┘     └──────────┘     └──────────┘
```

**Mermaid** — richer rendering in many tools:
```mermaid
graph LR
  Frontend --> API --> Database
```

Ask the builder if they have a preference. If they don't care, pick whichever is clearest for the specific diagram.

## File Structure Conventions

Always include a full file tree in the spec. Use ASCII tree format:

```
project/
├── src/
│   ├── components/    # UI components
│   ├── pages/         # Route-level pages
│   ├── lib/           # Shared utilities
│   └── api/           # API routes or client
├── docs/              # Planning artifacts (scope, prd, spec, etc.)
├── process-notes.md   # Process journal
├── package.json
└── README.md
```

Annotate directories with brief comments explaining purpose. The builder should be able to look at this tree and understand where everything lives.

If architecture docs specify a file structure convention, use that instead.

## Data Flow Documentation

For any app with data, document how data moves through the system:
1. Where does data originate? (User input, external API, file, etc.)
2. Where is it stored? (Database, localStorage, in-memory, file)
3. How does it get from A to B? (API call, function call, event, etc.)
4. What transforms happen along the way?

For projects, keep this pragmatic. A simple data flow narrative or diagram is enough — no need for formal data flow diagrams.

## Stack Research

When proposing a stack, **always web search for current documentation** on the specific tools, libraries, and APIs being used. Things change fast — a library that was standard 6 months ago might be deprecated. Check:
- Is this library actively maintained?
- What's the current stable version?
- Are there known issues or migration paths?
- Is there a simpler alternative that does the same thing?

For external APIs (Supabase, Firebase, OpenAI, etc.), search for current pricing, rate limits, and quickstart guides. Link to relevant docs in the spec so the agent has them during /build.

## Granular Subsections

The spec MUST have granular subsections — every architectural component gets its own heading. These headings become addresses that /checklist references.

Bad: one big "Architecture" section with everything in it.
Good: `## Frontend > ### Search Component`, `## API > ### Endpoints > #### GET /recipes`, `## Data Model > ### Recipes Table`.

The depth of nesting should match the complexity. A simple CLI tool might only need two levels. A full-stack app might need three or four. The rule is: if /checklist needs to point to it, it needs its own heading.

## Cross-Referencing the PRD

When writing the spec, reference PRD epic headings to maintain traceability:
- "This component implements the stories in `prd.md > Finding Recipes`"
- "See `prd.md > Managing Ingredients` for the acceptance criteria this must satisfy"

This connects the architectural decisions back to the requirements. During /build, the agent can look up both the spec (how to build it) and the PRD (what it should do) for any given checklist item.

## Other Areas Worth Spending Time On

Beyond data flow and file structure, these areas deserve real conversation time in /spec:

### State Management
Where does state live? This is the #1 source of confusion during build. For every piece of data the app touches, the builder should be able to answer: "Where is this stored? How does it get updated? What happens when the user navigates away and comes back?" Don't use the phrase "state management" with beginners — just ask the questions in plain language.

### API Contract / Interface Design
If the app talks to any external service (Supabase, OpenAI, a third-party API), spell out the exact calls: what endpoint, what payload, what comes back. This prevents the build from stalling while the agent figures out an API it's never seen before. Include links to the relevant docs.

### Error Boundaries and Fallbacks
Not exhaustive error handling — just the 2-3 places where things will actually break during a demo. What if the API is slow? What if the database is empty? What if the user's input is weird? Decide on a simple strategy: show a loading spinner, show a helpful error message, fall back to sample data. Keep it proportional to the project scope.

### Documentation & Security Review
What does the project need to be ready to share? Walk through the README requirements, docs artifacts, and security posture now — make sure the architecture supports clean documentation and doesn't have baked-in security issues. If the app handles user data, authentication, or external APIs, those patterns need to be secure by design, not patched after the fact.

If the builder wants to deploy the app for a live link, discuss options appropriate to their stack (Vercel, Netlify, GitHub Pages, Railway, Fly.io, etc.) and make sure the architecture supports easy deployment. Verify that deployment config uses environment variables for secrets, enforces HTTPS, and has intentional CORS settings. A deployed link strengthens the project but isn't required.

## Deployment Considerations

Ask once where the builder plans to run their app:
- **Local only:** Simplest. Just needs to run on localhost. Screenshots and description carry the submission.
- **Deployed URL:** Note target platform (Vercel, Netlify, GitHub Pages, Railway, Fly.io, etc.). Include deployment steps in spec. If the builder wants to deploy but doesn't know how, help them pick an option that fits their stack.
- **Optional demo video:** The builder can record a short video and upload to YouTube or Vimeo. Not required, but it can strengthen the project.

Most builders will run locally and submit with screenshots — that's fine. Don't over-invest in deployment unless the builder specifically wants a live URL.

## Architecture Self-Review

After drafting the spec, the agent should review its own work for:
- Ambiguities that would confuse /build ("what exactly does 'handle auth' mean here?")
- Failure points ("if this API is down, the whole app breaks — is there a fallback?")
- Complexity that doesn't match the time constraint ("this data model has 6 tables for a 3-hour build")
- Mismatches between the spec and the PRD ("the PRD says users can delete items but the spec has no delete endpoint")

Surface 2-3 of the most important issues for the builder to weigh in on. Specs are living documents that benefit from review — not perfect blueprints handed down from above.
