import express from 'express';
import { initServer, createExpressEndpoints } from '@ts-rest/express';
import { Anthropic } from '@anthropic-ai/sdk';
import { LearningJournalService } from './learningJournalService';
import { PrismaClient } from '.prisma/client';
import cors from 'cors';
import { logger } from './lib/logger';
import * as fs from 'fs';
import * as path from 'path';

// TODO: Move all config to the config module as a self-contained module
import config, { anthropicConfig, serverConfig } from './config';

import { anthropicRouter, createAnthropicRouter } from './routes/anthropic';
import { productsRouter, createProductsRouter } from './routes/products';
import { learningJournalRouter, createLearningJournalRouter } from './routes/learning-journal';
import { prdRouter, createPrdRouter } from './routes/prd';
import { aiAssistanceRouter, createAiAssistanceRouter } from './routes/ai-assistance';
import { githubRouter, createGithubRouter } from './routes/github';
import { configRouter, createConfigRouter } from './routes/config';
import { ConfigSettingService } from './config/configSettingService';

const app = express();
const s = initServer();

try {
  const prisma = new PrismaClient();
  const learningJournalService = new LearningJournalService(prisma);
  
  // Directly extract and clean the API key from the .env file
  const envFilePath = path.resolve(__dirname, '../.env');
  const envFileContent = fs.readFileSync(envFilePath, 'utf8');
  const apiKeyMatch = envFileContent.match(/ANTHROPIC_API_KEY=([^\n\r#]+)/);
  
  if (!apiKeyMatch) {
    logger.error('Could not find ANTHROPIC_API_KEY in .env file');
    throw new Error('Anthropic API key missing in .env file');
  }
  
  // Apply thorough cleaning
  let directApiKey = apiKeyMatch[1];
  directApiKey = directApiKey.trim().replace(/^["'`]|["'`]$/g, '').replace(/\s+/g, '');
  
  logger.info('Direct API key extraction', {
    keyLength: directApiKey.length,
    keyPrefix: directApiKey.substring(0, 10),
    hasExpectedPrefix: directApiKey.startsWith('sk-ant-'),
  });
  
  const anthropic = new Anthropic({
    apiKey: directApiKey,
  });

  logger.info('Anthropic configuration loaded', {
    modelName: anthropicConfig.model,
    apiKeySet: !!anthropicConfig.apiKey,
    apiKeyLength: anthropicConfig.apiKey.length,
  });

  app.use(express.json());
  app.use(cors());

  // Test Anthropic configuration
  app.get('/api/test-anthropic', async (req, res) => {
    try {
      logger.debug('Testing Anthropic API connection');
      
      const message = await anthropic.messages.create({
        model: anthropicConfig.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello!' }]
      });
      res.json({ success: true, message });
    } catch (error) {
      const err = error as Error;
      logger.error('Anthropic test error:', { error: err.message, stack: err.stack });
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Set base path for all routes
  app.use('/api', (req, res, next) => {
    req.url = req.url.replace('/api', '');
    next();
  });

  // Initialize services
  const configSettingService = new ConfigSettingService(prisma);

  // Combine all contracts
  const contract = {
    anthropic: anthropicRouter,
    productHighLevelDescriptions: productsRouter,
    learningJournal: learningJournalRouter,
    prd: prdRouter,
    aiAssistance: aiAssistanceRouter,
    github: githubRouter,
    config: configRouter
  };

  // Create router with implementations
  const router = s.router(contract, {
    anthropic: createAnthropicRouter(anthropic),
    productHighLevelDescriptions: createProductsRouter(prisma),
    learningJournal: createLearningJournalRouter(learningJournalService),
    prd: createPrdRouter(),
    aiAssistance: createAiAssistanceRouter(learningJournalService),
    github: createGithubRouter(),
    config: createConfigRouter(configSettingService)
  });

  createExpressEndpoints(contract, router, app);
} catch (error) {
  logger.error('Error starting server:', error);
}

const port = serverConfig.port;

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

export default app;
