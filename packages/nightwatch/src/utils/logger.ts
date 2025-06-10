import winston from 'winston';
import chalk from 'chalk';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'magenta',
} as const;

const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) =>
      `${chalk.gray(info.timestamp)} ${chalk[colors[info.level as keyof typeof colors] || 'gray'](
        info.level.padEnd(7).toUpperCase()
      )} ${info.message} ${info.stack ? '\n' + chalk.red(info.stack) : ''}`
  )
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format((info) => {
        info.level = info.level.toUpperCase();
        return info;
      })(),
      format
    ),
  }),
];

const logger = winston.createLogger({
  level: level(),
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

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    })
  );
}

export { logger };
