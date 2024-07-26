// START: [04-LRNAI-FE-2.2]
import React from 'react';
import { motion } from 'framer-motion';
import { FinalizedPRDDisplayProps } from './types';

export const FinalizedPRDDisplay: React.FC<FinalizedPRDDisplayProps> = ({ finalizedPRD, onCreateGitHubIssue }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="mt-8 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6 border-l-4 border-green-500"
  >
    <h3 className="text-2xl font-bold text-gray-800 mb-4">Finalized PRD</h3>
    <p>Your PRD has been finalized and is ready to be created as a GitHub issue.</p>
    <button
      onClick={onCreateGitHubIssue}
      className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-300"
    >
      Create GitHub Issue
    </button>
  </motion.div>
);
// END: [04-LRNAI-FE-2.2]