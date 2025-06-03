/**
 * @fileoverview GitHub API integration routes and contract definitions.
 * Handles fetching and processing of GitHub issues.
 */

import { initContract, ServerInferRequest } from '@ts-rest/core';
import { z } from 'zod';
import { fetchOpenIssues } from '../github';
import { GitHubSearchService } from '../github/search-service';
import { 
  GitHubIssuesResponseSchema, 
  GitHubErrorResponseSchema,
  GitHubSearchQuerySchema,
  GitHubSearchResponseSchema 
} from '../../../shared/src/schemas/github';

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
 * @property {Object} searchComponents - Contract for smart component search
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
  searchComponents: {
    method: 'POST' as const,
    path: '/api/github/search',
    body: GitHubSearchQuerySchema,
    responses: {
      200: GitHubSearchResponseSchema,
      400: ErrorResponse,
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
export const createGithubRouter = () => {
  const searchService = new GitHubSearchService();

  return {
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

    /**
     * Searches for GitHub components using AI-powered smart search
     * @param {Object} params - Request parameters containing search query
     * @returns {Promise<Object>} Response containing ranked component results or error
     */
    searchComponents: async ({ body }: ServerInferRequest<typeof contract.searchComponents>) => {
      try {
        // Validate the request body
        const searchQuery = GitHubSearchQuerySchema.parse(body);
        
        // Perform the smart search
        const searchResults = await searchService.searchComponents(searchQuery);
        
        // Validate the response
        const validatedResults = GitHubSearchResponseSchema.parse(searchResults);
        
        return {
          status: 200 as const,
          body: validatedResults,
        };
      } catch (error) {
        console.error('Error in GitHub component search:', error);
        
        // Handle validation errors
        if (error instanceof z.ZodError) {
          return {
            status: 400 as const,
            body: { 
              error: 'Invalid request parameters',
              details: error.errors 
            },
          };
        }
        
        // Handle other errors
        return {
          status: 500 as const,
          body: { 
            error: error instanceof Error ? error.message : 'Failed to search GitHub components. Please try again later.' 
          },
        };
      }
    },
  };
};
