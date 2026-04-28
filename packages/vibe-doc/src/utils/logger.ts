/**
 * Structured Logger
 * Simple logging utility with info, warn, error, and debug levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private isVerbose = process.env.VIBE_DOC_VERBOSE === '1' || this.isDev;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = this.formatTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  info(message: string, data?: unknown): void {
    if (this.isVerbose) {
      console.log(this.format('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.format('warn', message, data));
  }

  error(message: string, data?: unknown): void {
    console.error(this.format('error', message, data));
  }

  debug(message: string, data?: unknown): void {
    if (this.isDev) {
      console.debug(this.format('debug', message, data));
    }
  }
}

export const logger = new Logger();
