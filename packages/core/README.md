# @626labs/plugin-core

Shared library for the Vibe Plugins ecosystem. Common primitives used by Vibe Cartographer, Vibe Doc, Vibe Sec, and Vibe Test.

## Status

**Scaffold only.** The extraction from Vibe Doc happens in Phase 2 of the monorepo build plan. Until then this package is a placeholder so the ecosystem structure reflects the intended end state.

## Planned exports

- **`scanner/`** — File walker, git-scanner, dotfile allowlist, artifact inventory primitives
- **`classifier/`** — Hybrid rules-plus-LLM classification scaffold; each plugin provides its own signal table and prompt
- **`session-logger/`** — Append-only JSONL writer for the Self-Evolving Plugin Framework Level 2 schema
- **`state/`** — Read-merge-write helpers for `.vibe-<plugin>/state.json` files
- **`ci-check/`** — Tier-gated pass/fail pattern used by every plugin's `check` command
- **`profile/`** — Read/write helpers for `~/.claude/profiles/builder.json` with strict namespace isolation

## Extraction plan

Phase 2 of the monorepo migration (see the root README). Vibe Doc 0.5.0 will be refactored to depend on `@626labs/plugin-core@0.1.0`. Vibe Sec and Vibe Test consume the same version once extracted.

## License

MIT
