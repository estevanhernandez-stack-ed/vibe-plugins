import chalk = require('chalk');
import Table = require('cli-table3');

const BANNER = [
  '',
  chalk.cyan('  📖  Vibe Doc'),
  chalk.dim('  AI-powered documentation gap analyzer'),
  '',
];

export function printBanner(version?: string): void {
  for (const line of BANNER) {
    console.log(line);
  }
  if (version) {
    console.log(chalk.dim(`  v${version}`));
    console.log('');
  }
}

export function heading(text: string): void {
  console.log('');
  console.log(chalk.bold.cyan(`  ${text}`));
  console.log(chalk.dim(`  ${'━'.repeat(text.length)}`));
  console.log('');
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.dim(key + ':')} ${value}`);
}

export function success(text: string): void {
  console.log(`  ${chalk.green('✓')} ${text}`);
}

export function warn(text: string): void {
  console.log(`  ${chalk.yellow('⚠')} ${text}`);
}

export function fail(text: string): void {
  console.log(`  ${chalk.red('✗')} ${text}`);
}

export function dim(text: string): void {
  console.log(chalk.dim(`  ${text}`));
}

export function tierStatus(found: number, missing: number): string {
  if (missing === 0) return chalk.green('✅ Exists');
  if (found === 0) return chalk.red('❌ Missing');
  return chalk.yellow('⚠️  Partial');
}

export function coverageColor(percent: number): string {
  if (percent >= 80) return chalk.green(`${percent}%`);
  if (percent >= 50) return chalk.yellow(`${percent}%`);
  return chalk.red(`${percent}%`);
}

export function gapTable(gaps: Array<{ docType: string; found: number; missing: number; rationale: string }>, tier: string): void {
  if (gaps.length === 0) return;

  const tierColors: Record<string, (s: string) => string> = {
    required: chalk.red.bold,
    recommended: chalk.yellow.bold,
    optional: chalk.dim,
  };
  const colorFn = tierColors[tier] || chalk.white;

  console.log(`  ${colorFn(tier.charAt(0).toUpperCase() + tier.slice(1))}:`);
  console.log('');

  const table = new Table({
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    },
    style: { 'padding-left': 1, 'padding-right': 1, head: ['cyan'] },
    head: ['Doc', 'Status', 'Notes'],
    colWidths: [25, 14, 50],
  });

  for (const gap of gaps) {
    table.push([
      gap.docType,
      tierStatus(gap.found, gap.missing),
      chalk.dim(gap.rationale.substring(0, 47) + (gap.rationale.length > 47 ? '...' : '')),
    ]);
  }

  console.log(table.toString());
  console.log('');
}

export function filePath(p: string): void {
  console.log(`  ${chalk.dim('→')} ${chalk.underline(p)}`);
}
