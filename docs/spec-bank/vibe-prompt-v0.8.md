# Spec seed: vibe-prompt v0.8 — round-trip-sourced candidates

**Status:** EVIDENCE-BACKED candidate list, not yet scoped. Source: the v0.7.1 cross-app round-trip (2026-06-09, 3/3 apps PASS, 15/15 criteria — Celestia3, WeSeeYouAtTheMovies, QuizShow). Per-app receipts live in each app's `docs/vibe-prompt/audit-2026-06-09.md`.

## Top tier (multi-app confirmed)

1. **Known-models staleness (strongest single candidate).** The bundled `known-models.md` (dated 2026-06-01) flagged FIVE real, shipping models as F6-suspect across three apps: `claude-sonnet-4-20250514`, `gemini-2.5-flash-image`, `gemini-1.5-flash-latest`, `gemini-3.5-flash`, `gemini-3-pro-preview`. Fix shape: a refresh mechanism (the `:radar` weekly cache already tracks model news — wire it in) or a documented reliance on `modelIdExceptions` with the bundled list demoted to advisory.
2. **Schema drift between committed schemas and agent-emitted state (new failure class).** Committed inventory/audit/grade-result schemas require `version` consts, array-form evidence, integer composites; the skills emit `schemaVersion`, object evidence, decimals, extra fields. "Validate before write" is a no-op, and fixture-based tests stay green while live emitters drift. Also: Celestia3's inherited `baseline.json` declares version "0.4" against a schema const of "0.3". Fix shape: reconcile schemas to emitters + add a contract test that validates a REAL emitted artifact per command (same standing rule now written into plugin-core Phase 2).
3. **F12 severity spec self-contradiction.** The absent-system-instruction sub-case (audit step 4b + rubric §F12-4b + guide) says `high` "regardless of API parameter"; the multiplicity-decoupling rule (step 7) was read as `critical` by the v0.7.0 probe. Reconcile the text; one rule must own the case.

## Second tier (single-app, concrete)

4. **F13 declaration phrase-list too literal** — misses "Return valid JSON" variants; 2 false positives (QuizShow hotel prompts). Extend the recognized list.
5. **F9 over-fires on non-temporal years** — `year`/`month` keywords trip on historical contexts (movie release years, both movie apps). Needs a current-date-relevance guard.
6. **Aggregator single-registry limit** — `inventory.registry` is one object; multi-registry apps (QuizShow ships PERSONALITIES + BADGE_PROMPTS) under-report at the aggregator. Make it `registries[]` (pairs with the schema work in #2).
7. **Agent-step determinism hardening** — the 2026-06-01 probe run missed a ~90-prompt registry, skipped per-workspace inventory emission, and had a composite arithmetic inconsistency; the faithful 2026-06-09 run had none of these. Candidates: mandatory per-workspace emission checklist + composite-arithmetic echo line in grade output.
8. **Codify two judgment calls as spec text** (Celestia3 leg): (a) grade excludes stale/low-coverage eval runs from blending (the run it excluded was 11 days old, 2/15 prompts, scored a since-edited prompt); (b) the monotonic baseline never advances on audit-only gains. Both were correct improvisations — write them into the grade SKILL so they're contract.

## Scoping note

#2 + #6 are one schema work-package; #1 + #4 + #5 are detection-calibration; #3 + #8 are spec-text reconciliation; #7 is prose-hardening. A v0.8 could ship as "trustworthy state" (#1–#3 + contract tests) with the rest as fast-follow.
