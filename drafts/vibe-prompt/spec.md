# Vibe-Prompt — design spec (v0.1)

**Status:** Draft, paved from cowpath on Celestia3 (2026-05-28). See [`process-notes.md`](./process-notes.md) for the source evidence.
**Repo target:** Solo repo `Vibe-Prompt`, plugin path `plugins/vibe-prompt`. Marketplace ref bump after first stable tag.
**Tagline:** *Audit, organize, and classify the LLM prompts shipped in your app.*

---

## 1. Identity

Vibe-Prompt is the **static prompt audit + organization layer** for vibe-coded apps that ship LLM features. It scans the app's source for every prompt site (registry-tracked and inline), names the structural smells, and recommends a reorg. It is read-only by default — no code mutation, no behavioral testing.

Sits parallel to Vibe-Doc / Vibe-Sec / Vibe-Test / Vibe-Walk in the family: each is the eval/audit/organize layer for one concern in a vibe-coded app. Vibe-Prompt's concern is **prompts**.

## 2. Out of scope (v0.1)

- **Behavioral eval.** Vibe-Prompt does not run prompts, does not score outputs, does not measure quality of generated text. That's `vibe-eval`, a separate future plugin.
- **Auto-mutation.** Vibe-Prompt does not rewrite prompts, does not migrate inline strings into a registry. It produces a plan; the user (or Vibe-Cartographer) applies it.
- **Token-cost benchmarking against production logs.** Static estimate of prompt token weight only, not real cost data.

## 3. Cowpath evidence

Paved on Celestia3 (Next.js + Firebase Functions + Gemini). One pass surfaced **7 distinct smell categories** that became the audit rubric (see §5), **15 prompt sites across two classes** (6 registry-tracked + 9 inline), **8 distinct persona labels** for one brand voice, and a **hardcoded model identifier (`gemini-3.5-flash`) that isn't a published Google model** — all from a single read. The cowpath validates the v0.1 surface as worth shipping.

## 4. v0.1 surface

Two commands plus the bare router.

### `/vibe-prompt:scan`

Inventory pass. Finds every prompt site in the target app. Writes `.vibe-prompt/state/inventory.json`. Outputs a markdown summary banner: how many prompts found, where they live (registry vs inline), how many distinct personas.

### `/vibe-prompt:audit`

Structural pass. Reads `inventory.json`. Flags the 7 smell categories (§5). Severity-tagged (high / medium / low). Writes `.vibe-prompt/state/audit.json` + a human-readable `docs/vibe-prompt/audit-YYYY-MM-DD.md` in the target app. Each finding includes: smell category, evidence (file paths + line numbers), severity, and one-line recommendation. No fixes applied.

### `/vibe-prompt` (bare router)

State-aware. If no inventory cached → run `:scan` after confirming. If inventory fresh but no audit → recommend `:audit`. If audit fresh and clean → posture summary. Never auto-runs anything destructive; the audit + scan are both read-only so the router can run them on confirm.

### Internal (not user-invoked)

- `session-logger`, `friction-logger`, `guide` — per the Self-Evolving Plugin Framework. Same shape as Vibe-Doc / Vibe-Iterate / Vibe-Walk.
- `:evolve-prompt` ships in v0.1 but is L3 self-evolution machinery, not the user-facing eval pillar.

## 5. The 7 audit smells (the rubric)

Numbered F1-F7 from the cowpath evidence:

| # | Smell | What :audit looks for |
|---|---|---|
| **F1** | Registry exists, isn't enforced | A prompt registry or central store is detected, AND inline `systemInstruction` / `system` literals exist outside it. |
| **F2** | Voice contradicts itself across the composition stack | Persona/voice rules declared in one prompt are violated by another that gets stacked on top (e.g., global "never call user X" + task prompt that calls user X). Requires *semantic* read, not regex. |
| **F3** | Version drift inside the registry | Multiple prompts in the registry have `version` field but the values diverge by major numbers without a coordinated bump policy. |
| **F4** | Naive templating | `.replace(/\{\{var\}\}/g, val)` or equivalent string-sub is used without validation that all required vars were filled. Risk of leaking unfilled placeholders to the model. |
| **F5** | Persona fragmentation | More than N (default 3) distinct persona labels detected for what appears to be one brand voice. Surfaced as a single finding with the full inventory. |
| **F6** | Hard-coded model identifier | Model name string repeated in N+ places (default 2), OR matches a known-typo pattern (e.g., `gemini-3.5-flash` when no such published model exists). |
| **F7** | Hybrid call sites | Within one file, some call sites fetch from the registry and others use inline strings. Worst-of-both-worlds inconsistency. |

Severity defaults: F1 high, F2 high, F4 high, F6 high, F7 medium, F3 medium, F5 low. Tunable per project.

## 6. Detection heuristics (`:scan`)

For v0.1 stack coverage (TS/JS + Python):

**TS/JS markers:**
- AST-or-regex matches on `generateContent`, `messages.create`, `chat.completions.create`, `client.complete`, `invoke` (with model context).
- Template strings ending in patterns like `You are...`, `You must...`, `Your role is...`, `Respond as...`.
- Files matching `**/{prompts,templates,system,instructions}/**` or named `*Prompts.ts` / `*Prompt.ts` / `ConfigService.*`.
- Default export const objects keyed by id with `content` and `category` fields → registry signature.

**Python markers:**
- `client.messages.create`, `client.chat.completions.create`, `model.generate_content`, `model.invoke`.
- Triple-quoted strings ending in `"""You are...` patterns.
- Modules named `prompts.py`, `templates.py`, `system_prompts.py`.

**Registry detection heuristic:** if `:scan` finds a const/object keyed by id with `{ id, content, category, version }` fields, treat as a registry. Mark every other prompt site as "inline" relative to it.

**Persona extraction:** regex first-pass on `You are (the |a |an )?([A-Z][^.,;]+)` — extract the noun phrase, dedupe, normalize. Imperfect but cheap; flagged as "best-effort" in the report.

## 7. Classification dimensions (used internally by `:audit`)

Even though the user-facing `:classify` command ships in v0.2, `:audit` needs to classify internally to compute F2 (voice contradiction) and F5 (persona fragmentation). Dimensions:

- **Category:** `voice | interpretation | ritual | daily | tool | chat` (extensible)
- **Output shape:** `prose | json-object | json-array | multimodal-in`
- **Voice-bearing?:** does the prompt define persona/tone, or assume it from upstream?
- **Templated?:** what `{{vars}}` are required?
- **Location class:** `registry | inline-component | inline-service | server-route`
- **Estimated token weight:** rough static count (prompt text only, before user input — composition stacking is a separate computation)
- **Fallback present?:** does the call site degrade gracefully on LLM failure?

## 8. Interview gates

Vibe-Prompt asks only when the source can't answer:

- After `:scan`, if registry + inline both detected: *"Should `:audit` treat inline prompts as drift to flag (F1 high), or as intentional escape hatches (F1 demoted)?"*
- If F5 fires: *"Is the multi-persona inventory intentional (multiple products / multiple personas by design), or is this drift (one brand voice)?"*

Never asks about anything derivable from code.

## 9. State, paths, conventions

In the target app:

| Path | Owner | Purpose |
|---|---|---|
| `.vibe-prompt/state/inventory.json` | `:scan` | Single source of truth for prompt sites. |
| `.vibe-prompt/state/audit.json` | `:audit` | Last audit findings, severity-tagged, machine-readable. |
| `docs/vibe-prompt/audit-YYYY-MM-DD.md` | `:audit` | Human-readable report. Dated so historical audits are diffable. |

State is local-only. No telemetry. No upload to anything.

`.vibe-prompt/` is gitignore-recommended (state is per-developer); `docs/vibe-prompt/` is intended to commit.

## 10. Self-evolution hooks

Per the family pattern (Vibe-Doc / Vibe-Iterate / Vibe-Walk). `~/.claude/plugins/data/vibe-prompt/`:

- `sessions.jsonl` — two-phase session log per `:scan` / `:audit` invocation
- `friction.jsonl` — append-only friction signals (registry not found in expected location, model name unrecognized, heuristic missed a known prompt site the user pointed at, etc.)
- `:evolve-prompt` reads both, weights, writes `docs/proposed-changes.md` in the solo repo. Never auto-applies.

## 11. Validation plan

Per the family standard ("every plugin proven against a real app before it ships"):

- **v0.1 validation app: Celestia3** (the cowpath itself). The 7 findings above must round-trip — `:scan` must find all 15 sites, `:audit` must flag F1-F7 with the same severity, audit report should match the manual cowpath findings within a reasonable margin.
- **Secondary validation app:** TBD post-v0.1 (a Python-stack app to prove cross-stack heuristics).

## 12. Versioning + tag naming

- **Tag scheme:** plain `vX.Y.Z` (matches Vibe-Walk / Vibe-Cart / Vibe-Iterate / Vibe-Doc, not the `<plugin>-vX.Y.Z` variant Test + Sec use).
- **Versioning:** v0.1.0 first stable. Bumps follow the marketplace conventions in `vibe-plugins/CLAUDE.md`.
- **Marketplace promotion:** stable channel gets the bump after v0.1.0 ships + dogfoods on Celestia3.

## 13. Future scope (out of v0.1, on the roadmap)

- **v0.2:** `/vibe-prompt:classify` as a standalone user-invocable command (today it's internal to `:audit`).
- **v0.3:** `/vibe-prompt:reorg` — generates a migration plan (id naming, persona collapse, inline → registry move).
- **v0.4+:** stack coverage expansion (Go, Rust).
- **Separate plugin:** `vibe-eval` for behavioral testing — runs prompts against fixtures, scores outputs, regression-checks across model upgrades.

## 14. Open questions for the spec review

- **Heuristic confidence threshold:** what % of "best-effort" persona extractions is acceptable before the audit demotes F5 to "advisory only"? Default proposal: if >40% of persona labels come from regex fallback rather than declared registry persona fields, F5 is advisory.
- **Registry-not-found case:** if `:scan` finds inline prompts but no registry at all, is that F1 (drift from a missing registry) or "no registry yet" (different finding entirely)? Default proposal: separate finding, F1b ("no central registry detected") — informational severity, with a recommendation to create one.
- **Cross-file persona stacking:** for F2 (voice contradiction), how far does the agent trace the composition stack? Default proposal: one-hop only in v0.1 (read the immediate prompt + the global directive that gets prepended). Deeper graph analysis is v0.2 work.
