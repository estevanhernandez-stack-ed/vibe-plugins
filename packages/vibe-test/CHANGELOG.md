# Changelog

All notable changes to `@esthernandez/vibe-test` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — 2026-04-18 · First public release

First shippable release of Vibe Test. Twelve `/checklist` items completed end-to-end, dogfooded against the real WeSeeYouAtTheMovies codebase.

### Added

- **Router + 7 subcommand SKILLs** — `/vibe-test` (identity + next-step), `/vibe-test:audit`, `/vibe-test:generate`, `/vibe-test:fix`, `/vibe-test:coverage`, `/vibe-test:gate`, `/vibe-test:posture`. An eighth SKILL, `/vibe-test:evolve`, ships for Pattern #10 agent-authored changelogs.
- **Deterministic primitives** — `src/scanner/` (typescript-estree AST walk, framework detector for vitest/jest/playwright/cypress/mocha, route/component/model/integration inventories, harness-break detectors for the three WSYATM-class failure modes), `src/coverage/` (vitest + jest adapters with adaptation-prompt UX, c8 --all fallback, cherry-picked-denominator check, weighted-score pure function), `src/reporter/` (ReportObject + markdown/banner/JSON renderers with tier-adaptive language), `src/composition/` (Pattern #13 anchored registry + dynamic discovery capped at 1 suggestion).
- **Audit SKILL + classifier** — 6 app types × 5 maturity tiers × 5 context modifiers, mixed-stack graceful degradation with confidence drop from 0.9 → 0.6, F2 harness-break finding types separated from test-logic breaks.
- **Generate SKILL** — confidence-tiered routing (auto ≥0.90 / stage 0.70–0.89 / inline <0.70), env-var detection (`process.env.*`, `import.meta.env.*`, dotenv), HEAD-hash branch-switch check on pending accept, rejection-pattern probe at ≥3 consecutive rejects (captures to friction.jsonl or wins.jsonl), idiom matching (vitest / jest), scoped generation honoring prior audit scope, `--dry-run` + `--apply-last-dry-run` with 24h cache TTL.
- **Fix / Coverage / Gate / Posture SKILLs** — F1 confidence-routed repair with deferral to `superpowers:systematic-debugging`, F2 harness-level break detection, F3 scoped fix, rollback hook to `.vibe-test/pending/`; honest-denominator coverage with Tessl deferral and CI sidecar; gate with exit 0/1/2 + GitHub Actions `::error::`/`::warning::` annotations under `GITHUB_ACTIONS=true`; posture read-only ambient summary (≤40 lines, <3s).
- **Builder-sustainable handoff** — `docs/TESTING.md` (6 framework-agnostic sections), `docs/test-plan.md` (chronological decision log), opt-in `.github/workflows/vibe-test-gate.yml` stub with env-placeholder block, graduating-to-next-tier section, H7 ecosystem recommendations surfaced per repo.
- **Runtime hooks** — `--with-runtime=dev-server` probe (free-port allocation, stdio-redirected spawn, readiness polling, route probing with schema-valid payloads, signal-handled shutdown), `--with-runtime=playwright` MCP bridge with graceful degradation to static-only.
- **CLI package** — `@esthernandez/vibe-test-cli` ships `audit`/`coverage`/`gate`/`posture` deterministic commands; `generate`/`fix` exit `2` with plugin-only message pointing at Claude Code session. Commander-based entrypoint, GH Actions annotation auto-detection, exit-code contract.
- **Self-Evolving Plugin Framework**
  - **Pattern #4** — memory decay (preferred_framework 90d TTL, testing_experience 180d)
  - **Pattern #6** — friction-logger SKILL with per-command trigger contracts
  - **Pattern #7** — schema-versioned state with idempotent migrations + `.bak` writes
  - **Pattern #8** — `/vibe-test:vitals` self-test SKILL
  - **Pattern #10** — `/vibe-test:evolve` agent-authored proposals from friction.jsonl + wins.jsonl + 30d session logs
  - **Pattern #11** — `data-contract.md` documenting ownership of every state file
  - **Pattern #12** — beacons for cross-plugin coordination (vibe-sec handshake)
  - **Pattern #13** — anchored "Plays well with" registry (7 complements) + dynamic discovery rule
  - **Pattern #14** — `wins.jsonl` with three capture techniques (absence-of-friction, explicit success, external validation)
  - **Pattern #15** — `.claude-plugin/active-path.json` + `RESOLVE.md`
  - **Pattern #16** — blocking vs shaping prereqs declared in every SKILL
- **WSYATM regression fixture** at `tests/fixtures/wseyatm-snapshot/` — reduced, anonymized snapshot reproducing the three known WSYATM findings (broken vitest forks-pool, missing jest binary, cherry-picked denominator).
- **Dogfood report** at `docs/dogfood-wseyatm-v0.2.md` — first-patient validation run of all four CLI sub-tests against the real WeSeeYouAtTheMovies codebase.

### Security

- `pnpm audit` at monorepo root reports 2 moderate CVEs in transitive dev dependencies (esbuild, vite — both via `@vitest/coverage-v8 → vitest`). Neither touches shipped runtime surface. See [`SECURITY.md`](./SECURITY.md) for status + deferral rationale.
- Secrets scan across `packages/vibe-test/` + `packages/vibe-test-cli/` history: clean. All `api_key`/`password`/`token`/`secret` matches are detector patterns in source code, not committed credentials.
- `.env.example` is an explicit non-deliverable — Vibe Test consumes no environment variables itself; env-var detection runs against the user's app.
- `pnpm-lock.yaml` committed at monorepo root; deps pinned via caret ranges managed by pnpm's workspace resolution.

### Not in v0.2 (deferred)

- Python test generation — paired with the Sanduhr "second patient" in v0.3
- Headless CLI `generate` / `fix` — requires `ANTHROPIC_API_KEY`; v0.3
- Team-concurrent pending/ merge semantics — v0.2 ships awareness-only warnings
- Docker / containerization for dev-server isolation
- Flaky test detection
- Visual regression test generation
- Mutation testing — outside diagnostic-and-retrofit positioning

## [0.0.1] — reserved

Placeholder slot for the pre-v0.2 marketplace declaration. Not published.
