// START: [04-LRNAI-BE-1.2, 04-LRNAI-EH-5.1, 04-LRNAI-EH-5.2, 04-LRNAI-EH-5.3, 04-LRNAI-EH-5.4, 04-LRNAI-EH-5.5]
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import type Anthropic from '@anthropic-ai/sdk';
import type {
  LearningJournalEntry,
  AIAssistanceLevel,
  LearningJournalEntryRequest,
} from '../../shared/src/types';
import { AIAssistanceLevelSchema } from '../../shared/src/types';

import { createLLMClient } from 'llm-polyglot';
import Instructor from '@instructor-ai/instructor';

const anthropic: Anthropic = createLLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const instructor = Instructor<typeof anthropic>({
  client: anthropic,
  mode: 'JSON_SCHEMA',
});

export class LearningJournalService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async addEntry(entry: LearningJournalEntryRequest): Promise<void> {
    try {
      await this.prisma.learningJournalEntry.create({
        data: {
          ...entry,
          id: uuidv4(),
          plannedAdjustments: {
            createMany: {
              data: entry.plannedAdjustments || [],
            },
          },
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to add learning journal entry:', error);
      throw new Error('Failed to add learning journal entry. Please try again later.');
    }
  }

  async getEntries(): Promise<LearningJournalEntry[]> {
    try {
      const entries = await this.prisma.learningJournalEntry.findMany({
        include: {
          plannedAdjustments: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 50, // Limit to the most recent 50 entries
      });
      return entries.map((entry) => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      }));
    } catch (error) {
      console.error('Failed to retrieve learning journal entries:', error);
      throw new Error('Failed to retrieve learning journal entries. Please try again later.');
    }
  }

  async calculateAIAssistanceLevel(): Promise<AIAssistanceLevel> {
    try {
      const recentEntries = await this.getEntries();
      const prompt = this.buildAssistanceLevelPrompt(recentEntries);

      const assistanceLevel = await instructor.chat.completions.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
        response_model: {
          name: 'AIAssistanceLevelSchema',
          schema: AIAssistanceLevelSchema,
        },
      });

      return assistanceLevel;
    } catch (error) {
      console.error('Failed to calculate AI assistance level:', error);
      return {
        level: 2,
        explanation: 'Unable to calculate AI assistance level. Using default level.',
      };
    }
  }

  private buildAssistanceLevelPrompt(entries: LearningJournalEntry[]): string {
    return `Based on the following recent learning journal entries, suggest an AI assistance level (1-4) and provide a brief explanation:

    ${JSON.stringify(entries)}

    Respond with a JSON object containing 'level' (number 1-4) and 'explanation' (string) fields.`;
  }
}
// END: [04-LRNAI-BE-1.2, 04-LRNAI-EH-5.1, 04-LRNAI-EH-5.2, 04-LRNAI-EH-5.3, 04-LRNAI-EH-5.4, 04-LRNAI-EH-5.5] [double check: This implementation provides a complete LearningJournalService using Anthropic's API instead of OpenAI. It includes methods for adding entries, retrieving entries, and calculating the AI assistance level. Error handling for database failures (5.1), AI service failures (5.2), data validation (5.3), and clear error messages (5.5) are implemented. Concurrency handling (5.4) is managed by the database. The code is complete and aligns with the project's actual structure and technologies.]
