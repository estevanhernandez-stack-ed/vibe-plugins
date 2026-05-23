---
name: evolve-wrap
description: This skill should be used when the user says `/vibe-wrap:evolve-wrap` and wants vibe-wrap to reflect on its own past sessions and propose plugin improvements to itself. Pattern #1 self-evolution loop. Reads vibe-wrap's session log + friction log + last 30 days of wrap docs, weights findings, and writes proposed SKILL / config / template edits to `proposed-changes.md` in the plugin source. **Never auto-applies.** Named `evolve-wrap` from day one (NOT `evolve`) — first marketplace plugin under the new `evolve-<short>` convention. L3 self-evolution; this command improves vibe-wrap itself, not the user's app.
---

Read [`../guide/SKILL.md`](../guide/SKILL.md) for shared behavior (voice rules, persona adaptation, friction-trigger contract, namespace isolation).

# evolve-wrap — vibe-wrap reflects on itself

Pattern #1 self-evolution. Read vibe-wrap's own session log, friction log, and recent wrap docs; surface the patterns that actually show up in the data; and write a `proposed-changes.md` naming concrete improvements. **Never auto-applies.** This command improves vibe-wrap itself — not the user's app.

Named `evolve-wrap` from day one, not `evolve` — the first marketplace plugin under the `evolve-<short>` convention. The three sibling plugins with bare `evolve` rename in their next earned cycle (tracked in `drafts/_pending-renames.md`). Do not rename this one to match them; they move toward this name, not the reverse.

## Before you start

- **Session logging.** Call `session-logger.start("evolve-wrap", <cwd>)` at command start and `session-logger.end(<entry>)` at command end per [`../session-logger/SKILL.md`](../session-logger/SKILL.md).
- **Empty-state guard.** `evolve-wrap` needs at least one prior wrap session to read. If there's no session-log data and no friction data, surface the empty-state message — `No vibe-wrap sessions to reflect on yet. Run /vibe-wrap a few times first.` — and exit cleanly.
- **Read-only against everything except the proposal file.** This command reads state and writes exactly one artifact: `proposed-changes.md`. It edits no SKILL bodies, no scripts, no config.

## What it reads

All under vibe-wrap's own namespace (Pattern #11 — never a sibling's):

| Source | Path | Used for |
|---|---|---|
| Session log | `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl` | Outcome streaks, complements invoked, gate-acceptance rates. |
| Friction log | `~/.claude/plugins/data/vibe-wrap/friction.jsonl` | Recurring `friction_type` clusters, quoted symptoms. |
| Wrap docs | `<repo>/docs/session-wraps/*.md` (and `.vibe-wrap/wraps/*.md`) from the last 30 days | Recurring shapes — sections that are always empty, gates always declined, secret-pattern near-misses. |

Window: last 30 days by default. v0.1.0 reads and clusters; the deeper L3 pattern-weighting that Cart's `evolve` does (confidence decay, calibration-aware scoring) lands in v0.2.

## What it writes

One file: `proposed-changes.md` in the plugin source (solo repo: alongside the plugin; in the draft: under the plugin tree). Shape locked in [`references/proposed-changes-template.md`](references/proposed-changes-template.md). Four sections:

1. **Observed patterns** — evidence-first. Counts, paths, quoted friction symptoms. A pattern seen once is noise; hold it.
2. **Proposed SKILL edits** — concrete file + change + the pattern it answers + confidence. High-confidence = seen 3+ times.
3. **Proposed config changes** — thresholds, defaults, schema. Name the downstream ripple before proposing.
4. **Deferred — what didn't make the cut** — patterns held back, with reasons. Keeps the next cycle from re-litigating.

## The contract

- **Never auto-applies.** Output is a proposal. The user reviews and applies edits one at a time with a `[y/n]` per item.
- **Evidence over speculation.** Every proposed edit cites the pattern it answers. If the data is thin, say so — don't invent patterns to fill the template.
- **No sibling writes.** Reads vibe-wrap's own state only. The proposal can suggest edits to vibe-wrap's files; it never touches another plugin.

## Handoff

Close with: `Review proposed changes at <path>. Apply individually with [y/n] per item.`

## Reference

- [`references/proposed-changes-template.md`](references/proposed-changes-template.md) — the output shape.
- [`../session-logger/SKILL.md`](../session-logger/SKILL.md) — the session log this reads.
- [`../friction-logger/SKILL.md`](../friction-logger/SKILL.md) — the friction log this reads.
- [`../guide/SKILL.md`](../guide/SKILL.md) — shared behavior, voice, persona adaptation.
- Self-Evolving Plugin Framework Pattern #1 — [`vibe-cartographer/docs/self-evolving-plugins-framework.md`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md).
