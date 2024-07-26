// START: [04-LRNAI-FE-2.1, 04-LRNAI-FE-2.2]
import type React from 'react';
import { useState, useEffect } from 'react';
import { z } from 'zod';

export const PlannedAdjustmentSchema = z.object({
  id: z.string(),
  reasoningForAdjustment: z.string(),
  adjustmentDescription: z.string(),
});


export const LearningJournalEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userAction: z.string(),
  details: z.string(),
  selfReflectionOnCurrentDetails: z.string(),
  globalSelfReflectionOnEntireJournalSoFar: z.string(),
  plannedAdjustments: z.array(PlannedAdjustmentSchema),
});

export const AIAssistanceLevelSchema = z.object({
  level: z.number().int().min(1).max(4),
  explanation: z.string(),
});

export const LearningJournalEntryRequestSchema = LearningJournalEntrySchema.omit({
  id: true,
  timestamp: true,
});

export const LearningJournalEntriesResponseSchema = z.array(LearningJournalEntrySchema);

export const AIAssistanceLevelResponseSchema = AIAssistanceLevelSchema;

export type LearningJournalEntry = z.infer<typeof LearningJournalEntrySchema>;
export type AIAssistanceLevel = z.infer<typeof AIAssistanceLevelSchema>;
export type LearningJournalEntryRequest = z.infer<typeof LearningJournalEntryRequestSchema>;
export type LearningJournalEntriesResponse = z.infer<typeof LearningJournalEntriesResponseSchema>;
export type AIAssistanceLevelResponse = z.infer<typeof AIAssistanceLevelResponseSchema>;
// END: [04-LRNAI-SH-3.1] [double check: This implementation defines Zod schemas for all required types and exports both the schemas and inferred types. It provides strong typing and validation for our learning journal and AI assistance level data structures.]


interface LearningJournalComponentProps {
  onEntryAdded: () => void;
}

export const LearningJournalComponent: React.FC<LearningJournalComponentProps> = ({ onEntryAdded }) => {
  const [entries, setEntries] = useState<LearningJournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<LearningJournalEntry>>({});
  const [assistanceLevel, setAssistanceLevel] = useState<AIAssistanceLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchEntries();
    fetchAssistanceLevel();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/learning-journal/entries');
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      setError('Failed to load journal entries. Please try again later.');
    }
  };

  const fetchAssistanceLevel = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ai-assistance-level');
      if (!response.ok) throw new Error('Failed to fetch AI assistance level');
      const data = await response.json();
      setAssistanceLevel(data);
    } catch (error) {
      setError('Failed to load AI assistance level. Please try again later.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
    // Clear validation error for this field when user starts typing
    setValidationErrors(prev => ({ ...prev, [e.target.name]: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    try {
      // Validate the new entry using Zod schema
      LearningJournalEntryRequestSchema.parse(newEntry);

      const response = await fetch('http://localhost:3001/api/learning-journal/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Invalid entry format' && errorData.details) {
          // Handle Zod validation errors from the server
          const zodErrors: z.ZodError = errorData.details;
          const formattedErrors: Record<string, string[]> = {};
          for (const err of zodErrors.errors) {
            const field = err.path.join('.');
            if (!formattedErrors[field]) {
              formattedErrors[field] = [];
            }
            formattedErrors[field].push(err.message);
          }
          setValidationErrors(formattedErrors);
        } else {
          throw new Error(errorData.error || 'Failed to add entry');
        }
      } else {
        setNewEntry({});
        onEntryAdded();
        fetchEntries();
        fetchAssistanceLevel();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle client-side Zod validation errors
        const formattedErrors: Record<string, string[]> = {};
        for (const err of error.errors) {
          const field = err.path.join('.');
          if (!formattedErrors[field]) {
            formattedErrors[field] = [];
          }
          formattedErrors[field].push(err.message);
        }
        setValidationErrors(formattedErrors);
      } else {
        setError('Failed to add journal entry. Please try again.');
      }
    }
  };

  return (
    <div className="learning-journal">
      <h2>Learning Journal</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="userAction">User Action:</label>
          <input
            id="userAction"
            type="text"
            name="userAction"
            value={newEntry.userAction || ''}
            onChange={handleInputChange}
            required
          />
          {validationErrors.userAction && (
            <div className="validation-error">{validationErrors.userAction.join(', ')}</div>
          )}
        </div>
        <div>
          <label htmlFor="details">Details:</label>
          <textarea
            id="details"
            name="details"
            value={newEntry.details || ''}
            onChange={handleInputChange}
            required
          />
          {validationErrors.details && (
            <div className="validation-error">{validationErrors.details.join(', ')}</div>
          )}
        </div>
        <div>
          <label htmlFor="selfReflectionOnCurrentDetails">Self Reflection on Current Details:</label>
          <textarea
            id="selfReflectionOnCurrentDetails"
            name="selfReflectionOnCurrentDetails"
            value={newEntry.selfReflectionOnCurrentDetails || ''}
            onChange={handleInputChange}
            required
          />
          {validationErrors.selfReflectionOnCurrentDetails && (
            <div className="validation-error">{validationErrors.selfReflectionOnCurrentDetails.join(', ')}</div>
          )}
        </div>
        <div>
          <label htmlFor="globalSelfReflectionOnEntireJournalSoFar">Global Self Reflection on Entire Journal So Far:</label>
          <textarea
            id="globalSelfReflectionOnEntireJournalSoFar"
            name="globalSelfReflectionOnEntireJournalSoFar"
            value={newEntry.globalSelfReflectionOnEntireJournalSoFar || ''}
            onChange={handleInputChange}
            required
          />
          {validationErrors.globalSelfReflectionOnEntireJournalSoFar && (
            <div className="validation-error">{validationErrors.globalSelfReflectionOnEntireJournalSoFar.join(', ')}</div>
          )}
        </div>
        <button type="submit">Add Entry</button>
      </form>
      <div className="entries">
        <h3>Recent Entries</h3>
        {entries.map(entry => (
          <div key={entry.id} className="entry">
            <p><strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString()}</p>
            <p><strong>User Action:</strong> {entry.userAction}</p>
            <p><strong>Details:</strong> {entry.details}</p>
          </div>
        ))}
      </div>
      <AIAssistanceLevelIndicator assistanceLevel={assistanceLevel} />
    </div>
  );
};

interface AIAssistanceLevelIndicatorProps {
  assistanceLevel: AIAssistanceLevel | null;
}

export const AIAssistanceLevelIndicator: React.FC<AIAssistanceLevelIndicatorProps> = ({ assistanceLevel }) => {
  if (!assistanceLevel) return null;

  return (
    <div className="ai-assistance-level">
      <h3>AI Assistance Level</h3>
      <p><strong>Level:</strong> {assistanceLevel.level}</p>
      <p><strong>Explanation:</strong> {assistanceLevel.explanation}</p>
    </div>
  );
};
// END: [04-LRNAI-FE-2.1, 04-LRNAI-FE-2.2] [double check: This implementation updates the frontend components to handle Zod validation errors from both client-side and server-side validation. It provides specific error messages for each field, improving the user experience. The code is complete and aligns with the project's requirements, now including proper handling of Zod validation errors.]