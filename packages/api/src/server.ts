import 'dotenv/config';
import express from 'express';
import { initServer, createExpressEndpoints } from '@ts-rest/express';
import { Anthropic } from '@anthropic-ai/sdk';
import { LearningJournalService } from './learningJournalService';
import { PrismaClient } from '.prisma/client';
import cors from 'cors';
import { logger } from './lib/logger';
import * as fs from 'fs';
import * as path from 'path';

import { anthropicRouter, createAnthropicRouter } from './routes/anthropic';
import { productsRouter, createProductsRouter } from './routes/products';
import { learningJournalRouter, createLearningJournalRouter } from './routes/learning-journal';
import { prdRouter, createPrdRouter } from './routes/prd';
import { aiAssistanceRouter, createAiAssistanceRouter } from './routes/ai-assistance';
import { githubRouter, createGithubRouter } from './routes/github';

// Read the API key directly from the .env file
const envFilePath = path.resolve(__dirname, '../.env');
const envFileContent = fs.readFileSync(envFilePath, 'utf8');
const apiKeyMatch = envFileContent.match(/ANTHROPIC_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : process.env.ANTHROPIC_API_KEY;

const app = express();
const s = initServer();

try {
  const prisma = new PrismaClient();
  const learningJournalService = new LearningJournalService(prisma);
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  console.log('Anthropic API Key loaded:', apiKey ? 'Yes' : 'No');
  console.log('API Key length:', apiKey?.length || 0);
  console.log('API Key prefix:', apiKey?.substring(0, 15) || 'none');

  app.use(express.json());
  app.use(cors());

  // Test Anthropic configuration
  app.get('/api/test-anthropic', async (req, res) => {
    try {
      console.log('API Key length:', apiKey?.length || 0);
      console.log('API Key prefix:', apiKey?.substring(0, 15) || 'none');
      
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello!' }]
      });
      res.json({ success: true, message });
    } catch (error) {
      const err = error as Error;
      console.error('Anthropic test error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Set base path for all routes
  app.use('/api', (req, res, next) => {
    req.url = req.url.replace('/api', '');
    next();
  });

  // Combine all contracts
  const contract = {
    anthropic: anthropicRouter,
    productHighLevelDescriptions: productsRouter,
    learningJournal: learningJournalRouter,
    prd: prdRouter,
    aiAssistance: aiAssistanceRouter,
    github: githubRouter
  };

  // Create router with implementations
  const router = s.router(contract, {
    anthropic: createAnthropicRouter(anthropic),
    productHighLevelDescriptions: createProductsRouter(prisma),
    learningJournal: createLearningJournalRouter(learningJournalService),
    prd: createPrdRouter(),
    aiAssistance: createAiAssistanceRouter(learningJournalService),
    github: createGithubRouter()
  });

  createExpressEndpoints(contract, router, app);
} catch (error) {
  logger.error('Error starting server:', error);
}

const port = 3001;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
