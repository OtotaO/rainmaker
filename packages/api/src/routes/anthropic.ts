import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { Anthropic } from '@anthropic-ai/sdk';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the contract
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

// Create the router from the contract
export const anthropicRouter = c.router(contract);

// Create the implementation using the contract
export const createAnthropicRouter = (anthropic: Anthropic) => ({
  // Implementation sits right next to its contract definition
  sendMessage: async ({ body }: ServerInferRequest<typeof contract.sendMessage>) => {
    try {
      console.log('sending this data:', {
        ...body,
        model: 'claude-3-5-sonnet-latest',
        stream: true,
        max_tokens: 1000,
      });

      const response = (await anthropic.messages.create({
        ...body,
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1000,
        stream: false,
      })) as { content: Anthropic.Messages.TextBlock[] };

      return {
        status: 200 as const,
        body: { message: response.content[0].text },
      };
    } catch (error) {
      console.error('Error streaming response:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to stream response. Please try again later.' },
      };
    }
  },
}); 