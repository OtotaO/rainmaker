#!/usr/bin/env bun
/**
 * Rainmaker Discovery CLI
 * The fastest way to build production-ready applications
 */

import { Command } from 'commander';
import { listPatterns, getPattern, searchPatterns, getCategories } from './patterns';
import { SimpleAdaptationEngine } from './services/simple-adaptation-engine';
import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const program = new Command();
const engine = new SimpleAdaptationEngine();

program
  .name('rainmaker')
  .description('Build production-ready applications from proven patterns')
  .version('1.0.0');

// List all patterns
program
  .command('list')
  .description('List all available patterns')
  .option('-c, --category <category>', 'Filter by category')
  .action((options) => {
    const patterns = listPatterns();
    const categories = getCategories();
    
    console.log(chalk.bold('\n🚀 Rainmaker Discovery - Available Patterns\n'));
    
    if (options.category) {
      const filtered = patterns.filter(p => p.category === options.category);
      console.log(chalk.blue(`Category: ${options.category}\n`));
      filtered.forEach(p => {
        console.log(`  ${chalk.green(p.id)} - ${p.name}`);
        console.log(`    ${chalk.gray(p.description)}\n`);
      });
    } else {
      categories.forEach(cat => {
        console.log(chalk.blue(`\n${cat.toUpperCase()}`));
        patterns
          .filter(p => p.category === cat)
          .forEach(p => {
            console.log(`  ${chalk.green(p.id)} - ${p.name}`);
            console.log(`    ${chalk.gray(p.description)}`);
          });
      });
    }
    
    console.log(chalk.dim('\nUse "rainmaker show <pattern-id>" to see details'));
  });

// Show pattern details
program
  .command('show <pattern>')
  .description('Show details about a specific pattern')
  .action((patternId) => {
    const pattern = getPattern(patternId);
    
    if (!pattern) {
      console.error(chalk.red(`Pattern "${patternId}" not found`));
      process.exit(1);
    }
    
    console.log(chalk.bold(`\n📦 ${pattern.name}\n`));
    console.log(`${chalk.gray('ID:')} ${pattern.id}`);
    console.log(`${chalk.gray('Category:')} ${pattern.category}`);
    console.log(`${chalk.gray('Description:')} ${pattern.description}`);
    console.log(`${chalk.gray('Tags:')} ${pattern.tags.join(', ')}`);
    
    console.log(chalk.bold('\n📚 Dependencies:'));
    Object.entries(pattern.dependencies).forEach(([name, version]) => {
      console.log(`  ${name}: ${version}`);
    });
    
    console.log(chalk.bold('\n⚙️  Customization Options:'));
    pattern.customization.variables.forEach(v => {
      console.log(`  ${chalk.cyan(v.name)} (${v.type}) - ${v.description}`);
      if (v.defaultValue) {
        console.log(`    Default: ${v.defaultValue}`);
      }
    });
    
    console.log(chalk.dim('\nUse "rainmaker adapt <pattern-id>" to use this pattern'));
  });

// Search patterns
program
  .command('search <query>')
  .description('Search for patterns')
  .action((query) => {
    const results = searchPatterns(query);
    
    if (results.length === 0) {
      console.log(chalk.yellow(`No patterns found for "${query}"`));
      return;
    }
    
    console.log(chalk.bold(`\n🔍 Search Results for "${query}":\n`));
    results.forEach(p => {
      console.log(`  ${chalk.green(p.id)} - ${p.name}`);
      console.log(`    ${chalk.gray(p.description)}\n`);
    });
  });

// Adapt a pattern
program
  .command('adapt <pattern>')
  .description('Adapt a pattern to your project')
  .option('-o, --output <path>', 'Output file path', './output.ts')
  .option('-n, --naming <style>', 'Naming convention (camelCase, snake_case, kebab-case, PascalCase)')
  .option('-e, --error-handling <style>', 'Error handling style (try-catch, promises, async-await)')
  .option('-i, --interactive', 'Interactive mode for customization')
  .action(async (patternId, options) => {
    const pattern = getPattern(patternId);
    
    if (!pattern) {
      console.error(chalk.red(`Pattern "${patternId}" not found`));
      process.exit(1);
    }
    
    console.log(chalk.bold(`\n🔧 Adapting ${pattern.name}\n`));
    
    let adaptOptions: any = {
      naming: options.naming,
      errorHandling: options.errorHandling,
      customVariables: {}
    };
    
    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'naming',
          message: 'Choose naming convention:',
          choices: ['camelCase', 'snake_case', 'kebab-case', 'PascalCase'],
          default: 'camelCase'
        },
        {
          type: 'list',
          name: 'errorHandling',
          message: 'Choose error handling style:',
          choices: ['try-catch', 'promises', 'async-await'],
          default: 'async-await'
        }
      ]);
      
      adaptOptions = { ...adaptOptions, ...answers };
      
      // Ask about custom variables
      if (pattern.customization.variables.length > 0) {
        console.log(chalk.bold('\n📝 Custom Configuration:\n'));
        
        for (const variable of pattern.customization.variables) {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'value',
              message: `${variable.name} (${variable.description}):`,
              default: variable.defaultValue
            }
          ]);
          
          if (answer.value && answer.value !== variable.defaultValue) {
            adaptOptions.customVariables[variable.name] = answer.value;
          }
        }
      }
    }
    
    // Adapt the pattern
    console.log('Adapting pattern...');
    
    try {
      const result = await engine.adapt(pattern, adaptOptions);
      
      // Write the file
      const outputPath = path.resolve(options.output);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, result.code);
      
      console.log(chalk.green('✓ Pattern adapted successfully!'));
      
      console.log(chalk.bold('\n✅ Success!\n'));
      console.log(`File created: ${chalk.green(outputPath)}`);
      
      console.log(chalk.bold('\n📋 Next Steps:\n'));
      result.instructions.forEach((instruction, i) => {
        console.log(`${i + 1}. ${instruction}`);
      });
      
      // Show example usage
      console.log(chalk.bold('\n💡 Example Usage:\n'));
      console.log(chalk.gray('```typescript'));
      console.log(`import { setupAuthRoutes } from '${options.output}';`);
      console.log(`import express from 'express';`);
      console.log(`\nconst app = express();`);
      console.log(`setupAuthRoutes(app);`);
      console.log(chalk.gray('```'));
      
    } catch (error) {
      console.error(chalk.red('✗ Failed to adapt pattern'));
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Quick start command
program
  .command('create <type> <name>')
  .description('Create a new application from blueprints (coming soon)')
  .action((type, name) => {
    console.log(chalk.yellow('\n🚧 Application blueprints coming soon!\n'));
    console.log('This will allow you to create full applications like:');
    console.log('  - rainmaker create saas-app my-startup');
    console.log('  - rainmaker create marketplace my-platform');
    console.log('  - rainmaker create ai-app my-assistant');
    console.log('\nFor now, use "rainmaker adapt" to add individual patterns.');
  });

// Add pattern to existing project
program
  .command('add <pattern>')
  .description('Add a pattern to your existing project (coming soon)')
  .action((pattern) => {
    console.log(chalk.yellow('\n🚧 Project integration coming soon!\n'));
    console.log('This will analyze your existing project and seamlessly integrate patterns.');
    console.log('\nFor now, use "rainmaker adapt" and manually integrate the output.');
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.bold('\n🚀 Rainmaker Discovery - Build Faster, Build Better\n'));
  console.log('The fastest way to build production-ready applications from proven patterns.\n');
  program.outputHelp();
  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  $ rainmaker list                    # See all patterns'));
  console.log(chalk.dim('  $ rainmaker search auth             # Find authentication patterns'));
  console.log(chalk.dim('  $ rainmaker adapt auth-jwt-express  # Use a pattern'));
}
