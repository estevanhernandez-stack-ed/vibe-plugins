/**
 * Classify context modifiers — deterministic signals over the inventory.
 *
 * Modifiers layer on top of `app_type` + `tier`. They influence which test
 * levels are mandatory (per `framework.md > Context Modifiers`) and feed the
 * SKILL's gap rationales.
 *
 * Modifier set (v0.2):
 *   - customer-facing     — any CI deployment to public-host + user-visible UI
 *   - b2b                 — reserved for v0.3 (need signals we don't gather yet)
 *   - internal-only       — no public deploy signal, auth-gated backend
 *   - auth-required       — auth provider detected
 *   - pii-present         — models contain email/name/address/phone/dob
 *   - payment-flow        — stripe / paypal / any "payment" integration
 *   - file-uploads        — multer / busboy / storage SDKs
 *   - realtime            — socket.io / ws / firestore onSnapshot / pusher
 *   - offline-capable     — service worker / IndexedDB / localforage
 *   - regulated           — explicit HIPAA / PCI / GDPR / SOC2 markers in deps/docs
 *   - multi-tenant        — mirrors the app-type trigger
 *   - financial           — stripe + ledger/account models
 */
import type { DetectionResult } from './framework-detector.js';
import type { ModelEntry } from './model-inventory.js';
import type { IntegrationEntry } from './integration-inventory.js';

export type ContextModifier =
  | 'customer-facing'
  | 'b2b'
  | 'internal-only'
  | 'auth-required'
  | 'pii-present'
  | 'payment-flow'
  | 'file-uploads'
  | 'realtime'
  | 'offline-capable'
  | 'regulated'
  | 'multi-tenant'
  | 'financial';

export interface ClassifyModifiersInput {
  detection: DetectionResult;
  models: ModelEntry[];
  integrations: IntegrationEntry[];
  /**
   * Optional list of signal strings — the SKILL passes in strings it noticed
   * from CI workflows, READMEs, or Dockerfiles (e.g., `"NODE_ENV=production"`,
   * `"deploy-firebase"`, `"HIPAA"`). Conservative — absence is never taken as
   * a negative signal.
   */
  extraSignals?: string[];
}

const PII_FIELD_PATTERNS: RegExp[] = [
  /^email$/i,
  /^phone(_?number)?$/i,
  /^address$/i,
  /^street$/i,
  /^ssn$/i,
  /^dob$|^date_?of_?birth$/i,
  /^first_?name$/i,
  /^last_?name$/i,
  /^full_?name$/i,
];

const REGULATED_MARKERS = [/hipaa/i, /\bpci(?:-dss)?\b/i, /\bgdpr\b/i, /\bsoc2\b/i, /\bccpa\b/i];

function hasRealtimeDep(deps: Record<string, string>): boolean {
  return (
    'socket.io' in deps ||
    'socket.io-client' in deps ||
    'ws' in deps ||
    'pusher' in deps ||
    'pusher-js' in deps ||
    'ably' in deps
  );
}

function hasFileUploadDep(deps: Record<string, string>): boolean {
  return (
    'multer' in deps ||
    'busboy' in deps ||
    '@aws-sdk/client-s3' in deps ||
    'aws-sdk' in deps ||
    'firebase-admin' in deps // could indicate Storage; soft signal
  );
}

function hasOfflineDep(deps: Record<string, string>): boolean {
  return (
    'workbox-webpack-plugin' in deps ||
    'vite-plugin-pwa' in deps ||
    'idb' in deps ||
    'localforage' in deps ||
    'dexie' in deps
  );
}

function hasPaymentIntegration(integrations: IntegrationEntry[]): boolean {
  return integrations.some((i) => i.type === 'payment');
}

function fieldIndicatesPii(fieldName: string): boolean {
  return PII_FIELD_PATTERNS.some((re) => re.test(fieldName));
}

function modelsHavePii(models: ModelEntry[]): boolean {
  for (const m of models) {
    for (const f of m.fields) {
      if (fieldIndicatesPii(f.name)) return true;
    }
  }
  return false;
}

function hasFinancialModel(models: ModelEntry[]): boolean {
  const financialHints = /transaction|ledger|payment|invoice|subscription|billing|account_balance|amount_cents/i;
  return models.some((m) => financialHints.test(m.name) || m.fields.some((f) => financialHints.test(f.name)));
}

export function classifyModifiers(input: ClassifyModifiersInput): ContextModifier[] {
  const set = new Set<ContextModifier>();
  const deps = input.detection.allDependencies;
  const signals = (input.extraSignals ?? []).join(' ');

  // auth-required
  if (input.detection.auth.length > 0) set.add('auth-required');

  // payment-flow / financial
  if (hasPaymentIntegration(input.integrations)) set.add('payment-flow');
  if (set.has('payment-flow') && hasFinancialModel(input.models)) set.add('financial');
  // Deep fallback: payment dep present even if scanner hasn't emitted an integration row.
  if ('stripe' in deps || '@stripe/stripe-js' in deps || 'paypal-rest-sdk' in deps) {
    set.add('payment-flow');
  }

  // PII
  if (modelsHavePii(input.models)) set.add('pii-present');

  // Realtime
  if (hasRealtimeDep(deps)) set.add('realtime');
  if (/onSnapshot|subscribe\(/i.test(signals)) set.add('realtime');

  // File uploads
  if (hasFileUploadDep(deps)) set.add('file-uploads');

  // Offline-capable
  if (hasOfflineDep(deps)) set.add('offline-capable');

  // Regulated
  if (REGULATED_MARKERS.some((re) => re.test(signals))) set.add('regulated');

  // Customer-facing — explicit signal required to avoid false-positives on internal dashboards.
  const customerFacingMarkers = [
    /deploy-firebase|deploy-vercel|deploy-netlify|deploy-cloudrun/i,
    /production/i,
    /public-facing/i,
  ];
  if (customerFacingMarkers.some((re) => re.test(signals))) set.add('customer-facing');

  // Internal-only — inverse of customer-facing when auth+backend present but
  // no production markers.
  if (!set.has('customer-facing') && set.has('auth-required') && input.detection.backend.length > 0) {
    set.add('internal-only');
  }

  return [...set];
}
