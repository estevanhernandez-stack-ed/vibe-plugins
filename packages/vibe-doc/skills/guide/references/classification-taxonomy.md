# Classification Taxonomy

Reference for Vibe Doc agents. Defines the 8 primary categories and 5 deployment contexts.

**Used by:** Scan skill (classification step), Generate skill (doc type selection).

---

## Primary Categories (8)

### 1. Web Application

**Definition:** Browser-based application with a frontend (React, Vue, Angular, etc.) and typically a backend service.

**Signals:**
- HTML/CSS/JavaScript assets in source tree
- Framework files (package.json with react/vue/angular, frontend build config)
- User authentication and sessions
- Database or data persistence layer
- API endpoints for frontend consumption

**Examples:**
- SaaS dashboards
- Content platforms
- Collaborative tools
- Admin panels

**Documentation focus:**
- User flows and access patterns
- API contracts (frontend ↔ backend)
- Deployment architecture (CDN, load balancing, session management)
- Security boundaries (auth, CORS, CSP)

**Required doc types:**
- Architecture Decision Records (decisions about tech stack, backend structure)
- Runbook (deployment, rollback, scaling)
- Threat Model (auth flows, data exposure, client-side vulnerabilities)
- Test Plan (end-to-end scenarios, cross-browser)

---

### 2. API / Microservice

**Definition:** Standalone service that exposes a programmatic interface (REST, GraphQL, gRPC, etc.), typically consumed by other services or client applications.

**Signals:**
- Route/endpoint definitions in code
- API documentation files (OpenAPI/Swagger, GraphQL schema)
- Request/response serialization (JSON, Protocol Buffers)
- Service-to-service communication patterns
- No frontend assets
- Containerization (Dockerfile)

**Examples:**
- REST APIs
- GraphQL servers
- gRPC services
- Webhook handlers
- Internal microservices

**Documentation focus:**
- Interface contracts (input/output specs, error codes)
- Deployment topology (scaling, service discovery, networking)
- Integration with other services
- Monitoring and alerting

**Required doc types:**
- API Specification (contract, versioning, error handling)
- Architecture Decision Records (service boundaries, protocol choice)
- Runbook (deployment, scaling, health checks)
- Threat Model (authentication, input validation, service-to-service trust)

---

### 3. Data Pipeline

**Definition:** ETL/ELT system that ingests, transforms, and outputs data. Can be batch (scheduled jobs) or streaming (continuous processing).

**Signals:**
- Job definitions (Airflow DAGs, Spark jobs, Cloud Functions with schedules)
- Data transformation code (pandas, dbt, SQL, Spark transformations)
- Scheduling configuration (cron, event triggers)
- Data source/sink configurations (databases, data lakes, message queues)
- Schema definitions or migrations

**Examples:**
- Analytics pipelines
- Data warehouses (ELT into Snowflake, BigQuery, Redshift)
- Real-time streaming (Kafka consumers, Dataflow)
- Report generation jobs
- ML training pipelines

**Documentation focus:**
- Data lineage and transformations
- SLAs and failure handling
- Data quality and validation
- Scheduling and dependencies

**Required doc types:**
- Data Model Documentation (schemas, transformations, lineage)
- Architecture Decision Records (orchestration tool choice, scheduling strategy)
- Runbook (job execution, failure recovery, data backups)
- Threat Model (data access controls, encryption, retention)

---

### 4. Infrastructure / Platform

**Definition:** Systems software that manages compute, networking, storage, or development tooling. Typically consumed internally by other services.

**Signals:**
- Infrastructure-as-code (Terraform, CloudFormation, Helm, etc.)
- Container orchestration (Kubernetes manifests, Docker Compose)
- Monitoring and observability configurations (Prometheus, Datadog, etc.)
- CLI or library interfaces
- Configuration management (Ansible, Chef, Puppet, etc.)

**Examples:**
- Kubernetes operators
- Database management platforms
- Internal tooling platforms
- CI/CD systems
- Observability platforms

**Documentation focus:**
- Resource provisioning and management
- High availability and disaster recovery
- Capacity planning
- Troubleshooting procedures

**Required doc types:**
- Architecture Decision Records (technology choices, design patterns)
- Runbook (provisioning, troubleshooting, upgrades, disaster recovery)
- Threat Model (access controls, privilege escalation, audit logging)
- Deployment Procedure (infrastructure deployment, blue-green, rolling updates)

---

### 5. Mobile Application

**Definition:** Native or cross-platform application running on mobile devices (iOS, Android).

**Signals:**
- Mobile framework files (Flutter, React Native, Swift, Kotlin, etc.)
- App store configuration (App.json, AndroidManifest.xml, etc.)
- Mobile-specific build processes
- Device permissions and capabilities usage
- Local data storage (SQLite, Realm, etc.)

**Examples:**
- Native iOS/Android apps
- Cross-platform apps (Flutter, React Native)
- Mobile-first web apps (PWAs)

**Documentation focus:**
- User onboarding and permissions flows
- Local vs. remote data synchronization
- Offline capabilities
- Platform-specific APIs (camera, location, etc.)

**Required doc types:**
- Architecture Decision Records (framework choice, offline strategy)
- Runbook (deployment to app stores, beta testing, hot patching)
- Threat Model (local data storage, network security, permissions)
- Test Plan (device compatibility, orientation, battery/memory constraints)

---

### 6. AI / ML System

**Definition:** Systems that train, serve, or continuously learn from data. Includes LLMs, recommendation engines, classifiers, etc.

**Signals:**
- Training code (TensorFlow, PyTorch, scikit-learn, etc.)
- Model files or checkpoints
- Feature engineering or preprocessing code
- Serving frameworks (TorchServe, TensorFlow Serving, HuggingFace, etc.)
- Experiment tracking (MLflow, Weights & Biases, etc.)
- Data versioning (DVC, Pachyderm, etc.)

**Examples:**
- LLM-powered applications
- Recommendation systems
- Computer vision systems
- NLP services
- Anomaly detection

**Documentation focus:**
- Model architecture and training process
- Data dependencies and quality requirements
- Performance metrics and SLOs
- Bias and fairness considerations
- Retraining frequency and triggers

**Required doc types:**
- Architecture Decision Records (framework, training strategy, serving approach)
- Data Model Documentation (features, data sources, versioning)
- Runbook (training procedures, model deployment, monitoring for drift)
- Threat Model (data poisoning, model extraction, adversarial inputs)

---

### 7. Integration / Connector

**Definition:** Glue code that connects external systems, APIs, or services together. Typically smaller, focused on data movement or event routing.

**Signals:**
- Third-party API client libraries
- Webhook handlers or event listeners
- Data transformation between system formats
- Minimal business logic (mostly mapping and routing)
- Scheduled sync jobs or event processors

**Examples:**
- Zapier-like automations
- Data sync connectors (Segment, Fivetran, etc.)
- Webhook bridges
- Payment processor integrations
- CRM sync tools

**Documentation focus:**
- External system contracts and APIs
- Error handling and retry logic
- Data transformations and mapping
- Authentication with external systems

**Required doc types:**
- API Specification (external system contracts being integrated)
- Architecture Decision Records (routing logic, error handling)
- Runbook (monitoring external service health, debugging sync failures)
- Threat Model (credential management, data in transit, third-party trust)

---

### 8. Claude Code Plugin

**Definition:** A Claude Code plugin or plugin marketplace — distributed to users rather than deployed to production infrastructure. Composed of skill files, slash command definitions, and an optional CLI. Runs inside a coding agent, not on a server.

**Signals:**
- `.claude-plugin/plugin.json` manifest (strongest signal — overrides any incidental web-framework signals)
- `.claude-plugin/marketplace.json` for multi-plugin repos
- `skills/<skill-name>/SKILL.md` files defining agent behaviors
- `commands/<command>.md` files defining slash commands
- A CLI entry point (`bin` field in `package.json`) distributed via npm, frequently scoped
- No runtime deployment target — the "deployment" is a user installing the plugin

**Examples:**
- `@esthernandez/app-project-readiness` — spec-driven development plugin
- `@esthernandez/vibe-doc` — documentation gap analyzer plugin
- Claude Code marketplace entries

**Documentation focus:**
- What the plugin does and who it's for (README)
- How a user installs it (install guide, multiple paths: npm, marketplace, local)
- What skills and slash commands it exposes (skill/command reference)
- How users can contribute or track changes (changelog + contributing)

**Required doc types:**
- README (what-it-is, install, quick example, license)
- Install Guide (prerequisites, install paths, verification, troubleshooting)
- Skill/Command Reference (per-skill + per-command reference with examples)

**Recommended doc types:**
- Architecture Decision Records (why the plugin is structured the way it is)
- Changelog + Contributing (Keep-a-Changelog + contributor onboarding)
- Test Plan (if the plugin has meaningful behavior to verify)

**Optional (not typically needed):**
- Runbook, API Specification, Deployment Procedure, Threat Model, Data Model — these are for systems with runtime/deployment/data concerns. Elevate to Recommended or Required only if the plugin reads/writes local files, stores user data, or has a non-trivial security surface (e.g., memory persistence, network calls to external services).

**Notes:**
- Plugins bundle neither a server nor a database, so traditional ops docs don't apply.
- The Skill/Command Reference is the plugin equivalent of an API spec — it's how users understand the interface they're consuming.
- If a plugin persists data (e.g., a user profile at `~/.claude/profiles/builder.json`), the Threat Model becomes Recommended: document what's stored, where, and how users can inspect/delete it.

---

## Deployment Contexts (5)

Modifiers that adjust Required/Recommended tiers for doc types.

### 1. Regulated

**Definition:** Subject to external compliance frameworks (legal, financial, healthcare, security standards).

**Frameworks include:**
- HIPAA (healthcare data)
- PCI-DSS (payment card data)
- SOC 2 (security and availability)
- GDPR (EU data privacy)
- FedRAMP (US government)
- NIST Cybersecurity Framework
- ISO 27001 (information security)

**Impact:** Elevates all security and operational docs to Required. Threat Model becomes critical. Audit logging and data residency must be documented.

**Required doc additions:**
- Threat Model (mandatory if not already Required)
- Deployment Procedure (must document compliance controls)
- Data Model Documentation (must include retention and residency)

---

### 2. Customer-Facing

**Definition:** Used directly by external customers (not internal-only).

**Characteristics:**
- User authentication and session management
- User-visible SLAs and uptime requirements
- Customer support procedures
- Data isolation between customers (if multi-tenant)

**Impact:** Elevates Runbook and Test Plan to Required. API Specification becomes critical if consumed by customer integrations.

**Required doc additions:**
- Runbook (must include SLA targets, escalation procedures)
- Test Plan (customer-impacting scenarios, regression testing)
- API Specification (if customers call APIs)

---

### 3. Internal Tooling

**Definition:** Used only by the organization's own team (employees, contractors).

**Characteristics:**
- Typically higher tolerance for downtime
- Feature velocity prioritized over stability
- Internal security (network perimeter, employee vetting)
- Changes can be communicated via Slack/email

**Impact:** Lowers recommended docs to optional. Threat Model less critical (internal attack surface smaller). Runbook can focus on rapid recovery.

**Effect:**
- Optional docs may stay optional (Changelog, Contributing Guide)
- Runbook emphasizes quick fixes over prevention

---

### 4. Multi-Tenant

**Definition:** Single deployment serves multiple customers/organizations with data isolation.

**Characteristics:**
- Tenant isolation strategies (row-level security, schema per tenant, etc.)
- Resource quotas and fair usage limits
- Billing and metering logic
- Account management and provisioning

**Impact:** Adds Data Model Documentation to Required. Threat Model must include tenant isolation analysis.

**Required doc additions:**
- Data Model Documentation (isolation strategy, schema design)
- Threat Model (tenant escape scenarios, data leakage)
- API Specification (tenant context, authorization scopes)

---

### 5. Edge / Embedded

**Definition:** Runs on edge devices, embedded systems, or has severe resource constraints (CPU, memory, network).

**Characteristics:**
- Device-specific constraints (ARM architecture, low memory, intermittent connectivity)
- Firmware or binary deployments
- Over-the-air (OTA) update mechanisms
- Offline-first design

**Impact:** Elevates Deployment Procedure and Runbook to Required. Test Plan must cover resource-constrained scenarios.

**Required doc additions:**
- Deployment Procedure (OTA process, version management, rollback on devices)
- Runbook (recovery from resource exhaustion, network disconnects)
- Test Plan (performance under constraints, battery/memory profiling)

---

## Classification Resolution

When artifacts show mixed signals, resolve by asking:

1. **What is the primary deployment target?** (Web, API, data system, etc.)
2. **Who are the primary users?** (Customers, internal, public, etc.)
3. **What's the biggest operational risk?** (Uptime, data loss, security breach, etc.)

The answer to question 1 determines primary category. Questions 2-3 determine deployment contexts.

---

**Last updated:** 2026-04-15 | **Reference version:** 1.1
