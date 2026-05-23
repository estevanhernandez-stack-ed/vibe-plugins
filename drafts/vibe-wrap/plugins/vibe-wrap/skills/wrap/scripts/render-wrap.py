#!/usr/bin/env python3
"""
render-wrap.py — vibe-wrap:wrap render core.

Orchestrates the deterministic read + render half of the wrap flow per
spec.md § Data Flow steps 4a-4d, then surfaces the gate state per spec
§ Subsystem C. The interactive git/MCP mutations are NOT performed here —
this script does the read+render and emits the gate state. The wrap SKILL
body is the orchestrator that drives the actual commit / push / decision-log
write / bridge gestures based on what this script reports.

What this script does (deterministic, no mutations):
    1. Resolve the session window (--session-id, else --session-window hours).
    2. Run the three reader scripts (read-breadcrumbs, read-sibling-state,
       git-state).
    3. Read decisions via the decision-log dispatcher (read-only; never
       triggers the interactive first-run picker).
    4. Assemble the markdown wrap from assets/wrap-template.md.
    5. Write to docs/session-wraps/<YYYY-MM-DD-HHmm>.md (fallback
       .vibe-wrap/wraps/<ts>.md if no docs/), unless --inline-only.
    6. Emit the assembled wrap doc + a machine-readable gate-state block
       so the SKILL knows which gates to surface.

Usage:
    python render-wrap.py [--session-id <uuid>] [--session-window <hours>]
                          [--inline-only] [--bridge]

Args:
    --session-id       Claude Code session UUID. When supplied, breadcrumbs
                       are read for this session + the session-state window
                       starts at the earliest breadcrumb ts.
    --session-window   Fallback window in hours (default 4). Used when
                       --session-id is empty or yields no breadcrumbs.
    --inline-only      Skip the file write. The wrap is still emitted to
                       stdout; the gate state still computes.
    --bridge           Force the dashboard-bridge gate to register as
                       "eligible" regardless of the commit/decision
                       threshold (still MCP-only).

Output (stdout):
    Two sections separated by a sentinel line. First the rendered markdown
    wrap doc, then a fenced JSON block tagged `VIBE-WRAP-GATE-STATE` that
    the SKILL parses to decide which gates to surface.

Exit codes:
    0  — normal (including empty session — a valid "nothing happened" doc).
    1  — catastrophic (template missing, write target unrecoverable AND
         not --inline-only). The SKILL surfaces the error.

Pure stdlib + subprocess. Python 3.11+.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import fnmatch
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
ASSETS_DIR = SCRIPT_DIR.parent / "assets"
TEMPLATE_PATH = ASSETS_DIR / "wrap-template.md"
READ_BREADCRUMBS = SCRIPT_DIR / "read-breadcrumbs.py"
READ_SIBLING_STATE = SCRIPT_DIR / "read-sibling-state.py"
GIT_STATE = SCRIPT_DIR / "git-state.py"
DECISION_LOG_INIT = SCRIPT_DIR / "decision-log" / "__init__.py"

DEFAULT_WINDOW_HOURS = 4
GATE_STATE_SENTINEL = "VIBE-WRAP-GATE-STATE"

# Secret-pattern globs — basename match, case-insensitive. Mirrors
# references/secret-patterns.md exactly. Keep in lockstep with that doc.
SECRET_PATTERNS = [
    ".env*",
    "*credentials*",
    "*.pem",
    "*.key",
    "*token*",
    "id_rsa",
    "id_ed25519",
    "*.kdbx",
]

# Commit-count threshold for the bridge gate (spec Decision 3).
BRIDGE_COMMIT_THRESHOLD = 2


def warn(msg: str) -> None:
    """One-line stderr warning."""
    sys.stderr.write(f"render-wrap: {msg}\n")


def now_local() -> _dt.datetime:
    """Local-tz-aware now."""
    return _dt.datetime.now(_dt.timezone.utc).astimezone()


def now_local_iso() -> str:
    """ISO 8601 timestamp with local TZ offset, second precision."""
    return now_local().isoformat(timespec="seconds")


def parse_ts(raw: object) -> _dt.datetime | None:
    """Parse an ISO 8601 timestamp tolerantly. Returns None on failure."""
    if not raw or not isinstance(raw, str):
        return None
    candidate = raw.strip()
    if not candidate:
        return None
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = _dt.datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.astimezone()
    return parsed


# --------------------------------------------------------------------------
# Reader plumbing — mirrors status.py's subprocess + dynamic-import pattern.
# --------------------------------------------------------------------------


def run_reader(script: Path, args: list[str]) -> tuple[Any, str | None]:
    """Run a reader script, return (parsed_json, error_or_None).

    Reader scripts print JSON to stdout on success. Any failure
    (subprocess error, JSON decode error, non-zero exit) returns
    (None, error_string) — never raises.
    """
    if not script.exists():
        return None, f"reader missing: {script}"
    try:
        proc = subprocess.run(
            [sys.executable, str(script), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
    except (subprocess.SubprocessError, OSError) as err:
        return None, f"subprocess failed for {script.name}: {err}"
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        return None, f"{script.name} exited {proc.returncode}"
    try:
        return json.loads(proc.stdout), None
    except json.JSONDecodeError as err:
        return None, f"{script.name} produced unparseable JSON: {err}"


def import_dispatcher() -> Any | None:
    """Dynamically import the hyphenated decision-log dispatcher package."""
    if not DECISION_LOG_INIT.exists():
        warn(f"decision-log dispatcher not found at {DECISION_LOG_INIT}")
        return None
    try:
        spec = importlib.util.spec_from_file_location(
            "decision_log_dispatcher",
            str(DECISION_LOG_INIT),
            submodule_search_locations=[str(DECISION_LOG_INIT.parent)],
        )
        if spec is None or spec.loader is None:
            warn("decision-log dispatcher spec unresolvable")
            return None
        module = importlib.util.module_from_spec(spec)
        sys.modules["decision_log_dispatcher"] = module
        spec.loader.exec_module(module)
        return module
    except Exception as err:
        warn(f"decision-log dispatcher import failed: {err}")
        return None


def read_breadcrumbs(session_id: str) -> list[dict]:
    """Run read-breadcrumbs.py with --include-orphans. [] on failure."""
    args = ["--session-id", session_id or "", "--include-orphans"]
    data, err = run_reader(READ_BREADCRUMBS, args)
    if err is not None:
        warn(err)
        return []
    return data if isinstance(data, list) else []


def read_sibling_state(session_start_iso: str) -> dict[str, dict]:
    """Run read-sibling-state.py. {} on failure."""
    data, err = run_reader(READ_SIBLING_STATE, ["--session-start", session_start_iso])
    if err is not None:
        warn(err)
        return {}
    return data if isinstance(data, dict) else {}


def read_git_state(session_start_iso: str) -> dict[str, Any]:
    """Run git-state.py. Empty-shape dict on failure."""
    data, err = run_reader(GIT_STATE, ["--session-start", session_start_iso])
    if err is not None:
        warn(err)
        return {
            "is_repo": False,
            "repo_root": None,
            "branch_name": None,
            "detached_head_flag": False,
            "mid_rebase_flag": False,
            "uncommitted_files": [],
            "commits": [],
            "ahead_of_remote": 0,
            "remote_name": None,
        }
    return data if isinstance(data, dict) else {}


def read_decisions(
    window_start_iso: str, window_end_iso: str, cwd: Path
) -> tuple[list[dict], str]:
    """Read decisions in window via dispatcher. (decisions, backend_name).

    Read-only: never invokes the interactive first-run picker. If config is
    first-run-pending, reports backend "pending" and returns [].
    """
    dispatcher = import_dispatcher()
    if dispatcher is None:
        return [], "unknown"
    try:
        backend = dispatcher.active_backend(cwd)
    except Exception as err:
        warn(f"dispatcher.active_backend() failed: {err}")
        backend = None
    if backend is None:
        # First-run pending. render-wrap must not trigger the picker — the
        # SKILL handles first-run interactively before calling this script.
        return [], "pending"
    try:
        decisions = dispatcher.read(
            {"start": window_start_iso, "end": window_end_iso}, cwd
        )
    except Exception as err:
        warn(f"dispatcher.read() failed: {err}")
        decisions = []
    if not isinstance(decisions, list):
        decisions = []
    return decisions, backend


# --------------------------------------------------------------------------
# Window resolution.
# --------------------------------------------------------------------------


def resolve_window(
    session_id: str, window_hours: int, breadcrumbs: list[dict]
) -> tuple[str, str]:
    """Return (start_iso, end_iso) for the session window.

    Precedence for start:
      1. Earliest breadcrumb ts when breadcrumbs exist (truest session start).
      2. now − window_hours fallback.
    End is always "now".
    """
    end = now_local()
    earliest: _dt.datetime | None = None
    for entry in breadcrumbs:
        ts = parse_ts(entry.get("ts"))
        if ts is not None and (earliest is None or ts < earliest):
            earliest = ts
    if earliest is not None:
        start = earliest
    else:
        start = end - _dt.timedelta(hours=window_hours)
    return start.isoformat(timespec="seconds"), end.isoformat(timespec="seconds")


# --------------------------------------------------------------------------
# Secret-pattern matching (basename, case-insensitive glob).
# --------------------------------------------------------------------------


def matches_secret_pattern(path: str) -> str | None:
    """Return the matching pattern for a path's basename, else None."""
    basename = Path(path).name.lower()
    for pattern in SECRET_PATTERNS:
        if fnmatch.fnmatch(basename, pattern.lower()):
            return pattern
    return None


# --------------------------------------------------------------------------
# Section renderers.
# --------------------------------------------------------------------------


def fmt_duration(start: _dt.datetime | None, end: _dt.datetime | None) -> str:
    """Human-readable duration like '1h 52m'. Empty if either bound missing."""
    if start is None or end is None:
        return ""
    delta = end - start
    total_min = int(delta.total_seconds() // 60)
    if total_min < 0:
        return ""
    hours, minutes = divmod(total_min, 60)
    if hours and minutes:
        return f"{hours}h {minutes}m"
    if hours:
        return f"{hours}h"
    return f"{minutes}m"


def render_what_shipped(
    git: dict[str, Any], breadcrumbs: list[dict], sibling_state: dict[str, dict]
) -> str:
    """The 'What shipped' section — commits, files, breadcrumb activity."""
    lines: list[str] = []
    commits = git.get("commits", []) or []
    branch = git.get("branch_name") or ("detached HEAD" if git.get("detached_head_flag") else "unknown")
    if commits:
        most_recent = commits[0].get("subject", "(no subject)")
        lines.append(f"- {len(commits)} commits on `{branch}`. Most recent: `{most_recent}`.")
        # Show up to 5 commit subjects for context.
        shown = commits[:5]
        for c in shown:
            sha = (c.get("sha") or "")[:7]
            subj = c.get("subject", "(no subject)")
            lines.append(f"  - `{sha}` {subj}")
        if len(commits) > len(shown):
            lines.append(f"  - ... and {len(commits) - len(shown)} more")
    else:
        lines.append("- No commits recorded in the session window.")

    # Breadcrumb-derived activity: count per source.
    if breadcrumbs:
        src_counts: dict[str, int] = {}
        for entry in breadcrumbs:
            src = entry.get("source")
            if isinstance(src, str) and src:
                src_counts[src] = src_counts.get(src, 0) + 1
        if src_counts:
            ranked = sorted(src_counts.items(), key=lambda kv: (-kv[1], kv[0]))
            rendered = ", ".join(f"{n} ({c})" for n, c in ranked)
            lines.append(f"- Toolkit activity: {rendered}.")

    if not commits and not breadcrumbs and not sibling_state:
        return "- Nothing shipped in the session window. Quiet session."
    return "\n".join(lines)


def render_decisions(decisions: list[dict], backend: str) -> str:
    """The 'Decisions logged' section."""
    if backend == "pending":
        return (
            "- Decision-log backend not configured yet. "
            "Run `/vibe-wrap` interactively to pick one."
        )
    if backend in ("unknown",):
        return "- Decision-log backend unavailable this session."
    if not decisions:
        return "- No decisions logged this session."
    lines: list[str] = []
    for d in decisions:
        title = d.get("title") or "(untitled decision)"
        lines.append(f"- \"{title}\"")
    lines.append(f"\n(from `{backend}`)")
    return "\n".join(lines)


def render_friction(sibling_state: dict[str, dict]) -> str:
    """The 'Friction signals captured' section."""
    rows: list[str] = []
    total = 0
    for name in sorted(sibling_state.keys()):
        payload = sibling_state[name]
        n = len(payload.get("friction", []) or [])
        total += n
        if n:
            rows.append(f"- {n} friction entr{'y' if n == 1 else 'ies'} from {name} this session.")
    if total == 0:
        return "- No friction signals captured this session."
    return "\n".join(rows)


def render_uncommitted(git: dict[str, Any]) -> tuple[str, list[dict]]:
    """The 'Still uncommitted' section + the secret-match list for the gate."""
    files = git.get("uncommitted_files", []) or []
    if not git.get("is_repo"):
        return "- Not a git repository — no commit state.", []
    if not files:
        return "- Working tree clean. Nothing uncommitted.", []
    lines: list[str] = []
    secret_matches: list[dict] = []
    for f in files:
        path = f.get("path", "")
        code = (f.get("status_code") or "").strip() or "??"
        descr = _status_word(code)
        pat = matches_secret_pattern(path)
        if pat:
            lines.append(f"- WARNING `{path}` ({descr} — secret-pattern match: `{pat}`)")
            secret_matches.append({"path": path, "pattern": pat, "status_code": code})
        else:
            lines.append(f"- `{path}` ({descr})")
    return "\n".join(lines), secret_matches


def _status_word(code: str) -> str:
    """Map a porcelain status code to a human word."""
    c = code.strip()
    if c in ("??",):
        return "untracked"
    if "M" in c:
        return "modified"
    if "A" in c:
        return "added"
    if "D" in c:
        return "deleted"
    if "R" in c:
        return "renamed"
    return code or "changed"


def render_unpushed(git: dict[str, Any]) -> str:
    """The 'Still unpushed' section."""
    if not git.get("is_repo"):
        return "- Not a git repository — no push state."
    remote = git.get("remote_name")
    ahead = git.get("ahead_of_remote", 0) or 0
    if remote is None:
        return "- No tracked remote — local-only state. Push gate skipped."
    if ahead == 0:
        return f"- At parity with `{remote}`. Nothing to push."
    return f"- {ahead} commit{'s' if ahead != 1 else ''} ahead of `{remote}`."


def render_session_bounds(start_iso: str, end_iso: str) -> str:
    """The 'Session bounds' section."""
    start = parse_ts(start_iso)
    end = parse_ts(end_iso)
    start_str = start.strftime("%Y-%m-%d %H:%M") if start else start_iso
    end_str = end.strftime("%Y-%m-%d %H:%M") if end else end_iso
    dur = fmt_duration(start, end)
    suffix = f" ({dur})" if dur else ""
    return f"- Start: {start_str}\n- End:   {end_str}{suffix}"


# --------------------------------------------------------------------------
# Gate state computation.
# --------------------------------------------------------------------------


def compute_gate_state(
    git: dict[str, Any],
    backend: str,
    decisions: list[dict],
    secret_matches: list[dict],
    force_bridge: bool,
) -> dict[str, Any]:
    """Compute which gates the SKILL should surface, per spec § Subsystem C.

    Returns a structured dict. The SKILL reads this to drive the interactive
    gestures. render-wrap performs NO mutations — it only reports eligibility.
    """
    is_repo = bool(git.get("is_repo"))
    detached = bool(git.get("detached_head_flag"))
    mid_rebase = bool(git.get("mid_rebase_flag"))
    uncommitted = git.get("uncommitted_files", []) or []
    ahead = git.get("ahead_of_remote", 0) or 0
    remote = git.get("remote_name")
    commits = git.get("commits", []) or []

    # Unusual git state suppresses commit/push gates entirely (spec edge case).
    unusual_git = detached or mid_rebase

    commit_gate = {
        "eligible": is_repo and bool(uncommitted) and not unusual_git,
        "suppressed_reason": (
            "detached HEAD or mid-rebase — gates skipped, resolve manually"
            if unusual_git and uncommitted
            else None
        ),
        "uncommitted_count": len(uncommitted),
        "secret_matches": secret_matches,
    }

    push_gate = {
        "eligible": is_repo and ahead >= 1 and remote is not None and not unusual_git,
        "remote": remote,
        "ahead": ahead,
    }

    decision_gate = {
        # Per gate-design: appears when active backend is anything other than
        # disabled (and not pending/unknown — those can't append cleanly).
        "eligible": backend not in ("disabled", "pending", "unknown"),
        "backend": backend,
    }

    # Bridge threshold (spec Decision 3): MCP-only AND at least one of
    # (decision logged this session, >2 commits in window, --bridge flag).
    threshold_met = (
        len(decisions) >= 1 or len(commits) > BRIDGE_COMMIT_THRESHOLD or force_bridge
    )
    bridge_gate = {
        "eligible": backend == "626labs-mcp" and threshold_met,
        "threshold_signals": {
            "decisions_logged": len(decisions),
            "commits_in_window": len(commits),
            "bridge_flag": force_bridge,
        },
    }

    return {
        "commit": commit_gate,
        "push": push_gate,
        "decision_log": decision_gate,
        "bridge": bridge_gate,
        "unusual_git_state": {
            "detached_head": detached,
            "mid_rebase": mid_rebase,
        },
    }


# --------------------------------------------------------------------------
# Wrap-doc assembly + write.
# --------------------------------------------------------------------------


def assemble_doc(
    template: str,
    wrap_ts: str,
    git: dict[str, Any],
    breadcrumbs: list[dict],
    sibling_state: dict[str, dict],
    decisions: list[dict],
    backend: str,
    window_start_iso: str,
    window_end_iso: str,
) -> tuple[str, list[dict]]:
    """Fill the template. Returns (rendered_markdown, secret_matches)."""
    repo_root = git.get("repo_root")
    repo_label = Path(repo_root).name if repo_root else "(not a git repo)"
    branch = git.get("branch_name") or (
        "detached HEAD" if git.get("detached_head_flag") else "—"
    )

    uncommitted_section, secret_matches = render_uncommitted(git)

    rendered = template.format(
        wrap_timestamp=wrap_ts,
        repo_label=repo_label,
        branch_label=branch,
        what_shipped=render_what_shipped(git, breadcrumbs, sibling_state),
        decisions_logged=render_decisions(decisions, backend),
        friction_signals=render_friction(sibling_state),
        still_uncommitted=uncommitted_section,
        still_unpushed=render_unpushed(git),
        session_bounds=render_session_bounds(window_start_iso, window_end_iso),
    )
    return rendered, secret_matches


def resolve_write_target(wrap_filename: str, git: dict[str, Any]) -> Path:
    """Pick the wrap-doc write path.

    Prefer <cwd-or-repo>/docs/session-wraps/ when a docs/ dir exists; else
    fall back to <cwd-or-repo>/.vibe-wrap/wraps/.
    """
    base = Path(git.get("repo_root") or Path.cwd())
    docs_dir = base / "docs"
    if docs_dir.is_dir():
        return docs_dir / "session-wraps" / wrap_filename
    return base / ".vibe-wrap" / "wraps" / wrap_filename


def write_doc(target: Path, content: str) -> Path | None:
    """Write the wrap doc. Returns the path on success, None on failure."""
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target
    except OSError as err:
        warn(f"could not write wrap doc to {target}: {err}")
        return None


# --------------------------------------------------------------------------
# Main.
# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="render-wrap.py",
        description="vibe-wrap:wrap render core — read + render + gate state.",
    )
    parser.add_argument("--session-id", dest="session_id", default="")
    parser.add_argument(
        "--session-window",
        dest="session_window",
        type=int,
        default=DEFAULT_WINDOW_HOURS,
    )
    parser.add_argument(
        "--inline-only", dest="inline_only", action="store_true", default=False
    )
    parser.add_argument(
        "--bridge", dest="bridge", action="store_true", default=False
    )
    args = parser.parse_args()

    if not TEMPLATE_PATH.exists():
        warn(f"template missing at {TEMPLATE_PATH}")
        return 1
    try:
        template = TEMPLATE_PATH.read_text(encoding="utf-8")
    except OSError as err:
        warn(f"could not read template: {err}")
        return 1

    session_id = (args.session_id or "").strip()
    window_hours = args.session_window if args.session_window > 0 else DEFAULT_WINDOW_HOURS

    # Reader 1: breadcrumbs.
    breadcrumbs = read_breadcrumbs(session_id)

    # Window resolution.
    window_start_iso, window_end_iso = resolve_window(
        session_id, window_hours, breadcrumbs
    )

    # Reader 2: sibling state.
    sibling_state = read_sibling_state(window_start_iso)

    # Reader 3: git state.
    git = read_git_state(window_start_iso)

    # Reader 4: decision log (read-only).
    cwd = Path(git.get("repo_root") or Path.cwd())
    decisions, backend = read_decisions(window_start_iso, window_end_iso, cwd)

    # Assemble the doc.
    wrap_dt = now_local()
    wrap_ts_human = wrap_dt.strftime("%Y-%m-%d %H:%M")
    wrap_filename = wrap_dt.strftime("%Y-%m-%d-%H%M") + ".md"

    rendered, secret_matches = assemble_doc(
        template=template,
        wrap_ts=wrap_ts_human,
        git=git,
        breadcrumbs=breadcrumbs,
        sibling_state=sibling_state,
        decisions=decisions,
        backend=backend,
        window_start_iso=window_start_iso,
        window_end_iso=window_end_iso,
    )

    # Write the doc unless --inline-only.
    written_path: Path | None = None
    if not args.inline_only:
        target = resolve_write_target(wrap_filename, git)
        written_path = write_doc(target, rendered)
        if written_path is None:
            # Write failed but we still have the rendered doc — surface inline
            # and let the SKILL decide. Not catastrophic; the doc still exists
            # in stdout. (Catastrophic only if there were truly nothing to show.)
            warn("file write failed — emitting inline only")

    # Compute gate state.
    gate_state = compute_gate_state(
        git=git,
        backend=backend,
        decisions=decisions,
        secret_matches=secret_matches,
        force_bridge=args.bridge,
    )

    # Emit: the rendered markdown, then the gate-state JSON block.
    sys.stdout.write(rendered)
    if not rendered.endswith("\n"):
        sys.stdout.write("\n")
    sys.stdout.write("\n")
    sys.stdout.write(f"```{GATE_STATE_SENTINEL}\n")
    meta = {
        "wrap_doc_path": str(written_path) if written_path else None,
        "inline_only": args.inline_only,
        "session_id": session_id or None,
        "window": {"start": window_start_iso, "end": window_end_iso},
        "decision_backend": backend,
        "gates": gate_state,
    }
    sys.stdout.write(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    sys.stdout.write("```\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
