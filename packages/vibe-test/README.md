# Vibe Test

**Test analyzer and generator for vibe-coded apps. Classification-driven. Tiered by deployment context.**

> **Catches the broken harnesses every other test tool assumes away.**

Vibe Test reads a vibe-coded application, classifies it by maturity tier and deployment risk, and generates the tests that actually matter — proportional to what the app *is*, not what a spec would have asked for. It's the diagnostic-and-retrofit layer the ecosystem was missing: `superpowers:test-driven-development` owns discipline for *new* features, Tessl/Codecov/Coveralls measure what already exists — nobody owned the audit for apps that already shipped without tests.

The headline capability is **F2 harness-break detection**: vibe-coded apps routinely have `package.json` test scripts that reference uninstalled binaries, vitest configs with broken pool settings that time out and falsely report 0%, and coverage tools that cherry-pick the denominator (reporting 88% over 3 of 43 files). Vibe Test flags each as a distinct finding class with remediation guidance, separated from test-logic breaks.

Read the full thesis in [`framework.md`](./framework.md) — the 421-line argument for *why* this layer needs to exist and *how* the classification matrix and 5-level testing pyramid are structured.

---

## Install

**Claude Code marketplace (plugin — `/vibe-test:*` slash commands in-session):**

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install vibe-test@vibe-plugins
```

**npm (CLI — CI-safe deterministic commands, no LLM):**

```bash
npm install -g @esthernandez/vibe-test-cli
```

The CLI ships `audit` / `coverage` / `gate` / `posture` — the deterministic operations that don't require Claude reasoning. `generate` and `fix` live in the plugin SKILL layer and require a Claude Code session (CLI exits `2` with a clear message pointing you at `/vibe-test:generate`).

---

## Quick start

In a Claude Code session, inside your project:

```text
/vibe-test:audit
```

That's the front door. The audit scans your app (routes, components, models, integrations, test infra), classifies it (app type × maturity tier × context modifiers), computes an honest-denominator coverage score using the locked weighted formula, and writes three artifacts:

- `docs/vibe-test/audit-<timestamp>.md` — the full human-readable report
- `.vibe-test/state/audit.json` — JSON sidecar for CI/tooling consumers
- Terminal banner — in-chat summary + next-step prompt

From there:

- `/vibe-test:generate` — retrofits tests for the gaps audit found (confidence-routed: auto ≥0.90 / stage 0.70–0.89 / inline <0.70)
- `/vibe-test:coverage` — honest-denominator coverage with adaptation prompt for cherry-picked setups
- `/vibe-test:gate` — CI-safe pass/fail against tier threshold (exit 0/1/2 + GitHub Actions annotations)
- `/vibe-test:fix` — diagnose + repair broken tests; catches harness-level breaks via F2
- `/vibe-test:posture` — read-only ambient summary, ≤40 lines, under 3s
- `/vibe-test:evolve` — agent-authored proposals based on accumulated friction / wins logs (Pattern #10)

After the first audit, Vibe Test writes (and later updates) `docs/TESTING.md` — a framework-agnostic runbook that survives uninstalling the plugin. See that file for per-project guidance on how your team actually runs + adds tests.

---

## Command reference

| Command | Purpose |
|---------|---------|
| `/vibe-test` | Router — identity, state-awareness, next-step prompt |
| `/vibe-test:audit` | Inventory + classify + score — diagnoses whole testing posture |
| `/vibe-test:generate` | Confidence-tiered test generation (auto / stage / inline) |
| `/vibe-test:fix` | Diagnose + repair broken tests or broken harnesses |
| `/vibe-test:coverage` | Honest-denominator coverage measurement with tier interpretation |
| `/vibe-test:gate` | CI-safe pass/fail against app tier threshold |
| `/vibe-test:posture` | Read-only ambient summary of current testing posture |

---

## Works better with

Vibe Test is built around Pattern #13 (Ecosystem-Aware Composition) — it announces deferrals to complementary skills/plugins instead of duplicating them. If any of these are installed, `/vibe-test:*` detects them and cedes the right slice of work:

| Complement | Install | Why Vibe Test defers |
|------------|---------|----------------------|
| `superpowers:test-driven-development` | `/plugin install superpowers-plugin@superpowers` | Owns discipline for *new* features; Vibe Test stays in the retrofit/audit lane |
| `superpowers:systematic-debugging` | `/plugin install superpowers-plugin@superpowers` | `/vibe-test:fix` delegates complex failures instead of guessing |
| `superpowers:verification-before-completion` | `/plugin install superpowers-plugin@superpowers` | `/vibe-test:gate` co-invokes for per-task "is this complete" decisions |
| Playwright plugin + Playwright MCP | see [Anthropic docs](https://docs.anthropic.com/en/docs/mcp) | E2E scaffolding; Vibe Test writes deferral stubs rather than native Playwright code |
| Tessl `analyzing-test-coverage` | Tessl marketplace | Raw coverage parsing; Vibe Test overlays tier interpretation + honest denominator |
| [`@esthernandez/vibe-doc`](https://github.com/estevanhernandez-stack-ed/Vibe-Doc) | `/plugin install vibe-doc@vibe-plugins` | Co-authors `docs/TESTING.md` when both are present |
| `@esthernandez/vibe-sec` (coming in v0.2) | `/plugin install vibe-sec@vibe-plugins` | Exchanges `.vibe-test/state/covered-surfaces.json` ↔ `.vibe-sec/state/findings.jsonl` for security-aware generation |

None of these are required — Vibe Test works fine standalone. When present, the announcement fires at command start so you know which skill is driving which decision.

Anchored registry lives at [`skills/guide/references/plays-well-with.md`](./skills/guide/references/plays-well-with.md). Dynamic discovery is capped at one suggestion per invocation to prevent suggestion fatigue.

---

## Environment

Vibe Test itself reads **no environment variables**. There is no `.env.example` by design — env-var detection runs against *your* app during `/vibe-test:audit` and `/vibe-test:generate` so we can warn when a test will depend on `FIREBASE_API_KEY` / `STRIPE_PK` / similar, and scaffold the CI stub's `env:` block with placeholders. The plugin itself has no secrets, no external services, no telemetry, no network calls beyond what Claude Code's agent runtime already does.

---

## What's inside

- **Router + 7 subcommand SKILLs** — persona-aware, tier-adaptive language (experienced builders see dense technical detail; first-timers see plain-English framing — per story SE7)
- **Deterministic primitives** — scanner (`typescript-estree` AST walk), framework detector, route/component/model/integration inventory, weighted-score formula, reporter with three renderers (markdown + banner + JSON)
- **Generate flow** — confidence-tiered routing, `--dry-run` with 24h `--apply-last-dry-run` cache, env-var detection, HEAD-hash branch-switch check, rejection-pattern probe at ≥3 consecutive rejects, framework-idiom matching (vitest / jest detected)
- **Builder-sustainable handoff** — `docs/TESTING.md` (6 sections, framework-agnostic), `docs/test-plan.md` (chronological decision log), opt-in `.github/workflows/vibe-test-gate.yml` stub with env placeholders, graduating-to-next-tier guide
- **Self-Evolving Plugin Framework** — L1 builder profile, L2 session memory, Pattern #14 `wins.jsonl`, Pattern #15 `active-path.json` + `RESOLVE.md`, Pattern #16 blocking vs shaping prereqs declared per-SKILL
- **CLI wrapper** — `@esthernandez/vibe-test-cli` for CI (`audit`/`coverage`/`gate`/`posture`), emits `::error::` / `::warning::` annotations under `GITHUB_ACTIONS=true`

---

## Non-goals (principled cuts)

Vibe Test is **not**:

1. A test runner (your framework — vitest / jest / playwright — runs tests)
2. A mutation testing tool
3. A visual regression platform
4. A load testing platform at scale
5. A 100%-coverage machine — we target *meaningful*, *tier-appropriate* coverage
6. A replacement for understanding your own tests (handoff artifacts survive plugin uninstall by design)
7. A feature-code modifier — `/vibe-test:fix` only edits tests

Full thesis in [`framework.md`](./framework.md). Product spec in the monorepo `docs/spec.md`.

---

## Links

- **Thesis:** [`framework.md`](./framework.md) — the 421-line argument
- **Monorepo:** [`vibe-plugins`](https://github.com/estevanhernandez-stack-ed/vibe-plugins) — sibling plugins (vibe-sec, future @626labs/plugin-core)
- **Dogfood report:** [`docs/dogfood-wseyatm-v0.2.md`](./docs/dogfood-wseyatm-v0.2.md) — first-patient validation against WeSeeYouAtTheMovies
- **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

---

## License

MIT — © 2026 [626Labs LLC](https://626labs.dev), Fort Worth, TX.
