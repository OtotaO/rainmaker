/**
 * GitHub Indexer Service
 * 
 * Crawls GitHub repositories to find and analyze high-quality components.
 * This is where we build our library of reusable code.
 */

import { Octokit } from '@octokit/rest';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { z } from 'zod';
import type { Component, ComponentMetadata } from '../types';
import { ComponentSchema, ComponentMetadataSchema } from '../types';
import { logger } from '../utils/logger';
import { generateEmbedding } from './embedding';
import { analyzeCode } from './code-analyzer';

export class GitHubIndexer {
  private octokit: Octokit;
  private rateLimitRemaining = 5000;
  
  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }
  
  /**
   * Index repositories for a specific topic/category
   */
  async indexCategory(category: string, options: {
    minStars?: number;
    languages?: string[];
    limit?: number;
  } = {}): Promise<Component[]> {
    const { minStars = 100, languages = ['typescript', 'javascript'], limit = 100 } = options;
    
    logger.info(`Indexing category: ${category}`, options);
    
    // Build search query
    const query = [
      category,
      `stars:>=${minStars}`,
      ...languages.map(lang => `language:${lang}`),
      'in:readme,description',
    ].join(' ');
    
    try {
      // Search for repositories
      const searchResult = await this.octokit.search.repos({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: Math.min(limit, 100),
      });
      
      const components: Component[] = [];
      
      // Process each repository
      for (const repo of searchResult.data.items) {
        try {
          const repoComponents = await this.indexRepository(repo, category);
          components.push(...repoComponents);
          
          // Respect rate limits
          if (this.rateLimitRemaining < 100) {
            logger.warn('Approaching rate limit, pausing...');
            await this.waitForRateLimit();
          }
        } catch (error) {
          logger.error(`Failed to index repo ${repo.full_name}:`, error);
        }
      }
      
      return components;
    } catch (error) {
      logger.error(`Failed to search for ${category}:`, error);
      throw error;
    }
  }
  
  /**
   * Index a specific repository
   */
  private async indexRepository(repo: any, category: string): Promise<Component[]> {
    logger.debug(`Indexing repository: ${repo.full_name}`);
    
    const components: Component[] = [];
    
    try {
      // Get repository structure
      const { data: tree } = await this.octokit.git.getTree({
        owner: repo.owner.login,
        repo: repo.name,
        tree_sha: repo.default_branch,
        recursive: 'true',
      });
      
      // Find relevant files based on patterns
      const relevantFiles = this.findRelevantFiles(tree.tree, category);
      
      // Analyze each file
      for (const file of relevantFiles) {
        if (file.type !== 'blob') continue;
        
        try {
          const component = await this.analyzeFile({
            repo,
            file,
            category,
          });
          
          if (component && this.isHighQuality(component)) {
            components.push(component);
          }
        } catch (error) {
          logger.debug(`Failed to analyze file ${file.path}:`, error);
        }
      }
      
      return components;
    } catch (error) {
      logger.error(`Failed to index repository ${repo.full_name}:`, error);
      return [];
    }
  }
  
  /**
   * Find files that might contain relevant components
   */
  private findRelevantFiles(tree: any[], category: string): any[] {
    // Define patterns for different categories
    const patterns: Record<string, RegExp[]> = {
      auth: [
        /auth\.(ts|js|tsx|jsx)$/i,
        /login\.(ts|js|tsx|jsx)$/i,
        /authenticate\.(ts|js|tsx|jsx)$/i,
        /oauth\.(ts|js|tsx|jsx)$/i,
        /providers?\/(google|github|facebook)/i,
      ],
      payments: [
        /payment\.(ts|js|tsx|jsx)$/i,
        /stripe\.(ts|js|tsx|jsx)$/i,
        /checkout\.(ts|js|tsx|jsx)$/i,
        /billing\.(ts|js|tsx|jsx)$/i,
      ],
      database: [
        /db\.(ts|js)$/i,
        /database\.(ts|js)$/i,
        /schema\.(ts|js)$/i,
        /models?\//i,
        /prisma/i,
      ],
      api: [
        /api\//i,
        /routes?\//i,
        /endpoints?\//i,
        /handlers?\//i,
      ],
    };
    
    const categoryPatterns = patterns[category] || [new RegExp(category, 'i')];
    
    return tree.filter(file => {
      if (!file.path) return false;
      
      // Skip test files and dependencies
      if (file.path.includes('test') || 
          file.path.includes('spec') || 
          file.path.includes('node_modules') ||
          file.path.includes('vendor')) {
        return false;
      }
      
      // Check if file matches any pattern
      return categoryPatterns.some(pattern => pattern.test(file.path));
    });
  }
  
  /**
   * Analyze a single file and extract component information
   */
  private async analyzeFile(context: {
    repo: any;
    file: any;
    category: string;
  }): Promise<Component | null> {
    const { repo, file, category } = context;
    
    try {
      // Get file content
      const { data: fileData } = await this.octokit.repos.getContent({
        owner: repo.owner.login,
        repo: repo.name,
        path: file.path,
      });
      
      // Ensure we have file content
      if (!('content' in fileData) || Array.isArray(fileData)) {
        return null;
      }
      
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      
      // Skip if file is too large or too small
      if (content.length < 100 || content.length > 50000) {
        return null;
      }
      
      // Parse and analyze the code
      const analysis = await analyzeCode(content, file.path);
      if (!analysis) return null;
      
      // Generate metadata
      const metadata: ComponentMetadata = {
        id: `${repo.full_name}/${file.path}@${file.sha}`,
        name: analysis.name || file.path.split('/').pop() || 'Unknown',
        description: analysis.description || `${category} component from ${repo.full_name}`,
        
        source: {
          type: 'github',
          repo: repo.full_name,
          path: file.path,
          commit: file.sha,
          url: fileData.html_url,
          license: repo.license?.spdx_id || 'UNKNOWN',
        },
        
        quality: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          lastUpdated: repo.updated_at,
          hasTests: analysis.hasTests || false,
          hasDocumentation: analysis.hasDocumentation || !!repo.description,
        },
        
        technical: {
          language: analysis.language,
          framework: analysis.framework,
          dependencies: analysis.dependencies,
          apis: analysis.apis,
          patterns: analysis.patterns,
        },
        
        embedding: await generateEmbedding(
          `${analysis.name} ${analysis.description} ${category} ${analysis.patterns.join(' ')}`
        ),
        tags: [...analysis.tags, category],
        category,
      };
      
      // Build the component
      const component: Component = {
        metadata,
        code: {
          raw: content,
          ast: analysis.ast,
          normalized: analysis.normalizedCode,
        },
        prompts: {
          primary: analysis.primaryPrompt,
          variants: analysis.promptVariants,
          questions: this.generateQuestions(analysis, category),
        },
        customization: {
          variables: analysis.configurableVariables,
          injectionPoints: analysis.injectionPoints,
          patterns: analysis.adaptablePatterns,
        },
      };
      
      // Validate the component
      const validated = ComponentSchema.safeParse(component);
      if (!validated.success) {
        logger.warn(`Invalid component structure for ${file.path}:`, validated.error);
        return null;
      }
      
      return validated.data;
    } catch (error) {
      logger.error(`Failed to analyze file ${file.path}:`, error);
      return null;
    }
  }
  
  /**
   * Generate Socratic questions that would lead to this component
   */
  private generateQuestions(analysis: any, category: string): string[] {
    const questions: string[] = [];
    
    // Category-specific questions
    if (category === 'auth') {
      questions.push(
        'What type of authentication do you need?',
        'Which providers should be supported?',
        'Do you need session management?',
        'Should it support multi-factor authentication?'
      );
    } else if (category === 'payments') {
      questions.push(
        'Which payment providers do you need?',
        'Do you need subscription support?',
        'Should it handle refunds?',
        'Do you need to store payment methods?'
      );
    }
    
    // Framework-specific questions
    if (analysis.framework) {
      questions.push(`Are you using ${analysis.framework}?`);
    }
    
    // Pattern-specific questions
    if (analysis.patterns.includes('async')) {
      questions.push('Do you need asynchronous processing?');
    }
    
    return questions;
  }
  
  /**
   * Check if a component meets quality standards
   */
  private isHighQuality(component: Component): boolean {
    const { metadata } = component;
    
    // Basic quality checks
    if (metadata.quality.stars < 50) return false;
    if (metadata.code.raw.length < 100) return false;
    if (metadata.technical.patterns.length === 0) return false;
    
    // Check for code smells
    const code = metadata.code.raw.toLowerCase();
    if (code.includes('todo') || code.includes('fixme')) {
      logger.debug(`Skipping component with TODOs: ${metadata.id}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit(): Promise<void> {
    const { data: rateLimit } = await this.octokit.rateLimit.get();
    const resetTime = new Date(rateLimit.rate.reset * 1000);
    const waitTime = resetTime.getTime() - Date.now();
    
    if (waitTime > 0) {
      logger.info(`Rate limit hit, waiting ${waitTime / 1000}s until reset`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimitRemaining = rateLimit.rate.remaining;
  }
}