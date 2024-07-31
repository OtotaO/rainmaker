import { z } from 'zod';
import { instructor } from '../lib/instructor';

export const FeatureSchema = z.object({
  id: z.string().describe('A unique identifier for the feature'),
  title: z.string().describe('The title or brief description of the feature'),
});

export type FeatureSchema = z.infer<typeof FeatureSchema>;

export const MVPPrioritizationSchema = z.object({
  mvpFeatures: z
    .array(FeatureSchema)
    .describe('Features that should be included in the Minimum Viable Product'),
  futureFeatures: z
    .array(FeatureSchema)
    .describe('Features that can be developed in future iterations after the MVP'),
});

export type MVPPrioritizationSchema = z.infer<typeof MVPPrioritizationSchema>;

export const mvpPrioritization = async (features: string[]) => {
  try {
    const result = await instructor.chat.completions.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Prioritize the following features for an MVP. Categorize them into MVP features and future features. Consider the core functionality and value proposition when making your decision.

          Features:
          ${features.join('\n')}`,
        },
      ],
      response_model: {
        name: 'MVPPrioritization',
        schema: MVPPrioritizationSchema,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in mvpPrioritization:', error);
    throw new Error('Failed to prioritize MVP features');
  }
};
