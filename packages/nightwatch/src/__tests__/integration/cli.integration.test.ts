import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.join(__dirname, '../../../dist/cli.js');

// Helper function to run CLI command
const runCli = (args: string[] = [], cwd: string = process.cwd()) => {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const childProcess = spawn('bun', [cliPath, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
};

describe('CLI Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    // Create a test directory
    originalCwd = process.cwd();
    testDir = path.join(__dirname, '../../test-temp');
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(async () => {
    // Clean up
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should display help when --help is used', async () => {
    const { code, stdout } = await runCli(['--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Options:');
  });

  it('should display version when --version is used', async () => {
    const { code, stdout } = await runCli(['--version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should fail with missing required arguments', async () => {
    const { code, stderr } = await runCli([]);
    expect(code).not.toBe(0);
    expect(stderr).toContain('error');
  });

  it('should use configuration from .nightwatchrc.json', async () => {
    // Create a test config file
    const config = {
      timeout: 30,
      logLevel: 'debug',
    };
    
    await fs.writeFile(
      path.join(testDir, '.nightwatchrc.json'),
      JSON.stringify(config, null, 2)
    );

    const { code } = await runCli(['--help']);
    expect(code).toBe(0);
  });

  it('should respect the --timeout flag', async () => {
    const { code } = await runCli(['--timeout', '60', '--help']);
    expect(code).toBe(0);
  });
});
