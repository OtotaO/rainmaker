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
  epicsAndTasks: EpicAndTasks;
  mvpFeatures: MVPFeatures;
  acceptanceCriteria: AcceptanceCriterion[];
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

export const ProductHighLevelDescriptionSchema = z.object({
  id: z.string().min(1).describe('The unique identifier for the product high level description'),
  name: z.string().min(1).describe('The name of the product'),
  description: z.string().min(50).describe('A high level mini narrative document that describes the product, its purpose, core functionality, and any other information that would be most useful to provide as context when iteratively writing up a PRD for a new feature'),
  createdAt: z.string().datetime().describe('The date and time the product high level description was created'),
  updatedAt: z.string().datetime().describe('The date and time the product high level description was last updated'),
});

export type ProductHighLevelDescriptionSchema = z.infer<typeof ProductHighLevelDescriptionSchema>;

// Additional types for Refinement components
export interface AcceptanceCriterion {
  id: string;
  content: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedEffort?: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  features: Feature[];
  estimatedDuration?: string;
}

export interface EpicAndTasks {
  [epicId: string]: string[];
}

export interface MVPFeatures {
  included: Feature[];
  excluded: Feature[];
  reasoning: string;
}

export interface CriticalQuestion {
  id: string;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  constraints: string[];
  timeline?: string;
}

export interface SelectedFile {
  path: string;
  name: string;
  content?: string;
  type: string;
  size?: number;
}

export interface PreviousResponse {
  question: CriticalQuestion;
  answer: string;
  timestamp: string;
}

// Project type for distinguishing between new apps and feature additions
export type ProjectType = 'CREATE_NEW_APPLICATION' | 'ADD_FEATURE_FOR_EXISTING_PROJECT';

export interface ProjectTypeSelection {
  type: ProjectType;
  label: string;
  description: string;
}
