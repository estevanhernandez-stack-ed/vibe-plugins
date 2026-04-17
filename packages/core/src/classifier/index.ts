/**
 * Classifier — hybrid rules + LLM classification scaffold
 *
 * Provides the infrastructure for a per-plugin classifier: signal
 * extraction → rules-based scoring → LLM fallback for low-confidence
 * cases. Each plugin supplies its own signal table and prompt; the
 * core handles the orchestration, confidence math, and fallback flow.
 *
 * Extraction status: STUB. Implementation will be lifted from
 * Vibe Doc's packages/vibe-doc/src/classifier/ during Phase 2 of the
 * monorepo migration.
 */

import type { ArtifactInventory } from '../scanner';

export interface Signal {
  name: string;
  weight: number;
  extract: (inventory: ArtifactInventory) => boolean | number;
}

export interface SignalTable {
  signals: Signal[];
  categories: Record<string, { weights: Record<string, number>; description: string }>;
}

export interface ClassificationResult {
  primaryCategory: string;
  secondaryCategories: string[];
  confidence: number;
  resolved: boolean;
  scores: Record<string, number>;
}

export interface ClassifyOptions {
  confidenceThreshold?: number;
}

export function classify(
  _inventory: ArtifactInventory,
  _table: SignalTable,
  _options?: ClassifyOptions
): ClassificationResult {
  throw new Error('@626labs/plugin-core/classifier not yet implemented. Phase 2 extraction pending.');
}
