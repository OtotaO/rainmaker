// File: packages/frontend/src/components/Refinement/MVPPrioritization.tsx

import type React from 'react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils';
import type { Feature as FeatureType } from '../../../../shared/src/types'; // Assuming Feature type is here

// Zod Schemas
// Prop schema (input from previous step: EpicTaskBreakdown)
const TaskSchemaForProp = z.object({
  id: z.string(),
  title: z.string(),
  epicId: z.string(),
});
const EpicSchemaForProp = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});
const EpicsAndTasksSchema = z.object({
  epics: z.array(EpicSchemaForProp),
  tasks: z.array(TaskSchemaForProp),
});
type EpicsAndTasksData = z.infer<typeof EpicsAndTasksSchema>;

// API Request Schema
const MvpApiRequestSchema = z.object({
  features: z.array(z.string().min(1, "Feature title cannot be empty.")),
});

// Feature schema (redefined for clarity, ideally imported from a shared location)
// Aligning with shared FeatureType which has non-optional description
const FeatureSchema = z.object({
  id: z.string(),
  name: z.string(), 
  description: z.string(), // Made non-optional to align with FeatureType from shared
  priority: z.enum(['high', 'medium', 'low']).optional(), // Keep optional fields from shared type if present
  estimatedEffort: z.string().optional(), // Keep optional fields from shared type if present
});

// API Response Schema
const MvpApiResponseSchema = z.object({
  mvpFeatures: z.array(FeatureSchema),
  futureFeatures: z.array(FeatureSchema),
  // reasoning: z.string().optional(), // If API provides reasoning
});
type MvpPrioritizationData = z.infer<typeof MvpApiResponseSchema>;


interface MVPPrioritizationProps {
  epicsAndTasks: EpicsAndTasksData; // Use defined type
  onComplete: (prioritized: MvpPrioritizationData) => void;
}

const MVPPrioritization: React.FC<MVPPrioritizationProps> = ({ epicsAndTasks: epicsAndTasksProp, onComplete }) => {
  const [prioritizedFeatures, setPrioritizedFeatures] = useState<MvpPrioritizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const propValidation = validateSchema(EpicsAndTasksSchema, epicsAndTasksProp);
    if (!propValidation.success || !propValidation.data) {
      const errorMsg = `Invalid epicsAndTasks prop: ${formatValidationErrors(propValidation.errors, propValidation.errorMessages)}`;
      console.error(errorMsg, propValidation);
      setError(errorMsg);
      setLoading(false);
      return;
    }
    const validEpicsAndTasks = propValidation.data;

    const fetchPrioritizationData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Assuming we send epic titles as "features" to be prioritized
        const featureTitles = validEpicsAndTasks.epics.map((epic) => epic.title);
        if (featureTitles.length === 0) {
            setPrioritizedFeatures({ mvpFeatures: [], futureFeatures: [] });
            setLoading(false);
            return;
        }

        const requestBody = { features: featureTitles };
        const requestBodyValidation = validateSchema(MvpApiRequestSchema, requestBody);
        if (!requestBodyValidation.success) {
            throw new Error(`Internal error: Invalid request body for MVP prioritization. ${formatValidationErrors(requestBodyValidation.errors, requestBodyValidation.errorMessages)}`);
        }

        const response = await fetch('/api/refinement/mvp-prioritization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch MVP prioritization: ${response.statusText}`);
        }
        const rawData = await response.json();
        const responseValidation = validateSchema(MvpApiResponseSchema, rawData);

        if (!responseValidation.success || !responseValidation.data) {
          throw new Error(`Invalid API response for MVP prioritization: ${formatValidationErrors(responseValidation.errors, responseValidation.errorMessages)}`);
        }
        setPrioritizedFeatures(responseValidation.data);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching MVP prioritization.";
        console.error('Error fetching MVP prioritization:', errorMsg, err);
        setError(errorMsg);
      }
      setLoading(false);
    };

    fetchPrioritizationData();
  }, [epicsAndTasksProp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prioritizedFeatures) {
      const finalValidation = validateSchema(MvpApiResponseSchema, prioritizedFeatures);
      if (finalValidation.success && finalValidation.data) {
        onComplete(finalValidation.data);
      } else {
         setError(`Cannot proceed: Prioritized features data is invalid. ${formatValidationErrors(finalValidation.errors, finalValidation.errorMessages)}`);
         console.error("Submit validation failed for prioritized features:", formatValidationErrors(finalValidation.errors, finalValidation.errorMessages));
      }
    } else {
      setError("Cannot proceed: Prioritized features not loaded or are invalid.");
    }
  };

  if (loading) return <div className="p-4 text-center">Prioritizing MVP features...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="mvp-prioritization p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">MVP Feature Prioritization</h3>
      {prioritizedFeatures && (
        <form onSubmit={handleSubmit}>
          <div className="mb-6 p-4 border border-green-200 rounded-md bg-green-50">
            <h4 className="text-lg font-medium text-green-700 mb-2">MVP Features</h4>
            {prioritizedFeatures.mvpFeatures.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-green-600">
                {prioritizedFeatures.mvpFeatures.map((feature) => ( // Type will be inferred correctly by TS now
                  <li key={feature.id}>{feature.name}</li> 
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No features prioritized for MVP.</p>
            )}
          </div>
          <div className="mb-6 p-4 border border-yellow-200 rounded-md bg-yellow-50">
            <h4 className="text-lg font-medium text-yellow-700 mb-2">Future Features</h4>
            {prioritizedFeatures.futureFeatures.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-yellow-600">
              {prioritizedFeatures.futureFeatures.map((feature) => ( // Type will be inferred correctly by TS now
                <li key={feature.id}>{feature.name}</li>
              ))}
            </ul>
            ) : (
              <p className="text-sm text-gray-500">No features marked for future consideration.</p>
            )}
          </div>
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Proceed to Acceptance Criteria
          </button>
        </form>
      )}
       {!prioritizedFeatures && !loading && !error && (
         <p className="text-gray-500">No prioritization data available.</p>
      )}
    </div>
  );
};

export default MVPPrioritization;
