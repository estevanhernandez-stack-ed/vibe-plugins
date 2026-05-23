#!/usr/bin/env python3
"""
session-end-nudge.py — vibe-wrap SessionEnd hook.

Fires once at session close (Claude Code `SessionEnd` event). Checks three
cheap signals; if any is high, emits a single one-line nudge to stdout:

    session looks done — /vibe-wrap to summarize?

Never invokes /vibe-wrap. Never blocks session close. Silent when no signal.

Payload (spec Open Issue #2, resolved): the SessionEnd hook receives JSON on
stdin with fields:
    session_id        — UUID of the closing session.
    transcript_path   — path to the session transcript JSONL.
    cwd               — current working directory.
    hook_event_name   — "SessionEnd".
    why               — one of clear / resume / logout / prompt_input_exit /
                        bypass_permissions_disabled / other.

The hook is non-blocking — it cannot halt termination. We read `cwd` to
scope the git checks and `session_id` to scope the breadcrumb check.

Signals checked (any >= 1 → nudge):
    1. breadcrumb count for the session (lines in the session's breadcrumb
       JSONL file).
    2. uncommitted file count (`git status --porcelain`).
    3. commits ahead of the tracked remote (`git rev-list @{u}..HEAD`,
       suppress error when no upstream).

Design contract:
    - Exit 0 on every path. A hook that errors must never disrupt the close.
    - At most one line to stdout.
    - No mutations. Read-only against git + the breadcrumb file.

Pure stdlib + git CLI. Python 3.11+.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252, which mangles the
# em-dash in the nudge line. The hook must emit clean UTF-8 on every platform.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

NUDGE_LINE = "session looks done — /vibe-wrap to summarize?"
BREADCRUMBS_DIR = (
    Path.home() / ".claude" / "plugins" / "data" / "vibe-wrap" / "breadcrumbs"
)


def read_payload() -> dict:
    """Read the SessionEnd JSON payload from stdin. {} on any failure."""
    try:
        raw = sys.stdin.read()
    except Exception:
        return {}
    if not raw or not raw.strip():
        return {}
    try:
        obj = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {}
    return obj if isinstance(obj, dict) else {}


def breadcrumb_count(session_id: str) -> int:
    """Count breadcrumb lines for the session. 0 on any failure."""
    if not session_id:
        return 0
    path = BREADCRUMBS_DIR / f"{session_id}.jsonl"
    if not path.is_file():
        return 0
    try:
        with path.open("r", encoding="utf-8") as fh:
            return sum(1 for line in fh if line.strip())
    except OSError:
        return 0


def run_git(args: list[str], cwd: str | None) -> tuple[int, str]:
    """Run a git command. (returncode, stdout). (127, '') if git is absent."""
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return 127, ""
    return proc.returncode, proc.stdout


def uncommitted_count(cwd: str | None) -> int:
    """Count uncommitted/untracked files. 0 on any failure or non-repo."""
    rc, out = run_git(["status", "--porcelain"], cwd)
    if rc != 0:
        return 0
    return sum(1 for line in out.splitlines() if line.strip())


def ahead_count(cwd: str | None) -> int:
    """Count commits ahead of the tracked remote. 0 if no upstream."""
    # @{u}..HEAD = commits HEAD has that upstream doesn't (ahead-of-remote).
    rc, out = run_git(["rev-list", "--count", "@{u}..HEAD"], cwd)
    if rc != 0:
        # No upstream tracked (or not a repo) — expected, not an error.
        return 0
    try:
        return int(out.strip() or "0")
    except ValueError:
        return 0


def main() -> int:
    payload = read_payload()
    session_id = ""
    cwd = None
    sid = payload.get("session_id")
    if isinstance(sid, str):
        session_id = sid.strip()
    cwd_val = payload.get("cwd")
    if isinstance(cwd_val, str) and cwd_val.strip():
        cwd = cwd_val.strip()

    # Three cheap signals. Any >= 1 → nudge.
    signal = (
        breadcrumb_count(session_id) >= 1
        or uncommitted_count(cwd) >= 1
        or ahead_count(cwd) >= 1
    )

    if signal:
        sys.stdout.write(NUDGE_LINE + "\n")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Last-resort guard — a hook must never disrupt session close.
        sys.exit(0)
