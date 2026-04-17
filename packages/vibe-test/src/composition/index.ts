/**
 * Composition public API — Pattern #13 runtime detection + anchored registry.
 */

export {
  detectComplements,
  suggestDynamic,
  type ComplementStatus,
  type DetectInput,
} from './detect-complements.js';
export {
  loadAnchoredRegistry,
  parseAnchoredMarkdown,
  parseAnchoredSync,
  type AnchoredEntry,
} from './anchored-registry.js';
