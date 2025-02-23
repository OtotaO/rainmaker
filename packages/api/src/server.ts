import express from 'express';
import { initServer, createExpressEndpoints } from '@ts-rest/express';
import { Anthropic } from '@anthropic-ai/sdk';
import { contract } from '../../shared/src/api-contract';
import { LearningJournalService } from './learningJournalService';
import { fetchOpenIssues } from './github';
import { generateLeanPRD } from './prd/prd-generator-service';
import { PrismaClient } from '.prisma/client';
import cors from 'cors';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';

const app = express();
const s = initServer();

try {
  const prisma = new PrismaClient();
  const learningJournalService = new LearningJournalService(prisma);
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  app.use(express.json());
  app.use(cors());

  const router = s.router(contract, {
    anthropic: {
      sendMessage: async ({ body }: ServerInferRequest<typeof contract.anthropic.sendMessage>) => {
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

          return {
            status: 200,
            body: { message: response.content[0].text },
          };
        } catch (error) {
          console.error('Error streaming response:', error);
          return {
            status: 500,
            body: { error: 'Failed to stream response. Please try again later.' },
          };
        }
      },
    },

    productHighLevelDescriptions: {
      getAll: async () => {
        try {
          const productHighLevelDescriptions = await prisma.productHighLevelDescription.findMany();
          return {
            status: 200,
            body: productHighLevelDescriptions.map(desc => ({
              ...desc,
              createdAt: desc.createdAt.toISOString(),
              updatedAt: desc.updatedAt.toISOString()
            })),
          };
        } catch (error) {
          console.error('Error fetching product descriptions:', error);
          return {
            status: 500,
            body: { error: 'Failed to fetch product descriptions' },
          };
        }
      },
    },

    learningJournal: {
      addEntry: async ({ body }: ServerInferRequest<typeof contract.learningJournal.addEntry>) => {
        try {
          await learningJournalService.addEntry(body);
          return {
            status: 201,
            body: { message: 'Entry added successfully' },
          };
        } catch (error) {
          console.error('Error adding journal entry:', error);
          return {
            status: 500,
            body: { error: 'Failed to add journal entry. Please try again later.' },
          };
        }
      },

      getEntries: async () => {
        try {
          const entries = await learningJournalService.getEntries();
          return {
            status: 200,
            body: entries,
          };
        } catch (error) {
          console.error('Error retrieving journal entries:', error);
          return {
            status: 500,
            body: { error: 'Failed to retrieve journal entries. Please try again later.' },
          };
        }
      },
    },

    prd: {
      generateFromSuggestions: async ({ body }: ServerInferRequest<typeof contract.prd.generateFromSuggestions>) => {
        try {
          const [improvedDescription, successMetric, criticalRisk] = body;
          const result = await generateLeanPRD({
            improvedDescription,
            successMetric,
            criticalRisk,
          });

          return {
            status: 200,
            body: result,
          };
        } catch (error) {
          console.error('Error generating PRD:', error);
          return {
            status: 500,
            body: { error: 'Failed to generate PRD. Please try again later.' },
          };
        }
      },
    },

    aiAssistance: {
      getLevel: async () => {
        try {
          const assistanceLevel = await learningJournalService.calculateAIAssistanceLevel();
          return {
            status: 200,
            body: assistanceLevel,
          };
        } catch (error) {
          console.error('Error calculating AI assistance level:', error);
          return {
            status: 500,
            body: { error: 'Failed to calculate AI assistance level. Please try again later.' },
          };
        }
      },
    },

    github: {
      getIssues: async () => {
        try {
          const issues = await fetchOpenIssues('f8n-ai', 'structure');
          return {
            status: 200,
            body: issues.map(issue => ({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body || '',
              labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
              createdAt: new Date(issue.created_at).toISOString(),
              updatedAt: new Date(issue.updated_at).toISOString()
            })),
          };
        } catch (error) {
          console.error('Error fetching GitHub issues:', error);
          return {
            status: 500,
            body: { error: 'Failed to fetch GitHub issues. Please try again later.' },
          };
        }
      },
    },
  });

  createExpressEndpoints(contract, router, app);
} catch (error) {
  console.error('Error starting server:', error);
}

const port = 3001;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
