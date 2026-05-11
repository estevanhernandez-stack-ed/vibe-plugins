#!/usr/bin/env python3
"""
config.py — decision-log config resolver.

Resolves the active decision-log backend per the precedence locked in
references/decision-log-backends.md:

    1. Per-project config:  <repo>/.vibe-wrap/config.json
    2. Global config:       ~/.claude/plugins/data/vibe-wrap/config.json
    3. Auto-detect:         if mcp.is_reachable() → 626labs-mcp
    4. None of the above:   {"backend": null, "needs_first_run_prompt": True}

Per-project resolution walks up from cwd looking for `.vibe-wrap/config.json`
until it hits a filesystem root. The first hit wins.

Schema (per spec Decision 6):

    {
      "schema_version": 1,
      "decision_log": {
        "backend": "file-md" | "file-jsonl" | "626labs-mcp" | "disabled",
        "file_path": "/absolute/or/expanded/path",
        "auto_detect_mcp": true
      }
    }

Smart-default file path resolver:

    - If cwd or any ancestor has a `docs/` directory:
        → <that-dir>/docs/decisions.md  (or .jsonl)
    - Else: ~/.claude/decisions.md  (or .jsonl)

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

GLOBAL_CONFIG_PATH = Path.home() / ".claude" / "plugins" / "data" / "vibe-wrap" / "config.json"
PER_PROJECT_REL = Path(".vibe-wrap") / "config.json"


def _walk_up_for(start: Path, relative: Path) -> Path | None:
    """Walk up from `start` looking for `relative`. Return absolute path or None."""
    current = start.resolve()
    while True:
        candidate = current / relative
        if candidate.is_file():
            return candidate
        if current.parent == current:
            return None
        current = current.parent


def _walk_up_for_dir(start: Path, dirname: str, stop_at_repo_root: bool = True) -> Path | None:
    """
    Walk up looking for a directory named `dirname` (e.g. 'docs').

    If `stop_at_repo_root` is True (default), stops walking at the directory
    containing `.git` — beyond the repo root, anything found would be
    outside the repo and unlikely to be what the user means.
    """
    current = start.resolve()
    while True:
        candidate = current / dirname
        if candidate.is_dir():
            return candidate
        # Stop at repo root if requested.
        if stop_at_repo_root and (current / ".git").exists():
            return None
        if current.parent == current:
            return None
        current = current.parent


def find_per_project_config(cwd: Path | None = None) -> Path | None:
    """Return absolute path to per-project config file, or None."""
    start = cwd if cwd is not None else Path.cwd()
    return _walk_up_for(start, PER_PROJECT_REL)


def smart_default_path(extension: str = "md", cwd: Path | None = None) -> Path:
    """
    Smart-default resolver for file-md / file-jsonl backends.

    Args:
        extension: "md" or "jsonl".
        cwd: defaults to Path.cwd().

    Returns:
        Absolute Path. Either <repo>/docs/decisions.<ext> when a `docs/`
        directory is found within the current repo, or
        ~/.claude/decisions.<ext> as the user-scoped fallback.

    Walks up from `cwd` looking for a `docs/` directory but stops at the
    repo root (the directory containing `.git`) — outside the repo,
    anything found wouldn't be what the user means.
    """
    start = cwd if cwd is not None else Path.cwd()
    docs_dir = _walk_up_for_dir(start, "docs", stop_at_repo_root=True)
    if docs_dir is not None:
        return docs_dir / f"decisions.{extension}"
    return Path.home() / ".claude" / f"decisions.{extension}"


def _load_json_safely(path: Path) -> dict[str, Any] | None:
    """Load JSON; return None on parse failure or missing file."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None


def _validate_config(raw: dict[str, Any]) -> dict[str, Any] | None:
    """
    Validate a loaded config dict. Returns the `decision_log` section
    flattened with backend defaults applied, or None if invalid.
    """
    if not isinstance(raw, dict):
        return None
    dl = raw.get("decision_log")
    if not isinstance(dl, dict):
        return None
    backend = dl.get("backend")
    if backend not in ("file-md", "file-jsonl", "626labs-mcp", "disabled"):
        return None
    out: dict[str, Any] = {"backend": backend}
    if backend in ("file-md", "file-jsonl"):
        fp = dl.get("file_path")
        if not isinstance(fp, str) or not fp.strip():
            return None
        # Expand ~ in stored paths.
        out["file_path"] = str(Path(os.path.expanduser(fp)))
    if "auto_detect_mcp" in dl:
        out["auto_detect_mcp"] = bool(dl["auto_detect_mcp"])
    else:
        out["auto_detect_mcp"] = True
    return out


def resolve(cwd: Path | None = None) -> dict[str, Any]:
    """
    Resolve the active backend config dict.

    Returns one of:
      {"backend": "<name>", "file_path": "...", "auto_detect_mcp": bool, "source": "<path or 'auto-detect'>"}
      {"backend": None, "needs_first_run_prompt": True}
    """
    # 1. Per-project.
    pp = find_per_project_config(cwd)
    if pp is not None:
        raw = _load_json_safely(pp)
        if raw is not None:
            validated = _validate_config(raw)
            if validated is not None:
                validated["source"] = str(pp)
                return validated

    # 2. Global.
    if GLOBAL_CONFIG_PATH.is_file():
        raw = _load_json_safely(GLOBAL_CONFIG_PATH)
        if raw is not None:
            validated = _validate_config(raw)
            if validated is not None:
                validated["source"] = str(GLOBAL_CONFIG_PATH)
                return validated

    # 3. Auto-detect MCP.
    try:
        # Local import to avoid circular dependency at module import time.
        from . import mcp as mcp_backend  # type: ignore[no-redef]
    except ImportError:
        mcp_backend = None  # type: ignore[assignment]
    if mcp_backend is not None:
        try:
            if mcp_backend.is_reachable():
                return {
                    "backend": "626labs-mcp",
                    "auto_detect_mcp": True,
                    "source": "auto-detect",
                }
        except Exception:
            # MCP probe failures are silent — fall through to first-run.
            pass

    # 4. First-run prompt needed.
    return {"backend": None, "needs_first_run_prompt": True}


def write_config(config_dict: dict[str, Any], destination: Path) -> None:
    """
    Write a validated config dict to `destination`. Creates parent dirs.
    Caller is responsible for the dict shape matching the schema.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    with open(destination, "w", encoding="utf-8") as fh:
        json.dump(config_dict, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    # Tiny CLI for manual inspection.
    import sys

    cmd = sys.argv[1] if len(sys.argv) > 1 else "resolve"
    if cmd == "resolve":
        result = resolve()
        print(json.dumps(result, indent=2))
    elif cmd == "smart-default":
        ext = sys.argv[2] if len(sys.argv) > 2 else "md"
        print(str(smart_default_path(ext)))
    else:
        print(f"unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
