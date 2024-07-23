// File: packages/frontend/src/components/Refinement/index.tsx

import type React from 'react';
import { useState } from 'react';
import InitialReview from './InitialReview';
import EpicTaskBreakdown from './EpicTaskBreakdown';
import MVPPrioritization from './MVPPrioritization';
import AcceptanceCriteria from './AcceptanceCriteria';
import TeamReview from './TeamReview';
import FinalizeMVP from './FinalizeMVP';

enum RefinementStep {
  InitialReview = 'InitialReview',
  EpicTaskBreakdown = 'EpicTaskBreakdown',
  MVPPrioritization = 'MVPPrioritization',
  AcceptanceCriteria = 'AcceptanceCriteria',
  TeamReview = 'TeamReview',
  FinalizeMVP = 'FinalizeMVP'
}

interface RefinementProps {
  initialPRD: string;
  onComplete: (finalizedPRD: any) => void;
}

const Refinement: React.FC<RefinementProps> = ({ initialPRD, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<RefinementStep>(RefinementStep.InitialReview);
  const [refinedPRD, setRefinedPRD] = useState(initialPRD);
  const [epicsAndTasks, setEpicsAndTasks] = useState<any>(null);
  const [mvpFeatures, setMvpFeatures] = useState<any>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<any>(null);

  const nextStep = () => {
    setCurrentStep(prevStep => (prevStep + 1) as RefinementStep);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case RefinementStep.InitialReview:
        return <InitialReview prd={refinedPRD} onComplete={(updatedPRD) => { setRefinedPRD(updatedPRD); nextStep(); }} />;
      case RefinementStep.EpicTaskBreakdown:
        return <EpicTaskBreakdown prd={refinedPRD} onComplete={(breakdown) => { setEpicsAndTasks(breakdown); nextStep(); }} />;
      case RefinementStep.MVPPrioritization:
        return <MVPPrioritization epicsAndTasks={epicsAndTasks} onComplete={(prioritized) => { setMvpFeatures(prioritized); nextStep(); }} />;
      case RefinementStep.AcceptanceCriteria:
        return <AcceptanceCriteria mvpFeatures={mvpFeatures} onComplete={(criteria) => { setAcceptanceCriteria(criteria); nextStep(); }} />;
      case RefinementStep.TeamReview:
        return <TeamReview refinedPRD={refinedPRD} epicsAndTasks={epicsAndTasks} mvpFeatures={mvpFeatures} acceptanceCriteria={acceptanceCriteria} onComplete={nextStep} />;
      case RefinementStep.FinalizeMVP:
        return <FinalizeMVP refinedPRD={refinedPRD} epicsAndTasks={epicsAndTasks} mvpFeatures={mvpFeatures} acceptanceCriteria={acceptanceCriteria} onComplete={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="refinement-process">
      <h2>PRD Refinement Process</h2>
      {renderCurrentStep()}
    </div>
  );
};

export default Refinement;