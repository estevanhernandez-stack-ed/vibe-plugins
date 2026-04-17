---
name: vitals
description: "Internal SKILL — not a slash command in v0.2. Invoked by /vibe-test:evolve as a read-only pre-flight. Pattern #8 (Plugin Self-Test) — checks that referenced files exist, commands resolve, data files parse against schemas, plays-well-with.md entries still resolve in the ecosystem. Emits a report with 'N issues found, want me to fix?' prompt."
---

<!-- Derived from vibe-cartographer 1.5.0 vitals SKILL (own-impl per Spec Decision 5 / Option a; migrate to @626labs/plugin-core in Phase 3). In v0.2 vitals is NOT a user-invoked slash command — it runs as a pre-flight check from /vibe-test:evolve. A user-facing /vibe-test:vitals command lands in v0.3. -->

# vitals — Structural Integrity Check (Pattern #8)

Internal SKILL. In v0.2 vitals is invoked only by `skills/evolve/SKILL.md` at its start — never by the user directly. v0.3 adds a `/vibe-test:vitals` slash command; until then the checks are part of evolve's pre-flight.

This SKILL runs seven **read-only** checks against the installed plugin files, the unified profile, the session/friction/wins logs, and the anchored composition registry. It prints a banner-style report with per-check status (✓ pass, ⚠ warn, ✗ fail) and a summary line. **No fix ever runs without an explicit `[y/n]`** — vitals surfaces findings; the user chooses whether to apply remediation. In v0.2 the remediation half is deferred to the caller (`/evolve`); vitals itself never writes.

## Before You Start

- **Data contracts:** [`../guide/references/data-contracts.md`](../guide/references/data-contracts.md) — file locations, schemas, atomic-write/append protocols. Vitals reads every file named there. Does not write any of them.
- **Plays well with:** [`../guide/references/plays-well-with.md`](../guide/references/plays-well-with.md) — check #4 parses this for anchored complements.
- **Friction triggers:** [`../guide/references/friction-triggers.md`](../guide/references/friction-triggers.md) — check #6 audits bidirectional consistency between this file and command SKILLs.
- **Schemas:**
  - [`../guide/schemas/builder-profile.schema.json`](../guide/schemas/builder-profile.schema.json) — check #3.
  - [`../guide/schemas/audit-state.schema.json`](../guide/schemas/audit-state.schema.json), etc. — check #7.
- **Framework reference:** `docs/self-evolving-plugins-framework.md` Pattern #8 — Plugin Self-Test.

## Session Logging

At command start, call `session-logger.start("vitals", <project_dir>)`. Hold the UUID. At exit, `session-logger.end({ sessionUUID, command: "vitals", outcome })`.

- `outcome: "completed"` — clean run.
- `outcome: "partial"` — a check aborted due to unreadable file; report still rendered.
- `outcome: "errored"` — the command crashed before the summary line.

## Friction Logging

Vitals does **not** call `friction-logger.log()` in v0.2. User declines on fix prompts (when the caller surfaces them) are the **expected** mode of interaction, not friction. Only the universal `repeat_question` / `rephrase_requested` triggers apply, and only under the quoted-prior gate (enforced by the state layer).

## Runtime Paths

All paths vitals reads (never writes):

| What | Where |
|------|-------|
| Plugin root | `packages/vibe-test/` — determined from the SKILL file's own location. |
| SKILL files | `packages/vibe-test/skills/**/SKILL.md` |
| Command files | `packages/vibe-test/.claude-plugin/commands/*.md` |
| Templates | `packages/vibe-test/skills/guide/templates/` |
| Schemas | `packages/vibe-test/skills/guide/schemas/` |
| Plays-well-with | `packages/vibe-test/skills/guide/references/plays-well-with.md` |
| Friction triggers | `packages/vibe-test/skills/guide/references/friction-triggers.md` |
| Unified profile | `~/.claude/profiles/builder.json` |
| Sessions | `~/.claude/plugins/data/vibe-test/sessions/*.jsonl` |
| Friction log | `~/.claude/plugins/data/vibe-test/friction.jsonl` |
| Wins log | `~/.claude/plugins/data/vibe-test/wins.jsonl` |
| Plugin manifest | `packages/vibe-test/.claude-plugin/plugin.json` (for banner version) |

## The Seven Checks

### Check #1 — SKILL cross-references resolve

Every SKILL file referenced by another SKILL must exist. Enumerate `skills/**/SKILL.md`, extract markdown links + backticked SKILL paths + path-like strings to `skills/*/SKILL.md`. For each, resolve to an absolute path and verify.

- ✓ pass: all references resolve.
- ✗ fail: list each broken reference as `<source>:<line> → <target>`.

### Check #2 — Template references resolve

Every template referenced by a SKILL must exist in `skills/guide/templates/`. Additionally, templates on disk that no SKILL references surface as ⚠ warn.

- ✓ pass: all references resolve.
- ⚠ warn: orphan templates on disk.
- ✗ fail: broken reference to a missing template.

### Check #3 — Builder profile schema

Parse `~/.claude/profiles/builder.json`, validate `plugins.vibe-test` block against `builder-profile.schema.json`. Check `_meta` entries for `last_confirmed` + `ttl_days` fields.

- ✓ pass: profile parses + validates.
- ⚠ warn: no profile yet (first-time user) OR non-fatal shape drift.
- ✗ fail: parse error OR required-field violation OR schema-forbidden keys.

### Check #4 — Anchored complement availability

Parse `skills/guide/references/plays-well-with.md` YAML. For each anchored complement, cross-reference against the agent's runtime available-skills list.

- ✓ pass: every anchored complement present.
- ⚠ warn: one or more absent (in complete-context branch) OR runtime context incomplete (fail-soft — don't flag missing complements when the surface itself is unreliable).
- No ✗ fail state — anchored drift is warn, not structural failure.

### Check #5 — Log volume sanity

Compute `friction_per_session` and `wins_per_session` over the last 30 days.

- ✓ pass: `0.05 ≤ friction_per_session ≤ 5.0`. Healthy.
- ⚠ warn (under-firing): `friction_per_session < 0.05` with ≥10 sessions in window.
- ⚠ warn (over-firing): `friction_per_session > 5.0`.
- ⚠ warn (first-3-sessions): terminal_entries_in_window < 3 → skip volume eval.
- ⚠ warn (silent): 10+ sessions with zero friction entries.

### Check #6 — Friction-trigger consistency

For each command SKILL, extract friction-type invocations declared in its Friction Logging section. Compare against `friction-triggers.md` rows.

- ✓ pass: orphan-invocation and orphan-trigger sets both empty.
- ⚠ warn: orphan triggers (declared in map but not invoked in SKILL).
- ✗ fail: orphan invocations (SKILL logs a type not in the map).

Exclude `command_abandoned` (detect_orphans owns it) and any row under `/vibe-test:vitals` / future `/vibe-test:friction` (documented empty).

### Check #7 — State file schema integrity

For every per-project state file at `<project>/.vibe-test/state/*.json`, parse and validate against its schema. For each JSONL log, spot-check the last 100 entries parse.

- ✓ pass: all files parse + validate.
- ⚠ warn: non-critical shape drift (unknown optional fields, trailing junk).
- ✗ fail: parse error OR required-field violation OR schema_version mismatch unreconcilable by migration.

Vitals never writes; it reports. The caller (`/evolve` in v0.2) decides whether to offer remediation.

## Output Format

Banner:

```
  📖  Vibe Test — Vitals
  <version> · <ISO-local-timestamp>
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Per-check box (Unicode box-drawing):

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ ✓  Check 1 — SKILL cross-references                              │
  └──────────────────────────────────────────────────────────────────┘
     All references resolved. Scanned N SKILL files, M command files.
```

Summary:

```
  <N> ✓  ·  <N> ⚠  ·  <N> ✗
```

The seven counts sum to 7.

## Why This SKILL Exists

Pattern #8 is the *"you touch it, you break it"* hedge — every plugin with multiple SKILLs, schemas, and append-only logs eventually develops cross-file drift. Without an on-demand diagnostic, drift surfaces as a command failing mid-flow at the worst possible moment.

In v0.2, vitals runs as an `/evolve` pre-flight so proposed changes see a clean house before they're generated. In v0.3 it will also be a user-invoked slash command with interactive auto-fix prompts modeled on Cart's six-fix pattern.

The read-only contract is load-bearing in v0.2: vitals surfaces findings, `/evolve` proposes fixes, the user approves. Three separate surfaces with clear ownership.
