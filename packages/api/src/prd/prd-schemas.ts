// File: src/prd/prd-schemas.ts

import { z } from 'zod';
import type { FlexibleSchema } from '../lib/schema-utils';
import { createFlexibleSchema } from '../lib/schema-utils';

export const LeanPRDSchema = z.object({
  revisionInfo: z.object({
    revisionNumber: z.number().int().positive()
      .describe('Sequential number indicating the current revision of the PRD'),
    appliedCritiqueIds: z.array(z.string())
      .describe('List of critique IDs that were applied in this revision'),
  }).describe('Metadata about the PRD revision history'),
  coreFeatureDefinition: z
    .object({
      id: z.literal('01-CORE')
        .describe('Fixed identifier for the core feature section'),
      appliedCritiqueIds: z.array(z.string()).optional()
        .describe('IDs of critiques that were applied to improve this section'),
      content: z.string().max(300)
        .describe('The actual feature definition text, limited to 300 characters'),
    })
    .describe('A concise 1-2 sentence definition of the core feature'),
  businessObjective: z
    .object({
      id: z.literal('02-BOBJ')
        .describe('Fixed identifier for the business objective section'),
      appliedCritiqueIds: z.array(z.string()).optional()
        .describe('IDs of critiques that were applied to improve this section'),
      content: z.string().max(300)
        .describe('The business objective text, limited to 300 characters'),
    })
    .describe('The main business goal this feature aims to achieve'),
  keyUserStory: z
    .object({
      id: z.literal('03-USER')
        .describe('Fixed identifier for the key user story section'),
      appliedCritiqueIds: z.array(z.string()).optional()
        .describe('IDs of critiques that were applied to improve this section'),
      content: z.string()
        .describe('The primary user story narrative'),
    })
    .describe('The primary user story this feature addresses'),
  userRequirements: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this requirement'),
        appliedCritiqueIds: z.array(z.string()).optional()
          .describe('IDs of critiques that were applied to improve this requirement'),
        content: z.string()
          .describe('The actual requirement text'),
      })
    )
    .max(8)
    .describe('Essential user-facing requirements and functionality, limited to 8 items'),
  // acceptanceCriteria: z
  //   .array(
  //     z.object({
  //       id: z.string(),
  //       appliedCritiqueIds: z.array(z.string()),
  //       content: z.string(),
  //     })
  //   )
  //   .max(8)
  //   .describe('Specific, measurable criteria to consider the feature complete'),
  successMetrics: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this metric'),
        appliedCritiqueIds: z.array(z.string()).optional()
          .describe('IDs of critiques that were applied to improve this metric'),
        content: z.string()
          .describe('The actual metric definition'),
      })
    )
    .max(4)
    .describe('Less than 4 measurable metrics for validating feature success'),
  constraints: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this constraint'),
        appliedCritiqueIds: z.array(z.string()).optional()
          .describe('IDs of critiques that were applied to improve this constraint'),
        content: z.string()
          .describe('The actual constraint description'),
      })
    )
    .max(4)
    .describe('Any known constraints or limitations for the MVP, limited to 4 items'),
  knownRisks: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this risk'),
        appliedCritiqueIds: z.array(z.string()).optional()
          .describe('IDs of critiques that were applied to improve this risk'),
        content: z.string()
          .describe('The actual risk description'),
      })
    )
    .max(4)
    .describe('Potential risks or challenges associated with the feature, limited to 4 items'),
  // futureConsiderations: z
  //   .array(
  //     z.object({
  //       id: z.string(),
  //       appliedCritiqueIds: z.array(z.string()),
  //       content: z.string(),
  //     })
  //   )
  //   .max(4)
  //   .describe('High-level ideas or goals for future iterations after MVP'),
});

export type LeanPRDSchema = z.infer<typeof LeanPRDSchema>;

export const FlexibleLeanPRDSchema = createFlexibleSchema(LeanPRDSchema);
export type FlexibleLeanPRDSchema = FlexibleSchema<typeof LeanPRDSchema.shape>;

export const FeatureInputSchema = z.object({
  improvedDescription: z.string().min(1, 'Improved description is required')
    .describe('Enhanced description of the feature incorporating feedback'),
  successMetric: z.string().min(1, 'Success metric is required')
    .describe('Metric to measure the success of the feature'),
  criticalRisk: z.string().min(1, 'Critical risk is required')
    .describe('Most important risk or challenge to address'),
});

export type FeatureInputSchema = z.infer<typeof FeatureInputSchema>;

export const PRDFeedbackSchema = z.object({
  overallAssessment: z
    .object({
      id: z.literal('01-OVRL')
        .describe('Fixed identifier for the overall assessment section'),
      referencedIds: z.array(z.string())
        .describe('IDs of PRD sections this assessment references'),
      content: z.string().max(300)
        .describe('The actual assessment text, limited to 300 characters'),
    })
    .describe('A brief overall assessment of the PRD, highlighting key strengths and areas for improvement'),

  strengths: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this strength'),
        referencedIds: z.array(z.string())
          .describe('IDs of PRD sections this strength references'),
        content: z.string()
          .describe('Description of the strength'),
      })
    )
    .max(5)
    .describe('Key strengths of the PRD, limited to 5 items'),

  areasForImprovement: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this improvement area'),
        referencedIds: z.array(z.string())
          .describe('IDs of PRD sections this improvement area references'),
        content: z.string()
          .describe('Description of the area needing improvement'),
      })
    )
    .max(5)
    .describe('Main areas where the PRD could be improved, limited to 5 items'),

  specificSuggestions: z
    .array(
      z.object({
        id: z.string()
          .describe('Unique identifier for this suggestion'),
        referencedIds: z.array(z.string())
          .describe('IDs of PRD sections this suggestion references'),
        content: z.string()
          .describe('The actual suggestion text'),
      })
    )
    .max(8)
    .describe('Specific suggestions for improving the PRD, limited to 8 items'),
});

export type PRDFeedbackSchema = z.infer<typeof PRDFeedbackSchema>;

export const PRDWithReviewSchema = z.object({
  originalPRD: LeanPRDSchema
    .describe('The original PRD document being reviewed'),
  review: PRDFeedbackSchema
    .describe('The feedback and review of the PRD'),
});

export type PRDWithReviewSchema = z.infer<typeof PRDWithReviewSchema>;

export const ImprovedLeanPRDSchema = z.object({
  revisionInfo: z.object({
    revisionNumber: z.number().int().positive()
      .describe('Sequential number indicating the current revision'),
    appliedCritiqueIds: z.array(z.string())
      .describe('List of critique IDs applied in this revision'),
  }).describe('Metadata about this improved version'),

  improvements: z.array(
    z.object({
      id: z.string()
        .describe('Unique identifier for this improvement'),
      description: z.string()
        .describe('Description of what was improved'),
      appliedTo: z.array(z.string())
        .describe('IDs of PRD sections this improvement was applied to'),
    })
  ).describe('List of improvements made in this revision'),

  ...LeanPRDSchema.omit({ revisionInfo: true }).shape,
});

export type ImprovedLeanPRDSchema = z.infer<typeof ImprovedLeanPRDSchema>;
