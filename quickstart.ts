#!/usr/bin/env bun
/**
 * Quick Start Script for Rainmaker Discovery
 * 
 * This script helps you get the discovery system up and running quickly
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🚀 Rainmaker Discovery Quick Start\n');

// Check prerequisites
console.log('📋 Checking prerequisites...');

// Check for .env file
const envPath = path.join(__dirname, 'packages/api/.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found in packages/api/');
  console.log('Creating from example...');
  
  const examplePath = path.join(__dirname, 'packages/api/.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('✅ Created .env file - please update with your API keys');
  } else {
    console.error('❌ .env.example not found either!');
    process.exit(1);
  }
}

// Read .env and check for required keys
const envContent = fs.readFileSync(envPath, 'utf8');
const hasGithubToken = envContent.includes('GITHUB_TOKEN=') && !envContent.includes('GITHUB_TOKEN=your_');
const hasAnthropicKey = envContent.includes('ANTHROPIC_API_KEY=') && !envContent.includes('ANTHROPIC_API_KEY=your_');

if (!hasGithubToken || !hasAnthropicKey) {
  console.error('\n❌ Missing API keys in .env file');
  console.log('\nPlease update packages/api/.env with:');
  if (!hasGithubToken) console.log('  - GITHUB_TOKEN: Get from https://github.com/settings/tokens');
  if (!hasAnthropicKey) console.log('  - ANTHROPIC_API_KEY: Get from https://console.anthropic.com/');
  process.exit(1);
}

console.log('✅ Environment configured\n');

// Install dependencies
console.log('📦 Installing dependencies...');
const install = spawn('bun', ['install'], { stdio: 'inherit' });

install.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
  
  console.log('✅ Dependencies installed\n');
  
  // Build discovery package
  console.log('🔨 Building discovery package...');
  const buildDiscovery = spawn('bun', ['run', 'build'], { 
    cwd: path.join(__dirname, 'packages/discovery'),
    stdio: 'inherit' 
  });
  
  buildDiscovery.on('close', (code) => {
    if (code !== 0) {
      console.log('⚠️  Discovery package build failed (this is okay for now)\n');
    }
    
    // Start the application
    console.log('🚀 Starting Rainmaker Discovery...\n');
    console.log('📡 API Server: http://localhost:3001');
    console.log('🌐 Web Interface: http://localhost:3000\n');
    console.log('Press Ctrl+C to stop\n');
    
    const dev = spawn('bun', ['run', 'dev'], { stdio: 'inherit' });
    
    dev.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  });
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});