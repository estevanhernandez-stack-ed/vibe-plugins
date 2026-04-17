/**
 * Public reporter API.
 */

export {
  createReportObject,
  type ReportObject,
  type CommandName,
  type Finding,
  type Action,
  type Deferral,
  type ReportScore,
  type ReportClassification,
} from './report-object.js';
export { renderBanner, type BannerRenderOptions } from './banner-renderer.js';
export {
  renderMarkdown,
  renderMarkdownSync,
  DEFAULT_TEMPLATE,
  type MarkdownRenderOptions,
} from './markdown-renderer.js';
export {
  renderJson,
  serializeReport,
  type JsonRenderInput,
  type JsonRenderResult,
} from './json-renderer.js';
export {
  getLanguageKnobs,
  languageKnobsForLevel,
  type LanguageKnobs,
  type Verbosity,
  type ExperienceLevel,
  type AdaptiveLanguageOverrides,
} from './tier-adaptive-language.js';
