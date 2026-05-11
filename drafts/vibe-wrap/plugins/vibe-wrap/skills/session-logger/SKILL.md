---
name: session-logger
description: Internal SKILL — not a slash command. Two-phase append-only session log for vibe-wrap's OWN sessions: a sentinel entry at command start (`outcome=in_progress`) and a terminal entry at command end, paired by sessionUUID. Distinct from breadcrumb capture — this is vibe-wrap's self-evolution instrumentation (Pattern #2), not the cross-plugin trail. Storage: `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`. Pattern #11 namespace isolation — writes ONLY inside vibe-wrap's data dir. Invoked by every vibe-wrap command at start and end.
---

Read `../guide/SKILL.md` for shared behavior (voice rules, namespace isolation, atomic-append discipline).

<!-- TODO: Item 3 — body lands later -->
