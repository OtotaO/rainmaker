// File: src/prd/prd-generator.ts

import { validateAndSanitize, sanitizeInput } from '../lib/schema-utils';
import { logger } from '../lib/logger';
import { CustomError } from '../lib/custom-error';
import {
  FeatureInputSchema,
  FlexibleLeanPRDSchema,
  LeanPRDSchema,
  PRDWithReviewSchema,
  ImprovedLeanPRDSchema,
  PRDFeedbackSchema,
} from './prd-schemas';
import { instructor } from '../lib/instructor';
import { reviewLeanPRD } from './prd-reviewer-service';

export class PRDGenerationError extends CustomError {}

export const generateLeanPRD = async (
  input: FeatureInputSchema,
  timeout = 30000,
  maxRetries = 3
): Promise<FlexibleLeanPRDSchema> => {
  let retries = 0;

  logger.debug('input for generating lean PRD:', input);

  while (retries < maxRetries) {
    try {
      // Validate and sanitize input
      // const sanitizedInput = {
      //   improvedDescription: sanitizeInput(input.improvedDescription),
      //   successMetric: sanitizeInput(input.successMetric),
      //   criticalRisk: sanitizeInput(input.criticalRisk),
      // };

      // const validatedInput = FeatureInputSchema.parse(sanitizedInput);

      const result = await Promise.race([
        instructor.chat.completions.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: `
Generate a lean PRD for an MVP feature based on the following input:

<feature-description-analysis>
${input.improvedDescription}
</feature-description-analysis>

<success-metric-analysis>
${input.successMetric}
</success-metric-analysis>

<critical-risk-analysis>
${input.criticalRisk}
</critical-risk-analysis>

Focus on essential information needed for AI implementation. Be concise and specific.
`,
            },
          ],
          response_model: {
            name: 'LeanPRDSchema',
            schema: LeanPRDSchema,
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

      logger.info('initial PRD:', { validatedResult });
      // return validatedResult;
      logger.info('going ahead to auto-PRD review phase');
      const prdReview = await reviewLeanPRD(validatedResult as LeanPRDSchema);
      const improvedPRD = await generateImprovedLeanPRD({
        originalPRD: validatedResult as LeanPRDSchema,
        review: prdReview as PRDFeedbackSchema,
      });

      logger.info('Improved PRD generated', { improvedPRD });
      return improvedPRD;
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

export const generateImprovedLeanPRD = async (
  input: PRDWithReviewSchema,
  timeout = 30000,
  maxRetries = 3
): Promise<ImprovedLeanPRDSchema | Partial<ImprovedLeanPRDSchema>> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info('Generating improved lean PRD', { attempt: retries + 1 });

      // Validate and sanitize input
      const validatedInput = PRDWithReviewSchema.parse(input);

      const result = await Promise.race([
        instructor.chat.completions.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 2000,
          messages: [
            {
              role: 'system',
              content: `You are an expert in lean product management practices. Your task is to improve a lean Product Requirements Document (PRD) based on a review. Focus on making high-impact improvements while maintaining the document's conciseness and practicality. Consider the review feedback carefully, but use your judgment to determine which suggestions to implement and how to best improve the PRD.`,
            },
            {
              role: 'user',
              content: `Please improve the following lean PRD based on the provided review:

Original PRD:
${JSON.stringify(validatedInput.originalPRD, null, 2)}

Review:
${JSON.stringify(validatedInput.review, null, 2)}

Generate an improved version of the PRD, incorporating the most valuable feedback. Provide a list of improvements made, referencing the critique IDs they address. Ensure the improved PRD remains concise and focused on essential information for a lean approach.`,
            },
          ],
          response_model: {
            name: 'ImprovedLeanPRDSchema',
            schema: ImprovedLeanPRDSchema,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Improved PRD generation timed out')), timeout)
        ),
      ]);

      // Perform ordered validation and sanitization
      const validatedResult = validateAndSanitize(ImprovedLeanPRDSchema, result);

      // Check if we have at least some valid fields
      if (Object.keys(validatedResult).length === 0) {
        throw new Error('No valid fields in the generated improved PRD');
      }

      logger.info('Improved Lean PRD generated and validated successfully', {
        validFields: Object.keys(validatedResult),
      });

      return validatedResult;
    } catch (error) {
      retries++;
      logger.error(`Error in generateImprovedLeanPRD (Attempt ${retries}/${maxRetries})`, {
        error,
      });

      if (retries >= maxRetries) {
        throw new PRDGenerationError(
          `Failed to generate improved lean PRD after ${maxRetries} attempts`,
          error
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 2 ** retries * 1000));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript doesn't know that
  throw new PRDGenerationError(`Failed to generate improved lean PRD after ${maxRetries} attempts`);
};
