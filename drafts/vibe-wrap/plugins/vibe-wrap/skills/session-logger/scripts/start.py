#!/usr/bin/env python3
"""
start.py — sentinel session-log entry for vibe-wrap.

Mints a UUID v4 for the session, builds the sentinel entry per the
session-logger SKILL schema, and atomic-appends it to today's session
file at `~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`.

Prints the sessionUUID to stdout so the caller can capture it and pass
it back to `end.py` at command end.

Usage:
    python start.py <command> <project_dir>

Args:
    command       — vibe-wrap command name (wrap | status | plant | evolve-wrap)
    project_dir   — basename of the cwd (PII discipline; never the full path)

Exit codes:
    0 — success (sessionUUID printed to stdout)
    1 — usage error or unrecoverable failure (stderr explains)

Notes:
    - On any non-fatal write failure (atomic-append errors), prints the
      sessionUUID and exits 0 anyway. Session logging is instrumentation,
      not critical path. The caller still gets a UUID it can pair with
      end.py.
    - mode and persona are read from ~/.claude/profiles/builder.json if
      present; passed through as null otherwise.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

PLUGIN_NAME = "vibe-wrap"

SCRIPT_DIR = Path(__file__).resolve().parent
# session-logger/scripts -> session-logger -> skills -> plugins/vibe-wrap
PLUGIN_ROOT = SCRIPT_DIR.parent.parent.parent
PLUGIN_MANIFEST = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
ATOMIC_APPEND = PLUGIN_ROOT / "skills" / "wrap" / "scripts" / "atomic-append-jsonl.py"

DATA_DIR = Path.home() / ".claude" / "plugins" / "data" / PLUGIN_NAME / "sessions"
PROFILE_PATH = Path.home() / ".claude" / "profiles" / "builder.json"


def read_plugin_version() -> str:
    try:
        with open(PLUGIN_MANIFEST, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return str(data.get("version", "unknown"))
    except Exception:
        return "unknown"


def read_mode_and_persona() -> tuple[str | None, str | None]:
    try:
        with open(PROFILE_PATH, "r", encoding="utf-8") as fh:
            profile = json.load(fh)
    except Exception:
        return None, None
    shared = profile.get("shared", {}) if isinstance(profile, dict) else {}
    prefs = shared.get("preferences", {}) if isinstance(shared, dict) else {}
    mode = prefs.get("mode") if isinstance(prefs, dict) else None
    persona = prefs.get("persona") if isinstance(prefs, dict) else None
    return mode, persona


def now_iso_with_offset() -> str:
    # Local time with timezone offset (e.g., 2026-05-10T15:42:00-05:00).
    return _dt.datetime.now(_dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def today_local() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d")


def append_via_atomic(entry: dict, target: Path) -> int:
    payload = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
    try:
        proc = subprocess.run(
            [sys.executable, str(ATOMIC_APPEND), str(target)],
            input=payload.encode("utf-8"),
            capture_output=True,
            check=False,
        )
    except OSError as err:
        sys.stderr.write(f"session-logger.start: atomic-append invocation failed: {err}\n")
        return 1
    if proc.returncode != 0:
        sys.stderr.write(
            f"session-logger.start: atomic-append exit {proc.returncode}: "
            f"{proc.stderr.decode('utf-8', errors='replace').strip()}\n"
        )
    return proc.returncode


def main() -> int:
    if len(sys.argv) < 3:
        sys.stderr.write("usage: start.py <command> <project_dir>\n")
        return 1

    command = sys.argv[1]
    project_dir = sys.argv[2]

    session_uuid = str(uuid.uuid4())
    plugin_version = read_plugin_version()
    mode, persona = read_mode_and_persona()

    entry = {
        "schema_version": 1,
        "timestamp": now_iso_with_offset(),
        "plugin": PLUGIN_NAME,
        "plugin_version": plugin_version,
        "command": command,
        "project_dir": project_dir,
        "mode": mode,
        "persona": persona,
        "sessionUUID": session_uuid,
        "outcome": "in_progress",
    }

    target = DATA_DIR / f"{today_local()}.jsonl"
    # No-op-safe: even if append fails, return the UUID so the caller can
    # still pair end() against it.
    append_via_atomic(entry, target)

    sys.stdout.write(session_uuid + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
