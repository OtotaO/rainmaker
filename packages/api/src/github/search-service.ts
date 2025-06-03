// File: packages/api/src/github/search-service.ts

import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';

// RequestError type from Octokit
type RequestError = {
  status: number;
  message: string;
  name: string;
};
import { logger } from '../lib/logger';
import { instructor } from '../lib/instructor';
import { anthropicConfig } from '../config';
import {
  GitHubSearchQuery,
  RefinedSearchQuery,
  ComponentAssessment,
  RankedComponent,
  GitHubSearchResponse,
  GitHubRepository,
  RefinedSearchQuerySchema,
  ComponentAssessmentSchema,
  GitHubRepositorySchema,
} from '../../../shared/src/schemas/github';

type GitHubSearchResult = RestEndpointMethodTypes['search']['repos']['response']['data']['items'][0];

export class GitHubSearchService {
  private octokit: Octokit;
  private readonly maxGitHubResults = 30; // Process top 30 raw results
  private readonly searchTimeout = 10000; // 10 second timeout for GitHub API
  private readonly llmTimeout = 15000; // 15 second timeout for LLM calls

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Main search method - orchestrates the entire search process
   */
  async searchComponents(searchQuery: GitHubSearchQuery): Promise<GitHubSearchResponse> {
    const startTime = Date.now();
    
    logger.info('Starting GitHub component search', { 
      query: searchQuery.query,
      language: searchQuery.language,
      framework: searchQuery.framework,
      maxResults: searchQuery.maxResults 
    });

    try {
      // Step 1: Refine the user query using LLM
      const refinedQuery = await this.refineQueryWithLLM(searchQuery);
      
      // Step 2: Search GitHub with refined queries
      const rawRepos = await this.fetchFromGitHubAPI(refinedQuery, searchQuery);
      
      // Step 3: Rank and assess the results
      const rankedComponents = await this.rankAndFilterResults(
        rawRepos, 
        searchQuery, 
        refinedQuery
      );

      // Step 4: Limit to requested number of results
      const finalResults = rankedComponents.slice(0, searchQuery.maxResults);

      const processingTime = Date.now() - startTime;
      
      logger.info('GitHub search completed', {
        totalFound: rawRepos.length,
        finalResults: finalResults.length,
        processingTime
      });

      return {
        results: finalResults,
        totalFound: rawRepos.length,
        queryProcessingTime: processingTime,
        originalQuery: searchQuery.query,
        refinedQueries: refinedQuery.searchTerms,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('GitHub search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        query: searchQuery.query 
      });
      throw error;
    }
  }

  /**
   * Use LLM to refine and optimize the user's natural language query
   */
  private async refineQueryWithLLM(searchQuery: GitHubSearchQuery): Promise<RefinedSearchQuery> {
    logger.debug('Refining query with LLM', { originalQuery: searchQuery.query });

    try {
      const result = await Promise.race([
        instructor.chat.completions.create({
          model: anthropicConfig.model,
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: `You are an expert at translating natural language component requests into effective GitHub search queries. Your goal is to generate search terms that will find high-quality, relevant repositories.

Focus on:
- Extracting key technical terms and features
- Identifying the most likely programming language and framework
- Creating search queries that balance specificity with discoverability
- Prioritizing actively maintained, well-documented repositories`
            },
            {
              role: 'user',
              content: `Convert this component request into optimized GitHub search queries:

User Query: "${searchQuery.query}"
${searchQuery.language ? `Preferred Language: ${searchQuery.language}` : ''}
${searchQuery.framework ? `Preferred Framework: ${searchQuery.framework}` : ''}

Generate 2-4 search query strings that will find the most relevant repositories. Include technical terms, component types, and framework-specific keywords.`
            }
          ],
          response_model: {
            name: 'RefinedSearchQuery',
            schema: RefinedSearchQuerySchema,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM query refinement timed out')), this.llmTimeout)
        ),
      ]);

      logger.debug('Query refinement completed', { 
        searchTerms: result.searchTerms,
        extractedFeatures: result.extractedFeatures 
      });

      return result;

    } catch (error) {
      logger.error('Query refinement failed, using fallback', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Fallback: create basic search terms from the original query
      return {
        searchTerms: [
          searchQuery.query,
          `${searchQuery.language || ''} ${searchQuery.query}`.trim(),
          `${searchQuery.framework || ''} ${searchQuery.query}`.trim(),
        ].filter(term => term.length > 0),
        extractedFeatures: [searchQuery.query],
        suggestedLanguage: searchQuery.language,
        suggestedFramework: searchQuery.framework,
      };
    }
  }

  /**
   * Search GitHub API with the refined queries
   */
  private async fetchFromGitHubAPI(
    refinedQuery: RefinedSearchQuery, 
    originalQuery: GitHubSearchQuery
  ): Promise<GitHubRepository[]> {
    logger.debug('Searching GitHub API', { searchTerms: refinedQuery.searchTerms });

    const allRepos = new Map<number, GitHubSearchResult>(); // Use Map to deduplicate by repo ID

    try {
      // Execute searches for each refined query term
      for (const searchTerm of refinedQuery.searchTerms) {
        try {
          const searchQuery = this.buildGitHubSearchQuery(searchTerm, originalQuery, refinedQuery);
          
          const searchResult = await Promise.race([
            this.octokit.search.repos({
              q: searchQuery,
              sort: 'stars',
              order: 'desc',
              per_page: Math.min(this.maxGitHubResults, 100),
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('GitHub API search timed out')), this.searchTimeout)
            ),
          ]);

          // Add results to our deduplication map
          searchResult.data.items.forEach(repo => {
            if (!allRepos.has(repo.id)) {
              allRepos.set(repo.id, repo);
            }
          });

          logger.debug(`GitHub search completed for term: "${searchTerm}"`, {
            resultsFound: searchResult.data.items.length,
            totalUnique: allRepos.size
          });

        } catch (error) {
          logger.warn(`GitHub search failed for term: "${searchTerm}"`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continue with other search terms
        }
      }

      // Convert GitHub API results to our schema format
      const repos = Array.from(allRepos.values())
        .slice(0, this.maxGitHubResults)
        .map(repo => this.transformGitHubRepo(repo))
        .filter(repo => repo !== null) as GitHubRepository[];

      logger.info('GitHub API search completed', { 
        totalRepos: repos.length,
        searchTermsUsed: refinedQuery.searchTerms.length 
      });

      return repos;

    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        const reqError = error as RequestError;
        if (reqError.status === 403 && reqError.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${reqError.message}`);
      }
      
      logger.error('Unexpected error in GitHub search', { error });
      throw new Error('Failed to search GitHub repositories');
    }
  }

  /**
   * Build an optimized GitHub search query string
   */
  private buildGitHubSearchQuery(
    searchTerm: string, 
    originalQuery: GitHubSearchQuery, 
    refinedQuery: RefinedSearchQuery
  ): string {
    const parts: string[] = [searchTerm];

    // Add language filter
    const language = originalQuery.language || refinedQuery.suggestedLanguage;
    if (language) {
      parts.push(`language:${language}`);
    }

    // Add framework-specific terms
    const framework = originalQuery.framework || refinedQuery.suggestedFramework;
    if (framework) {
      parts.push(framework);
    }

    // Add quality filters
    parts.push('stars:>10'); // Minimum star threshold
    parts.push('pushed:>2023-01-01'); // Recently updated

    return parts.join(' ');
  }

  /**
   * Transform GitHub API repository result to our schema
   */
  private transformGitHubRepo(repo: any): GitHubRepository | null {
    try {
      return GitHubRepositorySchema.parse({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        updated_at: repo.updated_at,
        language: repo.language,
        license: repo.license ? {
          name: repo.license.name,
          spdx_id: repo.license.spdx_id,
        } : null,
        topics: repo.topics || [],
      });
    } catch (error) {
      logger.warn('Failed to transform GitHub repo', { 
        repoId: repo.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Rank and assess repositories using LLM
   */
  private async rankAndFilterResults(
    repos: GitHubRepository[], 
    originalQuery: GitHubSearchQuery,
    refinedQuery: RefinedSearchQuery
  ): Promise<RankedComponent[]> {
    logger.debug('Starting repository ranking and assessment', { repoCount: repos.length });

    const rankedComponents: RankedComponent[] = [];

    // Process repositories in batches to avoid overwhelming the LLM
    const batchSize = 5;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(repo => this.assessRepository(repo, originalQuery, refinedQuery))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          rankedComponents.push(result.value);
        } else {
          logger.warn('Repository assessment failed', { 
            repo: batch[index].full_name,
            error: result.status === 'rejected' ? result.reason : 'Unknown error'
          });
        }
      });
    }

    // Sort by combined score (relevance + quality)
    rankedComponents.sort((a, b) => {
      const scoreA = (a.assessment.relevanceScore + a.assessment.qualityScore) / 2;
      const scoreB = (b.assessment.relevanceScore + b.assessment.qualityScore) / 2;
      return scoreB - scoreA;
    });

    logger.info('Repository ranking completed', { 
      totalAssessed: rankedComponents.length,
      topScore: rankedComponents[0] ? 
        (rankedComponents[0].assessment.relevanceScore + rankedComponents[0].assessment.qualityScore) / 2 : 0
    });

    return rankedComponents;
  }

  /**
   * Assess a single repository using LLM
   */
  private async assessRepository(
    repo: GitHubRepository, 
    originalQuery: GitHubSearchQuery,
    refinedQuery: RefinedSearchQuery
  ): Promise<RankedComponent | null> {
    try {
      const assessment = await Promise.race([
        instructor.chat.completions.create({
          model: anthropicConfig.model,
          max_tokens: 800,
          messages: [
            {
              role: 'system',
              content: `You are an experienced senior software developer evaluating code repositories for relevance and quality. Assess repositories based on:

RELEVANCE (1-10):
- How well it matches the user's specific request
- Feature alignment with extracted requirements
- Appropriate technology stack

QUALITY (1-10):
- Repository maintenance (recent updates, star count, fork activity)
- Documentation quality (clear description, good README)
- Code organization and professionalism
- Community engagement (issues, contributions)

Be honest and critical. A score of 5-6 is average, 7-8 is good, 9-10 is exceptional.`
            },
            {
              role: 'user',
              content: `Assess this repository for the user's request:

USER REQUEST: "${originalQuery.query}"
EXTRACTED FEATURES: ${refinedQuery.extractedFeatures.join(', ')}

REPOSITORY:
- Name: ${repo.full_name}
- Description: ${repo.description || 'No description'}
- Language: ${repo.language || 'Not specified'}
- Stars: ${repo.stargazers_count}
- Forks: ${repo.forks_count}
- Last Updated: ${repo.updatedAt}
- Topics: ${repo.topics.join(', ') || 'None'}
- License: ${repo.license?.name || 'Not specified'}

Provide relevance score, quality score, and brief justification.`
            }
          ],
          response_model: {
            name: 'ComponentAssessment',
            schema: ComponentAssessmentSchema,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Repository assessment timed out')), this.llmTimeout)
        ),
      ]);

      // Generate installation command if possible
      const installationCommand = this.generateInstallationCommand(repo);

      return {
        repository: repo,
        assessment,
        installationCommand,
        documentationUrl: repo.html_url + '#readme',
      };

    } catch (error) {
      logger.error('Repository assessment failed', { 
        repo: repo.full_name,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Generate installation command based on repository characteristics
   */
  private generateInstallationCommand(repo: GitHubRepository): string | undefined {
    const name = repo.name.toLowerCase();
    const language = repo.language?.toLowerCase();

    // Check for common package managers based on language and repo characteristics
    if (language === 'javascript' || language === 'typescript' || repo.topics.includes('npm')) {
      return `npm install ${repo.name}`;
    }
    
    if (language === 'python' || repo.topics.includes('pypi')) {
      return `pip install ${repo.name}`;
    }
    
    if (language === 'rust' || repo.topics.includes('cargo')) {
      return `cargo add ${repo.name}`;
    }
    
    if (language === 'go') {
      return `go get github.com/${repo.full_name}`;
    }

    // For other cases, suggest git clone
    return `git clone ${repo.html_url}`;
  }
}
