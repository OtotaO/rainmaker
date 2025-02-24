import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { generateLeanPRD } from '../prd/prd-generator-service';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the contract
const contract = {
  generateFromSuggestions: {
    method: 'POST' as const,
    path: '/api/prd-suggestions-to-lean-prd',
    body: z.tuple([
      z.string(),  // improvedDescription
      z.string(),  // successMetric
      z.string(),  // criticalRisk
    ]),
    responses: {
      200: z.any(),
      500: ErrorResponse,
    },
  },
} as const;

// Create the router from the contract
export const prdRouter = c.router(contract);

// Create the implementation using the contract
export const createPrdRouter = () => ({
  // Implementation sits right next to its contract definition
  generateFromSuggestions: async ({ body }: ServerInferRequest<typeof contract.generateFromSuggestions>) => {
    try {
      const [improvedDescription, successMetric, criticalRisk] = body;
      const result = await generateLeanPRD({
        improvedDescription,
        successMetric,
        criticalRisk,
      });

      return {
        status: 200 as const,
        body: result,
      };
    } catch (error) {
      console.error('Error generating PRD:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to generate PRD. Please try again later.' },
      };
    }
  },
}); 