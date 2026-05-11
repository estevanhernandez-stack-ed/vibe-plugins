#!/usr/bin/env python3
"""
log.py — friction entry append for vibe-wrap.

Reads a partial friction entry as JSON via stdin, validates required
fields, applies the quoted-prior defensive default for repeat_question
and rephrase_requested, overlays audit fields, and atomic-appends the
full entry to `~/.claude/plugins/data/vibe-wrap/friction.jsonl`.

Usage:
    echo '{"sessionUUID":"<uuid>","friction_type":"complement_rejected", \
           "confidence":"high","symptom":"declined the bridge gate"}' \
        | python log.py

Stdin:
    A JSON object — the partial friction entry. Required fields:
      sessionUUID, friction_type, confidence, symptom.
    Optional fields:
      complement_involved, key_decisions_at_log_time, command, project_dir.
    Audit fields (filled in by this script):
      schema_version, timestamp, plugin, plugin_version.

Exit codes:
    0 — success
    1 — defensive-default rejection (quoted-prior gate failed) OR
        validation failure (missing required fields, invalid enum, etc.)
        — both with a stderr explanation.

Notes:
    - The catalog-wide invariant is "when in doubt, don't log." This
      script enforces that by preferring silent drop over poisoning
      `/evolve-wrap`.
    - On atomic-append failure, surfaces the stderr to the caller via
      exit code; does NOT block the calling SKILL (the calling SKILL
      handles that).
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import subprocess
import sys
from pathlib import Path

PLUGIN_NAME = "vibe-wrap"

VALID_FRICTION_TYPES = {
    "complement_rejected",
    "default_overridden",
    "sequence_revised",
    "artifact_rewritten",
    "repeat_question",
    "rephrase_requested",
    "command_abandoned",
}

VALID_CONFIDENCES = {"high", "medium", "low"}

QUOTED_PRIOR_TYPES = {"repeat_question", "rephrase_requested"}

SCRIPT_DIR = Path(__file__).resolve().parent
# friction-logger/scripts -> friction-logger -> skills -> plugins/vibe-wrap
PLUGIN_ROOT = SCRIPT_DIR.parent.parent.parent
PLUGIN_MANIFEST = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
ATOMIC_APPEND = PLUGIN_ROOT / "skills" / "wrap" / "scripts" / "atomic-append-jsonl.py"

TARGET_FILE = Path.home() / ".claude" / "plugins" / "data" / PLUGIN_NAME / "friction.jsonl"


def read_plugin_version() -> str:
    try:
        with open(PLUGIN_MANIFEST, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return str(data.get("version", "unknown"))
    except Exception:
        return "unknown"


def now_iso_with_offset() -> str:
    return _dt.datetime.now(_dt.timezone.utc).astimezone().isoformat(timespec="seconds")


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
        sys.stderr.write(f"friction-logger: atomic-append invocation failed: {err}\n")
        return 1
    if proc.returncode != 0:
        sys.stderr.write(
            f"friction-logger: atomic-append exit {proc.returncode}: "
            f"{proc.stderr.decode('utf-8', errors='replace').strip()}\n"
        )
    return proc.returncode


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        sys.stderr.write("friction-logger: empty stdin (expected partial entry JSON)\n")
        return 1

    try:
        partial = json.loads(raw)
    except json.JSONDecodeError as err:
        sys.stderr.write(f"friction-logger: invalid JSON on stdin: {err}\n")
        return 1

    if not isinstance(partial, dict):
        sys.stderr.write("friction-logger: partial entry must be a JSON object\n")
        return 1

    # Required-field validation.
    for field in ("sessionUUID", "friction_type", "confidence", "symptom"):
        value = partial.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            sys.stderr.write(
                f"friction-logger: missing required field '{field}' — silent drop\n"
            )
            return 1

    friction_type = partial["friction_type"]
    if friction_type not in VALID_FRICTION_TYPES:
        sys.stderr.write(
            f"friction-logger: invalid friction_type '{friction_type}' "
            f"(expected one of {sorted(VALID_FRICTION_TYPES)}) — silent drop\n"
        )
        return 1

    confidence = partial["confidence"]
    if confidence not in VALID_CONFIDENCES:
        sys.stderr.write(
            f"friction-logger: invalid confidence '{confidence}' "
            f"(expected one of {sorted(VALID_CONFIDENCES)}) — silent drop\n"
        )
        return 1

    # Defensive default: repeat_question and rephrase_requested require
    # symptom to quote a prior turn. Heuristic: contains a `"` and is
    # longer than 20 characters.
    if friction_type in QUOTED_PRIOR_TYPES:
        symptom = partial["symptom"]
        if '"' not in symptom or len(symptom) <= 20:
            sys.stderr.write(
                "friction-logger: defensive default rejected entry — "
                "symptom must quote prior turn\n"
            )
            return 1

    # Build the full entry. Audit fields overlay onto the caller's partial.
    entry = dict(partial)
    entry["schema_version"] = 1
    entry["timestamp"] = now_iso_with_offset()
    entry["plugin"] = PLUGIN_NAME
    entry["plugin_version"] = read_plugin_version()
    entry["command"] = entry.get("command") or "unknown"
    entry["project_dir"] = entry.get("project_dir") or project_dir_basename()

    rc = append_via_atomic(entry, TARGET_FILE)
    return 0 if rc == 0 else rc


if __name__ == "__main__":
    sys.exit(main())
