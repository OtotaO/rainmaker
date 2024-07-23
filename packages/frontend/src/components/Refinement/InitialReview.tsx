// File: packages/frontend/src/components/Refinement/InitialReview.tsx
import type React from 'react'
import { useState } from 'react';

interface InitialReviewProps {
  prd: string;
  onComplete: (updatedPRD: string) => void;
}

const InitialReview: React.FC<InitialReviewProps> = ({ prd, onComplete }) => {
  const [editedPRD, setEditedPRD] = useState(prd);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(editedPRD);
  };

  return (
    <div className="initial-review">
      <h3>Initial PRD Review</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={editedPRD}
          onChange={(e) => setEditedPRD(e.target.value)}
          rows={10}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Proceed to Epic/Task Breakdown
        </button>
      </form>
    </div>
  );
};

export default InitialReview;