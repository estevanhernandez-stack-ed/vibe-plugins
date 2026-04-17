/**
 * Anchored registry — parses the `plays-well-with.md` reference document.
 *
 * The file lives at `skills/guide/references/plays-well-with.md` and contains
 * YAML blocks describing each anchored complement + deferral contract. We read
 * it at runtime (SKILL-side) so updates don't require a recompile.
 *
 * If the file is missing we return an empty list — item #3 populates the real
 * content; item #2 only needs a parser.
 */

import { promises as fs, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

export interface AnchoredEntry {
  complement: string;
  applies_to: string[];
  phase: string;
  deferral_contract: string;
}

function resolveReferencesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let cursor = here;
  for (let i = 0; i < 6; i += 1) {
    try {
      readFileSync(join(cursor, 'package.json'), 'utf8');
      return join(cursor, 'skills', 'guide', 'references');
    } catch {
      cursor = dirname(cursor);
    }
  }
  return join(here, 'skills', 'guide', 'references');
}

export async function loadAnchoredRegistry(explicitPath?: string): Promise<AnchoredEntry[]> {
  const path = explicitPath ?? join(resolveReferencesDir(), 'plays-well-with.md');
  let content: string;
  try {
    content = await fs.readFile(path, 'utf8');
  } catch {
    return [];
  }
  return parseAnchoredMarkdown(content);
}

/**
 * The plays-well-with.md format accepts YAML either inline as a single block
 * or embedded in fenced yaml blocks. We support both.
 */
export function parseAnchoredMarkdown(content: string): AnchoredEntry[] {
  const yamlBlocks: string[] = [];

  const fenceRe = /```ya?ml\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let hadFenced = false;
  while ((match = fenceRe.exec(content))) {
    hadFenced = true;
    const block = match[1];
    if (block) yamlBlocks.push(block);
  }
  if (!hadFenced) {
    yamlBlocks.push(content);
  }

  const entries: AnchoredEntry[] = [];
  for (const block of yamlBlocks) {
    let parsed: unknown;
    try {
      parsed = parseYaml(block);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const complement = typeof obj.complement === 'string' ? obj.complement : null;
      const appliesTo = Array.isArray(obj.applies_to) ? (obj.applies_to as unknown[]).filter((x): x is string => typeof x === 'string') : [];
      const phase = typeof obj.phase === 'string' ? obj.phase : '';
      const deferralContract = typeof obj.deferral_contract === 'string' ? obj.deferral_contract : '';
      if (!complement) continue;
      entries.push({
        complement,
        applies_to: appliesTo,
        phase,
        deferral_contract: deferralContract,
      });
    }
  }
  return entries;
}

/** Synchronous counterpart — callers that already have the file content. */
export function parseAnchoredSync(content: string): AnchoredEntry[] {
  return parseAnchoredMarkdown(content);
}
