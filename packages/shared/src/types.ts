export interface Question {
  id: string;
  text: string;
}

export interface PRDState {
  currentStep: number;
  responses: Record<number, string>;
  aiResponses: Record<number, string>;
  isLoading: boolean;
}

// PRD Refinement Types
export interface Epic {
  id: string;
  title: string;
  description: string;
}

export interface Task {
  id: string;
  epicId: string;
  title: string;
  description: string;
}

export interface Feature {
  id: string;
  title: string;
}

export interface MVPFeatures {
  mvpFeatures: Feature[];
  futureFeatures: Feature[];
}

export interface AcceptanceCriterion {
  id: string;
  featureId: string;
  description: string;
}

export interface RefinementStep {
  epicTaskBreakdown: {
    epics: Epic[];
    tasks: Task[];
  };
  mvpPrioritization: MVPFeatures;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface FinalizedPRD {
  refinedPRD: string;
  epicsAndTasks: {
    epics: Epic[];
    tasks: Task[];
  };
  mvpFeatures: MVPFeatures;
  acceptanceCriteria: AcceptanceCriterion[];
  finalNotes: string;
}

// GitHub Integration Types
export interface GitHubIssueCreationRequest {
  title: string;
  body: string;
  labels?: string[];
}

export interface GitHubIssueCreationResponse {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  error?: string;
}

export interface GitHubCommentCreationRequest {
  issueNumber: number;
  comment: string;
}

export interface GitHubCommentCreationResponse {
  success: boolean;
  commentUrl?: string;
  error?: string;
}
