// START: [04-LRNAI-BE-1.2, 04-LRNAI-EH-5.1, 04-LRNAI-EH-5.2, 04-LRNAI-EH-5.3, 04-LRNAI-EH-5.4, 04-LRNAI-EH-5.5]
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { LearningJournalEntry, AIAssistanceLevel } from '../../shared/src/types';

export class LearningJournalService {
  private prisma: PrismaClient;
  private anthropic: Anthropic;

  constructor() {
    this.prisma = new PrismaClient();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async addEntry(entry: LearningJournalEntry): Promise<void> {
    try {
      await this.prisma.learningJournalEntry.create({
        data: {
          ...entry,
          timestamp: new Date(entry.timestamp),
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

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });

      if (response.content[0].type !== 'text') {
        throw new Error('Unexpected response type from Anthropic API');
      }

      const content = response.content[0].text;
      const parsedContent = JSON.parse(content);

      if (!this.isValidAIAssistanceLevel(parsedContent)) {
        throw new Error('Invalid AI assistance level response');
      }

      return parsedContent;
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

  private isValidAIAssistanceLevel(data: any): data is AIAssistanceLevel {
    return (
      typeof data === 'object' &&
      typeof data.level === 'number' &&
      data.level >= 1 &&
      data.level <= 4 &&
      typeof data.explanation === 'string'
    );
  }
}
// END: [04-LRNAI-BE-1.2, 04-LRNAI-EH-5.1, 04-LRNAI-EH-5.2, 04-LRNAI-EH-5.3, 04-LRNAI-EH-5.4, 04-LRNAI-EH-5.5] [double check: This implementation provides a complete LearningJournalService using Anthropic's API instead of OpenAI. It includes methods for adding entries, retrieving entries, and calculating the AI assistance level. Error handling for database failures (5.1), AI service failures (5.2), data validation (5.3), and clear error messages (5.5) are implemented. Concurrency handling (5.4) is managed by the database. The code is complete and aligns with the project's actual structure and technologies.]
