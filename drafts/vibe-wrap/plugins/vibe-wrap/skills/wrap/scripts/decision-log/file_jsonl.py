#!/usr/bin/env python3
"""
file_jsonl.py — JSONL decision-log backend.

Each decision = one JSON object per line, exactly the canonical decision
shape with no extra wrapping. Append uses the shared atomic-append-jsonl.py
script (tmp-file-or-locked write per platform — see that script for the
atomicity contract). Read = parse line-by-line, filter by `timestamp`
window, tolerate malformed lines (skip with stderr warning).

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

# Locate the shared atomic-append-jsonl.py — ../../atomic-append-jsonl.py
_THIS_DIR = Path(__file__).resolve().parent
_ATOMIC_APPEND_SCRIPT = _THIS_DIR.parent / "atomic-append-jsonl.py"


def is_reachable(file_path: str | os.PathLike[str]) -> bool:
    """
    True iff the file is readable + writable, OR if the file does not
    exist but its parent directory is writable.
    """
    p = Path(file_path)
    if p.exists():
        return os.access(p, os.R_OK | os.W_OK)
    parent = p.parent
    if not parent.exists():
        ancestor = parent
        while not ancestor.exists() and ancestor.parent != ancestor:
            ancestor = ancestor.parent
        return ancestor.exists() and os.access(ancestor, os.W_OK)
    return os.access(parent, os.W_OK)


def _parse_iso_to_naive(timestamp: str) -> _dt.datetime | None:
    try:
        dt = _dt.datetime.fromisoformat(timestamp)
    except ValueError:
        return None
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def _in_window(decision_ts: str, window: dict[str, Any]) -> bool:
    start_str = window.get("start")
    end_str = window.get("end")

    dec_dt = _parse_iso_to_naive(decision_ts) if decision_ts else None
    if dec_dt is None:
        return False

    if start_str:
        start_dt = _parse_iso_to_naive(start_str)
        if start_dt is not None and dec_dt < start_dt:
            return False
    if end_str:
        end_dt = _parse_iso_to_naive(end_str)
        if end_dt is not None and dec_dt > end_dt:
            return False
    return True


def read(window: dict[str, Any], file_path: str | os.PathLike[str]) -> list[dict[str, Any]]:
    """
    Read decisions from the JSONL file, filter by `window`.

    Returns a list of canonical-shape decision dicts. Skips malformed
    lines with a stderr warning rather than raising.
    """
    p = Path(file_path)
    if not p.exists():
        return []

    out: list[dict[str, Any]] = []
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as fh:
            for lineno, raw in enumerate(fh, start=1):
                line = raw.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as err:
                    sys.stderr.write(
                        f"file_jsonl: skipped malformed line {lineno} in {p}: {err.msg}\n"
                    )
                    continue
                if not isinstance(obj, dict):
                    sys.stderr.write(
                        f"file_jsonl: skipped non-object line {lineno} in {p}\n"
                    )
                    continue
                ts = obj.get("timestamp", "")
                if _in_window(ts, window):
                    out.append(obj)
    except OSError as err:
        sys.stderr.write(f"file_jsonl: read failed for {p}: {err}\n")
        return []
    return out


def append(decision: dict[str, Any], file_path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Append one decision via the shared atomic-append-jsonl.py script.
    Returns the AppendResult dict per references/decision-log-backends.md.
    """
    backend_name = "file-jsonl"
    p = Path(file_path)

    if not _ATOMIC_APPEND_SCRIPT.is_file():
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": f"atomic-append-jsonl.py not found at {_ATOMIC_APPEND_SCRIPT}",
        }

    payload = json.dumps(decision, ensure_ascii=False, separators=(",", ":"))

    try:
        result = subprocess.run(
            [sys.executable, str(_ATOMIC_APPEND_SCRIPT), str(p)],
            input=payload,
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": "atomic-append-jsonl.py timed out",
        }
    except OSError as err:
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": f"subprocess failed: {err}",
        }

    if result.returncode != 0:
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": (result.stderr or "").strip() or "unknown atomic-append failure",
        }

    # Compute the new line number (after-append count).
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as fh:
            line_count = sum(1 for _ in fh)
    except OSError:
        line_count = -1

    return {
        "ok": True,
        "backend": backend_name,
        "ref": f"{p}:{line_count}",
        "error": None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: file_jsonl.py <command> <file-path> [<json-arg>]", file=sys.stderr)
        sys.exit(1)
    cmd, fp = sys.argv[1], sys.argv[2]
    if cmd == "is_reachable":
        print(json.dumps({"reachable": is_reachable(fp)}))
    elif cmd == "read":
        window = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        print(json.dumps(read(window, fp), indent=2))
    elif cmd == "append":
        decision = json.loads(sys.argv[3])
        print(json.dumps(append(decision, fp), indent=2))
    else:
        print(f"unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
