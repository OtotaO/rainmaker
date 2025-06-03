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

// GitHub Repository schema for search results
export const GitHubRepositorySchema = z.object({
  id: z.number().int().positive().describe('GitHub\'s unique identifier for the repository'),
  name: z.string().min(1).describe('Repository name'),
  full_name: z.string().min(1).describe('Full repository name (owner/repo)'),
  description: z.string().nullable().transform(val => val ?? '').describe('Repository description'),
  html_url: z.string().url().describe('Repository URL'),
  stargazers_count: z.number().int().min(0).describe('Number of stars'),
  forks_count: z.number().int().min(0).describe('Number of forks'),
  open_issues_count: z.number().int().min(0).describe('Number of open issues'),
  updated_at: z.string().or(z.date())
    .transform(date => new Date(date).toISOString())
    .describe('When the repository was last updated'),
  language: z.string().nullable().describe('Primary programming language'),
  license: z.object({
    name: z.string().describe('License name'),
    spdx_id: z.string().nullable().describe('SPDX license identifier'),
  }).nullable().describe('Repository license information'),
  topics: z.array(z.string()).default([]).describe('Repository topics/tags'),
}).transform(repo => ({
  ...repo,
  updatedAt: repo.updated_at,
}));

// Smart search query input schema
export const GitHubSearchQuerySchema = z.object({
  query: z.string().min(1).max(500).describe('Natural language description of the desired component'),
  language: z.string().optional().describe('Preferred programming language (e.g., "typescript", "python")'),
  framework: z.string().optional().describe('Preferred framework (e.g., "react", "vue", "express")'),
  maxResults: z.number().int().min(1).max(50).default(10).describe('Maximum number of results to return'),
});

// LLM query refinement output schema
export const RefinedSearchQuerySchema = z.object({
  searchTerms: z.array(z.string()).min(1).max(5).describe('Optimized GitHub search query strings'),
  extractedFeatures: z.array(z.string()).describe('Key features extracted from the user query'),
  suggestedLanguage: z.string().optional().describe('Suggested programming language if not specified'),
  suggestedFramework: z.string().optional().describe('Suggested framework if not specified'),
});

// Component quality assessment schema
export const ComponentAssessmentSchema = z.object({
  relevanceScore: z.number().min(1).max(10).describe('How relevant this component is to the user query (1-10)'),
  qualityScore: z.number().min(1).max(10).describe('Overall quality assessment based on README and metrics (1-10)'),
  justification: z.string().min(10).max(200).describe('Brief explanation of the scores'),
  keyFeatures: z.array(z.string()).describe('Key features identified in this component'),
  usageComplexity: z.enum(['simple', 'moderate', 'complex']).describe('Estimated complexity of using this component'),
});

// Final ranked component result schema
export const RankedComponentSchema = z.object({
  repository: GitHubRepositorySchema.describe('GitHub repository information'),
  assessment: ComponentAssessmentSchema.describe('AI-generated quality and relevance assessment'),
  codeSnippet: z.string().optional().describe('Key code snippet if available'),
  installationCommand: z.string().optional().describe('Installation command (e.g., npm install)'),
  documentationUrl: z.string().url().optional().describe('Link to documentation'),
});

// API response schemas
export const GitHubSearchResponseSchema = z.object({
  results: z.array(RankedComponentSchema).describe('Ranked list of matching components'),
  totalFound: z.number().int().min(0).describe('Total number of components found before ranking'),
  queryProcessingTime: z.number().min(0).describe('Time taken to process the query in milliseconds'),
  originalQuery: z.string().describe('The original user query'),
  refinedQueries: z.array(z.string()).describe('The refined search queries used'),
});

// Type exports
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;
export type GitHubLabel = string; // Simplified to just string since we transform all labels
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;
export type GitHubSearchQuery = z.infer<typeof GitHubSearchQuerySchema>;
export type RefinedSearchQuery = z.infer<typeof RefinedSearchQuerySchema>;
export type ComponentAssessment = z.infer<typeof ComponentAssessmentSchema>;
export type RankedComponent = z.infer<typeof RankedComponentSchema>;
export type GitHubSearchResponse = z.infer<typeof GitHubSearchResponseSchema>;
