#!/usr/bin/env python3
"""
mcp.py — 626labs-mcp backend.

Important: this module is a thin stub when invoked from CLI / standalone
Python. The actual MCP calls (`mcp__626Labs__manage_decisions`,
`mcp__626Labs__bridge_context_to_architect`) are tools surfaced by the
Claude Code SKILL host — they are NOT importable Python functions.

The wrap SKILL body invokes those MCP tools directly via the Claude Code
tool surface; this module exists so the dispatcher has a uniform routing
target. From standalone Python:

    is_reachable() → False (the SKILL context is what makes MCP reachable)
    read(window)   → []     (stub; SKILL composes MCP read directly)
    append(...)    → {"ok": False, "backend": "626labs-mcp",
                      "ref": None, "error": "mcp not callable from CLI"}

The wrap SKILL detects backend == "626labs-mcp" and routes the read /
append through the live MCP tool surface — bypassing this module's stubs.
The dispatcher still consults `is_reachable()` for the auto-detect path
in `config.resolve()`; under CLI invocation it will return False, which
is the correct answer for that context.
"""

from __future__ import annotations

import os
import sys
from typing import Any


def is_reachable() -> bool:
    """
    Liveness check for the MCP backend.

    Returns True only when invoked through a SKILL context that exposes
    `mcp__626Labs__manage_decisions`. From CLI / standalone Python: False.

    The SKILL host injects the MCP tool surface as Python callables ONLY
    inside SKILL execution; outside that, no such callable exists. We
    detect the SKILL context via an env-var marker the wrap SKILL sets
    before invoking decision-log scripts (VIBE_WRAP_MCP_AVAILABLE=1). If
    the marker is absent, MCP is unreachable from this process.
    """
    return os.environ.get("VIBE_WRAP_MCP_AVAILABLE") == "1"


def read(window: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Stub — see module docstring. The wrap SKILL composes MCP reads
    directly via the tool surface.
    """
    sys.stderr.write(
        "mcp.read() called from CLI — must be invoked through SKILL "
        "context for live MCP access\n"
    )
    return []


def append(decision: dict[str, Any]) -> dict[str, Any]:
    """
    Stub — see module docstring. The wrap SKILL composes MCP appends
    directly via the tool surface.
    """
    sys.stderr.write(
        "mcp.append() called from CLI — must be invoked through SKILL "
        "context for live MCP access\n"
    )
    return {
        "ok": False,
        "backend": "626labs-mcp",
        "ref": None,
        "error": "mcp not callable from CLI",
    }


if __name__ == "__main__":
    import json

    print(json.dumps({"is_reachable": is_reachable()}))
