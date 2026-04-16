# Vibe Sec — Security for the Vibe-Coded Era

**A framework and plugin thesis for retrofitting meaningful security into AI-prototyped applications.**

*626Labs — Estevan Hernandez*

---

## Part I — Thesis

### The Core Claim

**Vibe-coded applications ship with a predictable, classifiable set of security gaps — and an AI plugin that understands those patterns can close most of them faster than a human security review, without slowing down the builder.**

The security posture of a vibe-coded app is not random. It's patterned. The same LLM behaviors that make AI-assisted prototyping fast — defaulting to permissive configurations, skipping auth edge cases, hardcoding secrets for convenience, trusting user input because the prompt didn't say not to — produce a recognizable fingerprint of vulnerabilities. A plugin that knows this fingerprint can scan for it, prioritize what matters, and generate fixes that fit the app's actual architecture.

### Why Vibe-Coded Apps Are Predictably Insecure

When a developer prompts an LLM to "build me a Next.js app with Stripe payments and user auth," the model optimizes for a working demo. It does not optimize for a secure production system. The gap between those two things is where Vibe Sec lives.

The specific failure patterns:

- **Secrets in source.** API keys, database credentials, JWT secrets hardcoded in environment files that ship to version control. The LLM puts them there because the prompt said "make it work," not "make it safe." The developer copies the working example without extracting the secrets because the prototype *runs*.
- **Auth as afterthought.** Authentication scaffolded as a thin wrapper — session tokens without expiry, no CSRF protection, password storage with weak or no hashing, missing rate limiting on login endpoints. The LLM generates auth that *looks* complete but crumbles under adversarial pressure.
- **Input trust everywhere.** User input flows directly into database queries, API calls, template renders, and file system operations. SQL injection, XSS, path traversal — the classics — survive because the LLM generated code that handles the happy path and nothing else.
- **Dependency roulette.** The LLM picks packages from its training data. Some are abandoned. Some have known CVEs. Some are typosquats. The developer doesn't audit because the prototype worked and `npm install` didn't error.
- **Overpermissive defaults.** CORS set to `*`. Firebase rules set to open. S3 buckets public. IAM roles with `*:*`. The LLM picks the configuration that removes friction, and friction is what security often looks like.
- **No security headers.** CSP, HSTS, X-Frame-Options, X-Content-Type-Options — absent because the prompt never mentioned them and they're invisible in development.
- **Logging that leaks.** Console.log statements with full request bodies, error handlers that dump stack traces to the client, debug endpoints left enabled.

The pattern: **the LLM generates the shortest path to a working system, and security is rarely on the shortest path.**

### The Three-Layer Security Model

Security for vibe-coded apps isn't one scan. It's three distinct layers that compound.

#### Layer 1 — Hygiene: The mechanical fixes

Hygiene is everything a linter or static scanner could catch with enough rules. Secrets in code, missing headers, open CORS, debug endpoints, console.log with sensitive data. These are deterministic — present or absent, fixable with known patterns, automatable without judgment.

Hygiene is the floor. It catches the things that would fail any automated pen test in the first 30 seconds.

#### Layer 2 — Architecture: The structural weaknesses

Architecture-level security requires understanding *how the app is built*, not just what files exist. Does the auth flow actually protect the routes it claims to? Is the API surface consistent in its authorization checks? Does the data model enforce access control at the right layer, or is it relying on frontend guards that an attacker can bypass?

Architecture review is where classification matters. A single-page app with Firebase has different structural risks than a multi-service API with PostgreSQL. The plugin's classifier determines which architectural checks to run.

#### Layer 3 — Threat Model: The strategic assessment

Threat modeling asks: given what this app does and who uses it, what are the realistic attack vectors? Not every app needs the same threat model. A personal blog and a payment processing service have different adversary profiles.

This layer is where the plugin needs the human. It can *propose* a threat model — "based on the payment integration and user data storage, here are the top 5 threats" — but the builder has to validate the threat landscape against their actual deployment context.

### What "Secure Enough" Means

Absolute security is a myth. The relevant question is always "secure enough for what?" Vibe Sec doesn't pretend otherwise. The plugin classifies the app and its deployment context, then measures against a tier-appropriate bar.

- **Prototype / internal tool**: Secrets out of source, basic auth works, no known CVEs in dependencies. That's the bar. Move on.
- **Public-facing, non-regulated**: Full hygiene layer, architectural auth review, dependency audit, security headers, input validation on all user-facing endpoints.
- **Regulated / sensitive data**: Everything above plus threat model, data flow mapping, encryption at rest and in transit verification, audit logging, compliance-specific checks (HIPAA, SOC 2, PCI DSS mapping).
- **Enterprise / multi-tenant**: Everything above plus tenant isolation verification, RBAC audit, API rate limiting, infrastructure-level security review.

The plugin tells you which tier your app needs and what's missing for that tier. Not what's missing for perfection — what's missing for *your situation*.

---

## Part II — The Scanner Taxonomy

### Signal Categories

Vibe Sec's scanner looks for specific signal families. Each maps to a security domain.

#### Secrets & Credentials
- Hardcoded API keys, tokens, passwords in source files
- `.env` files committed to git (`.gitignore` check)
- Secrets in client-side bundles (exposed in browser)
- Default credentials in configuration files
- Private keys in the repository

#### Authentication & Authorization
- Session management (token expiry, rotation, storage)
- Password handling (hashing algorithm, salt, strength requirements)
- CSRF protection on state-changing endpoints
- Rate limiting on auth endpoints
- OAuth/OIDC implementation correctness
- Missing authorization checks on API routes
- Frontend-only access control (no backend enforcement)

#### Input Validation & Injection
- SQL injection vectors (raw queries, string concatenation)
- XSS vectors (unescaped output, innerHTML, dangerouslySetInnerHTML)
- Command injection (exec, spawn with user input)
- Path traversal (file operations with user-controlled paths)
- SSRF (server-side requests with user-controlled URLs)
- Deserialization of untrusted data

#### Dependencies & Supply Chain
- Known CVEs in direct dependencies
- Known CVEs in transitive dependencies
- Abandoned packages (no updates in 2+ years)
- Typosquat detection (similar names to popular packages)
- Lock file integrity (presence, consistency)
- Pinned vs floating versions

#### Configuration & Headers
- CORS policy (permissiveness level)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- TLS/SSL configuration
- Debug mode / verbose error handling in production
- Open cloud resource policies (Firebase rules, S3, IAM)

#### Data Handling
- Sensitive data in logs
- PII exposure in API responses
- Missing encryption at rest
- Missing encryption in transit
- Data retention and deletion capabilities
- Backup security

#### Infrastructure
- Exposed ports and services
- Docker security (running as root, secrets in images)
- CI/CD pipeline security (secret management, artifact integrity)
- Environment separation (dev/staging/prod isolation)

### Classification-Driven Prioritization

Not every signal matters equally for every app. The classifier determines which checks are critical vs informational:

| App Type | Critical Checks | Important Checks | Informational |
|----------|----------------|-------------------|---------------|
| Static site | Dependencies, headers | Input validation | Auth, data handling |
| SPA + API | Auth, input validation, CORS | Dependencies, secrets | Infrastructure |
| Full-stack + DB | Auth, input, data handling, secrets | Dependencies, config | Infrastructure |
| API service | Auth, input, rate limiting | Data handling, deps | Headers (if no UI) |
| Payment/financial | ALL | ALL | None — everything matters |

### Context Modifiers

Same as Vibe Doc, deployment context elevates severity:

- **Regulated** (HIPAA, SOC 2, PCI): All data handling checks become critical. Audit logging required.
- **Customer-facing**: Auth and input validation elevated. Error handling must not leak.
- **Multi-tenant**: Tenant isolation checks become critical. RBAC audit mandatory.
- **Edge/embedded**: Attack surface minimization critical. Update mechanism security.
- **Internal tool**: Reduced surface area. Network-level controls may substitute for app-level ones.

---

## Part III — The Fix Engine

### Fix Categories

Vibe Sec doesn't just find problems — it generates fixes. Fixes fall into three categories:

#### Automated Fixes (No judgment required)
- Add `.env` to `.gitignore`
- Add security headers middleware
- Replace hardcoded secrets with environment variable references
- Add CSRF token middleware
- Pin dependency versions
- Add `helmet` or equivalent security middleware
- Remove `console.log` with sensitive data patterns

#### Guided Fixes (Plugin provides template, user confirms)
- Generate auth middleware with proper session handling
- Create input validation schemas for API endpoints
- Set up rate limiting configuration
- Configure CORS with specific origins
- Generate parameterized query replacements for SQL injection fixes
- Create CSP policy based on app's actual resource needs

#### Advisory Fixes (Plugin describes, user implements)
- Architectural auth redesign (moving from frontend to backend enforcement)
- Data model access control refactoring
- Threat model documentation
- Compliance mapping and gap analysis
- Infrastructure hardening recommendations
- Incident response plan skeleton

### Fix Confidence Scoring

Every fix carries a confidence score:

- **High (0.9+)**: Mechanical fix, deterministic, safe to auto-apply. Adding `.gitignore` entries, security headers.
- **Medium (0.7-0.89)**: Template-based fix, probably correct but needs review. Auth middleware generation, input validation.
- **Low (<0.7)**: Advisory — plugin identifies the gap but the fix requires human architectural judgment. Auth redesign, data model changes.

---

## Part IV — Self-Evolution (Level 2)

Vibe Sec ships with Level 2 self-evolution from day one.

### Builder Security Profile

`~/.claude/plugins/data/vibe-sec/profile.json`

```json
{
  "schema_version": 1,
  "builder": {
    "name": null,
    "security_background": null,
    "preferred_fix_style": "guided",
    "auto_fix_threshold": 0.9,
    "compliance_requirements": [],
    "trusted_package_registries": ["npm", "pypi"],
    "last_updated": null
  },
  "scan_preferences": {
    "severity_threshold": "medium",
    "skip_categories": [],
    "custom_secret_patterns": [],
    "ignored_paths": ["node_modules", "dist", ".next"]
  }
}
```

Fields populate progressively — first scan asks what's missing, subsequent scans skip known answers.

### Per-Project Security State

`<project>/.vibe-sec/state.json`

```json
{
  "schema_version": 1,
  "last_scan": null,
  "classification": {
    "app_type": null,
    "deployment_context": null,
    "security_tier": null,
    "confidence": 0
  },
  "findings": [],
  "fixes_applied": [],
  "fixes_deferred": [],
  "suppressed_rules": [],
  "threat_model_status": "none"
}
```

### Session Memory

Append-only log at `~/.claude/plugins/data/vibe-sec/sessions/<date>.jsonl`:

```json
{
  "timestamp": "2026-04-15T14:30:00Z",
  "command": "scan",
  "project": "my-app",
  "findings_count": 12,
  "critical_count": 3,
  "fixes_applied": 5,
  "fixes_deferred": 4,
  "fixes_rejected": 3,
  "user_overrides": ["suppressed:no-csrf-spa"],
  "friction_notes": ["user wanted to skip dependency audit"]
}
```

### What Level 2 Enables

- **Remembers your compliance context.** Scan once as "HIPAA-regulated," every subsequent scan applies that lens automatically.
- **Learns your suppression patterns.** If you consistently suppress a rule, the plugin notes it and adjusts future severity for that pattern.
- **Tracks fix velocity.** Knows how many findings you typically address per session and paces recommendations accordingly.
- **Cross-project pattern detection.** If the same vulnerability appears across 3 projects, surfaces it as a systemic habit worth addressing at the builder level.

---

## Part V — Plugin Architecture

### Commands

| Command | Purpose |
|---------|---------|
| `/scan` | Full security scan — classify, detect, prioritize |
| `/fix` | Generate and apply fixes for identified findings |
| `/audit` | Deep dependency audit with CVE cross-reference |
| `/threat-model` | Guided threat modeling for the current app |
| `/check` | CI-safe pass/fail against the app's security tier |
| `/status` | Current security posture summary |

### Skills

| Skill | Purpose |
|-------|---------|
| `scan` | Conversational security scanning with classification |
| `fix` | Interactive fix generation and application |
| `audit` | Dependency and supply chain analysis |
| `threat-model` | Guided threat modeling conversation |
| `check` | CI/deployment gate check |
| `guide` | Shared behavior, tone, classification taxonomy |

### CLI Package

`@vibe-sec/cli` — deterministic scanning operations:

```bash
vibe-sec scan              # Full scan with classification
vibe-sec scan --quick      # Hygiene-only (Layer 1)
vibe-sec fix --auto        # Apply all high-confidence fixes
vibe-sec fix --interactive # Walk through each fix
vibe-sec audit             # Dependency audit
vibe-sec check             # CI pass/fail
vibe-sec check --strict    # Fail on any finding
```

### Integration Points

- **Vibe Doc**: Security findings feed into threat model documentation generation
- **Vibe Test**: Security scan results suggest security-specific test cases
- **626Labs Dashboard**: Findings logged via `manage_decisions`, tracked as tasks
- **CI/CD**: `vibe-sec check` as a GitHub Action
- **Pre-commit hook**: Quick hygiene scan before every commit

---

## Part VI — Scope Definition

### What Vibe Sec IS

- A security scanner that understands vibe-coded app patterns
- A fix generator that produces actionable, architecture-aware remediation
- A classifier that tailors security requirements to app type and deployment context
- A threat modeling guide that helps builders think about adversaries
- A CI gate that enforces tier-appropriate security standards
- A learning tool that remembers your security context and habits

### What Vibe Sec IS NOT

- A penetration testing tool (it doesn't actively exploit)
- A WAF or runtime security solution (it's static analysis + guided fixes)
- A compliance certification tool (it maps to frameworks but doesn't certify)
- A replacement for professional security review on high-stakes systems
- A secrets manager (it finds secrets in code, doesn't manage them)

### v1 Scope (Ship Target)

**In scope:**
- Secrets detection (hardcoded keys, committed .env files, client-side exposure)
- Dependency audit (CVEs, abandoned packages, lock file integrity)
- Security headers check and fix generation
- Basic auth review (session handling, password storage, CSRF)
- Input validation detection (SQL injection, XSS, command injection vectors)
- CORS configuration audit
- Classification-driven prioritization
- Automated fix generation for Layer 1 (hygiene) findings
- Guided fix templates for Layer 2 (architecture) findings
- CI check command
- Level 2 self-evolution (profile + session memory)

**Out of scope for v1:**
- Runtime security monitoring
- Cloud infrastructure scanning (AWS/GCP/Azure resource policies)
- Container security scanning
- SAST/DAST integration (we complement, not replace)
- Compliance framework mapping (HIPAA, SOC 2, PCI) — v2
- Threat model generation — v2
- Multi-language support beyond JS/TS/Python — v2

### Success Metrics

- Time from "I have a vibe-coded app" to "I know what's insecure": < 2 minutes
- Percentage of Layer 1 findings auto-fixable: > 80%
- False positive rate on critical findings: < 10%
- Builder can explain their app's security posture to a stakeholder after one scan
