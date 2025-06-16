#!/usr/bin/env bun
import { program } from 'commander';
import { createNightWatch } from './core/nightwatch';
import { createLogger } from './utils/logger-service';
import { createConfig, configFromEnv } from './config/simple-config';
import { version } from '../package.json';
import { resolve } from 'path';

/**
 * Simplified CLI that uses the library API.
 * This is just a thin wrapper around the core functionality.
 */
async function main() {
  program
    .name('nightwatch')
    .description('Autonomous overnight development tool')
    .version(version, '-v, --version', 'Output the current version')
    .argument('<repo-url>', 'Git repository URL')
    .argument('<task>', 'Task description')
    .option('-c, --context <file>', 'Path to context file')
    .option('-t, --timeout <minutes>', 'Exploration timeout in minutes', '90')
    .option('-w, --work-dir <dir>', 'Working directory for operations')
    .option('--log-level <level>', 'Log level (error|warn|info|debug|verbose)', 'info')
    .option('--no-color', 'Disable colored output')
    .option('--json', 'Output logs in JSON format')
    .action(async (repoUrl, task, options) => {
      // Create logger based on CLI options
      const logger = createLogger({
        level: options.logLevel,
        useColors: options.color,
        useJson: options.json,
      });

      try {
        // Build configuration from environment and CLI options
        const envConfig = configFromEnv();
        const config = createConfig({
          ...envConfig,
          workDir: options.workDir ? resolve(options.workDir) : envConfig.workDir,
          timeout: parseInt(options.timeout) * 60, // Convert minutes to seconds
          logLevel: options.logLevel,
        });

        // Create NightWatch instance
        const nightwatch = createNightWatch({ logger, config });

        // Execute the task
        const result = await nightwatch.executeTask({
          repoUrl,
          description: task,
          contextFile: options.context,
          timeout: config.timeout,
        });

        // Output result
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          logger.info(`Task completed: ${result.id}`);
        }

        process.exit(0);
      } catch (error) {
        logger.error('Task failed:', error);
        process.exit(1);
      }
    });

  // Handle uncaught errors
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
  });

  await program.parseAsync(process.argv);
}

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
