// File: packages/frontend/src/components/Refinement/EpicTaskBreakdown.tsx

import type React from 'react';
import { useState, useEffect } from 'react';

interface EpicTaskBreakdownProps {
  prd: string;
  onComplete: (breakdown: any) => void;
}

const EpicTaskBreakdown: React.FC<EpicTaskBreakdownProps> = ({ prd, onComplete }) => {
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBreakdown = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/refinement/epic-task-breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prd })
        });
        const data = await response.json();
        setBreakdown(data);
      } catch (error) {
        console.error('Error fetching epic/task breakdown:', error);
      }
      setLoading(false);
    };

    fetchBreakdown();
  }, [prd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(breakdown);
  };

  if (loading) return <div>Loading epic/task breakdown...</div>;

  return (
    <div className="epic-task-breakdown">
      <h3>Epic and Task Breakdown</h3>
      {breakdown && (
        <form onSubmit={handleSubmit}>
          {breakdown.epics.map((epic: any) => (
            <div key={epic.id} className="mb-4">
              <h4>{epic.title}</h4>
              <p>{epic.description}</p>
              <ul>
                {breakdown.tasks
                  .filter((task: any) => task.epicId === epic.id)
                  .map((task: any) => (
                    <li key={task.id}>{task.title}</li>
                  ))}
              </ul>
            </div>
          ))}
          <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Proceed to MVP Prioritization
          </button>
        </form>
      )}
    </div>
  );
};

export default EpicTaskBreakdown;