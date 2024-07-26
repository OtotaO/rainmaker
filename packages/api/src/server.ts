import { Hono } from 'hono';
import type { z } from 'zod';
import { LearningJournalService } from './learningJournalService';
import {
  LearningJournalEntryRequestSchema,
  LearningJournalEntriesResponseSchema,
  AIAssistanceLevelResponseSchema,
} from '../../shared/src/types';

const app = new Hono();

try {
  const learningJournalService = new LearningJournalService();

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
} catch (error) {
  console.error('Error starting server:', error);
}

export default {
  port: 3001,
  fetch: app.fetch,
};
