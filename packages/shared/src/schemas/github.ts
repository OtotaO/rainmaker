import { z } from 'zod';

// GitHub Label schema that coerces complex labels to strings
export const GitHubLabelSchema = z.union([
  // Simple string label (e.g., "bug", "feature")
  z.string(),
  // Complex label object from GitHub API
  z.object({
    name: z.string().describe('The display name of the label'),
  }).transform(label => label.name)
]).transform(label => typeof label === 'string' ? label : label);

// GitHub Issue schema with strict validation
export const GitHubIssueSchema = z.object({
  // Unique identifier for the issue in GitHub's database
  id: z.number().int().positive().describe('GitHub\'s unique identifier for the issue'),
  
  // Issue number as displayed in GitHub UI (#123)
  number: z.number().int().positive().describe('The issue number as shown in GitHub (#123)'),
  
  // Issue title - must not be empty
  title: z.string().min(1).describe('The title of the issue'),
  
  // Issue body/description - can be null from API, transformed to empty string
  body: z.string().nullable().transform(val => val ?? '').describe('The main content/description of the issue'),
  
  // Array of labels attached to the issue
  labels: z.array(GitHubLabelSchema).default([]).describe('Labels attached to the issue'),
  
  // Creation timestamp - accepts both string and Date objects
  created_at: z.string().or(z.date())
    .transform(date => new Date(date).toISOString())
    .describe('When the issue was created'),
  
  // Last update timestamp - accepts both string and Date objects
  updated_at: z.string().or(z.date())
    .transform(date => new Date(date).toISOString())
    .describe('When the issue was last updated'),
}).transform(issue => ({
  ...issue,
  createdAt: issue.created_at,  // Transform to camelCase for frontend consistency
  updatedAt: issue.updated_at,  // Transform to camelCase for frontend consistency
}));

// Response schemas for the API
export const GitHubIssuesResponseSchema = z.array(GitHubIssueSchema)
  .describe('Array of GitHub issues returned from the API');

export const GitHubErrorResponseSchema = z.object({
  error: z.string().describe('Error message describing what went wrong'),
});

// Type exports
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;
export type GitHubLabel = string; // Simplified to just string since we transform all labels 