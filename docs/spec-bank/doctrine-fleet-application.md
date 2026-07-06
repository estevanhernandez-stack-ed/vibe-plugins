# Doctrine fleet application

**Status:** build-ready. **Consumes:** [../conventions/operating-doctrine.md](../conventions/operating-doctrine.md) v1.0.0 + the seed mapping table below. **Produces:** one PR per remaining plugin (digest stamp + domain overlay + trigger-quality pass), tags, marketplace ref bumps.

## Objective

Apply the operating doctrine to every family plugin not covered by the two reference implementations (vibe-taker, vibe-iterate). Derive the roster from `.claude-plugin/marketplace.json` — never hand-count. As of 2026-07-06 that means 12 plugins.

## Per-plugin work unit

For each plugin, in its solo repo:

1. **Digest stamp** — add the canonical digest block (copy verbatim from the doctrine's Adoption format section) to the plugin's guide skill (or the closest equivalent always-loaded skill; if none exists, the primary router skill). Include the provenance line.
2. **Domain overlay** — expand the plugin's load-bearing moves (seed table below) with plugin-specific procedure and one plugin-relevant example. Use the reference implementations as format models: vibe-taker (proactivity-shaped) and vibe-iterate (persona-composition-shaped, showing doctrine stacking under Ptolemy). Overlays translate; they don't repeat the canonical text. Whole block stays under 60 lines.
3. **Trigger-quality pass** — rewrite each skill/command description against the four rules (lead with WHEN; 3–6 trigger phrasings; name the negative space; cold-read test). Hand-seed phrasings; the mining job's phrase bank replaces them later.
4. **Frontmatter-parity check** — verify every skill's description survives packaging and surfaces non-empty (the known empty-description bug). Fix parity issues found.
5. **Ship** — PR on the solo repo → merge → tag per that repo's naming convention (**check the repo's actual tag list**: vibe-test and vibe-sec use `<plugin>-vX.Y.Z`; others use `vX.Y.Z`) → ref bump in marketplace.json here.

## Seed mapping table (which moves get overlays)

Refine per repo at application time; the digest always carries all twelve.

| Plugin | Load-bearing moves |
|---|---|
| vibe-cartographer | 1 recon before verdict, 10 match altitude, 9 name the leftovers |
| vibe-doc | 1 recon before verdict, 4 evidence-gated closure (doc-gap claims cite files) |
| vibe-test | 2 verify the scare (broken harness ≠ broken code), 12 contradiction stop |
| vibe-sec | 6 secret-sniff, 2 verify the scare, 7 smallest sanctioned step (destructive-action overrides) |
| vibe-prompt | 12 contradiction stop, 4 evidence-gated closure (findings cite sites) |
| vibe-wrap | 8 close the loop fully, 9 name the leftovers, 6 secret-sniff |
| vibe-insights | 1 recon before verdict, 12 contradiction stop |
| vibe-walk | 5 re-anchor don't rebase (drift-aware anchors), 10 match altitude |
| vibe-keystone | 1 recon before verdict, 10 match altitude |
| vibe-lingual | 5 re-anchor don't rebase, 12 contradiction stop |
| thesis-engine | 4 evidence-gated closure (claims cite sources), 9 name the leftovers |
| vibe-thesis | 4 evidence-gated closure, 9 name the leftovers |

## Acceptance gates

- One PR per plugin; no bundling (family hard rule).
- `marketplace-validator` run green before each ref bump.
- Guide skill stays within family skill-size norms after stamping; if the stamp would blow the budget, trim the overlay, never the digest.
- Marketplace promotion flow respected: solo main → tag → ref bump. Never edit marketplace.json and a solo repo in parallel.
- Each PR body names the doctrine version stamped and lists the descriptions rewritten.

## Order

Start with the plugins whose overlays are risk-shaped (vibe-sec, vibe-test) — they benefit most and their gates are easiest to verify. Then the session-shaped ones (wrap, insights), then the rest.
