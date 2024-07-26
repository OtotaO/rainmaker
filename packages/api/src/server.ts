import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import type { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';
import { LearningJournalService } from './learningJournalService';
import {
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
  AIAssistanceLevelResponseSchema,
} from '../../shared/src/types';

import { fetchOpenIssues } from './github';

const app = new Hono();

try {
  const learningJournalService = new LearningJournalService();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

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
              await stream.writeSSE({
                event: 'message_start',
                data: JSON.stringify(chunk.message),
              });
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

  app.post('/api/learning-journal/entry', async (c) => {
    try {
      const body = await c.req.json();
      const validatedEntry = LearningJournalEntryRequestSchema.parse(body);
      await learningJournalService.addEntry(validatedEntry);
      return c.json({ message: 'Entry added successfully' }, 201);
    } catch (error) {
      if ((error as z.ZodError).name === 'ZodError') {
        return c.json({ error: 'Invalid entry format', details: error.errors }, 400);
      }

      console.error('Error adding journal entry:', error);
      return c.json({ error: 'Failed to add journal entry. Please try again later.' }, 500);
    }
  });

  app.get('/api/learning-journal/entries', async (c) => {
    try {
      const entries = await learningJournalService.getEntries();
      const validatedEntries = LearningJournalEntriesResponseSchema.parse(entries);
      return c.json(validatedEntries);
    } catch (error) {
      console.error('Error retrieving journal entries:', error);
      return c.json({ error: 'Failed to retrieve journal entries. Please try again later.' }, 500);
    }
  });

  app.get('/api/ai-assistance-level', async (c) => {
    try {
      const assistanceLevel = await learningJournalService.calculateAIAssistanceLevel();
      const validatedAssistanceLevel = AIAssistanceLevelResponseSchema.parse(assistanceLevel);
      return c.json(validatedAssistanceLevel);
    } catch (error) {
      console.error('Error calculating AI assistance level:', error);
      return c.json(
        { error: 'Failed to calculate AI assistance level. Please try again later.' },
        500
      );
    }
  });

  app.get('/api/github/issues', async (c) => {
    const issues = await fetchOpenIssues('unscene-inc', 'Scene');
    return c.json(issues);
  });
} catch (error) {
  console.error('Error starting server:', error);
}

const port = 3001;

console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
