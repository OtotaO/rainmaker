/**
 * Socratic Dialogue Engine
 * 
 * Guides users through questions to refine their needs and find the perfect component.
 * This is how we bridge the gap between vague ideas and specific solutions.
 */

import { z } from 'zod';
import type { DialogueNode, SearchRequest, UserContext } from '../types';
import { DialogueNodeSchema } from '../types';
import { logger } from '../utils/logger';

/**
 * Dialogue tree for different categories
 */
const dialogueTrees: Record<string, DialogueNode[]> = {
  auth: [
    {
      id: 'auth-type',
      question: 'What type of authentication do you need?',
      type: 'single-choice',
      options: [
        { value: 'oauth', label: 'OAuth (Google, GitHub, etc.)', followUp: 'auth-providers' },
        { value: 'jwt', label: 'JWT-based authentication', followUp: 'auth-storage' },
        { value: 'session', label: 'Session-based authentication', followUp: 'auth-storage' },
        { value: 'passwordless', label: 'Passwordless (magic links)', followUp: 'auth-delivery' },
        { value: 'multi-factor', label: 'Multi-factor authentication', followUp: 'auth-factors' },
      ],
      impact: {
        tags: ['authentication'],
      },
    },
    {
      id: 'auth-providers',
      question: 'Which OAuth providers do you need to support?',
      type: 'multi-choice',
      options: [
        { value: 'google', label: 'Google', followUp: 'auth-features' },
        { value: 'github', label: 'GitHub', followUp: 'auth-features' },
        { value: 'facebook', label: 'Facebook', followUp: 'auth-features' },
        { value: 'twitter', label: 'Twitter/X', followUp: 'auth-features' },
        { value: 'custom', label: 'Custom OAuth provider', followUp: 'auth-features' },
      ],
      impact: {
        tags: ['oauth'],
      },
    },
    {
      id: 'auth-storage',
      question: 'Where will you store user sessions/tokens?',
      type: 'single-choice',
      options: [
        { value: 'database', label: 'Database (PostgreSQL, MySQL, etc.)', followUp: 'auth-features' },
        { value: 'redis', label: 'Redis', followUp: 'auth-features' },
        { value: 'memory', label: 'In-memory (development only)', followUp: 'auth-features' },
        { value: 'client', label: 'Client-side only (JWT)', followUp: 'auth-features' },
      ],
      impact: {
        boost: { 'database': 1.5 },
      },
    },
    {
      id: 'auth-features',
      question: 'Which additional features do you need?',
      type: 'multi-choice',
      options: [
        { value: 'remember-me', label: 'Remember me functionality' },
        { value: 'password-reset', label: 'Password reset' },
        { value: 'email-verification', label: 'Email verification' },
        { value: 'role-based', label: 'Role-based access control' },
        { value: 'api-keys', label: 'API key management' },
      ],
      impact: {
        tags: [],
      },
    },
  ],
  
  payments: [
    {
      id: 'payment-provider',
      question: 'Which payment provider are you using?',
      type: 'single-choice',
      options: [
        { value: 'stripe', label: 'Stripe', followUp: 'payment-features' },
        { value: 'paypal', label: 'PayPal', followUp: 'payment-features' },
        { value: 'square', label: 'Square', followUp: 'payment-features' },
        { value: 'custom', label: 'Custom payment gateway', followUp: 'payment-features' },
      ],
      impact: {
        tags: ['payments'],
      },
    },
    {
      id: 'payment-features',
      question: 'What payment features do you need?',
      type: 'multi-choice',
      options: [
        { value: 'one-time', label: 'One-time payments' },
        { value: 'subscriptions', label: 'Recurring subscriptions' },
        { value: 'invoicing', label: 'Invoice generation' },
        { value: 'refunds', label: 'Refund processing' },
        { value: 'webhooks', label: 'Webhook handling' },
      ],
      impact: {
        tags: [],
      },
    },
  ],
  
  database: [
    {
      id: 'db-type',
      question: 'What type of database are you using?',
      type: 'single-choice',
      options: [
        { value: 'postgresql', label: 'PostgreSQL', followUp: 'db-orm' },
        { value: 'mysql', label: 'MySQL', followUp: 'db-orm' },
        { value: 'mongodb', label: 'MongoDB', followUp: 'db-odm' },
        { value: 'sqlite', label: 'SQLite', followUp: 'db-orm' },
        { value: 'redis', label: 'Redis', followUp: 'db-features' },
      ],
      impact: {
        tags: ['database'],
      },
    },
    {
      id: 'db-orm',
      question: 'Which ORM/query builder do you prefer?',
      type: 'single-choice',
      options: [
        { value: 'prisma', label: 'Prisma', followUp: 'db-features' },
        { value: 'typeorm', label: 'TypeORM', followUp: 'db-features' },
        { value: 'sequelize', label: 'Sequelize', followUp: 'db-features' },
        { value: 'knex', label: 'Knex.js', followUp: 'db-features' },
        { value: 'raw', label: 'Raw SQL queries', followUp: 'db-features' },
      ],
      impact: {
        tags: [],
      },
    },
    {
      id: 'db-features',
      question: 'What database features do you need?',
      type: 'multi-choice',
      options: [
        { value: 'migrations', label: 'Database migrations' },
        { value: 'transactions', label: 'Transaction support' },
        { value: 'connection-pooling', label: 'Connection pooling' },
        { value: 'caching', label: 'Query caching' },
        { value: 'monitoring', label: 'Performance monitoring' },
      ],
      impact: {
        tags: [],
      },
    },
  ],
};

export class SocraticDialogue {
  private responses: Map<string, any> = new Map();
  private currentPath: string[] = [];
  
  /**
   * Start a dialogue for a category
   */
  startDialogue(category: string): DialogueNode | null {
    const tree = dialogueTrees[category];
    if (!tree || tree.length === 0) {
      logger.warn(`No dialogue tree for category: ${category}`);
      return null;
    }
    
    this.responses.clear();
    this.currentPath = [tree[0].id];
    
    return tree[0];
  }
  
  /**
   * Process a user response and get the next question
   */
  processResponse(nodeId: string, response: any): DialogueNode | null {
    // Store the response
    this.responses.set(nodeId, response);
    
    // Find the current node
    const currentNode = this.findNode(nodeId);
    if (!currentNode) {
      logger.error(`Node not found: ${nodeId}`);
      return null;
    }
    
    // Determine the next node
    let nextNodeId: string | undefined;
    
    if (currentNode.type === 'single-choice' && currentNode.options) {
      const selected = currentNode.options.find(opt => opt.value === response);
      nextNodeId = selected?.followUp;
    } else if (currentNode.type === 'multi-choice' && currentNode.options) {
      // For multi-choice, use the first follow-up found
      const selected = currentNode.options.find(opt => 
        Array.isArray(response) && response.includes(opt.value)
      );
      nextNodeId = selected?.followUp;
    }
    
    if (!nextNodeId) {
      // No more questions - dialogue complete
      return null;
    }
    
    const nextNode = this.findNode(nextNodeId);
    if (nextNode) {
      this.currentPath.push(nextNodeId);
    }
    
    return nextNode;
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
      const node = this.findNode(nodeId);
      if (!node) continue;
      
      // Add impact tags
      if (node.impact.tags) {
        tags.push(...node.impact.tags);
      }
      
      // Add boosts
      if (node.impact.boost) {
        Object.assign(boosts, node.impact.boost);
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
   * Generate a refined description from responses
   */
  private generateRefinedDescription(category: string): string {
    const parts: string[] = [`Looking for a ${category} solution`];
    
    // Add specific details based on responses
    const authType = this.responses.get('auth-type');
    if (authType) {
      parts.push(`using ${authType} authentication`);
    }
    
    const providers = this.responses.get('auth-providers');
    if (providers && Array.isArray(providers)) {
      parts.push(`with ${providers.join(' and ')} support`);
    }
    
    const storage = this.responses.get('auth-storage');
    if (storage) {
      parts.push(`storing sessions in ${storage}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Find a node by ID across all trees
   */
  private findNode(nodeId: string): DialogueNode | null {
    for (const tree of Object.values(dialogueTrees)) {
      const node = tree.find(n => n.id === nodeId);
      if (node) return node;
    }
    return null;
  }
  
  /**
   * Get suggested categories based on initial query
   */
  static suggestCategories(query: string): string[] {
    const queryLower = query.toLowerCase();
    const suggestions: string[] = [];
    
    const categoryKeywords: Record<string, string[]> = {
      auth: ['login', 'auth', 'user', 'sign in', 'oauth', 'jwt', 'session'],
      payments: ['payment', 'stripe', 'billing', 'subscription', 'checkout'],
      database: ['database', 'db', 'sql', 'postgres', 'mysql', 'mongodb', 'orm'],
      api: ['api', 'rest', 'graphql', 'endpoint', 'route'],
      email: ['email', 'mail', 'smtp', 'sendgrid', 'ses'],
      storage: ['storage', 's3', 'file', 'upload', 'cdn'],
      search: ['search', 'elasticsearch', 'algolia', 'full-text'],
      cache: ['cache', 'redis', 'memcached', 'caching'],
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        suggestions.push(category);
      }
    }
    
    // If no specific matches, suggest general categories
    if (suggestions.length === 0) {
      suggestions.push('auth', 'database', 'api');
    }
    
    return suggestions;
  }
}