#!/usr/bin/env node
// Keep README.md in sync with .claude-plugin/marketplace.json — the storefront's
// plugin list must never drift from the manifest (the source of truth).
//
//   node scripts/gen-readme-plugins.mjs            # --check (default): CI gate, no writes
//   node scripts/gen-readme-plugins.mjs --check    # same, explicit
//   node scripts/gen-readme-plugins.mjs --write     # regenerate the install block in place
//
// What this owns:
//   1. The install block between the BEGIN/END markers — order-preserving: existing
//      lines keep their hand-curated order, plugins removed from the manifest are
//      dropped, and plugins newly added to the manifest are appended. So shipping a
//      plugin = add it to marketplace.json + run `npm run readme:sync`; the install
//      block updates itself without reshuffling the curated order.
//   2. Presence validation — every plugin's solo repo must be linked somewhere in the
//      README body (i.e. it has a storefront table row). This gates the curated tables
//      and narrative WITHOUT overwriting the hand-written copy: a manifest plugin with
//      no README link fails the check, which is exactly the bug that let vibe-prompt
//      ship to the manifest while staying off the storefront.
//
// The plugin-count badge reads the manifest live (shields `$.plugins.length`), so the
// count itself needs no check here — only the per-plugin presence does.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, '.claude-plugin', 'marketplace.json');
const README = join(ROOT, 'README.md');

const BEGIN = '<!-- BEGIN GENERATED:install (scripts/gen-readme-plugins.mjs) -->';
const END = '<!-- END GENERATED:install -->';

const write = process.argv.includes('--write') || process.argv.includes('--fix');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const repoSlug = (p) =>
  (p.source.url || `https://github.com/${p.source.repo}`)
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const plugins = manifest.plugins ?? [];
const manifestNames = plugins.map((p) => p.name);
const manifestSet = new Set(manifestNames);

let readme = readFileSync(README, 'utf8');
const errors = [];

// 1. Presence validation: every manifest plugin must be linked in the README body.
for (const p of plugins) {
  const slug = repoSlug(p);
  if (!readme.includes(slug)) {
    errors.push(
      `"${p.name}" (${slug}) is in marketplace.json but has no link in README.md — missing a storefront table row?`,
    );
  }
}

// 2. Reconcile the install block (order-preserving).
const blockRe = new RegExp(`${escapeRe(BEGIN)}[\\s\\S]*?${escapeRe(END)}`);
const match = readme.match(blockRe);

if (!match) {
  errors.push(
    `install-block markers not found in README.md — expected a region delimited by:\n      ${BEGIN}\n      ${END}`,
  );
} else {
  const current = match[0];
  const existingOrder = [...current.matchAll(/\/plugin install (\S+)@vibe-plugins/g)].map((m) => m[1]);

  // Reverse drift: a README install line for a plugin no longer in the manifest.
  // In --write mode the rebuild below drops it (a fix, not an error); only flag it
  // as drift in --check mode.
  if (!write) {
    for (const name of existingOrder) {
      if (!manifestSet.has(name)) {
        errors.push(
          `README install block lists "${name}", which is not in marketplace.json — stale line? Run \`npm run readme:sync\` to drop it.`,
        );
      }
    }
  }

  const kept = existingOrder.filter((n) => manifestSet.has(n));
  const appended = manifestNames.filter((n) => !existingOrder.includes(n));
  const finalNames = [...kept, ...appended];

  const rebuilt = [
    BEGIN,
    '```text',
    '/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins',
    ...finalNames.map((n) => `/plugin install ${n}@vibe-plugins`),
    '```',
    END,
  ].join('\n');

  if (rebuilt !== current) {
    if (write) {
      readme = readme.replace(blockRe, rebuilt);
      writeFileSync(README, readme);
      console.log('README install block regenerated from marketplace.json.');
    } else {
      errors.push('install block is out of sync with marketplace.json — run `npm run readme:sync` to regenerate it.');
    }
  } else if (write) {
    console.log('README install block already in sync; no change.');
  }
}

if (errors.length) {
  console.error(`\n✖ README/manifest drift (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\nManifest lists ${plugins.length} plugins: ${manifestNames.join(', ')}`);
  process.exit(1);
}

console.log(`✓ README in sync with marketplace.json (${plugins.length} plugins).`);
