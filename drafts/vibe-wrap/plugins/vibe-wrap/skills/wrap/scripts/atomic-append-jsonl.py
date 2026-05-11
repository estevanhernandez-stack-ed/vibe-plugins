#!/usr/bin/env python3
"""
atomic-append-jsonl.py

Reads one JSON object from stdin and atomically appends it as a single
JSON line to <target-path>.

Usage:
    python atomic-append-jsonl.py <target-path>

Atomicity contract:
    Two parallel invocations against the same target file MUST produce
    two complete lines, never a torn write. The contract is single-line
    atomicity — each invocation writes exactly one `<json>\\n`.

Strategy:
    1. Read all of stdin.
    2. Parse as JSON. Exit 1 with `invalid JSON: <reason>` on parse failure.
    3. Serialize back to a single line via json.dumps (which never embeds
       newlines for valid JSON values).
    4. Ensure parent directory exists (mkdir parents=True, exist_ok=True).
    5. POSIX path: open with O_APPEND | O_WRONLY | O_CREAT — kernel
       guarantees atomicity for appends <= PIPE_BUF. write the
       serialized line + '\\n' in one os.write() call, then close.
    6. Windows path: open in append-binary mode, use msvcrt.locking to
       acquire an exclusive byte-range lock, write the line, release the
       lock, then close. Retries on EAGAIN with bounded backoff.

Exit codes:
    0 — success
    1 — failure (error written to stderr)

Pure stdlib. Python 3.11+. Transliterated from Cart's Node version
(scripts/atomic-append-jsonl.js) with Windows-aware locking added.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

IS_WINDOWS = os.name == "nt"

if IS_WINDOWS:
    import msvcrt


def fail(msg: str) -> None:
    sys.stderr.write(msg + "\n")
    sys.exit(1)


def read_stdin() -> str:
    # Read raw bytes to tolerate any encoding mismatch on Windows pipes.
    data = sys.stdin.buffer.read()
    return data.decode("utf-8")


def append_posix(target: str, line_bytes: bytes) -> None:
    flags = os.O_APPEND | os.O_WRONLY | os.O_CREAT
    fd = os.open(target, flags, 0o644)
    try:
        # Single os.write() call — kernel-atomic for sizes <= PIPE_BUF.
        # JSONL entries here are well below that ceiling (PIPE_BUF is
        # >= 512 on every POSIX, typically 4096+ on Linux).
        os.write(fd, line_bytes)
    finally:
        os.close(fd)


def append_windows(target: str, line_bytes: bytes) -> None:
    # Open append-binary; msvcrt.locking gives exclusive byte-range
    # locks. We lock starting at the current end-of-file and write
    # under the lock so concurrent appenders serialize.
    max_attempts = 50
    backoff_base = 0.01

    for attempt in range(max_attempts):
        try:
            # Open in append-binary mode. On Windows, append mode positions
            # writes at the current EOF on each write call.
            with open(target, "ab") as fh:
                fileno = fh.fileno()
                # Lock a one-byte region at the current position. msvcrt
                # locking is advisory-but-mandatory between processes that
                # use it; the bounded retry handles contention.
                try:
                    msvcrt.locking(fileno, msvcrt.LK_LOCK, 1)
                except OSError:
                    # Lock failed — back off and retry the open.
                    time.sleep(backoff_base * (2**min(attempt, 6)))
                    continue
                try:
                    fh.write(line_bytes)
                    fh.flush()
                    os.fsync(fileno)
                finally:
                    try:
                        msvcrt.locking(fileno, msvcrt.LK_UNLCK, 1)
                    except OSError:
                        pass
            return
        except PermissionError:
            # Another writer holds the file — retry.
            time.sleep(backoff_base * (2**min(attempt, 6)))
            continue

    fail("could not acquire append lock after retries")


def main() -> None:
    if len(sys.argv) < 2:
        fail("usage: atomic-append-jsonl.py <target-path>")

    target = sys.argv[1]

    raw = read_stdin()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as err:
        fail(f"invalid JSON: {err.msg} at line {err.lineno} col {err.colno}")
        return  # for type-checkers; fail() exits

    line = json.dumps(parsed, ensure_ascii=False, separators=(",", ":")) + "\n"
    line_bytes = line.encode("utf-8")

    parent = Path(target).parent
    try:
        parent.mkdir(parents=True, exist_ok=True)
    except OSError as err:
        fail(f"could not create parent directory: {err}")

    try:
        if IS_WINDOWS:
            append_windows(target, line_bytes)
        else:
            append_posix(target, line_bytes)
    except OSError as err:
        fail(f"could not write append: {err}")

    sys.exit(0)


if __name__ == "__main__":
    main()
