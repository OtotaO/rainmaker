// File: packages/api/src/refinement/acceptanceCriteria.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const generateAcceptanceCriteria = async (feature: string) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Generate acceptance criteria for the following feature. Format the response as a JSON array of strings, where each string is a specific criterion.

          Feature:
          ${feature}`,
        },
      ],
    });

    if (response.content[0].type !== 'text') {
      throw new Error('Got unexpected response type from Anthropic');
    }

    const content = response.content[0].text;
    const criteria = JSON.parse(content);

    return { criteria };
  } catch (error) {
    console.error('Error in generateAcceptanceCriteria:', error);
    throw new Error('Failed to generate acceptance criteria');
  }
};
