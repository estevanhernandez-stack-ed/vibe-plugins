#!/usr/bin/env python3
"""
status.py — vibe-wrap:status implementation.

Mid-session read-only summary. Calls the three reader scripts (breadcrumbs,
sibling state, decision log) and renders a compact ≤20-line summary to
stdout. No mutations. <3 second budget.

Usage:
    python status.py [--session-id <uuid>] [--session-start <iso-ts>]

Args:
    --session-id     Claude Code session UUID. Optional. Empty → "best-effort"
                     mode (orphan breadcrumbs picked up via --include-orphans;
                     sibling-state window = now − 4 hours).
    --session-start  ISO 8601 timestamp. Optional. When omitted: derived from
                     earliest breadcrumb ts when breadcrumbs exist, else
                     `now − 4 hours`.

Output:
    Compact summary on stdout. ≤20 lines. stderr only for genuine errors.

Exit codes:
    0  — always (status is read-only and best-effort by design).

Pure stdlib + subprocess. Python 3.11+.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import importlib.util
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
WRAP_SCRIPTS_DIR = SCRIPT_DIR.parent.parent / "wrap" / "scripts"
READ_BREADCRUMBS = WRAP_SCRIPTS_DIR / "read-breadcrumbs.py"
READ_SIBLING_STATE = WRAP_SCRIPTS_DIR / "read-sibling-state.py"
DECISION_LOG_INIT = WRAP_SCRIPTS_DIR / "decision-log" / "__init__.py"

BEST_EFFORT_LOOKBACK_HOURS = 4
SOURCE_LIST_LIMIT = 5


def warn(msg: str) -> None:
    """One-line stderr warning."""
    sys.stderr.write(f"status: {msg}\n")


def now_local_iso() -> str:
    """ISO 8601 timestamp with local TZ offset."""
    return _dt.datetime.now(_dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def parse_ts(raw: str | None) -> _dt.datetime | None:
    """Parse an ISO 8601 timestamp tolerantly. Returns None on failure."""
    if not raw or not isinstance(raw, str):
        return None
    candidate = raw.strip()
    if not candidate:
        return None
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = _dt.datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.astimezone()
    return parsed


def run_reader(
    script: Path, args: list[str]
) -> tuple[Any, str | None]:
    """Run a reader script, return (parsed_json, error_message_or_None).

    Reader scripts always print JSON to stdout on success. We capture stdout,
    parse it, and tolerate any failure (subprocess error, JSON decode error)
    by returning (None, error_string).
    """
    if not script.exists():
        return None, f"reader missing: {script}"
    try:
        proc = subprocess.run(
            [sys.executable, str(script), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=10,
        )
    except (subprocess.SubprocessError, OSError) as err:
        return None, f"subprocess failed for {script.name}: {err}"
    # Forward any stderr from the reader so the user sees it.
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        return None, f"{script.name} exited {proc.returncode}"
    try:
        return json.loads(proc.stdout), None
    except json.JSONDecodeError as err:
        return None, f"{script.name} produced unparseable JSON: {err}"


def import_dispatcher() -> Any | None:
    """Dynamically import the decision-log dispatcher.

    The dispatcher dir is hyphenated (`decision-log/`), so a normal import
    statement won't reach it. We use importlib.util to load __init__.py
    directly. Returns the module on success, None on any failure.
    """
    if not DECISION_LOG_INIT.exists():
        warn(f"decision-log dispatcher not found at {DECISION_LOG_INIT}")
        return None
    try:
        spec = importlib.util.spec_from_file_location(
            "decision_log_dispatcher",
            str(DECISION_LOG_INIT),
            submodule_search_locations=[str(DECISION_LOG_INIT.parent)],
        )
        if spec is None or spec.loader is None:
            warn("decision-log dispatcher spec unresolvable")
            return None
        module = importlib.util.module_from_spec(spec)
        # Register before exec so relative imports inside __init__.py work.
        sys.modules["decision_log_dispatcher"] = module
        spec.loader.exec_module(module)
        return module
    except Exception as err:
        warn(f"decision-log dispatcher import failed: {err}")
        return None


def read_breadcrumbs(session_id: str) -> list[dict]:
    """Run read-breadcrumbs.py with --include-orphans. Returns [] on failure."""
    args = ["--session-id", session_id, "--include-orphans"]
    data, err = run_reader(READ_BREADCRUMBS, args)
    if err is not None:
        warn(err)
        return []
    if not isinstance(data, list):
        warn("read-breadcrumbs returned non-list")
        return []
    return data


def read_sibling_state(session_start_iso: str) -> dict[str, dict]:
    """Run read-sibling-state.py. Returns {} on failure."""
    args = ["--session-start", session_start_iso]
    data, err = run_reader(READ_SIBLING_STATE, args)
    if err is not None:
        warn(err)
        return {}
    if not isinstance(data, dict):
        warn("read-sibling-state returned non-dict")
        return {}
    return data


def read_decisions(
    window_start_iso: str, window_end_iso: str
) -> tuple[int, str]:
    """Read decisions in window via dispatcher. Returns (count, backend_name).

    backend_name is one of: the resolved backend, "pending" (first-run not yet
    completed), or "unknown" (dispatcher import failed). count is 0 on any
    failure path.
    """
    dispatcher = import_dispatcher()
    if dispatcher is None:
        return 0, "unknown"
    try:
        backend = dispatcher.active_backend()
    except Exception as err:
        warn(f"dispatcher.active_backend() failed: {err}")
        backend = None
    if backend is None:
        # First-run pending. :status is read-only — never invoke the
        # interactive picker. Report as pending with zero decisions.
        return 0, "pending"
    try:
        decisions = dispatcher.read({"start": window_start_iso, "end": window_end_iso})
    except Exception as err:
        warn(f"dispatcher.read() failed: {err}")
        decisions = []
    if not isinstance(decisions, list):
        decisions = []
    return len(decisions), backend


def derive_session_start(
    breadcrumbs: list[dict], explicit_start: str | None
) -> str:
    """Pick the session-state read window start.

    Precedence:
      1. --session-start arg if it parses.
      2. Earliest breadcrumb ts if breadcrumbs exist.
      3. now − 4 hours fallback.
    """
    parsed_explicit = parse_ts(explicit_start) if explicit_start else None
    if parsed_explicit is not None:
        return parsed_explicit.isoformat(timespec="seconds")

    earliest: _dt.datetime | None = None
    for entry in breadcrumbs:
        ts = parse_ts(entry.get("ts"))
        if ts is not None and (earliest is None or ts < earliest):
            earliest = ts
    if earliest is not None:
        return earliest.isoformat(timespec="seconds")

    fallback = _dt.datetime.now(_dt.timezone.utc).astimezone() - _dt.timedelta(
        hours=BEST_EFFORT_LOOKBACK_HOURS
    )
    return fallback.isoformat(timespec="seconds")


def render(
    session_id: str,
    breadcrumbs: list[dict],
    sibling_state: dict[str, dict],
    session_start_iso: str,
    decision_count: int,
    backend_name: str,
) -> str:
    """Build the ≤20-line summary string."""
    lines: list[str] = []

    # Header line.
    if session_id:
        prefix = session_id.split("-")[0] if "-" in session_id else session_id[:8]
        header = f"vibe-wrap status — session-id {prefix}..."
    else:
        header = "vibe-wrap status — best-effort, no session-id"
    lines.append(header)
    lines.append("")

    # Decide if everything is empty.
    everything_empty = (
        not breadcrumbs and not sibling_state and decision_count == 0
    )
    if everything_empty:
        lines.append(
            "No breadcrumbs captured this session yet — check that sibling plugins"
        )
        lines.append("have run any commands.")
        lines.append("No sibling state in window. No decisions logged in window.")
        return "\n".join(lines) + "\n"

    # Breadcrumbs section.
    source_counter: Counter[str] = Counter()
    for entry in breadcrumbs:
        src = entry.get("source")
        if isinstance(src, str) and src:
            source_counter[src] += 1
    n_entries = len(breadcrumbs)
    n_sources = len(source_counter)
    lines.append(
        f"Breadcrumbs:    {n_entries} entries from {n_sources} source plugins"
    )
    if source_counter:
        # Sort by count desc, then name asc; truncate at SOURCE_LIST_LIMIT.
        ranked = sorted(
            source_counter.items(), key=lambda kv: (-kv[1], kv[0])
        )
        shown = ranked[:SOURCE_LIST_LIMIT]
        more = len(ranked) - len(shown)
        rendered = ", ".join(f"{name} ({count})" for name, count in shown)
        if more > 0:
            rendered += f", ... and {more} more"
        lines.append(f"  Sources: {rendered}")
    lines.append("")

    # Sibling state section.
    lines.append(f"Sibling state (since {session_start_iso}):")
    if not sibling_state:
        lines.append("  No sibling state in window.")
    else:
        # Width-align names to the longest sibling name for readability.
        names = sorted(sibling_state.keys())
        name_width = max(len(n) for n in names)
        for name in names:
            payload = sibling_state[name]
            n_sessions = len(payload.get("sessions", []))
            n_friction = len(payload.get("friction", []))
            row = (
                f"  {name.ljust(name_width)}  "
                f"{n_sessions} sessions  {n_friction} friction"
            )
            if "wins" in payload:
                row += f"  {len(payload['wins'])} wins"
            lines.append(row)
    lines.append("")

    # Decision log section.
    lines.append(f"Decision log (active backend: {backend_name}):")
    lines.append(f"  {decision_count} decisions in session window")

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="status.py",
        description="vibe-wrap:status — read-only mid-session summary.",
    )
    parser.add_argument("--session-id", dest="session_id", default="")
    parser.add_argument("--session-start", dest="session_start", default=None)
    args = parser.parse_args()

    session_id = (args.session_id or "").strip()

    # Reader 1: breadcrumbs (best-effort). Always passes --include-orphans
    # so empty-session-id mode still surfaces orphan entries.
    breadcrumbs = read_breadcrumbs(session_id)

    # Window derivation for the next two reads.
    window_start_iso = derive_session_start(breadcrumbs, args.session_start)
    window_end_iso = now_local_iso()

    # Reader 2: sibling state.
    sibling_state = read_sibling_state(window_start_iso)

    # Reader 3: decision log via dispatcher (dynamic import).
    decision_count, backend_name = read_decisions(window_start_iso, window_end_iso)

    summary = render(
        session_id=session_id,
        breadcrumbs=breadcrumbs,
        sibling_state=sibling_state,
        session_start_iso=window_start_iso,
        decision_count=decision_count,
        backend_name=backend_name,
    )
    sys.stdout.write(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
