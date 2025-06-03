import type React from 'react';
import { useState, useEffect } from 'react'; // Added useEffect
import { z } from 'zod';
import type { 
  AcceptanceCriterion as AcceptanceCriterionType, 
  EpicAndTasks as EpicAndTasksType, 
  Feature as FeatureType, 
  FinalizedPRD as FinalizedPRDType, 
  MVPFeatures as MVPFeaturesType 
} from '../../../../shared/src/types';
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils';

// Zod Schemas (redefined or imported - ideally from shared location)
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

const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  content: z.string().min(1, "Acceptance criterion content cannot be empty."),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

// const TaskSchemaForProp = z.object({ id: z.string(), title: z.string(), epicId: z.string() }); // Not used directly in this schema
// const EpicSchemaForProp = z.object({ id: z.string(), title: z.string(), description: z.string() }); // Not used directly in this schema

// EpicsAndTasksSchema should match the EpicAndTasksType index signature: Record<string, string[]>
// This assumes that the tasks are represented by an array of strings (e.g., task IDs or titles) under each epic ID.
const EpicsAndTasksSchema = z.record(z.string(), z.array(z.string().min(1, "Task identifier cannot be empty.")));


const FinalizedPRDSchema = z.object({
  refinedPRD: z.string().min(1, "Refined PRD content cannot be empty."),
  epicsAndTasks: EpicsAndTasksSchema,
  mvpFeatures: MVPFeaturesSchema,
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  finalNotes: z.string(), // Allow empty string for optional notes
});

interface FinalizeMVPProps {
  refinedPRD: string;
  epicsAndTasks: EpicAndTasksType;
  mvpFeatures: MVPFeaturesType;
  acceptanceCriteria: AcceptanceCriterionType[];
  onComplete: (finalizedPRD: FinalizedPRDType) => void;
}

const FinalizeMVP: React.FC<FinalizeMVPProps> = ({
  refinedPRD: refinedPRDProp,
  epicsAndTasks: epicsAndTasksProp,
  mvpFeatures: mvpFeaturesProp,
  acceptanceCriteria: acceptanceCriteriaProp,
  onComplete
}) => {
  const [finalNotes, setFinalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidProps, setIsValidProps] = useState(false);

  // Validate props once on mount or when they change
  useEffect(() => {
    const refinedPRDValidation = validateSchema(z.string().min(1), refinedPRDProp);
    const epicsAndTasksValidation = validateSchema(EpicsAndTasksSchema, epicsAndTasksProp);
    const mvpFeaturesValidation = validateSchema(MVPFeaturesSchema, mvpFeaturesProp);
    const acceptanceCriteriaValidation = validateSchema(z.array(AcceptanceCriterionSchema), acceptanceCriteriaProp);

    if (!refinedPRDValidation.success) {
      setError(`Invalid refinedPRD prop: ${formatValidationErrors(refinedPRDValidation.errors, refinedPRDValidation.errorMessages)}`);
      setIsValidProps(false); return;
    }
    if (!epicsAndTasksValidation.success) {
      setError(`Invalid epicsAndTasks prop: ${formatValidationErrors(epicsAndTasksValidation.errors, epicsAndTasksValidation.errorMessages)}`);
      setIsValidProps(false); return;
    }
    if (!mvpFeaturesValidation.success) {
      setError(`Invalid mvpFeatures prop: ${formatValidationErrors(mvpFeaturesValidation.errors, mvpFeaturesValidation.errorMessages)}`);
      setIsValidProps(false); return;
    }
    if (!acceptanceCriteriaValidation.success) {
      setError(`Invalid acceptanceCriteria prop: ${formatValidationErrors(acceptanceCriteriaValidation.errors, acceptanceCriteriaValidation.errorMessages)}`);
      setIsValidProps(false); return;
    }
    setError(null);
    setIsValidProps(true);
  }, [refinedPRDProp, epicsAndTasksProp, mvpFeaturesProp, acceptanceCriteriaProp]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidProps) {
        setError("Cannot submit: Input data is invalid. Please check previous steps.");
        return;
    }

    const finalNotesValidation = validateSchema(z.string(), finalNotes); // finalNotes can be empty
    if(!finalNotesValidation.success) {
        setError(`Invalid final notes: ${formatValidationErrors(finalNotesValidation.errors, finalNotesValidation.errorMessages)}`);
        return;
    }

    const finalizedPRDData = {
      refinedPRD: refinedPRDProp,
      epicsAndTasks: epicsAndTasksProp,
      mvpFeatures: mvpFeaturesProp,
      acceptanceCriteria: acceptanceCriteriaProp,
      finalNotes: finalNotesValidation.data!, // data is guaranteed if success is true
    };

    const finalValidation = validateSchema(FinalizedPRDSchema, finalizedPRDData);
    if (finalValidation.success && finalValidation.data) {
      onComplete(finalValidation.data);
    } else {
      const errorMsg = `Failed to finalize PRD: ${formatValidationErrors(finalValidation.errors, finalValidation.errorMessages)}`;
      console.error(errorMsg, finalValidation);
      setError(errorMsg);
    }
  };
  
  if (error && !isValidProps) { // Show only critical prop errors prominently
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="finalize-mvp p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Finalize MVP</h3>
      
      {/* Display sections - consider making these collapsible or summarized for brevity */}
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <h4 className="text-md font-medium text-gray-600">Refined PRD</h4>
        <pre className="text-xs whitespace-pre-wrap bg-white p-2 rounded border max-h-40 overflow-auto">{refinedPRDProp}</pre>
      </div>
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <h4 className="text-md font-medium text-gray-600">MVP Features</h4>
        {mvpFeaturesProp.included.length > 0 ? (
          <ul className="list-disc list-inside text-xs pl-4">
            {mvpFeaturesProp.included.map((feature: FeatureType) => (
              <li key={feature.id}>{feature.name}</li>
            ))}
          </ul>
        ) : <p className="text-xs text-gray-500">No MVP features included.</p>}
      </div>
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <h4 className="text-md font-medium text-gray-600">Acceptance Criteria</h4>
        {acceptanceCriteriaProp.length > 0 ? (
          acceptanceCriteriaProp.map((ac: AcceptanceCriterionType) => (
            <div key={ac.id} className="text-xs mb-1">
              <p>- {ac.content}</p>
            </div>
          ))
        ) : <p className="text-xs text-gray-500">No acceptance criteria defined.</p>}
      </div>
      
      <form onSubmit={handleSubmit}>
        <label htmlFor="finalNotes" className="block text-sm font-medium text-gray-700 mb-1">Final Notes</label>
        <textarea
          id="finalNotes"
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Add any final notes or considerations for the development team..."
          rows={5}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        {error && isValidProps && <p className="text-sm text-red-600 mt-1">{error}</p>} {/* Show submit-specific errors */}
        <button 
          type="submit" 
          disabled={!isValidProps}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Create GitHub Issue (Finalize)
        </button>
      </form>
    </div>
  );
};

export default FinalizeMVP;
