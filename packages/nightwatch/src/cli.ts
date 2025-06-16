#!/usr/bin/env bun
import { program } from 'commander';
import { logger } from './utils/logger';
import { version } from '../package.json';

async function main() {
  program
    .name('nightwatch')
    .description('Autonomous overnight development tool')
    .version(version, '-v, --version', 'Output the current version')
    .argument('<repo-url>', 'Git repository URL')
    .argument('<task>', 'Task description')
    .option('-c, --context <file>', 'Path to context file')
    .option('-t, --timeout <minutes>', 'Exploration timeout in minutes', '90')
    .option('--debug', 'Enable debug logging', false)
    .action(async (repoUrl, task, options) => {
      try {
        logger.level = options.debug ? 'debug' : 'info';
        logger.debug('Starting NightWatch with options:', { repoUrl, task, options });
        
        // TODO: Implement the main logic
        logger.info(`Starting task: ${task}`);
        logger.info(`Repository: ${repoUrl}`);
        
        if (options.context) {
          logger.info(`Using context from: ${options.context}`);
        }
        
      } catch (error) {
        logger.error('An error occurred:', error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
