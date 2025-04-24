import type { SchemaGenerationOptions } from '../types/prisma';

export class Logger {
  private static instance: Logger;
  private logLevel: SchemaGenerationOptions['logLevel'] = 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: SchemaGenerationOptions['logLevel']): void {
    this.logLevel = level;
  }

  private shouldLog(level: NonNullable<SchemaGenerationOptions['logLevel']>): boolean {
    const levels = ['error', 'warn', 'info', 'debug'] as const;
    return levels.indexOf(level) <= levels.indexOf(this.logLevel || 'info');
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
} 