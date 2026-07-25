# Spec bank

Build-ready specs and evidence-backed seeds, written so a capable agent can execute them from paper — no session memory required. Created during the Fable 5 window (2026-06); the standing rule is that judgment-dense design happens up front and lands here, volume execution happens whenever.

| Spec | Status | What it builds |
|---|---|---|
| [plugin-core-phase2.md](plugin-core-phase2.md) | build-ready | `@626labs/plugin-core` v0.1.0 — scanner/state/session-logger as real TS, profile/composition re-scoped as contracts, the validate-real-artifacts test rule + the GAP-07 seam-contracts amendment |
| [doctrine-fleet-application.md](doctrine-fleet-application.md) | build-ready | Operating-doctrine rollout to the 12 non-reference plugins — digest stamps, domain overlays (seed mapping inside), trigger-quality pass, frontmatter-parity check, PR-per-plugin |
| [doctrine-transcript-mining.md](doctrine-transcript-mining.md) | build-ready | Empirical validation of the doctrine's 12-move inventory against 30+ days of raw session transcripts (estate-side) — validation report, proposed doctrine diffs, per-plugin trigger-phrase bank |
| [doctrine-eval-harness.md](doctrine-eval-harness.md) | build-ready | 3–5 hermetic fixture repos with doctrine-shaped traps; A/B gate-compliance runs with/without the digest loaded — measures gates, not ghosts |
| [vibe-access-v0.1.md](vibe-access-v0.1.md) | **shipped 2026-07-09** | The agent-access pillar — scan/map/scaffold/verify an agent-facing access layer (manifest + gap affordances, dev/prod-safe tiers); v0.1.0 live on both channels, dogfooded on WeSeeYou (7 bugs found+fixed, 76/85 verify); the 15th plugin |
| [vibe-launch-seed.md](vibe-launch-seed.md) | cowpath-evidenced | The release-engineering pillar (GAP-04) — loop walked 9× on 2026-06-09; `:release` / `:promote` / `:drift`, composing with the marketplace gate + promotion checklist |
| [vibe-ops-seed.md](vibe-ops-seed.md) | seed + live probes | The operate/monitor pillar (GAP-06) — Firebase pulse, pull-based; fleet enumerated live (6 projects), MCP log-tool gap identified; Celestia3 hand-pulse is the named next act |
| [vibe-prompt-v0.8.md](vibe-prompt-v0.8.md) | candidate list | 8 evidence-backed items from the 3-app round-trip; suggested core: "trustworthy state" (known-models refresh + schema reconciliation + contract tests) |
| [vibe-keystone-v0.3.md](vibe-keystone-v0.3.md) | **shipped 2026-07-25** | The derivability rewrite — Keystone's generated shape re-cut against the Claude 5 context rules and the verified `/doctor` criterion (cut what `ls`/`cat`/manifest/`--help` yields, keep gotchas + rationale + non-standard conventions); adds nested keystones, skill extraction, the protected-content guard for human-supplied context, a line budget, a progressive-disclosure pass on Keystone's own 390-line SKILL, and a 5-repo estate migration as validation |
| Keystone harness proposals | partly absorbed | 4 ranked proposals in the solo repo: `vibe-Keystone/proposed-changes-harness.md`. #2 (map-not-encyclopedia) is now the core of the v0.3 spec above; #3 (repo-as-system-of-record) shipped as the "Knowledge & taste" section; #4 (evolution loop) shipped as Tier 0 capture + `evolve-keystone`. #1 (executable output validator) stays parked — v0.3 keeps the checks agent-run to hold the zero-scripts promise |
| Data-home rollout | gated | Per-plugin migration plan inside [../conventions/data-home.md](../conventions/data-home.md) — blocked on one 10-minute verification session |

Related conventions (standards, not specs): [../conventions/](../conventions/) — decision-log backend, data-home resolution, model-tiering RFC (pending ratification).
