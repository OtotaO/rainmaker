// File: packages/api/src/refinement/acceptanceCriteria.ts

import { z } from 'zod';
import { instructor } from '../lib/instructor';

// Define schema for structured output validation
const AcceptanceCriteriaSchema = z.object({
  criteria: z.array(z.string())
    .describe('List of acceptance criteria for the feature')
});

type AcceptanceCriteriaResult = z.infer<typeof AcceptanceCriteriaSchema>;

export const generateAcceptanceCriteria = async (feature: string): Promise<AcceptanceCriteriaResult> => {
  try {
    const result = await instructor.chat.completions.create({
      model: 'claude-3-7',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Generate acceptance criteria for the following feature:
          
          Feature:
          ${feature}
          
          Provide ONLY acceptance criteria that are specific, measurable, and testable.`,
        },
      ],
      response_model: {
        name: 'AcceptanceCriteriaSchema',
        schema: AcceptanceCriteriaSchema,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in generateAcceptanceCriteria:', error);
    throw new Error('Failed to generate acceptance criteria');
  }
};
