import type { FinalizedPRD, GitHubIssue, ImprovedLeanPRDSchema } from '../../../shared/src/types';

export interface PRDGeneratorProps {
  finalizedPRD: ImprovedLeanPRDSchema;
  onComplete: (finalizedPRD: ImprovedLeanPRDSchema) => void;
}

export interface LearningJournalToggleProps {
  showLearningJournal: boolean;
  toggleLearningJournal: () => void;
}

export interface IssueSelectionWrapperProps {
  onIssueSelected: (issue: GitHubIssue) => void;
}

export interface PRDQuestionFlowProps {
  currentStep: number;
  responses: Record<number, string>;
  aiResponses: Record<number, string>;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onEdit: (step: number) => void;
}

export interface AIResponseDisplayProps {
  step: string;
  response: string;
  onEdit: (step: number) => void;
}

export interface FinalizedPRDDisplayProps {
  finalizedPRD: FinalizedPRD;
  onCreateGitHubIssue: () => Promise<void>;
}
