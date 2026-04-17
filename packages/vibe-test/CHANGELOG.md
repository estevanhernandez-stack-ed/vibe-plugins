# Changelog

All notable changes to `@esthernandez/vibe-test` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] — 2026 first public release

First public release of Vibe Test. Planned scope, tracked against `docs/checklist.md` item-by-item:

### Planned features (12 checklist items)

1. **Scaffolding + State layer** — monorepo package layout, `.claude-plugin/` manifest with Pattern #15 active-path resolution, JSON schemas (draft-07) for audit/coverage/generate/findings/covered-surfaces/builder-profile, atomic-write primitive, schema validator cache, migration dispatcher, typed state stubs.
2. **Deterministic primitives** — scanner (AST walker, framework detector, route / component / model / integration inventory), coverage (vitest+jest adapters, c8 fallback, denominator honesty check, weighted-score formula), reporter (ReportObject + markdown/banner/json renderers + tier-adaptive language), composition (complement detection + anchored registry).
3. **Shared SKILL scaffolding** — guide SKILL with persona/mode/experience adaptation, session-logger / friction-logger / wins-logger / decay / vitals SKILLs (ported with lineage notes from Vibe Cartographer).
4. **Router SKILL** — `/vibe-test` bare entry with Pattern #15 resolution, Pattern #16 prereq branching, persona-adapted banner, complement announcement.
5. **Audit SKILL + Classifier** — inventory → classify (6 app types × 5 tiers × modifiers) → weighted score → gap analysis → three-view render; mixed-stack graceful degradation; F2 harness-break detection.
6. **Builder-Sustainable Handoff writers** — `TESTING.md` (6 sections), `test-plan.md`, CI stub (opt-in), graduating guide, ecosystem recommendations; all framework-agnostic (H6).
7. **Generate SKILL — core flow** — confidence routing (auto ≥0.90 / stage 0.70–0.89 / inline <0.70), env-var detection, HEAD-hash branch check, idiom matching (vitest/jest), scoped generation.
8. **Generate SKILL — safety features** — `--dry-run` with 24h cached `--apply-last-dry-run`, rejection-pattern probe at ≥3 consecutive rejects, L2 feedback capture via session-log + wins / friction logs.
9. **Fix / Coverage / Gate / Posture SKILLs** — F1–F3 repair flow with systematic-debugging deferral, honest-denominator coverage with adaptation prompt, exit codes 0/1/2 gate with GitHub Actions annotations, <3s ambient posture.
10. **Runtime hooks + CLI package** — `--with-runtime=dev-server` probe, `--with-runtime=playwright` MCP bridge, `@esthernandez/vibe-test-cli` deterministic commands (audit / coverage / gate / posture).
11. **Evolve + Vitals SKILLs + WSYATM integration fixture** — Pattern #10 agent-authored changelog proposals, Pattern #8 self-test, reduced WSYATM regression fixture for dogfood.
12. **Documentation & security verification + WSYATM dogfood** — README with "Works better with" section, root monorepo README refresh, security audit (`pnpm audit`, secrets scan), ship gate is the WeSeeYouAtTheMovies dogfood run reproducing the three known findings.

### Framework patterns implemented

- **#4** — Memory decay and refresh (preferred_framework 90d, testing_experience 180d TTL)
- **#6** — Friction log (per-command trigger contracts)
- **#7** — Schema versioning (every state file + JSONL line)
- **#8** — Plugin self-test (`/vibe-test:vitals`)
- **#10** — Agent-authored changelog (`/vibe-test:evolve` proposes SKILL edits)
- **#11** — Data contract (this changelog's sibling `data-contract.md`)
- **#12** — Beacons for cross-plugin coordination
- **#13** — Plays-well-with anchored registry + dynamic discovery (cap=1)
- **#14** — Wins log with three capture techniques
- **#15** — Canonical self-resolution (`active-path.json` + `RESOLVE.md`)
- **#16** — Blocking vs shaping prereqs declared per-SKILL

### Not in v0.2 (deferred)

- Python test generation (paired with the Sanduhr "second patient" in v0.3)
- Headless CLI generate/fix (requires `ANTHROPIC_API_KEY`; v0.3)
- Team-concurrent merge semantics (v0.2 ships awareness-only warnings)
- Docker / containerization for dev-server isolation
- Flaky test detection

## [0.0.1] — reserved

Placeholder slot for the pre-v0.2 marketplace declaration. Not published.
