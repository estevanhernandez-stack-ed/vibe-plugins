---
description: "Router — identity, state-awareness, next-step prompt. The bare `/vibe-test` entry point that introduces the plugin and routes you to your next action."
argument-hint: "(no arguments)"
---

Use the **router** skill to handle the bare `/vibe-test` invocation.

Read `skills/router/SKILL.md` and follow it end to end. The router:

1. Resolves plugin version via Pattern #15 (`~/.claude/plugins/installed_plugins.json` → `.claude-plugin/active-path.json` fallback).
2. Detects first-run vs returning-builder (Pattern #16 shaping prereq) via `.vibe-test/state.json` existence.
3. Renders a persona-adapted banner with plugin identity, the 6 subcommands, and a natural-language next-step prompt.
4. Announces any anchored or dynamic complement matches (Pattern #13).
5. Appends session-log sentinel + terminal entries paired by `sessionUUID`.

No scanning. No filesystem writes beyond the session log. Target render: under 10 seconds.

The other six commands — `audit`, `generate`, `fix`, `coverage`, `gate`, `posture` — have their own `.claude-plugin/commands/<name>.md` files and live SKILLs under `skills/<name>/SKILL.md`.
