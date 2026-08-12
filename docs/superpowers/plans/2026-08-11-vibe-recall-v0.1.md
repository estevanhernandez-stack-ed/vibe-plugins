# vibe-recall (BT4) v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship vibe-recall v0.1, a Claude Code plugin that indexes the user's own repo estate and surfaces verified prior art during the spec/build phase, handing coordinates to vibe-taker for the transplant.

**Architecture:** Two layers. A deterministic `engine/` of ES modules (corpus resolution, card indexing, ranking, hook banner) with jest tests, and a `skills/` layer holding the judgment work (deep feature extraction, brief authoring, routing). The split is load-bearing, not stylistic: the design's hook budget ("index reads only, no source reads, no network, no git") is only enforceable if the hook path is a script a test can assert against. Mirrors the vibe-access structure, the family's newest and most complete plugin.

**Tech Stack:** Node ESM (`.mjs`), jest 29 with `--experimental-vm-modules`, ajv 8 for schema validation, `gh` CLI (optional, degrades to local-only), git.

**Source spec:** [`../specs/2026-08-11-vibe-recall-design.md`](../specs/2026-08-11-vibe-recall-design.md)

## Global Constraints

- **Solo repo.** Plugin source lives in a new solo repo `Vibe-Recall`, plugin root at `plugins/vibe-recall/`. The `vibe-plugins` marketplace pins it only after a real tag exists. This plan does not touch `marketplace.json`.
- **Manifest location.** The plugin manifest MUST be at `plugins/vibe-recall/.claude-plugin/plugin.json`. A root-level `plugin.json` silently degrades to auto-discovery with no metadata. This exact mistake cost vibe-prompt seven minor versions.
- **Data home resolution ladder**, implemented from birth, in this order: `${CLAUDE_PLUGIN_DATA}`, then `~/.claude/plugins/data/vibe-recall/`, then **fail loud**. Never silently skip a write.
- **Tenant walls are refusals, not warnings.** A walled path is never indexed, never ranked, never briefed. `Marcus` ships pre-seeded in the default wall list.
- **Cards store shapes, never content.** Symbol names, paths, dependency names, short claim strings. No file bodies, no `.env` contents, no matched secret values.
- **The index suggests, only a live read claims.** No card-sourced path may reach a brief without re-verification at current HEAD.
- **Zero changes to vibe-taker.** The handoff is a printed repo path plus a paste-ready `/vibe-taker:capture <path>` argument. Do not add flags to vibe-taker.
- **No emoji** in code, commits, SKILL bodies, or command output.
- **Conventional commits.**
- **A test that cannot fail is not a test.** This build produced the same defect twice in different costumes: `expect(DEFAULT_WALLS).toContain('Marcus')` proved a constant contained a string while the wall itself did nothing, and a fixture estate committed as gitlinks made the wall assertion pass against an empty enumeration on any fresh clone. Both went green. For every assertion about an absence — nothing leaked, nothing matched, no secret appears — **first assert the thing being searched is non-empty.** An absence proven over no data is not evidence.
- Engine files use `.mjs`, `"type": "module"`. Tests are `tests/*.test.mjs`.
- Never name an engine file `index.mjs` — it collides with Node directory resolution and with this project's domain vocabulary. The indexer is `cards.mjs`.

## File Structure

```
Vibe-Recall/                                  <- new solo repo
  README.md
  CHANGELOG.md
  plugins/vibe-recall/
    .claude-plugin/plugin.json                <- REQUIRED location
    package.json                              <- @626labs/vibe-recall-engine
    jest.config.mjs
    hooks/hooks.json                          <- UserPromptSubmit
    engine/
      cli.mjs          subcommand dispatch
      datahome.mjs     resolution ladder, fail-loud
      config.mjs       load/validate config
      corpus.mjs       enumerate, walls, archives, dedup, divergence
      remote.mjs       gh-backed remote-only repos
      cards.mjs        shallow card build + secret-shape skip
      match.mjs        deterministic ranking
      queue.mjs        derived deep-index queue
      banner.mjs       hook path ONLY. no git, no net, no source reads
    schemas/
      config.schema.json
      card.schema.json
    skills/
      guide/ router/ first-run-setup/ sweep/ brief/ deepen/ vitals/
      session-logger/ friction-logger/
    commands/
      vibe-recall.md sweep.md brief.md deepen.md vitals.md index.md
    tests/
      fixtures/        synthetic estate, incl. a walled fixture
      *.test.mjs
  docs/
    cowpath-notes.md                          <- Task 1 deliverable
```

---

### Task 1: Cowpath run and process notes — DONE 2026-08-11

**Completed before the rest of the plan was executed. Notes:** [`../cowpath-vibe-recall-2026-08-11.md`](../cowpath-vibe-recall-2026-08-11.md), committed in the vibe-plugins repo alongside this plan. Task 2 copies it to `docs/cowpath-notes.md` in the new solo repo.

Two specs were hand-walked, RTClickPng (cross-family) and ROROROblox (sibling-cluster). Seven findings against a gate of three. **Findings 1 and 2 each would have shipped a wrong product**, and both are now folded into the design and into Tasks 5b, 7 and 8 below. The steps are retained for the record and for anyone re-running this on a different estate.

The repo's ship bar is real-app validation, and the family's best plugins (Vibe-Walk, vibe-lingual) were born by doing one real job by hand first. **Do not scaffold anything before this task's gate passes.** The notes are the spec's ground truth; every later task may be revised by what this finds.

**Files:**
- Create: `docs/cowpath-notes.md` (copied from the vibe-plugins notes in Task 2)

- [ ] **Step 1: Pick one real, in-flight spec**

Choose a genuine upcoming build with a written scope or spec artifact. Not a hypothetical. Record its name and path at the top of the notes.

- [ ] **Step 2: Extract candidate capability phrases by hand**

Read the spec and write down every capability it needs, in the user's own words: "stripe checkout", "magic-link auth", "PDF export", "role-gated admin". Aim for 8 to 15 phrases. Record the list.

- [ ] **Step 3: Hand-search the estate for each phrase**

For each phrase, search the estate by hand and record what you actually did: which tool, which pattern, how long, what you had to already know to find it. Use whatever works (ripgrep, file browsing, memory). Record dead ends as carefully as hits, they are the signal for ranking.

```bash
# example of the kind of pass to record, not a prescription
rg -l --iglob '!node_modules' -i 'stripe' "/c/Users/estev/Projects" | head -20
```

- [ ] **Step 4: For the three strongest hits, write the brief by hand**

Produce the design's brief shape manually: source repo and HEAD, file paths with line ranges, the contract, the gotcha, what you would redo. Time each one.

- [ ] **Step 5: Record the findings that change the build**

Write the notes file with these sections: what the hand-search actually keyed on (which fields carried the signal), what ranked wrong and why, how stale your memory was versus reality, what a card would have needed to store to make the search cheap, and which phrases returned nothing.

- [ ] **Step 6: Gate**

The notes MUST name at least three concrete findings that change the build. If the run produced no surprises, the search was too shallow: widen it and repeat. Do not proceed to Task 2 on a clean run.

- [ ] **Step 7: Feed findings back**

If any finding contradicts the design (ranking weights, card fields, what a brief needs), amend `docs/superpowers/specs/2026-08-11-vibe-recall-design.md` in the vibe-plugins repo and note the amendment in the cowpath notes. The spec is not frozen; the hand-run outranks it.

---

### Task 2: Repo skeleton, manifest, and the data-home ladder

**Files:**
- Create: `plugins/vibe-recall/.claude-plugin/plugin.json`
- Create: `plugins/vibe-recall/package.json`
- Create: `plugins/vibe-recall/jest.config.mjs`
- Create: `plugins/vibe-recall/engine/datahome.mjs`
- Create: `plugins/vibe-recall/tests/datahome.test.mjs`
- Create: `docs/cowpath-notes.md` (from Task 1)

**Interfaces:**
- Produces: `resolveDataHome(env)` returns `{ dir: string, tier: 1 | 2 }`, throws `Error` with message starting `vibe-recall: no writable data home` when neither tier resolves.

- [ ] **Step 1: Create the repo and directory skeleton**

```bash
mkdir -p Vibe-Recall/plugins/vibe-recall/{engine,schemas,skills,commands,hooks,tests/fixtures,.claude-plugin}
mkdir -p Vibe-Recall/docs
cd Vibe-Recall && git init
```

Copy the Task 1 notes to `docs/cowpath-notes.md`.

- [ ] **Step 2: Write the manifest at the required location**

`plugins/vibe-recall/.claude-plugin/plugin.json`:

```json
{
  "name": "vibe-recall",
  "version": "0.1.0",
  "description": "Surface prior art from your own repos while you spec the next one. Indexes your estate, ranks what you already built, and verifies the hit at current HEAD before it claims anything.",
  "author": { "name": "626 Labs" },
  "license": "MIT"
}
```

- [ ] **Step 3: Write package.json and jest config**

`plugins/vibe-recall/package.json`:

```json
{
  "name": "@626labs/vibe-recall-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "vibe-recall": "./engine/cli.mjs" },
  "scripts": {
    "test": "node --experimental-vm-modules --disable-warning=ExperimentalWarning node_modules/jest/bin/jest.js --passWithNoTests"
  },
  "dependencies": { "ajv": "^8.17.1" },
  "devDependencies": { "jest": "^29.7.0" }
}
```

`plugins/vibe-recall/jest.config.mjs`:

```javascript
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.mjs'],
  transform: {}
};
```

Write `plugins/vibe-recall/.gitignore` **before** installing:

```gitignore
node_modules/
coverage/
*.log
```

This ordering is load-bearing, not tidiness. Step 8 commits with `git add -A`; without the ignore file in place first, `npm install` puts the entire dependency tree into the first commit. On the original run that produced a 472,754-line diff that no reviewer could read. `package-lock.json` stays tracked — it pins the tree and later tasks depend on reproducible installs.

Then `cd plugins/vibe-recall && npm install`.

- [ ] **Step 4: Write the failing data-home test**

`tests/datahome.test.mjs`:

```javascript
import { resolveDataHome } from '../engine/datahome.mjs';

test('tier 1 wins when CLAUDE_PLUGIN_DATA is set', () => {
  const r = resolveDataHome({ CLAUDE_PLUGIN_DATA: '/tmp/pd', HOME: '/home/e' });
  expect(r).toEqual({ dir: '/tmp/pd', tier: 1 });
});

test('falls back to the legacy family location', () => {
  const r = resolveDataHome({ HOME: '/home/e' });
  expect(r.tier).toBe(2);
  expect(r.dir).toBe('/home/e/.claude/plugins/data/vibe-recall');
});

test('fails loud when neither tier resolves', () => {
  expect(() => resolveDataHome({})).toThrow(/no writable data home/);
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npm test -- datahome`
Expected: FAIL, cannot find module `../engine/datahome.mjs`.

- [ ] **Step 6: Implement the ladder**

`engine/datahome.mjs`:

```javascript
import path from 'node:path';

export function resolveDataHome(env = process.env) {
  if (env.CLAUDE_PLUGIN_DATA) {
    return { dir: env.CLAUDE_PLUGIN_DATA, tier: 1 };
  }
  const home = env.HOME || env.USERPROFILE;
  if (home) {
    return {
      dir: path.posix.join(home.split(path.win32.sep).join('/'),
        '.claude/plugins/data/vibe-recall'),
      tier: 2
    };
  }
  throw new Error(
    'vibe-recall: no writable data home. Set CLAUDE_PLUGIN_DATA or HOME. ' +
    'Refusing to write silently.'
  );
}
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npm test -- datahome`
Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: repo skeleton, plugin manifest, data-home resolution ladder"
```

---

### Task 3: Config schema and loader

**Files:**
- Create: `schemas/config.schema.json`
- Create: `engine/config.mjs`
- Create: `tests/config.test.mjs`

**Interfaces:**
- Consumes: `resolveDataHome` from Task 2.
- Produces: `loadConfig(env)` returns the validated config object, and `validateConfig(obj)` returns `{ valid: boolean, errors: string[] }`. Config shape: `{ estateRoot, githubAccounts[], walls[], exclude[], staleAfterDays }`.

- [ ] **Step 1: Write the schema**

`schemas/config.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["estateRoot", "walls"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "integer", "const": 1 },
    "estateRoot": { "type": "string", "minLength": 1 },
    "githubAccounts": { "type": "array", "items": { "type": "string" } },
    "walls": { "type": "array", "items": { "type": "string" } },
    "exclude": { "type": "array", "items": { "type": "string" } },
    "staleAfterDays": { "type": "integer", "minimum": 1, "default": 14 }
  }
}
```

- [ ] **Step 2: Write the failing test**

`tests/config.test.mjs`:

```javascript
import { validateConfig, DEFAULT_WALLS } from '../engine/config.mjs';

test('Marcus ships in the default wall list', () => {
  expect(DEFAULT_WALLS).toContain('Marcus');
});

test('a minimal config validates', () => {
  const r = validateConfig({ schemaVersion: 1, estateRoot: '/p', walls: ['Marcus'] });
  expect(r.valid).toBe(true);
});

test('a config missing estateRoot is rejected with a named error', () => {
  const r = validateConfig({ schemaVersion: 1, walls: [] });
  expect(r.valid).toBe(false);
  expect(r.errors.join(' ')).toMatch(/estateRoot/);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- config`
Expected: FAIL, cannot find module.

- [ ] **Step 4: Implement**

`engine/config.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { resolveDataHome } from './datahome.mjs';

export const DEFAULT_WALLS = ['Marcus'];
export const DEFAULT_EXCLUDE = ['_scratch', '_gitnexus-runner'];

const schema = JSON.parse(
  fs.readFileSync(new URL('../schemas/config.schema.json', import.meta.url), 'utf8')
);
const validate = new Ajv({ allErrors: true, useDefaults: true }).compile(schema);

// Validates a CLONE and returns the defaults-filled result as `value`.
// ajv runs with useDefaults, which writes into the object it validates; doing
// that to the caller's object makes a function that reads as a pure check
// silently rewrite its argument. Callers wanting the filled config read `value`.
export function validateConfig(obj) {
  const value = structuredClone(obj);
  const valid = validate(value);
  return {
    valid,
    value,
    errors: (validate.errors || []).map(e => {
      const extra = e.params?.additionalProperty
        ? ` (${e.params.additionalProperty})` : '';
      return `${e.instancePath || '/'} ${e.message}${extra}`;
    })
  };
}

export function configPath(env = process.env) {
  return path.join(resolveDataHome(env).dir, 'config.json');
}

export function loadConfig(env = process.env) {
  const p = configPath(env);
  if (!fs.existsSync(p)) return null;
  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`vibe-recall: unreadable config at ${p}: ${e.message}`);
  }
  const { valid, errors, value } = validateConfig(obj);
  if (!valid) throw new Error(`vibe-recall: invalid config at ${p}: ${errors.join('; ')}`);
  // DEFAULT_WALLS is a floor, not a suggestion. A user may ADD walls; they may
  // never subtract a default one. Applying the union at this single choke point
  // means no downstream consumer has to remember to re-apply it.
  return { ...value, walls: [...new Set([...DEFAULT_WALLS, ...(value.walls || [])])] };
}
```

**The wall floor is the load-bearing line in this file.** On the original run, `DEFAULT_WALLS` was exported, asserted by a test, and enforced by nothing: `loadConfig` returned user config verbatim, the schema permitted `walls: []`, and Task 4 read `config.walls` directly. A config that simply omitted `Marcus` would have indexed the walled employer tenant. Note what the original test did — `expect(DEFAULT_WALLS).toContain('Marcus')` — it passes forever while the wall does nothing, because it only proves a constant contains a string. Test the guarantee, never the constant.

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- config`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: config schema, validation, and Marcus-seeded wall defaults"
```

---

### Task 4: Corpus resolver, local enumeration with walls and archives

**Files:**
- Create: `engine/corpus.mjs`
- Create: `tests/fixture-estate.mjs` (programmatic, temp-dir; NOT committed fixtures)
- Create: `tests/corpus-walls.test.mjs`

**Interfaces:**
- Consumes: config shape from Task 3.
- Produces: `enumerateLocal(config)` returns `Array<{ name, path, origin: 'local', remote: string | null }>`. Applies walls and archive exclusion. Does not dedup (Task 5).

- [ ] **Step 1: Build the fixture estate programmatically, in a temp directory**

**Never commit fixture git repos.** The original run committed them and git stored four mode-`160000` gitlinks with no `.gitmodules`. A fresh clone received four empty directories and zero files, at which point `enumerateLocal` returned `[]` and the wall assertion `expect(all).not.toMatch(/Marcus/)` passed against nothing. The most important test in the plugin went green while exercising no data.

Write `tests/fixture-estate.mjs` instead, exporting `makeEstate(spec)` which builds the estate under a fresh `fs.mkdtempSync` root and returns that root, and `cleanEstate(root)`. Tasks 7 and 12 reuse it, so accept per-repo files rather than hard-coding one shape.

```javascript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_SPEC = {
  'GoodApp': {},
  'OtherApp': {},
  'Marcus/SecretWork': { 'README.md': 'walled\n' },
  '_scratch/Junk': {}
};

export function makeEstate(spec = DEFAULT_SPEC) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-recall-estate-'));
  for (const [rel, files] of Object.entries(spec)) {
    const dir = path.join(root, rel);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      const p = path.join(dir, name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, body);
    }
    const git = (...a) => execFileSync('git', ['-C', dir, ...a],
      { stdio: ['ignore', 'ignore', 'ignore'] });
    git('init', '-q');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'user.name', 'Fixture Author');
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', 'init');
  }
  return root;
}

export function cleanEstate(root) {
  // retries: on Windows a handle held in a just-created .git directory
  // (git teardown, antivirus) can defeat a single rmSync attempt, which
  // would leave a temp estate containing real nested repos lying around
  if (root) fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
```

Note the explicit `user.email` / `user.name`: fixture repos must not depend on the machine's global git identity, and Task 5b classifies provenance by authorship, so the fixtures need a known author.

- [ ] **Step 2: Write the failing wall test**

`tests/corpus-walls.test.mjs`:

```javascript
import { enumerateLocal } from '../engine/corpus.mjs';
import { makeEstate, cleanEstate } from './fixture-estate.mjs';

let estateRoot;
let config;

beforeAll(() => {
  estateRoot = makeEstate();
  config = { estateRoot, walls: ['Marcus'], exclude: [] };
});

afterAll(() => cleanEstate(estateRoot));

test('finds the ordinary repos', () => {
  const names = enumerateLocal(config).map(r => r.name).sort();
  expect(names).toEqual(['GoodApp', 'OtherApp']);
});

test('a walled repo never appears, at any depth', () => {
  const found = enumerateLocal(config);
  // Guard first. Without this, an empty enumeration satisfies every
  // assertion below and the wall test passes while testing nothing —
  // which is exactly how the committed-gitlink fixtures failed silently.
  expect(found.length).toBeGreaterThan(0);
  expect(found.map(r => r.name)).toContain('GoodApp');

  const all = JSON.stringify(found);
  expect(all).not.toMatch(/Marcus/);
  expect(all).not.toMatch(/SecretWork/);
});

test('underscore-prefixed directories are excluded', () => {
  const found = enumerateLocal(config);
  expect(found.length).toBeGreaterThan(0);
  expect(found.some(r => r.name === 'Junk')).toBe(false);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- corpus-walls`
Expected: FAIL, cannot find module.

- [ ] **Step 4: Implement**

`engine/corpus.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAX_DEPTH = 3;

// Case-insensitive by design. NTFS is case-insensitive by default, so on the
// primary development platform a directory named `marcus` is a different
// string from `Marcus` and an exact-match wall lets it straight through.
// Over-refusing is safe; under-refusing is a tenant leak.
export function isWalled(absPath, estateRoot, walls) {
  const rel = path.relative(estateRoot, absPath)
    .split(path.sep).map(s => s.toLowerCase());
  return walls.some(w => rel.includes(String(w).toLowerCase()));
}

// Returns { remote, readFailed }. Collapsing "no remote configured" and
// "remote could not be read" into a bare null is silent data loss: Task 5's
// duplicate collapse keys on this field, so a repo whose read merely failed
// would be treated as genuinely remote-less and could never be deduplicated
// against its twin, with nothing surfaced anywhere.
function readRemote(dir) {
  try {
    const out = execFileSync('git', ['-C', dir, 'config', '--get', 'remote.origin.url'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return { remote: out || null, readFailed: false };
  } catch (e) {
    // exit code 1 from `git config --get` means the key is simply unset,
    // which is a legitimate no-remote answer rather than a failure
    const unset = e && e.status === 1;
    return { remote: null, readFailed: !unset };
  }
}

export function enumerateLocal(config, depth = MAX_DEPTH) {
  const { estateRoot, walls = [], exclude = [] } = config;
  const out = [];

  const walk = (dir, left) => {
    if (left < 0) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name === '.git') continue;
      if (e.name.startsWith('_') || exclude.includes(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (isWalled(abs, estateRoot, walls)) continue;
      if (fs.existsSync(path.join(abs, '.git'))) {
        const { remote, readFailed } = readRemote(abs);
        out.push({ name: e.name, path: abs, origin: 'local', remote, remoteReadFailed: readFailed });
        continue;
      }
      walk(abs, left - 1);
    }
  };

  walk(estateRoot, depth);
  return out;
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- corpus-walls`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: local corpus enumeration with tenant walls and archive exclusion"
```

---

### Task 5: Duplicate-clone collapse and divergence flagging

**Files:**
- Modify: `engine/corpus.mjs`
- Create: `tests/corpus-dedup.test.mjs`

**Interfaces:**
- Produces: `normalizeRemote(url)` returns a canonical `host/owner/repo` string or `null`. `collapseDuplicates(repos)` returns `Array<{ ...repo, canonical: boolean, siblings: string[], diverged: boolean }>`.

- [ ] **Step 1: Write the failing test**

`tests/corpus-dedup.test.mjs`:

```javascript
import { normalizeRemote, collapseDuplicates } from '../engine/corpus.mjs';

test('remote URL variants normalize to one key', () => {
  const k = 'github.com/e/App';
  expect(normalizeRemote('https://github.com/e/App.git')).toBe(k);
  expect(normalizeRemote('git@github.com:e/App.git')).toBe(k);
  expect(normalizeRemote('https://GitHub.com/e/App/')).toBe(k);
});

test('same remote, same head: collapses to one canonical with the sibling named', () => {
  const out = collapseDuplicates([
    { name: 'App', remote: 'https://github.com/e/App.git', head: 'aaa', lastCommit: 200 },
    { name: 'App-copy', remote: 'git@github.com:e/App.git', head: 'aaa', lastCommit: 100 }
  ]);
  expect(out).toHaveLength(1);
  expect(out[0].name).toBe('App');
  expect(out[0].siblings).toEqual(['App-copy']);
  expect(out[0].diverged).toBe(false);
});

test('same remote, different heads: flags diverged instead of silently picking', () => {
  const out = collapseDuplicates([
    { name: 'Sanduhr', remote: 'https://github.com/e/S.git', head: 'aaa', lastCommit: 200 },
    { name: 'Sanduhr_alt', remote: 'https://github.com/e/S.git', head: 'bbb', lastCommit: 100 }
  ]);
  expect(out).toHaveLength(1);
  expect(out[0].diverged).toBe(true);
  expect(out[0].siblings).toEqual(['Sanduhr_alt']);
});

test('a repo with no remote is never collapsed into another', () => {
  const out = collapseDuplicates([
    { name: 'A', remote: null, head: 'aaa', lastCommit: 1 },
    { name: 'B', remote: null, head: 'bbb', lastCommit: 2 }
  ]);
  expect(out).toHaveLength(2);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- corpus-dedup`
Expected: FAIL, `normalizeRemote is not a function`.

- [ ] **Step 3: Implement**

Append to `engine/corpus.mjs`:

```javascript
export function normalizeRemote(url) {
  if (!url) return null;
  let s = String(url).trim()
    .replace(/^git\+/, '')
    .replace(/^ssh:\/\//, '')
    .replace(/^git@([^:]+):/, '$1/')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
  const parts = s.split('/').filter(Boolean);
  // Host plus the FULL remaining path. Keying on the first three segments
  // only works for host/owner/repo and silently merges anything deeper:
  // gitlab.company.com/team-a/subteam/project-one and .../project-two would
  // collapse into one record, and collapseDuplicates keeps only the loser's
  // NAME in siblings, discarding its path — so an unrelated repo's location
  // becomes unrecoverable in a tool whose whole job is finding where you
  // built something. Returning null for unparseable input is safe (it stays
  // ungroupable); a garbage key that collides with another garbage key is not.
  if (parts.length < 2) return null;
  return [parts[0].toLowerCase(), ...parts.slice(1)].join('/');
}

export function collapseDuplicates(repos) {
  const groups = new Map();
  const loners = [];
  for (const r of repos) {
    const key = normalizeRemote(r.remote);
    // No usable remote key means dedup status is UNKNOWN, not "verified unique".
    // Stamping a confident canonical here converts unknown into confidently
    // correct, which is the same error the diverged flag exists to prevent.
    // remoteReadFailed rides along so a consumer can say WHY it is unknown.
    if (!key) {
      loners.push({ ...r, canonical: true, dedupVerified: false, siblings: [], diverged: false });
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const collapsed = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => (b.lastCommit || 0) - (a.lastCommit || 0));
    const [winner, ...rest] = sorted;
    collapsed.push({
      ...winner,
      canonical: true,
      dedupVerified: true,
      siblings: rest.map(r => r.name),
      diverged: rest.some(r => r.head !== winner.head)
    });
  }
  return [...collapsed, ...loners];
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- corpus-dedup`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: collapse duplicate clones, flag diverged pairs instead of picking"
```

---

### Task 5b: Fork and vendored-checkout filter

**Added by the 2026-08-11 cowpath run.** Without this, a fork of Microsoft's PowerToys ranks first on six of seven real queries and the product confidently returns someone else's code as the user's own prior art. This is the single highest-value task in the plan.

**Files:**
- Modify: `engine/corpus.mjs`
- Create: `tests/corpus-provenance.test.mjs`

**Interfaces:**
- Produces: `classifyProvenance(stats, thresholds)` returns `'own' | 'foreign'`. `repoStats(dir, authors, runner)` returns `{ totalCommits, ownCommits, fileCount }`. Cards gain a `provenance` field, consumed by `scoreCard` in Task 8.

- [ ] **Step 1: Write the failing test**

`tests/corpus-provenance.test.mjs`:

```javascript
import { classifyProvenance } from '../engine/corpus.mjs';

const T = { minAuthorshipRatio: 0.5, minCommitsPerFile: 0.01 };

test('a real repo the user wrote is their own', () => {
  // SnipSnap: 57 commits, all the user's, ~400 files
  expect(classifyProvenance(
    { totalCommits: 57, ownCommits: 57, fileCount: 400 }, T)).toBe('own');
});

test('a fork with thousands of files and two commits is foreign', () => {
  // PowerToys-snipsnap: 2 commits, 1 the user's, ~5000 files
  expect(classifyProvenance(
    { totalCommits: 2, ownCommits: 1, fileCount: 5000 }, T)).toBe('foreign');
});

test('low authorship alone is enough to mark foreign', () => {
  expect(classifyProvenance(
    { totalCommits: 900, ownCommits: 40, fileCount: 300 }, T)).toBe('foreign');
});

test('a large repo the user genuinely wrote stays their own', () => {
  // 626-mod-launcher: 1052 commits, all under the user's two identities
  expect(classifyProvenance(
    { totalCommits: 1052, ownCommits: 1052, fileCount: 900 }, T)).toBe('own');
});

test('an empty repo does not divide by zero', () => {
  expect(classifyProvenance(
    { totalCommits: 0, ownCommits: 0, fileCount: 0 }, T)).toBe('own');
});

// Fail open. An unconfigured author list must never silently hide the estate:
// with no identities to match, ownCommits is 0 for EVERY repo, and a naive
// ratio test would classify all 86 as foreign and return nothing, forever,
// with no error. Not classifiable is not the same as foreign.
test('no configured authors means classification is skipped, not failed', () => {
  expect(classifyProvenance(
    { totalCommits: 57, ownCommits: 0, fileCount: 400, authorsConfigured: false }, T))
    .toBe('own');
});

test('configured authors with zero matches is still foreign', () => {
  expect(classifyProvenance(
    { totalCommits: 57, ownCommits: 0, fileCount: 400, authorsConfigured: true }, T))
    .toBe('foreign');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- corpus-provenance`
Expected: FAIL, `classifyProvenance is not a function`.

- [ ] **Step 3: Implement**

Append to `engine/corpus.mjs`:

```javascript
export const DEFAULT_PROVENANCE = { minAuthorshipRatio: 0.5, minCommitsPerFile: 0.01 };

export function classifyProvenance(stats, t = DEFAULT_PROVENANCE) {
  const {
    totalCommits = 0, ownCommits = 0, fileCount = 0, authorsConfigured = true
  } = stats;
  if (totalCommits === 0) return 'own';
  // Fail open: without identities to match against, ownCommits is 0 for every
  // repo and a ratio test would classify the whole estate foreign, returning
  // nothing forever with no error. Not classifiable is not foreign.
  if (!authorsConfigured) return 'own';
  if (ownCommits / totalCommits < t.minAuthorshipRatio) return 'foreign';
  if (fileCount > 0 && totalCommits / fileCount < t.minCommitsPerFile) return 'foreign';
  return 'own';
}

export function repoStats(dir, authors = [], run = null) {
  const exec = run || ((args) =>
    execFileSync('git', ['-C', dir, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  let totalCommits = 0, ownCommits = 0, fileCount = 0;
  try { totalCommits = Number(exec(['rev-list', '--count', 'HEAD']).trim()) || 0; } catch {}
  try {
    for (const line of exec(['shortlog', '-sn', '--all']).split('\n')) {
      const m = line.match(/^\s*(\d+)\s+(.*)$/);
      if (!m) continue;
      const [, n, who] = m;
      if (authors.some(a => who.toLowerCase().includes(a.toLowerCase()))) {
        ownCommits += Number(n);
      }
    }
  } catch {}
  try { fileCount = exec(['ls-files']).split('\n').filter(Boolean).length; } catch {}
  return { totalCommits, ownCommits, fileCount, authorsConfigured: authors.length > 0 };
}
```

Add `authors` and `provenance` (threshold overrides) to `config.schema.json` as optional properties, defaulting `authors` to the git `user.name` and `user.email` of the estate root. Wire `provenance: classifyProvenance(repoStats(...))` into the record `enumerateLocal` returns, and carry it onto the card in Task 7.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- corpus-provenance`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verify against the real offender**

```bash
node -e "import('./engine/corpus.mjs').then(m=>console.log(
  m.classifyProvenance(m.repoStats('C:/Users/estev/Projects/PowerToys-snipsnap',['Estevan','estevanhernandez']))))"
```

Expected output: `foreign`. Run the same against `SnipSnap` and expect `own`. If the fork does not classify `foreign`, tune the thresholds and record the new values in the commit body. **This check is the task's gate.**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: classify forks and vendored checkouts as foreign provenance"
```

---

### Task 6: Remote-only repos via gh, degrading cleanly when absent

**Files:**
- Create: `engine/remote.mjs`
- Create: `tests/remote.test.mjs`

**Interfaces:**
- Produces: `remoteOnly(config, localRepos, runner)` returns `Array<{ name, path: null, origin: 'remote', remote }>`. `runner` is an injectable `(args) => string` defaulting to a `gh` call, which is how the tests avoid the network.

- [ ] **Step 1: Write the failing test**

`tests/remote.test.mjs`:

```javascript
import { remoteOnly } from '../engine/remote.mjs';

const fakeGh = () => JSON.stringify([
  { name: 'CloudOnly', url: 'https://github.com/e/CloudOnly' },
  { name: 'App', url: 'https://github.com/e/App' }
]);

test('returns only repos with no local clone', () => {
  const out = remoteOnly(
    { githubAccounts: ['e'] },
    [{ name: 'App', remote: 'git@github.com:e/App.git' }],
    fakeGh
  );
  expect(out.map(r => r.name)).toEqual(['CloudOnly']);
  expect(out[0].origin).toBe('remote');
});

test('gh missing degrades to empty, never throws', () => {
  const boom = () => { throw new Error('gh: not found'); };
  expect(remoteOnly({ githubAccounts: ['e'] }, [], boom)).toEqual([]);
});

test('no configured accounts means no remote enumeration', () => {
  expect(remoteOnly({}, [], fakeGh)).toEqual([]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- remote`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`engine/remote.mjs`:

```javascript
import { execFileSync } from 'node:child_process';
import { normalizeRemote } from './corpus.mjs';

const ghRunner = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

export function remoteOnly(config, localRepos = [], runner = ghRunner) {
  const accounts = config.githubAccounts || [];
  if (accounts.length === 0) return [];

  const localKeys = new Set(localRepos.map(r => normalizeRemote(r.remote)).filter(Boolean));
  const out = [];

  for (const account of accounts) {
    let raw;
    try {
      raw = runner(['repo', 'list', account, '--limit', '500', '--json', 'name,url']);
    } catch {
      return out;
    }
    let list;
    try { list = JSON.parse(raw); } catch { continue; }
    for (const r of list) {
      const key = normalizeRemote(r.url);
      if (!key || localKeys.has(key)) continue;
      out.push({ name: r.name, path: null, origin: 'remote', remote: r.url });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- remote`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: enumerate remote-only GitHub repos, degrade to local-only without gh"
```

---

### Task 7: Shallow card indexer with secret hygiene

**Files:**
- Create: `schemas/card.schema.json`
- Create: `engine/cards.mjs`
- Create: `tests/cards.test.mjs`
- Reuse: `tests/fixture-estate.mjs` from Task 4, with a richer per-repo spec

**Interfaces:**
- Consumes: repo records from Tasks 4 to 6.
- Produces: `buildShallowCard(repo)` returns a card object matching `card.schema.json`. `SECRET_PATTERNS` is exported for reuse. `looksSecret(line)` returns boolean.

- [ ] **Step 1: Enrich the fixture repo through the Task 4 helper**

`makeEstate(spec)` from `tests/fixture-estate.mjs` accepts per-repo files, so this task passes a richer spec rather than mutating anything on disk. **Nothing here is committed** — see Task 4 Step 1 for why committed fixture repos silently disabled the wall test.

```javascript
import { makeEstate, cleanEstate, RICH_SPEC } from './fixture-estate.mjs';

// RICH_SPEC lives in the helper; reproduced here so this task is readable
// standalone. Assembled, never literal. A literal sk_live_<26 chars> in a tracked file
// trips GitHub push protection and every other scanner, because a scanner
// cannot distinguish a plausible fake from a live key, and should not try.
// This plan was itself blocked on first push for exactly this.
const FAKE_STRIPE = ['sk', 'live', 'a'.repeat(26)].join('_');

// Exported from tests/fixture-estate.mjs so Task 12's acceptance test uses the
// same estate rather than a second, drifting copy of it.
export const RICH_SPEC = {
  'GoodApp': {
    'package.json': JSON.stringify(
      { name: 'goodapp', dependencies: { next: '^15.0.0', stripe: '^14.0.0' } }),
    'README.md': '# GoodApp\nStripe checkout and magic-link auth for the storefront.\n',
    'src/lib/checkout.ts':
      'export function createCheckoutSession(items, uid) { return { url: "", id: "" }; }\n',
    '.env': `STRIPE_SECRET_KEY=${FAKE_STRIPE}\n`
  },
  'OtherApp': {},
  'Marcus/SecretWork': { 'README.md': 'walled\n' },
  '_scratch/Junk': {}
};

let estateRoot;
beforeAll(() => { estateRoot = makeEstate(RICH_SPEC); });
afterAll(() => cleanEstate(estateRoot));
```

Build the repo record passed to `buildShallowCard` from `estateRoot`, not from `process.cwd()`.

- [ ] **Step 2: Write the failing test**

`tests/cards.test.mjs`:

```javascript
import path from 'node:path';
import { buildShallowCard, looksSecret } from '../engine/cards.mjs';

const repo = () => ({
  name: 'GoodApp',
  path: path.join(estateRoot, 'GoodApp'),
  origin: 'local',
  remote: null, canonical: true, siblings: [], diverged: false
});

test('card carries stack, deps, symbols and claims', () => {
  const c = buildShallowCard(repo());
  expect(c.depth).toBe('shallow');
  expect(c.deps).toEqual(expect.arrayContaining(['next', 'stripe']));
  expect(c.symbols).toEqual(expect.arrayContaining(['createCheckoutSession']));
  expect(c.claims.join(' ').toLowerCase()).toMatch(/stripe checkout/);
  expect(c.head).toMatch(/^[0-9a-f]{7,40}$/);
});

test('no secret value ever reaches the card', () => {
  const serialized = JSON.stringify(buildShallowCard(repo()));
  // matches the assembled fixture credential from Step 1, never written literally
  expect(serialized).not.toMatch(new RegExp(['sk', 'live'].join('_')));
  expect(serialized).not.toMatch(/STRIPE_SECRET_KEY/);
  expect(serialized).not.toMatch(/a{20,}/);
});

test('no file bodies reach the card', () => {
  const c = buildShallowCard(repo());
  expect(JSON.stringify(c)).not.toMatch(/export function/);
});

// Assembled, never literal: a literal key shape in a tracked file trips
// push protection and every other scanner, as it should.
const fakeStripe = ['sk', 'live', 'a'.repeat(26)].join('_');
const fakeGithubPat = ['ghp', 'b'.repeat(36)].join('_');

test('looksSecret catches common credential shapes', () => {
  expect(looksSecret(`STRIPE_SECRET_KEY=${fakeStripe}`)).toBe(true);
  expect(looksSecret(`token: "${fakeGithubPat}"`)).toBe(true);
  expect(looksSecret('const name = "checkout"')).toBe(false);
  expect(looksSecret('// see docs for how to set STRIPE_SECRET_KEY')).toBe(false);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test -- cards`
Expected: FAIL, cannot find module.

- [ ] **Step 4: Write the card schema**

`schemas/card.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["schemaVersion", "repo", "origin", "depth", "indexedAt"],
  "properties": {
    "schemaVersion": { "type": "integer", "const": 1 },
    "repo": { "type": "string" },
    "origin": { "enum": ["local", "remote"] },
    "path": { "type": ["string", "null"] },
    "remote": { "type": ["string", "null"] },
    "canonical": { "type": "boolean" },
    "siblings": { "type": "array", "items": { "type": "string" } },
    "diverged": { "type": "boolean" },
    "provenance": { "enum": ["own", "foreign"] },
    "head": { "type": ["string", "null"] },
    "lastCommit": { "type": ["integer", "null"] },
    "indexedAt": { "type": "string" },
    "depth": { "enum": ["shallow", "shallow-remote", "deep"] },
    "stack": { "type": "object" },
    "deps": { "type": "array", "items": { "type": "string" } },
    "entrypoints": { "type": "array", "items": { "type": "string" } },
    "symbols": { "type": "array", "items": { "type": "string" } },
    "claims": { "type": "array", "items": { "type": "string" } },
    "gotchas": { "type": "array", "items": { "type": "string" } },
    "recallHits": { "type": "integer" },
    "skippedSecretFiles": { "type": "integer" }
  }
}
```

- [ ] **Step 5: Implement the indexer**

`engine/cards.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const SECRET_PATTERNS = [
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i,
  // Identifier ENDING in a credential word, not starting with one. The original
  // required \b immediately before the keyword, but in a namespaced variable the
  // preceding character is an underscore — a word character — so no boundary
  // exists and the pattern could never fire. Measured against every .env in the
  // real estate it caught 1 of 34 credential-bearing lines: VITE_FIREBASE_API_KEY,
  // VITE_GEMINI_API_KEY, VITE_GOOGLE_MAPS_API_KEY and JWT_SECRET_KEY all slipped.
  /[A-Za-z0-9_]*(api[_-]?key|secret|token|password|credential)[A-Za-z0-9_]*\s*[:=]\s*\S{12,}/i,
  // Google and Firebase keys: 39 chars, AIza-prefixed. Most of the estate's misses.
  /\bAIza[A-Za-z0-9_-]{35}\b/
];

// Precision matters as much as recall. A URL or hostname must NOT flag —
// ALLOWED_ORIGINS, AUTH_DOMAIN, REDIRECT_URI and the like are not credentials,
// and a file skipped as secret-bearing contributes no symbols at all, silently
// degrading the recall this plugin exists to provide.

const SKIP_FILES = new Set(['.env', '.env.local', '.env.production', 'id_rsa']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.cs']);
const SYMBOL_RE = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^\s*def\s+([A-Za-z_]\w*)/gm;

export function looksSecret(line) {
  return SECRET_PATTERNS.some(re => re.test(line));
}

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

function readDeps(dir) {
  const p = path.join(dir, 'package.json');
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Object.keys({ ...j.dependencies, ...j.devDependencies });
  } catch { return []; }
}

function readClaims(dir) {
  const p = path.join(dir, 'README.md');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && !looksSecret(l))
    .slice(0, 10)
    .map(l => l.trim().slice(0, 160));
}

function readGotchas(dir) {
  const p = path.join(dir, 'CLAUDE.md');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .filter(l => /^\s*[-*]\s+\*\*/.test(l) && !looksSecret(l))
    .slice(0, 15)
    .map(l => l.replace(/^\s*[-*]\s+/, '').slice(0, 200));
}

function scanCode(dir) {
  const symbols = new Set();
  const entrypoints = [];
  let skippedSecretFiles = 0;

  const walk = (d, depth) => {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const abs = path.join(d, e.name);
      if (e.isDirectory()) { walk(abs, depth + 1); continue; }
      if (SKIP_FILES.has(e.name) || e.name.startsWith('.env')) { skippedSecretFiles++; continue; }
      if (!CODE_EXT.has(path.extname(e.name))) continue;
      if (/route\.(ts|js)$/.test(e.name) || /^(index|main|cli)\./.test(e.name)) {
        entrypoints.push(path.relative(dir, abs).split(path.sep).join('/'));
      }
      let body;
      try { body = fs.readFileSync(abs, 'utf8'); } catch { continue; }
      if (body.split('\n').some(looksSecret)) { skippedSecretFiles++; continue; }
      for (const m of body.matchAll(SYMBOL_RE)) symbols.add(m[1] || m[2]);
    }
  };

  walk(dir, 0);
  return {
    symbols: [...symbols].slice(0, 400),
    entrypoints: entrypoints.slice(0, 60),
    skippedSecretFiles
  };
}

export function buildShallowCard(repo, now = new Date()) {
  const deps = readDeps(repo.path);
  const { symbols, entrypoints, skippedSecretFiles } = scanCode(repo.path);
  const lastCommit = git(repo.path, ['log', '-1', '--format=%ct']);

  return {
    schemaVersion: 1,
    repo: repo.name,
    origin: repo.origin,
    // forward slashes everywhere: the cowpath's first pass silently returned the
    // wrong shape because Windows separators broke path splitting, and nothing errored
    path: repo.path ? repo.path.split(path.sep).join('/') : null,
    remote: repo.remote ?? null,
    canonical: repo.canonical ?? true,
    siblings: repo.siblings ?? [],
    diverged: repo.diverged ?? false,
    provenance: repo.provenance ?? 'own',
    head: git(repo.path, ['rev-parse', '--short', 'HEAD']),
    lastCommit: lastCommit ? Number(lastCommit) : null,
    indexedAt: now.toISOString(),
    depth: 'shallow',
    stack: {
      framework: deps.find(d => ['next', 'react', 'vue', 'svelte'].includes(d)) || null,
      services: deps.filter(d => /firebase|stripe|openai|anthropic|google/.test(d))
    },
    deps,
    entrypoints,
    symbols,
    claims: readClaims(repo.path),
    gotchas: readGotchas(repo.path),
    recallHits: 0,
    skippedSecretFiles
  };
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `npm test -- cards`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: shallow card indexer, shapes only, secret-bearing files skipped"
```

---

### Task 8: Deterministic matcher and honest zero-hit

**Files:**
- Create: `engine/match.mjs`
- Create: `tests/match.test.mjs`

**Interfaces:**
- Consumes: cards from Task 7.
- Produces: `scoreCard(card, terms, ctx)` returns a number. `rank(cards, query, ctx)` returns `Array<{ card, score, why: string[] }>` sorted descending, dropping zero scores entirely.

- [ ] **Step 1: Write the failing test**

`tests/match.test.mjs`:

```javascript
import { rank, scoreCard } from '../engine/match.mjs';

const card = (over = {}) => ({
  repo: 'A', depth: 'shallow', canonical: true, lastCommit: 1000,
  provenance: 'own', claims: [], gotchas: [], symbols: [], deps: [],
  entrypoints: [], stack: { services: [] }, ...over
});

test('a claim hit outranks a dependency hit', () => {
  const claimy = card({ repo: 'Claimy', claims: ['stripe checkout flow'] });
  const deppy = card({ repo: 'Deppy', deps: ['stripe'] });
  const out = rank([deppy, claimy], 'stripe checkout', {});
  expect(out[0].card.repo).toBe('Claimy');
});

test('deep cards outrank shallow at equal term score', () => {
  const deep = card({ repo: 'Deep', depth: 'deep', claims: ['stripe'] });
  const shallow = card({ repo: 'Shallow', claims: ['stripe'] });
  expect(rank([shallow, deep], 'stripe', {})[0].card.repo).toBe('Deep');
});

test('stack affinity lifts a matching stack', () => {
  const same = card({ repo: 'Same', claims: ['auth'], deps: ['next'] });
  const other = card({ repo: 'Other', claims: ['auth'], deps: ['wpf'] });
  const out = rank([other, same], 'auth', { deps: ['next'] });
  expect(out[0].card.repo).toBe('Same');
});

test('a non-canonical sibling is penalised below its canonical twin', () => {
  const canon = card({ repo: 'Canon', claims: ['pdf'], canonical: true });
  const dupe = card({ repo: 'Dupe', claims: ['pdf'], canonical: false });
  expect(rank([dupe, canon], 'pdf', {})[0].card.repo).toBe('Canon');
});

test('no match returns an empty array, never a stretched hit', () => {
  expect(rank([card({ claims: ['weather'] })], 'quantum bicycle', {})).toEqual([]);
});

test('every returned hit explains itself', () => {
  const out = rank([card({ claims: ['stripe checkout'] })], 'stripe', {});
  expect(out[0].why.length).toBeGreaterThan(0);
});

// --- the four rules the cowpath run added ---

test('code evidence outranks prose evidence', () => {
  const inCode = card({ repo: 'Built', symbols: ['createCheckoutSession'] });
  const inProse = card({ repo: 'Planned', claims: ['createCheckoutSession someday'] });
  const out = rank([inProse, inCode], 'createCheckoutSession', {});
  expect(out[0].card.repo).toBe('Built');
  expect(out[0].codeHits).toBeGreaterThan(0);
  expect(out[0].docHits).toBe(0);
});

test('a documentation-only hit says so', () => {
  const out = rank([card({ claims: ['stripe checkout'] })], 'stripe', {});
  expect(out[0].why.join(' ')).toMatch(/documentation only/);
});

test('a rare term beats a term present in every card', () => {
  const cards = [
    card({ repo: 'Rare', symbols: ['themefeed', 'common'] }),
    ...Array.from({ length: 9 }, (_, i) => card({ repo: `C${i}`, symbols: ['common'] }))
  ];
  const rare = rank(cards, 'themefeed', {})[0];
  const commonTop = rank(cards, 'common', {})[0];
  expect(rare.card.repo).toBe('Rare');
  expect(rare.score).toBeGreaterThan(commonTop.score);
});

test('a foreign repo never ranks unless opted in', () => {
  const fork = card({ repo: 'PowerToys-fork', provenance: 'foreign', symbols: ['WinUI'] });
  expect(rank([fork], 'WinUI', {})).toEqual([]);
  expect(rank([fork], 'WinUI', { includeForeign: true })).toHaveLength(1);
});

test('the current repo is excluded from its own recall', () => {
  const self = card({ repo: 'RTClickPng', symbols: ['ClipboardWriter'] });
  expect(rank([self], 'ClipboardWriter', { selfRepo: 'RTClickPng' })).toEqual([]);
  expect(rank([self], 'ClipboardWriter',
    { selfRepo: 'RTClickPng', includeSelf: true })).toHaveLength(1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- match`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`engine/match.mjs`:

**Weights corrected by the 2026-08-11 cowpath run.** The pre-cowpath ordering put README `claims` highest at 10, above `symbols` at 6, so a README describing an unbuilt feature outranked a repo with the function actually in source. Code-derived fields now lead. And every field weight is multiplied by term rarity: the run's cleanest signal was a rare phrase that hit exactly two repos, while every common technical term drowned in a vendored monorepo.

```javascript
// code-derived fields lead; prose is for discovery, not proof
const WEIGHTS = { symbols: 10, entrypoints: 8, gotchas: 5, claims: 4, deps: 3 };
const CODE_FIELDS = new Set(['symbols', 'entrypoints']);
const DEPTH_BONUS = { deep: 5, shallow: 0, 'shallow-remote': -2 };

export function terms(query) {
  return String(query).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
}

// inverse document frequency across the card set: a term in every card
// carries no information, a term in two carries a lot
export function idf(cards) {
  const df = new Map();
  for (const card of cards) {
    const hay = [...Object.keys(WEIGHTS)]
      .flatMap(f => card[f] || []).join(' ').toLowerCase();
    for (const t of new Set(hay.split(/[^a-z0-9]+/).filter(x => x.length > 2))) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const n = Math.max(1, cards.length);
  return (term) => Math.log((n + 1) / ((df.get(term) || 0) + 1)) + 1;
}

export function scoreCard(card, ts, ctx = {}, weightOf = () => 1) {
  let score = 0;
  let codeHits = 0;
  let docHits = 0;
  const why = [];

  for (const [field, weight] of Object.entries(WEIGHTS)) {
    const hay = (card[field] || []).join(' ').toLowerCase();
    const hits = ts.filter(t => hay.includes(t));
    if (hits.length) {
      for (const t of hits) score += weight * weightOf(t);
      if (CODE_FIELDS.has(field)) codeHits += hits.length; else docHits += hits.length;
      why.push(`${field}: ${hits.join(', ')}`);
    }
  }

  if (score === 0) return { score: 0, why, codeHits, docHits };

  // somebody else's code is not your prior art
  if (card.provenance === 'foreign' && !ctx.includeForeign) {
    return { score: 0, why: ['excluded: foreign provenance'], codeHits, docHits };
  }
  if (ctx.selfRepo && card.repo === ctx.selfRepo && !ctx.includeSelf) {
    return { score: 0, why: ['excluded: current repo'], codeHits, docHits };
  }
  if (docHits > 0 && codeHits === 0) why.push('documentation only, no code evidence');

  score += DEPTH_BONUS[card.depth] ?? 0;
  if (card.depth === 'deep') why.push('deep card');

  const ctxDeps = new Set(ctx.deps || []);
  const shared = (card.deps || []).filter(d => ctxDeps.has(d));
  if (shared.length) { score += 4; why.push(`stack affinity: ${shared.slice(0, 3).join(', ')}`); }

  if (card.canonical === false) { score -= 6; why.push('non-canonical sibling'); }
  if (card.diverged) why.push('DIVERGED clone pair, verify which copy is home');

  const ageDays = card.lastCommit
    ? (Date.now() / 1000 - card.lastCommit) / 86400
    : 3650;
  score += Math.max(0, 3 - ageDays / 365);

  return { score, why, codeHits, docHits };
}

export function rank(cards, query, ctx = {}) {
  const ts = terms(query);
  const weightOf = idf(cards);
  return cards
    .map(card => ({ card, ...scoreCard(card, ts, ctx, weightOf) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- match`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: deterministic ranking with self-explaining hits and honest zero-hit"
```

---

### Task 9: Derived queue, card store, and CLI wiring

**Files:**
- Create: `engine/queue.mjs`
- Create: `engine/store.mjs`
- Create: `engine/cli.mjs`
- Create: `tests/queue.test.mjs`
- Create: `tests/cli.test.mjs`

**Interfaces:**
- Produces: `deepenQueue(cards)` returns shallow cards ordered by `recallHits` then recency. `saveCards(cards, env)` / `readCards(env)` persist to `<dataHome>/cards.json`. `bumpHits(names, env)` increments `recallHits`. CLI subcommands: `index`, `sweep <query>`, `queue`, `vitals`, `banner`.

- [ ] **Step 1: Write the failing queue test**

`tests/queue.test.mjs`:

```javascript
import { deepenQueue } from '../engine/queue.mjs';

const c = (repo, depth, recallHits, lastCommit) =>
  ({ repo, depth, recallHits, lastCommit });

test('deep cards are not queued', () => {
  const q = deepenQueue([c('Done', 'deep', 99, 5), c('Todo', 'shallow', 1, 5)]);
  expect(q.map(x => x.repo)).toEqual(['Todo']);
});

test('most-recalled shallow card comes first', () => {
  const q = deepenQueue([c('Rare', 'shallow', 1, 5), c('Hot', 'shallow', 12, 5)]);
  expect(q.map(x => x.repo)).toEqual(['Hot', 'Rare']);
});

test('ties break on recency', () => {
  const q = deepenQueue([c('Old', 'shallow', 3, 1), c('New', 'shallow', 3, 9)]);
  expect(q.map(x => x.repo)).toEqual(['New', 'Old']);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- queue`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement the queue and the store**

`engine/queue.mjs`:

```javascript
export function deepenQueue(cards) {
  return cards
    .filter(c => c.depth !== 'deep')
    .sort((a, b) =>
      (b.recallHits || 0) - (a.recallHits || 0) ||
      (b.lastCommit || 0) - (a.lastCommit || 0));
}
```

`engine/store.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { resolveDataHome } from './datahome.mjs';

function cardsPath(env) { return path.join(resolveDataHome(env).dir, 'cards.json'); }

export function saveCards(cards, env = process.env) {
  const p = cardsPath(env);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: 1, cards }, null, 2));
  return p;
}

export function readCards(env = process.env) {
  const p = cardsPath(env);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).cards || []; } catch { return []; }
}

export function bumpHits(names, env = process.env) {
  const cards = readCards(env);
  const set = new Set(names);
  for (const c of cards) if (set.has(c.repo)) c.recallHits = (c.recallHits || 0) + 1;
  saveCards(cards, env);
  return cards;
}
```

- [ ] **Step 4: Write the CLI**

`engine/cli.mjs`:

```javascript
#!/usr/bin/env node
import { loadConfig } from './config.mjs';
import { enumerateLocal, collapseDuplicates } from './corpus.mjs';
import { remoteOnly } from './remote.mjs';
import { buildShallowCard } from './cards.mjs';
import { rank } from './match.mjs';
import { deepenQueue } from './queue.mjs';
import { saveCards, readCards, bumpHits } from './store.mjs';
import { banner } from './banner.mjs';

const [cmd, ...rest] = process.argv.slice(2);

function requireConfig() {
  const cfg = loadConfig();
  if (!cfg) {
    console.error('vibe-recall: no config. Run /vibe-recall first-run setup.');
    process.exit(2);
  }
  return cfg;
}

const commands = {
  index() {
    const cfg = requireConfig();
    const locals = collapseDuplicates(enumerateLocal(cfg));
    const remotes = remoteOnly(cfg, locals);
    const cards = [
      ...locals.map(r => buildShallowCard(r)),
      ...remotes.map(r => ({
        schemaVersion: 1, repo: r.name, origin: 'remote', path: null, remote: r.remote,
        canonical: true, siblings: [], diverged: false, head: null, lastCommit: null,
        indexedAt: new Date().toISOString(), depth: 'shallow-remote', stack: {},
        deps: [], entrypoints: [], symbols: [], claims: [], gotchas: [],
        recallHits: 0, skippedSecretFiles: 0
      }))
    ];
    const p = saveCards(cards);
    console.log(`indexed ${cards.length} repos -> ${p}`);
    const diverged = cards.filter(c => c.diverged);
    if (diverged.length) {
      console.log(`\nDIVERGED clone pairs, resolve before trusting these:`);
      for (const c of diverged) console.log(`  ${c.repo} vs ${c.siblings.join(', ')}`);
    }
  },

  sweep() {
    const query = rest.join(' ');
    const hits = rank(readCards(), query, {}).slice(0, 10);
    if (hits.length === 0) {
      console.log(`No prior art in your estate for "${query}". Build it fresh.`);
      return;
    }
    bumpHits(hits.map(h => h.card.repo));
    for (const h of hits) {
      console.log(`${h.card.repo.padEnd(24)} ${h.card.depth.padEnd(14)} ${h.why.join(' | ')}`);
    }
  },

  queue() {
    for (const c of deepenQueue(readCards()).slice(0, 20)) {
      console.log(`${String(c.recallHits || 0).padStart(3)}  ${c.repo}`);
    }
  },

  vitals() {
    const cards = readCards();
    const deep = cards.filter(c => c.depth === 'deep').length;
    const skipped = cards.reduce((n, c) => n + (c.skippedSecretFiles || 0), 0);
    console.log(`repos indexed   ${cards.length}`);
    console.log(`deep cards      ${deep}`);
    console.log(`queue depth     ${deepenQueue(cards).length}`);
    console.log(`diverged pairs  ${cards.filter(c => c.diverged).length}`);
    console.log(`secret skips    ${skipped}`);
  },

  banner() { const out = banner(rest.join(' ')); if (out) console.log(out); }
};

const run = commands[cmd];
if (!run) {
  console.error('usage: vibe-recall <index|sweep|queue|vitals|banner>');
  process.exit(1);
}
run();
```

- [ ] **Step 5: Write the CLI smoke test**

`tests/cli.test.mjs`:

```javascript
import { execFileSync } from 'node:child_process';

test('unknown subcommand exits non-zero with usage', () => {
  expect(() =>
    execFileSync('node', ['engine/cli.mjs', 'nonsense'], { stdio: 'pipe' })
  ).toThrow();
});
```

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS across queue and cli. Banner import resolves after Task 10; if executing strictly in order, stub `engine/banner.mjs` with `export function banner() { return null; }` now and replace it in Task 10.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: card store, demand-ranked deepen queue, CLI dispatch"
```

---

### Task 10: The hook banner and its enforceable budget

**Files:**
- Create: `engine/banner.mjs`
- Create: `hooks/hooks.json`
- Create: `tests/banner-budget.test.mjs`

**Interfaces:**
- Consumes: `readCards` from Task 9, `rank` from Task 8.
- Produces: `banner(prompt, env)` returns a string or `null`. `hasBuildIntent(prompt)` returns boolean. `isStale(card, staleAfterDays, now)` returns boolean, comparing `indexedAt` only.

- [ ] **Step 1: Write the failing budget test**

This test is the reason the engine layer exists.

**Why a static import-graph assertion and not a runtime spy:** `jest.spyOn(fsNamespace, 'readFileSync')` does not work here. Under ESM, `await import('node:fs')` yields a module namespace exotic object whose properties are non-writable, so the spy throws instead of asserting. Walking the import graph proves the budget more strongly anyway: a module that cannot reach `child_process` cannot shell out on any code path, including ones no runtime test happened to exercise.

`tests/banner-budget.test.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { banner, hasBuildIntent, isStale } from '../engine/banner.mjs';

const FORBIDDEN = [
  'child_process', 'node:child_process',
  'http', 'node:http', 'https', 'node:https',
  'net', 'node:net', 'dgram', 'node:dgram'
];

function importGraph(entry, seen = new Set()) {
  const abs = path.resolve(entry);
  if (seen.has(abs)) return seen;
  seen.add(abs);
  const body = fs.readFileSync(abs, 'utf8');
  for (const m of body.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    if (spec.startsWith('.')) importGraph(path.join(path.dirname(abs), spec), seen);
  }
  return seen;
}

function specifiersOf(file) {
  const body = fs.readFileSync(file, 'utf8');
  return [...body.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map(m => m[1]);
}

test('build intent detection is narrow', () => {
  expect(hasBuildIntent("let's add stripe checkout to Reel-Battles")).toBe(true);
  expect(hasBuildIntent('build a dashboard for the fleet')).toBe(true);
  expect(hasBuildIntent('what did that error mean')).toBe(false);
  expect(hasBuildIntent('run the tests')).toBe(false);
});

test('staleness at hook time is time-based, never HEAD-based', () => {
  const now = new Date('2026-08-11T00:00:00Z');
  expect(isStale({ indexedAt: '2026-08-10T00:00:00Z' }, 14, now)).toBe(false);
  expect(isStale({ indexedAt: '2026-01-01T00:00:00Z' }, 14, now)).toBe(true);
  expect(isStale({}, 14, now)).toBe(true);
});

test('nothing in the hook import graph can spawn a process or open a socket', () => {
  const graph = importGraph('engine/banner.mjs');
  const offenders = [];
  for (const file of graph) {
    for (const spec of specifiersOf(file)) {
      if (FORBIDDEN.includes(spec)) offenders.push(`${path.basename(file)} -> ${spec}`);
    }
  }
  expect(offenders).toEqual([]);
});

test('the hook graph never imports the corpus or card builders', () => {
  const names = [...importGraph('engine/banner.mjs')].map(f => path.basename(f));
  expect(names).not.toContain('corpus.mjs');
  expect(names).not.toContain('cards.mjs');
  expect(names).not.toContain('remote.mjs');
});

test('a non-build prompt produces nothing', () => {
  expect(banner('what time is it')).toBeNull();
});
```

Note the consequence for `engine/store.mjs`: it must not import `child_process`, and `datahome.mjs` must stay pure. If a later change makes the store shell out, this test fails and the budget is defended automatically.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- banner-budget`
Expected: FAIL, cannot find module (or the Task 9 stub returns null for the build-intent case).

- [ ] **Step 3: Implement the banner**

`engine/banner.mjs`:

```javascript
import { readCards } from './store.mjs';
import { rank } from './match.mjs';

const INTENT = [
  /\b(build|create|add|implement|scaffold|wire up|set up)\s+(a|an|the|some)?\s*\w/i,
  /\bwe need\b/i,
  /\bstart(ing)? a new\b/i,
  /\bnext feature\b/i
];

export function hasBuildIntent(prompt) {
  const p = String(prompt || '');
  if (p.length < 8) return false;
  return INTENT.some(re => re.test(p));
}

export function isStale(card, staleAfterDays = 14, now = new Date()) {
  if (!card.indexedAt) return true;
  const ageDays = (now.getTime() - Date.parse(card.indexedAt)) / 86400000;
  return ageDays > staleAfterDays;
}

export function banner(prompt, env = process.env) {
  if (!hasBuildIntent(prompt)) return null;

  let cards;
  try { cards = readCards(env); } catch { return null; }
  if (cards.length === 0) {
    return 'BT4  no index yet. Run /vibe-recall:index to make your own work searchable.';
  }

  const hits = rank(cards, prompt, {}).slice(0, 3);
  if (hits.length === 0) return null;

  if (hits.every(h => isStale(h.card, Number(env.VIBE_RECALL_STALE_DAYS) || 14))) {
    return 'BT4  index is stale. Run /vibe-recall:index to refresh before trusting a hit.';
  }

  const lines = hits.map(h => {
    const flag = h.card.diverged ? '  DIVERGED' : '';
    return `  ${h.card.repo.padEnd(22)} ${h.card.depth.padEnd(14)}${flag}`;
  });

  return [
    'BT4  you have built this before',
    ...lines,
    '  /vibe-recall:sweep <phrase>   for the evidence'
  ].join('\n');
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- banner-budget`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire the hook**

`hooks/hooks.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/engine/cli.mjs\" banner \"$CLAUDE_USER_PROMPT\""
          }
        ]
      }
    ]
  }
}
```

Verify the environment variable name against the current Claude Code hooks reference before shipping; if the prompt is delivered on stdin rather than as an argument, adapt `cli.mjs` to read stdin when no argument is present. Do not guess: check the docs and record what you found in the commit body.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: hook banner with an enforceable index-only budget"
```

---

### Task 11: Skills and commands, the judgment layer

**Files:**
- Create: `skills/guide/SKILL.md`, `skills/router/SKILL.md`, `skills/first-run-setup/SKILL.md`, `skills/sweep/SKILL.md`, `skills/brief/SKILL.md`, `skills/deepen/SKILL.md`, `skills/vitals/SKILL.md`, `skills/session-logger/SKILL.md`, `skills/friction-logger/SKILL.md`
- Create: `commands/vibe-recall.md`, `commands/index.md`, `commands/sweep.md`, `commands/brief.md`, `commands/deepen.md`, `commands/vitals.md`
- Create: `tests/skills-contract.test.mjs`

**Interfaces:**
- Consumes: every CLI subcommand from Tasks 9 and 10.
- Produces: no code interface. The `brief` skill is the only surface allowed to author claims about source, and it must re-read at current HEAD.

- [ ] **Step 1: Write the failing skills-contract test**

Structural assertions, so the skill layer cannot silently rot.

`tests/skills-contract.test.mjs`:

```javascript
import fs from 'node:fs';
import path from 'node:path';

const SKILLS = ['guide', 'router', 'first-run-setup', 'sweep', 'brief', 'deepen',
  'vitals', 'session-logger', 'friction-logger'];

test.each(SKILLS)('%s has frontmatter with name and description', (s) => {
  const body = fs.readFileSync(path.join('skills', s, 'SKILL.md'), 'utf8');
  expect(body.startsWith('---')).toBe(true);
  expect(body).toMatch(/^name:\s*\S+/m);
  expect(body).toMatch(/^description:\s*\S+/m);
});

test('the brief skill states the live-verification rule verbatim', () => {
  const body = fs.readFileSync('skills/brief/SKILL.md', 'utf8');
  expect(body).toMatch(/index can suggest, only a live read can claim/i);
  expect(body).toMatch(/current HEAD/);
});

test('the brief skill hands off without inventing vibe-taker flags', () => {
  const body = fs.readFileSync('skills/brief/SKILL.md', 'utf8');
  expect(body).toMatch(/vibe-taker:capture/);
  expect(body).not.toMatch(/--repo|--feature/);
});

test('no skill body contains emoji', () => {
  for (const s of SKILLS) {
    const body = fs.readFileSync(path.join('skills', s, 'SKILL.md'), 'utf8');
    expect(body).not.toMatch(/\p{Extended_Pictographic}/u);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- skills-contract`
Expected: FAIL, ENOENT on `skills/guide/SKILL.md`.

- [ ] **Step 3: Write the guide skill**

`skills/guide/SKILL.md` carries persona, posture, and the invariants every other skill reads first. Model it on `vibe-access/skills/guide/SKILL.md` for structure. It MUST state, in its own words: walls are refusals; cards store shapes not content; the index suggests and only a live read claims; zero hits is a real answer; vibe-recall never writes code into a target.

- [ ] **Step 4: Write the brief skill, the one that carries the trust rule**

`skills/brief/SKILL.md` frontmatter and body. The body must:

1. Take a repo name from a prior sweep.
2. Read that repo at current HEAD, live. Never quote a path from the card without opening it.
3. Emit the brief shape: source and HEAD, `file:line` ranges, contract, gotcha, what to redo.
4. End with the handoff: the source repo path, and the literal line `/vibe-taker:capture <path>` to run from that repo. No flags.
5. For a `shallow-remote` hit, say plainly that the repo is not on this machine, limit claims to what the API showed, and offer to clone.

Include this sentence verbatim so the contract test passes: *The index can suggest, only a live read can claim.*

- [ ] **Step 5: Write the remaining skills and the command files**

`router` reads state and recommends the next move, never auto-firing `index`. `first-run-setup` captures `estateRoot`, `githubAccounts`, `walls` (Marcus pre-seeded), `exclude`, writes config, idempotent. `sweep` shells to the CLI and formats hits. `deepen` drains the queue by authoring `features[]` into a card and flipping `depth` to `deep`. `vitals` shells to the CLI. The two loggers mirror the family pattern.

Command files are thin: frontmatter `description` and `argument-hint`, then a pointer to the skill.

- [ ] **Step 6: Run it and watch it pass**

Run: `npm test -- skills-contract`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: skills and commands layer with contract tests on the trust rules"
```

---

### Task 12: Cart seam, docs, real-estate validation, and ship

**Files:**
- Create: `README.md`, `CHANGELOG.md`
- Create: `docs/cart-seam.md`
- Modify: `skills/guide/SKILL.md` (composition note)
- Create: `tests/acceptance.test.mjs`

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Write the acceptance test**

`tests/acceptance.test.mjs`:

```javascript
import { enumerateLocal, collapseDuplicates } from '../engine/corpus.mjs';
import { makeEstate, cleanEstate, RICH_SPEC } from './fixture-estate.mjs';
import { buildShallowCard } from '../engine/cards.mjs';
import { rank } from '../engine/match.mjs';

// RICH_SPEC is the Task 7 spec, exported from the helper so the acceptance
// test and the card tests describe the same estate instead of drifting apart.
let estateRoot;
beforeAll(() => { estateRoot = makeEstate(RICH_SPEC); });
afterAll(() => cleanEstate(estateRoot));

test('end to end on the fixture estate: index then recall finds the right repo', () => {
  const cfg = { estateRoot, walls: ['Marcus'], exclude: [] };
  const cards = collapseDuplicates(enumerateLocal(cfg)).map(r => buildShallowCard(r));

  // Guard before every absence assertion below. An empty card set satisfies
  // "does not match Marcus" trivially, which is how the committed-gitlink
  // fixtures made the wall test pass while exercising nothing.
  expect(cards.length).toBeGreaterThan(0);
  expect(cards.map(c => c.repo)).toContain('GoodApp');

  const hits = rank(cards, 'stripe checkout', {});
  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0].card.repo).toBe('GoodApp');

  const serialized = JSON.stringify(cards);
  expect(serialized).not.toMatch(/Marcus/);
  expect(serialized).not.toMatch(new RegExp(['sk', 'live'].join('_')));
});
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 3: Document the Cart seam**

`docs/cart-seam.md` specifies the optional composition: vibe-cartographer's `:spec` and `:checklist` call `vibe-recall sweep` against their own artifact when vibe-recall is installed, and skip silently when it is not. **This document is a proposal to Cart, not a change to Cart.** Do not edit vibe-cartographer in this plan; that is separate cross-plugin coordination with its own promotion.

- [ ] **Step 4: Write README and CHANGELOG**

README follows the family standard: what it does, the storefront voice, install, the six commands, the invariants (walls, shapes-not-content, live-verify), and an honest limits section naming what v0.1 does not do (no public code search, no comparative briefs, no cross-machine sync, no automatic planting). No emoji.

- [ ] **Step 5: Run against the real estate**

```bash
node engine/cli.mjs index
node engine/cli.mjs vitals
node engine/cli.mjs sweep "stripe checkout"
```

Gate, all four must hold:
1. `vitals` reports a repo count within 5 of the real in-scope count.
2. No walled path appears in `cards.json`. Verify with a literal search.
3. At least one sweep surfaces prior art that would have changed a real build decision.
4. Hand-verify the top hit's cited paths. If any path is wrong, stop and fix the indexer before shipping.

- [ ] **Step 6: Compare against the cowpath notes**

Re-read `docs/cowpath-notes.md`. For each finding recorded there, confirm the built tool handles it or record why it does not in the README's honest-limits section. A finding silently dropped is a regression against the reason the plugin exists.

- [ ] **Step 7: Commit and tag**

```bash
git add -A && git commit -m "docs: README, CHANGELOG, Cart seam proposal, acceptance coverage"
git tag v0.1.0
```

- [ ] **Step 8: Ship to canary, then hold**

Push the repo and the tag. **Do not touch `marketplace.json` in this plan.** Promotion to stable is a separate deliberate act: verify the tag resolves, then bump the `ref` in vibe-plugins per the promotion checklist.

---

## Self-review notes

**Spec coverage.** Every design section maps to a task: concern boundary (Task 11 Step 4 handoff, contract-tested), corpus resolver (4, 5, 6), indexer with shapes-not-content (7), matcher with zero-hit honesty (8), verifier and briefer (11), surfaces (9, 11), hook with budget (10), Cart seam (12), queue as derived view (9), data home ladder (2), config (3), error and edge table (distributed across 4 to 10), testing section (all seven named tests appear: recall in 12, wall in 4, dedup in 5, staleness in 10, secret hygiene in 7, hook budget in 10, zero-hit in 8), not-in-v0.1 (12 Step 4).

**Known soft spots, named rather than papered over.**

1. **Hook wiring.** The `UserPromptSubmit` prompt-delivery mechanism (argument versus stdin, exact env var name) is not asserted from memory. Task 10 Step 5 instructs the implementer to check the live hooks reference and record the finding in the commit body. Guessing an environment variable into a shipped hook is how a hook silently never fires.
2. **Task 11 is the thinnest task.** Nine SKILL bodies are specified by requirement rather than reproduced verbatim, because inlining nine full prose skills would triple this document for content that is prose, not code. The mitigation is real: `tests/skills-contract.test.mjs` enforces frontmatter presence, the verbatim trust-rule sentence, the absence of invented vibe-taker flags, and the no-emoji rule, so the load-bearing claims cannot rot silently. Structure comes from `vibe-access/skills/guide/SKILL.md`, which is on disk and readable.
3. **Ranking weights are a first guess.** The `WEIGHTS` and bonuses in Task 8 are seeded from intuition. Task 1's cowpath notes are the calibration data; Task 12 Step 6 requires reconciling them. Expect to tune these once against real results rather than trusting the initial numbers.

**Type consistency.** `card.repo` is the repo name string everywhere. `rank()` returns `{ card, score, why }` and every consumer destructures `.card`. `resolveDataHome` returns `{ dir, tier }` in Tasks 2, 3, and 9. `collapseDuplicates` adds `canonical`, `siblings`, `diverged`, all three consumed in `scoreCard` and the `index` CLI path.
