#!/usr/bin/env python3
"""Daily npm download stats collector for the 626Labs Vibe Plugins ecosystem.

Fetches last-day / last-week / last-month download counts for each tracked
package from the npm registry download API and writes results to:

  data/stats/history.jsonl   — append-only log, one entry per run
  data/stats/YYYY-MM-DD.json — overwrites each run, "latest for this day"

Prints an ecosystem summary + per-package table + week-over-week deltas to stdout
for the GitHub Actions log.

Stdlib only. No external dependencies.

Note: npm's /downloads/point/range/<pkg> endpoint is currently broken (returns
a stub 2030-01-01 response). This script uses /downloads/point/<period>/<pkg>
exclusively — period in {last-day, last-week, last-month} — which works.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------

PACKAGES: list[str] = [
    "@esthernandez/vibe-cartographer",
    "@esthernandez/vibe-doc",
    "@esthernandez/app-project-readiness",
    "@esthernandez/vibe-sec",
    "@esthernandez/vibe-test",
    "@626labs/plugin-core",
]

PERIODS: list[str] = ["last-day", "last-week", "last-month"]

API_BASE = "https://api.npmjs.org/downloads/point"
REQUEST_TIMEOUT = 15  # seconds

REPO_ROOT = Path(__file__).resolve().parent.parent
STATS_DIR = REPO_ROOT / "data" / "stats"
HISTORY_FILE = STATS_DIR / "history.jsonl"


# -----------------------------------------------------------------------------
# Fetching
# -----------------------------------------------------------------------------


def fetch_point(pkg: str, period: str) -> int | None:
    """Return the downloads count for a single (package, period), or None on failure.

    Treats 404 (package not published / not found) and network errors as graceful
    skips — returns None rather than raising.
    """
    # urllib handles URL-safe encoding of @ and / in scoped package names.
    url = f"{API_BASE}/{period}/{pkg}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            downloads = data.get("downloads")
            # npm returns the "not found" error shape with a 200-ish body sometimes,
            # defend against that.
            if isinstance(data, dict) and data.get("error"):
                return None
            if isinstance(downloads, int):
                return downloads
            return None
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        print(f"  ! HTTP {e.code} for {pkg} {period}: {e.reason}", file=sys.stderr)
        return None
    except urllib.error.URLError as e:
        print(f"  ! network error for {pkg} {period}: {e.reason}", file=sys.stderr)
        return None
    except (json.JSONDecodeError, ValueError) as e:
        print(f"  ! parse error for {pkg} {period}: {e}", file=sys.stderr)
        return None


def collect_all() -> dict[str, dict[str, int | None]]:
    """Fetch all (package, period) pairs. Returns {pkg: {period_key: value_or_none}}."""
    results: dict[str, dict[str, int | None]] = {}
    for pkg in PACKAGES:
        print(f"  fetching {pkg} ...", flush=True)
        pkg_result: dict[str, int | None] = {}
        for period in PERIODS:
            # Normalize key: "last-day" -> "last_day"
            key = period.replace("-", "_")
            pkg_result[key] = fetch_point(pkg, period)
        results[pkg] = pkg_result
    return results


# -----------------------------------------------------------------------------
# History I/O
# -----------------------------------------------------------------------------


def load_previous_entry() -> dict | None:
    """Return the most recent prior entry from history.jsonl, or None if none exists."""
    if not HISTORY_FILE.exists():
        return None
    last: dict | None = None
    try:
        with HISTORY_FILE.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    last = json.loads(line)
                except json.JSONDecodeError:
                    continue
    except OSError:
        return None
    return last


def append_history(entry: dict) -> None:
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    with HISTORY_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, separators=(",", ":")) + "\n")


def write_daily_snapshot(entry: dict, day: str) -> Path:
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    path = STATS_DIR / f"{day}.json"
    with path.open("w", encoding="utf-8") as fh:
        json.dump(entry, fh, indent=2, sort_keys=False)
        fh.write("\n")
    return path


# -----------------------------------------------------------------------------
# Reporting
# -----------------------------------------------------------------------------


def _fmt(n: int | None) -> str:
    return "—" if n is None else f"{n:,}"


def _delta(cur: int | None, prev: int | None) -> str:
    if cur is None or prev is None:
        return "first run" if prev is None else "n/a"
    diff = cur - prev
    if diff == 0:
        return "±0"
    sign = "+" if diff > 0 else ""
    return f"{sign}{diff:,}"


def print_report(entry: dict, prev: dict | None) -> None:
    packages = entry["packages"]
    prev_packages = (prev or {}).get("packages", {}) if prev else {}

    # Ecosystem total (last_week across packages that returned data)
    total_week = sum(
        v["last_week"] for v in packages.values() if isinstance(v.get("last_week"), int)
    )

    print()
    print("=" * 74)
    print(f"  626Labs Vibe Plugins — npm download snapshot")
    print(f"  {entry['timestamp']}")
    print("=" * 74)
    print()
    # Header
    print(f"  {'package':<42} {'day':>7} {'week':>9} {'month':>10}")
    print(f"  {'-' * 42} {'-' * 7} {'-' * 9} {'-' * 10}")
    for pkg in PACKAGES:
        row = packages.get(pkg, {})
        print(
            f"  {pkg:<42} {_fmt(row.get('last_day')):>7} "
            f"{_fmt(row.get('last_week')):>9} {_fmt(row.get('last_month')):>10}"
        )
    print()
    print(f"  Ecosystem total (last_week): {total_week:,}")
    print()

    # Week-over-week delta per package (compare current last_week vs previous last_week)
    print("  Week-over-week delta (last_week vs previous run):")
    for pkg in PACKAGES:
        cur = packages.get(pkg, {}).get("last_week")
        prev_val = (
            prev_packages.get(pkg, {}).get("last_week") if prev_packages else None
        )
        if prev is None:
            label = "first run"
        else:
            label = _delta(cur, prev_val)
        print(f"    {pkg:<42} {label}")
    print()


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------


def main() -> int:
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    day = now.strftime("%Y-%m-%d")

    print(f"npm-stats: run at {timestamp}")
    print(f"npm-stats: tracking {len(PACKAGES)} packages")

    prev = load_previous_entry()

    packages_data = collect_all()

    entry = {
        "timestamp": timestamp,
        "day": day,
        "packages": packages_data,
    }

    # Persist
    append_history(entry)
    snapshot_path = write_daily_snapshot(entry, day)

    # Report
    print_report(entry, prev)
    print(f"  wrote {HISTORY_FILE.relative_to(REPO_ROOT)}")
    print(f"  wrote {snapshot_path.relative_to(REPO_ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
