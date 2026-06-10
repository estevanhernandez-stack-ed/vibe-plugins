#!/usr/bin/env python3
"""Marketplace integrity gate for the Vibe Plugins stable channel.

GAP-03 (install-smoke + ref-resolution CI) plus the lint half of GAP-01
(promotion-time quality gate) from docs/quality-net-gap-analysis-2026-06-09.md.

For every entry in .claude-plugin/marketplace.json this script runs:

  a. ref-resolution    — the pinned ref must resolve as a tag on the solo repo
                         (gh api repos/<o>/<r>/git/refs/tags/<tag>). FAIL if
                         missing (the mislabeled-tag class).
  b. install-smoke     — shallow-clone the repo at that tag over HTTPS, the
                         same transport marketplace installs use. FAIL on
                         clone error (the SSH-source-type class).
  c. manifest          — <source.path>/.claude-plugin/plugin.json (repo root
                         for url-type entries) must exist at the pinned ref,
                         parse as JSON, and carry non-empty name / version /
                         description (the silent-manifest class).
  d. version-coherence — plugin.json version must equal the tag with its
                         prefix stripped. Both family tag conventions handled:
                         plain vX.Y.Z, and <plugin>-vX.Y.Z (vibe-test and
                         vibe-sec — extraction-lineage tags; don't normalize).
  e. leak-lint         — no absolute personal paths (C:\\Users\\<name>,
                         /Users/<name>/, /home/<name>/) and no tenant denylist
                         terms in the shipped subtree's text files (the
                         personal/employer-context-leak class). Public GitHub
                         handle and repo-URL shapes are excluded.
  f. registry-refs     — every `npx` / `npm install` / `pip install` package
                         referenced in the shipped subtree's .md code contexts
                         (fenced blocks, inline code spans, `$`-prefixed
                         lines) must exist on its registry (the
                         `npx vibe-doc` 404 / name-squat class). Lookups are
                         cached per run; placeholder tokens are skipped.
  g. drift             — informational, never blocking: commits on the default
                         branch ahead of the pinned tag (gh compare API).

Honesty cap (no-silent-caps rule): this gate does NOT perform a real
`claude /plugin install` — there is no headless Claude Code in CI. It
simulates the loader contract instead: ref resolves, HTTPS clone succeeds,
plugin.json is present / parseable / version-coherent at the pinned ref.
A defect only a live loader would surface can still pass this gate.

Tenant denylist — deliberately NOT hardcoded and NOT committed: committing
the employer name to a public script would recreate the exact leak this lint
exists to catch (thesis-engine v0.2.2 incident). Terms come from the
MARKETPLACE_GATE_DENYLIST env var (comma-separated; optional; empty default
means the denylist half of the leak lint is skipped while the path-shape half
still runs). In CI the value is injected from a repo secret of the same name.
Denylist matches are redacted in all output (shown as [denylist#N]) so public
CI logs never echo the terms either.

Usage:
  python scripts/marketplace_gate.py                   # full gate, all plugins
  python scripts/marketplace_gate.py --only vibe-doc   # one plugin (repeatable
                                                       #   or comma-separated)
  python scripts/marketplace_gate.py --skip-registry   # no npm/pypi lookups
  python scripts/marketplace_gate.py --skip-clone      # refs + drift only
                                                       #   (checks c-f need the
                                                       #   clone; skipped)

Exit codes: 0 all checks pass / 1 at least one FAIL / 2 tool or environment
error (missing git/gh/npm, unreadable manifest, unexpected API failure).

Stdlib only. External commands: git, gh (authenticated), npm (registry check
only — skipped under --skip-registry).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / ".claude-plugin" / "marketplace.json"

# The public GitHub handle — match shapes that are clearly this handle (or a
# repo URL containing it) are not leaks.
PUBLIC_HANDLE = "estevanhernandez-stack-ed"

# Text files the leak lint inspects inside the shipped subtree.
TEXT_EXTENSIONS = {".md", ".json", ".py", ".js", ".ts", ".yml", ".yaml", ".txt"}

# Absolute personal-path shapes. The Windows pattern allows one-or-more
# backslashes so JSON-escaped paths (C:\\Users\\name) are caught too.
PATH_LEAK_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("windows-user-path", re.compile(r"[A-Z]:\\+Users\\+[A-Za-z]+")),
    ("macos-user-path", re.compile(r"/Users/[A-Za-z]+/")),
    ("linux-home-path", re.compile(r"/home/[A-Za-z]+/")),
]

URL_SPAN_RE = re.compile(r"https?://[^\s)\"'<>]+")

# Registry-reference extraction (run only over markdown code contexts).
NPX_RE = re.compile(r"\bnpx\s+((?:-{1,2}[\w=./-]+\s+)*)(\S+)")
NPM_INSTALL_RE = re.compile(r"\bnpm\s+(?:install|i|add)\b(.*)")
PIP_INSTALL_RE = re.compile(r"\bpip3?\s+install\b(.*)")

NPM_NAME_RE = re.compile(r"^(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$")
PYPI_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

PLACEHOLDER_TOKENS = {
    "pkg",
    "package",
    "package-name",
    "your-package",
    "your-package-name",
    "my-package",
    "some-package",
    "example",
    "name",
}

# pip flags that consume the following token (so we skip both).
PIP_FLAGS_WITH_ARG = {
    "-r", "--requirement", "-i", "--index-url", "-f", "--find-links",
    "-t", "--target", "-c", "--constraint", "-e", "--editable",
    "--extra-index-url", "--platform", "--python-version",
}

SUBPROCESS_TIMEOUT = 60  # seconds, per external command
CLONE_TIMEOUT = 180  # seconds — shallow clones are small, but be generous
HTTP_TIMEOUT = 20  # seconds, pypi lookups

PASS, FAIL, WARN, SKIP, INFO, ERROR = "PASS", "FAIL", "WARN", "SKIP", "INFO", "ERROR"


# -----------------------------------------------------------------------------
# Result plumbing
# -----------------------------------------------------------------------------


@dataclass
class Check:
    name: str
    status: str
    evidence: list[str] = field(default_factory=list)


@dataclass
class PluginReport:
    name: str
    ref: str
    owner_repo: str
    path: str  # "" = repo root (url-type entry)
    checks: list[Check] = field(default_factory=list)
    drift_label: str = "n/a"

    def add(self, name: str, status: str, *evidence: str) -> Check:
        check = Check(name, status, list(evidence))
        self.checks.append(check)
        return check

    def get(self, name: str) -> Check | None:
        for c in self.checks:
            if c.name == name:
                return c
        return None

    @property
    def verdict(self) -> str:
        statuses = {c.status for c in self.checks}
        if ERROR in statuses:
            return ERROR
        if FAIL in statuses:
            return FAIL
        return PASS


# -----------------------------------------------------------------------------
# External tools
# -----------------------------------------------------------------------------


def resolve_tool(name: str) -> list[str] | None:
    """Resolve an external command to an argv prefix, or None if absent.

    On Windows, .cmd/.bat shims (npm) can't be exec'd directly by
    CreateProcess — wrap them in `cmd /c`.
    """
    path = shutil.which(name)
    if path is None:
        return None
    if path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path]
    return [path]


def run(
    argv: list[str], timeout: int = SUBPROCESS_TIMEOUT
) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"  # never hang on a credential prompt
    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        env=env,
    )


def force_rmtree(path: Path) -> None:
    """rmtree that clears read-only bits (git pack files on Windows)."""

    def _clear_and_retry(func, p, _exc):
        try:
            os.chmod(p, stat.S_IWRITE)
            func(p)
        except OSError:
            pass  # best-effort temp cleanup; never fail the gate over it

    try:
        if sys.version_info >= (3, 12):
            shutil.rmtree(path, onexc=_clear_and_retry)
        else:
            shutil.rmtree(path, onerror=_clear_and_retry)
    except OSError:
        pass


# -----------------------------------------------------------------------------
# Manifest helpers
# -----------------------------------------------------------------------------


def parse_owner_repo(url: str) -> str:
    """'https://github.com/Owner/Repo.git' -> 'Owner/Repo'."""
    tail = url.split("github.com/", 1)[1]
    tail = tail.rstrip("/")
    if tail.endswith(".git"):
        tail = tail[: -len(".git")]
    return tail


def strip_tag_prefix(tag: str, plugin_name: str) -> str:
    """Tag -> bare version. Handles vX.Y.Z and <plugin>-vX.Y.Z conventions."""
    prefixed = f"{plugin_name}-v"
    if tag.startswith(prefixed):
        return tag[len(prefixed):]
    if tag.startswith("v"):
        return tag[1:]
    return tag


# -----------------------------------------------------------------------------
# Check a — ref resolution
# -----------------------------------------------------------------------------


def check_ref_resolution(report: PluginReport, gh: list[str]) -> bool:
    endpoint = f"repos/{report.owner_repo}/git/refs/tags/{report.ref}"
    try:
        proc = run(gh + ["api", endpoint])
    except subprocess.TimeoutExpired:
        report.add("ref-resolution", ERROR, f"gh api {endpoint} timed out")
        return False
    if proc.returncode != 0:
        if "404" in (proc.stderr or "") or "Not Found" in (proc.stderr or ""):
            report.add(
                "ref-resolution",
                FAIL,
                f"refs/tags/{report.ref} not found on {report.owner_repo}",
            )
        else:
            report.add(
                "ref-resolution",
                ERROR,
                f"gh api {endpoint} failed: {(proc.stderr or '').strip()[:200]}",
            )
        return False

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        report.add("ref-resolution", ERROR, "unparseable gh api response")
        return False

    # The refs endpoint returns a list on prefix matches — demand the exact ref.
    expected = f"refs/tags/{report.ref}"
    candidates = data if isinstance(data, list) else [data]
    for item in candidates:
        if isinstance(item, dict) and item.get("ref") == expected:
            sha = (item.get("object") or {}).get("sha", "?")
            report.add("ref-resolution", PASS, f"{expected} -> {sha[:12]}")
            return True
    report.add(
        "ref-resolution",
        FAIL,
        f"{expected} did not resolve exactly (prefix-only match)",
    )
    return False


# -----------------------------------------------------------------------------
# Check b — shallow clone (install smoke)
# -----------------------------------------------------------------------------


def check_clone(report: PluginReport, git: list[str], dest: Path) -> bool:
    url = clone_url_for(report)
    argv = git + [
        "-c", "advice.detachedHead=false",
        "clone", "--depth", "1", "--branch", report.ref, "--quiet",
        url, str(dest),
    ]
    try:
        proc = run(argv, timeout=CLONE_TIMEOUT)
    except subprocess.TimeoutExpired:
        report.add("clone", FAIL, f"clone of {url} at {report.ref} timed out")
        return False
    if proc.returncode != 0:
        report.add(
            "clone",
            FAIL,
            f"git clone --depth 1 --branch {report.ref} {url} failed:",
            (proc.stderr or "").strip()[:300],
        )
        return False
    report.add("clone", PASS, f"shallow HTTPS clone at {report.ref} OK")
    return True


def clone_url_for(report: PluginReport) -> str:
    return f"https://github.com/{report.owner_repo}.git"


# -----------------------------------------------------------------------------
# Checks c + d — plugin.json presence/shape + version coherence
# -----------------------------------------------------------------------------


def check_manifest_and_version(report: PluginReport, subtree: Path) -> None:
    rel = (Path(report.path) if report.path else Path(".")) / ".claude-plugin" / "plugin.json"
    manifest_file = subtree / ".claude-plugin" / "plugin.json"

    if not manifest_file.is_file():
        report.add("manifest", FAIL, f"{rel.as_posix()} missing at {report.ref}")
        report.add("version-coherence", SKIP, "no plugin.json to compare")
        return

    try:
        data = json.loads(manifest_file.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError) as exc:
        report.add("manifest", FAIL, f"{rel.as_posix()} unparseable: {exc}")
        report.add("version-coherence", SKIP, "no parseable plugin.json")
        return

    missing = [
        key
        for key in ("name", "version", "description")
        if not (isinstance(data.get(key), str) and data.get(key).strip())
    ]
    if missing:
        report.add(
            "manifest",
            FAIL,
            f"{rel.as_posix()}: empty/missing field(s): {', '.join(missing)}",
        )
        report.add("version-coherence", SKIP, "manifest fields incomplete")
        return

    evidence = [f"{rel.as_posix()}: name={data['name']} version={data['version']}"]
    if data["name"] != report.name:
        # Informational only — the loader keys off plugin.json, the
        # marketplace entry name is the storefront label.
        evidence.append(
            f"note: plugin.json name '{data['name']}' != marketplace entry "
            f"name '{report.name}'"
        )
    report.add("manifest", PASS, *evidence)

    expected = strip_tag_prefix(report.ref, report.name)
    actual = data["version"].strip()
    if actual == expected:
        report.add(
            "version-coherence",
            PASS,
            f"tag {report.ref} -> {expected} == plugin.json {actual}",
        )
    else:
        report.add(
            "version-coherence",
            FAIL,
            f"tag {report.ref} strips to {expected} but plugin.json says {actual}",
        )


# -----------------------------------------------------------------------------
# Check e — leak lint
# -----------------------------------------------------------------------------


def iter_text_files(subtree: Path) -> list[Path]:
    files: list[Path] = []
    for p in sorted(subtree.rglob("*")):
        if not p.is_file():
            continue
        if ".git" in p.relative_to(subtree).parts:
            continue
        if p.suffix.lower() in TEXT_EXTENSIONS:
            files.append(p)
    return files


def _match_is_excluded(line: str, span: tuple[int, int]) -> bool:
    """True when the match is clearly the public handle or part of a URL."""
    start, end = span
    for m in URL_SPAN_RE.finditer(line):
        if start >= m.start() and end <= m.end():
            return True
    idx = line.find(PUBLIC_HANDLE)
    while idx != -1:
        if start >= idx and end <= idx + len(PUBLIC_HANDLE):
            return True
        idx = line.find(PUBLIC_HANDLE, idx + 1)
    return False


def check_leaks(
    report: PluginReport,
    subtree: Path,
    denylist: list[str],
    paths_severity: str = "fail",
) -> None:
    """Leak lint with a two-tier severity model.

    Denylist (tenant/employer) terms ALWAYS fail — that class is the
    thesis-engine v0.2.2 incident and there is no acceptable residual.
    Personal-username path shapes fail by default, but CI may run with
    --paths-severity warn while the known fixture/docstring leaks shipped in
    pre-gate tags burn down (tracked in docs/conventions/
    promotion-checklist.md) — a permanently-red gate trains everyone to
    ignore it, which protects nothing. Flip CI to fail once the burn-down
    list is empty.
    """
    path_findings: list[str] = []
    denylist_findings: list[str] = []
    files = iter_text_files(subtree)
    denylist_res = [
        (i, re.compile(re.escape(term), re.IGNORECASE))
        for i, term in enumerate(denylist, start=1)
    ]

    for file in files:
        rel = file.relative_to(subtree).as_posix()
        try:
            text = file.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            path_findings.append(f"{rel}: unreadable ({exc})")
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for label, pattern in PATH_LEAK_PATTERNS:
                for m in pattern.finditer(line):
                    if _match_is_excluded(line, m.span()):
                        continue
                    path_findings.append(f"{rel}:{lineno} [{label}] {m.group(0)}")
            for idx, term_re in denylist_res:
                for m in term_re.finditer(line):
                    if _match_is_excluded(line, m.span()):
                        continue
                    # Redact: never echo the term into (public) CI logs.
                    context = (
                        line[: m.start()] + f"[denylist#{idx}]" + line[m.end():]
                    ).strip()
                    denylist_findings.append(
                        f"{rel}:{lineno} [denylist#{idx}] {context[:160]}"
                    )

    denylist_note = (
        f"{len(denylist)} denylist term(s)" if denylist else "denylist empty (env unset)"
    )
    findings = denylist_findings + path_findings
    if denylist_findings:
        status = FAIL  # tenant terms: no warn tier, ever
    elif path_findings:
        status = FAIL if paths_severity == "fail" else WARN
    else:
        status = PASS

    if findings:
        tier_note = (
            "" if status == FAIL
            else " [paths-severity=warn: path-shape findings are non-blocking"
            " until the burn-down list clears]"
        )
        report.add(
            "leak-lint",
            status,
            f"{len(findings)} finding(s) across {len(files)} text files "
            f"({denylist_note}){tier_note}:",
            *findings[:50],
            *( [f"... and {len(findings) - 50} more"] if len(findings) > 50 else [] ),
        )
    else:
        report.add(
            "leak-lint",
            PASS,
            f"{len(files)} text files scanned, 0 findings ({denylist_note})",
        )


# -----------------------------------------------------------------------------
# Check f — registry existence
# -----------------------------------------------------------------------------


def extract_code_segments(md_text: str) -> list[str]:
    """Code contexts inside markdown: fenced blocks, inline spans, $-lines.

    Registry commands in prose (no code formatting) are deliberately out of
    scope — scanning prose for `npm install <next word>` flags ordinary
    sentences. The motivating incident (`npx vibe-doc`) lived in code blocks.
    """
    segments: list[str] = []
    in_fence = False
    fence_marker = ""
    for line in md_text.splitlines():
        stripped = line.strip()
        if in_fence:
            if stripped.startswith(fence_marker):
                in_fence = False
            else:
                segments.append(line)
            continue
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = True
            fence_marker = stripped[:3]
            continue
        for m in re.finditer(r"`([^`]+)`", line):
            segments.append(m.group(1))
        if re.match(r"^\s*\$\s+\S", line):
            segments.append(line.lstrip().lstrip("$").strip())
    return segments


def _strip_npm_version(token: str) -> str:
    at = token.rfind("@")
    if at > 0:
        return token[:at]
    return token


def _is_placeholder(token: str) -> bool:
    if "<" in token or ">" in token:
        return True
    if token.lower() in PLACEHOLDER_TOKENS:
        return True
    if token.startswith((".", "/", "~", "http", "git+", "file:")):
        return True
    if token.endswith((".tgz", ".tar.gz")):
        return True
    return False


def extract_registry_refs(md_text: str) -> set[tuple[str, str]]:
    """Return {(registry, package)} referenced in the markdown's code contexts."""
    refs: set[tuple[str, str]] = set()
    for segment in extract_code_segments(md_text):
        for m in NPX_RE.finditer(segment):
            token = _strip_npm_version(m.group(2))
            if not _is_placeholder(token) and NPM_NAME_RE.match(token):
                refs.add(("npm", token))
        for m in NPM_INSTALL_RE.finditer(segment):
            for token in m.group(1).split():
                if token.startswith("-"):
                    continue
                if token in {"&&", "||", ";", "|"} or token.startswith("#"):
                    break
                token = _strip_npm_version(token)
                if _is_placeholder(token) or not NPM_NAME_RE.match(token):
                    break  # stop at the first non-package token (prose guard)
                refs.add(("npm", token))
        for m in PIP_INSTALL_RE.finditer(segment):
            tokens = m.group(1).split()
            skip_next = False
            for token in tokens:
                if skip_next:
                    skip_next = False
                    continue
                if token in PIP_FLAGS_WITH_ARG:
                    skip_next = True
                    continue
                if token.startswith("-"):
                    continue
                if token in {"&&", "||", ";", "|"} or token.startswith("#"):
                    break
                bare = re.split(r"[=<>!~]", token.split("[")[0])[0]
                if _is_placeholder(bare) or not PYPI_NAME_RE.match(bare):
                    break
                refs.add(("pypi", bare))
    return refs


# Per-run lookup cache: (registry, package) -> "exists" | "missing" | "inconclusive: ..."
_registry_cache: dict[tuple[str, str], str] = {}


def lookup_npm(pkg: str, npm: list[str]) -> str:
    try:
        proc = run(npm + ["view", pkg, "version"])
    except subprocess.TimeoutExpired:
        return "inconclusive: npm view timed out"
    if proc.returncode == 0:
        return "exists"
    err = (proc.stderr or "") + (proc.stdout or "")
    if "E404" in err or "404" in err:
        return "missing"
    return f"inconclusive: npm exit {proc.returncode}"


def lookup_pypi(pkg: str) -> str:
    url = f"https://pypi.org/pypi/{pkg}/json"
    req = urllib.request.Request(url, headers={"User-Agent": "marketplace-gate"})
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return "exists" if resp.status == 200 else f"inconclusive: HTTP {resp.status}"
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return "missing"
        return f"inconclusive: HTTP {exc.code}"
    except urllib.error.URLError as exc:
        return f"inconclusive: network error ({exc.reason})"


def check_registry_refs(report: PluginReport, subtree: Path, npm: list[str] | None) -> None:
    refs_with_sites: dict[tuple[str, str], str] = {}
    md_files = [f for f in iter_text_files(subtree) if f.suffix.lower() == ".md"]
    for file in md_files:
        rel = file.relative_to(subtree).as_posix()
        try:
            text = file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for ref in extract_registry_refs(text):
            refs_with_sites.setdefault(ref, rel)

    if not refs_with_sites:
        report.add(
            "registry-refs",
            PASS,
            f"no registry references found in {len(md_files)} .md files",
        )
        return

    failures: list[str] = []
    warnings: list[str] = []
    verified: list[str] = []
    for (registry, pkg), first_site in sorted(refs_with_sites.items()):
        key = (registry, pkg)
        if key not in _registry_cache:
            if registry == "npm":
                if npm is None:
                    _registry_cache[key] = "inconclusive: npm not on PATH"
                else:
                    _registry_cache[key] = lookup_npm(pkg, npm)
            else:
                _registry_cache[key] = lookup_pypi(pkg)
        verdict = _registry_cache[key]
        if verdict == "exists":
            verified.append(f"{registry}:{pkg}")
        elif verdict == "missing":
            failures.append(
                f"{registry}:{pkg} does not exist (referenced in {first_site})"
            )
        else:
            warnings.append(f"{registry}:{pkg} {verdict} (referenced in {first_site})")

    if failures:
        report.add("registry-refs", FAIL, *failures, *warnings)
    elif warnings:
        report.add(
            "registry-refs",
            WARN,
            *warnings,
            f"verified: {', '.join(verified) if verified else '(none)'}",
        )
    else:
        report.add(
            "registry-refs",
            PASS,
            f"{len(verified)} unique package(s) verified: {', '.join(verified)}",
        )


# -----------------------------------------------------------------------------
# Check g — drift (informational)
# -----------------------------------------------------------------------------


def check_drift(report: PluginReport, gh: list[str]) -> None:
    endpoint = (
        f"repos/{report.owner_repo}/compare/{report.ref}...HEAD?per_page=1"
    )
    try:
        proc = run(
            gh
            + [
                "api",
                endpoint,
                "--jq",
                "{ahead: .ahead_by, behind: .behind_by, status: .status}",
            ]
        )
    except subprocess.TimeoutExpired:
        report.add("drift", INFO, "compare API timed out - drift unknown")
        return
    if proc.returncode != 0:
        report.add(
            "drift",
            INFO,
            f"compare API failed - drift unknown: {(proc.stderr or '').strip()[:160]}",
        )
        return
    try:
        data = json.loads(proc.stdout)
        ahead = int(data["ahead"])
        behind = int(data["behind"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        report.add("drift", INFO, "unparseable compare response - drift unknown")
        return

    report.drift_label = f"+{ahead}"
    if ahead == 0:
        report.add("drift", INFO, f"default branch == {report.ref} (0 ahead)")
    else:
        suffix = f", tag {behind} behind head lineage" if behind else ""
        report.add(
            "drift",
            INFO,
            f"default branch is {ahead} commit(s) ahead of {report.ref}{suffix} "
            f"(informational - unreleased work exists on main)",
        )


# -----------------------------------------------------------------------------
# Orchestration
# -----------------------------------------------------------------------------


def gate_plugin(
    entry: dict,
    gh: list[str],
    git: list[str],
    npm: list[str] | None,
    denylist: list[str],
    skip_clone: bool,
    skip_registry: bool,
    paths_severity: str = "fail",
) -> PluginReport:
    source = entry["source"]
    report = PluginReport(
        name=entry["name"],
        ref=source["ref"],
        owner_repo=parse_owner_repo(source["url"]),
        path=source.get("path", ""),
    )

    ref_ok = check_ref_resolution(report, gh)

    if skip_clone:
        for name in ("clone", "manifest", "version-coherence", "leak-lint", "registry-refs"):
            report.add(name, SKIP, "--skip-clone")
    elif not ref_ok:
        for name in ("clone", "manifest", "version-coherence", "leak-lint", "registry-refs"):
            report.add(name, SKIP, "ref did not resolve")
    else:
        tmpdir = Path(tempfile.mkdtemp(prefix=f"mkgate-{report.name}-"))
        clone_dir = tmpdir / "repo"
        try:
            if check_clone(report, git, clone_dir):
                subtree = clone_dir / report.path if report.path else clone_dir
                if not subtree.is_dir():
                    report.add(
                        "manifest",
                        FAIL,
                        f"source.path '{report.path}' does not exist at {report.ref}",
                    )
                    report.add("version-coherence", SKIP, "no subtree")
                    report.add("leak-lint", SKIP, "no subtree")
                    report.add("registry-refs", SKIP, "no subtree")
                else:
                    check_manifest_and_version(report, subtree)
                    check_leaks(report, subtree, denylist, paths_severity)
                    if skip_registry:
                        report.add("registry-refs", SKIP, "--skip-registry")
                    else:
                        check_registry_refs(report, subtree, npm)
            else:
                for name in ("manifest", "version-coherence", "leak-lint", "registry-refs"):
                    report.add(name, SKIP, "clone failed")
        finally:
            force_rmtree(tmpdir)

    check_drift(report, gh)
    return report


def print_report(report: PluginReport) -> None:
    location = report.path or "(repo root)"
    print(f"== {report.name} @ {report.ref}  [{report.owner_repo} :: {location}]")
    for check in report.checks:
        head = check.evidence[0] if check.evidence else ""
        print(f"  [{check.status:<4}] {check.name:<17} {head}")
        for line in check.evidence[1:]:
            print(f"          {'':<17} {line}")
    print()


def print_summary(reports: list[PluginReport]) -> None:
    columns = [
        "ref-resolution", "clone", "manifest", "version-coherence",
        "leak-lint", "registry-refs",
    ]
    headers = ["plugin", "ref", "tag", "clone", "manifest", "version", "leaks", "registry", "drift", "result"]
    rows: list[list[str]] = []
    for r in reports:
        row = [r.name, r.ref]
        for col in columns:
            check = r.get(col)
            row.append(check.status if check else "-")
        row.append(r.drift_label)
        row.append(r.verdict)
        rows.append(row)

    widths = [
        max(len(headers[i]), *(len(row[i]) for row in rows)) for i in range(len(headers))
    ]
    print("=" * (sum(widths) + 2 * (len(widths) - 1)))
    print("  marketplace gate - summary")
    print("=" * (sum(widths) + 2 * (len(widths) - 1)))
    print("  ".join(h.ljust(widths[i]) for i, h in enumerate(headers)))
    print("  ".join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        print("  ".join(cell.ljust(widths[i]) for i, cell in enumerate(row)))
    print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Vibe Plugins marketplace integrity gate (GAP-03 + GAP-01 lint half)."
    )
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="PLUGIN",
        help="gate only this plugin (repeatable, or comma-separated)",
    )
    parser.add_argument(
        "--skip-registry",
        action="store_true",
        help="skip npm/pypi registry-existence lookups",
    )
    parser.add_argument(
        "--skip-clone",
        action="store_true",
        help="skip cloning (runs only ref-resolution + drift)",
    )
    parser.add_argument(
        "--paths-severity",
        choices=("fail", "warn"),
        default="fail",
        help=(
            "severity of personal-path-shape leak findings (default: fail). "
            "Denylist terms always fail regardless. CI runs warn until the "
            "pre-gate burn-down list in docs/conventions/"
            "promotion-checklist.md clears."
        ),
    )
    args = parser.parse_args(argv)

    # Keep output safe on legacy Windows console encodings.
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout.reconfigure(errors="replace")

    gh = resolve_tool("gh")
    git = resolve_tool("git")
    npm = resolve_tool("npm")
    if gh is None:
        print("tool error: gh not found on PATH (required)", file=sys.stderr)
        return 2
    if git is None and not args.skip_clone:
        print("tool error: git not found on PATH (required)", file=sys.stderr)
        return 2
    if npm is None and not (args.skip_registry or args.skip_clone):
        print(
            "tool error: npm not found on PATH (required for registry-refs; "
            "use --skip-registry to run without it)",
            file=sys.stderr,
        )
        return 2

    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        plugins = manifest["plugins"]
    except (OSError, json.JSONDecodeError, KeyError) as exc:
        print(f"tool error: cannot read {MANIFEST_PATH}: {exc}", file=sys.stderr)
        return 2

    only: set[str] = set()
    for value in args.only:
        only.update(p.strip() for p in value.split(",") if p.strip())
    if only:
        known = {p["name"] for p in plugins}
        unknown = only - known
        if unknown:
            print(
                f"tool error: --only plugin(s) not in manifest: {', '.join(sorted(unknown))}",
                file=sys.stderr,
            )
            return 2
        plugins = [p for p in plugins if p["name"] in only]

    denylist = [
        term.strip()
        for term in os.environ.get("MARKETPLACE_GATE_DENYLIST", "").split(",")
        if term.strip()
    ]

    print(f"marketplace gate: {len(plugins)} plugin(s) from {MANIFEST_PATH.name}")
    print(
        f"  denylist: {len(denylist)} term(s) from MARKETPLACE_GATE_DENYLIST "
        f"(terms never printed)"
    )
    print(
        "  honesty cap: simulates the loader contract (ref/clone/plugin.json); "
        "not a real `claude /plugin install`"
    )
    print()

    reports: list[PluginReport] = []
    for entry in plugins:
        report = gate_plugin(
            entry,
            gh=gh,
            git=git or [],
            npm=npm,
            denylist=denylist,
            skip_clone=args.skip_clone,
            skip_registry=args.skip_registry,
            paths_severity=args.paths_severity,
        )
        print_report(report)
        reports.append(report)

    print_summary(reports)

    verdicts = [r.verdict for r in reports]
    if ERROR in verdicts:
        print("RESULT: TOOL ERROR - at least one check could not run")
        return 2
    if FAIL in verdicts:
        failed = ", ".join(r.name for r in reports if r.verdict == FAIL)
        print(f"RESULT: FAIL - {failed}")
        return 1
    print(f"RESULT: PASS - {len(reports)}/{len(reports)} plugins clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
