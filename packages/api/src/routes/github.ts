import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { fetchOpenIssues } from '../github';
import { GitHubIssuesResponseSchema, GitHubErrorResponseSchema } from '../../../shared/src/schemas/github';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the contract
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

// Create the router from the contract
export const githubRouter = c.router(contract);

// Create the implementation using the contract
export const createGithubRouter = () => ({
  // Implementation sits right next to its contract definition
  getIssues: async () => {
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