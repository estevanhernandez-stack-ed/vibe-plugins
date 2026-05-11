#!/usr/bin/env python3
"""
plant.py — write one breadcrumb line into the active session's breadcrumb file.

Internal SKILL surface. Sibling plugins (or non-vibe tools) invoke this
at command-start (or any other moment worth marking) to drop a breadcrumb
that vibe-wrap reads at session-wrap time.

Usage:
    python plant.py
        --session-id <uuid-or-empty>
        --source <plugin-name>
        --command <slash-command-without-leading-slash>
        --phase <start | end | fire>
        [--skill <skill-name>]
        [--outcome <in_progress | completed | failed>]
        [--payload <json-string>]

Args:
    --session-id  : Claude Code session UUID. Resolved by the SKILL caller via
                    the `${CLAUDE_SESSION_ID}` template substitution. May be an
                    empty string — the script falls back to `_orphan.jsonl`.
    --source      : calling plugin's name (e.g., "vibe-cartographer"). Required.
    --command     : calling slash-command without leading "/" (e.g., "scope").
                    Required.
    --phase       : one of "start", "end", "fire". Required.
    --skill       : invoked SKILL name. Optional.
    --outcome     : one of "in_progress", "completed", "failed". Optional.
    --payload     : JSON-encoded object with source-defined extras. Optional.

Exit codes:
    Always 0. The no-op-safe contract is load-bearing for sibling plugin
    authors — any failure is logged to stderr as a one-line warning and the
    script exits 0. Never raise to the caller.

Storage:
    ~/.claude/plugins/data/vibe-wrap/breadcrumbs/<session-uuid>.jsonl
    or, when session-id is empty / unresolvable:
    ~/.claude/plugins/data/vibe-wrap/breadcrumbs/_orphan.jsonl

Pure stdlib. Python 3.11+. Pattern #11 namespace isolation — writes only
inside vibe-wrap's data dir.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import subprocess
import sys
from pathlib import Path

PLUGIN_NAME = "vibe-wrap"
SCHEMA_VERSION = 1

SCRIPT_DIR = Path(__file__).resolve().parent
# plant/scripts -> plant -> skills -> plugins/vibe-wrap
PLUGIN_ROOT = SCRIPT_DIR.parent.parent.parent
ATOMIC_APPEND = PLUGIN_ROOT / "skills" / "wrap" / "scripts" / "atomic-append-jsonl.py"

DATA_DIR = Path.home() / ".claude" / "plugins" / "data" / PLUGIN_NAME / "breadcrumbs"

VALID_PHASES = {"start", "end", "fire"}
VALID_OUTCOMES = {"in_progress", "completed", "failed"}


def warn(msg: str) -> None:
    """One-line stderr warning. Never raises. Never exits non-zero."""
    sys.stderr.write(f"vibe-wrap:plant: {msg}\n")


def now_iso_with_offset() -> str:
    """Local time with timezone offset (e.g., 2026-05-10T15:42:00-05:00)."""
    return _dt.datetime.now(_dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def resolve_target(session_id: str) -> Path:
    """Pick the breadcrumb file path for the given session UUID.

    Empty session_id → orphan file. Otherwise → per-session file.
    """
    if session_id and session_id.strip():
        return DATA_DIR / f"{session_id.strip()}.jsonl"
    return DATA_DIR / "_orphan.jsonl"


def parse_payload(raw: str | None) -> object:
    """Parse the optional --payload JSON. None → None. Bad JSON → raise."""
    if raw is None or raw == "":
        return None
    return json.loads(raw)


def build_breadcrumb(
    session_id: str,
    source: str,
    command: str,
    phase: str,
    skill: str | None,
    outcome: str | None,
    payload: object,
) -> dict:
    """Assemble the v1 breadcrumb dict per the contract schema."""
    entry: dict = {
        "schema_version": SCHEMA_VERSION,
        "ts": now_iso_with_offset(),
        "sessionUUID": session_id if session_id else None,
        "source": source,
        "command": command,
        "phase": phase,
        "outcome": outcome,
        "payload": payload,
    }
    # `skill` is the only optional field — include it only when supplied.
    if skill is not None and skill != "":
        entry["skill"] = skill
    return entry


def append_via_atomic(entry: dict, target: Path) -> int:
    """Pipe the entry through atomic-append-jsonl.py. Returns the exit code."""
    payload = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
    try:
        proc = subprocess.run(
            [sys.executable, str(ATOMIC_APPEND), str(target)],
            input=payload.encode("utf-8"),
            capture_output=True,
            check=False,
        )
    except OSError as err:
        warn(f"atomic-append invocation failed: {err}")
        return 1
    if proc.returncode != 0:
        warn(
            f"atomic-append exit {proc.returncode}: "
            f"{proc.stderr.decode('utf-8', errors='replace').strip()}"
        )
    return proc.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="plant.py",
        description="Drop one breadcrumb line into the active session's breadcrumb file.",
        # We do our own error handling so argparse doesn't sys.exit(2) on missing args.
        add_help=True,
    )
    parser.add_argument("--session-id", dest="session_id", default="")
    parser.add_argument("--source", dest="source", default=None)
    parser.add_argument("--command", dest="command", default=None)
    parser.add_argument("--phase", dest="phase", default=None)
    parser.add_argument("--skill", dest="skill", default=None)
    parser.add_argument("--outcome", dest="outcome", default=None)
    parser.add_argument("--payload", dest="payload", default=None)

    # argparse calls sys.exit(2) on parse error; intercept so we honor the
    # no-op-safe contract (always exit 0).
    try:
        args = parser.parse_args()
    except SystemExit as err:
        # argparse already printed its own message to stderr.
        warn(f"argument parse failed (code {err.code}); skipping breadcrumb")
        return 0

    # Required-field discipline: missing required → warn + exit 0.
    if not args.source:
        warn("missing required --source; skipping breadcrumb")
        return 0
    if not args.command:
        warn("missing required --command; skipping breadcrumb")
        return 0
    if not args.phase:
        warn("missing required --phase; skipping breadcrumb")
        return 0
    if args.phase not in VALID_PHASES:
        # Forward-compat: write through anyway but warn. The reader tolerates
        # unknown phase values by treating them as "fire".
        warn(f"unknown --phase '{args.phase}' (expected one of {sorted(VALID_PHASES)}); writing anyway")
    if args.outcome is not None and args.outcome != "" and args.outcome not in VALID_OUTCOMES:
        warn(f"unknown --outcome '{args.outcome}' (expected one of {sorted(VALID_OUTCOMES)} or null); writing anyway")

    # Parse payload defensively.
    try:
        payload = parse_payload(args.payload)
    except json.JSONDecodeError as err:
        warn(f"invalid --payload JSON ({err.msg} at line {err.lineno} col {err.colno}); skipping breadcrumb")
        return 0

    # Normalize outcome: empty string → None.
    outcome = args.outcome if (args.outcome is not None and args.outcome != "") else None

    # Build the breadcrumb dict.
    try:
        entry = build_breadcrumb(
            session_id=args.session_id or "",
            source=args.source,
            command=args.command,
            phase=args.phase,
            skill=args.skill,
            outcome=outcome,
            payload=payload,
        )
    except Exception as err:
        warn(f"could not build breadcrumb: {err}")
        return 0

    target = resolve_target(args.session_id or "")

    # Atomic append. If it fails, atomic-append already wrote stderr — we
    # warned via the helper. Either way, exit 0 (no-op-safe).
    append_via_atomic(entry, target)
    return 0


if __name__ == "__main__":
    # Hard guard: never let an unhandled exception escape. The no-op-safe
    # contract is load-bearing for sibling plugin authors.
    try:
        sys.exit(main())
    except Exception as err:  # noqa: BLE001 — last-resort guard
        warn(f"unhandled error: {err}")
        sys.exit(0)
