// File: packages/api/src/refinement/epicTaskBreakdown.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const epicTaskBreakdown = async (prd: string) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Based on the following PRD, break it down into epics and tasks. Format the response as JSON with "epics" and "tasks" arrays. Each epic should have an "id", "title", and "description". Each task should have an "id", "epicId", "title", and "description".

          PRD:
          ${prd}`,
        },
      ],
    });

    if (response.content[0].type !== 'text') {
      throw new Error('Got unexpected response type from Anthropic');
    }

    const content = response.content[0].text;
    const result = JSON.parse(content);

    return {
      epics: result.epics,
      tasks: result.tasks,
    };
  } catch (error) {
    console.error('Error in epicTaskBreakdown:', error);
    throw new Error('Failed to break down PRD into epics and tasks');
  }
};
