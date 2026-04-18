# wseyatm-snapshot — Anonymized regression fixture

Reduced, anonymized snapshot of `WeSeeYouAtTheMovies` (WSYATM). This fixture is
**static** — no `node_modules/`, no real dependencies, no runnable server. The
Vibe Test scanner reads `package.json` / configs / source files as truth and
this fixture is hand-crafted to reproduce three canonical findings:

1. **Broken vitest forks-pool** — `frontend/vitest.config.ts` uses `pool: 'forks'`
   with a sub-30s `testTimeout`. Audit's harness detector should flag this as
   `broken_test_runner` severity `high`.

2. **Backend missing jest** — `Backend/package.json` scripts reference `jest`
   but `jest` is not listed in dependencies / devDependencies. Audit's harness
   detector should flag this as `missing_test_binary` severity `critical`.

3. **Cherry-picked denominator** — `Backend/` ships ~20 route files under
   `src/routes/` that no test file imports. The three existing tests only
   reach `errorHandler.js`, `validators.js`, and `adminValidation.js` — giving
   a 3 / ~23 imported ratio. Coverage tools without `--coverage.all` / wide
   `collectCoverageFrom` report ~88% while whole-backend coverage is ~13%.

## Classification expectations

- `app_type`: **`full-stack-db`** — React + Vite frontend, Firebase Functions
  backend, Firestore database.
- `tier`: **`public-facing`** — `.github/workflows/deploy.yml` ships to
  production on `main` push (the canonical production-deploy signal).

## Layout

```
wseyatm-snapshot/
  README.md
  firebase.json
  firestore.rules
  .github/workflows/deploy.yml
  frontend/
    package.json + vite + vitest + tsconfig
    src/
      main.tsx, App.tsx
      components/{MovieCard,Quiz,BadgeManager}.tsx
      components/__tests__/{MovieCard,Quiz}.test.tsx
      api/{health,movies}.ts
      utils/{badgeParser,zipDownload}.js
  Backend/
    package.json  (jest in scripts but NOT in deps — finding #2)
    src/
      index.js, server.js
      middleware/{errorHandler,validators,adminValidation}.js
      routes/*.js  (~20 ghost files — finding #3)
      __tests__/middleware/{errorHandler,validators}.test.js
      __tests__/admin/adminValidation.test.js
```

## Anonymization note

All business logic has been stubbed out. File names, folder structure, and
failure modes mirror the real WSYATM codebase, but bodies are minimal
placeholders sufficient for the scanner's static analysis.
