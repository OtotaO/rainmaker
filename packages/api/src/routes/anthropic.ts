/**
 * @fileoverview Anthropic API integration routes and contract definitions.
 * Handles communication with the Anthropic AI service for message processing.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { MessageRoleSchema } from '../../../schema/src/types/enums';
import type { ServerInferRequest } from '@ts-rest/core';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../lib/logger';

const c = initContract();

/**
 * Standard error response schema for Anthropic endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * Schema for validating Anthropic API response
 */
const AnthropicResponseSchema = z.object({
  content: z.array(
    z.object({
      text: z.string(),
      type: z.literal('text'),
    })
  ),
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
        role: MessageRoleSchema,
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
      logger.debug('Sending request to Anthropic:', {
        ...body,
        model: 'claude-3-7-sonnet-latest',
        max_tokens: 1000,
      });

      const rawResponse = await anthropic.messages.create({
        ...body,
        model: 'claude-3-7-sonnet-latest',
        max_tokens: 1000,
      });

      // Validate the response using Zod
      const parsedResponse = AnthropicResponseSchema.safeParse(rawResponse);
      
      if (!parsedResponse.success) {
        logger.error('Invalid response format from Anthropic:', {
          error: parsedResponse.error,
          response: rawResponse,
        });
        throw new Error('Received invalid response format from Anthropic');
      }
      
      const response = parsedResponse.data;
      
      if (!response.content.length) {
        logger.error('Empty content array in Anthropic response');
        throw new Error('Received empty content from Anthropic');
      }

      return {
        status: 200 as const,
        body: { message: response.content[0].text },
      };
    } catch (error) {
      logger.error('Error getting response from Anthropic:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to get response from Anthropic. Please try again later.' },
      };
    }
  },
});
