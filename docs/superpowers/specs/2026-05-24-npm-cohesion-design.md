# npm cohesion cleanup — design + runbook

**Date:** 2026-05-24
**Status:** Approved, in execution
**Repo:** `vibe-plugins` (system of record) · branch `chore/npm-cohesion`
**Sub-project 2 of the marketing cohesion push** (after the README standard; LabHub pages remain).

## Goal

Make npm mean one thing: **the standalone CLIs for CI/headless use.** The Claude Code
plugins install via the marketplace. Everything on npm that isn't a real CLI gets
deprecated toward the marketplace, and the CLIs get a consistent `-cli` name.

## Decisions (locked)

- Strategy: **deprecate the legacy plugin-payload packages + standardize CLI naming on `-cli`.**
- sec: **`@esthernandez/vibe-sec-cli` is the canonical sec CLI**; deprecate the bare `@esthernandez/vibe-sec`.

## Current npm state (verified 2026-05-24)

| Package | npm | repo | bin? | disposition |
|---|---|---|---|---|
| `@esthernandez/vibe-doc` | 0.7.1 | 0.8.0 | yes | **rename → `vibe-doc-cli`**, deprecate bare |
| `@esthernandez/vibe-test-cli` | 0.2.3 | 0.2.4 | yes | republish 0.2.4 (canonical) |
| `@esthernandez/vibe-test` (bare) | 0.2.3 | 0.2.4 | no | deprecate → marketplace |
| `@esthernandez/vibe-sec-cli` | 0.1.0 | 0.1.1 | yes | canonical sec CLI |
| `@esthernandez/vibe-sec` (bare) | 0.0.1 stub | 0.6.0 | (npm stub: no) | deprecate → marketplace |
| `@esthernandez/vibe-cartographer` | 1.7.3 | — | no | deprecate → marketplace (723/mo) |
| `@esthernandez/app-project-readiness` | 0.5.0 | — | no | already deprecated ✓ |
| `@626labs/plugin-core` | not published (404) | 0.0.1 | — | nothing to do; drop from stats |

## Target end-state on npm

- `@esthernandez/vibe-doc-cli` — the doc CLI (0.8.0)
- `@esthernandez/vibe-test-cli` — the test CLI (0.2.4)
- `@esthernandez/vibe-sec-cli` — the sec CLI
- All other `@esthernandez/vibe-*` names: deprecated, pointing to the marketplace (+ the `-cli` for CI where relevant).

## Work split

### A. In-repo (no auth — the agent does these)

1. **doc:** in `vibe-doc/packages/vibe-doc/package.json`, rename `name` → `@esthernandez/vibe-doc-cli`. The marketplace plugin is git-subdir by **path** (`packages/vibe-doc`), so the npm name change does not affect plugin installs. Update doc's root README npm block → `vibe-doc-cli`.
2. **sec:** make `@esthernandez/vibe-sec-cli` the canonical CLI. npm only has the bare-`vibe-sec` 0.0.1 **stub** (no bin) + `vibe-sec-cli` 0.1.x, so the bare deprecation is clean. Inspect `sec/packages/vibe-sec-cli` vs `sec/packages/vibe-sec` (the 0.6.0 full-audit CLI). Bring `vibe-sec-cli` to ship the current capability. **Fallback if the build restructure runs deep:** republish `vibe-sec-cli` at its current working version to keep the canonical name alive, and file the "carry full 0.6.0 audit under `-cli`" as a focused sec-repo follow-up. Update sec's root README npm block → `vibe-sec-cli`.
3. **test:** already clean at 0.2.4 — confirm metadata only.
4. **Metadata unification:** consistent `keywords` + `description` style across the 3 `-cli` package.jsons (shared vocabulary: `claude-code`, `626labs`, `cli`, `ci`, + per-tool term).
5. **Stats script** (`scripts/npm-stats.py`): track the 3 canonical CLIs; drop `@626labs/plugin-core` (404); keep `@esthernandez/vibe-cartographer` for a few weeks to watch the deprecation land.
6. **README install blocks:** doc → `vibe-doc-cli`; sec → `vibe-sec-cli`; storefront npm block already uses `-cli` names (verify). Any plugin whose README references a now-deprecated npm name gets corrected.

### B. npm auth (OTP — run with Este providing OTP per `npm publish`)

**Order: publish the canonical packages FIRST, then deprecate (so deprecation messages point at live packages).**

Publish:
```
# from vibe-doc/packages/vibe-doc (after rename)
npm publish --access public --otp=<OTP>
# from vibe-test-readme-work/packages/vibe-test-cli
npm publish --access public --otp=<OTP>
# from vibe-sec/packages/vibe-sec-cli (after restructure)
npm publish --access public --otp=<OTP>
```

Deprecate (deprecate may also prompt for OTP under 2FA):
```
npm deprecate @esthernandez/vibe-doc "Renamed to @esthernandez/vibe-doc-cli — npm i -g @esthernandez/vibe-doc-cli. The plugin installs via the marketplace: /plugin marketplace add estevanhernandez-stack-ed/vibe-plugins" --otp=<OTP>
npm deprecate @esthernandez/vibe-cartographer "Not an npm install — Vibe Cartographer is a Claude Code plugin. Install via the marketplace: /plugin marketplace add estevanhernandez-stack-ed/vibe-plugins" --otp=<OTP>
npm deprecate @esthernandez/vibe-test "Not an npm install — Vibe Test is a Claude Code plugin. Marketplace: /plugin marketplace add estevanhernandez-stack-ed/vibe-plugins. For CI: @esthernandez/vibe-test-cli" --otp=<OTP>
npm deprecate @esthernandez/vibe-sec "Not an npm install — Vibe Sec is a Claude Code plugin. Marketplace: /plugin marketplace add estevanhernandez-stack-ed/vibe-plugins. For CI: @esthernandez/vibe-sec-cli" --otp=<OTP>
```

## Acceptance

- `npm view @esthernandez/vibe-doc-cli` resolves at 0.8.0 with a `vibe-doc` bin.
- `vibe-test-cli` at 0.2.4; `vibe-sec-cli` republished (canonical).
- The 4 deprecated packages show deprecation notices pointing to the marketplace.
- Stats script tracks the 3 CLIs; no 404s.
- doc/sec READMEs install the `-cli` packages; no README references a deprecated npm name as the install path.

## Out of scope

- LabHub plugin pages (sub-project 3).
- Cross-agent portability (separate strategic initiative).
- Repo renames; the inner plugin READMEs already standardized in sub-project 1.
