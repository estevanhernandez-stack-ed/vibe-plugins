---
description: "Step 1 of 8 · Welcome, builder profile, persona selection, architecture docs. Start here for any new Vibe Cartographer run."
argument-hint: "(no arguments)"
---

Use the **onboard** skill to start the Vibe Cartographer workflow. Welcomes the builder, checks the unified profile at `~/.claude/profiles/builder.json`, runs the 11-step interview (skipped if builder is returning), picks a persona and mode, captures project goals and architecture docs, and writes `docs/builder-profile.md`.

This is the entry point for the entire 8-command chain:

```text
/onboard → /scope → /prd → /spec → /checklist → /build → /iterate → /reflect
```

Run in a **fresh, empty folder** for your project. All artifacts go in `docs/`.
