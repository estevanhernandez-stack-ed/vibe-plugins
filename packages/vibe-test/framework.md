# Vibe Test — Testing for the Vibe-Coded Era

**A framework and plugin thesis for adding meaningful, layered testing to AI-prototyped applications.**

*626Labs — Estevan Hernandez*

---

## Part I — Thesis

### The Core Claim

**Vibe-coded applications don't fail because they lack tests — they fail because nobody told the AI what "correct" means beyond "it runs." A plugin that understands what the app actually does can generate the tests the builder never thought to write.**

Testing is the most skipped step in the vibe-coding workflow, and for a rational reason: the builder is moving fast, the prototype works on the happy path, and writing tests feels like paperwork for something that might pivot tomorrow. The problem isn't laziness — it's that traditional testing methodology assumes a spec exists before the code. In vibe coding, the code *is* the spec, and it arrived 20 minutes ago.

Vibe Test doesn't impose a testing orthodoxy. It reads the application that exists, infers what "correct" means from the code's own behavior, and generates tests that are proportional to the app's maturity and deployment risk.

### Why Vibe-Coded Apps Have a Testing Vacuum

The LLM that wrote the code understood the request. It did not understand the invariants. When a developer prompts "build a task manager with drag-and-drop," the model generates code that moves tasks between columns. It does not generate code that verifies: tasks can't exist in two columns simultaneously, drag events from unauthorized users are rejected, the state persists across page reloads, or the API endpoint behind the drag validates that the task belongs to the requesting user.

The specific failure patterns:

- **No tests at all.** The most common state. The app works in the demo, the builder ships it, and the first bug report arrives from a user who did something the demo never tried. 60-70% of vibe-coded apps ship with zero test files.
- **Generated tests that test the scaffolding.** When tests exist, they're often the LLM's idea of "good test coverage" — rendering tests that verify a component mounts, snapshot tests that pass by definition, tests that assert the mock returns what the mock was told to return. Tests that provide a green checkmark and zero confidence.
- **Happy-path-only coverage.** The tests that exist cover the intended flow. User logs in, creates a task, marks it complete. No test covers: what happens when the session expires mid-action, when the database is slow, when the user submits the form twice, when the input contains a script tag.
- **Test-code coupling.** AI-generated tests tend to mirror the implementation rather than test the behavior. Change an internal function name and twenty tests break, despite the app working identically. The tests are testing the code, not the product.
- **Missing integration layer.** Unit tests exist for individual functions. E2E tests exist for full user flows. The middle layer — does this API endpoint actually talk to this database and return the right thing? — is absent. This is where most real bugs live.
- **No test infrastructure.** No CI pipeline running tests. No coverage reports. No test database. No fixture management. The prototype has a `test` script in package.json that runs `jest` on an empty test directory and exits 0.

The pattern: **the LLM generates code that satisfies the prompt, and the prompt almost never says "and make sure it keeps working when things go wrong."**

### The Testing Pyramid for Vibe-Coded Apps

The traditional testing pyramid (unit → integration → E2E) assumes you start from the bottom and build up. Vibe-coded apps need the opposite — start from the behavior the user cares about and work down to the implementation details that support it.

#### Level 1 — Smoke Tests: Does it even work?

The absolute minimum. Can the app start? Do the main pages load? Does the primary user flow complete without errors? Smoke tests exist to catch "I deployed and nothing works" — the most common and most embarrassing failure mode.

For a vibe-coded app, smoke tests are often the highest-ROI investment. They catch the 80% case: the thing that worked in dev doesn't work in production because of an environment difference, a missing variable, a build step that silently failed.

#### Level 2 — Behavioral Tests: Does it do what it should?

Behavioral tests verify the app's actual user-facing behaviors. Not "does function X return Y" but "when a user creates a task, does it appear in their task list?" These tests are specified in terms the builder understands because they map directly to the features they built.

Behavioral tests are where Vibe Test's classifier earns its keep. A task manager needs different behavioral tests than a payment processing API. The plugin reads the app's routes, components, and data models to infer what behaviors exist and generates tests for each one.

#### Level 3 — Edge Case Tests: Does it survive the unexpected?

Edge cases are where vibe-coded apps die. Empty inputs, concurrent operations, expired tokens, duplicate submissions, Unicode in names, time zone changes, daylight saving transitions, slow networks, interrupted uploads. The LLM didn't think about these because the prompt didn't mention them.

Edge case generation is where AI testing plugins have a genuine advantage over human test writers. The plugin can systematically enumerate edge cases by category (boundary values, null/empty, concurrent, temporal, encoding) faster than a human, and it can do it for every endpoint and component rather than just the ones the developer remembers to think about.

#### Level 4 — Integration Tests: Do the pieces fit?

Integration tests verify that components actually work together. The API talks to the real database. The auth middleware actually blocks unauthorized requests. The webhook handler processes actual webhook payloads. The payment flow creates actual Stripe charges in test mode.

This is the layer most vibe-coded apps are missing entirely, and it's where the most insidious bugs hide — everything works in isolation, nothing works together.

#### Level 5 — Performance & Resilience: Does it hold up?

Load testing, stress testing, chaos testing. Does the app handle 100 concurrent users? What happens when the database is slow? When a third-party API times out? When memory pressure increases?

This layer is only relevant for production-bound applications under real load. The plugin should recommend it for apps classified as customer-facing or multi-tenant, and skip it for internal tools and prototypes.

### What "Tested Enough" Means

Same principle as Vibe Sec and Vibe Doc — the bar depends on the context.

- **Prototype / hackathon**: Smoke tests only. Can it start? Does the main flow work? That's the bar.
- **Internal tool**: Smoke + behavioral tests for core flows. Skip edge cases unless handling sensitive data.
- **Public-facing app**: Smoke + behavioral + edge cases for user-facing flows. Integration tests for data persistence and auth. Basic performance validation.
- **Regulated / enterprise**: All levels. Coverage thresholds. Regression suite. Performance baselines. Test documentation for audit.

The plugin tells you which level your app needs and what's missing for that level. Not what's missing for 100% coverage — what's missing for *your situation*.

---

## Part II — The Analysis Engine

### What the Scanner Detects

Before generating tests, Vibe Test must understand the app. The scanner builds an inventory:

#### Routes & Endpoints
- API routes (REST endpoints, GraphQL resolvers)
- Page routes (Next.js pages, React Router, Vue Router)
- Middleware chains (auth, validation, rate limiting)
- Route parameters and expected input shapes

#### Components & UI
- Renderable components and their props
- Form components with input handling
- Interactive elements (buttons, links, drag targets)
- State management connections (which components read which stores)
- Event handlers and side effects

#### Data Models
- Database schemas (Prisma, TypeORM, Mongoose, raw SQL)
- API response shapes (inferred from handler return types)
- Validation schemas (Zod, Joi, Yup)
- Relationships between models

#### External Integrations
- Third-party API calls (Stripe, SendGrid, Twilio, etc.)
- Database connections (type, ORM, connection config)
- File storage (S3, local, cloud storage)
- Auth providers (Firebase Auth, Auth0, Clerk, etc.)
- Message queues, webhooks, cron jobs

#### Existing Test Infrastructure
- Test framework present? (Jest, Vitest, Mocha, Playwright, Cypress)
- Test files that exist and what they cover
- Test configuration (jest.config, vitest.config, playwright.config)
- CI pipeline with test step?
- Coverage reports?
- Test utilities, fixtures, factories?

### Classification Matrix

The app type and deployment context determine which test levels are mandatory:

| App Type | Smoke | Behavioral | Edge Case | Integration | Performance |
|----------|-------|-----------|-----------|-------------|-------------|
| Static site | Required | Optional | Skip | Skip | Skip |
| SPA (client-only) | Required | Required | Recommended | Skip | Optional |
| SPA + API | Required | Required | Required | Required | Recommended |
| Full-stack + DB | Required | Required | Required | Required | Recommended |
| API service | Required | Required | Required | Required | Required |
| Multi-tenant SaaS | Required | Required | Required | Required | Required |

### Context Modifiers

- **Regulated**: Integration tests become mandatory. Test documentation required. Coverage threshold enforced.
- **Customer-facing**: Edge case testing elevated. Error handling tests mandatory.
- **Multi-tenant**: Tenant isolation tests mandatory. Cross-tenant data leakage tests.
- **Real-time / collaborative**: Concurrency tests mandatory. State synchronization tests.
- **Financial / payment**: Transaction integrity tests. Idempotency tests. Decimal precision tests.

---

## Part III — The Test Generator

### Generation Strategy

Vibe Test doesn't dump 500 test files and call it done. It generates in priority order based on classification:

#### Phase 1: Infrastructure Setup
Before any test, ensure the test framework is configured:
- Detect or recommend test framework (Vitest for Vite projects, Jest otherwise, Playwright for E2E)
- Generate test configuration files
- Set up test database/fixtures if needed
- Add test scripts to package.json
- Configure CI test step if pipeline exists

#### Phase 2: Smoke Tests
Generate for every app:
- App boots without errors
- Main pages/routes respond with 200
- Primary user flow completes (login → core action → logout)
- API health endpoint responds
- Database connection succeeds

#### Phase 3: Behavioral Tests
Generated per route/component, ranked by usage criticality:
- CRUD operations on each data model
- Auth flow (register, login, logout, password reset)
- Core business logic (the thing the app actually does)
- Form submissions with valid data
- Navigation between main sections

#### Phase 4: Edge Case Tests
Generated systematically by category:

**Input boundaries:**
- Empty strings, null, undefined
- Maximum length inputs
- Special characters (Unicode, emoji, HTML entities)
- Number boundaries (0, -1, MAX_INT, decimals)

**State boundaries:**
- Expired sessions/tokens
- Concurrent modifications
- Race conditions on shared resources
- Stale data after background updates

**Error paths:**
- Network failures (API timeout, disconnect)
- Invalid data from external services
- Missing required fields
- Duplicate submissions
- Unauthorized access attempts

#### Phase 5: Integration Tests
Generated based on detected integration points:
- API endpoint → database round-trip
- Auth middleware enforcement
- Webhook payload processing
- Third-party API mock/sandbox testing
- File upload → storage → retrieval

### Test Quality Principles

Generated tests follow strict quality rules:

- **Test behavior, not implementation.** Tests should pass even if the code is refactored, as long as the behavior is preserved.
- **Descriptive names.** `it('should return 401 when session token is expired')` not `it('test auth')`.
- **Independent tests.** No test depends on another test's side effects. Each test sets up its own state.
- **Realistic data.** Use factories/fixtures with plausible data, not `"test"` and `123`.
- **Fast by default.** Mock external services. Use in-memory databases for unit tests. Reserve real integrations for integration test suite.
- **One assertion per concept.** A test that checks five things is five tests pretending to be one.

### Fix Confidence for Test Generation

- **High (0.9+)**: Smoke tests, basic CRUD behavioral tests, input boundary tests. Safe to generate and add to CI.
- **Medium (0.7-0.89)**: Edge case tests, auth flow tests. Likely correct but may need fixture adjustments.
- **Low (<0.7)**: Integration tests with complex setup, performance tests. Plugin generates the skeleton and asks the builder to fill in specifics.

---

## Part IV — Self-Evolution (Level 2)

### Builder Testing Profile

`~/.claude/plugins/data/vibe-test/profile.json`

```json
{
  "schema_version": 1,
  "builder": {
    "name": null,
    "testing_experience": null,
    "preferred_framework": null,
    "preferred_assertion_style": "expect",
    "preferred_test_location": "colocated",
    "auto_generate_threshold": 0.9,
    "coverage_target": null,
    "last_updated": null
  },
  "generation_preferences": {
    "test_style": "descriptive",
    "mock_strategy": "minimal",
    "fixture_approach": "factory",
    "skip_levels": [],
    "custom_patterns": []
  }
}
```

- `preferred_test_location`: `"colocated"` (tests next to source) vs `"__tests__"` (separate directory) vs `"test/"` (root test folder)
- `mock_strategy`: `"minimal"` (mock only external services) vs `"aggressive"` (mock everything)
- `fixture_approach`: `"factory"` (generate per test) vs `"fixtures"` (shared fixture files) vs `"inline"` (data in each test)

### Per-Project Test State

`<project>/.vibe-test/state.json`

```json
{
  "schema_version": 1,
  "last_scan": null,
  "classification": {
    "app_type": null,
    "deployment_context": null,
    "testing_tier": null,
    "confidence": 0
  },
  "inventory": {
    "routes": [],
    "components": [],
    "models": [],
    "integrations": []
  },
  "test_coverage": {
    "smoke": { "status": "none", "count": 0 },
    "behavioral": { "status": "none", "count": 0 },
    "edge_case": { "status": "none", "count": 0 },
    "integration": { "status": "none", "count": 0 },
    "performance": { "status": "none", "count": 0 }
  },
  "generated_tests": [],
  "rejected_tests": [],
  "framework": null,
  "ci_integrated": false
}
```

### Session Memory

`~/.claude/plugins/data/vibe-test/sessions/<date>.jsonl`:

```json
{
  "timestamp": "2026-04-15T14:30:00Z",
  "command": "generate",
  "project": "my-app",
  "tests_generated": 24,
  "tests_accepted": 20,
  "tests_rejected": 4,
  "rejection_reasons": ["too_verbose", "wrong_fixture", "duplicate_coverage"],
  "levels_covered": ["smoke", "behavioral"],
  "framework_used": "vitest",
  "friction_notes": ["user wanted simpler assertions"]
}
```

### What Level 2 Enables

- **Remembers your test style.** If you consistently reject verbose tests in favor of concise ones, future generation adapts.
- **Learns your fixture preferences.** Factory functions vs shared fixtures vs inline data — the plugin matches your pattern.
- **Tracks rejection patterns.** If you reject every edge case test for Unicode handling, the plugin stops generating them (but notes the gap in reports).
- **Cross-project test maturity.** Sees that your last 3 projects all lacked integration tests — suggests it as a systemic pattern worth addressing.
- **Progressive complexity.** First project gets simple smoke tests. By your fifth project, the plugin knows you can handle integration test setup and generates more sophisticated tests from the start.

---

## Part V — Plugin Architecture

### Commands

| Command | Purpose |
|---------|---------|
| `/scan` | Analyze the app and assess test coverage gaps |
| `/generate` | Generate tests for identified gaps, by priority |
| `/fix` | Fix failing or broken existing tests |
| `/coverage` | Report current test coverage by level and area |
| `/check` | CI-safe pass/fail against the app's testing tier |
| `/status` | Current test posture summary |

### Skills

| Skill | Purpose |
|-------|---------|
| `scan` | App inventory and test gap analysis |
| `generate` | Conversational test generation with priority ordering |
| `fix` | Diagnose and repair failing tests |
| `coverage` | Coverage analysis and reporting |
| `check` | CI/deployment gate check |
| `guide` | Shared behavior, classification, quality principles |

### CLI Package

`@vibe-test/cli` — deterministic testing operations:

```bash
vibe-test scan                    # Analyze app, identify test gaps
vibe-test generate                # Generate all priority tests
vibe-test generate --level smoke  # Generate smoke tests only
vibe-test generate --route /api/* # Generate tests for specific routes
vibe-test fix                     # Fix broken existing tests
vibe-test coverage                # Coverage report by level
vibe-test check                   # CI pass/fail
vibe-test check --strict          # Fail if any level below threshold
```

### Integration Points

- **Vibe Doc**: Test plan documentation generation from test inventory
- **Vibe Sec**: Security scan findings generate security-specific test cases
- **626Labs Dashboard**: Test coverage logged as project health metric
- **CI/CD**: `vibe-test check` as a GitHub Action
- **Pre-commit hook**: Run smoke tests before every commit
- **Watch mode**: Regenerate tests when source files change

---

## Part VI — Scope Definition

### What Vibe Test IS

- A test analyzer that understands what a vibe-coded app does and what tests it needs
- A test generator that produces behavior-focused, quality tests proportional to app maturity
- A classifier that tailors testing requirements to app type and deployment context
- A test infrastructure bootstrapper (framework setup, CI integration, fixture management)
- A CI gate that enforces tier-appropriate test coverage
- A learning tool that remembers your testing style and preferences

### What Vibe Test IS NOT

- A test runner (it generates tests; your existing framework runs them)
- A mutation testing tool (it doesn't verify test quality by breaking code)
- A visual regression tool (it doesn't compare screenshots)
- A load testing platform (it recommends load tests but doesn't run them at scale)
- A replacement for understanding your own tests
- A 100%-coverage machine (it targets meaningful coverage, not vanity metrics)

### v1 Scope (Ship Target)

**In scope:**
- App inventory scanning (routes, components, models, integrations)
- Classification-driven test level prioritization
- Test infrastructure setup (framework config, CI integration)
- Smoke test generation for any app
- Behavioral test generation for routes and core flows
- Edge case test generation for input handling and error paths
- Basic integration test skeletons
- Test fix command for broken existing tests
- Coverage reporting by test level
- CI check command
- Level 2 self-evolution (profile + session memory)
- JavaScript/TypeScript apps (React, Next.js, Express, Fastify, etc.)

**Out of scope for v1:**
- Performance/load test generation — v2
- Visual regression testing — v2
- Python/Go/Rust test generation — v2
- Test data management (seed databases, factory libraries) — v2
- Flaky test detection and repair — v2
- Test parallelization optimization — v2
- Contract testing for microservices — v2

### Success Metrics

- Time from "zero tests" to "smoke tests passing in CI": < 5 minutes
- Percentage of generated tests that pass on first run: > 85%
- False positive rate (tests that fail but app is correct): < 5%
- Builder understands every generated test without reading source: > 90%
- Test generation respects app classification (doesn't over-test prototypes): measurable via tests-per-tier ratio
