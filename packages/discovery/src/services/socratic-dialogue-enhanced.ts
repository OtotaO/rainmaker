/**
 * Enhanced Socratic Dialogue Engine with LLM Integration
 * 
 * Uses BoundaryML to generate adaptive questions while maintaining
 * backward compatibility with static dialogue trees.
 */

import { z } from 'zod';
import crypto from 'crypto';
import type { DialogueNode, SearchRequest, UserContext, SocraticResponse, DialogueState } from '../types'; // Add DialogueState
import { DialogueNodeSchema, SocraticResponseSchema, DialogueStateSchema } from '../types'; // Add DialogueStateSchema
import type { BAMLClient, BamlDialogueQuestion } from '../types/baml';
import { logger } from '../utils/logger';

// Import the original static dialogue for fallback
import { SocraticDialogue as StaticSocraticDialogue } from './socratic-dialogue';

/**
 * Enhanced Socratic Dialogue with LLM-powered adaptive questioning
 */
export class SocraticDialogue {
  private responses: Map<string, SocraticResponse> = new Map();
  private currentPath: string[] = [];
  private bamlClient: BAMLClient | null = null;
  private staticFallback: StaticSocraticDialogue;
  private generatedNodes: Map<string, DialogueNode> = new Map();
  
  // Private backing fields for properties exposed via getters
  private _category: string = '';
  private _originalQuery: string = '';
  private _userContext: UserContext | null = null;
  
  // Public getters for state needed by other services
  public get originalQuery(): string {
    return this._originalQuery;
  }

  public get category(): string {
    return this._category;
  }

  public get userContext(): UserContext | null {
    return this._userContext;
  }

  constructor(initialState?: DialogueState) { // Allow optional initial state
    this.staticFallback = new StaticSocraticDialogue();
    if (initialState) {
      this.restoreState(initialState);
    } else {
      this.initializeBAML();
    }
  }

  /**
   * Restores the internal state of the SocraticDialogue from a DialogueState object.
   * This is used when continuing a dialogue across different requests.
   * @param state The DialogueState object to restore from.
   */
  public restoreState(state: DialogueState): void {
    this.responses = new Map(Object.entries(state.responses));
    this.currentPath = state.currentPath;
    this.generatedNodes = new Map(Object.entries(state.generatedNodes));
    this._category = state.category; // Use internal private property
    this._originalQuery = state.originalQuery; // Use internal private property
    this._userContext = state.userContext; // Use internal private property
    this.initializeBAML(); // Re-initialize BAML client after state restoration
  }
  
  /**
   * Initialize BAML client with graceful fallback
   */
  private async initializeBAML() {
    try {
      const { b } = await import('../../baml_client');
      this.bamlClient = b as BAMLClient; // Cast to our defined BAMLClient type
      logger.info('BAML client initialized for Socratic Dialogue');
    } catch (error) {
      logger.warn('BAML client not available, using static dialogue trees', error);
    }
  }
  
  /**
   * Start a dialogue for a category
   */
  async startDialogue(
    category: string, 
    query: string, 
    context: UserContext
  ): Promise<DialogueNode | null> {
    this.responses.clear();
    this.currentPath = [];
    this.generatedNodes.clear();
    this._category = category;
    this._originalQuery = query;
    this._userContext = context;
    
    // Try LLM generation first
    if (this.bamlClient) {
      try {
        const contextStr = `Project: ${this._userContext?.project.language} ${this._userContext?.project.framework || 'project'}`;
        const dialogueQuestions = await this.bamlClient.GenerateDialogueQuestions(
          query,
          category,
          [],
          contextStr
        );
        
        if (dialogueQuestions.questions && dialogueQuestions.questions.length > 0) {
          const firstQuestionData = dialogueQuestions.questions[0];
          if (firstQuestionData) { // Explicit check for undefined
            const firstQuestion = this.convertToDialogueNode(firstQuestionData);
            this.currentPath.push(firstQuestion.id);
            return firstQuestion;
          }
        }
      } catch (error) {
        logger.warn('LLM dialogue generation failed, falling back to static', error);
      }
    }
    
    // Fallback to static dialogue
    return this.staticFallback.startDialogue(category);
  }
  
  /**
   * Process a user response and get the next question
   */
  async processResponse(nodeId: string, response: SocraticResponse): Promise<DialogueNode | null> {
    // Store the response
    this.responses.set(nodeId, response);
    
    // Check if this is a generated node
    const currentNode = this.generatedNodes.get(nodeId);
    if (currentNode && this.bamlClient && this.userContext) {
      // Generate next question based on all responses so far
      try {
        const responseHistory = this.buildResponseHistory();
        const contextStr = `Project: ${this._userContext?.project.language} ${this._userContext?.project.framework || 'project'}`;
        
        const dialogueQuestions = await this.bamlClient.GenerateDialogueQuestions(
          this.originalQuery,
          this.category,
          responseHistory,
          contextStr
        );
        
        // Check if we should continue or stop
        if (dialogueQuestions.questions && dialogueQuestions.questions.length > 0) {
          // Filter out questions we've already asked
          const newQuestions = dialogueQuestions.questions.filter((q: BamlDialogueQuestion) => 
            !this.hasAskedSimilarQuestion(q.question)
          );
          
          if (newQuestions.length > 0) {
            const nextQuestionData = newQuestions[0];
            if (nextQuestionData) { // Explicit check for undefined
              const nextQuestion = this.convertToDialogueNode(nextQuestionData);
              this.currentPath.push(nextQuestion.id);
              return nextQuestion;
            }
          }
        }
        
        // No more questions needed
        return null;
      } catch (error) {
        logger.warn('LLM response processing failed, ending dialogue', error);
        return null;
      }
    }
    
    // Fallback to static processing
    return this.staticFallback.processResponse(nodeId, response);
  }
  
  /**
   * Build a search request from the collected responses
   */
  buildSearchRequest(
    originalQuery: string,
    category: string,
    context: UserContext
  ): SearchRequest {
    const requirements: string[] = [];
    const constraints: string[] = [];
    const tags: string[] = [category];
    const boosts: Record<string, number> = {};
    
    // Process all responses to build search criteria
    for (const [nodeId, response] of this.responses) {
      const node = this.generatedNodes.get(nodeId) || this.findStaticNode(nodeId);
      if (!node) continue;
      
      // For generated nodes, infer impacts from question content
      if (this.generatedNodes.has(nodeId)) {
        // Ensure response is string for inferTagsFromQuestion and inferBoostsFromResponse
        const responseStr = typeof response === 'string' ? response : (Array.isArray(response) ? response.join(', ') : '');
        const inferredTags = this.inferTagsFromQuestion(node.question, responseStr);
        tags.push(...inferredTags);
        
        const inferredBoosts = this.inferBoostsFromResponse(node.question, responseStr);
        Object.assign(boosts, inferredBoosts);
      } else if (node.impact) {
        // Static node with predefined impacts
        if (node.impact.tags) {
          tags.push(...node.impact.tags);
        }
        if (node.impact.boost) {
          Object.assign(boosts, node.impact.boost);
        }
      }
      
      // Build requirements from responses
      if (node.type === 'single-choice') {
        requirements.push(`${node.question} ${response}`);
      } else if (node.type === 'multi-choice' && Array.isArray(response)) {
        requirements.push(`${node.question} ${response.join(', ')}`);
      }
    }
    
    // Build refined description
    const refinedDescription = this.generateRefinedDescription(category);
    
    return {
      query: originalQuery,
      refined: {
        description: refinedDescription,
        requirements,
        constraints,
      },
      context,
      filters: {
        languages: [context.project.language],
        frameworks: context.project.framework ? [context.project.framework] : undefined,
        minStars: 50,
        hasTests: true,
      },
    };
  }
  
  /**
   * Convert BAML DialogueQuestion to DialogueNode
   */
  private convertToDialogueNode(question: BamlDialogueQuestion): DialogueNode {
    // Generate stable ID from question content
    const id = this.generateQuestionId(question.question);
    
    const node: DialogueNode = {
      id,
      question: question.question,
      type: question.type, // Type is now directly from BamlDialogueQuestion
      options: question.options?.map((opt: string) => ({
        value: this.generateOptionValue(opt),
        label: opt,
        followUp: question.follow_up
      })),
      impact: {
        tags: [],
        boost: {}
      }
    };
    
    this.generatedNodes.set(id, node);
    return node;
  }
  
  /**
   * Generate stable ID for a question
   */
  private generateQuestionId(question: string): string {
    const hash = crypto.createHash('md5').update(question).digest('hex');
    return `gen-${hash.substring(0, 8)}`;
  }
  
  /**
   * Generate value from option label
   */
  private generateOptionValue(label: string): string {
    return label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Build response history for LLM context
   */
  private buildResponseHistory(): string[] {
    const history: string[] = [];
    
    for (const [nodeId, response] of this.responses) {
      const node = this.generatedNodes.get(nodeId) || this.findStaticNode(nodeId);
      if (!node) continue;
      
      // Ensure response is string for history
      const responseStr = typeof response === 'string' ? response : (Array.isArray(response) ? response.join(', ') : '');

      if (node.type === 'single-choice') {
        const option = node.options?.find(opt => opt.value === responseStr);
        history.push(`Q: ${node.question} A: ${option?.label || responseStr}`);
      } else if (node.type === 'multi-choice' && Array.isArray(response)) {
        const labels = response.map(val => 
          node.options?.find(opt => opt.value === val)?.label || val
        );
        history.push(`Q: ${node.question} A: ${labels.join(', ')}`);
      } else if (node.type === 'text') {
        history.push(`Q: ${node.question} A: ${responseStr}`);
      }
    }
    
    return history;
  }
  
  /**
   * Check if we've asked a similar question
   */
  private hasAskedSimilarQuestion(question: string): boolean {
    const questionLower = question.toLowerCase();
    
    for (const node of this.generatedNodes.values()) {
      const existingLower = node.question.toLowerCase();
      
      // Simple similarity check - could be enhanced with better NLP
      if (existingLower.includes(questionLower) || questionLower.includes(existingLower)) {
        return true;
      }
      
      // Check for key phrase overlap
      const existingWords = new Set(existingLower.split(/\s+/));
      const newWords = questionLower.split(/\s+/);
      const overlap = newWords.filter(word => existingWords.has(word)).length;
      
      if (overlap / newWords.length > 0.7) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Infer tags from question and response
   */
  private inferTagsFromQuestion(question: string, response: string): string[] {
    const tags: string[] = [];
    const questionLower = question.toLowerCase();
    const responseLower = response.toLowerCase();
    
    // Common patterns to tags
    const patterns: Record<string, string[]> = {
      authentication: ['auth', 'login', 'oauth', 'jwt', 'session'],
      database: ['database', 'sql', 'postgres', 'mysql', 'mongodb'],
      payment: ['payment', 'stripe', 'billing', 'subscription'],
      api: ['api', 'rest', 'graphql', 'endpoint'],
      storage: ['storage', 's3', 'file', 'upload'],
    };
    
    for (const [tag, keywords] of Object.entries(patterns)) {
      if (keywords.some(kw => questionLower.includes(kw) || responseLower.includes(kw))) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  /**
   * Infer boost factors from response
   */
  private inferBoostsFromResponse(question: string, response: string): Record<string, number> {
    const boosts: Record<string, number> = {};
    const responseLower = response.toLowerCase();
    
    // Boost patterns based on common preferences
    if (responseLower.includes('postgres')) boosts['postgresql'] = 1.5;
    if (responseLower.includes('mysql')) boosts['mysql'] = 1.5;
    if (responseLower.includes('stripe')) boosts['stripe'] = 2.0;
    if (responseLower.includes('oauth')) boosts['oauth'] = 1.5;
    if (responseLower.includes('jwt')) boosts['jwt'] = 1.5;
    
    return boosts;
  }
  
  /**
   * Generate a refined description from responses
   */
  private generateRefinedDescription(category: string): string {
    const parts: string[] = [`Looking for a ${category} solution`];
    
    // Build description from response history
    const history = this.buildResponseHistory();
    if (history.length > 0) {
      // Extract key details from Q&A pairs
      const details = history.map(h => {
        const [q, a] = h.split(' A: ');
        return a;
      }).filter(Boolean);
      
      if (details.length > 0) {
        parts.push(`with ${details.join(', ')}`);
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Find a node in static trees (for fallback)
   */
  private findStaticNode(nodeId: string): DialogueNode | null {
    // This would need access to the static dialogue trees
    // For now, return null and let the static fallback handle it
    return null;
  }
  
  /**
   * Get suggested categories based on initial query
   */
  static async suggestCategories(query: string, bamlClient?: BAMLClient): Promise<string[]> {
    // Try LLM-based category suggestion if available
    if (bamlClient) {
      try {
        // We could add a new BAML function for this, but for now use pattern matching
        logger.info('Using LLM for category suggestions in future version');
      } catch (error) {
        logger.warn('LLM category suggestion failed', error);
      }
    }
    
    // Use static implementation
    return StaticSocraticDialogue.suggestCategories(query);
  }
}
