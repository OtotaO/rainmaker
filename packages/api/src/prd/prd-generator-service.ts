// File: src/prd/prd-generator.ts

import { validateAndSanitize, sanitizeInput } from '../lib/schema-utils';
import { logger } from '../lib/logger';
import { CustomError } from '../lib/custom-error';
import { FeatureInputSchema, FlexibleLeanPRDSchema, LeanPRDSchema } from './prd-schemas';
import { instructor } from '../lib/instructor';

export class PRDGenerationError extends CustomError {}

export const generateLeanPRD = async (
  input: FeatureInputSchema,
  timeout = 30000,
  maxRetries = 3
): Promise<FlexibleLeanPRDSchema> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info('Generating lean PRD', { input, attempt: retries + 1 });

      // Validate and sanitize input
      const sanitizedInput = {
        improvedDescription: sanitizeInput(input.improvedDescription),
        successMetric: sanitizeInput(input.successMetric),
        criticalRisk: sanitizeInput(input.criticalRisk),
      };

      const validatedInput = FeatureInputSchema.parse(sanitizedInput);

      const result = await Promise.race([
        instructor.chat.completions.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Generate a lean PRD for an MVP feature based on the following input:

              Improved Feature Description: ${validatedInput.improvedDescription}
              Success Metric: ${validatedInput.successMetric}
              Critical Risk: ${validatedInput.criticalRisk}

              Focus on essential information needed for AI implementation. Be concise and specific.`,
            },
          ],
          response_model: {
            name: 'FlexibleLeanPRDSchema',
            schema: FlexibleLeanPRDSchema,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PRD generation timed out')), timeout)
        ),
      ]);

      // Perform ordered validation and sanitization
      const validatedResult = validateAndSanitize(LeanPRDSchema, result);

      // Check if we have at least some valid fields
      if (Object.keys(validatedResult).length === 0) {
        throw new Error('No valid fields in the generated PRD');
      }

      logger.info('Lean PRD generated and validated successfully', {
        validFields: Object.keys(validatedResult),
      });

      return validatedResult;
    } catch (error) {
      retries++;
      logger.error(`Error in generateLeanPRD (Attempt ${retries}/${maxRetries})`, { error });

      if (retries >= maxRetries) {
        throw new PRDGenerationError(
          `Failed to generate lean PRD after ${maxRetries} attempts`,
          error
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 2 ** retries * 1000));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript doesn't know that
  throw new PRDGenerationError(`Failed to generate lean PRD after ${maxRetries} attempts`);
};
