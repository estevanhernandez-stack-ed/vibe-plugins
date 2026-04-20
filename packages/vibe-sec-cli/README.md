# @esthernandez/vibe-sec-cli

**Secret-leak scanner for vibe-coded apps — CI-safe, no LLM in the loop.**

First shipped capability of Vibe Sec. Detects API keys, tokens, and credentials leaked into source, classifies them by severity, and emits a CI-friendly JSON report plus a terminal banner. More Vibe Sec checks (auth audit, input validation, dep audit) land in later versions.

---

## Install

```bash
npm install -g @esthernandez/vibe-sec-cli
```

Or run without installing:

```bash
npx @esthernandez/vibe-sec-cli audit
```

---

## Usage

```bash
# Scan the current directory
vibe-sec audit

# Scan a different directory
vibe-sec audit --root ./some-repo

# Write JSON elsewhere
vibe-sec audit --output /tmp/audit.json

# Treat medium findings as CI-breaking (default is "high")
vibe-sec audit --min-severity medium

# Print only JSON (machine-readable, no banner)
vibe-sec audit --json
```

### Exit codes

- `0` — clean, or findings below `--min-severity`
- `1` — findings at or above `--min-severity`
- `2` — scanner error (unreadable tree, bad args)

Wire it into CI:

```yaml
- run: npx @esthernandez/vibe-sec-cli audit --min-severity high
```

---

## What it detects (v0.1)

| Pattern | Severity | Example |
|---|---|---|
| AWS access key | critical | `AKIA…EXAMPLE` |
| GitHub PAT (classic + fine-grained) | critical | `ghp_…` / `github_pat_…` |
| Stripe live secret | critical | `sk_live_…` |
| OpenAI key | critical | `sk-…` / `sk-proj-…` |
| Anthropic key | critical | `sk-ant-…` |
| Private key block | critical | `-----BEGIN PRIVATE KEY-----` |
| Slack token | high | `xoxb-…` |
| Google API key | high | `AIza…` |
| DB URL with credentials | high | `postgres://user:pass@host` |
| Stripe test secret | medium | `sk_test_…` |
| JWT | medium | `eyJ…` |
| Generic `api_key = "..."` / `apiKey: '...'` | medium | surface-level matches |
| Generic `secret = "..."` / `password = "..."` | medium | noisy — review findings |
| Google OAuth client ID | low | public by design, flagged for context |

### Context-aware severity downgrade

If a finding sits in a file whose path matches `example|sample|mock|fake|placeholder|dummy|template|fixture`, the severity is downgraded one tier. Known placeholder keys from official docs (the documented AWS/Stripe example strings) are suppressed entirely.

### What it skips

- `node_modules`, `.git`, `.venv`, `venv`, `dist`, `build`, `coverage`, `.next`, `.nuxt`, `.turbo`, `.cache`, `__pycache__`
- Binary files (png, jpg, pdf, zip, exe, …)
- Files larger than 1 MB

---

## Output

The scanner writes two artifacts:

### Terminal banner

```
  vibe-sec audit · v0.1.0
  342 files scanned · /path/to/repo

  Findings:
    CRITICAL   1
    MEDIUM     2

    critical  GITHUB_PAT_CLASSIC          src/config.ts:42:18
    medium    GENERIC_API_KEY_ASSIGN      tests/fixtures/api.ts:7:12
    medium    JWT                         examples/auth.md:33:4

  → JSON report: .vibe-sec/state/audit.json
```

### JSON sidecar (`.vibe-sec/state/audit.json`)

```json
{
  "version": 1,
  "scanner": "vibe-sec-cli",
  "scannerVersion": "0.1.0",
  "scannedAt": "2026-04-20T01:55:00.000Z",
  "rootDir": "/path/to/repo",
  "filesScanned": 342,
  "counts": { "critical": 1, "high": 0, "medium": 2, "low": 0 },
  "findings": [
    {
      "pattern": "GITHUB_PAT_CLASSIC",
      "severity": "critical",
      "file": "src/config.ts",
      "line": 42,
      "column": 18,
      "match": "ghp_ab…wxyz",
      "preview": "const GH = 'ghp_abcdefg…wxyz'",
      "remediation": "Revoke at github.com/settings/tokens and regenerate."
    }
  ]
}
```

The `match` field is always masked — the scanner never prints full secrets to logs or JSON.

---

## Roadmap

| Version | Surface |
|---|---|
| **v0.1** *(this release)* | CLI secret scanner |
| v0.2 | Claude Code plugin layer (`/vibe-sec:audit` slash command, LLM reasoning on findings) |
| v0.3 | Auth audit (unprotected routes, session token storage) |
| v0.4 | Input validation scan (XSS vectors, unescaped templates, free-text → DB) |
| v0.5 | Dependency audit (wrap `npm audit` / `pip-audit`, classify + tier) |

Part of [626 Labs](https://626labs.dev). MIT licensed.
