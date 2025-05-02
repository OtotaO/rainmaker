import { createLLMClient } from 'llm-polyglot';
import Instructor from '@instructor-ai/instructor';
import { anthropicConfig } from '../config';

export const anthropic = createLLMClient({
  provider: 'anthropic',
  apiKey: anthropicConfig.apiKey,
});

export const instructor = Instructor({ client: anthropic, mode: 'MD_JSON' });
