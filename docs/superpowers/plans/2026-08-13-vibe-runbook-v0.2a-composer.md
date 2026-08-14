# vibe-runbook v0.2a — the composer spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/vibe-runbook:author`, which inspects an application from static evidence, drafts an operations runbook, verifies every claim before writing it down, and emits a document that arrives having already passed its own walk.

**Architecture:** Evidence gatherers behind one contract, each optional and each reporting what it could *not* reach. Plan A implements the three that need no network, no browser and no credentials: `source`, `git`, `manifest`. A composer turns gathered facts into sections, every draft claim is walked through the existing v0.1 verifier before it reaches the page, and an emitter renders markdown whose pins are commands rather than values.

**Tech Stack:** Node ESM (`"type": "module"`), Jest 29 via `node --experimental-vm-modules`, ajv ^8.17.1 (devDependency). No TypeScript, matching the family and v0.1.

**Spec:** [`../specs/2026-08-13-vibe-runbook-v0.2-authoring-design.md`](../specs/2026-08-13-vibe-runbook-v0.2-authoring-design.md)

**Repo:** `C:/Users/estev/Projects/Vibe-Runbook`, branch `main`, currently 164 tests across 17 suites, 41 commits, unpublished.

**Scope note:** this is Plan A of two. The `browser`, `mcp` and `process` gatherers are Plan B, deliberately deferred so that Plan A's real-world output against PriceScout answers how much they actually need to recover.

## Global Constraints

- **Nothing is written down that was not confirmed.** A draft claim reaches the page only after being walked through the v0.1 verifier, and it carries its real verdict.
- **Pins emit as commands, never as values.** A generated runbook is self-answering from its first line, so the staleness problem never starts.
- **Unwritten sections are a document property, not a verdict.** No seventh verdict, no sixth shape. They are counted separately from claims and reported on a completeness line.
- **`:author` never clobbers.** If a runbook exists, write a proposal beside it and show the diff. Backup before any write, via v0.1's `backupFile`.
- **`.env` key names may be emitted; values never may.** A generator writes to a file that gets committed.
- **Nothing spends.** No code path may incur cost.
- **Deploy and rollback invocations are recorded, never executed.** Their presence is verified by the script existing.
- **Every gatherer degrades honestly.** A gatherer that cannot run yields a stated gap, never a silent omission.
- **Reuse the v0.1 engine, do not duplicate it.** Existing exports: `extractClaims`, `classifyShape`, `stripOuterMarkup`, `stripLeadingListPunctuation`, `scanRunbook`, `SCHEMA_VERSION`, `assignVerdict`, `summarize`, `verifyPin`, `verifyStatus`, `probeWriteGuard`, `resolveCommand`, `isSelfAnswering`, `preflight`, `pickTemplate`, `proposeRewrite`, `planRemediation`, `renderPlan`, `renderReport`, `backupFile`, `rollback`, `dataHome`, `runWalk`, `makeProbe`.
- Exact verdict strings `PASS` `FAIL` `BLOCKED` `SPENDS` `HUMAN` `QUESTION`; shapes `pin` `status-assertion` `receipt` `human` `unknown`; venues `executable` `static`.
- The existing 164 tests must stay green. Run the whole suite at the end of every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `engine/gather/contract.mjs` | The `Evidence` shape and `runGatherers` — the seam every gatherer implements |
| `engine/gather/source.mjs` | Facts from repo files: scripts, Dockerfile, CI, `.env.example`, health paths |
| `engine/gather/git.mjs` | Facts from git: revision command, HEAD command, remote |
| `engine/gather/manifest.mjs` | Facts from a vibe-access `agent-access.json` when present |
| `engine/compose.mjs` | Turn facts into ordered sections of draft claims and stubs |
| `engine/emit.mjs` | Render sections to markdown; pins as commands |
| `engine/author.mjs` | The loop: gather → draft → verify → emit; never-clobber write |
| `engine/stubs.mjs` | Recognize and count `**Unwritten:**` markers |
| `schemas/evidence.schema.json` | Shape of gathered evidence |

Modified: `engine/extract.mjs` (skip stubs when extracting claims), `engine/scan.mjs` (carry stub counts), `engine/report.mjs` (completeness line), `engine/cli.mjs` (dispatch `author`).

---

### Task 1: The gatherer contract

Establishes the seam before anything implements it, so every later gatherer is written against a fixed shape.

**Files:**
- Create: `plugins/vibe-runbook/engine/gather/contract.mjs`
- Create: `plugins/vibe-runbook/schemas/evidence.schema.json`
- Test: `plugins/vibe-runbook/tests/gather-contract.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `FACT_KINDS` (frozen array); `makeEvidence(gatherer, {facts, gaps})` → `{gatherer, ok, facts, gaps}`; `runGatherers(gatherers, ctx)` → `{facts, gaps, ran, skipped}`. A fact is `{kind, key, value, source}`. A gap is a plain string naming what could not be reached.

- [ ] **Step 1: Write the failing test**

`tests/gather-contract.test.mjs`:

```javascript
import { FACT_KINDS, makeEvidence, runGatherers } from '../engine/gather/contract.mjs';

test('fact kinds are fixed and frozen', () => {
  expect(FACT_KINDS).toContain('run-command');
  expect(FACT_KINDS).toContain('deploy-command');
  expect(FACT_KINDS).toContain('env-key');
  expect(Object.isFrozen(FACT_KINDS)).toBe(true);
});

test('makeEvidence rejects an unknown fact kind rather than passing it through', () => {
  expect(() => makeEvidence('source', { facts: [{ kind: 'nonsense', key: 'x', value: 'y', source: 'f' }] }))
    .toThrow(/unknown fact kind/i);
});

test('a gatherer that throws is skipped with a gap, never crashes the run', () => {
  const boom = { name: 'boom', run: () => { throw new Error('no git here'); } };
  const fine = { name: 'fine', run: () => makeEvidence('fine', { facts: [], gaps: [] }) };
  const out = runGatherers([boom, fine], {});
  expect(out.ran).toEqual(['fine']);
  expect(out.skipped).toEqual(['boom']);
  expect(out.gaps.some((g) => /boom/.test(g) && /no git here/.test(g))).toBe(true);
});

test('facts and gaps from every gatherer are merged', () => {
  const a = { name: 'a', run: () => makeEvidence('a', { facts: [{ kind: 'port', key: 'web', value: '3000', source: 'p.json' }], gaps: ['no Dockerfile'] }) };
  const b = { name: 'b', run: () => makeEvidence('b', { facts: [{ kind: 'env-key', key: 'API_KEY', value: '', source: '.env.example' }], gaps: [] }) };
  const out = runGatherers([a, b], {});
  expect(out.facts).toHaveLength(2);
  expect(out.gaps).toEqual(['no Dockerfile']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/vibe-runbook && npm test -- gather-contract`
Expected: FAIL, `Cannot find module '../engine/gather/contract.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/gather/contract.mjs`:

```javascript
// A gatherer answers "what evidence can I collect here", never "what framework
// is this". Sources, not stacks — that is what keeps a six-stack portfolio from
// needing six inspectors.
export const FACT_KINDS = Object.freeze([
  'run-command',
  'test-command',
  'deploy-command',
  'rollback-command',
  'log-command',
  'revision-command',
  'head-command',
  'health-path',
  'base-url',
  'route',
  'env-key',
  'port',
]);

export function makeEvidence(gatherer, { facts = [], gaps = [] } = {}) {
  for (const f of facts) {
    if (!FACT_KINDS.includes(f.kind)) {
      throw new Error(`unknown fact kind "${f.kind}" from gatherer "${gatherer}"`);
    }
  }
  return { gatherer, ok: true, facts, gaps };
}

// A gatherer that cannot run is a stated gap, never a silent omission.
export function runGatherers(gatherers, ctx) {
  const facts = [];
  const gaps = [];
  const ran = [];
  const skipped = [];
  for (const g of gatherers) {
    try {
      const ev = g.run(ctx);
      facts.push(...ev.facts);
      gaps.push(...ev.gaps);
      ran.push(g.name);
    } catch (e) {
      skipped.push(g.name);
      gaps.push(`gatherer "${g.name}" could not run: ${e.message}`);
    }
  }
  return { facts, gaps, ran, skipped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- gather-contract`
Expected: PASS, 4 tests

- [ ] **Step 5: Write the evidence schema**

`schemas/evidence.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "vibe-runbook gathered evidence",
  "type": "object",
  "required": ["facts", "gaps", "ran", "skipped"],
  "properties": {
    "facts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kind", "key", "value", "source"],
        "properties": {
          "kind": { "type": "string" },
          "key": { "type": "string" },
          "value": { "type": "string" },
          "source": { "type": "string" }
        }
      }
    },
    "gaps": { "type": "array", "items": { "type": "string" } },
    "ran": { "type": "array", "items": { "type": "string" } },
    "skipped": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 6: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 168 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(gather): the evidence contract every gatherer implements

Sources, not stacks. A gatherer that cannot run yields a stated gap
rather than a silent omission, and an unknown fact kind is refused
rather than passed through."
```

---

### Task 2: The `source` gatherer

**Files:**
- Create: `plugins/vibe-runbook/engine/gather/source.mjs`
- Create: `plugins/vibe-runbook/tests/fixtures/app-full/` (a synthetic repo with every signal)
- Create: `plugins/vibe-runbook/tests/fixtures/app-bare/` (the negative control: no scripts, no Dockerfile, no CI)
- Test: `plugins/vibe-runbook/tests/gather-source.test.mjs`

**Interfaces:**
- Consumes: `makeEvidence`, `FACT_KINDS` from Task 1
- Produces: `sourceGatherer` — `{ name: 'source', run(ctx) }` where `ctx` is `{ projectRoot }`

- [ ] **Step 1: Build the two fixtures**

`tests/fixtures/app-full/package.json`:

```json
{
  "name": "demo-app",
  "scripts": {
    "start": "node server.mjs --port 3000",
    "test": "jest",
    "deploy": "./scripts/deploy.sh"
  }
}
```

`tests/fixtures/app-full/.env.example`:

```
API_KEY=put-your-key-here
DATABASE_URL=postgres://localhost/demo
PORT=3000
```

`tests/fixtures/app-full/scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "deploying"
```

`tests/fixtures/app-full/scripts/rollback.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "rolling back"
```

`tests/fixtures/app-full/Dockerfile`:

```
FROM node:20
EXPOSE 8080
CMD ["node", "server.mjs"]
```

`tests/fixtures/app-bare/README.md`:

```markdown
# bare

Nothing here. No scripts, no container, no CI.
```

- [ ] **Step 2: Write the failing test**

`tests/gather-source.test.mjs`:

```javascript
import { fileURLToPath } from 'node:url';
import { sourceGatherer } from '../engine/gather/source.mjs';

const full = fileURLToPath(new URL('./fixtures/app-full/', import.meta.url));
const bare = fileURLToPath(new URL('./fixtures/app-bare/', import.meta.url));
const find = (ev, kind) => ev.facts.filter((f) => f.kind === kind);

test('finds run and test commands from package.json scripts', () => {
  const ev = sourceGatherer.run({ projectRoot: full });
  expect(find(ev, 'run-command').map((f) => f.value)).toContain('npm run start');
  expect(find(ev, 'test-command').map((f) => f.value)).toContain('npm test');
});

test('finds deploy and rollback scripts by name', () => {
  const ev = sourceGatherer.run({ projectRoot: full });
  expect(find(ev, 'deploy-command')[0].value).toMatch(/deploy\.sh/);
  expect(find(ev, 'rollback-command')[0].value).toMatch(/rollback\.sh/);
});

test('emits env KEY NAMES and never values', () => {
  const ev = sourceGatherer.run({ projectRoot: full });
  const keys = find(ev, 'env-key').map((f) => f.key);
  expect(keys).toEqual(expect.arrayContaining(['API_KEY', 'DATABASE_URL']));
  const serialized = JSON.stringify(ev);
  expect(serialized).not.toContain('put-your-key-here');
  expect(serialized).not.toContain('postgres://localhost/demo');
});

test('finds a port from the Dockerfile EXPOSE', () => {
  const ev = sourceGatherer.run({ projectRoot: full });
  expect(find(ev, 'port').map((f) => f.value)).toContain('8080');
});

test('the bare app yields no facts and says what was missing', () => {
  const ev = sourceGatherer.run({ projectRoot: bare });
  expect(ev.facts).toHaveLength(0);
  expect(ev.gaps.join(' ')).toMatch(/package\.json/);
  expect(ev.gaps.join(' ')).toMatch(/Dockerfile/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- gather-source`
Expected: FAIL, `Cannot find module '../engine/gather/source.mjs'`

- [ ] **Step 4: Write minimal implementation**

`engine/gather/source.mjs`:

```javascript
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeEvidence } from './contract.mjs';

const RUN_SCRIPTS = ['start', 'dev', 'serve'];
const DEPLOY_SCRIPTS = [/^deploy/i, /^publish/i];
const ROLLBACK_SCRIPTS = [/^rollback/i, /^revert/i];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export const sourceGatherer = {
  name: 'source',
  run({ projectRoot }) {
    const facts = [];
    const gaps = [];

    const pkgPath = join(projectRoot, 'package.json');
    const pkg = existsSync(pkgPath) ? readJson(pkgPath) : null;
    if (!pkg) {
      gaps.push('no package.json, so no run or test command was derived');
    } else {
      for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
        if (RUN_SCRIPTS.includes(name)) {
          facts.push({ kind: 'run-command', key: name, value: `npm run ${name}`, source: 'package.json' });
        }
        if (name === 'test') {
          facts.push({ kind: 'test-command', key: 'test', value: 'npm test', source: 'package.json' });
        }
        const port = String(cmd).match(/--port[= ](\d+)/);
        if (port) facts.push({ kind: 'port', key: name, value: port[1], source: 'package.json' });
      }
    }

    const scriptsDir = join(projectRoot, 'scripts');
    if (existsSync(scriptsDir)) {
      for (const f of readdirSync(scriptsDir)) {
        const rel = `./scripts/${f}`;
        if (DEPLOY_SCRIPTS.some((re) => re.test(f))) {
          facts.push({ kind: 'deploy-command', key: f, value: rel, source: rel });
        }
        if (ROLLBACK_SCRIPTS.some((re) => re.test(f))) {
          facts.push({ kind: 'rollback-command', key: f, value: rel, source: rel });
        }
      }
    } else {
      gaps.push('no scripts/ directory, so deploy and rollback were not derived');
    }

    // KEY NAMES ONLY. A generator writes to a file that gets committed, so a
    // value read out of .env.example must never reach a fact.
    const envPath = join(projectRoot, '.env.example');
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
        if (m) facts.push({ kind: 'env-key', key: m[1], value: '', source: '.env.example' });
      }
    } else {
      gaps.push('no .env.example, so required configuration was not derived');
    }

    const dockerPath = join(projectRoot, 'Dockerfile');
    if (existsSync(dockerPath)) {
      const expose = readFileSync(dockerPath, 'utf8').match(/^\s*EXPOSE\s+(\d+)/im);
      if (expose) facts.push({ kind: 'port', key: 'container', value: expose[1], source: 'Dockerfile' });
    } else {
      gaps.push('no Dockerfile, so the container port was not derived');
    }

    return makeEvidence('source', { facts, gaps });
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- gather-source`
Expected: PASS, 5 tests

- [ ] **Step 6: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 173 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(gather): source facts from scripts, container, CI and env

Env KEY NAMES only, never values — a generator writes to a file that
gets committed. The bare fixture is the negative control: no facts, and
gaps naming every signal that was absent."
```

---

### Task 3: The `git` gatherer

**Files:**
- Create: `plugins/vibe-runbook/engine/gather/git.mjs`
- Test: `plugins/vibe-runbook/tests/gather-git.test.mjs`

**Interfaces:**
- Consumes: `makeEvidence` from Task 1
- Produces: `gitGatherer` — `{ name: 'git', run(ctx) }` where `ctx` is `{ projectRoot, runCommand }`

- [ ] **Step 1: Write the failing test**

`tests/gather-git.test.mjs`:

```javascript
import { gitGatherer } from '../engine/gather/git.mjs';

const find = (ev, kind) => ev.facts.filter((f) => f.kind === kind);

test('emits HEAD as a COMMAND, never as a resolved value', () => {
  const ev = gitGatherer.run({ projectRoot: '/x', runCommand: () => 'abc1234' });
  const head = find(ev, 'head-command')[0];
  expect(head.value).toBe('git rev-parse --short HEAD');
  expect(JSON.stringify(ev)).not.toContain('abc1234');
});

test('a non-git directory is a gap, not a throw', () => {
  const ev = gitGatherer.run({
    projectRoot: '/x',
    runCommand: () => { throw new Error('not a git repository'); },
  });
  expect(ev.facts).toHaveLength(0);
  expect(ev.gaps.join(' ')).toMatch(/not a git repository|no git/i);
});

test('records the remote when there is one', () => {
  const ev = gitGatherer.run({
    projectRoot: '/x',
    runCommand: (cmd) => (cmd.includes('remote') ? 'https://github.com/acme/demo.git' : 'abc1234'),
  });
  expect(find(ev, 'base-url').some((f) => /github.com\/acme\/demo/.test(f.value))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- gather-git`
Expected: FAIL, `Cannot find module '../engine/gather/git.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/gather/git.mjs`:

```javascript
import { makeEvidence } from './contract.mjs';

export const gitGatherer = {
  name: 'git',
  run({ projectRoot, runCommand }) {
    const facts = [];
    const gaps = [];

    try {
      // Probe only to confirm this IS a repo. The VALUE is deliberately
      // discarded: a pin must emit as the command that answers it, so there is
      // no stored value to go stale.
      runCommand('git rev-parse --short HEAD');
      facts.push({
        kind: 'head-command',
        key: 'HEAD',
        value: 'git rev-parse --short HEAD',
        source: 'git',
      });
    } catch (e) {
      gaps.push(`no git revision available: ${e.message}`);
      return makeEvidence('git', { facts, gaps });
    }

    try {
      const remote = String(runCommand('git config --get remote.origin.url')).trim();
      if (remote) facts.push({ kind: 'base-url', key: 'remote', value: remote, source: 'git' });
    } catch {
      gaps.push('no git remote configured');
    }

    return makeEvidence('git', { facts, gaps });
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- gather-git`
Expected: PASS, 3 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 176 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(gather): git facts, emitted as commands not values

The revision probe runs only to confirm a repo exists; its output is
discarded on purpose. A pin that names its command cannot go stale
because there is no stored value to diverge from."
```

---

### Task 4: The `manifest` gatherer

**Files:**
- Create: `plugins/vibe-runbook/engine/gather/manifest.mjs`
- Create: `plugins/vibe-runbook/tests/fixtures/app-full/agent-access.json`
- Test: `plugins/vibe-runbook/tests/gather-manifest.test.mjs`

**Interfaces:**
- Consumes: `makeEvidence` from Task 1
- Produces: `manifestGatherer` — `{ name: 'manifest', run(ctx) }` where `ctx` is `{ projectRoot }`

- [ ] **Step 1: Add the fixture**

`tests/fixtures/app-full/agent-access.json`:

```json
{
  "schemaVersion": "1.0.0",
  "app": "demo-app",
  "adapter": "firebase-functions",
  "baseUrls": { "prod": "https://demo.example.com", "dev": "http://localhost:5001" },
  "discoveryRoute": "/api/_discovery",
  "affordances": [
    { "name": "health", "method": "GET", "path": "/api/health", "tier": "prod-safe" },
    { "name": "seed", "method": "POST", "path": "/api/seed", "tier": "dev-only" }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`tests/gather-manifest.test.mjs`:

```javascript
import { fileURLToPath } from 'node:url';
import { manifestGatherer } from '../engine/gather/manifest.mjs';

const full = fileURLToPath(new URL('./fixtures/app-full/', import.meta.url));
const bare = fileURLToPath(new URL('./fixtures/app-bare/', import.meta.url));
const find = (ev, kind) => ev.facts.filter((f) => f.kind === kind);

test('reads baseUrls and routes from a vibe-access manifest', () => {
  const ev = manifestGatherer.run({ projectRoot: full });
  expect(find(ev, 'base-url').map((f) => f.value)).toContain('https://demo.example.com');
  expect(find(ev, 'route').map((f) => f.value)).toContain('/api/health');
});

test('a prod-safe GET route becomes a health path candidate', () => {
  const ev = manifestGatherer.run({ projectRoot: full });
  expect(find(ev, 'health-path').map((f) => f.value)).toContain('/api/health');
});

test('a dev-only or mutating affordance never becomes a health path', () => {
  const ev = manifestGatherer.run({ projectRoot: full });
  expect(find(ev, 'health-path').map((f) => f.value)).not.toContain('/api/seed');
});

test('no manifest is a gap, not an error', () => {
  const ev = manifestGatherer.run({ projectRoot: bare });
  expect(ev.facts).toHaveLength(0);
  expect(ev.gaps.join(' ')).toMatch(/agent-access\.json/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- gather-manifest`
Expected: FAIL, `Cannot find module '../engine/gather/manifest.mjs'`

- [ ] **Step 4: Write minimal implementation**

`engine/gather/manifest.mjs`:

```javascript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeEvidence } from './contract.mjs';

const CANDIDATES = ['agent-access.json', '.vibe-access/agent-access.json'];

export const manifestGatherer = {
  name: 'manifest',
  run({ projectRoot }) {
    const facts = [];
    const gaps = [];

    const found = CANDIDATES.map((c) => join(projectRoot, c)).find((p) => existsSync(p));
    if (!found) {
      gaps.push('no agent-access.json, so routes and base urls were derived from source instead');
      return makeEvidence('manifest', { facts, gaps });
    }

    let m;
    try {
      m = JSON.parse(readFileSync(found, 'utf8'));
    } catch (e) {
      gaps.push(`agent-access.json could not be parsed: ${e.message}`);
      return makeEvidence('manifest', { facts, gaps });
    }

    for (const [env, url] of Object.entries(m.baseUrls ?? {})) {
      facts.push({ kind: 'base-url', key: env, value: url, source: 'agent-access.json' });
    }

    for (const a of m.affordances ?? []) {
      facts.push({ kind: 'route', key: a.name, value: a.path, source: 'agent-access.json' });
      // Only a prod-safe read is a health candidate. A mutating or dev-only
      // affordance must never be proposed as something to poll.
      if (a.method === 'GET' && a.tier === 'prod-safe') {
        facts.push({ kind: 'health-path', key: a.name, value: a.path, source: 'agent-access.json' });
      }
    }

    return makeEvidence('manifest', { facts, gaps });
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- gather-manifest`
Expected: PASS, 4 tests

- [ ] **Step 6: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 180 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(gather): reuse a vibe-access manifest when one exists

Only a prod-safe GET becomes a health-path candidate. A mutating or
dev-only affordance is recorded as a route and never proposed as
something to poll."
```

---

### Task 5: Unwritten stubs are recognized and counted separately

**Files:**
- Create: `plugins/vibe-runbook/engine/stubs.mjs`
- Modify: `plugins/vibe-runbook/engine/extract.mjs`
- Modify: `plugins/vibe-runbook/engine/scan.mjs`
- Test: `plugins/vibe-runbook/tests/stubs.test.mjs`

**Interfaces:**
- Consumes: `extractClaims`, `scanRunbook` from v0.1
- Produces: `STUB_RE`; `findStubs(markdown)` → `[{question, line}]`. `scanRunbook` gains `stubs` on its return: `{schemaVersion, runbook, coverage, claims, stubs}`.

- [ ] **Step 1: Write the failing test**

`tests/stubs.test.mjs`:

```javascript
import { findStubs } from '../engine/stubs.mjs';
import { extractClaims } from '../engine/extract.mjs';
import { scanRunbook } from '../engine/scan.mjs';

const doc = [
  '# Ops',
  '',
  '- Health: should be "ok"',
  '',
  '**Unwritten:** Who gets paged when the error rate crosses its threshold?',
  '',
  '**Unwritten:** What does degraded-but-acceptable look like here?',
  '',
].join('\n');

test('finds each stub with its question and line', () => {
  const s = findStubs(doc);
  expect(s).toHaveLength(2);
  expect(s[0].question).toMatch(/Who gets paged/);
  expect(s[0].line).toBe(5);
});

test('a stub is NOT extracted as a claim', () => {
  const { claims } = extractClaims(doc, 'ops.md');
  expect(claims.some((c) => /Who gets paged/.test(c.text))).toBe(false);
});

test('scanRunbook reports stubs alongside claims, counted separately', () => {
  const out = scanRunbook(doc, 'ops.md');
  expect(out.stubs).toHaveLength(2);
  expect(out.claims.some((c) => /degraded-but-acceptable/.test(c.text))).toBe(false);
});

test('a document with no stubs reports an empty list, not undefined', () => {
  const out = scanRunbook('# Ops\n\n- Health: should be "ok"\n', 'ops.md');
  expect(out.stubs).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stubs`
Expected: FAIL, `Cannot find module '../engine/stubs.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/stubs.mjs`:

```javascript
// An unwritten section is not a claim — there is nothing to check — so it gets
// no verdict and no shape. It is a property of the document, counted separately
// and reported on its own line.
export const STUB_RE = /^\s*\*\*Unwritten:\*\*\s*(.+)$/i;

export function findStubs(markdown) {
  const out = [];
  const lines = String(markdown).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(STUB_RE);
    if (m) out.push({ question: m[1].trim(), line: i + 1 });
  }
  return out;
}
```

In `engine/extract.mjs`, add `import { STUB_RE } from './stubs.mjs';` and, inside the per-line walk, skip stub lines before either the marker pass or the preamble pass sees them:

```javascript
    if (STUB_RE.test(line)) continue;
```

A stub must never become a claim: it has no verdict because there is nothing to check.

In `engine/scan.mjs`, add `import { findStubs } from './stubs.mjs';` and include `stubs` in the returned object:

```javascript
  return { schemaVersion: SCHEMA_VERSION, runbook: filePath, coverage, claims: enriched, stubs: findStubs(markdown) };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stubs`
Expected: PASS, 4 tests

- [ ] **Step 5: Confirm the existing fixtures did not move**

Run: `npm test`
Expected: PASS, 184 tests. `star-smoke.md` must still yield 22 claims at `high`; `unmarked.md` still 0 at `low`. If either moved, stop and report rather than editing a fixture.

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(stubs): unwritten sections counted separately from claims

Not a seventh verdict and not a sixth shape. An unwritten section is not
a claim, so it has neither — it is a document property, and extraction
must never turn one into a claim."
```

---

### Task 6: The completeness line

**Files:**
- Modify: `plugins/vibe-runbook/engine/report.mjs`
- Test: `plugins/vibe-runbook/tests/report-completeness.test.mjs`

**Interfaces:**
- Consumes: `renderReport({runbook, env, claims, coverage})` from v0.1
- Produces: `renderReport` accepts an added optional `stubs` array and renders a completeness line

- [ ] **Step 1: Write the failing test**

`tests/report-completeness.test.mjs`:

```javascript
import { renderReport } from '../engine/report.mjs';

const claims = [
  { id: 'c-1', shape: 'pin', venue: 'executable', text: 'Revision — run: `git rev-parse --short HEAD`', verdict: 'PASS', evidence: 'self-answering', cost: { raw: null, count: null } },
];
const stubs = [
  { question: 'Who gets paged when the error rate crosses its threshold?', line: 40 },
  { question: 'What does degraded-but-acceptable look like here?', line: 44 },
];

test('reports how many sections are unwritten', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {}, stubs });
  expect(out).toMatch(/2 sections unwritten/);
});

test('names each unwritten question so the reader can answer it', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {}, stubs });
  expect(out).toContain('Who gets paged');
  expect(out).toContain('degraded-but-acceptable');
});

test('a complete document says nothing about unwritten sections', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {}, stubs: [] });
  expect(out).not.toMatch(/unwritten/i);
});

test('omitting stubs entirely does not break the report', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {} });
  expect(out).toMatch(/checked/);
  expect(out).not.toMatch(/unwritten/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- report-completeness`
Expected: FAIL, `2 sections unwritten` not found

- [ ] **Step 3: Write minimal implementation**

In `engine/report.mjs`, accept `stubs = []` in the destructured argument and, immediately after the existing coverage fractions, push:

```javascript
  if (stubs.length > 0) {
    out.push(`**${stubs.length} sections unwritten**`, '');
    for (const s of stubs) out.push(`- line ${s.line}: ${s.question}`);
    out.push('');
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- report-completeness`
Expected: PASS, 4 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 188 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(report): a completeness line beside the coverage fractions

Every walk now names what the document does not say, until it says it."
```

---

### Task 7: The composer

**Files:**
- Create: `plugins/vibe-runbook/engine/compose.mjs`
- Test: `plugins/vibe-runbook/tests/compose.test.mjs`

**Interfaces:**
- Consumes: facts from Tasks 2-4
- Produces: `SECTIONS` (ordered array of `{id, title}`); `compose({facts, gaps})` → `[{id, title, drafts, stubs, notes}]` where a draft is `{text, kind, verify}` and `verify` is `{type: 'pin'|'status'|'none', command?, url?}`

- [ ] **Step 1: Write the failing test**

`tests/compose.test.mjs`:

```javascript
import { compose, SECTIONS } from '../engine/compose.mjs';

const facts = [
  { kind: 'head-command', key: 'HEAD', value: 'git rev-parse --short HEAD', source: 'git' },
  { kind: 'run-command', key: 'start', value: 'npm run start', source: 'package.json' },
  { kind: 'env-key', key: 'API_KEY', value: '', source: '.env.example' },
  { kind: 'deploy-command', key: 'deploy.sh', value: './scripts/deploy.sh', source: './scripts/deploy.sh' },
  { kind: 'health-path', key: 'health', value: '/api/health', source: 'agent-access.json' },
  { kind: 'base-url', key: 'prod', value: 'https://demo.example.com', source: 'agent-access.json' },
];

test('sections come back in a fixed order', () => {
  const out = compose({ facts, gaps: [] });
  expect(out.map((s) => s.id)).toEqual(SECTIONS.map((s) => s.id));
});

test('a pin drafts as a COMMAND, never as a value', () => {
  const out = compose({ facts, gaps: [] });
  const header = out.find((s) => s.id === 'header');
  const pin = header.drafts.find((d) => /HEAD/i.test(d.text));
  expect(pin.text).toContain('run: `git rev-parse --short HEAD`');
  expect(pin.verify).toEqual({ type: 'pin', command: 'git rev-parse --short HEAD' });
});

test('a health path plus a base url drafts a checkable status assertion', () => {
  const out = compose({ facts, gaps: [] });
  const health = out.find((s) => s.id === 'health');
  const d = health.drafts[0];
  expect(d.verify.type).toBe('status');
  expect(d.verify.url).toBe('https://demo.example.com/api/health');
});

test('deploy is recorded and explicitly NOT verifiable by running it', () => {
  const out = compose({ facts, gaps: [] });
  const deploy = out.find((s) => s.id === 'deploy');
  expect(deploy.drafts[0].text).toContain('./scripts/deploy.sh');
  expect(deploy.drafts[0].verify.type).toBe('none');
});

test('env keys are drafted by NAME with no value anywhere', () => {
  const out = compose({ facts, gaps: [] });
  const run = out.find((s) => s.id === 'run');
  expect(JSON.stringify(run)).toContain('API_KEY');
  expect(JSON.stringify(run)).not.toMatch(/=\s*\S/);
});

test('a section with no facts becomes a stub carrying its own question', () => {
  const out = compose({ facts: [], gaps: ['no scripts/ directory'] });
  const incident = out.find((s) => s.id === 'incident');
  expect(incident.stubs.length).toBeGreaterThan(0);
  expect(incident.stubs[0]).toMatch(/\?$/);
});

test('gaps are carried into notes so the document says what could not be gathered', () => {
  const out = compose({ facts: [], gaps: ['no Dockerfile, so the container port was not derived'] });
  expect(out.some((s) => s.notes.some((n) => /no Dockerfile/.test(n)))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compose`
Expected: FAIL, `Cannot find module '../engine/compose.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/compose.mjs`:

```javascript
export const SECTIONS = Object.freeze([
  { id: 'header', title: 'What you are looking at' },
  { id: 'run', title: 'Run it locally' },
  { id: 'health', title: 'Is it up' },
  { id: 'deploy', title: 'Deploy' },
  { id: 'rollback', title: 'Roll back' },
  { id: 'observability', title: 'Logs and observability' },
  { id: 'incident', title: 'When something is wrong' },
]);

// Questions for sections nothing can derive. Each is a real question rather
// than a placeholder, because the stub IS the ask.
const STUB_QUESTIONS = {
  incident: [
    'Who gets paged when this service degrades, and at what threshold?',
    'What does degraded-but-acceptable look like here?',
    'Which dashboard answers "is this our fault" fastest?',
  ],
  observability: ['Where do the logs actually live, and what command tails them?'],
  rollback: ['How do you confirm a rollback took effect?'],
};

const pick = (facts, kind) => facts.filter((f) => f.kind === kind);

export function compose({ facts, gaps }) {
  const baseUrl = pick(facts, 'base-url').find((f) => /^https?:/.test(f.value))?.value ?? '';

  const build = (id) => {
    const drafts = [];

    if (id === 'header') {
      for (const f of pick(facts, 'head-command')) {
        drafts.push({
          text: `HEAD — run: \`${f.value}\``,
          kind: 'pin',
          verify: { type: 'pin', command: f.value },
        });
      }
      for (const f of pick(facts, 'revision-command')) {
        drafts.push({
          text: `revision — run: \`${f.value}\``,
          kind: 'pin',
          verify: { type: 'pin', command: f.value },
        });
      }
    }

    if (id === 'run') {
      for (const f of pick(facts, 'run-command')) {
        drafts.push({ text: `Start it with \`${f.value}\`.`, kind: 'step', verify: { type: 'none' } });
      }
      for (const f of pick(facts, 'port')) {
        drafts.push({ text: `It listens on port ${f.value} (${f.source}).`, kind: 'step', verify: { type: 'none' } });
      }
      const keys = pick(facts, 'env-key').map((f) => f.key);
      if (keys.length > 0) {
        drafts.push({
          text: `It needs these set: ${keys.map((k) => `\`${k}\``).join(', ')}. Values are not recorded here.`,
          kind: 'step',
          verify: { type: 'none' },
        });
      }
    }

    if (id === 'health') {
      for (const f of pick(facts, 'health-path')) {
        const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}${f.value}` : f.value;
        drafts.push({
          text: `**Right:** \`${f.value}\` answers 200.`,
          kind: 'status-assertion',
          verify: { type: 'status', url },
        });
      }
    }

    // Recorded, never executed. Verifying a deploy by deploying is the one
    // thing a documentation tool must not do.
    if (id === 'deploy') {
      for (const f of pick(facts, 'deploy-command')) {
        drafts.push({ text: `Deploy with \`${f.value}\`.`, kind: 'step', verify: { type: 'none' } });
      }
    }
    if (id === 'rollback') {
      for (const f of pick(facts, 'rollback-command')) {
        drafts.push({ text: `Roll back with \`${f.value}\`.`, kind: 'step', verify: { type: 'none' } });
      }
    }

    if (id === 'observability') {
      for (const f of pick(facts, 'log-command')) {
        drafts.push({ text: `Tail logs with \`${f.value}\`.`, kind: 'step', verify: { type: 'none' } });
      }
    }

    const stubs = drafts.length === 0 ? (STUB_QUESTIONS[id] ?? []) : [];
    return { id, title: SECTIONS.find((s) => s.id === id).title, drafts, stubs, notes: [] };
  };

  const sections = SECTIONS.map((s) => build(s.id));
  // Every gap is stated somewhere in the document. A gatherer that could not
  // run is a limitation the reader must see, not an omission.
  if (gaps.length > 0) sections[0].notes.push(...gaps);
  return sections;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compose`
Expected: PASS, 7 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 195 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(compose): facts become ordered sections of draft claims

Pins draft as commands. Deploy and rollback are recorded with
verify.type 'none' — verifying a deploy by deploying is the one thing a
documentation tool must never do. A section nothing can derive becomes a
stub carrying a real question."
```

---

### Task 8: Verify at birth

**Files:**
- Create: `plugins/vibe-runbook/engine/author.mjs`
- Test: `plugins/vibe-runbook/tests/author-verify.test.mjs`

**Interfaces:**
- Consumes: `compose` (Task 7), `verifyPin`/`verifyStatus` (v0.1), `assignVerdict` (v0.1)
- Produces: `verifyDrafts(sections, {runCommand, probeUrl})` → the same sections with each draft gaining `{verdict, evidence}`

- [ ] **Step 1: Write the failing test**

`tests/author-verify.test.mjs`:

```javascript
import { verifyDrafts } from '../engine/author.mjs';

const sections = [
  {
    id: 'header', title: 'h', notes: [], stubs: [],
    drafts: [{ text: 'HEAD — run: `git rev-parse --short HEAD`', kind: 'pin', verify: { type: 'pin', command: 'git rev-parse --short HEAD' } }],
  },
  {
    id: 'health', title: 'h', notes: [], stubs: [],
    drafts: [{ text: '**Right:** `/api/health` answers 200.', kind: 'status-assertion', verify: { type: 'status', url: 'https://x/api/health' } }],
  },
  {
    id: 'deploy', title: 'd', notes: [], stubs: [],
    drafts: [{ text: 'Deploy with `./scripts/deploy.sh`.', kind: 'step', verify: { type: 'none' } }],
  },
];

test('a self-answering pin verifies as PASS at birth', () => {
  const out = verifyDrafts(sections, { runCommand: () => 'abc1234', probeUrl: () => 200 });
  expect(out[0].drafts[0].verdict).toBe('PASS');
});

test('a health assertion that answers is PASS and carries its evidence', () => {
  const out = verifyDrafts(sections, { runCommand: () => 'abc1234', probeUrl: () => 200 });
  expect(out[1].drafts[0].verdict).toBe('PASS');
  expect(out[1].drafts[0].evidence).toMatch(/200/);
});

test('an unreachable probe is BLOCKED, never FAIL — the doc is not wrong, the environment is', () => {
  const out = verifyDrafts(sections, {
    runCommand: () => 'abc1234',
    probeUrl: () => { throw new Error('ECONNREFUSED'); },
  });
  expect(out[1].drafts[0].verdict).toBe('BLOCKED');
});

test('a verify.type of none is never executed and carries no verdict', () => {
  let called = false;
  const out = verifyDrafts(sections, {
    runCommand: (c) => { if (/deploy/.test(c)) called = true; return 'abc1234'; },
    probeUrl: () => 200,
  });
  expect(called).toBe(false);
  expect(out[2].drafts[0].verdict).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- author-verify`
Expected: FAIL, `Cannot find module '../engine/author.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/author.mjs`:

```javascript
import { verifyPin, verifyStatus } from './verify.mjs';
import { assignVerdict } from './verdict.mjs';

const NO_COST = { raw: null, count: null };

// Nothing reaches the page unconfirmed. A draft is walked through the same
// verifier a written runbook is walked through, before it is written.
export function verifyDrafts(sections, { runCommand, probeUrl }) {
  return sections.map((section) => ({
    ...section,
    drafts: section.drafts.map((draft) => {
      if (draft.verify.type === 'none') {
        return { ...draft, verdict: null, evidence: null };
      }

      const claim = { shape: draft.kind === 'pin' ? 'pin' : 'status-assertion', text: draft.text, cost: NO_COST };

      const result =
        draft.verify.type === 'pin'
          ? verifyPin({ ...claim, command: draft.verify.command }, { runCommand })
          : verifyStatus({ ...claim, url: draft.verify.url }, { httpProbe: probeUrl });

      const decided = assignVerdict(claim, result);
      return { ...draft, verdict: decided.verdict, evidence: decided.evidence };
    }),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- author-verify`
Expected: PASS, 4 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 199 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(author): verify every draft before it reaches the page

A generated runbook arrives having passed its own walk. A draft marked
verify.type none is never executed — that is how deploy stays recorded
rather than run."
```

---

### Task 9: The emitter

**Files:**
- Create: `plugins/vibe-runbook/engine/emit.mjs`
- Test: `plugins/vibe-runbook/tests/emit.test.mjs`

**Interfaces:**
- Consumes: verified sections from Task 8
- Produces: `emitRunbook({appName, sections, generatedFrom})` → a markdown string

- [ ] **Step 1: Write the failing test**

`tests/emit.test.mjs`:

```javascript
import { emitRunbook } from '../engine/emit.mjs';
import { findStubs } from '../engine/stubs.mjs';
import { extractClaims } from '../engine/extract.mjs';
import { classifyShape } from '../engine/classify.mjs';

const sections = [
  { id: 'header', title: 'What you are looking at', notes: ['no Dockerfile, so the container port was not derived'], stubs: [],
    drafts: [{ text: 'HEAD — run: `git rev-parse --short HEAD`', kind: 'pin', verify: { type: 'pin' }, verdict: 'PASS', evidence: 'self-answering' }] },
  { id: 'health', title: 'Is it up', notes: [], stubs: [],
    drafts: [{ text: '**Right:** `/api/health` answers 200.', kind: 'status-assertion', verify: { type: 'status' }, verdict: 'PASS', evidence: '200' }] },
  { id: 'incident', title: 'When something is wrong', notes: [], stubs: ['Who gets paged, and at what threshold?'], drafts: [] },
];

const md = () => emitRunbook({ appName: 'demo-app', sections, generatedFrom: ['source', 'git'] });

test('emits the app name and which gatherers produced it', () => {
  const out = md();
  expect(out).toContain('demo-app');
  expect(out).toMatch(/source/);
  expect(out).toMatch(/git/);
});

test('an unwritten section emits a stub the scanner can find', () => {
  const stubs = findStubs(md());
  expect(stubs).toHaveLength(1);
  expect(stubs[0].question).toMatch(/Who gets paged/);
});

test('the emitted pin is a command and classifies as a pin when read back', () => {
  const { claims } = extractClaims(md(), 'RUNBOOK.md');
  const pin = claims.find((c) => /rev-parse/.test(c.text));
  expect(pin).toBeDefined();
  expect(classifyShape(pin.text).shape).toBe('pin');
});

test('gathering gaps are stated in the document, not dropped', () => {
  expect(md()).toMatch(/no Dockerfile/);
});

test('emitting is deterministic', () => {
  expect(md()).toBe(md());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- emit`
Expected: FAIL, `Cannot find module '../engine/emit.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/emit.mjs`:

```javascript
export function emitRunbook({ appName, sections, generatedFrom }) {
  const out = [];
  out.push(`# Runbook — ${appName}`, '');
  out.push(
    `> Generated by vibe-runbook from: ${generatedFrom.join(', ')}.`,
    '> Every claim below was verified at the moment it was written.',
    '> Pins name the command that answers them, so they cannot go stale.',
    ''
  );

  for (const s of sections) {
    if (s.drafts.length === 0 && s.stubs.length === 0 && s.notes.length === 0) continue;
    out.push(`## ${s.title}`, '');

    for (const d of s.drafts) {
      out.push(d.text);
      if (d.verdict && d.verdict !== 'PASS') {
        out.push(`  <!-- ${d.verdict} at generation: ${d.evidence ?? ''} -->`);
      }
      out.push('');
    }

    for (const q of s.stubs) out.push(`**Unwritten:** ${q}`, '');

    for (const n of s.notes) out.push(`*Not gathered: ${n}*`, '');
  }

  return out.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- emit`
Expected: PASS, 5 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 204 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(emit): render sections to a runbook that reads itself back

The round trip is the test that matters: an emitted pin must classify as
a pin when the scanner reads the document back, and an emitted stub must
be found by findStubs."
```

---

### Task 10: `:author` end to end, and it never clobbers

**Files:**
- Modify: `plugins/vibe-runbook/engine/author.mjs`
- Modify: `plugins/vibe-runbook/engine/cli.mjs`
- Test: `plugins/vibe-runbook/tests/author-cli.test.mjs`

**Interfaces:**
- Consumes: everything above
- Produces: `authorRunbook(ctx)` → `{markdown, outPath, wrote, sections, evidence}`; CLI `author` command

- [ ] **Step 1: Write the failing test**

`tests/author-cli.test.mjs`:

```javascript
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorRunbook } from '../engine/author.mjs';

const fullFixture = fileURLToPath(new URL('./fixtures/app-full/', import.meta.url));
const ctx = (root) => ({
  projectRoot: root,
  appName: 'demo-app',
  runCommand: () => 'abc1234',
  probeUrl: () => 200,
});

function scratch() {
  const d = mkdtempSync(join(tmpdir(), 'vrb-author-'));
  cpSync(fullFixture, d, { recursive: true });
  return d;
}

test('writes a runbook when none exists', () => {
  const d = scratch();
  const r = authorRunbook(ctx(d));
  expect(r.wrote).toBe(true);
  expect(existsSync(join(d, 'docs', 'RUNBOOK.md'))).toBe(true);
  expect(readFileSync(join(d, 'docs', 'RUNBOOK.md'), 'utf8')).toContain('demo-app');
});

test('NEVER overwrites an existing runbook', () => {
  const d = scratch();
  mkdirSync(join(d, 'docs'), { recursive: true });
  const existing = '# My hand-written runbook\n\nDo not touch.\n';
  writeFileSync(join(d, 'docs', 'RUNBOOK.md'), existing, 'utf8');

  const r = authorRunbook(ctx(d));
  expect(r.wrote).toBe(false);
  expect(readFileSync(join(d, 'docs', 'RUNBOOK.md'), 'utf8')).toBe(existing);
  expect(existsSync(r.outPath)).toBe(true);
  expect(r.outPath).not.toBe(join(d, 'docs', 'RUNBOOK.md'));
});

test('no .env value ever reaches the emitted document', () => {
  const d = scratch();
  writeFileSync(join(d, '.env'), 'API_KEY=SENTINEL-DO-NOT-EMIT\n', 'utf8');
  const r = authorRunbook(ctx(d));
  expect(r.markdown).not.toContain('SENTINEL-DO-NOT-EMIT');
  expect(r.markdown).toContain('API_KEY');
});

test('the generated runbook passes its own walk at birth', () => {
  const d = scratch();
  const r = authorRunbook(ctx(d));
  const failed = r.sections.flatMap((s) => s.drafts).filter((x) => x.verdict === 'FAIL');
  expect(failed).toEqual([]);
});

test('an app with nothing to gather still produces an honest document', () => {
  const d = mkdtempSync(join(tmpdir(), 'vrb-bare-'));
  writeFileSync(join(d, 'README.md'), '# bare\n', 'utf8');
  const r = authorRunbook(ctx(d));
  expect(r.markdown).toMatch(/Unwritten:/);
  expect(r.markdown).toMatch(/Not gathered/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- author-cli`
Expected: FAIL, `authorRunbook is not a function`

- [ ] **Step 3: Write minimal implementation**

Append to `engine/author.mjs`:

```javascript
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { runGatherers } from './gather/contract.mjs';
import { sourceGatherer } from './gather/source.mjs';
import { gitGatherer } from './gather/git.mjs';
import { manifestGatherer } from './gather/manifest.mjs';
import { compose } from './compose.mjs';
import { emitRunbook } from './emit.mjs';
import { backupFile } from './backup.mjs';

const GATHERERS = [sourceGatherer, gitGatherer, manifestGatherer];

export function authorRunbook(ctx) {
  const evidence = runGatherers(GATHERERS, ctx);
  const composed = compose(evidence);
  const sections = verifyDrafts(composed, ctx);
  const markdown = emitRunbook({
    appName: ctx.appName,
    sections,
    generatedFrom: evidence.ran,
  });

  const target = ctx.out ?? join(ctx.projectRoot, 'docs', 'RUNBOOK.md');
  mkdirSync(dirname(target), { recursive: true });

  // Never clobber. A tool whose product is trustworthiness does not overwrite
  // a person's documentation because it believed it knew better.
  if (existsSync(target)) {
    const proposal = target.replace(/\.md$/, '.vibe-runbook-proposal.md');
    backupFile(target);
    writeFileSync(proposal, markdown, 'utf8');
    return { markdown, outPath: proposal, wrote: false, sections, evidence };
  }

  writeFileSync(target, markdown, 'utf8');
  return { markdown, outPath: target, wrote: true, sections, evidence };
}
```

In `engine/cli.mjs`, import `authorRunbook` from `./author.mjs` and `basename` from `node:path`, then add this branch to the dispatch alongside `scan` and `walk`:

```javascript
} else if (command === 'author') {
  const root = projectRoot();
  let appName = basename(root);
  try {
    appName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name || appName;
  } catch {
    // no package.json, or unparseable — the directory name is a fine fallback
  }

  const result = authorRunbook({
    projectRoot: root,
    appName,
    out: arg('out'),
    runCommand: (cmd) => execSync(cmd, { encoding: 'utf8', cwd: root }),
    probeUrl: makeProbe(process.env[`VIBE_RUNBOOK_${String(arg('env') ?? '').toUpperCase()}_TOKEN`]),
  });

  console.log(`gathered from: ${result.evidence.ran.join(', ') || 'nothing'}`);
  if (result.evidence.skipped.length > 0) {
    console.log(`skipped: ${result.evidence.skipped.join(', ')}`);
  }
  const stubCount = result.sections.reduce((n, s) => n + s.stubs.length, 0);
  if (result.wrote) {
    console.log(`wrote ${result.outPath}`);
  } else {
    console.log(`a runbook already exists and was NOT overwritten.`);
    console.log(`proposal written to ${result.outPath} — read the diff and merge what you want.`);
  }
  console.log(`${stubCount} sections are unwritten and need you.`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- author-cli`
Expected: PASS, 5 tests

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 209 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(author): gather, verify and emit end to end without clobbering

An existing runbook is never overwritten — a proposal is written beside
it and the original is backed up first. The sentinel test proves no .env
value can reach a file that gets committed."
```

---

### Task 11: The `author` skill and command

**Files:**
- Create: `plugins/vibe-runbook/skills/author/SKILL.md`
- Create: `plugins/vibe-runbook/commands/author.md`
- Modify: `plugins/vibe-runbook/skills/router/SKILL.md`
- Modify: `plugins/vibe-runbook/.claude-plugin/plugin.json`

- [ ] **Step 1: Write the command file**

`commands/author.md`:

```markdown
---
description: Inspect an app and write an operations runbook that verifies itself
---

Use the vibe-runbook author skill: read skills/author/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

- [ ] **Step 2: Write the skill**

`skills/author/SKILL.md`:

```markdown
---
name: author
description: This skill should be used when the user says "/vibe-runbook:author", "write a runbook for this app", "generate an operations runbook", or wants a runbook created rather than checked. Inspects the app from static evidence, verifies every claim before writing it, and never overwrites an existing runbook.
---

# vibe-runbook author

Load skills/guide/SKILL.md.

Run:

```bash
cd ${CLAUDE_PLUGIN_ROOT}
node engine/cli.mjs author --project <app root>
```

1. Report which gatherers ran and which were skipped. A skipped gatherer means a
   thinner runbook, and the user should know which sections got thinner.
2. If a runbook already existed, say so plainly: nothing was overwritten, a
   proposal was written beside it, and the original was backed up. Show the diff
   and let the user merge.
3. Report the unwritten sections by name. These are the questions only the user
   can answer, and they are the most valuable thing in the output — the document
   knows what it does not say.
4. Offer `:walk` as the next move. A generated runbook has already passed its
   own walk at birth; walking it again later is how it stays true.

**Never** fill in an unwritten section by guessing. The stub exists because
nothing could derive the answer, and a plausible invention is worse than a
visible gap.
```

- [ ] **Step 3: Update the router**

In `skills/router/SKILL.md`, add this as the **first** rung of the recommendation ladder, above the existing "No claims cached" line:

```markdown
- No runbook found under the project root → `:author`. There is nothing to
  check yet, so writing one is the only move that helps.
```

- [ ] **Step 4: Update the manifest description**

In `.claude-plugin/plugin.json`, **prepend** this to the existing `description` string, keeping everything already there — the existing sentences about never spending and read-only walking are honesty claims the code earns and must not be dropped:

> `/vibe-runbook:author` reads your app and writes the operations runbook: how to run it, whether it is up, how to deploy and roll back, what configuration it needs. Every claim is verified at the moment it is written, so a generated runbook arrives having already passed its own check, and its pins name the command that answers them rather than a value that goes stale. It never overwrites a runbook you wrote — it proposes beside it. The sections nothing could derive are left as explicit questions, and every check afterwards tells you they are still unanswered.

- [ ] **Step 5: Run the whole suite and commit**

Run: `npm test`
Expected: PASS, 209 tests

```bash
git add plugins/vibe-runbook
git commit -m "feat(plugin): the author command, skill and router entry

The skill's hardest rule is the one about stubs: never fill in an
unwritten section by guessing, because a plausible invention is worse
than a visible gap."
```

---

### Task 12: Real-application validation

Nothing here is a unit test. This is the family ship bar, and its output is a written finding.

**Files:**
- Create: `docs/validation-2026-08-13.md` in the Vibe-Runbook repo

- [ ] **Step 1: Author against PriceScout and read it against the human version**

```bash
cd ${CLAUDE_PLUGIN_ROOT}
node engine/cli.mjs author --project "C:/Users/estev/Projects/PriceScout" --out /tmp/pricescout-generated.md
```

PriceScout has a hand-written `docs/OPERATIONS_RUNBOOK.md`. Read the generated document against it and record, in the validation doc: which sections the generator produced that the human also wrote, which the human wrote that the generator could not, and which the generator produced that the human did not think to.

**That third category is the interesting one** and it is the answer to the spec's open question 2 — how large the un-derivable residue actually is.

- [ ] **Step 2: Author against Reel-Battles**

```bash
node engine/cli.mjs author --project "C:/Users/estev/Projects/Reel-Battles" --out /tmp/reel-generated.md
```

Same comparison against its `RUNBOOK.md`. Two applications is the minimum for claiming the shape generalizes.

- [ ] **Step 3: The negative control**

Author against a directory with no `package.json`, no `scripts/`, no Dockerfile, no manifest and no git remote. The output must be a thin, honest document that names what it could not gather. **If it produces a plausible-looking runbook full of invented procedure, that is a failure and the plan stops here.**

- [ ] **Step 4: Walk every generated runbook**

For each, run `:scan` then `:walk`. Every generated claim must come back PASS or carry an honest non-PASS verdict. A generated claim that FAILs its own birth walk is a defect in the generator.

- [ ] **Step 5: Write the validation finding and commit**

Record all three results, the residue measurement, and an explicit recommendation on whether Plan B's live gatherers are needed as specified, need widening, or can be trimmed.

```bash
git add docs/validation-2026-08-13.md
git commit -m "docs: real-application validation of the composer spine

Two real applications with hand-written runbooks to read against, plus a
negative control. The residue measurement is what sizes Plan B."
```

---

## What Plan B covers

Deferred deliberately, and sized by Task 12's result:

- The `browser` gatherer (Playwright), and the open question of how it authenticates against surfaces behind a login.
- The `mcp` gatherer, enumerating a live tool surface and its declared cost tiers.
- The `process` gatherer for running services, bound ports and log locations.
- The safety teeth those three require: navigate-but-never-submit, never call a tool that bills.
