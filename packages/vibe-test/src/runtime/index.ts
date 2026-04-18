/**
 * Runtime hooks public barrel.
 *
 * Two opt-in paths the generate SKILL composes via `--with-runtime` flag:
 *
 *   - Path A — dev-server probe (API-heavy apps): spawns the dev server,
 *     probes routes, captures observations, tears down cleanly.
 *   - Path B — Playwright hook (UI apps): composes probe intents the SKILL
 *     forwards to Playwright MCP via tool calls; emits a deferral finding
 *     when MCP is missing.
 *
 * Both paths are OFF by default. Static generation remains the baseline.
 */

export {
  pollHealthEndpoint,
  pollStdoutSignature,
  type PollHealthEndpointOptions,
  type PollHealthEndpointResult,
  type PollStdoutSignatureOptions,
  type PollStdoutSignatureResult,
} from './health-check.js';

export {
  detectDevCommand,
  allocateFreePort,
  spawnDevServer,
  probeRoute,
  teardownDevServer,
  runDevServerProbe,
  type DetectDevCommandResult,
  type SpawnDevServerInput,
  type DevServerHandle,
  type ProbeRouteInput,
  type ProbeObservation,
  type TeardownOptions,
  type TeardownResult,
  type RouteSpec,
  type RunDevServerProbeInput,
  type RunDevServerProbeResult,
} from './dev-server-probe.js';

export {
  isAvailable as isPlaywrightHookAvailable,
  composeProbeIntent,
  formatDeferralFinding,
  type UiFlow,
  type ProbeIntent,
} from './playwright-hook.js';
