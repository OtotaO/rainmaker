// File: packages/frontend/src/components/Refinement/AcceptanceCriteria.tsx

import type React from 'react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import type { MVPFeatures as MVPFeaturesType, Feature as FeatureType } from '../../../../shared/src/types'; // Import types
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils';

// Zod Schemas
const FeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  estimatedEffort: z.string().optional(),
});

const MVPFeaturesSchema = z.object({
  included: z.array(FeatureSchema),
  excluded: z.array(FeatureSchema),
  reasoning: z.string(),
});

const AcceptanceCriteriaApiRequestSchema = z.object({
  featureTitle: z.string(),
});

const AcceptanceCriteriaApiResponseSchema = z.object({
  criteria: z.array(z.string().min(1, "Criterion cannot be empty")),
});

const FeatureWithCriteriaSchema = FeatureSchema.extend({
  criteria: z.array(z.string().min(1)),
});
type FeatureWithCriteria = z.infer<typeof FeatureWithCriteriaSchema>;

interface AcceptanceCriteriaProps {
  mvpFeatures: MVPFeaturesType; // Use imported type
  onComplete: (criteria: FeatureWithCriteria[]) => void;
}

const AcceptanceCriteria: React.FC<AcceptanceCriteriaProps> = ({ mvpFeatures: mvpFeaturesProp, onComplete }) => {
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<FeatureWithCriteria[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validationResult = validateSchema(MVPFeaturesSchema, mvpFeaturesProp);
    if (!validationResult.success || !validationResult.data) {
      const errorMsg = `Invalid mvpFeatures prop: ${formatValidationErrors(validationResult.errors, validationResult.errorMessages)}`;
      console.error(errorMsg, validationResult);
      setError(errorMsg);
      setLoading(false);
      return;
    }
    
    const validMvpFeatures = validationResult.data;

    const fetchAcceptanceCriteriaForAllFeatures = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!validMvpFeatures.included || validMvpFeatures.included.length === 0) {
          setAcceptanceCriteria([]);
          setLoading(false);
          return;
        }

        const criteriaPromises = validMvpFeatures.included.map(async (feature: FeatureType) => {
          const requestBody = { featureTitle: feature.name }; // Assuming API uses name, adjust if it's feature.title
          const requestValidation = validateSchema(AcceptanceCriteriaApiRequestSchema, requestBody);
          if (!requestValidation.success) { // Should not happen with valid FeatureType
            throw new Error(`Internal error: Invalid request body for feature ${feature.name}`);
          }

          const response = await fetch('/api/refinement/acceptance-criteria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch criteria for ${feature.name}: ${response.statusText}`);
          }
          const rawData = await response.json();
          const responseValidation = validateSchema(AcceptanceCriteriaApiResponseSchema, rawData);

          if (!responseValidation.success || !responseValidation.data) {
            throw new Error(`Invalid API response for ${feature.name}: ${formatValidationErrors(responseValidation.errors, responseValidation.errorMessages)}`);
          }
          return { ...feature, criteria: responseValidation.data.criteria };
        });

        const criteriaResults = await Promise.all(criteriaPromises);
        
        // Validate the final structure
        const finalValidation = validateSchema(z.array(FeatureWithCriteriaSchema), criteriaResults);
        if (!finalValidation.success || !finalValidation.data) {
            throw new Error(`Internal error: Final acceptance criteria structure is invalid: ${formatValidationErrors(finalValidation.errors, finalValidation.errorMessages)}`);
        }
        setAcceptanceCriteria(finalValidation.data);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching acceptance criteria.";
        console.error('Error fetching acceptance criteria:', errorMsg, err);
        setError(errorMsg);
      }
      setLoading(false);
    };

    fetchAcceptanceCriteriaForAllFeatures();
  }, [mvpFeaturesProp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptanceCriteria) {
      // Final validation before onComplete, though it should be valid by now
      const finalValidation = validateSchema(z.array(FeatureWithCriteriaSchema), acceptanceCriteria);
      if (finalValidation.success && finalValidation.data) {
        onComplete(finalValidation.data);
      } else {
        setError(`Cannot proceed: Data is invalid. ${formatValidationErrors(finalValidation.errors, finalValidation.errorMessages)}`);
        console.error("Submit validation failed:", formatValidationErrors(finalValidation.errors, finalValidation.errorMessages));
      }
    } else {
      setError("Cannot proceed: Acceptance criteria not loaded or are invalid.");
    }
  };

  if (loading) return <div className="p-4 text-center">Generating acceptance criteria...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;


  return (
    <div className="acceptance-criteria p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Acceptance Criteria</h3>
      {acceptanceCriteria && acceptanceCriteria.length > 0 && (
        <form onSubmit={handleSubmit}>
          {acceptanceCriteria.map((feature: FeatureWithCriteria) => (
            <div key={feature.id} className="mb-6 p-4 border border-gray-200 rounded-md">
              <h4 className="text-lg font-medium text-blue-600 mb-2">{feature.name}</h4>
              {feature.criteria.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {feature.criteria.map((criterion: string, index: number) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No criteria generated for this feature.</p>
              )}
            </div>
          ))}
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Proceed to Team Review
          </button>
        </form>
      )}
      {acceptanceCriteria && acceptanceCriteria.length === 0 && !loading && (
        <p className="text-gray-500">No MVP features provided or no criteria generated.</p>
      )}
    </div>
  );
};

export default AcceptanceCriteria;
