import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';

const c = initContract();

const contract = c.router({
  testAnthropic: {
    method: 'GET',
    path: '/test/anthropic',
    responses: {
      200: z.object({
        success: z.boolean(),
        message: z.any()
      }),
      500: z.object({
        success: z.boolean(),
        error: z.string()
      })
    }
  }
});

export const testRouter = contract;

export const createTestRouter = (anthropic: Anthropic) => c.router(contract, {
  testAnthropic: async () => {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello!' }]
      });
      return {
        status: 200,
        body: { success: true, message }
      };
    } catch (error) {
      const err = error as Error;
      console.error('Anthropic test error:', err);
      return {
        status: 500,
        body: { success: false, error: err.message }
      };
    }
  }
}); 