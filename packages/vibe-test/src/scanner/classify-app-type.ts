/**
 * Classify app type — deterministic rule match over `DetectionResult`.
 *
 * Called by the audit SKILL at Step 2 (classification). App type is the
 * deterministic half of the classifier; tier is the fuzzy half and lives in
 * the SKILL prompt (per Spec Decision 1 — agent-heavy split).
 *
 * Rule order matters — the first matching rule wins. Rules are ordered from
 * most-specific to least-specific so `multi-tenant-saas` doesn't get shadowed
 * by `full-stack-db`.
 *
 * Maps from `spec.md > Component Areas > Audit (Classifier sub-flow)`:
 *   react+vite+no-backend                 → spa
 *   react+express                         → spa-api
 *   react+firebase-firestore+fns          → full-stack-db
 *   express+fastify+no-frontend           → api-service
 *   multi-tenant signals                  → multi-tenant-saas
 *   else                                  → static
 */
import type { DetectionResult } from './framework-detector.js';
import type { AppType } from '../state/project-state.js';
import type { ModelEntry } from './model-inventory.js';
import type { RouteEntry } from './route-inventory.js';

export interface ClassifyAppTypeInput {
  detection: DetectionResult;
  /** Optional: routes the scanner found. Used for "has backend routes" signals. */
  routes?: RouteEntry[];
  /** Optional: models extracted. Used for multi-tenant heuristics. */
  models?: ModelEntry[];
  /** Optional: component count — used to decide frontend presence. */
  componentCount?: number;
}

export interface ClassifyAppTypeResult {
  app_type: AppType;
  /** Short string explaining the winning rule — renders in markdown + banner. */
  reason: string;
  /** Confidence for this app-type call, 0..1. Tier confidence is computed separately. */
  confidence: number;
}

/** Convenience — "has X" predicates against the detection result. */
function hasFrontend(det: DetectionResult): boolean {
  return det.frontend.length > 0;
}
function hasBackend(det: DetectionResult): boolean {
  return det.backend.length > 0;
}
function hasDatabase(det: DetectionResult): boolean {
  return det.database.length > 0;
}
function hasAuth(det: DetectionResult): boolean {
  return det.auth.length > 0;
}

function hasMultiTenantSignals(input: ClassifyAppTypeInput): boolean {
  // Heuristic #1: auth provider present + userId plumbing in models.
  if (!hasAuth(input.detection)) return false;
  const models = input.models ?? [];
  const userIdModels = models.filter((m) =>
    m.fields.some((f) => /^user_?id$|^tenant_?id$|^org_?id$/i.test(f.name)),
  );
  if (userIdModels.length >= 2) return true;
  // Heuristic #2: Prisma multi-schema marker — textual. We can't tell from the
  // framework detector alone; defer to future scanner signal.
  // Heuristic #3: Multiple Firestore "collections with userId" — approximated
  // via Zod/Joi models with userId.
  return false;
}

export function classifyAppType(input: ClassifyAppTypeInput): ClassifyAppTypeResult {
  const det = input.detection;
  const frontend = hasFrontend(det);
  const backend = hasBackend(det);
  const database = hasDatabase(det);
  const routeCount = input.routes?.length ?? 0;

  // Rule 0 — Multi-tenant SaaS (most specific).
  if (hasMultiTenantSignals(input) && frontend && (backend || database)) {
    return {
      app_type: 'multi-tenant-saas',
      reason:
        'Frontend + backend/db + auth provider + userId/tenantId plumbing detected across multiple models',
      confidence: 0.85,
    };
  }

  // Rule 1 — Full-stack with database.
  // Either (a) detected frontend + database, or (b) frontend + Firebase functions + firestore.
  if (frontend && database) {
    return {
      app_type: 'full-stack-db',
      reason: `Frontend (${det.frontend.join('+')}) + database (${det.database.join('+')}) detected`,
      confidence: 0.9,
    };
  }

  // Rule 2 — SPA + API (frontend + backend but no database signals).
  if (frontend && (backend || routeCount > 0)) {
    const backendLabel = backend ? det.backend.join('+') : `${routeCount} route(s)`;
    return {
      app_type: 'spa-api',
      reason: `Frontend (${det.frontend.join('+')}) + backend (${backendLabel})`,
      confidence: 0.9,
    };
  }

  // Rule 3 — API service (backend without frontend).
  if (!frontend && (backend || routeCount > 0)) {
    return {
      app_type: 'api-service',
      reason: `Backend only (${det.backend.join('+') || `${routeCount} route(s)`}), no frontend detected`,
      confidence: 0.9,
    };
  }

  // Rule 4 — SPA (frontend without backend).
  if (frontend && !backend && routeCount === 0) {
    return {
      app_type: 'spa',
      reason: `Client-only SPA (${det.frontend.join('+')}), no API surface detected`,
      confidence: 0.9,
    };
  }

  // Rule 5 — Static fallback.
  return {
    app_type: 'static',
    reason: 'No framework signals detected — treating as static site',
    confidence: 0.6,
  };
}
