// ./packages/frontend/src/components/ProductHub.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
import ThemeToggle from './ThemeToggle';

// Define Workflow Constants
const WORKFLOW_GITHUB_ISSUE = 'github_issue';
const WORKFLOW_PRD_QUESTION_FLOW = 'prd_question_flow';
const WORKFLOW_PRD_CREATION_EDITING = 'prd_creation_editing';

const ProductHub: React.FC = () => {
  console.log('ProductHub component rendering');
  const [showLearningJournal, setShowLearningJournal] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [finalizedPRD, setFinalizedPRD] = useState<ImprovedLeanPRDSchema | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeProductHighLevelDescription, setActiveProductHighLevelDescription] = useState<ProductHighLevelDescriptionSchema | null>(null);
  // Introduce a Single Workflow State
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add debugging effect
  useEffect(() => {
    console.log('Current state:', {
      activeWorkflow,
      activeProductHighLevelDescription,
      finalizedPRD,
      isLoading,
      error
    });
  }, [activeWorkflow, activeProductHighLevelDescription, finalizedPRD, isLoading, error]);

  const fetchIssues = async () => {
    console.log('Fetching GitHub issues...');
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/github/issues');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('GitHub issues fetched:', data);
      setIssues(data);
    } catch (error) {
      console.error('Error fetching issues:', error);
      setError(`Failed to fetch issues: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
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

  const renderWorkflowSelection = () => {
    console.log('Rendering workflow selection');
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden border border-border h-full bg-card/80 backdrop-blur-sm hover:border-primary" 
              onClick={() => {
                console.log('Selected GitHub Issue workflow');
                setActiveWorkflow(WORKFLOW_GITHUB_ISSUE);
                fetchIssues();
              }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-card-foreground">
                  <GitHubLogoIcon className="mr-3 h-5 w-5 text-primary" />
                  Start from GitHub Issue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">Select an existing GitHub issue to begin the product development process.</p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200 w-full">Start</Button>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden border border-border h-full bg-card/80 backdrop-blur-sm hover:border-primary" 
              onClick={() => {
                console.log('Selected PRD Question Flow workflow');
                setActiveWorkflow(WORKFLOW_PRD_QUESTION_FLOW);
              }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-card-foreground">
                  <LightningBoltIcon className="mr-3 h-5 w-5 text-primary" />
                  Quick Feature Definition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">Answer 3 key questions to define your product feature rapidly.</p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200 w-full">Start</Button>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden border border-border h-full bg-card/80 backdrop-blur-sm hover:border-primary" 
              onClick={() => {
                console.log('Selected PRD Creation/Editing workflow');
                setActiveWorkflow(WORKFLOW_PRD_CREATION_EDITING);
              }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-card-foreground">
                  <FileTextIcon className="mr-3 h-5 w-5 text-primary" />
                  Create/Edit PRD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">Jump directly into creating or editing a Product Requirements Document.</p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200 w-full">Start</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] bg-card/50 backdrop-blur-sm rounded-full">
        <ThemeToggle />
      </div>
      <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-primary"
            >
              Product CoPilot
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-muted-foreground mt-2">Accelerate feature development from idea to code</p>
            </motion.div>
          </header>

          <div className="flex justify-between mb-8">
            <Button 
              onClick={() => setShowLearningJournal(!showLearningJournal)} 
              variant="outline"
              className="border-border hover:border-primary bg-background/50 text-primary hover:bg-accent transition-all duration-200"
            >
              <BookOpenIcon className="mr-2 h-4 w-4" />
              {showLearningJournal ? 'Hide' : 'Show'} Learning Journal
            </Button>
            <Button 
              onClick={fetchIssues} 
              variant="outline"
              className="border-border hover:border-primary bg-background/50 text-primary hover:bg-accent transition-all duration-200"
            >
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh Issues
            </Button>
          </div>

          {/* {showLearningJournal && <LearningJournalComponent onEntryAdded={() => { }} />} */}
          <div className="flex justify-center w-full">
            <div className="w-full">
              <ProductHighLevelDescription 
                setActiveProductHighLevelDescription={setActiveProductHighLevelDescription} 
                activeProductHighLevelDescription={activeProductHighLevelDescription}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg shadow-sm mb-6"
            >
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <strong className="font-medium">Error:</strong> <span className="ml-1">{error}</span>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-primary font-medium">Loading...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8"
            >
              {/* Conditionally render workflows based on state variables */}
              {activeWorkflow === null && renderWorkflowSelection()}
              {activeWorkflow !== null && (
                <div className="bg-card text-card-foreground backdrop-blur-sm rounded-lg border border-border shadow-sm p-6">
                  {/* Render PRDQuestionFlow with onComplete callback */}
                  {activeWorkflow === WORKFLOW_PRD_QUESTION_FLOW && activeProductHighLevelDescription && <PRDQuestionFlow activeProductHighLevelDescription={activeProductHighLevelDescription} onComplete={(prd) => {
                    console.log('PRD question flow completed with data:', prd);
                    setFinalizedPRD(prd);
                    setActiveWorkflow(WORKFLOW_PRD_CREATION_EDITING);
                  }} />}

                  {activeWorkflow === WORKFLOW_GITHUB_ISSUE && (
                    <div>
                      <h2 className="text-xl font-bold mb-4 text-primary">Select a GitHub Issue</h2>
                      {issues.length === 0 ? (
                        <div className="text-center py-12 bg-muted rounded-lg border border-border">
                          <p className="text-muted-foreground">No GitHub issues found. Try refreshing.</p>
                          <Button 
                            onClick={fetchIssues}
                            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <RefreshCwIcon className="mr-2 h-4 w-4" />
                            Refresh
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                          <div className="space-y-4">
                            {issues.map((issue, index) => (
                              <motion.div
                                key={issue.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                              >
                                <Card 
                                  className="cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden border border-border hover:border-primary"
                                  onClick={() => setSelectedIssue(issue)}
                                >
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-card-foreground">{issue.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-muted-foreground line-clamp-2">{issue.body}</p>
                                    <div className="flex mt-3 text-xs">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                        #{issue.number}
                                      </span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                  {activeWorkflow === WORKFLOW_PRD_CREATION_EDITING && finalizedPRD && <FinalizedPRDDisplay finalizedPRD={finalizedPRD} onPRDUpdate={setFinalizedPRD} />}
                  {activeWorkflow === WORKFLOW_PRD_CREATION_EDITING && !finalizedPRD && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <FileTextIcon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">No PRD Available</h3>
                      <p className="text-muted-foreground mb-6">No PRD data available. Please create a new PRD or go back and select another option.</p>
                      <Button 
                        onClick={() => setActiveWorkflow(null)} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200"
                      >
                        Go Back
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Drag and drop area for JSON files */}
          <div
            className={`fixed bottom-6 right-6 p-4 rounded-full transition-all duration-300 ${
              isDragging 
                ? 'bg-primary/10 border-2 border-primary scale-110 shadow-lg' 
                : 'bg-card text-card-foreground border border-border shadow-md hover:shadow-lg hover:scale-105'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadIcon className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="sr-only">Drag and drop JSON file here</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductHub;