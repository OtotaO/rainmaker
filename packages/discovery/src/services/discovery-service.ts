/**
 * Main Discovery Service
 * 
 * This is the orchestrator that ties all the pieces together.
 * It handles the complete flow from user query to adapted code.
 */

import { PrismaClient } from '@prisma/client';
import type { 
  Component, 
  SearchRequest, 
  UserContext, 
  AdaptedComponent,
  DialogueNode 
} from '../types';
import { GitHubIndexer } from './github-indexer';
import { SocraticDialogue } from './socratic-dialogue-enhanced';
import { AdaptationEngine } from './adaptation-engine';
import { generateEmbedding, findSimilar } from './embedding';
import { logger } from '../utils/logger';

export interface DiscoveryServiceConfig {
  prisma: PrismaClient;
  githubToken: string;
  anthropicApiKey: string;
}

export class DiscoveryService {
  private prisma: PrismaClient;
  private indexer: GitHubIndexer;
  private adaptationEngine: AdaptationEngine;
  private components: Map<string, Component> = new Map();
  private embeddings: Array<{ id: string; embedding: number[] }> = [];
  
  constructor(config: DiscoveryServiceConfig) {
    this.prisma = config.prisma;
    this.indexer = new GitHubIndexer(config.githubToken);
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
      
      // Perform search
      const components = await this.search(searchRequest);
      
      return { searchRequest, components };
    }
    
    return { nextQuestion };
  }
  
  /**
   * Search for components
   */
  async search(request: SearchRequest): Promise<Component[]> {
    logger.info('Searching for components', request);
    
    // Generate embedding for the search query
    const queryText = [
      request.refined.description,
      ...request.refined.requirements,
    ].join(' ');
    
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Find similar components
    const similar = findSimilar(queryEmbedding, this.embeddings, 20);
    
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
    
    // Sort by relevance
    filtered.sort((a, b) => b.score - a.score);
    
    return filtered.slice(0, 10).map(item => item.component);
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
