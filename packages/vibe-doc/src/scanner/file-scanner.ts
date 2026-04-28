import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ArtifactsByType } from '../state/schema';

interface FileScanResult {
  configAsDocs: ArtifactsByType;
  agentArtifacts: ArtifactsByType;
  sessionContext: ArtifactsByType;
  documentation: ArtifactsByType;
  packageConfigs: ArtifactsByType;
  cicdConfigs: ArtifactsByType;
  infrastructure: ArtifactsByType;
  testFiles: ArtifactsByType;
  apiSpecs: ArtifactsByType;
  sourceCode: ArtifactsByType;
}

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'venv', '.venv',
  '__pycache__', 'target', '.cache', '.turbo', 'temp', 'tmp', '.pytest_cache',
  'jest_cache', '.eslintcache', '.nuxt', '.parcel-cache', 'bower_components'
]);

function categorizeFile(filePath: string): keyof FileScanResult {
  const n = filePath.replace(/\\/g, '/');
  if (n.endsWith('CLAUDE.md')) return 'configAsDocs';
  // Claude Code plugin manifests (plugin.json, marketplace.json inside .claude-plugin/)
  if (n.includes('/.claude-plugin/') && n.endsWith('.json')) return 'packageConfigs';
  // SKILL.md files and command docs are plugin surface area
  if (n.match(/\/skills\/[^/]+\/SKILL\.md$/i)) return 'documentation';
  if (n.match(/\/commands\/[^/]+\.md$/i)) return 'documentation';
  if (n.includes('/.ai/') || n.includes('/.agent/skills/')) return 'agentArtifacts';
  if (n.includes('/.claude/')) return 'sessionContext';
  if (n.includes('/docs/') && n.endsWith('.md')) return 'documentation';
  if (n.endsWith('package.json') || n.endsWith('Cargo.toml')) return 'packageConfigs';
  if (n.includes('/.github/workflows/')) return 'cicdConfigs';
  if (n.endsWith('Dockerfile') || n.endsWith('.tf')) return 'infrastructure';
  if (n.match(/\.(test|spec)\.[jt]sx?$/)) return 'testFiles';
  if (n.endsWith('swagger.json')) return 'apiSpecs';
  return 'sourceCode';
}

function walkDir(dir: string, maxDepth: number = 6, currentDepth: number = 0): string[] {
  const files: string[] = [];
  if (currentDepth > maxDepth) return files;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.ai' && entry.name !== '.agent' && entry.name !== '.claude' && entry.name !== '.claude-plugin' && entry.name !== '.github') continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, maxDepth, currentDepth + 1));
      }
    }
  } catch (error) {
    logger.warn('Failed to read directory', { dir, error });
  }

  return files;
}

export async function scanFiles(projectPath: string): Promise<FileScanResult> {
  const result: FileScanResult = {
    configAsDocs: { files: [], count: 0 },
    agentArtifacts: { files: [], count: 0 },
    sessionContext: { files: [], count: 0 },
    documentation: { files: [], count: 0 },
    packageConfigs: { files: [], count: 0 },
    cicdConfigs: { files: [], count: 0 },
    infrastructure: { files: [], count: 0 },
    testFiles: { files: [], count: 0 },
    apiSpecs: { files: [], count: 0 },
    sourceCode: { files: [], count: 0 },
  };

  try {
    const files = walkDir(projectPath);
    for (const file of files) {
      const cat = categorizeFile(file);
      result[cat].files.push(file);
      result[cat].count++;
    }
    logger.info('File scan completed', { total: files.length });
    return result;
  } catch (error) {
    logger.error('File scan failed', { error });
    throw error;
  }
}
