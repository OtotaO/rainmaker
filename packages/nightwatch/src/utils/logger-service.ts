import winston from 'winston';
import chalk from 'chalk';
import type { Logger } from '../types';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

interface LoggerOptions {
  level?: LogLevel;
  useColors?: boolean;
  useJson?: boolean;
  logToFile?: boolean;
  logDir?: string;
}

/**
 * Creates a logger instance with the specified options.
 * This is injectable - no global state, no singletons.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = 'info',
    useColors = true,
    useJson = false,
    logToFile = false,
    logDir = 'logs'
  } = options;

  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'magenta',
  } as const;

  // Simple format for console output
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
      const color = colors[info.level as keyof typeof colors] || 'gray';
      const levelStr = info.level.padEnd(7).toUpperCase();
      
      if (useColors) {
        return `${chalk.gray(info.timestamp)} ${chalk[color](levelStr)} ${info.message}${
          info.stack ? '\n' + chalk.red(info.stack) : ''
        }`;
      }
      
      return `${info.timestamp} ${levelStr} ${info.message}${
        info.stack ? '\n' + info.stack : ''
      }`;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: useJson ? winston.format.json() : consoleFormat,
    }),
  ];

  // Add file transports if requested
  if (logToFile) {
    transports.push(
      new winston.transports.File({
        filename: `${logDir}/error.log`,
        level: 'error',
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: `${logDir}/combined.log`,
        format: winston.format.json(),
      })
    );
  }

  const winstonLogger = winston.createLogger({
    level,
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      verbose: 4,
    },
    format: winston.format.errors({ stack: true }),
    transports,
    exitOnError: false,
  });

  // Return a Logger interface implementation
  return {
    error: (message: string, meta?: unknown) => winstonLogger.error(message, meta),
    warn: (message: string, meta?: unknown) => winstonLogger.warn(message, meta),
    info: (message: string, meta?: unknown) => winstonLogger.info(message, meta),
    debug: (message: string, meta?: unknown) => winstonLogger.debug(message, meta),
    verbose: (message: string, meta?: unknown) => winstonLogger.verbose(message, meta),
  };
}

/**
 * Creates a no-op logger for testing or when logging is disabled
 */
export function createNoOpLogger(): Logger {
  const noop = () => {};
  return {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
    verbose: noop,
  };
}

/**
 * Creates a logger that collects all log messages for testing
 */
export function createTestLogger(): Logger & { logs: Array<{ level: string; message: string; meta?: unknown }> } {
  const logs: Array<{ level: string; message: string; meta?: unknown }> = [];
  
  const log = (level: string) => (message: string, meta?: unknown) => {
    logs.push({ level, message, meta });
  };

  return {
    error: log('error'),
    warn: log('warn'),
    info: log('info'),
    debug: log('debug'),
    verbose: log('verbose'),
    logs,
  };
}
