// File: packages/frontend/src/components/Refinement/AcceptanceCriteria.tsx

import type React from 'react';
import { useState, useEffect } from 'react';

interface AcceptanceCriteriaProps {
  mvpFeatures: any;
  onComplete: (criteria: any) => void;
}

const AcceptanceCriteria: React.FC<AcceptanceCriteriaProps> = ({ mvpFeatures, onComplete }) => {
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAcceptanceCriteria = async () => {
      setLoading(true);
      try {
        const criteriaPromises = mvpFeatures.mvpFeatures.map(async (feature: any) => {
          const response = await fetch('/api/refinement/acceptance-criteria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature: feature.title })
          });
          const data = await response.json();
          return { ...feature, criteria: data.criteria };
        });
        const criteriaResults = await Promise.all(criteriaPromises);
        setAcceptanceCriteria(criteriaResults);
      } catch (error) {
        console.error('Error fetching acceptance criteria:', error);
      }
      setLoading(false);
    };

    fetchAcceptanceCriteria();
  }, [mvpFeatures]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(acceptanceCriteria);
  };

  if (loading) return <div>Generating acceptance criteria...</div>;

  return (
    <div className="acceptance-criteria">
      <h3>Acceptance Criteria</h3>
      {acceptanceCriteria && (
        <form onSubmit={handleSubmit}>
          {acceptanceCriteria.map((feature: any) => (
            <div key={feature.id} className="mb-4">
              <h4>{feature.title}</h4>
              <ul>
                {feature.criteria.map((criterion: string, index: number) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </div>
          ))}
          <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Proceed to Team Review
          </button>
        </form>
      )}
    </div>
  );
};

export default AcceptanceCriteria;