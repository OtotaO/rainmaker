import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, BookOpenIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from "../@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { Input } from "../@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../@/components/ui/alert";
import { LearningJournalComponent } from './Refinement/LearningJournalComponent';
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import type { PRDGeneratorProps } from './types';
import type { ImprovedLeanPRDSchema } from '../../../shared/src/types';
import type { GitHubIssue } from '../../../shared/src/types'

const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
];

export const PRDGenerator: React.FC<PRDGeneratorProps> = ({ finalizedPRD, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [localFinalizedPRD, setFinalizedPRD] = useState<ImprovedLeanPRDSchema | null>(finalizedPRD);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [showLearningJournal, setShowLearningJournal] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/github/issues');
      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error('Error fetching issues:', error);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    fetchIssues();
  }, []);

  const generatePRD = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/prd-suggestions-to-lean-prd', {
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
      setFinalizedPRD(data);
      onComplete(data);
    } catch (error) {
      console.error('Error generating PRD:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
    setFinalizedPRD(null);
  };

  const handleIssueSelect = (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setCurrentStep(0);
    setResponses({});
    setFinalizedPRD(null);
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
          ) : !selectedIssue && issues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.map((issue: GitHubIssue) => (
                <Card
                  key={issue.id}
                  className={`cursor-pointer transition-all duration-200 ${selectedIssue?.id === issue.id ? 'border-primary shadow-lg' : 'hover:border-border'
                    }`}
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
          ) : !selectedIssue ? (
            <Alert>
              <AlertTitle>No issues found</AlertTitle>
              <AlertDescription>
                There are currently no open issues in the repository. Try refreshing or create a new issue.
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedIssue && !finalizedPRD && (
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

          {finalizedPRD && (
            <FinalizedPRDDisplay
              finalizedPRD={finalizedPRD}
              onCreateGitHubIssue={async () => {
                // Implement GitHub issue creation logic here
                console.log('Creating GitHub issue with PRD:', finalizedPRD);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PRDGenerator;