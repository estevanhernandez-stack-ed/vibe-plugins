import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'fast-glob';
import { logger } from '../utils/logger';
import { detectLanguages, DetectedLanguage } from '../utils/language-detect';

export interface CodeStructure {
  languages: DetectedLanguage[];
  entryPoints: { [language: string]: string[] };
  routeHandlers: { [language: string]: string[] };
  models: { [language: string]: string[] };
  testDirectories: string[];
  packageConfigs: string[];
}

async function findPackageConfigs(projectPath: string): Promise<string[]> {
  const cfgs = await glob(['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'], { cwd: projectPath });
  return cfgs.map(c => path.join(projectPath, c)).filter(c => fs.existsSync(c));
}

async function findTestDirectories(projectPath: string): Promise<string[]> {
  const dirs = await glob(['__tests__', 'tests', 'test'], { cwd: projectPath, onlyDirectories: true });
  return dirs.map(d => path.join(projectPath, d)).filter(d => fs.existsSync(d));
}

export async function scanCode(projectPath: string): Promise<CodeStructure> {
  try {
    const packageConfigs = await findPackageConfigs(projectPath);
    const languages = detectLanguages(packageConfigs);
    const testDirectories = await findTestDirectories(projectPath);

    logger.info('Code scan completed', { languages: languages.length });

    return {
      languages,
      entryPoints: {},
      routeHandlers: {},
      models: {},
      testDirectories,
      packageConfigs,
    };
  } catch (error) {
    logger.error('Code scan failed', { error });
    throw error;
  }
}
