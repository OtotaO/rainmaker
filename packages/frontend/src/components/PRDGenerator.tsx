import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, BookOpenIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from "../@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { Input } from "../@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../@/components/ui/alert";
import { LearningJournalComponent } from './Refinement/LearningJournalComponent';
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import type { PRDGeneratorProps as OriginalPRDGeneratorProps } from './types';
import type { ImprovedLeanPRDSchema, GitHubIssue } from '../../../shared/src/types';

// Extend original props to include initialPRDData
interface PRDGeneratorProps extends OriginalPRDGeneratorProps {
  initialPRDData?: ImprovedLeanPRDSchema | null;
}

const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
];

export const PRDGenerator: React.FC<PRDGeneratorProps> = (props) => {
  const { finalizedPRD: initialFinalizedPRDFromProps, onComplete, initialPRDData } = props;
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [localFinalizedPRD, setLocalFinalizedPRD] = useState<ImprovedLeanPRDSchema | null>(initialFinalizedPRDFromProps || null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [showLearningJournal, setShowLearningJournal] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);

  useEffect(() => {
    if (initialPRDData) {
      const initialResponses: Record<string, string> = {};
      initialResponses[PRD_QUESTIONS[0].id] = initialPRDData.coreFeatureDefinition?.content || '';
      initialResponses[PRD_QUESTIONS[1].id] = initialPRDData.successMetrics?.[0]?.content || '';
      initialResponses[PRD_QUESTIONS[2].id] = initialPRDData.knownRisks?.[0]?.content || '';
      
      setResponses(initialResponses);
      setCurrentStep(0);
      setLocalFinalizedPRD(null); // Clear any existing finalized PRD to show the form
      // Set a placeholder selectedIssue to bypass issue selection and indicate editing mode
      setSelectedIssue({ 
        id: -1, 
        number: -1,
        title: `Editing Inputs for: ${initialPRDData.coreFeatureDefinition?.content.substring(0,30) || 'PRD'}...`, 
        body: 'Currently editing the inputs for an existing PRD.',
        labels: [], 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Ensure placeholder matches GitHubIssue structure if more fields are mandatory
        // For example, if 'user' and 'state' were part of GitHubIssue in shared/src/types:
        // user: { login: 'system' }, 
        // state: 'open',
      });
      // Do not fetch issues from GitHub when in edit mode initiated by initialPRDData
    } else {
      // Only fetch issues if not in edit mode (i.e., initialPRDData is not provided)
      // and no issue is already selected (e.g. from a previous state if component re-renders)
      if (!selectedIssue) {
        fetchIssues();
      }
    }
  // Adding selectedIssue to dependency array to prevent re-fetching if an issue is already selected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPRDData, selectedIssue]); // Removed fetchIssues from here, it's called conditionally

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/github/issues');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Handle different possible response formats
      if (responseData && Array.isArray(responseData.issues)) {
        setIssues(responseData.issues as GitHubIssue[]);
      } else if (Array.isArray(responseData)) { 
        setIssues(responseData as GitHubIssue[]);
      } else {
        console.error('Fetched issues data is not in expected format:', responseData);
        setIssues([]);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('userInput') as string;

    setResponses({ ...responses, [PRD_QUESTIONS[currentStep].id]: userInput });

    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await generatePRD();
    }
  };

  const generatePRD = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/prd/generateFromSuggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          improvedDescription: responses['1_SPEC'],
          successMetric: responses['2_SUCCESS_METRIC'],
          criticalRisk: responses['3_GOTCHAS'],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ImprovedLeanPRDSchema = await response.json();
      setLocalFinalizedPRD(data);
      if(onComplete) { // Check if onComplete is provided before calling
        onComplete(data);
      }
    } catch (error) {
      console.error('Error generating PRD:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
    setLocalFinalizedPRD(null);
  };

  const handleIssueSelect = (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setCurrentStep(0);
    setResponses({});
    setLocalFinalizedPRD(null);
  };

  const toggleLearningJournal = () => {
    setShowLearningJournal(!showLearningJournal);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center relative mb-8">
            <span className="text-primary">
              Product CoPilot
            </span>
            <SparklesIcon className="absolute -top-6 -left-6 w-8 h-8 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-6">
            <Button onClick={toggleLearningJournal} variant="outline">
              <BookOpenIcon className="mr-2 h-4 w-4" />
              {showLearningJournal ? 'Hide' : 'Show'} Learning Journal
            </Button>
            <Button onClick={fetchIssues} variant="outline" disabled={isLoading}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh Issues
            </Button>
          </div>

          {showLearningJournal && (
            <LearningJournalComponent onEntryAdded={() => {/* Handle new entry added */ }} />
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCwIcon className="h-8 w-8 text-primary" />
              </motion.div>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          ) : null}

          {!selectedIssue && issues.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.map((issue: GitHubIssue) => (
                <Card
                  key={issue.id}
                  className="cursor-pointer transition-all duration-200 hover:border-border"
                  onClick={() => handleIssueSelect(issue)}
                >
                  <CardHeader>
                    <CardTitle>{issue.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground truncate">{issue.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!selectedIssue && issues.length === 0 && !isLoading && (
            <Alert>
              <AlertTitle>No issues found</AlertTitle>
              <AlertDescription>
                There are currently no open issues in the repository. Try refreshing or create a new issue.
              </AlertDescription>
            </Alert>
          )}

          {selectedIssue && !localFinalizedPRD && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold mb-4">{PRD_QUESTIONS[currentStep].text}</h2>
              <Input
                type="text"
                name="userInput"
                placeholder="Enter your response"
                value={responses[PRD_QUESTIONS[currentStep].id] || ''}
                onChange={(e) => setResponses({ ...responses, [PRD_QUESTIONS[currentStep].id]: e.target.value })}
                required
              />
              <div className="mt-4 flex justify-between">
                <Button type="button" onClick={() => handleEdit(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
                  Previous
                </Button>
                <Button type="submit">
                  {currentStep < PRD_QUESTIONS.length - 1 ? 'Next' : 'Generate PRD'}
                </Button>
              </div>
            </form>
          )}

          {localFinalizedPRD && ( // Changed from finalizedPRD to localFinalizedPRD
            <FinalizedPRDDisplay
              finalizedPRD={localFinalizedPRD} // Changed from finalizedPRD
              // Assuming onEditPRD would be passed from a parent component managing these views
              // onEditPRD={(prdToEdit) => { /* logic to switch view and pass prdToEdit */ }}
              onCreateGitHubIssue={async () => {
                // Implement GitHub issue creation logic here
                console.log('Creating GitHub issue with PRD:', localFinalizedPRD);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PRDGenerator;
