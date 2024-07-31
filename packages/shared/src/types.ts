// START: [04-LRNAI-SH-3.1]
import { z } from 'zod';

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GitHubIssueRequest {
  owner: string;
  repo: string;
}

export interface GitHubIssueResponse {
  issues: GitHubIssue[];
}

export interface FinalizedPRD {
  refinedPRD: string;
  epicsAndTasks: {
    [key: string]: string[];
  };
  mvpFeatures: string[];
  acceptanceCriteria: {
    [key: string]: string[];
  };
  finalNotes: string;
}

export interface PRDGeneratorProps {
  onComplete: (finalizedPRD: FinalizedPRD) => void;
}

export const PlannedAdjustmentSchema = z.object({
  id: z.string(),
  reasoningForAdjustment: z.string(),
  adjustmentDescription: z.string(),
  learningJournalEntryId: z.string(),
});

export const LearningJournalEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userAction: z.string(),
  details: z.string(),
  selfReflectionOnCurrentDetails: z.string(),
  globalSelfReflectionOnEntireJournalSoFar: z.string(),
  plannedAdjustments: z.array(PlannedAdjustmentSchema),
});

export const AIAssistanceLevelSchema = z.object({
  level: z.number().int().min(1).max(4),
  explanation: z.string(),
});

export const LearningJournalEntryRequestSchema = LearningJournalEntrySchema.omit({
  id: true,
  timestamp: true,
});

export const LearningJournalEntriesResponseSchema = z.array(LearningJournalEntrySchema);

export const AIAssistanceLevelResponseSchema = AIAssistanceLevelSchema;

export type LearningJournalEntry = z.infer<typeof LearningJournalEntrySchema>;
export type AIAssistanceLevel = z.infer<typeof AIAssistanceLevelSchema>;
export type LearningJournalEntryRequest = z.infer<typeof LearningJournalEntryRequestSchema>;
export type LearningJournalEntriesResponse = z.infer<typeof LearningJournalEntriesResponseSchema>;
export type AIAssistanceLevelResponse = z.infer<typeof AIAssistanceLevelResponseSchema>;
// END: [04-LRNAI-SH-3.1] [double check: This implementation defines Zod schemas for all required types and exports both the schemas and inferred types. It provides strong typing and validation for our learning journal and AI assistance level data structures.]

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
