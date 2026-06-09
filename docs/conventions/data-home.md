# Family convention: plugin data-home resolution

**Status:** STANDARD v1 with a verification gate — written 2026-06-09 after the Sanduhr field run surfaced the split-brain risk.
**Problem:** all 13 plugins hardcode `~/.claude/plugins/data/<plugin>/` in shipped SKILLs and scripts (201 literal references at last sweep). On machines running a second config home (`CLAUDE_CONFIG_DIR`, e.g. `~/.claude-personal`), the plugin loads from one home while its telemetry writes to another. It has been accidentally consistent so far; it will not stay that way.

## The blessed primitive

Claude Code defines **`${CLAUDE_PLUGIN_DATA}`** (plugins-reference § Persistent data directory): a per-plugin writable directory, auto-created on first reference, persisted across updates and uninstalls (unless removed with data). Documented resolution: `~/.claude/plugins/data/{id}/` where `{id}` is the plugin name + marketplace, non-alphanumerics dashed (`vibe-wrap@vibe-plugins` → `vibe-wrap-vibe-plugins`).

Two open questions gate full adoption — **verify empirically before migrating any plugin** (one session in a non-default config home answers both):

1. **Home-awareness:** does `${CLAUDE_PLUGIN_DATA}` resolve into the *active* config home, or literally `~/.claude`? Test: from a `.claude-personal`-homed session, have any plugin hook/skill echo the variable.
2. **Availability surface:** is it substituted in all the contexts our loggers run (skill-invoked shell, hooks, scripts)?

## The resolution ladder (what every logger/script implements)

```
data_dir =
  1. ${CLAUDE_PLUGIN_DATA}            # when substituted/exported — the blessed path
  2. <legacy> ~/.claude/plugins/data/<plugin>/   # current family location
  3. fail LOUD                        # never silently skip a write (the Cart blackout lesson)
```

**Migration rule:** readers read both locations (new first, legacy second) for one minor-version cycle per plugin; writers write the resolved tier-1 location once verification passes, tier-2 until then. Cross-plugin readers (vibe-insights reads every plugin's data) must implement both-location reads BEFORE any plugin migrates its writes.

**Naming wrinkle:** `{id}` includes the marketplace (`vibe-wrap-vibe-plugins`), so a canary install and a stable install get DIFFERENT data dirs. Ruling: that's correct behavior (channel-scoped telemetry), but evolve skills should note which channel's data they read.

## If verification fails (PLUGIN_DATA is not home-aware)

Fall back to documenting the constraint honestly: every plugin README states "telemetry assumes the default `~/.claude` config home," and we file the upstream feature request (expose `CLAUDE_CONFIG_DIR` or make PLUGIN_DATA home-aware — the runtime knows the active home; it just doesn't export it). Do not build fragile home-sniffing (reading Claude's internal config files) — we don't own that format.

## Rollout order

1. Verification session (the two tests above) — 10 minutes, blocks everything else.
2. vibe-insights: both-location reads (it's the cross-plugin consumer).
3. The four logging-heavy plugins (cart, wrap, iterate, test) migrate writers.
4. The long tail (single-digit references each) rides each plugin's next release.

This is Opus-executable per plugin once step 1 lands: mechanical path substitution + the fail-loud guard, same shape as cart's v1.10.0 `${CLAUDE_PLUGIN_ROOT}` migration.
