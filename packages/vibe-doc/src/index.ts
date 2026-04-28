#!/usr/bin/env node

/**
 * Vibe Doc CLI
 * Main entry point for documentation generation pipeline
 */

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import { logger } from './utils/logger';
import { scan } from './scanner';
import { readState, writeState, initState } from './state';
import { classify } from './classifier';
import { analyzeGaps } from './gap-analyzer';
import { generateDocument } from './generator';
import { RenderData, loadTemplate, listTemplates } from './templates';
import { checkForUpdates, downloadTemplate } from './templates/registry';
import { extractDataForDocType } from './generator/extractor';
import * as ui from './utils/ui';
import ora = require('ora');

const program = new Command();

const pkgJsonPath = path.resolve(__dirname, '..', 'package.json');
const pkgContents = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
const pkgVersion = pkgContents.version;

// Check npm registry for a newer version of vibe-doc once per day.
// Runs in the background, non-blocking. If a newer version is available,
// update-notifier prints a boxed message on the NEXT invocation.
// Respects the NO_UPDATE_NOTIFIER env var and CI environments.
try {
  updateNotifier({
    pkg: { name: pkgContents.name, version: pkgVersion },
    updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
  }).notify({ defer: true, isGlobal: true });
} catch {
  // update-notifier failures should never block CLI usage — silently ignore
}

program
  .name('vibe-doc')
  .description('AI-powered documentation gap analyzer for any codebase')
  .version(pkgVersion);

/**
 * Scan command: Run artifact scanner and save inventory
 */
program
  .command('scan [projectPath]')
  .description('Scan a project and analyze its artifacts')
  .option(
    '-c, --confidence-threshold <number>',
    'Classification confidence threshold (0-1, default: 0.85)',
    '0.85'
  )
  .option(
    '--profile <path>',
    'Path to interview answers JSON file to populate project profile'
  )
  .action(async (projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const confidenceThreshold = parseFloat(options.confidenceThreshold);

    try {
      ui.printBanner(pkgVersion);
      logger.info('Starting vibe-doc scan', { projectPath: resolvedPath });

      // Initialize state
      let state = readState(resolvedPath) || initState();
      state.lastScan = new Date().toISOString();

      // Load interview answers from profile if provided
      if (options.profile) {
        try {
          const profilePath = path.resolve(options.profile);
          const profileContent = fs.readFileSync(profilePath, 'utf-8');
          const profileData = JSON.parse(profileContent);

          // Populate interviewAnswers with provided data, using defaults for missing fields
          state.projectProfile.interviewAnswers = {
            projectName: profileData.projectName || '',
            projectDescription: profileData.projectDescription || '',
            mainPurpose: profileData.mainPurpose || '',
            primaryUsers: profileData.primaryUsers || '',
            coreFeatures: profileData.coreFeatures || [],
            technologies: profileData.technologies || [],
            deploymentModel: profileData.deploymentModel || '',
            architectureStyle: profileData.architectureStyle || '',
          };

          // Set providedContext flag
          state.projectProfile.providedContext = 'profile';

          logger.info('Loaded interview answers from profile', { path: profilePath });
        } catch (error) {
          logger.warn('Failed to load profile file', { path: options.profile, error });
          // Continue without profile data - not a fatal error
        }
      }

      // Run scanner
      const scanSpinner = ora({ text: 'Scanning project artifacts...', color: 'cyan' }).start();
      logger.info('Running artifact inventory scan...');
      state.artifactInventory = await scan(resolvedPath);
      scanSpinner.succeed(`Scanned ${state.artifactInventory.totalArtifacts} artifacts`);

      // Run classifier
      const classifySpinner = ora({ text: 'Classifying project type...', color: 'cyan' }).start();
      logger.info('Running hybrid classification...');
      const classificationResult = classify(state.artifactInventory, { confidenceThreshold });

      if (classificationResult.resolved) {
        state.classification = classificationResult.classification!;
        classifySpinner.succeed(`Classified: ${state.classification.primaryCategory} (${(state.classification.confidence * 100).toFixed(0)}% confidence)`);
        logger.info('Classification complete', {
          category: state.classification.primaryCategory,
          confidence: state.classification.confidence,
        });
      } else {
        // Low confidence - use best candidate classification with LLM review available
        state.classification = classificationResult.classification!;
        classifySpinner.warn(`Low-confidence: ${state.classification.primaryCategory} (${(state.classification.confidence * 100).toFixed(0)}%)`);
        logger.info('Low confidence classification, LLM prompt available', {
          category: state.classification.primaryCategory,
          confidence: state.classification.confidence,
        });
      }

      // Run gap analyzer
      const gapSpinner = ora({ text: 'Analyzing documentation gaps...', color: 'cyan' }).start();
      logger.info('Running gap analyzer...');
      state.gapReport = analyzeGaps(state.classification, state.artifactInventory);
      gapSpinner.succeed(`Gap analysis complete — ${state.gapReport.summary.coveragePercent}% coverage`);

      // Save state
      writeState(resolvedPath, state);

      logger.info('Scan complete', {
        category: state.classification.primaryCategory,
        docsCovered: state.gapReport.summary.docsCovered,
        docsMissing: state.gapReport.summary.docsMissing,
        coverage: `${state.gapReport.summary.coveragePercent}%`,
      });

      // Output summary
      ui.heading('Scan Complete');
      ui.label('Project', resolvedPath);
      ui.label('Category', state.classification.primaryCategory);
      ui.label('Confidence', `${(state.classification.confidence * 100).toFixed(0)}%`);
      console.log('');
      ui.label('Coverage', ui.coverageColor(state.gapReport.summary.coveragePercent));
      ui.success(`Covered: ${state.gapReport.summary.docsCovered}`);
      ui.warn(`Partial: ${state.gapReport.summary.docsPartial}`);
      ui.fail(`Missing: ${state.gapReport.summary.docsMissing}`);
      console.log('');
      ui.dim(`State saved to ${path.join(resolvedPath, '.vibe-doc', 'state.json')}`);
      console.log('');
    } catch (error) {
      logger.error('Scan failed', { error });
      process.exit(1);
    }
  });

/**
 * Report command: Display gap analysis report
 */
program
  .command('report [projectPath]')
  .description('Display documentation gap report')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);
      if (!state) {
        console.error(
          'No vibe-doc state found. Run "vibe-doc scan" first.'
        );
        process.exit(1);
      }

      ui.printBanner(pkgVersion);
      ui.heading('Documentation Gap Report');
      ui.label('Category', state.classification.primaryCategory);
      ui.label('Confidence', `${(state.classification.confidence * 100).toFixed(0)}%`);
      console.log('');

      const byTier: Record<string, (typeof state.gapReport.gaps)[0][]> = {
        required: [],
        recommended: [],
        optional: [],
      };

      for (const gap of state.gapReport.gaps) {
        if (!byTier[gap.tier]) {
          byTier[gap.tier] = [];
        }
        byTier[gap.tier].push(gap);
      }

      for (const tier of ['required', 'recommended', 'optional']) {
        ui.gapTable(byTier[tier] || [], tier);
      }

      ui.label('Overall Coverage', ui.coverageColor(state.gapReport.summary.coveragePercent));
      console.log('');
    } catch (error) {
      logger.error('Report failed', { error });
      process.exit(1);
    }
  });

/**
 * Status command: Check current state
 */
program
  .command('status [projectPath]')
  .description('Check vibe-doc status')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);

      if (!state) {
        console.log('No vibe-doc state found. Run "vibe-doc scan" to initialize.');
        return;
      }

      ui.printBanner(pkgVersion);
      ui.heading('Vibe Doc Status');
      ui.label('Last scan', new Date(state.lastScan).toLocaleString());
      ui.label('Artifacts', String(state.artifactInventory.totalArtifacts));
      ui.label('Category', state.classification.primaryCategory);
      ui.label('Coverage', `${ui.coverageColor(state.gapReport.summary.coveragePercent)} (${state.gapReport.summary.docsCovered} covered, ${state.gapReport.summary.docsMissing} missing)`);
      console.log('');
    } catch (error) {
      logger.error('Status check failed', { error });
      process.exit(1);
    }
  });

/**
 * Confirm command: Mark classification as user-confirmed
 */
program
  .command('confirm [projectPath]')
  .description('Confirm the classification and mark as approved by user')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);
      if (!state) {
        console.error('No vibe-doc state found. Run "vibe-doc scan" first.');
        process.exit(1);
      }

      state.classification.userConfirmed = true;
      writeState(resolvedPath, state);

      logger.info('Classification confirmed', {
        category: state.classification.primaryCategory,
      });

      ui.heading('Classification Confirmed');
      ui.success(`Category "${state.classification.primaryCategory}" has been confirmed by user.`);
      console.log('');
    } catch (error) {
      logger.error('Confirmation failed', { error });
      process.exit(1);
    }
  });

/**
 * Check command: CI-safe documentation check
 */
program
  .command('check [projectPath]')
  .description('CI-safe documentation check')
  .option('-t, --threshold <commits>', 'Staleness threshold in commits', '20')
  .action(async (projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const threshold = parseInt(options.threshold, 10);

    try {
      const { runCheck } = await import('./checker');
      const result = await runCheck(resolvedPath, { threshold });

      ui.printBanner(pkgVersion);
      ui.heading('Documentation Check');
      if (result.pass) {
        ui.success(result.details);
      } else {
        ui.fail(result.details);
      }
      console.log('');

      if (!result.pass) {
        process.exit(result.exitCode);
      }
    } catch (error) {
      logger.error('Check failed', { error });
      process.exit(1);
    }
  });

/**
 * Generate command: Generate a document from template
 */
program
  .command('generate <docType> [projectPath]')
  .description('Generate a document from template')
  .option('-f, --format <format>', 'Output format: md, docx, or both', 'both')
  .option('-a, --answers <answers.json>', 'Path to answers JSON file')
  .action(async (docType: string, projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const format = options.format as 'md' | 'docx' | 'both';

    try {
      ui.printBanner(pkgVersion);
      logger.info('Starting document generation', { docType, format });

      // Read state
      const state = readState(resolvedPath);
      if (!state) {
        ui.fail('No vibe-doc state found. Run "vibe-doc scan" first.');
        process.exit(1);
      }

      // Load answers if provided
      let userAnswers: Record<string, string> = {};
      if (options.answers) {
        const answersPath = path.resolve(options.answers);
        try {
          const content = fs.readFileSync(answersPath, 'utf-8');
          userAnswers = JSON.parse(content);
          logger.debug('Loaded user answers', { path: answersPath });
        } catch (error) {
          logger.warn('Failed to load answers file', { path: answersPath, error });
        }
      }

      // Extract data from artifacts
      const extractedData = extractDataForDocType(docType, state, resolvedPath);

      // Build render data
      const renderData: RenderData = {
        extracted: extractedData,
        user: userAnswers,
        metadata: {
          docType,
          generatedAt: new Date().toISOString(),
          classification: state.classification.primaryCategory,
          sourceArtifacts: state.artifactInventory.totalArtifacts,
        },
      };

      // Generate document
      const genSpinner = ora({ text: `Generating ${docType}...`, color: 'cyan' }).start();
      const result = await generateDocument(docType, resolvedPath, state, renderData, format);
      genSpinner.succeed(`Generated ${docType} v${result.version}`);

      // Save updated state
      writeState(resolvedPath, state);

      // Output summary
      ui.heading('Document Generated');
      ui.label('Document', docType);
      ui.label('Version', String(result.version));
      ui.label('Format(s)', format);
      console.log('');
      for (const filePath of result.paths) {
        ui.filePath(filePath);
      }
      console.log('');
    } catch (error) {
      logger.error('Generation failed', { error });
      process.exit(1);
    }
  });

/**
 * Templates command group: Manage document templates
 */
const templatesCmd = program.command('templates').description('Manage document templates');

templatesCmd
  .command('list')
  .description('List all available document templates')
  .action(() => {
    try {
      const embeddedTemplates = listTemplates();
      const cacheDir = path.join(process.cwd(), '.vibe-doc');
      const cachedPath = path.join(cacheDir, 'templates');

      ui.printBanner(pkgVersion);
      ui.heading('Available Templates');

      console.log('  EMBEDDED (Built-in):');
      for (const template of embeddedTemplates) {
        ui.success(template);
      }

      // Check for cached remote templates
      if (fs.existsSync(cachedPath)) {
        const cachedFiles = fs.readdirSync(cachedPath).filter((f) => f.endsWith('.md'));
        const cachedTemplates = cachedFiles.map((f) => f.replace(/\.md$/, ''));
        const remoteOnly = cachedTemplates.filter((t) => !embeddedTemplates.includes(t));

        if (remoteOnly.length > 0) {
          console.log('');
          console.log('  REMOTE (Cached):');
          for (const template of remoteOnly) {
            ui.success(template);
          }
        }
      }
      console.log('');
    } catch (error) {
      logger.error('Template list failed', { error });
      process.exit(1);
    }
  });

program.parse(process.argv);
