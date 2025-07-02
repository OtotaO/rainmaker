// File: packages/frontend/src/components/Refinement/MVPPrioritization.tsx

import type React from 'react';
import { useState, useEffect } from 'react';

interface Epic {
  id: string;
  title: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  epicId: string;
}

interface EpicsAndTasks {
  epics: Epic[];
  tasks: Task[];
}

interface Feature {
  id: string;
  title: string;
  description?: string;
}

interface PrioritizedFeatures {
  mvpFeatures: Feature[];
  futureFeatures: Feature[];
}

interface MVPPrioritizationProps {
  epicsAndTasks: EpicsAndTasks;
  onComplete: (prioritized: PrioritizedFeatures) => void;
}

const MVPPrioritization: React.FC<MVPPrioritizationProps> = ({ epicsAndTasks, onComplete }) => {
  const [prioritizedFeatures, setPrioritizedFeatures] = useState<PrioritizedFeatures | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPrioritization = async () => {
      setLoading(true);
      try {
        const features = epicsAndTasks.epics.map((epic: Epic) => epic.title);
        const response = await fetch('/api/refinement/mvp-prioritization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features })
        });
        const data = await response.json() as PrioritizedFeatures;
        setPrioritizedFeatures(data);
      } catch (error) {
        console.error('Error fetching MVP prioritization:', error);
      }
      setLoading(false);
    };

    fetchPrioritization();
  }, [epicsAndTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prioritizedFeatures) {
      onComplete(prioritizedFeatures);
    }
  };

  if (loading) return <div>Prioritizing MVP features...</div>;

  return (
    <div className="mvp-prioritization">
      <h3>MVP Feature Prioritization</h3>
      {prioritizedFeatures && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <h4>MVP Features</h4>
            <ul>
              {prioritizedFeatures.mvpFeatures.map((feature: Feature) => (
                <li key={feature.id}>{feature.title}</li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <h4>Future Features</h4>
            <ul>
              {prioritizedFeatures.futureFeatures.map((feature: Feature) => (
                <li key={feature.id}>{feature.title}</li>
              ))}
            </ul>
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Proceed to Acceptance Criteria
          </button>
        </form>
      )}
    </div>
  );
};

export default MVPPrioritization;
