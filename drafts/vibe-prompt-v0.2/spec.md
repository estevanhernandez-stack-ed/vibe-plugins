# Vibe-Prompt v0.2 — design spec

**Status:** Drafted 2026-05-28 as architectural correction to the v0.1 ship + the Vibe-Eval solo-repo build. Supersedes `drafts/vibe-eval/spec.md` (which becomes historical reference, not active design).
**Repo target:** Existing `Vibe-Prompt` solo repo at `C:\Users\estev\Projects\Vibe-Prompt` (already shipped v0.1.0). Marketplace ref bumps from `v0.1.0` to `v0.2.0` after this work lands.
**Tagline (unchanged):** *Audit, organize, and classify the LLM prompts shipped in your app.*

## 1. Why v0.2 (the architectural correction)

The v0.1 cowpath on Celestia3 surfaced that prompt audits also need a **behavioral test** to validate the static F1-F7 findings in actual model behavior. During the brainstorm, I proposed splitting that behavioral work into a separate sibling plugin called `vibe-eval`. The user pushed back: the family convention is concern-per-plugin with multiple step-commands, and "vibe-eval" as a plugin name doesn't name its concern — eval *what*? The answer is prompts, and that concern is owned by vibe-prompt.

v0.2 folds the behavioral capabilities into vibe-prompt as new step-commands. The Vibe-Eval solo-repo work (completed and round-trip-validated against Celestia3 across 4 auth iterations) is the source material; it gets re-homed, not redesigned. The Vibe-Eval solo repo stays unpublished, marked archived in its README as superseded by this v0.2 release.

The lesson worth capturing: **infrastructure differences (API keys, cost budgets, vendor SDKs) do not justify plugin separation. Concern boundaries do.** Same pattern as vibe-sec, which has tools that defer to external scanners with their own configs while staying one plugin.

## 2. What v0.2 adds (the new commands)

| New command | What it does | Cost model |
|---|---|---|
| `/vibe-prompt:eval` | Behavioral drift test. For each prompt in inventory, runs against the prod model (via Gemini API or other vendor) AND an in-session Claude baseline. Mechanical comparator + LLM-judge with cross-vendor evaluator-drift footer. | Real API spend; cost-gated with pre-run estimate + hard ceiling. |
| `/vibe-prompt:radar` | Model-news digest for vendors your prompts target. Reads inventory to find vendors; queries vendor news sources via context7 + web fetch; caches weekly. | Zero LLM calls; web fetch only. |

Plus the supporting machinery (composer-mimic, vendor-clients, fixture-synthesis, mechanical-comparator, llm-judge-prompt, dashboard-template, first-run-setup, agent-self-id) ports over as `vibe-prompt:eval`'s reference set.

## 3. What does NOT change

- **All v0.1 commands stay.** `/vibe-prompt:scan`, `/vibe-prompt:audit`, `/vibe-prompt` (bare router), `/vibe-prompt:evolve-prompt` continue working with the same behavior.
- **Existing state paths stay.** `.vibe-prompt/state/inventory.json` and `.vibe-prompt/state/audit.json` remain as v0.1 documented.
- **F1-F7 rubric stays.** No change to the static audit smells.
- **Schemas stay backward-compatible.** New schemas added for eval-side state; existing ones untouched.

Users running v0.1 commands after upgrading see no behavioral change. The v0.2 commands are additive.

## 4. Substantive design (refer to vibe-eval spec)

The behavioral test design — composer-mimic, fixture synthesis, mechanical + LLM-judge comparator, evaluator-drift footer, agent self-identification — is locked from the `drafts/vibe-eval/spec.md` brainstorm and round-trip-validated on Celestia3. **That document is the substantive source.** Re-deriving the design here would be busywork; instead, this spec scopes the migration shape and the v0.1 → v0.2 deltas. The vibe-eval spec stays in `drafts/vibe-eval/spec.md` as historical reference; it does not become canonical for v0.2 (this spec does).

Substantive decisions to import verbatim from the vibe-eval spec:
- v0.1 (of the eval step) targets Gemini AI Studio endpoint + API key + optional Referer header
- Composer-mimic per-app captured via first-run interview, stored at `.vibe-prompt/eval/composer.json`
- Synthesized + user-provided fixtures with override pattern
- Hybrid comparator (mechanical + LLM-judge)
- Agent self-ID adapts evaluator-drift framing per detected agent identity
- Cost gates: pre-run estimate + hard ceiling, default $0.50 per `:eval` invocation
- Security: env vars only, namespaced (`VIBE_PROMPT_GEMINI_API_KEY` — re-namespacing from `VIBE_EVAL_*` happens at migration, see §6)

Decisions that **change** in the v0.2 surface:
- **Env var name:** `VIBE_EVAL_GEMINI_API_KEY` → `VIBE_PROMPT_GEMINI_API_KEY` (matches plugin namespace)
- **Referer env var:** `VIBE_EVAL_GEMINI_REFERER` → `VIBE_PROMPT_GEMINI_REFERER`
- **State directory:** `.vibe-eval/` → `.vibe-prompt/eval/` (eval becomes a subdir of vibe-prompt's state)
- **Dashboard output path:** `docs/vibe-eval/report-*.md` → `docs/vibe-prompt/eval-*.md`
- **Internal SKILL name prefix:** `vibe-eval:run`, `vibe-eval:radar`, etc. → `vibe-prompt:eval`, `vibe-prompt:radar`, etc.
- **L3 evolution loop consolidates:** `vibe-eval:evolve-eval` does NOT exist as a separate command. `vibe-prompt:evolve-prompt` (already in v0.1) extends to reflect on eval + radar sessions too. One consolidated evolution per plugin.

## 5. File structure (target after v0.2 migration)

```
Vibe-Prompt/
└── plugins/
    └── vibe-prompt/
        ├── plugin.json                     # version bumps to 0.2.0
        ├── commands/
        │   ├── vibe-prompt.md              # bare router (updated)
        │   ├── scan.md                     # v0.1 (unchanged)
        │   ├── audit.md                    # v0.1 (unchanged)
        │   ├── eval.md                     # NEW — was /vibe-eval:run
        │   ├── radar.md                    # NEW — was /vibe-eval:radar
        │   └── evolve-prompt.md            # v0.1 SKILL updated to cover eval+radar
        ├── skills/
        │   ├── guide/
        │   │   ├── SKILL.md                # updated: persona covers both static + behavioral
        │   │   └── references/
        │   │       ├── security-hard-rules.md   # merged from v0.1 + eval security
        │   │       └── cost-gates.md            # NEW — from eval
        │   ├── router/SKILL.md             # v0.1 updated: 5 state branches now
        │   ├── scan/                       # v0.1 unchanged
        │   ├── audit/                      # v0.1 unchanged
        │   ├── eval/                       # NEW — moved from Vibe-Eval/skills/run/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── composer-mimic.md
        │   │       ├── vendor-clients.md
        │   │       ├── fixture-synthesis.md
        │   │       ├── mechanical-comparator.md
        │   │       ├── llm-judge-prompt.md
        │   │       └── dashboard-template.md
        │   ├── radar/                      # NEW — moved from Vibe-Eval/skills/radar/
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       └── vendor-news-sources.md
        │   ├── first-run-setup/            # NEW — moved from Vibe-Eval (eval-only setup)
        │   │   ├── SKILL.md
        │   │   └── references/
        │   │       ├── composer-interview.md
        │   │       └── agent-self-id.md
        │   ├── session-logger/             # v0.1 unchanged
        │   ├── friction-logger/            # v0.1 friction-triggers.md gets eval triggers merged in
        │   └── evolve-prompt/SKILL.md      # v0.1 updated to reflect eval+radar sessions
        ├── schemas/                        # v0.1 schemas + eval-side schemas
        │   ├── inventory.schema.json       # v0.1
        │   ├── audit.schema.json           # v0.1
        │   ├── config.schema.json          # NEW (eval config)
        │   ├── composer.schema.json        # NEW
        │   ├── agent.schema.json           # NEW
        │   └── run-result.schema.json      # NEW
        └── tests/
            ├── validate-schemas.sh         # extended to cover all 6 schemas
            ├── check-skill-references.sh   # unchanged
            └── check-no-keys-in-state.sh   # NEW — from Vibe-Eval
```

## 6. Migration sequence (high-level — the implementation plan derives from this)

1. **Bring vibe-prompt repo to a clean state.** Already on `main` at `108593c` (v0.1.0 tag). Branch from main for v0.2 work.
2. **Copy SKILLs + references from Vibe-Eval into vibe-prompt under new names.** File-level moves with frontmatter + cross-reference updates.
3. **Re-namespace env vars in all references.** `VIBE_EVAL_*` → `VIBE_PROMPT_*`. Single grep + replace per file.
4. **Re-path state directories and dashboard outputs.** `.vibe-eval/` → `.vibe-prompt/eval/`, `docs/vibe-eval/` → `docs/vibe-prompt/`.
5. **Update bare router SKILL** to include eval + radar in its 5-branch state-aware routing.
6. **Update evolve-prompt SKILL** to cover eval + radar session reflection.
7. **Merge friction-triggers.md** — vibe-eval's triggers merge into vibe-prompt's existing file.
8. **Bump plugin.json version** to `0.2.0`. Update description to mention the new step-commands.
9. **Update README.md + CHANGELOG.md** with v0.2.0 entry.
10. **Re-run the 4-script test suite** (validate-schemas + check-skill-references + check-no-keys-in-state).
11. **Re-validate on Celestia3** by symlinking the updated vibe-prompt into `~/.claude/plugins/`, running `/vibe-prompt:eval` against `natal_interpretation`. Round-trip target: same drift findings as the prior vibe-eval run (Pilgrim leak, voice-tone, bigThree type drift, etc.), now produced under the vibe-prompt namespace.
12. **Tag v0.2.0**, push solo repo.
13. **Bump marketplace.json ref** from `v0.1.0` to `v0.2.0` in vibe-plugins.
14. **Update vibe-plugins CLAUDE.md** plugin table (description gets longer to mention new steps).
15. **Archive Vibe-Eval solo repo:** README note "superseded by vibe-prompt v0.2", do NOT delete (commits are useful as receipts for the auth-iteration journey).
16. **Dashboard decision log** via MCP for the v0.2 ship; **memory cleanup**: archive `queued_plugin_vibe_eval.md`, write `vibe_prompt_v0_2_architecture.md` capturing both the new capabilities AND the architectural lesson.

## 7. Validation status (carries forward from vibe-eval round-trip)

The killer feature was validated end-to-end on Celestia3:

- `gemini-2.5-flash` returned real output via API key + optional Referer header path
- Pilgrim leak reproduced behaviorally ("Fellow Pilgrim, Maya" in Gemini output; baseline addresses Maya directly)
- 5 LLM-judge findings produced, all with cross-vendor evaluator-drift footer attached
- Evaluator self-named its own bias risk in finding #2 (the meta-honesty pattern landing)
- Mechanical comparator behaved correctly (0 of 8 fired because top-level keys + lengths matched; semantic drift correctly delegated to LLM-judge)
- Cost: $0.000198, well under any reasonable ceiling

This validation transfers cleanly to v0.2 — the underlying behavior doesn't change, only command names and paths. Re-validation (step 11 above) confirms the rename doesn't break anything. Spec ships v0.2 as "already field-tested on Celestia3 via the vibe-eval namespace; re-run under new namespace confirms parity."

## 8. v0.3 candidates (carried forward)

Same list from the vibe-eval spec — nothing changes about future direction:
- App-callable eval endpoint pattern (user surfaced this insight; design captured at `drafts/vibe-eval/v0.2-app-endpoint-architecture.md` — note the filename predates this pivot; content stays valid, refers to "v0.2" which now means vibe-prompt v0.3)
- Pick mode (cross-vendor model selection for greenfield prompts)
- Backup-test mode
- OpenAI vendor implementation
- OS keychain integration
- CI/cron context support
- Composer auto-detect

## 9. Open questions for spec review

- **Bare router branches.** v0.1's bare router has 3 branches (no inventory / inventory but no audit / both exist). v0.2 needs to add eval + radar awareness. Proposed 5 branches: (a) no inventory → scan, (b) no audit → audit, (c) no eval state → eval (with cost-gate confirm), (d) radar cache stale → radar, (e) all fresh → posture. Open: does the router auto-prompt for `:eval` after `:audit` lands? Default proposal: yes — `:audit` surfaces findings that `:eval` can verify behaviorally. Natural handoff.

- **First-run-setup discoverability.** Currently a separate internal SKILL. Does `:eval` invoke it automatically on first run, or does the bare router route to it? Default proposal: `:eval` invokes it automatically when `.vibe-prompt/eval/{composer,agent,config}.json` missing. Bare router doesn't need a separate first-run-setup branch.

- **Backward-compat note for the env var rename.** Users who configured `VIBE_EVAL_GEMINI_API_KEY` during the abandoned standalone build would need to rename to `VIBE_PROMPT_GEMINI_API_KEY`. Open: should v0.2 also read the old name as fallback for one release with a deprecation warning, or hard-cut? Given vibe-eval never shipped to marketplace (the standalone build never tagged), the only users with the old name are people who installed the canary solo repo directly. Default proposal: hard-cut, document in CHANGELOG. Soft-fallback is overkill for a never-shipped plugin's env var.
