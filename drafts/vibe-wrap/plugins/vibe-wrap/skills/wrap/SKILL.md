---
name: wrap
description: This skill should be used when the user says `/vibe-wrap` (or `/vibe-wrap:wrap`) and wants a session-end handoff doc that reads the breadcrumb trail sibling vibe plugins already left, surfaces what shipped + what's uncommitted + what's unpushed, and gates commit + push interactively. Reads breadcrumbs, sibling session-logs / friction / wins, git state, and the active decision-log backend. Writes a markdown wrap doc to `docs/session-wraps/<ts>.md` (fallback `.vibe-wrap/wraps/<ts>.md`) and prints inline. Bumper-lanes invariant — every gate defaults to no-action and has a clear skip path. Flags: `--inline-only`, `--bridge`, `--session-window <hours>`.
---

Read `../guide/SKILL.md` for shared behavior (voice rules, bumper-lanes invariant, persona adaptation, friction-trigger contract, namespace isolation, ecosystem-aware composition).

<!-- TODO: Item 8 — body lands later -->
