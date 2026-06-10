# Quality-net gap analysis — the vibe family, 2026-06-09

**Verdict first: the net is dense exactly where the days are spent and dark in four bands.** Dev-time static analysis of TS/JS web apps, the idea-to-ship process chain, and the session/retro meta-layer are strong, schema-disciplined, and real-app-validated. Operate/monitor has zero coverage. The distribution machine (promotion, install, release) is hand-run and uninspected, with three incidents live in the public stable channel today. Whole stacks (.NET, Python, MCP servers) and whole dimensions (perf, a11y, licenses, privacy obligations, resilience) silently no-op. And the seams between plugins are weaker than the plugins: the family's deepest handshake is silently broken right now.

29 confirmed gaps, 11 at P0. Three new plugins recommended, one thin orchestrator, and roughly twenty widenings of existing tools. The five highest-stakes claims were hand-verified against the repos and shipped tags before this document was written; evidence lines below.

## Method

Multi-agent sweep over the solo-repo clones (main channel) plus this repo's family docs: 13 plugin mappers + 1 family-docs reader, then five gap lenses (lifecycle, quality-dimensions, stack-coverage, orchestration, meta-distribution), dedup, two independent verifiers per gap (a coverage skeptic instructed to refute by reading the actual SKILL bodies, and an estate-value judge), a recommendation pass, and a completeness critic. 82 agents, 41 minutes wall clock.

Honesty note: of 30 deduped gaps, the coverage skeptics refuted **zero** (one died on estate-value). The critic flags this as a red flag against the skeptics, not necessarily for the net. Mitigation: the five most consequential claims were re-verified by hand (below) and all held. Read the P1/P2 evidence with that calibration in mind.

## Hand-verified incidents — do these before any roadmap

These are not "gaps." They are shipped defects in the public channel, confirmed directly:

1. **thesis-engine v0.2.2 (stable pin at time of analysis) leaks personal and employer context.** The shipped subtree contains the Marcus Theatres line at `skills/thesis-engine/assets/CLAUDE_PROJECT_INSTRUCTIONS.md:15`, ~12 absolute `C:\Users\estev\...` paths across README.md, commands/blog.md, commands/run.md, commands/write.md, SKILL.md, and the asset, plus a hardcoded 626Labs dashboard project ID and personal MCP tool name in run.md/SKILL.md/README.md (which also violates the ratified decision-log-backend STANDARD). Main carried all of it too (an earlier draft of this doc claimed main had scrubbed the paths — that was a bad grep, corrected same-day). Remediation is more than a lint, and the old tag stays fetchable — users who synced already have it, and the content remains in public git history regardless. (GAP-01; scrubbed and shipped as v0.2.3 same day, see addendum)
2. **Cart's security enforcer is dead prose.** `vibe-cartographer/skills/build/SKILL.md:280` still reads "vibe-sec is pre-release (v0.0.1) and ships no invocable command yet — skip it until it does." vibe-sec is at v0.7.0 with a working `:gate`. Every Cart build since has skipped security enforcement while both plugins were installed. (GAP-02)
3. **vibe-doc's shipped README instructs `npx vibe-doc ...` — the npm name 404s.** Confirmed `npm view vibe-doc` → E404 (the real package is `@esthernandez/vibe-doc-cli`). Broken instruction today, name-squat vector tomorrow. (GAP-03, immediate slice)
4. **The test→sec handshake is silently broken.** `vibe-sec/src/composition/vibe-test.ts` reads `covered_surfaces.endpoints_with_behavioral_tests` (endpoint arrays) from `.vibe-test/state/covered-surfaces.json`; vibe-test's emitter (`src/scanner/covered-surfaces.ts`) writes `covered_surfaces` as a *number* in a summary block. Same key, incompatible shape. vibe-sec silently falls back to self-classifying tier on every run and reports nothing. (GAP-07)

A fifth verification corroborated the release-drift premise: vibe-keystone main is 5 commits ahead of its tag including a real bug fix while both channels self-report 0.2.1, and vibe-taker main is 6 ahead with its entire 111-test suite unreleased. (GAP-04)

## The net today

| Plugin | Version (pin state) | Lifecycle territory |
|---|---|---|
| vibe-cartographer | 1.10.0 (= pin) | ideate → ship process chain; builds the family itself |
| vibe-doc | 0.8.0 (= pin) | documentation gaps + generation |
| vibe-test | 0.2.5 (= pin) | tests, honest coverage, gates |
| vibe-sec | 0.7.0 (= pin) | ten-concern security audit, gates, threat model |
| thesis-engine | 0.2.2 (= pin) | research feeding for writing |
| vibe-thesis | 0.2.0 (= pin) | thesis-shaped writing + voice |
| vibe-keystone | 0.2.1 (main 5 ahead, incl. a fix) | CLAUDE.md / agent-config |
| vibe-iterate | 1.2.0 (= pin) | post-ship iteration, one PR at a time |
| vibe-taker | 0.1.2 (main 6 ahead, tests unreleased) | cross-repo feature transplant |
| vibe-walk | 0.2.0 (= pin) | onboarding tours, honest don't-build verdicts |
| vibe-insights | 0.3.0 (= pin) | cross-machine retro, recall, spend |
| vibe-wrap | 0.3.0 (= pin) | session wrap, decision logging |
| vibe-prompt | 0.7.1 (= pin) | prompt scan/audit/eval/grade/remediate |

Where it is dense: static analysis at dev time on TS/JS web apps (prompt's 13 smells, sec's ten concerns, test's honest denominators), the process spine (Cart), and the meta-layer (wrap, insights, per-plugin evolve loops).

### The four dark bands

1. **Operate/monitor: zero coverage.** Nothing watches production errors, spend, uptime, or whether a deploy actually landed, for any live app. The estate already paid for this lesson once (the six-week telemetry blackout).
2. **The distribution machine itself.** Promotion, install verification, and release coherence are hand-run. Four incidents have already shipped this way (vibe-prompt silent-manifest, insights SSH source, the stray Vibe-Doc tag, plus the thesis-engine leak above), and only the maintainer happening to be the failing user caught them.
3. **Breadth.** .NET (a store-shipped app!), Python pipelines, MCP servers, and markdown-prose prompts silently no-op or mis-classify. Perf, a11y, SEO, resilience, licenses, privacy obligations, and target-app data integrity have no owner. Two live instances: Celestia3 ships a GPL-3.0 core engine (swisseph-wasm) in a commercial app, and walk's emitted tour runs unverified for accessibility in front of brand-new paying users.
4. **The seams.** The deepest handshake is broken (above), generators don't invoke validators, learning sits in 13 private logger silos, and there is no composite gate or posture. 13 strong threads, not yet a mesh.

## All 29 confirmed gaps

| ID | Title | Approach | Target | Effort | Pri |
|---|---|---|---|---|---|
| GAP-01 | Promotion-time quality gate + thesis-engine scrub | new-command | vibe-plugins CI + conventions STANDARD | S | P0 |
| GAP-02 | Revive Cart's vibe-sec enforcer | compose | cart build SKILL:280 | S | P0 |
| GAP-03 | Install-smoke + ref-resolution CI | new-command | vibe-plugins workflow | M | P0 |
| GAP-04 | vibe-launch: release engineering pillar | new-plugin | new solo repo | L | P0 |
| GAP-05 | vibe-net: composite posture + composite gate | new-plugin (thin) | new repo + prework (:check 0/1/2, vibe-prompt:gate) | M | P1 |
| GAP-06 | vibe-ops: operate/monitor pillar, Firebase pulse first | new-plugin | new solo repo, cowpath on Celestia3 | L | P0 |
| GAP-07 | Repair test→sec handshake; seam contracts become core-owned | compose | vibe-sec composition + spec-bank amendment | M | P0 |
| GAP-08 | Stop the Windows logger bleed; insights = aggregation point | widen | 5 logger SKILLs + insights ingestion | M | P1 |
| GAP-09 | Data-posture concern (shape drift, migrations, backups) | widen | vibe-sec concern #11 (static half; runtime half → vibe-ops) | M | P0 |
| GAP-10 | vibe-lens: web posture (perf + a11y + SEO) | new-plugin | new solo repo | L | P1 |
| GAP-11 | a11y-verify walk's own emitted tours | widen | vibe-walk :walk + :vitals | S | P0 |
| GAP-13 | .NET in two tiers: honest decline now, NuGet capability next | widen | vibe-test/doc classifiers; iterate + sec detectors | M | P0 |
| GAP-14 | Cost-delta in vibe-prompt; spend pulse rides vibe-ops | widen | :grade/:remediate + ops probe | M | P1 |
| GAP-15 | Inbound lane: issue templates + bug-bash connectors | widen | 13 repos + vibe-iterate | M | P1 |
| GAP-16 | Generators hand off to gates (walk, taker) | compose | :walk + :plant close-out | S | P1 |
| GAP-17 | mcp-agent-surface concern + kill the trivially-complete false green | widen | vibe-sec + threat-model synthesize | M | P1 |
| GAP-18 | Markdown prompt-surface mode (audit the family's own prose) | widen | vibe-prompt :scan/:audit | M | P1 |
| GAP-19 | Python: :deps dispatch now, vibe-test v0.3 to spec bank | widen | vibe-sec + spec-bank entry | M | P1 |
| GAP-20 | vibe-test learns plugin / cli-tool / library app types | widen | app-type matrix + thresholds | M | P0 |
| GAP-21 | Shared classification contract (.vibe/classification.json) | compose | conventions STANDARD + rollouts | M | P1 |
| GAP-22 | Contract-change releases ship migration notes | widen | promotion checklist row + vitals checks | S | P1 |
| GAP-23 | CLAUDE.md gets an owner: claude-md DocType in vibe-doc | widen | gap-analyzer matrix + :check drift pass | S | P1 |
| GAP-24 | Breadcrumbs: pilot 2 producers, gate rollout on wrap usage | compose | sec + prompt session-logger close | S | P2 |
| GAP-25 | Resilience-posture rubric (timeout/retry/idempotency per call site) | widen | vibe-sec | M | P1 |
| GAP-26 | License-compliance concern (the GPL engine forced it) | widen | vibe-sec deps family | M | P0 |
| GAP-27 | Privacy-obligations detectors, timed to the Play submission | widen | vibe-sec PII-inventory consumers | M | P1 |
| GAP-28 | Estate ripeness report + sunset checklist | widen | vibe-insights | M | P1 |
| GAP-29 | SEO rides vibe-lens as its third category | (rides GAP-10) | vibe-lens | S | P1 |
| GAP-30 | Host-capability fingerprint (stop prescribing headers GH Pages can't set) | widen | vibe-sec config-posture | S | P1 |

Killed on value: GAP-12 (Luau/Roblox coverage). The verifier checked the disk: the "Roblox family" repos contain zero Luau — they're C#, Swift, Electron, and assets. The exposure described doesn't exist on this estate. Two corrections fall out: the Projects keystone's "Luau/Roblox game family" stack label is inaccurate and worth fixing, and per the critic, Luau deserves the same cheap honest-decline classifier row .NET gets in GAP-13 rather than nothing.

## The P0 slate, sequenced

**Today, hours not days (S):**
- GAP-01 immediate half: scrub thesis-engine (Marcus line + verify paths gone), tag v0.2.3, ref-bump. The lint and conventions checklist follow as the durable half.
- GAP-02: one-paragraph SKILL edit in Cart, mirror the vibe-test:gate enforcer bullet, promote. Critic's amendment applies: prose enforcers demonstrably rot, so GAP-18's markdown-audit mode (which would have caught this) is the systemic fix; this edit is the tourniquet.
- GAP-03 immediate slice: fix the `npx vibe-doc` references to `@esthernandez/vibe-doc-cli` (or publish the bare name defensively).
- GAP-11: emit-time a11y assertions on walk's generated tours. Critic's amendment: run a real checker (axe-core or equivalent) in the verify step, not a prose checklist — otherwise this is GAP-02 waiting to happen in walk.

**This cycle (M):**
- GAP-07 — **blocks plugin-core Phase 2.** Fix vibe-sec's reader to consume what vibe-test actually emits, add a loud "handshake degraded" line, and amend `docs/spec-bank/plugin-core-phase2.md` so seam schemas become core-owned contract artifacts with a cross-repo contract test. If Phase 2 runs first, the broken seam gets codified into core.
- GAP-03 full harness: install-smoke CI on every ref bump + weekly cron. Critic's amendment: name an OS matrix (windows + ubuntu + macos) — the motivating incident was environment-specific and ubuntu-only smoke structurally misses that class.
- GAP-20: vibe-test learns claude-code-plugin / cli-tool / library rows. The family's own test tool can't currently name the family's own app type; the 190 Fable-window tests were hand-built around it.
- GAP-26: license concern in vibe-sec. Celestia3's GPL-3.0 engine in a commercial Android-distributing app is a true positive forcing a real decision (license, open, or swap).
- GAP-13: .NET tier 1 (honest decline beats silent zero-source no-op) then tier 2 (NuGet pins for :scan-releases/:upgrade on Sanduhr). Critic's amendment: put the vibe-test .NET leg in the spec bank alongside Python's — Sanduhr otherwise ends this roadmap still without test generation.
- GAP-09: data-posture concern, static half (shape correspondence, migration lint, backup-config presence); the does-restore-actually-work half belongs to vibe-ops, split explicitly.

**Next build cycles (L):**
- GAP-06 vibe-ops: Firebase pulse first (function errors, endpoint probes, deploy-landed verification via the firebase MCP), findings flow into feedback.md and the iterate Atlas so the repair lane closes the loop. Pull-based honesty: "next-pulse detection," never "alerting."
- GAP-04 vibe-launch: pre-tag coherence gate (plugin.json vs tag vs CHANGELOG vs README), deploy rails (gh release, npm, MS Store checklist), marketplace drift sweep. The keystone/taker drift verified above is the ready-made fixture. Cowpath the next two promotions by hand as the seed.

## The new-tooling half of the ask

Three new plugins plus one orchestrator, each owning a concern no existing plugin's boundary contains (the Vibe-Eval lesson: concern boundaries justify separation, infrastructure differences don't):

| Tool | Concern | Status quo |
|---|---|---|
| **vibe-launch** (P0, L) | ship/release engineering | Cart's spec SKILL already defers to it by name; nobody owns tags, changelogs, store submissions, stable drift |
| **vibe-ops** (P0, L) | operate/monitor | zero coverage; 4 of 6 live apps reachable via the firebase MCP already installed |
| **vibe-lens** (P1, L) | web posture: perf + a11y + SEO | three uncovered dimensions, one Lighthouse-shaped surface; homepage build plan already hand-ran exactly this |
| **vibe-net** (P1, M, thin) | composite posture + composite gate | 13 routers, no single "where does this app stand"; prework: vibe-doc:check exit codes + vibe-prompt:gate |

## What the critic flagged that the lenses missed

The full list is in the run artifacts; the ones that should shape the next pass:

- **Run cost of the net itself.** Nobody measured token burn or wall clock of running 13+ plugins on one app, and no recommendation states its model tier despite the family ratifying model-tiering the same week. A net too expensive to run doesn't get run.
- **Tag mutability.** Stable refs pin tag *names*; a force-moved tag silently changes what users install. GAP-03's smoke checks refs resolve, not that they still point at the audited commit. SHA-pinning or immutability verification deserves a look.
- **Prompt injection against the family's own skills.** :spy and :competitive fetch arbitrary URLs into context; GAP-15 deliberately funnels untrusted issue text into bug-bash. The family audits its targets' injection surface and never examined its own.
- **False-positive economics.** No suppression/baseline mechanism, no precision tracking. False REDs determine whether anyone keeps a composite gate on.
- **vibe-sec scope creep.** Six recommendations widen vibe-sec (09, 17, 25, 26, 27, 30). The family's own lesson says concern boundaries justify separation; whether "static posture of everything" is one concern or a kitchen sink should be decided deliberately, sequenced across releases, and vibe-sec's missing L2/L3 self-evolution loop shipped alongside.
- Also unexamined: multi-user/team usage of .vibe/ state, macOS/Linux portability of the net itself, crash/stale-state behavior of plugin runs, CI/CD workflow files as a scanned surface, i18n, vendor-ToS/content-moderation obligations for AI apps, and systematic self-application (running the net on the 13 solo repos as policy).

## Addendum — today-slate execution (same day)

The four "today" items shipped within hours of the analysis:

- **thesis-engine v0.2.3** (`cbe9de2`, promoted): Marcus line removed, 12 absolute paths genericized, hardcoded dashboard project ID + MCP tool name replaced with backend-agnostic phrasing per the decision-log STANDARD, SKILL frontmatter version drift (0.2.1) fixed. The verification sweep found three project-ID sites beyond the workflow's finding — the leak was bigger than reported.
- **vibe-cartographer v1.10.1** (`9fcf140`, promoted): `/build` now runs `/vibe-sec:gate` (exit 0/1/2) alongside `/vibe-test:gate`; the stale "pre-release, skip it" parenthetical is gone, and the read-dependency note names both gate contracts. The dead npm version check in `/onboard` (pointing at a channel stale at 1.7.3) removed under its own removal clause.
- **vibe-doc v0.8.1** (`aa7e3c0`, promoted): all 36 `npx vibe-doc` call sites across the shipped README, command files, and SKILL bodies now use `npx @esthernandez/vibe-doc-cli`; global-install line and taxonomy mention updated. The bare-name 404/squat exposure is closed at the instruction layer (defensively publishing the bare name remains an option).
- **GAP-11 (walk tour a11y)**: landed on vibe-walk canary only — promotion gated on the Celestia3 dogfood per the family validation norm.

Status correction (same day, GAP-26): Celestia3's Android build is **in process, not shipped** — Play ID verification cleared and the SDK is installed, but no APK/AAB has been distributed. The GPL finding is therefore a pre-flight gate on the first Play upload, not a live conveyance violation. (The web app delivering the WASM to browsers remains a strict-reading gray zone; a commercial license moots both surfaces.)

Marketplace refs bumped for all three scrubs; full-manifest validation passed (13/13 tags resolve, version-tag match across the board). Residual exposure accepted for now: v0.2.2 and prior content remains reachable via git history; erasing it would take history rewriting on a public repo, disproportionate to an employer-name mention plus local paths — Este's call if he wants the nuclear option.

## Run artifacts

- Full workflow output (maps, verdicts, sketches, critic): `C:\Users\estev\AppData\Local\Temp\claude\C--Users-estev-Projects-vibe-plugins\c304f157-8b27-48de-9164-cca66296deba\tasks\w3c3uwt9j.output`
- Extracts: `C:\Users\estev\AppData\Local\Temp\vibe-net\` (recs, critic, verdicts, verified-summary, verified-detail, maps-condensed)
- Sweep: 82 agents, 1,131 tool uses, 41 min. 35 raw → 30 deduped → 29 confirmed + 1 value-killed.
