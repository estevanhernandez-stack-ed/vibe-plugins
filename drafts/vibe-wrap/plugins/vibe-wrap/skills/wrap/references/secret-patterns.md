# Secret patterns

> **Audience:** vibe-wrap maintainers + builders reviewing the commit gate's safety net.
> **Status:** patterns locked for v0.1.0. Forward-extensible — add patterns in `/evolve-wrap` cycles when usage data shows gaps.

The commit gate runs a glob match against every uncommitted file's **basename** (not full path) before staging. Any match flips on the secret-pattern warning, which requires an additional confirmation before the file lands in the commit.

## The patterns (v0.1.0)

| Pattern | Catches | Why |
|---|---|---|
| `.env*` | `.env`, `.env.local`, `.env.production`, `.env.staging`, `.envrc` | Most-common environment-variable leak. Standard `dotenv` convention. |
| `*credentials*` | `credentials.json`, `aws-credentials`, `gcp_credentials.yml`, `service-account-credentials.json` | Generic credentials marker — common across AWS / GCP / Azure / generic auth. |
| `*.pem` | `private.pem`, `cert.pem`, `id_rsa.pem`, `server.pem` | PEM-encoded private keys + certs. |
| `*.key` | `id_rsa.key`, `server.key`, `tls.key` | Generic private-key extension. |
| `*token*` | `auth-token.txt`, `gh_token`, `slack_token.json`, `npm-token` | Generic token marker. Catches both files containing tokens and files named after tokens. |
| `id_rsa` | `id_rsa` (no extension) | Default SSH private key filename. |
| `id_ed25519` | `id_ed25519` (no extension) | Modern default SSH private key filename. |
| `*.kdbx` | `vault.kdbx`, `personal.kdbx` | KeePass password database format. Should never end up in git. |

## The matching rule

**Case-insensitive glob against the file's basename.**

- **Basename, not full path.** A file at `src/credentials/README.md` does NOT match `*credentials*` — only `README.md` is checked. A file at `src/lib/credentials.json` DOES match — basename is `credentials.json`.
- **Case-insensitive.** `.ENV.local`, `Credentials.YAML`, `ID_RSA` all match. Match the way file systems behave on macOS / Windows defaults — case-insensitive prevents trivial bypass.
- **Glob, not regex.** `*` matches any sequence (including empty). `?` matches one char. No regex syntax — patterns stay readable.

### Why basename and not full path

Three reasons:

1. **Lower false-positive rate.** A docs file under `docs/credentials/setup.md` shouldn't trigger; an actual credentials JSON in `config/` should. Basename matching catches the real risk and skips the noise.
2. **Path-agnostic.** Patterns work the same whether the user's repo nests deep or flat. No need to guess at directory conventions.
3. **Easier to reason about.** "Does the file's NAME look like a secret?" is the question users intuitively ask. Match that mental model.

## The warning UX

When ≥1 uncommitted file matches a secret pattern, the commit gate flow extends:

```
WARNING — uncommitted files match common-secret patterns:
  M  .env.local              (matched: .env*)
  M  config/credentials.yml  (matched: *credentials*)

if you commit these, secrets may end up in git history.
commit despite secret-pattern match? [y/N]
```

| Choice | Action |
|---|---|
| `y` | Include the matched files in the commit. Wrap doc records the override. |
| `N` (default) | Exclude the matched files from the commit. Other (non-matching) uncommitted files still proceed through the normal commit flow. |

Even when the user already accepted the main commit gate (Gate 1), this extra confirmation fires per match. The extra step is the friction — the friction is the point.

### What the wrap doc records

When secret-pattern files were detected:

```markdown
## Still uncommitted
- `drafts/vibe-wrap/process-notes.md` (modified)
- ⚠ `.env.local` (modified — secret-pattern match)
```

The `⚠` glyph IS allowed here (it's a status marker, not decoration — and it's not an emoji per the no-emoji rule). When the user overrode the warning and committed anyway, the wrap doc adds a footer:

```markdown
## Notes
- 1 secret-pattern match was committed despite the warning: `.env.local`.
  Verify history doesn't leak secrets — `git log -p .env.local`.
```

## Extension rules

When `/evolve-wrap` proposes new patterns based on usage friction:

1. **Patterns must be specific enough to avoid noise.** A pattern like `*config*` would catch every README's config section — too broad.
2. **Patterns must catch a real leak risk.** Add patterns when there's evidence (in the friction log or wins log) that vibe-wrap missed a secret it should have caught.
3. **Patterns ship in `/evolve-wrap` proposals, not autonomously.** The user reviews and approves before the pattern lands. See the `proposed-changes.md` template for the proposal shape.

## What's intentionally NOT in v0.1.0

- **Content-scanning.** vibe-wrap does NOT read file contents looking for `AKIA...` AWS access key IDs, `ghp_...` GitHub tokens, etc. That's `vibe-sec` territory. The commit gate is a basename-based safety net, not a content scanner.
- **Per-repo override / allowlist.** Some users legitimately commit `.env.example` (a template, not real secrets). v0.1.0 catches it as a secret-pattern match; the user overrides per gesture. A persistent allowlist is `/evolve-wrap` work if it surfaces as friction.
- **Pattern discovery from `.gitignore`.** Some repos `.gitignore` `*.secret` or other custom extensions. Reading `.gitignore` to seed the match list is appealing but risks importing the user's own bypass conventions. Defer.

## See also

- **Gate context** — `gate-design.md > Gate 1 — Commit gate > Secret-pattern path`.
- **PRD requirement** — `prd.md > Commit and push gates` (story: "Files matching common-secret patterns trigger a warning and require an additional confirmation").
- **vibe-sec composition** — vibe-sec is the marketplace plugin for actual content scanning + leak detection. vibe-wrap's secret-pattern check is the lightweight safety net at session-end commit time, not a replacement for vibe-sec.
