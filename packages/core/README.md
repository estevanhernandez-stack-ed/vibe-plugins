# @626labs/plugin-core

Shared infrastructure for the 626Labs Vibe Plugins ecosystem. Common primitives used by Vibe Cartographer, Vibe Doc, Vibe Sec, and Vibe Test.

## Status

**v0.0.1 — interface skeleton.** The package exports typed interfaces and stub implementations for every planned module. Each stub throws a clear "not yet implemented" error pointing at Phase 2 of the monorepo migration. This means downstream packages can already start importing from `@626labs/plugin-core` and TypeScript will type-check correctly; runtime calls will fail until implementations land.

## Modules

Each module is independently importable via subpath imports:

```ts
import { scan, normalizePath } from '@626labs/plugin-core/scanner';
import { classify } from '@626labs/plugin-core/classifier';
import { append } from '@626labs/plugin-core/session-logger';
import { read, write, mergeAndWrite } from '@626labs/plugin-core/state';
import { runCheck } from '@626labs/plugin-core/ci-check';
import { readPluginNamespace, writePluginNamespace } from '@626labs/plugin-core/profile';
import { detectComplements, formatAnnouncement, buildSessionLogField } from '@626labs/plugin-core/composition';
```

| Module | Purpose | Reference impl |
|--------|---------|----------------|
| `scanner` | File walker, git scanner, dotfile allowlist, artifact inventory | `vibe-doc/src/scanner/` |
| `classifier` | Hybrid rules + LLM classification scaffold; each plugin supplies its own signal table | `vibe-doc/src/classifier/` |
| `session-logger` | Append-only JSONL writer for Self-Evolving Plugin Framework Level 2 | `vibe-cartographer/skills/session-logger/SKILL.md` (canonical schema) |
| `state` | Read-merge-write helpers for `.vibe-<plugin>/state.json` files | `vibe-doc/src/state/` |
| `ci-check` | Tier-gated pass/fail pattern used by every plugin's `check` command | `vibe-doc/src/checker/` |
| `profile` | Read/write helpers for `~/.claude/profiles/builder.json` with strict namespace isolation. Implements Pattern #11 (Shared User Profile Bus) | `vibe-cartographer/skills/onboard/SKILL.md` (canonical write logic) |
| `composition` | Ecosystem-Aware Composition (Pattern #13) — detect complementary skills, format deferral announcements, build session-log fields | `vibe-cartographer/skills/guide/SKILL.md` (canonical complement table format) |

## Phase 2 — Extraction Plan

Phase 2 of the monorepo migration extracts each module's reference implementation from its current home into this package. Order:

1. **`scanner`** first — it has the cleanest existing implementation in Vibe Doc and is the foundation everything else builds on. Vibe Doc 0.6.0 will refactor to depend on `@626labs/plugin-core@0.1.0`.
2. **`state`** — small, low-risk, used by every plugin.
3. **`session-logger`** — schema is already canonical; just need the write helpers.
4. **`profile`** — ownership rules are the hardest part; getting them centralized prevents future drift.
5. **`classifier`** — the trickiest extraction since Vibe Doc has plugin-specific assumptions baked in. Will require a refactor pass to make signal tables genuinely pluggable.
6. **`ci-check`** — straightforward generalization once the others are in place.
7. **`composition`** — currently lives in guide SKILLs as instruction text; this module gives plugins programmatic access for logging and detection.

## Privacy and ownership invariants

Every module enforces the Self-Evolving Plugin Framework's invariants:

- Plugins read shared profile fields but write only to their own `plugins.<name>` namespace.
- Session logs are append-only, schema-versioned, no PII.
- The composition module reads only what's already in the agent's runtime context — never enumerates the user's filesystem.
- State writes are atomic (read-merge-write) so concurrent plugins can't stomp each other.

## Versioning

`@626labs/plugin-core` follows semver. Plugins pin to a major version (`^0.x.x`) and update in lockstep on minor bumps. Breaking changes are major-version bumps with migration notes in this README.

## License

MIT
