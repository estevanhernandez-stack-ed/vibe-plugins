# Process Notes — vibe-wrap (Cart cycle #16)

> Started 2026-05-10 in `vibe-plugins`/drafts/vibe-wrap/. Builder is Estevan
> (fully-autonomous, builder mode, architect persona). Spec-prep-upstream
> pattern (mm) applies — `_handoff-prompt.md` is the upstream brief.

## /scope

**Entry compression:** ran /scope with `:onboard` skipped, builder profile
synthesized from `~/.claude/profiles/builder.json` + `~/.claude/CLAUDE.md` +
handoff. No interview. Treated `_handoff-prompt.md` as the brain dump.

**One-line anchor proposed:**

> Sessions wrap themselves when the trail is already there.

Longer form for the scope doc: *vibe-wrap is end-of-session wrap-up that reads
the breadcrumb trail your toolkit already left — not a cold reconstruction.*

**Architectural questions deferred to /spec** (per the handoff's "open design
questions" list — they're not /scope-level):

1. Breadcrumb storage location + JSONL schema.
2. Plant mechanism (sibling-invoked SKILL, vibe-wrap-owned hook, or hybrid).
3. End-of-session hook strategy.
4. Wrap output destination (inline, file, or both).
5. 626Labs Dashboard composition threshold.

**Deepening rounds:** zero (builder mode, mature substrate, handoff thoroughness).
Lesson (jj) carried from prior cycles: when a brief is thorough, the value of
the deepening pass is "verify upstream-state freshness" — already covered by the
handoff being authored same-day.

**Session logger:** Not wired in this orchestrator run (typical for
multi-command-in-one-chat). Per guide §Session Logging, falling back to
process-notes as the durable record.

## /prd

**Entry compression:** ran /prd in builder mode with mature substrate. No
interview — handoff brief + scope.md already carried the requirements layer.
Per Cart guide pattern (mm) "spec-prep-upstream-then-Cart-wraps-up": the
handoff IS most of the spec; /prd's job is formalization, not discovery.

**Structural moves:**

- Built seven epics — one per coherent area of functionality:
  *Wrapping a session*, *The breadcrumb trail*, *Commit and push gates*,
  *626Labs Dashboard composition*, *Self-evolution from day one*,
  *Plugin shape and marketplace fit*. Stable headings so /spec, /checklist,
  /build can reference them.
- Stories carry three perspectives: builder (the wrap user), sibling plugin
  author (the breadcrumb dropper), future maintainer (evolve-wrap user).
- Acceptance criteria expanded edge cases the scope only sketched —
  empty-session, no-remote, detached HEAD, multiple remotes, secrets in
  uncommitted files, mixed-instrumentation sessions, MCP unreachable.
- Bumper-lanes invariant translated into testable criteria at every gate
  ("default is no-action," "every gate has a clear skip path," "force-push
  is never offered").
- The 5 open architectural questions from scope.md carried verbatim into
  Open Questions, marked "Needed before /spec." All five have a "strong lean
  toward X" annotation so /spec has a starting point but the lock stays in
  /spec.

**Deepening rounds:** zero — same call as /scope. Builder mode + thorough
upstream + 15-cycle veteran + handoff-IS-the-spec posture means deepening
rounds would be search-for-something-to-add, not search-for-something-missing.
The lesson (jj) holds: deepening pays when substrate is thin; here it would
churn.

**Voice check:** PRD body is builder-to-builder, sentence-case headings,
em-dashes welcome, no emoji, no corporate speak. Matches marketplace voice
+ sibling plugin docs.

**Active shaping:** the user surfaced a Claude Code slash-command resolution
issue mid-cycle — typed `/prd` and got the picker resolution to `/spec`
instead. Captured as friction worth a follow-up after /spec lands. Not a
Cart issue — a Claude Code picker / fuzzy-match ordering issue. Noting it
here so /reflect picks it up at the end of the cycle.

**Session logger:** still not wired (orchestrator-level run, multi-command
in one chat). Process-notes is the durable record.



## /spec

**Entry compression:** ran /spec in builder mode, mature substrate. Same
posture as /scope and /prd — handoff brief carried the substrate, /spec's
job was the technical formalization, not discovery.

**Pre-spec grounding (read three artifacts in parallel):**
- Cart's `session-logger` SKILL — load-bearing reference for two-phase
  append, atomic write protocol, sessionUUID convention, namespace
  isolation (Pattern #11). vibe-wrap's session-logger and friction-logger
  mirror this exactly with `plugin: "vibe-wrap"` substituted.
- Cart's `plugin.json` — manifest schema reference. vibe-wrap's manifest
  follows the same shape (name, version, description, author, homepage,
  repository, license, keywords).
- Cart's `friction-logger` SKILL location — confirmed Pattern #6 conventions
  exist as a sibling SKILL we can mirror.

**Five locked decisions** (resolves all five PRD open questions):

1. **Decision 1 — Hybrid plant = sibling-state read + opt-in `:plant` SKILL.**
   Sharper than the original three-option lock proposed in PRD. Rejected
   the `PreToolUse` hook autodetect path because sibling state-read already
   gives baseline coverage (siblings already write Pattern #2 + #6 data) at
   zero coupling cost. Hook autodetect can land in /evolve-wrap if demand
   surfaces. **This was the meaningful sharpening of PRD's "strong lean
   toward (c)" — the hybrid that wins is different from the hybrid PRD
   sketched.**

2. **Decision 2 — Breadcrumb file partitions by session UUID, not date.**
   `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`. Wrap
   reads exactly one file per invocation; no timestamp filtering. Orphan
   file `_orphan.jsonl` for unresolvable session IDs.

3. **Decision 3 — Threshold-gated dashboard bridge** (3 signals: decision
   logged, >2 commits, or `--bridge` flag). Even when threshold fires,
   bridge is opt-in per gesture. Locked answer to PRD Q5.

4. **Decision 4 — Both file + inline output by default; `--inline-only`
   flag.** Default file path
   `docs/session-wraps/<YYYY-MM-DD-HHmm>.md` with time so multi-wrap days
   don't collide. Locked answer to PRD Q4.

5. **Decision 5 — `SessionEnd` hook only.** Single hook event in v0.1.0.
   Locked answer to PRD Q3.

**Architecture moves:**

- Three subsystems (Trail reader, Wrap renderer, Gates) — clean separation
  of concerns. Subsystem C gates are interactive and default no-action; the
  bumper-lanes invariant translates directly to the gate design.
- Two composition surfaces (sibling-state read + opt-in `:plant` SKILL).
- Seven SKILLs match scope's likely-skill-inventory: `wrap`, `status`,
  `plant`, `guide`, `evolve-wrap`, `session-logger`, `friction-logger`.
- One hook (`session-end-nudge`). No PreToolUse hook in v1.

**File structure traced** through every PRD epic — every story has a
component address. /checklist can map 1:1 from PRD epics to spec components
to checklist items.

**Architecture self-review** surfaced 6 open issues. Five are inherited PRD
open questions (all marked locked at spec level). The new ones:
- Q1: `$CLAUDE_SESSION_ID` env var name needs verification (likely from
  Claude Code hook docs). **Needs answering before /build.**
- Q2: `SessionEnd` hook payload contents need verification.
- Q3: sibling state-read timestamp comparability — should be fine but worth
  one /checklist sanity check.
- Q4: multi-remote push gate UX edge case.
- Q5: render performance ceiling vs PRD's <10s target — need per-subsystem
  budget.

**Deepening rounds:** zero. Same call as /scope and /prd. The architecture
is the formalization of decisions the handoff brief and PRD already
substrate-locked. A deepening round would re-litigate Decision 1's hybrid
choice — done that already.

**Stack research note:** skipped active web search this run. The stack is
"Claude Code SKILL host + Python 3.11 + JSONL + git CLI + optional MCP" —
all of which are zero-dep, no-version-drift surfaces the user already runs
in production. Web search would be search-for-something-to-add.

**Active shaping:** the user (silently) shaped Decision 1 by surfacing the
"sibling plugins already write rich state, why duplicate?" implicit in the
handoff brief's references list. The shift from "hook autodetect + plant
SKILL" to "sibling-state-read + plant SKILL" is the sharpening that
substrate enabled.

**Voice check:** spec body is builder-to-builder, sentence-case headings,
em-dashes welcome, no emoji, no corporate speak. Tables for stack and
deployment fields. ASCII architecture diagram (not Mermaid — chose for
universal terminal/markdown rendering).

**Mid-/spec course correction (logged):** the user surfaced a real gap I
missed: the spec treated 626Labs MCP as the only decision-log surface,
which silently broke the value prop for every non-626Labs user — i.e., the
entire marketplace audience. The MCP fallback as originally specced just
omitted the section, which is wrong for a marketplace plugin.

The correction landed as **Decision 6 — Pluggable decision-log backend**:
- Four backends in v0.1.0: `file-md`, `file-jsonl`, `626labs-mcp`,
  `disabled`.
- Smart auto-detect: 626Labs MCP wins if reachable; else first-run prompt
  with `file-md` recommended.
- Smart default file path: `<repo>/docs/decisions.md` if repo has `docs/`;
  else `~/.claude/decisions.md` (user-scoped, lands next to cloud-syncable
  personal files like the user described).
- Each backend implements `read(window)`, `append(decision)`,
  `is_reachable()`. Contract small enough that future backends (Linear,
  Notion, etc.) can be added in `/evolve-wrap` without breaking v0.1.0.
- Dashboard bridge stays MCP-only. Other backends may add bridge contracts
  in future versions.

PRD epic renamed `626Labs Dashboard composition` → `Decision log
composition`, with three new stories (any-backend read, first-run UX,
any-backend append) plus the original bridge story scoped to MCP-only.

**Meta-friction surfaced for /evolve attention:** the gap should have come
up in /prd, not /spec. When a marketplace plugin spec assumes a private
composition target (626Labs MCP), the agent should proactively ask "what
about users without that?" — same way /spec is meant to ask "what does the
user actually demo with?" before writing the spec. Captured here so /reflect
picks it up at end of cycle. Worth a friction entry against /prd for
"missed-marketplace-audience-question."

**Active shaping (sharpened the read):** the user pushed for a
default-everyone-can-use AND framed it as inspirational ("might inspire
users to set up a log of some kind"). That's the right product instinct
— the wrap doc surfacing what's there is the value loop, and the loop
only closes if there's a backend that lets every user participate.

**Final spec scope (what /checklist reads):**
- 7 SKILLs (`wrap`, `status`, `plant`, `guide`, `evolve-wrap`,
  `session-logger`, `friction-logger`).
- 1 hook (`session-end-nudge`).
- 6 Key Technical Decisions (was 5; added Decision 6 on pluggable backend).
- Decision-log subsystem with 4 backends + 1 first-run picker + 1 config
  resolver = 7 small Python modules.
- 8 open issues (was 6; added two on first-run UX precision and Markdown
  parser tolerance).
- Total component surface: 7 SKILLs + 1 hook + ~12 scripts + 4 references
  + 1 manifest = roughly the same shape as Cart, Doc, or Iterate at v0.1.0.





## /checklist

**Entry compression:** ran /checklist in builder mode, mature substrate.
Same posture as /scope, /prd, /spec. The heavy thinking happened in /spec
(6 Key Technical Decisions, the pluggable-backend course correction); this
was translation into a sequenced executable plan.

**Build preferences locked:**
- **Mode:** Autonomous. Builder mode + experienced + handoff explicitly
  stated "fully-autonomous." No mode-switching question — substrate
  pre-decided.
- **Comprehension checks:** N/A.
- **Git:** commit per item, conventional commits matching `vibe-plugins`
  repo convention (`feat(vibe-wrap):`, `chore(vibe-wrap):`).
- **Verification:** on, checkpoints every 3-4 items. Item 8 (wrap SKILL)
  is the load-bearing checkpoint — that's where the user verifies the
  whole flow works before the polish items (hook, evolve-wrap, docs).
- **Check-in cadence:** N/A.

**Sequencing logic:**

The sequencing is **smallest-verifiable-first** with a deliberate
load-bearing checkpoint at Item 8. The order:

1. **Scaffolding + contracts** (Item 1) — files exist in the right place,
   contracts are documented, no logic yet. Verify with `find` + `json
   parse`.
2. **Guide SKILL + voice/persona/friction-trigger references** (Item 2)
   — every SKILL written from this point forward references the guide,
   so the guide goes first.
3. **Self-instrumentation: session-logger + friction-logger** (Item 3) —
   both logger SKILLs ship together (same shape, same verify gesture).
   Atomic-append-jsonl script lands here too — it's the load-bearing
   write primitive. Every later item logs against this.
4. **Plant SKILL + script** (Item 4) — small, internal, writes
   breadcrumbs. Resolves Spec Open Issue #1 (env var name) at item
   start. Standalone enough to verify independently.
5. **Trail reader scripts** (Item 5) — three pure-read scripts.
   Resolves Spec Open Issue #3 (sibling timestamp comparability).
   Independently testable via CLI.
6. **Decision-log subsystem** (Item 6) — substantial sub-build (7
   modules) but stands alone. Resolves Spec Open Issues #7 + #8
   (first-run UX precision + Markdown parser tolerance). Each backend
   testable independently.
7. **Status SKILL** (Item 7) — **smallest user-facing surface.**
   Verifies Items 5 + 6 work end-to-end before we build the bigger
   wrap SKILL. Strategic choice: a 20-line read-only summary that
   exercises the trail readers and decision-log dispatcher catches
   integration bugs cheaply.
8. **Wrap SKILL + render + gates + template** (Item 8) — **the
   load-bearing checkpoint.** Resolves Spec Open Issues #4 + #5
   (multi-remote push UX + perf budget). Builder verifies the full
   flow here. If something's wrong, this is where it surfaces.
9. **SessionEnd hook** (Item 9) — polish item. Depends on git-state +
   breadcrumb count. Resolves Spec Open Issue #2 (hook payload
   contents).
10. **evolve-wrap SKILL** (Item 10) — polish item. Standalone reading
    of vibe-wrap's own state.
11. **Docs + security + migration prep** (Item 11) — final ship gate.
    Includes the `_migration-readiness.md` doc that surfaces a "ready
    to migrate?" checkpoint to the user without executing anything.

**Why status (Item 7) before wrap (Item 8):** the status SKILL is the
smallest user-facing thing that exercises the trail-reading subsystem.
Verifying it before building the bigger wrap render + gate orchestration
catches integration bugs cheaply. Pattern: smallest-verifiable-first
beats biggest-scariest-first when the smallest piece exercises the same
foundation.

**Item count:** 11. Within the 8-12 sweet spot. Considered combining
Items 9 and 10 (both polish, both small) but they're distinct
verifications — keep separate.

**Open-issue handling:** all 8 spec open issues map to exactly one
checklist item where they bite. Inlined into the item's "What to build"
line so /build resolves them at item start, not as a pre-build phase.
Cleaner sequencing, no separate "verify open issues" step.

**Documentation & security verification (Item 11) details:**
- README in marketplace voice (no emoji, sentence-case, builder-to-builder).
- Secrets scan: `git diff --staged | grep -iE "(api[_-]?key|secret|token|password|.env)"`.
- Dependency audit: pure stdlib Python — reduces to "confirm only stdlib
  imports in scripts/."
- `.gitignore`: nothing new needed; the `~/.claude/plugins/data/vibe-wrap/`
  dir is outside the repo.
- Solo-repo migration prep: `_migration-readiness.md` lists the gh-cli
  commands the user will run when ready. Does NOT execute. Surfaces a
  "ready to migrate?" checkpoint at end of item.

**Deepening rounds:** zero. Same call as /scope, /prd, /spec. Cart
guide explicitly says "Builder-mode users have consistently chosen zero
rounds on `/checklist`" — deeper substrate happens in /prd and /spec,
not /checklist. The sequencing is right; the items are atomic; the
verify gestures are testable.

**Active shaping:** the user shaped the entire build (the pluggable
backend course correction, the spec-prep-upstream pattern, the
fully-autonomous mode). At this point /checklist is the formalization
of decisions already made. No active shaping needed in this pass.

**Voice check:** checklist body is builder-to-builder, sentence-case
headings, em-dashes welcome, no emoji, no corporate speak. Five-field
format consistent across all 11 items per the contract /build expects.



## /build

**Mode:** autonomous, verification on, checkpoints every 3-4 items per
the build preferences locked in /checklist.

**Pre-build research blockers resolved 2026-05-10 via `claude-code-guide`
agent (run in parallel with Item 1):**

- **Spec Open Issue #1 (session UUID surface):** Resolved. Use
  `${CLAUDE_SESSION_ID}` template substitution in SKILL frontmatter; pass
  as CLI arg to scripts. In hook scripts, parse `session_id` from stdin
  JSON payload. Updated spec.md Open Issue #1 with the canonical pattern.
- **Spec Open Issue #2 (SessionEnd payload):** Resolved. Payload fields:
  `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `why`.
  Non-blocking. Updated spec.md Open Issue #2.
- **Slash-command picker resolution order (user friction signal):**
  Unresolved — undocumented behavior. Recommend filing `/feedback` issue
  asking Anthropic to publish picker priority + fuzzy-match semantics.
  Namespace prefix is the only documented lever; vibe-wrap already uses
  the `vibe-wrap:` namespace, so the issue won't bite vibe-wrap directly
  — it's a marketplace-wide concern. Surface this at /reflect.

### Item 1 — Plugin scaffolding — manifest, directory tree, contract references

**Outcome:** completed cleanly. Subagent built 12 files (1 manifest + 7
SKILL frontmatter stubs + 4 reference docs at 5–11 KB each). All
verifications passed. Commit: `b1e9bcd`.

**Subagent calls flagged on spec ambiguity:**
- SKILL bodies use `<!-- TODO: Item N -->` placeholders with the actual
  item number, so future builds can grep for what they need to land.
- The `⚠` glyph in the wrap doc template was classified as a status
  marker (allowed), not an emoji. Defensible — it's a Unicode warning
  symbol, not decorative. Carrying forward.
- CRLF warnings on commit normalize at solo-repo migration time
  (`.gitattributes` will land then).

### Item 2 — vibe-wrap:guide SKILL + voice/persona/friction-trigger refs

**Outcome:** completed cleanly. Subagent modified/created 10 files (7
SKILL stubs got `Read ../guide/SKILL.md` wire-line, guide/SKILL.md got
its full body, 3 new references added). All verifications pass. Commit:
`e9fc93c`.

**Subagent calls worth noting:**
- Used `../guide/SKILL.md` relative path instead of an absolute path.
  Smart — survives draft-path → solo-repo migration without rewrites.
  Matches Cart's internal-link convention.
- Forward-referenced session-logger with explicit "lands in Item 3" note
  so future readers don't trip on the dangling pointer.
- friction-triggers `:wrap` table includes low-confidence
  `default_overridden` rows for commit/push gate declines — explicitly
  framed as bumper-lanes invariant working as designed, not friction.
  Aggregate signal still useful for evolve-wrap; per-event noise
  suppressed by the low confidence weighting. Sharp call.

### Item 3 — Self-instrumentation — session-logger + friction-logger SKILLs

**Outcome:** completed cleanly. 6 files. Commit `240bcce`.

**Verifications passed:**
- Atomic append tested at **10x parallel writes** (subagent went above the
  spec's 2x bar — stronger signal). Exactly 10 lines, all valid JSON, no
  torn writes. Windows: `msvcrt.locking` with bounded backoff; POSIX:
  `O_APPEND`.
- Session-logger roundtrip: `start.py` printed UUID; `end.py` with that
  UUID + `{outcome:"completed"}` on stdin appended a terminal entry
  sharing the UUID. Both entries land in today's session file.
- Friction-logger defensive default: `repeat_question` without a quoted
  prior turn returns exit 1 with stderr "defensive default rejected
  entry — symptom must quote prior turn." Valid entries write through.

**Subagent calls worth noting:**
- `end.py` overlays `project_dir` from cwd basename rather than honoring
  the partial entry's value. Reasoning: `project_dir` is an audit field;
  forcing the caller to re-pass it from `start()`'s context isn't
  ergonomic. Documented inline. Sharp call.
- Heuristic for quoted-prior in `repeat_question` / `rephrase_requested`:
  `contains '"' AND len > 20`. Conservative enough to drop obvious bad
  cases without burning cycles on regex perfection.

### Checkpoint A (after Item 3)

User signaled `proceed`. No spot-check feedback flagged. Continuing to
Item 4.

### Item 4 — vibe-wrap:plant SKILL + plant script

**Outcome:** completed cleanly. 3 files (plant SKILL body, plant.py at
~190 lines, surgical edit to breadcrumb-contract.md). Commit `74fc3b3`.

**Resolved Spec Open Issue #1** in flight — applied the
`${CLAUDE_SESSION_ID}` template substitution pattern from the
claude-code-guide research; documented the canonical sibling-invocation
shape in plant SKILL body + breadcrumb-contract.md.

**Verifications passed (all 5):**
- Valid breadcrumb writes to `<session-id>.jsonl`.
- Empty `--session-id` falls back to `_orphan.jsonl` with `sessionUUID:
  null`.
- Unknown payload fields preserved verbatim (forward-compat confirmed).
- Malformed `--payload` → exit 0, stderr warning, no line written
  (no-op-safe).
- Missing `--source` → exit 0, stderr warning, no line written
  (no-op-safe).

**Subagent calls worth noting:**
- Omits `skill` from the breadcrumb entry when not supplied — saves
  bytes, matches the contract's "optional" framing.
- Unknown `--phase` / `--outcome` enum values: warn-and-write-anyway
  (not warn-and-skip). Matches the forward-compat contract.

### Item 5 — Trail reader scripts (breadcrumbs, sibling state, git)

**Outcome:** completed cleanly. 3 scripts. Commit `f5bc8ea`.

**Spec Open Issue #3 resolution:** sibling session-log timestamps are
**not uniform** across siblings. Cart and Iterate use ISO 8601 with TZ
offset (`2026-04-17T07:55:00-05:00`, second precision). vibe-test uses
ISO 8601 with `Z` UTC suffix and millisecond precision
(`2026-04-17T22:20:58.364Z`). Both are valid ISO 8601 but Python's
`datetime.fromisoformat()` needs `Z` → `+00:00` substitution to parse
the latter. The shared `parse_ts()` helper handles all three shapes
(plus a no-TZ fallback assuming local). Documented as a deviation note
in `read-sibling-state.py` module docstring.

**Verifications passed (all 3 scripts):**
- `read-breadcrumbs.py`: 3 planted entries read back; orphan inclusion
  flag works correctly; unknown payload fields preserved.
- `read-sibling-state.py`: returned dict with 3 siblings (Cart 13
  sessions, Iterate 2, vibe-test 2 + 1 friction + 1 win). Excluded
  vibe-wrap's own state. Future-date returns `{}`.
- `git-state.py`: in vibe-plugins repo, branch=`main`, 20 commits,
  ahead_of_remote=4, remote=`origin/main`. In non-git dir returned
  `is_repo: false` cleanly.

**SPEC BUG CAUGHT — fixed in flight:**
- Spec said `git rev-list HEAD..@{u}` for ahead-of-remote count. That's
  actually the *behind* count. Correct ahead query is `@{u}..HEAD`.
  Subagent used the right command but kept field name `ahead_of_remote`
  per spec. **Updated spec.md** to use `@{u}..HEAD` everywhere
  (`replace_all` on the wrong string). Sharp catch by the subagent.

**Subagent calls worth noting:**
- For sibling-state, scans all JSONL files in `sessions/` (not just
  today's date) — handles late-night → early-morning sessions that
  cross dates.
- Forced UTF-8 on stdout/stderr in all three scripts because Windows
  cp1252 chokes on em-dashes / arrows from sibling payloads. Defensive,
  correct.

### Item 6 — Decision-log subsystem (7 modules)

**Outcome:** completed cleanly. 7 modules, 1344 LOC total. Commit
`9f6d3738`.

**Spec Open Issue #7 (first-run picker copy):** Locked. 7 lines on
screen (under 12-line ceiling). MCP option toggles between "available
— auto-detect found it" / "unavailable — install the 626Labs MCP first"
based on liveness. Followed by global-vs-project scope question (default
global) and 4-line confirmation naming the persisted backend + config
path.

**Spec Open Issue #8 (Markdown parser tolerance):** Locked.
- **Write:** if `## YYYY-MM-DD` exists for today → insert new
  `### HH:mm — title` section just before the next `## ` heading (or
  EOF) under the existing day heading; else append a fresh day heading
  + section at EOF. Atomic via tmpfile + `os.replace`.
- **Read:** four-tier heading parser: `### YYYY-MM-DD HH:mm —`,
  `### YYYY-MM-DD —`, `### HH:mm —` (date inferred from last `## `
  ancestor), then bare `### …`. Flat-fallback: file with no parseable
  headings becomes a single decision keyed by mtime + filename.
  UTF-8 throughout; BOM tolerated on read, never written.
- Footer parser round-trips `link` and `project_tag` from the rendered
  `— [Wrap doc](...) · ` `vibe-wrap` ` ` line.

**Verifications passed (45/45):**
- file-md: round-trip across 2 days; narrow-window filter; tolerant
  read of bare `### YYYY-MM-DD — title` heading; flat-no-heading
  fallback; BOM-prefixed file parses; same-day double-append produces
  ONE `## ` heading with both sections under it.
- file-jsonl: round-trip; **2x parallel append produces 2 complete
  JSON-parseable lines** (atomic-append contract honored); malformed
  line tolerance.
- disabled: read=[], append returns `{ok: True, backend: "disabled",
  ref: None}`.
- mcp: gated on `VIBE_WRAP_MCP_AVAILABLE=1` env marker; CLI returns
  False without it, True with it.
- dispatcher: routes correctly to all 4 backends; with no config + no
  MCP, returns trigger condition without invoking interactive prompt;
  non-TTY safety fallback to `disabled` so CI callers don't hang.
- first-run picker: manually invoked, persisted config at the right
  path with the right schema, exit 0.

**Subagent calls worth noting:**
- Hyphenated `decision-log/` dir name (per spec File Structure) can't
  be a normal Python package. Each module gets a `__main__` entry point
  so it's CLI-callable via `python <path>` subprocess — matches the
  established pattern from `plant.py`, `atomic-append-jsonl.py`, etc.
  Sharp call; preserved spec naming while keeping callability.
- Smart-default walk-up safety: stops at `.git` boundary so smart
  default doesn't walk past repo root and accidentally pick up
  `~/docs/`. Documented in docstring. Defensive.
- MCP CLI semantics: `mcp.py` is a CLI stub by design — the wrap SKILL
  composes live MCP calls directly through the Claude Code tool surface;
  the dispatcher's role is routing. `is_reachable()` gates on the
  `VIBE_WRAP_MCP_AVAILABLE=1` env marker the wrap SKILL sets. Clean
  separation; documented in `mcp.py` docstring.

### Item 7 — vibe-wrap:status SKILL + status script

**Outcome:** completed cleanly. 2 files (status SKILL body, status.py
at 391 lines). Commit `45dcd08`.

**Verifications passed (4/4):**
- Empty-state: 5 lines, empty-state message present, exit 0.
- Populated (4-week window): 12 lines, names Cart (13 sessions),
  Iterate (2), Test (2 sessions / 1 friction / 1 win).
- **Performance: 0.29s** (PowerShell `Measure-Command`) — 10x under
  the 3s budget.
- Best-effort fallback: runs cleanly with empty `--session-id`, 6 lines.

**Subagent calls worth noting:**
- **Backend = "pending":** No decision-log config exists on this
  machine yet (Item 6's first-run picker hasn't fired against the
  user's actual setup). Since `:status` is read-only, the script must
  NOT invoke the interactive picker. Added a `pending` rendering path
  (vs forcing the `_resolve_or_prompt` flow). Documented in SKILL body's
  "Edge cases" section. Sharp.
- **Source-list truncation at 5** with `... and N more` suffix handles
  the ≤20-line budget when 8+ siblings are active. Documented in SKILL.
- **read-breadcrumbs stderr forwarding** kept intact — useful signal
  in best-effort mode, not noise.

### Checkpoint B (after Item 7) — PAUSED FOR SLEEP

User paused the build right at Checkpoint B before dispatching Item 8
(the load-bearing wrap SKILL). State is clean — no in-flight subagent,
no uncommitted changes, no broken tests.

**Resume marker — where to pick up:**

- **Branch:** `main`. Last commit: `45dcd08` (Item 7 — status SKILL).
- **7 of 11 items done.** Pending: Item 8 (wrap SKILL — load-bearing),
  Item 9 (SessionEnd hook), Item 10 (evolve-wrap SKILL), Item 11
  (docs + security + migration prep).
- **Spec mutations during build (durable in `docs/spec.md`):**
  - Open Issue #1 (session UUID surface) → resolved with the
    `${CLAUDE_SESSION_ID}` template substitution pattern.
  - Open Issue #2 (SessionEnd payload) → resolved with the documented
    payload shape (`session_id`, `transcript_path`, `cwd`, `why`,
    `hook_event_name`).
  - Spec bug fix: `git rev-list HEAD..@{u}` → `git rev-list @{u}..HEAD`
    (the original was the *behind* count, not ahead). `replace_all` ran.
  - Open Issue #3 (sibling timestamp comparability) → resolved during
    Item 5 (sibling timestamps not uniform; tolerant `parse_ts()`
    helper handles all shapes).
  - Open Issues #7 + #8 (decision-log first-run UX + Markdown parser
    tolerance) → resolved during Item 6.
- **Open Issues still pending /build resolution:**
  - Open Issue #4 (multi-remote push gate UX) → Item 8.
  - Open Issue #5 (render performance ceiling) → Item 8 (per-subsystem
    budget setup).
- **Friction signal carried for /reflect:** Claude Code slash-command
  picker resolution order is undocumented (user typed `/prd`, picker
  resolved to `/spec`). Recommend filing `/feedback` with Anthropic.
  Surface at /reflect.

**To resume:** open this repo in a fresh chat, run `/build`. The build
SKILL reads `docs/checklist.md` and finds Item 8 as the first unchecked
item. Dispatch Item 8 to a build subagent with the standard prompt
shape (the prior items are good templates). After Item 8 verification,
continue through Items 9-11. Final close-out lands at Item 11 with the
`_migration-readiness.md` doc and a "ready to migrate?" checkpoint to
the user.


