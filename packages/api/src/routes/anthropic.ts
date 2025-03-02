/**
 * @fileoverview Anthropic API integration routes and contract definitions.
 * Handles communication with the Anthropic AI service for message processing.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { Anthropic } from '@anthropic-ai/sdk';

const c = initContract();

/**
 * Standard error response schema for Anthropic endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for Anthropic endpoints
 * @property {Object} sendMessage - Contract for the message sending endpoint
 */
const contract = {
  sendMessage: {
    method: 'POST' as const,
    path: '/api/anthropic',
    body: z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })),
    }),
    responses: {
      200: z.object({ message: z.string() }),
      500: ErrorResponse,
    },
  },
} as const;

/**
 * Router instance created from the Anthropic contract
 */
export const anthropicRouter = c.router(contract);

/**
 * Creates the implementation for Anthropic routes
 * @param {Anthropic} anthropic - Initialized Anthropic client instance
 * @returns {Object} Route implementations for Anthropic endpoints
 */
export const createAnthropicRouter = (anthropic: Anthropic) => ({
  sendMessage: async ({ body }: ServerInferRequest<typeof contract.sendMessage>) => {
    try {
      console.log('Sending request to Anthropic:', {
        ...body,
        model: 'claude-3-7-sonnet-latest',
        max_tokens: 1000,
      });

      const response = (await anthropic.messages.create({
        ...body,
        model: 'claude-3-7-sonnet-latest',
        max_tokens: 1000,
      })) as { content: Anthropic.Messages.TextBlock[] };

      return {
        status: 200 as const,
        body: { message: response.content[0].text },
      };
    } catch (error) {
      console.error('Error getting response from Anthropic:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to get response from Anthropic. Please try again later.' },
      };
    }
  },
}); 