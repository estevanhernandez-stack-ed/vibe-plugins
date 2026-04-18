---
description: "Run a structural integrity check on Vibe Cartographer's installation. Reports findings across eight checks; read-only in this release."
argument-hint: "[--full]"
---

Use the **vitals** skill (`skills/vitals/SKILL.md`) to run the eight-check self-diagnostic on this Vibe Cartographer install.

Checks covered: (1) SKILL cross-references, (2) template references, (3) unified profile schema, (4) Pattern #13 complement availability, (5) friction log volume sanity, (6) friction-trigger consistency, (7) leftover `.tmp` debris, (8) `friction.jsonl` line integrity.

Default scans the last 30 days of session logs for check #5. Pass `--full` for a complete-history scan (slower; warns up front).

Read-only: findings are reported as a banner-style report with ✓ / ⚠ / ✗ per check and a summary line. Auto-fix actions ship in a later release — this command never writes.
