/**
 * @fileoverview PRD (Product Requirements Document) API routes and contract definitions.
 * Handles the generation of lean PRDs from user suggestions.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { generateLeanPRD } from '../prd/prd-generator-service';

const c = initContract();

/**
 * Standard error response schema for PRD endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for PRD endpoints
 * @property {Object} generateFromSuggestions - Contract for generating PRD from user suggestions
 */
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

/**
 * Router instance created from the PRD contract
 */
export const prdRouter = c.router(contract);

/**
 * Creates the implementation for PRD routes
 * @returns {Object} Route implementations for PRD endpoints
 */
export const createPrdRouter = () => ({
  /**
   * Generates a lean PRD from user suggestions
   * @param {Object} params - Request parameters
   * @param {[string, string, string]} params.body - Tuple containing [improvedDescription, successMetric, criticalRisk]
   * @returns {Promise<Object>} Response containing generated PRD or error
   */
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