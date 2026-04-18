#!/usr/bin/env python3
"""
Build a Cowork-compatible .plugin file for any package in this monorepo.

A `.plugin` file is a zip archive containing the plugin's RUNTIME
contents (with forward-slash paths). This script uses an **allowlist**
of paths/files known to be plugin-runtime — everything else is excluded.

The allowlist is more conservative than a denylist: when a package
adds a new dev directory (`coverage/`, `dist/`, `tests/`, etc.), the
denylist would silently ship it. The allowlist refuses to ship
anything not explicitly whitelisted.

Usage:
    python scripts/build-plugin.py <package-name>

Examples:
    python scripts/build-plugin.py vibe-test
    python scripts/build-plugin.py vibe-cartographer
    python scripts/build-plugin.py vibe-doc

Output:
    bundles/<package-name>-<version>.plugin
"""
import json
import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BUNDLES_DIR = REPO_ROOT / "bundles"

# Allowlist of top-level entries (dirs and files) that are PART OF THE
# PLUGIN RUNTIME and should ship in a .plugin bundle. Anything not in
# this list is excluded — including dev artifacts (tests, coverage,
# dist, src, scripts), config files (tsconfig, vitest.config,
# package.json, package-lock.json, etc.), and OS junk (.DS_Store).
ALLOWED_TOP_LEVEL = {
    # Required
    ".claude-plugin",        # plugin manifest + slash command defs
    "skills",                # SKILL.md files (the actual plugin behavior)
    "commands",              # alt location for slash command defs
    # Informational (helpful to ship)
    "README.md",
    "CLAUDE.md",             # plugin-level CLAUDE.md if present
    "CHANGELOG.md",
    "LICENSE",
    "LICENSE.md",
    "RESOLVE.md",            # Pattern #15 canonical install resolution
    # Plugin-specific docs that SKILLs reference at runtime
    "framework.md",          # vibe-test, vibe-sec ship their thesis
    "data-contract.md",      # vibe-test ships its data contract
    "architecture",          # vibe-cartographer ships architecture/ defaults
}

# Files/dirs that are explicitly EXCLUDED even if they appear inside
# allowed top-level dirs (e.g. .DS_Store inside skills/).
DENY_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
DENY_DIR_NAMES = {"node_modules", "__pycache__", ".pytest_cache"}


def find_plugin_root(package_name: str) -> Path:
    """Find the plugin root for a package — supports both `plugins/<name>`
    (Cart legacy layout) and `packages/<name>` (monorepo layout)."""
    candidates = [
        REPO_ROOT / "packages" / package_name,
        REPO_ROOT / "plugins" / package_name,
    ]
    for c in candidates:
        if c.exists() and (c / ".claude-plugin" / "plugin.json").exists():
            return c
    raise FileNotFoundError(
        f"No plugin root found for '{package_name}'. Searched:\n  "
        + "\n  ".join(str(c) for c in candidates)
    )


def read_version(plugin_root: Path) -> str:
    manifest = plugin_root / ".claude-plugin" / "plugin.json"
    with open(manifest, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["version"]


def build_plugin(package_name: str) -> tuple[Path, int, int]:
    """Walk the plugin root using the allowlist and produce a .plugin zip."""
    plugin_root = find_plugin_root(package_name)
    version = read_version(plugin_root)

    BUNDLES_DIR.mkdir(exist_ok=True)
    # Cowork upload pipeline derives the plugin name from the filename
    # and rejects non-kebab-case basenames. Version belongs in plugin.json,
    # NOT in the filename — bare `<plugin-name>.plugin` is the convention.
    # We also stamp a `<plugin-name>-<version>.plugin` copy for archival.
    output = BUNDLES_DIR / f"{package_name}.plugin"
    archive = BUNDLES_DIR / f"{package_name}-{version}.plugin"
    for path in (output, archive):
        if path.exists():
            path.unlink()

    file_count = 0
    total_bytes = 0

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zipf:
        for entry in sorted(plugin_root.iterdir()):
            if entry.name not in ALLOWED_TOP_LEVEL:
                continue

            if entry.is_file():
                if entry.name in DENY_FILES:
                    continue
                arcname = entry.name
                zipf.write(entry, arcname)
                file_count += 1
                total_bytes += entry.stat().st_size
                continue

            # Directory — walk recursively
            for root, dirs, files in os.walk(entry):
                # Prune denied dirs in place so os.walk doesn't descend
                dirs[:] = [d for d in dirs if d not in DENY_DIR_NAMES]
                for f in files:
                    if f in DENY_FILES:
                        continue
                    abs_path = Path(root) / f
                    rel_path = abs_path.relative_to(plugin_root)
                    arcname = rel_path.as_posix()  # forward slashes
                    zipf.write(abs_path, arcname)
                    file_count += 1
                    total_bytes += abs_path.stat().st_size

    import shutil
    shutil.copy2(output, archive)

    return output, file_count, total_bytes


def main():
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <package-name>", file=sys.stderr)
        print("Examples: vibe-test, vibe-cartographer, vibe-doc, vibe-sec", file=sys.stderr)
        sys.exit(1)

    package_name = sys.argv[1]
    try:
        plugin_root = find_plugin_root(package_name)
        version = read_version(plugin_root)
        print(f"Building {package_name}.plugin v{version}")
        print(f"  source: {plugin_root}")

        output, file_count, total_bytes = build_plugin(package_name)
        print(f"  output: {output}")
        print(f"  entries: {file_count}")
        print(f"  size: {total_bytes / 1024:.1f} KB")
        print()
        print("Upload via Cowork/Claude Desktop: Personal plugins -> + -> Upload plugin")

    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
