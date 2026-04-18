#!/usr/bin/env node
/**
 * @esthernandez/vibe-test-cli — headless CLI entry point.
 *
 * Routes deterministic subcommands (audit, coverage, gate, posture) to the
 * corresponding command modules. Generate / fix require LLM reasoning and
 * are explicitly plugin-only in v0.2 — they exit 2 with a clear message.
 *
 * CI mode: any command auto-detects `GITHUB_ACTIONS=true` (or accepts `--ci`)
 * and emits annotation lines via `src/stdout-protocol.ts`.
 */

import { Command } from 'commander';

import { runAuditCommand } from './commands/audit.js';
import { runCoverageCommand } from './commands/coverage.js';
import { runGateCommand } from './commands/gate.js';
import { runPostureCommand } from './commands/posture.js';

const PLUGIN_ONLY_MESSAGE =
  '`generate` and `fix` require an LLM and are plugin-only in v0.2. Run `/vibe-test:generate` inside Claude Code, or wait for v0.3 headless mode (ANTHROPIC_API_KEY).';

export interface RunCliInput {
  argv?: string[];
  /** Override exit handler — used by tests so we don't actually call process.exit. */
  exit?: (code: number) => void;
}

export async function runCli(input: RunCliInput = {}): Promise<number> {
  const program = new Command();
  let resolvedExitCode = 0;

  program
    .name('vibe-test')
    .description('Vibe Test CLI — deterministic audit / coverage / gate / posture for CI.')
    .version('0.2.0')
    .exitOverride();

  program
    .command('audit')
    .description('Run the deterministic audit (scanner + classifier + reporter). No LLM.')
    .option('--path <glob>', 'restrict scan to a path glob')
    .option('--out <dir>', 'output directory for markdown report (default: docs/vibe-test/)')
    .option('--cwd <dir>', 'project root (default: process.cwd())')
    .option('--ci', 'force CI annotation mode (auto-detected from GITHUB_ACTIONS=true)')
    .action(async (opts) => {
      const result = await runAuditCommand(opts);
      resolvedExitCode = result.exitCode;
    });

  program
    .command('coverage')
    .description('Run c8 --all over the project test command. Deterministic, no adaptation prompt.')
    .option('--out <dir>', 'output directory for json sidecar (default: docs/vibe-test/)')
    .option('--cwd <dir>', 'project root (default: process.cwd())')
    .option('--ci', 'force CI annotation mode')
    .option('--test-command <cmd>', 'override the test command c8 wraps (default: npm test)')
    .action(async (opts) => {
      const result = await runCoverageCommand(opts);
      resolvedExitCode = result.exitCode;
    });

  program
    .command('gate')
    .description(
      'Audit + coverage + threshold check. Exit 0 pass, 1 threshold breach, 2 tool error. Emits GH Actions annotations under --ci or GITHUB_ACTIONS=true.',
    )
    .option('--cwd <dir>', 'project root (default: process.cwd())')
    .option('--ci', 'force CI annotation mode')
    .option('--tier <tier>', 'override tier threshold (prototype|internal|public-facing|customer-facing-saas|regulated)')
    .option('--test-command <cmd>', 'override the test command c8 wraps')
    .action(async (opts) => {
      const result = await runGateCommand(opts);
      resolvedExitCode = result.exitCode;
    });

  program
    .command('posture')
    .description('Read-only ambient state summary (<=40 lines, <3s).')
    .option('--cwd <dir>', 'project root (default: process.cwd())')
    .option('--ci', 'force CI annotation mode')
    .action(async (opts) => {
      const result = await runPostureCommand(opts);
      resolvedExitCode = result.exitCode;
    });

  program
    .command('generate')
    .description('(plugin-only in v0.2) Generate tests for audit gaps. Use /vibe-test:generate in Claude Code.')
    .allowUnknownOption(true)
    .action(() => {
      process.stderr.write(`vibe-test: ${PLUGIN_ONLY_MESSAGE}\n`);
      resolvedExitCode = 2;
    });

  program
    .command('fix')
    .description('(plugin-only in v0.2) Diagnose + repair failing tests. Use /vibe-test:fix in Claude Code.')
    .allowUnknownOption(true)
    .action(() => {
      process.stderr.write(`vibe-test: ${PLUGIN_ONLY_MESSAGE}\n`);
      resolvedExitCode = 2;
    });

  try {
    await program.parseAsync(input.argv ?? process.argv);
  } catch (err) {
    // commander.exitOverride throws when help / version is requested or invalid args.
    const e = err as { code?: string; exitCode?: number; message?: string };
    if (e.code === 'commander.helpDisplayed' || e.code === 'commander.version') {
      resolvedExitCode = 0;
    } else if (typeof e.exitCode === 'number') {
      process.stderr.write(`${e.message ?? 'commander error'}\n`);
      resolvedExitCode = e.exitCode;
    } else {
      process.stderr.write(`vibe-test: unexpected error: ${e.message ?? String(err)}\n`);
      resolvedExitCode = 2;
    }
  }

  return resolvedExitCode;
}

// Auto-invoke when used as the bin script. The bundler emits this as CJS so
// `require.main === module` is the canonical check. We guard with a typeof so
// importing from tests (which use the function `runCli` directly) won't trigger
// the side-effect path.
declare const require: { main?: unknown };
declare const module: { exports?: unknown };

if (typeof require !== 'undefined' && require.main === module) {
  runCli()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      process.stderr.write(
        `vibe-test: fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    });
}
