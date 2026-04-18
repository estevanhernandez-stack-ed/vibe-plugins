/**
 * Public barrel for the Builder-Sustainable Handoff writers.
 *
 * These writers are deterministic plumbing invoked by the audit and generate
 * SKILLs at documented points in their flow. SKILLs supply prose via payload
 * arguments; writers compose it into the templates at
 * `skills/guide/templates/`.
 */
export {
  writeTestingMd,
} from './testing-md-writer.js';
export type {
  TestingMdPayload,
  TestingMdWriteResult,
} from './testing-md-writer.js';

export {
  appendTestPlanSession,
  renderSessionEntry,
} from './test-plan-writer.js';
export type {
  TestPlanSessionEntry,
  TestPlanWriteResult,
  TestPlanWriteOptions,
} from './test-plan-writer.js';

export {
  writeCiStub,
  renderCiStub,
} from './ci-stub-writer.js';
export type {
  CiStubPayload,
  CiStubWriteResult,
} from './ci-stub-writer.js';

export {
  renderGraduatingSection,
  detectTierTransition,
  nextTier,
} from './graduating-guide-writer.js';
export type {
  GraduatingGuidePayload,
} from './graduating-guide-writer.js';

export {
  renderEcosystemSection,
} from './ecosystem-section-writer.js';
export type {
  EcosystemRecommendation,
  EcosystemSectionPayload,
  EcosystemRenderResult,
} from './ecosystem-section-writer.js';

export {
  wrapSection,
  replaceSection,
  extractSection,
  startMarker,
  endMarker,
} from './markers.js';
