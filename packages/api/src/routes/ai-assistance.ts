/**
 * @fileoverview AI Assistance API routes and contract definitions.
 * Handles the calculation and retrieval of AI assistance levels.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { LearningJournalService } from '../learningJournalService';
import { AIAssistanceLevelResponseSchema } from '../../../shared/src/types';

const c = initContract();

/**
 * Standard error response schema for AI Assistance endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for AI Assistance endpoints
 * @property {Object} getLevel - Contract for retrieving AI assistance level
 */
const contract = {
  getLevel: {
    method: 'GET' as const,
    path: '/api/ai-assistance-level',
    responses: {
      200: AIAssistanceLevelResponseSchema,
      500: ErrorResponse,
    },
  },
} as const;

/**
 * Router instance created from the AI Assistance contract
 */
export const aiAssistanceRouter = c.router(contract);

/**
 * Creates the implementation for AI Assistance routes
 * @param {LearningJournalService} learningJournalService - Service for calculating AI assistance levels
 * @returns {Object} Route implementations for AI Assistance endpoints
 */
export const createAiAssistanceRouter = (learningJournalService: LearningJournalService) => ({
  /**
   * Calculates and retrieves the current AI assistance level
   * @returns {Promise<Object>} Response containing assistance level or error
   */
  getLevel: async () => {
    try {
      const assistanceLevel = await learningJournalService.calculateAIAssistanceLevel();
      return {
        status: 200 as const,
        body: assistanceLevel,
      };
    } catch (error) {
      console.error('Error calculating AI assistance level:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to calculate AI assistance level. Please try again later.' },
      };
    }
  },
}); 