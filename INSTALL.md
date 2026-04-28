# Installing the Vibe Plugins

This file tells you exactly how to install the 626Labs Vibe Plugins ecosystem — the seven Claude Code plugins aggregated by this marketplace. The README at the root is the *what* and *why*; this file is the *how*.

## Who this is for

- **End users** who want one or more Vibe plugins (Vibe Cartographer, Vibe Doc, Vibe Test, Vibe Sec, Vibe Thesis, Thesis Engine, Vibe Keystone) running inside Claude Desktop, Cowork, or Claude Code CLI.
- **CI / automation pipelines** that want the secret-leak scanner or test-gate CLI without going through the plugin host.
- **AI agents** consuming this doc to advise the user on the right install path. (You can stop reading this paragraph; the rest is the substance.)

## Prerequisites

| Path | What you need |
|---|---|
| Claude Desktop / Cowork (UI) | A current Claude Desktop or Cowork install with the **Personal plugins** panel. |
| Claude Code CLI | Claude Code installed and authenticated (`claude --version`). |
| Solo-repo canary | A current Claude Code or Claude Desktop install. |
| npm CLI packages | Node.js 18+ and npm or pnpm on `PATH`. |

Vibe Cartographer is also available directly from **Anthropic's official marketplace** — no setup required beyond updating Claude Code. The other six plugins live in this marketplace and the per-plugin solo repos.

## Which path do I want?

```
Are you a Claude Desktop / Cowork user?
├─ Yes → Path A (UI) — easiest, supports auto-sync.
└─ No  → Are you in Claude Code CLI / IDE?
         ├─ Yes → Path B (CLI) — paste-and-go.
         └─ No  → Are you running CI / build pipelines?
                  └─ Yes → Path D (npm CLI packages) — only available
                           for vibe-test and vibe-sec. The others have
                           no CLI surface.
```

If you're an existing user of any one plugin and want to track the bleeding edge of that plugin only (faster feedback, occasional breakage), use **Path C (solo-repo canary)** for that specific plugin.

## Path A — Claude Desktop / Cowork (UI)

1. Open Claude Desktop or Cowork.
2. **Personal plugins** panel → **+** → **Add marketplace**.
3. Paste: `estevanhernandez-stack-ed/vibe-plugins`
4. Click **Sync**.
5. Install whichever plugins you want from the panel.

Auto-update is on by default for marketplaces added this way — when we promote a new plugin version, you pick it up on next launch (or click **Sync** to force-refresh).

## Path B — Claude Code CLI / IDE terminal

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install thesis-engine@vibe-plugins
/plugin install vibe-cartographer@vibe-plugins
/plugin install vibe-doc@vibe-plugins
/plugin install vibe-keystone@vibe-plugins
/plugin install vibe-sec@vibe-plugins
/plugin install vibe-test@vibe-plugins
/plugin install vibe-thesis@vibe-plugins
```

Install only the plugins you want; you don't need all seven. After install, run `/reload-plugins` if the slash commands don't appear immediately.

To configure the marketplace for auto-update across sessions, add an entry to your `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "vibe-plugins": {
      "source": {
        "source": "github",
        "repo": "estevanhernandez-stack-ed/vibe-plugins"
      },
      "autoUpdate": true
    }
  }
}
```

## Path C — Solo-repo canary (edge / beta testers)

Each plugin lives in its own solo repo. Tracking a solo repo's `main` branch gives you edge work the moment it's pushed — faster feedback, occasional breakage. Use this when you're actively iterating on a plugin or want pre-release access.

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-cartographer
/plugin install vibe-cartographer@vibe-cartographer
```

Solo-repo URLs:

| Plugin | Repo |
|---|---|
| Vibe Cartographer | `estevanhernandez-stack-ed/vibe-cartographer` |
| Vibe Doc | `estevanhernandez-stack-ed/Vibe-Doc` |
| Vibe Test | `estevanhernandez-stack-ed/vibe-test` |
| Vibe Sec | `estevanhernandez-stack-ed/vibe-sec` |
| Vibe Thesis | `estevanhernandez-stack-ed/Vibe-Thesis` |
| Thesis Engine | `estevanhernandez-stack-ed/Thesis-Engine` |
| Vibe Keystone | `estevanhernandez-stack-ed/vibe-Keystone` |

Repository name capitalization varies; GitHub treats both forms as canonical. Use either.

## Path D — npm CLI packages (CI pipelines)

Two plugins ship standalone CLI packages designed for CI / build pipelines where the plugin host isn't available:

```bash
npm install -g @esthernandez/vibe-test-cli @esthernandez/vibe-sec-cli
```

Use them:

```bash
# Honest-denominator test coverage gate (exit 0 / 1 / 2)
vibe-test audit --cwd .
vibe-test gate --ci

# Secret-leak scan
vibe-sec scan .
```

Vibe Cartographer is also published on npm as `@esthernandez/vibe-cartographer`, but the global install is for use cases where you want the SKILLs available outside the plugin host. Most users should prefer the plugin marketplace install paths above.

## Updating

- **Marketplace installs** with `autoUpdate: true` refresh on next launch / sync. To force-update: in the UI click **Sync**; in CLI run `/plugin marketplace sync`.
- **Pinned tags** (e.g., `vibe-cartographer@v1.7.3`) won't auto-update — you'd see new versions when the aggregated marketplace's `marketplace.json` bumps the `ref:` field, then sync.
- **npm CLI packages** never auto-update. Run `npm update -g @esthernandez/vibe-test-cli` (etc.) on your own cadence.

## Troubleshooting

### "Marketplace file not found" or "Invalid git URL"

Two known causes:
- **Stale local cache.** Remove and re-add: `/plugin marketplace remove vibe-plugins` then `/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins`.
- **Bare hostname in `source.url`.** Marketplaces require `https://github.com/owner/repo`, not `github.com/owner/repo`. The aggregated `vibe-plugins` marketplace uses GitHub shorthand in the manifest so this shouldn't bite you, but if you maintain your own marketplace.json, watch for it.

### Plugin installs but slash commands don't appear

Run `/reload-plugins` (Claude Code CLI). If still missing, restart the host. Newly installed plugins do not auto-discover until reload.

### npm publish gets stuck on OTP

The Vibe CLI packages use 2FA. If `npm publish` errors with `EOTP`, pass the code: `npm publish --otp=NNNNNN`.

### Plugin loaded but skill listing missing the new commands

Plugin host uses a per-skill description budget. If the listing is at capacity, increase `skillListingMaxDescChars` and/or `skillListingBudgetFraction` in `~/.claude/settings.json`. Default budget is roughly 1% of context window per turn.

### Conflicting standalone skill and plugin install

If you previously installed a plugin's SKILL.md to `~/.claude/skills/<name>/` (standalone) and then installed the same plugin via the marketplace, the plugin version takes precedence but the standalone copy is dead weight. Remove it: `rm -rf ~/.claude/skills/<name>/` and clean the corresponding `Edit(~/.claude/skills/<name>/**)` entry from your settings.

## After install — where to find each plugin's docs

| Plugin | Quickstart |
|---|---|
| Vibe Cartographer | Start with `/onboard`. README: [`vibe-cartographer`](https://github.com/estevanhernandez-stack-ed/vibe-cartographer#readme). |
| Vibe Doc | Start with `/vibe-doc:scan`. README: [`Vibe-Doc`](https://github.com/estevanhernandez-stack-ed/Vibe-Doc#readme). |
| Vibe Test | Start with `/vibe-test`. README: [`vibe-test`](https://github.com/estevanhernandez-stack-ed/vibe-test#readme). |
| Vibe Sec | Start with `/vibe-sec` (plugin in development; CLI shipping now). README: [`vibe-sec`](https://github.com/estevanhernandez-stack-ed/vibe-sec#readme). |
| Vibe Thesis | Say "scaffold a vibe thesis project for me." README: [`Vibe-Thesis`](https://github.com/estevanhernandez-stack-ed/Vibe-Thesis#readme). |
| Thesis Engine | Start with `/thesis-engine:discover`. README: [`Thesis-Engine`](https://github.com/estevanhernandez-stack-ed/Thesis-Engine#readme). |
| Vibe Keystone | Say "set up CLAUDE.md for this repo" or `/keystone`. README: [`vibe-Keystone`](https://github.com/estevanhernandez-stack-ed/vibe-Keystone#readme). |

## Reporting install issues

If install fails on a path this doc doesn't cover, open an issue at [`vibe-plugins/issues`](https://github.com/estevanhernandez-stack-ed/vibe-plugins/issues) with the path you tried, the exact command, and the error. Include `claude --version` for CLI issues.

## License

All seven plugins are MIT-licensed. See each repo's `LICENSE` file.
