import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
  AIAssistanceLevelResponseSchema,
  ProductHighLevelDescriptionSchema,
} from './types';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

export const contract = c.router({
  anthropic: {
    sendMessage: {
      method: 'POST',
      path: '/api/anthropic',
      body: z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }),
      responses: {
        200: z.object({
          message: z.string(),
        }),
        500: ErrorResponse,
      },
    },
  },

  productHighLevelDescriptions: {
    getAll: {
      method: 'GET',
      path: '/api/product-high-level-descriptions',
      responses: {
        200: z.array(ProductHighLevelDescriptionSchema),
        500: ErrorResponse,
      },
    },
  },

  learningJournal: {
    addEntry: {
      method: 'POST',
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
      method: 'GET',
      path: '/api/learning-journal/entries',
      responses: {
        200: LearningJournalEntriesResponseSchema,
        500: ErrorResponse,
      },
    },
  },

  prd: {
    generateFromSuggestions: {
      method: 'POST',
      path: '/api/prd-suggestions-to-lean-prd',
      body: z.tuple([
        z.string(),  // improvedDescription
        z.string(),  // successMetric
        z.string(),  // criticalRisk
      ]),
      responses: {
        200: z.any(), // TODO: Define proper response type based on generateLeanPRD return type
        500: ErrorResponse,
      },
    },
  },

  aiAssistance: {
    getLevel: {
      method: 'GET',
      path: '/api/ai-assistance-level',
      responses: {
        200: AIAssistanceLevelResponseSchema,
        500: ErrorResponse,
      },
    },
  },

  github: {
    getIssues: {
      method: 'GET',
      path: '/api/github/issues',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          number: z.number(),
          title: z.string(),
          body: z.string(),
          labels: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
        500: ErrorResponse,
      },
    },
  },
}); 