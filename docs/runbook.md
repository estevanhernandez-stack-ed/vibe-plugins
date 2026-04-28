# Runbook — Vibe Plugins ecosystem

Operational guide from the *user / builder's* perspective. The 626Labs Vibe Plugins ecosystem isn't a service you operate — it's a set of plugins that *learn about you over time*. This runbook covers how that learning works, where it lives, what survives various lifecycle events, and how to recover when something goes sideways.

**Companion docs:**
- [`docs/data-model.md`](./data-model.md) — catalogs every piece of persistent state referenced here.
- [`docs/threat-model.md`](./threat-model.md) — risks against the state and how to mitigate them.

## The evolution model

Every Vibe plugin keeps a record of how you've used it. That record shapes future runs.

There are three layers:

1. **Persistent profile (L1)** — your identity, preferences, persona, project history. Cross-plugin: every 626Labs plugin reads the same file. Updated by `/onboard` and confirmed during decay-check passes.
2. **Session memory (L2)** — what each command did, when, and how it went. Per-plugin. Append-only.
3. **Per-project artifacts (L3)** — the docs and notes created during a Cart cycle (or sibling-plugin cycle). Live with the project; commit to the project's repo.

When you run a plugin command, it reads from all three layers, does its work, and writes back to whichever layers apply. **The plugin gets sharper at working with you over time.**

This means: the plugin you have today is *not* the plugin you had two weeks ago, even if you haven't run `npm update` or `/plugin marketplace sync`. The skill instructions might be unchanged, but the *context* the agent runs against has accumulated.

## What survives a plugin update

When you update a plugin (via `/plugin marketplace sync`, an `npm install -g`, or installing a newer pinned version):

| What | Survives update? | Why |
|---|---|---|
| Your unified builder profile (L1) | ✅ Yes | Lives at `~/.claude/profiles/builder.json`, outside any plugin's install path. |
| Your session logs (L2) | ✅ Yes | Live at `~/.claude/plugins/data/<plugin>/`, also outside the plugin's install path. |
| Your friction log (L2) | ✅ Yes | Same. |
| Per-project artifacts (L3) | ✅ Yes | Live in the project's git repo, not in the plugin. |
| **The skill instructions themselves** | ❌ Replaced | The new version's `SKILL.md` files overwrite the old ones in the plugin cache. This is the point of an update. |
| **Schema migrations** | ⚠️ Sometimes | If the new plugin version changes the schema (e.g., adds a `_meta` block), the `/onboard` decay check on the next run usually handles the migration silently. Vibe Cartographer 1.5.0 → 1.7.x is an example — `_meta` fresh-stamp migration runs automatically. |

So your *learned context* persists across updates. Only the agent's *instructions* (the SKILL prose) get refreshed. This is the design — the plugin can ship better instructions without throwing away what it knows about you.

## How to inspect state

| What you want to see | How |
|---|---|
| Your builder profile | `cat ~/.claude/profiles/builder.json` |
| Recent Cart sessions | `cat ~/.claude/plugins/data/vibe-cartographer/sessions/$(date +%Y-%m-%d).jsonl` |
| Cart's accumulated friction signal | `/vibe-cartographer:friction` (read-only inspection) |
| What plugins are installed and where | `cat ~/.claude/plugins/installed_plugins.json` |
| Marketplace cache state | `ls ~/.claude/plugins/marketplaces/` |
| Plugin cache (the actual cloned plugin code) | `ls ~/.claude/plugins/cache/` |

## Routine procedures

### Move your profile to a new machine

Easiest path:

1. On the old machine: copy `~/.claude/profiles/builder.json` to a USB stick / cloud drive / email-to-self.
2. On the new machine: install Claude Code, install at least one Vibe plugin, then drop the file at `~/.claude/profiles/builder.json` (create the directory if it doesn't exist).
3. Run `/onboard` (or any returning-builder command). The plugin reads your existing profile and skips the new-builder interview.

If you want session logs and friction logs to travel too, also copy `~/.claude/plugins/data/`. But profile alone is enough for the plugin to recognize you.

### Update a plugin to the latest stable version

| Path | Command |
|---|---|
| Marketplace install | `/plugin marketplace sync` (in Claude Code), or click **Sync** in the Personal Plugins panel (Claude Desktop / Cowork). |
| npm CLI install | `npm install -g @esthernandez/<package>@latest`. |

Both refresh the *plugin instructions*. Your accumulated context (profile, logs) is preserved.

### Force-refresh a stale marketplace

When a marketplace fails to pick up a recent ref bump (cache stale):

```text
/plugin marketplace remove vibe-plugins
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
```

This nukes the local cache and re-fetches the manifest. Installed plugins keep working in the meantime; the next `/plugin install` after re-add picks up the latest pinned ref.

### Pin a plugin to a specific version

If you want a plugin held at a specific version (e.g., `vibe-cartographer@v1.7.2` instead of latest), use the per-plugin solo repo as a marketplace and rely on the version pin in `extraKnownMarketplaces`. See [`INSTALL.md`](../INSTALL.md) Path C.

## Recovery procedures

### Your builder profile got corrupted

Symptoms: `/onboard` errors with a JSON parse failure, or a plugin starts asking new-builder interview questions when it shouldn't.

1. **Check syntax**: `python -m json.tool < ~/.claude/profiles/builder.json` (or any JSON validator). If it errors, the file is malformed.
2. **Restore from a known-good copy**: if you have a recent USB / email backup, replace the file.
3. **Last resort**: rename the broken file (`mv ~/.claude/profiles/builder.json ~/.claude/profiles/builder.json.broken`) and re-run `/onboard`. You'll lose accumulated context but get a working profile back.

### A plugin won't load after install

Symptoms: `/plugin install` succeeds but the slash commands don't appear.

1. Run `/reload-plugins`. New plugins don't auto-discover until reload.
2. If still missing, restart the host (close and reopen Claude Code or Claude Desktop).
3. If the plugin is loaded but its commands are missing from the listing, the per-skill description budget may be saturated. Increase `skillListingMaxDescChars` and `skillListingBudgetFraction` in `~/.claude/settings.json`.

### A plugin starts behaving badly after an update

Symptoms: a previously-working command produces wrong output or skips steps.

1. Check whether the plugin had a recent release: `gh release view --repo estevanhernandez-stack-ed/<plugin>` or open the release page on GitHub.
2. If yes, check the CHANGELOG for breaking changes or behavior shifts.
3. **Pin to the prior version** as a workaround: see "Pin a plugin to a specific version" above.
4. **Open an issue** on the plugin's solo repo. Include the version, the command, and the actual vs. expected output.

### `/evolve` proposes wrong improvements

Symptoms: `/<plugin>:evolve` reads your friction / session logs and suggests SKILL changes that don't match what you actually want.

1. **Don't apply the proposals automatically.** `/evolve` writes to `proposed-changes.md`; nothing auto-applies.
2. The proposals are weighted by Pattern #6 (friction) and Pattern #14 (absence-of-friction). If they're off, your logs may be skewed by an unusual session — review the underlying friction entries with `/<plugin>:friction` and decide.
3. You can edit `proposed-changes.md` directly before reviewing, or just delete it and re-run `/evolve` after more sessions accumulate.

## Disabling evolution

If you want a plugin to *stop learning* — run with the same SKILL prose every time, no decay prompts, no profile updates:

1. Set `decay_disabled: true` in the plugin's namespace in `~/.claude/profiles/builder.json` (e.g., `plugins.vibe-cartographer.decay_disabled = true`). The decay-check SKILL honors this as an unconditional opt-out.
2. Skip running `/<plugin>:evolve` and `/<plugin>:reflect` (these are the commands that update accumulated state most aggressively).
3. To go further: delete the plugin's per-plugin data directory (`rm -rf ~/.claude/plugins/data/<plugin>/`). Sessions and friction logs vanish. Profile remains.

Note: disabling evolution doesn't disable the plugin — it just freezes the learning. The skill instructions still update on plugin updates.

## Periodic maintenance (none required, but useful)

These aren't *required* — the ecosystem is designed to keep working without manual upkeep. But you may want to:

| Cadence | What |
|---|---|
| Monthly | Glance at `~/.claude/profiles/builder.json` for stale fields. The decay-check SKILL surfaces these during `/onboard`, but you can refresh manually. |
| When migrating machines | Copy `~/.claude/profiles/builder.json`. See "Move your profile to a new machine." |
| When a plugin gets a major release | Read the plugin's release notes on GitHub or the marketplace. Confirm any schema migrations the next `/onboard` will run silently. |
| When `data/stats/` files start to feel heavy in this repo (>1 year of dailies) | Archive older snapshots to a separate branch / external storage. Not urgent — JSON files are small. |

## Escalation

This is solo-maintained software. Issues go to the plugin's solo-repo issue tracker, not anywhere else. There's no on-call rotation, no SLA, no support contract. If something is broken in production for you, the recovery procedures above are the playbook; if they don't help, open an issue with the version, the symptom, and any error output.
