# Security — @esthernandez/vibe-test v0.2.0

Status as of 2026-04-18, monorepo root `pnpm audit` pass.

## Reporting a vulnerability

Open a GitHub issue at [vibe-plugins/issues](https://github.com/estevanhernandez-stack-ed/vibe-plugins/issues). For sensitive disclosures, email the maintainer listed in `package.json`'s `author` field privately before opening a public issue.

## Current audit status

`pnpm audit` at `C:\Users\estev\Projects\vibe-plugins` on 2026-04-18 reports:

- **0 critical**
- **0 high**
- **2 moderate**
- **0 low**

### Moderate findings (deferred — dev-only, transitive)

| Advisory | Package | Path | Status | Rationale |
|----------|---------|------|--------|-----------|
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | `esbuild@<=0.24.2` | `@vitest/coverage-v8@2.1.9 → vitest@2.1.9 → vite@5.4.21 → esbuild@0.21.5` | **deferred** | esbuild dev-server CORS issue. Only reachable when running `vitest --ui` or `vite dev`; never reachable in Vibe Test's shipped surface (no dev server, no browser client). Bump to `vitest@>=3.0` is tracked but blocked on our own minimum-Node and API compatibility review. |
| [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) | `vite@<=6.4.1` | `@vitest/coverage-v8@2.1.9 → vitest@2.1.9 → vite@5.4.21` | **deferred** | Vite `.map` path-traversal. Same reachability profile — only exploitable if you run a Vite dev server and expose it to untrusted requests. Vibe Test never boots a dev server in its own package; the optional `--with-runtime=dev-server` probe boots the *user's* dev server and closes the port immediately after probing. |

Both findings are in `devDependencies → transitive`. Shipped npm tarballs (`esthernandez-vibe-test-0.2.0.tgz`, `esthernandez-vibe-test-cli-0.2.0.tgz`) don't include `@vitest/coverage-v8` or vite — verified via `npm publish --dry-run`.

Planned upgrade path: bump to `vitest@^3` + `@vitest/coverage-v8@^3` when v0.3 work opens, which pulls `esbuild@>=0.25` and `vite@>=6.5` transitively and clears both advisories.

## Secrets hygiene

- Full git history scan (`git log --all -p packages/vibe-test/ packages/vibe-test-cli/ | grep -iE "api[_-]?key|password|token|secret"`) on 2026-04-18: **clean**. All matches are detector patterns in source code (e.g., `FIREBASE_API_KEY` in env-var-scanner test fixtures, `verifyFirebaseToken` middleware string matches in scanner tests), not committed credentials.
- No `.env` files committed. Root + package `.gitignore` cover `.env`, `.env.local`, `.vibe-test/`, `node_modules/`, `dist/`, `*.bak`, `coverage/` (with narrow negations for the `coverage/` source module).
- `.env.example` intentionally **not** shipped — Vibe Test reads no environment variables. Env-var detection is about the user's app, not ours.

## Supply chain

- `pnpm-lock.yaml` at monorepo root is committed and consistent. Verified via `pnpm install --frozen-lockfile` dry-run.
- Dependencies pinned via caret ranges in `package.json` + exact resolution in `pnpm-lock.yaml`.
- No post-install scripts beyond tsup build; `pnpm` honors `--ignore-scripts` cleanly in the shipped package.

## 2FA / npm publish

The `@esthernandez` npm scope has 2FA enabled. Publishing is a human-gated last step outside this release checklist. See root `README.md` for the release workflow.
