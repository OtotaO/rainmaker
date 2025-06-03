// File: packages/frontend/src/components/Refinement/InitialReview.tsx
import type React from 'react';
import { useState, useEffect } from 'react'; // Added useEffect
import { z } from 'zod';
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils';

// Zod Schema for PRD string
const PRDSchema = z.string().min(1, "PRD content cannot be empty.");

interface InitialReviewProps {
  prd: string;
  onComplete: (updatedPRD: string) => void;
}

const InitialReview: React.FC<InitialReviewProps> = ({ prd: prdProp, onComplete }) => {
  const [editedPRD, setEditedPRD] = useState(prdProp);
  const [error, setError] = useState<string | null>(null);
  const [isValidProp, setIsValidProp] = useState(false);

  useEffect(() => {
    const propValidation = validateSchema(PRDSchema, prdProp);
    if (propValidation.success && propValidation.data) {
      setEditedPRD(propValidation.data); // Initialize with validated prop
      setError(null);
      setIsValidProp(true);
    } else {
      const errorMsg = `Invalid initial PRD content: ${formatValidationErrors(propValidation.errors, propValidation.errorMessages)}`;
      console.error(errorMsg, propValidation);
      setError(errorMsg);
      setEditedPRD(prdProp); // Keep original prop value in textarea for user to see/fix if desired, but mark as invalid
      setIsValidProp(false);
    }
  }, [prdProp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidProp && !PRDSchema.safeParse(editedPRD).success) { // Re-validate if prop was initially invalid
        setError("Initial PRD content was invalid and the edited version is still not valid. Please provide valid PRD content.");
        return;
    }

    const submissionValidation = validateSchema(PRDSchema, editedPRD);
    if (submissionValidation.success && submissionValidation.data) {
      onComplete(submissionValidation.data);
      setError(null);
    } else {
      const errorMsg = `Edited PRD content is invalid: ${formatValidationErrors(submissionValidation.errors, submissionValidation.errorMessages)}`;
      console.error(errorMsg, submissionValidation);
      setError(errorMsg);
    }
  };
  
  if (error && !isValidProp) { // If prop itself is invalid, show error prominently
    return <div className="p-4 text-center text-red-600">Error: {error} <p className="text-sm text-gray-500">Please correct the PRD content in the previous step or edit below.</p></div>;
  }

  return (
    <div className="initial-review p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Initial PRD Review & Edit</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={editedPRD}
          onChange={(e) => {
            setEditedPRD(e.target.value);
            // Optionally clear error on change, or validate on change
            if (PRDSchema.safeParse(e.target.value).success) {
                setError(null);
            }
          }}
          rows={15}
          className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
            error && !PRDSchema.safeParse(editedPRD).success ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter or review the PRD content here..."
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        <button 
          type="submit" 
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Proceed to Epic/Task Breakdown
        </button>
      </form>
    </div>
  );
};

export default InitialReview;
