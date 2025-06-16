import type { Logger, NightwatchConfig, NightwatchTask, ProcessResult } from '../types';
import { SimpleProcessManager } from '../utils/simple-process-manager';
import { createLogger } from '../utils/logger-service';
import { ValidationError } from '../errors/core-errors';
import { randomUUID } from 'crypto';
import { createAIService, type AIService, type ImplementationStep } from '../services/ai-service';
import { scanDirectory, writeFileSafe, deleteFileSafe, readFileSafe } from '../utils/file-scanner';
import path from 'path';

export interface NightwatchOptions {
  logger?: Logger;
  config?: Partial<NightwatchConfig>;
}

export interface TaskOptions {
  repoUrl: string;
  description: string;
  contextFile?: string;
  timeout?: number;
}

/**
 * Core NightWatch functionality as a library.
 * No CLI concerns, no global state, just pure functionality.
 */
export class NightWatch {
  private logger: Logger;
  private config: NightwatchConfig;
  private currentTask: NightwatchTask | null = null;
  private aiService: AIService | null = null;

  constructor(options: NightwatchOptions = {}) {
    this.logger = options.logger || createLogger();
    this.config = this.buildConfig(options.config);
    
    // Initialize AI service if configuration is provided
    if (this.config.ai?.apiUrl) {
      this.aiService = createAIService({
        apiUrl: this.config.ai.apiUrl,
        apiKey: this.config.ai.apiKey,
        logger: this.logger
      });
    }
  }

  private buildConfig(partial?: Partial<NightwatchConfig>): NightwatchConfig {
    // Simple, explicit configuration - no magic file searching
    return {
      workDir: partial?.workDir || process.cwd(),
      timeout: partial?.timeout || 5400,
      logLevel: partial?.logLevel || 'info',
      retry: {
        maxRetries: partial?.retry?.maxRetries || 3,
        initialDelay: partial?.retry?.initialDelay || 1000,
        maxDelay: partial?.retry?.maxDelay || 30000,
      },
      ai: {
        apiUrl: partial?.ai?.apiUrl || process.env.NIGHTWATCH_AI_URL || 'http://localhost:3001',
        apiKey: partial?.ai?.apiKey || process.env.NIGHTWATCH_AI_KEY
      }
    };
  }

  /**
   * Execute a task with the given options
   */
  async executeTask(options: TaskOptions): Promise<NightwatchTask> {
    this.validateTaskOptions(options);

    const task: NightwatchTask = {
      id: randomUUID(),
      description: options.description,
      repoUrl: options.repoUrl,
      contextFile: options.contextFile,
      status: 'pending',
      startedAt: new Date(),
    };

    this.currentTask = task;
    this.logger.info(`Starting task ${task.id}: ${task.description}`);

    try {
      task.status = 'running';
      
      // Clone repository
      await this.cloneRepository(task.repoUrl);
      
      // Execute the actual AI-driven development workflow
      if (!this.aiService) {
        throw new Error('AI service not configured. Please provide AI configuration.');
      }
      
      await this.executeAIDevelopment(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
      
      this.logger.info(`Task ${task.id} completed successfully`);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`Task ${task.id} failed: ${task.error}`);
      throw error;
    } finally {
      this.currentTask = null;
    }

    return task;
  }

  /**
   * Get the current task status
   */
  getCurrentTask(): NightwatchTask | null {
    return this.currentTask;
  }

  /**
   * Cancel the current task
   */
  async cancelCurrentTask(): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No task is currently running');
    }

    this.logger.info(`Cancelling task ${this.currentTask.id}`);
    // TODO: Implement actual cancellation logic
    this.currentTask.status = 'failed';
    this.currentTask.error = 'Task cancelled by user';
    this.currentTask = null;
  }

  private validateTaskOptions(options: TaskOptions): void {
    if (!options.repoUrl) {
      throw new ValidationError('Repository URL is required');
    }

    if (!options.description) {
      throw new ValidationError('Task description is required');
    }

    // Simple URL validation
    try {
      new URL(options.repoUrl);
    } catch {
      throw new ValidationError('Invalid repository URL');
    }
  }

  private async cloneRepository(repoUrl: string): Promise<void> {
    this.logger.debug(`Cloning repository: ${repoUrl}`);
    
    const result = await SimpleProcessManager.execute(
      'git',
      ['clone', repoUrl, 'repo'],
      {
        cwd: this.config.workDir,
        timeout: 60000, // 1 minute timeout for cloning
        logger: this.logger,
      }
    );

    if (result.code !== 0) {
      throw new Error(`Failed to clone repository: ${result.stderr}`);
    }
  }

  private async executeAIDevelopment(task: NightwatchTask): Promise<void> {
    const repoPath = path.join(this.config.workDir, 'repo');
    
    // Update progress: Scanning repository
    this.updateTaskProgress(task, 10, 'Scanning repository...');
    
    // Scan the repository
    const fileContents = await scanDirectory(repoPath, {
      logger: this.logger,
      maxDepth: 10
    });
    
    this.logger.info(`Scanned ${fileContents.size} files from repository`);
    
    // Update progress: Analyzing with AI
    this.updateTaskProgress(task, 20, 'Analyzing codebase with AI...');
    
    // Read context file if provided
    let contextContent: string | undefined;
    if (task.contextFile) {
      contextContent = await readFileSafe(path.resolve(task.contextFile)) || undefined;
    }
    
    // Analyze the task with AI
    const analysis = await this.aiService!.analyzeTask({
      repoPath,
      taskDescription: task.description,
      contextFile: contextContent,
      fileContents
    });
    
    this.logger.info(`AI Analysis complete. Complexity: ${analysis.estimatedComplexity}`);
    this.logger.info(`Understanding: ${analysis.understanding}`);
    this.logger.info(`Implementation steps: ${analysis.implementationPlan.length}`);
    
    // Execute the implementation plan
    await this.executeImplementationPlan(task, analysis.implementationPlan, repoPath, analysis.understanding);
  }
  
  private async executeImplementationPlan(
    task: NightwatchTask,
    steps: ImplementationStep[],
    repoPath: string,
    context: string
  ): Promise<void> {
    const totalSteps = steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = 20 + Math.floor((i / totalSteps) * 70); // Progress from 20% to 90%
      
      this.updateTaskProgress(task, progress, `Executing step ${i + 1}/${totalSteps}: ${step.description}`);
      
      try {
        await this.executeStep(step, repoPath, context);
        this.logger.info(`✓ Completed step ${i + 1}: ${step.description}`);
      } catch (error) {
        this.logger.error(`✗ Failed step ${i + 1}: ${step.description}`, error);
        throw new Error(`Failed to execute step: ${step.description}. Error: ${error}`);
      }
    }
    
    // Final progress
    this.updateTaskProgress(task, 95, 'Validating changes...');
    
    // Run any validation or tests
    await this.validateChanges(repoPath);
    
    this.updateTaskProgress(task, 100, 'Task completed successfully');
  }
  
  private async executeStep(step: ImplementationStep, repoPath: string, context: string): Promise<void> {
    const targetPath = step.targetPath ? path.join(repoPath, step.targetPath) : '';
    
    switch (step.action) {
      case 'create':
      case 'modify': {
        if (!targetPath) {
          throw new Error('Target path required for create/modify action');
        }
        
        // Read existing content if modifying
        let existingContent: string | undefined;
        if (step.action === 'modify') {
          const content = await readFileSafe(targetPath);
          if (content === null) {
            throw new Error(`File not found for modification: ${step.targetPath}`);
          }
          existingContent = content;
        }
        
        // Generate code with AI
        const generation = await this.aiService!.generateCode({
          step,
          existingContent,
          context
        });
        
        // Write the file
        await writeFileSafe(targetPath, generation.content);
        this.logger.debug(`${step.action === 'create' ? 'Created' : 'Modified'} file: ${step.targetPath}`);
        break;
      }
      
      case 'delete': {
        if (!targetPath) {
          throw new Error('Target path required for delete action');
        }
        
        const deleted = await deleteFileSafe(targetPath);
        if (!deleted) {
          this.logger.warn(`File not found for deletion: ${step.targetPath}`);
        } else {
          this.logger.debug(`Deleted file: ${step.targetPath}`);
        }
        break;
      }
      
      case 'execute': {
        if (!step.command) {
          throw new Error('Command required for execute action');
        }
        
        // Parse command into executable and args
        const [cmd, ...args] = step.command.split(' ');
        
        const result = await SimpleProcessManager.execute(cmd, args, {
          cwd: repoPath,
          timeout: 30000, // 30 second timeout for commands
          logger: this.logger
        });
        
        if (result.code !== 0) {
          throw new Error(`Command failed: ${step.command}\n${result.stderr}`);
        }
        
        this.logger.debug(`Executed command: ${step.command}`);
        break;
      }
      
      default:
        throw new Error(`Unknown action type: ${step.action}`);
    }
  }
  
  private async validateChanges(repoPath: string): Promise<void> {
    // Run basic validation commands if applicable
    const validationCommands = [
      { cmd: 'npm', args: ['test'], condition: await this.fileExists(path.join(repoPath, 'package.json')) },
      { cmd: 'bun', args: ['test'], condition: await this.fileExists(path.join(repoPath, 'bun.lockb')) },
      { cmd: 'cargo', args: ['test'], condition: await this.fileExists(path.join(repoPath, 'Cargo.toml')) },
      { cmd: 'go', args: ['test', './...'], condition: await this.fileExists(path.join(repoPath, 'go.mod')) }
    ];
    
    for (const validation of validationCommands) {
      if (validation.condition) {
        try {
          this.logger.info(`Running validation: ${validation.cmd} ${validation.args.join(' ')}`);
          const result = await SimpleProcessManager.execute(validation.cmd, validation.args, {
            cwd: repoPath,
            timeout: 60000, // 1 minute timeout for tests
            logger: this.logger
          });
          
          if (result.code === 0) {
            this.logger.info('✓ Validation passed');
          } else {
            this.logger.warn(`Validation failed with code ${result.code}`);
          }
        } catch (error) {
          this.logger.warn(`Validation skipped due to error: ${error}`);
        }
        break; // Only run one validation
      }
    }
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    const content = await readFileSafe(filePath);
    return content !== null;
  }
  
  private updateTaskProgress(task: NightwatchTask, progress: number, message: string): void {
    task.progress = progress;
    if (this.currentTask) {
      this.currentTask.progress = progress;
    }
    this.logger.info(`[${progress}%] ${message}`);
  }
}

/**
 * Factory function for creating NightWatch instances
 */
export function createNightWatch(options?: NightwatchOptions): NightWatch {
  return new NightWatch(options);
}
