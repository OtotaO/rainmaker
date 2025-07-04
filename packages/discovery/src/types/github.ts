import { z } from 'zod';
import { JSONValue } from './index'; // Assuming JSONValue is exported from index.ts

/**
 * Schema for the output of the BAML AssessComponentQuality function.
 * This defines the structure of the LLM-based quality assessment.
 */
export const BamlComponentQualityAssessmentSchema = z.object({
  overall_score: z.number().describe('Overall quality score (1-10)'),
  code_quality_score: z.number().describe('Code quality score (1-10)'),
  reliability_score: z.number().describe('Reliability score (1-10)'),
  reusability_score: z.number().describe('Reusability score (1-10)'),
  documentation_score: z.number().describe('Documentation score (1-10)'),
  testing_score: z.number().describe('Testing score (1-10)'),
  strengths: z.array(z.string()).describe('List of strengths identified'),
  weaknesses: z.array(z.string()).describe('List of weaknesses identified'),
});

export type BamlComponentQualityAssessment = z.infer<typeof BamlComponentQualityAssessmentSchema>;

/**
 * Placeholder for the BAML client's AssessComponentQuality method.
 * This is part of the BAMLClient interface.
 */
export interface BAMLGitHubClientMethods {
  AssessComponentQuality: (
    name: string,
    code: string,
    hasTests: boolean,
    hasDocumentation: boolean,
    dependencies: string[],
    stars: number
  ) => Promise<BamlComponentQualityAssessment>;
}

/**
 * Schema for a GitHub Repository owner object.
 * This is a more complete representation based on Octokit's types.
 */
export const GitHubRepoOwnerSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.string().nullable(),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: z.string(),
  gists_url: z.string(),
  starred_url: z.string(),
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string(),
  received_events_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
  name: z.string().nullable().optional(), // Can be null
  email: z.string().nullable().optional(), // Can be null
  starred_at: z.string().nullable().optional(), // Can be null
}).nullable(); // The entire owner object can be null in some contexts

/**
 * Schema for a GitHub Repository object from Octokit search results.
 */
export const GitHubRepoSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  owner: GitHubRepoOwnerSchema, // Use the more complete owner schema
  private: z.boolean(),
  html_url: z.string().url(),
  description: z.string().nullable().optional(), // Can be null
  fork: z.boolean(),
  url: z.string().url(),
  forks_url: z.string().url(),
  keys_url: z.string().url(),
  collaborators_url: z.string().url(),
  teams_url: z.string().url(),
  hooks_url: z.string().url(),
  issue_events_url: z.string().url(),
  events_url: z.string().url(),
  assignees_url: z.string().url(),
  branches_url: z.string().url(),
  tags_url: z.string().url(),
  blobs_url: z.string().url(),
  git_tags_url: z.string().url(),
  git_refs_url: z.string().url(),
  trees_url: z.string().url(),
  statuses_url: z.string().url(),
  languages_url: z.string().url(),
  stargazers_url: z.string().url(),
  contributors_url: z.string().url(),
  subscribers_url: z.string().url(),
  subscription_url: z.string().url(),
  commits_url: z.string().url(),
  git_commits_url: z.string().url(),
  comments_url: z.string().url(),
  issue_comment_url: z.string().url(),
  contents_url: z.string().url(),
  compare_url: z.string().url(),
  merges_url: z.string().url(),
  archive_url: z.string().url(),
  downloads_url: z.string().url(),
  issues_url: z.string().url(),
  pulls_url: z.string().url(),
  milestones_url: z.string().url(),
  notifications_url: z.string().url(),
  labels_url: z.string().url(),
  releases_url: z.string().url(),
  deployments_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  pushed_at: z.string().datetime(),
  git_url: z.string(),
  ssh_url: z.string(),
  clone_url: z.string().url(),
  svn_url: z.string().url(),
  homepage: z.string().url().nullable().optional(), // Can be null
  size: z.number(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable().optional(), // Can be null
  has_issues: z.boolean(),
  has_projects: z.boolean(),
  has_downloads: z.boolean(),
  has_wiki: z.boolean(),
  has_pages: z.boolean(),
  has_discussions: z.boolean().optional(), // Made optional
  forks_count: z.number(),
  mirror_url: z.string().url().nullable().optional(), // Can be null
  archived: z.boolean(),
  disabled: z.boolean(),
  open_issues_count: z.number(),
  license: z.object({
    key: z.string(),
    name: z.string(),
    spdx_id: z.string().nullable(), // Can be null
    url: z.string().url().nullable(), // Can be null
    node_id: z.string(),
  }).nullable().optional(), // Entire license object can be null
  allow_forking: z.boolean().optional(), // Made optional
  is_template: z.boolean().optional(), // Made optional
  web_commit_signoff_required: z.boolean().optional(), // Made optional
  topics: z.array(z.string()).optional(), // Made optional
  visibility: z.string(),
  forks: z.number(),
  open_issues: z.number(),
  watchers: z.number(),
  default_branch: z.string(),
  score: z.number().nullable().optional(), // Made nullable and optional
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

/**
 * Schema for a file/directory object in a GitHub Git Tree.
 */
export const GitHubTreeFileSchema = z.object({
  path: z.string().optional(), // Made optional to match Octokit's potential response
  mode: z.string().optional(), // Made optional
  type: z.union([z.literal('blob'), z.literal('tree'), z.string()]).optional(), // Allow broader string type for 'type', made optional
  sha: z.string().optional(), // Made optional
  size: z.number().optional(), // Only for blobs
  url: z.string().url().optional(), // Made optional
});

export type GitHubTreeFile = z.infer<typeof GitHubTreeFileSchema>;

/**
 * Schema for a GitHub Git Tree response.
 */
export const GitHubTreeSchema = z.object({
  sha: z.string(),
  url: z.string().url(),
  tree: z.array(GitHubTreeFileSchema),
  truncated: z.boolean().optional(),
});

export type GitHubTree = z.infer<typeof GitHubTreeSchema>;

/**
 * Schema for GitHub Get Content API response (file).
 */
export const GitHubFileContentSchema = z.object({
  type: z.literal('file'),
  encoding: z.string(),
  size: z.number(),
  name: z.string(),
  path: z.string(),
  content: z.string(), // Base64 encoded content
  sha: z.string(),
  url: z.string().url(),
  git_url: z.string().url().nullable(),
  html_url: z.string().url().nullable(), // Can be null
  download_url: z.string().url().nullable(), // Can be null
  _links: z.object({
    git: z.string().url(),
    html: z.string().url(),
    self: z.string().url(),
  }),
});

export type GitHubFileContent = z.infer<typeof GitHubFileContentSchema>;

/**
 * Schema for the output of the analyzeCode function.
 * This defines the structured analysis of a code component.
 */
export const CodeAnalysisResultSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  hasTests: z.boolean(),
  hasDocumentation: z.boolean(),
  language: z.string(),
  framework: z.string().optional(),
  dependencies: z.array(z.string()),
  apis: z.array(z.string()),
  patterns: z.array(z.string()),
  ast: JSONValue, // AST can be complex, use JSONValue
  normalizedCode: z.string(),
  primaryPrompt: z.string(),
  promptVariants: z.array(z.string()),
  configurableVariables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    defaultValue: z.string().optional(),
  })),
  injectionPoints: z.array(z.object({
    id: z.string(),
    description: z.string(),
    type: z.union([
      z.literal('before'),
      z.literal('after'),
      z.literal('replace'),
      z.literal('wrap')
    ]),
    location: z.string(),
  })),
  adaptablePatterns: z.array(z.object({
    type: z.string(),
    current: z.string(),
    description: z.string(),
  })),
  tags: z.array(z.string()), // Added missing tags property
});

export type CodeAnalysisResult = z.infer<typeof CodeAnalysisResultSchema>;
