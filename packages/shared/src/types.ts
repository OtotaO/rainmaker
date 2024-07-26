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
