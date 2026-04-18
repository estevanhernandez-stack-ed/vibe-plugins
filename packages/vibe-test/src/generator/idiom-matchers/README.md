# Idiom Matchers

Framework-specific test-file fragment templates consumed by the generate SKILL.

## How matchers are used

At generation time, the SKILL:

1. Reads `inventory.test_frameworks` from the audit state to pick a framework.
2. Calls `getIdiomMatcher(framework)` to get the matching `IdiomMatcher` bundle.
3. Reads 2-3 similar existing tests in the repo to learn the project's idiom (import style, assertion patterns, fixture approach).
4. Picks one of the four templates (`smoke` / `behavioral` / `edge` / `integration`) based on the audit gap's test level.
5. Calls the template's `render()` with SKILL-supplied `subject_*` fields.
6. Prepends the auto-write header via `renderHeader()` when confidence ≥ 0.90.
7. Applies SKILL-side post-processing to match the repo's idiom (adjust import order, convert `expect(...)` to the project's assertion style if it differs, etc.).

The templates are **starting points**, not drop-in generated tests. The SKILL's reasoning bridges the gap between the generic template and the repo-specific idiom.

## Adding a new framework

1. Create `<framework>.ts` next to `vitest.ts` / `jest.ts`.
2. Export a `const <framework>Matcher: IdiomMatcher = { framework: '<framework>', templates: { ... }, renderHeader: ... }`.
3. Implement the four required templates (smoke, behavioral, edge, integration) via `render(input: IdiomRenderInput) => string`.
4. Register the matcher in `index.ts`'s `MATCHERS` map.
5. Add unit tests at `tests/unit/generator/idiom-matchers.test.ts` verifying the rendered output carries expected framework-specific imports / call sites.

## Rendering rules

- Keep templates **concise**. A 5-line smoke test is better than a 20-line "everything bagel" template the SKILL has to trim.
- Always include a `// TODO:` line where SKILL reasoning should fill in real input / assertions. The template establishes the idiom; the SKILL adds the semantic content.
- Match the framework's conventions: vitest imports `{ describe, it, expect }`; jest uses globals.
- Include `@testing-library/react` imports when `subject_kind === 'component'`.
- No environment-specific setup (jsdom, node, happy-dom) in the template — the repo's `vitest.config.ts` / `jest.config.js` handles that.

## What the SKILL owns (not the matcher)

- Real behavior descriptions in `it()` titles (beyond the `behavior_hint` default).
- Fixture construction — if the project uses factories, the SKILL invokes `tests/factories/*` imports; the matcher just leaves a `// TODO:` stub.
- Env-var annotation comments — added by the env-var-scanner, not the idiom matcher.
- Confidence-tier routing — the matcher doesn't know if a test is HIGH / MEDIUM / LOW; the SKILL decides and calls `renderHeader` accordingly.

## File layout

```
src/generator/idiom-matchers/
├── index.ts              # barrel + getIdiomMatcher + shared types
├── vitest.ts             # vitest templates
├── jest.ts               # jest templates
└── README.md             # this file
```

## Versioning note

Template output is **not** a stable public API. The SKILL adapts to template drift via its "read 2-3 similar existing tests" step. Changing a template is a v0.N+1 change, not a breaking release — but the `IdiomMatcher` interface itself is stable and any consumer importing from `@esthernandez/vibe-test/generator` relies on it.
