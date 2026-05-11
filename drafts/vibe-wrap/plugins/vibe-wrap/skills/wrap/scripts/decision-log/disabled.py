#!/usr/bin/env python3
"""
disabled.py — no-op decision-log backend.

Read returns []. Append is a no-op (returns success with ref=None).
is_reachable returns True because there's nothing to fail.

The wrap flow detects backend == "disabled" and skips the decision-log
read section ("decision logging is disabled"), the decision-log append
gate (no prompt at all), and the dashboard bridge gate.
"""

from __future__ import annotations

from typing import Any


def is_reachable() -> bool:
    """Always reachable — nothing to fail."""
    return True


def read(window: dict[str, Any]) -> list[dict[str, Any]]:
    """No-op read — returns empty list."""
    return []


def append(decision: dict[str, Any]) -> dict[str, Any]:
    """No-op append — returns success with no reference."""
    return {
        "ok": True,
        "backend": "disabled",
        "ref": None,
        "error": None,
    }


if __name__ == "__main__":
    import json

    print(json.dumps({"is_reachable": is_reachable(), "read": read({}), "append": append({})}, indent=2))
