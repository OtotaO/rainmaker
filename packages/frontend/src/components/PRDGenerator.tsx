// START: [04-LRNAI-FE-2.1, 04-LRNAI-FE-2.2, 03-ISSID-FE-2.1, 03-ISSID-FE-2.2]
import type React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from 'lucide-react';
import { LearningJournalComponent } from './Refinement/LearningJournalComponent'
import { IssueSelectionWrapper } from './Refinement/IssueSelectionWrapper';
import { PRDQuestionFlow } from './Refinement/PRDQuestionFlow';
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import { LearningJournalToggle } from './Refinement/LearningJournalToggle';
import type { PRDGeneratorProps } from './types';
import type { GitHubIssue, FinalizedPRD } from '@shared/src/types';
import Refinement from './Refinement';

// START: [CONST-01]
export const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
];

export const PRD_QUESTION_TO_PROMPT: Record<
  (typeof PRD_QUESTIONS)[number]['id'],
  (userInput: string) => string
> = {
  '1_SPEC': (userInput: string) =>
    `Improve this feature description: "${userInput}". Respond in this format:
    Original: [CEO's answer]
    Improved: [Single sentence an engineer can code from]
    Why better: [One sentence explanation]
    <response-text-formatting>Nicely formatted markdown - just return the markdown</response-text-formatting>
    `,
  '2_SUCCESS_METRIC': (userInput: string) =>
    `Refine this success metric: "${userInput}". Respond in this format:
    Original: [CEO's answer]
    Refined metric: [One concrete, measurable metric for the next week]
    Why better: [One sentence on why this metric is superior for quick validation]
    <response-text-formatting>Nicely formatted markdown</response-text-formatting>
    `,
  '3_GOTCHAS': (userInput: string) =>
    `Analyze this potential issue: "${userInput}". Respond in this format:
    Original concern: [CEO's answer]
    Critical risk: [Most likely point of failure (technical, adoption, or business model)]
    Why critical: [One sentence on why addressing this risk is crucial]
    <response-text-formatting>Nicely formatted markdown</response-text-formatting>
  `,
};
// END: [CONST-01]

export const PRDGenerator: React.FC<PRDGeneratorProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefinementStarted, setIsRefinementStarted] = useState(false);
  const [finalizedPRD, setFinalizedPRD] = useState<FinalizedPRD | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [showLearningJournal, setShowLearningJournal] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('userInput') as string;

    setResponses({ ...responses, [currentStep]: userInput });
    setIsLoading(true);

    const currentQuestion = PRD_QUESTION_TO_PROMPT[Object.keys(PRD_QUESTION_TO_PROMPT)[currentStep]];
    const prompt = currentQuestion(userInput);

    try {
      const aiResponse = await callAnthropicAPI(prompt);
      setAiResponses({
        ...aiResponses,
        [currentStep]: aiResponse,
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setAiResponses({
        ...aiResponses,
        [currentStep]: "An error occurred while generating the AI response. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }

    if (currentStep < Object.keys(PRD_QUESTION_TO_PROMPT).length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsRefinementStarted(true);
    }
  }

  const handleRefinementComplete = (finalizedPRD: FinalizedPRD) => {
    setFinalizedPRD(finalizedPRD);
    onComplete(finalizedPRD);
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
    setIsRefinementStarted(false);
    setFinalizedPRD(null);
  };

  const handleCreateGitHubIssue = async () => {
    if (!finalizedPRD) return;

    const title = `New PRD: ${finalizedPRD.refinedPRD.split('\n')[0]}`;
    const body = `
# PRD: ${title}

${finalizedPRD.refinedPRD}

## Epics and Tasks
${JSON.stringify(finalizedPRD.epicsAndTasks, null, 2)}

## MVP Features
${JSON.stringify(finalizedPRD.mvpFeatures, null, 2)}

## Acceptance Criteria
${JSON.stringify(finalizedPRD.acceptanceCriteria, null, 2)}

## Final Notes
${finalizedPRD.finalNotes}
    `;

    try {
      const response = await fetch('/api/github/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, labels: ['PRD', 'MVP'] })
      });

      const result = await response.json();

      if (result.success) {
        alert(`GitHub issue created successfully! URL: ${result.issueUrl}`);
      } else {
        alert(`Failed to create GitHub issue: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      alert('An error occurred while creating the GitHub issue. Please try again.');
    }
  };

  const handleIssueSelected = (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setCurrentStep(0);
  };

  const toggleLearningJournal = () => {
    setShowLearningJournal(!showLearningJournal);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-bl-full opacity-10 transform rotate-45" />

        <h1 className="text-4xl font-bold text-gray-900 mb-8 relative">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            AI-Driven PRD Generator
          </span>
          <SparklesIcon className="absolute -top-4 -left-6 w-8 h-8 text-yellow-400 animate-pulse" />
        </h1>

        <LearningJournalToggle
          showLearningJournal={showLearningJournal}
          toggleLearningJournal={toggleLearningJournal}
        />

        {showLearningJournal && (
          <LearningJournalComponent onEntryAdded={() => {/* Handle new entry added */ }} />
        )}

        {!selectedIssue && !isRefinementStarted && (
          <IssueSelectionWrapper onIssueSelected={handleIssueSelected} />
        )}

        {selectedIssue && !isRefinementStarted && (
          <PRDQuestionFlow
            currentStep={currentStep}
            responses={responses}
            aiResponses={aiResponses}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onEdit={handleEdit}
          />
        )}

        {isRefinementStarted && (
          <Refinement
            initialPRD={Object.values(aiResponses).join('\n\n')}
            onComplete={handleRefinementComplete}
          />
        )}

        {finalizedPRD && (
          <FinalizedPRDDisplay
            finalizedPRD={finalizedPRD}
            onCreateGitHubIssue={handleCreateGitHubIssue}
          />
        )}
      </motion.div>
    </div>
  );
};

const callAnthropicAPI = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = JSON.parse(line.slice(5));
          if (data.type === 'text_delta') {
            result += data.text;
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error calling backend service:', error);
    throw new Error('Failed to get AI response');
  }
};

// END: [04-LRNAI-FE-2.1, 04-LRNAI-FE-2.2, 03-ISSID-FE-2.1, 03-ISSID-FE-2.2]