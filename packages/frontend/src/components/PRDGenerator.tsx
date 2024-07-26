import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, BookOpenIcon, RefreshCwIcon } from 'lucide-react';
import { LearningJournalComponent } from './Refinement/LearningJournalComponent';
import { PRDQuestionFlow } from './Refinement/PRDQuestionFlow';
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import type { PRDGeneratorProps } from './types';
import type { FinalizedPRD, GitHubIssue } from '../../../shared/src/types'
import Refinement from './Refinement';
import type Anthropic from '@anthropic-ai/sdk';

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
  const [issues, setIssues] = useState<GitHubIssue[]>([]);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/github/issues');
      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await fetch('http://localhost:3001/api/github/create-issue', {
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

  const handleIssueSelect = (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setCurrentStep(0);
  };

  const toggleLearningJournal = () => {
    setShowLearningJournal(!showLearningJournal);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center relative mb-8">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              AI Product Team
            </span>
            <SparklesIcon className="absolute -top-6 -left-6 w-8 h-8 text-yellow-400" />
          </h1>

          <div className="flex justify-between mb-6">
            <button
              onClick={toggleLearningJournal}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
            >
              <BookOpenIcon className="mr-2 h-4 w-4" />
              {showLearningJournal ? 'Hide' : 'Show'} Learning Journal
            </button>
            <button
              onClick={fetchIssues}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors flex items-center"
              disabled={isLoading}
            >
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh Issues
            </button>
          </div>

          {showLearningJournal && (
            <LearningJournalComponent onEntryAdded={() => {/* Handle new entry added */ }} />
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCwIcon className="h-8 w-8 text-blue-500" />
              </motion.div>
              <p className="mt-2 text-gray-600">Loading issues...</p>
            </div>
          ) : !selectedIssue && issues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${selectedIssue?.id === issue.id
                    ? 'border-blue-500 shadow-lg'
                    : 'hover:border-gray-300'
                    }`}
                  onClick={() => handleIssueSelect(issue)}
                >
                  <h3 className="text-lg font-semibold mb-2">{issue.title}</h3>
                  <p className="text-sm text-gray-600 truncate">{issue.body}</p>
                </div>
              ))}
            </div>
          ) : !selectedIssue ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
              <p className="font-bold">No issues found</p>
              <p>There are currently no open issues in the repository. Try refreshing or create a new issue.</p>
            </div>
          ) : null}

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
        </div>
      </div>
    </div>
  );
};

const callAnthropicAPI = async (prompt: string): Promise<string> => {
  const requestBody: Anthropic.MessageCreateParamsStreaming = {
    model: 'claude-3-5-sonnet-20240620',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    max_tokens: 1000,
  };

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

export default PRDGenerator;