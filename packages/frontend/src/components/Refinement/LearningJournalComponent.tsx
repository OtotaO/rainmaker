import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../@/components/ui/card';
import { Textarea } from '../../@/components/ui/textarea';
import { Button } from '../../@/components/ui/button';
import { BookOpen, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { validateSchema, formatValidationErrors } from '../../lib/validationUtils'; // Import validation utils

// Zod schemas (keeping them local for now as per analysis)
const PlannedAdjustmentSchema = z.object({
  id: z.string(),
  reasoningForAdjustment: z.string(),
  adjustmentDescription: z.string(),
});

const LearningJournalEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userAction: z.string(),
  details: z.string(),
  selfReflectionOnCurrentDetails: z.string(),
  globalSelfReflectionOnEntireJournalSoFar: z.string(),
  plannedAdjustments: z.array(PlannedAdjustmentSchema),
});

const AIAssistanceLevelSchema = z.object({
  level: z.number().int().min(1).max(4),
  explanation: z.string(),
});

const LearningJournalEntryRequestSchema = LearningJournalEntrySchema.omit({
  id: true,
  timestamp: true,
});

// Types
type LearningJournalEntry = z.infer<typeof LearningJournalEntrySchema>;
type AIAssistanceLevel = z.infer<typeof AIAssistanceLevelSchema>;
type LearningJournalEntryRequest = z.infer<typeof LearningJournalEntryRequestSchema>;

interface LearningJournalComponentProps {
  onEntryAdded: () => void;
}

export const LearningJournalComponent: React.FC<LearningJournalComponentProps> = ({ onEntryAdded }) => {
  const [entries, setEntries] = useState<LearningJournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<LearningJournalEntryRequest>>({});
  const [assistanceLevel, setAssistanceLevel] = useState<AIAssistanceLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchAssistanceLevel();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch('http://localhost:3001/api/learning-journal/entries');
      if (!response.ok) {
        throw new Error(`Failed to fetch entries: ${response.statusText}`);
      }
      const rawData = await response.json();
      const validationResult = validateSchema(z.array(LearningJournalEntrySchema), rawData);
      if (validationResult.success && validationResult.data) {
        setEntries(validationResult.data);
      } else {
        const errorMsg = `Error parsing journal entries: ${formatValidationErrors(validationResult.errors, validationResult.errorMessages)}`;
        console.error(errorMsg, validationResult);
        setError(errorMsg);
        setEntries([]); // Clear or handle as appropriate
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching entries.";
      console.error('Error in fetchEntries:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssistanceLevel = async () => {
    setError(null); // Clear previous errors
    try {
      const response = await fetch('http://localhost:3001/api/ai-assistance-level');
      if (!response.ok) {
        throw new Error(`Failed to fetch AI assistance level: ${response.statusText}`);
      }
      const rawData = await response.json();
      const validationResult = validateSchema(AIAssistanceLevelSchema, rawData);
      if (validationResult.success && validationResult.data) {
        setAssistanceLevel(validationResult.data);
      } else {
        const errorMsg = `Error parsing AI assistance level: ${formatValidationErrors(validationResult.errors, validationResult.errorMessages)}`;
        console.error(errorMsg, validationResult);
        setError(errorMsg);
        setAssistanceLevel(null); // Clear or handle
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while fetching AI assistance level.";
      console.error('Error in fetchAssistanceLevel:', errorMsg, err);
      setError(errorMsg);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
    setValidationErrors(prev => ({ ...prev, [e.target.name]: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const validationResult = validateSchema(LearningJournalEntryRequestSchema, newEntry);
    if (!validationResult.success) {
      setValidationErrors(validationResult.errors || {});
      setError(formatValidationErrors(validationResult.errors, validationResult.errorMessages));
      return;
    }

    // Ensure plannedAdjustments is an empty array if not provided, to match schema expectations
    const entryToSend = {
      ...validationResult.data,
      plannedAdjustments: validationResult.data?.plannedAdjustments || [],
    };

    setIsLoading(true); // Set loading state for submission
    try {
      const response = await fetch('http://localhost:3001/api/learning-journal/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        // The backend might return Zod-like errors in errorData.details
        if (errorData.error === 'Invalid entry format' && errorData.details && Array.isArray(errorData.details.errors)) {
            const formattedErrors: Record<string, string[]> = {};
            for (const err of errorData.details.errors as z.ZodIssue[]) {
              const field = err.path.join('.');
              if (!formattedErrors[field]) {
                formattedErrors[field] = [];
              }
              formattedErrors[field].push(err.message);
            }
            setValidationErrors(formattedErrors);
            setError(formatValidationErrors(formattedErrors));
        } else {
          throw new Error(errorData.error || `Failed to add entry: ${response.statusText}`);
        }
      } else {
        // Assuming the backend returns the created entry, which we could validate
        // const createdEntryRaw = await response.json();
        // const createdEntryValidation = validateSchema(LearningJournalEntrySchema, createdEntryRaw);
        // if (createdEntryValidation.success) { ... }
        setNewEntry({});
        onEntryAdded();
        fetchEntries(); // Refresh entries list
        // fetchAssistanceLevel(); // Optionally refresh assistance level if it can change
        setError(null); // Clear previous errors
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred while adding the entry.";
      console.error('Error in handleSubmit:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false); // Clear loading state
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Learning Journal</h1>
        <Button onClick={fetchEntries} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Entries
        </Button>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2" />
                Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading entries...</p>
              ) : entries.length > 0 ? (
                <div className="space-y-4">
                  {entries.map(entry => (
                    <Card key={entry.id}>
                      <CardContent>
                        <p className="font-semibold">{new Date(entry.timestamp).toLocaleString()}</p>
                        <p><strong>User Action:</strong> {entry.userAction}</p>
                        <p><strong>Details:</strong> {entry.details}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>No entries found.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>New Journal Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userAction" className="block text-sm font-medium text-gray-700">User Action:</label>
                  <Textarea
                    id="userAction"
                    name="userAction"
                    value={newEntry.userAction || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                  />
                  {validationErrors.userAction && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.userAction.join(', ')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="details" className="block text-sm font-medium text-gray-700">Details:</label>
                  <Textarea
                    id="details"
                    name="details"
                    value={newEntry.details || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                  />
                  {validationErrors.details && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.details.join(', ')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="selfReflectionOnCurrentDetails" className="block text-sm font-medium text-gray-700">Self Reflection on Current Details:</label>
                  <Textarea
                    id="selfReflectionOnCurrentDetails"
                    name="selfReflectionOnCurrentDetails"
                    value={newEntry.selfReflectionOnCurrentDetails || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                  />
                  {validationErrors.selfReflectionOnCurrentDetails && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.selfReflectionOnCurrentDetails.join(', ')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="globalSelfReflectionOnEntireJournalSoFar" className="block text-sm font-medium text-gray-700">Global Self Reflection on Entire Journal So Far:</label>
                  <Textarea
                    id="globalSelfReflectionOnEntireJournalSoFar"
                    name="globalSelfReflectionOnEntireJournalSoFar"
                    value={newEntry.globalSelfReflectionOnEntireJournalSoFar || ''}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                  />
                  {validationErrors.globalSelfReflectionOnEntireJournalSoFar && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.globalSelfReflectionOnEntireJournalSoFar.join(', ')}</p>
                  )}
                </div>
                <Button type="submit">Add Entry</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>AI Assistance Level</CardTitle>
        </CardHeader>
        <CardContent>
          {assistanceLevel ? (
            <>
              <p><strong>Level:</strong> {assistanceLevel.level}</p>
              <p><strong>Explanation:</strong> {assistanceLevel.explanation}</p>
            </>
          ) : (
            <p>Loading AI Assistance Level...</p>
          )}
        </CardContent>
      </Card>
      {error && (
        <Card className="mt-4 bg-red-100">
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LearningJournalComponent;
