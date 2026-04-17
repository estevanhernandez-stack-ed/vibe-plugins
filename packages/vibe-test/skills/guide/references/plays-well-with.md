# Plays Well With

> Pattern #13 anchored registry of complement skills/plugins Vibe Test coordinates with.
>
> Item #3 fills in the full 7-complement table with deferral contracts. This minimal
> placeholder gives the composition parser something real to load in item #2 tests.

```yaml
- complement: superpowers:test-driven-development
  applies_to:
    - generate
  phase: new-feature test generation
  deferral_contract: |
    TDD skill drives NEW-feature tests; Vibe Test owns audit-gap retrofit.
    Announce at generate command start if both apply.

- complement: superpowers:systematic-debugging
  applies_to:
    - fix
  phase: complex test-failure diagnosis
  deferral_contract: |
    When confidence <0.6 on test-failure diagnosis, defer entirely.

- complement: superpowers:verification-before-completion
  applies_to:
    - gate
  phase: CI verification
  deferral_contract: |
    Co-invoke; gate owns tier-threshold; verification owns per-task check.

- complement: playwright
  applies_to:
    - generate
    - audit
  phase: E2E test emission
  deferral_contract: |
    Defer test-file generation entirely via --codegen typescript.
    Vibe Test provides probe intents; Playwright provides test output.

- complement: tessl:analyzing-test-coverage
  applies_to:
    - coverage
  phase: raw coverage parsing
  deferral_contract: |
    Defer raw parsing; Vibe Test overlays tier-appropriate interpretation.

- complement: vibe-doc
  applies_to:
    - audit
    - generate
  phase: TESTING.md composition
  deferral_contract: |
    Offer to co-author docs/TESTING.md via /vibe-doc:generate.

- complement: vibe-sec
  applies_to:
    - generate
    - audit
  phase: security-aware priority elevation
  deferral_contract: |
    Read .vibe-sec/state/findings.jsonl; elevate matching tests' priority.
    Write .vibe-test/state/covered-surfaces.json for vibe-sec consumption.
```
