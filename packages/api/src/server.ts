import express from 'express';
import { initServer, createExpressEndpoints } from '@ts-rest/express';
import { Anthropic } from '@anthropic-ai/sdk';
import { LearningJournalService } from './learningJournalService';
import { PrismaClient } from '.prisma/client';
import cors from 'cors';

import { anthropicRouter, createAnthropicRouter } from './routes/anthropic';
import { productsRouter, createProductsRouter } from './routes/products';
import { learningJournalRouter, createLearningJournalRouter } from './routes/learning-journal';
import { prdRouter, createPrdRouter } from './routes/prd';
import { aiAssistanceRouter, createAiAssistanceRouter } from './routes/ai-assistance';
import { githubRouter, createGithubRouter } from './routes/github';

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

  // Combine all contracts
  const contract = {
    anthropic: anthropicRouter,
    productHighLevelDescriptions: productsRouter,
    learningJournal: learningJournalRouter,
    prd: prdRouter,
    aiAssistance: aiAssistanceRouter,
    github: githubRouter,
  };

  // Create router with implementations
  const router = s.router(contract, {
    anthropic: createAnthropicRouter(anthropic),
    productHighLevelDescriptions: createProductsRouter(prisma),
    learningJournal: createLearningJournalRouter(learningJournalService),
    prd: createPrdRouter(),
    aiAssistance: createAiAssistanceRouter(learningJournalService),
    github: createGithubRouter(),
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
