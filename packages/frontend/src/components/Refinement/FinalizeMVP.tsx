import type React from 'react';
import { useState } from 'react';

interface FinalizeMVPProps {
  refinedPRD: string;
  epicsAndTasks: any;
  mvpFeatures: any;
  acceptanceCriteria: any;
  onComplete: (finalizedPRD: any) => void;
}

const FinalizeMVP: React.FC<FinalizeMVPProps> = ({
  refinedPRD,
  epicsAndTasks,
  mvpFeatures,
  acceptanceCriteria,
  onComplete
}) => {
  const [finalNotes, setFinalNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalizedPRD = {
      refinedPRD,
      epicsAndTasks,
      mvpFeatures,
      acceptanceCriteria,
      finalNotes
    };
    onComplete(finalizedPRD);
  };

  return (
    <div className="finalize-mvp">
      <h3>Finalize MVP</h3>
      <div className="mb-4">
        <h4>Refined PRD</h4>
        <pre>{refinedPRD}</pre>
      </div>
      <div className="mb-4">
        <h4>MVP Features</h4>
        <ul>
          {mvpFeatures.mvpFeatures.map((feature: any) => (
            <li key={feature.id}>{feature.title}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h4>Acceptance Criteria</h4>
        {acceptanceCriteria.map((feature: any) => (
          <div key={feature.id}>
            <h5>{feature.title}</h5>
            <ul>
              {feature.criteria.map((criterion: string, index: number) => (
                <li key={index}>{criterion}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Add any final notes or considerations..."
          rows={5}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Create GitHub Issue
        </button>
      </form>
    </div>
  );
};

export default FinalizeMVP;