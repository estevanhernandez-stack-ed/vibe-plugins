/**
 * ReportObject — the single source of truth that every command builds and
 * every renderer consumes.
 *
 * Field shape matches `spec.md > Component Areas > Reporter`. Schema-versioned
 * so we can migrate if the shape grows.
 */

import type { AppType, Tier, TestLevel } from '../state/project-state.js';

export type CommandName =
  | 'audit'
  | 'generate'
  | 'fix'
  | 'coverage'
  | 'gate'
  | 'posture';

export interface ReportClassification {
  app_type: AppType;
  tier: Tier;
  modifiers: string[];
  confidence: number;
}

export interface ReportScore {
  current: number;
  target: number;
  per_level: Record<TestLevel, number>;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  rationale?: string;
  effort?: 'low' | 'medium' | 'high';
  example_pattern?: string;
}

export interface Action {
  kind: 'write' | 'stage' | 'inline' | 'propose' | 'skip' | 'revert' | 'other';
  description: string;
  target?: string;
}

export interface Deferral {
  complement: string;
  phase: string;
  contract: string;
}

export interface ReportObject {
  schema_version: 1;
  command: CommandName;
  timestamp: string;
  plugin_version: string;
  project: {
    repo_root: string;
    scope: string | null;
    commit_hash: string | null;
  };
  classification: ReportClassification | null;
  score: ReportScore | null;
  findings: Finding[];
  actions_taken: Action[];
  deferrals: Deferral[];
  handoff_artifacts: string[];
  next_step_hint: string | null;
}

export interface CreateReportObjectInput {
  command: CommandName;
  plugin_version?: string;
  repo_root?: string;
  scope?: string | null;
  commit_hash?: string | null;
}

const DEFAULT_PLUGIN_VERSION = '0.2.0';

/** Factory — returns a well-formed minimal ReportObject. */
export function createReportObject(input: CreateReportObjectInput): ReportObject {
  return {
    schema_version: 1,
    command: input.command,
    timestamp: new Date().toISOString(),
    plugin_version: input.plugin_version ?? DEFAULT_PLUGIN_VERSION,
    project: {
      repo_root: input.repo_root ?? process.cwd(),
      scope: input.scope ?? null,
      commit_hash: input.commit_hash ?? null,
    },
    classification: null,
    score: null,
    findings: [],
    actions_taken: [],
    deferrals: [],
    handoff_artifacts: [],
    next_step_hint: null,
  };
}
