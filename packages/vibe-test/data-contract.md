# data-contract.md — State File Ownership & Read/Write Rules

> Pattern #11 (Data Contract) — every state file Vibe Test touches, who writes it, who reads it, when, and the schema that governs its shape.

## Scope

This document enumerates **every persistent file Vibe Test writes to** and **every external file it reads from** across three namespaces:

1. **Global (machine-wide):** `~/.claude/profiles/` + `~/.claude/plugins/data/vibe-test/`
2. **Per-project:** `<project>/.vibe-test/` + `<project>/docs/vibe-test/` + `<project>/.626labs/`
3. **Handoff artifacts (framework-agnostic):** `<project>/docs/TESTING.md`, `<project>/docs/test-plan.md`, `<project>/.github/workflows/vibe-test-gate.yml`

All Vibe Test state files carry a `schema_version` integer as their first field. Migrations dispatch via `src/state/migrations/index.ts` on read when `schema_version < expected`; pre-migration copies land at `<path>.bak.<timestamp>`.

---

## Global state — `~/.claude/`

### `~/.claude/profiles/builder.json` (shared bus)

- **Schema:** `skills/guide/schemas/builder-profile.schema.json`
- **Owner of shared.*:** cross-plugin (Cart / Vibe-Doc / Vibe-Sec / Vibe-Test)
- **Owner of `plugins.vibe-test.*`:** **this plugin only**
- **Writers:**
  - `src/state/profile.ts` via `writeProfile()` — only mutates `plugins.vibe-test` + updates `plugins.vibe-test._meta.<field>`
  - `skills/decay/SKILL.md` via Pattern #4 refresh — may update `_meta.<field>.last_confirmed`
- **Readers:**
  - Every command SKILL at entry (persona / mode / experience level)
  - `skills/router/SKILL.md` for greeting adaptation
  - `src/reporter/tier-adaptive-language.ts` for verbosity knobs
- **When:** read at every command start; written on onboarding and whenever a preference field changes or passes a decay TTL.
- **Atomicity:** `atomicWrite` (temp-rename).

### `~/.claude/plugins/data/vibe-test/profile.json` (plugin-local mirror)

- **Schema:** same shape as `plugins.vibe-test` namespace in the shared bus.
- **Writers / Readers:** `src/state/profile.ts`.
- **When:** kept in sync with the shared bus on writes; serves as a fallback if the shared profile is missing.

### `~/.claude/plugins/data/vibe-test/sessions/<YYYY-MM-DD>.jsonl`

- **Schema:** inline (see `spec.md > Data Model > sessions`).
- **Format:** append-only JSONL, one entry per command phase.
- **Writers:** `src/state/session-log.ts` via `skills/session-logger/SKILL.md` at command start (sentinel) and command end (terminal).
- **Readers:** `skills/evolve/SKILL.md`, `skills/posture/SKILL.md`, `/vibe-cartographer:friction` (cross-plugin).
- **Rotation:** filename is the date; no auto-compaction in v0.2.
- **Privacy:** local-only, no PII, no network.

### `~/.claude/plugins/data/vibe-test/friction.jsonl`

- **Schema:** inline (see `spec.md > Data Model > friction`).
- **Writers:** `src/state/friction-log.ts` via `skills/friction-logger/SKILL.md` at the trigger points declared in `skills/guide/references/friction-triggers.md`.
- **Readers:** `skills/evolve/SKILL.md`, `/vibe-cartographer:friction`.
- **Privacy:** local-only.

### `~/.claude/plugins/data/vibe-test/wins.jsonl`

- **Schema:** inline (see `spec.md > Data Model > wins`).
- **Writers:** `src/state/wins-log.ts` via `skills/wins-logger/SKILL.md` at the three capture moments (absence-of-friction inference, explicit success markers, external validation).
- **Readers:** `skills/evolve/SKILL.md` to weight proposed changes.
- **Privacy:** local-only.

---

## Per-project state — `<project>/.vibe-test/`

### `<project>/.vibe-test/state.json`

- **Schema:** `skills/guide/schemas/audit-state.schema.json` (rolls up classification + inventory snapshot + coverage snapshot + framework + CI status).
- **Writers:** `src/state/project-state.ts` invoked by audit + generate SKILLs.
- **Readers:** every command SKILL at entry; `skills/router/SKILL.md` for returning-vs-first-run detection.
- **When:** written at end of every audit and at notable transitions in generate (test accepted, framework changed).

### `<project>/.vibe-test/state/audit.json` (+ `history/` subfolder)

- **Schema:** `skills/guide/schemas/audit-state.schema.json`.
- **Writers:** `src/reporter/json-renderer.ts` invoked by audit SKILL.
- **Readers:** generate SKILL (blocking prereq), gate SKILL (reuses if fresh), posture SKILL (ambient read).
- **History:** every write copies prior into `<project>/.vibe-test/state/history/audit-<timestamp>.json`.

### `<project>/.vibe-test/state/coverage.json`

- **Schema:** `skills/guide/schemas/coverage-state.schema.json`.
- **Writers:** coverage + gate SKILLs via `src/reporter/json-renderer.ts`.
- **Readers:** gate SKILL, posture SKILL.

### `<project>/.vibe-test/state/generate.json`

- **Schema:** `skills/guide/schemas/generate-state.schema.json`.
- **Writers:** generate SKILL via `src/reporter/json-renderer.ts`.
- **Readers:** generate SKILL on re-run (accept/reject history), fix SKILL (for rollback of auto-written tests).

### `<project>/.vibe-test/state/covered-surfaces.json` (Vibe-Sec handshake)

- **Schema:** `skills/guide/schemas/covered-surfaces.schema.json`.
- **Writers:** audit SKILL after a successful run.
- **Readers:** Vibe Sec plugin (cross-plugin consumer).
- **Privacy contract:** contains route names and model names, not secrets.

### `<project>/.vibe-test/state/findings.schema.json` (Vibe-Sec input)

- **Schema:** `skills/guide/schemas/findings.schema.json` (input contract — validates `.vibe-sec/state/findings.jsonl` entries Vibe Test consumes).
- **Writers:** Vibe Sec.
- **Readers:** audit SKILL (for elevated-priority gap ordering), generate SKILL.

### `<project>/.vibe-test/state/last-dry-run.json`

- **Schema:** `skills/guide/schemas/generate-state.schema.json` with `dry_run: true`.
- **Writers:** generate SKILL under `--dry-run` (v0.2 item #8).
- **Readers:** `--apply-last-dry-run` handler within generate SKILL.
- **TTL:** 24 hours from write; expired dry-runs are discarded silently.

### `<project>/.vibe-test/pending/`

- **Purpose:** staged generated tests awaiting review (confidence 0.70 – 0.89).
- **Layout:** mirrors source tree (so `src/components/X.tsx` → `.vibe-test/pending/tests/components/X.test.tsx`).
- **Sidecar:** `pending/index.md` summarizes the batch (file list, confidence per test, HEAD hash at generation time).
- **Writers / Readers:** `src/generator/pending-dir-manager.ts`.
- **Cleanup:** promoted (to `tests/`) or discarded on accept / reject.

---

## Cross-plugin coordination — `<project>/.626labs/`

### `<project>/.626labs/beacons.jsonl`

- **Schema:** inline (see `docs/self-evolving-plugins-framework.md` Pattern #12).
- **Writers:** every command SKILL on terminal via `src/state/beacons.ts`.
- **Readers:** Vibe Cartographer / Vibe Doc / Vibe Sec for cross-plugin session stitching.
- **Format:** append-only JSONL; each entry names the plugin, command, sessionUUID, timestamp.

---

## Handoff artifacts — framework-agnostic

### `<project>/docs/TESTING.md`

- **Sections:** Overview, App Classification, Current Coverage Posture, How To Run, How To Add New Tests, Graduating To Next Tier, Ecosystem Recommendations.
- **Writers:** `src/handoff/testing-md-writer.ts` + `src/handoff/graduating-guide-writer.ts` + `src/handoff/ecosystem-section-writer.ts`.
- **Principle (H6):** contains no Vibe Test-specific imports; builder can uninstall the plugin and the runbook still works.

### `<project>/docs/test-plan.md`

- **Purpose:** chronological per-session log of classification decisions, confidence per test, accept/reject status, rejection reasons.
- **Writers:** `src/handoff/test-plan-writer.ts`.
- **Readers:** human builder + L2 feedback pipeline (extract rejection patterns).

### `<project>/docs/vibe-test/<command>-<date>.md`

- **Purpose:** markdown render of each command's `ReportObject`.
- **Writers:** `src/reporter/markdown-renderer.ts`.
- **Readers:** human builder; linked from `TESTING.md`.

### `<project>/.github/workflows/vibe-test-gate.yml` (opt-in)

- **Writers:** `src/handoff/ci-stub-writer.ts` only after a once-per-project opt-in prompt.
- **Content:** Node setup → `pnpm install` → `npx @esthernandez/vibe-test-cli gate --ci`.
- **Env placeholders:** any project env vars go in an explicit `env:` block with a comment pointing to repo secrets.

---

## Inputs Vibe Test reads but never writes

- `~/.claude/plugins/installed_plugins.json` — Pattern #15 resolution.
- `<project>/package.json` — framework detection, `dev` script probe.
- `<project>/vitest.config.ts` / `jest.config.js` — coverage adapter analysis.
- `<project>/.vibe-sec/state/findings.jsonl` — security-aware gap prioritization (EC5).
- Claude Code runtime `available-skills` list — composition dynamic discovery.

## Schema versioning contract

- Every JSON state file embeds `schema_version` (integer) as its first field.
- Every JSONL entry carries `schema_version` per-line (for mid-rotation resiliency).
- Migrations live at `src/state/migrations/<file>-v<N>-to-v<M>.ts` and are dispatched by `src/state/migrations/index.ts`.
- Migrations are idempotent — running twice is a no-op.
- Each migration writes `<path>.bak.<timestamp>` before mutating.
- Current versions (v0.2):
  - `builder.json` — 1
  - `state.json` — 1
  - `audit-state.json` — 1
  - `coverage-state.json` — 1
  - `generate-state.json` — 1
  - `findings.jsonl` — 1
  - `covered-surfaces.json` — 1
  - All JSONL logs — 1
