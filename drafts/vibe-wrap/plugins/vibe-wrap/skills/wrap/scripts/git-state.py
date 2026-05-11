#!/usr/bin/env python3
"""
git-state.py — pure-read git state collector for vibe-wrap.

Returns structured git state for the current working directory: status,
log within the session window, ahead-of-remote count, branch, detached
HEAD flag, and mid-rebase flag.

Usage:
    python git-state.py [--session-start <iso-ts>]

Args:
    --session-start  Optional ISO 8601 timestamp. When provided, `git log`
                     is filtered with --since=<this>. When omitted, the
                     20 most recent commits are returned.

Output:
    JSON object on stdout. Schema:

        {
            "is_repo": true,                 # false in non-git directories
            "repo_root": "/abs/path",        # null if not a repo
            "branch_name": "main" | null,    # null when detached
            "detached_head_flag": false,
            "mid_rebase_flag": false,
            "uncommitted_files": [
                {"path": "foo.py", "status_code": " M"},
                ...
            ],
            "commits": [
                {"sha": "abc...", "subject": "...", "ts": "2026-..."},
                ...
            ],
            "ahead_of_remote": 0,
            "remote_name": "origin/main" | null
        }

    In a non-git directory:

        {
            "is_repo": false,
            "repo_root": null,
            "branch_name": null,
            "detached_head_flag": false,
            "mid_rebase_flag": false,
            "uncommitted_files": [],
            "commits": [],
            "ahead_of_remote": 0,
            "remote_name": null
        }

Exit codes:
    0  — normal in every case (including non-git directory).
    1  — catastrophic (git CLI not on PATH).

Behavior:
    - All git invocations capture stderr separately and never let it
      escape to vibe-wrap's stderr unless something is genuinely broken.
    - "No upstream tracked" is expected, not an error.
    - "Not a git repo" is expected, not an error.

Pure stdlib. Python 3.11+.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252 which trips on
# non-ASCII glyphs (em-dashes, smart quotes) in commit subjects.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

LOG_RECORD_SEP = "\x1f"  # ASCII Unit Separator — safer than `|` for subjects
LOG_LINE_SEP = "\x1e"  # ASCII Record Separator
DEFAULT_LOG_LIMIT = 20


def warn(msg: str) -> None:
    """One-line stderr warning."""
    sys.stderr.write(f"git-state: {msg}\n")


def run_git(args: list[str], cwd: str | None = None) -> tuple[int, str, str]:
    """Run a git command, returning (returncode, stdout, stderr).

    Captures stderr separately so the caller decides whether to surface
    or suppress it. Never raises.
    """
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as err:
        return 127, "", f"git invocation failed: {err}"
    return proc.returncode, proc.stdout, proc.stderr


def empty_state() -> dict:
    """The non-git-directory shape."""
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


def parse_status_porcelain(stdout: str) -> list[dict]:
    """Parse `git status --porcelain` output into structured entries.

    Each line is `XY <space> <path>` where X = index status, Y = worktree
    status. Renames look like `R  old -> new`; we keep the new path.
    """
    out: list[dict] = []
    for raw in stdout.splitlines():
        if not raw:
            continue
        if len(raw) < 3:
            # Malformed — surface minimally rather than dropping silently.
            out.append({"path": raw.strip(), "status_code": "??"})
            continue
        status_code = raw[:2]
        rest = raw[3:]  # skip the single space
        # Renames: "R  old -> new". Keep the new path.
        if " -> " in rest:
            rest = rest.split(" -> ", 1)[1]
        out.append({"path": rest, "status_code": status_code})
    return out


def parse_log(stdout: str) -> list[dict]:
    """Parse the structured `git log` output we asked for.

    Format string: %H<US>%s<US>%aI<RS>
      → SHA, subject, author-date in strict ISO 8601.
    """
    commits: list[dict] = []
    # Records are separated by RS; each record has 3 fields separated by US.
    for record in stdout.split(LOG_LINE_SEP):
        record = record.strip("\n").strip()
        if not record:
            continue
        parts = record.split(LOG_RECORD_SEP)
        if len(parts) < 3:
            continue
        sha, subject, ts = parts[0], parts[1], parts[2]
        commits.append({"sha": sha, "subject": subject, "ts": ts})
    return commits


def detect_mid_rebase(repo_root: str) -> bool:
    """True if `.git/rebase-merge` or `.git/rebase-apply` exists."""
    git_dir = Path(repo_root) / ".git"
    # `.git` may be a file (worktree) — be tolerant.
    if git_dir.is_file():
        try:
            payload = git_dir.read_text(encoding="utf-8").strip()
        except OSError:
            return False
        if payload.startswith("gitdir:"):
            git_dir = Path(payload.split(":", 1)[1].strip())
    if not git_dir.is_dir():
        return False
    return (git_dir / "rebase-merge").exists() or (git_dir / "rebase-apply").exists()


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="git-state.py",
        description="Read structured git state for the current working directory.",
    )
    parser.add_argument("--session-start", dest="session_start", default=None)
    args = parser.parse_args()

    # Catastrophic guard: git CLI must be on PATH.
    if shutil.which("git") is None:
        warn("git CLI not found on PATH")
        return 1

    # Is this a git repo?
    rc, repo_root_raw, _ = run_git(["rev-parse", "--show-toplevel"])
    if rc != 0:
        # Not a git directory — return empty shape, exit 0.
        sys.stdout.write(json.dumps(empty_state(), ensure_ascii=False) + "\n")
        return 0
    repo_root = repo_root_raw.strip()

    state: dict = {
        "is_repo": True,
        "repo_root": repo_root,
        "branch_name": None,
        "detached_head_flag": False,
        "mid_rebase_flag": False,
        "uncommitted_files": [],
        "commits": [],
        "ahead_of_remote": 0,
        "remote_name": None,
    }

    # Branch / detached HEAD detection.
    rc_sym, _, _ = run_git(["symbolic-ref", "--short", "HEAD"])
    if rc_sym != 0:
        state["detached_head_flag"] = True
    rc_branch, branch_out, _ = run_git(["branch", "--show-current"])
    if rc_branch == 0:
        branch = branch_out.strip()
        state["branch_name"] = branch if branch else None
    if state["branch_name"] is None and not state["detached_head_flag"]:
        # Edge case: branch --show-current empty on detached HEAD; both
        # signals agree the branch is unset.
        pass

    # Mid-rebase detection.
    state["mid_rebase_flag"] = detect_mid_rebase(repo_root)

    # Uncommitted + untracked files.
    rc_status, status_out, status_err = run_git(["status", "--porcelain"])
    if rc_status == 0:
        state["uncommitted_files"] = parse_status_porcelain(status_out)
    else:
        warn(f"git status failed: {status_err.strip()}")

    # Commits.
    log_args = [
        "log",
        f"--pretty=format:%H{LOG_RECORD_SEP}%s{LOG_RECORD_SEP}%aI{LOG_LINE_SEP}",
    ]
    if args.session_start:
        log_args.insert(1, f"--since={args.session_start}")
    else:
        log_args.insert(1, f"--max-count={DEFAULT_LOG_LIMIT}")
    rc_log, log_out, log_err = run_git(log_args)
    if rc_log == 0:
        state["commits"] = parse_log(log_out)
    else:
        # Possible on a brand-new repo with no commits — quiet by default.
        if "does not have any commits yet" not in log_err.lower():
            warn(f"git log failed: {log_err.strip()}")

    # Upstream remote name (suppressed-on-no-upstream).
    rc_up, up_out, _ = run_git(
        ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]
    )
    if rc_up == 0:
        upstream = up_out.strip()
        state["remote_name"] = upstream if upstream else None

        # Ahead-of-remote count (only meaningful when upstream exists).
        rc_ahead, ahead_out, _ = run_git(["rev-list", "--count", "HEAD..@{u}"])
        if rc_ahead == 0:
            try:
                # NOTE: `git rev-list HEAD..@{u}` counts commits the upstream
                # has that we don't (i.e., behind-count). For ahead-of-remote
                # we want @{u}..HEAD. The spec calls this "ahead_of_remote"
                # so keep the field name; compute the right number.
                rc_real_ahead, real_ahead_out, _ = run_git(
                    ["rev-list", "--count", "@{u}..HEAD"]
                )
                if rc_real_ahead == 0:
                    state["ahead_of_remote"] = int(real_ahead_out.strip() or "0")
                else:
                    # Fall back to whatever the spec-named command produced.
                    state["ahead_of_remote"] = int(ahead_out.strip() or "0")
            except ValueError:
                state["ahead_of_remote"] = 0
    # No upstream → leave ahead_of_remote=0 and remote_name=None silently.

    sys.stdout.write(json.dumps(state, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
