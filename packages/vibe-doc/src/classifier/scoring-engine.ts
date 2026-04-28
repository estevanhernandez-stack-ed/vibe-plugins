/**
 * Scoring Engine Module
 * Rule-based matrix for categorizing projects and contexts
 */

import { Signal } from './signals';
import { logger } from '../utils/logger';

export enum Category {
  WebApplication = 'WebApplication',
  APIMicroservice = 'APIMicroservice',
  DataPipeline = 'DataPipeline',
  InfrastructurePlatform = 'InfrastructurePlatform',
  MobileApplication = 'MobileApplication',
  AIMLSystem = 'AIMLSystem',
  IntegrationConnector = 'IntegrationConnector',
  ClaudeCodePlugin = 'ClaudeCodePlugin',
}

export enum Context {
  Regulated = 'Regulated',
  CustomerFacing = 'CustomerFacing',
  InternalTooling = 'InternalTooling',
  MultiTenant = 'MultiTenant',
  EdgeEmbedded = 'EdgeEmbedded',
}

export interface CategoryScore {
  category: Category;
  score: number;
}

export interface ContextScore {
  context: Context;
  score: number;
}

export interface ScoringResult {
  categories: CategoryScore[];
  contexts: ContextScore[];
  confidence: number;
}

/**
 * Score classification based on signals
 * @param signals - Array of detected signals
 * @param confidenceThreshold - Threshold for high confidence classification (default: 0.85)
 */
export function scoreClassification(
  signals: Signal[],
  confidenceThreshold: number = 0.85
): ScoringResult {
  const categoryScores: Record<string, number> = {};
  const contextScores: Record<string, number> = {};

  // Initialize scores
  Object.values(Category).forEach((cat) => {
    categoryScores[cat] = 0;
  });
  Object.values(Context).forEach((ctx) => {
    contextScores[ctx] = 0;
  });

  // Apply signal scoring rules
  for (const signal of signals) {
    const w = signal.weight;

    switch (signal.name) {
      // Web framework signals
      case 'has-express-routes':
        categoryScores[Category.WebApplication] += 3 * w;
        categoryScores[Category.APIMicroservice] += 3 * w;
        break;

      // Frontend signals
      case 'has-react-components':
        categoryScores[Category.WebApplication] += 4 * w;
        break;

      // Infrastructure signals
      case 'has-dockerfile':
        Object.values(Category).forEach((cat) => {
          categoryScores[cat] += 1 * w;
        });
        break;

      case 'has-terraform':
        categoryScores[Category.InfrastructurePlatform] += 4 * w;
        break;

      // Python web framework signals
      case 'has-flask-fastapi-django':
        categoryScores[Category.WebApplication] += 3 * w;
        categoryScores[Category.APIMicroservice] += 3 * w;
        break;

      // ML signals
      case 'has-ml-model-files':
        categoryScores[Category.AIMLSystem] += 5 * w;
        break;

      case 'has-ml-dependencies':
        categoryScores[Category.AIMLSystem] += 4 * w;
        break;

      // Data pipeline signals
      case 'has-etl-pipeline-keywords':
        categoryScores[Category.DataPipeline] += 4 * w;
        break;

      // Mobile signals
      case 'has-mobile-configs':
        categoryScores[Category.MobileApplication] += 5 * w;
        break;

      // Integration signals
      case 'has-third-party-api-clients':
        categoryScores[Category.IntegrationConnector] += 3 * w;
        break;

      // Context signals
      case 'has-compliance-requirements':
        contextScores[Context.Regulated] += 5 * w;
        break;

      case 'has-rbac-tenant-patterns':
        contextScores[Context.MultiTenant] += 3 * w;
        break;

      case 'has-sla-uptime-mentions':
        contextScores[Context.CustomerFacing] += 3 * w;
        break;

      case 'has-internal-tooling':
        contextScores[Context.InternalTooling] += 3 * w;
        break;

      // Quality signals
      case 'has-tests':
        // Boost all categories slightly
        Object.values(Category).forEach((cat) => {
          categoryScores[cat] += 0.5 * w;
        });
        break;

      case 'has-api-spec':
        categoryScores[Category.APIMicroservice] += 3 * w;
        categoryScores[Category.WebApplication] += 1 * w;
        break;

      case 'has-microservices-pattern':
        categoryScores[Category.APIMicroservice] += 2 * w;
        categoryScores[Category.InfrastructurePlatform] += 1 * w;
        break;

      case 'has-database-orm':
        categoryScores[Category.WebApplication] += 1 * w;
        categoryScores[Category.APIMicroservice] += 1.5 * w;
        categoryScores[Category.DataPipeline] += 1 * w;
        break;

      case 'has-monitoring-logging':
        categoryScores[Category.InfrastructurePlatform] += 2 * w;
        contextScores[Context.CustomerFacing] += 1 * w;
        break;

      // New 626Labs-specific signals
      case 'has-firebase':
        categoryScores[Category.WebApplication] += 3 * w;
        categoryScores[Category.APIMicroservice] += 2 * w;
        break;

      case 'has-vite-config':
        categoryScores[Category.WebApplication] += 2 * w;
        break;

      case 'has-tailwind':
        categoryScores[Category.WebApplication] += 1 * w;
        break;

      case 'has-nextjs-nuxt':
        categoryScores[Category.WebApplication] += 4 * w;
        break;

      case 'has-cloud-functions':
        categoryScores[Category.APIMicroservice] += 3 * w;
        categoryScores[Category.WebApplication] += 1 * w;
        break;

      case 'has-ai-sdk':
        categoryScores[Category.AIMLSystem] += 3 * w;
        categoryScores[Category.WebApplication] += 1 * w;
        break;

      case 'has-mcp-server':
        categoryScores[Category.APIMicroservice] += 2 * w;
        categoryScores[Category.IntegrationConnector] += 2 * w;
        break;

      case 'has-state-management':
        categoryScores[Category.WebApplication] += 2 * w;
        break;

      case 'has-e2e-testing':
        Object.values(Category).forEach((cat) => {
          categoryScores[cat] += 0.5 * w;
        });
        break;

      case 'has-github-actions':
        contextScores[Context.InternalTooling] += 1 * w;
        break;

      // Claude Code Plugin signals
      // Weighted to dominate: plugin.json is an unambiguous marker that
      // overrides any incidental web/framework signals in the repo.
      case 'has-claude-plugin-manifest':
        categoryScores[Category.ClaudeCodePlugin] += 20 * w;
        break;

      case 'has-claude-skill-files':
        categoryScores[Category.ClaudeCodePlugin] += 8 * w;
        break;

      case 'has-claude-command-files':
        categoryScores[Category.ClaudeCodePlugin] += 6 * w;
        break;

      case 'has-claude-marketplace':
        categoryScores[Category.ClaudeCodePlugin] += 10 * w;
        break;

      default:
        logger.warn(`Unknown signal: ${signal.name}`);
    }
  }

  // Build sorted category results
  const sortedCategories = Object.entries(categoryScores)
    .map(([category, score]) => ({
      category: category as Category,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  // Build context results (filter out zero scores)
  const activeContexts = Object.entries(contextScores)
    .filter(([_, score]) => score > 0)
    .map(([context, score]) => ({
      context: context as Context,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  // Calculate confidence using 2x gap rule
  let confidence = 0;
  if (sortedCategories.length >= 2) {
    const gap = sortedCategories[0].score - sortedCategories[1].score;
    const maxScore = sortedCategories[0].score;
    confidence = gap > maxScore * (1 - confidenceThreshold) ? 1.0 : 0.5;
  } else if (sortedCategories.length === 1 && sortedCategories[0].score > 0) {
    confidence = 1.0;
  }

  return {
    categories: sortedCategories,
    contexts: activeContexts,
    confidence,
  };
}
