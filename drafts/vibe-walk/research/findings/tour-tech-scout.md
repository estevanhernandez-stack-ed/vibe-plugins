# Tour-Tech Scout — DEEP Findings

> **Researcher:** Tour-Tech Scout
> **Date:** 2026-05-21
> **Expedition:** Vibe-Walk Wave 0
> **Assignment:** 6 questions — Driver.js, Shepherd.js, Intro.js, Reactour, NextStep.js, React Joyride
> **Sources:** context7 (library docs, verified), bundlephobia via usertourkit.com/benchmarks (April 20 2026), web search, GitHub

---

## Q1 — Maintenance, bundle size, browser/framework requirements

### Verified library comparison table

| Library | Current version | Bundle (gzip) | Bundle (min) | Framework | Active 2025–26? | License |
|---|---|---|---|---|---|---|
| **Driver.js** | 1.4.0 | **5.9 KB** | 20.0 KB | Vanilla JS — zero deps | Yes (last publish ~6 mo ago per npm; 1.x line stable) | MIT |
| **Shepherd.js** | Latest on `main` | 13.7 KB | 39.7 KB | Vanilla JS core; React/Vue/Ember/Angular wrappers available | Yes (shipshapecode org, active repo) | MIT |
| **Intro.js** | 7.x | 16.5 KB | 60.4 KB | Vanilla JS; has React/Vue wrappers | Slowing — medium source reputation, fewer updates | **AGPL-3** (free tier limited; commercial license required for paid apps) |
| **Reactour** (`@reactour/tour`) | Latest | **7.0 KB** | 20.0 KB | **React-only** — requires `TourProvider` wrapper | Yes (active org) | MIT |
| **NextStep.js** (`nextstepjs`) | 2.1.1 (released 2025-05-21) | Not on bundlephobia — depends on `motion` (Framer Motion) | — | **React/Next.js only** — also supports Remix, React Router | Yes — very active (20 releases, last one today) | MIT |
| **React Joyride** | 3.x | **25.0 KB** | 73.1 KB | **React-only** — uses `react-floater` for positioning | Yes (active maintainer gilbarbara) | MIT |

*Bundle sizes sourced from usertourkit.com/benchmarks, measurements taken 2026-04-20 via bundlephobia API.*
*NextStep.js bundle not on bundlephobia; `motion` peer dep adds ~30 KB gzip on top — budget accordingly.*

**Minimum browser requirements:**
- Driver.js, Shepherd.js, Intro.js: Modern browsers (Chrome 60+, Firefox 60+, Safari 12+). No IE.
- React libs: React 16.8+ (hooks); React Joyride v3 requires React 16.8+; Reactour requires React 16.3+. NextStep.js 2.x: Next.js App Router compatible, React 18+.

**Licensing flag on Intro.js:** AGPL-3 is the source-available license. Commercial apps need a paid license. This is a real legal gate — verify before recommending it in a Vibe-Walk output.

---

## Q2 — Step config schemas and anchor-targeting mechanisms

### Driver.js (context7-verified, `/nilbuild/driver.js`)

```typescript
type DriveStep = {
  element?: Element | string | (() => Element);  // CSS selector, DOM element, or function
  popover?: {
    title?: string;
    description?: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    // ... other popover options
  };
  disableActiveInteraction?: boolean;
  onDeselected?: (element, step, options) => void;
  onHighlightStarted?: (element, step, options) => void;
  onHighlighted?: (element, step, options) => void;
}
```

**Anchor strategies supported:** CSS selector string (most common), direct DOM `Element`, or a function `() => Element` (evaluated at step-show time — handles dynamic mounts). **No XPath support.** The function form is the resilience escape hatch for dynamic components.

**Runtime dynamic updates:** `driverObj.setSteps([...])` and `driverObj.setConfig({...})` both work at runtime, *after* initialization — no rebuild needed. This is the hook for JSON-only config loading (see Q3).

### Shepherd.js (context7-verified, `/shipshapecode/shepherd`)

```javascript
tour.addStep({
  id: 'step-id',
  title: 'string',
  text: 'string | HTML',
  attachTo: {
    element: '.css-selector' | () => document.querySelector('.dynamic'),  // lazy fn supported
    on: 'bottom' | 'top' | 'left' | 'right' | 'right-start' | ...  // Floating UI placement
  },
  classes: 'extra-css-class',
  buttons: [{ text: 'Next', action: tour.next }],
  when: { show: fn, hide: fn },
  advanceOn: { selector: '.link', event: 'click' }
});
// Or batch: tour.addSteps([...array of step configs...])
```

**Anchor strategies:** CSS selector string, direct element, lazy function (evaluated at `before-show`). If `attachTo.element` not found, step falls back to centered modal. **This fallback is silent** — it won't throw, but the user sees a floating tooltip with no highlight. Can be a confusing failure mode.

### Intro.js (context7-verified, `/usablica/intro.js`)

Two modes:

1. **HTML attribute mode** (declarative): Add `data-step="N"` and `data-intro="tooltip text"` to elements. Call `introJs().start()`. Intro.js walks the DOM by step order.
2. **Programmatic mode**: `intro.setOptions({ steps: [{ element: '#id' | document.querySelector(...), intro: 'text', position: 'right' }] })`

**Anchor strategies:** CSS selector string, direct DOM element via `document.querySelector`. No function/lazy evaluation in documented API. This is a resilience gap for dynamic components.

### Reactour (`@reactour/tour`) (context7-verified, `/elrumordelaluz/reactour`)

```typescript
type StepType = {
  selector: string | Element;          // CSS selector (most common) or DOM element
  content: string | (props) => ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center' | [number, number];
  highlightedSelectors?: string[];     // Union-extend the highlight region
  mutationObservables?: string[];      // Re-render mask on DOM mutations at these selectors
  resizeObservables?: string[];        // Re-render mask on resize
  action?: (elem: Element | null) => void;
  actionAfter?: (elem: Element | null) => void;
  stepInteraction?: boolean;
  styles?: { ... };
}
```

**Anchor strategy:** CSS selector string or DOM element. The `mutationObservables` and `resizeObservables` fields are Reactour's answer to layout resilience — you tell it which selectors to watch for DOM/size changes so the mask repositions. This is unique among the six libraries and is a strong resilience feature for animated or re-rendering components.

### NextStep.js (`nextstepjs`) (GitHub-verified)

```typescript
type Step = {
  icon?: ReactNode | string | null;
  title: string;
  content: ReactNode;
  selector?: string;      // ID selector — targets element by id attribute
  side?: 'top' | 'bottom' | 'left' | 'right';
  showControls?: boolean;
  showSkip?: boolean;
  blockKeyboardControl?: boolean;
  pointerPadding?: number;
  pointerRadius?: number;
  disableInteraction?: boolean;
  nextRoute?: string;     // Navigate to next.js route before advancing
  prevRoute?: string;
  viewportID?: string;    // Scrollable container
}
```

**Anchor strategy: ID-only.** NextStep targets elements exclusively via the `id` attribute — no class selector, no data-attribute, no arbitrary CSS selector. Every anchored step requires a stable `id` on the element. This is the most restrictive targeting model in the group, but also the most resilient to style churn — `id` attributes don't move with Tailwind class changes.

**Multi-page support:** `nextRoute`/`prevRoute` on steps is first-class support for tours that span Next.js page navigations — unique to NextStep.js.

### React Joyride (context7-verified, `/gilbarbara/react-joyride`)

```typescript
type Step = {
  target: string | HTMLElement | React.RefObject<any> | (() => HTMLElement);
  content: ReactNode;
  title?: ReactNode;
  placement?: Placement | 'auto' | 'center';
  id?: string;
  data?: any;
  skipBeacon?: boolean;
  hideOverlay?: boolean;
  spotlightPadding?: { top, right, bottom, left };
  scrollOffset?: number;
  scrollTarget?: StepTarget;
  spotlightTarget?: StepTarget;
  before?: async (tourData) => Promise<void>;  // blocks step until resolved
  after?: (tourData) => void;
}
```

**Anchor strategies:** CSS selector string, HTMLElement, React ref (`useRef`), or function `() => HTMLElement`. The `before` async hook is powerful — it lets the tour wait for a dynamic component to fully mount before showing the step. This is the most flexible targeting model in the group.

### Anchor resilience ranking

1. **React Joyride** — function target + async `before` hook = can wait for any DOM state
2. **Driver.js** — function element + `setSteps()` at runtime = dynamic config possible
3. **Reactour** — `mutationObservables`/`resizeObservables` = best mask repositioning on re-renders
4. **Shepherd.js** — lazy function on `attachTo.element`; silent fallback to center on miss
5. **NextStep.js** — id-only targeting; most stable against style churn, but requires id injection
6. **Intro.js** — no lazy evaluation documented; most brittle for dynamic components

---

## Q3 — Runtime-loadable JSON-only config ("config-only output shape")

**The question:** Can any library load a pure JSON tour config at runtime, without bundling the tour config at build time?

### Driver.js — closest to JSON-only config

Driver.js is the strongest candidate. The step schema is a plain JS object with no JSX, no React refs, no component trees — it's serializable to JSON with minor constraints (callbacks become null). The key pattern:

```javascript
// Load from server/file at runtime — no build-time bundling needed
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

async function startTour() {
  const config = await fetch('/api/tour-config.json').then(r => r.json());
  // config.steps[] is a plain array of { element: string, popover: { title, description } }
  const driverObj = driver({ showProgress: true });
  driverObj.setSteps(config.steps);
  driverObj.drive();
}
```

**What's serializable in JSON:** `element` (CSS selector string), `popover.title`, `popover.description`, `popover.side`, `popover.align`, `disableActiveInteraction`. All these are strings, booleans, and numbers — fully JSON-compatible.

**What's NOT serializable:** Callback functions (`onHighlightStarted`, `onDeselected`, etc.). For a config-only tour with no custom lifecycle behavior, these are optional — a basic tour is 100% expressible in JSON.

**Verdict: Driver.js supports a fully self-contained JSON-only tour config** for standard tours. The host app bundles the `driver.js` library; Vibe-Walk emits a `tour-config.json` (or inline JS array) that is loaded at runtime via `setSteps()`. This is the "config-only output shape" — verified possible.

### Shepherd.js — JSON-serializable with caveats

`addSteps([])` accepts a plain array of step objects. Step configs are JSON-serializable if you don't use `attachTo.element` as a function or include `when`/`advanceOn` callbacks. Standard string-selector steps are fully serializable. However, Shepherd has no built-in `fetch`-from-URL pattern for tour configs; the host wires it up. Possible, but Driver.js is cleaner.

### Reactour, React Joyride, NextStep.js — NOT JSON-only

All three embed `content` as `ReactNode` (JSX) in their step schemas. You can use plain strings for `content`, but the provider/component wrapping means the host must bundle the tour config with the React tree — it cannot be loaded as a pure JSON blob and injected at runtime without React re-renders. Config-only output shape is not viable here.

### Intro.js — HTML-attribute mode IS declarative config

The `data-step` / `data-intro` HTML attribute pattern is a form of declarative config — the tour is defined by markup, not by JS. But it requires modifying the host's HTML directly, which is an anchor-injection task, not a config-file task. Not the runtime JSON-only shape we want.

**Output shape verdict:**

| Output shape | Best fit | Notes |
|---|---|---|
| **Dropped-in module** (full code, as in Celestia3) | Any library | Most control; Vibe-Walk emits the complete tour module |
| **Config-only JSON** (host wires up the driver) | **Driver.js** | `setSteps()` from JSON fetch; config is pure JSON, library is host's dependency |
| **Hybrid: thin adapter + JSON config** | **Driver.js or Shepherd.js** | Vibe-Walk emits config + a 5-line adapter that the host includes |
| **React component config** | Reactour, React Joyride, NextStep.js | Config is JSX props — not portable outside React |

---

## Q4 — React-specific libraries: integration surface and what breaks outside React

### Reactour

**Integration:** Wrap app root with `<TourProvider steps={steps}>`. Access tour controls via `useTour()` hook. Steps array is passed to provider — tight coupling to the React tree.

```jsx
import { TourProvider } from '@reactour/tour'
<TourProvider steps={steps}><App /></TourProvider>
```

**What breaks outside React:** Everything. `TourProvider` is a React context provider. No Svelte, Vue, vanilla JS, Astro Islands (without React adapter) support. Any framework migration is a full rewrite.

**SSR (Next.js/Remix):** The `TourProvider` itself renders fine on server, but `useTour()` hooks and any DOM queries run only on client. Standard pattern: `useEffect` guard. No documented `'use client'` directive requirement, but needed in Next.js App Router.

### NextStep.js

**Integration:** Wrap app with `<NextStepProvider>`, add `<NextStep steps={tourSteps}>` inside the router. Steps use `selector` (which targets `id`) for anchoring. Multi-page support via `nextRoute`/`prevRoute` on steps.

**What breaks outside React/Next.js:** Everything — it's built for Next.js App Router. It has Remix and React Router adapters (v2 introduced framework-agnostic routing), but it still requires React. No vanilla JS, Vue, or Svelte support.

**What breaks even inside React:** If you're not using a routing library it recognizes (Next.js App Router, React Router, Remix), the route navigation between steps won't work. Tour-within-a-single-view still works.

### React Joyride

**Integration:** Import `<Joyride>` as a component with `steps` and `run` props. Or use the `useJoyride()` hook (v3) which returns `{ controls, Tour }`.

```jsx
const { controls, Tour } = useJoyride({ continuous: true, steps });
return <>{Tour}<button onClick={controls.start}>Tour</button></>;
```

**What breaks outside React:** Everything. React Joyride is the most React-idiomatic of the three — it uses refs, state, context, and hooks extensively. No Vue/Svelte/vanilla path.

**SSR:** The `before` async hook on steps makes SSR-safe hydration easier — you can wait for client-only elements. But the library itself requires `window` at import time in some builds. Guard with dynamic import:
```js
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });
```

**The bottom line for Vibe-Walk:** All three React libs require React 16.8+ (18+ for NextStep v2). Any app not using React — Svelte, Vue, vanilla, Astro without React — cannot use these at all. Vibe-Walk's framework-agnostic default (Driver.js) is the correct call for generality.

---

## Q5 — Selector failure modes: CSS Modules, Tailwind, SSR

### CSS Modules

CSS Modules generate hashed local class names (`Button_root__xK2j9`) at build time. The hash is deterministic per-build but changes across builds if the file content changes. **Any tour step anchored to a CSS Module class name will silently break on next deploy.** This is the most common selector rot pattern in modern React apps.

**Defensive pattern:** Use `id` attributes or `data-*` attributes — these are never touched by CSS Modules. CSS Module hashing applies only to class names.

### Tailwind CSS

Tailwind uses utility classes that are stable by name (`bg-blue-500`, `flex`, `px-4`) but are also present on *many* elements — specificity collisions if you target them directly in tour steps. **Tailwind does not hash class names by default**, unlike CSS Modules. However:
- Utility classes are not semantically meaningful — `className="flex items-center"` is not a useful selector identity
- Multiple elements will share the same utility classes — `querySelector('.flex')` selects the wrong element
- PurgeCSS/content scanning means dynamically constructed class names can be stripped

**The real Tailwind problem for tours is not hashing — it's non-uniqueness.** Targeting `'.px-4'` matches half the DOM.

### SSR — the hydration gap

All six libraries operate on the DOM. In SSR environments (Next.js, Remix), the HTML is rendered on the server; the DOM doesn't exist until hydration on the client. Known documented failures:

- **Shepherd.js: `ReferenceError: Element is not defined`** on Node.js — confirmed in [GitHub issue #342](https://github.com/shipshapecode/shepherd/issues/342). Must be imported client-side only.
- **Driver.js:** No Node.js DOM access — same class of failure if imported at the module level in a server component. Must run in `useEffect` or dynamic import.
- **React Joyride:** Requires `window` at import time; documented pattern is `dynamic(() => import('react-joyride'), { ssr: false })`.
- **Reactour:** Provider renders on server safely; DOM queries in `useTour()` fire only on client.
- **NextStep.js:** Built for Next.js App Router; handles hydration correctly by design. v2 is the safest SSR story of the group.

### Dynamic component mounts

The co-presence rule from the cowpath applies here: elements that aren't in the DOM when a step fires cause silent failures (Shepherd falls back to centered modal; Driver.js `onHighlighted` receives `null` for the element). The defensive patterns by library:

| Library | Defense against unmounted element |
|---|---|
| Driver.js | Pass `element` as `() => document.querySelector(...)` — evaluated at step-show time |
| Shepherd.js | `attachTo.element: () => document.querySelector(...)` — lazy eval at `before-show` |
| React Joyride | `before: async () => { await waitForElement() }` — blocks step until resolved |
| Reactour | `mutationObservables: ['.container']` — re-queries on DOM mutation |
| NextStep.js | No documented lazy targeting; id must be present when step fires |
| Intro.js | No documented lazy targeting; element must be in DOM at start |

### The data-tour anchor contract (see Q6 below for the spec)

The industry-standard defense across all these failure modes is a stable `data-*` attribute on each anchor element. This survives:
- CSS Module hash changes (data attrs are not scoped by CSS Modules)
- Tailwind class churn (data attrs are orthogonal to utility classes)
- Element renames / component refactors (data attr survives any JSX restructuring)
- Automated test selectors can share the same attribute (`data-testid` vs `data-tour` — consider whether to merge or separate)

Used in production by: Intercom (`data-intercom-target`), TourGuide.js (`data-tg-tour`), Cypress/Selenium tests (`data-testid`). The pattern is well-established.

---

## Q6 — Minimum viable anchor contract for Vibe-Walk

Given Phase 1's anchor-readiness verdict (does the app already have stable selectors?), here is the **minimum viable `data-tour` convention** that makes any library's step config portable and low-maintenance:

### The contract

```
Attribute name:  data-tour
Value format:    kebab-case identifier, globally unique within the app
Example:         data-tour="welcome-banner"
                 data-tour="nav-chart-tab"
                 data-tour="settings-panel"
```

**CSS selector form (for library step configs):**
```
[data-tour="welcome-banner"]
```
This is a valid CSS attribute selector — supported natively in all six libraries via their CSS selector string fields.

**Naming rules:**
1. Globally unique within the app. If two elements share a value, `querySelector` picks the first — silent wrong-element bug.
2. Semantic, not structural. `welcome-banner` not `top-left-blue-div`. Survives DOM restructuring.
3. Kebab-case, lowercase. Consistent enough to regex-scan in Phase 1.
4. No version numbers or step numbers in the attribute value. `data-tour="step-1"` breaks the moment you reorder. Use the element's role name instead.

**Why not `id`?**
- `id` is global and already claimed by many frameworks for accessibility, form labels, and router state.
- Clutters the DOM's ID namespace — creates accessibility/focus conflicts.
- Harder to grep/audit separately from functional IDs.

**Why not `data-testid`?**
- Conflating tour anchors with test selectors creates a coupling — test refactors break tours and vice versa.
- Separate attribute, separate concern. Both can exist on the same element:
  ```html
  <div data-testid="chart-area" data-tour="main-chart">
  ```

**Why not class names?**
- Class names are styling territory. CSS Modules hashes them. Tailwind shares them. They're not yours to claim as semantic identifiers.

### Vibe-Walk anchor injection spec

When Phase 1 verdict is "needs anchor injection," the Phase 2 anchor pass should:
1. Add `data-tour="<semantic-name>"` to each chosen stop element — purely additive, no logic changes.
2. Use the semantic name as the step ID in the tour config: `element: '[data-tour="main-chart"]'`
3. **Never** anchor to a class name or generated id. If an element already has a stable `id`, it's acceptable to use `#id` — but prefer `[data-tour=...]` for auditability.
4. Document the anchor map: a comment block or separate file listing `data-tour` → "what this element does."

### Per-library step config using the contract

```javascript
// Driver.js
{ element: '[data-tour="welcome-banner"]', popover: { title: '...', description: '...' } }

// Shepherd.js
{ attachTo: { element: '[data-tour="nav-menu"]', on: 'bottom' }, text: '...' }

// Reactour
{ selector: '[data-tour="settings-panel"]', content: '...' }

// React Joyride
{ target: '[data-tour="main-chart"]', content: '...' }

// NextStep.js — NOTE: selector field only accepts id values
// Must use: id="nextstep-welcome-banner" and selector: "#nextstep-welcome-banner"
// data-tour attribute cannot be used with NextStep.js
```

**NextStep.js exception:** NextStep targets by `id` only. For NextStep outputs, the contract becomes: `id="tour-<semantic-name>"` (prefix `tour-` to namespace from functional ids). This is the one library where the `data-tour` approach doesn't work without modification.

---

## Patterns

- **Attribute-based anchoring beats class-based anchoring universally.** All failure modes from CSS Modules, Tailwind, and build-time class renaming are bypassed by `data-*` attributes. The `data-tour="<semantic-name>"` convention is the industry standard — used by Intercom, TourGuide.js, and QA tooling alike.
- **Framework-agnostic vs React-specific is a binary split.** Driver.js and Shepherd.js run on any web app. Reactour, React Joyride, and NextStep.js require React — full stop. No gradual migration path.
- **Bundle size tracks framework coupling inversely.** Driver.js (5.9 KB gzip) does the least; React Joyride (25.0 KB gzip) does the most. Every KB of React-lib overhead is a framework-assumption baked in.
- **Dynamic mount resilience requires explicit design.** Four of six libraries support lazy element evaluation (function form). Intro.js and NextStep.js don't — elements must be DOM-present when the step fires.
- **SSR and tour libraries are fundamentally mismatched.** All six operate on the browser DOM; all require client-side guards. The difference is whether the library itself crashes on Node import (Shepherd.js: yes, documented) or handles it gracefully.
- **JSON-only config is viable only with vanilla-JS libraries.** React libs embed JSX in step content — the step schema is not JSON-serializable. Driver.js `setSteps()` with a fetched JSON array is the clean path.

---

## Real named examples

- **Celestia3** (the cowpath job): Driver.js, 6 stops, `[data-tour-...]` anchors injected, auto-once + replay. The reference implementation for Vibe-Walk's output shape.
- **Intercom Product Tours**: Uses `data-intercom-target` attribute — the canonical production example of data-attribute-based tour anchoring at scale.
- **TourGuide.js**: Uses `data-tg-tour` attribute on elements — a lighter-weight library following the same convention.
- **Cypress / Selenium QA tooling**: `data-testid` attribute — same pattern applied to automated testing; demonstrates longevity of the data-attribute convention.
- **Shepherd.js, GitHub issue #342**: `ReferenceError: Element is not defined` — confirmed documented SSR failure on Node.js import.
- **Driver.js, GitHub issue #162**: `Step error with dynamic element` — confirmed documented issue for dynamically mounted components; community solution is the function-form element target.
- **NextStep.js v2.1.1** (released 2026-05-21 — today): Most recently maintained library in the group; 1,000+ stars, 20 releases, 7 open issues. Active.
- **React Joyride v3** (25.0 KB gzip): Most-downloaded React tour library (706K+ weekly npm downloads in some periods vs Shepherd at ~280K). The React default.

---

## What works

- **`data-tour="<semantic-name>"` attribute + CSS attribute selector** — survives every CSS toolchain (CSS Modules, Tailwind, CSS-in-JS) and every build. Confirmed in production use by Intercom and TourGuide.js.
- **Driver.js `setSteps()` for runtime config loading** — verified via context7 API docs. Steps array is a plain JS object with string-only fields for basic tours; fully serializable to/from JSON. Config-only output shape is real and supported.
- **Driver.js function-form element target** — `element: () => document.querySelector('[data-tour="x"]')` — evaluated at step-show time, safe for dynamically mounted components.
- **Shepherd.js `attachTo.element` as lazy function** — evaluated at `before-show` phase, same resilience as Driver.js function form.
- **React Joyride `before` async hook** — can await element mount (fetch, animation delay, lazy load) before step fires. Strongest dynamic-mount solution in the group.
- **Reactour `mutationObservables`** — automatic mask repositioning when watched selectors change. Best-in-class for animated/re-rendering host apps.
- **NextStep.js `nextRoute`/`prevRoute`** — first-class multi-page tour support in Next.js; no other library handles this natively.

---

## What fails

- **CSS class selectors in CSS Modules apps** — class names are hashed per-build; any step anchored to a CSS Module class name rots on next deploy. Silent wrong-element or no-element failure.
- **Non-unique class selectors in Tailwind apps** — `querySelector('.flex')` returns the first element in the DOM, not the intended one. Common Tailwind utility classes are useless as tour anchors.
- **Shepherd.js imported at module level in SSR** — throws `ReferenceError: Element is not defined` on Node.js (confirmed in issue #342). Must be imported client-side only.
- **React Joyride imported without `ssr: false`** — `window` access at import time; throws in Next.js App Router server components.
- **Intro.js on commercial apps without a license** — AGPL-3 requires source disclosure or commercial license. Legal flag, not a technical failure, but a real blocker.
- **Intro.js with dynamically mounted components** — no lazy element evaluation in documented API; element must be present in DOM when tour starts. Steps against lazy-loaded panels fail silently or render with no highlight.
- **NextStep.js outside React** — id-only anchor model with no data-attr support means it can't be used with Vibe-Walk's `data-tour` convention without id injection. Non-React apps can't use it at all.
- **Long step configs in Shepherd.js without async loading** — Shepherd's step schema includes non-serializable fields (button `action` functions, `when` callbacks). Going config-only requires stripping all callbacks — limits interactivity to library defaults.
- **Tours started before DOM is hydrated (SSR)** — triggering a tour in server-rendered markup before hydration completes leaves elements unhighlighted (element not found) or crashes (null ref in driver). All six libraries require a `useEffect`/`onMounted` guard.

---

## Implications for Vibe-Walk

### 1. Keep Driver.js as the default substrate — the reasoning is confirmed

Driver.js (5.9 KB gzip, MIT, zero deps, vanilla JS) is the correct default for Vibe-Walk's generality goal. It's the only library where:
- The step schema is fully JSON-serializable for basic tours
- `setSteps()` enables runtime config loading without a build step
- The function-form element target handles dynamic mounts
- No React peer dependency limits which apps can receive a tour

For apps that are already React and want idiomatic React integration, offer React Joyride or Reactour as secondary options — but these are app-owner choices, not plugin defaults.

### 2. The "config-only output shape" is viable — Driver.js is the substrate

Vibe-Walk can emit a pure `tour-config.json` file (no JS, no JSX) paired with a 5-line bootstrap adapter:

```javascript
// tour-bootstrap.js (Vibe-Walk emits this)
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import tourConfig from "./tour-config.json";

export function startTour(onDone) {
  const driverObj = driver({ ...tourConfig.options, onDestroyStarted: onDone });
  driverObj.setSteps(tourConfig.steps);
  driverObj.drive();
}
```

The `tour-config.json` has zero JS — fully inspectable, diffable, editable by non-engineers. This is a strong output-shape option alongside the dropped-in full module (as in Celestia3). **Recommend offering both: full-module for drop-in simplicity, config-only for host apps that want to own tour control.**

### 3. Anchor contract is `data-tour="<semantic-name>"` — encode it in Phase 1

Vibe-Walk Phase 1 anchor-readiness verdict should check for:
- Existing `id` attributes on candidate stops (usable as-is)
- Existing `data-tour` attributes (already conforming)
- CSS Module class names on candidate stops (flag as unstable — injection needed)
- Tailwind utility classes only (flag as non-unique — injection needed)

Phase 2 anchor pass adds `data-tour="<semantic-name>"` attributes. The convention:
- Kebab-case, globally unique, semantic name
- CSS attribute selector form: `[data-tour="<name>"]`
- Works with Driver.js, Shepherd.js, Reactour, React Joyride out of the box
- **Does not work with NextStep.js** (id-only) — if NextStep output is requested, inject `id="tour-<name>"` instead

### 4. Encode SSR guard in every emitted module

Every Vibe-Walk output module, regardless of library, must include the SSR guard:
- Dynamic import with `ssr: false` (Next.js App Router)
- Or `useEffect` / `onMounted` wrapper
- Never fire a tour before DOM hydration completes

### 5. Flag Intro.js's AGPL license in Phase 1 report

If the app owner asks about Intro.js or if Vibe-Walk ever considers it as a substrate: surface the AGPL-3 license as a blocker for commercial apps. Don't recommend it without the flag.

### 6. Selector failure modes feed Phase 1 risk flags

Phase 1 should surface these specific risk flags when detected:
- `[ANCHOR RISK: CSS Modules]` — class names will hash; injection needed before build
- `[ANCHOR RISK: Tailwind only]` — utility classes are non-unique; injection needed
- `[ANCHOR RISK: Dynamic mount]` — component renders after page load; function-form target or async before-hook required
- `[ANCHOR RISK: SSR app]` — tour must be client-side only; document dynamic import requirement
- `[ANCHOR RISK: No stable selectors]` — full anchor injection pass required; increases effort estimate from "config job" to "config + edit-every-component job"
