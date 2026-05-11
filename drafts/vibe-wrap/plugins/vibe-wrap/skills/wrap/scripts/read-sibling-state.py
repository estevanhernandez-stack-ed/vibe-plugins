#!/usr/bin/env python3
"""
read-sibling-state.py — pure-read scanner for sibling vibe plugin state.

Given a session start timestamp, scan every sibling vibe plugin's state
directory under ~/.claude/plugins/data/<sibling>/ and return entries
whose timestamp falls at or after the session start.

Usage:
    python read-sibling-state.py --session-start <iso-ts>

Args:
    --session-start  ISO 8601 timestamp (with or without TZ). Required.
                     Entries with timestamp >= this value are kept.

Output:
    JSON object on stdout, keyed by sibling-plugin name. Each value is a
    dict of:
        {
            "sessions": [...],   # entries from sessions/<date>.jsonl
            "friction": [...],   # entries from friction.jsonl
            "wins":     [...]    # entries from wins.jsonl (only when present)
        }
    Siblings with zero matched entries across all categories are omitted.

Exit codes:
    0  — normal (including "no sibling state" — output is `{}`).
    1  — catastrophic (e.g., the data dir exists but is not a directory).

Behavior:
    - Skips vibe-wrap's own data dir. We don't read our own state into a
      sibling-trail summary.
    - Tolerates missing fields, unknown fields, and malformed lines (skip
      with a one-line stderr warning).
    - Pattern #11 namespace isolation respected — read-only against every
      sibling dir.

OPEN ISSUE #3 RESOLUTION (2026-05-10):
    Sibling timestamp shapes verified across Cart, Iterate, and Test:
      - Cart    (vibe-cartographer/sessions/*.jsonl): "2026-04-17T07:55:00-05:00"
        → ISO 8601 with TZ offset, second precision.
      - Iterate (vibe-iterate/sessions/*.jsonl):     "2026-05-07T21:04:15-05:00"
        → ISO 8601 with TZ offset, second precision.
      - Test    (vibe-test/sessions/*.jsonl):        "2026-04-17T22:20:58.364Z"
        → ISO 8601 with Z suffix, millisecond precision.
    Test's "Z" form is valid ISO 8601 (UTC) and parseable by
    datetime.fromisoformat() in Python 3.11+ once we map "Z" → "+00:00".
    The parse_ts() helper here handles all three shapes plus a no-TZ
    fallback (assumed local).

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
from pathlib import Path

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252 which trips on
# non-ASCII glyphs (em-dashes, arrows, smart quotes) in sibling payloads.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

PLUGIN_DATA_ROOT = Path.home() / ".claude" / "plugins" / "data"
OWN_PLUGIN_NAME = "vibe-wrap"

# Standard per-sibling files we look for. wins.jsonl is optional.
FRICTION_FILE = "friction.jsonl"
WINS_FILE = "wins.jsonl"
SESSIONS_DIR = "sessions"


def warn(msg: str) -> None:
    """One-line stderr warning."""
    sys.stderr.write(f"read-sibling-state: {msg}\n")


def parse_ts(raw: object) -> _dt.datetime | None:
    """Parse an ISO 8601 timestamp tolerantly.

    See module docstring for the three shapes seen in the wild. Returns
    None if the value is missing or unparseable.
    """
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
        # Bare ISO timestamp — assume local TZ so comparisons stay sane.
        parsed = parsed.astimezone()
    return parsed


def entry_ts(entry: dict) -> _dt.datetime | None:
    """Extract a comparable ts from an entry, preferring `timestamp` then `ts`."""
    return parse_ts(entry.get("timestamp")) or parse_ts(entry.get("ts"))


def read_jsonl_filtered(path: Path, since: _dt.datetime) -> list[dict]:
    """Read one JSONL file, keeping entries where timestamp >= since.

    Tolerates missing/bad ts (skipped). Tolerates malformed lines (skipped
    with stderr warning).
    """
    if not path.exists():
        return []
    kept: list[dict] = []
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
                ts = entry_ts(obj)
                if ts is None:
                    # No timestamp we can compare → skip silently. Don't
                    # warn for every line; sibling schemas may legitimately
                    # have non-timestamped entries (rare, but possible).
                    continue
                if ts >= since:
                    kept.append(obj)
    except OSError as err:
        warn(f"could not read {path}: {err}")
        return []
    return kept


def collect_sibling(
    sibling_dir: Path, since: _dt.datetime
) -> dict | None:
    """Collect filtered entries for one sibling.

    Returns the per-sibling dict if any category has entries; else None.
    """
    name = sibling_dir.name
    sessions_path = sibling_dir / SESSIONS_DIR
    friction_path = sibling_dir / FRICTION_FILE
    wins_path = sibling_dir / WINS_FILE

    sessions: list[dict] = []
    if sessions_path.exists() and sessions_path.is_dir():
        # sessions/ contains one JSONL per date; scan all of them.
        try:
            session_files = sorted(sessions_path.glob("*.jsonl"))
        except OSError as err:
            warn(f"could not list {sessions_path}: {err}")
            session_files = []
        for sf in session_files:
            sessions.extend(read_jsonl_filtered(sf, since))

    friction: list[dict] = read_jsonl_filtered(friction_path, since)
    wins: list[dict] = read_jsonl_filtered(wins_path, since)

    # If everything is empty, omit this sibling entirely.
    if not sessions and not friction and not wins and not wins_path.exists():
        # If wins.jsonl doesn't exist at all, we never include the wins key.
        if not sessions and not friction:
            return None

    payload: dict = {"sessions": sessions, "friction": friction}
    # Only include the wins key when the sibling actually ships wins.jsonl.
    if wins_path.exists():
        payload["wins"] = wins

    # Final emptiness check: any entries at all?
    if not sessions and not friction and not wins:
        return None
    # Mark the sibling name internally so callers can debug; also helpful
    # if the caller ever switches to a list shape.
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="read-sibling-state.py",
        description="Read filtered sibling-plugin state since a session start.",
    )
    parser.add_argument("--session-start", dest="session_start", required=True)
    args = parser.parse_args()

    since = parse_ts(args.session_start)
    if since is None:
        warn(f"could not parse --session-start '{args.session_start}'")
        # Empty result is the safest non-catastrophic response — the wrap
        # renderer will still produce a valid doc.
        sys.stdout.write("{}\n")
        return 0

    if not PLUGIN_DATA_ROOT.exists():
        # No siblings installed yet. Not catastrophic.
        sys.stdout.write("{}\n")
        return 0
    if not PLUGIN_DATA_ROOT.is_dir():
        warn(f"{PLUGIN_DATA_ROOT} exists but is not a directory")
        return 1

    out: dict[str, dict] = {}
    try:
        siblings = sorted(PLUGIN_DATA_ROOT.iterdir())
    except OSError as err:
        warn(f"could not list {PLUGIN_DATA_ROOT}: {err}")
        return 1

    for sibling_dir in siblings:
        if not sibling_dir.is_dir():
            continue
        if sibling_dir.name == OWN_PLUGIN_NAME:
            # Skip vibe-wrap's own data dir — we don't read our own
            # state into the sibling-trail summary.
            continue
        result = collect_sibling(sibling_dir, since)
        if result is not None:
            out[sibling_dir.name] = result

    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
