import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';
import { LearningJournalService } from './learningJournalService';
import {
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
  AIAssistanceLevelResponseSchema,
} from '../../shared/src/types';

import { fetchOpenIssues } from './github';
import { generateLeanPRD } from './prd/prd-generator-service';
import { PrismaClient } from '@prisma/client';

const app = new Hono();

try {
  const prisma = new PrismaClient();
  const learningJournalService = new LearningJournalService(prisma);
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  app.use('/*', cors());

  app.post('/api/anthropic', async (c) => {
    const body = (await c.req.json()) as Anthropic.MessageCreateParams;

    try {
      console.log('sending this data:', {
        ...body,
        model: 'claude-3-5-sonnet-latest',
        stream: true,
        max_tokens: 1000,
      });

      const response = (await anthropic.messages.create({
        ...body,
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1000,
        stream: false,
      })) as { content: Anthropic.Messages.TextBlock[] };

      return c.json({ message: response.content[0].text });
    } catch (error) {
      console.error('Error streaming response:', error);
      return c.json({ error: 'Failed to stream response. Please try again later.' }, 500);
    }
  });

  app.get('/api/product-high-level-descriptions', async (c) => {
    const productHighLevelDescriptions = await prisma.productHighLevelDescription.findMany();
    return c.json(productHighLevelDescriptions);
  });

  app.post('/api/learning-journal/entry', async (c) => {
    try {
      const body = await c.req.json();
      const validatedEntry = LearningJournalEntryRequestSchema.parse(body);
      await learningJournalService.addEntry(validatedEntry);
      return c.json({ message: 'Entry added successfully' }, 201);
    } catch (error) {
      if ((error as z.ZodError).name === 'ZodError') {
        return c.json(
          { error: 'Invalid entry format', details: (error as z.ZodError).errors },
          400
        );
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

  app.post('/api/prd-suggestions-to-lean-prd', async (c) => {
    const body = await c.req.json();

    console.log('body:', body);

    const result = await generateLeanPRD({
      improvedDescription: body[0],
      successMetric: body[1],
      criticalRisk: body[2],
    });

    return c.json(result);
  });

  // app.get('/api/epic-task-breakdown', async (c) => {
  //   const result = await epicTaskBreakdown() .getEpicTaskBreakdown();
  //   return c.json(result);
  // });

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
    const issues = await fetchOpenIssues('f8n-ai', 'structure');
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
