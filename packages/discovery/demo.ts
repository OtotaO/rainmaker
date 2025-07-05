#!/usr/bin/env bun
/**
 * Rainmaker Discovery Demo
 * Shows how quickly you can build production-ready features
 */

import chalk from 'chalk';

console.log(chalk.bold.cyan('\n🚀 Welcome to Rainmaker Discovery Demo!\n'));

console.log(chalk.yellow('The Problem:'));
console.log('You need to add authentication to your Express app.');
console.log('Traditional approach: 2-4 hours of coding, testing, debugging.\n');

console.log(chalk.green('The Rainmaker Way:'));
console.log('1. Search for what you need:');
console.log(chalk.gray('   $ rainmaker search auth\n'));

console.log('2. Check the pattern details:');
console.log(chalk.gray('   $ rainmaker show auth-jwt-express\n'));

console.log('3. Adapt it to your style:');
console.log(chalk.gray('   $ rainmaker adapt auth-jwt-express -i\n'));

console.log('4. Done! You have production-ready auth in 30 seconds.\n');

console.log(chalk.bold('✨ What you get:'));
console.log('   ✓ JWT authentication with refresh tokens');
console.log('   ✓ Password hashing with bcrypt');
console.log('   ✓ Role-based authorization');
console.log('   ✓ Express middleware ready to use');
console.log('   ✓ TypeScript types included');
console.log('   ✓ Security best practices built-in\n');

console.log(chalk.bold('🎯 Coming Soon:'));
console.log('   • Full application blueprints');
console.log('   • 100+ production patterns');
console.log('   • Pattern composition');
console.log('   • Community marketplace\n');

console.log(chalk.bold.magenta('Build faster. Build better. Build with confidence.\n'));

console.log(chalk.dim('Try it now:'));
console.log(chalk.dim('$ bun run cli list'));
