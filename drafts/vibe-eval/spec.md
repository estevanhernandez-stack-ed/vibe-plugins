# Vibe-Eval — design spec (v0.1)

**Status:** Draft, brainstormed 2026-05-28 in continuity with the vibe-prompt cowpath findings on Celestia3.
**Repo target:** Solo repo `Vibe-Eval`, plugin path `plugins/vibe-eval`. Marketplace ref bump after first stable tag.
**Tagline:** *Test your LLM prompts against the actual production models, with honest evaluator-drift warnings.*

---

## 1. Identity

Vibe-Eval is the **behavioral counterpart** to vibe-prompt. Where vibe-prompt audits prompt structure statically, vibe-eval runs the prompts against the actual production models, compares outputs against a baseline, and surfaces where the evaluator (the LLM driving vibe-eval itself) might be giving the user a false read of production behavior. The killer feature is the **evaluator-drift warning**: every LLM-judge finding ships with a footer naming the agent that produced it and warning that its read may be biased toward its own style.

Sits parallel to vibe-prompt in the family: same target apps, complementary concerns. vibe-prompt reads source; vibe-eval makes API calls. Different infrastructure needs (vendor SDKs, API keys, cost budgets, consent gates) justify a separate plugin — preserves vibe-prompt's "zero API keys, runs offline, ships fast" property.

## 2. Out of scope (v0.1)

- **`:pick` mode** (cross-vendor model selection for greenfield prompts without an existing app client). v0.2.
- **`:backup-test` mode** (test app's configured fallback against the primary). v0.2.
- **OpenAI vendor implementation.** v0.1 ships the abstraction but only Gemini + in-session agent. OpenAI lights up in v0.2 when an OpenAI-stack cowpath app emerges.
- **Generated-runner-script fallback** (for apps where keys are vaulted and can't be supplied to vibe-eval). v0.2.
- **OS keychain integration.** v0.1 uses env vars only.
- **CI/cron context support** (running vibe-eval outside a Claude Code session). v0.2.
- **Composer auto-detection.** v0.1 captures the composer pattern via first-run interview; the auto-detect heuristic comes in v0.2.

## 3. Evidence base

Brainstormed in continuity with the vibe-prompt cowpath audit of Celestia3 (`drafts/vibe-prompt/process-notes.md` + `Vibe-Prompt/plugins/vibe-prompt/skills/audit/references/smell-rubric-f1-f7.md`). Key findings that motivate vibe-eval v0.1:

- **Voice contradictions** (F2) like Celestia3's `natal_interpretation` instructing the model to call the user "Fellow Pilgrim" despite the global directive's ban. Whether Gemini actually leaks "Pilgrim" in production is unknowable from static audit — needs behavioral test.
- **The composer matters.** Celestia3's `gemini.ts:54-153` stacks persona + directive + format + knowledge + task on every call. Testing the raw registry prompt content misses what the model actually receives. Vibe-eval has to mimic the composer to be honest.
- **Hardcoded model identifiers** (F6) ripple through 3 sites in Celestia3. When the user bumps `gemini-3.5-flash` to a candidate next-version, they need parity verification before swap — that's vibe-eval's upgrade-test mode.

The vibe-eval cowpath itself runs on Celestia3 too — pick one or two of the F2 findings (the `natal_interpretation` Pilgrim contradiction is the highest-signal candidate), smoke-test by hand against gemini-3.5-flash + in-session Claude baseline, capture process-notes as `drafts/vibe-eval/process-notes.md` when the implementation pass begins.

## 4. v0.1 surface

### `/vibe-eval:run`

The core harness. Two operating modes:

- **`--mode drift`** (default) — runs each prompt in inventory against the production model AND the in-session agent baseline; comparator surfaces gaps; LLM-judge layer adds semantic read with explicit evaluator-drift warning. Cost: ~$0.05-0.20 per full sweep for a 10-15 prompt app.
- **`--mode upgrade-test --candidate <model>`** — runs each prompt against the current production model AND the named candidate (e.g., `gemini-3.0-flash`). Surfaces regression risk before swap. Same cost shape; no Claude baseline call needed (saves ~30%).

Reads `.vibe-prompt/state/inventory.json` if present (vibe-prompt installed and run); otherwise prompts user to point at a manual inventory file conforming to the vibe-prompt inventory schema at `Vibe-Prompt/plugins/vibe-prompt/schemas/inventory.schema.json`. v0.1 does not ship an inventory-construction interview of its own — vibe-prompt is the assumed source. Writes `.vibe-eval/state/run-<YYYY-MM-DD-HHMM>.json` (full per-prompt results) + a human-readable `docs/vibe-eval/report-<YYYY-MM-DD-HHMM>.md` (the dashboard).

### `/vibe-eval:radar`

Read-only digest of what's new in the model space for vendors the app uses. Reads inventory.json to find vendors (Celestia3 → Gemini); queries vendor-news sources (context7 + Google AI blog + Anthropic news + OpenAI blog); renders a digest of newly announced or deprecated models. Cached weekly under `.vibe-eval/cache/radar.json`. Zero LLM calls at run time. Natural handoff: *"gemini-3.0-flash announced 2026-05-15 → run `/vibe-eval:run --upgrade-test gemini-3.0-flash` to verify parity."*

### `/vibe-eval` (bare router)

State-aware. Detects whether the user has run vibe-eval before, whether there's a fresh run, whether the radar cache is stale. Routes to the most-useful-next-step. Same pattern as vibe-prompt's bare router. Never auto-executes anything cost-incurring.

### Internal (not user-invoked)

- `guide`, `session-logger`, `friction-logger`, `evolve-eval` — same shape as vibe-prompt + vibe-iterate.

## 5. Implementation: composer-mimic + vendor SDKs + agent self-ID

### 5.1 Driving the production model

vibe-eval does NOT call into the target app's process or proxy. Instead it **mimics the composition** locally and calls the vendor API directly.

**First-run interview** (per target app, captured once):

- *"Point me at your composer file — the code that assembles the final prompt the model sees."* For Celestia3, this is `src/lib/gemini.ts`.
- vibe-eval reads the composer source and produces a structured description: which layers are stacked (directive, persona, knowledge injection, JSON-mode toggle, task instruction, chaos protocol), in what order, with what triggers.
- Confirms with user: *"For a call with `systemInstruction='X'` and `contents=Y`, the model actually receives this composed text: <preview>. Confirm?"*
- Caches the composer pattern at `.vibe-eval/composer.json`.

At run time, vibe-eval applies the cached composer pattern to each prompt + fixture pair, produces the actual composed text, sends it to the production model via the vendor SDK.

**Trade-off:** v0.1 doesn't catch proxy-side behavior (rate limits, request transformations, auth-time injections). For Celestia3 specifically, the Firebase Functions proxy is a pass-through — bypass is safe. v0.2 adds proxy-aware mode for apps where the proxy modifies the request.

**Apps without a composer.** When the inventory shows prompt sites that send raw content directly to the model with no composition layer in between (common for simple Python scripts, direct `client.messages.create({system: "...", messages: [...]}` calls), the first-run interview captures `composer = identity`. At run time, vibe-eval sends the prompt content directly to the model with no additional stacking. The composer-mimic step is a no-op in those cases; the rest of the harness behaves identically.

### 5.2 Vendor SDKs

Plugin ships with a `VendorClient` interface and implementations:

| Implementation | v0.1 status | Notes |
|---|---|---|
| `GeminiClient` (uses `@google/genai`) | shipped | Reads `GEMINI_API_KEY` from env |
| `InSessionAgentClient` | shipped | Dispatches subagent in the current Claude Code session; no external API key |
| `OpenAIClient` (uses `openai`) | skeleton/stub | Implementation deferred until first OpenAI cowpath app |

The dispatcher picks the right client based on the inventory's detected provider per prompt site, OR user override in `.vibe-eval/config.json`.

### 5.3 Agent self-identification

vibe-eval is **agent-aware** — adapts the evaluator-drift framing to whichever LLM-driven CLI is running it.

**Detection (best-effort, multi-signal in order):**

1. Env vars: check for `CLAUDE_CODE_*`, `CURSOR_*`, `CLINE_*`, `GEMINI_CLI_*`, etc.
2. Marker files: check `~/.claude/`, `~/.cursor/`, etc. for known installation directories.
3. Parent process inspection (where the OS allows).
4. Fallback: first-run interview asks the user *"Which agent is running this? Claude Code / Cursor / Cline / Gemini CLI / other (specify)"* and caches the answer at `.vibe-eval/agent.json`.

**Adapt the framing per detected agent:**

- If `agent.name = "Claude Code"` and `agent.model = "Claude Opus 4.7"` and `prod_model = "gemini-3.5-flash"`: cross-vendor drift. Warning: *"This baseline was Claude Opus 4.7, the agent driving vibe-eval. Your prod model is gemini-3.5-flash, a different vendor's model. Claude may be biased toward outputs that match Claude's training style; verify high-severity drift findings against real users or an A/B test."*
- If `agent.name = "Cursor"` running Gemini and `prod_model = "gemini-2.5-flash"`: intra-vendor drift. Warning: *"This baseline was Gemini 2.5 Pro (your evaluator). Your prod model is gemini-2.5-flash, same vendor different model. The drift signal here reflects intra-vendor version differences, not cross-vendor bias — interpret accordingly."*
- If unknown agent: surface as "unknown agent runtime" and ask the user to verify drift findings manually.

The LLM-judge prompt receives the detected agent identity as input and introduces itself in the judge output: *"I'm [agent + model]. I read both outputs and here's what I noticed..."*

### 5.4 Composer for v0.1 cowpath app (Celestia3)

The composer-mimic for Celestia3 needs to model:

1. `DEFAULT_DIRECTIVE.persona` prepended
2. `[MASTER DIRECTIVE]` block with `DEFAULT_DIRECTIVE.masterDirective`
3. `[DEFAULT FORMAT]` OR `[FORMAT DIRECTIVE]` based on JSON-mode auto-detection (presence of "json" in systemInstruction or contents)
4. Knowledge injection: `KnowledgeService.getSmartLore(['Sun','Moon','Mercury'], 'wisdom')` if `isKnowledgeSyncEnabled` else `getHermeticPrimer()`
5. `[TASK SPECIFIC INSTRUCTIONS]` with the call's systemInstruction
6. `[THE CHAOS PROTOCOL: ACTIVE]` if `allowEntropy = true`

The plugin doesn't need to call `KnowledgeService` — it can capture the static text once and store in `.vibe-eval/composer.json`. If the user updates knowledge content, they re-run the first-run interview.

## 6. The comparator (mechanical + LLM-judge)

Two layers, run in order, surfaced independently in the dashboard.

### 6.1 Mechanical layer

Deterministic, free, fast. Catches gross drift:

| Check | Severity if fires |
|---|---|
| Output schema mismatch (one JSON, one prose) | high |
| Required-key absence in JSON output | high |
| Length delta > 50% | medium |
| Token count delta > 100% | medium |
| Hard-fail (one model errored, other succeeded) | high |
| Output empty / whitespace-only | high |

Mechanical layer findings always appear in the dashboard.

### 6.2 LLM-judge layer

Optional (toggle with `--no-judge`). Claude (or whichever in-session agent) reads both outputs and names semantic differences:

- Persona drift (e.g., "Output B addresses the user as 'Pilgrim'; Output A uses 'you'")
- Voice tone differences
- Topic adherence (e.g., "Output A answered the question; Output B drifted into a related topic")
- Output structure (e.g., "Output A uses headers; Output B is one paragraph")
- Length appropriateness vs the prompt's explicit constraints

**Every LLM-judge finding ships with the evaluator-drift footer:**

> *Note: This finding came from [agent name + model] reading both outputs. The evaluator may be biased toward outputs that match its own style. Verify high-severity flags with a sample user, an A/B test, or by reading the outputs yourself before acting.*

The judge prompt is itself a registered prompt of the plugin — versioned, tunable via `evolve-eval`, and runs through the same composer-aware pipeline if the user has one configured.

## 7. State, paths, conventions

In the target app:

| Path | Owner | Purpose |
|---|---|---|
| `.vibe-eval/config.json` | user (first-run interview) | Vendors to test, default models per vendor, fixture paths, cost ceilings |
| `.vibe-eval/composer.json` | first-run interview | Per-app composer pattern |
| `.vibe-eval/agent.json` | first-run detection or interview | Detected/declared agent identity |
| `.vibe-eval/fixtures/<prompt-id>.json` | user (optional override) | User-provided fixtures (override synthesized) |
| `.vibe-eval/state/run-<timestamp>.json` | `:run` | Full per-prompt results, structured |
| `.vibe-eval/cache/radar.json` | `:radar` | Cached vendor-news digest (weekly refresh) |
| `docs/vibe-eval/report-<timestamp>.md` | `:run` | Human-readable dashboard |

`.vibe-eval/` is gitignore-recommended (state is per-developer; may contain prompt outputs that could leak production data). `docs/vibe-eval/` is intended to commit (dashboards are evidence artifacts).

Self-evolution data lives at `~/.claude/plugins/data/vibe-eval/` (sessions.jsonl + friction.jsonl), per family convention.

## 8. Security model

### Hard rules

1. **vibe-eval reads API keys from environment variables only.** Never persists them anywhere. Hard rule in the guide SKILL.
2. **Keys are never echoed, logged, or written to state/log files.** Even in error messages, key values are redacted to last-4-chars.
3. **Pre-run guardrail:** before reading any state file, vibe-eval grep-scans it for known key patterns (`AIza...`, `sk-ant-...`, `sk-...`). Refuses to start if a state file contains what looks like a key, and instructs the user to remove + rotate.

### Required env vars by mode

| Mode | Required env vars | Optional env vars |
|------|-------------------|--------------------|
| Drift mode against Gemini | `GEMINI_API_KEY` | None — in-session agent provides Claude baseline |
| Upgrade-test mode against Gemini | `GEMINI_API_KEY` | None |
| Drift mode with explicit Anthropic baseline (v0.2) | `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` | — |

### Compose with vibe-sec

If `vibe-sec` is installed in the same target app, vibe-eval defers all key-detection regex to it (cross-plugin composition). Otherwise vibe-eval ships its own minimal pattern set.

### Cost gates

- Pre-run estimate: vibe-eval shows projected token count + cost across all calls before running. User confirms with one click.
- Hard ceiling: user can set `costCeiling` (USD) in `.vibe-eval/config.json`. Plugin aborts mid-run if exceeded; partial results saved.
- Default ceiling on first run: `$2.00` per `:run` invocation. Overridable.

## 9. Self-evolution hooks

Same pattern as the family (vibe-doc, vibe-iterate, vibe-walk, vibe-prompt):

- `~/.claude/plugins/data/vibe-eval/sessions.jsonl` — two-phase session log
- `~/.claude/plugins/data/vibe-eval/friction.jsonl` — append-only friction signals
- `:evolve-eval` reads both, weights, writes `docs/proposed-changes.md` in the solo repo. Never auto-applies.

Friction triggers specific to vibe-eval:

| Trigger | Confidence | When |
|---------|-----------|------|
| `cost-ceiling-exceeded` | high | Run aborted because user's ceiling was hit |
| `composer-mimic-confirmation-required` | medium | User had to manually correct the captured composer (signal: auto-detect heuristic is needed in v0.2) |
| `agent-detection-fallback-to-interview` | medium | Self-id failed all detection signals and had to ask user |
| `vendor-sdk-not-installed` | high | Plugin needed a vendor SDK that isn't bundled (e.g., OpenAI in v0.1) |
| `llm-judge-finding-dismissed-as-bias` | low | User flagged a judge finding as "this is just Claude bias, not real drift" — signal that the judge needs tuning |

## 10. Validation plan (cowpath)

Per the family standard: cowpath on a real app, narrate every decision, distill the spec from real evidence.

- **v0.1 cowpath app: Celestia3** (same target as vibe-prompt's cowpath). Pick **`natal_interpretation`** (the Pilgrim-contradiction prompt) as the first cowpath finding to drive end-to-end:
  1. Hand-synthesize one fixture: `{name: "Maya Okafor", chartData: <sample chart>}`
  2. Apply the Celestia3 composer (model directive + persona + knowledge + task)
  3. Call `gemini-3.5-flash` directly with the composed text
  4. Call Claude Opus 4.7 (in-session) with the same composed text
  5. Compare outputs mechanically (schema, length, key presence)
  6. Run the LLM-judge with explicit evaluator-drift warning
  7. Render the dashboard
  8. Capture every decision into `drafts/vibe-eval/process-notes.md`
- **Round-trip target:** the cowpath finding becomes the gold-standard test. v0.1 ships when the plugin reproduces the hand-built run end-to-end.

- **Secondary validation app:** TBD post-v0.1 (an OpenAI-stack or Anthropic-stack app to exercise the vendor abstraction).

## 11. Versioning + tag naming

- Tag scheme: plain `vX.Y.Z` (matches vibe-prompt, vibe-walk, vibe-iterate).
- First stable: `v0.1.0`.
- Marketplace promotion: stable channel after v0.1.0 ships + dogfoods on Celestia3.

## 12. Future scope (out of v0.1)

- **v0.2:** OpenAI vendor implementation; explicit Anthropic baseline (external API key); `:backup-test` mode; auto-detect composer pattern from source; OS keychain integration; CI/cron context support.
- **v0.3:** `:pick` mode (cross-vendor model selection for greenfield prompts, requires interview-driven scope capture).
- **v0.4+:** stack coverage expansion to Python apps (anthropic, openai, google-generativeai SDKs); fixture capture from production log/grimoire stores.

## 13. Open questions for the spec review

- **Fixture synthesis quality:** Day-1 synthesized fixtures may be unrealistic. Should v0.1 ship a "review your synthesized fixtures before run?" gate so the user can tune them in-session, or trust the synth and let the dashboard surface "low-realism" warnings? Default proposal: trust the synth, let the report surface the synth-vs-user-provided-fixture mix in the dashboard summary so the user sees realism % at a glance.
- **In-session agent rate limits:** dispatching N subagents for N prompts × baseline + judge calls could hit session-level rate limits or budget caps. Should `:run` batch-throttle these? Default proposal: yes — dispatch sequentially with a brief delay (~200ms) between subagents; expose `--parallel <N>` for users who want to risk it.
- **Composer interview depth:** the first-run interview captures the composer pattern but a sophisticated composer (knowledge injection, conditional branches) needs more than a single confirmation step. Default proposal: v0.1 interview captures the structural shape (which layers, in what order) and asks the user to paste the actual injected text for any layer the heuristic can't extract. v0.2 auto-detects.
- **Dashboard delta vs full results:** the report markdown can grow large. Should v0.1 ship a per-prompt detail view (one prompt per file) or one big report? Default proposal: one big report with collapsible-by-id sections; reading flow stays simple, machine-readable per-prompt detail lives in `run-<timestamp>.json`.
