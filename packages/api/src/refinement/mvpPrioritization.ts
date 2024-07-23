// File: packages/api/src/refinement/mvpPrioritization.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const mvpPrioritization = async (features: string[]) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Given the following list of features, prioritize them for an MVP. Categorize them into "mvpFeatures" and "futureFeatures". Format the response as JSON with these two arrays. Each feature in the arrays should be an object with "id" and "title".

          Features:
          ${features.join('\n')}`,
        },
      ],
    });

    if (response.content[0].type !== 'text') {
      throw new Error('Got unexpected response type from Anthropic');
    }

    const content = response.content[0].text;
    const result = JSON.parse(content);

    return {
      mvpFeatures: result.mvpFeatures,
      futureFeatures: result.futureFeatures,
    };
  } catch (error) {
    console.error('Error in mvpPrioritization:', error);
    throw new Error('Failed to prioritize MVP features');
  }
};
