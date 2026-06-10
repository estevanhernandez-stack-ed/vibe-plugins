# Seed: vibe-ops — the operate/monitor pillar

**Status:** SEED WITH FIRST LIVE PROBES, written 2026-06-09 (GAP-06 of `../quality-net-gap-analysis-2026-06-09.md`). Operate/monitor is the net's only zero-coverage band: nothing watches production errors, spend, uptime, or whether a deploy landed, for any live app — and the estate already paid for that lesson once (the six-week telemetry blackout). First probes ran live today; the full Celestia3 cowpath pulse is the named next act before the birth.

## v1 scope (from the gap analysis, confirmed by today's probes)

A **Firebase pulse**, pull-based: function error logs, endpoint 200 probes on hosting URLs, quota/budget counter reads, plus **deploy-landed verification** (deployed version vs git HEAD). Findings write into `feedback.md` and the vibe-iterate Atlas so the existing repair lane acts on them — the loop closes instead of dead-ending in a report.

**Pull-based honesty is the product constraint:** every surface says "next-pulse detection," never "alerting" or "real-time." A plugin cannot watch; it can look when asked (or when scheduled — pairing with a scheduler is the user's wiring, not a promise of ours).

## What today's live probes established (2026-06-09, authenticated firebase MCP)

1. **The fleet is enumerable in one call.** `firebase_list_projects` returned **6 ACTIVE projects** with hosting sites: `celestia3`, `project-626labs`, `weseeyouatthemovies`, `tagthatline`, `ladder-9d13a`, `guestbuzz-cineperks`. The "4 of 6 live apps reachable" estimate was low — the pulse surface is the whole account.
2. **The MCP is cwd-scoped.** It binds to the repo's `firebase.json`; a pulse runs *from the app's repo* (or via `firebase_update_environment` to switch). Fleet-wide pulses iterate per-repo — config should map project-id → repo path.
3. **Load-bearing gap: the firebase MCP exposes NO function-logs tool.** Deploy, config, rules, env reads exist; log reads don't. The error-log leg of the pulse shells out to the CLI (`firebase functions:log` / `gcloud functions logs read`) — the MCP alone cannot deliver v1. Design the probe layer CLI-first with MCP reads where they exist, not the reverse.
4. **Deploy-status is job-id-based** (`firebase_deploy_status` wants a job id from a deploy this session) — deploy-landed verification instead compares the live hosting release (CLI: `firebase hosting:channel:list` / releases API) against git HEAD.
5. **Tenant-wall config is mandatory, not optional.** The authenticated account's project list may include work-adjacent projects. `.vibe-ops/config.json` needs an explicit include-list (not exclude) — a pulse must never touch a project the user didn't opt in, per the estate's tenant-wall rule.

## The named next act (cowpath, before any birth)

Hand-run one full pulse on Celestia3 **from its repo**: `firebase functions:log` for the error read, HTTP probes on the hosting URL + key API routes (the `/api/gemini` proxy), deployed-release-vs-HEAD comparison, and a read of the hand-built budget counters (`v3_system/budget_<date>` docs — Este already built rate limits + a daily circuit breaker; the pulse reads what exists, the GAP-14 spend leg rides this). Capture process-notes as the SKILL seed. Only then scaffold the solo repo.

## Boundaries

- MS Store/Partner Center and Roblox legs: P2 follow-ons, must not gate the ship.
- GAP-09's runtime half lands here eventually: restore-actually-works verification and live Firestore shape-correspondence sampling — vibe-sec's static data-posture concern names the absence; vibe-ops proves the mechanism.
- Family conventions at birth: solo repo, no telemetry (ironic and correct: the ops plugin itself phones home to no one), loggers + `:evolve-ops` day 1, state in `.vibe-ops/`, real-app validation on Celestia3 by construction.
