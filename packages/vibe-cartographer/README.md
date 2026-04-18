# Vibe Cartographer

**Vibe coding course correction — plot your course from idea to shipped app.**

> Vibe coding gives you the bones of an app fast. Cart helps you flesh it out — direction, structure, and the discipline you didn't have time to write.

Vibe Cartographer is a Claude Code plugin that delivers vibe-direction-as-conversation: ten slash commands (`onboard`, `scope`, `prd`, `spec`, `checklist`, `build`, `iterate`, `reflect`, `vitals`, `friction`) that walk you from "I have an idea" to "I have a shipped, structured, documented app." It's the planning and execution layer for vibe-coded work that needs to outlive its first sprint.

It's persona-aware — first-time builders get plain-English framing, experienced builders get dense technical detail. It's session-aware — your decisions carry from `/scope` through `/prd` through `/spec` without you re-typing them. It's friction-aware — `/friction` and `/vitals` track where you got stuck so the plugin gets sharper for *you* over time (Pattern #4 memory decay, Pattern #10 evolution).

---

## Install

Vibe Cartographer lives inside the **Vibe Plugins** marketplace alongside Vibe Doc and Vibe Test. One marketplace add gives you all three.

**Claude Desktop / Cowork (UI):**

Open **Personal plugins** → click **+** → **Add marketplace** → enter:

```text
estevanhernandez-stack-ed/vibe-plugins
```

Click **Sync**. Install Vibe Cartographer from the picker. The slash commands become available in your sessions.

**Claude Code CLI:**

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install vibe-cartographer@vibe-plugins
```

**npm (CLI binary):**

```bash
npm install -g @esthernandez/vibe-cartographer
```

> **Note on `.plugin` upload:** Cowork's "Upload plugin" path is currently unstable for our bundles — we recommend the marketplace install above. We're tracking the issue.

---

## Quick start

In a Claude Code or Claude Desktop session, inside your project (or a fresh empty directory):

```text
/onboard
```

That's the front door. `/onboard` interviews you on builder context (experience, comfort, what you've shipped before), then routes you into whichever stage of the journey makes sense — `/scope` if you're starting fresh, `/iterate` if you have a working app, `/reflect` if you want to look back on what you've shipped.

From there:

| Command | Purpose |
|---------|---------|
| `/onboard` | Builder profile + journey routing — start here |
| `/scope` | Define the app at a high level (problem, who, what, when) |
| `/prd` | Product requirements — features, success criteria, constraints |
| `/spec` | Technical specification — architecture, data model, integrations |
| `/checklist` | Generate a build checklist from scope + PRD + spec |
| `/build` | Walk through the checklist, item by item |
| `/iterate` | Add a feature or fix to an existing app, with structured framing |
| `/reflect` | Look back on what shipped — what worked, what to bring forward |
| `/vitals` | Lightweight health check on your project's planning artifacts |
| `/friction` | Inspect the friction log to see where you've gotten stuck |

---

## Works better with

Vibe Cartographer ships with [Pattern #13 — Ecosystem-Aware Composition](./architecture/default-patterns.md). When sibling plugins are installed, Cart announces deferrals instead of duplicating work:

| Complement | Why Cart defers |
|------------|----------------|
| `vibe-doc@vibe-plugins` | Cart frames documentation needs at `/scope` and `/prd` time; Vibe Doc generates the actual ADRs/runbooks/threat models from your shipped artifacts |
| `vibe-test@vibe-plugins` | Cart's `/build` and `/iterate` cite testing posture; Vibe Test owns the audit + retrofit + tier classification |
| `superpowers:test-driven-development` | When TDD discipline is the right mode for a feature, Cart points you at it instead of trying to own it |

None of these are required. Cart works fully standalone.

---

## What's inside

- **10 slash commands** — onboard, scope, prd, spec, checklist, build, iterate, reflect, vitals, friction
- **Session-aware skills** — decisions persist across commands; you don't re-type your premises
- **Builder profile** at `~/.claude/profiles/builder.json` — shared with sibling 626Labs plugins so onboarding happens once
- **Friction + wins logs** — `/vitals` and `/friction` surface accumulated patterns; `/evolve` proposes plugin-level changes (Pattern #10)
- **Architecture defaults** — pattern catalog at `architecture/default-patterns.md` for projects that don't have their own

---

## Links

- **Marketplace:** [`vibe-plugins`](https://github.com/estevanhernandez-stack-ed/vibe-plugins) — sibling plugins (Vibe Doc, Vibe Test)
- **npm:** [`@esthernandez/vibe-cartographer`](https://www.npmjs.com/package/@esthernandez/vibe-cartographer)

---

## License

MIT — © 2026 [626Labs LLC](https://626labs.dev), Fort Worth, TX.
