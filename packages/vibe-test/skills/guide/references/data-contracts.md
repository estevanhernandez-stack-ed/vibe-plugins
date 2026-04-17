# Data Contracts — SKILL-level view

> Complement to `packages/vibe-test/data-contract.md` (the top-level ownership + read/write summary for humans).
> This file adds the per-field, per-consumer notes that command SKILLs and internal SKILLs need to know
> at call time.

Every Vibe Test state file carries `schema_version` as its first field. Migrations dispatch via
`src/state/migrations/index.ts` on read; pre-migration snapshots land at `<path>.bak.<timestamp>`.

## Global state (machine-wide)

### `~/.claude/profiles/builder.json`

**Schema:** [`../schemas/builder-profile.schema.json`](../schemas/builder-profile.schema.json)

Shared bus; Pattern #11 namespace isolation. Vibe Test only writes under `plugins.vibe-test.*`. Never touches `shared.*` directly — those fields are set by Cart's `/onboard` / `/reflect` flows or by the user.

**Vibe Test's plugin block:**

```jsonc
"plugins": {
  "vibe-test": {
    "schema_version": 1,
    "testing_experience": "intermediate",   // decay_eligible, TTL 180d
    "preferred_framework": "vitest",         // decay_eligible, TTL 90d
    "preferred_assertion_style": "expect",   // decay_eligible, TTL 180d
    "preferred_test_location": "colocated",  // never decays (explicit pref)
    "fixture_approach": "factory",           // decay_eligible, TTL 180d
    "auto_generate_threshold": 0.9,          // never decays
    "coverage_target": null,                  // never decays
    "last_updated": "2026-04-17T14:00:00Z",
    "projects_audited": 3,
    "_meta": {
      "preferred_framework": {
        "last_confirmed": "2026-04-17",
        "stale": false,
        "ttl_days": 90
      },
      // one _meta entry per decay-eligible field
    }
  }
}
```

**Who writes:**
- `src/state/profile.ts` via `writeProfile()` — the only mutator. Always atomic (temp-file + rename).
- `skills/decay/SKILL.md` via `stamp()` — refreshes `_meta.<field>.last_confirmed` when the user re-confirms a preference.

**Who reads (and when):**
- Every command SKILL at entry → persona, experience level, mode.
- `skills/router/SKILL.md` → greeting adaptation, returning-vs-first-run branching.
- `src/reporter/tier-adaptive-language.ts` → verbosity knobs per experience level.
- `skills/audit/SKILL.md` → initialize projects_audited counter on first audit of a repo.

**Pattern #4 decay contract:**
- Decay-eligible fields surface past-TTL through `check_decay()`; the SKILL offers one re-confirmation per invocation.
- Never-decay fields (`preferred_test_location`, `auto_generate_threshold`, `coverage_target`) are user-set and stay until explicitly changed.

### `~/.claude/plugins/data/vibe-test/profile.json`

**Schema:** same shape as the `plugins.vibe-test` namespace above.

**Purpose:** plugin-local mirror of the shared bus block. Kept in sync on writes. Serves as a fallback if the shared profile is missing or corrupted (the plugin can still run if only the mirror exists).

**Who writes / reads:** `src/state/profile.ts` only.

### `~/.claude/plugins/data/vibe-test/sessions/<YYYY-MM-DD>.jsonl`

**Schema:** inline; see `session-log.ts` TypeScript types. Two-phase entry shape:

**Sentinel (written at command start):**
```json
{"schema_version":1,"timestamp":"2026-04-17T14:00:00Z","sessionUUID":"...","command":"audit","project":"my-app","plugin":"vibe-test","plugin_version":"0.2.0","outcome":"in_progress"}
```

**Terminal (written at command end):**
```json
{"schema_version":1,"timestamp":"2026-04-17T14:30:00Z","sessionUUID":"...","command":"audit","project":"my-app","plugin":"vibe-test","plugin_version":"0.2.0","outcome":"completed","tests_generated":0,"friction_notes":[],"key_decisions":["classified as public-facing"],"artifact_generated":"docs/vibe-test/audit-2026-04-17.md","complements_invoked":["vibe-sec"]}
```

**Who writes:** `src/state/session-log.ts` via `skills/session-logger/SKILL.md`. Sentinel at `start()`; terminal at `end()`. Both share a `sessionUUID` for pair-up.

**Who reads:**
- `skills/evolve/SKILL.md` → last 30 days of entries for proposed-change aggregation.
- `skills/posture/SKILL.md` → recent activity summary.
- `skills/friction-logger/SKILL.md` `detect_orphans()` → sentinels without terminal past 24h become `command_abandoned` entries.
- Cross-plugin readers (Cart's friction inspection) may read this too for cross-plugin stitching.

**Rotation:** daily. No auto-compaction in v0.2. User can safely delete old files; the plugin treats subsequent runs as fresh-install-for-evolution purposes.

### `~/.claude/plugins/data/vibe-test/friction.jsonl`

**Schema:** inline; see `friction-log.ts` TypeScript types.

```json
{"schema_version":1,"timestamp":"2026-04-17T14:15:00Z","sessionUUID":"...","plugin_version":"0.2.0","friction_type":"generation_pattern_mismatch","symptom":"3 consecutive rejects of Unicode edge-case tests","confidence":"high","agent_guess_at_cause":"SKILL is generating tests that don't match builder's edge-case coverage style","command":"generate","project":"my-app","complement_involved":null}
```

**Who writes:** `src/state/friction-log.ts` via `skills/friction-logger/SKILL.md` at the trigger points declared in [`./friction-triggers.md`](./friction-triggers.md).

**Who reads:**
- `skills/evolve/SKILL.md` → last 30 days, weighted by confidence × trigger-map calibration.
- Future `/vibe-test:friction` read-only inspection command (v0.3).

**Privacy:** local-only. No PII beyond command name and project basename.

**Defensive default:** `repeat_question` entries require a non-empty `symptom` with quoted prior; the state-layer `append()` enforces this gate before writing.

### `~/.claude/plugins/data/vibe-test/wins.jsonl`

**Schema:** inline; see `wins-log.ts` TypeScript types.

```json
{"schema_version":1,"timestamp":"2026-04-17T14:20:00Z","sessionUUID":"...","plugin_version":"0.2.0","command":"audit","event":"dogfood_finding_reproduced","context":"WSYATM audit reproduced the broken forks-pool finding","working_as_designed":true,"symptom":"Audit flagged vitest forks-pool timeout as a harness-break finding, matching the known issue","project":"WeSeeYouAtTheMovies"}
```

**Who writes:** `src/state/wins-log.ts` via `skills/wins-logger/SKILL.md`. Three capture moments (Pattern #14):
1. Absence-of-friction inference (applied by `/evolve` at aggregation time, batched — not inline).
2. Explicit success markers (on unambiguous positive user reaction).
3. External validation (cold-load, testimonial, screenshot).

**Who reads:** `skills/evolve/SKILL.md` to weight proposed changes — wins counter-balance friction when the plugin is working as designed.

**Conservative threshold:** never auto-inferred from a single signal. The SKILL enforces the guardrails; this file is populated sparingly.

## Per-project state

### `<project>/.vibe-test/state.json`

**Schema:** [`../schemas/audit-state.schema.json`](../schemas/audit-state.schema.json) (rolls up classification + inventory + coverage + framework + CI status).

**Who writes:** `src/state/project-state.ts` invoked by audit (after classification + coverage) and by generate (when it promotes pending tests that change the framework detection).

**Who reads:**
- Every command SKILL at entry — returning-vs-first-run detection, last-run metadata.
- `skills/router/SKILL.md` — banner branching (first-run vs returning).
- `skills/generate/SKILL.md` — blocking prereq (audit-state must exist for current scope).
- `skills/gate/SKILL.md` — threshold baseline.
- `skills/posture/SKILL.md` — ambient summary source.

**Scope variants:** full-repo audit writes to `.vibe-test/state.json`; scoped audit (`--path`) writes to `.vibe-test/state/audit-<hash>.json` without overwriting the full-repo state (A3).

### `<project>/.vibe-test/state/audit.json` (+ `history/`)

**Schema:** [`../schemas/audit-state.schema.json`](../schemas/audit-state.schema.json)

**Who writes:** `src/reporter/json-renderer.ts` invoked by audit SKILL. Every write copies prior into `.vibe-test/state/history/audit-<timestamp>.json`.

**Who reads:**
- `skills/generate/SKILL.md` → blocking prereq.
- `skills/gate/SKILL.md` → reuses if fresh (<1h old on same HEAD).
- `skills/posture/SKILL.md` → ambient read.

### `<project>/.vibe-test/state/coverage.json`

**Schema:** [`../schemas/coverage-state.schema.json`](../schemas/coverage-state.schema.json)

**Who writes:** coverage + gate SKILLs via `src/reporter/json-renderer.ts`.
**Who reads:** gate SKILL, posture SKILL.

### `<project>/.vibe-test/state/generate.json`

**Schema:** [`../schemas/generate-state.schema.json`](../schemas/generate-state.schema.json)

**Who writes:** generate SKILL via `src/reporter/json-renderer.ts`. Records accepted/rejected tests, rejection reasons, HEAD hash at accept, idiom detection outcome.

**Who reads:**
- generate SKILL on re-run (accept/reject history, don't re-propose rejected tests).
- fix SKILL (for rollback of auto-written tests that broke CI).

### `<project>/.vibe-test/state/covered-surfaces.json` (vibe-sec handshake)

**Schema:** [`../schemas/covered-surfaces.schema.json`](../schemas/covered-surfaces.schema.json)

**Who writes:** audit SKILL after a successful run.
**Who reads:** Vibe Sec plugin (cross-plugin consumer).

**Privacy contract:** contains route names, model names, component names — not secrets. Safe to commit if the project chooses, though `.vibe-test/` is typically gitignored.

### `<project>/.vibe-test/state/findings.schema.json` (vibe-sec input contract)

**Schema:** [`../schemas/findings.schema.json`](../schemas/findings.schema.json)

**Who writes:** Vibe Sec plugin. Vibe Test **never** writes to this file.
**Who reads:** audit SKILL (for elevated-priority gap ordering when vibe-sec is installed), generate SKILL (to bump priority of tests that cover flagged surfaces).

### `<project>/.vibe-test/state/last-dry-run.json`

**Schema:** [`../schemas/generate-state.schema.json`](../schemas/generate-state.schema.json) with `dry_run: true`.

**Who writes:** generate SKILL under `--dry-run` flag.
**Who reads:** `--apply-last-dry-run` handler within generate SKILL.
**TTL:** 24 hours from write; expired dry-runs are discarded silently.

### `<project>/.vibe-test/pending/`

**Purpose:** staged generated tests awaiting review (confidence 0.70 – 0.89).
**Layout:** mirrors source tree — `src/components/X.tsx` → `.vibe-test/pending/tests/components/X.test.tsx`.
**Sidecar:** `pending/index.md` summarizes the batch (file list, confidence per test, HEAD hash at generation time).
**Who writes / reads:** `src/generator/pending-dir-manager.ts`.

## Cross-plugin coordination

### `<project>/.626labs/beacons.jsonl`

**Schema:** inline; see `beacons.ts` TypeScript types.

```json
{"schema_version":1,"timestamp":"2026-04-17T14:30:00Z","plugin":"vibe-test","plugin_version":"0.2.0","command":"audit","sessionUUID":"...","outcome":"completed","hint":"audit found 3 findings","project":"my-app"}
```

**Who writes:** every command SKILL at terminal via `src/state/beacons.ts`.
**Who reads:** Cart / Vibe Doc / Vibe Sec for cross-plugin session stitching.
**Format:** append-only JSONL. Each entry names the plugin, command, sessionUUID, timestamp.

## Handoff artifacts (framework-agnostic)

### `<project>/docs/TESTING.md`

**Sections:** Overview, App Classification, Current Coverage Posture, How To Run, How To Add New Tests, Graduating To Next Tier, Ecosystem Recommendations.

**Who writes:** `src/handoff/testing-md-writer.ts` + `src/handoff/graduating-guide-writer.ts` + `src/handoff/ecosystem-section-writer.ts`.

**Who reads:** humans. The plugin treats this as write-only (it never reads TESTING.md back to drive logic).

**H6 principle:** contains no Vibe Test-specific imports. Builder can uninstall the plugin and the runbook still works.

### `<project>/docs/test-plan.md`

**Purpose:** chronological per-session log of classification decisions, confidence per test, accept/reject status, rejection reasons. Structured so future L2 feedback extraction can find patterns.

**Who writes:** `src/handoff/test-plan-writer.ts`.
**Who reads:** humans + L2 feedback pipeline.

### `<project>/docs/vibe-test/<command>-<date>.md`

**Purpose:** markdown render of each command's `ReportObject`.
**Who writes:** `src/reporter/markdown-renderer.ts`.
**Who reads:** humans; linked from `TESTING.md`.

### `<project>/.github/workflows/vibe-test-gate.yml` (opt-in)

**Who writes:** `src/handoff/ci-stub-writer.ts` only after a once-per-project opt-in prompt.
**Content:** Node setup → `pnpm install` → `npx @esthernandez/vibe-test-cli gate --ci`.
**Env placeholders:** any project env vars go in an explicit `env:` block with a comment pointing to repo secrets.

## Inputs Vibe Test reads but never writes

- `~/.claude/plugins/installed_plugins.json` — Pattern #15 resolution.
- `<project>/package.json` — framework detection, `dev` script probe.
- `<project>/vitest.config.ts` / `jest.config.js` — coverage adapter analysis.
- `<project>/.vibe-sec/state/findings.jsonl` — security-aware gap prioritization (EC5).
- Claude Code runtime `available-skills` list — composition dynamic discovery.

## Schema versioning contract

- Every JSON state file embeds `schema_version` (integer) as its first field.
- Every JSONL entry carries `schema_version` per-line (mid-rotation resiliency — consumers can read mixed versions).
- Migrations live at `src/state/migrations/<file>-v<N>-to-v<M>.ts` and dispatch through `src/state/migrations/index.ts`.
- Migrations are idempotent — running twice is a no-op.
- Each migration writes `<path>.bak.<timestamp>` before mutating.

**Current versions (v0.2):**

| File | Version |
|------|---------|
| `builder.json` → `plugins.vibe-test` | 1 |
| `state.json` | 1 |
| `audit-state.json` | 1 |
| `coverage-state.json` | 1 |
| `generate-state.json` | 1 |
| `findings.jsonl` (input) | 1 |
| `covered-surfaces.json` | 1 |
| All JSONL logs (sessions/friction/wins/beacons) | 1 |

## SKILL-level access helpers

The file-tool patterns each SKILL uses:

- **Read profile:** `node -e "import('@esthernandez/vibe-test/state').then(m => m.readProfile().then(p => console.log(JSON.stringify(p))))"`.
- **Append session:** invoke `src/state/session-log.ts` `start()` / `end()` via the SKILL-owned node snippet.
- **Append friction:** invoke `src/state/friction-log.ts` `append()` via the SKILL-owned node snippet.
- **Append win:** invoke `src/state/wins-log.ts` `append()` via the SKILL-owned node snippet.
- **Append beacon:** invoke `src/state/beacons.ts` `append(repoRoot, entry)` via the SKILL-owned node snippet.

All five helpers resolve the correct file path via Node stdlib (`os.homedir()` + `path.join`) so Windows/macOS/Linux path separators Just Work.
