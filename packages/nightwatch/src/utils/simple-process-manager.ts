import { spawn, SpawnOptions, ChildProcess } from 'child_process';
import type { ProcessResult } from '../types';
import type { Logger } from '../types';

export interface ProcessOptions extends SpawnOptions {
  timeout?: number;
  input?: string;
  logger?: Logger;
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

/**
 * Simple process manager without EventEmitter complexity.
 * Just promises - that's what you actually use 99% of the time.
 */
export class SimpleProcessManager {
  private process: ChildProcess | null = null;
  private stdout: string[] = [];
  private stderr: string[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private logger: Logger | null;

  constructor(
    private command: string,
    private args: string[] = [],
    private options: ProcessOptions = {}
  ) {
    this.logger = options.logger || null;
  }

  async run(): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const { timeout = 0, input, logger, ...spawnOptions } = this.options;

      this.logger?.debug(`Spawning process: ${this.command} ${this.args.join(' ')}`);
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...spawnOptions,
      });

      let timedOut = false;

      // Set up timeout if specified
      if (timeout > 0) {
        this.timeoutId = setTimeout(() => {
          timedOut = true;
          this.kill('SIGTERM');
          reject(new Error(`Process timed out after ${timeout}ms`));
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
          timedOut,
        };
        
        if (code === 0) {
          resolve(result);
        } else {
          const error = new ProcessError(
            `Process failed with code ${code}`,
            result,
            this.command,
            this.args
          );
          reject(error);
        }
      });

      // Handle stdout and stderr
      this.process.stdout?.on('data', (data) => {
        this.stdout.push(data.toString());
      });

      this.process.stderr?.on('data', (data) => {
        this.stderr.push(data.toString());
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
    
    this.logger?.debug(`Killing process ${this.process.pid} with ${signal}`);
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
    const manager = new SimpleProcessManager(command, args, options);
    return manager.run();
  }

  static async executeWithInput(
    command: string,
    input: string,
    args: string[] = [],
    options: Omit<ProcessOptions, 'input'> = {}
  ): Promise<ProcessResult> {
    return SimpleProcessManager.execute(command, args, { ...options, input });
  }
}

// Export convenience functions
export const execute = SimpleProcessManager.execute;
export const executeWithInput = SimpleProcessManager.executeWithInput;
