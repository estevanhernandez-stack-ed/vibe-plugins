/**
 * LLM Prompt Builder
 * Generates structured prompts for LLM-based classification fallback
 */

import { ArtifactInventory } from '../state/schema';
import { CategoryScore, ContextScore, ScoringResult } from './scoring-engine';

/**
 * Build a structured prompt for LLM classification
 * Used when rule-based confidence is < 0.85
 */
export function buildClassificationPrompt(
  inventory: ArtifactInventory,
  ruleResults: ScoringResult
): string {
  const topCategories = ruleResults.categories.slice(0, 3);
  const detectedContexts = ruleResults.contexts.slice(0, 3);

  const projectSummary = buildProjectSummary(inventory);
  const candidateSummary = buildCandidateSummary(topCategories, detectedContexts);

  return `# Project Classification Task

You are an expert software architect reviewing a codebase to determine its primary category and operational contexts.

## Project Scan Summary

${projectSummary}

## Rule Engine Candidates

The rule-based classifier generated these candidates with confidence ${(ruleResults.confidence * 100).toFixed(0)}%:

${candidateSummary}

## Classification Categories

Choose ONE primary category that best describes this project:

- **WebApplication**: A user-facing web application (SPA, server-rendered, etc.)
- **APIMicroservice**: A REST API, GraphQL service, or microservice
- **DataPipeline**: ETL pipelines, data warehouses, batch processors
- **InfrastructurePlatform**: Infrastructure-as-code, deployment systems, cloud platforms
- **MobileApplication**: Native or cross-platform mobile apps
- **AIMLSystem**: ML/AI-focused projects with models, training, inference
- **IntegrationConnector**: Adapters, SDKs, connectors for third-party services
- **ClaudeCodePlugin**: A Claude Code plugin or plugin marketplace — characterized by a .claude-plugin/plugin.json manifest, skills/*/SKILL.md files, commands/*.md files, or a .claude-plugin/marketplace.json. No runtime deployment in the traditional sense; distributed to users via npm or a marketplace.

## Operational Contexts

Identify applicable contexts (can select multiple):

- **Regulated**: Subject to compliance requirements (HIPAA, SOX, PCI, etc.)
- **CustomerFacing**: Public-facing or customer-critical service
- **InternalTooling**: Internal tools, admin dashboards, support systems
- **MultiTenant**: Serves multiple independent customers/tenants
- **EdgeEmbedded**: Runs on edge devices, embedded systems, or IoT

## Your Response

Return a JSON object with this exact structure:
\`\`\`json
{
  "primaryCategory": "string (one of the categories above)",
  "secondaryCategory": "string (optional, for ambiguous cases)",
  "contexts": ["string", "string"],
  "confidence": 0.75,
  "rationale": "Explain your classification in 2-3 sentences"
}
\`\`\`

Focus on the strongest signals in the codebase. If multiple categories are equally plausible, explain the tie-breaker in rationale.
`;
}

function buildProjectSummary(inventory: ArtifactInventory): string {
  const sc = inventory.categories.sourceCode;
  const conf = inventory.categories.configuration;
  const doc = inventory.categories.documentation;
  const tests = inventory.categories.tests;
  const arch = inventory.categories.architecture;
  const infra = inventory.categories.infrastructure;

  const languages = inventory.gitStats.mainLanguages.slice(0, 5).join(', ') || 'Unknown';

  return `
### File Distribution
- Source code: ${sc.count} files (${languages})
- Configuration: ${conf.count} files
- Documentation: ${doc.count} files
- Tests: ${tests.count} files
- Architecture artifacts: ${arch.count} files
- Infrastructure: ${infra.count} files
- **Total artifacts: ${inventory.totalArtifacts}**

### Git Activity
- Total commits: ${inventory.gitStats.totalCommits}
- Contributors: ${inventory.gitStats.contributors}
- Last commit: ${inventory.gitStats.lastCommitDate}

### Top Source Files (Sample)
\`\`\`
${sc.files.slice(0, 5).join('\n')}
${sc.files.length > 5 ? `... and ${sc.files.length - 5} more source files` : ''}
\`\`\`

### Configuration Files (Sample)
\`\`\`
${conf.files.slice(0, 5).join('\n')}
${conf.files.length > 5 ? `... and ${conf.files.length - 5} more config files` : ''}
\`\`\`

### Infrastructure Files (Sample)
\`\`\`
${infra.files.slice(0, 5).join('\n')}
${infra.files.length > 5 ? `... and ${infra.files.length - 5} more infrastructure files` : ''}
\`\`\`
`;
}

function buildCandidateSummary(categories: CategoryScore[], contexts: ContextScore[]): string {
  let summary = '### Categories (Rule Score)\n';
  for (const cat of categories) {
    summary += `- ${cat.category}: ${cat.score.toFixed(1)}\n`;
  }

  if (contexts.length > 0) {
    summary += '\n### Detected Contexts (Rule Score)\n';
    for (const ctx of contexts) {
      summary += `- ${ctx.context}: ${ctx.score.toFixed(1)}\n`;
    }
  }

  return summary;
}
