/**
 * Common types used throughout the NightWatch project
 */

/**
 * Represents the result of a process execution
 */
export interface ProcessResult {
  /** Exit code of the process */
  code: number | null;
  
  /** Signal that terminated the process (if any) */
  signal: NodeJS.Signals | null;
  
  /** Standard output */
  stdout: string;
  
  /** Standard error output */
  stderr: string;
  
  /** Whether the process timed out */
  timedOut: boolean;
}

/**
 * Configuration options for the NightWatch CLI
 */
export interface NightwatchConfig {
  /** Working directory for the application */
  workDir: string;
  
  /** Timeout in seconds */
  timeout: number;
  
  /** Logging level */
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  
  /** Retry configuration */
  retry: {
    /** Maximum number of retries */
    maxRetries: number;
    
    /** Initial delay between retries in milliseconds */
    initialDelay: number;
    
    /** Maximum delay between retries in milliseconds */
    maxDelay: number;
  };
  
  /** AI service configuration */
  ai?: {
    /** API URL for the AI service (defaults to local rainmaker API) */
    apiUrl?: string;
    
    /** Optional API key for authentication */
    apiKey?: string;
  };
  
  /** Additional CLI options */
  [key: string]: unknown;
}

/**
 * Represents a task to be executed by NightWatch
 */
export interface NightwatchTask {
  /** Unique identifier for the task */
  id: string;
  
  /** Task description */
  description: string;
  
  /** Repository URL */
  repoUrl: string;
  
  /** Optional context file path */
  contextFile?: string;
  
  /** Task status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timed_out';
  
  /** Start time of the task */
  startedAt?: Date;
  
  /** End time of the task */
  completedAt?: Date;
  
  /** Error message if the task failed */
  error?: string;
  
  /** Task progress (0-100) */
  progress?: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Logger interface used throughout the application
 */
export interface Logger {
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  verbose(message: string, meta?: unknown): void;
}

/**
 * Environment variable options
 */
export interface EnvVarOptions<T = string> {
  /** Whether the environment variable is required */
  required?: boolean;
  
  /** Default value if the environment variable is not set */
  default?: T;
  
  /** Type of the environment variable */
  type?: 'string' | 'number' | 'boolean' | 'json' | 'array';
  
  /** Allowed values for the environment variable */
  allowedValues?: T[];
  
  /** Custom validator function */
  validator?: (value: T) => boolean | string;
}

/**
 * Process execution options
 */
export interface ProcessOptions {
  /** Working directory for the process */
  cwd?: string;
  
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Input to write to stdin */
  input?: string;
  
  /** Whether to capture stdout */
  captureStdout?: boolean;
  
  /** Whether to capture stderr */
  captureStderr?: boolean;
}

/**
 * Process execution result
 */
export interface ProcessExecutionResult {
  /** Exit code */
  code: number | null;
  
  /** Signal that terminated the process */
  signal: NodeJS.Signals | null;
  
  /** Standard output */
  stdout: string;
  
  /** Standard error */
  stderr: string;
  
  /** Whether the process timed out */
  timedOut: boolean;
}
