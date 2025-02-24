// File: packages/api/src/github/index.ts

import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';

type GitHubIssue = RestEndpointMethodTypes['issues']['listForRepo']['response']['data'][0];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// GitHub repository details
const owner = process.env.GITHUB_OWNER || '';
const repo = process.env.GITHUB_REPO || '';

export const createGitHubIssue = async (
  title: string,
  body: string,
  labels: string[] = ['PRD']
) => {
  try {
    const response = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    return {
      success: true,
      issueUrl: response.data.html_url,
      issueNumber: response.data.number,
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return {
      success: false,
      error: 'Failed to create GitHub issue',
    };
  }
};

export const addCommentToIssue = async (issueNumber: number, comment: string) => {
  try {
    const response = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment,
    });

    return {
      success: true,
      commentUrl: response.data.html_url,
    };
  } catch (error) {
    console.error('Error adding comment to GitHub issue:', error);
    return {
      success: false,
      error: 'Failed to add comment to GitHub issue',
    };
  }
};

export const fetchOpenIssues = async (owner: string, repo: string): Promise<GitHubIssue[]> => {
  try {
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });
    console.log('response', { response: response.data });
    if (response.data.length === 0) {
      console.warn(`No open issues found for ${owner}/${repo}`);
      return [];
    }

    return response.data;
  } catch (error) {
    if (error instanceof RequestError) {
      if ((error as RequestError).status === 404) {
        throw new Error(`Repository not found: ${owner}/${repo}`);
      }

      if (
        (error as RequestError).status === 403 &&
        (error as RequestError).message.includes('API rate limit exceeded')
      ) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }

      throw new Error(`GitHub API error: ${(error as RequestError).message}`);
    }
    console.error('Unexpected error fetching GitHub issues:', error);
    throw new Error('An unexpected error occurred while fetching GitHub issues');
  }
};
