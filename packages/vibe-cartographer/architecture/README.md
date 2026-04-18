# Architecture Docs

This folder contains architecture guidance that the plugin reads during `/onboard` and uses throughout the entire workflow — especially in `/spec` and `/checklist`.

## How It Works

During `/onboard`, the agent asks the builder to point to their architecture docs. These docs tell the agent:
- What stack/framework to recommend or default to
- What patterns and conventions to follow
- What deployment targets to assume
- What file structure conventions to use

The agent reads these docs and uses them as the foundation for all technical decisions in `/spec`, `/checklist`, and `/build`.

## Providing Your Own Architecture Docs

You can replace or extend the files in this folder with your own. The agent will read everything in `architecture/` during onboard. Your docs can be:

- A single `architecture.md` covering everything
- Multiple files organized by concern (e.g., `stack.md`, `patterns.md`, `deployment.md`)
- A mix of the above

### What to Include

At minimum, your architecture docs should cover:

1. **Stack** — Languages, frameworks, key libraries, and why
2. **Patterns** — Common architectural patterns for this stack (component structure, data flow, state management)
3. **File Structure** — Expected project layout with annotations
4. **Deployment** — Where and how the app runs (local, cloud, container, etc.)
5. **Conventions** — Naming, code style, testing approach, anything the agent should follow

### What NOT to Include

- Project-specific requirements (those belong in the PRD and spec)
- Business logic (that's discovered during `/scope` and `/prd`)
- One-off decisions (those happen in `/spec` conversation)

## Default Patterns

The included `default-patterns.md` provides a set of common stack patterns the agent can recommend from if no specific architecture is mandated. If you're providing your own architecture docs, you can delete or ignore this file — the agent will prefer your docs over the defaults.
