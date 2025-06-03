// File: packages/frontend/src/components/Refinement/EpicTaskBreakdown.tsx

import type React from 'react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils';

// Zod Schemas
const PrdInputSchema = z.string().min(1, "PRD content cannot be empty.");

const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Task title cannot be empty."),
  epicId: z.string(),
  // Add other task fields if necessary, e.g., description, status
});
type Task = z.infer<typeof TaskSchema>;

const EpicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Epic title cannot be empty."),
  description: z.string(),
  // tasks: z.array(TaskSchema) // Alternative: tasks nested under epics
});
type Epic = z.infer<typeof EpicSchema>;

// Schema for the API response structure
const ApiResponseSchema = z.object({
  epics: z.array(EpicSchema),
  tasks: z.array(TaskSchema),
});
type ApiResponseData = z.infer<typeof ApiResponseSchema>;

// Schema for the data structure expected by onComplete (and FinalizeMVP)
const TransformedEpicTaskBreakdownSchema = z.record(z.string(), z.array(z.string().min(1, "Task identifier/title cannot be empty.")));
type TransformedEpicTaskBreakdownData = z.infer<typeof TransformedEpicTaskBreakdownSchema>;


const ApiRequestBodySchema = z.object({
  prd: PrdInputSchema,
});

interface EpicTaskBreakdownProps {
  prd: string;
  onComplete: (breakdown: TransformedEpicTaskBreakdownData) => void; // Updated to expect transformed data
}

const EpicTaskBreakdown: React.FC<EpicTaskBreakdownProps> = ({ prd: prdProp, onComplete }) => {
  const [apiBreakdownData, setApiBreakdownData] = useState<ApiResponseData | null>(null); // Stores raw API response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prdValidation = validateSchema(PrdInputSchema, prdProp);
    if (!prdValidation.success) {
      const errorMsg = `Invalid PRD prop: ${formatValidationErrors(prdValidation.errors, prdValidation.errorMessages)}`;
      console.error(errorMsg, prdValidation);
      setError(errorMsg);
      setLoading(false);
      return;
    }
    const validPrd = prdValidation.data!;

    const fetchBreakdownData = async () => {
      setLoading(true);
      setError(null);
      try {
        const requestBody = { prd: validPrd };
        // Client-side validation of request body (optional, as it's derived from validated prop)
        const requestBodyValidation = validateSchema(ApiRequestBodySchema, requestBody);
        if (!requestBodyValidation.success) {
            throw new Error(`Internal error: Invalid request body for epic task breakdown. ${formatValidationErrors(requestBodyValidation.errors, requestBodyValidation.errorMessages)}`);
        }

        const response = await fetch('/api/refinement/epic-task-breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch epic/task breakdown: ${response.statusText}`);
        }
        const rawData = await response.json();
        const responseValidation = validateSchema(ApiResponseSchema, rawData); // Validate against ApiResponseSchema

        if (!responseValidation.success || !responseValidation.data) {
          throw new Error(`Invalid API response for epic/task breakdown: ${formatValidationErrors(responseValidation.errors, responseValidation.errorMessages)}`);
        }
        setApiBreakdownData(responseValidation.data); // Store API response

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching breakdown.";
        console.error('Error fetching epic/task breakdown:', errorMsg, err);
        setError(errorMsg);
      }
      setLoading(false);
    };

    fetchBreakdownData();
  }, [prdProp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiBreakdownData) {
      // Transform apiBreakdownData to TransformedEpicTaskBreakdownData
      const transformedData: TransformedEpicTaskBreakdownData = {};
      apiBreakdownData.epics.forEach(epic => {
        transformedData[epic.id] = apiBreakdownData.tasks
          .filter(task => task.epicId === epic.id)
          .map(task => task.title); // Assuming we want task titles
      });

      const finalValidation = validateSchema(TransformedEpicTaskBreakdownSchema, transformedData);
      if (finalValidation.success && finalValidation.data) {
        onComplete(finalValidation.data);
      } else {
        setError(`Cannot proceed: Transformed breakdown data is invalid. ${formatValidationErrors(finalValidation.errors, finalValidation.errorMessages)}`);
        console.error("Submit validation failed for transformed breakdown:", formatValidationErrors(finalValidation.errors, finalValidation.errorMessages));
      }
    } else {
       setError("Cannot proceed: Breakdown data not loaded or is invalid.");
    }
  };

  if (loading) return <div className="p-4 text-center">Loading epic/task breakdown...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="epic-task-breakdown p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Epic and Task Breakdown</h3>
      {apiBreakdownData && apiBreakdownData.epics && apiBreakdownData.tasks && (
        <form onSubmit={handleSubmit}>
          {apiBreakdownData.epics.map((epic: Epic) => (
            <div key={epic.id} className="mb-6 p-4 border border-gray-200 rounded-md">
              <h4 className="text-lg font-medium text-purple-600 mb-1">{epic.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{epic.description}</p>
              {apiBreakdownData.tasks.filter((task: Task) => task.epicId === epic.id).length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-gray-600 pl-4">
                  {apiBreakdownData.tasks
                    .filter((task: Task) => task.epicId === epic.id)
                    .map((task: Task) => (
                      <li key={task.id} className="text-sm">{task.title}</li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">No tasks for this epic.</p>
              )}
            </div>
          ))}
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Proceed to MVP Prioritization
          </button>
        </form>
      )}
      {apiBreakdownData && (!apiBreakdownData.epics || !apiBreakdownData.tasks) && !loading && (
         <p className="text-gray-500">Breakdown data is incomplete or missing.</p>
      )}
       {!apiBreakdownData && !loading && !error && (
         <p className="text-gray-500">No breakdown data available.</p>
      )}
    </div>
  );
};

export default EpicTaskBreakdown;
