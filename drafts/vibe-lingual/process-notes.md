# VibeLingual — cowpath process-notes (seed)

> Captured walking the first real UI i18n by hand on Celestia3 (2026-06-20). This is the seed for
> the vibe-lingual plugin's /onboard cycle. The six blocks below are the scan-output template the
> plugin should emit for any app (handoff §7).

## 1. Framework & i18n detection

- Detect router type (App vs Pages), SSR boundaries, Turbopack, and whether an i18n lib is already present.
- Celestia3: Next 16 App Router + Turbopack, React 19, no i18n lib. Chose **next-intl** (only natural fit for App Router + SSR share route).
- **Decision that generalizes:** for apps where locale is a *user preference* (logged-in SPA), use next-intl "without i18n routing" (cookie-driven, locale = `NEXT_LOCALE` cookie mirrored from a `uiLanguage` user pref), NOT `/[locale]/` URL segments. URL routing fights auth redirects and existing share links, and adds zero value when the locale is a stored preference, not a URL concern.
- **Jest/ESM gotcha:** `next/jest` does NOT auto-transform next-intl 4.x (ships ESM-only). Fix: async-wrap `jest.config.js` to inject `next-intl|use-intl|intl-messageformat|@formatjs` into `transformIgnorePatterns`. **Generalizable rule:** i18n libs are ESM-only — the plugin must patch the test transform config when it wires the framework, or the existing test suite breaks on first run.

## 2. Surface inventory

- Routes + view/modal components (the site map). Celestia3: thin App Router, ~66 client components under one DashboardShell; one SSR public route at `/s/[shareId]`.
- The hand-pass proved the shape on a 4-surface slice: the settings language block (CosmicCalibration), the `/s/[shareId]` SSR not-found heading, a `common` namespace, and one TransitFeed date format. Full inventory (~65 components) is left to the plugin.

## 3. String-source audit (counts by kind)

- JSX text (~378), placeholder (28), aria-label (60), title (27), alt (19), toast/error (~51), locale-sensitive dates (22 `toLocaleDateString` calls). Total: ~600-800 distinct strings across ~65 components.
- **Lesson on ESLint scope:** `react/jsx-no-literals` reliably catches JSX **text** literals but is noisy on **attributes** (placeholder, aria-label, title, alt). The plugin's **scanner** must own attribute-literal detection itself — do not delegate to ESLint for this category.
- **Structural vs. presentational Intl:** `birthDateTime.ts`'s `'en-US'`/`'en-CA'` are tz-offset math, not display strings. The plugin must distinguish structural `Intl` usage (calendar arithmetic, locale-invariant parsing) from presentational usage (labels users see). Exclude structural — extracting them corrupts logic.

## 4. Existing-localization map

- What's already localized and by what mechanism. Celestia3: AI *output* is localized via a Gemini system directive (`SUPPORTED_LANGUAGES` + `buildLanguageDirective`), with a language picker and `outputLanguage` pref stored in Firestore. UI chrome: none prior to this hand-pass.
- **Lesson:** reuse the app's existing language list (`SUPPORTED_LANGUAGES`) for the UI locale picker; the plugin should detect this pattern and wire up to it rather than generating a parallel list.
- **Lesson on dual-locale model:** when an app already has output-language control, the plugin must model UI locale (`uiLanguage`) **separately** from content/output locale (`outputLanguage`). One picker controls AI generation language; the other controls chrome. They do not move in lockstep.

## 5. Gap + phased plan

Extract → wire framework → translate → wire-to-locale → guard. Lessons from walking each phase:

**(a) Catalog-load resilience.** Gate locale resolution on an `AVAILABLE` list of catalogs that actually exist, AND wrap the dynamic import in try/catch falling back to `en`. A selected-but-missing catalog must never crash the request — graceful partial rollout while catalogs are still being generated.

**(b) Locale sync.** A `SettingsContext` effect mirrors `uiLanguage` → cookie + `router.refresh()`, guarded by a cookie-difference check to avoid refresh loops. First paint after a fresh login may lag one render (cookie is set client-side, not available on the initial SSR pass). The plugin's wiring template must document this one-render lag so teams don't misread it as a bug.

**(c) Parity guard.** A recursive key-path equality test across all catalogs — catching both missing AND extra keys — is the highest-value reusable guard the plugin should emit. Generate it as part of the `guard` phase output.

**(d) Guard ratchet.** Flip `react/jsx-no-literals` to `error` per **fully-extracted file**, not per touched file. The rule is noisy on partially-extracted files (legitimate string fragments in JSX). Ratchet one file at a time; never apply it project-wide upfront.

**(e) Test-harness collateral.** Adding next-intl hooks to a component breaks its **existing** tests — they need a `NextIntlClientProvider` wrapper. The plugin should anticipate updating test harnesses as part of the extraction phase output, not leave it as a surprise. This is a mechanical, automatable fix.

## 6. Stack-specific gotchas

- **firebase-admin banned in Turbopack SSR** (only safe in `functions/`). SSR i18n loaders must avoid it. Detect firebase-admin imports in any App Router `page.tsx` or `layout.tsx` before wiring the locale loader there.
- **Timezone decision — do NOT set a global fixed `timeZone`.** next-intl warns `ENVIRONMENT_FALLBACK` when no explicit `timeZone` is set. For **client-rendered local dates** (e.g., TransitFeed transit dates), the browser-tz fallback is **correct** — a global fixed tz would shift dates by a day for distant users. Tests pin `timeZone="UTC"` for determinism only. SSR-rendered dates **would** need an explicit tz — that's a real per-app decision the plugin must surface as a prompt, not auto-resolve.
- **RTL surface.** The app layout assumes LTR. Flag before adding Arabic, Hebrew, or Urdu. No RTL work done in this hand-pass.
- **Anonymous SSR viewers** (share links) have no pref cookie → default to source locale. The AVAILABLE-list guard covers this case — `en` catalog is always generated first.

- **next-intl requires a `timeZone`** (global in the request config OR per-call) or it logs `ENVIRONMENT_FALLBACK` and falls back to the runtime zone. For client-rendered LOCAL dates, pass the browser-resolved zone per-call (`Intl.DateTimeFormat().resolvedOptions().timeZone`) to keep viewer-local behavior without the warning; only SSR-rendered dates want an explicit fixed zone. The plugin should emit a timeZone decision by default.
- **ESLint flat-config globs treat Next.js dynamic-route dirs as character classes:** a `files` entry like `src/app/s/[shareId]/page.tsx` SILENTLY never matches (the `[...]` is a minimatch char class). Use `src/app/s/*/page.tsx`. The plugin's guard emitter must glob dynamic-route segments with `*`, not the literal `[param]`, and should verify each guarded file actually resolves the rule (`eslint --print-config`).
- **`<html lang="en">` in the root layout should become `lang={locale}`** (async layout + next-intl `getLocale()`) in the plugin's Phase-3 full pass — currently hardcoded English even when rendering es/ja.

## What the hand-pass deliberately left to the plugin

~600-800 strings across ~65 components, all 10 locales, the full 6-block scan emission. The hand-pass proved the shape on a 4-surface slice (settings language block, the `/s/[shareId]` SSR route, a `common` namespace, one TransitFeed date); the plugin does the volume (Phases 2-4 of the arc).
