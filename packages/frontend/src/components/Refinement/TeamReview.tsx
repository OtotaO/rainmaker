// File: packages/frontend/src/components/Refinement/TeamReview.tsx
import type React from 'react';
import { useState } from 'react';

interface TeamReviewProps {
  refinedPRD: string;
  epicsAndTasks: any;
  mvpFeatures: any;
  acceptanceCriteria: any;
  onComplete: () => void;
}

const TeamReview: React.FC<TeamReviewProps> = ({
  refinedPRD,
  epicsAndTasks,
  mvpFeatures,
  acceptanceCriteria,
  onComplete
}) => {
  const [comments, setComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you might want to save these comments
    // or send them to team members for review
    console.log('Team comments:', comments);
    onComplete();
  };

  return (
    <div className="team-review">
      <h3>Team Review</h3>
      <div className="mb-4">
        <h4>Refined PRD</h4>
        <pre>{refinedPRD}</pre>
      </div>
      <div className="mb-4">
        <h4>Epics and Tasks</h4>
        {epicsAndTasks.epics.map((epic: any) => (
          <div key={epic.id}>
            <h5>{epic.title}</h5>
            <ul>
              {epicsAndTasks.tasks
                .filter((task: any) => task.epicId === epic.id)
                .map((task: any) => (
                  <li key={task.id}>{task.title}</li>
                ))}
            </ul>
          </div>
        ))}
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
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add your comments or suggestions here..."
          rows={5}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Finalize MVP
        </button>
      </form>
    </div>
  );
};

export default TeamReview;