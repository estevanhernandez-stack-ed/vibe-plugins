/**
 * Generator public API — deterministic primitives the generate SKILL invokes
 * via tool calls. Confidence routing, SKILL-side prose, and accept/reject UX
 * live in `skills/generate/SKILL.md`.
 *
 * This barrel exposes:
 *   - env-var-scanner    — detect process.env / import.meta.env / dotenv reads
 *   - pending-dir-manager — atomic stage / accept / reject on .vibe-test/pending/
 *   - playwright-bridge  — MCP availability check + deferral stub composer
 *   - idiom-matchers     — framework-specific test-file fragments (vitest / jest)
 */

export {
  scanSource,
  scanFile,
  scanFiles,
  uniqueVarNames,
  formatInlineWarning,
} from './env-var-scanner.js';
export type {
  EnvVarReference,
  EnvVarSource,
  ScanStringInput,
} from './env-var-scanner.js';

export {
  stagePendingTest,
  acceptPendingTest,
  rejectPendingTest,
  listPending,
  writePendingIndex,
  renderPendingIndex,
  getCurrentHeadHash,
  pendingPathFor,
  pendingRoot,
  pendingIndexPath,
} from './pending-dir-manager.js';
export type {
  PendingMetadata,
  StageInput,
  StageResult,
  AcceptInput,
  AcceptResult,
  RejectInput,
  RejectResult,
  PendingListEntry,
} from './pending-dir-manager.js';

export {
  isPlaywrightMcpAvailable,
  formatDeferralAnnouncement,
  formatPresentAnnouncement,
  resolvePlaywrightBridge,
} from './playwright-bridge.js';
export type {
  PlaywrightAvailabilityInput,
  PlaywrightBridgeResult,
} from './playwright-bridge.js';

export {
  getIdiomMatcher,
  vitestMatcher,
  jestMatcher,
} from './idiom-matchers/index.js';
export type {
  IdiomMatcher,
  IdiomTemplate,
  IdiomRenderInput,
  TestLevel as IdiomTestLevel,
  SubjectKind,
} from './idiom-matchers/index.js';

export {
  getConsecutiveRejectCount,
  shouldFireProbe,
  markProbeFired,
  recordFeedbackEvent,
  ACCEPT_EVENT,
  REJECT_EVENT,
  PROBE_FIRED_EVENT,
  DEFAULT_PROBE_THRESHOLD,
} from './consecutive-reject-tracker.js';
export type {
  SessionEventLike,
  FeedbackEventInput,
} from './consecutive-reject-tracker.js';
