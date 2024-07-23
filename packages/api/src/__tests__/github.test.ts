// File: packages/api/src/__tests__/github.test.ts

import { expect, test, describe, vi } from 'vitest';
import { createGitHubIssue, addCommentToIssue } from '../github';

// Mock the Octokit instance
vi.mock('@octokit/rest', () => ({
  Octokit: class {
    issues = {
      create: vi.fn(() =>
        Promise.resolve({ data: { html_url: 'https://github.com/test/repo/issues/1', number: 1 } })
      ),
      createComment: vi.fn(() =>
        Promise.resolve({
          data: { html_url: 'https://github.com/test/repo/issues/1#issuecomment-1' },
        })
      ),
    };
  },
}));

describe('GitHub Integration', () => {
  test('createGitHubIssue should create an issue and return its URL', async () => {
    const result = await createGitHubIssue('Test Issue', 'This is a test issue body', [
      'test-label',
    ]);

    expect(result.success).toBe(true);
    expect(result.issueUrl).toBe('https://github.com/test/repo/issues/1');
    expect(result.issueNumber).toBe(1);
  });

  test('addCommentToIssue should add a comment to an issue and return its URL', async () => {
    const result = await addCommentToIssue(1, 'This is a test comment');

    expect(result.success).toBe(true);
    expect(result.commentUrl).toBe('https://github.com/test/repo/issues/1#issuecomment-1');
  });
});
