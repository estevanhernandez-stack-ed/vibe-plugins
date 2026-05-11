#!/usr/bin/env python3
"""
first_run_prompt.py — interactive picker for first-run decision-log setup.

Surfaces a 4-option menu when no config resolves and MCP isn't reachable.
Persists the user's choice to either the global config path
(`~/.claude/plugins/data/vibe-wrap/config.json`) or a per-project path
(`<repo>/.vibe-wrap/config.json`).

Picker copy is locked v0.1.0 — see references/decision-log-backends.md
"First-run UX" section for the canonical text. This module renders the
copy in plain `print()` calls (no TUI library — pure stdlib) and reads
the user's choice from stdin.

Usage:
    # As a module:
    from decision_log import first_run_prompt
    config = first_run_prompt.run()

    # As a CLI (manual testing or --reconfigure):
    python first_run_prompt.py [--reconfigure]
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Allow running as both a module (relative imports) and a script.
if __package__ in (None, ""):
    # Running as `python first_run_prompt.py` — fix sys.path so config / mcp resolve.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import config as _config_module  # type: ignore
    import mcp as _mcp_module  # type: ignore
else:
    from . import config as _config_module
    from . import mcp as _mcp_module


def _build_menu(mcp_reachable: bool, smart_md: Path, smart_jsonl: Path) -> str:
    """Build the picker menu text. Stays under 12 lines for the menu block."""
    mcp_line = (
        "626Labs Dashboard (MCP)         (available — auto-detect found it)"
        if mcp_reachable
        else "626Labs Dashboard (MCP)         (unavailable — install the 626Labs MCP first)"
    )
    return (
        "vibe-wrap doesn't see a decision log yet. pick one — change later\n"
        "with `/vibe-wrap --reconfigure` or by editing the config file.\n"
        "\n"
        f"  1. Markdown file at {smart_md}    (Recommended — readable, greppable)\n"
        f"  2. JSONL file at {smart_jsonl}  (Machine-friendly, jq-pipeable)\n"
        f"  3. {mcp_line}\n"
        "  4. Disabled — skip decision logging entirely\n"
    )


def _ask(prompt: str, valid: set[str], default: str) -> str:
    """
    Prompt until the user types a valid choice (or empty for default).
    Returns the chosen string.
    """
    while True:
        try:
            answer = input(prompt).strip().lower()
        except EOFError:
            return default
        if answer == "":
            return default
        if answer in valid:
            return answer
        print(f"  not a valid choice — pick one of: {', '.join(sorted(valid))}")


def _persist(config_dict: dict[str, Any], scope: str, cwd: Path) -> Path:
    """
    Write config_dict to the chosen scope. Returns the absolute path.
    `scope` ∈ {"global", "project"}.
    """
    if scope == "project":
        target = cwd / ".vibe-wrap" / "config.json"
    else:
        target = _config_module.GLOBAL_CONFIG_PATH
    _config_module.write_config(config_dict, target)
    return target


def run(cwd: Path | None = None, force: bool = False) -> dict[str, Any]:
    """
    Run the interactive picker. Returns the persisted config dict.

    Args:
        cwd: defaults to Path.cwd().
        force: when True, runs even if a config already exists (used by
            --reconfigure). When False, returns the existing resolved config
            if one is present.

    Returns:
        The config dict written to disk (`{schema_version, decision_log}`).
    """
    if cwd is None:
        cwd = Path.cwd()

    if not force:
        existing = _config_module.resolve(cwd)
        if existing.get("backend") is not None and existing.get("source") not in (None, "auto-detect"):
            return existing

    smart_md = _config_module.smart_default_path("md", cwd)
    smart_jsonl = _config_module.smart_default_path("jsonl", cwd)
    mcp_reachable = _safe_mcp_reachable()

    print(_build_menu(mcp_reachable, smart_md, smart_jsonl))
    choice = _ask("choose [1-4, default 1]: ", {"1", "2", "3", "4"}, "1")

    backend_for_choice = {
        "1": "file-md",
        "2": "file-jsonl",
        "3": "626labs-mcp",
        "4": "disabled",
    }
    backend = backend_for_choice[choice]

    decision_log: dict[str, Any] = {
        "backend": backend,
        "auto_detect_mcp": True,
    }
    if backend == "file-md":
        decision_log["file_path"] = str(smart_md)
    elif backend == "file-jsonl":
        decision_log["file_path"] = str(smart_jsonl)

    config_dict = {
        "schema_version": 1,
        "decision_log": decision_log,
    }

    # Scope question — keep it brief.
    print()
    scope_choice = _ask(
        "save where? [g]lobal (default) or [p]roject: ",
        {"g", "p", "global", "project"},
        "g",
    )
    scope = "project" if scope_choice in ("p", "project") else "global"

    target = _persist(config_dict, scope, cwd)

    # Confirmation per the locked picker copy.
    print()
    print(f"saved {backend} as your default decision log.")
    print(f"config: {target}")
    print()
    print("run /vibe-wrap --reconfigure anytime to change.")

    return config_dict


def _safe_mcp_reachable() -> bool:
    try:
        return _mcp_module.is_reachable()
    except Exception:
        return False


if __name__ == "__main__":
    reconfigure = "--reconfigure" in sys.argv[1:]
    result = run(force=reconfigure)
    # Don't print the dict — confirmation already printed.
    sys.exit(0)
