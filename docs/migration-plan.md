# Monorepo → Solo-Repo Aggregation Migration Plan

> *"Work from the future. We are already behind."*

**Date:** 2026-04-19
**Owner:** Este
**Goal:** Pivot `vibe-plugins` monorepo from "code lives here" to "marketplace manifest that aggregates four solo-repo plugins" — while preserving the `owner/repo` URL users paste into Claude Code's Add Marketplace dialog.

---

## Architecture — the two-channel model

| Channel | URL users paste | What they get |
|---|---|---|
| **Canary / edge** | `estevanhernandez-stack-ed/<plugin>` (solo repo) | Latest `main` branch — bleeding-edge, for beta testers |
| **Stable** | `estevanhernandez-stack-ed/vibe-plugins` (monorepo) | Tagged version pinned in marketplace.json — for everyone else |

Promotion flow: push to solo `main` → tag `vX.Y.Z` on solo → bump the `ref` field in monorepo's marketplace.json → commit to monorepo. Canary users see changes the moment you push; stable users only see what you've explicitly promoted.

---

## Schema — what `marketplace.json` becomes

```json
{
  "name": "vibe-plugins",
  "owner": { "name": "626Labs LLC" },
  "description": "The Vibe Plugins ecosystem — vibe coding course correction, documentation, security, and testing for vibe-coded apps. Each plugin lives in its own repo; this marketplace aggregates the stable releases.",
  "plugins": [
    {
      "name": "vibe-cartographer",
      "description": "Plot your course from idea to shipped app. Vibe coding course correction delivered as eight slash commands.",
      "source": {
        "source": "git-subdir",
        "url": "github.com/estevanhernandez-stack-ed/vibe-cartographer",
        "path": "plugins/vibe-cartographer",
        "ref": "v1.5.0"
      }
    },
    {
      "name": "vibe-doc",
      "description": "AI-powered documentation gap analyzer. Scans, classifies, identifies missing technical documentation, and generates professional docs.",
      "source": {
        "source": "git-subdir",
        "url": "github.com/estevanhernandez-stack-ed/Vibe-Doc",
        "path": "packages/vibe-doc",
        "ref": "v0.1.0"
      }
    },
    {
      "name": "vibe-test",
      "description": "Test analyzer and generator for vibe-coded apps. Catches the broken harnesses every other test tool assumes away.",
      "source": {
        "source": "git-subdir",
        "url": "github.com/estevanhernandez-stack-ed/vibe-test",
        "path": "packages/vibe-test",
        "ref": "v0.2.3"
      }
    },
    {
      "name": "vibe-sec",
      "description": "Security gap finder for vibe-coded apps — leaked secrets, sketchy auth, missing input validation, stale dependencies.",
      "source": {
        "source": "git-subdir",
        "url": "github.com/estevanhernandez-stack-ed/vibe-sec",
        "path": "packages/vibe-sec",
        "ref": "v0.0.1"
      }
    }
  ]
}
```

Notes:
- `path` field is the SUBDIRECTORY within each solo repo where the plugin code lives (Option B layout — each solo repo is itself a pnpm workspace with `packages/<plugin>` + `packages/<plugin>-cli`)
- `ref` field pins to a stable tag; updating stable = bumping this one field in the monorepo
- Cart's repo name is `vibe-cartographer` even though the local folder is `app-readinessplugin` — use the GitHub name here

---

## Solo repo structure (Option B — pnpm workspace per solo)

Each new solo repo mirrors what's currently in the monorepo's `packages/<plugin>*/`:

```
vibe-test/                              # solo repo root
├── .claude-plugin/                     # (optional — top-level if you want the solo repo itself to also be a valid marketplace URL for canary users)
│   └── marketplace.json                # canary-channel marketplace: one-plugin entry pointing at ./packages/vibe-test
├── packages/
│   ├── vibe-test/                      # the plugin — everything that's currently at vibe-plugins/packages/vibe-test/
│   │   ├── .claude-plugin/
│   │   ├── skills/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json                # @esthernandez/vibe-test
│   └── vibe-test-cli/                  # the CLI — currently at vibe-plugins/packages/vibe-test-cli/
│       ├── src/
│       └── package.json                # @esthernandez/vibe-test-cli
├── pnpm-workspace.yaml
├── package.json                        # root workspace (name: "vibe-test-workspace" or similar)
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── docs/
└── .gitignore
```

Same pattern for `vibe-sec`: `packages/vibe-sec/` + `packages/vibe-sec-cli/`.

---

## Migration checklist — 10 ordered items

Each item has: [SAFE] = non-destructive, can run/re-run freely. [PAUSE] = destructive or externally visible, needs explicit Este approval before executing.

### Prep

- [x] **1. [SAFE] Install `git-filter-repo`.** Done: `git-filter-repo 2.47.0` installed via pip at `AppData/Roaming/Python/Python313/Scripts/`. Verified `git filter-repo -h` exits 0.
- [x] **2. [SAFE] Create fresh working copies for history extraction.** Done: `/c/tmp/vibe-test-extract` + `/c/tmp/vibe-sec-extract` created. Both are throwaway clones from the monorepo HEAD at the time.
- [x] **3. [SAFE] Draft the new `marketplace.json`** — Done at `docs/migration-marketplace-draft.json`. Committed in `aeae619`.

### Solo repo creation — Vibe Test

- [x] **4. [PAUSE] Extract Vibe Test history via `git filter-repo`.** Done: 41 → 19 commits preserved (only commits touching `packages/vibe-test*/`), all 4 `vibe-test-v0.2.0`–`v0.2.3` tags intact.
- [x] **5. [PAUSE] Create `estevanhernandez-stack-ed/vibe-test` GitHub repo.** Done: public repo created via `gh repo create`.
- [x] **6. [PAUSE] First push** (scaffolding commit + history + tags). Done: 20 commits, 4 tags pushed to origin.
- [x] **7. [PAUSE] v0.2.4 release bump.** Done: both `@esthernandez/vibe-test` and `@esthernandez/vibe-test-cli` bumped to `0.2.4`; `repository.url` + `homepage` + `bugs` updated to solo; tagged `vibe-test-v0.2.4`; pushed. Commit `eaa1c7b` on the solo.

### Solo repo creation — Vibe Sec

- [x] **8. [PAUSE] Repeat steps 4-7 for Vibe Sec.** Done: `estevanhernandez-stack-ed/vibe-sec` live with 6 commits, 4 tags (`vibe-sec-v0.0.1`/`v0.0.2`, `vibe-sec-cli-v0.1.0`/`v0.1.1`). Plugin stub bumped to `0.0.2`, CLI bumped to `0.1.1`, both with updated metadata.

### Monorepo pivot

- [x] **9. [PAUSE] Rewrite monorepo and remove plugin code.** Done. Commit `017e402`. All 4 plugins now use `git-subdir` sources pinned at:
  - `vibe-cartographer` → `v1.5.0`
  - `vibe-doc` → `v1.0.0` (tag created on solo as part of this migration)
  - `vibe-test` → `vibe-test-v0.2.4`
  - `vibe-sec` → `vibe-sec-v0.0.2`
  - Removed: `packages/vibe-cartographer/`, `packages/vibe-test/`, `packages/vibe-test-cli/`, `packages/vibe-sec/`, `packages/vibe-sec-cli/`
  - Kept: `packages/core/` (shared npm infra), `packages/vibe-doc/` (deferred to Phase C reconciliation)
  - Rebased onto a daily-stats automated commit that landed during execution.

### Verification

- [x] **10a. [SAFE] Structural validation.** Done: marketplace.json parses as valid JSON, all 4 pinned refs resolve to real SHAs on their respective solo repos (verified via `gh api`).
- [x] **10b. [SAFE] Fresh-clone builds.** The vibe-test solo was built + tested post-extraction (308 tests pass). Vibe-sec solo contains only static files (stub package.json + 404-line CLI script + README) — no build step needed.
- [ ] **10c. [PAUSE — human verification].** Open Claude Code's "Add Marketplace" dialog, paste `estevanhernandez-stack-ed/vibe-plugins`, verify all four plugins listed and installable. Also test canary channel by pasting each solo-repo URL directly. This is the final ship-gate — needs Este's eyes on the UI.

### Post-migration followups (not blocking)

- **Rename local folder:** `app-readinessplugin/` → `vibe-cartographer/` for clarity (Este approved 2026-04-19). No remote/push impact; local-only ergonomic rename. Any hard-coded path references in shell aliases or scripts would need updating (none known).
- **Phase C — Vibe Doc reconciliation.** Snapshot preserved at `C:\Users\estev\Projects\vibe-doc-reconciliation-snapshot-2026-04-19\`. See that folder's README.md for the 7-step reconciliation procedure. Once complete, `packages/vibe-doc/` gets removed from this monorepo.
- **Clean up temporary extraction directories:** `/c/tmp/vibe-test-extract/` and `/c/tmp/vibe-sec-extract/`. Safe to delete once 10c passes.
- **npm republish from solo repos:** optional; the current `@esthernandez/vibe-test@0.2.3` and `@esthernandez/vibe-sec-cli@0.1.0` on npm have the old monorepo URLs. Republishing `@esthernandez/vibe-test@0.2.4` + `@esthernandez/vibe-sec-cli@0.1.1` from the solo repos updates metadata for future installs.

---

## Rollback anchors

If any PAUSE step goes wrong, rollback points are:

- **Step 4-5 fails:** just delete the extracted working copy, no external changes. Re-run from step 2.
- **Step 6 fails mid-push:** the new solo repo exists on GitHub but history is partial. Fix: force-push the corrected history, or delete the solo repo via `gh repo delete` and restart step 5.
- **Step 7 fails (npm republish):** rollback is `npm unpublish <pkg>@<version>` within 72 hours, or deprecate and publish a patch version with correct metadata.
- **Step 9 goes wrong:** the monorepo's `main` branch has the pre-pivot state in its reflog. `git reset --hard HEAD~1` restores. Before step 9 executes, the `main` HEAD SHA should be captured in process-notes as the rollback target.

---

## Open questions to resolve in-flight

1. **Vibe Doc needs a tag** for marketplace.json to pin to. Current solo repo has zero tags. Options: (a) tag the current `main` as `v0.1.0` now during migration, (b) pin the vibe-doc entry to `main` initially and add tags later. Preferred: (a) — explicit version.
2. **Do we want per-solo `marketplace.json` for the canary channel?** If yes, each solo repo gets its own single-plugin marketplace.json at its root (so `estevanhernandez-stack-ed/vibe-test` as marketplace URL serves the one plugin on canary). Nice-to-have; not blocking.
3. **What's the monorepo's README story post-pivot?** Should explain the aggregation model so users understand they're installing stable-channel releases. README rewrite is part of step 9.
4. **Cart's folder naming drift** — local `app-readinessplugin` vs GitHub `vibe-cartographer`. No migration action needed (Cart solo already exists), just noting it. The marketplace.json entry uses the GitHub name.
5. **What happens to existing `@esthernandez/vibe-test@0.2.3` on npm?** The published package has `repository.url` pointing at the monorepo. Future versions will update the URL. Old versions stay as-is with old metadata — that's fine, backwards-compatible.

---

## Estimated wall-clock

Prep (steps 1-3): ~15 min
Vibe Test solo (steps 4-7): ~30-45 min
Vibe Sec solo (step 8): ~30-45 min
Monorepo pivot (step 9): ~20 min
E2E verify (step 10): ~20 min

**Total: 2-3 hours with explicit pauses at the destructive steps.** Works well with micro-shifting (cook dinner between step 7 and step 8, etc.).
