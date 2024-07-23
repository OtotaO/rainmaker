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
