# vibe-recall cowpath run, 2026-08-11

Task 1 of [the v0.1 plan](plans/2026-08-11-vibe-recall-v0.1.md). Hand-walked prior-art recall across the real estate against two specs, before any scaffolding. Seven findings; the gate asked for three. Two of them break the design as written.

**Targets**

| Case | Spec | Why this one |
|---|---|---|
| Cross-family | `RTClickPng/docs/spec.md` (WinUI 3, MSIX, .NET 10 AOT, P/Invoke, clipboard) | Prior art expected in a different repo family. The hard case. |
| Sibling-cluster | `ROROROblox/docs/spec.md` v1.20.0 (button theming) | 7+ sibling repos, one shipping theme work the same day. The common case. |

**Method:** ripgrep over the estate, walls and archives excluded, aggregated to repo level with match counts. No index, no tooling. Roughly 25 minutes across both.

---

## Finding 1: forks poison the corpus, and nothing in the design catches them

`PowerToys-snipsnap` ranked **first on six of seven probes**, by an order of magnitude:

| Probe | PowerToys-snipsnap | Next best |
|---|---|---|
| WinUI3 / MSIX | 426 | 119 (626-mod-launcher) |
| P/Invoke | 102 | 12 (rororo-ur-task) |
| settings.json | 136 | 44 (ROROROblox) |
| shell extension / COM | 78 | 15 (RTClickPng) |
| theme tokens | 210 | 21 (ROROROblox) |
| button visual states | 95 | 16 (ROROROblox) |

It is a fork of Microsoft's PowerToys. Remote is `estevanhernandez-stack-ed/PowerToys.git`, **2 commits total**, top author Dustin L. Howett, Este has exactly 1 commit. Thousands of files of someone else's code sitting inside the estate boundary.

A v0.1 built to the current design would confidently hand back Microsoft's implementation as "you already built this." That is not a ranking imperfection, it is the product being wrong about the one thing it claims.

**The detector is cheap:** authorship ratio from `git shortlog -sn` plus commit count against file count. PowerToys-snipsnap is 2 commits over roughly 5,000 files. `SnipSnap` is 57 commits, 100% Este. The design's three filters (tenant walls, archive exclusion, duplicate collapse) catch none of this, because a fork is not an archive, not a duplicate, and not a walled tenant.

**Name heuristics would fail too.** `SnipSnap` (57 commits, all Este, genuine prior art) and `PowerToys-snipsnap` (2 commits, Microsoft's code) differ by a prefix and are opposite in value.

## Finding 2: rare terms discriminate, common terms do not, and the ranking has no notion of rarity

The probe that cut cleanly through the fork noise was `theme-feed`: 14 hits in ROROROblox, 3 in rororo-ur-task, **zero in PowerToys-snipsnap**. Every generic technical probe drowned; the one domain-specific phrase landed exactly on the two repos that matter.

The design ranks by *field* (claims 10, gotchas 8, symbols 6, entrypoints 3, deps 2) and never by *term rarity*. A term appearing in forty repos scores identically to one appearing in two. That is backwards: the rare term is the one carrying information.

**Change:** weight each term by inverse document frequency across the card set, multiplied by the existing field weight. Cheap to compute at index time, and it independently dampens the fork problem because a vendored monorepo matches everything and therefore discriminates nothing.

## Finding 3: docs outnumber code, and intent reads exactly like implementation

RTClickPng's eight clipboard hits: six are docs (CHANGELOG, README, checklist, prd, reflection, spec), two are real code (`ClipboardWriter.cpp`, `ClipboardWriter.h`). SnipSnap's WinUI hits: eleven of twelve are docs.

The design weights `claims`, sourced from README, **highest of all fields at 10**, above `symbols` at 6. So a README describing an unbuilt feature outranks a repo with the function actually in source. For a tool whose entire job is finding code you can reuse, that ordering is inverted.

**Change:** symbols and entrypoints, which are derived from code, outrank claims and gotchas, which are derived from prose. Prose still earns its place for discovery, but it stops beating implementation. Cards should also carry a code-hit versus doc-hit split so a brief can say which kind of evidence it found.

## Finding 4: the current repo is its own top hit

Working in RTClickPng, RTClickPng ranked in its own results on clipboard (8), shell extension (15) and WinUI (19). Obvious in hindsight, absent from the design.

**Change:** exclude the current repo by default; offer `--include-self` for the case where you want to find your own earlier implementation of something.

## Finding 5: Windows path separators silently corrupted the first pass

`rg` emits `.\Repo\path` on this platform. Splitting on `/` produced garbage, and the first aggregation pass returned file lists rather than repo counts, truncating twenty thousand characters of output before any signal appeared. Nothing errored. It just quietly returned the wrong shape.

**Change:** normalize separators at every path boundary in the engine, and cover it with a test. This is the estate's documented failure class, showing up in a new place.

## Finding 6: spec artifacts go stale against their own repo

RTClickPng's `docs/spec.md` reads as pre-build, with open issues that "block `/build` start." Its `src/` holds **2,156 files**: every decoder, every encoder, the full interop layer, `ClipboardWriter.cpp`. The spec describes work that is substantially done.

Sweeping a spec for prior art therefore surfaces things you already have in the same repo. This is the strongest argument yet for the rule the design already carries, that the index may suggest but only a live read may claim, and it extends that rule: the sweep's own input can be stale, not just the cards.

**Change:** when a sweep runs inside a repo, check the spec's capability phrases against that repo's own code first, and say plainly "you have already built this here" before pointing anywhere else.

## Finding 7: duplicate clones would eat the banner, exactly as designed for

`Project-626Labs-1` and `Project-626Labs-gnx` returned near-identical counts on both probes that touched them (79 vs 73, then 10 vs 10). With a three-slot banner, two slots would go to the same content.

This one validates rather than breaks: the design's collapse-by-normalized-remote logic is load-bearing and the numbers prove it. No change.

---

## What recall was actually worth: the surprise

`Ur-OCR` surfaced on P/Invoke with nine code files: `CaptureEngine.cs` (GDI `BitBlt`, `CreateCompatibleDC`, `SelectObject`), `ElevationProbe.cs` (kernel32 with `SetLastError`), `WindowMetrics.cs`, `HotkeyService.cs`, `Loupe.xaml.cs`, `ColorPickerDialog.xaml.cs`.

An OCR tool. Nothing in its name or stated purpose suggests Win32 interop or WinUI dialog prior art, and it would never have come to mind while writing RTClickPng's spec. That is the entire product thesis surviving contact with the estate.

## Hand-written briefs

**Ur-OCR, GDI screen capture and Win32 interop**
`Engine/CaptureEngine.cs:12-19` — the full `GetDC` / `CreateCompatibleDC` / `CreateCompatibleBitmap` / `SelectObject` / `BitBlt` / `DeleteObject` / `DeleteDC` chain, correctly paired for release. `PluginHost/ElevationProbe.cs:10-13` carries the kernel32 `SetLastError = true` pattern. Reusable directly for RTClickPng's clipboard bitmap path. Gotcha visible in source: every handle acquisition has a matching delete, which is the part hand-rolled interop usually gets wrong.

**SnipSnap, MSIX packaging and winget distribution**
`tools/Pack-Msix.ps1` and `winget/626LabsLLC.SnapSnip.installer.yaml`. 57 commits, entirely Este's. This is the packaging pipeline RTClickPng's spec lists as an open issue under "decoder binary acquisition" and "MSIX signing." Note the winget identity says `SnapSnip` while the repo says `SnipSnap`, which is either a real published-identity detail or a typo worth checking before reuse.

**626-mod-launcher, Store submission reality**
`src/ModManager.App/Package.appxmanifest`, `scripts/build-velopack-release.ps1`, and `docs/store/` holding two real reviewer letters (`reviewer-letter-0.11.2.0.md`, `reviewer-letter-0.15.0.0-nexus.md`) plus a submitted privacy statement. 1,052 commits. RTClickPng's spec has "Microsoft Store listing" as a plan; this repo has already been through the review. The reviewer letters are the highest-value artifact in the estate for that step and no capability phrase would have found them, because they are prose about process, not code.

---

## Changes this run forces

| # | Change | Lands in |
|---|---|---|
| 1 | Fork and vendored-checkout filter via authorship ratio and commits-per-file | Design corpus resolver; new plan task after Task 5 |
| 2 | IDF term weighting layered over field weights | Design matcher; plan Task 8 |
| 3 | Code-derived fields outrank prose-derived; card carries a code/doc split | Design matcher and card schema; plan Tasks 7 and 8 |
| 4 | Exclude the current repo by default, `--include-self` to opt in | Design matcher; plan Task 8 |
| 5 | Normalize path separators everywhere, with a test | Plan Tasks 4 and 7 |
| 6 | Sweep checks the host repo's own code before pointing elsewhere | Design briefer; plan Task 11 |
| 7 | Duplicate collapse confirmed load-bearing | No change |

Findings 1 and 2 are the ones that would have shipped a wrong product. Neither was visible from the design.
