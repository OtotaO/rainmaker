// START: [APP-01]
import type React from 'react';
import { PRDGenerator } from './components/PRDGenerator';
import type { FinalizedPRD } from '../../shared/src/types';

const App: React.FC = () => {
  const handlePRDComplete = (finalizedPRD: FinalizedPRD) => {
    console.log('Finalized PRD:', finalizedPRD);
    // Here you can add any additional logic you want to perform when the PRD is finalized
  };

  return (
    <PRDGenerator onComplete={handlePRDComplete} />
  );
};

export default App;
// END: [APP-01]