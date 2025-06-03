// File: src/prd/prd-schemas.ts

import { z } from 'zod';
import type { FlexibleSchema } from '../lib/schema-utils';
import { createFlexibleSchema } from '../lib/schema-utils';

// Section ID constants
export const CORE_SECTION_ID = '01-CORE';
export const BUSINESS_OBJECTIVE_ID = '02-BOBJ';
export const USER_STORY_ID = '03-USER';
export const OVERALL_ASSESSMENT_ID = '01-OVRL';

//TODO(fwd): Fix according to comment
// TODO (1) Implemented: appliedCritiqueIds is now conditional based on prdRevisionType.
// - For INITIAL, appliedCritiqueIds doesn't exist.
// - For REVISED_BASED_ON_FEEDBACK, appliedCritiqueIds is a non-empty array.
// - For UPDATED_DUE_TO_INTERACTION, appliedCritiqueIds is optional, and interactionReferenceId is added.

// Second comment

// Let's promote critique IDs to a first class object 
// - I think it's better this way because then we can be more deliberate in having the "PRD reviewer"
// LLM prompt explicitly state which section of the PRD the critique applies to upfront.
// This will make the "PRD writer" LLM have to do less work on figuring that out and spend its cognitive effort on actually addressing the critique =)

// Third comment

// Let's help out the LLM by being explicit which 4 items we want
// - we want the four most important items that define the "perimeter" of this feature
// - meaning we want something like the "minimal spanning set" of semantically orthogonal constraints that say what is not in scope.

// Define discriminated union for Revision Information
const RevisionInfoBaseSchema = z.object({
  revisionNumber: z.number().int().positive()
    .describe('Sequential number indicating the current revision of the PRD'),
});

const InitialRevisionSchema = RevisionInfoBaseSchema.extend({
  prdRevisionType: z.literal('INITIAL')
    .describe('Indicates this is the first version of the PRD.'),
});

const FeedbackRevisedRevisionSchema = RevisionInfoBaseSchema.extend({
  prdRevisionType: z.literal('REVISED_BASED_ON_FEEDBACK')
    .describe('Indicates this PRD version was revised based on feedback.'),
  appliedCritiqueIds: z.array(z.string()).min(1)
    .describe('Non-empty list of critique IDs that were applied in this revision.'),
});

const UpdateRevisedRevisionSchema = RevisionInfoBaseSchema.extend({
  prdRevisionType: z.literal('UPDATED_DUE_TO_INTERACTION')
    .describe('Indicates this PRD version was updated due to interaction with another feature or change.'),
  interactionReferenceId: z.string()
    .describe('Identifier for the feature or change that prompted this update.'),
  appliedCritiqueIds: z.array(z.string()).optional()
    .describe('Optional list of critique IDs that were applied in this revision.'),
});

export const RevisionInfoSchema = z.discriminatedUnion('prdRevisionType', [
  InitialRevisionSchema,
  FeedbackRevisedRevisionSchema,
  UpdateRevisedRevisionSchema,
]).describe('Metadata about the PRD revision history, typed by revision nature.');


export const LeanPRDSchema = z.object({
  revisionInfo: RevisionInfoSchema,
  coreFeatureDefinition: z
    .object({
      id: z.literal(CORE_SECTION_ID)
        .describe('Fixed identifier for the core feature section'),
      appliedCritiqueIds: z.array(z.string()).optional()
        .describe('IDs of critiques that were applied to improve this section'),
      content: z.string().max(300)
        .describe('The actual feature definition text, limited to 300 characters'),
    })
    .describe('A concise 1-2 sentence definition of the core feature'),
  businessObjective: z
    .object({
      id: z.literal(BUSINESS_OBJECTIVE_ID)
        .describe('Fixed identifier for the business objective section'),
      appliedCritiqueIds: z.array(z.string()).optional()
        .describe('IDs of critiques that were applied to improve this section'),
      content: z.string().max(300)
        .describe('The business objective text, limited to 300 characters'),
    })
    .describe('The main business goal this feature aims to achieve'),
  keyUserStory: z
    .object({
      id: z.literal(USER_STORY_ID)
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
      id: z.literal(OVERALL_ASSESSMENT_ID)
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

  ...LeanPRDSchema.omit({ revisionInfo: true }).shape, // Keep other fields from LeanPRDSchema
  // Override revisionInfo for ImprovedLeanPRDSchema to ensure it's not INITIAL
  revisionInfo: z.discriminatedUnion('prdRevisionType', [
    FeedbackRevisedRevisionSchema,
    UpdateRevisedRevisionSchema,
  ]).describe('Metadata about this improved version, which cannot be an initial revision.'),
});

export type ImprovedLeanPRDSchema = z.infer<typeof ImprovedLeanPRDSchema>;
