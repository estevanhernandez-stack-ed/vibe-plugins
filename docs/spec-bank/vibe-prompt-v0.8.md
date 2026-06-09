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

## From the 626Labs leg (4/4, PASS 5/5, composite 8/10, nested-projects + model-routing — the app v0.7's features were built for)

9. **Multi-registry support (upgrades #6 to top tier).** The platform carries BOTH a model-routing registry (`modelRegistry.ts`) and a prompt-content registry (`personalityDefinitions.ts` — THE_ARCHITECT + 10 persona systemPrompts) — the single `registry` slot records one, and **F1b false-fires "no prompt-content registry"** while one demonstrably exists. v0.7 fixed the model-routing F1 FP; two coexisting registry kinds is the next case. `registries[]` schema change.
10. **Defense-recognition gap — the audit doesn't recognize its own remediation (headline).** galaxyCore was hardened by vibe-prompt's own earlier remediate cycles, yet F10/F11 still fire: F10's 200-char proximity window misses top-of-prompt role-lock with bottom-fenced data AND isn't API-parameter-aware (ChatController defends in `systemInstruction` while vars ride `message` — F12 learned this in v0.6, F10 didn't); F11's literal 6-phrase list counts 1 of 4+ real defenses. Fix shape: semantic-class defense detection (or at minimum, recognize Category-C remediation output verbatim) + API-param awareness for F10.
11. **Static-only F12 precision.** Without composer.json (no :eval/:first-run-setup), F12 degrades to high even on API-separated-safe composers. A lightweight audit-time SDK-call/apiParameter sniff would carry v0.6's precision onto pure static runs.
12. **F6-suspect needs a suppress path (minor).** The confidence ladder only elevates (context7 confirm-not-published → high); a confirm-published → suppress path would clear real-but-newer models without manual exceptions. Also: F9's trigger set is broader than documented — it fired on "when"/"current" (non-temporal) here, not just years.
13. **Grade per-workspace null-guard (minor).** Per-workspace composites key off `finding.workspaceIdentifier`; when audit leaves it null, grade silently falls back to single-workspace on a monorepo inventory. Guard + warn.

## Round-trip closure

**4/4 apps PASS, 20/20 criteria (2026-06-09):** Celestia3, WeSeeYouAtTheMovies, QuizShow, 626Labs platform. Ecosystem-loop evidence on the platform leg: the 2026-06-01 remediate diffs appear applied in source and the repo sits on a `security/phase-1-criticals` branch — the audit→remediate→handoff loop demonstrably ran on the platform itself.

## Scoping note

#2 + #6 + #9 are one schema work-package (`registries[]` + emitter reconciliation + contract tests); #1 + #4 + #5 + #12 are detection-calibration; #10 + #11 are the injection-family precision package; #3 + #8 are spec-text reconciliation; #7 + #13 are hardening. A v0.8 could ship as "trustworthy state" (schema package + #1 + contract tests) with the injection-precision package as the v0.9 headline.
