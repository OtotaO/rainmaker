#!/usr/bin/env node

/**
 * Rainmaker Discovery CLI V2
 * 
 * Zero code generation. Pure composition.
 * 
 * Following Carmack: "Make it work, make it right, make it fast."
 */

import { Command } from 'commander';
import { PatternComposer } from './patterns/pattern-v2';
import { authJwtV2 } from './patterns/v2/auth-jwt-v2';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('rainmaker')
  .description('Build applications from proven patterns - no code generation')
  .version('2.0.0');

// List available patterns
program
  .command('list')
  .description('List all available patterns')
  .action(async () => {
    console.log(chalk.blue('\n📦 Available Patterns:\n'));
    
    const patterns = [
      { id: 'auth-jwt-v2', name: 'JWT Authentication', status: '✅ Ready' },
      { id: 'payment-stripe-v2', name: 'Stripe Payments', status: '🚧 Coming Soon' },
      { id: 'storage-s3-v2', name: 'S3 Storage', status: '🚧 Coming Soon' },
      { id: 'cache-redis-v2', name: 'Redis Cache', status: '🚧 Coming Soon' },
      { id: 'email-sendgrid-v2', name: 'SendGrid Email', status: '🚧 Coming Soon' },
    ];
    
    patterns.forEach(p => {
      console.log(`  ${p.status} ${chalk.green(p.id)} - ${p.name}`);
    });
    
    console.log(chalk.gray('\n  No code generation. Just proven patterns.\n'));
  });

// Show pattern details
program
  .command('show <patternId>')
  .description('Show pattern details and configuration options')
  .action(async (patternId) => {
    if (patternId !== 'auth-jwt-v2') {
      console.log(chalk.red(`Pattern '${patternId}' not found`));
      return;
    }
    
    console.log(chalk.blue(`\n📋 Pattern: ${authJwtV2.name}\n`));
    console.log(`ID: ${chalk.green(authJwtV2.id)}`);
    console.log(`Description: ${authJwtV2.description}\n`);
    
    console.log(chalk.yellow('Required Configuration:'));
    Object.entries(authJwtV2.configSchema.required).forEach(([key, field]) => {
      console.log(`  - ${key} (${field.type}): ${field.description}`);
    });
    
    console.log(chalk.yellow('\nOptional Configuration:'));
    Object.entries(authJwtV2.configSchema.optional).forEach(([key, field]) => {
      console.log(`  - ${key} (${field.type}): ${field.description}`);
      if (field.default) console.log(`    Default: ${field.default}`);
    });
    
    console.log(chalk.yellow('\nDependencies:'));
    Object.entries(authJwtV2.dependencies.npm).forEach(([pkg, version]) => {
      console.log(`  - ${pkg}@${version}`);
    });
    
    console.log(chalk.gray('\nThis pattern provides a complete, working authentication system.'));
    console.log(chalk.gray('No code generation required - just configure and use.\n'));
  });

// Create a new application
program
  .command('create <type> <name>')
  .description('Create a new application from patterns')
  .action(async (type, name) => {
    if (type !== 'api') {
      console.log(chalk.red(`Application type '${type}' not supported yet`));
      return;
    }
    
    console.log(chalk.blue(`\n🚀 Creating ${type} application: ${name}\n`));
    
    // Interactive pattern selection
    const { patterns } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'patterns',
        message: 'Select patterns to include:',
        choices: [
          { name: 'JWT Authentication', value: 'auth-jwt-v2', checked: true },
          { name: 'Stripe Payments (Coming Soon)', value: 'payment-stripe-v2', disabled: true },
          { name: 'S3 Storage (Coming Soon)', value: 'storage-s3-v2', disabled: true },
          { name: 'Redis Cache (Coming Soon)', value: 'cache-redis-v2', disabled: true },
        ]
      }
    ]);
    
    // Create project directory
    const projectDir = path.join(process.cwd(), name);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Generate composition file (this is DATA, not CODE)
    const composition = {
      name,
      type,
      patterns: patterns.map((p: string) => ({
        patternId: p,
        instanceId: p.replace('-v2', ''),
        config: getDefaultConfig(p)
      }))
    };
    
    // Write composition file
    await fs.writeFile(
      path.join(projectDir, 'app.composition.json'),
      JSON.stringify(composition, null, 2)
    );
    
    // Generate minimal server file (this is GLUE, not generated business logic)
    const serverCode = `
import express from 'express';
import { PatternComposer } from 'rainmaker-discovery';
import composition from './app.composition.json';

async function start() {
  const composer = new PatternComposer();
  const app = await composer.compose(composition);
  
  const server = express();
  server.use(express.json());
  
  // Mount pattern routes
  for (const [id, pattern] of app.instances) {
    pattern.routes?.forEach(route => {
      server[route.method.toLowerCase()](route.path, ...route.middleware || [], route.handler);
    });
  }
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(\`✅ \${composition.name} running on port \${port}\`);
  });
}

start().catch(console.error);
`.trim();
    
    await fs.writeFile(path.join(projectDir, 'server.ts'), serverCode);
    
    // Generate package.json
    const packageJson = {
      name,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'tsx server.ts',
        dev: 'tsx watch server.ts'
      },
      dependencies: {
        'express': '^4.18.0',
        'rainmaker-discovery': '^2.0.0',
        ...patterns.reduce((deps: any, p: string) => {
          if (p === 'auth-jwt-v2') {
            return { ...deps, ...authJwtV2.dependencies.npm };
          }
          return deps;
        }, {})
      },
      devDependencies: {
        'tsx': '^4.0.0',
        '@types/express': '^4.17.0'
      }
    };
    
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Generate .env.example
    const envExample = `
# JWT Authentication
JWT_ACCESS_SECRET=your-32-character-access-secret-here
JWT_REFRESH_SECRET=your-32-character-refresh-secret-here

# Server
PORT=3000
`.trim();
    
    await fs.writeFile(path.join(projectDir, '.env.example'), envExample);
    
    console.log(chalk.green(`\n✅ Application created successfully!\n`));
    console.log('Next steps:');
    console.log(chalk.cyan(`  cd ${name}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  cp .env.example .env'));
    console.log(chalk.cyan('  npm run dev'));
    
    console.log(chalk.gray('\nNo code was generated. Only composition and configuration.\n'));
  });

// Helper to get default config for a pattern
function getDefaultConfig(patternId: string): any {
  switch (patternId) {
    case 'auth-jwt-v2':
      return {
        accessTokenSecret: '${JWT_ACCESS_SECRET}',
        refreshTokenSecret: '${JWT_REFRESH_SECRET}',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        bcryptRounds: 10
      };
    default:
      return {};
  }
}

// Compare with old approach
program
  .command('compare')
  .description('Compare old vs new approach')
  .action(() => {
    console.log(chalk.blue('\n📊 Approach Comparison:\n'));
    
    console.log(chalk.yellow('Old Approach (Code Generation):'));
    console.log('  1. Parse pattern template');
    console.log('  2. Build AST');
    console.log('  3. Transform AST based on options');
    console.log('  4. Generate new code');
    console.log('  5. Write generated files');
    console.log('  6. Hope it works');
    console.log(chalk.red('  ❌ Every step can fail'));
    
    console.log(chalk.yellow('\nNew Approach (Configuration):'));
    console.log('  1. Select patterns');
    console.log('  2. Configure them');
    console.log('  3. Compose them');
    console.log(chalk.green('  ✅ No code generation = no generation bugs'));
    
    console.log(chalk.gray('\nThe best code is no code.\n'));
  });

program.parse();
