# Vibe Test

**Test analyzer and generator for vibe-coded apps.**

Vibe-coded apps don't fail because they lack tests — they fail because nobody told the AI what "correct" means beyond "it runs." Vibe Test reads the app that exists, infers what "correct" means from the code's own behavior, and generates tests proportional to the app's maturity and deployment risk.

## Status

**Framework drafted. Implementation pending.** See [framework.md](./framework.md) for the full thesis, testing pyramid, generation strategy, and v1 scope.

Version `0.0.1` is reserved for the first working implementation.

## What it will do (v1)

- **App inventory scanner** — routes, components, models, integrations, existing test infrastructure
- **Classification-driven tier assignment** — static sites need less; multi-tenant SaaS needs more
- **Test infrastructure setup** — detects or recommends a framework (Vitest for Vite, Jest otherwise, Playwright for E2E), configures CI
- **Smoke test generation** for every app
- **Behavioral test generation** for routes, core flows, CRUD operations
- **Edge case generation** by category (boundary, state, error path)
- **Integration test skeletons** where integration points are detected
- **Test fix command** for broken existing tests
- **Coverage reporting by level** — not raw line coverage, but which tiers have meaningful coverage
- **CI check command** against the app's testing tier
- **Level 2 self-evolution** — profile + session memory with rejection-pattern learning

## Test quality principles

Generated tests follow strict rules:

- Test **behavior**, not implementation — tests survive refactors
- Descriptive names — `it('should return 401 when session token is expired')`
- Independent tests — no cross-test dependencies
- Realistic fixture data
- Fast by default — mocks for unit tests, real integrations only where the value justifies the cost
- One assertion per concept

## What it won't be (v1)

- A test runner (your existing framework runs tests)
- A mutation testing tool
- A visual regression platform
- A load testing platform
- A 100%-coverage machine — meaningful coverage, not vanity metrics

## Relationship to other Vibe plugins

- **Vibe Doc** — generated tests inform test plan documentation
- **Vibe Sec** — security findings suggest specific test cases
- **Vibe Cartographer** — testing tier planning fits into the `/spec` and `/checklist` flow

## License

MIT
