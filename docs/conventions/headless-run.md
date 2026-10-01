# Family convention: headless runs declare what they expect to see

**Status:** PROPOSED v0, written 2026-10-01 from the Sonnet 5.5 sweep. Ratify after the first adopter proves it on a real schedule.
**Applies to:** anything run by a scheduler or by `claude -p` with no person watching: Task Scheduler and cron jobs, scheduled scans, eval drivers, nightly summaries, any plugin command that documents a scheduled mode.
**The point:** a headless run inherits nothing from the session that designed it. Three projects paid for assuming it did.

## The incidents

1. **PriceScout.** The environment and company binding that every interactive session carried was unset when the same work ran headless; the run executed against nothing and reported nothing wrong. The cron that was meant to carry it was never persisted (sweep brief, 2026-09-30).
2. **Doctrine eval drivers.** Pilot drivers run as Workflow subagents received a relay of the user's triggering message ("work on 1, 2, 3 and 5") and the session's MCP connection notices. Two reports in the no-digest condition mentioned both, so the no-digest cell was not a bare model and the measurement was contaminated. Recorded in `fixtures/doctrine-eval/reports/pilot-2026-09-23.md`; the full run is specified to drive with `claude -p` from inside each fixture repo for this reason (verified).
3. **vibe-insights scheduled scan.** The scheduled `claude -p` run has no way to show, after the fact, which config home, which transcript root and which plugin version it scanned, so a wrong answer (the 2026-09-14 bucketing defect) could not be told apart from a wrong input until someone re-ran it by hand (decision 2026-09-14 plus sweep brief).

Two failure directions, one cause: the run either **saw less than it expected** (an unset binding, a missing env var) or **saw more** (a parent conversation leaking in), and in neither case did anything say so.

## The convention

1. **Env pin.** A headless entry point declares every environment variable it reads, and for each one either pins the value in the schedule definition or fails fast when it is unset. It never falls back to an interactive default, because the interactive default is exactly what is absent.
2. **Explicit binding.** The project, tenant, company, room or estate root the run acts on is a parameter: on the command line, or in a config file checked in next to the schedule definition. It is never discovered from the working directory, the last interactive session, or a dashboard "current project".
3. **Tripwire line.** The first line the run writes states what it saw: the binding, the names (never the values) of the env vars it read, the tool and plugin versions, the working directory, and what triggered it. Whatever consumes the run checks for that line. A missing or mismatched tripwire is a **failed run**, never an empty result. This is the line a vibe-ops liveness leg can look for (see `../spec-bank/vibe-ops-seed.md`).
4. **Isolation.** A model-driven headless run starts from inside the target repository with `claude -p` and an explicit prompt file. It is not spawned from a parent conversation or a Workflow, so no parent context, no relayed user message and no MCP notice can reach it. If the run must know something from the parent, that something goes in the prompt file, where it is reviewable.
5. **The schedule is in the repo.** The Task Scheduler export, cron line or workflow file that fires the run is committed beside the entry point, so the run's identity (what, when, as whom, with which arguments) is diffable and a "never persisted" schedule is visible as a missing file.

## What this is not

Not monitoring: vibe-ops watches outcomes across instruments; this convention is about one run's honest self-report, which is what gives the pulse something to read. Not a logging standard: the tripwire is one line with a fixed shape, not a log format. Not a Claude Code setting: `claude -p` has no flag for any of this, and the convention is what fills that gap.

## Adoption

First three adopters, in order of how much they already hurt: the PriceScout cron, the vibe-insights scheduled scan, the doctrine eval 3x run. Each adoption is one commit (entry point plus schedule file plus the tripwire line) and one verified run whose first line is quoted in the decision log. After the first one lands, this moves to STANDARD v1 or gets rewritten from what the run actually needed.
