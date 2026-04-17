/**
 * Per-project state at `<project>/.vibe-test/state.json`.
 *
 * STUB for checklist item #1. Full implementation lands with item #5 (audit
 * SKILL + classifier) — this stub defines the exported types + stable function
 * signatures so downstream modules can import them now.
 */

export type AppType =
  | 'static'
  | 'spa'
  | 'spa-api'
  | 'full-stack-db'
  | 'api-service'
  | 'multi-tenant-saas';

export type Tier =
  | 'prototype'
  | 'internal'
  | 'public-facing'
  | 'customer-facing-saas'
  | 'regulated';

export type TestLevel = 'smoke' | 'behavioral' | 'edge' | 'integration' | 'performance';

export interface Classification {
  app_type: AppType;
  tier: Tier;
  modifiers: string[];
  confidence: number;
  mixed_stack_portions?: Array<{
    path_glob: string;
    app_type: AppType;
    tier: Tier;
    confidence: number;
  }>;
}

export interface CoverageSnapshot {
  current_score: number;
  target_score: number;
  per_level: Record<TestLevel, number>;
  denominator_honest: boolean;
  measured_at: string;
}

export interface InventorySnapshot {
  routes: unknown[];
  components: unknown[];
  models: unknown[];
  integrations: unknown[];
  test_frameworks: string[];
  existing_test_files: string[];
}

export interface ProjectState {
  schema_version: 1;
  last_updated: string;
  classification: Classification | null;
  inventory: InventorySnapshot | null;
  coverage_snapshot: CoverageSnapshot | null;
  generated_tests: string[];
  rejected_tests: string[];
  framework: string | null;
  ci_integrated: boolean;
  covered_surfaces_written_at: string | null;
}

export const DEFAULT_PROJECT_STATE: ProjectState = {
  schema_version: 1,
  last_updated: new Date(0).toISOString(),
  classification: null,
  inventory: null,
  coverage_snapshot: null,
  generated_tests: [],
  rejected_tests: [],
  framework: null,
  ci_integrated: false,
  covered_surfaces_written_at: null,
};

/** Read project state for a given repo root. Stub: returns defaults (schema_version 1). */
export async function readProjectState(_repoRoot: string): Promise<ProjectState | null> {
  return null;
}

/** Persist project state. Stub: no-op. */
export async function writeProjectState(
  _repoRoot: string,
  _state: ProjectState,
): Promise<void> {
  return;
}

/** Compute the path where per-project state lives. Public for callers needing the path. */
export function projectStatePath(repoRoot: string): string {
  return `${repoRoot}/.vibe-test/state.json`;
}
