# Seed: vibe-market — the copy and listing pillar

**Status:** SEED FROM DECISIONS, written 2026-10-01. Named as `plugins/vibe-market` in three dashboard decisions across two projects: 626 Labs Marketing System (`8dQtfukZLQQMzSH78baY`, `kB824oICaUrtlCa9mgFk`, both 2026-08-21) and Store Listing Console (`nqLis9wVHwWmeNeSh3Zj`, 2026-09-11). The Sonnet 5.5 board (2026-09-30) flagged it as the one named seed with no spec-bank entry. No family cowpath has been walked yet; the cowpath that exists is store-listing-console's per-app `voice.md` plus copy-reviewer sandwich, walked on five apps and through real Store submissions.

## The job nobody owns

Marketing copy for the estate spans six repos (626labs-hub, vibe-thesis, vibe-cartographer, Celestia3, POD_Pipeline, 6deux6), two config seats and three Microsoft Store apps. Because it lived nowhere, the banned-word list drifted into four copies that were not the same list, and nobody noticed until someone put them side by side. The doctrine now has a home repo (`626labs-marketing`: seven principles, each backed by a quote from a file that already enforces it, plus a five-stage pipeline CAPTURE / VOICE / DRAFT / LINT / SHIP stated as what each stage may and may not do). The doctrine is descriptive. Nothing portable enforces it in a repo that is not the hub:

- `/announce` lives in 626labs-hub and is driven by the hub's `site.json`, so no other repo can announce.
- The copy-reviewer and visual-asset-reviewer agents are advisory by prose only (no allowed-tools restriction).
- The canonical `docs/banned.md` has two deliberate inline mirrors (the global seat `CLAUDE.md`, which is always loaded while the canonical is not, and 6deux6, a headless pipeline with zero runtime reads). Mirrors are annotated with sync dates, which makes drift detectable by comparison and by nothing else.

## What the three decisions settled (evidence, not aspiration)

1. **Permissions are the content.** The pipeline contract is written as a "may" and "may not" column per stage because the thesis is that AI marketing reads as AI when nothing in the pipeline is permitted to refuse. The design rationale traces to STAR's research-ai-aversion finding: any tool touching someone's material keeps the seam visible between what the machine found and what the human wrote.
2. **An external claim gate already works.** STAR's `check_scene` pointed at marketing prose returned parse rate 1.0 over six claims, labelled a planted fabricated statistic unverifiable with zero citations, and separately corrected a Microsoft Store revenue-split claim a human had written believing it true. The machinery generalises with no code change. What is missing is a claims taxonomy fit for copy and a room built from a product corpus.
3. **The voice profile is evidence-based and the review sandwich pays on day one.** Every console app carries `copy/voice.md`, an audience and register profile on top of the doctrine floor, with each register anchored to the app's own best existing line rather than invented. Drafting runs DRAFT, then copy-reviewer against `voice.md` plus `banned.md`, then DRAFT-flagged proposal sections the engine does not parse, promoted to real headings only on approval. The first pilot caught a reworded trademark block that had dropped "or endorsed by", the legally load-bearing half, and that catch surfaced the same weak variant live on a published listing. The reviewer also missed once, flagging "fullscreen canvas" as unsourced because it was not handed the live description. A parser defect (a fenceless heading swallowing the next section's fence) put the wrong text under the wrong caps one copy button from the Store before it was caught. The profile's **named second reader** earned its keep on SnapSnip: the reviewer, reading as the privacy-minded IT admin the profile names, caught a privacy headline contradicted by the draft's own telemetry sentence two paragraphs later, and the fix made the telemetry paragraph proof instead of contradiction.

Adjacent evidence from the Store submissions themselves (RORORO and Sanduhr decisions, September 2026): listing text and package ship out of step unless something checks them together. Sanduhr 3.4.0 published with 3.3's description because the commit came from Partner Center's own view. RORORO 1.32's six localized sheets still carried the 1.31 what's-new block, and the only signal was a console warning that the what's-new did not open with the version.

## Plugin shape (three commands, thin by design)

- **`:lint`** — the portable copy linter. Inputs: the copy under review, the app's `voice.md` if present, the canonical banned list (fetched or pinned, with a mirror-drift check against any inline copy in the repo), and, when the copy is a listing, the **live** listing text. Checks the doctrine rules that are mechanical: banned terms, per-field caps (weighted where the surface weighs, X counts CJK at 2 and any URL at 23), the verbatim trademark block where the ruling says it binds, version-bound text that does not open with the version, and a claims list emitted for an external gate. Output keeps the seam visible: what the linter found, what the human wrote, never a silent rewrite.
- **`:announce`** — cross-repo announce driven by `.vibe-market/config.json` rather than the hub's `site.json`. Emits per-surface drafts (hub Field Note, release post, Store what's-new, short post) as DRAFT-flagged sections. It drafts and never posts; SHIP stays with the consoles.
- **`:voice`** — scaffold or refresh an app's `voice.md` from its own best lines: an interview plus evidence pass, the console pattern generalised to any repo. Refuses to invent a register with no anchoring line.

Composes with, never duplicates: `store-listing-console` and `publishing-console` own SHIP; `626labs-marketing` owns the doctrine text, the glyph module and the canonical banned list; STAR is an optional external claim gate once the copy taxonomy exists; `vibe-launch :release` calls `:lint` on CHANGELOG, release notes and what's-new when they are present, which is where the out-of-step class is cheapest to catch; `vibe-lingual` owns translation, `:lint` only checks that each locale's version-bound text opens with the version.

## Invariants the evidence imposes

- **Reviewers only know the sources they are handed.** `:lint` takes the live listing as an input and reports when it was not given one. It never assumes the dev tree is what is published.
- **Mirror, do not pointer, where the canonical is not loaded.** Inline banned-list mirrors are allowed and expected. The linter's job is to detect mirror drift, not to forbid mirrors.
- **A draft never promotes itself.** Every output is a proposal section a human promotes. No command writes into a live field.
- **The seam stays visible.** Machine findings and human text are never merged into one voice.
- **No telemetry, no posting.** The plugin phones home to no one and publishes nothing.

## The named next act (cowpath, before any birth)

Walk the console sandwich once outside the hub, by hand: take this marketplace's own storefront copy (the README rows and the `marketplace.json` descriptions, which `CLAUDE.md` names as the voice surface), lint it against `626labs-marketing/docs/banned.md` and a `voice.md` drafted for the storefront, and record every finding. If the hand walk finds nothing, the storefront is the control and the next walk is a Store listing. If it finds something, the plugin has a first job and the process-notes become the SKILL seed. Only then scaffold the solo repo.

## Boundaries

- Not a publisher, not a glyph renderer, not a translator, not STAR.
- Three cheap items from the decisions are not plugin work and should not wait on it: allowed-tools restrictions on copy-reviewer and visual-asset-reviewer, the sweep of stale `626labs-design` pointers in 626labs-hub, and the open ruling in `rbx15/voice.md` on which fields the verbatim trademark block binds.
- Family conventions at birth: solo repo `vibe-market`, no telemetry, session and friction loggers plus `:evolve-market` from day one, state in `.vibe-market/`, real-app validation on the console's five apps and this marketplace's storefront. Tag convention plain `vX.Y.Z`.
