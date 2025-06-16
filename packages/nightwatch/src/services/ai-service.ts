import type { Logger } from '../types';
import axios, { AxiosInstance } from 'axios';

export interface AIServiceConfig {
  apiUrl: string;
  apiKey?: string;
  logger: Logger;
}

export interface CodeAnalysisRequest {
  repoPath: string;
  taskDescription: string;
  contextFile?: string;
  fileContents: Map<string, string>;
}

export interface CodeAnalysisResponse {
  understanding: string;
  implementationPlan: ImplementationStep[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface ImplementationStep {
  description: string;
  action: 'create' | 'modify' | 'delete' | 'execute';
  targetPath?: string;
  content?: string;
  command?: string;
  order: number;
}

export interface CodeGenerationRequest {
  step: ImplementationStep;
  existingContent?: string;
  context: string;
}

export interface CodeGenerationResponse {
  content: string;
  explanation: string;
}

/**
 * AI Service that interfaces with Rainmaker's Anthropic integration
 */
export class AIService {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: AIServiceConfig) {
    this.logger = config.logger;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Analyze the codebase and generate an implementation plan
   */
  async analyzeTask(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
    this.logger.info('Analyzing task with AI...');
    
    // Prepare context for the AI
    const contextPrompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await this.client.post('/api/anthropic', {
        messages: [{
          role: 'user',
          content: contextPrompt
        }]
      });

      // Parse the AI response into structured data
      const aiResponse = response.data.message;
      return this.parseAnalysisResponse(aiResponse);
    } catch (error) {
      this.logger.error('Failed to analyze task:', error);
      throw error;
    }
  }

  /**
   * Generate code for a specific implementation step
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    this.logger.info(`Generating code for: ${request.step.description}`);
    
    const generationPrompt = this.buildGenerationPrompt(request);
    
    try {
      const response = await this.client.post('/api/anthropic', {
        messages: [{
          role: 'user',
          content: generationPrompt
        }]
      });

      return this.parseGenerationResponse(response.data.message);
    } catch (error) {
      this.logger.error('Failed to generate code:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(request: CodeAnalysisRequest): string {
    let prompt = `You are an expert software engineer tasked with analyzing a codebase and creating an implementation plan.

Task Description: ${request.taskDescription}

Repository Structure:
${Array.from(request.fileContents.keys()).join('\n')}

`;

    if (request.contextFile) {
      prompt += `Additional Context:\n${request.contextFile}\n\n`;
    }

    // Include relevant file contents
    const relevantFiles = this.selectRelevantFiles(request.fileContents, request.taskDescription);
    relevantFiles.forEach(([path, content]) => {
      prompt += `\nFile: ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
    });

    prompt += `
Please analyze this codebase and provide:
1. A clear understanding of what needs to be done
2. A step-by-step implementation plan with specific files to create/modify
3. An estimate of the complexity (low/medium/high)

Format your response as:
UNDERSTANDING: [Your analysis of the task]
COMPLEXITY: [low/medium/high]
STEPS:
1. [action: create/modify/delete/execute] [path: file/path] [description: what to do]
2. [action: ...] [path: ...] [description: ...]
...
`;

    return prompt;
  }

  private buildGenerationPrompt(request: CodeGenerationRequest): string {
    let prompt = `You are an expert software engineer implementing a specific part of a larger task.

Context: ${request.context}

Step to implement: ${request.step.description}
Action type: ${request.step.action}
`;

    if (request.step.targetPath) {
      prompt += `Target file: ${request.step.targetPath}\n`;
    }

    if (request.existingContent) {
      prompt += `\nExisting content:\n\`\`\`\n${request.existingContent}\n\`\`\`\n`;
    }

    prompt += `
Please provide the ${request.step.action === 'modify' ? 'modified' : 'new'} code content.
Also explain your implementation decisions.

Format your response as:
CODE:
\`\`\`
[Your code here]
\`\`\`

EXPLANATION: [Your explanation of the implementation]
`;

    return prompt;
  }

  private parseAnalysisResponse(aiResponse: string): CodeAnalysisResponse {
    const lines = aiResponse.split('\n');
    let understanding = '';
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    const steps: ImplementationStep[] = [];

    let section = '';
    let stepOrder = 1;

    for (const line of lines) {
      if (line.startsWith('UNDERSTANDING:')) {
        section = 'understanding';
        understanding = line.substring('UNDERSTANDING:'.length).trim();
      } else if (line.startsWith('COMPLEXITY:')) {
        const comp = line.substring('COMPLEXITY:'.length).trim().toLowerCase();
        if (comp === 'low' || comp === 'medium' || comp === 'high') {
          complexity = comp;
        }
      } else if (line.startsWith('STEPS:')) {
        section = 'steps';
      } else if (section === 'understanding' && line.trim()) {
        understanding += ' ' + line.trim();
      } else if (section === 'steps' && line.trim()) {
        const stepMatch = line.match(/^\d+\.\s*\[action:\s*(\w+)\]\s*\[path:\s*([^\]]*)\]\s*\[description:\s*(.+)\]/);
        if (stepMatch) {
          steps.push({
            action: stepMatch[1] as any,
            targetPath: stepMatch[2] || undefined,
            description: stepMatch[3],
            order: stepOrder++
          });
        }
      }
    }

    return {
      understanding: understanding.trim(),
      implementationPlan: steps,
      estimatedComplexity: complexity
    };
  }

  private parseGenerationResponse(aiResponse: string): CodeGenerationResponse {
    const codeMatch = aiResponse.match(/CODE:\s*```[\w]*\n([\s\S]*?)```/);
    const explanationMatch = aiResponse.match(/EXPLANATION:\s*([\s\S]*?)(?=\n\n|$)/);

    return {
      content: codeMatch ? codeMatch[1].trim() : '',
      explanation: explanationMatch ? explanationMatch[1].trim() : ''
    };
  }

  private selectRelevantFiles(fileContents: Map<string, string>, taskDescription: string, maxFiles: number = 5): Array<[string, string]> {
    // Simple relevance scoring based on file path and task description
    const scored = Array.from(fileContents.entries()).map(([path, content]) => {
      let score = 0;
      
      // Check if path contains keywords from task description
      const keywords = taskDescription.toLowerCase().split(/\s+/);
      keywords.forEach(keyword => {
        if (path.toLowerCase().includes(keyword)) score += 2;
        if (content.toLowerCase().includes(keyword)) score += 1;
      });

      // Prefer source files over test files
      if (path.includes('test')) score -= 1;
      
      // Prefer main entry points
      if (path.endsWith('index.ts') || path.endsWith('main.ts')) score += 1;

      return { path, content, score };
    });

    // Sort by score and return top files
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map(item => [item.path, item.content]);
  }
}

/**
 * Factory function for creating AI service instances
 */
export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}
