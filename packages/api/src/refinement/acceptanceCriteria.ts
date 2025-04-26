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
    
    // Handle both JSON and plain text responses
    let criteria;
    try {
      // Try to parse as JSON
      criteria = JSON.parse(content);
    } catch (parseError) {
      // If JSON parsing fails, extract criteria from text
      // Split by newlines and clean up
      criteria = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('```') && !line.includes('Feature:'));
    }
    
    // Ensure criteria is an array
    if (!Array.isArray(criteria)) {
      criteria = [content];
    }

    return { criteria };
  } catch (error) {
    console.error('Error in generateAcceptanceCriteria:', error);
    throw new Error('Failed to generate acceptance criteria');
  }
};
