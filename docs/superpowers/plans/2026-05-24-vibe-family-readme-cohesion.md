# Vibe Family README Cohesion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 11 Vibe plugins read as one mature, consistent, maintained product family by applying a single README presentation standard across the storefront + 11 solo READMEs.

**Architecture:** One standard (fixed section order, live anti-drift version badges, banner header, true `Validated on` line, ecosystem footer) cascaded across the GitHub surface. Banners for the 9 plugins lacking one are generated via the `626labs:design` skill and hosted at the brand asset path. Phased with checkpoints because banner design is a taste call and pushing to 11 repos is outward-facing.

**Tech Stack:** Markdown, shields.io dynamic badges (`github/v/tag`), `626labs:design` skill (banners), `gh`/git across repos.

**Spec:** `docs/superpowers/specs/2026-05-24-vibe-family-readme-cohesion-design.md`

---

## Reference: the standard (every README, fixed order)

```
<p align="center"><img alt="Vibe <Name> — <tagline>" src="https://626labs.dev/assets/brand/plugins/<slug>-banner-1500x500.png" /></p>

# Vibe <Name>

**<one-line tagline>.**

[![version](https://img.shields.io/github/v/tag/estevanhernandez-stack-ed/<repo>?label=stable&color=17d4fa)](https://github.com/estevanhernandez-stack-ed/<repo>/tags)

## What it does
## How it works
## Validated on
## Install        (stable → canary → npm only if a CLI ships)
## Part of the Vibe ecosystem
## License
```

## Reference: per-plugin data

| Plugin | Repo | Banner today | npm CLI? | Validated on |
|---|---|---|---|---|
| vibe-cartographer | vibe-cartographer | yes | confirm | Dogfooded across build cycles — builds the other plugins |
| vibe-doc | Vibe-Doc | yes | yes (`@esthernandez/vibe-doc`) | Scanned the 626 hub |
| vibe-sec | vibe-sec | no | confirm | A real Firebase app |
| vibe-test | vibe-test | no | confirm | **CONFIRM — pull from repo** |
| thesis-engine | Thesis-Engine | no | no | **CONFIRM — pull from repo** |
| vibe-thesis | Vibe-Thesis | no | no | **CONFIRM — pull from repo** |
| vibe-keystone | vibe-Keystone | no | no | **CONFIRM — pull from repo** |
| vibe-iterate | vibe-iterate | no | no | **CONFIRM — pull from repo** |
| vibe-taker | vibe-taker | no | no | The bgremove + Sanduhr features |
| vibe-walk | Vibe-Walk | no | no | Celestia3 (cycle #16, A/B vs hand-built) |
| vibe-insights | vibe-insights | no | no | The live 195-session personal index |

---

## Phase 1 — Foundations (no external deps)

### Task 1: Confirm the five unknown `Validated on` stories

**Files:** none (research → updates the data table above).

- [ ] **Step 1:** For each of vibe-test, thesis-engine, vibe-thesis, vibe-keystone, vibe-iterate, read the solo repo's `process-notes.md`, `docs/reflection.md`, and any `docs/` validation note for a real-app/real-data validation story. Dispatch one Explore agent across all five repos.
- [ ] **Step 2:** For each, record the true validation in the data table. If a repo has **no** real validation on record, mark it "none on record."
- [ ] **Step 3 (checkpoint):** Present the five findings to Este. For any "none on record," ask whether to omit the `Validated on` line or supply the real story. **Never fabricate.**

### Task 2: Resolve the banner hosting path

**Files:** none (discovery).

- [ ] **Step 1:** Determine what serves `https://626labs.dev/assets/brand/plugins/`. Check for a hub/site repo locally (`ls /c/Users/estev/Projects` for a hub/626labs.dev repo); inspect how the existing Cart/Doc banners are served (find the asset dir + commit path).
- [ ] **Step 2:** Confirm write access / the commit path for new assets.
- [ ] **Step 3 (checkpoint):** Report the asset location. If inaccessible from here, the plan switches to: generate banners locally, hand the 9 files to Este to host, proceed with README structure and add banner refs once URLs are live (no README ships a broken image link).

---

## Phase 2 — Banners (depends on Task 2)

### Task 3: Generate the 9 missing banners

**Files:** Create 9 × `<slug>-banner-1500x500.png` (vibe-sec, vibe-test, thesis-engine, vibe-thesis, vibe-keystone, vibe-iterate, vibe-taker, vibe-walk, vibe-insights).

- [ ] **Step 1:** Invoke the `626labs:design` skill. Brief it with: the existing Cart/Doc banners as the reference style, the brand tokens, 1500×500, each plugin's name + tagline, consistent layout across all 9.
- [ ] **Step 2:** Generate all 9 to a local staging dir.
- [ ] **Step 3 (checkpoint):** Present the 9 to Este for approval — design is a taste call. Iterate on notes before hosting.

### Task 4: Host the banners

**Files:** the 9 PNGs → the asset dir confirmed in Task 2.

- [ ] **Step 1:** Commit the 9 approved banners to the serving location (or hand off to Este per Task 2's fallback).
- [ ] **Step 2:** Verify each URL resolves (HTTP 200) before any README references it.

---

## Phase 3 — Lock the standard with a reference README

### Task 5: Rewrite the vibe-insights README to the standard

**Files:** Modify `C:/Users/estev/Projects/vibe-insights/README.md` (on a branch `chore/readme-standard`).

- [ ] **Step 1:** Apply the full standard: banner, `# Vibe Insights`, tagline, live `github/v/tag` badge for `vibe-insights`, the six sections, `Validated on` = "the live 195-session personal index," ecosystem footer linking the marketplace + siblings, MIT.
- [ ] **Step 2:** Verify: sections in order, badge renders, banner link 200, no hard-coded version in prose, links resolve.
- [ ] **Step 3:** Commit, merge to `main`, push.
- [ ] **Step 4 (checkpoint):** Show Este the rendered result as the canonical example. Adjust the standard if anything reads wrong **before** fanning out to the other 10 + storefront.

---

## Phase 4 — Storefront

### Task 6: Bring the storefront README current (7 → 11)

**Files:** Modify `C:/Users/estev/Projects/vibe-plugins/README.md` (this branch, `feat/readme-cohesion-standard`).

- [ ] **Step 1:** Replace every "seven plugins" / 7-item list with all 11, grouped by the existing Foundations / Pillars framing (place iterate, taker, walk, insights in the right group).
- [ ] **Step 2:** Replace the hard-coded version column in the plugin tables with a live `github/v/tag` badge per plugin (no prose versions anywhere).
- [ ] **Step 3:** Add the four missing plugins to the CLI install block and the "Vibe thesis" narrative section; update the install matrix.
- [ ] **Step 4:** Verify: 11 everywhere, no "seven" residue, no stale hard-coded versions, all badges + links resolve.
- [ ] **Step 5:** Commit on this branch.

---

## Phase 5 — Solo READMEs (×10 remaining; depends on Tasks 3-4)

> vibe-insights done in Task 5. Remaining 10: cartographer, doc, sec, test, thesis-engine, vibe-thesis, keystone, iterate, taker, walk.

### Task 7: Apply the standard to each remaining solo README

For EACH of the 10 repos, run this procedure (subagent-driven: one repo per subagent, sequential or small batches; each on a `chore/readme-standard` branch → merge to that repo's `main`):

**Files:** Modify `<repo>/README.md`.

- [ ] **Step 1:** Apply the standard using the row from the per-plugin data table: banner URL (`<slug>-banner-1500x500.png`), `# Vibe <Name>`, tagline, live badge for `<repo>`, the six sections.
- [ ] **Step 2:** `## What it does` + `## How it works` — preserve the plugin's real content (don't invent features); reshape into the standard sections. Keep mature content (Cart's personas, Doc's stages) under `How it works`.
- [ ] **Step 3:** `## Validated on` — the true value from the data table (Task 1 resolved the unknowns). Omit the line only if "none on record" and Este chose omission.
- [ ] **Step 4:** `## Install` — stable + canary always; npm block ONLY if the row says a CLI ships (confirm the canonical package; flag any `-cli`/non-`-cli` mismatch for the npm sub-project, do not fix here).
- [ ] **Step 5:** `## Part of the Vibe ecosystem` footer + MIT.
- [ ] **Step 6:** Verify: section order, badge renders, banner 200, no hard-coded version, links resolve, no fabricated claims.
- [ ] **Step 7:** Commit on the repo's branch.
- [ ] **Step 8 (checkpoint after the first one — Cart):** Show Este the first solo README (recommend Cart, the richest) before doing the other 9, to confirm the standard handles a content-heavy plugin well.
- [ ] **Step 9:** Merge each to its repo's `main` and push. README-only changes do NOT require a marketplace ref bump.

---

## Phase 6 — Close-out

### Task 8: Family-wide verification

- [ ] **Step 1:** Confirm all 12 READMEs (storefront + 11 solo) follow the standard's section order.
- [ ] **Step 2:** Confirm every solo README has a live badge (no hard-coded version), a banner that resolves, and a true `Validated on` line.
- [ ] **Step 3:** Confirm the storefront lists 11 everywhere with no "seven" residue.
- [ ] **Step 4:** Log the decision (cohesion standard adopted) to the dashboard; note npm + LabHub as the remaining sub-projects.

---

## Self-Review

**Spec coverage:** standard (Task 5/6/7) ✓; storefront 7→11 + live badges (Task 6) ✓; 11 solo (Task 5/7) ✓; banners for all 11 (Task 3-4) ✓; true Validated-on (Task 1, enforced in Task 5/7 step 3) ✓; anti-drift badges (standard + Task 6 step 2) ✓; npm/LabHub fenced (not in any task) ✓; hosting dependency (Task 2) ✓.

**Placeholder scan:** the five `CONFIRM` cells are intentional research targets (Task 1), not plan placeholders — the plan's job is to resolve them, and it forbids fabrication. No "TBD/implement later" steps.

**Consistency:** banner slug, repo name, and badge target use the same `<repo>`/`<slug>` per the data table across Tasks 5-7. Section order identical everywhere.
