/**
 * State Management
 * Handles reading and writing .vibe-doc/state.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { VibedocState } from './schema';

const STATE_DIR = '.vibe-doc';
const STATE_FILE = 'state.json';

/**
 * Read the vibe-doc state from disk
 * Returns null if state file doesn't exist
 */
export function readState(projectPath: string): VibedocState | null {
  try {
    const statePath = path.join(projectPath, STATE_DIR, STATE_FILE);
    if (!fs.existsSync(statePath)) {
      return null;
    }
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read state: ${error}`);
    return null;
  }
}

/**
 * Write the vibe-doc state to disk
 * Creates .vibe-doc directory if it doesn't exist
 */
export function writeState(projectPath: string, state: VibedocState): void {
  try {
    const stateDir = path.join(projectPath, STATE_DIR);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    const statePath = path.join(stateDir, STATE_FILE);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write state: ${error}`);
  }
}

/**
 * Initialize a fresh vibe-doc state with empty values
 */
export function initState(): VibedocState {
  return {
    version: '1.0.0',
    lastScan: new Date().toISOString(),
    projectProfile: {
      interviewAnswers: {
        projectName: '',
        projectDescription: '',
        mainPurpose: '',
        primaryUsers: '',
        coreFeatures: [],
        technologies: [],
        deploymentModel: '',
        architectureStyle: '',
      },
      providedContext: '',
    },
    artifactInventory: {
      totalArtifacts: 0,
      categories: {
        sourceCode: { files: [], count: 0 },
        configuration: { files: [], count: 0 },
        documentation: { files: [], count: 0 },
        tests: { files: [], count: 0 },
        architecture: { files: [], count: 0 },
        infrastructure: { files: [], count: 0 },
      },
      gitStats: {
        totalCommits: 0,
        contributors: 0,
        lastCommitDate: '',
        mainLanguages: [],
      },
    },
    classification: {
      primaryCategory: '',
      secondaryCategory: '',
      deploymentContext: [],
      contextModifiers: [],
      confidence: 0,
      rationale: '',
      userConfirmed: false,
    },
    gapReport: {
      summary: {
        totalArtifacts: 0,
        docsCovered: 0,
        docsPartial: 0,
        docsMissing: 0,
        coveragePercent: 0,
      },
      gaps: [],
    },
    generatedDocs: [],
    history: [],
  };
}
