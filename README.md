# Vibe Plugins

**The 626Labs Vibe Plugins ecosystem — spec-driven development, documentation, security, and testing for vibe-coded apps.**

Each plugin is independently versioned and published to npm, but they share a common architecture: classification-driven scanning, tiered requirements proportional to deployment context, and the Self-Evolving Plugin Framework (persistent profile, session memory, reflective evolution).

## Plugins in this monorepo

| Plugin | Status | Purpose |
|--------|--------|---------|
| [**vibe-sec**](./packages/vibe-sec/) | 0.0.1 — framework drafted | Security scanning and fix generation for the predictable gaps vibe-coded apps ship with |
| [**vibe-test**](./packages/vibe-test/) | 0.0.1 — framework drafted | Test analysis and generation, layered from smoke tests to integration, proportional to app maturity |
| **core** | scaffold | Shared library — scanner, classifier, session logger, state management |

## Plugins living in their own repos (for now)

| Plugin | Repo | Status |
|--------|------|--------|
| [vibe-cartographer](https://github.com/estevanhernandez-stack-ed/vibe-cartographer) | Separate repo | 1.3.0 — shipped |
| [vibe-doc](https://github.com/estevanhernandez-stack-ed/Vibe-Doc) | Separate repo | 0.4.0 — shipped |

Both will eventually migrate into this monorepo once the shared core library is stable.

## Install

### Claude Desktop — Add marketplace

1. Personal plugins → + → Add marketplace
2. Enter: `estevanhernandez-stack-ed/vibe-plugins`
3. Click Sync
4. Install whichever Vibe plugins you want individually

### Claude Code CLI

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install vibe-sec@vibe-plugins
/plugin install vibe-test@vibe-plugins
```

## The "Vibe" thesis

Vibe-coded applications — apps prototyped primarily with AI assistance — have predictable, patterned weaknesses. Each Vibe plugin closes one category of those gaps:

- **Vibe Cartographer** — plot the course from idea to shipped app (spec-driven workflow)
- **Vibe Doc** — close the documentation vacuum (ADRs, runbooks, threat models, etc.)
- **Vibe Sec** — close the security vacuum (secrets, auth, input validation, dependencies)
- **Vibe Test** — close the testing vacuum (smoke → behavioral → edge → integration)

Each plugin knows its scope. None pretends to replace specialist tools or professional review. Together they're the baseline hygiene kit for AI-assisted development in 2026.

## Architecture: classification-driven, tier-appropriate

Every plugin in this ecosystem classifies the target app (type, deployment context, risk profile) and measures against a tier-appropriate bar — not an absolute bar. Prototypes get prototype-level scrutiny. Regulated apps get regulated-level scrutiny. The plugin tells you what's missing for *your situation*, not for a theoretical ideal.

## Self-Evolving Plugin Framework

All plugins adopt the framework documented at [vibe-cartographer/docs/self-evolving-plugins-framework.md](https://github.com/estevanhernandez-stack-ed/vibe-cartographer/blob/main/docs/self-evolving-plugins-framework.md):

- **Level 1** — Persistent builder profile at `~/.claude/profiles/builder.json`
- **Level 2** — Session memory at `~/.claude/plugins/data/<plugin>/sessions/*.jsonl`
- **Level 3** — Reflective evolution (the plugin reads its own session logs and proposes SKILL improvements)

New Vibe plugins ship with Level 2 from day 1.

## Credits

Built by [626Labs LLC](https://626labs.dev) — Fort Worth, TX.

## License

MIT

## Ecosystem stats

Daily npm download counts for every tracked package are collected by [`scripts/npm-stats.py`](./scripts/npm-stats.py) and committed to [`data/stats/`](./data/stats/) by the `npm download stats` workflow at 14:00 UTC daily. The append-only [`history.jsonl`](./data/stats/history.jsonl) is the data source for the eventual 626Labs Dashboard widget; `data/stats/YYYY-MM-DD.json` holds the latest snapshot for each day.
