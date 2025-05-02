// ./packages/frontend/src/components/Refinement/PRDQuestionFlow.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, ArrowRightIcon } from 'lucide-react';
import { useAutoResizeTextArea } from './hooks';
import { AIResponseDisplay } from './AIResponseDisplay';
import { usePRDQuestionFlow } from './usePRDQuestionFlow';
import type { ImprovedLeanPRDSchema, ProductHighLevelDescriptionSchema } from '../../../../shared/src/types';

export interface PRDQuestionFlowProps {
  activeProductHighLevelDescription: ProductHighLevelDescriptionSchema;
  onComplete: (prd: ImprovedLeanPRDSchema) => void;
}

export const PRDQuestionFlow: React.FC<PRDQuestionFlowProps> = ({ activeProductHighLevelDescription, onComplete }) => {
  const { currentStep, responses, aiResponses, isLoading, handleSubmit, handleEdit, PRD_QUESTIONS } = usePRDQuestionFlow(activeProductHighLevelDescription, onComplete);
  const textareaRef = useAutoResizeTextArea(responses[PRD_QUESTIONS[currentStep].id] || '');

  return (
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

      {/* Display AI Responses */}
      <AnimatePresence>
        {Object.entries(aiResponses).filter(([_, response]) => response !== undefined).map(([step, response]) => (
          <AIResponseDisplay key={step} step={step} response={response} onEdit={handleEdit} />
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
                    defaultValue={responses[question.id] || ''}
                    placeholder="Type your answer here..."
                  />
                  <ArrowRightIcon className="absolute right-4 bottom-4 w-6 h-6 text-gray-400" />
                </div>
                <div className="space-y-4">
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
                
                {/* Show "Create PRD" button only on the third question */}
                {currentStep === 2 && responses[PRD_QUESTIONS[0].id] && responses[PRD_QUESTIONS[1].id] && (
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <p className="text-sm text-gray-500 mb-3">
                      You can proceed directly to creating the PRD based on your answers:
                    </p>
                    <motion.button
                      type="button" // Not a submit button
                      onClick={async (e) => {
                        e.preventDefault();
                        // Just use the form's submit handler
                        // This will update the response first and then generate the PRD since we're on step 3
                        await handleSubmit(e as any as React.FormEvent<HTMLFormElement>);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? 'Processing...' : 'Create PRD Now'}
                    </motion.button>
                  </div>
                )}
              </div>
              </form>
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </>
  );
};
