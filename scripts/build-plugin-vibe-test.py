#!/usr/bin/env python3
"""
Build a Cowork-compatible .plugin file for Vibe Cartographer.

Cowork's Personal Plugins upload flow accepts `.plugin` or `.zip` files.
A `.plugin` file is a zip archive containing the plugin root's contents
(with forward-slash paths), excluding anything that isn't needed at
plugin runtime (dist/, node_modules/, etc.).

See memory/reference_cowork_personal_plugin_format.md for the full spec.

Usage:
    python scripts/build-plugin.py

Output:
    bundles/vibe-cartographer-<version>.plugin
"""
import json
import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_ROOT = REPO_ROOT / "packages" / "vibe-test"
BUNDLES_DIR = REPO_ROOT / "bundles"
EXCLUDE_DIRS = {
    "dist",
    "node_modules",
    "src",
    "scripts",
    "test",
    "__tests__",
    ".vscode",
    ".idea",
    "__pycache__",
}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db"}


def read_version() -> str:
    """Read the plugin version from .claude-plugin/plugin.json."""
    manifest = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
    with open(manifest, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["version"]


def build_plugin(version: str) -> Path:
    """Walk the plugin root and produce a .plugin zip file."""
    if not PLUGIN_ROOT.exists():
        raise FileNotFoundError(f"Plugin root not found: {PLUGIN_ROOT}")

    BUNDLES_DIR.mkdir(exist_ok=True)
    output = BUNDLES_DIR / f"vibe-test-{version}.plugin"

    file_count = 0
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PLUGIN_ROOT):
            # Prune excluded dirs in place so os.walk doesn't descend
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in files:
                if name in EXCLUDE_FILES:
                    continue
                full = Path(root) / name
                # Path relative to the plugin root, forward slashes
                arcname = full.relative_to(PLUGIN_ROOT).as_posix()
                # Defensive: reject anything with ZIP-invalid characters
                if any(c in arcname for c in (":", "*", "?", '"', "<", ">", "|")):
                    print(f"  SKIP (invalid chars): {arcname}", file=sys.stderr)
                    continue
                zipf.write(full, arcname)
                file_count += 1

    return output, file_count


def main() -> int:
    try:
        version = read_version()
    except Exception as e:
        print(f"ERROR: could not read plugin version: {e}", file=sys.stderr)
        return 1

    print(f"Building vibe-cartographer.plugin v{version}")
    print(f"  source: {PLUGIN_ROOT}")

    try:
        output, count = build_plugin(version)
    except Exception as e:
        print(f"ERROR: build failed: {e}", file=sys.stderr)
        return 1

    size_kb = output.stat().st_size / 1024
    print(f"  output: {output}")
    print(f"  entries: {count}")
    print(f"  size: {size_kb:.1f} KB")
    print()
    print("Upload via Cowork/Claude Desktop: Personal plugins -> + -> Create plugin")
    return 0


if __name__ == "__main__":
    sys.exit(main())
