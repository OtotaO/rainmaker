import dotenv from 'dotenv';
dotenv.config();

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { serve } from '@hono/node-server';
import Anthropic from '@anthropic-ai/sdk';
import { refinementProcess } from './refinement';
import { addCommentToIssue, createGitHubIssue } from './github';
import {
  GitHubIssueCreationRequest,
  GitHubIssueCreationResponse,
  GitHubCommentCreationRequest,
  GitHubCommentCreationResponse,
} from '../../shared/src/types';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set, refusing to start server.');
}

if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
  throw new Error('GitHub configuration is incomplete. Please check your .env file.');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = new Hono();
app.use('/*', cors());

app.post('/api/anthropic', async (c) => {
  const body = (await c.req.json()) as Anthropic.MessageCreateParams;

  return streamSSE(c, async (stream) => {
    try {
      const response = await anthropic.messages.create({
        ...body,
        stream: true,
      });

      for await (const chunk of response) {
        switch (chunk.type) {
          case 'message_start':
            await stream.writeSSE({ event: 'message_start', data: JSON.stringify(chunk.message) });
            break;
          case 'content_block_start':
            await stream.writeSSE({
              event: 'content_block_start',
              data: JSON.stringify(chunk.content_block),
            });
            break;
          case 'content_block_delta':
            await stream.writeSSE({
              event: 'content_block_delta',
              data: JSON.stringify(chunk.delta),
            });
            break;
          case 'content_block_stop':
            await stream.writeSSE({ event: 'content_block_stop', data: JSON.stringify({}) });
            break;
          case 'message_delta':
            await stream.writeSSE({ event: 'message_delta', data: JSON.stringify(chunk.delta) });
            break;
          case 'message_stop':
            await stream.writeSSE({ event: 'message_stop', data: JSON.stringify({}) });
            break;
        }
      }
    } catch (error) {
      console.error('Error in SSE stream:', error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'An error occurred during processing' }),
      });
    }
  });
});

app.post('/api/refinement/epic-task-breakdown', async (c) => {
  const { prd } = await c.req.json();
  const result = await refinementProcess.epicTaskBreakdown(prd);
  return c.json(result);
});

app.post('/api/refinement/mvp-prioritization', async (c) => {
  const { features } = await c.req.json();
  const result = await refinementProcess.mvpPrioritization(features);
  return c.json(result);
});

app.post('/api/refinement/acceptance-criteria', async (c) => {
  const { feature } = await c.req.json();
  const result = await refinementProcess.generateAcceptanceCriteria(feature);
  return c.json(result);
});

// Update GitHub issue creation endpoint
app.post('/api/github/create-issue', async (c) => {
  const { title, body, labels } = (await c.req.json()) as GitHubIssueCreationRequest;
  const result = await createGitHubIssue(title, body, labels);
  return c.json(result as GitHubIssueCreationResponse);
});

// Update GitHub comment creation endpoint
app.post('/api/github/add-comment', async (c) => {
  const { issueNumber, comment } = (await c.req.json()) as GitHubCommentCreationRequest;
  const result = await addCommentToIssue(issueNumber, comment);
  return c.json(result as GitHubCommentCreationResponse);
});

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});
