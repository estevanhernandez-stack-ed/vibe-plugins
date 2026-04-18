# Breadcrumb Heuristics

Reference for agents. Defines artifact patterns, gap questions, and extraction strategies for each of the 7 doc types.

**Used by:** Scan skill (during gap identification), Generate skill (synthesis questions).

---

## 1. Threat Model

**Purpose:** Identify attack surfaces, threats, and mitigations. Required for security reviews and regulated deployments.

### Keywords (Search Artifacts For)

- auth, security, HTTPS, encryption, credentials, secrets, API key, token, permission, role, access control
- data sensitive, PII, PHI, financial, payment, database, encryption at rest, encryption in transit
- vulnerability, threat, attack, injection, XSS, CSRF, DDoS, Man-in-the-Middle, privilege escalation
- compliance, HIPAA, PCI-DSS, SOC 2, GDPR, audit, logging, breach, incident

### File Patterns (Search Project For)

- `security/`, `threat*`, `risk*`, `architecture/security*`
- `.env`, `.env.example`, `.env.production` (credential patterns)
- `src/auth*`, `src/*auth*`, `services/*security*`
- `CLAUDE.md`, `.cursorrules` (often discuss security decisions)
- `docs/*security*`, `docs/*threat*`, `docs/*risk*`

### Git Patterns

- Commits mentioning "security", "HIPAA", "auth", "credentials", "vulnerability", "patch"
- Commits from security team or external auditors
- PRs titled with "security", "CVE", "fix vulnerability"

### Code Patterns

```
- Firebase auth configuration (custom claims, JWT validation)
- Role-based access control (RBAC) middleware
- Database encryption (Mongoose schema with encrypt flag)
- API authentication (Bearer tokens, API keys)
- Input validation and sanitization patterns
- Dependencies flagged by `npm audit`
```

### Required Sections (In Generated Doc)

1. **Executive Summary** — key threats, overall risk level
2. **Attack Surface Inventory** — entry points, users, data flows
3. **Threat Scenarios** — specific attack trees (access control breach, data exposure, injection, DoS)
4. **Mitigations** — controls for each threat
5. **Compliance Mapping** — regulations applicable to threats
6. **Residual Risk** — threats mitigated vs. accepted

### Gap Questions (For Synthesis)

When generating a Threat Model, ask:

1. **"Beyond authentication and data encryption, what other sensitive operations exist?"** (payments, admin functions, external integrations?)
2. **"Are there known external dependencies or services your app relies on?"** (Firebase, Stripe, third-party APIs, cloud providers?)
3. **"Have you ever had a security incident, breach attempt, or audit finding?"** (helps identify real-world threats vs. theoretical)
4. **"What's your most sensitive data?"** (customer PII, payment info, health records, IP, competitive data?)

---

## 2. Architecture Decision Records (ADRs)

**Purpose:** Capture the why behind major tech choices and design decisions. Helps future maintainers understand tradeoffs.

### Keywords (Search Artifacts For)

- chose, decision, trade-off, tradeoff, why, because, instead of, considered, vs., rejected
- architecture, design, pattern, framework, library, language, database, infrastructure
- considered, alternative, option, proposal, RFC, design doc

### File Patterns (Search Project For)

- `ADR/`, `docs/adr/`, `architecture/`, `.ai/ARCHITECTURE.md`
- `CLAUDE.md` (planning and decision discussions)
- `.cursorrules`, `.agent/skills/` (design philosophy)
- `docs/architecture*`, `docs/design*`

### Git Patterns

- Commits that introduce major changes ("feat: migrate to microservices", "refactor: switch to GraphQL")
- Commit messages with reasoning ("Use PostgreSQL instead of MongoDB for consistency")
- Large diffs with explanatory messages
- Merges of significant feature branches

### Code Patterns

```
- Technology presence in package.json or equivalent (React, Node, TypeScript, Flask, etc.)
- Architectural code organization (flat vs. feature-sliced, service-oriented vs. monolith)
- Pattern implementations (MVC, CQRS, event-sourcing, etc.)
- Framework configuration (Next.js vs. plain React, Express vs. Fastify)
- Build/deploy patterns (Docker, serverless, Kubernetes, etc.)
```

### Required Sections (In Generated Doc)

1. **Decision Statement** — what was decided, when
2. **Context** — problem being solved, constraints
3. **Options Considered** — alternatives evaluated
4. **Decision** — which option was chosen
5. **Rationale** — why this option vs. others
6. **Consequences** — positive and negative impacts
7. **Status** — accepted, superseded, deprecated, etc.

### Gap Questions (For Synthesis)

When generating ADRs, ask:

1. **"What major architectural decisions have you made?"** (tech stack, monolith vs. microservices, database choice, auth approach?)
2. **"Were there competing options you considered?"** (e.g., "We could have used microservices but chose monolith because...")
3. **"Have any major decisions been revisited or changed?"** (migrations, framework upgrades, pattern shifts?)

---

## 3. Runbook

**Purpose:** Step-by-step operational procedures. Helps on-call engineers deploy, debug, and recover from incidents.

### Keywords (Search Artifacts For)

- deploy, deployment, rollback, emergency, incident, alarm, alert, monitoring, health check, SLA, uptime
- steps, procedure, checklist, guide, how to, troubleshoot, debug, restart, recover, failover
- environment, staging, production, configuration, environment variable, secret, credentials

### File Patterns (Search Project For)

- `.github/workflows/`, `.gitlab-ci.yml`, CircleCI config (CI/CD procedures)
- `Dockerfile`, `kubernetes/`, `terraform/`, `docker-compose.yml` (infrastructure)
- `monitoring/`, `alerts/`, `dashboards/` (observability setup)
- `docs/deploy*`, `docs/runbook*`, `docs/operations*`
- `.env.example`, `config/` (configuration patterns)

### Git Patterns

- Commits deploying to production ("deploy: v1.2.3 to production")
- Hotfix branches and emergency merges
- Changes to CI/CD configs or infrastructure code
- Commits reverting previous changes (hints at rollback scenarios)

### Code Patterns

```
- Entry point files (bin/cli.js, main.py, src/index.ts)
- Server startup code (port binding, connection pools, health checks)
- Environment variable usage (dotenv, process.env, ConfigMap)
- Error handling and graceful shutdown
- Database connection and migration patterns
- Logging setup (Winston, Pino, structured logging)
- Health check endpoints (/health, /status, /metrics)
```

### Required Sections (In Generated Doc)

1. **Pre-Deployment Checklist** — what to verify before deploying
2. **Deployment Steps** — exact commands or UI steps
3. **Monitoring & Verification** — how to verify successful deployment
4. **Rollback Procedure** — how to revert if something breaks
5. **Common Issues & Troubleshooting** — incident scenarios and fixes
6. **On-Call Escalation** — who to contact, when
7. **SLAs & Targets** — uptime targets, acceptable downtime

### Gap Questions (For Synthesis)

When generating a Runbook, ask:

1. **"What's your typical deployment frequency?"** (daily, weekly, on-demand? How long does a deploy take?)
2. **"How do you monitor health after deploying?"** (health checks, monitoring dashboards, alerts? What indicates a problem?)
3. **"What's your rollback procedure?"** (revert code, database migrations, zero-downtime strategies?)
4. **"Have you had production incidents?"** (helps identify real troubleshooting scenarios vs. theoretical)

---

## 4. API Specification

**Purpose:** Document interface contracts for REST/GraphQL/gRPC services. Helps clients understand endpoints and integrate correctly.

### Keywords (Search Artifacts For)

- endpoint, route, path, GET, POST, PUT, DELETE, PATCH, method, request, response, parameter, query, body
- status code, error, 200, 404, 500, validation, authentication, authorization
- schema, type, interface, contract, OpenAPI, Swagger, GraphQL, schema.graphql

### File Patterns (Search Project For)

- `src/routes*`, `src/api*`, `controllers/`, `handlers/` (endpoint definitions)
- `openapi.yml`, `swagger.json`, `schema.graphql`, `.graphqlconfig` (existing API docs)
- `src/types*`, `src/models*`, `src/schema*` (data schemas)
- `docs/api*`, `docs/endpoints*`
- `package.json` → look for swagger, openapi, apollo, graphql packages

### Git Patterns

- Commits adding or changing endpoints ("feat: add /users endpoint", "breaking: rename /profile to /me")
- Changes to API version or contract
- Commits discussing API design decisions

### Code Patterns

```
- Express/Fastify route definitions (app.get('/users', ...))
- GraphQL resolvers and type definitions
- Request validation (joi, zod, class-validator)
- Error handling and response formatting
- Authentication middleware (JWT, API key)
- Rate limiting and pagination logic
- Request/response transformation (serializers)
```

### Required Sections (In Generated Doc)

1. **Authentication** — how to authenticate requests
2. **Base URL & Versioning** — endpoint location and version strategy
3. **Endpoints** — for each endpoint:
   - HTTP method and path
   - Description
   - Request parameters (query, body, headers)
   - Response structure
   - Possible status codes and errors
4. **Error Handling** — standard error response format
5. **Rate Limiting** — request limits and throttling
6. **Pagination** — cursor or offset-based pagination

### Gap Questions (For Synthesis)

When generating an API Spec, ask:

1. **"How do clients authenticate?"** (API keys, OAuth, JWT, mutual TLS?)
2. **"Do you have rate limiting or quotas?"** (requests per minute, per user, etc?)
3. **"How do you handle errors?"** (specific error codes, error messages, retry behavior?)
4. **"Is there pagination for list endpoints?"** (cursor-based, offset, or limit/offset?)

---

## 5. Deployment Procedure

**Purpose:** Document the build, test, and deploy pipeline. Helps teams understand CI/CD and control deployment gates.

### Keywords (Search Artifacts For)

- build, test, deploy, push, merge, release, version, tag, branch, pipeline, stage, step, approval, gate
- testing, unit test, integration test, E2E test, coverage
- environment, staging, production, approval, rollout, canary, blue-green

### File Patterns (Search Project For)

- `.github/workflows/`, `.gitlab-ci.yml`, `circle.yml`, `Jenkinsfile` (CI/CD configs)
- `Dockerfile`, `.dockerignore` (build)
- `package.json` scripts, `Makefile`, `scripts/` (build commands)
- `.github/` → `CODEOWNERS`, `pull_request_template.md` (approval gates)
- `docs/deploy*`, `docs/ci*`, `docs/pipeline*`

### Git Patterns

- Branch naming conventions (main, develop, release/*, feature/*, hotfix/*)
- Release tags (v1.0.0, v2.1.3)
- Protected branch rules (require reviews, passing checks)
- Release commits or merge patterns

### Code Patterns

```
- Build outputs (dist/, build/, .next/)
- Test configuration (jest.config.js, vitest.config.ts, pytest.ini)
- Environment variables for different stages (development, staging, production)
- Health checks in startup code
- Feature flags or configuration for deployment stages
- Database migration scripts
```

### Required Sections (In Generated Doc)

1. **Pipeline Overview** — stages from commit to production
2. **Build Stage** — compile, bundle, create artifacts
3. **Test Stage** — unit, integration, E2E tests; coverage requirements
4. **Approval Gates** — who approves, what checks must pass
5. **Deployment Stage** — push to staging, then production; strategy (rolling, blue-green, canary)
6. **Verification** — health checks, smoke tests post-deploy
7. **Rollback** — how to revert if deployment fails

### Gap Questions (For Synthesis)

When generating a Deployment Procedure, ask:

1. **"What stages does your pipeline have?"** (build → test → staging → production? Other stages?)
2. **"Are there approval gates?"** (who approves deployments, what checks must pass?)
3. **"What's your deployment strategy?"** (rolling updates, blue-green, canary, big bang?)
4. **"How long does the full pipeline take?"** (helps set expectations for CI/CD performance)

---

## 6. Test Plan

**Purpose:** Document testing strategy, coverage targets, and test scenarios. Helps teams understand QA approach and regression risk.

### Keywords (Search Artifacts For)

- test, unit test, integration test, E2E, end-to-end, testing, QA, quality assurance
- coverage, percent, target, benchmark, suite
- scenario, case, browser, device, performance, load, stress

### File Patterns (Search Project For)

- `__tests__/`, `tests/`, `test/`, `spec/` (test files)
- `jest.config.js`, `vitest.config.ts`, `cypress.config.ts`, `playwright.config.ts` (test configs)
- `coverage/`, `.nyc_output/` (coverage reports)
- `.github/workflows/*test*` (CI test stages)
- `docs/testing*`, `docs/qa*`, `docs/test-plan*`

### Git Patterns

- Commits with test files (*.test.js, *.spec.ts)
- PR requirements for coverage or test additions
- Test-related commits ("test: add scenarios for login flow")

### Code Patterns

```
- Test helper utilities (fixtures, factories, mocks)
- Test data generators or seed files
- Cypress/Playwright page object models (E2E structure)
- Mock service workers or API mocking
- Coverage configuration (include/exclude patterns)
- Test database setup (SQLite for tests, not production DB)
```

### Required Sections (In Generated Doc)

1. **Testing Strategy** — approach to testing (unit, integration, E2E split)
2. **Coverage Targets** — lines, branches, functions (e.g., 80% coverage required)
3. **Unit Tests** — what's tested at the unit level
4. **Integration Tests** — service-to-service, database interactions
5. **E2E Tests** — critical user journeys (signup, login, purchase, etc.)
6. **Performance Tests** — load testing, benchmarks (if applicable)
7. **Test Data** — how test environments are seeded
8. **Manual Testing** — scenarios that require manual QA

### Gap Questions (For Synthesis)

When generating a Test Plan, ask:

1. **"What's your coverage target?"** (unit, integration, E2E split? e.g., 80% overall?)
2. **"What are the critical user journeys?"** (signup, login, core workflow, payment, etc?)
3. **"Do you test on multiple browsers or devices?"** (cross-browser testing, mobile, etc?)
4. **"Do you have performance or load testing?"** (target response times, concurrent users?)

---

## 7. Data Model Documentation

**Purpose:** Document database schemas, entities, relationships, and data pipelines. Helps teams understand data structure and dependencies.

### Keywords (Search Artifacts For)

- schema, table, entity, relationship, primary key, foreign key, index, migration, database
- model, ORM, Mongoose, Sequelize, TypeORM, SQLAlchemy, Prisma
- data type, nullable, unique, constraint, default, validation

### File Patterns (Search Project For)

- `db/migrations/`, `migrations/` (schema evolution)
- `src/models/`, `src/entities/`, `src/db/schema*` (data schemas)
- `schema.sql`, `init.sql`, database definition files
- `docs/data*`, `docs/schema*`, `docs/database*`
- `package.json` → ORM packages (prisma, mongoose, sequelize, typeorm, sqlalchemy)

### Git Patterns

- Commits adding migrations ("feat: add users table", "refactor: rename column")
- Schema change PRs
- Data-related commits (seeding, backfill, cleanup)

### Code Patterns

```
- ORM model definitions (Mongoose schemas, Prisma models, SQLAlchemy models)
- Database indexes and constraints
- Relationship definitions (1-to-many, many-to-many)
- Validation rules (required, unique, constraints)
- Migration files with up/down logic
- Seed files for test data
- Query patterns and optimization notes
```

### Required Sections (In Generated Doc)

1. **Entity-Relationship Diagram** — tables/collections and relationships
2. **Entity Definitions** — for each table/collection:
   - Purpose
   - Fields (name, type, nullable, constraints, default)
   - Indexes
   - Relationships to other entities
3. **Data Lifecycle** — creation, updates, deletion, retention
4. **Scaling & Performance** — indexes for common queries, sharding strategy (if applicable)
5. **Backup & Recovery** — backup frequency, restoration procedures
6. **Data Quality** — validation rules, constraints

### Gap Questions (For Synthesis)

When generating Data Model Documentation, ask:

1. **"What's the main data domain?"** (users, products, transactions, events, etc?)
2. **"Are there special data handling requirements?"** (PII, encryption, retention, regional residency?)
3. **"What are the most important queries?"** (by user, by date, search, reporting?)
4. **"Do you need to scale?"** (projection of data growth, sharding strategy?)

---

## Heuristic Application

**During Scan skill:**
For each detected document type, use keywords/patterns to search artifacts. If found, mark as "exists". If not found but artifact signals suggest the doc is needed, mark as "missing" in gap report.

**During Generate skill:**
For each selected gap, use the "Gap Questions" to ask for synthesis information. Save answers and pass to CLI generation command. Present the generated doc showing confidence per section based on extraction quality.

---

## Confidence Scoring

**High confidence (>85%):**
- Extracted directly from explicit sources (commit messages, code comments, .ai/ARCHITECTURE.md)
- Supported by multiple artifact signals
- User confirmed in synthesis questions

**Medium confidence (60-85%):**
- Inferred from code patterns or structure
- Supported by single artifact source
- Some user clarification provided

**Low confidence (<60%):**
- Pattern-matched but not confirmed
- Theoretical or best-practice suggestion
- No direct artifact source found

---

**Last updated:** 2026-04-11 | **Reference version:** 1.0
