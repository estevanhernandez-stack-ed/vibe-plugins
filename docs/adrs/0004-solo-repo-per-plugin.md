# 0004 — Solo repo per plugin

## Status

Accepted (2026-04-15)

## Context

626Labs's plugins started life inside a single shared repo. As the
ecosystem grew past two plugins, several pressures accumulated:

- Each plugin had a different release cadence. Cart shipped four
  releases in a single afternoon (2026-04-26: 1.7.0 → 1.7.3); Vibe Sec
  hadn't tagged anything new in months.
- Each plugin had different external consumers. Cart's npm CLI users
  shouldn't see breaking changes when Sec's CLI bumps a major version.
- Tag namespaces collided. `v1.0.0` could mean Cart, Doc, or Test
  depending on which subtree you were tagging — confusing for tooling
  and humans.
- Issue triage didn't scale. Bugs in Vibe Test landed in the same issue
  tracker as docs improvements for Cart.

A single mono-repo would have meant either coordinated releases (slow)
or per-plugin tag prefixes (`vibe-test-v0.2.4` style — workable but
ugly for tooling that expects clean semver tags).

## Decision

**Each plugin lives in its own dedicated solo repo on GitHub.** The
repos are:

| Plugin | Repo |
|---|---|
| Vibe Cartographer | `estevanhernandez-stack-ed/vibe-cartographer` |
| Vibe Doc | `estevanhernandez-stack-ed/Vibe-Doc` |
| Vibe Test | `estevanhernandez-stack-ed/vibe-test` |
| Vibe Sec | `estevanhernandez-stack-ed/vibe-sec` |
| Vibe Thesis | `estevanhernandez-stack-ed/Vibe-Thesis` |
| Thesis Engine | `estevanhernandez-stack-ed/Thesis-Engine` |
| Vibe Keystone | `estevanhernandez-stack-ed/vibe-Keystone` |

Each solo repo carries its own `package.json`, `CHANGELOG.md`, version
line, GitHub releases, npm package (if applicable), tags, issues, and
pull requests. The aggregated `vibe-plugins` marketplace pins each
plugin to a tag from its solo repo via `git-subdir` source entries (see
ADR 0001).

Repo capitalization varies (`Vibe-Doc` vs `vibe-cartographer`) — GitHub
treats both as canonical and redirects mismatched casing. We don't try
to enforce one style retroactively.

## Consequences

**Positive:**
- Independent release cadence per plugin. A four-release-day on Cart
  doesn't ripple into the rest.
- Clean tag namespaces per repo. `v1.0.0` means exactly one thing
  inside its repo.
- Per-repo issue trackers; users file bugs in the right place.
- Per-plugin npm publishes are independent OTP gates, not a single
  monolithic publish.

**Negative:**
- Cross-plugin refactors require coordinating commits across multiple
  repos. We accept this; the alternative (mono-repo) made the common
  case worse for the rare case.
- Setting up a new plugin requires creating a new repo, new GitHub
  release flow, new npm package. We have a template (vibe-cartographer's
  layout) to copy from.
- Local development across multiple plugins simultaneously means
  multiple git clones. Tooling like pnpm workspaces helps but only when
  the work happens in one parent directory.

**Neutral:**
- Some repos use `Title-Case-Hyphens` (Vibe-Doc, Vibe-Thesis,
  Thesis-Engine, vibe-Keystone), others use `lowercase-hyphens`
  (vibe-cartographer, vibe-test, vibe-sec, vibe-plugins). Inconsistent.
  GitHub URL resolution masks the inconsistency for users; we live with
  it.

## Alternatives considered

- **Single mono-repo with all plugins.** Rejected — see Context above.
  Coupled release cadence + tag-namespace collision were the deciding
  factors.
- **Mono-repo with per-plugin tag prefixes (`vibe-test-v0.2.4`).**
  Rejected — workable but inelegant; tooling that auto-discovers latest
  releases needs custom logic to parse prefixed tags.
- **Mono-repo with sub-directory release tracks.** Rejected — added
  complexity without solving issue-triage or external-consumer concerns.

## Notes

- Aggregated marketplace pattern (ADR 0001) is what makes this
  scalable for users — without the marketplace, seven solo repos would
  mean seven install commands.
- See [`docs/migration-plan.md`](../migration-plan.md) for the
  historical migration from the old single-repo layout.
