<!-- Every item MUST use the five-field format below. /build reads each item
     and relies on all five fields being present and consistently formatted.
     The header encodes methodology choices so /build doesn't re-ask. -->

# Build Checklist

## Build Preferences

- **Build mode:** [Autonomous / Step-by-step]
- **Comprehension checks:** [Yes / No / N/A (autonomous mode)]
- **Git:** [Commit cadence and style — e.g., "Commit after each item with message: 'Complete step N: [title]'"]
- **Verification:** [Yes / No. Step-by-step: per-item verification. Autonomous: checkpoints every 3-4 items. If No, verification is skipped.]
- **Check-in cadence:** [Step-by-step only: Learning-driven / balanced / speed-run — how much discussion during build. N/A for autonomous.]

## Checklist

- [ ] **1. [Clear title — what's done when this step is complete]**
  Spec ref: `spec.md > [Section] > [Subsection]`
  What to build: Concrete description of the work. Specific enough that /build can execute without guessing.
  Acceptance: Testable criteria from prd.md. What the builder verifies with their own eyes.
  Verify: Specific action — "Run dev server and confirm [what you should see]."

- [ ] **2. [Title]**
  Spec ref: `spec.md > [Section] > [Subsection]`
  What to build: [...]
  Acceptance: [...]
  Verify: [...]

<!-- Continue for all items. Typical project: 8-12 items.
     Sequence respects dependencies — earlier items unblock later ones.
     Last item is always documentation & security verification. -->

- [ ] **N. Documentation & security verification**
  Spec ref: `prd.md > What We're Building` + `spec.md > [all sections]`
  What to build: Write a README.md covering what the app does, how to install/run locally, required environment variables (without real values), and tech stack. Confirm all docs/ artifacts (scope, PRD, spec, checklist) are up to date. Create a `.env.example` with placeholder values. Run a secrets scan — verify no API keys, tokens, or credentials are hardcoded and that `.gitignore` covers `.env` and sensitive paths. Run a dependency audit (`npm audit` / `pip audit` / equivalent) and address critical findings. Spot-check input validation for OWASP Top 10 basics (injection, XSS). If the app has auth, verify protected routes require it server-side. If deploying, confirm env vars use the platform’s secrets manager, HTTPS is enforced, CORS is intentional, and debug mode is off. Push code to GitHub.
  Acceptance: README exists and is clear. `.env.example` exists. No secrets in committed code. Dependency audit shows no unaddressed critical vulnerabilities. Security spot-check documented. Code is pushed to GitHub.
  Verify: Clone the repo fresh, follow the README to set up — can someone who’s never seen the project get it running? Run `git log --all -p | grep -i "password\|secret\|api_key"` and confirm nothing sensitive appears.
