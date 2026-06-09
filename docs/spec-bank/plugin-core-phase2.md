# Spec: @626labs/plugin-core Phase 2 — first real extractions

**Status:** BUILD-READY spec, written 2026-06-09 (Fable 5 window, Day 3). Designed for autonomous execution from this document. Surveyed material: `packages/core` v0.0.1 skeleton, vibe-doc `src/`, vibe-cartographer plugin scripts.

## Scope ruling

Phase 2 ships **core v0.1.0 with three working modules** — the ones the survey found extraction-ready code for — and *re-scopes* two modules whose "reference implementation" turned out to be prose, not code. The README's seven-module extraction order stands; this spec executes positions 1–3 and re-documents 4–7.

| Module | Verdict | Source material |
|---|---|---|
| `scanner` | **extract now** | vibe-doc `src/scanner/` — orchestrator 116 LoC + file/git/code/artifact scanners ≈ 620 LoC TS, dependency-light |
| `state` | **extract now** | vibe-doc `src/state/` ≈ 150 LoC TS; cart's `atomic-write-json.js` (101 LoC) informs the atomic-write contract |
| `session-logger` | **extract now** | `atomic-append-jsonl.js` (109 LoC, identical in doc + cart) + the canonical entry schema in guide SKILLs |
| `ci-check` | defer to 0.2.0 | vibe-doc `src/checker/` is generic already (~200 LoC); cheap later, not load-bearing now |
| `classifier` | defer — design first | vibe-doc `src/classifier/` ≈ 1,085 LoC but signal tables are vibe-doc-specific; extraction = parameterizing signal extraction, a design task |
| `profile` | **re-scope: contract, not code** | The write logic is ~1,800 lines of SKILL prose in cart. Ship the JSON Schema + ownership rules as core artifacts + a contract test; no executable port |
| `composition` | **re-scope: contract, not code** | The complements table + Pattern #13 heuristics are decision tables in guide SKILLs. Ship the table schema + a filter helper only |

## The build (sequential steps, each independently verifiable)

1. **Port `scanner`.** Lift vibe-doc's `src/scanner/*` into `packages/core/src/scanner/`, replacing vibe-doc-specific types with the core interface (`scan(ScannerOptions) → ArtifactInventory`). Keep the four sub-scanners (file/git/code/artifact) as internal modules. Acceptance: core's scanner produces an inventory on the vibe-plugins repo itself that structurally matches vibe-doc's output on the same tree (snapshot test).
2. **Port `state`.** Sync read/write/mergeAndWrite with atomic temp→rename semantics matching `atomic-write-json.js` behavior (including Windows rename-over-existing handling). Acceptance: property test — concurrent-ish sequential writes never produce torn JSON; round-trip typed.
3. **Port `session-logger`.** TS implementation of the atomic JSONL append + typed entry builder from the canonical schema. CRITICAL: UTF-8 explicit encoding everywhere (the family's recurring cp1252 mojibake class) and BOM-tolerant reads (PS 5.1 lesson). Acceptance: encoding round-trip tests (em-dash/CJK), BOM-prefixed-line read test, sentinel/terminal pairing helper.
4. **Contract tests validate REAL emitted artifacts, not fixtures.** The v0.7.1 round-trip found vibe-prompt's emitters drifting from committed schemas while fixture-based tests stayed green. Core's test layer must include: for each module, at least one test that runs the module and validates its actual output file against the published schema. This is a standing rule for core, not a one-off.
5. **Re-document `profile` + `composition`** in core's README as contract modules: publish `builder-profile.schema.json` (from cart's guide/references) and the complements-table schema as core-owned artifacts; export only a validation helper + the composition filter helper. Mark the executable ports explicitly out of scope with the reason (prose-driven by design).
6. **Version + consumers.** Cut core `0.1.0`. First consumer migration: vibe-doc replaces its internal `src/scanner` + `src/state` imports with core (it authored them — lowest-risk proof). Do NOT migrate other plugins in this phase; they pin `^0.x` and wait for 0.2.0.

## Constraints

- TypeScript strict; no new runtime deps beyond what vibe-doc's sources already use.
- Don't republish casually: coordinate the 0.1.0 publish with vibe-doc's consuming release (the lockstep rule in vibe-plugins CLAUDE.md).
- The deferred `classifier` design doc is a separate future artifact; do not start it opportunistically mid-build.

## Done means

`pnpm --filter @626labs/plugin-core build && test` green with the three modules real; vibe-doc consuming scanner+state from core on its main; core README truthful about what's stub vs real; contract-test rule documented and enforced in CI.
