# vibe-runbook v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Claude Code plugin that reads a runbook, classifies every claim in it by shape, verifies the two shapes that can be verified against a named environment, and offers two rewrites for a stale pin with a rule that picks between them.

**Architecture:** An ESM engine under `engine/` does the mechanical work (extract, classify, walk, remediate) and is driven by thin SKILL files, matching vibe-access and vibe-prompt. State caches to `.vibe-runbook/state/`. The engine is pure Node with `ajv` for schema validation and no other runtime dependency. Every mutating path is opt-in and backed up.

**Tech Stack:** Node ESM (`"type": "module"`), Jest 29 run with `--experimental-vm-modules`, ajv ^8.17.1. No TypeScript, matching the family.

**Spec:** [`../specs/2026-08-13-vibe-runbook-v0.1-design.md`](../specs/2026-08-13-vibe-runbook-v0.1-design.md)

## Global Constraints

- **A `receipt` claim is NEVER emitted as `FAIL`.** This is the central correctness requirement. Every task that touches verdicts must preserve it.
- **Enumeration is mechanical and exhaustive, or the run is `BLOCKED`.** There is no sampling mode. Every report states `checked N of M enumerated`.
- **Nothing in v0.1 spends.** The `cost` field is required on every claim; no code path incurs cost.
- **Credential preflight hard-stops.** Missing or expired credential means stop and report `BLOCKED` with the exact ask. Never fall back to a local environment.
- **Never print a secret.** Report shapes, statuses, and counts only.
- **Cost units are runbook-defined strings and are never normalized across runbooks.**
- **Dual-tenant:** no 626 branding, personas, or dashboard coupling in anything the plugin emits. No telemetry. No outbound calls beyond the walk the user named.
- **Data home resolution ladder:** `${CLAUDE_PLUGIN_DATA}` → `~/.claude/plugins/data/vibe-runbook/` → **fail loud**. Never silently skip a write.
- **Six verdict states, exact strings:** `PASS`, `FAIL`, `BLOCKED`, `SPENDS`, `HUMAN`, `QUESTION`.
- **Five claim shapes, exact strings:** `pin`, `status-assertion`, `receipt`, `human`, `unknown`.
- **Two venues, exact strings:** `executable`, `static`.

---

## File Structure

New solo repo at `C:\Users\estev\Projects\Vibe-Runbook`, plugin subdir `plugins/vibe-runbook/`.

| File | Responsibility |
|---|---|
| `engine/extract.mjs` | Locate candidate claims in a markdown document; report extraction coverage honestly |
| `engine/classify.mjs` | Assign a shape to a claim's text via ordered, named rules |
| `engine/venue.mjs` | Decide whether a claim's reader can run a command |
| `engine/cost.mjs` | Parse a runbook's own cost annotations into `{raw, count}` |
| `engine/scan.mjs` | Orchestrate extract + classify + cost + venue; write `claims.json` |
| `engine/preflight.mjs` | Credential check that hard-stops |
| `engine/verify.mjs` | Check a pin, a status assertion, and a write guard; resolve a pin's command |
| `engine/verdict.mjs` | Assign one of six verdicts; the rule that a receipt is never failed |
| `engine/datahome.mjs` | Resolve a writable data home, or fail loud |
| `engine/remediate.mjs` | The venue rule and the two rewrite templates |
| `engine/backup.mjs` | Per-file backup and rollback for mutating paths |
| `engine/report.mjs` | Render the decision-point report |
| `engine/cli.mjs` | Command dispatch |
| `schemas/claims.schema.json` | Shape of `claims.json` |
| `tests/fixtures/star-smoke.md` | Ground truth: STAR's runbook, verbatim |
| `tests/fixtures/unmarked.md` | An unmarked runbook, for the honesty gate |

---

### Task 1: Repo skeleton and marked-claim extraction

Folds scaffolding into the first real deliverable, per task right-sizing. Produces a working extractor for runbooks that carry markers.

**Files:**
- Create: `plugins/vibe-runbook/package.json`
- Create: `plugins/vibe-runbook/jest.config.mjs`
- Create: `plugins/vibe-runbook/engine/extract.mjs`
- Create: `plugins/vibe-runbook/tests/fixtures/star-smoke.md`
- Test: `plugins/vibe-runbook/tests/extract.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `extractClaims(markdown, filePath) -> { claims: Claim[], coverage: Coverage }` where `Claim` is `{ id, source: {file, line}, text, marker }` and `Coverage` is `{ extracted, markedBlocks, totalBlocks }`

- [ ] **Step 1: Create the repo and plugin skeleton**

```bash
mkdir -p "C:/Users/estev/Projects/Vibe-Runbook/plugins/vibe-runbook/engine"
mkdir -p "C:/Users/estev/Projects/Vibe-Runbook/plugins/vibe-runbook/tests/fixtures"
mkdir -p "C:/Users/estev/Projects/Vibe-Runbook/plugins/vibe-runbook/schemas"
cd "C:/Users/estev/Projects/Vibe-Runbook" && git init -b main
```

- [ ] **Step 2: Write package.json and jest config**

`plugins/vibe-runbook/package.json`:

```json
{
  "name": "@626labs/vibe-runbook-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "vibe-runbook": "./engine/cli.mjs" },
  "scripts": {
    "test": "node --experimental-vm-modules --disable-warning=ExperimentalWarning node_modules/jest/bin/jest.js --passWithNoTests"
  },
  "dependencies": { "ajv": "^8.17.1" },
  "devDependencies": { "jest": "^29.7.0" }
}
```

`plugins/vibe-runbook/jest.config.mjs`:

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.mjs'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/fixtures/'],
};
```

- [ ] **Step 3: Copy STAR's runbook in as the ground-truth fixture**

```bash
cp "C:/Users/estev/Projects/STAR/docs/smoke-2026-08-12.md" \
   "C:/Users/estev/Projects/Vibe-Runbook/plugins/vibe-runbook/tests/fixtures/star-smoke.md"
```

Note in the fixture's git commit that it is copied verbatim and must not be edited — its value is that its answers are known.

- [ ] **Step 4: Write the failing test**

`tests/extract.test.mjs`:

```javascript
import { readFileSync } from 'node:fs';
import { extractClaims } from '../engine/extract.mjs';

const star = readFileSync(new URL('./fixtures/star-smoke.md', import.meta.url), 'utf8');

test('extracts the Right: and Wrong: marked claims from STAR', () => {
  const { claims } = extractClaims(star, 'tests/fixtures/star-smoke.md');
  const texts = claims.map((c) => c.text);
  expect(texts.some((t) => t.includes('Draft sweeps filed on this room'))).toBe(true);
  expect(texts.some((t) => t.includes('the source\u2019s title, its address'))
    || texts.some((t) => t.includes("the source's title, its address"))).toBe(true);
  expect(claims.length).toBeGreaterThanOrEqual(8);
});

test('every claim carries a file and a 1-indexed line', () => {
  const { claims } = extractClaims(star, 'tests/fixtures/star-smoke.md');
  for (const c of claims) {
    expect(c.source.file).toBe('tests/fixtures/star-smoke.md');
    expect(c.source.line).toBeGreaterThan(0);
  }
});

test('claim ids are unique and stable', () => {
  const a = extractClaims(star, 'f.md').claims.map((c) => c.id);
  const b = extractClaims(star, 'f.md').claims.map((c) => c.id);
  expect(a).toEqual(b);
  expect(new Set(a).size).toBe(a.length);
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd plugins/vibe-runbook && npm install && npm test -- extract`
Expected: FAIL, `Cannot find module '../engine/extract.mjs'`

- [ ] **Step 6: Write minimal implementation**

`engine/extract.mjs`:

```javascript
// Markers a runbook may use to flag a checkable claim. Este's habit is the
// seed set; the honesty gate in Task 2 is what keeps unmarked docs truthful.
const MARKERS = [
  { name: 'right', re: /^\s*\*\*Right(?:,[^*]*)?:\*\*\s*(.+)$/i },
  { name: 'wrong', re: /^\s*\*\*Wrong[^*]*:\*\*\s*(.+)$/i },
  { name: 'expect', re: /^\s*\*\*(?:Expected|Should)[^*]*:\*\*\s*(.+)$/i },
];

export function extractClaims(markdown, filePath) {
  const lines = markdown.split(/\r?\n/);
  const claims = [];
  let totalBlocks = 0;
  let markedBlocks = 0;
  let n = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (/^\s*(#{1,6})\s/.test(line)) continue;
    totalBlocks += 1;

    for (const marker of MARKERS) {
      const m = line.match(marker.re);
      if (!m) continue;
      markedBlocks += 1;
      n += 1;
      claims.push({
        id: `c-${String(n).padStart(3, '0')}`,
        source: { file: filePath, line: i + 1 },
        text: m[1].trim(),
        marker: marker.name,
      });
      break;
    }
  }

  return { claims, coverage: { extracted: claims.length, markedBlocks, totalBlocks } };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- extract`
Expected: PASS, 3 tests

- [ ] **Step 8: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(extract): locate marked claims in a runbook

STAR's smoke list is checked in verbatim as the ground-truth fixture and
must not be edited. Its value is that its answers are already known."
```

---

### Task 2: The honesty gate — unmarked prose must report low coverage, not invent claims

**This is the de-risk and the go/no-go for the rest of the plan.** The risk was never that the extractor cannot read unmarked prose. It is that it might pretend to.

**Files:**
- Create: `plugins/vibe-runbook/tests/fixtures/unmarked.md`
- Modify: `plugins/vibe-runbook/engine/extract.mjs`
- Test: `plugins/vibe-runbook/tests/extract-honesty.test.mjs`

**Interfaces:**
- Consumes: `extractClaims` from Task 1
- Produces: `extractClaims` now additionally returns `coverage.confidence` (`'high' | 'low'`) and `coverage.guidance` (string or null)

- [ ] **Step 1: Write the unmarked fixture**

`tests/fixtures/unmarked.md` — deliberately in a different house style, with zero markers:

```markdown
# Deploying the widget service

Run `./deploy.sh` from the repo root. It takes about four minutes.

Once it finishes, hit the health endpoint. You should see a 200 come back
with a JSON body naming the build sha.

We are currently on release 4.2.1. If the sha does not match, the deploy
did not take and you should roll back with `./rollback.sh`.

Check the dashboard afterwards. The error rate panel should be flat.
```

- [ ] **Step 2: Write the failing test**

`tests/extract-honesty.test.mjs`:

```javascript
import { readFileSync } from 'node:fs';
import { extractClaims } from '../engine/extract.mjs';

const unmarked = readFileSync(new URL('./fixtures/unmarked.md', import.meta.url), 'utf8');
const star = readFileSync(new URL('./fixtures/star-smoke.md', import.meta.url), 'utf8');

test('an unmarked runbook yields low confidence, not confident silence', () => {
  const { coverage } = extractClaims(unmarked, 'tests/fixtures/unmarked.md');
  expect(coverage.confidence).toBe('low');
});

test('an unmarked runbook never invents claims', () => {
  const { claims } = extractClaims(unmarked, 'tests/fixtures/unmarked.md');
  expect(claims.length).toBe(0);
});

test('low confidence carries actionable markup guidance naming the file', () => {
  const { coverage } = extractClaims(unmarked, 'tests/fixtures/unmarked.md');
  expect(coverage.guidance).toEqual(expect.stringContaining('**Right:**'));
  expect(coverage.guidance).toEqual(expect.stringContaining('tests/fixtures/unmarked.md'));
});

test('a marked runbook yields high confidence', () => {
  const { coverage } = extractClaims(star, 'tests/fixtures/star-smoke.md');
  expect(coverage.confidence).toBe('high');
  expect(coverage.guidance).toBeNull();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- extract-honesty`
Expected: FAIL, `expect(received).toBe('low')` — received `undefined`

- [ ] **Step 4: Write minimal implementation**

Append to `engine/extract.mjs`, and change the return in `extractClaims`:

```javascript
// A document with almost no marked blocks is one we cannot read, and saying
// so is the product. Silence here would read as "nothing to check".
const LOW_CONFIDENCE_RATIO = 0.02;

function markupGuidance(filePath, totalBlocks) {
  return [
    `Read ${totalBlocks} blocks in ${filePath} and found no marked claims.`,
    'Claims are located by marker. Mark what "right" looks like so it can be walked:',
    '',
    '    **Right:** the health endpoint answers 200 with the build sha',
    '',
    'Supported markers: **Right:**, **Wrong ...:**, **Expected:**, **Should:**',
  ].join('\n');
}
```

Then replace the final `return` of `extractClaims` with:

```javascript
  const ratio = totalBlocks === 0 ? 0 : markedBlocks / totalBlocks;
  const confidence = ratio < LOW_CONFIDENCE_RATIO ? 'low' : 'high';
  return {
    claims,
    coverage: {
      extracted: claims.length,
      markedBlocks,
      totalBlocks,
      confidence,
      guidance: confidence === 'low' ? markupGuidance(filePath, totalBlocks) : null,
    },
  };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- extract-honesty`
Expected: PASS, 4 tests

- [ ] **Step 6: Run the whole suite to check Task 1 still passes**

Run: `npm test`
Expected: PASS, 7 tests

- [ ] **Step 7: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(extract): report low coverage instead of inventing claims

The de-risk gate. An unmarked runbook returns zero claims, low
confidence, and guidance naming the file and the markers -- never a
confident report over a document the extractor could not read."
```

**GATE:** If this task cannot be made to pass, stop and re-open the design. Every later task assumes claims can be located.

---

### Task 3: The shape classifier

**Files:**
- Create: `plugins/vibe-runbook/engine/classify.mjs`
- Test: `plugins/vibe-runbook/tests/classify.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `classifyShape(text) -> { shape, confidence, rule }` where `shape` is one of `pin | status-assertion | receipt | human | unknown`

- [ ] **Step 1: Write the failing test**

Every expected value below is a real string from STAR's runbook with a known correct answer.

`tests/classify.test.mjs`:

```javascript
import { classifyShape } from '../engine/classify.mjs';

test('a labelled identifier is a pin', () => {
  expect(classifyShape('Revision `star-00049-j5r`').shape).toBe('pin');
  expect(classifyShape('HEAD `0855bd2`').shape).toBe('pin');
  expect(classifyShape('931 tests green').shape).toBe('pin');
});

test('a totality quantifier over a count is a receipt', () => {
  expect(classifyShape('The chain walk over all 17 stored rooms').shape).toBe('receipt');
  expect(classifyShape('re-read as CSV with all 45 rows and 10 columns intact').shape).toBe('receipt');
});

test('a present-tense claim about a response code is a status assertion', () => {
  expect(classifyShape('Every new route answers 401 unauthenticated').shape).toBe('status-assertion');
});

test('a sensory instruction is human', () => {
  expect(classifyShape('Read it on screen, then Ctrl+P and read the PDF').shape).toBe('human');
  expect(classifyShape('open in Excel and Sheets').shape).toBe('human');
});

// The hard case, and the one that matters most. Present tense, but it refers
// to a past artifact. Both "pin" and "receipt" are wrong answers. Escalating
// is the right answer.
test('an ambiguous claim escalates to unknown rather than guessing', () => {
  const r = classifyShape('Your Liverpool export says 58');
  expect(r.shape).toBe('unknown');
  expect(r.confidence).toBe(0);
});

test('every classification names the rule that fired', () => {
  expect(classifyShape('Revision `star-00049-j5r`').rule).toBe('pin:labelled-identifier');
  expect(classifyShape('Your Liverpool export says 58').rule).toBe('none');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- classify`
Expected: FAIL, `Cannot find module '../engine/classify.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/classify.mjs`:

```javascript
// Ordered. First match wins. Every rule is named so a misfire is a rule to
// fix rather than a black box to distrust.
export const RULES = [
  {
    name: 'human:sensory',
    shape: 'human',
    confidence: 0.95,
    test: (t) =>
      /\bCtrl\+P\b|\bprint(?:ed|able)?\b|\bopen (?:it )?in (?:Excel|Sheets)\b|\bon screen\b/i.test(t),
  },
  {
    // A count preceded by a totality quantifier is a coverage record: it says
    // what was tested, not what must be true. Never failed.
    name: 'receipt:totality-count',
    shape: 'receipt',
    confidence: 0.9,
    test: (t) => /\b(?:over all|all|every)\s+\d+\b/i.test(t),
  },
  {
    name: 'pin:labelled-identifier',
    shape: 'pin',
    confidence: 0.9,
    test: (t) =>
      /^\s*(?:revision|head|commit|version|tag)\b\s*[:`]?/i.test(t) ||
      /\b\d+\s+tests?\s+(?:green|passing)\b/i.test(t),
  },
  {
    name: 'status:response-code',
    shape: 'status-assertion',
    confidence: 0.85,
    test: (t) =>
      /\b(?:answers?|returns?|responds? with|comes? back)\b/i.test(t) && /\b[1-5]\d{2}\b/.test(t),
  },
];

export function classifyShape(text) {
  for (const rule of RULES) {
    if (rule.test(text)) {
      return { shape: rule.shape, confidence: rule.confidence, rule: rule.name };
    }
  }
  return { shape: 'unknown', confidence: 0, rule: 'none' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- classify`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(classify): shape a claim as pin, status, receipt, human or unknown

Ordered named rules, first match wins. The Liverpool-58 case is present
tense about a past artifact, so both pin and receipt are wrong and
unknown is right -- it is a test, not an oversight."
```

---

### Task 4: Cost parsing and venue

**Files:**
- Create: `plugins/vibe-runbook/engine/cost.mjs`
- Create: `plugins/vibe-runbook/engine/venue.mjs`
- Test: `plugins/vibe-runbook/tests/cost.test.mjs`
- Test: `plugins/vibe-runbook/tests/venue.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `parseCost(sectionText) -> { raw, count }`; `determineVenue(filePath) -> 'executable' | 'static'`

- [ ] **Step 1: Write the failing cost test**

`tests/cost.test.mjs`:

```javascript
import { parseCost } from '../engine/cost.mjs';

test('lifts the runbook wording verbatim', () => {
  expect(parseCost('## 1. The sweep survives a reload · 2 min · no spend').raw).toBe('no spend');
  expect(parseCost('## 7. Nothing regressed · 2 min · spends one check').raw).toBe('spends one check');
});

test('parses a count only when unambiguous', () => {
  expect(parseCost('· no spend').count).toBe(0);
  expect(parseCost('· spends one check').count).toBe(1);
  expect(parseCost('· spends 3 checks').count).toBe(3);
  expect(parseCost('· one step spends').count).toBeNull();
});

test('a section with no cost annotation is null, not zero', () => {
  expect(parseCost('## 6. Continuation stacking')).toEqual({ raw: null, count: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cost`
Expected: FAIL, `Cannot find module '../engine/cost.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/cost.mjs`:

```javascript
const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const COST_RE = /(no spend|spends?\s+[\w\d]+(?:\s+\w+)?|[\w\s]*\bspends?\b[\w\s]*)/i;

export function parseCost(sectionText) {
  const segments = String(sectionText).split('·').map((s) => s.trim());
  const raw = segments.find((s) => /\bspend/i.test(s)) ?? null;
  if (raw === null) return { raw: null, count: null };

  if (/^no spend$/i.test(raw)) return { raw, count: 0 };

  const m = raw.match(/spends?\s+(\d+|one|two|three|four|five)\b/i);
  if (!m) return { raw, count: null };
  const token = m[1].toLowerCase();
  const count = WORD_NUMBERS[token] ?? Number.parseInt(token, 10);
  return { raw, count: Number.isNaN(count) ? null : count };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cost`
Expected: PASS, 3 tests

- [ ] **Step 5: Write the failing venue test**

`tests/venue.test.mjs`:

```javascript
import { determineVenue } from '../engine/venue.mjs';

test('a repo doc is executable venue', () => {
  expect(determineVenue('docs/smoke-2026-08-12.md')).toBe('executable');
  expect(determineVenue('RUNBOOK.md')).toBe('executable');
});

test('served descriptions and instructions are static venue', () => {
  expect(determineVenue('star/mcp/tools.py')).toBe('static');
  expect(determineVenue('engine/instructions.json')).toBe('static');
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- venue`
Expected: FAIL, `Cannot find module '../engine/venue.mjs'`

- [ ] **Step 7: Write minimal implementation**

`engine/venue.mjs`:

```javascript
// Venue is where the claim's READER stands, not what the claim says. A
// runbook reader has a shell; a client reading a served tool description
// does not, so "run this command" is meaningless to them.
export function determineVenue(filePath) {
  return /\.(md|markdown|rst|txt)$/i.test(filePath) ? 'executable' : 'static';
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- venue`
Expected: PASS, 2 tests

- [ ] **Step 9: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(cost,venue): parse runbook cost wording and locate the reader

Cost keeps the runbook's own words in raw and parses count only when
unambiguous -- units are never normalized across runbooks. Venue asks
where the claim's reader stands, which is the input to the remediation
rule."
```

---

### Task 5: `:scan` — assemble and persist claims.json

**Files:**
- Create: `plugins/vibe-runbook/schemas/claims.schema.json`
- Create: `plugins/vibe-runbook/engine/scan.mjs`
- Test: `plugins/vibe-runbook/tests/scan.test.mjs`

**Interfaces:**
- Consumes: `extractClaims`, `classifyShape`, `parseCost`, `determineVenue`
- Produces: `scanRunbook(markdown, filePath) -> { schemaVersion, runbook, coverage, claims }` where each claim is `{ id, source, text, marker, shape, confidence, classifierRule, venue, cost, verdict, evidence, checkedAt }`

- [ ] **Step 1: Write the failing test**

`tests/scan.test.mjs`:

```javascript
import { readFileSync } from 'node:fs';
import { scanRunbook } from '../engine/scan.mjs';

const star = readFileSync(new URL('./fixtures/star-smoke.md', import.meta.url), 'utf8');

test('every claim carries all required fields', () => {
  const out = scanRunbook(star, 'tests/fixtures/star-smoke.md');
  for (const c of out.claims) {
    expect(typeof c.id).toBe('string');
    expect(typeof c.text).toBe('string');
    expect(['pin', 'status-assertion', 'receipt', 'human', 'unknown']).toContain(c.shape);
    expect(['executable', 'static']).toContain(c.venue);
    expect(c.cost).toHaveProperty('raw');
    expect(c.cost).toHaveProperty('count');
    expect(c.verdict).toBeNull();
  }
});

test('scan is read-only and deterministic', () => {
  const a = scanRunbook(star, 'f.md');
  const b = scanRunbook(star, 'f.md');
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

test('carries the extraction coverage through', () => {
  const out = scanRunbook(star, 'f.md');
  expect(out.coverage.confidence).toBe('high');
  expect(out.coverage.totalBlocks).toBeGreaterThan(out.coverage.markedBlocks);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scan`
Expected: FAIL, `Cannot find module '../engine/scan.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/scan.mjs`:

```javascript
import { extractClaims } from './extract.mjs';
import { classifyShape } from './classify.mjs';
import { parseCost } from './cost.mjs';
import { determineVenue } from './venue.mjs';

export const SCHEMA_VERSION = '1.0.0';

// The nearest preceding heading owns a claim's cost annotation, because that
// is where a runbook writes it.
function headingAbove(lines, lineNumber) {
  for (let i = lineNumber - 1; i >= 0; i -= 1) {
    if (/^\s*#{1,6}\s/.test(lines[i])) return lines[i];
  }
  return '';
}

export function scanRunbook(markdown, filePath) {
  const lines = markdown.split(/\r?\n/);
  const { claims, coverage } = extractClaims(markdown, filePath);
  const venue = determineVenue(filePath);

  const enriched = claims.map((c) => {
    const shape = classifyShape(c.text);
    return {
      ...c,
      shape: shape.shape,
      confidence: shape.confidence,
      classifierRule: shape.rule,
      venue,
      cost: parseCost(headingAbove(lines, c.source.line)),
      verdict: null,
      evidence: null,
      checkedAt: null,
    };
  });

  return { schemaVersion: SCHEMA_VERSION, runbook: filePath, coverage, claims: enriched };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scan`
Expected: PASS, 3 tests

- [ ] **Step 5: Write the JSON schema**

`schemas/claims.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "vibe-runbook claims",
  "type": "object",
  "required": ["schemaVersion", "runbook", "coverage", "claims"],
  "properties": {
    "schemaVersion": { "type": "string" },
    "runbook": { "type": "string" },
    "coverage": {
      "type": "object",
      "required": ["extracted", "markedBlocks", "totalBlocks", "confidence"],
      "properties": {
        "extracted": { "type": "integer" },
        "markedBlocks": { "type": "integer" },
        "totalBlocks": { "type": "integer" },
        "confidence": { "enum": ["high", "low"] },
        "guidance": { "type": ["string", "null"] }
      }
    },
    "claims": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "source", "text", "shape", "venue", "cost", "verdict"],
        "properties": {
          "id": { "type": "string" },
          "source": {
            "type": "object",
            "required": ["file", "line"],
            "properties": { "file": { "type": "string" }, "line": { "type": "integer" } }
          },
          "text": { "type": "string" },
          "marker": { "type": "string" },
          "shape": { "enum": ["pin", "status-assertion", "receipt", "human", "unknown"] },
          "confidence": { "type": "number" },
          "classifierRule": { "type": "string" },
          "venue": { "enum": ["executable", "static"] },
          "cost": {
            "type": "object",
            "properties": { "raw": { "type": ["string", "null"] }, "count": { "type": ["integer", "null"] } }
          },
          "verdict": { "enum": ["PASS", "FAIL", "BLOCKED", "SPENDS", "HUMAN", "QUESTION", null] },
          "evidence": { "type": ["string", "null"] },
          "checkedAt": { "type": ["string", "null"] }
        }
      }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(scan): assemble classified claims and pin the schema

Read-only and deterministic. Cost comes from the nearest preceding
heading, which is where a runbook writes it."
```

---

### Task 6: Verdict assignment, and the rule that protects the product

**Files:**
- Create: `plugins/vibe-runbook/engine/verdict.mjs`
- Test: `plugins/vibe-runbook/tests/verdict.test.mjs`

**Interfaces:**
- Consumes: claim objects from Task 5
- Produces: `assignVerdict(claim, checkResult) -> Claim` and `summarize(claims) -> { counts, coverage, wouldCost }`

- [ ] **Step 1: Write the failing test**

`tests/verdict.test.mjs`:

```javascript
import { assignVerdict, summarize } from '../engine/verdict.mjs';

const base = { id: 'c-001', shape: 'pin', cost: { raw: 'no spend', count: 0 } };

test('a receipt is NEVER failed, whatever the check said', () => {
  const c = assignVerdict({ ...base, shape: 'receipt' }, { ok: false, evidence: 'now 12, was 17' });
  expect(c.verdict).not.toBe('FAIL');
  expect(c.verdict).toBe('QUESTION');
});

test('a human claim is named, never scored as a pass', () => {
  const c = assignVerdict({ ...base, shape: 'human' }, { ok: true });
  expect(c.verdict).toBe('HUMAN');
});

test('an unknown claim becomes QUESTION, never a guess', () => {
  const c = assignVerdict({ ...base, shape: 'unknown' }, { ok: true });
  expect(c.verdict).toBe('QUESTION');
});

test('a claim that would cost money is SPENDS and is never checked', () => {
  const c = assignVerdict({ ...base, cost: { raw: 'spends one check', count: 1 } }, null);
  expect(c.verdict).toBe('SPENDS');
});

test('a pin with a passing check is PASS and carries evidence', () => {
  const c = assignVerdict(base, { ok: true, evidence: 'star-00052-7jb' });
  expect(c.verdict).toBe('PASS');
  expect(c.evidence).toBe('star-00052-7jb');
});

test('a pin with a failing check is FAIL', () => {
  expect(assignVerdict(base, { ok: false, evidence: 'x' }).verdict).toBe('FAIL');
});

test('an unreachable check is BLOCKED, not FAIL', () => {
  expect(assignVerdict(base, { blocked: 'credential missing' }).verdict).toBe('BLOCKED');
});

test('summarize totals what a full walk would have cost, grouped by raw unit', () => {
  const s = summarize([
    { shape: 'pin', verdict: 'PASS', cost: { raw: 'no spend', count: 0 } },
    { shape: 'pin', verdict: 'SPENDS', cost: { raw: 'spends one check', count: 1 } },
    { shape: 'pin', verdict: 'SPENDS', cost: { raw: 'spends one check', count: 1 } },
  ]);
  expect(s.counts.SPENDS).toBe(2);
  expect(s.wouldCost).toEqual({ 'spends one check': 2 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- verdict`
Expected: FAIL, `Cannot find module '../engine/verdict.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/verdict.mjs`:

```javascript
// Shapes that are never verified, and what they report instead. A receipt is
// past-tense evidence of what was tested; it drifts because the world moved,
// not because the doc lied. Failing it is the noise that gets the tool muted.
const NEVER_WALKED = { receipt: 'QUESTION', human: 'HUMAN', unknown: 'QUESTION' };

export function assignVerdict(claim, checkResult) {
  const fixed = NEVER_WALKED[claim.shape];
  if (fixed) return { ...claim, verdict: fixed, checkedAt: null };

  if ((claim.cost?.count ?? 0) > 0) {
    return { ...claim, verdict: 'SPENDS', evidence: null, checkedAt: null };
  }
  if (!checkResult) return { ...claim, verdict: 'BLOCKED', evidence: 'not checked' };
  if (checkResult.blocked) return { ...claim, verdict: 'BLOCKED', evidence: checkResult.blocked };

  return {
    ...claim,
    verdict: checkResult.ok ? 'PASS' : 'FAIL',
    evidence: checkResult.evidence ?? null,
    checkedAt: new Date().toISOString(),
  };
}

export function summarize(claims) {
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, SPENDS: 0, HUMAN: 0, QUESTION: 0 };
  const wouldCost = {};
  for (const c of claims) {
    if (c.verdict in counts) counts[c.verdict] += 1;
    const raw = c.cost?.raw;
    if (raw && (c.cost?.count ?? 0) > 0) wouldCost[raw] = (wouldCost[raw] ?? 0) + 1;
  }
  return { counts, coverage: { checked: counts.PASS + counts.FAIL, total: claims.length }, wouldCost };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- verdict`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(verdict): six states, and a receipt that can never be failed

STAR's runbook carried three innocently drifted numbers against one
genuinely stale pin. A tool that flags all four is noise; this is the
rule that stops it."
```

---

### Task 7: Credential preflight that hard-stops

**Files:**
- Create: `plugins/vibe-runbook/engine/preflight.mjs`
- Test: `plugins/vibe-runbook/tests/preflight.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `preflight({ env, credentialCheck }) -> { ok: true, env } | { ok: false, blocked: string, ask: string }`

- [ ] **Step 1: Write the failing test**

`tests/preflight.test.mjs`:

```javascript
import { preflight } from '../engine/preflight.mjs';

test('a present credential passes and names the environment', () => {
  const r = preflight({ env: 'live', credentialCheck: () => ({ present: true }) });
  expect(r.ok).toBe(true);
  expect(r.env).toBe('live');
});

test('a missing credential hard-stops with an exact ask', () => {
  const r = preflight({ env: 'live', credentialCheck: () => ({ present: false, ask: 'run /mcp and authorize STAR' }) });
  expect(r.ok).toBe(false);
  expect(r.blocked).toMatch(/credential/i);
  expect(r.ask).toBe('run /mcp and authorize STAR');
});

test('it never substitutes a different environment', () => {
  const r = preflight({ env: 'live', credentialCheck: () => ({ present: false, ask: 'x' }) });
  expect(r.env).toBeUndefined();
  expect(JSON.stringify(r)).not.toMatch(/local/i);
});

test('an unnamed environment is refused rather than defaulted', () => {
  expect(() => preflight({ credentialCheck: () => ({ present: true }) })).toThrow(/environment must be named/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- preflight`
Expected: FAIL, `Cannot find module '../engine/preflight.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/preflight.mjs`:

```javascript
// A green run against the wrong target is worse than no run, because it reads
// as evidence. There is no fallback path here on purpose.
export function preflight({ env, credentialCheck }) {
  if (!env) throw new Error('environment must be named; there is no default');
  const result = credentialCheck();
  if (result.present) return { ok: true, env };
  return {
    ok: false,
    blocked: `credential unavailable for environment "${env}"`,
    ask: result.ask,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- preflight`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(preflight): hard-stop on a missing credential, never fall back

No default environment and no substitution path. Both cowpath walks put
this first because coverage is decided here."
```

---

### Task 8: Verifiers — how a claim is actually checked

Without this the plugin has verdicts and no way to earn them. Probe functions are injected so tests never touch the network.

**Files:**
- Create: `plugins/vibe-runbook/engine/verify.mjs`
- Test: `plugins/vibe-runbook/tests/verify.test.mjs`

**Interfaces:**
- Consumes: claim objects from Task 5
- Produces: `pinValue(text) -> string | null`; `expectedCode(text) -> number | null`; `verifyPin(claim, { runCommand }) -> CheckResult`; `verifyStatus(claim, { httpProbe }) -> CheckResult`; `probeWriteGuard(route, { post }) -> CheckResult`; `enumerated(list) -> { items, total }`. `CheckResult` is `{ ok, evidence } | { blocked }`, the exact shape `assignVerdict` from Task 6 consumes.

- [ ] **Step 1: Write the failing test**

`tests/verify.test.mjs`:

```javascript
import { pinValue, expectedCode, verifyPin, verifyStatus, probeWriteGuard } from '../engine/verify.mjs';

test('pulls the value out of a pin', () => {
  expect(pinValue('Revision `star-00049-j5r`')).toBe('star-00049-j5r');
  expect(pinValue('HEAD `0855bd2`')).toBe('0855bd2');
  expect(pinValue('931 tests green')).toBe('931');
});

test('pulls the expected status code out of an assertion', () => {
  expect(expectedCode('Every new route answers 401 unauthenticated')).toBe(401);
  expect(expectedCode('the health endpoint returns 200')).toBe(200);
  expect(expectedCode('nothing here has a code')).toBeNull();
});

test('a pin whose command output differs is a FAIL carrying both values', () => {
  const claim = { text: 'Revision `star-00049-j5r`', command: 'gcloud ...' };
  const r = verifyPin(claim, { runCommand: () => 'star-00052-7jb' });
  expect(r.ok).toBe(false);
  expect(r.evidence).toContain('star-00049-j5r');
  expect(r.evidence).toContain('star-00052-7jb');
});

test('a pin whose command output matches is a PASS', () => {
  const claim = { text: 'HEAD `216b917`', command: 'git rev-parse --short HEAD' };
  expect(verifyPin(claim, { runCommand: () => '216b917' }).ok).toBe(true);
});

test('a pin with no command to run is BLOCKED, never FAIL', () => {
  const r = verifyPin({ text: 'Revision `x`' }, { runCommand: () => 'y' });
  expect(r.blocked).toMatch(/no command/i);
  expect(r.ok).toBeUndefined();
});

test('a command comes from config when the pin is a bare value', () => {
  const claim = { text: 'HEAD `216b917`' };
  const config = { pins: { head: 'git rev-parse --short HEAD' } };
  expect(verifyPin(claim, { runCommand: () => '216b917', config }).ok).toBe(true);
});

// A value-to-command rewrite leaves the invocation in backticks, so the fix
// for staleness is also what makes the claim checkable without config.
test('a remediated pin is self-verifying', () => {
  const claim = { text: 'revision: `gcloud run services describe star --format=value(x)`' };
  const r = verifyPin(claim, { runCommand: () => 'gcloud run services describe star --format=value(x)' });
  expect(r.ok).toBe(true);
});

test('a status assertion compares the observed code', () => {
  const claim = { text: 'answers 401 unauthenticated', url: '/api/rooms' };
  expect(verifyStatus(claim, { httpProbe: () => 401 }).ok).toBe(true);
  const bad = verifyStatus(claim, { httpProbe: () => 422 });
  expect(bad.ok).toBe(false);
  expect(bad.evidence).toContain('422');
});

test('an unreachable probe is BLOCKED, not FAIL', () => {
  const claim = { text: 'answers 401', url: '/x' };
  const r = verifyStatus(claim, { httpProbe: () => { throw new Error('ECONNREFUSED'); } });
  expect(r.blocked).toMatch(/ECONNREFUSED/);
});

// The technique from the STAR walk. 401 means auth ran first and the claim
// holds. A validation code means auth did NOT run first, which is itself the
// finding -- and nothing was written or spent either way.
test('the write-guard probe reads 401 as the guard holding', () => {
  const r = probeWriteGuard({ path: '/api/rooms', expected: 401 }, { post: () => 401 });
  expect(r.ok).toBe(true);
});

test('the write-guard probe reads a validation code as the finding', () => {
  const r = probeWriteGuard({ path: '/api/rooms', expected: 401 }, { post: () => 422 });
  expect(r.ok).toBe(false);
  expect(r.evidence).toMatch(/422/);
  expect(r.evidence).toMatch(/before auth/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- verify`
Expected: FAIL, `Cannot find module '../engine/verify.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/verify.mjs`:

```javascript
// Codes a framework returns when it validated the body before checking auth.
const VALIDATION_CODES = new Set([400, 422]);

export function pinValue(text) {
  const backticked = text.match(/`([^`]+)`/);
  if (backticked) return backticked[1];
  const number = text.match(/\b(\d+)\b/);
  return number ? number[1] : null;
}

export function expectedCode(text) {
  const m = text.match(/\b([1-5]\d{2})\b/);
  return m ? Number.parseInt(m[1], 10) : null;
}

// Where a pin's command comes from, in order:
//   1. The pin itself, if it has already been remediated. A value-to-command
//      rewrite leaves the invocation in backticks, which makes a remediated
//      runbook self-verifying -- the fix for staleness is also what makes the
//      claim checkable next time.
//   2. .vibe-runbook/config.json, keyed by the pin's label.
//   3. Nothing, which is BLOCKED and points at the remediation.
export function resolveCommand(claim, config = {}) {
  if (claim.command) return claim.command;
  const inline = claim.text.match(/`([^`]*\s[^`]*)`/);
  if (inline) return inline[1];
  const label = claim.text.split(/[:`]/)[0].trim().toLowerCase();
  return config.pins?.[label] ?? null;
}

export function verifyPin(claim, { runCommand, config }) {
  const command = resolveCommand(claim, config);
  if (!command) {
    return { blocked: 'no command for this pin; remediate it or add one to config.pins' };
  }
  const expected = pinValue(claim.text);
  if (expected === null) return { blocked: 'could not read a value out of this pin' };
  let observed;
  try {
    observed = String(runCommand(command)).trim();
  } catch (e) {
    return { blocked: `command failed: ${e.message}` };
  }
  return observed === expected
    ? { ok: true, evidence: `${expected} (confirmed)` }
    : { ok: false, evidence: `runbook says ${expected}, system says ${observed}` };
}

export function verifyStatus(claim, { httpProbe }) {
  const expected = expectedCode(claim.text);
  if (expected === null) return { blocked: 'no status code named in this claim' };
  let observed;
  try {
    observed = httpProbe(claim.url);
  } catch (e) {
    return { blocked: `probe failed: ${e.message}` };
  }
  return observed === expected
    ? { ok: true, evidence: `${claim.url} -> ${observed}` }
    : { ok: false, evidence: `${claim.url} -> ${observed}, runbook says ${expected}` };
}

// Send a request that will fail validation, against a resource that does not
// exist. The guard can only be observed by attempting the thing it prevents,
// and this is the only way found to do that without risking the write.
export function probeWriteGuard(route, { post }) {
  let observed;
  try {
    observed = post(route.path, {});
  } catch (e) {
    return { blocked: `probe failed: ${e.message}` };
  }
  if (observed === route.expected) return { ok: true, evidence: `${route.path} -> ${observed}` };
  if (VALIDATION_CODES.has(observed)) {
    return {
      ok: false,
      evidence: `${route.path} -> ${observed}: the body was validated before auth ran, so an anonymous caller learns the request schema. Nothing was written.`,
    };
  }
  return { ok: false, evidence: `${route.path} -> ${observed}, runbook says ${route.expected}` };
}

// Enumeration is mechanical. The total travels with the items so a report can
// never quietly describe a sample as if it were the whole surface.
export function enumerated(list) {
  return { items: [...list], total: list.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- verify`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(verify): check a pin, a status assertion, and a write guard

The write-guard probe is the technique from the STAR walk: an invalid
body against a nonexistent resource. 401 verifies the claim, a
validation code is itself the finding, neither writes nor spends.

Every failure path that is not a verified falsehood returns blocked
rather than ok:false, because BLOCKED is not evidence the doc is wrong."
```

---

### Task 9: Remediation — the venue rule and two templates

**Files:**
- Create: `plugins/vibe-runbook/engine/remediate.mjs`
- Create: `plugins/vibe-runbook/engine/backup.mjs`
- Test: `plugins/vibe-runbook/tests/remediate.test.mjs`

**Interfaces:**
- Consumes: claim objects from Task 5
- Produces: `pickTemplate(claim) -> 'value-to-command' | 'name-not-count' | null`; `proposeRewrite(claim, context) -> { template, before, after, confidence }`; `backupFile(path) -> backupPath`; `rollback(backupPath) -> void`

- [ ] **Step 1: Write the failing test**

Both expected answers below are known from STAR's actual remediation, which is in that repo's git history.

`tests/remediate.test.mjs`:

```javascript
import { pickTemplate, proposeRewrite } from '../engine/remediate.mjs';

const revisionPin = {
  id: 'c-001', shape: 'pin', venue: 'executable',
  text: 'Revision `star-00049-j5r`',
};
const toolCountPin = {
  id: 'c-002', shape: 'pin', venue: 'static',
  text: 'There are six tools',
};

test('an executable-venue pin gets value-to-command', () => {
  expect(pickTemplate(revisionPin)).toBe('value-to-command');
});

test('a static-venue pin gets name-not-count', () => {
  expect(pickTemplate(toolCountPin)).toBe('name-not-count');
});

test('nothing but a pin is remediated', () => {
  expect(pickTemplate({ shape: 'receipt', venue: 'executable' })).toBeNull();
  expect(pickTemplate({ shape: 'human', venue: 'executable' })).toBeNull();
  expect(pickTemplate({ shape: 'status-assertion', venue: 'executable' })).toBeNull();
});

test('value-to-command replaces the value with the invocation', () => {
  const r = proposeRewrite(revisionPin, { command: 'gcloud run services describe star --format=...' });
  expect(r.template).toBe('value-to-command');
  expect(r.after).toContain('gcloud run services describe star');
  expect(r.after).not.toContain('star-00049-j5r');
});

test('name-not-count removes the count rather than correcting it', () => {
  const r = proposeRewrite(toolCountPin, { members: ['list_rooms', 'get_room', 'ask_room'] });
  expect(r.template).toBe('name-not-count');
  expect(r.after).toContain('list_rooms');
  expect(r.after).not.toMatch(/\bsix\b|\bthree\b|\b3\b/);
});

test('a rewrite without its context is refused, not guessed', () => {
  expect(() => proposeRewrite(revisionPin, {})).toThrow(/command/i);
  expect(() => proposeRewrite(toolCountPin, {})).toThrow(/members/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- remediate`
Expected: FAIL, `Cannot find module '../engine/remediate.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/remediate.mjs`:

```javascript
// Both templates fix the same shape, a stale pin. The discriminator is where
// the claim's reader stands. Offering the wrong one produces nonsense --
// value-to-command on "There are six tools" yields "run tools/list and count
// them" -- so shipping only one would be a correctness defect, not less scope.
export function pickTemplate(claim) {
  if (claim.shape !== 'pin') return null;
  return claim.venue === 'executable' ? 'value-to-command' : 'name-not-count';
}

export function proposeRewrite(claim, context = {}) {
  const template = pickTemplate(claim);
  if (!template) return null;

  if (template === 'value-to-command') {
    if (!context.command) throw new Error('value-to-command needs a command; it is never invented');
    const label = claim.text.split(/[:`]/)[0].trim();
    return {
      template,
      before: claim.text,
      after: `${label}: \`${context.command}\``,
      confidence: 0.95,
    };
  }

  if (!Array.isArray(context.members) || context.members.length === 0) {
    throw new Error('name-not-count needs the members it should name; it is never invented');
  }
  return {
    template,
    before: claim.text,
    after: context.members.map((m) => `\`${m}\``).join(', '),
    confidence: 0.9,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- remediate`
Expected: PASS, 6 tests

- [ ] **Step 5: Write the backup test**

`tests/backup.test.mjs`:

```javascript
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupFile, rollback } from '../engine/backup.mjs';

test('a backup restores the exact original bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vrb-'));
  const f = join(dir, 'runbook.md');
  writeFileSync(f, 'original\n', 'utf8');
  const b = backupFile(f);
  expect(existsSync(b)).toBe(true);
  writeFileSync(f, 'mutated\n', 'utf8');
  rollback(b);
  expect(readFileSync(f, 'utf8')).toBe('original\n');
});
```

- [ ] **Step 6: Run test to verify it fails, then implement**

Run: `npm test -- backup`
Expected: FAIL, `Cannot find module '../engine/backup.mjs'`

`engine/backup.mjs`:

```javascript
import { copyFileSync } from 'node:fs';

export function backupFile(path) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${path}.vibe-runbook-${stamp}.bak`;
  copyFileSync(path, backupPath);
  return backupPath;
}

export function rollback(backupPath) {
  const original = backupPath.replace(/\.vibe-runbook-.*\.bak$/, '');
  copyFileSync(backupPath, original);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- backup remediate`
Expected: PASS, 7 tests

- [ ] **Step 8: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(remediate): venue rule plus the two rewrite templates

Both answers are known from STAR's own remediation: the revision pin
took value-to-command, the tool count took name-not-count. Neither
template invents its context -- a rewrite without a command or without
members is refused."
```

---

### Task 10: The decision-point report

**Files:**
- Create: `plugins/vibe-runbook/engine/report.mjs`
- Test: `plugins/vibe-runbook/tests/report.test.mjs`

**Interfaces:**
- Consumes: `summarize` from Task 6, `pickTemplate` from Task 8
- Produces: `renderReport({ runbook, env, claims, coverage }) -> string`

- [ ] **Step 1: Write the failing test**

`tests/report.test.mjs`:

```javascript
import { renderReport } from '../engine/report.mjs';

const claims = [
  { id: 'c-001', shape: 'pin', venue: 'executable', text: 'Revision `x`', verdict: 'FAIL', evidence: 'now y', cost: { raw: 'no spend', count: 0 } },
  { id: 'c-002', shape: 'receipt', text: 'all 17 rooms', verdict: 'QUESTION', cost: { raw: null, count: null } },
  { id: 'c-003', shape: 'pin', venue: 'executable', text: 'sweep works', verdict: 'SPENDS', cost: { raw: 'spends one check', count: 1 } },
];

test('states coverage as a fraction of what was enumerated', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: { totalBlocks: 40, markedBlocks: 3, confidence: 'high' } });
  expect(out).toMatch(/checked 1 of 3/);
});

test('names what a full walk would have cost, in the runbook wording', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {} });
  expect(out).toContain('spends one check');
});

test('offers both exits, so the report is a decision and not a dead end', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {} });
  expect(out).toMatch(/authorize/i);
  expect(out).toMatch(/rewrite/i);
});

test('names the remediation available for a stale pin without firing it', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims, coverage: {} });
  expect(out).toContain('value-to-command');
  expect(out).toMatch(/:remediate/);
});

test('a low-confidence extraction says so at the top', () => {
  const out = renderReport({ runbook: 'r.md', env: 'live', claims: [], coverage: { confidence: 'low', totalBlocks: 40, markedBlocks: 0, guidance: 'mark them' } });
  expect(out).toMatch(/could not read/i);
  expect(out).toContain('mark them');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- report`
Expected: FAIL, `Cannot find module '../engine/report.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/report.mjs`:

```javascript
import { summarize } from './verdict.mjs';
import { pickTemplate } from './remediate.mjs';

export function renderReport({ runbook, env, claims, coverage }) {
  const s = summarize(claims);
  const out = [];

  out.push(`# Runbook walk: ${runbook}`, '', `Environment: ${env}`, '');

  if (coverage?.confidence === 'low') {
    out.push(
      `**Could not read this runbook.** ${coverage.markedBlocks} marked blocks in ${coverage.totalBlocks}.`,
      '',
      coverage.guidance ?? '',
      ''
    );
  }

  out.push(`**checked ${s.coverage.checked} of ${s.coverage.total} enumerated**`, '');
  for (const [state, n] of Object.entries(s.counts)) {
    if (n > 0) out.push(`- ${state}: ${n}`);
  }
  out.push('');

  const costLines = Object.entries(s.wouldCost);
  if (costLines.length > 0) {
    out.push('## What a full walk would cost', '');
    for (const [raw, n] of costLines) out.push(`- ${raw} \u00d7 ${n}`);
    out.push('', 'Nothing above was spent.', '');
    out.push('You can **authorize** these and run them yourself, or **rewrite** the claims so they do not need spending.', '');
  }

  const fixable = claims.filter((c) => c.verdict === 'FAIL' && pickTemplate(c));
  if (fixable.length > 0) {
    out.push('## Available remediation', '');
    for (const c of fixable) out.push(`- \`${c.id}\` ${c.text} \u2192 **${pickTemplate(c)}**`);
    out.push('', 'Run `/vibe-runbook:remediate` to see the diffs. Nothing is written without it.', '');
  }

  return out.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- report`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(report): a decision point, not a verdict table

Coverage as a fraction, what a full walk would have cost in the
runbook's own wording, and both exits named. Remediation is always
surfaced and never fired."
```

---

### Task 11: CLI, skills, commands, and the plugin manifest

**Files:**
- Create: `plugins/vibe-runbook/engine/cli.mjs`
- Create: `plugins/vibe-runbook/.claude-plugin/plugin.json`
- Create: `plugins/vibe-runbook/commands/{scan,walk,remediate,vitals,vibe-runbook}.md`
- Create: `plugins/vibe-runbook/skills/{scan,walk,remediate,vitals,router,guide}/SKILL.md`
- Test: `plugins/vibe-runbook/tests/cli.test.mjs`

**Interfaces:**
- Consumes: everything above
- Produces: `node engine/cli.mjs scan --runbook <path>` writing `.vibe-runbook/state/claims.json`

- [ ] **Step 1: Write the failing CLI test**

`tests/cli.test.mjs`:

```javascript
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../engine/cli.mjs', import.meta.url));
const fixture = fileURLToPath(new URL('./fixtures/star-smoke.md', import.meta.url));

test('scan writes claims.json into .vibe-runbook/state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vrb-cli-'));
  const rb = join(dir, 'runbook.md');
  copyFileSync(fixture, rb);
  execFileSync('node', [cli, 'scan', '--runbook', rb], { cwd: dir });
  const out = JSON.parse(readFileSync(join(dir, '.vibe-runbook', 'state', 'claims.json'), 'utf8'));
  expect(out.schemaVersion).toBe('1.0.0');
  expect(out.claims.length).toBeGreaterThan(0);
});

test('walk refuses to run without a named environment', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vrb-cli2-'));
  expect(() => execFileSync('node', [cli, 'walk'], { cwd: dir, stdio: 'pipe' })).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cli`
Expected: FAIL, `Cannot find module '../engine/cli.mjs'`

- [ ] **Step 3: Write minimal implementation**

`engine/cli.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { scanRunbook } from './scan.mjs';
import { preflight } from './preflight.mjs';
import { verifyPin, verifyStatus } from './verify.mjs';
import { assignVerdict } from './verdict.mjs';
import { renderReport } from './report.mjs';

const shell = (cmd) => execSync(cmd, { encoding: 'utf8' });

// Never prints the credential, only whether one is present and what to ask for.
const credentialFor = (env) => {
  const token = process.env[`VIBE_RUNBOOK_${env.toUpperCase()}_TOKEN`];
  return token
    ? { present: true }
    : { present: false, ask: `set VIBE_RUNBOOK_${env.toUpperCase()}_TOKEN for environment "${env}"` };
};

const probe = (url) => {
  const out = execSync(`curl -s -o /dev/null -w "%{http_code}" ${JSON.stringify(url)}`, { encoding: 'utf8' });
  return Number.parseInt(out.trim(), 10);
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const command = process.argv[2];

if (command === 'scan') {
  const runbook = arg('runbook');
  if (!runbook) { console.error('scan needs --runbook <path>'); process.exit(1); }
  const out = scanRunbook(readFileSync(runbook, 'utf8'), runbook);
  const dest = join(process.cwd(), '.vibe-runbook', 'state', 'claims.json');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`scanned ${out.claims.length} claims, confidence ${out.coverage.confidence}`);
} else if (command === 'walk') {
  const env = arg('env');
  if (!env) { console.error('walk needs --env <name>; there is no default environment'); process.exit(1); }

  const statePath = join(process.cwd(), '.vibe-runbook', 'state', 'claims.json');
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    console.error('no cached scan; run `vibe-runbook scan --runbook <path>` first');
    process.exit(1);
  }

  const pre = preflight({ env, credentialCheck: () => credentialFor(env) });
  if (!pre.ok) {
    console.error(`BLOCKED: ${pre.blocked}`);
    console.error(`ask: ${pre.ask}`);
    process.exit(1);
  }

  const walked = state.claims.map((c) => {
    if (c.shape === 'pin') return assignVerdict(c, verifyPin(c, { runCommand: shell }));
    if (c.shape === 'status-assertion') return assignVerdict(c, verifyStatus(c, { httpProbe: probe }));
    return assignVerdict(c, null);
  });

  writeFileSync(statePath, `${JSON.stringify({ ...state, env, claims: walked }, null, 2)}\n`, 'utf8');
  console.log(renderReport({ runbook: state.runbook, env, claims: walked, coverage: state.coverage }));
} else {
  console.error('usage: vibe-runbook <scan|walk> [--runbook <path>] [--env <name>]');
  process.exit(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cli`
Expected: PASS, 2 tests

- [ ] **Step 5: Write the plugin manifest**

`plugins/vibe-runbook/.claude-plugin/plugin.json`:

```json
{
  "name": "vibe-runbook",
  "version": "0.1.0",
  "description": "Your runbook says do X and you will see W. Nothing checks whether that is still true. vibe-runbook reads a runbook, classifies every claim in it, and walks the ones a machine can walk against an environment you name — read-only, and it never spends. Six verdicts: PASS, FAIL, BLOCKED, SPENDS, HUMAN, QUESTION. A past-tense coverage record is reported and never failed, because a doc that says it tested 17 rooms is not lying when there are now 12. Credential preflight hard-stops rather than quietly walking your local machine and calling it green. Every report states what fraction of the enumerated surface it actually checked. When a pin has gone stale it offers the fix: the command that answers it where the reader has a shell, or the list it was summarizing where they do not.",
  "author": { "name": "626Labs LLC", "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Runbook" },
  "homepage": "https://github.com/estevanhernandez-stack-ed/Vibe-Runbook#readme",
  "repository": "https://github.com/estevanhernandez-stack-ed/Vibe-Runbook",
  "license": "MIT",
  "keywords": ["vibe-runbook", "vibe-coding", "runbook", "documentation-testing", "claude-code-plugin", "626labs"]
}
```

- [ ] **Step 6: Write the command files**

Each is thin, matching vibe-access. `commands/scan.md`:

```markdown
---
description: Inventory a runbook's claims and classify each one
---

Use the vibe-runbook scan skill: read skills/scan/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

`commands/walk.md`:

```markdown
---
description: Walk a runbook against a named environment. Read-only, never spends.
---

Use the vibe-runbook walk skill: read skills/walk/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

`commands/remediate.md`:

```markdown
---
description: Rewrite a stale pin as the command that answers it, or the list it summarized
---

Use the vibe-runbook remediate skill: read skills/remediate/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

`commands/vitals.md`:

```markdown
---
description: Health of the local vibe-runbook state
---

Use the vibe-runbook vitals skill: read skills/vitals/SKILL.md and follow it.
```

`commands/vibe-runbook.md`:

```markdown
---
description: Start here — state-aware router that recommends your next move
---

Use the vibe-runbook router skill: read skills/router/SKILL.md (and skills/guide/SKILL.md) and follow it.
```

- [ ] **Step 7: Write the guide skill**

`skills/guide/SKILL.md`:

```markdown
---
name: guide
description: Internal reference loaded by every vibe-runbook command skill. Persona, posture, and the safety invariants. Not user-invocable.
---

# vibe-runbook guide

## Posture

A runbook is a test spec. The running system is the system under test. Every
pin and status assertion is an executable claim. You verify documented
behavior, not code.

## Invariants, all earned by a cowpath walk and none negotiable

1. **A receipt is never failed.** Past-tense coverage records drift because the
   world moved. Report them; never score them FAIL.
2. **Credential preflight hard-stops.** Missing credential means BLOCKED with
   the exact ask. Never fall back to a local environment — a green run against
   the wrong target reads as evidence.
3. **Enumeration is mechanical and exhaustive.** Never sample. Always report
   `checked N of M enumerated`.
4. **Nothing spends.** Report SPENDS and what a full walk would cost.
5. **Never print a secret.** Shapes, statuses and counts only.
6. **The contract source beats the guess.** When a runbook is ambiguous about an
   interface, read the actual route table or client definition. A guessed path
   that 404s is a false FAIL against a runbook telling the truth.
7. **Probe write guards safely.** To check a write route's documented refusal,
   send a request that will fail validation against a resource that does not
   exist. 401 verifies the claim; 422 is itself the finding; neither writes.
8. **Ask for the cheapest sufficient shape.** Verification that costs more than
   the thing it verifies does not get run twice.

## Dual-tenant

No 626 branding, personas, or dashboard coupling in anything emitted. No
telemetry. No outbound calls beyond the walk the user named. Reports name the
runbook and the environment, nothing about who owns them.
```

- [ ] **Step 8: Write the scan, walk, remediate, vitals and router skills**

`skills/scan/SKILL.md`:

```markdown
---
name: scan
description: This skill should be used when the user says "/vibe-runbook:scan", "inventory my runbook", "what claims are in this doc", or wants a runbook's claims classified. Runs the engine scan; writes .vibe-runbook/state/claims.json. Read-only.
---

# vibe-runbook scan

Load skills/guide/SKILL.md.

1. Run `node engine/cli.mjs scan --runbook <path>`.
2. If `coverage.confidence` is `low`, do not proceed to walk. Show the guidance
   verbatim and offer to add markers to the runbook. An unreadable runbook is a
   reportable state, not a failure.
3. Report claims by shape, and name how many are receipts so the user sees what
   will deliberately never be walked.
```

`skills/walk/SKILL.md`:

```markdown
---
name: walk
description: This skill should be used when the user says "/vibe-runbook:walk", "walk my runbook", "is my runbook still true", or wants a runbook verified against a running system. Read-only on the target and never spends.
---

# vibe-runbook walk

Load skills/guide/SKILL.md. Requires a cached scan.

1. **Preflight first.** Confirm the credential for the named environment. If it
   is missing, stop and report BLOCKED with the exact ask. Never substitute a
   different environment.
2. Enumerate the target surface from the contract source, exhaustively.
3. Verify pins and status assertions only.
4. Assign verdicts. Receipts become QUESTION, humans become HUMAN, anything that
   would cost money becomes SPENDS and is not run.
5. Render the report. It must state coverage as a fraction, name what a full
   walk would have cost, and offer both exits.
```

`skills/remediate/SKILL.md`:

```markdown
---
name: remediate
description: This skill should be used when the user says "/vibe-runbook:remediate", "fix my stale pins", or accepts the remediation the walk report offered. Mutating and opt-in; backs up every file before writing.
---

# vibe-runbook remediate

Load skills/guide/SKILL.md. Requires a completed walk.

1. For every FAILed pin, pick the template by venue. Executable venue takes
   `value-to-command`; static venue takes `name-not-count`.
2. Never invent the context. A `value-to-command` rewrite needs the actual
   command, and a `name-not-count` rewrite needs the actual members. If you do
   not have them, say so and stop.
3. Show every diff before writing. Back up each file first.
4. Report the backup paths so a rollback is one step.
```

`skills/vitals/SKILL.md`:

```markdown
---
name: vitals
description: This skill should be used when the user says "/vibe-runbook:vitals" or asks about the health of the local vibe-runbook state. Read-only.
---

# vibe-runbook vitals

Report: whether `.vibe-runbook/state/claims.json` exists and its age, the
runbook it points at, claim counts by shape, the last walk's coverage fraction,
and any backups left un-rolled-back.
```

`skills/router/SKILL.md`:

```markdown
---
name: router
description: This skill should be used when the user says "/vibe-runbook" bare, or asks "what's next for my runbook". State-aware next-move recommender. Never auto-fires a mutating step.
---

# vibe-runbook router

Load skills/guide/SKILL.md. Read `.vibe-runbook/state/` and recommend:

- No claims cached → `:scan`
- Claims cached, low confidence → offer markup guidance, not a walk
- Claims cached, no walk → `:walk`, and ask which environment
- Walk done with FAILed pins → name the remediation available and offer
  `:remediate`
- Walk done, clean → say so, and name what was deliberately not walked

Never fire `:remediate` on your own.
```

- [ ] **Step 9: Write the data-home resolver and the evolve loop**

The family convention requires an L3 evolve loop, and an evolve loop needs somewhere to write. This is the only thing in v0.1 that writes outside the target repo, so the resolution ladder lives here and nowhere else.

`engine/datahome.mjs`:

```javascript
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Ladder: the blessed variable, then the legacy family path, then fail LOUD.
// Never silently skip a write -- that is the Cart blackout lesson.
export function dataHome() {
  const blessed = process.env.CLAUDE_PLUGIN_DATA;
  const dir = blessed || join(homedir(), '.claude', 'plugins', 'data', 'vibe-runbook');
  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    throw new Error(`vibe-runbook could not resolve a writable data home (${dir}): ${e.message}`);
  }
  return dir;
}
```

`tests/datahome.test.mjs`:

```javascript
import { dataHome } from '../engine/datahome.mjs';

test('prefers CLAUDE_PLUGIN_DATA when set', () => {
  const prev = process.env.CLAUDE_PLUGIN_DATA;
  process.env.CLAUDE_PLUGIN_DATA = process.cwd();
  expect(dataHome()).toBe(process.cwd());
  if (prev === undefined) delete process.env.CLAUDE_PLUGIN_DATA; else process.env.CLAUDE_PLUGIN_DATA = prev;
});

test('falls back to the legacy family path', () => {
  const prev = process.env.CLAUDE_PLUGIN_DATA;
  delete process.env.CLAUDE_PLUGIN_DATA;
  expect(dataHome()).toMatch(/plugins[\\/]data[\\/]vibe-runbook$/);
  if (prev !== undefined) process.env.CLAUDE_PLUGIN_DATA = prev;
});
```

`skills/evolve-runbook/SKILL.md`:

```markdown
---
name: evolve-runbook
description: This skill should be used when the user says "/vibe-runbook:evolve-runbook" and wants vibe-runbook to reflect on its own past runs and propose improvements to itself. Reads session logs from the resolved data home, writes proposals to docs/proposed-changes.md in the vibe-runbook solo repo. Never auto-applies.
---

# vibe-runbook evolve

Read the session logs under the resolved data home. Weight by what actually
happened, not by what was noisy.

The highest-value signal is **classifier misfires**: any claim where the
recorded `classifierRule` produced a shape the user corrected. Every misfire is
a named rule to fix, which is the entire reason rules are named.

Second: **extraction misses.** Runbooks where confidence came back `low`. Each
one is a house style the marker set does not cover yet.

Write proposals to `docs/proposed-changes.md`. Never edit a SKILL directly.
```

Also add `commands/evolve-runbook.md` following the same thin pattern as the others.

- [ ] **Step 10: Run the whole suite**

Run: `npm test`
Expected: PASS, all tests

- [ ] **Step 11: Commit**

```bash
git add plugins/vibe-runbook
git commit -m "feat(plugin): cli, skills, commands, manifest, data home and evolve

Thin commands delegating to skills, matching the family. The guide
carries the eight invariants, each earned by a cowpath walk. The data
home follows the family ladder and fails loud rather than skipping a
write. Evolve weights classifier misfires first, which is why every
rule is named."
```

---

### Task 12: Canary release and marketplace entry

**Files:**
- Create: `Vibe-Runbook/README.md`, `Vibe-Runbook/CHANGELOG.md`, `Vibe-Runbook/LICENSE`
- Modify: `vibe-plugins/.claude-plugin/marketplace.json`

- [ ] **Step 1: Write README and CHANGELOG**

README follows the family standard. It must state plainly: v0.1 verifies, it does not author; it never spends; role-scoped walkers and walker generation are not implemented and why.

- [ ] **Step 2: Push the solo repo and tag**

```bash
cd "C:/Users/estev/Projects/Vibe-Runbook"
gh repo create estevanhernandez-stack-ed/Vibe-Runbook --public --source=. --push
git tag v0.1.0 && git push origin v0.1.0
```

- [ ] **Step 3: Verify the tag resolves before touching the manifest**

```bash
gh api repos/estevanhernandez-stack-ed/Vibe-Runbook/git/refs/tags/v0.1.0
```

Expected: a ref object. **If this fails, stop.** Never pin a marketplace ref to a tag that does not resolve.

- [ ] **Step 4: Add the marketplace entry**

In `vibe-plugins/.claude-plugin/marketplace.json`, append to `plugins`:

```json
{
  "name": "vibe-runbook",
  "description": "<the description string from plugin.json>",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/estevanhernandez-stack-ed/Vibe-Runbook",
    "path": "plugins/vibe-runbook",
    "ref": "v0.1.0"
  }
}
```

Never use the `github` source type — it resolves SSH clone URLs and fails publickey-denied for users without GitHub SSH keys.

- [ ] **Step 5: Validate the manifest**

Run the `marketplace-validator` agent. Expected: JSON parses, the url resolves, the ref exists, the path exists at that ref, and a plugin manifest is present at that path.

- [ ] **Step 6: Prove a real install**

Install from the marketplace in a clean session and run `/vibe-runbook:scan` against STAR's smoke list. A promotion is not proven until a real install succeeds.

- [ ] **Step 7: Commit the manifest bump**

```bash
cd "C:/Users/estev/Projects/vibe-plugins"
git add .claude-plugin/marketplace.json
git commit -m "feat: add vibe-runbook v0.1.0 to the marketplace"
```

---

## Round-trip validation before stable

Real-app validation is the family ship bar. v0.1 is not promoted to stable until:

1. **STAR round-trip.** `:scan` then `:walk` against STAR's smoke list. Known answers: the revision and HEAD pins classify as `pin`, the 17-rooms and 45-rows claims classify as `receipt` and are never FAILed, the Liverpool-58 claim classifies as `unknown` and reports QUESTION, the Ctrl+P step classifies as `human`.
2. **A second runbook that is not Este's.** The extraction honesty gate must hold on a doc written in someone else's house style: low confidence and guidance, never a confident empty report.
3. **Classifier accuracy stated as a number,** with every misclassification named rather than summarized.
