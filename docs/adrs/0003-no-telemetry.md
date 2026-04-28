# 0003 — No telemetry in any 626Labs plugin or app

## Status

Accepted (2026-04-26)

## Context

Question recurs: how do we count adopters and measure impact for the
plugins? Standard answers in the AI-tooling space are first-run pings,
opt-in anonymous usage stats, install counters, A/B testing
infrastructure — anything where the tool reports back to a server.

Each of those would give us cleaner numbers than what we have today
(npm download counts, GitHub stars, marketplace cache fetches, Discord
mentions, issues opened). All of those are noisy and undercount unique
adopters.

The trade is real — but so is the cost. Users in the AI / Claude Code
plugin space are already wary of plugins that phone home. Being
telemetry-free is itself a competitive feature, especially when the
plugins read user files and execute commands inside their Claude Code
sessions.

## Decision

**No telemetry of any kind in any 626Labs plugin or app.** This includes:

- No first-run pings.
- No opt-in anonymous usage stats.
- No install counters that report back to 626Labs infra.
- No A/B testing infrastructure.
- No remote configuration.
- No phone-home of any kind, with or without user consent.

Adopter detection relies on **qualitative signals only**: GitHub
issues, discussions, stars, fork counts, Discord activity, npm download
counts (with their known noise), GitHub Insights → Traffic for repo
views, marketplace cache fetches if instrumented at the marketplace
layer.

Sister projects (Vibe Doc, Vibe Test, Vibe Sec, Vibe Thesis, Thesis
Engine, Vibe Keystone, RTClickPng, etc.) inherit this rule unless a
specific project explicitly scopes it down with documented justification.

Crash reporting is the gray zone. If it ever comes up, it must be
explicitly discussed and a separate decision recorded — not classified
silently as "different from telemetry."

## Consequences

**Positive:**
- Trust signal in marketing and submission materials. The privacy
  policy (`PRIVACY.md` in each repo) reads cleanly: "no telemetry, no
  analytics, no third-party sharing."
- Plugin code is simpler — no telemetry SDK, no consent prompt, no
  opt-out flow, no PII handling.
- Submission to Anthropic's official marketplace is easier — fewer
  questions about data handling, simpler review.

**Negative:**
- Adopter counts are blurry. The signal that's available (download
  counts, issues, stars) under-counts real users. Decisions like
  "should we keep working on Plugin X?" lean on qualitative signal +
  the author's own usage rather than usage data.
- Bug detection is reactive — we hear about bugs when users open
  issues, not when telemetry would have caught a 500-error spike.

**Neutral:**
- `npm install` traffic still hits npm's public registry, which counts
  installs centrally. That's not 626Labs telemetry — it's npm's. Same
  category as `git clone` hitting GitHub.

## Alternatives considered

- **Opt-in anonymous telemetry.** Rejected — even with consent, it
  degrades the trust signal. Users who would opt in are not the users
  the privacy story is for.
- **Telemetry on CLI packages but not on plugins.** Rejected —
  inconsistent surface, hard to explain. Better one rule across the
  ecosystem.
- **Crash reporting only.** Deferred — gray zone. If it becomes
  necessary, requires its own ADR.

## Notes

- Stated as a principle by the user on 2026-04-26 during a conversation
  about adopter-detection strategy. Saved to durable feedback memory at
  `~/.claude/projects/c--Users-estev-Projects-vibe-plugins/memory/feedback_no_telemetry.md`.
- See [`PRIVACY.md`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/PRIVACY.md)
  in `vibe-cartographer` for the user-facing version of this commitment.
  Sibling repos will follow the same template.
