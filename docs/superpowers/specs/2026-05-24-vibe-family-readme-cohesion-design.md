# Vibe family README cohesion standard

**Date:** 2026-05-24
**Status:** Design approved, pending implementation plan
**Repo:** `vibe-plugins` (system of record for the family) · branch `feat/readme-cohesion-standard`
**Goal driver:** Cohesion & credibility (chosen over conversion / discovery / measurement)

## Context

The Vibe marketplace ships **11 plugins** but presents as a fragmented, partly-stale
set. The storefront README still says "seven plugins" and hard-codes versions that
have drifted (Cart shown `v1.7.3`, actually `v1.9.1`; Sec `v0.0.2`, actually
`v0.6.0`; Doc and Keystone also behind). Solo-repo READMEs vary wildly — banners on
Cart/Doc but not taker/insights/iterate; titles drift ("Vibe Cartographer" vs
"vibe-taker — solo repo" vs "vibe-insights"); no two agree on section order; some
carry npm install blocks, some don't. None carry a consistent real-app validation
line, even though "proven on a real app before it ships" is the family norm.

This is the first sub-project of a three-surface cohesion push. The other two —
**npm cleanup** and **LabHub plugin pages** — are sequenced after and specced
separately.

## Goal

Make all 11 plugins read as one mature, consistent, maintained product family by
applying a single README presentation standard across the GitHub surface: the
**storefront** README (this repo) and the **11 solo-repo** READMEs.

## Non-goals (out of scope here)

- **npm cleanup** — the `-cli`/non-`-cli` confusion, orphan package, keyword
  vocabulary. Separate sub-project (sequenced next; has its own correctness issues).
- **LabHub plugin pages** — the hub's rendered web pages. Separate sub-project;
  requires hub-repo access to scope.
- **Repo renames** — the mixed-case repo names (`Vibe-Doc`, `vibe-cartographer`,
  `vibe-Keystone`…) are not renamed here (outward-facing, breaks links). The README
  *display title* is normalized to `Vibe <Name>` regardless of repo casing.
- **Conversion / discovery work** — screenshots, demos, SEO, social. Not this push.

## The standard

Every plugin README follows this structure, in this fixed order:

| Block | Rule |
|---|---|
| Brand banner | `<p align="center"><img …></p>` → `https://626labs.dev/assets/brand/plugins/<slug>-banner-1500x500.png`, consistent style across all 11 |
| Title | `# Vibe <Name>` — title-case; no "— solo repo", no lowercase slug |
| Tagline | `**<one sentence>.**` — bold, the hook |
| Version badge | shields.io `github/v/tag` (or `github/v/release`) pointing at the solo repo — renders the latest tag live, **cannot drift** |
| `## What it does` | Value prop — the gap it closes, 2-3 sentences |
| `## How it works` | Commands/usage as a table or numbered stages |
| `## Validated on` | The credibility line — "Proven on `<real app/cycle>`" (see evidence table) |
| `## Install` | stable → canary → npm (npm block **only** if the plugin ships a CLI package) |
| `## Part of the Vibe ecosystem` | Cross-link footer: marketplace link + one-line list of sibling plugins |
| `## License` | MIT |

Notes:
- **Backbone + extras (refined after the Cart checkpoint).** The blocks above are
  the required backbone, in this fixed order. Plugins **keep their own extra
  sections** — credits, doc/CHANGELOG links, migration notes, plugin-specific
  subsections (e.g. Cart's Personas / Architecture docs) — placed as subsections
  under `## How it works` or as additional sections before `## License`. The
  standard mandates the spine and order, not a ceiling: **never drop real content
  to fit the template.** A lean plugin (vibe-insights) is the minimum; a rich one
  (Cartographer) carries more under the same spine.
- **Storefront exception:** the storefront README keeps its ecosystem-level sections
  (channels, install matrix, the "Vibe thesis" narrative, stats) but is brought
  current: **7 → 11 plugins**, the hard-coded version table replaced with a
  live-badge column (one shields.io tag badge per plugin), and the four missing
  plugins
  (vibe-iterate, vibe-taker, vibe-walk, vibe-insights) added to every list, the
  install block, and the narrative.
- **Anti-drift is the point.** No README hard-codes a version number in prose. Live
  badges only. This is what prevents the storefront problem from recurring.
- **Voice:** builder-to-builder, second person, sentence case, em-dashes welcome, no
  "empower/leverage/seamlessly/unlock," no emoji in the copy (per the repo voice).

## The "Validated on" line — credibility, so it must be true

This line is the heart of the credibility goal and its biggest risk: **a false
validation claim destroys the credibility it's meant to build.** Rule: state only
real, verifiable validation. Confirm each plugin's actual story before writing it;
never fabricate. If a plugin has no clean real-app validation, the line is omitted
or stated honestly rather than invented.

Known (on record):

| Plugin | Validated on |
|---|---|
| vibe-cartographer | Dogfooded across build cycles — it builds the other plugins |
| vibe-doc | Scanned the 626 hub |
| vibe-sec | A real Firebase app (per its current description) |
| vibe-taker | The bgremove + Sanduhr features |
| vibe-walk | Celestia3 (cycle #16, A/B vs the hand-built version) |
| vibe-insights | The live 195-session personal index (Phase 2, 2026-05-24) |

To confirm before writing (do not invent): **vibe-test, thesis-engine,
vibe-thesis, vibe-keystone, vibe-iterate**. Pull from each repo's process-notes /
reflection / decision log; if none exists, ask before claiming.

## Banners

9 new banners (all except Cart/Doc, which already have them), generated via the
`626labs:design` skill to match the existing brand system, 1500×500.

**Hosting dependency:** banners are referenced from
`https://626labs.dev/assets/brand/plugins/` — that path is served by the hub/site
repo, not this one. The 9 generated images must be committed to whatever repo serves
that asset directory. This is a cross-repo coordination step; the exact asset
directory is confirmed at build time before the READMEs reference the new URLs (so
no README ships a broken image link).

## Install-block rules

- **All plugins:** stable (`/plugin install <name>@vibe-plugins`) + canary
  (`/plugin install <name>@estevanhernandez-stack-ed/<repo>`).
- **npm block only for plugins that ship a CLI package** — this appears to be
  cartographer, doc, sec, test, but confirm which actually ship a usable CLI binary
  at build time (some npm entries may be legacy pre-migration publishes). The npm
  package naming is *not corrected here* (that's the npm sub-project); this pass uses
  whatever the canonical package is at build time, and flags any mismatch for the
  npm sub-project rather than fixing it inline.

## Rollout sequence

1. Lock the standard (this spec) and write one **reference README** end-to-end as
   the canonical example (recommend vibe-insights — recently shipped, clean).
2. Generate the 9 banners (`626labs:design`) and resolve hosting.
3. Apply to the **storefront** README (7 → 11, live badges, narrative refresh).
4. Apply to the **11 solo READMEs**, one per repo, each on its own branch →
   merge to that repo's `main`. README-only changes do **not** require a
   marketplace ref bump (canary `main` carries READMEs; the storefront's plugin
   list is what users read at the family level).

## Acceptance

- All 12 READMEs (storefront + 11 solo) follow the standard's section order.
- Every solo README carries a live version badge (no hard-coded version in prose).
- Every plugin has a banner at the brand path; no broken image links.
- Every `## Validated on` line is true and sourced (no fabricated claims).
- Storefront lists all 11 plugins everywhere (table, install block, narrative);
  no "seven plugins" residue; no stale hard-coded versions.
- npm blocks appear only on the plugins that actually ship a CLI (confirmed at build).

## Risks

- **False validation claims** — mitigated by the "confirm, never fabricate" rule.
- **Banner hosting blocks rollout** — mitigated by confirming the asset dir before
  referencing new URLs; READMEs for Cart/Doc (existing banners) and the text-free
  structure can land first if hosting lags.
- **Scope creep into npm/LabHub** — explicitly fenced; mismatches are flagged, not
  fixed, here.
