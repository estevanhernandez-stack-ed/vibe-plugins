#!/usr/bin/env python3
"""live-versions.py — nightly version-truth snapshot.

Fetches the latest SHIPPED version (newest non-prerelease, non-draft GitHub
release; falls back to newest tag when a repo has no releases) for every
product in the 626 Labs family, and writes data/live-versions.json.

The file deliberately contains NO timestamps: the committing workflow only
lands a commit when a version actually changed, and the commit date is the
snapshot date. Pre-releases are never recorded — the file tracks shipped
reality, matching the dashboard's version-truth convention.

Consumers: local Claude sessions reconcile the 626 Labs dashboard against
this file at session start (see the estate keystone). Zero-dependency
Python 3.11, same house style as npm-stats.py. Auth: uses GITHUB_TOKEN when
set (Actions provides it); anonymous otherwise.
"""

import json
import os
import sys
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKETPLACE = os.path.join(ROOT, ".claude-plugin", "marketplace.json")
OUT = os.path.join(ROOT, "data", "live-versions.json")

# Non-plugin product repos (plugins are derived from marketplace.json).
# Owner defaults to the family account; entries are plain repo names.
OWNER = "estevanhernandez-stack-ed"
APP_REPOS = [
    "ROROROblox",
    "Sanduhr_f-r_Claude",
    "SnipSnap",
    "626-mod-launcher",
    "Celestia3",
    "rororo-ur-task",
    "Ur-OCR",
    "rororo-ur-afk",
]


def _api(path):
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "626labs-live-versions",
            **(
                {"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}"}
                if os.environ.get("GITHUB_TOKEN")
                else {}
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def plugin_repos():
    """owner/repo for every plugin in the marketplace manifest."""
    with open(MARKETPLACE, encoding="utf-8") as f:
        manifest = json.load(f)
    repos = {}
    for p in manifest.get("plugins", []):
        src = p.get("source", {})
        url = src.get("url") or (
            f"https://github.com/{src['repo']}" if src.get("repo") else None
        )
        if not url:
            continue
        slug = url.replace("https://github.com/", "").removesuffix(".git").strip("/")
        repos[p["name"]] = slug
    return repos


def latest_shipped(slug):
    """Newest non-prerelease, non-draft release tag; fallback: newest tag.

    Repos without release automation tag ships but never create release
    objects, so when the newest tag differs from the release's tag it rides
    along as `latest_tag` — the local reconciler applies the judgment.
    """
    releases = _api(f"/repos/{slug}/releases?per_page=15") or []
    tags = _api(f"/repos/{slug}/tags?per_page=1") or []
    newest_tag = tags[0]["name"] if tags else None
    for rel in releases:
        if not rel.get("prerelease") and not rel.get("draft"):
            out = {"version": rel["tag_name"], "source": "release"}
            if newest_tag and newest_tag != rel["tag_name"]:
                out["latest_tag"] = newest_tag
            return out
    if newest_tag:
        return {"version": newest_tag, "source": "tag"}
    return {"version": None, "source": None}


def main():
    products = {}
    entries = dict(sorted(plugin_repos().items()))
    for app in APP_REPOS:
        entries[app] = f"{OWNER}/{app}"
    failures = 0
    for name, slug in sorted(entries.items()):
        try:
            info = latest_shipped(slug)
        except Exception as e:  # one bad repo must not sink the snapshot
            print(f"warn: {slug}: {e}", file=sys.stderr)
            failures += 1
            continue
        products[name] = {"repo": slug, **info}
        print(f"{name}: {info['version']} ({info['source']})")
    if not products:
        print("error: nothing fetched — refusing to write an empty snapshot", file=sys.stderr)
        return 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"$comment": "Shipped versions only (no pre-releases). "
                   "No timestamps by design: the commit date is the snapshot date.",
                   "products": products}, f, indent=2)
        f.write("\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(products)} products, {failures} fetch failures)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
