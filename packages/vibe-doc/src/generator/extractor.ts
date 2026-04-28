/**
 * Artifact Data Extractor
 * Maps scan inventory data to template section tokens
 * Extracts rich context from project artifacts to pre-populate templates
 */

import * as fs from 'fs';
import * as path from 'path';
import { VibedocState } from '../state/schema';
import { logger } from '../utils/logger';

interface PackageJson {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  main?: string;
  entry?: string;
}

/**
 * Try to read and parse package.json
 */
function readPackageJson(projectPath: string): PackageJson | null {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const content = fs.readFileSync(pkgPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.debug('Failed to read package.json', { error });
    return null;
  }
}

/**
 * Try to read CLAUDE.md for context
 */
function readClaudeMd(projectPath: string): string {
  try {
    // Search in common locations
    const locations = [
      path.join(projectPath, 'CLAUDE.md'),
      path.join(projectPath, 'docs', 'CLAUDE.md'),
      path.join(projectPath, '.claude', 'CLAUDE.md'),
    ];

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        return fs.readFileSync(loc, 'utf-8');
      }
    }
  } catch (error) {
    logger.debug('Failed to read CLAUDE.md', { error });
  }
  return '';
}

/**
 * Try to read Dockerfile for deployment info
 */
function readDockerfile(projectPath: string): string {
  try {
    const dockerPath = path.join(projectPath, 'Dockerfile');
    if (!fs.existsSync(dockerPath)) return '';
    return fs.readFileSync(dockerPath, 'utf-8');
  } catch (error) {
    logger.debug('Failed to read Dockerfile', { error });
    return '';
  }
}

/**
 * Try to read GitHub Actions workflow for CI/CD
 */
function readWorkflow(projectPath: string): string {
  try {
    const workflowDir = path.join(projectPath, '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) return '';

    const files = fs.readdirSync(workflowDir);
    const yamlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    if (yamlFiles.length === 0) return '';

    // Read first workflow file
    const workflowPath = path.join(workflowDir, yamlFiles[0]);
    return fs.readFileSync(workflowPath, 'utf-8');
  } catch (error) {
    logger.debug('Failed to read workflow', { error });
    return '';
  }
}

/**
 * Extract Runbook sections
 */
function extractRunbook(projectPath: string, state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const claude = readClaudeMd(projectPath);
  const dockerfile = readDockerfile(projectPath);
  const workflow = readWorkflow(projectPath);

  const result: Record<string, string> = {};

  // service-overview: from package.json description and CLAUDE.md
  if (pkg?.description) {
    result['service-overview'] = pkg.description;
  } else if (claude) {
    const lines = claude.split('\n').slice(0, 5).join(' ');
    result['service-overview'] = lines.trim();
  }

  // startup-procedure: from package.json scripts
  if (pkg?.scripts) {
    const scripts = [];
    if (pkg.scripts.start) scripts.push(`npm start: ${pkg.scripts.start}`);
    if (pkg.scripts.dev) scripts.push(`npm dev: ${pkg.scripts.dev}`);
    if (pkg.scripts['server:start']) scripts.push(`npm server:start: ${pkg.scripts['server:start']}`);

    if (scripts.length > 0) {
      result['startup-procedure'] = scripts.join('\n\n');
    }
  }

  // health-checks: look for common patterns in code
  const hasHealthCheck = state.artifactInventory.categories.sourceCode.files.some(f =>
    /health|liveness|readiness|ping|status/.test(f.toLowerCase())
  );

  if (hasHealthCheck) {
    result['health-checks'] = 'Service includes health check endpoints. Verify via /health or /status endpoints.';
  }

  // common-issues: from git patterns (fix/hotfix commits are rare, but we note this)
  if (state.artifactInventory.gitStats.totalCommits > 10) {
    result['common-issues'] =
      `Based on ${state.artifactInventory.gitStats.totalCommits} commits, check git log for frequent fixes: ` +
      `git log --oneline | grep -E "^(fix|hotfix):" | head -10`;
  }

  // rollback-procedure: from CI/CD config
  if (workflow && workflow.includes('revert')) {
    result['rollback-procedure'] = 'CI/CD pipeline includes revert capabilities. Check .github/workflows for rollback steps.';
  } else if (dockerfile || pkg?.scripts?.deploy) {
    result['rollback-procedure'] = 'Deployment handled via Docker/scripts. Manual rollback: revert deployment, restart service.';
  }

  // escalation-path: from CLAUDE.md team context
  if (claude && claude.includes('on-call')) {
    const onCallMatch = claude.match(/on[- ]call[:\s]+([^\n]+)/i);
    if (onCallMatch) {
      result['escalation-path'] = onCallMatch[1];
    }
  }

  return result;
}

/**
 * Extract ADR sections
 */
function extractADR(projectPath: string, state: VibedocState): Record<string, string> {
  const claude = readClaudeMd(projectPath);
  const result: Record<string, string> = {};

  // context: from CLAUDE.md or architecture notes
  if (claude) {
    const contextMatch = claude.match(/^#+\s+(?:Architecture|Context|Background)([\s\S]*?)(?=^#+|$)/m);
    if (contextMatch) {
      result['context'] = contextMatch[1].trim().slice(0, 500);
    } else {
      result['context'] = claude.slice(0, 300);
    }
  }

  // decision: from architecture docs or CLAUDE.md
  if (claude && claude.includes('decision')) {
    const decisionMatch = claude.match(/(?:decision|chose|selected)[:\s]+([^\n]+)/i);
    if (decisionMatch) {
      result['decision'] = decisionMatch[1];
    }
  }

  // consequences: from stack composition
  const languages = state.artifactInventory.gitStats.mainLanguages;
  if (languages.length > 0) {
    result['consequences'] =
      `Technology stack: ${languages.join(', ')}. ` +
      `Positive: focused ecosystem. ` +
      `Negative: limited polyglot flexibility.`;
  }

  // alternatives: from package.json dependencies (show alternatives not chosen)
  const pkg = readPackageJson(projectPath);
  if (pkg?.dependencies) {
    const keys = Object.keys(pkg.dependencies).slice(0, 3);
    result['alternatives'] =
      `Considered alternatives before selecting current stack. ` +
      `Current primary dependencies: ${keys.join(', ')}`;
  }

  return result;
}

/**
 * Extract Deployment Procedure sections
 */
function extractDeploymentProcedure(projectPath: string, state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const dockerfile = readDockerfile(projectPath);
  const workflow = readWorkflow(projectPath);
  const result: Record<string, string> = {};

  // prerequisites: from package.json engines and Dockerfile
  const prereqs = [];
  if (pkg?.engines?.node) {
    prereqs.push(`Node.js ${pkg.engines.node}`);
  }
  if (pkg?.engines?.npm) {
    prereqs.push(`npm ${pkg.engines.npm}`);
  }
  if (dockerfile && dockerfile.includes('FROM')) {
    const fromMatch = dockerfile.match(/FROM\s+([^\n]+)/);
    if (fromMatch) {
      prereqs.push(`Docker base: ${fromMatch[1]}`);
    }
  }

  if (prereqs.length > 0) {
    result['prerequisites'] = prereqs.join('\n');
  }

  // build-process: from package.json scripts
  if (pkg?.scripts) {
    const buildScripts = [];
    if (pkg.scripts.build) buildScripts.push(`1. npm run build: ${pkg.scripts.build}`);
    if (pkg.scripts.compile) buildScripts.push(`1. npm run compile: ${pkg.scripts.compile}`);
    if (pkg.scripts['install']) buildScripts.push(`2. npm install dependencies`);
    if (pkg.scripts.test) buildScripts.push(`3. npm test: ${pkg.scripts.test}`);

    if (buildScripts.length > 0) {
      result['build-process'] = buildScripts.join('\n');
    }
  }

  // environment-setup: from .env patterns
  if (fs.existsSync(path.join(projectPath, '.env.example'))) {
    result['environment-setup'] = 'See .env.example for required environment variables. Copy to .env and fill in values.';
  } else if (pkg?.scripts?.setup || pkg?.scripts?.configure) {
    result['environment-setup'] = `Run: npm run setup (or configure script defined in package.json)`;
  }

  // testing-before-deploy: from test scripts
  if (pkg?.scripts?.test || pkg?.scripts?.['test:ci']) {
    const testCmd = pkg.scripts['test:ci'] || pkg.scripts.test;
    result['testing-before-deploy'] = `Run: ${testCmd}`;
  }

  // deployment-steps: from workflow
  if (workflow) {
    if (workflow.includes('deploy')) {
      result['deployment-steps'] = 'See .github/workflows for automated deployment steps. Manual: build, test, push Docker image, apply configuration.';
    }
  }

  // post-deployment-checks: from health check patterns
  if (state.artifactInventory.categories.sourceCode.files.some(f => /health|status|ping/.test(f.toLowerCase()))) {
    result['post-deployment-checks'] = 'Verify: curl /health endpoint, check logs, monitor key metrics.';
  }

  // rollback-procedure: from CI/CD or package scripts
  if (pkg?.scripts?.rollback) {
    result['rollback-procedure'] = `Run: npm run rollback`;
  } else if (workflow && workflow.includes('revert')) {
    result['rollback-procedure'] = 'Revert the deployment commit and redeploy previous version.';
  }

  return result;
}

/**
 * Extract API Spec sections
 */
function extractAPISpec(projectPath: string, state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const result: Record<string, string> = {};

  // base-url: from package.json config or common ports
  if (pkg?.description && /api|server/i.test(pkg.description)) {
    const port = pkg.scripts?.dev?.match(/:\d+/) ? pkg.scripts.dev.match(/:\d+/)?.[0] : ':3000';
    result['base-url'] = `http://localhost${port}/api`;
  } else if (process.env.API_BASE_URL) {
    result['base-url'] = process.env.API_BASE_URL;
  }

  // endpoints: from route file patterns
  const hasRoutes = state.artifactInventory.categories.sourceCode.files.some(f =>
    /routes?|controllers?|handlers?/.test(f.toLowerCase())
  );

  if (hasRoutes) {
    result['endpoints'] =
      'API endpoints documented in routes/controllers. ' +
      'Common patterns: GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id';
  }

  // authentication: from common auth patterns
  const hasAuth = state.artifactInventory.categories.sourceCode.files.some(f =>
    /auth|middleware|jwt|passport/.test(f.toLowerCase())
  );

  if (hasAuth) {
    result['authentication'] =
      'API uses token-based authentication (JWT). ' +
      'Include Authorization header: Bearer <token>. ' +
      'Obtain token from /auth/login endpoint.';
  }

  return result;
}

/**
 * Extract Test Plan sections
 */
function extractTestPlan(projectPath: string, state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const result: Record<string, string> = {};

  // test-strategy: from test framework detection
  let testFramework = 'unknown';
  if (pkg?.devDependencies) {
    if (pkg.devDependencies.jest) testFramework = 'Jest';
    else if (pkg.devDependencies.vitest) testFramework = 'Vitest';
    else if (pkg.devDependencies.mocha) testFramework = 'Mocha';
    else if (pkg.devDependencies.playwright) testFramework = 'Playwright (E2E)';
  }

  if (testFramework !== 'unknown') {
    result['test-strategy'] =
      `Testing framework: ${testFramework}. ` +
      `Run: npm test. ` +
      `Strategy: Unit tests for business logic, integration tests for APIs, E2E for critical paths.`;
  }

  // unit-tests: from test file patterns
  const testFiles = state.artifactInventory.categories.tests.files.slice(0, 5);
  if (testFiles.length > 0) {
    result['unit-tests'] =
      `Test files found: ${testFiles.length} files. ` +
      `Pattern: *.test.ts or *.spec.ts. ` +
      `Run: npm test`;
  }

  // coverage-targets: from package.json jest config
  if (pkg && typeof pkg === 'object' && 'jest' in pkg) {
    const jestConfig = (pkg as any).jest;
    if (jestConfig?.collectCoverageFrom) {
      result['coverage-targets'] =
        `Coverage target: ${jestConfig.coverageThreshold?.global?.lines || '80'}% lines. ` +
        `Critical paths: all API endpoints and core business logic.`;
    }
  } else {
    result['coverage-targets'] = 'Recommended: 80%+ line coverage for critical paths.';
  }

  return result;
}

/**
 * Extract Data Model sections
 */
function extractDataModel(projectPath: string, state: VibedocState): Record<string, string> {
  const result: Record<string, string> = {};

  // entity-overview: from models/schema files
  const hasModels = state.artifactInventory.categories.sourceCode.files.some(f =>
    /models?|schema|entities?/.test(f.toLowerCase())
  );

  if (hasModels) {
    result['entity-overview'] =
      'Project includes data models/entities. Primary entities: User, Account, Transaction, etc. ' +
      'See models/ or schema/ directory for definitions.';
  }

  // table-schemas: from migrations or schema files
  const hasMigrations = state.artifactInventory.categories.sourceCode.files.some(f =>
    /migrations?|sql|schema/.test(f.toLowerCase())
  );

  if (hasMigrations) {
    result['table-schemas'] =
      'Database schema defined via migrations. ' +
      'Check migrations/ directory for CREATE TABLE statements and schema changes.';
  }

  return result;
}

/**
 * Extract Threat Model sections
 */
function extractThreatModel(projectPath: string, state: VibedocState): Record<string, string> {
  const claude = readClaudeMd(projectPath);
  const result: Record<string, string> = {};

  // asset-scope: from API and data patterns
  const hasAPI = state.artifactInventory.categories.architecture.files.length > 0 ||
    state.artifactInventory.categories.sourceCode.files.some(f => /routes?|controllers?|endpoints?/.test(f.toLowerCase()));

  const hasData = state.artifactInventory.categories.sourceCode.files.some(f =>
    /database|db|sql|model|schema/.test(f.toLowerCase())
  );

  if (hasAPI || hasData) {
    const assets = [];
    if (hasAPI) assets.push('API endpoints');
    if (hasData) assets.push('user data in database');
    result['asset-scope'] =
      `Critical assets: ${assets.join(', ')}. ` +
      `Entry points: HTTP API endpoints, database connections.`;
  }

  // mitigations: from auth/validation patterns
  const hasAuth = state.artifactInventory.categories.sourceCode.files.some(f =>
    /auth|middleware|jwt|passport|validate/.test(f.toLowerCase())
  );

  if (hasAuth) {
    result['mitigations'] =
      'Implemented: JWT authentication for API access, input validation, ' +
      'rate limiting, HTTPS enforced. ' +
      'Recommended: encryption at rest, audit logging, security headers.';
  }

  return result;
}

/**
 * Extract data for README template.
 * Pulls project name and description from package.json when available.
 */
function extractReadme(projectPath: string, _state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const extracted: Record<string, string> = {};
  if (pkg?.name) {
    extracted.projectName = pkg.name;
  }
  if (pkg?.description) {
    extracted.tagline = pkg.description;
    extracted.overview = pkg.description;
  }
  // Try to surface a reasonable install command for npm packages
  if (pkg?.name) {
    extracted.installation = `\`\`\`bash\nnpm install ${pkg.name}\n\`\`\``;
  }
  return extracted;
}

/**
 * Extract data for Install Guide template.
 * Uses package.json engines field for Node version prerequisites.
 */
function extractInstallGuide(projectPath: string, _state: VibedocState): Record<string, string> {
  const pkg = readPackageJson(projectPath);
  const extracted: Record<string, string> = {};
  const prereqParts: string[] = [];

  if (pkg?.engines?.node) {
    prereqParts.push(`- Node.js ${pkg.engines.node}`);
  }
  if (pkg?.engines && Object.keys(pkg.engines).length > 0) {
    for (const [engine, version] of Object.entries(pkg.engines)) {
      if (engine !== 'node') {
        prereqParts.push(`- ${engine} ${version}`);
      }
    }
  }
  if (prereqParts.length > 0) {
    extracted.prerequisites = prereqParts.join('\n');
  }
  if (pkg?.name) {
    extracted.installSteps = `\`\`\`bash\nnpm install -g ${pkg.name}\n\`\`\``;
  }
  return extracted;
}

/**
 * Extract data for Skill/Command Reference template.
 * Lists SKILL.md files and commands/*.md files from the documentation inventory.
 */
function extractSkillCommandReference(
  _projectPath: string,
  state: VibedocState
): Record<string, string> {
  const extracted: Record<string, string> = {};
  const docFiles = state.artifactInventory?.categories?.documentation?.files ?? [];

  const normalizedDocs = docFiles.map((f) => f.replace(/\\/g, '/'));
  const skillFiles = normalizedDocs.filter((f) => /\/skills\/[^/]+\/SKILL\.md$/i.test(f));
  const commandFiles = normalizedDocs.filter((f) => /\/commands\/[^/]+\.md$/i.test(f));

  if (skillFiles.length > 0) {
    const skillNames = skillFiles.map((f) => {
      const match = f.match(/\/skills\/([^/]+)\//);
      return match ? `- \`${match[1]}\`` : null;
    }).filter(Boolean);
    extracted.skillList = skillNames.join('\n');
  }

  if (commandFiles.length > 0) {
    const commandNames = commandFiles.map((f) => {
      const name = path.basename(f, '.md');
      return `- \`/${name}\``;
    });
    extracted.commandList = commandNames.join('\n');
  }

  return extracted;
}

/**
 * Extract data for Changelog/Contributing template.
 * Minimal — the template is mostly user-filled.
 */
function extractChangelogContributing(
  _projectPath: string,
  _state: VibedocState
): Record<string, string> {
  return {};
}

/**
 * Main extraction function - maps doc type to specific extractor
 */
export function extractDataForDocType(
  docType: string,
  state: VibedocState,
  projectPath: string = process.cwd()
): Record<string, string> {
  logger.info('Extracting data for doc type', { docType });

  try {
    let extracted: Record<string, string> = {};

    switch (docType) {
      case 'runbook':
        extracted = extractRunbook(projectPath, state);
        break;
      case 'adr':
        extracted = extractADR(projectPath, state);
        break;
      case 'deployment-procedure':
        extracted = extractDeploymentProcedure(projectPath, state);
        break;
      case 'api-spec':
        extracted = extractAPISpec(projectPath, state);
        break;
      case 'test-plan':
        extracted = extractTestPlan(projectPath, state);
        break;
      case 'data-model':
        extracted = extractDataModel(projectPath, state);
        break;
      case 'threat-model':
        extracted = extractThreatModel(projectPath, state);
        break;
      case 'readme':
        extracted = extractReadme(projectPath, state);
        break;
      case 'install-guide':
        extracted = extractInstallGuide(projectPath, state);
        break;
      case 'skill-command-reference':
        extracted = extractSkillCommandReference(projectPath, state);
        break;
      case 'changelog-contributing':
        extracted = extractChangelogContributing(projectPath, state);
        break;
      default:
        logger.warn('Unknown doc type for extraction', { docType });
        extracted = {};
    }

    logger.debug('Data extraction complete', {
      docType,
      sectionsExtracted: Object.keys(extracted).length,
    });

    return extracted;
  } catch (error) {
    logger.error('Extraction failed', { docType, error });
    return {};
  }
}
