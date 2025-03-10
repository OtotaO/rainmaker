// ./packages/frontend/src/components/ProductHub.tsx
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { Button } from "../@/components/ui/button";
import { ScrollArea } from "../@/components/ui/scroll-area";
import { GitHubLogoIcon, LightningBoltIcon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import { BookOpenIcon, RefreshCwIcon } from 'lucide-react';
import { motion } from "framer-motion";
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import { LearningJournalComponent } from './Refinement/LearningJournalComponent';
import { PRDQuestionFlow } from './Refinement/PRDQuestionFlow';
import type { GitHubIssue, ImprovedLeanPRDSchema, LeanPRDSchema, ProductHighLevelDescriptionSchema } from '../../../shared/src/types';
import { ProductHighLevelDescription } from './ProductHighLevelDescription';

// Define Workflow Constants
const WORKFLOW_GITHUB_ISSUE = 'github_issue';
const WORKFLOW_PRD_QUESTION_FLOW = 'prd_question_flow';
const WORKFLOW_PRD_CREATION_EDITING = 'prd_creation_editing';

const ProductHub: React.FC = () => {
  const [showLearningJournal, setShowLearningJournal] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [finalizedPRD, setFinalizedPRD] = useState<ImprovedLeanPRDSchema | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeProductHighLevelDescription, setActiveProductHighLevelDescription] = useState<ProductHighLevelDescriptionSchema | null>(null);
  // Introduce a Single Workflow State
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/github/issues');
      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          // Ensure the JSON conforms to ImprovedLeanPRDSchema by adding improvements array if not present
          const improvedJson = {
            ...json,
            improvements: json.improvements || []
          };
          
          setFinalizedPRD(improvedJson);
          // Update onClick Handler
          setActiveWorkflow(WORKFLOW_PRD_CREATION_EDITING);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Invalid JSON file. Please try again.');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const renderWorkflowSelection = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveWorkflow(WORKFLOW_GITHUB_ISSUE)}>
          <CardHeader>
          <CardTitle className="flex items-center">
            <GitHubLogoIcon className="mr-2" />
            Start from GitHub Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Select an existing GitHub issue to begin the product development process.</p>
          <Button className="mt-4">Start</Button>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveWorkflow(WORKFLOW_PRD_QUESTION_FLOW)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightningBoltIcon className="mr-2" />
            Quick Feature Definition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Answer 3 key questions to define your product feature rapidly.</p>
          <Button className="mt-4">Start</Button>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveWorkflow(WORKFLOW_PRD_CREATION_EDITING)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileTextIcon className="mr-2" />
            Create/Edit PRD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Jump directly into creating or editing a Product Requirements Document.</p>
          <Button className="mt-4">Start</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">Product CoPilot</h1>
        </header>

        <div className="flex justify-between mb-6">
          <Button onClick={() => setShowLearningJournal(!showLearningJournal)} variant="outline">
            <BookOpenIcon className="mr-2" />
            {showLearningJournal ? 'Hide' : 'Show'} Learning Journal
          </Button>
          <Button onClick={fetchIssues} variant="outline">
            <RefreshCwIcon className="mr-2" />
            Refresh Issues
          </Button>
        </div>

        {/* {showLearningJournal && <LearningJournalComponent onEntryAdded={() => { }} />} */}
        <div className="flex justify-center w-full">
          <div className="w-2/3">
            <ProductHighLevelDescription 
              setActiveProductHighLevelDescription={setActiveProductHighLevelDescription} 
              activeProductHighLevelDescription={activeProductHighLevelDescription}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Conditionally render workflows based on state variables */}
          {activeWorkflow === null && renderWorkflowSelection()}
          {activeWorkflow !== null && (
            <div>
              {/* Render PRDQuestionFlow with onComplete callback */}
              {activeWorkflow === WORKFLOW_PRD_QUESTION_FLOW && activeProductHighLevelDescription && <PRDQuestionFlow activeProductHighLevelDescription={activeProductHighLevelDescription} onComplete={(prd) => {
                setFinalizedPRD(prd)
                setActiveWorkflow(WORKFLOW_PRD_CREATION_EDITING)
              }} />}

              {activeWorkflow === WORKFLOW_GITHUB_ISSUE && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Select a GitHub Issue</h2>
                  <ScrollArea className="h-[60vh]">
                    {issues.map((issue) => (
                      <Card key={issue.id} className="mb-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedIssue(issue)}>
                        <CardHeader>
                          <CardTitle>{issue.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="truncate">{issue.body}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </div>
              )}
              {activeWorkflow === WORKFLOW_PRD_CREATION_EDITING && finalizedPRD && <FinalizedPRDDisplay finalizedPRD={finalizedPRD} onPRDUpdate={setFinalizedPRD} />}
            </div>
          )}
        </motion.div>

        {/* Drag and drop area for JSON files */}
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-full transition-all duration-300 ${isDragging ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="w-6 h-6 text-gray-500" />
          <span className="sr-only">Drag and drop JSON file here</span>
        </div>
      </div>
    </div>
  );
};

export default ProductHub;