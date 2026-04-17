# Plays Well With

> Pattern #13 anchored registry of complement skills/plugins Vibe Test coordinates with.
> Parsed by `src/composition/anchored-registry.ts`; consumed by `skills/guide/SKILL.md`
> and every command SKILL at composition-check time.

## How this file is used

At command entry, after persona + experience read, the command SKILL:

1. Parses the YAML block below.
2. Filters entries whose `applies_to` array includes the current command.
3. Cross-references against the agent's available-skills list.
4. For any match where the complement is **present**, announces the deferral per its `deferral_contract` at the named `phase`.
5. For any match where the complement is **absent**, writes a finding in the report's "Ecosystem Recommendations" section (not an error — just a suggestion).

At most **one anchored announcement per invocation**, chosen by the `applies_to`-tightest match. Dynamic discovery (heuristic) can add one more — see `skills/guide/SKILL.md`.

## Field contract

| Field | Required | Meaning |
|-------|----------|---------|
| `complement` | yes | The canonical skill/plugin identifier as it appears in the agent's available-skills list. |
| `applies_to` | yes | Array of command names. One of: `router`, `audit`, `generate`, `fix`, `coverage`, `gate`, `posture`. |
| `phase` | yes | Short human string describing when in the command the deferral applies. Appears verbatim in announcements. |
| `deferral_contract` | yes | 1-3 sentences describing who owns what. Printed verbatim at announcement time. |
| `minimum_version` | no | SemVer string. If the installed complement is below this, treat as "absent" and fall through to the recommendation path. |

## The anchored registry

```yaml
- complement: superpowers:test-driven-development
  applies_to:
    - generate
  phase: new-feature test generation
  deferral_contract: |
    TDD skill drives NEW-feature tests; Vibe Test owns audit-gap retrofit.
    Announce at generate command start if both apply — builder picks which
    surface to invoke next. Vibe Test never generates tests for code the TDD
    skill is actively walking through.

- complement: superpowers:systematic-debugging
  applies_to:
    - fix
  phase: complex test-failure diagnosis
  deferral_contract: |
    When Vibe Test's confidence on a failure diagnosis is <0.6, defer entirely
    to systematic-debugging — it has the investigation scaffolding Vibe Test
    doesn't duplicate. Vibe Test still owns harness-level breaks (F2) and
    rollback of its own auto-written tests.

- complement: superpowers:verification-before-completion
  applies_to:
    - gate
  phase: CI verification
  deferral_contract: |
    Co-invoke: gate owns the tier-threshold pass/fail decision; verification
    owns per-task completion checks. Announce at gate command start so the
    builder sees both surfaces are active.

- complement: playwright
  applies_to:
    - generate
    - audit
  phase: E2E test emission
  deferral_contract: |
    When the Playwright plugin + MCP are installed, Vibe Test defers E2E test
    file generation entirely — it provides probe intents, Playwright runs
    `--codegen typescript` and emits the `.spec.ts` output. Vibe Test never
    attempts a native Playwright fallback; absence is reported as a finding.

- complement: tessl:analyzing-test-coverage
  applies_to:
    - coverage
  phase: raw coverage parsing
  deferral_contract: |
    Tessl owns raw coverage-report parsing when present; Vibe Test overlays
    the tier-appropriate interpretation (weighted score, tier threshold,
    per-level breakdown). Without Tessl, Vibe Test's own parsers handle the
    vitest / jest / c8 formats directly.

- complement: vibe-doc
  applies_to:
    - audit
    - generate
  phase: TESTING.md composition
  deferral_contract: |
    When vibe-doc is installed, offer to co-author docs/TESTING.md via
    /vibe-doc:generate — vibe-doc's prose engine is stronger for long-form
    runbook sections. Without vibe-doc, Vibe Test's own handoff writers fill
    the file from templates. Co-authorship is opt-in per run, not default.

- complement: vibe-sec
  applies_to:
    - audit
    - generate
  phase: security-aware priority elevation
  deferral_contract: |
    Read .vibe-sec/state/findings.jsonl at audit entry; elevate matching
    test priorities (routes / models / surfaces vibe-sec flagged). Write
    .vibe-test/state/covered-surfaces.json at audit exit so vibe-sec can
    see which surfaces are test-covered. Two-way handshake; both plugins
    tolerate the other being absent.
```

## Maintenance

The anchored table will go stale as ecosystem plugins evolve — new complements appear, existing ones are renamed, some become defunct. `skills/vitals/SKILL.md` check #4 verifies that every anchored entry still resolves in the current available-skills list; `/evolve` proposes removals for confirmed-defunct rows.

Adding a new anchored complement is a two-place edit:

1. Append a new YAML entry above.
2. Update the command SKILLs in `applies_to` to reference the new phase and deferral contract at the right point in their flow.

Removing one is the same edit inverted. Never drop a row silently — `/evolve` logs the removal as a proposed change so the history is visible.
