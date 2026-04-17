---
name: decay
description: "Internal SKILL — not a slash command. Profile-decay engine for Vibe Test. Invoked by the router SKILL at command start to gently re-validate stale fields in the Vibe Test profile namespace. Implements Pattern #4 (Memory Decay and Refresh) from the Self-Evolving Plugin Framework."
---

<!-- Derived from vibe-cartographer 1.5.0 decay SKILL (own-impl per Spec Decision 5 / Option a; migrate to @626labs/plugin-core in Phase 3) -->

# decay — Profile Decay Engine

Internal SKILL. Not a user-invocable slash command. Loaded by the router SKILL once per first-run-of-the-day, and opportunistically by commands that change a decay-eligible preference mid-run.

This skill describes two procedures the agent runs against the shared builder profile to keep Vibe Test's preference fields fresh without ever silently rewriting them. The user is always the final arbiter of what gets re-stamped.

## Before You Start

- **Data contract:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — read the "builder.json" section, specifically the `plugins.vibe-test._meta` sub-shape.
- **Schema:** [`../guide/schemas/builder-profile.schema.json`](../guide/schemas/builder-profile.schema.json) — the `_meta` block under `plugins.vibe-test` is keyed by field name with per-entry shape `{ last_confirmed, stale, ttl_days }`.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #4. Past-TTL fields gain `stale: true` but values are never modified without explicit user input.
- **Guide SKILL:** [`../guide/SKILL.md`](../guide/SKILL.md) — decay is one of the four session-memory interfaces referenced there.
- **Atomic writes only:** all profile writes go through `src/state/profile.ts` `writeProfile()`, which wraps the atomic temp-file + rename pattern.

## Catalog-Wide Invariant

> The user is the final arbiter of self-evolution.

Decay surfaces a confirmation moment. It never edits values on its own.

## Default TTLs for Vibe Test fields

Scoped to `plugins.vibe-test.*`. Hard-coded here so SKILLs that touch the profile use one source of truth. `stamp()` writes these onto a `_meta` entry the first time a field is stamped (when `ttl_days` is missing).

| Field path | TTL (days) | Why |
|------------|------------|-----|
| `preferred_framework` | 90 | Test frameworks change faster than assertion style — a shift from Vitest to Jest in a new repo is common. |
| `preferred_assertion_style` | 180 | Style pref stabilizes. |
| `testing_experience` | 180 | Level-of-experience drift is slow but real. |
| `fixture_approach` | 180 | Pattern preference is fairly stable. |

**Never decays — no `_meta` entry created:**

- `preferred_test_location` — user sets explicitly; changing it requires a project-structure change.
- `auto_generate_threshold` — numeric tuning knob; changes are explicit.
- `coverage_target` — explicit override.
- `projects_audited` — counter; not a preference.
- `last_updated` — audit field; auto-stamped on every write.

If `check_decay()` encounters an unknown field path, leave it alone. Only the entries above are managed by this SKILL.

## Priority Order

When more than one field is stale, surface the highest-priority one (only one decay prompt per router run):

1. `preferred_framework` — loudest downstream effect.
2. `testing_experience` — affects every user-facing surface via SE7.
3. `preferred_assertion_style` — affects generated test idiom.
4. `fixture_approach` — affects generated test structure.

Return the namespace-qualified path (e.g., `plugins.vibe-test.preferred_framework`) so `stamp()` knows where to write.

## Procedure: `check_decay()`

**Returns:** the namespace-qualified field path of the highest-priority stale field, or `null`.

**Steps:**

1. **Read the profile.** Via `src/state/profile.ts` `readProfile()`. If the file does not exist, return `null` — there is nothing to decay.
2. **Honor the opt-out flag.** If the parsed profile has `decay_disabled: true` at the top level, return `null` immediately.
3. **Walk `plugins.vibe-test._meta`.** For each entry whose value matches the per-entry decay shape (`{ last_confirmed, stale, ttl_days }`):
   - Skip non-decay sub-shapes — they are not decay records.
   - Compute `expires_at = Date.parse(last_confirmed) + (ttl_days * 86_400_000)`.
   - If `expires_at < Date.now()`, mark this entry as stale **in memory only** (`stale = true`). Do not write here — `stamp()` is the only writer.
4. **Pick the winner.** Walk the priority list above; return the first match as `plugins.vibe-test.<path>`.
5. **No stale fields →** return `null`.

The returned value is a string field path the caller (typically the router SKILL) uses to phrase the confirmation question and pass back to `stamp()`.

## Procedure: `stamp(field_path)`

**Argument:** namespace-qualified dotted path (e.g., `plugins.vibe-test.preferred_framework`).

**Returns:** nothing on success. Surfaces the atomic-write error to the caller on failure.

**Steps:**

1. **Read the profile.** If it does not exist, abort — there is nothing to stamp.
2. **Resolve the field key.** Split `field_path` at `plugins.vibe-test.` and use the rest as the `_meta` key.
3. **Ensure the `_meta` block exists.** If `plugins.vibe-test._meta` is absent, create it as `{}`.
4. **Look up the entry.** `entry = profile.plugins["vibe-test"]._meta[<field>]`.
5. **Update or create the entry.**
   - If the entry exists: set `entry.last_confirmed = <today ISO date>`, `entry.stale = false`. Preserve `entry.ttl_days`.
   - If the entry does not exist: create it with `last_confirmed = <today>`, `stale = false`, `ttl_days = <default>`. If the field is not in the default-TTL table, refuse to create — the SKILL only manages documented fields.
6. **Bump top-level metadata.** Set `profile.last_updated = <today ISO date>`.
7. **Atomic write** via `src/state/profile.ts` `writeProfile()`. On failure, surface stderr.

`stamp()` does **not** mutate the field's value. Updating the value (the user switched from Vitest to Jest) is the caller's responsibility — the caller writes the new value, then calls `stamp()` to refresh the timestamp.

## Fresh-Stamp Migration (builders upgrading to v0.2)

A profile from a builder who has never run Vibe Test has no `plugins.vibe-test._meta` block at all. The decay subsystem must not retroactively flag every field as stale on first read — that would generate a confirmation prompt for a brand-new feature, which is the opposite of "gentle re-validation."

The migration runs **silently** the first time the router SKILL loads the profile under v0.2:

1. Read the profile.
2. If `plugins.vibe-test._meta` is missing entirely, fresh-stamp every decay-eligible field that is **present** in `plugins.vibe-test.*`. For each row in the default-TTL table, check if the corresponding value is set (e.g., `preferred_framework` is not `"auto"` and not empty). If yes, write `_meta[<field>] = { last_confirmed: <today>, stale: false, ttl_days: <default> }`.
3. Bump `last_updated` and atomic-write the profile.
4. Do **not** prompt the user. The migration is plumbing.

After fresh-stamp, the next `check_decay()` call returns `null`. Decay prompts begin organically once a TTL elapses.

## Invocation Order in the Router

The router SKILL calls decay in this sequence at first-run-of-the-day:

1. Write the session-logger sentinel for this router invocation.
2. Run fresh-stamp migration (silent if `_meta` already exists).
3. Run `check_decay()`.
4. If a field path returned, embed the gentle confirmation question in the banner.
5. After the user responds, update the field's value (if changed) and call `stamp(field_path)`.

The first time the builder upgrades to v0.2, steps 2 and 3 collapse — fresh-stamp runs, then `check_decay()` immediately returns `null` because everything was just stamped.

## Style Notes for the Confirmation Prompt

- **Casual.** *"Last time you were using Vitest — still the case?"* not *"Your `preferred_framework` field has exceeded its 90-day TTL."*
- **Embedded.** Slip it into the router banner, not a separate ceremony.
- **One per run.** Even if multiple fields are stale, only the highest-priority one surfaces.
- **Cheap to confirm.** *"yes"* / *"yep"* / *"still right"* → re-stamp and move on.

## Failure Modes

- **Profile file missing:** `check_decay()` returns `null`. `stamp()` aborts. Plugin proceeds as a new-builder flow.
- **Profile JSON malformed:** surface the parse error to the caller. Do not attempt to fix. Future `/vibe-test:vitals` will own schema repair.
- **Atomic-write fails:** surface stderr from `writeProfile()`. Caller warns and continues.
- **Unknown field path passed to `stamp()`:** refuse to create. Return without writing.

## Why This SKILL Exists

The builder profile is durable across projects, plugins, and time. Without decay, a *"first-time coder"* tag or a preferred framework from 18 months ago haunts every run. With decay, the profile self-corrects — but only with the user in the loop. The `decay_disabled: true` flag is the escape hatch for users who want their profile frozen forever.

This is Pattern #4 of the Self-Evolving Plugin Framework, scoped to the Vibe Test namespace under the shared bus (Pattern #11). The two compose: Pattern #11 says the profile is shared across plugins; Pattern #4 keeps it from rotting.
