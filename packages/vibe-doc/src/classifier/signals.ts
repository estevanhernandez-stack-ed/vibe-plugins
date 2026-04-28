/**
 * Signal Extraction Module
 * Extracts named observations from scan results with weights
 */

import { ArtifactInventory } from '../state/schema';
import { logger } from '../utils/logger';

export interface Signal {
  name: string;
  source: string;
  weight: number;
}

/**
 * Extract signals from artifact inventory
 * Each signal is a named observation with a source and weight
 */
export function extractSignals(inventory: ArtifactInventory): Signal[] {
  const signals: Signal[] = [];

  // Normalize paths to forward slashes before any substring matching —
  // otherwise Windows backslash paths break signal detection for anything
  // that looks across path components (.github/workflows, .claude-plugin/...)
  const norm = (s: string) => s.replace(/\\/g, '/').toLowerCase();

  // Source code patterns
  const sourceFiles = norm(inventory.categories.sourceCode.files.join('|'));
  const configFiles = norm(inventory.categories.configuration.files.join('|'));
  const infraFiles = norm(inventory.categories.infrastructure.files.join('|'));
  const docFiles = norm(inventory.categories.documentation.files.join('|'));
  const allFiles = norm(
    inventory.categories.sourceCode.files
      .concat(inventory.categories.configuration.files)
      .concat(inventory.categories.infrastructure.files)
      .concat(inventory.categories.documentation.files)
      .join('|')
  );

  // Express/Fastify/Koa routes
  if (sourceFiles.includes('routes') || sourceFiles.includes('controller')) {
    if (
      allFiles.includes('express') ||
      allFiles.includes('fastify') ||
      allFiles.includes('koa')
    ) {
      signals.push({
        name: 'has-express-routes',
        source: 'code-scanner',
        weight: 3,
      });
    }
  }

  // React/Vue/Svelte components
  if (
    sourceFiles.includes('.tsx') ||
    sourceFiles.includes('.jsx') ||
    sourceFiles.includes('.vue') ||
    sourceFiles.includes('.svelte')
  ) {
    signals.push({
      name: 'has-react-components',
      source: 'file-scanner',
      weight: 4,
    });
  }

  // Dockerfile
  if (infraFiles.includes('dockerfile')) {
    signals.push({
      name: 'has-dockerfile',
      source: 'file-scanner',
      weight: 1,
    });
  }

  // Terraform
  if (infraFiles.includes('.tf')) {
    signals.push({
      name: 'has-terraform',
      source: 'file-scanner',
      weight: 4,
    });
  }

  // Flask/FastAPI/Django
  if (
    allFiles.includes('flask') ||
    allFiles.includes('fastapi') ||
    allFiles.includes('django')
  ) {
    if (sourceFiles.includes('.py')) {
      signals.push({
        name: 'has-flask-fastapi-django',
        source: 'code-scanner',
        weight: 3,
      });
    }
  }

  // ML model files
  if (sourceFiles.includes('.pkl') || sourceFiles.includes('.h5') || sourceFiles.includes('.onnx')) {
    signals.push({
      name: 'has-ml-model-files',
      source: 'file-scanner',
      weight: 5,
    });
  }

  // ML dependencies
  if (
    allFiles.includes('torch') ||
    allFiles.includes('tensorflow') ||
    allFiles.includes('transformers') ||
    allFiles.includes('sklearn')
  ) {
    signals.push({
      name: 'has-ml-dependencies',
      source: 'code-scanner',
      weight: 4,
    });
  }

  // ETL pipeline keywords
  if (
    sourceFiles.includes('pipeline') ||
    sourceFiles.includes('etl') ||
    sourceFiles.includes('dag') ||
    sourceFiles.includes('airflow')
  ) {
    signals.push({
      name: 'has-etl-pipeline-keywords',
      source: 'code-scanner',
      weight: 4,
    });
  }

  // Mobile configs
  if (
    infraFiles.includes('info.plist') ||
    infraFiles.includes('androidmanifest.xml') ||
    configFiles.includes('build.gradle')
  ) {
    signals.push({
      name: 'has-mobile-configs',
      source: 'file-scanner',
      weight: 5,
    });
  }

  // Third-party API clients (no routes)
  if (
    (sourceFiles.includes('client') || sourceFiles.includes('adapter')) &&
    !sourceFiles.includes('routes')
  ) {
    if (
      allFiles.includes('axios') ||
      allFiles.includes('fetch') ||
      allFiles.includes('requests') ||
      allFiles.includes('httpx')
    ) {
      signals.push({
        name: 'has-third-party-api-clients',
        source: 'code-scanner',
        weight: 3,
      });
    }
  }

  // Compliance signals
  const complianceText = allFiles.toLowerCase();
  if (
    complianceText.includes('hipaa') ||
    complianceText.includes('sox') ||
    complianceText.includes('pci')
  ) {
    signals.push({
      name: 'has-compliance-requirements',
      source: 'artifact-scanner',
      weight: 5,
    });
  }

  // RBAC/MultiTenant
  if (
    sourceFiles.includes('rbac') ||
    sourceFiles.includes('tenant') ||
    sourceFiles.includes('permission') ||
    sourceFiles.includes('role')
  ) {
    signals.push({
      name: 'has-rbac-tenant-patterns',
      source: 'code-scanner',
      weight: 3,
    });
  }

  // SLA/Uptime signals
  if (
    docFiles.includes('sla') ||
    sourceFiles.includes('uptime') ||
    sourceFiles.includes('metrics') ||
    sourceFiles.includes('monitoring')
  ) {
    signals.push({
      name: 'has-sla-uptime-mentions',
      source: 'artifact-scanner',
      weight: 3,
    });
  }

  // Internal/Tooling signals
  if (
    sourceFiles.includes('admin') ||
    sourceFiles.includes('internal') ||
    sourceFiles.includes('tool') ||
    sourceFiles.includes('utility')
  ) {
    signals.push({
      name: 'has-internal-tooling',
      source: 'code-scanner',
      weight: 3,
    });
  }

  // Test coverage signal
  if (inventory.categories.tests.count > 0) {
    signals.push({
      name: 'has-tests',
      source: 'file-scanner',
      weight: 2,
    });
  }

  // API spec signal
  if (configFiles.includes('swagger') || configFiles.includes('openapi')) {
    signals.push({
      name: 'has-api-spec',
      source: 'file-scanner',
      weight: 3,
    });
  }

  // Microservices patterns
  if (sourceFiles.includes('service') && sourceFiles.includes('message')) {
    signals.push({
      name: 'has-microservices-pattern',
      source: 'code-scanner',
      weight: 2,
    });
  }

  // Database/ORM signals
  if (
    allFiles.includes('prisma') ||
    allFiles.includes('typeorm') ||
    allFiles.includes('sqlalchemy') ||
    allFiles.includes('mongoose')
  ) {
    signals.push({
      name: 'has-database-orm',
      source: 'code-scanner',
      weight: 2,
    });
  }

  // Monitoring/Logging
  if (
    allFiles.includes('prometheus') ||
    allFiles.includes('grafana') ||
    allFiles.includes('datadog') ||
    allFiles.includes('sentry') ||
    allFiles.includes('winston') ||
    allFiles.includes('pino')
  ) {
    signals.push({
      name: 'has-monitoring-logging',
      source: 'code-scanner',
      weight: 2,
    });
  }

  // New 626Labs-specific signals

  // Firebase/Firestore
  if (configFiles.includes('firebase') || allFiles.includes('firestore') || allFiles.includes('firebase')) {
    signals.push({
      name: 'has-firebase',
      source: 'file-scanner',
      weight: 3,
    });
  }

  // Vite config
  if (configFiles.includes('vite.config')) {
    signals.push({
      name: 'has-vite-config',
      source: 'file-scanner',
      weight: 2,
    });
  }

  // Tailwind CSS
  if (configFiles.includes('tailwind')) {
    signals.push({
      name: 'has-tailwind',
      source: 'file-scanner',
      weight: 1,
    });
  }

  // Next.js / Nuxt
  if (configFiles.includes('next.config') || configFiles.includes('nuxt.config')) {
    signals.push({
      name: 'has-nextjs-nuxt',
      source: 'file-scanner',
      weight: 4,
    });
  }

  // Cloud Functions
  if (sourceFiles.includes('functions/')) {
    signals.push({
      name: 'has-cloud-functions',
      source: 'file-scanner',
      weight: 3,
    });
  }

  // AI SDK
  if (allFiles.includes('genkit') || allFiles.includes('@ai-sdk')) {
    signals.push({
      name: 'has-ai-sdk',
      source: 'code-scanner',
      weight: 3,
    });
  }

  // MCP Server
  if (sourceFiles.includes('mcp-server') || allFiles.includes('mcp')) {
    signals.push({
      name: 'has-mcp-server',
      source: 'file-scanner',
      weight: 2,
    });
  }

  // State Management
  if (allFiles.includes('zustand') || allFiles.includes('redux')) {
    signals.push({
      name: 'has-state-management',
      source: 'code-scanner',
      weight: 2,
    });
  }

  // E2E Testing
  if (allFiles.includes('playwright') || allFiles.includes('cypress')) {
    signals.push({
      name: 'has-e2e-testing',
      source: 'file-scanner',
      weight: 0.5,
    });
  }

  // GitHub Actions
  if (configFiles.includes('.github/workflows')) {
    signals.push({
      name: 'has-github-actions',
      source: 'file-scanner',
      weight: 1,
    });
  }

  // Claude Code Plugin manifest — the dominant signal for plugin repos.
  // Path-anchored to avoid false positives on stray files named plugin.json.
  if (
    configFiles.includes('.claude-plugin/plugin.json') ||
    allFiles.includes('.claude-plugin/plugin.json')
  ) {
    signals.push({
      name: 'has-claude-plugin-manifest',
      source: 'file-scanner',
      weight: 10,
    });
  }

  // Claude Code marketplace manifest (multi-plugin repo)
  if (
    configFiles.includes('.claude-plugin/marketplace.json') ||
    allFiles.includes('.claude-plugin/marketplace.json')
  ) {
    signals.push({
      name: 'has-claude-marketplace',
      source: 'file-scanner',
      weight: 8,
    });
  }

  // SKILL.md files under a skills/ directory (plugin skill surface)
  if (docFiles.match(/\/skills\/[^/|]+\/skill\.md/)) {
    signals.push({
      name: 'has-claude-skill-files',
      source: 'file-scanner',
      weight: 6,
    });
  }

  // Command markdown files under a commands/ directory
  if (docFiles.match(/\/commands\/[^/|]+\.md/)) {
    signals.push({
      name: 'has-claude-command-files',
      source: 'file-scanner',
      weight: 5,
    });
  }

  logger.debug(`Extracted ${signals.length} signals from inventory`);
  return signals;
}
