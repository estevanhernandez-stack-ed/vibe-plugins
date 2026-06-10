# Convention: stable-channel promotion checklist

**Status:** STANDARD v1, ratified 2026-06-09. Born from the quality-net gap analysis (GAP-01 durable half + GAP-22; see `docs/quality-net-gap-analysis-2026-06-09.md`) the same day four shipped incidents were catalogued and a fifth (the thesis-engine v0.2.2 personal/employer-context leak) was scrubbed out of the live stable channel.

A promotion is a deliberate act — one ref bump in `.claude-plugin/marketplace.json`. This checklist is what "deliberate" means. The mechanical checks are enforced by `scripts/marketplace_gate.py` (runs in CI on every manifest change via `.github/workflows/marketplace-gate.yml`, plus a weekly cron); the judgment rows are the promoter's.

## The checklist

Every ref bump, in order:

1. **Linear flow held.** The work shipped on the solo repo's main first, got tagged there, and only then does the ref move here. Never edit the manifest and the solo repo in parallel.
2. **Verify by commit position, not tag name.** Before bumping: the tag's commit is on the default branch, `plugin.json` version at the tag equals the tag number (prefix-stripped; vibe-test and vibe-sec use `<plugin>-vX.Y.Z`). The mislabeled Vibe-Doc v1.0.0 stray tag (deleted 2026-06-01) is the incident this row encodes. *(Gate checks: ref-resolution, version-coherence.)*
3. **Run the gate before committing the bump.** `python scripts/marketplace_gate.py --only <plugin>` locally (set `MARKETPLACE_GATE_DENYLIST` from the environment, never from a file). CI re-runs the full gate on the push, on ubuntu + windows.
4. **No leaks in the shipped subtree.** Tenant/denylist terms are an absolute block — no warn tier, no exceptions (the thesis-engine v0.2.2 class). Personal-path shapes (`C:\Users\<name>`, `/Users/<name>/`, `/home/<name>/`) block new content; see the burn-down section for the pre-gate residue. *(Gate check: leak-lint.)*
5. **Every registry reference in shipped docs must exist.** `npx <pkg>` / `npm install <pkg>` / `pip install <pkg>` in shipped SKILLs, commands, and READMEs must resolve on its registry — the `npx vibe-doc` 404 / name-squat class, caught again as a residual the same day the gate was built (fixed as vibe-doc v0.8.2). *(Gate check: registry-refs.)*
6. **Contract-change releases ship migration notes (GAP-22).** If the release changes any state/artifact schema a user's app may hold on disk (`.vibe-*/` state files, emitted artifacts, handshake files): the CHANGELOG carries a migration note, emitted state files carry a version stamp, and the plugin's vitals (or equivalent) gains a stale-state check. vibe-test's migration dispatcher (`src/state/migrations/`) is the in-family reference implementation to copy. Readers read both old and new locations/shapes for one minor cycle before writers migrate (the data-home rule, applied user-side).
7. **Cross-plugin seams re-verified.** If the release touches an artifact another plugin reads (covered-surfaces, findings.jsonl, breadcrumbs), the consuming side's contract test runs against the REAL emitted artifact before the bump — the GAP-07 lesson: both plugins' own suites stayed green for months while the seam between them was broken. Seam schemas become core-owned in plugin-core Phase 2 (see the spec-bank amendment).
8. **Source-type or channel-model changes need a real-install proof.** A promotion that changes how users fetch the plugin (source type, URL form, path) isn't proven until a clean machine actually installs it — the vibe-insights SSH incident was invisible to every check except a keyless user's real install.
9. **Log the promotion decision when it isn't routine.** Timing, what's in the release, who asked — per the repo's decision-log bar. Routine no-surprise bumps skip.

## Gate severity model

- **Denylist (tenant) terms:** FAIL, always, everywhere. The terms live only in the `MARKETPLACE_GATE_DENYLIST` env var / repo secret — never committed, and redacted in gate output (`[denylist#N]`), because committing the list to this public repo would recreate the leak it guards against.
- **Personal-path shapes:** FAIL by default (`--paths-severity fail`). CI currently runs `--paths-severity warn` because 15 findings shipped in pre-gate tags (below). When the burn-down list is empty, remove the flag from the workflow so CI uses the strict default.
- **Registry lookups that error without a 404:** WARN, not FAIL — an inconclusive network lookup must not block a promotion.
- **Drift (commits ahead of the pin):** informational only. Drift is the stable channel working as designed; *unreleased fixes* sitting in that drift are a vibe-launch concern (GAP-04), not a gate failure.

## Burn-down: pre-gate personal-path findings (2026-06-09 baseline)

All username-path class, zero tenant-term hits, verified at the pinned tags. Each plugin scrubs its rows in its next release, whatever that release is; strike rows here as they clear.

| Plugin (pinned) | Findings |
|---|---|
| vibe-cartographer v1.10.1 | `skills/evolve-cart/SKILL.md:26` |
| vibe-test vibe-test-v0.2.5 | `docs/dogfood-wseyatm-v0.2.md` ×6 · `SECURITY.md:11` · `skills/guide/SKILL.md:183` |
| vibe-taker v0.1.2 | `skills/guide/references/error-contract.md:90` |
| vibe-walk v0.2.0 | `scripts/build/emit_tour_module.py:493` (docstring example) |
| vibe-insights v0.3.0 | `tests/test_ingest.py:13` |
| vibe-prompt v0.7.1 | `tests/schemas/test_back_compat_v06_artifacts.py:163,165,168` |

When this table is empty: flip the workflow to strict (`--paths-severity` flag removed) and delete this section.

## Honesty cap

The gate simulates the loader contract (ref resolves → HTTPS clone → `plugin.json` present, parseable, version-coherent → lints). It does **not** run a real `claude /plugin install` — there is no headless Claude Code in CI — so a defect only a live loader would surface can still pass. Row 8 exists because of exactly that residual.
