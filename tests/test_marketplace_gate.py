"""Offline tests for scripts/marketplace_gate.py.

Stdlib unittest only, matching the script's zero-dependency house style:

    python -m unittest discover -s tests -v

Nothing here touches the network, gh, git, or npm. The external-command
helpers are replaced with fakes so the checks' decision logic is exercised
on its own.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import marketplace_gate as gate  # noqa: E402


def entry(**source_overrides) -> dict:
    source = {
        "source": "git-subdir",
        "url": "https://github.com/estevanhernandez-stack-ed/vibe-doc",
        "path": "packages/vibe-doc",
        "ref": "v0.8.2",
    }
    source.update(source_overrides)
    return {"name": "vibe-doc", "source": {k: v for k, v in source.items() if v is not None}}


def report(name="vibe-doc", ref="v1.2.3", path="") -> gate.PluginReport:
    return gate.PluginReport(name=name, ref=ref, owner_repo="o/r", path=path)


def completed(returncode=0, stdout="", stderr="") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess([], returncode, stdout=stdout, stderr=stderr)


class StripTagPrefixTests(unittest.TestCase):
    def test_plain_v_tag(self):
        self.assertEqual(gate.strip_tag_prefix("v1.11.0", "vibe-cartographer"), "1.11.0")

    def test_plugin_prefixed_tag(self):
        # vibe-test / vibe-sec extraction-lineage convention.
        self.assertEqual(gate.strip_tag_prefix("vibe-test-v0.4.0", "vibe-test"), "0.4.0")
        self.assertEqual(gate.strip_tag_prefix("vibe-sec-v0.10.0", "vibe-sec"), "0.10.0")

    def test_other_plugins_prefix_is_not_stripped_as_own(self):
        # A vibe-sec tag on a vibe-test entry must not strip cleanly to a version.
        self.assertEqual(gate.strip_tag_prefix("vibe-sec-v1.0.0", "vibe-test"), "vibe-sec-v1.0.0")

    def test_bare_version(self):
        self.assertEqual(gate.strip_tag_prefix("1.0.0", "x"), "1.0.0")


class ParseOwnerRepoTests(unittest.TestCase):
    def test_shapes(self):
        cases = {
            "https://github.com/Owner/Repo": "Owner/Repo",
            "https://github.com/Owner/Repo.git": "Owner/Repo",
            "https://github.com/Owner/Repo/": "Owner/Repo",
            "https://github.com/o/vibe.insights.git": "o/vibe.insights",
        }
        for url, expected in cases.items():
            with self.subTest(url=url):
                self.assertEqual(gate.parse_owner_repo(url), expected)

    def test_rejects_non_github_and_traversal(self):
        for url in (
            "",
            "git@github.com:o/r.git",
            "http://github.com/o/r",
            "https://gitlab.com/o/r",
            "https://evil.example/github.com/o/r",
            "https://github.com/o/r/extra",
            "https://github.com/o/..",
            "https://github.com/o/r?x=1",
        ):
            with self.subTest(url=url):
                self.assertIsNone(gate.parse_owner_repo(url))


class ValidateEntryTests(unittest.TestCase):
    def test_valid_git_subdir_and_url_entries(self):
        self.assertEqual(gate.validate_entry(entry()), [])
        self.assertEqual(
            gate.validate_entry(
                entry(source="url", url="https://github.com/o/vibe-insights.git", path=None)
            ),
            [],
        )
        self.assertEqual(gate.validate_entry(entry(ref="vibe-test-v0.4.0")), [])

    def test_github_source_type_is_banned(self):
        problems = gate.validate_entry(entry(source="github"))
        self.assertTrue(any("banned" in p for p in problems), problems)

    def test_unknown_source_type(self):
        self.assertTrue(gate.validate_entry(entry(source="npm")))

    def test_branch_and_sha_refs_rejected(self):
        for ref in ("main", "master", "HEAD", "0123abc", "0123456789abcdef0123456789abcdef01234567"):
            with self.subTest(ref=ref):
                self.assertTrue(gate.validate_entry(entry(ref=ref)))

    def test_unsafe_refs_rejected(self):
        for ref in ("", "--upload-pack=x", "../../user", "v1.0.0 ", "v1;rm", "v1/..", "v1.lock", "v1?x"):
            with self.subTest(ref=ref):
                self.assertTrue(gate.validate_entry(entry(ref=ref)))

    def test_missing_ref(self):
        self.assertTrue(gate.validate_entry(entry(ref=None)))

    def test_unsafe_paths_rejected(self):
        for path in ("/etc", "../../..", "plugins/../../x", "C:\\Users", "\\\\server\\share", "~/x"):
            with self.subTest(path=path):
                self.assertTrue(gate.validate_entry(entry(path=path)))

    def test_git_subdir_requires_path(self):
        self.assertTrue(gate.validate_entry(entry(path=None)))

    def test_non_github_url_rejected(self):
        self.assertTrue(gate.validate_entry(entry(url="git@github.com:o/r.git")))

    def test_missing_source(self):
        self.assertEqual(gate.validate_entry({"name": "x"}), ["entry has no source object"])


class LiveManifestTests(unittest.TestCase):
    """The committed manifest must satisfy the shape rules the gate enforces."""

    def test_every_entry_is_valid(self):
        manifest = json.loads(gate.MANIFEST_PATH.read_text(encoding="utf-8"))
        names = [p["name"] for p in manifest["plugins"]]
        self.assertEqual(len(names), len(set(names)), "duplicate plugin names")
        for plugin in manifest["plugins"]:
            with self.subTest(plugin=plugin["name"]):
                self.assertEqual(gate.validate_entry(plugin), [])


class VerdictTests(unittest.TestCase):
    def test_verdict_precedence(self):
        r = report()
        r.add("a", gate.PASS)
        r.add("b", gate.WARN)
        r.add("c", gate.INFO)
        self.assertEqual(r.verdict, gate.PASS)
        r.add("d", gate.FAIL)
        self.assertEqual(r.verdict, gate.FAIL)
        r.add("e", gate.ERROR)
        self.assertEqual(r.verdict, gate.ERROR)


class ManifestAndVersionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.subtree = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write_manifest(self, data, raw=None):
        d = self.subtree / ".claude-plugin"
        d.mkdir(parents=True, exist_ok=True)
        (d / "plugin.json").write_text(raw if raw is not None else json.dumps(data), encoding="utf-8")

    def statuses(self, r):
        return {c.name: c.status for c in r.checks}

    def test_missing_manifest(self):
        r = report()
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r), {"manifest": gate.FAIL, "version-coherence": gate.SKIP})

    def test_unparseable_manifest(self):
        self.write_manifest(None, raw="{nope")
        r = report()
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r)["manifest"], gate.FAIL)

    def test_blank_fields(self):
        self.write_manifest({"name": "vibe-doc", "version": " ", "description": "d"})
        r = report()
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r)["manifest"], gate.FAIL)
        self.assertIn("version", r.get("manifest").evidence[0])

    def test_version_matches_tag(self):
        self.write_manifest({"name": "vibe-doc", "version": "1.2.3", "description": "d"})
        r = report(ref="v1.2.3")
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r), {"manifest": gate.PASS, "version-coherence": gate.PASS})

    def test_prefixed_tag_matches(self):
        self.write_manifest({"name": "vibe-test", "version": "0.4.0", "description": "d"})
        r = report(name="vibe-test", ref="vibe-test-v0.4.0")
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r)["version-coherence"], gate.PASS)

    def test_version_mismatch_fails(self):
        self.write_manifest({"name": "vibe-doc", "version": "1.2.2", "description": "d"})
        r = report(ref="v1.2.3")
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r)["version-coherence"], gate.FAIL)

    def test_bom_is_tolerated(self):
        self.write_manifest(
            None, raw="\ufeff" + json.dumps({"name": "vibe-doc", "version": "1.2.3", "description": "d"})
        )
        r = report(ref="v1.2.3")
        gate.check_manifest_and_version(r, self.subtree)
        self.assertEqual(self.statuses(r)["manifest"], gate.PASS)


class LeakLintTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.subtree = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, rel, text):
        p = self.subtree / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")

    def lint(self, denylist=(), severity="fail"):
        r = report()
        gate.check_leaks(r, self.subtree, list(denylist), severity)
        return r.get("leak-lint")

    def test_clean_tree_passes(self):
        self.write("README.md", "Install with /plugin install vibe-doc@vibe-plugins\n")
        self.assertEqual(self.lint().status, gate.PASS)

    def test_personal_paths_fail_by_default(self):
        self.write("a.md", "see C:\\Users\\someone\\proj\n")
        self.write("b.json", '{"p": "C:\\\\Users\\\\someone"}\n')
        self.write("c.py", "ROOT = '/Users/someone/x'\nHOME = '/home/someone/y'\n")
        check = self.lint()
        self.assertEqual(check.status, gate.FAIL)
        joined = "\n".join(check.evidence)
        for label in ("windows-user-path", "macos-user-path", "linux-home-path"):
            self.assertIn(label, joined)

    def test_paths_warn_tier(self):
        self.write("a.md", "/home/someone/x\n")
        self.assertEqual(self.lint(severity="warn").status, gate.WARN)

    def test_urls_and_public_handle_are_excluded(self):
        self.write(
            "a.md",
            "https://example.com/home/someone/x and https://github.com/estevanhernandez-stack-ed/x\n",
        )
        self.assertEqual(self.lint(denylist=["stack-ed"]).status, gate.PASS)

    def test_denylist_always_fails_and_is_redacted(self):
        self.write("a.md", "Built at SecretCorp for the team\n")
        check = self.lint(denylist=["secretcorp"], severity="warn")
        self.assertEqual(check.status, gate.FAIL)
        joined = "\n".join(check.evidence)
        self.assertIn("[denylist#1]", joined)
        self.assertNotIn("secretcorp", joined.lower())

    def test_non_text_and_git_files_are_skipped(self):
        self.write("img.png", "/home/someone/x")
        self.write(".git/config.md", "/home/someone/x")
        self.assertEqual(self.lint().status, gate.PASS)

    def test_findings_are_capped(self):
        self.write("a.md", "/home/someone/x\n" * 60)
        check = self.lint()
        self.assertEqual(check.evidence[-1], "... and 10 more")


class RegistryRefExtractionTests(unittest.TestCase):
    def test_code_contexts_only(self):
        md = (
            "Run npm install lodash in prose (ignored).\n"
            "```bash\nnpx @esthernandez/vibe-doc-cli@latest scan\nnpm i -D typescript vitest\n```\n"
            "Inline `pip install requests==2.0 rich[jupyter]` span.\n"
            "$ npx --yes create-thing\n"
        )
        self.assertEqual(
            gate.extract_registry_refs(md),
            {
                ("npm", "@esthernandez/vibe-doc-cli"),
                ("npm", "typescript"),
                ("npm", "vitest"),
                ("npm", "create-thing"),
                ("pypi", "requests"),
                ("pypi", "rich"),
            },
        )

    def test_placeholders_and_local_paths_skipped(self):
        md = "```\nnpx <your-cli>\nnpm install ./local.tgz\npip install -r requirements.txt\nnpm install package-name\n```\n"
        self.assertEqual(gate.extract_registry_refs(md), set())

    def test_stops_at_shell_operators(self):
        md = "`npm install left-pad && echo done`"
        self.assertEqual(gate.extract_registry_refs(md), {("npm", "left-pad")})

    def test_tilde_fence(self):
        md = "~~~\nnpx cowsay\n~~~\nnpx outside-fence\n"
        self.assertEqual(gate.extract_registry_refs(md), {("npm", "cowsay")})


class RefResolutionTests(unittest.TestCase):
    def run_with(self, proc):
        r = report(ref="v1.2.3")
        with mock.patch.object(gate, "run", return_value=proc):
            ok = gate.check_ref_resolution(r, ["gh"])
        return ok, r.get("ref-resolution")

    def test_exact_match_passes(self):
        body = json.dumps({"ref": "refs/tags/v1.2.3", "object": {"sha": "a" * 40}})
        ok, check = self.run_with(completed(stdout=body))
        self.assertTrue(ok)
        self.assertEqual(check.status, gate.PASS)

    def test_prefix_only_match_fails(self):
        body = json.dumps([{"ref": "refs/tags/v1.2.30"}, {"ref": "refs/tags/v1.2.31"}])
        ok, check = self.run_with(completed(stdout=body))
        self.assertFalse(ok)
        self.assertEqual(check.status, gate.FAIL)

    def test_404_is_fail_other_errors_are_error(self):
        _, check = self.run_with(completed(1, stderr="gh: Not Found (HTTP 404)"))
        self.assertEqual(check.status, gate.FAIL)
        _, check = self.run_with(completed(1, stderr="gh: Bad credentials (HTTP 401)"))
        self.assertEqual(check.status, gate.ERROR)


class GatePluginTests(unittest.TestCase):
    def test_invalid_entry_never_reaches_gh_or_git(self):
        bad = entry(path="../../../home/runner")
        with mock.patch.object(gate, "run", side_effect=AssertionError("external call")):
            r = gate.gate_plugin(
                bad, gh=["gh"], git=["git"], npm=None, denylist=[],
                skip_clone=False, skip_registry=True,
            )
        self.assertEqual(r.verdict, gate.FAIL)
        self.assertEqual(r.get("manifest-entry").status, gate.FAIL)
        self.assertIsNone(r.get("drift"))

    def test_skip_clone_path(self):
        ref_ok = completed(stdout=json.dumps({"ref": "refs/tags/v0.8.2", "object": {"sha": "b" * 40}}))
        drift = completed(stdout=json.dumps({"ahead": 3, "behind": 0, "status": "ahead"}))
        with mock.patch.object(gate, "run", side_effect=[ref_ok, drift]):
            r = gate.gate_plugin(
                entry(), gh=["gh"], git=["git"], npm=None, denylist=[],
                skip_clone=True, skip_registry=True,
            )
        self.assertEqual(r.verdict, gate.PASS)
        self.assertEqual(r.drift_label, "+3")
        self.assertEqual(r.get("clone").status, gate.SKIP)


if __name__ == "__main__":
    unittest.main()
