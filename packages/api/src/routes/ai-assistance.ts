import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { LearningJournalService } from '../learningJournalService';
import { AIAssistanceLevelResponseSchema } from '../../../shared/src/types';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the contract
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

// Create the router from the contract
export const aiAssistanceRouter = c.router(contract);

// Create the implementation using the contract
export const createAiAssistanceRouter = (learningJournalService: LearningJournalService) => ({
  // Implementation sits right next to its contract definition
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