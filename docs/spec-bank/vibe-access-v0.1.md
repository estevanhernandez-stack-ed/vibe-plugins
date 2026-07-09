# Spec: vibe-access v0.1 — the agent-access pillar

**Status:** DESIGN-APPROVED, brainstormed 2026-07-09. Cowpath already walked 3× by hand (626 Labs dashboard — strongest, RoRoRo — staged, plus other MCP implementations across the estate). This spec is executable from paper; the 626 dashboard layer is the reference implementation to extract from, not a test target.

## The job

Every serious app in the estate eventually grows an agent-facing access layer: structured endpoints mapped so an agent can drive the app during build (smoke tests, screenshots, marketing prep) and after ship (surprise features for IDE-using users), eventually formalizing into an MCP server. The arc is *agent affordances → agent-facing API → MCP server*, and it has been walked by hand three times. vibe-access owns the middle of that arc: it scaffolds the dev-time access layer and the manifest that describes it. MCP graduation stays a deliberate, manual act (a later version or sibling may own it) — same philosophy as canary→stable promotion.

Measured wins from the hand-built layers: shortened smoke-test time, automated screenshot capture for marketing, agent-driven feature verification during build, and post-ship agent usability. Combined with Playwright it is the single highest-leverage build-time tool in the estate.

## Scope decisions (locked during brainstorm)

1. **Core job:** scaffold the access layer only. No MCP server generation in v0.1.
2. **Stacks:** adapters for stacks proven on real estate apps, plus an agnostic LLM-driven fallback. The agnostic path is also the adapter-birthing path — every agnostic run captures notes that seed the next real adapter. The plugin grows a stack every time it's used somewhere new.
3. **Layer shape:** manifest-first over existing routes; scaffold new purpose-built affordance endpoints only where the needs-checklist shows a gap.
4. **Prod posture:** two tiers. `dev` tier (seed/reset/state-capture) is env-gated and never ships. `prod-safe` tier (read/act within a real user's own auth) can ship deliberately — the embryo of the eventual MCP server and the surprise-features story.
5. **Verify:** v0.1 includes an agent-driven `:verify` step. The layer isn't done until an agent has driven the app through it cold.

## Repo + plugin shape

- Solo repo `vibe-access` (kebab-case, public, `estevanhernandez-stack-ed/vibe-access`), plugin at `plugins/vibe-access`.
- Plugin manifest at `.claude-plugin/plugin.json` — the only loader-recognized location (vibe-prompt v0.7.0 incident).
- Canary = solo `main`; stable = marketplace ref pin after dogfood proves it. The 15th family plugin.
- Family conventions at birth: no telemetry, session-logger + friction-logger + `:evolve-access` from day 1, state in `.vibe-access/` in the target app, real-app validation before ship.

## Command surface

Bare `/vibe-access` router: reads `.vibe-access/` state, recommends the next step, hands off to bootstrap on first run. Never auto-fires a mutating step.

Bootstrap (internal, idempotent): captures app type, stack, base URL(s) per env, dev-run command, auth model summary → `.vibe-access/config.json`.

Step commands:

- **`:scan`** — inventory routes, server actions, API handlers, and the auth model → `.vibe-access/state/inventory.json`. Read-only. Anything it can't classify lands in an `unmapped[]` list — never silently dropped.
- **`:map`** — inventory → `agent-access.json` manifest (schema below). Read-only against app source. Re-runnable; preserves manual tier overrides across runs.
- **`:scaffold`** — diffs the manifest against the affordance needs-checklist (below); generates purpose-built routes only for gaps, via stack adapter or agnostic path. Writes with backup + rollback (vibe-prompt:remediate pattern).
- **`:verify`** — cold-agent pass: reads the manifest only (no source access), exercises every affordance, Playwright screenshot for `capture`-kind, per-affordance pass/fail → `.vibe-access/verify/run-<id>.json` + dated report in `docs/vibe-access/`. Stamps results back into the manifest.

Satellites: `:guide`, `:evolve-access`, friction-logger, session-logger.

## The manifest — the load-bearing contract

`agent-access.json` at the target app root (location configurable), schema-versioned (`schemaVersion`). Extract the initial schema by studying the 626 Labs dashboard MCP layer — the strongest hand-built implementation. That extraction is the cowpath-capture step and is step one of the build.

Top level: app name, `schemaVersion`, per-env base URLs, stack adapter used, generated-at, discovery route (if enabled).

Per affordance:

| Field | Meaning |
|---|---|
| `id`, `description` | stable slug + what it does, written for an agent reader |
| `tier` | `dev` \| `prod-safe` |
| `kind` | `read` \| `act` \| `seed` \| `reset` \| `capture` |
| `transport` | HTTP method + path, or server-action ref |
| `input` / `output` | JSON schema for params and response shape |
| `auth` | requirement: none (dev-gated) / session / token — never secrets themselves |
| `sourceRef` | file:line of the implementing code |
| `origin` | `existing` \| `scaffolded` |
| `verified` | last verify result + timestamp, or `unverified` |

Optional discovery route: a dev-only endpoint (e.g. `/api/agent/manifest`) serving the manifest so any agent can find the layer cold. The future MCP graduation reads this same manifest — one artifact across the whole lifecycle.

## Affordance needs-checklist (drives `:scaffold`)

Can an agent, through the manifest alone: (a) **seed** representative data, (b) **reset** to a known state, (c) **read** app state relevant to verification, (d) reach every **capture**-worthy view (screenshot-ready states), (e) **act** as a user through the app's real flows? Each unmet need with no existing route → a scaffold candidate, presented before writing.

## Adapters + the agnostic path

Adapter seam (vibe-lingual's pattern), one module per stack:

- `detectRoutes()` — enumerate routes/actions from source
- `detectAuth()` — identify the auth model and how affordances should declare it
- `scaffoldAffordance(spec)` — generate an idiomatic route for this stack
- `gateMechanism()` — the stack-correct env gate for dev-tier routes

v0.1 ships **one real adapter**: the stack of the dogfood app. The agnostic path is LLM-driven against the same four-function output contract; every agnostic run writes `adapter-notes/<stack>.md` in the plugin's data home recording what it had to discover (route conventions, gating idiom, auth shape). Promotion of notes → real adapter happens via `:evolve-access`.

## Two-tier gating (security invariants)

- Dev tier: scaffolded behind a stack-appropriate env gate; hard 404 in production builds. Verify refuses non-local base URLs unless explicitly forced.
- Prod-safe tier: only affordances acting within the caller's own real auth — no privilege escalation, no service-role shortcuts.
- **Mechanical refusal:** the scaffolder will not tag `seed` / `reset` / `capture` kinds as `prod-safe`. Not a warning — a refusal.
- No secrets in the manifest, ever. Auth is declared by requirement type only.
- vibe-sec handoff banner fires whenever prod-safe affordances exist, before any graduation or deploy.

## Error handling

- `:scan`: unknown constructs → `unmapped[]`, reported in the summary. No silent caps.
- `:scaffold`: backup before write, rollback command, per-affordance review before apply.
- `:verify`: never mutates anything reachable at a non-dev URL; `seed`/`reset` affordances only exercised against local/dev targets. Unverified affordances stay visibly `unverified` in the manifest — fail closed.

## Testing + dogfood

- Unit tests: manifest schema validation, inventory parsing, adapter seam contract, tier-gating refusal rules, backup/rollback.
- Reference extraction: derive the manifest schema from the 626 dashboard layer; sanity-check by hand-writing that app's manifest against the schema.
- Dogfood: run the full scan → map → scaffold → verify arc on an app that has **no** layer yet — **WeSeeYouAtTheMovies** (chosen 2026-07-09; its stack becomes the v0.1 adapter) — so the plugin proves it can birth a layer from nothing. Real-app validation is the family bar; structural-green != works (vibe-lingual caught real bugs at every scale because it dogfooded).

## Name

`vibe-access`. One word after the hyphen like every sibling; "AI" is implied by the family; reads right in the command surface (`/vibe-access:scan`). Rejected: `vibe-ai-access` (redundant).

## Out of scope for v0.1

- MCP server generation (the graduation step) — later version or sibling.
- Desktop (.NET) and Roblox transports — no HTTP surface by default; needs its own design.
- Persistent agent smoke-suite artifact generation (the `:verify` output as a rerunnable suite) — strong v0.2 candidate.
- npm/package publication of any shared code — plugin-only.
