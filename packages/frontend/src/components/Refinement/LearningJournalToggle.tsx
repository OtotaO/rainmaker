// START: [04-LRNAI-FE-2.1]
import React from 'react';
import { LearningJournalToggleProps } from './types';

export const LearningJournalToggle: React.FC<LearningJournalToggleProps> = ({
  showLearningJournal,
  toggleLearningJournal,
}) => (
  <button
    onClick={toggleLearningJournal}
    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-300"
  >
    {showLearningJournal ? 'Hide Learning Journal' : 'Show Learning Journal'}
  </button>
);
// END: [04-LRNAI-FE-2.1]