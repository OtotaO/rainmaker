/**
 * Discovery API Routes
 * 
 * RESTful API for the component discovery system
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { 
  ComponentSchema, 
  UserContextSchema, 
  DialogueNodeSchema,
  SearchRequestSchema,
  AdaptedComponentSchema 
} from '../types';

const c = initContract();

export const discoveryContract = c.router({
  // Start discovery process
  startDiscovery: {
    method: 'POST',
    path: '/api/discovery/start',
    responses: {
      200: z.object({
        suggestions: z.array(z.string()),
        dialogue: DialogueNodeSchema.optional(),
      }),
    },
    body: z.object({
      query: z.string(),
      context: UserContextSchema,
    }),
    summary: 'Start the discovery process with a user query',
  },
  
  // Start dialogue for a category
  startDialogue: {
    method: 'POST',
    path: '/api/discovery/dialogue/start',
    responses: {
      200: z.object({
        dialogue: DialogueNodeSchema,
        sessionId: z.string(),
      }),
    },
    body: z.object({
      category: z.string(),
      context: UserContextSchema,
    }),
    summary: 'Start Socratic dialogue for a category',
  },
  
  // Continue dialogue
  continueDialogue: {
    method: 'POST',
    path: '/api/discovery/dialogue/continue',
    responses: {
      200: z.object({
        nextQuestion: DialogueNodeSchema.optional(),
        components: z.array(ComponentSchema).optional(),
        searchRequest: SearchRequestSchema.optional(),
      }),
    },
    body: z.object({
      sessionId: z.string(),
      nodeId: z.string(),
      response: z.any(),
    }),
    summary: 'Continue dialogue with user response',
  },
  
  // Direct search
  search: {
    method: 'POST',
    path: '/api/discovery/search',
    responses: {
      200: z.object({
        components: z.array(ComponentSchema),
        total: z.number(),
      }),
    },
    body: SearchRequestSchema,
    summary: 'Search for components directly',
  },
  
  // Get component details
  getComponent: {
    method: 'GET',
    path: '/api/discovery/components/:id',
    responses: {
      200: ComponentSchema,
      404: z.object({ error: z.string() }),
    },
    params: z.object({
      id: z.string(),
    }),
    summary: 'Get detailed information about a component',
  },
  
  // Adapt component
  adaptComponent: {
    method: 'POST',
    path: '/api/discovery/adapt',
    responses: {
      200: AdaptedComponentSchema,
    },
    body: z.object({
      componentId: z.string(),
      context: UserContextSchema,
      customizations: z.record(z.any()).optional(),
    }),
    summary: 'Adapt a component for user context',
  },
  
  // Index management
  indexCategory: {
    method: 'POST',
    path: '/api/discovery/index',
    responses: {
      200: z.object({
        category: z.string(),
        componentsIndexed: z.number(),
        duration: z.number(),
      }),
    },
    body: z.object({
      category: z.string(),
      options: z.object({
        minStars: z.number().optional(),
        languages: z.array(z.string()).optional(),
        limit: z.number().optional(),
      }).optional(),
    }),
    summary: 'Index components for a category',
  },
  
  // Get indexing status
  getIndexStatus: {
    method: 'GET',
    path: '/api/discovery/index/status',
    responses: {
      200: z.object({
        categories: z.array(z.object({
          name: z.string(),
          componentCount: z.number(),
          lastIndexed: z.string().datetime(),
        })),
        totalComponents: z.number(),
      }),
    },
    summary: 'Get current indexing status',
  },
});