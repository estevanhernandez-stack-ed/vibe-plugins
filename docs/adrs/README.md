# Architecture Decision Records (ADRs)

Load-bearing architectural decisions for the 626Labs Vibe Plugins
ecosystem. Each ADR is a short, dated record of a decision and the
context that forced it — written so future-Este (or future agents) can
tell *exactly* what was chosen and why, without re-deriving the
reasoning from scratch.

## Format

Each ADR follows the [Michael Nygard][nygard] template, with one small
extension (`Notes` for evidence pointers):

- **Status** — Proposed / Accepted / Superseded / Deprecated, plus date.
- **Context** — the situation that forced a decision.
- **Decision** — what we chose, in active voice.
- **Consequences** — what changes as a result, including the
  load-bearing trade-off.
- **Alternatives considered** — what was on the table, why each was
  ruled out.
- **Notes** — pointers to commits, issues, related ADRs.

[nygard]: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

The blank template is at [`template.md`](./template.md).

## Index

| ADR | Title | Status |
|---|---|---|
| [`0001`](./0001-aggregated-marketplace-pattern.md) | Aggregated marketplace pattern | Accepted |
| [`0002`](./0002-knowledge-and-structural-foundations.md) | Knowledge and structural foundations, process pillars on top | Accepted |
| [`0003`](./0003-no-telemetry.md) | No telemetry in any 626Labs plugin or app | Accepted |
| [`0004`](./0004-solo-repo-per-plugin.md) | Solo repo per plugin | Accepted |

## When to write an ADR

Write an ADR when a decision crosses any of these thresholds:

- Architectural — affects how the ecosystem is structured.
- Cross-cutting — touches multiple plugins or sets a precedent for
  future plugins.
- Hard to reverse — once committed, undoing it would require a real
  migration.
- Counter-intuitive — the decision surprises a reader who hasn't seen
  the context.
- Stakeholder-facing — Anthropic submission, npm publish strategy,
  public messaging.

If the decision is small, fast, or local to one file, a commit message
or `process-notes.md` entry is enough.

## How to add an ADR

1. Copy [`template.md`](./template.md) to a new file: `NNNN-title.md`,
   incrementing `NNNN` from the current highest.
2. Fill in the sections.
3. Update the index above.
4. Commit. ADR commits should be small and isolated; resist the urge to
   bundle implementation work into the same commit.

## Why ADRs in this repo

ADRs at the *ecosystem* level live here because the decisions cut
across multiple solo repos. Plugin-specific decisions belong in each
plugin's own `docs/adrs/` (or equivalent) — not duplicated here.
