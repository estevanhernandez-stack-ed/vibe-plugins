#!/usr/bin/env python3
"""
end.py — terminal session-log entry for vibe-wrap.

Reads a partial terminal entry as JSON via stdin, overlays audit fields
(timestamp, plugin, plugin_version, project_dir, mode, persona) onto it,
and atomic-appends the full entry to today's session file at
`~/.claude/plugins/data/vibe-wrap/sessions/<YYYY-MM-DD>.jsonl`.

The sessionUUID is supplied via CLI arg AND must match the partial
entry's sessionUUID field (defensive consistency check).

Usage:
    echo '{"sessionUUID":"<uuid>","command":"wrap","outcome":"completed",...}' \
        | python end.py <sessionUUID>

Args:
    sessionUUID — the UUID minted by start.py for this command run.

Stdin:
    A JSON object — the partial terminal entry. Required fields:
      sessionUUID, command, outcome.
    Optional fields:
      user_pushback, friction_notes, key_decisions, artifact_generated,
      complements_invoked.

Exit codes:
    0 — success
    1 — usage error or schema violation

Notes:
    - On atomic-append failure, logs to stderr and exits 0. Session
      logging is instrumentation, not critical path.
    - outcome must be one of completed | abandoned | error | partial.
      If invalid, logs to stderr and forces 'error' so the entry still
      lands.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import subprocess
import sys
from pathlib import Path

PLUGIN_NAME = "vibe-wrap"
VALID_OUTCOMES = {"completed", "abandoned", "error", "partial"}

SCRIPT_DIR = Path(__file__).resolve().parent
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
    return _dt.datetime.now(_dt.timezone.utc).astimezone().isoformat(timespec="seconds")


def today_local() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d")


def project_dir_basename() -> str:
    return Path(os.getcwd()).name


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
        sys.stderr.write(f"session-logger.end: atomic-append invocation failed: {err}\n")
        return 1
    if proc.returncode != 0:
        sys.stderr.write(
            f"session-logger.end: atomic-append exit {proc.returncode}: "
            f"{proc.stderr.decode('utf-8', errors='replace').strip()}\n"
        )
    return proc.returncode


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: end.py <sessionUUID>  (partial entry on stdin)\n")
        return 1

    cli_uuid = sys.argv[1]

    raw = sys.stdin.read()
    if not raw.strip():
        sys.stderr.write("session-logger.end: empty stdin (expected partial entry JSON)\n")
        return 1

    try:
        partial = json.loads(raw)
    except json.JSONDecodeError as err:
        sys.stderr.write(f"session-logger.end: invalid JSON on stdin: {err}\n")
        return 1

    if not isinstance(partial, dict):
        sys.stderr.write("session-logger.end: partial entry must be a JSON object\n")
        return 1

    # Consistency: CLI sessionUUID and partial entry sessionUUID must match.
    partial_uuid = partial.get("sessionUUID")
    if partial_uuid is None:
        partial["sessionUUID"] = cli_uuid
    elif partial_uuid != cli_uuid:
        sys.stderr.write(
            f"session-logger.end: sessionUUID mismatch (CLI={cli_uuid}, "
            f"partial={partial_uuid}); using CLI value\n"
        )
        partial["sessionUUID"] = cli_uuid

    command = partial.get("command")
    if not command:
        sys.stderr.write("session-logger.end: partial entry missing 'command'\n")
        return 1

    outcome = partial.get("outcome")
    if outcome not in VALID_OUTCOMES:
        sys.stderr.write(
            f"session-logger.end: invalid outcome '{outcome}' "
            f"(expected one of {sorted(VALID_OUTCOMES)}); forcing 'error'\n"
        )
        partial["outcome"] = "error"

    plugin_version = read_plugin_version()
    mode, persona = read_mode_and_persona()

    # Audit fields overlay onto the partial. Caller's semantic fields
    # take precedence wherever they overlap with audit fields, except for
    # the load-bearing audit identity (plugin / plugin_version / timestamp /
    # project_dir / mode / persona — those are owned by this script).
    entry = dict(partial)
    entry["schema_version"] = 1
    entry["timestamp"] = now_iso_with_offset()
    entry["plugin"] = PLUGIN_NAME
    entry["plugin_version"] = plugin_version
    entry["project_dir"] = entry.get("project_dir") or project_dir_basename()
    entry["mode"] = mode
    entry["persona"] = persona

    target = DATA_DIR / f"{today_local()}.jsonl"
    append_via_atomic(entry, target)
    return 0


if __name__ == "__main__":
    sys.exit(main())
