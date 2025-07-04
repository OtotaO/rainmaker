/**
 * Enhanced GitHub Indexer Service with LLM-based Quality Assessment
 * 
 * Crawls GitHub repositories to find and analyze high-quality components.
 * Uses LLM to assess component quality across multiple dimensions.
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
import { b } from '../../baml_client'; // Assuming 'b' is the BAML client instance
import type { 
  GitHubRepo, 
  GitHubTree, 
  GitHubTreeFile, 
  GitHubFileContent, 
  CodeAnalysisResult, 
  BamlComponentQualityAssessment,
  BAMLGitHubClientMethods
} from '../types/github';

// Quality thresholds configuration
interface QualityThresholds {
  minOverallScore: number;
  minCodeQuality: number;
  minReliability: number;
  minReusability: number;
  minDocumentation: number;
  minTesting: number;
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  minOverallScore: 6,
  minCodeQuality: 5,
  minReliability: 5,
  minReusability: 6,
  minDocumentation: 4,
  minTesting: 4,
};

export class GitHubIndexerEnhanced {
  private octokit: Octokit;
  private rateLimitRemaining = 5000;
  private qualityThresholds: QualityThresholds;
  private useLLMAssessment: boolean;
  private bamlClient: BAMLGitHubClientMethods; // Type the BAML client
  
  constructor(
    token: string, 
    options: {
      qualityThresholds?: Partial<QualityThresholds>;
      useLLMAssessment?: boolean;
    } = {}
  ) {
    this.octokit = new Octokit({ auth: token });
    this.qualityThresholds = { ...DEFAULT_THRESHOLDS, ...options.qualityThresholds };
    this.useLLMAssessment = options.useLLMAssessment ?? true;
    this.bamlClient = b as BAMLGitHubClientMethods; // Cast the imported 'b'
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
          // Cast to GitHubRepo to bypass Octokit's overly broad type definitions
          // We've defined GitHubRepoSchema to cover the properties we actually use.
          const typedRepo = repo as GitHubRepo; 
          const repoComponents = await this.indexRepository(typedRepo, category);
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
      
      // Log quality statistics
      logger.info(`Indexed ${components.length} high-quality components from ${searchResult.data.items.length} repositories`);
      
      return components;
    } catch (error) {
      logger.error(`Failed to search for ${category}:`, error);
      throw error;
    }
  }
  
  /**
   * Index a specific repository
   */
  private async indexRepository(repo: GitHubRepo, category: string): Promise<Component[]> {
    logger.debug(`Indexing repository: ${repo.full_name}`);
    
    const components: Component[] = [];
    
    try {
      // Get repository structure
      const { data: tree } = await this.octokit.git.getTree({
        owner: repo.owner?.login ?? '', // Add null check for owner
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
          
          if (component) {
            const qualityResult = await this.assessComponentQuality(component);
            
            if (qualityResult.passed) {
              // Add quality assessment to component (store separately from metadata.quality)
              (component as any).qualityAssessment = qualityResult.assessment;
              components.push(component);
              
              logger.debug(`Component ${component.metadata.name} passed quality assessment with score ${qualityResult.assessment?.overall_score}`);
            } else {
              logger.debug(`Component ${component.metadata.name} failed quality assessment: ${qualityResult.reason}`);
            }
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
  private findRelevantFiles(tree: GitHubTreeFile[], category: string): GitHubTreeFile[] {
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
    repo: GitHubRepo;
    file: GitHubTreeFile;
    category: string;
  }): Promise<Component | null> {
    const { repo, file, category } = context;
    
    try {
      // Get file content
      const { data: fileData } = await this.octokit.repos.getContent({
        owner: repo.owner?.login ?? '', // Handle repo.owner being null
        repo: repo.name,
        path: file.path as string, // Explicitly assert as string to bypass TS error
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
      const analysis: CodeAnalysisResult | null = await analyzeCode(content, file.path);
      if (!analysis) return null;
      
      // Generate metadata
      const licenseId = repo.license?.spdx_id;
      const licenseString: string = licenseId ?? 'UNKNOWN'; // Use nullish coalescing for spdx_id
      
      // Ensure html_url and updated_at are strings, providing fallbacks if null
      const fileHtmlUrl = fileData.html_url ?? `https://github.com/${repo.full_name}/blob/${file.sha}/${file.path}`;
      const repoUpdatedAt = repo.updated_at; // This is already string.datetime() in schema
      
      const metadata: ComponentMetadata = {
        id: `${repo.full_name}/${file.path ?? 'unknown'}@${file.sha ?? 'unknown'}`, // Handle file.path and file.sha possibly undefined
        name: analysis.name ?? file.path?.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') ?? 'Unknown', // Use nullish coalescing for analysis.name
        description: analysis.description ?? `${category} component from ${repo.full_name}`, // Use nullish coalescing for analysis.description
        
        source: {
          type: 'github',
          repo: repo.full_name,
          path: file.path ?? 'unknown', // Handle file.path possibly undefined
          commit: file.sha ?? 'unknown', // Handle file.sha possibly undefined
          url: fileHtmlUrl, // Use the potentially fallback URL
          license: licenseString,
        },
        
        quality: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          lastUpdated: repoUpdatedAt,
          hasTests: analysis.hasTests || false,
          hasDocumentation: analysis.hasDocumentation || !!repo.description,
        },
        
        technical: {
          language: analysis.language,
          framework: analysis.framework ?? undefined,
          dependencies: analysis.dependencies,
          apis: analysis.apis,
          patterns: analysis.patterns,
        },
        
        embedding: await generateEmbedding(
          `${(analysis.name ?? '') as string} ${(analysis.description ?? '') as string} ${category} ${analysis.patterns.join(' ')}` // Explicitly assert as string to bypass TS error
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
  private generateQuestions(analysis: CodeAnalysisResult, category: string): string[] {
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
   * Enhanced component quality assessment using LLM
   */
  private async assessComponentQuality(component: Component): Promise<{
    passed: boolean;
    reason?: string;
    assessment?: BamlComponentQualityAssessment; // Type the assessment
  }> {
    // First, apply basic filters
    const basicCheckResult = this.basicQualityCheck(component);
    if (!basicCheckResult.passed) {
      return basicCheckResult;
    }
    
    // If LLM assessment is disabled, return basic check result
    if (!this.useLLMAssessment) {
      return basicCheckResult;
    }
    
    try {
      // Use LLM to assess quality
      const assessment = await this.bamlClient.AssessComponentQuality( // Use typed bamlClient
        component.metadata.name,
        component.code.raw,
        component.metadata.quality.hasTests,
        component.metadata.quality.hasDocumentation,
        component.metadata.technical.dependencies,
        component.metadata.quality.stars
      );
      
      // Check against thresholds
      if (assessment.overall_score < this.qualityThresholds.minOverallScore) {
        return {
          passed: false,
          reason: `Overall score ${assessment.overall_score} below threshold ${this.qualityThresholds.minOverallScore}`,
          assessment,
        };
      }
      
      if (assessment.code_quality_score < this.qualityThresholds.minCodeQuality) {
        return {
          passed: false,
          reason: `Code quality score ${assessment.code_quality_score} below threshold ${this.qualityThresholds.minCodeQuality}`,
          assessment,
        };
      }
      
      if (assessment.reliability_score < this.qualityThresholds.minReliability) {
        return {
          passed: false,
          reason: `Reliability score ${assessment.reliability_score} below threshold ${this.qualityThresholds.minReliability}`,
          assessment,
        };
      }
      
      if (assessment.reusability_score < this.qualityThresholds.minReusability) {
        return {
          passed: false,
          reason: `Reusability score ${assessment.reusability_score} below threshold ${this.qualityThresholds.minReusability}`,
          assessment,
        };
      }
      
      // Log the assessment details
      logger.debug(`Quality assessment for ${component.metadata.name}:`, {
        overall: assessment.overall_score,
        codeQuality: assessment.code_quality_score,
        reliability: assessment.reliability_score,
        reusability: assessment.reusability_score,
        documentation: assessment.documentation_score,
        testing: assessment.testing_score,
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
      });
      
      return {
        passed: true,
        assessment,
      };
    } catch (error) {
      logger.warn(`LLM quality assessment failed for ${component.metadata.name}, falling back to basic checks:`, error);
      // Fall back to basic quality check
      return basicCheckResult;
    }
  }
  
  /**
   * Basic quality checks (fallback when LLM is unavailable)
   */
  private basicQualityCheck(component: Component): {
    passed: boolean;
    reason?: string;
  } {
    const { metadata, code } = component;
    
    // Basic quality checks
    if (metadata.quality.stars < 50) {
      return {
        passed: false,
        reason: `Stars count ${metadata.quality.stars} below minimum 50`,
      };
    }
    
    if (code.raw.length < 100) {
      return {
        passed: false,
        reason: `Code length ${code.raw.length} below minimum 100`,
      };
    }
    
    if (metadata.technical.patterns.length === 0) {
      return {
        passed: false,
        reason: 'No patterns detected in code',
      };
    }
    
    // Check for code smells
    const codeContent = code.raw.toLowerCase();
    if (codeContent.includes('todo') || codeContent.includes('fixme')) {
      return {
        passed: false,
        reason: 'Code contains TODO or FIXME comments',
      };
    }
    
    return { passed: true };
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

// Export a factory function for easy migration
export function createEnhancedGitHubIndexer(
  token: string,
  options?: {
    qualityThresholds?: Partial<QualityThresholds>;
    useLLMAssessment?: boolean;
  }
): GitHubIndexerEnhanced {
  return new GitHubIndexerEnhanced(token, options);
}
