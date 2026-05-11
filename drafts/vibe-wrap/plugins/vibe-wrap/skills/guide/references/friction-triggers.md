# Friction triggers

Source of truth for "when does each vibe-wrap command log which friction type." Every command SKILL references this doc. The `friction-logger` SKILL writes the actual entries via the calling SKILL — this file is the contract those calls honor.

## How to read this file

Each section covers one command. Within a section, a markdown table lists every condition under which that command should call `friction-logger.log()`, the friction type it emits, the default confidence, and any required-field notes.

| Column | Meaning |
|--------|---------|
| **Trigger** | The observable user-or-agent behavior that should produce a friction entry. |
| **Friction type** | One of the seven canonical types from the Self-Evolving Plugin Framework (Pattern #6). |
| **Confidence** | `high` / `medium` / `low`. Fixed per trigger — never overridden at log time (defensive default). |
| **Notes** | Required additional fields, defensive-default reminders, complement attribution. |

The seven canonical friction types: `command_abandoned`, `default_overridden`, `complement_rejected`, `repeat_question`, `artifact_rewritten`, `sequence_revised`, `rephrase_requested`.

`/vibe-wrap:evolve-wrap` weighting at high/medium/low: `1.0 / 0.6 / 0.3`. Same weighting Cart uses.

## Defensive defaults (apply to every trigger)

These four discipline rules apply across every `friction-logger.log()` call vibe-wrap makes. Honor them by default; never override at log time.

1. **Confidence is fixed per trigger.** The `Confidence` column is the value. Don't pass a different one at log time, even if the situation feels stronger or weaker than usual.
2. **Quoted-prior discipline.** For any trigger that requires a `symptom` field with a quoted prior turn or quoted artifact text, log nothing if the quote isn't available. Better to miss the entry than poison `/evolve-wrap` with an unverifiable claim.
3. **No friction-about-friction.** Calibration entries (user marking an entry false-positive after the fact) go to `friction.calibration.jsonl`, not `friction.jsonl`. vibe-wrap doesn't ship a calibration UI in v0.1.0; this is a forward note.
4. **Pattern #11 namespace isolation.** Every entry lands in `~/.claude/plugins/data/vibe-wrap/friction.jsonl`. Never any other namespace, never any sibling's friction file.

## Universal triggers (any vibe-wrap command)

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| Sentinel session-log entry has no terminal pair after 24h (detected by `friction-logger.detect_orphans()` at next command start) | `command_abandoned` | high | Emitted out-of-band by the next vibe-wrap command's startup check. Per-command sections do **not** call this. |
| User asks vibe-wrap to re-explain or simplify a prior message, AND the prior turn is captured in `symptom` as a quoted snippet | `repeat_question` | high | Defensive default: without a quoted prior in `symptom`, do not log. |
| User asks for a rephrase of vibe-wrap output (e.g., "say that more plainly", "shorter version") with a quoted prior in `symptom` | `rephrase_requested` | medium | Same quoted-prior discipline as `repeat_question`. |

The two question-style triggers (`repeat_question`, `rephrase_requested`) apply to every command. Per-command tables below do not repeat them.

---

## /vibe-wrap (a.k.a. /vibe-wrap:wrap)

The load-bearing user-facing command. Highest interaction surface in the plugin — most friction lives here.

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User declines a Pattern #13 complement offer at command start (e.g., vibe-wrap announces it would defer to a present sibling for a sub-step and the user picks `[skip]`) | `complement_rejected` | high | Set `complement_involved` to the complement name (e.g., `vibe-cartographer:reflect`). |
| User picks a non-default decision-log backend at the first-run picker (default is `file-md` at the smart-default path; user picks `file-jsonl`, `626labs-mcp`, or `disabled`) | `default_overridden` | medium | Capture the picked backend in `symptom`. First-run only — this trigger never fires on subsequent wraps once config is persisted. |
| User rewrites >50% of the generated wrap doc at `docs/session-wraps/<ts>.md` post-write (measured by line diff at the next `/vibe-wrap:evolve-wrap` run) | `artifact_rewritten` | medium | Wrap docs are personal and edits are common — confidence is medium, not high. Measure at evolve time, not in-line. |
| User passes `--inline-only` after the default file-write was the recommended path | `sequence_revised` | low | Flag-as-override. Confidence low because flags are a healthy interaction surface, not necessarily friction. |
| User declines the commit gate (`n` or enter at `commit these N files? [y/N]`) when uncommitted files were present AND the wrap is being run as part of a session close (heuristic: SessionEnd nudge fired earlier in this session) | `default_overridden` | low | Confidence low — declining the commit gate is the bumper-lanes invariant working as designed, not friction. Only logged because aggregate decline rate is signal for `evolve-wrap` to consider. |
| User declines the push gate (`n` at `push N commits to <remote>/<branch>? [y/N]`) when ahead-of-remote was non-zero | `default_overridden` | low | Same low-confidence framing as commit gate decline. The default IS no-action; declines are expected. Aggregate matters. |
| User declines the dashboard bridge gate (`n` at the bridge prompt) when the threshold fired | `complement_rejected` | high | Set `complement_involved` to `mcp__626Labs__bridge_context_to_architect`. Strong signal — threshold logic may be too loose, or bridge prompt copy doesn't communicate stakes well. |
| User rewrites the drafted commit message (`edit` at `accept message? [y/N/edit]`) AND >50% of the message body changes between draft and accepted | `artifact_rewritten` | medium | Rendered commit-message draft is a wrap output too. Aggregate signal for tuning the draft template. |
| User invokes `/vibe-wrap` twice within 10 minutes for the same session (re-wrap) | `sequence_revised` | medium | Strong-ish signal that the first wrap was unsatisfying. Capture both invocation timestamps in `symptom`. |
| User passes `--bridge` to force the bridge gate when threshold didn't fire | `default_overridden` | low | The flag is a valid override path. Aggregate matters — if `--bridge` is used often, threshold may be too tight. |

---

## /vibe-wrap:status

Read-only, mid-session visibility. Minimal interaction surface — minimal friction triggers.

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| (no command-specific triggers) | — | — | `:status` is read-only — no gates, no defaults to override, no artifacts to rewrite, no complements to decline. Friction surfaces only via the universal triggers (`repeat_question`, `rephrase_requested`) above. |

> **Forward-looking note:** if a future version of `:status` grows interactive behavior (e.g., asks the user to choose what to display), revisit this section.

---

## /vibe-wrap:plant

Internal SKILL — invoked by sibling plugins, not by the user directly. Friction comes from siblings' contracts, not from `:plant`'s own interaction surface.

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| A sibling plugin's SKILL explicitly omits `:plant` and the user later complains in chat that the wrap is missing attribution from that plugin | `complement_rejected` | high | Set `complement_involved` to the sibling SKILL name. Detected heuristically — this trigger only fires if the user's chat message names the missing plugin AND the wrap doc body has no entries from that plugin. Capture both in `symptom`. |
| `plant.py` exits non-zero (i.e., breaks the no-op-safe contract) | `default_overridden` | high | The plant contract is "always exit 0, even on UUID resolution failure." A non-zero exit is a contract violation, not user friction in the usual sense — but logged here so `evolve-wrap` can surface the bug. Capture exit code and stderr in `symptom`. |

> Note: `plant` doesn't have its own user-invocable command path, so most friction-logger discipline applies via the calling sibling's SKILL, not via `:plant` itself.

---

## /vibe-wrap:evolve-wrap

Self-evolution loop. Pattern #1. Same shape as Cart's `/evolve` friction triggers, scoped to vibe-wrap.

| Trigger | Friction type | Confidence | Notes |
|---------|---------------|------------|-------|
| User declines to review the generated `proposed-changes.md` (`[skip]` at "ready to walk through proposals?") | `complement_rejected` | high | Set `complement_involved` to `proposed-changes.md`. Strong signal — either the proposal queue is too long, or the timing was wrong. |
| User rejects a proposal in `proposed-changes.md` (chooses `[reject]` interactively, or removes it from the queue before applying) | `default_overridden` | medium | Capture proposal title in `symptom`. The fact that `evolve-wrap` itself proposed the change is implicit. |
| User rewrites >50% of the `proposed-changes.md` file before applying it | `artifact_rewritten` | high | Strong signal — the proposals were directionally right but executed wrong. |
| User reorders the proposal queue significantly (>25% of items moved) | `sequence_revised` | low | Queue order is a soft default. Confidence low. |
| User declines a Pattern #13 complement offer (e.g., `superpowers:writing-plans` to scope a multi-step proposal) | `complement_rejected` | high | Set `complement_involved`. |

---

## Adding a new trigger

When a vibe-wrap command grows a new condition that should produce friction:

1. Add a row to that command's section above (or `Universal triggers` if it applies broadly).
2. Pick the friction type from the canonical seven. If none fit, that's a signal the type set itself needs revisiting — open an `evolve-wrap` proposal rather than coining a new type silently.
3. Pick confidence based on signal strength:
   - **high** = concrete and unambiguous (line-diff, explicit reject, contract violation).
   - **medium** = behavioral inference, recoverable interpretation.
   - **low** = could plausibly be normal exploration or expected use of an opt-in path.
4. Add the matching `friction-logger.log()` invocation in the command SKILL at the trigger point. The bidirectional consistency (this map ↔ actual call sites) is audited by `evolve-wrap` over time.

## Reference

- Pattern #6 (Friction Log) and Pattern #14 (Wins Log / absence-of-friction inference) — `vibe-cartographer/docs/self-evolving-plugins-framework.md`.
- Cart's friction-triggers reference — `~/.claude/plugins/cache/vibe-plugins/vibe-cartographer/<ver>/skills/guide/references/friction-triggers.md`. vibe-wrap mirrors the structural shape; the per-command rows are vibe-wrap-specific.
