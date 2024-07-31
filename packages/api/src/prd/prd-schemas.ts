// File: src/prd/prd-schemas.ts

import { z } from 'zod';
import type { FlexibleSchema } from '../lib/schema-utils';
import { createFlexibleSchema } from '../lib/schema-utils';

export const LeanPRDSchema = z.object({
  coreFeatureDefinition: z
    .string()
    .max(200)
    .describe('A concise 1-2 sentence definition of the core feature'),
  keyUserStory: z.string().describe('The primary user story this feature addresses'),
  quickSuccessMetric: z
    .string()
    .describe('A simple, quick-to-measure metric for validating feature success'),
  essentialFunctionalRequirements: z
    .array(z.string())
    .describe('Bullet points of essential functional requirements'),
  criticalTechnicalSpecifications: z
    .array(z.string())
    .describe('Key technical specifications for AI implementation'),
  minimalAcceptanceCriteria: z
    .array(z.string())
    .describe('Minimal criteria to consider the feature complete'),
  knownLimitationsRisks: z
    .array(z.string())
    .describe('Known limitations or risks associated with the MVP implementation'),
  nextIterationGoals: z
    .array(z.string())
    .describe('High-level goals for the next iteration after MVP'),
});

export type LeanPRDSchema = z.infer<typeof LeanPRDSchema>;

export const FlexibleLeanPRDSchema = createFlexibleSchema(LeanPRDSchema);
export type FlexibleLeanPRDSchema = FlexibleSchema<typeof LeanPRDSchema.shape>;

export const FeatureInputSchema = z.object({
  improvedDescription: z
    .string()
    .min(1, 'Improved description is required')
    .max(500, 'Improved description must not exceed 500 characters'),
  successMetric: z
    .string()
    .min(1, 'Success metric is required')
    .max(200, 'Success metric must not exceed 200 characters'),
  criticalRisk: z
    .string()
    .min(1, 'Critical risk is required')
    .max(200, 'Critical risk must not exceed 200 characters'),
});

export type FeatureInputSchema = z.infer<typeof FeatureInputSchema>;
