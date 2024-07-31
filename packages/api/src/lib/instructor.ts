import { createLLMClient } from 'llm-polyglot';
import Instructor from '@instructor-ai/instructor';

export const anthropic = createLLMClient({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const instructor = Instructor({ client: anthropic, mode: 'JSON' });
