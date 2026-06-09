# Anchor-Injection & Substrate Decision Tree — Wave 2 Deep-Dive

> **Researcher:** Wave 2 Deep-Dive (anchor-injection automation boundary + substrate decision tree)
> **Date:** 2026-05-21
> **Reads:** `_shared-context.md`, `findings/tour-tech-scout.md`, `findings/anti-pattern-contrarian.md`, `process-notes.md`
> **Closes gaps:** Shared-context open gaps #4 (anchor-injection automation boundary) and #6 (substrate decision tree)
> **Tools used:** context7 (Driver.js /nilbuild/driver.js, React Joyride /gilbarbara/react-joyride, Shepherd.js /shipshapecode/shepherd, NextStep /enszrlu/nextstep, Reactour /elrumordelaluz/reactour), WebSearch (jscodeshift/ts-morph/Babel JSX attribute codemods), WebFetch (nextstepjs.com, msahilhussain Medium, ts-morph docs)

---

## Section 1 — Anchor-Injection Automation Boundary

### What the question is actually asking

Phase 2 of every Vibe-Walk run includes an "anchor-injection pass" — adding `data-tour="<semantic-name>"` attributes (or `id="tour-<name>"` for NextStep) to the host app's components. The cowpath (Celestia3) did this entirely by hand. The open question: how much of that pass can be safely automated by a codemod/AST tool, and where does automation break down hard enough that human review is the only safe path?

### The codemod landscape for JSX attribute insertion

Three tools handle JSX AST manipulation in practice:

**jscodeshift** (Facebook) — The standard. Wraps `recast` (preserves formatting). Operates on `.js`, `.jsx`, `.ts`, `.tsx`. Can find JSX elements by tag name and insert attributes. A well-documented production use-case is adding `data-test-id` or `data-testid` to HTML elements — same operation class as adding `data-tour`. Known limitations:
- Adds extra parentheses around JSX blocks in return statements when attributes are inserted (open bug, jscodeshift #534; cosmetic, not correctness-breaking but triggers linter warnings)
- Element discovery relies on a static tag-name whitelist — custom components not in the list are silently skipped
- Cannot resolve dynamic component names (components referenced through variables or factory calls)

**ts-morph** (dsherret) — TypeScript Compiler API wrapper. Has first-class `JsxAttribute` and `JsxElement` AST nodes. Supports `.addAttribute()` on `JsxOpeningElement`. Type-aware, which makes it stronger than jscodeshift for catching re-exports and alias imports. Limitation: JSX-specific APIs are less documented than the rest of ts-morph; some edge cases (spread attributes, fragments with no element wrapper) fall back to `.replaceWithText()` — a blunt instrument.

**Babel** (plugins / `@babel/parser` + `@babel/traverse`) — Can traverse JSX and modify attribute lists. Used in Hypermod and react-codemod. Same class of limits as jscodeshift on static analysis; Babel adds transpilation context which helps detect JSX pragma variants (`@jsxRuntime`, React.createElement style).

**Verdict for Vibe-Walk:** jscodeshift is the practical default for automation (widest adoption, most codemod examples, handles `.tsx` with `--parser tsx`). ts-morph is the right choice if the host app uses TypeScript strictly and re-export chains need tracing. Babel plugin is the right choice only if the host uses a non-standard JSX pragma (Preact, Solid, etc.).

### What automation can safely do

These cases have known-good automation paths with no structural ambiguity:

1. **Intrinsic HTML elements** — `<div>`, `<button>`, `<input>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<main>`, `<aside>`, `<ul>`, `<li>`, `<a>`, `<span>`, `<form>`, `<label>`. jscodeshift finds these by case-sensitive tag name match. Adding `data-tour="x"` is safe when: no existing `data-tour` attribute is present AND the element is the outermost wrapper of the target region AND the element already has a stable `id` or `className` that Vibe-Walk's Phase 1 used to identify it.

2. **Simple named custom components where the component file is local and directly imported** — e.g., `<Sidebar>`, `<Dashboard>`, `<NavMenu>`. AST tools can find usages by component name if the import is explicit. Attribute insertion is safe when the component has a spread-props pattern (`{...props}`) that will forward `data-tour` to the root element, OR when the component is known to accept arbitrary HTML attributes (documented or via `React.HTMLAttributes` in TypeScript).

3. **Components with an existing stable `id` or `data-testid`** — these are already uniquely identified. Codemod can add `data-tour` alongside the existing attribute on the same element without risk of selecting the wrong node.

4. **Single-file components with a clear single root element** — no conditional rendering at the root, no fragment, no switch-render. The outermost `return (<X>...)` is unambiguous.

### What automation cannot safely do — requires human review

These cases break automation assumptions hard:

**1. Components that render via a HOC (Higher-Order Component)**
The usage site (`<EnhancedDashboard>`) doesn't reflect the rendered DOM element. The `data-tour` attribute added at usage site may or may not be forwarded depending on whether the HOC spreads props. Automation cannot know. A codemod that adds `data-tour="dashboard"` to `<EnhancedDashboard>` may silently attach to a wrapper div the user never sees.

**2. Components with conditional root element**
```jsx
// Automation cannot determine which branch to annotate
return isAdmin ? <AdminPanel {...props} /> : <UserPanel {...props} />;
```
Both branches might need `data-tour`. Automation that adds to the outer expression inserts into the ternary expression node, not an element — AST error. Automation that picks one branch arbitrarily misses the other.

**3. Spread-props without `React.HTMLAttributes` typing**
```jsx
const Sidebar = ({ children, ...rest }) => <div {...rest}>{children}</div>
```
The component forwards unknown props, so `data-tour` added at the usage site will reach the DOM. But automation cannot verify this without type analysis. Without TypeScript strict typing, it's a judgment call — safe to automate only if the team confirms the forwarding convention.

**4. Elements inside shadow DOM** (Web Components, Stencil, lit-element)
`document.querySelector()` and AST traversal both fail here. The element is in a separate component tree with its own DOM boundary. No codemod can safely add a `data-tour` attribute to a shadow-DOM-internal element by operating on the host app's files. Manual injection inside the component's own template is the only path.

**5. Dynamic components — `React.lazy`, `import()`, variable-assigned components**
```jsx
const Panel = lazy(() => import('./Panel'));
// or
const Component = componentMap[route];
```
AST tools operate on static imports. A component whose identity is resolved at runtime is invisible to the codemod. Human review required to trace to the actual rendered element.

**6. Render-prop and children-as-function patterns**
```jsx
<DataProvider>
  {({ data }) => <TargetPanel data={data} />}
</DataProvider>
```
The tour stop is `TargetPanel`, which renders inside a callback. The parent element (`DataProvider`) is what's visible at the AST level in the usage file. Codemod would need to follow the callback — static analysis can't do this reliably.

**7. Third-party library components without a forwarded ref or `data-*` passthrough**
`<RadixDialog.Root>`, `<ChakraButton>`, `<MUITextField>` — these wrap their own DOM. Adding `data-tour` at the usage site usually does NOT reach the visible DOM element. The anchor must be added inside the component's own source, which the host app typically doesn't own. Requires wrapping the component in a `<span data-tour="x">` wrapper (human judgment call on layout impact) or choosing a different anchor strategy.

**8. SSR-rendered components with client-side hydration shells**
In Next.js App Router, a server component's rendered HTML is sent as static markup; the tour needs to target the hydrated client version. The anchor can be added in the server component's JSX (it will survive hydration if it's on a standard HTML element), but if the server component renders conditionally based on server-only data, the codemod cannot know whether the element will be present.

**9. Elements identified only by CSS Module class names (pre-injection state)**
Phase 1 identified these stops via their CSS Module class (e.g., `styles.chartArea`). The codemod could match by `className` value, but the hash is build-specific. Matching against the source class name (pre-hash) requires reading the CSS Modules file to reconstruct the mapping. Possible but fragile — a medium-confidence automation case.

**10. Components that return fragments at the root**
```jsx
return (
  <>
    <Header />
    <Main />   {/* ← which one gets data-tour? */}
    <Footer />
  </>
);
```
No single root element to annotate. The tour-stop element is one of the children, but the codemod can't know which one without Vibe-Walk's Phase 1 intent — human must pick.

### The automation boundary as a ratio

Based on production codemod experience with `data-testid` injection at scale:

| App type | Automatable stops | Human-review stops |
|---|---|---|
| Simple React app, intrinsic HTML elements, direct imports | ~70–80% | ~20–30% |
| React app with heavy component composition, HOCs, Radix/MUI | ~30–40% | ~60–70% |
| Next.js App Router with server + client components | ~50–60% | ~40–50% |
| Tailwind-only, no stable selectors, fragments everywhere | ~15–25% | ~75–85% |

These are effort-estimate calibrators, not guarantees. The Phase 1 anchor-readiness verdict should surface which bucket the app falls into before Phase 2 begins.

### Codemod approach Vibe-Walk should use

The right shape for Vibe-Walk's automated injection pass:

```
1. AST-scan all .jsx/.tsx files for JSX elements matching the Phase 1 stop list
2. For each candidate element:
   a. Check: is it an intrinsic HTML tag or a directly-imported named component?
   b. Check: does it have a single unambiguous root return path?
   c. Check: does it NOT use HOC wrapping, dynamic import, or render-prop pattern?
   d. Check: is data-tour absent (idempotency guard)?
   e. If all four pass → AUTO-INJECT
   f. If any fail → emit REVIEW_NEEDED with specific reason
3. Output: (a) modified files + patch, (b) REVIEW_NEEDED list with per-item reason
4. Human confirms REVIEW_NEEDED items before Phase 2 proceeds
```

Tool recommendation: jscodeshift with `--parser tsx` for mixed TS/JS repos; ts-morph if the host is strict TypeScript and prop-forwarding inference is needed.

---

## Section 2 — Substrate Decision Tree

### Library verification summary (context7-confirmed)

Before the tree: confirmed lazy/function-form targeting support across all five libraries, cross-referenced against tour-tech-scout.md findings.

| Library | Lazy element eval | Async wait for mount | SSR-safe by default | Multi-page (routing) | ID-only anchor | JSON-serializable steps | Bundle (gzip) |
|---|---|---|---|---|---|---|---|
| **Driver.js** | Yes — `element: () => querySelector(...)` | No built-in async wait; use function form + poll | No — needs `useEffect` or dynamic import | No | No | **Yes** (no JSX in steps) | 5.9 KB |
| **Shepherd.js** | Yes — `attachTo.element: () => querySelector(...)` at `before-show` | Yes — `beforeShowPromise: () => Promise` | No — SSR crash documented (issue #342) | No | No | Yes (with caveats: no callback fields) | 13.7 KB |
| **Reactour** | No function form; relies on `mutationObservables`/`resizeObservables` | No async hook; observer-based repositioning | Partial — `TourProvider` renders on server; DOM queries client-only | No | No | No (content is ReactNode) | 7.0 KB |
| **React Joyride** | Yes — `target: () => getElementById(...)` | **Yes — `before: async () => Promise`** (blocks step until resolved; `beforeTimeout` available) | No — `window` at import time; needs `ssr: false` dynamic import | No | No | No (content is ReactNode) | 25.0 KB |
| **NextStep.js** | No | No | **Yes — built for App Router; handles hydration** | **Yes — `nextRoute`/`prevRoute` first-class** | **Yes (id only, no data-attr)** | No (content is ReactNode) | ~30 KB+ (motion peer dep) |

Key confirmations from context7 docs:
- Driver.js `setSteps()` and `setConfig()` both verified at runtime — JSON config fetch pattern confirmed
- Shepherd.js `beforeShowPromise` confirmed as the async-wait mechanism (distinct from lazy eval)
- Reactour `mutationObservables` confirmed as CSS selector arrays on `StepType`; no function-form element targeting
- React Joyride `before: async () => Promise` confirmed per step; `beforeTimeout` sets max wait
- NextStep.js `selector` confirmed id-only: targets `id` attribute, no CSS attribute selectors, no `data-*` support (verified against nextstepjs.com live docs)

### The decision tree

```
START: What is the host app's framework and deployment model?
│
├── NOT React (Svelte, Vue, Astro non-React, vanilla JS, Alpine)
│   └── → DRIVER.JS (only viable choice; Shepherd.js also works as fallback)
│
├── React-based
│   │
│   ├── Does the app use Next.js App Router AND the tour spans multiple routes?
│   │   ├── YES → NEXTSTEP.JS
│   │   │         Caveats: (a) requires id injection (not data-tour), use id="tour-<name>"
│   │   │                  (b) Framer Motion peer dep adds ~30 KB — confirm host already uses it
│   │   │                      or budget for it; if budget is tight, route-spanning with Driver.js
│   │   │                      + manual pushRouter() calls is a fallback
│   │   └── NO → continue
│   │
│   ├── Does the app have shadow DOM components (Web Components, Stencil, lit-element)?
│   │   └── YES (any tour stop inside shadow DOM) → NO VIABLE SUBSTRATE
│   │         Emit: "UNTOURABLE SURFACE — shadow DOM boundary blocks querySelector"
│   │         Recommend: remove that stop, or scope tour to non-shadow surfaces only
│   │
│   ├── Does the host app use SSR (Next.js, Remix, Astro React)?
│   │   AND is the app owner config-only (no dropped-in module)?
│   │   ├── YES, config-only + SSR → DRIVER.JS
│   │   │   (JSON config + 5-line bootstrap; add dynamic import + `ssr:false` guard;
│   │   │    Driver.js is the only library with fully serializable step config)
│   │   └── NO / dropped-in module OK → continue
│   │
│   ├── Does the host app have dynamic mounts (AJAX-loaded content, lazy panels,
│   │   route-gated views) at planned tour stops?
│   │   ├── YES, need to WAIT for element mount (not just lazy-find it)
│   │   │   └── REACT JOYRIDE
│   │   │       `before: async () => { await waitForElement(); }` is the cleanest solution
│   │   │       Caveat: 25 KB gzip — largest React option; React 16.8+ required
│   │   └── YES, element lazy-mounts but timing is predictable (animation, tab-switch)
│   │       → DRIVER.JS function-form OR SHEPHERD.JS beforeShowPromise
│   │         (Driver.js preferred for framework-agnostic output even in React apps)
│   │
│   ├── Is the host app's component tree heavily animated or re-rendering
│   │   (e.g., data dashboards, live-updating panels, drag-and-drop surfaces)?
│   │   ├── YES → REACTOUR
│   │   │   `mutationObservables`/`resizeObservables` automatically reposition the mask
│   │   │   on DOM mutation — best-in-class for re-rendering UIs
│   │   │   Caveat: no function-form targeting; steps must be on stable selectors or
│   │   │   elements that are present when step fires; `data-tour` CSS selector form works
│   │   └── NO → continue
│   │
│   ├── Does the host owner WANT idiomatic React integration
│   │   (prefer hooks, ReactNode content, ref-based targeting)?
│   │   AND is bundle size not a concern?
│   │   ├── YES → REACT JOYRIDE (most idiomatic; useJoyride hook; ref-based target)
│   │   └── NO → DRIVER.JS (default; also works in React; no React coupling)
│   │
│   └── DEFAULT → DRIVER.JS
│       (5.9 KB, MIT, zero deps, JSON-serializable, setSteps() runtime config,
│        function-form lazy eval, works in React and every other framework)
│
└── ALWAYS CHECK BEFORE FINALIZING:
    ├── Intro.js anywhere? → REJECT (AGPL-3; commercial license required)
    └── Shadow DOM stops? → FLAG AS UNTOURABLE; remove or scope around them
```

### Decision tree in plain English (for the plugin's Phase 1.5 interview gate)

The Phase 1.5 substrate question default is: **Driver.js, unless one of the following override conditions is true.**

| Override condition | Override substrate | Reason |
|---|---|---|
| Non-React app (Svelte, Vue, vanilla) | Driver.js — mandatory, no option | React libs are hard-dep on React |
| Next.js multi-route tour | NextStep.js | `nextRoute`/`prevRoute` is first-class; no other library handles route transitions natively |
| Config-only output requested | Driver.js — mandatory | Only library with fully JSON-serializable step schema |
| Heavy re-rendering / animated surfaces | Reactour | `mutationObservables` mask repositioning; no other lib handles this |
| Need to ASYNC WAIT for element mount | React Joyride | `before: async Promise` blocks step; strongest dynamic-mount solution |
| Shadow DOM present at any stop | No tour for that stop | Hard wall — `querySelector` cannot cross shadow boundary |
| Framer Motion already in bundle AND Next.js multi-route | NextStep.js | Budget absorbed; idiomatic |
| Host wants idiomatic React, bundle not a concern | React Joyride | useJoyride hook, ReactNode content, ref-based targets |

**NextStep.js id-injection note:** When NextStep is the substrate choice, the anchor-injection contract changes. `data-tour` attributes do NOT work with NextStep — it only reads `id` attributes. The anchor pass must inject `id="tour-<semantic-name>"` instead. Document this fork in the output's anchor map.

---

## Artifacts

---

### ARTIFACT A — ANCHOR-INJECTION BOUNDARY

**Automatable (safe to codemod with jscodeshift/ts-morph):**

- [ ] Intrinsic HTML elements (`div`, `button`, `nav`, `section`, `header`, `main`, `aside`, `ul`, `li`, `a`, `span`, `input`, `form`, `label`) with a single unambiguous root
- [ ] Directly-imported named custom components that spread `{...props}` or explicitly accept `data-*` via `React.HTMLAttributes` in TypeScript
- [ ] Components with an existing stable `id` or `data-testid` — add `data-tour` alongside on the same element
- [ ] Single-file components with a single return path (no ternary or `&&` at the root level)
- [ ] Components whose Phase 1 stop was identified via a stable `id` (automation just adds `data-tour` as a second attribute on the same element)

**Human-review required — do NOT automate:**

- [ ] HOC-wrapped components — forwarding is not guaranteed; automation may attach to invisible wrapper
- [ ] Components with conditional root element (ternary at top-level return, `if` returning different elements)
- [ ] Spread-props without TypeScript `React.HTMLAttributes` typing — forwarding unverifiable
- [ ] Elements inside shadow DOM — AST traversal cannot cross the boundary; manual injection inside component template only
- [ ] Dynamic components (`React.lazy`, `import()`, variable-assigned component identity)
- [ ] Render-prop / children-as-function patterns — codemod sees only the callback definition, not the rendered element
- [ ] Third-party library components (Radix, Chakra, MUI, shadcn) — `data-tour` at usage site does NOT reach DOM; wrap with `<span data-tour="x">` after human decision on layout impact
- [ ] SSR server components rendering conditionally on server-only data — cannot verify element presence at tour-fire time
- [ ] Elements identified only by CSS Module class names (pre-injection state) — hash reconstruction required; medium-confidence at best
- [ ] Fragment-rooted components (`<>...</>` at root) — no single element to annotate; human picks the child

**Codemod output contract:**
The automation pass MUST emit two artifacts: (1) modified files + diff patch, (2) `REVIEW_NEEDED.md` listing every skipped element with the specific reason code from the list above. Phase 2 does not proceed until the human confirms or resolves the REVIEW_NEEDED list.

**Tool recommendation:** jscodeshift with `--parser tsx` for mixed JS/TS repos; ts-morph for strict TypeScript repos where prop-forwarding inference via type system is needed.

---

### ARTIFACT B — SUBSTRATE DECISION TREE

```
Is the host app NOT React (Svelte, Vue, vanilla, Alpine, Astro)?
  YES → DRIVER.JS (mandatory; all React libs are hard-dep on React)

Is any planned tour stop inside a shadow DOM?
  YES → UNTOURABLE STOP — remove it or scope around it; no substrate fixes this

Is the output shape config-only JSON (no dropped-in module)?
  YES → DRIVER.JS (mandatory; only library with fully JSON-serializable steps)

Is the app Next.js App Router AND tour spans multiple routes?
  YES → NEXTSTEP.JS
        ⚠ Anchor contract changes: use id="tour-<name>", NOT data-tour
        ⚠ Framer Motion peer dep (~30 KB) — confirm already in bundle or budget it

Does any stop need to ASYNC WAIT for element mount (AJAX data, lazy panel, animation)?
  YES → REACT JOYRIDE (before: async hook blocks step; strongest dynamic-mount solution)

Is the host a React app with heavily animated / re-rendering components at stop elements?
  YES → REACTOUR (mutationObservables/resizeObservables auto-reposition mask on DOM changes)

Does the host owner explicitly want idiomatic React integration (hooks, ReactNode content)?
  AND bundle size is not a concern?
  YES → REACT JOYRIDE

DEFAULT → DRIVER.JS
  (5.9 KB gzip, MIT, zero deps, vanilla JS, JSON-serializable steps,
   setSteps() runtime config, function-form lazy eval, works in any framework)

ALWAYS BLOCK:
  Intro.js anywhere → REJECT (AGPL-3 commercial license required)
```

**Substrate + anchor contract cross-reference:**

| Substrate | Anchor attribute | CSS selector form | Lazy eval mechanism | SSR guard required |
|---|---|---|---|---|
| Driver.js | `data-tour="name"` | `[data-tour="name"]` | `element: () => querySelector(...)` | `useEffect` or dynamic import |
| Shepherd.js | `data-tour="name"` | `[data-tour="name"]` | `attachTo.element: () => querySelector(...)` at `before-show` | Dynamic import (avoids SSR crash, issue #342) |
| Reactour | `data-tour="name"` | `[data-tour="name"]` | `mutationObservables: ["[data-tour='name']"]` (observer-based) | `'use client'` + `useEffect` guard |
| React Joyride | `data-tour="name"` | `[data-tour="name"]` | `target: () => getElementById(...)` OR `before: async ()` | `dynamic(() => import('react-joyride'), { ssr: false })` |
| NextStep.js | `id="tour-name"` | `#tour-name` | None — id must be present when step fires | Built-in (App Router native) |

---

## Effort estimate calibration (feeds Phase 1→2 estimate)

The combination of the two artifacts produces a concrete effort estimate:

| Scenario | Anchor pass | Substrate | Effort level |
|---|---|---|---|
| Simple React app, mostly intrinsic HTML, Driver.js default | ~75% automatable | Driver.js | Config job — 2–4h |
| React app with HOCs, Radix/MUI components, Tailwind-only | ~30% automatable, ~70% REVIEW_NEEDED | Driver.js | Config + component edits — 1–3 days |
| Next.js App Router, multi-route tour, NextStep | id injection required everywhere | NextStep.js | id injection pass + config — 1 day |
| Non-React app (Svelte/Vue) | data-tour on HTML elements only | Driver.js | Config job — 2–4h |
| Any app with shadow DOM stops | Remove those stops | Any | Reduced scope; document hard wall |

---

*Sources consulted (Wave 2 research):*
- context7: /nilbuild/driver.js — setSteps(), setConfig(), function-form element, runtime config
- context7: /gilbarbara/react-joyride — before async hook, target function form, useJoyride
- context7: /shipshapecode/shepherd — attachTo lazy function, beforeShowPromise, before-show phase
- context7: /enszrlu/nextstep — selector id-only, nextRoute/prevRoute, Tour config schema
- context7: /elrumordelaluz/reactour — mutationObservables, resizeObservables, StepType API
- nextstepjs.com/docs/nextjs/tour-steps — confirmed id-only selector, no data-* support
- jscodeshift issue #534 — extra parens on JSX attribute insertion (cosmetic bug)
- DyadicGit/add-test-ids-script — production example of automated data-attr injection
- msahilhussain/Medium — jscodeshift JSX transformer: whitelisted tags, custom component limits
- Hypermod React/JSX guide — codemod capabilities and spread props limitations
- WebSearch: ts-morph JsxAttribute.ts, JsxElement.ts — confirmed API exists; edge cases underdocumented
