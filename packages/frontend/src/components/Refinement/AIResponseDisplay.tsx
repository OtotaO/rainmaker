// START: [04-LRNAI-FE-2.2]
import type React from 'react';

import rehypeSanitize from 'rehype-sanitize';
import { motion } from 'framer-motion';
import { BrainCircuitIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export interface AIResponseDisplayProps {
  step: string;
  response: string;
  onEdit: (step: number) => void;
}

export const AIResponseDisplay: React.FC<AIResponseDisplayProps> = ({ step, response, onEdit }) => (
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
        <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{response}</ReactMarkdown>
      </div>
    </div>
    <button
      onClick={() => onEdit(Number(step))}
      className="mt-2 text-blue-500 hover:text-blue-600 transition duration-300 ease-in-out font-medium"
    >
      Edit Response
    </button>
  </motion.div>
);
// END: [04-LRNAI-FE-2.2]