// File: src/prd/prd-reviewer.ts

import { validateAndSanitize, sanitizeInput } from '../lib/schema-utils';
import { logger } from '../lib/logger';
import { CustomError } from '../lib/custom-error';
import { LeanPRDSchema, PRDFeedbackSchema } from './prd-schemas';
import { instructor } from '../lib/instructor';

export class PRDReviewError extends CustomError {}

export const reviewLeanPRD = async (
  input: LeanPRDSchema,
  timeout = 30000,
  maxRetries = 3
): Promise<PRDFeedbackSchema | Partial<PRDFeedbackSchema>> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info('Reviewing lean PRD', { input, attempt: retries + 1 });

      // Validate and sanitize input
      const validatedInput = LeanPRDSchema.parse(input);

      const result = await Promise.race([
        instructor.chat.completions.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: `You are an expert in lean product management practices, specializing in helping small teams and startups efficiently document and communicate product requirements. Your task is to review lean Product Requirements Documents (PRDs) and provide valuable, actionable feedback that balances comprehensiveness with brevity and practicality.

Your primary objectives are to:

1. Ensure the lean PRD captures the essence of the product vision and critical requirements without unnecessary detail.
2. Identify areas where the PRD can be improved to provide clear guidance while remaining concise and accessible.
3. Highlight any crucial information that may be missing, considering the minimal viable documentation needed for the team to proceed effectively.
4. Suggest specific, high-impact improvements that will make the PRD more useful for small teams that may not have extensive product management processes.

When reviewing a lean PRD, consider the following aspects:

- Clarity and conciseness of the core feature definition and business objectives
- Alignment between user needs, proposed solution, and business goals
- Presence of clear, measurable success criteria that are relevant to the team's current stage
- Sufficiency of user requirements for the development team to begin work
- Realistic assessment of key constraints and risks, focusing only on the most critical
- Thoughtful consideration of near-term next steps or iterations

Provide your feedback in a structured format, clearly referencing specific sections of the PRD. Your critique should be:

- Constructive and balanced, acknowledging the lean nature of the document
- Focused on the most impactful improvements that will yield the greatest benefits for the team
- Mindful of the resource constraints and fast-paced environment of small organizations
- Encouraging of sustainable, scalable practices that can grow with the organization

Remember, your goal is to help teams that may not currently document their product requirements to adopt lightweight, effective PRD practices. Your insights should help transform the lean PRD into a valuable tool that enhances communication, aligns the team, and drives successful product outcomes, all while respecting the need for speed and flexibility in smaller organizations.`,
            },
            {
              role: 'user',
              content: `Please review the following lean PRD and provide your feedback:

${JSON.stringify(validatedInput, null, 2)}

Provide your review in the structured format as specified.`,
            },
          ],
          response_model: {
            name: 'PRDFeedbackSchema',
            schema: PRDFeedbackSchema,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PRD review timed out')), timeout)
        ),
      ]);

      // Perform ordered validation and sanitization
      const validatedResult = validateAndSanitize(PRDFeedbackSchema, result);

      // Check if we have at least some valid fields
      if (Object.keys(validatedResult).length === 0) {
        throw new Error('No valid fields in the generated PRD review');
      }

      logger.info('Lean PRD review generated and validated successfully', {
        validFields: Object.keys(validatedResult),
      });

      return validatedResult;
    } catch (error) {
      retries++;
      logger.error(`Error in reviewLeanPRD (Attempt ${retries}/${maxRetries})`, { error });

      if (retries >= maxRetries) {
        throw new PRDReviewError(`Failed to review lean PRD after ${maxRetries} attempts`, error);
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 2 ** retries * 1000));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript doesn't know that
  throw new PRDReviewError(`Failed to review lean PRD after ${maxRetries} attempts`);
};
