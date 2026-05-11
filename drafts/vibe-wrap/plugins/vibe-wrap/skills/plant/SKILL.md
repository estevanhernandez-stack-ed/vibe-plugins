---
name: plant
description: Internal SKILL — not a user-invocable slash command. Sibling vibe plugins (or non-vibe tools that opt in) invoke `plant(source, command, phase, outcome=null, payload=null)` at command-start (or any point worth marking) to drop one breadcrumb line into the active session's breadcrumb file. No-op-safe — silent failure if vibe-wrap isn't installed or the session UUID can't be resolved (falls back to `_orphan.jsonl`). Writes one JSONL line to `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`. Forward-compat — unknown payload fields are written verbatim. See `references/breadcrumb-contract.md` for the full schema and contract for sibling plugin authors.
---

<!-- TODO: Item 4 — body lands later -->
