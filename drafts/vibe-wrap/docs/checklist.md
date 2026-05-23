# vibe-wrap — Build Checklist

> **Anchor:** Sessions wrap themselves when the trail is already there.
> **Spec reference:** `docs/spec.md` (read it first; this checklist sequences it).
> **PRD reference:** `docs/prd.md` (acceptance criteria pulled from here).
> **Status:** drafted 2026-05-10. Staged under `drafts/vibe-wrap/`. No solo
> repo, no `marketplace.json` edit during this build (per PRD non-goals).

## Build Preferences

- **Build mode:** Autonomous. Experienced builder + builder mode + 15
  prior Cart cycles + handoff explicitly named "fully-autonomous." The
  agent works through the checklist; checkpoints punctuate.
- **Comprehension checks:** N/A (autonomous).
- **Git:** Commit after each checklist item. Conventional commit format
  matching the `vibe-plugins` repo's convention. Use `feat(vibe-wrap):`
  for new files/features, `chore(vibe-wrap):` for scaffolding, no
  trailing periods, body explains the "why" when non-obvious. Files all
  live under `drafts/vibe-wrap/plugins/vibe-wrap/...` for v0.1.0; solo
  repo migration is a deliberate later step.
- **Verification:** On. Checkpoints every 3-4 items. Agent pauses, prints
  a brief summary, builder verifies and signals continue.
- **Check-in cadence:** N/A (autonomous).

## Pre-build action items (open issues from spec)

These are inlined into the items where they bite, but called out here
once so /build picks them up early:

- **Spec Open Issue #1** — verify the env var name Claude Code surfaces
  the session UUID under (`$CLAUDE_SESSION_ID`, `$CC_SESSION_ID`, or
  hook payload field). Needed in **Item 5** (plant script). If the env
  var doesn't exist, fall back to writing all breadcrumbs to
  `_orphan.jsonl` and let the wrap reader merge them by timestamp
  proximity. Resolve via `claude-code-guide` agent or Anthropic Claude
  Code hook docs at item start.
- **Spec Open Issue #2** — verify `SessionEnd` hook payload contents.
  Needed in **Item 10** (hook). Resolve via Anthropic hook docs.
- **Spec Open Issue #3** — verify sibling state-read timestamp
  comparability across sibling schemas. Needed in **Item 6** (trail
  readers). Quick grep across cached sibling SKILLs at item start.
- **Spec Open Issue #4** — multi-remote push gate UX. Needed in **Item
  9** (wrap SKILL). Spec says "name the upstream of current branch;
  offer push to a different remote? as follow-up." Sanity check with
  one example case.
- **Spec Open Issue #5** — render performance ceiling. PRD says <10s.
  Needed in **Item 9**. Set per-subsystem budget; flag any subsystem
  that needs a perf cap.
- **Spec Open Issues #7 + #8** — decision-log first-run UX precision +
  Markdown parser tolerance. Needed in **Item 7** (decision-log).

## Checklist

- [ ] **1. Plugin scaffolding — manifest, directory tree, contract references**
  Spec ref: `spec.md > File Structure` + `spec.md > Stack`
  What to build: Create the full `plugins/vibe-wrap/` directory tree under
  `drafts/vibe-wrap/`. Write `plugin.json` per the manifest stub in
  spec.md (name, version 0.1.0, description, author 626Labs LLC, MIT,
  keywords). Create empty SKILL.md files for all 7 skills (`wrap`,
  `status`, `plant`, `guide`, `evolve-wrap`, `session-logger`,
  `friction-logger`) with frontmatter only — name + description tuned
  for triggering accuracy (use `skill-creator` SKILL for the description
  pass). Create the 4 contract references with their full content:
  `references/breadcrumb-contract.md` (schema + plant call signature +
  no-op-safe contract — pull from spec § Data Model and § plant SKILL),
  `references/decision-log-backends.md` (the four backends, contract,
  config precedence, first-run UX flow, decision shape — pull from spec
  Decision 6 and Decision-log subsystem), `references/gate-design.md`
  (bumper-lanes invariant per gate from spec § wrap SKILL data flow
  step 5), `references/secret-patterns.md` (the patterns that trigger
  the secrets warning: `.env*`, `*credentials*`, `*.pem`, `*.key`,
  `*token*`).
  Acceptance: Directory tree matches the spec's File Structure section
  exactly. `plugin.json` parses as valid JSON. All 7 SKILL.md files have
  valid YAML frontmatter and no body conflict. The 4 reference files
  contain their full content (not stubs). `prd.md > Plugin shape and
  marketplace fit` stories satisfied at the structural level.
  Verify: Run `find drafts/vibe-wrap/plugins/vibe-wrap -type f | sort`
  and confirm every file in the spec's File Structure section is present.
  Run `python -c "import json; json.load(open('drafts/vibe-wrap/plugins/vibe-wrap/.claude-plugin/plugin.json'))"`
  and confirm exit 0. Open each reference file and confirm it has real
  content, not stub placeholders.

- [ ] **2. vibe-wrap:guide SKILL + voice/persona/friction-trigger references**
  Spec ref: `spec.md > vibe-wrap:guide` + `spec.md > Stack` (voice rules)
  What to build: Write the full `skills/guide/SKILL.md` body. Mirror
  Cart's pattern: shared behavior, persona adaptation (read
  `shared.preferences.persona` from `~/.claude/profiles/builder.json`),
  bumper-lanes invariant, voice rules. Write
  `skills/guide/references/voice.md` (sentence case headings, em-dashes,
  no emoji, no corporate speak — pull from `vibe-plugins/CLAUDE.md`
  marketplace voice section), `skills/guide/references/persona-adaptation.md`
  (mirror Cart's table for wrap-relevant moments), and
  `skills/guide/references/friction-triggers.md` (per-command friction
  trigger contract: which `friction-logger.log()` calls fire on which
  user moves). The friction-triggers table covers `wrap`, `status`,
  `plant`, `evolve-wrap` — match the shape of Cart's
  `friction-triggers.md` exactly.
  Acceptance: `guide/SKILL.md` is referenced (not duplicated) by every
  other vibe-wrap SKILL's "Read this first" line. The friction-trigger
  table for each command lists the `friction_type` and `confidence`
  level for each trigger. Voice rules apply to every other SKILL body
  written from this item forward.
  Verify: Open `guide/SKILL.md` and read the persona adaptation block —
  does it reference all 5 personas (professor, cohort, superdev,
  architect, coach)? Open `friction-triggers.md` — does the wrap section
  list at least 3 triggers? Grep other vibe-wrap SKILLs for "guide" —
  confirm they all reference it.

- [ ] **3. Self-instrumentation — session-logger + friction-logger SKILLs**
  Spec ref: `spec.md > vibe-wrap:session-logger` + `spec.md > vibe-wrap:friction-logger`
  What to build: Mirror Cart's session-logger and friction-logger SKILLs
  with `plugin: "vibe-wrap"` substituted. Two SKILLs:
  (a) `skills/session-logger/SKILL.md` documenting `start(command,
  project_dir)` + `end(entry)` two-phase append, sentinel + terminal
  shapes, sessionUUID v4 generation, atomic append protocol. Storage:
  `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`.
  Pattern #11 namespace isolation — writes ONLY inside vibe-wrap's data
  dir. Same shape as Cart's SKILL but trimmed (no
  `last_seen_complements` snapshot in v0.1.0 — defer to /evolve-wrap).
  (b) `skills/friction-logger/SKILL.md` documenting `log(entry)` append
  to `~/.claude/plugins/data/vibe-wrap/friction.jsonl`. Pull schema
  from Cart's friction-logger SKILL. (c) Scripts:
  `skills/session-logger/scripts/start.py` (UUID + sentinel write),
  `skills/session-logger/scripts/end.py` (terminal write),
  `skills/friction-logger/scripts/log.py` (friction append),
  `skills/wrap/scripts/atomic-append-jsonl.py` (transliterated from
  Cart's Node version to Python — tmp-file + fsync + rename, atomic
  per-line). Wire every other vibe-wrap SKILL (from item 2 onward) to
  call session-logger.start/end and friction-logger.log per the
  friction-triggers contract.
  Acceptance: `prd.md > Self-evolution from day one` instrumentation
  prerequisites satisfied. Both loggers write to vibe-wrap's data dir
  only (Pattern #11). Atomic append script tested by piping a JSON line
  manually and confirming the file is intact (no torn writes under
  concurrent invocation).
  Verify: Run `python skills/wrap/scripts/atomic-append-jsonl.py
  /tmp/test.jsonl` with stdin = a JSON line, twice in parallel, then
  read `/tmp/test.jsonl` — confirm exactly two complete lines, no
  partial bytes. Run a no-op invocation of session-logger.start and
  confirm a sentinel entry lands in `~/.claude/plugins/data/vibe-wrap/sessions/<today>.jsonl`.

- [ ] **4. vibe-wrap:plant SKILL + plant script (breadcrumb writer)**
  Spec ref: `spec.md > vibe-wrap:plant` + `spec.md > Data Model > Breadcrumb file`
  What to build: Resolve **Spec Open Issue #1** at item start: verify
  the env var name Claude Code surfaces session UUID under (most likely
  `$CLAUDE_SESSION_ID` per Anthropic hook docs; fall back to
  `_orphan.jsonl` if not available). Write `skills/plant/SKILL.md`
  documenting the call signature: `plant(source, command, phase,
  outcome=null, payload=null)`. Internal SKILL — not user-invocable.
  Write `skills/plant/scripts/plant.py` that resolves session UUID,
  builds a breadcrumb dict per the schema in spec § Data Model, and
  appends one line via `atomic-append-jsonl.py` to
  `~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl`
  (or `_orphan.jsonl` on UUID resolution failure). No-op-safe — script
  exit 0 on every failure path; never raise to the caller. Document the
  no-op-safe contract in the SKILL body so siblings can rely on it.
  Acceptance: `prd.md > The breadcrumb trail` plant story satisfied.
  Schema matches the spec exactly. `is_reachable` / `import` failures
  in the calling sibling never raise — script returns 0 silently.
  Forward-compat: the plant script writes whatever payload it gets,
  including unknown fields.
  Verify: Run `python skills/plant/scripts/plant.py --source vibe-test
  --command audit --phase fire` and confirm one JSONL line lands in the
  breadcrumbs dir for the resolved session UUID. Run the script with
  the env var temporarily unset and confirm the line lands in
  `_orphan.jsonl`. Run with `payload='{"unknown_field": "value"}'` and
  confirm the line is written verbatim.

- [ ] **5. Trail reader scripts — breadcrumbs, sibling state, git state**
  Spec ref: `spec.md > Component Architecture > vibe-wrap:wrap (Implementation notes)` + `spec.md > Data Model`
  What to build: Resolve **Spec Open Issue #3** at item start: grep
  cached sibling SKILLs for their session-log schemas; confirm
  timestamp shapes are ISO 8601 with timezone offset across all
  marketplace siblings (Cart confirmed; verify Doc, Iterate, Test, Sec,
  Thesis Engine, Vibe Thesis, Taker). Three Python scripts:
  (a) `skills/wrap/scripts/read-breadcrumbs.py` — given a session UUID,
  read + parse the breadcrumb file (and `_orphan.jsonl` filtered by
  timestamp proximity). Tolerate unknown fields. Returns a list of dict.
  (b) `skills/wrap/scripts/read-sibling-state.py` — given a session
  start timestamp, scan
  `~/.claude/plugins/data/<every-sibling>/sessions/<date>.jsonl` and
  `friction.jsonl` (and `wins.jsonl` where present). Filter
  `timestamp >= session_start`. Tolerate missing fields. Returns dict
  keyed by sibling-name → list of entries.
  (c) `skills/wrap/scripts/git-state.py` — invoke `git status
  --porcelain`, `git log --since=<session-start> --pretty=...`, `git
  rev-list HEAD..@{u}` (suppress error if no upstream). Return a
  structured dict (uncommitted_files, commits, ahead_of_remote,
  remote_name, branch_name, detached_head_flag, mid_rebase_flag).
  Acceptance: Each script is independently testable via CLI. The
  sibling-state read returns empty dict (not error) when no sibling
  state exists. The git-state returns sensible structure on edge cases:
  no remote (skip ahead_of_remote), no commits (empty list), detached
  HEAD (flagged).
  Verify: Run each script with `--help` and confirm a usage line. Run
  `read-sibling-state.py` against a known sibling state dir
  (`~/.claude/plugins/data/vibe-cartographer/`) and confirm at least
  one Cart session entry is returned. Run `git-state.py` in this
  vibe-plugins repo and confirm the output dict has all expected keys.

- [ ] **6. Decision-log subsystem — config + 4 backends + first-run picker + dispatcher**
  Spec ref: `spec.md > Decision-log subsystem` + `spec.md > Decision 6` + `spec.md > Open Issues #7 #8`
  What to build: Resolve **Spec Open Issues #7 + #8** at item start:
  (#7) draft the first-run picker copy: 4-option menu, recommended
  default labeled, persistence confirmation language — keep it under 12
  lines on screen. (#8) Markdown parser tolerance: pick a write
  strategy (recommend: append to end of file with a fresh `## YYYY-MM-DD`
  heading if no matching heading exists for today; on read, parse any
  level-3 heading under any level-2 date heading, plus tolerate
  flat-no-heading append-style files). Implement seven Python modules
  under `skills/wrap/scripts/decision-log/`:
  (a) `__init__.py` — backend dispatcher. `read(window)` and
  `append(decision)` resolve to the active backend per config.
  (b) `config.py` — config resolver. Precedence: per-project
  (`<repo>/.vibe-wrap/config.json`) > global
  (`~/.claude/plugins/data/vibe-wrap/config.json`) > auto-detect (MCP
  reachable → mcp; else first-run prompt). Schema per spec Decision 6.
  (c) `mcp.py` — `626labs-mcp` backend. Wraps
  `mcp__626Labs__manage_decisions` for read + append. `is_reachable`
  pings MCP cheaply.
  (d) `file_md.py` — `file-md` backend. Markdown read/parse + append
  per the strategy locked in (#8). Smart default path:
  `<repo>/docs/decisions.md` if `docs/` exists, else
  `~/.claude/decisions.md`.
  (e) `file_jsonl.py` — `file-jsonl` backend. JSONL read/parse + append
  via `atomic-append-jsonl.py`. Same path resolution.
  (f) `disabled.py` — `disabled` backend. Read returns `[]`, append
  no-ops, `is_reachable` returns True.
  (g) `first_run_prompt.py` — interactive picker per (#7). Persists
  user choice to the chosen config path.
  Acceptance: `prd.md > Decision log composition` all stories
  satisfied. The four backends share identical decision shape across
  read/append. `is_reachable` is fast (<500ms each). First-run prompt
  appears exactly once when no config + no MCP detected; never again
  after persistence.
  Verify: Test each backend independently. For `file-md`: append a test
  decision, read it back, confirm round-trip. For `file-jsonl`: same.
  For `disabled`: confirm read returns `[]` and append exits 0 silently.
  For `mcp`: skip if MCP not reachable in the test env (acceptable —
  `is_reachable` returns False). Run the dispatcher with each config in
  turn and confirm it routes correctly. Manually trigger
  `first_run_prompt.py` once and confirm the menu displays + choice
  persists.

- [ ] **7. vibe-wrap:status SKILL + status script (smallest verifiable surface)**
  Spec ref: `spec.md > vibe-wrap:status`
  What to build: Write `skills/status/SKILL.md` documenting the
  user-invocable `/vibe-wrap:status` command. Read-only. <3 second
  budget. Output ≤20 lines. Write `skills/status/scripts/status.py`
  that calls `read-breadcrumbs.py`, `read-sibling-state.py` (count
  only, no filter beyond session window), and the decision-log
  dispatcher's `read` (count only). Render a compact summary:
  breadcrumb count, source plugins detected, friction count, decision
  count from active backend, "no breadcrumbs captured this session
  yet — check that sibling plugins have run any commands" empty-state
  message. No mutations. No git invocation (defer to wrap).
  Acceptance: `prd.md > Wrapping a session` (status story) satisfied.
  Output is ≤20 lines, runs <3 seconds in a session with at least one
  sibling state entry. Empty-state message appears when no breadcrumbs
  + no sibling state.
  Verify: Invoke `/vibe-wrap:status` in a session that has run a Cart
  command — confirm output names Cart as a source plugin and counts ≥1
  entry. Time the run with `time` (or PowerShell equivalent) — confirm
  <3 seconds. Invoke in an empty session (no breadcrumbs, no sibling
  state) — confirm the empty-state message appears.

- [ ] **8. vibe-wrap:wrap SKILL + render + gates + template**
  Spec ref: `spec.md > vibe-wrap:wrap` + `spec.md > Data Flow` + `spec.md > Component Architecture > Decision-log subsystem`
  What to build: Resolve **Spec Open Issues #4 + #5** at item start:
  (#4) draft multi-remote push UX — when ≥2 remotes exist, name the
  upstream of the current branch first, offer "push to a different
  remote? [y/N]" as follow-up. Avoid offering force-push ever. (#5)
  set per-subsystem perf budgets (target <10s total): trail reader
  ≤4s, decision-log read ≤2s, render ≤1s, gates interactive (not
  budgeted). Flag if any subsystem ships over budget at verify time.
  Write `skills/wrap/SKILL.md` documenting `/vibe-wrap` (and
  `/vibe-wrap:wrap` alias). Three flags: `--inline-only`, `--bridge`,
  `--session-window <hours>` (fallback when env-var session UUID
  unavailable, default 4). Write `skills/wrap/scripts/render-wrap.py`
  that orchestrates the data-flow steps from spec § Data Flow:
  resolve session window → trail reader (calls `read-breadcrumbs.py` +
  `read-sibling-state.py` + `git-state.py`) → decision-log read →
  assemble markdown from `assets/wrap-template.md` → write to
  `docs/session-wraps/<YYYY-MM-DD-HHmm>.md` (fallback
  `.vibe-wrap/wraps/<ts>.md` if `docs/` doesn't exist; honor
  `--inline-only`) → run the four interactive gates per spec §
  Subsystem C (commit, push, decision-log write, dashboard bridge).
  Write `assets/wrap-template.md` per the sample structure in spec §
  Data Model > Wrap doc. Wire each gate per the bumper-lanes
  invariant in `references/gate-design.md` — default no-action,
  every gate has a clear skip path, secret-pattern matches require
  additional confirmation.
  Acceptance: `prd.md > Wrapping a session` (primary), `prd.md > Commit
  and push gates` (all 3 stories), `prd.md > Decision log composition`
  (append story), and `prd.md > Decision log composition` (bridge
  story scoped to MCP) all satisfied. The wrap doc renders with all
  documented sections. Total wall-clock ≤10s for non-interactive
  portion. All 6 edge cases from `prd.md > Wrapping a session` story
  pass: empty session, no remote, detached HEAD, mid-rebase, multiple
  remotes, secret-pattern match.
  Verify: **Checkpoint here.** Invoke `/vibe-wrap` in this vibe-plugins
  repo. Confirm: (a) wrap doc lands at the expected path; (b) inline
  output prints; (c) all 4 sections appear when state is present, or
  empty-state messages appear when absent; (d) commit gate surfaces
  uncommitted files including any secret-pattern matches; (e) push gate
  appears only if ahead of remote; (f) decision-log gate appears only
  if backend isn't `disabled`; (g) bridge gate appears only if backend
  is `626labs-mcp` AND threshold met. Run `time` and confirm
  non-interactive portion ≤10s. Run with `--inline-only` and confirm no
  file is written. Run in a repo with no remote and confirm push gate
  is silently skipped.

- [ ] **9. hooks/session-end-nudge — SessionEnd hook + hook config**
  Spec ref: `spec.md > Hooks > hooks/session-end-nudge` + `spec.md > Decision 5` + `spec.md > Open Issues #2`
  What to build: Resolve **Spec Open Issue #2** at item start: verify
  the `SessionEnd` hook event's payload contents (does it surface
  session UUID? cwd? anything else useful?) — consult Anthropic Claude
  Code hook docs. Adjust the script to pull from payload where
  possible, fall back to git/env reads where not. Write
  `hooks/session-end-nudge.sh` (or `.py` if the hook system supports
  Python scripts directly) that: (1) reads breadcrumbs file count for
  the session, (2) runs `git status --porcelain | wc -l` for
  uncommitted file count, (3) runs `git rev-list HEAD..@{u} | wc -l`
  for ahead-of-remote count (suppress error if no upstream). If any of
  the three counts is ≥1, emit a single line to stdout: `session looks
  done — /vibe-wrap to summarize?`. Else emit nothing. Never invoke
  `/vibe-wrap`. Never block session close. Write
  `hooks/session-end-nudge.json` (or whatever the hook config format
  is) wiring the script to the `SessionEnd` event.
  Acceptance: `prd.md > Wrapping a session` (the implicit nudge story
  in the bumper-lanes invariant) satisfied. Hook never blocks. Hook
  emits at most one line.
  Verify: Trigger a `SessionEnd` event manually (or wait for natural
  session close after running a command in a repo with breadcrumbs +
  uncommitted files). Confirm the nudge appears once. Trigger in a
  repo with no breadcrumbs + no git activity — confirm no nudge.
  Confirm session close is not delayed by the hook (subjective; should
  feel instant).

- [ ] **10. vibe-wrap:evolve-wrap SKILL + proposed-changes template**
  Spec ref: `spec.md > vibe-wrap:evolve-wrap`
  What to build: Write `skills/evolve-wrap/SKILL.md` documenting the
  Pattern #1 self-evolution loop. v0.1.0 scope: read vibe-wrap's own
  session log + friction log + last 30 days of wrap docs (under
  `docs/session-wraps/`); produce a `proposed-changes.md` file naming
  observed patterns and proposed plugin improvements. **Never
  auto-applies.** Naming discipline: `evolve-wrap` from day one (NOT
  `evolve`) — this is the first marketplace plugin built under the new
  `evolve-<short>` convention. Write
  `skills/evolve-wrap/references/proposed-changes-template.md` with the
  expected output shape (sections: Observed patterns, Proposed SKILL
  edits, Proposed config changes, Deferred — what didn't make the cut).
  v0.1.0 ships the SKILL scaffolded and reading-from-state working;
  the deeper L3 pattern weighting (matching Cart's evolve) can land in
  v0.2.
  Acceptance: `prd.md > Self-evolution from day one` story satisfied at
  v0.1.0 level. Skill name is `evolve-wrap`, not `evolve`. Output is
  proposal-only — no SKILL bodies are auto-edited. Reference template
  is named correctly per `drafts/_pending-renames.md` discipline.
  Verify: Invoke `/vibe-wrap:evolve-wrap` (after running at least one
  session through the wrap flow). Confirm a `proposed-changes.md` file
  is produced under the plugin source path. Confirm no SKILL.md files
  were edited. Open the proposed-changes file and confirm it follows
  the template.

- [ ] **11. Documentation & security verification + solo-repo migration prep**
  Spec ref: `prd.md > What We're Building` (final shape) + `prd.md > Plugin shape and marketplace fit` + `spec.md > all sections`
  What to build: Write `plugins/vibe-wrap/README.md` covering: what the
  plugin does (one-paragraph elevator pitch in marketplace voice — pull
  from PRD problem statement), install steps (canary first via solo
  repo, stable later via `vibe-plugins` marketplace ref bump),
  command list with one-line each (`/vibe-wrap`, `/vibe-wrap:status`,
  `/vibe-wrap:plant`, `/vibe-wrap:evolve-wrap`), decision-log backend
  setup (with screenshots-or-text-equivalent of first-run prompt),
  composition contract for sibling plugin authors (link to
  `references/breadcrumb-contract.md`), MIT license. No emoji. Match
  marketplace README voice. Confirm all `docs/` artifacts (scope.md,
  prd.md, spec.md, checklist.md) are current — if anything drifted
  during build, update them before close. Run a secrets scan: `git
  diff --staged | grep -iE "(api[_-]?key|secret|token|password|.env)"`
  across the entire `drafts/vibe-wrap/` tree; confirm clean. Confirm
  `.gitignore` (at the vibe-plugins repo root) covers anything
  vibe-wrap might drop locally during testing (the
  `~/.claude/plugins/data/vibe-wrap/` dir is outside the repo and not
  a concern; verify nothing else local is committed by accident).
  Dependency audit: vibe-wrap is pure stdlib Python + git CLI + no
  npm/pip deps, so the audit reduces to "confirm no third-party
  imports anywhere in `scripts/`." Run `grep -rE "^(import|from)
  [^_]" drafts/vibe-wrap/plugins/vibe-wrap/skills/*/scripts/` and
  confirm only stdlib (json, os, sys, pathlib, subprocess, datetime,
  uuid, etc.). **Solo-repo migration prep:** write
  `drafts/vibe-wrap/_migration-readiness.md` listing the gh-cli
  commands the user will run when ready: `gh repo create
  estevanhernandez-stack-ed/vibe-wrap --public --source=...`, the
  initial tag command (`git tag v0.1.0 && git push --tags`), and the
  marketplace ref-bump line for `vibe-plugins/.claude-plugin/marketplace.json`.
  Do NOT execute these — staging only. Surface a "ready to migrate?"
  checkpoint to the user at the end of this item.
  Acceptance: README is clear, builder-to-builder voice, no emoji, no
  corporate speak. All `docs/` artifacts current. Secrets scan clean.
  Dependency audit clean (stdlib only). Migration-readiness doc
  exists. The user can read the README and understand what vibe-wrap
  does in <90 seconds.
  Verify: Read the README cold. Does someone who's never seen
  vibe-wrap understand: (a) what it does, (b) why they'd want it, (c)
  how to install it from canary, (d) which commands exist, (e) how to
  configure the decision log? If any answer is unclear, revise. Run
  `git status` and confirm no untracked files in
  `drafts/vibe-wrap/` that should be tracked. Run the secrets-scan
  grep one more time before closing — confirm clean. Open
  `_migration-readiness.md` — confirm the gh-cli commands are
  copy-pasteable and accurate.
