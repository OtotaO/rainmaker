import { createLLMClient } from 'llm-polyglot';
import Instructor from '@instructor-ai/instructor';
import { z } from 'zod';
import { anthropicConfig } from '../config';

const anthropic = createLLMClient({
  provider: 'anthropic',
  apiKey: anthropicConfig.apiKey,
});

const instructor = Instructor({ client: anthropic, mode: 'JSON' });

// Define Zod schemas
export const EpicSchema = z.object({
  id: z.string().describe('A unique identifier for the epic'),
  title: z.string().describe('A concise title for the epic'),
  description: z.string().describe('A detailed description of the epic and its goals'),
});

export const TaskSchema = z.object({
  id: z.string().describe('A unique identifier for the task'),
  epicId: z.string().describe('The ID of the epic this task belongs to'),
  title: z.string().describe('A concise title for the task'),
  description: z.string().describe('A detailed description of the task and its objectives'),
});

export const EpicTaskBreakdownSchema = z.object({
  epics: z.array(EpicSchema).describe('An array of epics derived from the PRD'),
  tasks: z.array(TaskSchema).describe('An array of tasks associated with the epics'),
});

// Define types based on the schemas
export type EpicSchema = z.infer<typeof EpicSchema>;
export type TaskSchema = z.infer<typeof TaskSchema>;
export type EpicTaskBreakdownSchema = z.infer<typeof EpicTaskBreakdownSchema>;

export const epicTaskBreakdown = async (prd: string): Promise<EpicTaskBreakdownSchema> => {
  try {
    const result = await instructor.chat.completions.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze the following PRD and break it down into epics and tasks. Focus on creating a logical structure that covers all major features and their implementation steps.

          PRD:
          ${prd}`,
        },
      ],
      response_model: {
        name: 'EpicTaskBreakdownSchema',
        schema: EpicTaskBreakdownSchema,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in epicTaskBreakdown:', error);
    throw new Error('Failed to break down PRD into epics and tasks');
  }
};
