/**
 * Git Scanner
 * Extracts git statistics from a repository
 */

import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { logger } from '../utils/logger';
import { GitStats } from '../state/schema';

interface RawGitStats {
  totalCommits: number;
  contributors: number;
  lastCommitDate: string;
  mainLanguages: string[];
  conventionalCommitRate: number;
  commitPatterns: {
    feat: number;
    fix: number;
    refactor: number;
    docs: number;
    chore: number;
    other: number;
  };
  topChangedFiles: string[];
}

/**
 * Analyzes commit messages for conventional commit format
 */
function analyzeConventionalCommits(
  messages: string[]
): { rate: number; patterns: RawGitStats['commitPatterns'] } {
  const patterns = {
    feat: 0,
    fix: 0,
    refactor: 0,
    docs: 0,
    chore: 0,
    other: 0,
  };

  let validConventional = 0;

  for (const message of messages) {
    const lines = message.split('\n');
    const firstLine = lines[0];

    if (firstLine.match(/^feat(\(.+\))?:/)) {
      patterns.feat++;
      validConventional++;
    } else if (firstLine.match(/^fix(\(.+\))?:/)) {
      patterns.fix++;
      validConventional++;
    } else if (firstLine.match(/^refactor(\(.+\))?:/)) {
      patterns.refactor++;
      validConventional++;
    } else if (firstLine.match(/^docs(\(.+\))?:/)) {
      patterns.docs++;
      validConventional++;
    } else if (firstLine.match(/^chore(\(.+\))?:/)) {
      patterns.chore++;
      validConventional++;
    } else {
      patterns.other++;
    }
  }

  const rate = messages.length > 0 ? validConventional / messages.length : 0;

  return { rate, patterns };
}

/**
 * Scans git repository for statistics
 */
export async function scanGit(projectPath: string): Promise<GitStats> {
  logger.debug('Starting git scan', { projectPath });

  try {
    const git: SimpleGit = simpleGit(projectPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      logger.warn('Not a git repository', { projectPath });
      return {
        totalCommits: 0,
        contributors: 0,
        lastCommitDate: '',
        mainLanguages: [],
      };
    }

    // Get commit count
    const log = await git.log();
    const totalCommits = log.total || 0;
    logger.debug('Total commits', { count: totalCommits });

    // Get unique contributors
    const logWithAuthor = await git.log(['--format=%an']);
    const authors = logWithAuthor.all
      .map((commit) => commit.message)
      .filter((author) => author.length > 0);
    const uniqueAuthors = new Set(authors);
    const contributors = uniqueAuthors.size;
    logger.debug('Unique contributors', { count: contributors });

    // Get last commit date
    let lastCommitDate = '';
    if (log.latest) {
      lastCommitDate = log.latest.date || '';
    }
    logger.debug('Last commit date', { date: lastCommitDate });

    // Analyze conventional commits (sample for performance)
    const commitMessages: string[] = [];
    const sampleSize = Math.min(100, totalCommits);
    for (let i = 0; i < sampleSize; i++) {
      if (log.all[i]) {
        commitMessages.push(log.all[i].message);
      }
    }
    const { patterns } = analyzeConventionalCommits(commitMessages);

    logger.info('Git scan completed', {
      totalCommits,
      contributors,
      lastCommitDate,
      commitPatterns: patterns,
    });

    return {
      totalCommits,
      contributors,
      lastCommitDate,
      mainLanguages: [],
    };
  } catch (error) {
    logger.warn('Git scan failed', { error, projectPath });
    return {
      totalCommits: 0,
      contributors: 0,
      lastCommitDate: '',
      mainLanguages: [],
    };
  }
}
