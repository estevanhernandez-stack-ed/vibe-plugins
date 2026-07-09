# vibe-access v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 15th vibe-* family plugin — scan an app's routes, map them into an `agent-access.json` manifest (dev / prod-safe tiers), scaffold gap affordances, and prove the layer with an agent-driven verify — then dogfood it on WeSeeYouAtTheMovies and ship v0.1.0 canary + stable.

**Architecture:** Node/ESM engine (Vibe-Lingual's template) behind an 11-skill Claude Code plugin. Framework variance lives behind an `AccessAdapter` seam with one real adapter (`firebase-functions`, WeSeeYou's stack) plus honest not-yet-implemented stubs. The schema-versioned manifest is the load-bearing contract; every mutating step is backup/rollback-wrapped; verify fails closed.

**Tech Stack:** Node ≥20 ESM (`.mjs`), Jest 29 native-ESM, Ajv (draft-07 schemas), Claude Code plugin skills (markdown). No TypeScript compile step in v0.1 — plain ESM like Vibe-Lingual.

**Spec:** `vibe-plugins/docs/spec-bank/vibe-access-v0.1.md` (design-approved 2026-07-09). Read it before starting.

## Global Constraints

- Build repo: `C:\Users\estev\Projects\vibe-access` (new solo repo, kebab-case). Plugin lives at `plugins/vibe-access/`. All paths below are relative to the plugin dir unless prefixed with `repo:`.
- Plugin manifest at `plugins/vibe-access/.claude-plugin/plugin.json` — the ONLY loader-recognized location. Never a root plugin.json.
- Node ≥20, `"type": "module"`, all engine files `.mjs`. Global `fetch` (no node-fetch dep).
- Test command (load-bearing, copy exactly): `node --experimental-vm-modules --disable-warning=ExperimentalWarning node_modules/jest/bin/jest.js --passWithNoTests`. Bare `npx jest` fails on native ESM.
- JSON schemas: draft-07, `"additionalProperties": false` on every object.
- Mechanical refusal rule: `seed` / `reset` / `capture` kinds can NEVER be tier `prod-safe`. Enforced in code (throw), not a warning.
- No secrets in the manifest ever — auth declared by requirement type only (`none | session | token`).
- State dir in target app: `.vibe-access/`. Human reports: `docs/vibe-access/<verb>-YYYY-MM-DD.md` (UTC dates). Evolution data home: `~/.claude/plugins/data/vibe-access/`.
- No telemetry. Session/friction loggers are documentation-only placeholders in v0.1 with reserved paths (family convention).
- Skill frontmatter: `name` + `description` only (no version field). Descriptions start with the trigger-phrase list, then read/write/mutation posture.
- Commits: conventional commits. Tag naming: plain `vX.Y.Z`.
- Voice in plugin.json description + README: builder-to-builder, second person, no "empower/leverage/seamlessly/unlock/unleash", no emoji.
- Verify safety: refuse any base URL whose hostname is not `localhost`/`127.0.0.1`/`[::1]`/`0.0.0.0` unless `--force`.
- Dogfood target: `C:\Users\estev\Projects\WeSeeYouAtTheMovies` (React 19 + Vite SPA, Firebase Cloud Functions backend, ~85 endpoints via `firebase.json` hosting rewrites, auth = Firebase ID token via `verifyAuthToken`).
- Schema reference: `C:\Users\estev\Projects\Project-626Labs-1\mcp-server\src\tools\registry.ts` + `tools/*.ts` (flat Zod raw shapes; field descriptions carry `[action1, action2]` tags).

## File Structure

```
repo:C:\Users\estev\Projects\vibe-access\
  docs/                                  # build artifacts (dogfood notes land here)
  plugins/vibe-access/
    .claude-plugin/plugin.json           # plugin manifest (Task 1)
    .gitignore                           # node_modules/, .vibe-access/
    README.md                            # storefront readme (Task 13)
    CHANGELOG.md                         # (Task 13)
    package.json                         # @626labs/vibe-access-engine, private, ESM (Task 1)
    jest.config.mjs                      # (Task 1)
    commands/*.md                        # slash-command stubs (Task 12)
    engine/
      cli.mjs                            # subcommand dispatch (Task 7, extended 8-11)
      detect.mjs                         # stack detection (Task 3)
      scan.mjs                           # inventory orchestration (Task 7)
      map.mjs                            # inventory -> manifest, tiers/kinds/merge (Task 8)
      gaps.mjs                           # needs-checklist evaluation (Task 9)
      scaffold.mjs                       # scaffold planning + apply w/ backup (Task 10)
      verify.mjs                         # call plan, execution, stamping (Task 11)
      backup.mjs                         # per-batch backup + rollback (Task 10)
      schema.mjs                         # Ajv validators for all schemas (Task 2)
      report.mjs                         # dated markdown renderers (Tasks 7, 11)
      adapters/
        index.mjs                        # resolveAdapter registry (Task 4)
        adapter.contract.md              # AccessAdapter interface spec (Task 4)
        firebase-functions/
          index.mjs                      # adapter assembly (Tasks 5-6, 10)
          routes.mjs                     # detectRoutes (Task 5)
          auth.mjs                       # detectAuth (Task 6)
          scaffold.mjs                   # scaffoldAffordance + gate (Task 10)
          templates/*.template           # affordance function templates (Task 10)
        _stubs/nextjs.mjs                # honest stub (Task 4)
        _stubs/express.mjs               # honest stub (Task 4)
    schemas/
      config.schema.json                 # (Task 2)
      inventory.schema.json              # (Task 2)
      manifest.schema.json               # agent-access.json — THE contract (Task 2)
      verify-run.schema.json             # (Task 2)
    skills/<name>/SKILL.md               # 11 skills (Task 12)
    tests/*.test.mjs + tests/fixtures/   # co-located Jest suites (every task)
```

Target-app state dir layout (what the skills read/write in the app under audit):

```
.vibe-access/
  config.json                # first-run-setup capture
  state/inventory.json       # scan output
  scaffold/
    pending/                 # planned-but-unapplied affordance file sets
    backup/<batchId>/        # rollback units
  verify/run-<id>.json       # verify runs
agent-access.json            # the manifest, at app root
docs/vibe-access/            # dated human reports
```

---

### Task 1: Solo repo + plugin skeleton

**Files:**
- Create: `repo:.gitignore`, `plugins/vibe-access/.claude-plugin/plugin.json`, `plugins/vibe-access/.gitignore`, `plugins/vibe-access/package.json`, `plugins/vibe-access/jest.config.mjs`

**Interfaces:**
- Produces: a git repo where `npm test` runs green (no tests yet), the plugin manifest the Claude Code loader reads, and the package layout every later task drops files into.

- [ ] **Step 1: Create the repo and init git**

```bash
mkdir -p /c/Users/estev/Projects/vibe-access/plugins/vibe-access/.claude-plugin
cd /c/Users/estev/Projects/vibe-access
git init -b main
```

- [ ] **Step 2: Write repo-root `.gitignore`**

```
node_modules/
coverage/
```

- [ ] **Step 3: Write `plugins/vibe-access/.gitignore`**

```
node_modules/
.vibe-access/
```

- [ ] **Step 4: Write `plugins/vibe-access/.claude-plugin/plugin.json`**

```json
{
  "name": "vibe-access",
  "version": "0.1.0",
  "description": "Give agents pipelines into your app. Scans your routes and auth model, maps every callable surface into a schema-versioned agent-access.json manifest with dev and prod-safe tiers, scaffolds the affordances your app is missing (seed, reset, read-state, capture, discovery) behind hard env gates, and proves the layer with a cold-agent verify that exercises every affordance before anything counts as done. seed/reset/capture can never be tagged prod-safe — a refusal, not a warning. Deep on Firebase Cloud Functions (hosting-rewrite route detection, ID-token auth mapping), with a real adapter seam that reports an honest not-yet-implemented for the rest. The manifest is the embryo of your eventual MCP server. Validated against WeSeeYouAtTheMovies.",
  "author": {
    "name": "626Labs LLC",
    "url": "https://github.com/estevanhernandez-stack-ed/vibe-access"
  },
  "homepage": "https://github.com/estevanhernandez-stack-ed/vibe-access#readme",
  "repository": "https://github.com/estevanhernandez-stack-ed/vibe-access",
  "license": "MIT",
  "keywords": [
    "vibe-access", "vibe-coding", "agent-access", "mcp", "agent-native",
    "firebase-functions", "claude-code-plugin", "626labs"
  ]
}
```

- [ ] **Step 5: Write `plugins/vibe-access/package.json`**

```json
{
  "name": "@626labs/vibe-access-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "vibe-access": "./engine/cli.mjs" },
  "scripts": {
    "test": "node --experimental-vm-modules --disable-warning=ExperimentalWarning node_modules/jest/bin/jest.js --passWithNoTests"
  },
  "dependencies": { "ajv": "^8.17.1" },
  "devDependencies": { "jest": "^29.7.0" }
}
```

- [ ] **Step 6: Write `plugins/vibe-access/jest.config.mjs`**

```js
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.mjs'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/fixtures/'],
};
```

- [ ] **Step 7: Install and verify green**

Run: `cd /c/Users/estev/Projects/vibe-access/plugins/vibe-access && npm install && npm test`
Expected: `No tests found, exiting with code 0` (passWithNoTests).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/estev/Projects/vibe-access
git add -A
git commit -m "feat: vibe-access plugin skeleton (manifest, engine package, jest esm)"
```

---

### Task 2: Schemas + validators + reference fixture

The manifest schema is the load-bearing contract. It is derived from the 626 dashboard's tool-definition shape (`ToolDefinition { name, description, schema: ZodRawShape, handler }`) with the two fields the reference lacks and this plugin exists to add: `tier` and `kind`.

**Files:**
- Create: `schemas/manifest.schema.json`, `schemas/inventory.schema.json`, `schemas/config.schema.json`, `schemas/verify-run.schema.json`, `engine/schema.mjs`
- Create: `tests/fixtures/reference-626-manifest.json`, `tests/schema.test.mjs`

**Interfaces:**
- Produces: `validateManifest(obj)`, `validateInventory(obj)`, `validateConfig(obj)`, `validateVerifyRun(obj)` from `engine/schema.mjs` — each returns `{ valid: boolean, errors: string[] }`. Every later task validates its outputs through these.

- [ ] **Step 1: Write the failing test `tests/schema.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { validateManifest, validateConfig } from '../engine/schema.mjs';

const referenceManifest = JSON.parse(
  readFileSync(new URL('./fixtures/reference-626-manifest.json', import.meta.url), 'utf8')
);

describe('manifest schema', () => {
  test('accepts the 626-dashboard reference manifest', () => {
    const r = validateManifest(referenceManifest);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
  });

  test('rejects a seed affordance tagged prod-safe', () => {
    const bad = structuredClone(referenceManifest);
    bad.affordances[0].kind = 'seed';
    bad.affordances[0].tier = 'prod-safe';
    expect(validateManifest(bad).valid).toBe(false);
  });

  test('rejects unknown top-level fields', () => {
    const bad = { ...structuredClone(referenceManifest), surprise: 1 };
    expect(validateManifest(bad).valid).toBe(false);
  });

  test('rejects a missing schemaVersion', () => {
    const bad = structuredClone(referenceManifest);
    delete bad.schemaVersion;
    expect(validateManifest(bad).valid).toBe(false);
  });
});

describe('config schema', () => {
  test('accepts a minimal config', () => {
    const r = validateConfig({
      schemaVersion: 1,
      adapter: 'firebase-functions',
      appName: 'weseeyouatthemovies',
      baseUrls: { dev: 'http://localhost:5000' },
      devRunCommand: 'firebase emulators:start',
      capturedAt: '2026-07-09T00:00:00.000Z',
    });
    expect(r.errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema.test.mjs`
Expected: FAIL — `Cannot find module '../engine/schema.mjs'`.

- [ ] **Step 3: Write `schemas/manifest.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "vibe-access/manifest",
  "title": "agent-access.json — agent-facing access manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "app", "adapter", "generatedAt", "baseUrls", "affordances"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "app": { "type": "string", "minLength": 1 },
    "adapter": { "type": "string", "minLength": 1 },
    "generatedAt": { "type": "string" },
    "baseUrls": {
      "type": "object",
      "additionalProperties": false,
      "required": ["dev"],
      "properties": {
        "dev": { "type": "string" },
        "prod": { "type": "string" }
      }
    },
    "discoveryRoute": { "type": ["string", "null"] },
    "affordances": {
      "type": "array",
      "items": { "$ref": "#/definitions/affordance" }
    }
  },
  "definitions": {
    "affordance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "description", "tier", "kind", "transport", "auth", "sourceRef", "origin", "verified"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9.-]*$" },
        "description": { "type": "string", "minLength": 1 },
        "tier": { "enum": ["dev", "prod-safe"] },
        "kind": { "enum": ["read", "act", "seed", "reset", "capture"] },
        "transport": {
          "type": "object",
          "additionalProperties": false,
          "required": ["type", "method", "path"],
          "properties": {
            "type": { "enum": ["http"] },
            "method": { "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            "path": { "type": "string", "pattern": "^/" }
          }
        },
        "input": { "type": ["object", "null"] },
        "output": { "type": ["object", "null"] },
        "auth": { "enum": ["none", "session", "token"] },
        "sourceRef": { "type": "string" },
        "origin": { "enum": ["existing", "scaffolded"] },
        "verified": {
          "type": "object",
          "additionalProperties": false,
          "required": ["status"],
          "properties": {
            "status": { "enum": ["unverified", "pass", "fail", "pending-agent"] },
            "at": { "type": "string" },
            "runId": { "type": "string" },
            "detail": { "type": "string" }
          }
        },
        "overrides": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "tier": { "enum": ["dev", "prod-safe"] },
            "description": { "type": "string" }
          }
        }
      },
      "allOf": [
        {
          "if": { "properties": { "kind": { "enum": ["seed", "reset", "capture"] } } },
          "then": { "properties": { "tier": { "const": "dev" } } }
        }
      ]
    }
  }
}
```

Note: the refusal rule lives in the schema itself (the `allOf/if/then`) AND as a thrown error in `map.mjs` (Task 8). Belt and suspenders — the schema catches hand-edits, the throw catches generation bugs.

- [ ] **Step 4: Write `schemas/config.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "vibe-access/config",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "adapter", "appName", "baseUrls", "devRunCommand", "capturedAt"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "adapter": { "type": "string" },
    "appName": { "type": "string", "minLength": 1 },
    "baseUrls": {
      "type": "object",
      "additionalProperties": false,
      "required": ["dev"],
      "properties": { "dev": { "type": "string" }, "prod": { "type": "string" } }
    },
    "devRunCommand": { "type": "string" },
    "discoveryRoute": { "type": ["string", "null"] },
    "authModelNote": { "type": "string" },
    "capturedAt": { "type": "string" }
  }
}
```

- [ ] **Step 5: Write `schemas/inventory.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "vibe-access/inventory",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "app", "adapter", "generatedAt", "routes", "unmapped"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "app": { "type": "string" },
    "adapter": { "type": "string" },
    "generatedAt": { "type": "string" },
    "routes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "method", "path", "sourceRef", "auth"],
        "properties": {
          "name": { "type": "string" },
          "method": { "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"] },
          "path": { "type": "string" },
          "sourceRef": { "type": "string" },
          "auth": { "enum": ["none", "session", "token"] }
        }
      }
    },
    "unmapped": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["sourceRef", "reason"],
        "properties": {
          "sourceRef": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    }
  }
}
```

- [ ] **Step 6: Write `schemas/verify-run.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "vibe-access/verify-run",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "runId", "startedAt", "baseUrl", "forced", "results"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "runId": { "type": "string" },
    "startedAt": { "type": "string" },
    "baseUrl": { "type": "string" },
    "forced": { "type": "boolean" },
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["affordanceId", "status"],
        "properties": {
          "affordanceId": { "type": "string" },
          "status": { "enum": ["pass", "fail", "pending-agent", "skipped"] },
          "httpStatus": { "type": ["integer", "null"] },
          "detail": { "type": "string" }
        }
      }
    }
  }
}
```

- [ ] **Step 7: Write `engine/schema.mjs`**

```js
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = {
  manifest: ajv.compile(load('manifest')),
  inventory: ajv.compile(load('inventory')),
  config: ajv.compile(load('config')),
  verifyRun: ajv.compile(load('verify-run')),
};

function run(validator, obj) {
  const valid = validator(obj);
  const errors = (validator.errors ?? []).map(
    (e) => `${e.instancePath || '/'} ${e.message}`
  );
  return { valid: !!valid, errors: valid ? [] : errors };
}

export const validateManifest = (obj) => run(compiled.manifest, obj);
export const validateInventory = (obj) => run(compiled.inventory, obj);
export const validateConfig = (obj) => run(compiled.config, obj);
export const validateVerifyRun = (obj) => run(compiled.verifyRun, obj);
```

- [ ] **Step 8: Write the reference fixture `tests/fixtures/reference-626-manifest.json`**

Hand-written translation of a representative subset of the 626 dashboard's MCP layer into the new schema — this is the cowpath-capture sanity check. Three tools chosen to span read/act and auth surface (`get_recent_activity`, `manage_tasks`, `manage_decisions`), expressed as the REST-bridge HTTP transport (`POST /api/{toolName}`):

```json
{
  "schemaVersion": 1,
  "app": "626labs-dashboard",
  "adapter": "reference-hand-written",
  "generatedAt": "2026-07-09T00:00:00.000Z",
  "baseUrls": { "dev": "http://localhost:3626" },
  "discoveryRoute": null,
  "affordances": [
    {
      "id": "get-recent-activity",
      "description": "Session resume package: recent decisions, tasks, and context for a project.",
      "tier": "prod-safe",
      "kind": "read",
      "transport": { "type": "http", "method": "POST", "path": "/api/get_recent_activity" },
      "input": { "type": "object", "properties": { "projectId": { "type": "string" }, "decisionLimit": { "type": "number" } } },
      "output": null,
      "auth": "token",
      "sourceRef": "mcp-server/src/tools/session.ts",
      "origin": "existing",
      "verified": { "status": "unverified" }
    },
    {
      "id": "manage-tasks",
      "description": "Create, update, or manage tasks in a project. Actions: create | update | updateStatus | addSubtask | bulkUpdate | bulkCreate.",
      "tier": "prod-safe",
      "kind": "act",
      "transport": { "type": "http", "method": "POST", "path": "/api/manage_tasks" },
      "input": { "type": "object", "properties": { "projectId": { "type": "string" }, "action": { "type": "string" }, "title": { "type": "string" } } },
      "output": null,
      "auth": "token",
      "sourceRef": "mcp-server/src/tools/tasks.ts:33",
      "origin": "existing",
      "verified": { "status": "unverified" }
    },
    {
      "id": "manage-decisions",
      "description": "Log, search, or review architectural decisions. Actions: log | search | requestReview | getUnified.",
      "tier": "prod-safe",
      "kind": "act",
      "transport": { "type": "http", "method": "POST", "path": "/api/manage_decisions" },
      "input": { "type": "object", "properties": { "action": { "type": "string" }, "projectId": { "type": "string" }, "decision": { "type": "string" } } },
      "output": null,
      "auth": "token",
      "sourceRef": "mcp-server/src/tools/decisions.ts",
      "origin": "existing",
      "verified": { "status": "unverified" }
    }
  ]
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- tests/schema.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 10: Commit**

```bash
git add plugins/vibe-access/schemas plugins/vibe-access/engine/schema.mjs plugins/vibe-access/tests
git commit -m "feat: manifest/inventory/config/verify-run schemas + ajv validators + 626 reference fixture"
```

---

### Task 3: Stack detection (`engine/detect.mjs`)

**Files:**
- Create: `engine/detect.mjs`, `tests/detect.test.mjs`, `tests/fixtures/app-firebase/firebase.json`, `tests/fixtures/app-firebase/functions/package.json`, `tests/fixtures/app-nextjs/package.json`, `tests/fixtures/app-unknown/readme.txt`

**Interfaces:**
- Produces: `detect(appRoot) -> Detection` where `Detection = { framework: string, appRoot: string, firebaseJsonPath: string|null, functionsDir: string|null, rewrites: Array<{source, function?, destination?}>, packageJsons: string[] }`. `framework` ∈ `'firebase-functions' | 'nextjs' | 'express' | 'unknown'`. Consumed by `resolveAdapter(detection)` (Task 4) and `scan` (Task 7).

- [ ] **Step 1: Write fixtures**

`tests/fixtures/app-firebase/firebase.json`:

```json
{
  "hosting": {
    "public": "frontend/dist",
    "rewrites": [
      { "source": "/api/leaderboard", "function": "leaderboard" },
      { "source": "/api/submit-score", "function": "submitScore" },
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "functions": { "source": "functions" }
}
```

`tests/fixtures/app-firebase/functions/package.json`:

```json
{ "name": "fixture-functions", "dependencies": { "firebase-functions": "^7.0.0" } }
```

`tests/fixtures/app-nextjs/package.json`:

```json
{ "name": "fixture-next", "dependencies": { "next": "^15.0.0", "react": "^19.0.0" } }
```

`tests/fixtures/app-unknown/readme.txt`: one line, `nothing to detect here`.

- [ ] **Step 2: Write the failing test `tests/detect.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { detect } from '../engine/detect.mjs';

const fix = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

describe('detect', () => {
  test('recognizes a firebase-functions app from firebase.json + functions dir', () => {
    const d = detect(fix('app-firebase'));
    expect(d.framework).toBe('firebase-functions');
    expect(d.functionsDir).toMatch(/functions$/);
    expect(d.rewrites).toHaveLength(3);
  });

  test('recognizes a next.js app from package.json deps', () => {
    const d = detect(fix('app-nextjs'));
    expect(d.framework).toBe('nextjs');
    expect(d.firebaseJsonPath).toBeNull();
  });

  test('degrades to unknown, never throws', () => {
    const d = detect(fix('app-unknown'));
    expect(d.framework).toBe('unknown');
    expect(d.rewrites).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/detect.test.mjs`
Expected: FAIL — `Cannot find module '../engine/detect.mjs'`.

- [ ] **Step 4: Write `engine/detect.mjs`**

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function collectPackageJsons(appRoot) {
  const candidates = ['', 'frontend', 'functions', 'Backend', 'backend', 'web', 'app'];
  return candidates
    .map((d) => join(appRoot, d, 'package.json'))
    .filter((p) => existsSync(p));
}

function depsOf(pkgPath) {
  const pkg = readJsonSafe(pkgPath) ?? {};
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

export function detect(appRoot) {
  const detection = {
    framework: 'unknown',
    appRoot,
    firebaseJsonPath: null,
    functionsDir: null,
    rewrites: [],
    packageJsons: collectPackageJsons(appRoot),
  };

  const fbPath = join(appRoot, 'firebase.json');
  const fb = existsSync(fbPath) ? readJsonSafe(fbPath) : null;
  if (fb) {
    detection.firebaseJsonPath = fbPath;
    const hosting = Array.isArray(fb.hosting) ? fb.hosting[0] : fb.hosting;
    detection.rewrites = hosting?.rewrites ?? [];
    const fnSource = Array.isArray(fb.functions) ? fb.functions[0]?.source : fb.functions?.source;
    const fnDir = join(appRoot, fnSource ?? 'functions');
    if (existsSync(fnDir)) {
      detection.functionsDir = fnDir;
      detection.framework = 'firebase-functions';
      return detection;
    }
  }

  for (const pkgPath of detection.packageJsons) {
    const deps = depsOf(pkgPath);
    if (deps.next) {
      detection.framework = 'nextjs';
      return detection;
    }
    if (deps.express) {
      detection.framework = 'express';
      return detection;
    }
  }
  return detection;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/detect.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-access/engine/detect.mjs plugins/vibe-access/tests
git commit -m "feat: stack detection (firebase-functions / nextjs / express / unknown)"
```

---

### Task 4: Adapter seam (`engine/adapters/`)

**Files:**
- Create: `engine/adapters/adapter.contract.md`, `engine/adapters/index.mjs`, `engine/adapters/_stubs/nextjs.mjs`, `engine/adapters/_stubs/express.mjs`, `tests/adapters.test.mjs`

**Interfaces:**
- Consumes: `Detection` from Task 3.
- Produces: `resolveAdapter(detection) -> { adapter: AccessAdapter|null, status: 'ready'|'not-yet-implemented', framework: string }`. The `AccessAdapter` interface (contract below) that Tasks 5, 6, 10 implement for firebase-functions. Registration order is precedence; predicate throws are swallowed as no-match; never throws itself.

- [ ] **Step 1: Write `engine/adapters/adapter.contract.md`**

```markdown
# AccessAdapter contract

Every framework adapter exports an object satisfying:

    interface AccessAdapter {
      id: string;                          // stable slug, e.g. 'firebase-functions'
      matches(detection): boolean;         // pure predicate over detect() output; first true wins
      detectRoutes(ctx): { routes: RouteEntry[]; unmapped: UnmappedEntry[] };
      detectAuth(route, ctx): 'none' | 'session' | 'token';
      scaffoldAffordance(spec, ctx): ScaffoldPlan;   // PURE PLAN — no filesystem writes
      gateMechanism(): { kind: string; description: string };
    }

    RouteEntry     = { name, method, path, sourceRef, handlerSourcePath|null }
    UnmappedEntry  = { sourceRef, reason }
    ctx            = { appRoot, detection, config }   // config may be null pre-bootstrap
    spec           = { id, kind: 'seed'|'reset'|'read-state'|'capture'|'discovery', description }
    ScaffoldPlan   = { files: {path, contents}[]; patches: {path, anchor, insert, note}[]; notes: string[] }

Rules (the KTD-3 honesty rule, inherited from vibe-lingual):
- `matches()` throwing is treated as no-match, never propagated.
- If no implemented adapter claims the app, `resolveAdapter` walks the stubs only to find
  the most specific LABEL and returns `{ adapter: null, status: 'not-yet-implemented' }`.
  Stand down cleanly; never mishandle an unrecognized stack.
- `scaffoldAffordance` returns a plan; applying it (with backup) is `engine/scaffold.mjs`'s job.
- Every dev-tier scaffolded file MUST contain the adapter's gate mechanism. The engine
  refuses to apply a dev-tier plan whose file contents don't include the gate marker
  string `vibe-access:dev-gate` (checked in scaffold.mjs).

Adding an adapter: implement under `adapters/<id>/` mirroring `firebase-functions/`,
remove the `_stubs/<id>.mjs` entry, register in `index.mjs` IMPLEMENTED_ADAPTERS,
add fixtures + extend `tests/adapters.test.mjs`. Agnostic-path runs write
`~/.claude/plugins/data/vibe-access/adapter-notes/<stack>.md` — the seed for this work.
```

- [ ] **Step 2: Write the failing test `tests/adapters.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { resolveAdapter, REGISTERED_ADAPTERS } from '../engine/adapters/index.mjs';

describe('resolveAdapter', () => {
  test('unknown framework resolves to not-yet-implemented with null adapter', () => {
    const r = resolveAdapter({ framework: 'unknown', rewrites: [] });
    expect(r.status).toBe('not-yet-implemented');
    expect(r.adapter).toBeNull();
  });

  test('nextjs detection returns the nextjs stub label, no adapter', () => {
    const r = resolveAdapter({ framework: 'nextjs', rewrites: [] });
    expect(r.status).toBe('not-yet-implemented');
    expect(r.framework).toBe('nextjs');
  });

  test('malformed detection degrades, never throws', () => {
    expect(() => resolveAdapter(null)).not.toThrow();
    expect(resolveAdapter(null).status).toBe('not-yet-implemented');
  });

  test('every registered adapter satisfies the contract surface', () => {
    for (const a of REGISTERED_ADAPTERS) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.matches).toBe('function');
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/adapters.test.mjs`
Expected: FAIL — `Cannot find module '../engine/adapters/index.mjs'`.

- [ ] **Step 4: Write the stubs**

`engine/adapters/_stubs/nextjs.mjs`:

```js
export const nextjsStub = {
  id: 'nextjs',
  matches: (detection) => detection?.framework === 'nextjs',
};
```

`engine/adapters/_stubs/express.mjs`:

```js
export const expressStub = {
  id: 'express',
  matches: (detection) => detection?.framework === 'express',
};
```

- [ ] **Step 5: Write `engine/adapters/index.mjs`**

```js
import { nextjsStub } from './_stubs/nextjs.mjs';
import { expressStub } from './_stubs/express.mjs';

// Task 5 replaces this empty array with [firebaseFunctionsAdapter].
const IMPLEMENTED_ADAPTERS = [];
const STUB_ADAPTERS = [nextjsStub, expressStub];

export const REGISTERED_ADAPTERS = [...IMPLEMENTED_ADAPTERS, ...STUB_ADAPTERS];

function claims(adapter, detection) {
  try {
    return adapter.matches(detection) === true;
  } catch {
    return false;
  }
}

export function resolveAdapter(detection) {
  for (const adapter of IMPLEMENTED_ADAPTERS) {
    if (claims(adapter, detection)) {
      return { adapter, status: 'ready', framework: adapter.id };
    }
  }
  for (const stub of STUB_ADAPTERS) {
    if (claims(stub, detection)) {
      return { adapter: null, status: 'not-yet-implemented', framework: stub.id };
    }
  }
  return { adapter: null, status: 'not-yet-implemented', framework: detection?.framework ?? 'unknown' };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/adapters.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add plugins/vibe-access/engine/adapters plugins/vibe-access/tests
git commit -m "feat: AccessAdapter seam — contract, resolver registry, honest stubs"
```

---

### Task 5: firebase-functions adapter — detectRoutes

Route truth for this stack = `firebase.json` hosting rewrites (the `/api/*` map) cross-referenced with `functions/index.js` exports (the implementations). A rewrite whose function has no export — or an export reachable only outside the rewrites — lands in `unmapped`, never dropped.

**Files:**
- Create: `engine/adapters/firebase-functions/routes.mjs`, `engine/adapters/firebase-functions/index.mjs`
- Modify: `engine/adapters/index.mjs` (register the adapter)
- Create: `tests/fixtures/app-firebase/functions/index.js`, `tests/fixtures/app-firebase/functions/src/social/leaderboards.js`, `tests/routes.test.mjs`

**Interfaces:**
- Consumes: `Detection` (Task 3), contract (Task 4).
- Produces: `firebaseFunctionsAdapter.detectRoutes(ctx) -> { routes: RouteEntry[], unmapped: UnmappedEntry[] }` with `RouteEntry = { name, method, path, sourceRef, handlerSourcePath }`. Method defaults to `'POST'`; refined to `'GET'` when the handler source guards `req.method === 'GET'` or the export name starts with a read prefix (`get|list|my|fetch`) or ends with `Data`. Consumed by Task 6 (auth) and Task 7 (scan).

- [ ] **Step 1: Extend fixtures**

`tests/fixtures/app-firebase/functions/index.js`:

```js
exports.leaderboard = require('./src/social/leaderboards').leaderboard;
exports.submitScore = require('./src/social/leaderboards').submitScore;
exports.orphanFunction = require('./src/social/leaderboards').orphanFunction;
```

`tests/fixtures/app-firebase/functions/src/social/leaderboards.js`:

```js
const { verifyAuthToken } = require('../../utils/helpers');

exports.leaderboard = async (req, res) => {
  if (req.method === 'GET') {
    res.json({ ok: true });
  }
};

exports.submitScore = async (req, res) => {
  const user = await verifyAuthToken(req);
  res.json({ user });
};

exports.orphanFunction = async (req, res) => res.json({});
```

Also add to `tests/fixtures/app-firebase/firebase.json` rewrites (before the `**` catch-all): `{ "source": "/api/ghost", "function": "ghostFunction" }` — a rewrite with no matching export.

- [ ] **Step 2: Write the failing test `tests/routes.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { detect } from '../engine/detect.mjs';
import { firebaseFunctionsAdapter } from '../engine/adapters/firebase-functions/index.mjs';

const appRoot = fileURLToPath(new URL('./fixtures/app-firebase', import.meta.url));

describe('firebase-functions detectRoutes', () => {
  const ctx = { appRoot, detection: detect(appRoot), config: null };
  const { routes, unmapped } = firebaseFunctionsAdapter.detectRoutes(ctx);

  test('maps rewrites with matching exports to routes', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/api/leaderboard');
    expect(paths).toContain('/api/submit-score');
  });

  test('resolves sourceRef through the require path', () => {
    const lb = routes.find((r) => r.name === 'leaderboard');
    expect(lb.sourceRef).toMatch(/src[\\/]social[\\/]leaderboards\.js/);
  });

  test('infers GET for handlers guarding req.method === GET', () => {
    expect(routes.find((r) => r.name === 'leaderboard').method).toBe('GET');
    expect(routes.find((r) => r.name === 'submitScore').method).toBe('POST');
  });

  test('a rewrite with no export lands in unmapped, not dropped', () => {
    expect(unmapped.some((u) => u.reason.includes('ghostFunction'))).toBe(true);
  });

  test('an export with no rewrite lands in unmapped', () => {
    expect(unmapped.some((u) => u.reason.includes('orphanFunction'))).toBe(true);
  });

  test('the ** catch-all is ignored silently (SPA fallback, not an API)', () => {
    expect(routes.some((r) => r.path === '**')).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/routes.test.mjs`
Expected: FAIL — `Cannot find module '../engine/adapters/firebase-functions/index.mjs'`.

- [ ] **Step 4: Write `engine/adapters/firebase-functions/routes.mjs`**

```js
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const EXPORT_RE = /exports\.(\w+)\s*=\s*require\((['"])(.+?)\2\)(?:\.(\w+))?/g;
const READ_NAME_RE = /^(get|list|my|fetch)|Data$/;

function parseIndexExports(functionsDir) {
  const indexPath = join(functionsDir, 'index.js');
  if (!existsSync(indexPath)) return { exportsMap: new Map(), indexPath: null };
  const text = readFileSync(indexPath, 'utf8');
  const exportsMap = new Map();
  for (const m of text.matchAll(EXPORT_RE)) {
    const [, exportName, , requirePath] = m;
    let resolved = join(functionsDir, requirePath);
    if (!existsSync(resolved) && existsSync(`${resolved}.js`)) resolved = `${resolved}.js`;
    exportsMap.set(exportName, existsSync(resolved) ? resolved : null);
  }
  return { exportsMap, indexPath };
}

function inferMethod(name, handlerSource) {
  if (handlerSource && /req\.method\s*===?\s*['"]GET['"]/.test(handlerSource)) return 'GET';
  if (READ_NAME_RE.test(name)) return 'GET';
  return 'POST';
}

export function detectRoutes(ctx) {
  const { detection, appRoot } = ctx;
  const routes = [];
  const unmapped = [];
  const { exportsMap, indexPath } = parseIndexExports(detection.functionsDir);
  const indexRef = indexPath ? relative(appRoot, indexPath) : 'functions/index.js';
  const seenExports = new Set();

  for (const rw of detection.rewrites) {
    if (!rw.function) continue; // SPA fallback / destination rewrites are not API surface
    if (!exportsMap.has(rw.function)) {
      unmapped.push({
        sourceRef: indexRef,
        reason: `rewrite ${rw.source} points at ${rw.function}, which has no export in index.js`,
      });
      continue;
    }
    seenExports.add(rw.function);
    const handlerSourcePath = exportsMap.get(rw.function);
    const handlerSource = handlerSourcePath ? readFileSync(handlerSourcePath, 'utf8') : null;
    routes.push({
      name: rw.function,
      method: inferMethod(rw.function, handlerSource),
      path: rw.source,
      sourceRef: handlerSourcePath ? relative(appRoot, handlerSourcePath) : indexRef,
      handlerSourcePath,
    });
  }

  for (const [exportName] of exportsMap) {
    if (!seenExports.has(exportName)) {
      unmapped.push({
        sourceRef: indexRef,
        reason: `export ${exportName} has no hosting rewrite — callable only via direct function URL`,
      });
    }
  }
  return { routes, unmapped };
}
```

- [ ] **Step 5: Write `engine/adapters/firebase-functions/index.mjs`** (auth + scaffold wired in Tasks 6, 10)

```js
import { detectRoutes } from './routes.mjs';

export const firebaseFunctionsAdapter = {
  id: 'firebase-functions',
  matches: (detection) => detection?.framework === 'firebase-functions',
  detectRoutes,
  detectAuth: () => 'none', // replaced in Task 6
  scaffoldAffordance: () => {
    throw new Error('scaffoldAffordance lands in Task 10');
  },
  gateMechanism: () => ({
    kind: 'env',
    description:
      'Dev-tier functions 404 unless FUNCTIONS_EMULATOR === "true" or AGENT_ACCESS === "dev". Marker: vibe-access:dev-gate.',
  }),
};
```

- [ ] **Step 6: Register in `engine/adapters/index.mjs`**

Replace the two lines:

```js
// Task 5 replaces this empty array with [firebaseFunctionsAdapter].
const IMPLEMENTED_ADAPTERS = [];
```

with:

```js
import { firebaseFunctionsAdapter } from './firebase-functions/index.mjs';

const IMPLEMENTED_ADAPTERS = [firebaseFunctionsAdapter];
```

(keep the import at the top of the file with the other imports).

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — including a new implicit expectation in `tests/adapters.test.mjs`: add this test now:

```js
  test('firebase-functions detection resolves ready', () => {
    const r = resolveAdapter({ framework: 'firebase-functions', rewrites: [] });
    expect(r.status).toBe('ready');
    expect(r.adapter.id).toBe('firebase-functions');
  });
```

- [ ] **Step 8: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat(firebase-functions): detectRoutes — rewrites x exports cross-reference with unmapped honesty"
```

---

### Task 6: firebase-functions adapter — detectAuth

Auth truth for this stack: a handler that calls `verifyAuthToken(` requires a Firebase ID token (`'token'`). No recognized call → `'none'`. (`'session'` is reserved for cookie-session stacks; this adapter never emits it.)

**Files:**
- Create: `engine/adapters/firebase-functions/auth.mjs`, `tests/auth.test.mjs`
- Modify: `engine/adapters/firebase-functions/index.mjs` (wire real detectAuth)

**Interfaces:**
- Consumes: `RouteEntry` (with `handlerSourcePath`) from Task 5.
- Produces: `detectAuth(route, ctx) -> 'none' | 'session' | 'token'`. Consumed by Task 7 (scan writes it into inventory).

- [ ] **Step 1: Write the failing test `tests/auth.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { detect } from '../engine/detect.mjs';
import { firebaseFunctionsAdapter } from '../engine/adapters/firebase-functions/index.mjs';

const appRoot = fileURLToPath(new URL('./fixtures/app-firebase', import.meta.url));

describe('firebase-functions detectAuth', () => {
  const ctx = { appRoot, detection: detect(appRoot), config: null };
  const { routes } = firebaseFunctionsAdapter.detectRoutes(ctx);

  test('handler calling verifyAuthToken -> token', () => {
    const r = routes.find((x) => x.name === 'submitScore');
    expect(firebaseFunctionsAdapter.detectAuth(r, ctx)).toBe('token');
  });

  test('handler with no auth call -> none', () => {
    const r = routes.find((x) => x.name === 'leaderboard');
    expect(firebaseFunctionsAdapter.detectAuth(r, ctx)).toBe('none');
  });

  test('missing handler source degrades to none, never throws', () => {
    expect(
      firebaseFunctionsAdapter.detectAuth({ name: 'x', handlerSourcePath: null }, ctx)
    ).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth.test.mjs`
Expected: FAIL — `submitScore` resolves `'none'` (Task 5 stub returns `'none'` for everything).

- [ ] **Step 3: Write `engine/adapters/firebase-functions/auth.mjs`**

```js
import { readFileSync } from 'node:fs';

const TOKEN_CALL_RE = /\bverifyAuthToken\s*\(/;

export function detectAuth(route) {
  if (!route?.handlerSourcePath) return 'none';
  let source;
  try {
    source = readFileSync(route.handlerSourcePath, 'utf8');
  } catch {
    return 'none';
  }
  return TOKEN_CALL_RE.test(source) ? 'token' : 'none';
}
```

- [ ] **Step 4: Wire it in `engine/adapters/firebase-functions/index.mjs`**

Replace `detectAuth: () => 'none', // replaced in Task 6` with:

```js
  detectAuth,
```

and add `import { detectAuth } from './auth.mjs';` at the top.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/auth.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat(firebase-functions): detectAuth via verifyAuthToken heuristic"
```

---

### Task 7: Scan orchestration + CLI + scan report

**Files:**
- Create: `engine/scan.mjs`, `engine/report.mjs`, `engine/cli.mjs`, `tests/scan.test.mjs`

**Interfaces:**
- Consumes: `detect` (Task 3), `resolveAdapter` (Task 4), `validateInventory` (Task 2).
- Produces: `scan(appRoot, { now }) -> { inventory, adapterStatus }` where `inventory` validates against `inventory.schema.json`; `writeScanArtifacts(appRoot, inventory)` writes `.vibe-access/state/inventory.json` + `docs/vibe-access/scan-YYYY-MM-DD.md`; CLI `vibe-access scan --app <path>`. `renderScanReport(inventory) -> string` from `report.mjs`. Later tasks extend `cli.mjs` — its dispatch table is `const COMMANDS = { detect, scan, map, gaps, verify, stamp }`.

- [ ] **Step 1: Write the failing test `tests/scan.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { scan } from '../engine/scan.mjs';
import { validateInventory } from '../engine/schema.mjs';
import { renderScanReport } from '../engine/report.mjs';

const appRoot = fileURLToPath(new URL('./fixtures/app-firebase', import.meta.url));
const NOW = '2026-07-09T12:00:00.000Z';

describe('scan', () => {
  test('produces a schema-valid inventory for a firebase app', () => {
    const { inventory, adapterStatus } = scan(appRoot, { now: NOW });
    expect(adapterStatus).toBe('ready');
    expect(validateInventory(inventory).errors).toEqual([]);
    expect(inventory.routes.length).toBeGreaterThanOrEqual(2);
    expect(inventory.unmapped.length).toBeGreaterThanOrEqual(2);
  });

  test('unknown stack yields empty routes, not-yet-implemented, no throw', () => {
    const unknownRoot = fileURLToPath(new URL('./fixtures/app-unknown', import.meta.url));
    const { inventory, adapterStatus } = scan(unknownRoot, { now: NOW });
    expect(adapterStatus).toBe('not-yet-implemented');
    expect(inventory.routes).toEqual([]);
  });

  test('scan report names every unmapped entry', () => {
    const { inventory } = scan(appRoot, { now: NOW });
    const md = renderScanReport(inventory);
    expect(md).toContain('ghostFunction');
    expect(md).toContain('orphanFunction');
    expect(md).toContain('## Unmapped');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scan.test.mjs`
Expected: FAIL — `Cannot find module '../engine/scan.mjs'`.

- [ ] **Step 3: Write `engine/scan.mjs`**

```js
import { basename, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { detect } from './detect.mjs';
import { resolveAdapter } from './adapters/index.mjs';
import { validateInventory } from './schema.mjs';
import { renderScanReport } from './report.mjs';

export function scan(appRoot, { now } = {}) {
  const detection = detect(appRoot);
  const resolved = resolveAdapter(detection);
  const ctx = { appRoot, detection, config: null };

  let routes = [];
  let unmapped = [];
  if (resolved.status === 'ready') {
    const found = resolved.adapter.detectRoutes(ctx);
    routes = found.routes.map((r) => ({
      name: r.name,
      method: r.method,
      path: r.path,
      sourceRef: r.sourceRef,
      auth: resolved.adapter.detectAuth(r, ctx),
    }));
    unmapped = found.unmapped;
  }

  const inventory = {
    schemaVersion: 1,
    app: basename(appRoot),
    adapter: resolved.framework,
    generatedAt: now ?? new Date().toISOString(),
    routes,
    unmapped,
  };
  const check = validateInventory(inventory);
  if (!check.valid) throw new Error(`scan produced invalid inventory: ${check.errors.join('; ')}`);
  return { inventory, adapterStatus: resolved.status };
}

export function writeScanArtifacts(appRoot, inventory) {
  const stateDir = join(appRoot, '.vibe-access', 'state');
  const docsDir = join(appRoot, 'docs', 'vibe-access');
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });
  const invPath = join(stateDir, 'inventory.json');
  writeFileSync(invPath, JSON.stringify(inventory, null, 2));
  const day = inventory.generatedAt.slice(0, 10);
  const reportPath = join(docsDir, `scan-${day}.md`);
  writeFileSync(reportPath, renderScanReport(inventory));
  return { invPath, reportPath };
}
```

- [ ] **Step 4: Write `engine/report.mjs`**

```js
export function renderScanReport(inventory) {
  const lines = [
    `# vibe-access scan — ${inventory.app} — ${inventory.generatedAt.slice(0, 10)}`,
    '',
    `Adapter: **${inventory.adapter}** · Routes: **${inventory.routes.length}** · Unmapped: **${inventory.unmapped.length}**`,
    '',
    '## Routes',
    '',
    '| Method | Path | Auth | Source |',
    '|---|---|---|---|',
    ...inventory.routes.map((r) => `| ${r.method} | ${r.path} | ${r.auth} | ${r.sourceRef} |`),
    '',
    '## Unmapped',
    '',
    ...(inventory.unmapped.length
      ? inventory.unmapped.map((u) => `- \`${u.sourceRef}\` — ${u.reason}`)
      : ['Nothing unmapped.']),
    '',
  ];
  return lines.join('\n');
}

export function renderVerifyReport(run, manifest) {
  const counts = { pass: 0, fail: 0, 'pending-agent': 0, skipped: 0 };
  for (const r of run.results) counts[r.status] += 1;
  const lines = [
    `# vibe-access verify — ${manifest.app} — run ${run.runId}`,
    '',
    `Base URL: ${run.baseUrl} · pass ${counts.pass} · fail ${counts.fail} · pending-agent ${counts['pending-agent']} · skipped ${counts.skipped}`,
    '',
    '| Affordance | Status | HTTP | Detail |',
    '|---|---|---|---|',
    ...run.results.map(
      (r) => `| ${r.affordanceId} | ${r.status} | ${r.httpStatus ?? '—'} | ${r.detail ?? ''} |`
    ),
    '',
  ];
  return lines.join('\n');
}
```

- [ ] **Step 5: Write `engine/cli.mjs`**

```js
#!/usr/bin/env node
import { resolve } from 'node:path';
import { detect } from './detect.mjs';
import { scan, writeScanArtifacts } from './scan.mjs';

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const key = rest[i].slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(rest[i]);
    }
  }
  return { cmd, flags, positional };
}

const { cmd, flags, positional } = parseArgs(process.argv.slice(2));
const appRoot = resolve(flags.app ?? process.cwd());

const COMMANDS = {
  detect() {
    console.log(JSON.stringify(detect(appRoot), null, 2));
  },
  scan() {
    const { inventory, adapterStatus } = scan(appRoot);
    const { invPath, reportPath } = writeScanArtifacts(appRoot, inventory);
    console.log(
      JSON.stringify(
        { adapterStatus, routes: inventory.routes.length, unmapped: inventory.unmapped.length, invPath, reportPath },
        null,
        2
      )
    );
  },
  // map (Task 8), gaps (Task 9), verify + stamp (Task 11) extend this table.
};

const handler = COMMANDS[cmd];
if (!handler) {
  console.error(`Unknown command: ${cmd ?? '(none)'}. Commands: ${Object.keys(COMMANDS).join(', ')}`);
  process.exit(2);
}
try {
  handler();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

Note `positional` is unused until Task 11 (`stamp`); keep it.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 7: Smoke the CLI against the fixture**

Run: `node engine/cli.mjs scan --app tests/fixtures/app-firebase`
Expected: JSON summary with `"adapterStatus": "ready"`. Then delete the artifacts it wrote into the fixture: `rm -rf tests/fixtures/app-firebase/.vibe-access tests/fixtures/app-firebase/docs`.

- [ ] **Step 8: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat: scan orchestration, inventory artifacts, dated scan report, cli dispatch"
```

---

### Task 8: Map — inventory → manifest (`engine/map.mjs`)

Kind/tier policy (deterministic, tests pin it):
- `kind`: `GET` → `read`; anything else → `act`. (`seed`/`reset`/`capture` only ever originate from `:scaffold`.)
- `tier` default for existing routes: `prod-safe` — they are already deployed production surface; the tier describes agent-usage posture, not a deploy decision.
- Refusal rule: `assertTierLegal(kind, tier)` throws on `seed|reset|capture` + `prod-safe`. Runs on every affordance during map and merge.
- Merge: re-running map preserves `overrides` and `verified` from the previous manifest, matching by `id`. Overridden tier passes through `assertTierLegal` too.
- `id` derivation: route name kebab-cased (`submitScore` → `submit-score`).

**Files:**
- Create: `engine/map.mjs`, `tests/map.test.mjs`
- Modify: `engine/cli.mjs` (add `map` command)

**Interfaces:**
- Consumes: `inventory` (Task 7), `validateManifest` (Task 2).
- Produces: `buildManifest(inventory, { previous, baseUrls, now }) -> manifest`; `assertTierLegal(kind, tier)`; `writeManifest(appRoot, manifest)` (writes `agent-access.json` at app root). Consumed by Tasks 9-11.

- [ ] **Step 1: Write the failing test `tests/map.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { buildManifest, assertTierLegal } from '../engine/map.mjs';
import { validateManifest } from '../engine/schema.mjs';

const NOW = '2026-07-09T12:00:00.000Z';
const inventory = {
  schemaVersion: 1,
  app: 'fixture',
  adapter: 'firebase-functions',
  generatedAt: NOW,
  routes: [
    { name: 'leaderboard', method: 'GET', path: '/api/leaderboard', sourceRef: 'functions/src/l.js', auth: 'none' },
    { name: 'submitScore', method: 'POST', path: '/api/submit-score', sourceRef: 'functions/src/l.js', auth: 'token' },
  ],
  unmapped: [],
};
const baseUrls = { dev: 'http://localhost:5000' };

describe('buildManifest', () => {
  test('produces a schema-valid manifest with kind/tier defaults', () => {
    const m = buildManifest(inventory, { baseUrls, now: NOW });
    expect(validateManifest(m).errors).toEqual([]);
    const lb = m.affordances.find((a) => a.id === 'leaderboard');
    expect(lb.kind).toBe('read');
    expect(lb.tier).toBe('prod-safe');
    const ss = m.affordances.find((a) => a.id === 'submit-score');
    expect(ss.kind).toBe('act');
    expect(ss.auth).toBe('token');
    expect(ss.verified.status).toBe('unverified');
  });

  test('preserves verified stamps and overrides across re-map', () => {
    const first = buildManifest(inventory, { baseUrls, now: NOW });
    first.affordances[0].verified = { status: 'pass', at: NOW, runId: 'r1' };
    first.affordances[0].overrides = { tier: 'dev' };
    const second = buildManifest(inventory, { previous: first, baseUrls, now: NOW });
    expect(second.affordances[0].verified.status).toBe('pass');
    expect(second.affordances[0].tier).toBe('dev');
  });

  test('refusal rule throws, mechanically', () => {
    expect(() => assertTierLegal('seed', 'prod-safe')).toThrow(/never/i);
    expect(() => assertTierLegal('reset', 'prod-safe')).toThrow();
    expect(() => assertTierLegal('capture', 'prod-safe')).toThrow();
    expect(() => assertTierLegal('read', 'prod-safe')).not.toThrow();
    expect(() => assertTierLegal('seed', 'dev')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/map.test.mjs`
Expected: FAIL — `Cannot find module '../engine/map.mjs'`.

- [ ] **Step 3: Write `engine/map.mjs`**

```js
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { validateManifest } from './schema.mjs';

const NEVER_PROD_SAFE = new Set(['seed', 'reset', 'capture']);

export function assertTierLegal(kind, tier) {
  if (tier === 'prod-safe' && NEVER_PROD_SAFE.has(kind)) {
    throw new Error(
      `refusal: kind "${kind}" can never be tier "prod-safe". This is mechanical, not advisory.`
    );
  }
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function buildManifest(inventory, { previous = null, baseUrls, now } = {}) {
  const prevById = new Map((previous?.affordances ?? []).map((a) => [a.id, a]));

  const affordances = inventory.routes.map((route) => {
    const id = kebab(route.name);
    const kind = route.method === 'GET' ? 'read' : 'act';
    const prev = prevById.get(id);
    const overrides = prev?.overrides;
    const tier = overrides?.tier ?? 'prod-safe';
    assertTierLegal(kind, tier);
    return {
      id,
      description: overrides?.description ?? `${kind === 'read' ? 'Read' : 'Act'}: ${route.method} ${route.path}`,
      tier,
      kind,
      transport: { type: 'http', method: route.method, path: route.path },
      input: prev?.input ?? null,
      output: prev?.output ?? null,
      auth: route.auth,
      sourceRef: route.sourceRef,
      origin: prev?.origin ?? 'existing',
      verified: prev?.verified ?? { status: 'unverified' },
      ...(overrides ? { overrides } : {}),
    };
  });

  // scaffolded affordances from the previous manifest survive re-map (their routes
  // may not appear in a rewrites-only inventory until applied + rescanned)
  for (const prev of previous?.affordances ?? []) {
    if (prev.origin === 'scaffolded' && !affordances.some((a) => a.id === prev.id)) {
      assertTierLegal(prev.kind, prev.tier);
      affordances.push(prev);
    }
  }

  const manifest = {
    schemaVersion: 1,
    app: inventory.app,
    adapter: inventory.adapter,
    generatedAt: now ?? new Date().toISOString(),
    baseUrls,
    discoveryRoute: previous?.discoveryRoute ?? null,
    affordances,
  };
  const check = validateManifest(manifest);
  if (!check.valid) throw new Error(`map produced invalid manifest: ${check.errors.join('; ')}`);
  return manifest;
}

export function writeManifest(appRoot, manifest) {
  const path = join(appRoot, 'agent-access.json');
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}
```

- [ ] **Step 4: Extend `engine/cli.mjs`**

Add to the imports:

```js
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest, writeManifest } from './map.mjs';
```

Add to `COMMANDS`:

```js
  map() {
    const invPath = join(appRoot, '.vibe-access', 'state', 'inventory.json');
    if (!existsSync(invPath)) throw new Error('no inventory — run scan first');
    const inventory = JSON.parse(readFileSync(invPath, 'utf8'));
    const manifestPath = join(appRoot, 'agent-access.json');
    const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
    const configPath = join(appRoot, '.vibe-access', 'config.json');
    const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : null;
    const baseUrls = config?.baseUrls ?? { dev: flags['base-url'] ?? 'http://localhost:5000' };
    const manifest = buildManifest(inventory, { previous, baseUrls });
    const path = writeManifest(appRoot, manifest);
    console.log(JSON.stringify({ affordances: manifest.affordances.length, path }, null, 2));
  },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat: map — manifest builder with kind/tier policy, refusal rule, override-preserving merge"
```

---

### Task 9: Gap analysis (`engine/gaps.mjs`)

The needs-checklist from the spec: can an agent, through the manifest alone, (a) seed representative data, (b) reset to a known state, (c) read app state, (d) reach capture-worthy views, (e) act as a user, (f) discover the layer cold (discovery route). Each unmet need becomes a scaffold candidate spec.

**Files:**
- Create: `engine/gaps.mjs`, `tests/gaps.test.mjs`
- Modify: `engine/cli.mjs` (add `gaps` command)

**Interfaces:**
- Consumes: `manifest` (Task 8).
- Produces: `evaluateGaps(manifest) -> { met: string[], gaps: GapSpec[] }` where `GapSpec = { need, id, kind, description }` and `kind` ∈ `seed|reset|read|capture|act` per need mapping below. `GapSpec` objects are the input to `scaffoldAffordance` (Task 10) — Task 10's `spec.kind` values `read-state` and `discovery` map from needs `(c)` and `(f)`.

- [ ] **Step 1: Write the failing test `tests/gaps.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { evaluateGaps } from '../engine/gaps.mjs';

const base = {
  schemaVersion: 1,
  app: 'fixture',
  adapter: 'firebase-functions',
  generatedAt: '2026-07-09T12:00:00.000Z',
  baseUrls: { dev: 'http://localhost:5000' },
  discoveryRoute: null,
  affordances: [],
};

const aff = (kind, id = kind) => ({
  id, description: 'x', tier: 'dev', kind,
  transport: { type: 'http', method: 'POST', path: `/api/agent/${id}` },
  input: null, output: null, auth: 'none', sourceRef: 'f.js', origin: 'scaffolded',
  verified: { status: 'unverified' },
});

describe('evaluateGaps', () => {
  test('empty manifest gaps on all six needs', () => {
    const { gaps } = evaluateGaps(base);
    expect(gaps.map((g) => g.need).sort()).toEqual(
      ['act-as-user', 'capture', 'discovery', 'read-state', 'reset', 'seed']
    );
  });

  test('read + act affordances satisfy read-state and act-as-user', () => {
    const m = { ...base, affordances: [aff('read'), { ...aff('act'), tier: 'prod-safe' }] };
    const { gaps, met } = evaluateGaps(m);
    expect(met).toContain('read-state');
    expect(met).toContain('act-as-user');
    expect(gaps.map((g) => g.need)).toEqual(['seed', 'reset', 'capture', 'discovery']);
  });

  test('a discoveryRoute satisfies discovery', () => {
    const m = { ...base, discoveryRoute: '/api/agent/manifest' };
    expect(evaluateGaps(m).met).toContain('discovery');
  });

  test('gap specs carry scaffoldable ids and kinds', () => {
    const { gaps } = evaluateGaps(base);
    const seed = gaps.find((g) => g.need === 'seed');
    expect(seed.id).toBe('agent-seed');
    expect(seed.kind).toBe('seed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/gaps.test.mjs`
Expected: FAIL — `Cannot find module '../engine/gaps.mjs'`.

- [ ] **Step 3: Write `engine/gaps.mjs`**

```js
const NEEDS = [
  {
    need: 'seed',
    satisfiedBy: (m) => m.affordances.some((a) => a.kind === 'seed'),
    candidate: { id: 'agent-seed', kind: 'seed', description: 'Seed representative data for agent-driven testing.' },
  },
  {
    need: 'reset',
    satisfiedBy: (m) => m.affordances.some((a) => a.kind === 'reset'),
    candidate: { id: 'agent-reset', kind: 'reset', description: 'Reset app state to a known baseline.' },
  },
  {
    need: 'read-state',
    satisfiedBy: (m) => m.affordances.some((a) => a.kind === 'read'),
    candidate: { id: 'agent-state', kind: 'read-state', description: 'Read app state relevant to verification.' },
  },
  {
    need: 'capture',
    satisfiedBy: (m) => m.affordances.some((a) => a.kind === 'capture'),
    candidate: { id: 'agent-capture', kind: 'capture', description: 'Prepare a named screenshot-ready view state.' },
  },
  {
    need: 'act-as-user',
    satisfiedBy: (m) => m.affordances.some((a) => a.kind === 'act'),
    candidate: { id: 'agent-act', kind: 'act', description: 'Act through a real user flow within caller auth.' },
  },
  {
    need: 'discovery',
    satisfiedBy: (m) => typeof m.discoveryRoute === 'string' && m.discoveryRoute.length > 0,
    candidate: { id: 'agent-manifest', kind: 'discovery', description: 'Serve the agent-access manifest at a dev-only route.' },
  },
];

export function evaluateGaps(manifest) {
  const met = [];
  const gaps = [];
  for (const n of NEEDS) {
    if (n.satisfiedBy(manifest)) {
      met.push(n.need);
    } else {
      gaps.push({ need: n.need, ...n.candidate });
    }
  }
  return { met, gaps };
}
```

- [ ] **Step 4: Extend `engine/cli.mjs`** — add to `COMMANDS`:

```js
  gaps() {
    const manifestPath = join(appRoot, 'agent-access.json');
    if (!existsSync(manifestPath)) throw new Error('no manifest — run map first');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    console.log(JSON.stringify(evaluateGaps(manifest), null, 2));
  },
```

with `import { evaluateGaps } from './gaps.mjs';` added to the imports.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat: gap analysis — six-need checklist producing scaffold candidate specs"
```

---

### Task 10: Scaffold — templates, gate enforcement, backup/rollback

Scaffolding is two phases: the **adapter plans** (pure — returns files + patches), the **engine applies** (writes files, backs up patch targets, enforces the gate marker). Patches to existing files (`functions/index.js` exports line, `firebase.json` rewrite entry) are emitted as descriptors — the `:scaffold` SKILL applies them via Edit after user review; the engine only writes NEW files.

**Files:**
- Create: `engine/adapters/firebase-functions/scaffold.mjs`, `engine/adapters/firebase-functions/templates/affordance.cjs.template`, `engine/adapters/firebase-functions/templates/discovery.cjs.template`, `engine/backup.mjs`, `engine/scaffold.mjs`, `tests/scaffold.test.mjs`, `tests/backup.test.mjs`
- Modify: `engine/adapters/firebase-functions/index.mjs` (wire scaffoldAffordance)

**Interfaces:**
- Consumes: `GapSpec` (Task 9), contract (Task 4).
- Produces: `scaffoldAffordance(spec, ctx) -> ScaffoldPlan`; `applyPlan(appRoot, plan, { batchId }) -> { written: string[], pendingPatches: Patch[], backupDir }` from `engine/scaffold.mjs`; `backupFiles(appRoot, paths, batchId)` / `rollback(appRoot, batchId)` from `engine/backup.mjs`. Gate marker string `vibe-access:dev-gate` is load-bearing — `applyPlan` throws if a dev-tier planned file lacks it.

- [ ] **Step 1: Write `templates/affordance.cjs.template`**

```js
// __DESCRIPTION__
// Generated by vibe-access :scaffold — tier: dev. Safe to edit; regenerate with care.
const { onRequest } = require('firebase-functions/v2/https');

// vibe-access:dev-gate — hard 404 outside dev. Do not remove.
function devGate(req, res) {
  const isDev = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.AGENT_ACCESS === 'dev';
  if (!isDev) {
    res.status(404).send('Not found');
    return false;
  }
  return true;
}

exports.__EXPORT_NAME__ = onRequest(async (req, res) => {
  if (!devGate(req, res)) return;
  // TODO(builder): implement the __KIND__ affordance for this app.
  // The :scaffold skill fills this body per-app during dogfood — the template
  // ships the gate, the transport, and the response contract.
  res.json({ ok: true, affordance: '__ID__', kind: '__KIND__' });
});
```

(The `TODO(builder)` here is deliberate and stays in the generated file — it marks the app-specific body the skill writes at scaffold time. It is not a plan placeholder: the plan's contract is gate + transport + response shape; the body is per-app by design.)

- [ ] **Step 2: Write `templates/discovery.cjs.template`**

```js
// Serve the agent-access manifest at a dev-only discovery route.
// Generated by vibe-access :scaffold — tier: dev.
const { onRequest } = require('firebase-functions/v2/https');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// vibe-access:dev-gate — hard 404 outside dev. Do not remove.
function devGate(req, res) {
  const isDev = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.AGENT_ACCESS === 'dev';
  if (!isDev) {
    res.status(404).send('Not found');
    return false;
  }
  return true;
}

exports.agentManifest = onRequest(async (req, res) => {
  if (!devGate(req, res)) return;
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', 'agent-access.json'), 'utf8'));
  res.json(manifest);
});
```

- [ ] **Step 3: Write the failing tests**

`tests/scaffold.test.mjs`:

```js
import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cpSync } from 'node:fs';
import { detect } from '../engine/detect.mjs';
import { firebaseFunctionsAdapter } from '../engine/adapters/firebase-functions/index.mjs';
import { applyPlan } from '../engine/scaffold.mjs';

const fixture = fileURLToPath(new URL('./fixtures/app-firebase', import.meta.url));

describe('firebase-functions scaffoldAffordance', () => {
  const ctx = { appRoot: fixture, detection: detect(fixture), config: null };

  test('seed spec plans a gated function file + index export patch + rewrite patch', () => {
    const plan = firebaseFunctionsAdapter.scaffoldAffordance(
      { id: 'agent-seed', kind: 'seed', description: 'Seed data.' },
      ctx
    );
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0].path).toMatch(/functions[\\/]src[\\/]agent-access[\\/]agent-seed\.js$/);
    expect(plan.files[0].contents).toContain('vibe-access:dev-gate');
    expect(plan.patches.some((p) => p.path.endsWith('index.js'))).toBe(true);
    expect(plan.patches.some((p) => p.path.endsWith('firebase.json'))).toBe(true);
  });

  test('discovery spec uses the discovery template', () => {
    const plan = firebaseFunctionsAdapter.scaffoldAffordance(
      { id: 'agent-manifest', kind: 'discovery', description: 'Discovery route.' },
      ctx
    );
    expect(plan.files[0].contents).toContain('agent-access.json');
  });
});

describe('applyPlan', () => {
  test('writes new files, defers patches, refuses gateless dev files', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'va-'));
    cpSync(fixture, tmp, { recursive: true });
    try {
      const ctx = { appRoot: tmp, detection: detect(tmp), config: null };
      const plan = firebaseFunctionsAdapter.scaffoldAffordance(
        { id: 'agent-seed', kind: 'seed', description: 'Seed data.' },
        ctx
      );
      const result = applyPlan(tmp, plan, { batchId: 'b1' });
      expect(existsSync(result.written[0])).toBe(true);
      expect(result.pendingPatches.length).toBe(2);

      const gateless = { files: [{ path: 'functions/src/agent-access/bad.js', contents: 'nope' }], patches: [], notes: [] };
      expect(() => applyPlan(tmp, gateless, { batchId: 'b2' })).toThrow(/dev-gate/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
```

`tests/backup.test.mjs`:

```js
import { describe, test, expect } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupFiles, rollback } from '../engine/backup.mjs';

describe('backup/rollback', () => {
  test('round-trips a modified file back to its backed-up contents', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'va-bk-'));
    try {
      const target = join(tmp, 'functions', 'index.js');
      mkdirSync(join(tmp, 'functions'), { recursive: true });
      writeFileSync(target, 'original');
      backupFiles(tmp, ['functions/index.js'], 'batch1');
      writeFileSync(target, 'mutated');
      rollback(tmp, 'batch1');
      expect(readFileSync(target, 'utf8')).toBe('original');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('rollback on unknown batch throws a named error', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'va-bk-'));
    try {
      expect(() => rollback(tmp, 'ghost')).toThrow(/no backup/i);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- tests/scaffold.test.mjs tests/backup.test.mjs`
Expected: FAIL — modules not found / Task 5's `scaffoldAffordance` throw.

- [ ] **Step 5: Write `engine/backup.mjs`**

```js
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const backupRoot = (appRoot) => join(appRoot, '.vibe-access', 'scaffold', 'backup');

export function backupFiles(appRoot, relPaths, batchId) {
  const dir = join(backupRoot(appRoot), batchId);
  mkdirSync(dir, { recursive: true });
  const entries = [];
  for (const rel of relPaths) {
    const src = join(appRoot, rel);
    if (!existsSync(src)) continue;
    const dest = join(dir, rel.replaceAll('\\', '/').replaceAll('/', '__'));
    copyFileSync(src, dest);
    entries.push({ rel, stored: dest });
  }
  writeFileSync(join(dir, 'backup-manifest.json'), JSON.stringify({ batchId, entries }, null, 2));
  return dir;
}

export function rollback(appRoot, batchId) {
  const manifestPath = join(backupRoot(appRoot), batchId, 'backup-manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`no backup for batch "${batchId}"`);
  const { entries } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const { rel, stored } of entries) {
    const target = join(appRoot, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(stored, target);
  }
  return entries.map((e) => e.rel);
}
```

- [ ] **Step 6: Write `engine/adapters/firebase-functions/scaffold.mjs`**

```js
import { readFileSync } from 'node:fs';

const load = (name) =>
  readFileSync(new URL(`./templates/${name}.template`, import.meta.url), 'utf8');

const camel = (kebabId) => kebabId.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

export function scaffoldAffordance(spec, ctx) {
  const isDiscovery = spec.kind === 'discovery';
  const exportName = isDiscovery ? 'agentManifest' : camel(spec.id);
  const routePath = isDiscovery ? '/api/agent/manifest' : `/api/agent/${spec.id.replace(/^agent-/, '')}`;
  const template = isDiscovery ? load('discovery.cjs') : load('affordance.cjs');
  const contents = template
    .replaceAll('__DESCRIPTION__', spec.description)
    .replaceAll('__EXPORT_NAME__', exportName)
    .replaceAll('__KIND__', spec.kind)
    .replaceAll('__ID__', spec.id);

  return {
    files: [{ path: `functions/src/agent-access/${spec.id}.js`, contents }],
    patches: [
      {
        path: 'functions/index.js',
        anchor: 'end-of-file',
        insert: `exports.${exportName} = require('./src/agent-access/${spec.id}').${exportName};\n`,
        note: 'append the export line',
      },
      {
        path: 'firebase.json',
        anchor: 'hosting.rewrites before the ** catch-all',
        insert: JSON.stringify({ source: routePath, function: exportName }),
        note: 'insert the rewrite entry before the SPA fallback',
      },
    ],
    notes: [
      `dev-gated: 404s unless FUNCTIONS_EMULATOR/AGENT_ACCESS says dev`,
      `route: POST ${routePath}`,
    ],
  };
}
```

- [ ] **Step 7: Write `engine/scaffold.mjs`**

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { backupFiles } from './backup.mjs';

const GATE_MARKER = 'vibe-access:dev-gate';

export function applyPlan(appRoot, plan, { batchId }) {
  for (const f of plan.files) {
    if (!f.contents.includes(GATE_MARKER)) {
      throw new Error(
        `refusing to apply: planned file ${f.path} lacks the ${GATE_MARKER} marker — dev-tier scaffolds must be gated`
      );
    }
  }
  const backupDir = backupFiles(appRoot, plan.patches.map((p) => p.path), batchId);
  const written = [];
  for (const f of plan.files) {
    const abs = join(appRoot, f.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, f.contents);
    written.push(abs);
  }
  return { written, pendingPatches: plan.patches, backupDir };
}
```

- [ ] **Step 8: Wire the adapter** — in `engine/adapters/firebase-functions/index.mjs`, replace the throwing `scaffoldAffordance` with the import:

```js
import { scaffoldAffordance } from './scaffold.mjs';
```

and `scaffoldAffordance,` in the object.

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 10: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat: scaffold — gated templates, plan/apply split, gate-marker refusal, backup/rollback"
```

---

### Task 11: Verify (`engine/verify.mjs`)

Engine verifies what HTTP can prove; `capture`-kind affordances get `pending-agent` (the :verify SKILL drives Playwright, then stamps via CLI). Pass criteria per affordance: response status < 500 AND — for `auth: none` — not 404. An affordance requiring `token` auth without a provided token expects 401/403 (proving the gate holds) and records `pass` with detail `auth-gate-held`; anything else (404, 5xx) is `fail`.

**Files:**
- Create: `engine/verify.mjs`, `tests/verify.test.mjs`
- Modify: `engine/cli.mjs` (add `verify` + `stamp` commands)

**Interfaces:**
- Consumes: `manifest` (Task 8), `validateVerifyRun` (Task 2), `renderVerifyReport` (Task 7).
- Produces: `isLocalUrl(url) -> boolean`; `runVerify(manifest, { baseUrl, force, fetchImpl, runId, now }) -> run` (schema-valid); `stampManifest(manifest, run) -> manifest` (immutably returns a re-stamped copy); CLI `verify --app <p> [--base-url <u>] [--force]` and `stamp <affordanceId> <pass|fail> --run <runId> --app <p>`.

- [ ] **Step 1: Write the failing test `tests/verify.test.mjs`**

```js
import { describe, test, expect } from '@jest/globals';
import { isLocalUrl, runVerify, stampManifest } from '../engine/verify.mjs';
import { validateVerifyRun } from '../engine/schema.mjs';

const NOW = '2026-07-09T12:00:00.000Z';
const aff = (over) => ({
  id: 'a', description: 'x', tier: 'prod-safe', kind: 'read',
  transport: { type: 'http', method: 'GET', path: '/api/a' },
  input: null, output: null, auth: 'none', sourceRef: 'f.js', origin: 'existing',
  verified: { status: 'unverified' }, ...over,
});
const manifest = {
  schemaVersion: 1, app: 'fixture', adapter: 'firebase-functions', generatedAt: NOW,
  baseUrls: { dev: 'http://localhost:5000' }, discoveryRoute: null,
  affordances: [
    aff({ id: 'ok-read' }),
    aff({ id: 'gated-act', kind: 'act', auth: 'token', transport: { type: 'http', method: 'POST', path: '/api/act' } }),
    aff({ id: 'shot', kind: 'capture', tier: 'dev', transport: { type: 'http', method: 'POST', path: '/api/agent/shot' } }),
    aff({ id: 'broken', transport: { type: 'http', method: 'GET', path: '/api/broken' } }),
  ],
};

const fakeFetch = async (url, opts = {}) => {
  if (url.endsWith('/api/a')) return { status: 200 };
  if (url.endsWith('/api/act')) return { status: 401 };
  if (url.endsWith('/api/broken')) return { status: 500 };
  return { status: 404 };
};

describe('isLocalUrl', () => {
  test('localhost family is local; anything else is not', () => {
    expect(isLocalUrl('http://localhost:5000')).toBe(true);
    expect(isLocalUrl('http://127.0.0.1:5001')).toBe(true);
    expect(isLocalUrl('https://weseeyouatthemovies.web.app')).toBe(false);
  });
});

describe('runVerify', () => {
  test('refuses a non-local base URL without force', async () => {
    await expect(
      runVerify(manifest, { baseUrl: 'https://prod.example.com', fetchImpl: fakeFetch, runId: 'r1', now: NOW })
    ).rejects.toThrow(/not local/i);
  });

  test('produces a schema-valid run with the right statuses', async () => {
    const run = await runVerify(manifest, {
      baseUrl: 'http://localhost:5000', fetchImpl: fakeFetch, runId: 'r1', now: NOW,
    });
    expect(validateVerifyRun(run).errors).toEqual([]);
    const by = Object.fromEntries(run.results.map((r) => [r.affordanceId, r]));
    expect(by['ok-read'].status).toBe('pass');
    expect(by['gated-act'].status).toBe('pass');
    expect(by['gated-act'].detail).toBe('auth-gate-held');
    expect(by['shot'].status).toBe('pending-agent');
    expect(by['broken'].status).toBe('fail');
  });

  test('stampManifest writes results back, fail-closed for untouched affordances', async () => {
    const run = await runVerify(manifest, {
      baseUrl: 'http://localhost:5000', fetchImpl: fakeFetch, runId: 'r1', now: NOW,
    });
    const stamped = stampManifest(manifest, run);
    expect(stamped.affordances.find((a) => a.id === 'ok-read').verified.status).toBe('pass');
    expect(stamped.affordances.find((a) => a.id === 'shot').verified.status).toBe('pending-agent');
    expect(manifest.affordances.find((a) => a.id === 'ok-read').verified.status).toBe('unverified');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/verify.test.mjs`
Expected: FAIL — `Cannot find module '../engine/verify.mjs'`.

- [ ] **Step 3: Write `engine/verify.mjs`**

```js
import { validateVerifyRun } from './schema.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

export function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function callOne(affordance, baseUrl, fetchImpl) {
  const url = `${baseUrl.replace(/\/$/, '')}${affordance.transport.path}`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: affordance.transport.method,
      headers: { 'content-type': 'application/json' },
      ...(affordance.transport.method === 'GET' ? {} : { body: '{}' }),
    });
  } catch (err) {
    return { affordanceId: affordance.id, status: 'fail', httpStatus: null, detail: `unreachable: ${err.message}` };
  }
  const s = res.status;
  if (affordance.auth !== 'none' && (s === 401 || s === 403)) {
    return { affordanceId: affordance.id, status: 'pass', httpStatus: s, detail: 'auth-gate-held' };
  }
  if (s >= 500 || (affordance.auth === 'none' && s === 404)) {
    return { affordanceId: affordance.id, status: 'fail', httpStatus: s, detail: `unexpected ${s}` };
  }
  return { affordanceId: affordance.id, status: 'pass', httpStatus: s, detail: '' };
}

export async function runVerify(manifest, { baseUrl, force = false, fetchImpl = fetch, runId, now } = {}) {
  if (!isLocalUrl(baseUrl) && !force) {
    throw new Error(`refusing to verify against ${baseUrl} — not local. Pass --force to override deliberately.`);
  }
  const results = [];
  for (const a of manifest.affordances) {
    if (a.kind === 'capture') {
      results.push({ affordanceId: a.id, status: 'pending-agent', httpStatus: null, detail: 'capture-kind: agent drives Playwright, then stamps' });
      continue;
    }
    if ((a.kind === 'seed' || a.kind === 'reset') && !isLocalUrl(baseUrl)) {
      results.push({ affordanceId: a.id, status: 'skipped', httpStatus: null, detail: 'seed/reset never exercised non-locally' });
      continue;
    }
    results.push(await callOne(a, baseUrl, fetchImpl));
  }
  const run = {
    schemaVersion: 1,
    runId,
    startedAt: now ?? new Date().toISOString(),
    baseUrl,
    forced: !!force,
    results,
  };
  const check = validateVerifyRun(run);
  if (!check.valid) throw new Error(`verify produced invalid run: ${check.errors.join('; ')}`);
  return run;
}

export function stampManifest(manifest, run) {
  const byId = new Map(run.results.map((r) => [r.affordanceId, r]));
  return {
    ...manifest,
    affordances: manifest.affordances.map((a) => {
      const r = byId.get(a.id);
      if (!r || r.status === 'skipped') return a;
      return {
        ...a,
        verified: { status: r.status, at: run.startedAt, runId: run.runId, ...(r.detail ? { detail: r.detail } : {}) },
      };
    }),
  };
}
```

- [ ] **Step 4: Extend `engine/cli.mjs`** — add imports:

```js
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runVerify, stampManifest } from './verify.mjs';
import { renderVerifyReport } from './report.mjs';
```

and two commands:

```js
  async verify() {
    const manifestPath = join(appRoot, 'agent-access.json');
    if (!existsSync(manifestPath)) throw new Error('no manifest — run map first');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const baseUrl = flags['base-url'] ?? manifest.baseUrls.dev;
    const run = await runVerify(manifest, { baseUrl, force: flags.force === true, runId: randomUUID().slice(0, 8) });
    const runDir = join(appRoot, '.vibe-access', 'verify');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, `run-${run.runId}.json`), JSON.stringify(run, null, 2));
    const stamped = stampManifest(manifest, run);
    writeFileSync(manifestPath, JSON.stringify(stamped, null, 2));
    const docsDir = join(appRoot, 'docs', 'vibe-access');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, `verify-${run.startedAt.slice(0, 10)}.md`), renderVerifyReport(run, stamped));
    console.log(JSON.stringify({ runId: run.runId, results: run.results }, null, 2));
  },
  stamp() {
    const [affordanceId, status] = positional;
    if (!affordanceId || !['pass', 'fail'].includes(status)) {
      throw new Error('usage: vibe-access stamp <affordanceId> <pass|fail> --run <runId> --app <path>');
    }
    const manifestPath = join(appRoot, 'agent-access.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const a = manifest.affordances.find((x) => x.id === affordanceId);
    if (!a) throw new Error(`no affordance "${affordanceId}" in manifest`);
    a.verified = { status, at: new Date().toISOString(), runId: String(flags.run ?? 'manual') };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ stamped: affordanceId, status }, null, 2));
  },
```

The dispatch call becomes `await handler();` inside an async IIFE (or top-level await — the file is ESM, top-level await is fine):

```js
try {
  await handler();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-access/engine plugins/vibe-access/tests
git commit -m "feat: verify — local-only guard, auth-gate-held semantics, manifest stamping, cli verify/stamp"
```

---

### Task 12: The eleven skills + command stubs

Skills are prose contracts for the agent running the plugin. Frontmatter = `name` + `description` only; description starts with trigger phrases, then read/write posture. Bodies below are complete v0.1 content — write them verbatim, adjusting only if a prior task changed a path.

**Files:**
- Create: `skills/router/SKILL.md`, `skills/guide/SKILL.md`, `skills/scan/SKILL.md`, `skills/map/SKILL.md`, `skills/scaffold/SKILL.md`, `skills/verify/SKILL.md`, `skills/vitals/SKILL.md`, `skills/first-run-setup/SKILL.md`, `skills/session-logger/SKILL.md`, `skills/friction-logger/SKILL.md`, `skills/evolve-access/SKILL.md`
- Create: `commands/vibe-access.md`, `commands/scan.md`, `commands/map.md`, `commands/scaffold.md`, `commands/verify.md`, `commands/vitals.md`

**Interfaces:**
- Consumes: every engine CLI command (Tasks 7-11).
- Produces: the user-facing plugin surface. Command stubs each contain one line pointing at their skill (family pattern), e.g. `commands/scan.md` body: `Use the vibe-access scan skill: read skills/scan/SKILL.md and follow it.` with frontmatter `description: Inventory the app's routes and auth model`.

- [ ] **Step 1: Write `skills/guide/SKILL.md`**

```markdown
---
name: guide
description: Internal reference loaded by every vibe-access command skill. Persona, posture, conventions, and the safety invariants. Not user-invocable.
---

# vibe-access guide

You are running vibe-access — the agent-access pillar of the vibe-* family. The job:
give agents pipelines into the target app, prove them, and keep the dangerous ones
out of production mechanically.

Posture:
- Read-only steps (scan, map) never touch app source. Mutating steps (scaffold) are
  backup-wrapped and reviewed before apply. Verify never mutates anything reachable
  at a non-local URL.
- The manifest (agent-access.json) is the single artifact. Everything reads it,
  everything honest about it: unverified affordances stay marked unverified.
- Tiers: dev (env-gated, never ships) and prod-safe (caller's own auth only).
  seed/reset/capture can NEVER be prod-safe — the engine throws; do not route around it.
- No secrets in the manifest, in reports, or in logs. Auth is a requirement type,
  never a credential.
- Unrecognized stack? The adapter seam reports not-yet-implemented. Offer the agnostic
  path: you (the agent) do the adapter's four jobs by hand against the same contracts,
  and write what you learned to ~/.claude/plugins/data/vibe-access/adapter-notes/<stack>.md.
  That file is the seed of the next real adapter.

Engine: `node engine/cli.mjs <detect|scan|map|gaps|verify|stamp> --app <path>` from
plugins/vibe-access/. All state in the target app under .vibe-access/; manifest at app
root; reports in docs/vibe-access/.

Voice: builder-to-builder, tight, specific. No corporate speak.
```

- [ ] **Step 2: Write `skills/router/SKILL.md`**

```markdown
---
name: router
description: This skill should be used when the user says "/vibe-access" (bare, no subcommand), "set up agent access", "give agents access to my app", or asks what vibe-access should do next. Reads .vibe-access/ state and agent-access.json in the target app, recommends the next step, and hands off. Never auto-fires a mutating step.
---

# vibe-access router

Load skills/guide/SKILL.md first. Then inspect the target app, first match wins:

1. No `.vibe-access/config.json` → first run → invoke the first-run-setup skill, then
   recommend `/vibe-access:scan`.
2. Config but no `.vibe-access/state/inventory.json` → recommend `/vibe-access:scan`.
3. Inventory but no `agent-access.json` → recommend `/vibe-access:map`.
4. Manifest exists → run `node engine/cli.mjs gaps --app <path>`. Gaps found →
   recommend `/vibe-access:scaffold` and list the gaps by need. No gaps and any
   affordance is `unverified` or `fail` → recommend `/vibe-access:verify`.
5. Manifest fully verified → report posture: affordance count by tier/kind, last verify
   date, and note the layer is MCP-graduation-ready (manual step, out of v0.1 scope).

Always end with the one recommended command and why. Use AskUserQuestion when the
user's intent is ambiguous. Never run scaffold or verify without the user asking.
```

- [ ] **Step 3: Write `skills/scan/SKILL.md`**

```markdown
---
name: scan
description: This skill should be used when the user says "/vibe-access:scan", "scan my routes", "inventory my API surface", "what can an agent call in this app", or wants the route/auth inventory. Runs the engine scan; writes .vibe-access/state/inventory.json plus a dated report in docs/vibe-access/. Read-only — no source mutation.
---

# vibe-access scan

Load skills/guide/SKILL.md. Ensure config exists (else run first-run-setup).

1. Run `node engine/cli.mjs scan --app <target>`.
2. If adapterStatus is `not-yet-implemented`: tell the user which stack was detected,
   offer the agnostic path (guide has the contract), and — if they accept — build the
   inventory by hand to the same schema, then write adapter-notes.
3. Summarize: route count, auth split (none/token/session), and EVERY unmapped entry
   with its reason. Unmapped is a first-class finding, not noise.
4. Point at the dated report. Recommend `/vibe-access:map` next.
```

- [ ] **Step 4: Write `skills/map/SKILL.md`**

```markdown
---
name: map
description: This skill should be used when the user says "/vibe-access:map", "build the manifest", "generate agent-access.json", or wants the agent-access manifest from a completed scan. Reads the inventory, writes agent-access.json at the app root. Read-only against app source; re-runnable — preserves overrides and verify stamps.
---

# vibe-access map

Load skills/guide/SKILL.md. Requires .vibe-access/state/inventory.json (else recommend scan).

1. Run `node engine/cli.mjs map --app <target>`.
2. Walk the generated manifest WITH the user at a glance: affordances by tier and kind,
   anything surprising (an unauthenticated act-kind route is worth a flag — suggest a
   tier override to dev, or a vibe-sec look).
3. Improve descriptions where the generated ones are thin — the manifest is written for
   an agent reader who has never seen the source. Edit agent-access.json descriptions
   directly; they survive re-map via overrides only if moved there, so prefer
   overrides.description for anything hand-tuned.
4. Recommend `/vibe-access:scaffold` (if gaps) or `/vibe-access:verify` next.
```

- [ ] **Step 5: Write `skills/scaffold/SKILL.md`**

```markdown
---
name: scaffold
description: This skill should be used when the user says "/vibe-access:scaffold", "fill the gaps", "add the missing affordances", "add seed/reset endpoints", or wants purpose-built agent endpoints generated. MUTATING — writes new gated files under the app's source tree, backup-wrapped; patches to existing files are reviewed and applied via Edit, never blind.
---

# vibe-access scaffold

Load skills/guide/SKILL.md. Requires agent-access.json (else recommend map).

1. Run `node engine/cli.mjs gaps --app <target>`. Present the gaps and let the user
   pick which to scaffold (AskUserQuestion, multiSelect). Never scaffold unpicked gaps.
2. For each picked gap, get the plan from the adapter (the engine applies new files;
   you apply patches):
   - New files: written by `applyPlan` with the dev-gate marker check and a backup
     batch. The template body is a stub — YOU write the app-specific implementation
     into it now (seed: create representative docs via the app's own patterns; reset:
     delete/restore the seeded set; read-state: return the collections a verifier
     needs; capture: put the app into the named visual state). Match the app's code
     style. Keep the gate function untouched.
   - Patches (index.js export line, firebase.json rewrite): show the user each
     insert, then apply via Edit. The rewrite entry goes BEFORE the `**` catch-all.
3. After applying: re-run scan + map so the new routes join the inventory, then update
   the scaffolded affordances' origin/tier in the manifest (they arrive as
   origin: scaffolded, tier: dev — the engine enforces the refusal rule).
4. State the rollback path: `.vibe-access/scaffold/backup/<batchId>/` restores patch
   targets; new files are listed in the apply output — delete them to undo.
5. Recommend `/vibe-access:verify` next.
```

- [ ] **Step 6: Write `skills/verify/SKILL.md`**

```markdown
---
name: verify
description: This skill should be used when the user says "/vibe-access:verify", "prove the layer", "test the agent access", "drive the app through the manifest", or after scaffold completes. Exercises every affordance cold — manifest only, no source reading. Never runs against a non-local URL without explicit user say-so (--force).
---

# vibe-access verify

Load skills/guide/SKILL.md. Requires agent-access.json.

The cold rule: from this point you work from the manifest ALONE. Do not read the app's
source to figure out how to call an affordance — if you have to, that is a verify
FAILURE of the manifest's description quality. Fix the description, then retry.

1. Confirm the dev server is running (config.devRunCommand tells you how to start it;
   ask the user or start it yourself in background).
2. Run `node engine/cli.mjs verify --app <target>` (add `--base-url` if config's dev
   URL is stale; NEVER pass --force without the user explicitly choosing it).
3. For each `pending-agent` result (capture-kind): drive the affordance via the
   Playwright MCP tools — call the affordance's transport to stage the view, navigate,
   screenshot, judge the result — then stamp:
   `node engine/cli.mjs stamp <id> <pass|fail> --run <runId> --app <target>`.
4. Report per-affordance results from the dated report. Failures get a one-line
   diagnosis each. The layer is done when every affordance is pass — say so plainly
   when it is, and say what is NOT verified when it is not.
```

- [ ] **Step 7: Write `skills/first-run-setup/SKILL.md`**

```markdown
---
name: first-run-setup
description: Internal skill invoked on first vibe-access use in an app lacking .vibe-access/config.json, or directly on "set up vibe-access", "init vibe-access". Captures app name, adapter, base URLs, dev-run command. Writes exactly one file — .vibe-access/config.json. Idempotent; read-only on source.
---

# vibe-access first-run-setup

1. Run `node engine/cli.mjs detect --app <target>`. Report the detected framework.
2. Gather (AskUserQuestion where not derivable): app name (default: directory name),
   dev base URL (for firebase-functions: the hosting emulator origin, usually
   http://localhost:5000 — check firebase.json emulators block), prod base URL
   (optional), dev-run command (e.g. `firebase emulators:start`), one-line auth-model
   note.
3. Write .vibe-access/config.json matching schemas/config.schema.json (validate before
   reporting success). Re-running refreshes stale values; never touches anything else.
```

- [ ] **Step 8: Write `skills/vitals/SKILL.md`**

```markdown
---
name: vitals
description: This skill should be used when the user says "/vibe-access:vitals", "is vibe-access healthy", "self-test the plugin". Read-only structural self-check of the plugin installation itself (not the target app). Banner report with ✓/⚠/✗ per check.
---

# vibe-access vitals

Run these eight checks against the plugin's own install directory; render one line
each with ✓ (pass), ⚠ (degraded), ✗ (fail), then a summary line `N ✓ · N ⚠ · N ✗`:

1. `.claude-plugin/plugin.json` parses; name is vibe-access.
2. All 11 skills present under skills/ with name+description frontmatter.
3. All 6 command stubs present under commands/.
4. Engine modules present: cli, detect, scan, map, gaps, scaffold, verify, backup,
   schema, report (+ adapters/index).
5. CLI answers: `node engine/cli.mjs detect --app .` exits 0.
6. firebase-functions adapter present with both templates; templates contain the
   vibe-access:dev-gate marker.
7. All 4 schemas parse as JSON.
8. Test suite green: `npm test` exits 0.
```

- [ ] **Step 9: Write the three placeholder skills** (family pattern: paths reserved now, implementation later)

`skills/session-logger/SKILL.md`:

```markdown
---
name: session-logger
description: Internal placeholder (v0.1) — reserved logging contract for vibe-access sessions. Command skills reference it at start and end; it documents the format so the data home is stable when implemented.
---

# session-logger (v0.1 placeholder)

Reserved path: `~/.claude/plugins/data/vibe-access/sessions.jsonl` (append-only).
Entry shape, two-phase per session:
start `{sessionUUID, timestamp, command, targetApp, outcome: "in_progress"}` /
end `{sessionUUID, timestamp, command, targetApp, outcome: completed|aborted|error,
durationMs, summary: {routes, affordances, gapsScaffolded, verifyPass, verifyFail}}`.
Never log source contents, URLs with credentials, or auth material. v0.1 writes
nothing — the contract exists so v0.2 doesn't break format.
```

`skills/friction-logger/SKILL.md`:

```markdown
---
name: friction-logger
description: Internal placeholder (v0.1) — reserved friction-event contract. Command skills name their trigger codes; v0.2 implements the writes.
---

# friction-logger (v0.1 placeholder)

Reserved path: `~/.claude/plugins/data/vibe-access/friction.jsonl` (append-only).
Entry `{timestamp, sessionUUID, command, trigger, confidence, context}`.
Trigger catalog (confidence fixed per code): `no-recognized-stack` (high),
`inventory-schema-violation` (high), `manifest-refusal-tripped` (high),
`unmapped-majority` (medium — more unmapped than mapped), `verify-nonlocal-forced`
(high), `cold-read-failed` (high — verifier had to read source; P0, the manifest
failed its purpose), `scaffold-rolled-back` (medium), `adapter-notes-written` (low).
```

`skills/evolve-access/SKILL.md`:

```markdown
---
name: evolve-access
description: This skill should be used when the user says "/vibe-access:evolve-access" and wants vibe-access to propose improvements to itself from session/friction history. v0.1 placeholder — paths fixed, no implementation.
---

# evolve-access (v0.1 placeholder)

Reads (when implemented): `~/.claude/plugins/data/vibe-access/{sessions,friction}.jsonl`
plus `adapter-notes/*.md` — adapter notes with repeated stacks are the highest-value
signal (each is a part-built adapter). Writes `docs/proposed-changes.md` in the
vibe-access solo repo. Never auto-applies. Scoring: count x confidence weight
{high: 3, medium: 2, low: 1}.
```

- [ ] **Step 10: Write the six command stubs**

Each `commands/<name>.md` (frontmatter `description` + one body line). Example `commands/scan.md`:

```markdown
---
description: Inventory the app's routes and auth model
---

Use the vibe-access scan skill: read skills/scan/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

Repeat for `vibe-access.md` (→ router), `map.md`, `scaffold.md`, `verify.md`, `vitals.md`, adjusting description + skill path.

- [ ] **Step 11: Validate and commit**

Run the plugin-dev validator agent if available (`plugin-dev:plugin-validator`), else check by hand: every SKILL.md parses frontmatter, every command stub points at an existing skill. Then:

```bash
git add plugins/vibe-access/skills plugins/vibe-access/commands
git commit -m "feat: eleven skills + six command stubs — router, guide, scan/map/scaffold/verify, vitals, setup, logger placeholders, evolve"
```

---

### Task 13: README + CHANGELOG

**Files:**
- Create: `plugins/vibe-access/README.md`, `plugins/vibe-access/CHANGELOG.md`, `repo:README.md`

- [ ] **Step 1: Write `plugins/vibe-access/README.md`** — follow the family README standard (storefront voice, install block for canary + stable, command table, safety invariants section). Content requirements (write it fresh, ~80 lines): what the plugin does in two sentences; the arc line (*agent affordances → agent-facing API → MCP server*) and where this plugin sits; install: canary `/plugin marketplace add estevanhernandez-stack-ed/vibe-access` / stable `estevanhernandez-stack-ed/vibe-plugins`; the six commands with one-liners; the manifest example (trim the reference fixture to one affordance); the two tiers + the refusal rule stated plainly; the adapter table (firebase-functions: ready; nextjs, express: not-yet-implemented — agnostic path with adapter-notes); validated-against line (WeSeeYouAtTheMovies).

- [ ] **Step 2: Write `plugins/vibe-access/CHANGELOG.md`**

```markdown
# Changelog

## 0.1.0 — 2026-07-XX

The 15th vibe-* plugin. Initial release: scan (route + auth inventory,
firebase-functions adapter), map (agent-access.json manifest, dev/prod-safe tiers,
mechanical seed/reset/capture refusal), scaffold (gap affordances behind hard dev
gates, backup/rollback), verify (cold-agent pass, local-only, manifest stamping).
Adapter seam with honest stubs; agnostic path writes adapter-notes. Validated against
WeSeeYouAtTheMovies.
```

(Fill the date at ship time.)

- [ ] **Step 3: Write `repo:README.md`** — three lines: name, one-sentence description, pointer to `plugins/vibe-access/README.md`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: plugin README, changelog, repo readme"
```

---

### Task 14: Publish canary

- [ ] **Step 1: Create the GitHub repo and push**

```bash
cd /c/Users/estev/Projects/vibe-access
gh repo create estevanhernandez-stack-ed/vibe-access --public --source . --push
```

Expected: repo exists, main pushed. (Do NOT tag yet — dogfood first; structural-green != works.)

- [ ] **Step 2: Verify canary install resolves**

Run: `gh api repos/estevanhernandez-stack-ed/vibe-access --jq .full_name`
Expected: `estevanhernandez-stack-ed/vibe-access`.

---

### Task 15: Dogfood on WeSeeYouAtTheMovies

The family bar: the plugin proves it can birth a layer from nothing, driven as a user would drive it. Work in a branch on the WeSeeYou side; every plugin bug found here gets fixed in the plugin repo (with a test) before proceeding.

- [ ] **Step 1: Branch the target app**

```bash
git -C /c/Users/estev/Projects/WeSeeYouAtTheMovies checkout -b feat/agent-access-layer
```

- [ ] **Step 2: First-run + scan**

Follow skills/first-run-setup then skills/scan against the app. Expected: adapter `firebase-functions`, ~85 routes from the rewrites, a real unmapped list (exports without rewrites exist — the report must name them). Gate: inventory validates; `docs/vibe-access/scan-<date>.md` written.

- [ ] **Step 3: Map**

Follow skills/map. Expected: manifest at repo root, ~85 affordances, kind split sane (leaderboard/box-office-data/my-rank → read; submit-score/join-challenge → act), token-auth routes marked. Hand-check 5 affordances against their handler sources. Flag any unauthenticated act-kind routes to the user (there will be some — decide tier overrides together).

- [ ] **Step 4: Scaffold the gaps**

Expected gaps: seed, reset, capture, discovery (the app has read + act already). Scaffold what the user picks — implement the bodies against Firestore via the app's own patterns (`functions/src/utils/helpers.js` init, emulator-aware). Gate: generated files carry the dev-gate; index.js + firebase.json patches applied via Edit; app's own test suite still green (`cd functions && npm test`).

- [ ] **Step 5: Verify**

Start emulators (`firebase emulators:start`), run skills/verify cold. Drive capture affordances via Playwright MCP against the Vite dev server. Gate: every affordance pass, or a named fix. Prove the dev gate: run one scaffolded route with emulator env unset → expect 404.

- [ ] **Step 6: Record and fix**

Write `repo:docs/dogfood/M-weseeyou-<date>.md` in the vibe-access repo: what broke, what got fixed (with the test that pins it), time from scan to verified-green. Every plugin-side fix commits to the plugin repo with its test. Decide with the user whether the WeSeeYou branch merges (the layer is real value in the app) — likely yes, as a PR.

---

### Task 16: Ship v0.1.0 — tag, marketplace, records

- [ ] **Step 1: Pre-tag coherence** — plugin.json version 0.1.0, CHANGELOG date filled, `npm test` green, vitals 8/8 ✓.

- [ ] **Step 2: Tag and push**

```bash
cd /c/Users/estev/Projects/vibe-access
git tag -a v0.1.0 -m "vibe-access v0.1.0 — scan/map/scaffold/verify, firebase-functions adapter, dogfooded on WeSeeYouAtTheMovies"
git push origin main --tags
```

- [ ] **Step 3: Marketplace entry (stable)** — in `vibe-plugins`: add the plugin entry to `.claude-plugin/marketplace.json` (source type `git-subdir`, repo `estevanhernandez-stack-ed/vibe-access`, path `plugins/vibe-access`, ref `v0.1.0`); add the roster row to README and the CLAUDE.md snapshot table; run the marketplace gate (`python scripts/marketplace_gate.py --only vibe-access` if present — check `scripts/`); commit `feat(marketplace): add vibe-access v0.1.0 — the agent-access pillar (15th plugin)`. Use the marketplace-validator agent before pushing.

- [ ] **Step 4: Records** — 626 decision log (ship decision, projectId of Vibe Plugins), memory-file update (vibe-access architecture memory), spec-bank README row flips design-approved → shipped. Real-install proof: `/plugin marketplace sync` + install on stable before calling it done (the vibe-insights SSH incident is the cautionary tale).

---

## Self-Review Notes

Checked against the spec (docs/spec-bank/vibe-access-v0.1.md):

- **Scope decisions 1-5**: all covered — scaffold-only (no MCP generation anywhere), adapter + agnostic path (Task 4 contract + guide/scan skills carry the agnostic protocol and adapter-notes), manifest-first + gap-driven (Tasks 8-10), two tiers with mechanical refusal (schema `allOf` + `assertTierLegal` + gate-marker check — three layers), agent-driven verify with the cold rule (Task 11 + verify skill).
- **Needs-checklist**: spec lists five needs (a-e); the plan adds `discovery` as a sixth. Deliberate extension — the spec names the discovery route as optional manifest infrastructure; modeling it as a need makes `:scaffold` the thing that offers it. Spec stays authoritative on the five; discovery is additive.
- **Error handling section**: unmapped honesty (Task 5/7), backup+rollback (Task 10), verify non-local refusal + seed/reset local-only (Task 11). Covered.
- **Placeholder scan**: the one deliberate `TODO(builder)` lives in a generated-file template and is filled at scaffold time by the skill — documented inline. Session/friction/evolve skills are explicit v0.1 placeholders per family convention (vibe-lingual shipped the same way).
- **Type consistency**: `GapSpec.kind` values `read-state`/`discovery` vs manifest kinds `read`/`capture` — mapped where they meet: scaffolded read-state affordances enter the manifest as kind `read`, discovery sets `discoveryRoute` (not an affordance row) plus a dev route. The scaffold skill's step 3 (re-scan + re-map) is where scaffolded routes acquire manifest rows; `buildManifest` carries scaffolded rows forward. Checked: `stampManifest` matches CLI usage; `renderVerifyReport(run, manifest)` argument order consistent.
- **Known deferred risks** (dogfood will catch): the `onRequest` v2 idiom assumption vs WeSeeYou's actual handler style (adapter template may need the app's exact firebase-functions version idiom); hosting-emulator port (5000 default vs firebase.json emulators block); method inference heuristic precision across 85 real routes. All three are named in dogfood gates.

