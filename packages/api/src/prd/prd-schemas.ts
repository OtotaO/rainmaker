// File: src/prd/prd-schemas.ts

import { z } from 'zod';
import type { FlexibleSchema } from '../lib/schema-utils';
import { createFlexibleSchema } from '../lib/schema-utils';

export const LeanPRDSchema = z.object({
  revisionInfo: z.object({
    revisionNumber: z.number().int().positive(),
    appliedCritiqueIds: z.array(z.string()),
  }),
  coreFeatureDefinition: z
    .object({
      id: z.literal('01-CORE'),
      appliedCritiqueIds: z.array(z.string()),
      content: z.string().max(200),
    })
    .describe('A concise 1-2 sentence definition of the core feature'),
  businessObjective: z
    .object({
      id: z.literal('02-BOBJ'),
      appliedCritiqueIds: z.array(z.string()),
      content: z.string().max(200),
    })
    .describe('The main business goal this feature aims to achieve'),
  keyUserStory: z
    .object({
      id: z.literal('03-USER'),
      appliedCritiqueIds: z.array(z.string()),
      content: z.string().max(200),
    })
    .describe('The primary user story this feature addresses'),
  userRequirements: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(6)
    .describe('Essential user-facing requirements and functionality'),
  acceptanceCriteria: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(6)
    .describe('Specific, measurable criteria to consider the feature complete'),
  successMetrics: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(3)
    .describe('2-3 measurable metrics for validating feature success'),
  constraints: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(4)
    .describe('Any known constraints or limitations for the MVP'),
  knownRisks: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(4)
    .describe('Potential risks or challenges associated with the feature'),
  futureConsiderations: z
    .array(
      z.object({
        id: z.string(),
        appliedCritiqueIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(4)
    .describe('High-level ideas or goals for future iterations after MVP'),
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

export const PRDFeedbackSchema = z.object({
  overallAssessment: z
    .object({
      id: z.literal('01-OVRL'),
      referencedIds: z.array(z.string()),
      content: z.string().max(300),
    })
    .describe(
      'A brief overall assessment of the PRD, highlighting key strengths and areas for improvement'
    ),
  strengths: z
    .array(
      z.object({
        id: z.string(),
        referencedIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(5)
    .describe('Key strengths of the PRD'),
  areasForImprovement: z
    .array(
      z.object({
        id: z.string(),
        referencedIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(5)
    .describe('Main areas where the PRD could be improved'),
  specificSuggestions: z
    .array(
      z.object({
        id: z.string(),
        referencedIds: z.array(z.string()),
        content: z.string(),
      })
    )
    .max(8)
    .describe('Specific suggestions for improving the PRD'),
});

export type PRDFeedbackSchema = z.infer<typeof PRDFeedbackSchema>;

export const PRDWithReviewSchema = z.object({
  originalPRD: LeanPRDSchema,
  review: PRDFeedbackSchema,
});

export type PRDWithReviewSchema = z.infer<typeof PRDWithReviewSchema>;

export const ImprovedLeanPRDSchema = z.object({
  revisionInfo: z.object({
    revisionNumber: z.number().int().positive(),
    appliedCritiqueIds: z.array(z.string()),
  }),
  improvements: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      appliedTo: z.array(z.string()),
    })
  ),
  ...LeanPRDSchema.omit({ revisionInfo: true }).shape,
});

export type ImprovedLeanPRDSchema = z.infer<typeof ImprovedLeanPRDSchema>;
