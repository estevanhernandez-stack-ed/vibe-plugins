---
description: "Coverage — honest-denominator measurement with adaptation-prompt UX. Detects the test framework, proposes the diff to add `--coverage.all` (vitest) or `--collectCoverageFrom` glob (jest); only applies on builder opt-in. Falls back to `c8 --all` when adaptation is refused. Defers raw coverage parsing to `tessl:analyzing-test-coverage` when present. Emits a CI-friendly JSON sidecar at `.vibe-test/state/coverage.json`; exits 0 regardless of threshold (gate decides pass/fail)."
argument-hint: "[--path <glob>]"
---

Use the **coverage** skill to handle `/vibe-test:coverage`.

Read `skills/coverage/SKILL.md` and follow it end to end. The coverage command:

1. Checks the blocking prereq — a test framework must be detectable (vitest / jest / mocha in deps OR a config file present). If not, halt with a gentle pointer.
2. Pattern #13: announces `tessl:analyzing-test-coverage` for raw-parsing deferral when present. Vibe Test still runs the adapter / c8 fallback (the denominator-honesty check is non-negotiable); Tessl's output becomes the per-level source.
3. Detects framework + current coverage command (priority: `test:coverage` > `coverage` > `test --coverage` > reconstructed default). Builds `actualSourceFiles` from prior audit's inventory or live scan.
4. C1 adaptation-prompt UX: calls `runCoverage({adapterAccepted: null})` to produce the diff, shows the builder, asks `[y/N]`. On `y` re-invokes with `adapterAccepted: true` (mutates target file atomically + runs adapted command). On `n` falls back to `c8 --all` and logs `coverage_adapter_refused` friction at `medium`. Caches decline in `.vibe-test/state.json.coverage_adapter_declined` so future runs skip the prompt silently.
5. C1 denominator honesty enforcement: when `is_cherry_picked === true` (ratio < 0.75), emits finding `category: cherry-picked-denominator`, `severity: high`, with reported-vs-actual counts + missing files (truncated to 10) + the minimal-diff example_pattern.
6. Computes weighted score via `computeWeightedScore({perLevel, applicability, tier})` with Tessl-deferred per-level parsing when available; tier pulled from audit-state (fallback `public-facing` conservative default).
7. C3 CI artifact: emits all three output views, with the JSON sidecar at `.vibe-test/state/coverage.json` schema-validated against `coverage-state.schema.json`. JSON carries `passes_tier_threshold: boolean` but coverage command itself ALWAYS exits 0 — gate owns the exit-code contract.
8. Writes session-log + beacons in the terminal phase; no project-state mutation beyond the adapter-decline cache.

Every user-facing string respects `src/reporter/tier-adaptive-language.ts` verbosity knobs. JSON output is level-invariant.

Handoff line format is *"Run `/vibe-test:gate` when ready."* (persona-adapted). Do **not** prescribe `/clear` between commands — Claude Code auto-compacts.
