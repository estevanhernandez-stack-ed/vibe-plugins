# Voice rules

Source of truth for how vibe-wrap talks to the builder, in SKILL bodies, in the wrap doc itself, and in any user-facing output. Builder-to-builder. Sentence case. Em-dashes welcome. No emoji. No corporate speak.

The marketplace storefront tagline — *Imagine Something Else.* — sets the register. vibe-wrap inherits it. Every word in a SKILL body, every line of the wrap template, every gate prompt is read by a builder closing out a session. Match that energy.

## The non-negotiables

These five rules apply to every word vibe-wrap emits. SKILL bodies, scripts that print to stdout, the wrap template, gate prompts, the README, the proposed-changes file from `evolve-wrap`. No exceptions.

### 1. Sentence case headings

`## What shipped`, not `## What Shipped`. `### Decision-log composition`, not `### Decision Log Composition`. The marketplace README and the storefront tagline are sentence case — vibe-wrap matches.

Proper nouns stay capitalized (`626Labs`, `Markdown`, `Python`, `Claude Code`, `MCP`). Acronyms stay caps (`MCP`, `JSONL`, `UUID`, `CLI`). Everything else is lowercase after the first word.

### 2. Em-dashes are welcome — periods at the end of microcopy

Em-dashes (—) for parenthetical sharpening, mid-sentence pivots, attribution lines. They're a feature, not noise.

Periods at the end of microcopy. `Wrap doc on disk + inline summary.` not `Wrap doc on disk + inline summary` (no period). Same for short bullet items in user-facing output.

**No ellipses for drama.** `still loading…` is fine when something is genuinely in progress; `we'll see…` is not.

### 3. No emoji in SKILL bodies, scripts, wrap docs, or marketing copy

Zero emoji in any file vibe-wrap ships. SKILL bodies, references, scripts, the wrap template, gate prompts, the README, generated wrap docs.

The one exception that doesn't apply here — Discord chat is its own thing in The Architect's broader voice rules. vibe-wrap doesn't ship Discord output. So: zero emoji, full stop.

### 4. No corporate speak

**Banned words** (these flag the prose as auto-generated marketing): `empower`, `leverage`, `seamlessly`, `unlock`, `unleash`, `best-in-class`, `robust solution`, `delightful experience`, `streamlined`, `cutting-edge`, `elevate`, `synergize`, `holistic`.

**Banned phrasing**:
- "I'd be happy to…" → just do the thing.
- "Let me know if there's anything else." → end on the actual next step instead.
- "I understand your concern…" → name the concern by what it is.
- "Feel free to…" → "If you want to, X" or just X.
- "We hope you enjoy…" → no.

If a SKILL body or a wrap section drifts into this register, the friction signal is "wrong audience." Pull back.

### 5. No hedging filler

No "let's", "we'll", "I think maybe", "perhaps we could", "it might be worth considering". State it. If the SKILL is offering a default and the user can override, say `Default: file-md. Pass --backend to override.` not `We thought you might want to use file-md, but feel free to override`.

## The two-axis frame (working vs essay × technical vs visual)

vibe-wrap output lives mostly in the **working / technical** cell:

- SKILL bodies = working register (1-3 sentence beats, verdict-first, file paths and exact terms over generic).
- The wrap template + generated wrap docs = working register (named state, exact counts, no narrative arcs).
- Gate prompts = working register (one beat each, default named, skip path obvious).
- The README is closer to **essay / technical** (longer arcs, dichotomy framing — what vibe-wrap does vs what it doesn't, the bumper-lanes invariant), but still technical.

vibe-wrap doesn't ship anything in the visual cell. If a future version adds visual output (HTML wrap, web dashboard), apply the visual register from the broader voice synthesis.

### Working register cheat sheet

- Verdict → 1 line of why → next item.
- File paths, exact strings, exact counts.
- "Don't drift the version pair. Drift = silent install confusion."
- Single-word landings when they earn it. "Sharp." "Captured." "Killed."

### Essay register cheat sheet (for the README, mostly)

- Punchline-first opener.
- Declarative section headings — "What vibe-wrap reads" not "Reading inputs".
- Dichotomy framing — bumpers vs gutter, trail vs reconstruction, gate vs auto-fire.
- Image-driven close.

## The bones-vs-texture frame

Carryover from the broader voice synthesis. Useful for SKILL writing because it tells you which register a given paragraph wants.

- **Bones** = the structural truth of the SKILL. What it does, what it reads, what it writes, what contract it honors. Working register, technical vocabulary, no decoration.
- **Texture** = the why-this-matters around the bones. The bumper-lanes invariant. The "trail not reconstruction" story. The reason `evolve-wrap` is named that way from day one. Essay register OK in the README, working register everywhere else.

When in doubt, write the bones first. Add texture only where it earns its place.

## Builder-to-builder default

Every SKILL body, every reference, every wrap section is being read by a builder closing out a session. Not by a manager scanning for value. Not by a marketer writing a case study. Not by a customer-service touchpoint.

That means:
- Assume technical literacy. Don't translate `JSONL` into "a structured data format". Just say `JSONL`.
- Assume time pressure. Don't pad the explanation. Lead with the verdict.
- Assume agency. Don't suggest, prescribe. The user can override; that's their job, not vibe-wrap's permission to grant.
- Assume continuity. The user is in flow. Match the tempo. Don't add ceremony.

## What this means for the wrap doc

The wrap template (assets/wrap-template.md, lands in Item 8) is also under these rules. Sentence case section headings (`## What shipped`, `## Still uncommitted`). No emoji. Counts and named state, not narrative summaries. The wrap is a builder-readable handoff, not a status report up the chain.

If a section is empty (zero decisions logged, zero uncommitted files, zero commits ahead of remote), say so plainly:
- `## Decisions logged` → `No decisions logged this session.`
- `## Still uncommitted` → `Working tree clean.`
- `## Still unpushed` → `Up to date with origin/main.`

Never `Nothing to report here!` (corporate). Never `(empty)` (lazy). Name the empty state as the actual state.

## What this means for gate prompts

Every gate prompt is one line, default named, skip path obvious. Examples:

- `commit these 3 files? [y/N]` — default no, capital N.
- `push 2 commits to origin/main? [y/N]` — same shape.
- `append a session-end decision to your file-md log? [y/N]` — backend named so the user knows what they're agreeing to.
- `bridge strategic context to the dashboard's Architect AI? [y/N]` — when the threshold fired.

Never `Are you sure you want to commit? This will create a permanent record.` (corporate, hedging, padded). The builder knows what `git commit` does. Just ask.

## When to break the rules

Almost never, but the edge cases:

- **A wrap section that's specifically about a humorous moment.** If the user logged a decision titled "Ate the bug instead of squashing it" and the wrap is reading from that decision log, render the title verbatim. Don't sanitize personality out of the user's own decisions.
- **A reference doc that's specifically about reference voices** (this file, the persona-adaptation reference, the broader CODER VOICE SYNTHESIS in the user's `~/.claude/CLAUDE.md`). Quoting examples that violate the rules is fine because it's quoting, not authoring.

That's it. Everywhere else, the rules apply.

## Reference

Pulled from:
- `vibe-plugins/CLAUDE.md` § Tech Stack & Voice (marketplace voice rules).
- `~/.claude/CLAUDE.md` § CODER VOICE SYNTHESIS (the broader Architect voice frame, which vibe-wrap inherits).
- `vibe-plugins/README.md` (storefront register reference).
