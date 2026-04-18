# Vibe Sec — Gap Analysis (as of Vibe Test v0.2 scope)

> *"Everything is in scope at 626Labs LLC."*
> *"Work from the future. We are already behind."*

**Status:** Reference intel for Vibe Sec's future `/scope` run. Written during Vibe Test's `/prd` phase — captures what security concerns remain uncovered after Cart + Vibe Doc + Vibe Test all ship.

**Written:** 2026-04-17
**Author:** Este (with architect-voice assistance from Vibe Cartographer during Vibe Test's /prd)
**Primary location:** This file.
**Mirror:** `packages/vibe-sec/docs/gap-analysis-as-of-vibe-test-v0.2.md` in the `vibe-plugins` monorepo.

---

## Purpose

Before Vibe Sec's own `/scope` runs, establish the positioning: what security concerns remain **uniquely** Vibe Sec's after the other three 626Labs plugins (Cart + Vibe Doc + Vibe Test) have done their jobs? This sharpens Vibe Sec's value proposition the same way Vibe Test's positioning was sharpened relative to `superpowers:test-driven-development` and Tessl's coverage tooling.

Short answer: **security posture as a first-class audit**. The three existing plugins touch security at the edges of their core concerns (auth flow tests, documented threat models, architecture decisions in /spec) but none does security as principled audit. Coverage is accidental; Vibe Sec makes it first-class.

---

## What the three plugins already partially cover

| Concern | Plugin | Coverage depth |
|---|---|---|
| Test-covered security behaviors (auth flow tests, session-expiry tests, unauthorized-access tests) | Vibe Test | Partial — behavioral + edge-case tier generation for auth epics |
| Injection edge cases (SQL / XSS / command-injection input-boundary tests) | Vibe Test | Partial — via edge-case tier systematic generation |
| Architecture decisions documented (auth model, PII boundaries) | Cart | Partial — captured in /prd + /spec IF the builder raises them |
| Runbooks, threat models as documentation artifacts | Vibe Doc | Partial — generates threat model on-demand if in its template catalog |
| Secrets accidentally documented | Vibe Doc | Partial — flags hardcoded-credential patterns during doc-gap scan if wired |
| Tier-appropriate behavior thresholds (security-adjacent) | Vibe Test | Partial — tier classification shapes test bar; no security-specific tier |

**Common thread:** each plugin touches security at the edges of its core concern. None does security as a principled audit. Vibe Sec's job is exactly that.

---

## What's left uniquely for Vibe Sec

These concerns are **not covered by any other 626Labs plugin**, even via Pattern #13 composition:

### 1. Dependency CVE audit / Software Composition Analysis (SCA)
No other plugin looks at `package.json` / `package-lock.json` for known CVEs. Vibe Test verifies deps *exist*; Vibe Sec checks whether they're *safe*. This is the classic `npm audit` / Snyk / Dependabot territory but inside the Claude Code plugin ecosystem.

### 2. Secret detection in working tree + git history
Vibe Doc might flag hardcoded credentials in *documentation*. No plugin scans source code or git log for hardcoded API keys, tokens, env-var leaks, or committed `.env` files. Critical for vibe-coded apps where "just ship it" often means "committed the Firebase key."

### 3. OWASP Top 10 categorical audit
Full coverage by category:
- **A01 Broken Access Control** — authorization matrix audit. Vibe Test catches some via auth flow tests; Vibe Sec audits the matrix itself.
- **A02 Cryptographic Failures** — crypto audit (at-rest, in-transit, key management).
- **A03 Injection** — static analysis of injection surfaces. Complements Vibe Test's behavioral tests.
- **A04 Insecure Design** — threat modeling, design review.
- **A05 Security Misconfiguration** — CSP, CORS, security headers, defaults.
- **A06 Vulnerable Components** — SCA. Same as #1 above but categorized under OWASP.
- **A07 Identification / Auth Failures** — auth posture audit. Complements Vibe Test's auth tests.
- **A08 Software / Data Integrity Failures** — supply chain, lockfile integrity.
- **A09 Security Logging Failures** — audit logging, alerting gaps.
- **A10 SSRF** — server-side request forgery. Complements Vibe Test's edge cases.

### 4. Crypto / PII handling audit
- Where is data encrypted at rest?
- What data is logged in cleartext?
- Where are the PII boundaries?
- Does the app handle financial data under PCI expectations?
- Does it handle health data under HIPAA expectations?

Static analysis of data flow, not behavioral testing.

### 5. Config-level security posture
CSP headers. CORS policy. Strict-Transport-Security. Cookie flags (HttpOnly, Secure, SameSite). CSRF tokens. Content-Type enforcement. Rate-limit headers. These are policy settings, not behaviors — tests wouldn't catch them because nobody thinks to write the test.

### 6. Supply chain hardening
- Lockfile integrity checks (are hashes consistent?)
- Dependency pinning strategy (exact vs caret)
- Package-origin verification (typosquat detection)
- Transitive-dependency risk assessment

### 7. Rate limiting + abuse protection posture
Does the API have rate limiting? Where are the weak points? What's reachable without auth? This is a posture audit, not a behavioral test.

### 8. Auth model static analysis
Role/permission matrix audit. Authorization boundary mapping — who can reach what, at every endpoint. Vibe Test can *verify* assumed auth; Vibe Sec *audits* whether the assumed auth is right.

Example: Vibe Test generates an auth behavioral test that says *"unauthenticated users should get 401 on `/api/admin/users`"*. That test passes. Good. But Vibe Sec asks: *"Is this endpoint intended to be admin-only, or should it be manager+admin? And is the middleware applied consistently across all admin endpoints, or is it inconsistent?"* Different question, different audit.

### 9. Threat model generation
STRIDE / DREAD-style analysis from the inventory Vibe Test produced. Surface-area enumeration. Attacker journeys. Vibe Doc can host the *doc*; Vibe Sec generates the *analysis*. Vibe Doc's role becomes presentation-layer integration.

### 10. Security-tier thresholds + gating
Mirror of Vibe Test's classification but security-flavored:
- **Prototype:** can ship without a security audit — "YOLO tier"
- **Internal tool:** secret-scan + basic CVE audit required
- **Public-facing:** + auth-flow audit + CSP/CORS baseline
- **Customer-facing SaaS:** + PII handling + multi-tenant isolation audit
- **Regulated / enterprise:** + supply chain hardening + compliance documentation + threat model

Vibe Sec owns the security bar per tier. Vibe Test's tier classification is an input.

### Additional concerns worth naming

- **License compliance** (GPL contamination, commercial-license audit)
- **Data residency / GDPR boundaries** (where does user data physically live)
- **SBOM generation** (Software Bill of Materials for supply chain audits)
- **Third-party API credential exposure** (Stripe keys, OAuth client secrets, webhook signing keys)

---

## Composition — who reads what

### Vibe Test emits → Vibe Sec reads

Contract at `.vibe-test/state/covered-surfaces.json`:

```json
{
  "schema_version": 1,
  "last_updated": "2026-04-17T14:00:00Z",
  "classification": {
    "app_type": "full-stack+db",
    "tier": "public-facing",
    "modifiers": ["customer-facing"]
  },
  "covered_surfaces": {
    "auth_flows": ["login", "register", "password-reset"],
    "endpoints_with_behavioral_tests": ["/api/users", "/api/quiz/submit"],
    "endpoints_with_edge_case_tests": ["/api/quiz/submit"],
    "components_with_behavioral_tests": ["Quiz.tsx", "MovieCard.tsx"]
  },
  "uncovered_surfaces": {
    "endpoints": ["/api/admin/*", "/api/waitlist"],
    "components": ["BadgeManager.tsx", "BadgeGenerator/*"]
  },
  "detected_stack": {
    "frontend": ["react", "vite", "firebase-client"],
    "backend": ["express", "firebase-functions"],
    "auth": ["firebase-auth"],
    "integrations": ["tmdb-api", "firestore"]
  }
}
```

**What Vibe Sec does with it:**
- `classification` → calibrates security tier (public-facing = auth audit mandatory, CSP baseline)
- `covered_surfaces` → narrows Vibe Sec's "unverified behavior" list (already tested ≠ auto-safe, but de-prioritizes the re-testing)
- `uncovered_surfaces` → elevates security audit priority for these (admin endpoints with zero tests = high attention)
- `detected_stack` → picks applicable CVE feeds, auth pattern libraries, framework-specific OWASP rules

### Vibe Sec emits → Vibe Test reads

Contract at `.vibe-sec/state/findings.jsonl` — append-only, one finding per line:

```jsonl
{"id":"sec-001","severity":"high","category":"A07","surface":"/api/admin/users","finding":"no auth middleware detected","test_recommendation":"behavioral test: unauthorized-access blocked","priority_elevation":"critical"}
{"id":"sec-014","severity":"medium","category":"A03","surface":"/api/quiz/submit","finding":"input not validated against schema","test_recommendation":"edge case: malicious payload rejected","priority_elevation":"high"}
{"id":"sec-027","severity":"low","category":"A09","surface":"src/server.js","finding":"PII logged at INFO level","test_recommendation":null,"priority_elevation":null}
```

**What Vibe Test does with it:**
- Reads `findings.jsonl` during `/vibe-test:generate`
- For findings with `test_recommendation` + `priority_elevation`, elevates matching behavioral/edge-case tests to higher priority in the generation order
- For findings that go to inline-confidence flow, attaches the security context to the rationale (`"this test covers X because Y — and Vibe Sec flagged it as security-sensitive"`)
- Findings with no test recommendation (e.g., PII logging) are **not** converted to tests — those are Vibe Sec's domain, not Vibe Test's.

### Shared: the cross-plugin profile bus

Both plugins participate in Pattern #11 (Shared User Profile Bus). Both read from `shared.*` in `~/.claude/profiles/builder.json`. Both write only to their respective `plugins.vibe-test` and `plugins.vibe-sec` namespaces.

### Shared: the coordination beacon log

Both plugins participate in Pattern #12 (Coordination Beacons). Both append to `.626labs/beacons.jsonl` at the project root:

```jsonl
{"timestamp":"2026-04-17T14:00:00Z","plugin":"vibe-test","event":"audit_completed","summary":"Public-facing tier, 27% coverage, 12 gaps"}
{"timestamp":"2026-04-17T14:35:00Z","plugin":"vibe-sec","event":"scan_completed","summary":"3 high-severity findings, 2 CVEs in deps, 1 committed secret"}
```

Either plugin's next startup reads recent beacons for situational awareness.

---

## Ship sequence

1. **Vibe Test v0.2 ships first.** Establishes the composition protocol and writes `covered-surfaces.json` from day 1. Neither plugin blocks the other's install — both are standalone-capable. This gap analysis becomes reference intel for Vibe Sec's `/onboard` + `/scope` runs.

2. **Vibe Sec v0.2 follows.** Reads Vibe Test's output if present. Defines its own classification/tier framework (security-specific, with the five tiers outlined in concern #10). Emits `findings.jsonl` that Vibe Test's next generate run consumes.

3. **Pattern #13 baseline for both:** if the other plugin isn't installed, the present plugin works standalone without degradation. Composition is *additive enhancement*, never a dependency.

---

## Open questions for Vibe Sec's own `/scope`

1. **License compliance** — ship in v0.2 or defer?
2. **SBOM generation** — required for regulated tier or optional always?
3. **Third-party service credential audit** — scan env vars + config files for known service-key patterns? (AWS, Stripe, Firebase, etc.)
4. **Container / Dockerfile audit** — baked into v0.2 or deferred?
5. **Runtime attack simulation** — entirely out of scope (defer to specialists like OWASP ZAP), or Vibe Sec provides a thin Pattern #13 integration?
6. **Penetration test report ingestion** — can Vibe Sec read third-party pentest output (JSON, Burp Suite, etc.) and feed findings into its own model?
7. **Security fixture generation** — does Vibe Sec generate sample attacker payloads for Vibe Test to use during edge-case generation?
8. **Threat model UI** — does Vibe Sec ship its own visualization, or defer entirely to Vibe Doc / external tools for presentation?
9. **Reporting cadence** — does `/vibe-sec:audit` produce a full report every run, or differential (only new findings since last run)?
10. **Tier threshold formula** — does Vibe Sec use the same weighted-score approach as Vibe Test, or a different model (severity-count-based, exploit-probability-based)?

---

## Reference — the three 626Labs plugins Vibe Sec will compose with

| Plugin | Role | Vibe Sec interaction |
|---|---|---|
| **Vibe Cartographer** | Spec-driven development lifecycle | Cart's /spec phase can invoke Vibe Sec's threat-modeling preview; architectural decisions Cart captures feed Vibe Sec's design audit |
| **Vibe Doc** | Documentation completeness | Vibe Sec's threat models rendered via vibe-doc; doc-gap reports surface missing security docs |
| **Vibe Test** | Test audit + generation | Covered surfaces as input to Vibe Sec's prioritization; security findings as input to Vibe Test's priority elevation |

---

*End of gap analysis. Use as primary input for Vibe Sec's `/scope` run when Vibe Sec's project directory is created.*
