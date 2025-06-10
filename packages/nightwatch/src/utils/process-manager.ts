import { spawn, SpawnOptions, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from './logger';
import type { ProcessResult } from '../types';

export interface ProcessOptions extends SpawnOptions {
  timeout?: number;
  input?: string;
}

export class ProcessError extends Error {
  constructor(
    message: string,
    public readonly result: ProcessResult,
    public readonly command: string,
    public readonly args: string[] = []
  ) {
    super(message);
    this.name = 'ProcessError';
  }
}

export class ProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private stdout: string[] = [];
  private stderr: string[] = [];
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private command: string,
    private args: string[] = [],
    private options: ProcessOptions = {}
  ) {
    super();
  }

  async run(): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const { timeout = 0, input, ...spawnOptions } = this.options;

      logger.debug(`Spawning process: ${this.command} ${this.args.join(' ')}`);
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...spawnOptions,
      });

      // Set up timeout if specified
      if (timeout > 0) {
        this.timeoutId = setTimeout(() => {
          this.kill('SIGTERM');
          const error = new Error(`Process timed out after ${timeout}ms`);
          error.name = 'ProcessTimeoutError';
          this.emit('error', error);
          reject(error);
        }, timeout);
      }

      // Handle process events
      this.process.on('error', (error) => {
        this.cleanup();
        reject(error);
      });

      this.process.on('close', (code, signal) => {
        this.cleanup();
        const result: ProcessResult = {
          code,
          signal,
          stdout: this.stdout.join(''),
          stderr: this.stderr.join(''),
          timedOut: false,
        };
        
        if (code === 0) {
          this.emit('success', result);
          resolve(result);
        } else {
          const error = new ProcessError(
            `Process failed with code ${code}`,
            result,
            this.command,
            this.args
          );
          this.emit('error', error);
          reject(error);
        }
      });

      // Handle stdout and stderr
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.stdout.push(output);
        this.emit('stdout', output);
      });

      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        this.stderr.push(output);
        this.emit('stderr', output);
      });

      // Write input if provided
      if (input && this.process.stdin) {
        this.process.stdin.write(input);
        this.process.stdin.end();
      }
    });
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): boolean {
    if (!this.process || this.process.killed) {
      return false;
    }
    
    logger.debug(`Killing process ${this.process.pid} with ${signal}`);
    return this.process.kill(signal);
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  static async execute(
    command: string,
    args: string[] = [],
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    const manager = new ProcessManager(command, args, options);
    return manager.run();
  }

  static async executeWithInput(
    command: string,
    input: string,
    args: string[] = [],
    options: Omit<ProcessOptions, 'input'> = {}
  ): Promise<ProcessResult> {
    return ProcessManager.execute(command, args, { ...options, input });
  }
}

export const processManager = {
  execute: ProcessManager.execute,
  executeWithInput: ProcessManager.executeWithInput,
};

export default ProcessManager;
