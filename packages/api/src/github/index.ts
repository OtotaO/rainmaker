// File: packages/api/src/github/index.ts

import { Octokit } from '@octokit/rest';

// Initialize Octokit with the GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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
