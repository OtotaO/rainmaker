/**
 * Discovery Route Implementation
 * 
 * Implements the discovery API endpoints
 */

import { DiscoveryService } from '../services/discovery-service';
import { SocraticDialogue } from '../services/socratic-dialogue';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// In-memory session storage (use Redis in production)
const dialogueSessions = new Map<string, any>();

export function createDiscoveryRouter(discoveryService: DiscoveryService) {
  return {
    startDiscovery: async ({ body }: any) => {
      try {
        const result = await discoveryService.discover(body.query, body.context);
        return {
          status: 200,
          body: {
            suggestions: result.suggestions || [],
            dialogue: result.dialogue,
          },
        };
      } catch (error) {
        logger.error('Error starting discovery:', error);
        return {
          status: 500,
          body: { error: 'Failed to start discovery' },
        };
      }
    },
    
    startDialogue: async ({ body }: any) => {
      try {
        const sessionId = uuidv4();
        const dialogue = new SocraticDialogue();
        const firstQuestion = dialogue.startDialogue(body.category);
        
        if (!firstQuestion) {
          return {
            status: 404,
            body: { error: 'No dialogue available for this category' },
          };
        }
        
        // Store session
        dialogueSessions.set(sessionId, {
          dialogue,
          category: body.category,
          context: body.context,
          originalQuery: body.context.query || body.category,
        });
        
        return {
          status: 200,
          body: {
            dialogue: firstQuestion,
            sessionId,
          },
        };
      } catch (error) {
        logger.error('Error starting dialogue:', error);
        return {
          status: 500,
          body: { error: 'Failed to start dialogue' },
        };
      }
    },
    
    continueDialogue: async ({ body }: any) => {
      try {
        const session = dialogueSessions.get(body.sessionId);
        if (!session) {
          return {
            status: 404,
            body: { error: 'Session not found' },
          };
        }
        
        const result = await discoveryService.continueDialogue(
          session,
          body.nodeId,
          body.response
        );
        
        // Update session if needed
        if (result.searchRequest) {
          session.searchRequest = result.searchRequest;
        }
        
        return {
          status: 200,
          body: result,
        };
      } catch (error) {
        logger.error('Error continuing dialogue:', error);
        return {
          status: 500,
          body: { error: 'Failed to continue dialogue' },
        };
      }
    },
    
    search: async ({ body }: any) => {
      try {
        const components = await discoveryService.search(body);
        return {
          status: 200,
          body: {
            components,
            total: components.length,
          },
        };
      } catch (error) {
        logger.error('Error searching:', error);
        return {
          status: 500,
          body: { error: 'Search failed' },
        };
      }
    },
    
    getComponent: async ({ params }: any) => {
      try {
        // This would fetch from the discovery service
        // For now, return not found
        return {
          status: 404,
          body: { error: 'Component not found' },
        };
      } catch (error) {
        logger.error('Error getting component:', error);
        return {
          status: 500,
          body: { error: 'Failed to get component' },
        };
      }
    },
    
    adaptComponent: async ({ body }: any) => {
      try {
        const adapted = await discoveryService.adaptComponent(
          body.componentId,
          body.context,
          body.customizations
        );
        
        return {
          status: 200,
          body: adapted,
        };
      } catch (error) {
        logger.error('Error adapting component:', error);
        return {
          status: 500,
          body: { error: 'Failed to adapt component' },
        };
      }
    },
    
    indexCategory: async ({ body }: any) => {
      try {
        const startTime = Date.now();
        const componentsIndexed = await discoveryService.indexCategory(
          body.category,
          body.options
        );
        
        return {
          status: 200,
          body: {
            category: body.category,
            componentsIndexed,
            duration: Date.now() - startTime,
          },
        };
      } catch (error) {
        logger.error('Error indexing category:', error);
        return {
          status: 500,
          body: { error: 'Failed to index category' },
        };
      }
    },
    
    getIndexStatus: async () => {
      try {
        // This would fetch from the discovery service
        // For now, return empty status
        return {
          status: 200,
          body: {
            categories: [],
            totalComponents: 0,
          },
        };
      } catch (error) {
        logger.error('Error getting index status:', error);
        return {
          status: 500,
          body: { error: 'Failed to get index status' },
        };
      }
    },
  };
}