/**
 * Enhanced Discovery Service with LLM-powered Search Refinement
 * 
 * This enhanced version integrates LLM-based query refinement to improve
 * search accuracy and relevance.
 */

import { PrismaClient } from '@prisma/client';
import type { 
  Component, 
  SearchRequest, 
  UserContext, 
  AdaptedComponent,
  DialogueNode 
} from '../types';
import { GitHubIndexerEnhanced, createEnhancedGitHubIndexer } from './github-indexer-enhanced';
import { SocraticDialogue } from './socratic-dialogue-enhanced';
import { AdaptationEngine } from './adaptation-engine';
import { generateEmbedding, findSimilar } from './embedding';
import { logger } from '../utils/logger';
import { b } from '../../baml_client';

export interface EnhancedDiscoveryServiceConfig {
  prisma: PrismaClient;
  githubToken: string;
  anthropicApiKey: string;
  useEnhancedSearch?: boolean;
  useEnhancedIndexer?: boolean;
  qualityThresholds?: {
    minOverallScore?: number;
    minCodeQuality?: number;
    minReliability?: number;
    minReusability?: number;
    minDocumentation?: number;
    minTesting?: number;
  };
}

export class EnhancedDiscoveryService {
  private prisma: PrismaClient;
  private indexer: GitHubIndexerEnhanced;
  private adaptationEngine: AdaptationEngine;
  private components: Map<string, Component> = new Map();
  private embeddings: Array<{ id: string; embedding: number[] }> = [];
  private useEnhancedSearch: boolean;
  
  constructor(config: EnhancedDiscoveryServiceConfig) {
    this.prisma = config.prisma;
    this.useEnhancedSearch = config.useEnhancedSearch ?? true;
    
    // Use enhanced indexer if requested
    if (config.useEnhancedIndexer ?? true) {
      const indexerOptions: Parameters<typeof createEnhancedGitHubIndexer>[1] = {
        useLLMAssessment: true,
      };
      if (config.qualityThresholds) {
        indexerOptions.qualityThresholds = config.qualityThresholds;
      }
      this.indexer = createEnhancedGitHubIndexer(config.githubToken, indexerOptions);
    } else {
      // Fall back to regular indexer
      this.indexer = new GitHubIndexerEnhanced(config.githubToken, {
        useLLMAssessment: false,
      });
    }
    
    this.adaptationEngine = new AdaptationEngine();
    
    // Load cached components on startup
    this.loadCachedComponents();
  }
  
  /**
   * Main discovery flow
   */
  async discover(query: string, context: UserContext): Promise<{
    dialogue?: DialogueNode;
    suggestions?: string[];
    components?: Component[];
    searchRequest?: SearchRequest;
  }> {
    logger.info(`Starting discovery for query: ${query}`);
    
    // Step 1: Suggest categories
    const suggestions = await SocraticDialogue.suggestCategories(query);
    
    return {
      suggestions,
    };
  }
  
  /**
   * Start Socratic dialogue for a category
   */
  async startDialogue(category: string, query: string, context: UserContext): Promise<DialogueNode | null> {
    const dialogue = new SocraticDialogue();
    return await dialogue.startDialogue(category, query, context);
  }
  
  /**
   * Continue dialogue with user response
   */
  async continueDialogue(
    dialogueState: any,
    nodeId: string,
    response: any
  ): Promise<{
    nextQuestion?: DialogueNode;
    searchRequest?: SearchRequest;
    components?: Component[];
  }> {
    const dialogue = new SocraticDialogue();
    // Restore dialogue state
    Object.assign(dialogue, dialogueState);
    
    const nextQuestion = await dialogue.processResponse(nodeId, response);
    
    if (!nextQuestion) {
      // Dialogue complete - build search request
      const searchRequest = dialogue.buildSearchRequest(
        dialogueState.originalQuery,
        dialogueState.category,
        dialogueState.context
      );
      
      // Perform enhanced search
      const components = await this.search(searchRequest, dialogueState.responses);
      
      return { searchRequest, components };
    }
    
    return { nextQuestion };
  }
  
  /**
   * Enhanced search for components with LLM query refinement
   */
  async search(request: SearchRequest, dialogueResponses?: string[]): Promise<Component[]> {
    logger.info('Searching for components', request);
    
    let queryText: string;
    let boostFactors: Record<string, number> = {};
    let alternativeQueries: string[] = [];
    
    // Use enhanced search if enabled and dialogue responses are available
    if (this.useEnhancedSearch && dialogueResponses && dialogueResponses.length > 0) {
      try {
        // Use LLM to refine the search query
        const refinedQuery = await b.RefineSearchQuery(
          request.query,
          dialogueResponses,
          JSON.stringify(request.context)
        );
        
        logger.debug('Refined search query:', {
          original: request.query,
          refined: refinedQuery.refined_query,
          keyTerms: refinedQuery.key_terms,
          confidence: refinedQuery.confidence_score,
        });
        
        // Use the refined query if confidence is high enough
        if (refinedQuery.confidence_score >= 0.7) {
          queryText = refinedQuery.refined_query;
          boostFactors = refinedQuery.boost_factors || {};
          alternativeQueries = refinedQuery.alternative_queries || [];
          
          // Apply additional filters from LLM suggestions
          if (refinedQuery.filters) {
            request.filters = {
              ...request.filters,
              ...refinedQuery.filters,
            };
          }
        } else {
          // Fall back to original query construction
          queryText = this.buildQueryText(request);
          logger.warn('Low confidence in refined query, using original');
        }
      } catch (error) {
        logger.warn('Failed to refine search query, falling back to original:', error);
        queryText = this.buildQueryText(request);
      }
    } else {
      // Use original query construction
      queryText = this.buildQueryText(request);
    }
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Find similar components
    let similar = findSimilar(queryEmbedding, this.embeddings, 30); // Get more candidates
    
    // Apply boost factors if available
    if (Object.keys(boostFactors).length > 0) {
      similar = this.applyBoostFactors(similar, boostFactors);
    }
    
    // If we have alternative queries and not enough results, try them
    if (similar.length < 10 && alternativeQueries.length > 0) {
      for (const altQuery of alternativeQueries.slice(0, 2)) { // Try up to 2 alternatives
        const altEmbedding = await generateEmbedding(altQuery);
        const altSimilar = findSimilar(altEmbedding, this.embeddings, 10);
        
        // Merge results, avoiding duplicates
        const existingIds = new Set(similar.map(s => s.id));
        for (const alt of altSimilar) {
          if (!existingIds.has(alt.id)) {
            similar.push({ ...alt, score: alt.score * 0.8 }); // Slightly lower score for alternatives
          }
        }
      }
    }
    
    // Retrieve components
    const components = similar
      .map(({ id, score }) => {
        const component = this.components.get(id);
        if (component) {
          return { component, score };
        }
        return null;
      })
      .filter((item): item is { component: Component; score: number } => item !== null);
    
    // Apply filters
    const filtered = this.applyFilters(components, request.filters);
    
    // Sort by relevance (considering both similarity and quality)
    filtered.sort((a, b) => {
      // If we have quality assessments, factor them in
      const aQuality = (a.component as any).qualityAssessment?.overall_score || 5;
      const bQuality = (b.component as any).qualityAssessment?.overall_score || 5;
      
      // Combined score: 70% similarity, 30% quality
      const aFinalScore = (a.score * 0.7) + (aQuality / 10 * 0.3);
      const bFinalScore = (b.score * 0.7) + (bQuality / 10 * 0.3);
      
      return bFinalScore - aFinalScore;
    });
    
    const results = filtered.slice(0, 10).map(item => item.component);
    
    logger.info(`Search returned ${results.length} components`);
    return results;
  }
  
  /**
   * Build query text from search request (fallback method)
   */
  private buildQueryText(request: SearchRequest): string {
    return [
      request.refined.description,
      ...request.refined.requirements,
    ].join(' ');
  }
  
  /**
   * Apply boost factors to search results
   */
  private applyBoostFactors(
    similar: Array<{ id: string; score: number }>,
    boostFactors: Record<string, number>
  ): Array<{ id: string; score: number }> {
    return similar.map(item => {
      const component = this.components.get(item.id);
      if (!component) return item;
      
      let boostedScore = item.score;
      
      // Apply boosts based on component properties
      for (const [factor, boost] of Object.entries(boostFactors)) {
        switch (factor) {
          case 'framework':
            if (component.metadata.technical.framework) {
              boostedScore *= boost;
            }
            break;
          case 'tests':
            if (component.metadata.quality.hasTests) {
              boostedScore *= boost;
            }
            break;
          case 'documentation':
            if (component.metadata.quality.hasDocumentation) {
              boostedScore *= boost;
            }
            break;
          case 'recent':
            const lastUpdated = new Date(component.metadata.quality.lastUpdated);
            const monthsAgo = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsAgo < 6) {
              boostedScore *= boost;
            }
            break;
          case 'popular':
            if (component.metadata.quality.stars > 1000) {
              boostedScore *= boost;
            }
            break;
        }
      }
      
      return { ...item, score: boostedScore };
    });
  }
  
  /**
   * Adapt a component for the user
   */
  async adaptComponent(
    componentId: string,
    context: UserContext,
    customizations?: any
  ): Promise<AdaptedComponent> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }
    
    // Generate adaptation plan based on context
    const plan = await this.generateAdaptationPlan(component, context, customizations);
    
    // Apply adaptations
    const adapted = await this.adaptationEngine.adapt(component, plan, context);
    
    // Save adaptation history for learning
    await this.saveAdaptationHistory(componentId, plan, context);
    
    return adapted;
  }
  
  /**
   * Index a new category
   */
  async indexCategory(category: string, options?: any): Promise<number> {
    logger.info(`Indexing category: ${category}`);
    
    const components = await this.indexer.indexCategory(category, options);
    
    // Store components
    for (const component of components) {
      this.components.set(component.metadata.id, component);
      this.embeddings.push({
        id: component.metadata.id,
        embedding: component.metadata.embedding,
      });
    }
    
    // Cache to database
    await this.cacheComponents(components);
    
    logger.info(`Indexed ${components.length} components for ${category}`);
    return components.length;
  }
  
  /**
   * Generate adaptation plan
   */
  private async generateAdaptationPlan(
    component: Component,
    context: UserContext,
    customizations?: any
  ): Promise<any> {
    const plan: any = {
      component: component.metadata.id,
      transformations: [],
      additions: [],
    };
    
    // Naming convention transformation
    const sourceNaming = component.customization.patterns.find(p => p.type === 'naming');
    if (sourceNaming && sourceNaming.current !== context.project.conventions.naming) {
      plan.transformations.push({
        type: 'pattern',
        pattern: 'naming',
        from: sourceNaming.current,
        to: context.project.conventions.naming,
      });
    }
    
    // Import style transformation
    const sourceImports = component.customization.patterns.find(p => p.type === 'imports');
    if (sourceImports && sourceImports.current !== context.project.conventions.imports) {
      // Would need to analyze imports and transform them
    }
    
    // Framework-specific adaptations
    if (context.project.framework && component.metadata.technical.framework) {
      if (context.project.framework !== component.metadata.technical.framework) {
        // This would require framework migration logic
        logger.warn('Framework migration not yet implemented');
      }
    }
    
    // Apply user customizations
    if (customizations) {
      for (const [key, value] of Object.entries(customizations)) {
        const variable = component.customization.variables.find(v => v.name === key);
        if (variable) {
          plan.transformations.push({
            type: 'configure',
            variable: key,
            value: String(value),
          });
        }
      }
    }
    
    return plan;
  }
  
  /**
   * Apply search filters
   */
  private applyFilters(
    components: Array<{ component: Component; score: number }>,
    filters?: SearchRequest['filters']
  ): Array<{ component: Component; score: number }> {
    if (!filters) return components;
    
    return components.filter(({ component }) => {
      const { metadata } = component;
      
      if (filters.languages && !filters.languages.includes(metadata.technical.language)) {
        return false;
      }
      
      if (filters.frameworks && metadata.technical.framework && 
          !filters.frameworks.includes(metadata.technical.framework)) {
        return false;
      }
      
      if (filters.minStars && metadata.quality.stars < filters.minStars) {
        return false;
      }
      
      if (filters.hasTests !== undefined && metadata.quality.hasTests !== filters.hasTests) {
        return false;
      }
      
      if (filters.license && !filters.license.includes(metadata.source.license)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Load cached components from database
   */
  private async loadCachedComponents(): Promise<void> {
    try {
      // This would load from a components table
      // For now, we'll skip this
      logger.info('Loading cached components...');
    } catch (error) {
      logger.error('Failed to load cached components:', error);
    }
  }
  
  /**
   * Cache components to database
   */
  private async cacheComponents(components: Component[]): Promise<void> {
    try {
      // This would save to a components table
      // For now, we'll skip this
      logger.info(`Caching ${components.length} components`);
    } catch (error) {
      logger.error('Failed to cache components:', error);
    }
  }
  
  /**
   * Save adaptation history for learning
   */
  private async saveAdaptationHistory(
    componentId: string,
    plan: any,
    context: UserContext
  ): Promise<void> {
    try {
      // This helps us learn what adaptations users need
      logger.info('Saving adaptation history');
    } catch (error) {
      logger.error('Failed to save adaptation history:', error);
    }
  }
}

// Export a factory function for easy migration
export function createEnhancedDiscoveryService(
  config: EnhancedDiscoveryServiceConfig
): EnhancedDiscoveryService {
  return new EnhancedDiscoveryService(config);
}
