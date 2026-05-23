# vibe-wrap — solo-repo migration readiness

> **Status:** staged, ready for the human-driven migration checkpoint.
> **DO NOT auto-execute any command in this file.** The agent that built
> vibe-wrap does NOT create the solo repo, does NOT tag, does NOT push, does
> NOT edit `marketplace.json`. Promotion is a deliberate act. This doc is the
> copy-pasteable runbook the user runs when ready.

The plugin is complete and validated under `drafts/vibe-wrap/plugins/vibe-wrap/`.
Items 1-11 of the build checklist are done. What follows is the migration path.

## Pre-flight (verify before migrating)

```bash
# From the vibe-plugins repo root.
# 1. plugin.json parses.
python -c "import json; json.load(open('drafts/vibe-wrap/plugins/vibe-wrap/.claude-plugin/plugin.json')); print('plugin.json OK')"

# 2. Stdlib-only imports across all scripts (should print nothing but stdlib).
grep -rhE "^(import|from) " drafts/vibe-wrap/plugins/vibe-wrap --include="*.py" | sort -u

# 3. No real secret literals (should match only pattern strings in docs).
grep -riE "(api[_-]?key|secret|token|password)" drafts/vibe-wrap/plugins/vibe-wrap
```

## Step 1 — Create the solo repo

The plugin source lives at `plugins/vibe-wrap/` inside the solo repo (mirrors
the family's solo-repo layout). Move the staged tree there first, then:

```bash
# Create the solo repo from the staged plugin tree. Run from a clean checkout
# whose plugins/vibe-wrap/ matches drafts/vibe-wrap/plugins/vibe-wrap/.
gh repo create estevanhernandez-stack-ed/vibe-wrap \
  --public \
  --description "Session wrap-up that reads the breadcrumb trail your toolkit already left — surfaces what shipped, what's uncommitted, what's unpushed, and gates commit + push interactively." \
  --source=. \
  --remote=origin \
  --push
```

Notes:
- `--source=.` assumes you run this from the new solo-repo root with the
  plugin tree already at `plugins/vibe-wrap/` and a CLAUDE.md / README at root.
- Tag scheme is `vX.Y.Z` (plain) — NOT the `<plugin>-vX.Y.Z` form Test/Sec
  inherited from filter-repo extraction. vibe-wrap follows Cart / Doc /
  Thesis-Engine / Vibe-Thesis / Taker.

## Step 2 — Tag the first stable release

```bash
git tag v0.1.0
git push --tags
```

The tag is what `marketplace.json` will pin. Until this tag is live, stable
users see nothing — they stay on canary (the solo repo's `main`).

## Step 3 — Promote to the marketplace (the one-line ref bump)

Add the vibe-wrap entry to `.claude-plugin/marketplace.json` in the
`vibe-plugins` repo. The entry to add (matches the family's `git-subdir`
shape):

```json
{
  "name": "vibe-wrap",
  "description": "Session wrap-up that reads the breadcrumb trail your toolkit already left — not a cold reconstruction. Surfaces what shipped, what's uncommitted, and what's unpushed, then gates commit + push interactively. Reads sibling vibe-plugin session-logs / friction / wins, git state, and a pluggable decision log (Markdown / JSONL / 626Labs MCP / disabled). Bumper-lanes invariant — every gate defaults to no-action.",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/estevanhernandez-stack-ed/vibe-wrap",
    "path": "plugins/vibe-wrap",
    "ref": "v0.1.0"
  }
}
```

Then commit + push the marketplace:

```bash
# From the vibe-plugins repo root, after editing marketplace.json.
git add .claude-plugin/marketplace.json
git commit -m "feat(marketplace): add vibe-wrap v0.1.0 — the 11th plugin"
git push
```

Stable users pick up vibe-wrap on their next `/plugin marketplace sync`.

## Step 4 — Downstream doc updates (after the ref bump)

When vibe-wrap lands in `marketplace.json`, these downstream files reference
the roster and must update:

- `README.md` (vibe-plugins) — the plugin table + the per-platform install
  command list (currently lists seven; bumps to eleven once Taker, Walk, and
  Wrap are all in).
- `CLAUDE.md` (vibe-plugins) — the "plugins" convenience-mirror table + the
  roster count.

`.claude-plugin/marketplace.json` is the source of truth; these are downstream
mirrors. Update them in the same PR as the ref bump or immediately after.

## Step 5 — Retire the draft

After the solo repo exists and the marketplace pins `v0.1.0`, the
`drafts/vibe-wrap/` tree is historical. Leave it or remove it per the
marketplace's draft-retirement convention — but do NOT remove it before the
solo repo is confirmed live and the tag resolves:

```bash
gh api repos/estevanhernandez-stack-ed/vibe-wrap/git/refs/tags/v0.1.0
```

## What's explicitly NOT done in the build cycle

Per the PRD non-goals and the build handoff:
- No solo repo created.
- No tag pushed.
- No `marketplace.json` edit.
- No `gh` / migration command executed.

All of the above is the human's call at the migration checkpoint.
