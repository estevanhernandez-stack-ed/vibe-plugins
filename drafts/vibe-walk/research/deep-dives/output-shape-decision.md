# Output-Shape Decision — Vibe-Walk Deep Dive

> **Researcher:** Wave 2 Deep-Dive (output-shape specialist)
> **Date:** 2026-05-21
> **Expedition:** Vibe-Walk Wave 2
> **Resolves:** Open gap #2 from `_shared-context.md` — "offer both" may be a punt that doubles the build-template surface
> **Sources:** context7 (Driver.js /nilbuild/driver.js, verified), GitHub release history, driverjs.com/docs, shadcn/ui ownership-model research, Tour-Tech Scout findings (Wave 1)

---

## What this doc settles

Tour-Tech Scout (Wave 1) proved config-only JSON is *possible* with Driver.js. That's the feasibility gate — it's cleared. What remained open:

1. What are the hidden costs of each shape that make "offer both" a bad default?
2. Does the Driver.js config schema have version-skew risk that changes the calculus?
3. What does CSS/theming bundling look like under each shape?
4. Is there a decision rule that makes the choice mechanical?

---

## Section 1 — The two shapes, precisely defined

### Shape A: Dropped-in module

Vibe-Walk emits a complete, self-contained JS/TS module into the host's codebase. The host adds a dependency (`npm install driver.js`), imports the module, and calls `startTour()`. Everything — step config, analytics wiring, theming, trigger logic, replay — is encoded in the module.

```
output/
  tour.ts          ← self-contained: steps, bootstrap, analytics hooks, replay
  tour.css         ← theme overrides (scoped to .driverjs-theme)
```

The host "owns the code" — same model as shadcn/ui. Changes require editing the emitted file.

### Shape B: Config-only JSON + thin bootstrap

Vibe-Walk emits a pure JSON file (no functions, no JS logic) plus a minimal bootstrap adapter (~10 lines) that the host wires up once. The bootstrap is written once and never needs to change; only the JSON changes when tour content evolves.

```
output/
  tour-config.json   ← pure JSON: steps[], options (no callbacks)
  tour-bootstrap.js  ← minimal adapter: fetch config → setSteps → drive()
  tour.css           ← same theme overrides, same as Shape A
```

The host's tour content lives in JSON — editable without touching JS, diffable, deployable without a build step.

---

## Section 2 — Driver.js runtime-config verification (context7, confirmed)

`setSteps()` and `setConfig()` are **first-class, stable APIs** in Driver.js v1.x. Both methods work after initialization, before or between `drive()` calls. `setSteps()` replaces the entire step array and resets tour state. This is the mechanism Shape B depends on, and it's verified in production docs.

```javascript
const driverObj = driver({ showProgress: true });
driverObj.setSteps(config.steps);     // load from JSON at runtime
driverObj.setConfig(config.options);  // apply options from JSON
driverObj.drive();
```

**What is and isn't JSON-serializable in v1.x config:**

| Field category | JSON-safe? | Examples |
|---|---|---|
| Step content | Yes | `element`, `popover.title`, `popover.description`, `popover.side`, `popover.align` |
| Tour options | Yes | `animate`, `overlayOpacity`, `stagePadding`, `showProgress`, `progressText`, `popoverClass`, `showButtons`, `nextBtnText`, `doneBtnText` |
| Overlay behavior (string form) | Yes | `overlayClickBehavior: "close"` or `"nextStep"` |
| Analytics hooks | **No** — functions | `onHighlightStarted`, `onNextClick`, `onDestroyStarted`, `onDestroyStarted` |
| Custom render | **No** — functions | `onPopoverRender` |
| Overlay behavior (callback form) | **No** — function | `overlayClickBehavior: (element, step) => {}` |

**Verdict:** A basic tour (steps + display options) is 100% JSON-serializable. Analytics wiring is not — it lives in the bootstrap adapter. This is not a limitation in practice: analytics hooks are generic infrastructure that doesn't change per-tour.

---

## Section 3 — CSS/theming bundling implications

**Both shapes require the same CSS import.** `driver.js/dist/driver.css` must be loaded by the host regardless of output shape. This is a hard requirement — Driver.js injects DOM nodes that reference its class names; without the base CSS, the overlay and popovers break silently.

Theme overrides work identically in both shapes:

```css
/* tour.css — emitted by Vibe-Walk in both shapes */
.driver-popover.driverjs-theme {
  background-color: var(--color-surface);  /* uses host's design tokens */
  border-radius: var(--radius);
}
/* ... arrow colors, button styles, progress text */
```

The theme CSS is **separate from output shape**. Shape B doesn't save anything on CSS — the same `tour.css` file is emitted either way. The `popoverClass: "driverjs-theme"` option is JSON-serializable and lives in the config, so the theme class name ties cleanly into Shape B's JSON options.

**No meaningful CSS bundling difference between the two shapes.** This is not a discriminating factor.

---

## Section 4 — Version-skew risk across Driver.js versions

This is the sharpest hidden cost for Shape B.

### The v0.x → v1.x break was severe

The migration from v0.x to v1.x was a **complete rewrite** with a new SVG-based rendering engine. The config schema had multiple renamed and removed fields:

| v0.x | v1.x | Impact |
|---|---|---|
| `opacity` | `overlayOpacity` | Silent override failure |
| `className` | `popoverClass` | Theme class not applied |
| `padding` | `stagePadding` | Default spacing shifts |
| `showButtons: false` | `showButtons: []` | Buttons still visible |
| `position: "left"` | `side: "left", align: "start"` | Popover misplaces |
| `onReset` | `onDestroyStarted` | Analytics hook silently dropped |

A config-only JSON emitted against v0.x's schema is **silently broken** on a v1.x host — no runtime errors, just wrong behavior. A dropped-in module would also be broken, but at least it imports driver.js directly and the version is pinned in the module itself.

### v1.x line has been stable

Within v1.x (v1.0.3 → v1.4.0), the schema has been **additive only** — new options added (e.g., `overlayClickBehavior` callback form in v1.4.0, `disableActiveInteraction` in v1.2.0), no fields removed or renamed. The core step schema (`element`, `popover.title`, `popover.description`, `popover.side`, `popover.align`) is identical across all v1.x releases.

**Practical version-skew surface:**

| Scenario | Shape A risk | Shape B risk |
|---|---|---|
| Host pins driver.js v1.x | Low — module and host lock together | Low — JSON schema stable within v1.x |
| Host on v0.x, plugin emits v1.x schema | Obvious breakage (import path changes) | **Silent** breakage — JSON loads, wrong keys ignored |
| Host upgrades driver.js v1.x → hypothetical v2.x | Module breakage is visible (TS types fail) | **Silent** — JSON still loads, deprecated keys ignored |
| Config JSON emitted 6 months ago, host upgrades | N/A | Stale JSON may miss new options, old option names silently no-op |

**Shape B's version-skew failure mode is silent.** That's the real cost. Shape A's failures are loud (TypeScript, import errors, test failures).

---

## Section 5 — Ownership model and the maintenance cycle

The shadcn/ui comparison is load-bearing here. shadcn/ui's core insight: **"not a dependency — code you own."** It generates code you copy into your project and can freely modify. Updates are opt-in via a diff command. This is the exact ownership model that distinguishes drop-in from config.

| Axis | Shape A (drop-in module) | Shape B (config-only JSON) |
|---|---|---|
| **Who edits the tour?** | Any developer with TS/JS skills | Anyone who can edit JSON — PMs, designers, CS |
| **Where does content live?** | In code — goes through code review, CI, deployment | In a JSON file — can be deployed separately (CDN, feature flag, CMS) |
| **Analytics wiring** | In the module — full callback control | In the bootstrap adapter — one-time setup, not per-tour |
| **Theme** | In the module + CSS file | In the CSS file (identical) + `popoverClass` in JSON |
| **Replay logic** | In the module | In the bootstrap adapter |
| **Version lock** | Explicit — module pins its own driver.js import | Implicit — JSON schema floats against host's installed version |
| **Failure mode on version mismatch** | Loud (TS error, import error) | Silent (wrong keys ignored, no error thrown) |
| **Re-generation / updating tours** | Re-run Vibe-Walk or hand-edit the module | Edit JSON; only re-run Vibe-Walk for structural changes |
| **Multiple tour variants** | Separate modules or conditional branches in module | Multiple JSON files, one bootstrap |

---

## Section 6 — The real cost of "offer both"

Offering both shapes doubles the build-template surface in a specific, non-trivial way:

1. **Two emitter templates.** The plugin must maintain a template for a full TS module AND a template for `{tour-config.json, tour-bootstrap.js}`. These diverge as the plugin evolves — new features (analytics schema changes, new trigger patterns, SSR guard patterns) must be implemented twice.

2. **Two test surfaces.** Any Vibe-Walk self-test or verification pass must exercise both output shapes to confirm they work.

3. **Two documentation surfaces.** The Phase 1.5 interview gains a new gate question ("which output shape?") and the generated `TOUR_ANALYTICS.md` must explain where the analytics hooks live under each shape.

4. **Ambiguous default.** If both are equally available, users default to asking "which should I use?" — an interview question that Vibe-Walk should be answering for them.

5. **Version-skew surface grows.** Both shapes need the same version-pinning mitigation, but Shape B has the additional silent-failure risk that requires a version guard in the bootstrap adapter.

**The actual doubled cost is in the emitter templates, not the user experience.** The user experience question ("which shape?") is one interview gate — cheap. The template maintenance question is where "both" gets expensive as the plugin evolves.

---

## Section 7 — Comparable codegen patterns (how the industry resolved this)

**shadcn/ui (components):** Chose dropped-in code exclusively. No config-only mode. Rationale: you own the code, you can modify it. Config-based component systems (React Aria, MUI) are a different product category with different tradeoffs — not better, just for different ownership preferences.

**Scaffolding generators (Rails, Laravel, create-react-app):** Uniformly chose dropped-in code. Config-only generators exist (Plop.js, Hygen) but they're meta-generators — they generate dropped-in code from config, not config that the runtime reads. The distinction: config-during-generation vs config-at-runtime.

**GraphQL Code Generator:** Config-only at generation time (the schema.graphql + codegen.yml is config), dropped-in at runtime (the generated files are owned code). Hybrid — but the config governs the *generation process*, not the *runtime behavior*. This is not the same as Shape B.

**The pattern that cleanly maps to Vibe-Walk Shape B:** CMS-driven tour content systems (Pendo, Appcues). They store tour configs in a hosted CMS, load at runtime, no build step. The key difference: these are SaaS tools where the host never owns the config schema — the vendor does. Vibe-Walk's Shape B brings that runtime-loading pattern into a code-gen context, which is novel. The risk Pendo/Appcues avoid (version skew between emitted config and runtime library) they avoid by controlling both sides. Vibe-Walk doesn't control the host's driver.js version.

---

## DECISION

### Default output shape: **Dropped-in module (Shape A)**

Vibe-Walk ships the dropped-in full module as the primary, default output shape.

**Rationale — three load-bearing reasons:**

1. **Version skew is loud, not silent.** The v0.x → v1.x break showed the schema is not stable across major versions. Shape A's failures (import errors, TypeScript type errors) surface immediately and are fixable. Shape B's failures (silently ignored config keys, wrong behavior with no error) are the worst class of breakage — they fail without telling anyone. The analytics wiring in particular (`onDestroyStarted` renamed from `onReset` in v0→v1) would silently drop all analytics if a stale JSON were loaded against a newer host.

2. **The dropped-in module is the analogy that works.** shadcn/ui's "you own the code" model is the right frame. The tour module is 50–100 lines of TS — not so large that ownership is a burden, and completely editable by the developer who owns the app. The config-only shape buys non-developer editability at the cost of silent failure risk and doubled template maintenance.

3. **Maintaining two emitter templates is the real cost of "both."** Both shapes need the same analytics wiring, SSR guard, theme CSS, and replay logic. Keeping both templates in sync as Vibe-Walk evolves is real drag that compounds over every feature addition.

### When config-only JSON applies (the override rule)

Config-only output is appropriate when **all three** of the following are true:

1. **The host explicitly owns tour-content management** — a PM, designer, or CS lead (not the developer) is the expected ongoing editor of tour copy and step order.
2. **The host's driver.js version is stable and pinned** — the app has explicit lockfile control and a clear policy against major version upgrades without testing.
3. **The content update cycle is decoupled from the deploy cycle** — tour copy needs to change without a code deploy (e.g., served from a CDN or feature-flag system).

When these three are true, emit Shape B. In practice this describes SaaS products with dedicated onboarding owners, not indie apps or typical vibe-coded projects.

**For the vast majority of Vibe-Walk jobs — the cowpath case, Celestia3, bootstrapped web apps — none of these three are true. Drop-in module is the right call.**

### Version-skew mitigation (applies to both shapes, mandatory for Shape B)

1. **Emit a `// generated for driver.js ^1.x` comment** at the top of every emitted file. Exact version the config schema was validated against.
2. **Include a `peerDependency` check comment** in the bootstrap adapter (Shape B) or install instructions (Shape A): `"driver.js": "^1.4.0"`.
3. **For Shape B specifically:** The bootstrap adapter must read the driver.js version at runtime and warn if `major !== 1`:

```javascript
// tour-bootstrap.js (Shape B only)
import { driver } from "driver.js";
// Version guard: config schema valid for driver.js v1.x
// If you upgrade to v2.x, re-run Vibe-Walk to regenerate tour-config.json
```

4. **Phase 1.5 interview gate addition (Shape B path):** Before emitting config-only, ask: "What version of driver.js does your app use?" If not v1.x, default to Shape A.

### Summary decision table

| Host profile | Output shape | Reason |
|---|---|---|
| Developer-owned app (default) | **Shape A: dropped-in module** | Loud failures, full control, single template |
| PM/designer edits tours, stable deps, decoupled deploy | Shape B: config-only JSON | Non-engineer editability justified |
| React app wanting idiomatic integration | Shape A: dropped-in module using React Joyride | Framework-native, not config question |
| NextStep.js substrate | Shape A only | id-only anchoring not JSON-config-compatible |

---

*Filed: 2026-05-21. Wave 2 deep-dive closes open gap #2 from `_shared-context.md`.*
