/**
 * Discovery Service Wrapper for API
 * 
 * This wraps the discovery engine services to provide a simpler API
 * for the REST endpoints without requiring database dependencies.
 */

import { Component } from '@rainmaker/discovery/src/types';

export interface SearchResult {
  component: Component;
  score: number;
  reasoning: string;
}

export interface SearchOptions {
  limit?: number;
  filters?: {
    category?: string;
    language?: string;
    framework?: string;
    minStars?: number;
  };
}

export interface DialogueResponse {
  sessionId: string;
  question?: string;
  options?: string[];
  isComplete: boolean;
  searchCriteria?: Record<string, any>;
}

export class DiscoveryWrapper {
  private engine: SimpleDiscoveryEngine;
  private dialogueSessions: Map<string, any> = new Map();
  
  constructor() {
    this.engine = new SimpleDiscoveryEngine();
    this.initialize();
  }
  
  private async initialize() {
    await this.engine.initialize();
  }
  
  /**
   * Search for components
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const results = await this.engine.search(query, options?.limit || 10);
    
    // Apply filters if provided
    if (options?.filters) {
      return this.applyFilters(results, options.filters);
    }
    
    return results;
  }
  
  /**
   * Get a specific component by ID
   */
  async getComponent(componentId: string): Promise<Component | null> {
    return this.engine.getComponent(componentId);
  }
  
  /**
   * Analyze a component
   */
  async analyzeComponent(
    component: Component,
    options?: { includePatterns?: boolean; includeQuality?: boolean }
  ): Promise<any> {
    const analysis: any = {
      id: component.metadata.id,
      name: component.metadata.name,
      description: component.metadata.description,
    };
    
    if (options?.includePatterns) {
      analysis.patterns = component.metadata.technical.patterns;
      analysis.dependencies = component.metadata.technical.dependencies;
    }
    
    if (options?.includeQuality) {
      analysis.quality = component.metadata.quality;
    }
    
    analysis.codeMetrics = {
      lines: component.code.raw.split('\n').length,
      size: component.code.raw.length,
      language: component.metadata.technical.language,
      framework: component.metadata.technical.framework,
    };
    
    return analysis;
  }
  
  /**
   * Process Socratic dialogue
   */
  async processDialogue(
    sessionId: string,
    userResponse?: string,
    context?: any
  ): Promise<DialogueResponse> {
    // Simple dialogue simulation
    let session = this.dialogueSessions.get(sessionId);
    
    if (!session) {
      // Start new dialogue
      session = {
        id: sessionId,
        step: 0,
        criteria: {},
      };
      this.dialogueSessions.set(sessionId, session);
    }
    
    // Simple dialogue flow
    const dialogueSteps = [
      {
        question: "What type of component are you looking for?",
        options: ["Authentication", "Payment Processing", "Data Validation", "API Integration", "Other"],
      },
      {
        question: "What programming language do you prefer?",
        options: ["TypeScript", "JavaScript", "Python", "Java", "Any"],
      },
      {
        question: "Do you need any specific framework support?",
        options: ["React", "Express", "Next.js", "None", "Other"],
      },
    ];
    
    if (userResponse && session.step > 0) {
      // Store user response
      const stepKey = `step${session.step}`;
      session.criteria[stepKey] = userResponse;
    }
    
    if (session.step < dialogueSteps.length) {
      const currentStep = dialogueSteps[session.step];
      session.step++;
      
      return {
        sessionId,
        question: currentStep.question,
        options: currentStep.options,
        isComplete: false,
      };
    } else {
      // Dialogue complete
      return {
        sessionId,
        isComplete: true,
        searchCriteria: session.criteria,
      };
    }
  }
  
  /**
   * Apply filters to search results
   */
  private applyFilters(
    results: SearchResult[],
    filters: SearchOptions['filters']
  ): SearchResult[] {
    return results.filter(result => {
      const { metadata } = result.component;
      
      if (filters?.category && metadata.category !== filters.category) {
        return false;
      }
      
      if (filters?.language && metadata.technical.language !== filters.language) {
        return false;
      }
      
      if (filters?.framework && metadata.technical.framework !== filters.framework) {
        return false;
      }
      
      if (filters?.minStars && metadata.quality.stars < filters.minStars) {
        return false;
      }
      
      return true;
    });
  }
}

/**
 * Simple Discovery Engine (copied from simple-cli.ts)
 */
class SimpleDiscoveryEngine {
  private components: Map<string, Component> = new Map();
  private embeddings: Array<{ id: string; embedding: number[] }> = [];
  
  async initialize(): Promise<void> {
    // Initialize with sample components
    await this.createSampleComponents();
  }
  
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    // Simple search implementation
    const results: SearchResult[] = [];
    
    for (const [id, component] of this.components) {
      const score = this.calculateScore(query, component);
      if (score > 0) {
        results.push({
          component,
          score,
          reasoning: this.generateReasoning(component, query, score),
        });
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
  
  async getComponent(componentId: string): Promise<Component | null> {
    return this.components.get(componentId) || null;
  }
  
  private calculateScore(query: string, component: Component): number {
    const queryLower = query.toLowerCase();
    const componentText = `${component.metadata.name} ${component.metadata.description}`.toLowerCase();
    
    // Simple keyword matching
    let score = 0;
    const queryWords = queryLower.split(/\s+/);
    
    for (const word of queryWords) {
      if (componentText.includes(word)) {
        score += 0.3;
      }
    }
    
    // Pattern matching
    for (const pattern of component.metadata.technical.patterns) {
      if (queryLower.includes(pattern) || pattern.includes(queryLower)) {
        score += 0.2;
      }
    }
    
    return Math.min(score, 1);
  }
  
  private generateReasoning(component: Component, query: string, score: number): string {
    const reasons: string[] = [];
    
    if (score > 0.8) {
      reasons.push('Strong match');
    } else if (score > 0.5) {
      reasons.push('Good match');
    } else {
      reasons.push('Partial match');
    }
    
    const queryLower = query.toLowerCase();
    const componentText = `${component.metadata.name} ${component.metadata.description}`.toLowerCase();
    
    if (componentText.includes(queryLower)) {
      reasons.push('contains query keywords');
    }
    
    return reasons.join(', ');
  }
  
  private async createSampleComponents(): Promise<void> {
    // Sample components for testing
    const sampleComponents: Component[] = [
      {
        metadata: {
          id: 'sample-googleoauth',
          name: 'GoogleOAuthProvider',
          description: 'React component for Google OAuth authentication',
          category: 'auth',
          source: {
            type: 'github',
            repo: 'example/auth-components',
            path: 'src/GoogleOAuth.tsx',
            url: 'https://github.com/example/auth-components',
            commit: 'abc123',
            license: 'MIT',
          },
          quality: {
            stars: 150,
            forks: 25,
            hasTests: true,
            testCoverage: 85,
            hasDocumentation: true,
            lastUpdated: new Date().toISOString(),
          },
          technical: {
            language: 'typescript',
            framework: 'react',
            dependencies: ['react', 'google-auth-library'],
            apis: [],
            patterns: ['authentication', 'oauth', 'context', 'hooks'],
          },
          embedding: [],
          tags: ['auth', 'google', 'oauth', 'react'],
        },
        code: {
          raw: '// Google OAuth Provider code...',
          normalized: '// Normalized code...',
        },
        prompts: {
          primary: 'Set up Google OAuth authentication in your React app',
          variants: [
            'Use the GoogleAuthProvider component to wrap your app',
            'Configure OAuth scopes and redirect URI',
            'Handle authentication state with useGoogleAuth hook'
          ],
          questions: [
            'What OAuth scopes do you need?',
            'What is your redirect URI?',
            'Do you need to persist auth state?'
          ],
        },
        customization: {
          variables: [],
          patterns: [],
          injectionPoints: [],
        },
      },
      {
        metadata: {
          id: 'sample-jwtauth',
          name: 'JWTAuthMiddleware',
          description: 'Express middleware for JWT authentication',
          category: 'auth',
          source: {
            type: 'github',
            repo: 'example/auth-middleware',
            path: 'src/jwt.ts',
            url: 'https://github.com/example/auth-middleware',
            commit: 'def456',
            license: 'MIT',
          },
          quality: {
            stars: 200,
            forks: 40,
            hasTests: true,
            testCoverage: 90,
            hasDocumentation: true,
            lastUpdated: new Date().toISOString(),
          },
          technical: {
            language: 'typescript',
            framework: 'express',
            dependencies: ['express', 'jsonwebtoken'],
            apis: [],
            patterns: ['authentication', 'jwt', 'middleware', 'async'],
          },
          embedding: [],
          tags: ['auth', 'jwt', 'express', 'middleware'],
        },
        code: {
          raw: '// JWT Middleware code...',
          normalized: '// Normalized code...',
        },
        prompts: {
          primary: 'Set up JWT authentication middleware in your Express app',
          variants: [
            'Use the JWTAuthMiddleware to protect routes',
            'Configure JWT secret and expiration time',
            'Generate and verify JWT tokens'
          ],
          questions: [
            'What should be the token expiration time?',
            'Which routes need authentication?',
            'Do you need refresh token support?'
          ],
        },
        customization: {
          variables: [],
          patterns: [],
          injectionPoints: [],
        },
      },
    ];
    
    for (const component of sampleComponents) {
      this.components.set(component.metadata.id, component);
    }
  }
}
