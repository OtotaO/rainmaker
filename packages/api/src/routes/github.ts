/**
 * @fileoverview GitHub API integration routes and contract definitions.
 * Handles fetching and processing of GitHub issues.
 */

import { initContract, ServerInferRequest } from '@ts-rest/core';
import { z } from 'zod';
import { fetchOpenIssues } from '../github';
import { GitHubIssuesResponseSchema, GitHubErrorResponseSchema } from '../../../shared/src/schemas/github';

const c = initContract();

/**
 * Standard error response schema for GitHub endpoints
 */
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for GitHub endpoints
 * @property {Object} getIssues - Contract for retrieving GitHub issues
 */
const contract = {
  getIssues: {
    method: 'GET' as const,
    path: '/api/github/issues',
    responses: {
      200: GitHubIssuesResponseSchema,
      500: GitHubErrorResponseSchema,
    },
  },
} as const;

/**
 * Router instance created from the GitHub contract
 */
export const githubRouter = c.router(contract);

/**
 * Creates the implementation for GitHub routes
 * @returns {Object} Route implementations for GitHub endpoints
 */
export const createGithubRouter = () => ({
  /**
   * Fetches open issues from the configured GitHub repository
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response containing GitHub issues or error
   * @throws {Error} When GitHub owner or repo environment variables are not configured
   */
  getIssues: async (_: ServerInferRequest<typeof contract.getIssues>) => {
    try {
      const owner = process.env.GITHUB_OWNER;
      const repo = process.env.GITHUB_REPO;
      
      if (!owner || !repo) {
        throw new Error('GitHub owner or repo not configured');
      }
      
      const issues = await fetchOpenIssues(owner, repo);
      const validatedIssues = GitHubIssuesResponseSchema.parse(issues);
      
      return {
        status: 200 as const,
        body: validatedIssues,
      };
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch GitHub issues. Please try again later.' },
      };
    }
  },
}); 