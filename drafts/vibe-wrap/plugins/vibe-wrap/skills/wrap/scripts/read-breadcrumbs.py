#!/usr/bin/env python3
"""
read-breadcrumbs.py — pure-read parser for vibe-wrap breadcrumb files.

Given a session UUID, read and parse the per-session breadcrumb JSONL file.
Optionally include orphan breadcrumbs whose timestamps fall close to the
session window.

Usage:
    python read-breadcrumbs.py --session-id <uuid> [--include-orphans]

Args:
    --session-id        Claude Code session UUID. Required.
    --include-orphans   Also include _orphan.jsonl entries whose ts falls
                        within ±2 hours of the session's first/last
                        breadcrumb timestamps. If the session has no
                        breadcrumbs at all, include all orphans from the
                        last 4 hours as a courtesy.

Output:
    JSON array of breadcrumb dicts on stdout. One entry per breadcrumb.

Exit codes:
    0  — normal (including "no breadcrumbs found" — output is `[]`).
    1  — catastrophic (e.g., breadcrumbs dir is unreadable).

Behavior:
    - Tolerates unknown fields in breadcrumb lines (forward-compat).
    - Skips malformed lines with a one-line stderr warning of the form:
        read-breadcrumbs: skipped malformed line at <path>:<lineno>
      Never raises on a malformed line.
    - Returns entries in file order (append order). Orphans are merged
      after the per-session entries.

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
from pathlib import Path

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252 which trips on
# non-ASCII glyphs (em-dashes, arrows, smart quotes) in upstream payloads.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    # Pre-3.7 stream or already-wrapped — best-effort only.
    pass

PLUGIN_NAME = "vibe-wrap"
DATA_DIR = Path.home() / ".claude" / "plugins" / "data" / PLUGIN_NAME / "breadcrumbs"
ORPHAN_FILE = DATA_DIR / "_orphan.jsonl"

# Orphan correlation heuristics.
ORPHAN_WINDOW_HOURS = 2  # ± window around session breadcrumb timestamps
EMPTY_SESSION_LOOKBACK_HOURS = 4  # courtesy window when the session has zero breadcrumbs


def warn(msg: str) -> None:
    """One-line stderr warning."""
    sys.stderr.write(f"read-breadcrumbs: {msg}\n")


def parse_ts(raw: str | None) -> _dt.datetime | None:
    """Parse an ISO 8601 timestamp tolerantly.

    Accepts:
        - ISO 8601 with timezone offset (e.g., 2026-04-17T01:50:00-05:00).
        - ISO 8601 with Z suffix (e.g., 2026-04-17T22:20:58.364Z).
        - ISO 8601 without timezone (assumed local).

    Returns None if the value is missing or unparseable.
    """
    if not raw or not isinstance(raw, str):
        return None
    candidate = raw.strip()
    if not candidate:
        return None
    # Python's fromisoformat handles "+00:00" but not "Z" until 3.11+, where
    # it does. We still normalize defensively for clarity.
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = _dt.datetime.fromisoformat(candidate)
    except ValueError:
        return None
    # If the parsed timestamp has no tzinfo, assume local — astimezone()
    # then anchors it to a real offset.
    if parsed.tzinfo is None:
        parsed = parsed.astimezone()
    return parsed


def read_jsonl(path: Path) -> list[dict]:
    """Read one JSONL file, returning the parsed lines as dicts.

    Skips malformed lines with a stderr warning. Returns [] if the file
    doesn't exist. Re-raises on read errors so the caller can decide.
    """
    if not path.exists():
        return []
    entries: list[dict] = []
    try:
        with path.open("r", encoding="utf-8") as fh:
            for lineno, raw_line in enumerate(fh, start=1):
                stripped = raw_line.strip()
                if not stripped:
                    continue
                try:
                    obj = json.loads(stripped)
                except json.JSONDecodeError:
                    warn(f"skipped malformed line at {path}:{lineno}")
                    continue
                if not isinstance(obj, dict):
                    warn(f"skipped non-object line at {path}:{lineno}")
                    continue
                entries.append(obj)
    except OSError as err:
        # Catastrophic at file level — re-raise so main() can decide.
        raise OSError(f"failed to read {path}: {err}") from err
    return entries


def session_window(entries: list[dict]) -> tuple[_dt.datetime | None, _dt.datetime | None]:
    """Return (earliest, latest) ts across entries, ignoring missing/bad ts."""
    timestamps: list[_dt.datetime] = []
    for entry in entries:
        ts = parse_ts(entry.get("ts"))
        if ts is not None:
            timestamps.append(ts)
    if not timestamps:
        return None, None
    return min(timestamps), max(timestamps)


def filter_orphans_near_window(
    orphans: list[dict],
    window_start: _dt.datetime | None,
    window_end: _dt.datetime | None,
) -> list[dict]:
    """Filter orphans whose ts falls within ±2 hours of the window.

    If window_start/window_end are None (session had no breadcrumbs),
    fall back to "last 4 hours" using local now.
    """
    if window_start is None or window_end is None:
        cutoff = _dt.datetime.now(_dt.timezone.utc).astimezone() - _dt.timedelta(
            hours=EMPTY_SESSION_LOOKBACK_HOURS
        )
        return [o for o in orphans if (parse_ts(o.get("ts")) or cutoff) >= cutoff]
    delta = _dt.timedelta(hours=ORPHAN_WINDOW_HOURS)
    lo, hi = window_start - delta, window_end + delta
    keep: list[dict] = []
    for orphan in orphans:
        ts = parse_ts(orphan.get("ts"))
        if ts is None:
            # No ts → cannot correlate; skip.
            continue
        if lo <= ts <= hi:
            keep.append(orphan)
    return keep


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="read-breadcrumbs.py",
        description="Read + parse vibe-wrap breadcrumbs for a given session UUID.",
    )
    parser.add_argument("--session-id", dest="session_id", required=True)
    parser.add_argument(
        "--include-orphans",
        dest="include_orphans",
        action="store_true",
        default=False,
    )
    args = parser.parse_args()

    session_id = args.session_id.strip()
    if not session_id:
        warn("--session-id was empty; nothing to read")
        sys.stdout.write("[]\n")
        return 0

    # Catastrophic guard: if the breadcrumbs dir is unreadable, exit 1.
    if DATA_DIR.exists() and not DATA_DIR.is_dir():
        warn(f"{DATA_DIR} exists but is not a directory")
        return 1

    session_path = DATA_DIR / f"{session_id}.jsonl"
    try:
        session_entries = read_jsonl(session_path)
    except OSError as err:
        warn(str(err))
        return 1

    combined: list[dict] = list(session_entries)

    if args.include_orphans:
        try:
            orphan_entries = read_jsonl(ORPHAN_FILE)
        except OSError as err:
            # Orphan failure is not catastrophic — warn and continue with
            # whatever we already have.
            warn(str(err))
            orphan_entries = []
        win_start, win_end = session_window(session_entries)
        kept_orphans = filter_orphans_near_window(orphan_entries, win_start, win_end)
        combined.extend(kept_orphans)

    sys.stdout.write(json.dumps(combined, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
