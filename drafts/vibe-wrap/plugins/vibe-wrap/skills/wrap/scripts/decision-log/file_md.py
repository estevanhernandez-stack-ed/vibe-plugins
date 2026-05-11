#!/usr/bin/env python3
"""
file_md.py — Markdown decision-log backend.

Per spec § Decision 6 + references/decision-log-backends.md.

WRITE STRATEGY (locked v0.1.0):

    1. If today's `## YYYY-MM-DD` heading exists anywhere in the file →
       append a new `### HH:mm — <title>` section under it (right after
       the last decision under that day, before the next `## ` heading
       or end-of-file).
    2. Else → append a fresh `## YYYY-MM-DD` heading at end-of-file
       followed by the new `### HH:mm — <title>` section.

    Atomic: write to temp file in the same directory, then os.replace
    (atomic on POSIX and Windows when same filesystem).

READ STRATEGY (tolerant):

    Parse any `### `-prefixed heading regardless of which `## ` parent
    it sits under. Best-effort:
      - If no parseable `### `-prefixed headings exist, treat the whole
        file as a single decision body with timestamp = file mtime, title
        = filename. Surface as a parsed entry rather than failing.
      - Heading parser tries `### YYYY-MM-DD HH:mm — <title>` first
        (fully-qualified shape), then falls back to `### HH:mm — <title>`
        with the date inferred from the most recent `## YYYY-MM-DD`
        heading above it.
      - If a `### ` heading has no parseable date/time prefix, surface
        the heading text as the title with timestamp from the closest
        `## ` ancestor (date only, time defaults to 00:00) — never raise.

ENCODING: UTF-8 read + write. BOM tolerated on read (stripped). Never
written.

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import datetime as _dt
import os
import re
import tempfile
from pathlib import Path
from typing import Any

# Match `## YYYY-MM-DD` (anywhere on the line, leading whitespace tolerated).
_DAY_HEADING_RE = re.compile(r"^\s*##\s+(\d{4}-\d{2}-\d{2})\b\s*$")

# Match a level-3 heading. Try full `### YYYY-MM-DD HH:mm — title` first.
_DECISION_HEADING_FULL_RE = re.compile(
    r"^\s*###\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+[—-]\s+(.+?)\s*$"
)
# Then `### YYYY-MM-DD — title` (date but no time).
_DECISION_HEADING_DATE_RE = re.compile(
    r"^\s*###\s+(\d{4}-\d{2}-\d{2})\s+[—-]\s+(.+?)\s*$"
)
# Then `### HH:mm — title` (date inferred from parent ## heading).
_DECISION_HEADING_TIME_RE = re.compile(
    r"^\s*###\s+(\d{2}:\d{2})\s+[—-]\s+(.+?)\s*$"
)
# Bare `### Anything` fallback.
_DECISION_HEADING_BARE_RE = re.compile(r"^\s*###\s+(.+?)\s*$")

# `## ` headings that are NOT date headings — used as section boundaries.
_ANY_LEVEL2_RE = re.compile(r"^\s*##\s+")


def _strip_bom(text: str) -> str:
    if text.startswith("﻿"):
        return text[1:]
    return text


def is_reachable(file_path: str | os.PathLike[str]) -> bool:
    """
    True iff the file is readable + writable, OR if the file does not
    exist but its parent directory is writable (first-append case).
    """
    p = Path(file_path)
    if p.exists():
        return os.access(p, os.R_OK | os.W_OK)
    # File doesn't exist — parent must be writable so we can create it.
    parent = p.parent
    if not parent.exists():
        # Walk up to find an existing ancestor; if any ancestor is
        # writable we can mkdir down to it.
        ancestor = parent
        while not ancestor.exists() and ancestor.parent != ancestor:
            ancestor = ancestor.parent
        return ancestor.exists() and os.access(ancestor, os.W_OK)
    return os.access(parent, os.W_OK)


def _parse_iso_to_naive(timestamp: str) -> _dt.datetime | None:
    """Parse an ISO 8601 timestamp; return naive datetime for comparison."""
    try:
        dt = _dt.datetime.fromisoformat(timestamp)
    except ValueError:
        return None
    # Strip tzinfo for window comparison — we compare on calendar time.
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def _in_window(decision_ts: str, window: dict[str, Any]) -> bool:
    """Return True if decision_ts is within [start, end] of the window."""
    start_str = window.get("start")
    end_str = window.get("end")

    dec_dt = _parse_iso_to_naive(decision_ts) if decision_ts else None
    if dec_dt is None:
        # Unparseable timestamps are out-of-window.
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


def _format_iso(date_str: str, time_str: str | None) -> str:
    """Build an ISO 8601 timestamp from date + time (no TZ — local-naive)."""
    if time_str is None:
        return f"{date_str}T00:00:00"
    return f"{date_str}T{time_str}:00"


def _read_decisions(file_path: Path) -> list[dict[str, Any]]:
    """
    Parse the file into a list of canonical-shape decision dicts.
    Tolerant — never raises on malformed structure.
    """
    if not file_path.exists():
        return []

    try:
        raw = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    raw = _strip_bom(raw)
    lines = raw.splitlines()

    decisions: list[dict[str, Any]] = []
    current_date: str | None = None
    current_decision: dict[str, Any] | None = None
    body_lines: list[str] = []
    found_any_heading = False

    def flush_current() -> None:
        nonlocal current_decision, body_lines
        if current_decision is not None:
            body_text = "\n".join(body_lines).strip()
            current_decision["body"] = body_text
            decisions.append(current_decision)
        current_decision = None
        body_lines = []

    for line in lines:
        # Day heading?
        m_day = _DAY_HEADING_RE.match(line)
        if m_day:
            flush_current()
            current_date = m_day.group(1)
            found_any_heading = True
            continue

        # Decision heading? Try the four matchers in order of specificity.
        m_full = _DECISION_HEADING_FULL_RE.match(line)
        m_date = _DECISION_HEADING_DATE_RE.match(line) if not m_full else None
        m_time = _DECISION_HEADING_TIME_RE.match(line) if not (m_full or m_date) else None
        m_bare = _DECISION_HEADING_BARE_RE.match(line) if not (m_full or m_date or m_time) else None

        if m_full or m_date or m_time or m_bare:
            flush_current()
            found_any_heading = True
            if m_full:
                date_str = m_full.group(1)
                time_str = m_full.group(2)
                title = m_full.group(3).strip()
            elif m_date:
                date_str = m_date.group(1)
                time_str = None
                title = m_date.group(2).strip()
            elif m_time:
                date_str = current_date or "1970-01-01"
                time_str = m_time.group(1)
                title = m_time.group(2).strip()
            else:
                # Bare heading — no date/time prefix in the heading itself.
                date_str = current_date or "1970-01-01"
                time_str = None
                title = m_bare.group(1).strip() if m_bare else ""

            current_decision = {
                "timestamp": _format_iso(date_str, time_str),
                "title": title,
                "body": "",
                "project_tag": None,
                "link": None,
            }
            continue

        # Other `## ` heading (not a date) — boundary; flush current.
        if _ANY_LEVEL2_RE.match(line):
            flush_current()
            current_date = None
            continue

        # Body content — accumulate if inside a decision.
        if current_decision is not None:
            body_lines.append(line)

    flush_current()

    # Flat-fallback: no parseable headings at all → treat whole file as one decision.
    if not found_any_heading and raw.strip():
        try:
            mtime = _dt.datetime.fromtimestamp(file_path.stat().st_mtime)
        except OSError:
            mtime = _dt.datetime.now()
        decisions.append(
            {
                "timestamp": mtime.replace(microsecond=0).isoformat(),
                "title": file_path.name,
                "body": raw.strip(),
                "project_tag": None,
                "link": None,
            }
        )

    # Try to recover footer-encoded link / project_tag from body if present.
    # File-md backend writes "— [Wrap doc](<link>) · `<tag>`" as the last line.
    for d in decisions:
        body = d.get("body", "")
        if not body:
            continue
        last_line = body.splitlines()[-1] if body else ""
        link, tag = _parse_footer(last_line)
        if link or tag:
            if link:
                d["link"] = link
            if tag:
                d["project_tag"] = tag
            # Strip the footer line from the body for cleanliness.
            d["body"] = "\n".join(body.splitlines()[:-1]).rstrip()

    return decisions


_FOOTER_RE = re.compile(
    r"^\s*[—-]\s*(?:\[[^\]]+\]\(([^)]+)\))?\s*(?:·\s*`([^`]+)`)?\s*$"
)


def _parse_footer(line: str) -> tuple[str | None, str | None]:
    """Best-effort parse of the file-md footer line. Returns (link, tag)."""
    m = _FOOTER_RE.match(line)
    if not m:
        return (None, None)
    return (m.group(1), m.group(2))


def read(window: dict[str, Any], file_path: str | os.PathLike[str]) -> list[dict[str, Any]]:
    """
    Read decisions from the markdown file, filtered by `window`.

    Args:
        window: {"start": "<iso>", "end": "<iso>"} — end optional.
        file_path: path to the markdown file.

    Returns:
        list of canonical-shape decision dicts.
    """
    p = Path(file_path)
    all_decisions = _read_decisions(p)
    return [d for d in all_decisions if _in_window(d.get("timestamp", ""), window)]


def _render_decision(decision: dict[str, Any]) -> tuple[str, str]:
    """
    Render a decision into (date_heading, decision_section).

    decision_section is the `### HH:mm — title\\n\\nbody\\n[footer]` block.
    """
    ts = decision.get("timestamp", "")
    dt = _parse_iso_to_naive(ts) or _dt.datetime.now()
    date_str = dt.strftime("%Y-%m-%d")
    time_str = dt.strftime("%H:%M")

    title = (decision.get("title") or "").strip()
    body = (decision.get("body") or "").rstrip()
    link = decision.get("link")
    project_tag = decision.get("project_tag")

    section_lines = [f"### {time_str} — {title}", ""]
    if body:
        section_lines.append(body)
        section_lines.append("")
    if link or project_tag:
        parts = ["—"]
        if link:
            parts.append(f"[Wrap doc]({link})")
        if project_tag:
            sep = "·" if link else ""
            if sep:
                parts.append(sep)
            parts.append(f"`{project_tag}`")
        section_lines.append(" ".join(parts))
        section_lines.append("")

    return date_str, "\n".join(section_lines)


def _atomic_write(target: Path, content: str) -> None:
    """
    Atomic file replace: write to temp in same dir, then os.replace.
    UTF-8, no BOM.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix=f".{target.name}.", suffix=".tmp", dir=str(target.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, target)
    except Exception:
        # Clean up temp file on failure.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def append(decision: dict[str, Any], file_path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Append one decision to the markdown file per the locked write strategy.

    Returns the AppendResult dict per references/decision-log-backends.md.
    """
    p = Path(file_path)
    backend_name = "file-md"

    try:
        date_str, section = _render_decision(decision)
    except Exception as err:
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": f"render failed: {err}",
        }

    try:
        existing = ""
        if p.exists():
            existing = p.read_text(encoding="utf-8", errors="replace")
            existing = _strip_bom(existing)

        day_heading = f"## {date_str}"

        if day_heading in existing:
            # Find the day heading and append the section just before the
            # next `## ` heading or end-of-file.
            new_content = _insert_under_day_heading(existing, day_heading, section)
        else:
            # Append a fresh day heading + section at end of file.
            sep = "" if (not existing or existing.endswith("\n\n")) else (
                "\n" if existing.endswith("\n") else "\n\n"
            )
            new_content = f"{existing}{sep}{day_heading}\n\n{section}"

        # Ensure file ends with exactly one newline.
        if not new_content.endswith("\n"):
            new_content += "\n"

        _atomic_write(p, new_content)

        # Compute approximate line number of the appended title for ref.
        try:
            line_idx = new_content.count("\n", 0, new_content.find(f"### {section.splitlines()[0].split(' ', 1)[1]}")) + 1
        except Exception:
            line_idx = new_content.count("\n")

        return {
            "ok": True,
            "backend": backend_name,
            "ref": f"{p}:{line_idx}",
            "error": None,
        }
    except OSError as err:
        return {
            "ok": False,
            "backend": backend_name,
            "ref": None,
            "error": f"write failed: {err}",
        }


def _insert_under_day_heading(existing: str, day_heading: str, section: str) -> str:
    """
    Insert `section` under `day_heading` — right before the next `## `
    heading, or at end-of-file if no next heading exists.
    """
    lines = existing.splitlines(keepends=True)
    # Find the day heading line.
    day_idx = None
    for i, line in enumerate(lines):
        if line.rstrip("\r\n") == day_heading or line.startswith(day_heading + " ") or line.startswith(day_heading + "\t"):
            # Match exact; tolerate trailing whitespace.
            if line.rstrip() == day_heading:
                day_idx = i
                break
    if day_idx is None:
        # Shouldn't happen — caller checked for presence — but defend.
        return existing + ("\n" if not existing.endswith("\n") else "") + day_heading + "\n\n" + section

    # Find the next `## ` heading after day_idx.
    next_h2_idx = len(lines)
    for j in range(day_idx + 1, len(lines)):
        if _ANY_LEVEL2_RE.match(lines[j]):
            next_h2_idx = j
            break

    # Prepare the section text — ensure it ends with a blank line.
    section_text = section if section.endswith("\n") else section + "\n"
    if not section_text.endswith("\n\n"):
        section_text += "\n"

    # Find the right insertion point — just before next_h2_idx, but
    # collapse trailing blank lines so we don't accumulate gaps.
    insert_at = next_h2_idx
    # Walk back over blank lines so the new section sits flush with prior.
    while insert_at > day_idx + 1 and lines[insert_at - 1].strip() == "":
        insert_at -= 1
    # Add a separating blank line before the new section.
    prefix = ""
    if insert_at > 0 and lines[insert_at - 1].rstrip() != "":
        prefix = "\n"

    new_lines = lines[:insert_at] + [prefix + section_text] + lines[insert_at:]
    return "".join(new_lines)


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 3:
        print("usage: file_md.py <command> <file-path> [<json-arg>]", file=sys.stderr)
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
