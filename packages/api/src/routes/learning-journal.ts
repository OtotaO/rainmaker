/**
 * @fileoverview Learning Journal API routes and contract definitions.
 * Handles the creation and retrieval of learning journal entries.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { LearningJournalService } from '../learningJournalService';
import { 
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
} from '../../../shared/src/types';

const c = initContract();

/**
 * Standard error response schema for Learning Journal endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for Learning Journal endpoints
 * @property {Object} addEntry - Contract for creating new journal entries
 * @property {Object} getEntries - Contract for retrieving journal entries
 */
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

/**
 * Router instance created from the Learning Journal contract
 */
export const learningJournalRouter = c.router(contract);

/**
 * Creates the implementation for Learning Journal routes
 * @param {LearningJournalService} learningJournalService - Service for managing learning journal entries
 * @returns {Object} Route implementations for Learning Journal endpoints
 */
export const createLearningJournalRouter = (learningJournalService: LearningJournalService) => ({
  /**
   * Handles the creation of a new learning journal entry
   * @param {Object} params - Request parameters
   * @param {Object} params.body - The entry data to be created
   * @returns {Promise<Object>} Response containing success message or error
   */
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

  /**
   * Retrieves all learning journal entries
   * @returns {Promise<Object>} Response containing entries or error
   */
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