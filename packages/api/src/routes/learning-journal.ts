import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { LearningJournalService } from '../learningJournalService';
import { 
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
} from '../../../shared/src/types';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the contract
const contract = {
  addEntry: {
    method: 'POST' as const,
    path: '/api/learning-journal/entry',
    body: LearningJournalEntryRequestSchema,
    responses: {
      201: z.object({
        message: z.string(),
      }),
      400: ErrorResponse,
      500: ErrorResponse,
    },
  },
  getEntries: {
    method: 'GET' as const,
    path: '/api/learning-journal/entries',
    responses: {
      200: LearningJournalEntriesResponseSchema,
      500: ErrorResponse,
    },
  },
} as const;

// Create the router from the contract
export const learningJournalRouter = c.router(contract);

// Create the implementation using the contract
export const createLearningJournalRouter = (learningJournalService: LearningJournalService) => ({
  // Implementation sits right next to its contract definition
  addEntry: async ({ body }: ServerInferRequest<typeof contract.addEntry>) => {
    try {
      await learningJournalService.addEntry(body);
      return {
        status: 201 as const,
        body: { message: 'Entry added successfully' },
      };
    } catch (error) {
      console.error('Error adding journal entry:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to add journal entry. Please try again later.' },
      };
    }
  },
  getEntries: async () => {
    try {
      const entries = await learningJournalService.getEntries();
      return {
        status: 200 as const,
        body: entries,
      };
    } catch (error) {
      console.error('Error retrieving journal entries:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to retrieve journal entries. Please try again later.' },
      };
    }
  },
}); 