/**
 * Framework detector — reads package.json + config files to enumerate every
 * framework / platform Vibe Test knows about.
 *
 * We intentionally cast a wide net here because the downstream classifier
 * (SKILL) reads *everything*: test frameworks, frontend frameworks, backend,
 * database, auth. The classifier maps detections to `app_type` + context
 * modifiers; we only report presence.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface PackageJsonShape {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export type TestFramework =
  | 'vitest'
  | 'jest'
  | 'playwright'
  | 'cypress'
  | 'mocha'
  | '@testing-library';

export type FrontendFramework = 'react' | 'next' | 'vite' | 'vue' | 'svelte' | 'expo';

export type BackendFramework = 'express' | 'fastify' | 'hono' | 'firebase-functions';

export type DatabaseType = 'firestore' | 'prisma' | 'drizzle' | 'sqlite' | 'postgres' | 'mongodb';

export type AuthProvider = 'firebase-auth' | 'clerk' | 'auth0' | 'next-auth';

export interface DetectionResult {
  test: TestFramework[];
  frontend: FrontendFramework[];
  backend: BackendFramework[];
  database: DatabaseType[];
  auth: AuthProvider[];
  /** Raw merged dependency map (deps + devDeps + peerDeps + optional). */
  allDependencies: Record<string, string>;
  /** Config files observed (truthy existence only). */
  configFiles: string[];
  /** Package manifest path if found. */
  packageJsonPath: string | null;
  /** Parsed package.json, when present. */
  packageJson: PackageJsonShape | null;
}

const TEST_DEPS: Record<string, TestFramework> = {
  vitest: 'vitest',
  jest: 'jest',
  '@playwright/test': 'playwright',
  playwright: 'playwright',
  cypress: 'cypress',
  mocha: 'mocha',
  '@testing-library/react': '@testing-library',
  '@testing-library/vue': '@testing-library',
  '@testing-library/dom': '@testing-library',
  '@testing-library/svelte': '@testing-library',
};

const FRONTEND_DEPS: Record<string, FrontendFramework> = {
  react: 'react',
  'react-dom': 'react',
  next: 'next',
  vite: 'vite',
  vue: 'vue',
  svelte: 'svelte',
  expo: 'expo',
  'react-native': 'expo',
};

const BACKEND_DEPS: Record<string, BackendFramework> = {
  express: 'express',
  fastify: 'fastify',
  hono: 'hono',
  'firebase-functions': 'firebase-functions',
  'firebase-admin': 'firebase-functions',
};

const DATABASE_DEPS: Record<string, DatabaseType> = {
  'firebase/firestore': 'firestore',
  '@google-cloud/firestore': 'firestore',
  '@firebase/firestore': 'firestore',
  '@prisma/client': 'prisma',
  prisma: 'prisma',
  'drizzle-orm': 'drizzle',
  'better-sqlite3': 'sqlite',
  sqlite3: 'sqlite',
  pg: 'postgres',
  mongoose: 'mongodb',
  mongodb: 'mongodb',
};

const AUTH_DEPS: Record<string, AuthProvider> = {
  'firebase/auth': 'firebase-auth',
  '@firebase/auth': 'firebase-auth',
  '@clerk/nextjs': 'clerk',
  '@clerk/clerk-sdk-node': 'clerk',
  '@clerk/clerk-react': 'clerk',
  '@auth0/nextjs-auth0': 'auth0',
  'auth0-js': 'auth0',
  '@auth0/auth0-react': 'auth0',
  'next-auth': 'next-auth',
};

const CONFIG_FILES = [
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  'jest.config.ts',
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'playwright.config.ts',
  'playwright.config.js',
  'cypress.config.ts',
  'cypress.config.js',
  'next.config.js',
  'next.config.mjs',
  'vite.config.ts',
  'vite.config.js',
  'svelte.config.js',
  'nuxt.config.ts',
  'firebase.json',
  'prisma/schema.prisma',
  'drizzle.config.ts',
  'drizzle.config.js',
];

function mergeDeps(pkg: PackageJsonShape): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}

function lookupMany<T extends string>(
  dependencies: Record<string, string>,
  map: Record<string, T>,
): T[] {
  const hits = new Set<T>();
  for (const depName of Object.keys(dependencies)) {
    // Exact match first.
    if (depName in map) {
      hits.add(map[depName] as T);
      continue;
    }
    // Submodule-style key (e.g., firebase/auth) — keyed on the root dep name
    // being present. E.g., if `firebase` is installed, flag firestore + auth
    // candidates conservatively and let the SKILL resolve.
  }
  // Secondary pass for the firebase/* submodule conventions — if `firebase` is
  // present, assume auth + firestore capabilities available for classifier.
  if ('firebase' in dependencies) {
    for (const key of Object.keys(map)) {
      if (key.startsWith('firebase/') || key.startsWith('@firebase/')) {
        hits.add(map[key] as T);
      }
    }
  }
  return [...hits];
}

async function readPackageJson(rootPath: string): Promise<{
  path: string;
  data: PackageJsonShape;
} | null> {
  const candidate = join(rootPath, 'package.json');
  try {
    const raw = await fs.readFile(candidate, 'utf8');
    const data = JSON.parse(raw) as PackageJsonShape;
    return { path: candidate, data };
  } catch {
    return null;
  }
}

async function findConfigFiles(rootPath: string): Promise<string[]> {
  const hits: string[] = [];
  for (const name of CONFIG_FILES) {
    try {
      await fs.access(join(rootPath, name));
      hits.push(name);
    } catch {
      // not present
    }
  }
  return hits;
}

function configFilesToFrameworks(configs: string[]): {
  test: TestFramework[];
  frontend: FrontendFramework[];
  database: DatabaseType[];
} {
  const test = new Set<TestFramework>();
  const frontend = new Set<FrontendFramework>();
  const database = new Set<DatabaseType>();
  for (const f of configs) {
    if (f.startsWith('vitest.config.')) test.add('vitest');
    if (f.startsWith('jest.config.')) test.add('jest');
    if (f.startsWith('playwright.config.')) test.add('playwright');
    if (f.startsWith('cypress.config.')) test.add('cypress');
    if (f.startsWith('next.config.')) frontend.add('next');
    if (f.startsWith('vite.config.')) frontend.add('vite');
    if (f === 'svelte.config.js') frontend.add('svelte');
    if (f.startsWith('nuxt.config.')) frontend.add('vue');
    if (f === 'prisma/schema.prisma') database.add('prisma');
    if (f.startsWith('drizzle.config.')) database.add('drizzle');
  }
  return {
    test: [...test],
    frontend: [...frontend],
    database: [...database],
  };
}

/** Merge-unique helper. */
function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return [...new Set<T>([...a, ...b])];
}

export async function detectFrameworks(rootPath: string): Promise<DetectionResult> {
  const pkg = await readPackageJson(rootPath);
  const configFiles = await findConfigFiles(rootPath);
  const allDependencies = pkg ? mergeDeps(pkg.data) : {};

  const testFromDeps = lookupMany(allDependencies, TEST_DEPS);
  const frontendFromDeps = lookupMany(allDependencies, FRONTEND_DEPS);
  const backendFromDeps = lookupMany(allDependencies, BACKEND_DEPS);
  const databaseFromDeps = lookupMany(allDependencies, DATABASE_DEPS);
  const authFromDeps = lookupMany(allDependencies, AUTH_DEPS);

  const fromConfigs = configFilesToFrameworks(configFiles);

  return {
    test: union(testFromDeps, fromConfigs.test),
    frontend: union(frontendFromDeps, fromConfigs.frontend),
    backend: backendFromDeps,
    database: union(databaseFromDeps, fromConfigs.database),
    auth: authFromDeps,
    allDependencies,
    configFiles,
    packageJsonPath: pkg?.path ?? null,
    packageJson: pkg?.data ?? null,
  };
}

/** Pure variant for unit tests — caller provides the package.json + configs in-memory. */
export function detectFrameworksPure(
  pkg: PackageJsonShape | null,
  configFiles: string[],
): DetectionResult {
  const allDependencies = pkg ? mergeDeps(pkg) : {};
  const testFromDeps = lookupMany(allDependencies, TEST_DEPS);
  const frontendFromDeps = lookupMany(allDependencies, FRONTEND_DEPS);
  const backendFromDeps = lookupMany(allDependencies, BACKEND_DEPS);
  const databaseFromDeps = lookupMany(allDependencies, DATABASE_DEPS);
  const authFromDeps = lookupMany(allDependencies, AUTH_DEPS);
  const fromConfigs = configFilesToFrameworks(configFiles);
  return {
    test: union(testFromDeps, fromConfigs.test),
    frontend: union(frontendFromDeps, fromConfigs.frontend),
    backend: backendFromDeps,
    database: union(databaseFromDeps, fromConfigs.database),
    auth: authFromDeps,
    allDependencies,
    configFiles,
    packageJsonPath: null,
    packageJson: pkg,
  };
}
