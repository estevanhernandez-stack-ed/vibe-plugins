---
name: decay
description: "Internal SKILL — not a slash command. Profile-decay engine for Vibe Cartographer. Invoked by /onboard at command start to gently re-validate stale fields in the unified builder profile (~/.claude/profiles/builder.json). Implements Pattern #4 (Memory Decay and Refresh) from the Self-Evolving Plugin Framework."
---

# decay — Profile Decay Engine

Internal SKILL. Not a user-invocable slash command. Loaded by `/onboard` only.

This skill describes two procedures the agent runs against the unified builder profile to keep stored preferences fresh without ever silently rewriting them. The user is always the final arbiter of what gets re-stamped.

## Before You Start

- **Data contract:** `skills/guide/references/data-contracts.md` — read the "Unified Profile" and "Decay metadata" sections.
- **Schema:** `skills/guide/schemas/builder-profile.schema.json` — `_meta` blocks live under each namespace (`shared._meta` and `plugins.<name>._meta`) keyed by dotted field path. Per-entry shape: `{ last_confirmed, stale, ttl_days }`.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #4 — Memory Decay and Refresh. The pillar is **self-repair**. Past-TTL fields gain `stale: true` but values are never modified without explicit user input.
- **Atomic writes only:** all profile writes go through `node scripts/atomic-write-json.js ~/.claude/profiles/builder.json` (stdin = full profile JSON). Never write the profile inline.

## Catalog-Wide Invariant

> The user is the final arbiter of self-evolution.

Decay surfaces a confirmation moment. It never edits values on its own.

## Default TTLs

Hard-coded here so SKILLs that touch the profile use one source of truth. `stamp()` writes these onto a `_meta` entry the first time a field is stamped (when `ttl_days` is missing).

| Field path | Namespace | TTL (days) |
|------------|-----------|------------|
| `preferences.persona` | `shared` | 180 |
| `preferences.tone` | `shared` | 180 |
| `preferences.pacing` | `shared` | 180 |
| `preferences.communication_style` | `shared` | 180 |
| `technical_experience.level` | `shared` | 365 |
| `technical_experience.languages` | `shared` | 90 |
| `technical_experience.frameworks` | `shared` | 90 |

**Never decays — no `_meta` entry created:**

- `shared.name`
- `shared.identity`
- `shared.creative_sensibility`

If `check_decay()` encounters an unknown field path, leave it alone. Only the entries above are managed by this SKILL.

## Priority Order

When more than one field is stale, surface the highest-priority one (only one decay prompt per `/onboard` run):

1. `preferences.persona`
2. `technical_experience.level`
3. `preferences.tone`
4. `preferences.pacing`
5. `technical_experience.languages`
6. `technical_experience.frameworks`
7. `preferences.communication_style` (lowest priority — falls out of the spec list but kept here for completeness)

Return the namespace-qualified path (e.g., `shared.preferences.persona`) so `stamp()` knows where to write.

## Procedure: `check_decay()`

**Returns:** the namespace-qualified field path of the highest-priority stale field, or `null`.

1. **Read the profile.** `cat ~/.claude/profiles/builder.json` (or equivalent). If the file does not exist, return `null` — there is nothing to decay.
2. **Honor the opt-out flag.** If the parsed profile has `decay_disabled: true` at the top level, return `null` immediately. Do not scan, do not mark anything stale.
3. **Walk every namespace's `_meta` block.** Currently this means `shared._meta` and `plugins.vibe-cartographer._meta`. Future plugin namespaces follow the same pattern. For each namespace `<ns>`:
   - For each entry in `<ns>._meta` whose value matches the per-entry decay shape (`{ last_confirmed, stale, ttl_days }`):
     - Skip non-decay sub-shapes like `last_seen_complements` — they are not decay records.
     - Compute `expires_at = Date.parse(last_confirmed) + (ttl_days * 86_400_000)`.
     - If `expires_at < Date.now()`, mark this entry as stale **in memory only** (`stale = true`). Do not write the profile here — `stamp()` is the only writer.
4. **Pick the winner.** Walk the priority list above; for each path, check if any namespace flagged it stale. Return the first match as `<namespace>.<path>` (e.g., `shared.preferences.persona`).
5. **No stale fields →** return `null`.

The returned value is a string field path the caller (`/onboard`) uses to phrase the confirmation question and pass back to `stamp()`.

## Procedure: `stamp(field_path)`

**Argument:** namespace-qualified dotted path (e.g., `shared.preferences.persona` or `plugins.vibe-cartographer.deepening_round_habits`).

**Returns:** nothing on success. Surfaces the atomic-write error to the caller on failure.

1. **Read the profile.** Same path as above. If it does not exist, abort — there is nothing to stamp.
2. **Resolve the namespace and field key.** Split `field_path` on the first `.`:
   - `shared.<rest>` → namespace block is `profile.shared`, dotted key in `_meta` is `<rest>`.
   - `plugins.<plugin>.<rest>` → namespace block is `profile.plugins[<plugin>]`, dotted key in `_meta` is `<rest>`.
3. **Ensure the `_meta` block exists.** If the namespace has no `_meta` key, create it as `{}`.
4. **Look up the entry.** `entry = namespace._meta[<rest>]`.
5. **Update or create the entry.**
   - If the entry exists: set `entry.last_confirmed = <today ISO date>` (e.g., `2026-04-16`), `entry.stale = false`. Preserve `entry.ttl_days` exactly as-is.
   - If the entry does not exist: create it with `last_confirmed = <today>`, `stale = false`, `ttl_days = <default from the table above>`. If the field path is not in the default-TTL table, refuse to create the entry (return without writing) — the SKILL only manages the documented fields.
6. **Bump top-level metadata.** Set `profile.last_updated = <today ISO date>`.
7. **Atomic write.** Pipe the full profile JSON to `node scripts/atomic-write-json.js ~/.claude/profiles/builder.json`. On non-zero exit, surface the stderr message to the caller. Do not retry — the caller owns retry policy.

`stamp()` does **not** mutate the field's value. Updating the value (because the user said "actually I switched to professor") is the caller's responsibility — `/onboard` writes the new value, then calls `stamp()` to refresh the timestamp.

## 1.4.x → 1.5.0 Migration: Fresh-Stamp on First Read

A profile written by Cart 1.4.x and earlier has no `_meta` blocks at all. The decay subsystem must not retroactively flag every field as stale on first read of a 1.5.0 install — that would generate a confirmation prompt for a brand-new feature, which is exactly the opposite of "gentle re-validation."

The migration runs **silently** the first time `/onboard` (or any caller) loads the profile under 1.5.0:

1. Read the profile.
2. If `shared._meta` is missing entirely, fresh-stamp every shared decay-eligible field that is **present** in the profile (don't create entries for fields the user hasn't filled in yet).
   - For each row in the default-TTL table whose namespace is `shared`, check if the corresponding value exists in the profile (e.g., `shared.preferences.persona` is set to a non-empty string, `shared.technical_experience.languages` is a non-empty array). If yes, write `shared._meta[<dotted path>] = { last_confirmed: <today>, stale: false, ttl_days: <default> }`.
3. If `plugins.vibe-cartographer._meta` is missing, leave it alone unless future plugin-scoped decay-eligible fields are added. (As of 1.5.0 there are none — the only `plugins.vibe-cartographer._meta` entry is `last_seen_complements`, which is not a decay record.)
4. Bump `profile.last_updated` to today.
5. Atomic-write the profile.
6. Do **not** prompt the user. Do not log anything user-visible. The migration is plumbing.

After fresh-stamp, the next `check_decay()` call will see all freshly-stamped entries and return `null`. Decay prompts begin organically once a TTL elapses — for persona, ~6 months from the upgrade.

If the migration write fails (atomic-write returns non-zero), surface the error and skip the decay check for this run. Do not block `/onboard`.

## Invocation Order in `/onboard`

`/onboard` calls in this sequence at command start:

1. (Item 5 ships this) write the session-logger sentinel entry.
2. Run **fresh-stamp migration** (silent if `_meta` already exists).
3. Run `check_decay()`.
4. If a field path returned, embed the gentle confirmation question in the welcome message.
5. After the user responds, update the field's value (if they changed it) and call `stamp(field_path)`.

The first time the user upgrades to 1.5.0, steps 2 and 3 collapse — fresh-stamp runs, then `check_decay()` immediately returns `null` because everything was just stamped.

## Style Notes for the Confirmation Prompt

The decay SKILL doesn't render the prompt itself — `/onboard` does. But this is the right place to anchor the tone:

- **Casual.** "Last time persona was superdev — still right?" not "Your `preferences.persona` field has exceeded its 180-day TTL."
- **Embedded.** Slip it into the welcome banter, not a separate ceremony.
- **One per run.** Even if multiple fields are stale, only the highest-priority one gets surfaced. The others wait their turn.
- **Cheap to confirm.** "yes" / "yep" / "still right" → re-stamp and move on. The whole thing should take one exchange.

## Failure Modes

- **Profile file missing:** `check_decay()` returns `null`. `stamp()` returns without writing. `/onboard` proceeds as a new-builder flow.
- **Profile JSON malformed:** surface the parse error to the caller. Do not attempt to fix. `/vitals` check #3 owns schema repair.
- **Atomic-write fails:** surface stderr from `atomic-write-json.js`. `/onboard` should warn in `process-notes.md` and continue — the decay subsystem is best-effort, not blocking.
- **Unknown field path passed to `stamp()`:** if the path is not in the default-TTL table and no `_meta` entry exists, refuse to create one. Return without writing. This protects against typos and accidental decay of fields that are explicitly never-decay (`name`, `identity`, `creative_sensibility`).

## Why This SKILL Exists

The unified builder profile is durable across projects, plugins, and time. Without decay, a "first-time coder" tag from 18 months ago haunts every `/onboard`. With decay, the profile self-corrects — but only with the user in the loop. The `decay_disabled: true` flag is the escape hatch for users who want their profile frozen forever.

This is Pattern #4 of the Self-Evolving Plugin Framework, scoped to the unified profile bus (Pattern #11). The two compose: Pattern #11 says the profile is shared across plugins; Pattern #4 keeps it from rotting.
