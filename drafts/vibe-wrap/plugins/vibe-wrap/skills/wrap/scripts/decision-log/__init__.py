"""
decision-log — pluggable decision-log backend dispatcher.

Resolves the active backend per `config.resolve()` and dispatches
`read(window)` / `append(decision)` / `is_reachable()` to one of:
  - file_md   (`file-md`)
  - file_jsonl (`file-jsonl`)
  - mcp        (`626labs-mcp`)
  - disabled   (`disabled`)

When config is missing AND MCP isn't auto-detected, dispatches to
first_run_prompt.run() to set up a config, then re-dispatches.

Decision shape (canonical):

    {
        "timestamp": "2026-05-11T15:42:00-05:00",
        "title": "Locked breadcrumb storage at session-uuid.jsonl",
        "body": "...",
        "project_tag": "vibe-wrap",   # optional
        "link": "docs/session-wraps/2026-05-11-1542.md",   # optional
    }

Window shape: {"start": "<iso-ts>", "end": "<iso-ts>"}.
End is optional; treat as "now" if missing.

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from . import config as _config
from . import disabled as _disabled
from . import file_jsonl as _file_jsonl
from . import file_md as _file_md
from . import first_run_prompt as _first_run
from . import mcp as _mcp


def _resolve_or_prompt(cwd: Path | None = None) -> dict[str, Any]:
    """
    Resolve config; if first-run is needed AND we have a TTY, prompt.
    If no TTY (e.g. CI), return a no-op config that routes to disabled
    so callers don't crash. The wrap SKILL is responsible for invoking
    the prompt explicitly when interactive — this guard prevents
    accidental hangs in non-interactive contexts.
    """
    cfg = _config.resolve(cwd)
    if cfg.get("backend") is not None:
        return cfg

    if cfg.get("needs_first_run_prompt"):
        if sys.stdin.isatty() and sys.stdout.isatty():
            return _first_run.run(cwd=cwd)
        # Non-interactive — silent fallback to disabled. The dispatcher
        # callers can detect this via the "fallback_disabled" sentinel.
        sys.stderr.write(
            "decision-log: no config + non-interactive context — "
            "falling back to disabled (run /vibe-wrap interactively to configure)\n"
        )
        return {
            "backend": "disabled",
            "auto_detect_mcp": True,
            "source": "fallback-no-tty",
        }

    return cfg


def is_reachable(cwd: Path | None = None) -> bool:
    """Quick liveness check on the active backend."""
    cfg = _config.resolve(cwd)
    backend = cfg.get("backend")
    if backend is None:
        # No config yet — disabled is always reachable; the others would
        # need a path resolved. Conservative: return False.
        return False
    if backend == "626labs-mcp":
        try:
            return _mcp.is_reachable()
        except Exception:
            return False
    if backend == "file-md":
        return _file_md.is_reachable(cfg.get("file_path", ""))
    if backend == "file-jsonl":
        return _file_jsonl.is_reachable(cfg.get("file_path", ""))
    if backend == "disabled":
        return _disabled.is_reachable()
    return False


def read(window: dict[str, Any], cwd: Path | None = None) -> list[dict[str, Any]]:
    """
    Read decisions in `window` from the active backend.

    Returns [] on backend unreachability or empty result. Never raises.
    """
    cfg = _resolve_or_prompt(cwd)
    backend = cfg.get("backend")
    try:
        if backend == "626labs-mcp":
            return _mcp.read(window)
        if backend == "file-md":
            return _file_md.read(window, cfg["file_path"])
        if backend == "file-jsonl":
            return _file_jsonl.read(window, cfg["file_path"])
        if backend == "disabled":
            return _disabled.read(window)
    except Exception as err:
        sys.stderr.write(f"decision-log read failed ({backend}): {err}\n")
        return []
    return []


def append(decision: dict[str, Any], cwd: Path | None = None) -> dict[str, Any]:
    """
    Append `decision` via the active backend.

    Returns AppendResult dict per references/decision-log-backends.md.
    Never raises — failures surface as {"ok": False, ...}.
    """
    cfg = _resolve_or_prompt(cwd)
    backend = cfg.get("backend")
    try:
        if backend == "626labs-mcp":
            return _mcp.append(decision)
        if backend == "file-md":
            return _file_md.append(decision, cfg["file_path"])
        if backend == "file-jsonl":
            return _file_jsonl.append(decision, cfg["file_path"])
        if backend == "disabled":
            return _disabled.append(decision)
    except Exception as err:
        return {
            "ok": False,
            "backend": backend or "unknown",
            "ref": None,
            "error": str(err),
        }
    return {
        "ok": False,
        "backend": backend or "unknown",
        "ref": None,
        "error": f"unknown backend: {backend}",
    }


def active_backend(cwd: Path | None = None) -> str | None:
    """Return the active backend name, or None if first-run pending."""
    cfg = _config.resolve(cwd)
    return cfg.get("backend")


__all__ = [
    "read",
    "append",
    "is_reachable",
    "active_backend",
]
