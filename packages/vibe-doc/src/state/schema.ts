/**
 * Vibe Doc State Schema
 * Defines the complete state shape for the documentation generation pipeline
 */

export interface InterviewAnswers {
  projectName: string;
  projectDescription: string;
  mainPurpose: string;
  primaryUsers: string;
  coreFeatures: string[];
  technologies: string[];
  deploymentModel: string;
  architectureStyle: string;
}

export interface ProjectProfile {
  interviewAnswers: InterviewAnswers;
  providedContext: string;
}

export interface ArtifactsByType {
  files: string[];
  count: number;
}

export interface GitStats {
  totalCommits: number;
  contributors: number;
  lastCommitDate: string;
  mainLanguages: string[];
}

export interface ArtifactInventory {
  totalArtifacts: number;
  categories: {
    sourceCode: ArtifactsByType;
    configuration: ArtifactsByType;
    documentation: ArtifactsByType;
    tests: ArtifactsByType;
    architecture: ArtifactsByType;
    infrastructure: ArtifactsByType;
  };
  gitStats: GitStats;
}

export interface DeploymentContext {
  platform: string;
  environment: string;
  scale: string;
}

export interface Classification {
  primaryCategory: string;
  secondaryCategory: string;
  deploymentContext: DeploymentContext[];
  contextModifiers: string[];
  confidence: number;
  rationale: string;
  userConfirmed: boolean;
}

export interface GapItem {
  docType: string;
  tier: string;
  domain: string;
  artifactsScanned: number;
  found: number;
  missing: number;
  rationale: string;
}

export interface GapReportSummary {
  totalArtifacts: number;
  docsCovered: number;
  docsPartial: number;
  docsMissing: number;
  coveragePercent: number;
}

export interface GapReport {
  summary: GapReportSummary;
  gaps: GapItem[];
}

export interface GeneratedDoc {
  docType: string;
  generatedAt: string;
  paths: string[];
  sourceArtifacts: string[];
  confidenceSections: {
    [section: string]: number;
  };
  stateHash: string;
}

export interface HistoryEntry {
  docType: string;
  version: string;
  generatedAt: string;
  path: string;
}

export interface VibedocState {
  version: string;
  lastScan: string;
  projectProfile: ProjectProfile;
  artifactInventory: ArtifactInventory;
  classification: Classification;
  gapReport: GapReport;
  generatedDocs: GeneratedDoc[];
  history: HistoryEntry[];
}
