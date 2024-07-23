// File: packages/frontend/src/App.tsx

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, BrainCircuitIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import Refinement from './components/Refinement';
import {
  FinalizedPRD,
  GitHubIssueCreationRequest,
  GitHubIssueCreationResponse
} from '../../shared/src/types';

const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
]

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
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefinementStarted, setIsRefinementStarted] = useState(false);
  const [finalizedPRD, setFinalizedPRD] = useState<FinalizedPRD | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('userInput') as string;

    setResponses({ ...responses, [currentStep]: userInput });
    setIsLoading(true);

    const currentQuestion = PRD_QUESTIONS[currentStep];
    const promptFunction = PRD_QUESTION_TO_PROMPT[currentQuestion.id];
    const prompt = promptFunction(userInput);

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

    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsRefinementStarted(true);
    }
  }

  const handleRefinementComplete = (finalizedPRD: FinalizedPRD) => {
    setFinalizedPRD(finalizedPRD);
    console.log('Finalized PRD:', finalizedPRD);
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
    setIsRefinementStarted(false);
    setFinalizedPRD(null);
  };

  const handleCreateGitHubIssue = async () => {
    if (!finalizedPRD) return;

    const title = "New PRD: " + finalizedPRD.refinedPRD.split('\n')[0]; // Use the first line as the title
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

    const issueCreationRequest: GitHubIssueCreationRequest = {
      title,
      body,
      labels: ['PRD', 'MVP']
    };

    try {
      const response = await fetch('/api/github/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueCreationRequest)
      });

      const result = await response.json() as GitHubIssueCreationResponse;

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


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-bl-full opacity-10 transform rotate-45"></div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8 relative">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            AI-Driven PRD Generator
          </span>
          <SparklesIcon className="absolute -top-4 -left-6 w-8 h-8 text-yellow-400 animate-pulse" />
        </h1>

        {!isRefinementStarted ? (
          <>
            <div className="mb-12 relative">
              <div className="flex justify-between items-center">
                {PRD_QUESTIONS.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      scale: index <= currentStep ? 1 : 0.8,
                      opacity: index <= currentStep ? 1 : 0.5,
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${index < currentStep
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : index === currentStep
                        ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                      } transition-all duration-300 ease-in-out`}
                  >
                    {index < currentStep ? (
                      <CheckIcon className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-semibold">{index + 1}</span>
                    )}
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / PRD_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>
            </div>

            <AnimatePresence>
              {Object.entries(aiResponses).map(([step, response]) => (
                <motion.div
                  key={`response-${step}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-8"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-l-4 border-blue-500 relative">
                    <BrainCircuitIcon className="absolute top-4 right-4 w-8 h-8 text-blue-500 opacity-50" />
                    <h3 className="font-semibold text-gray-800 mb-2 text-lg">AI Insights:</h3>
                    <div className="text-gray-700 prose max-w-none">
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      >
                        {response}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(Number(step))}
                    className="mt-2 text-blue-500 hover:text-blue-600 transition duration-300 ease-in-out font-medium"
                  >
                    Edit Response
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {PRD_QUESTIONS.map((question, index) => (
                currentStep === index && (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">{question.text}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          name="userInput"
                          className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-300 pr-12 resize-none"
                          rows={3}
                          required
                          defaultValue={responses[index] || ''}
                          placeholder="Type your answer here..."
                        />
                        <ArrowRightIcon className="absolute right-4 bottom-4 w-6 h-6 text-gray-400" />
                      </div>
                      <motion.button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          'Submit'
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </>
        ) : (
          <Refinement
            initialPRD={Object.values(aiResponses).join('\n\n')}
            onComplete={handleRefinementComplete}
          />
        )}

        {finalizedPRD && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6 border-l-4 border-green-500"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Finalized PRD</h3>
            <p>Your PRD has been finalized and is ready to be created as a GitHub issue.</p>
            <button
              onClick={handleCreateGitHubIssue}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-300"
            >
              Create GitHub Issue
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default App;