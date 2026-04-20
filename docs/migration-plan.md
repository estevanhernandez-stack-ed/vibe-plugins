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

- [ ] **1. [SAFE] Install `git-filter-repo`.** `pip install git-filter-repo` (or `brew install git-filter-repo` on macOS). Verify: `git filter-repo --help` exits 0.
- [ ] **2. [SAFE] Create fresh working copies of `vibe-plugins/` for history extraction.** Two copies: one destined to become `vibe-test/` solo, one destined to become `vibe-sec/` solo. Work from copies so the original monorepo clone is never touched by `filter-repo`. Command pattern: `git clone vibe-plugins /tmp/vibe-test-extract`.
- [ ] **3. [SAFE] Draft the new `marketplace.json`** in `docs/migration-marketplace-draft.json` for review. Don't touch the live `.claude-plugin/marketplace.json` until step 8.

### Solo repo creation — Vibe Test

- [ ] **4. [PAUSE] Extract Vibe Test history.** From the vibe-test-extract working copy: `git filter-repo --path packages/vibe-test --path packages/vibe-test-cli`. Verify commit count is sane (should preserve all 12 build commits + follow-up patch cadence). Creates a small repo with just those two subdirs and their history.
- [ ] **5. [PAUSE] Create GitHub repo `estevanhernandez-stack-ed/vibe-test` via `gh repo create`.** Private or public? Default: public (matches the other solos). Initialize empty (no README — our filter-repo output has one).
- [ ] **6. [PAUSE] First push of extracted Vibe Test history** to the new solo remote: `git remote add origin https://github.com/estevanhernandez-stack-ed/vibe-test.git && git push -u origin main && git push --tags`. This is the first externally-visible destructive step — cannot easily undo.
- [ ] **7. [PAUSE] Update Vibe Test package.json `repository` fields** to point at the new solo (both `@esthernandez/vibe-test` and `@esthernandez/vibe-test-cli`). Bump plugin version to `0.2.4` ("first release from solo repo"). Tag the commit in the solo repo.

### Solo repo creation — Vibe Sec

- [ ] **8. [PAUSE] Repeat steps 4-7 for Vibe Sec.** Target repo: `estevanhernandez-stack-ed/vibe-sec`. Subdirs to filter: `packages/vibe-sec` + `packages/vibe-sec-cli`. Tag commits matching the current npm-published state (vibe-sec-cli@0.1.0, vibe-sec@0.0.1).

### Monorepo pivot

- [ ] **9. [PAUSE] Rewrite `vibe-plugins/.claude-plugin/marketplace.json`** per the draft in step 3. All four plugins use `git-subdir` source; each pins to its stable tag. Delete `packages/vibe-test/`, `packages/vibe-test-cli/`, `packages/vibe-sec/`, `packages/vibe-sec-cli/` from the monorepo (their canonical sources now live in the solos). Keep `packages/core/` (shared npm infra, not a plugin). Commit with message `"Pivot monorepo to aggregated-marketplace model — plugin code now lives in solo repos"`.

### Verification

- [ ] **10. [SAFE then PAUSE] End-to-end verify.**
  - SAFE: `jq` the new marketplace.json, confirm schema validity against the Claude Code marketplace spec
  - SAFE: clone each solo repo fresh into `/tmp/` and confirm it builds (`pnpm install && pnpm build`)
  - PAUSE: open Claude Code's "Add marketplace" dialog, paste `estevanhernandez-stack-ed/vibe-plugins`, verify all four plugins listed and installable. Also test canary channel by pasting each solo-repo URL directly.

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
