// ./packages/frontend/src/components/ProductHub.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { z } from 'zod'; // Keep z import
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { Button } from "../@/components/ui/button";
import { FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import { BookOpenIcon } from 'lucide-react';
import { motion } from "framer-motion";
import { FinalizedPRDDisplay } from './Refinement/FinalizedPRDDisplay';
import { LearningJournalComponent } from './Refinement/LearningJournalComponent';
import { PRDQuestionFlow } from './Refinement/PRDQuestionFlow';
import type { GitHubIssue, ImprovedLeanPRDSchema as ImprovedLeanPRDType, LeanPRDSchema as LeanPRDType, ProductHighLevelDescriptionSchema as ProductHighLevelDescriptionType, ProjectType, ProjectTypeSelection } from '../../../shared/src/types'; // Use Type suffix for clarity
import { ProductHighLevelDescriptionSchema, ImprovedLeanPRDSchema, LeanPRDSchema } from '../../../shared/src/types'; // Import Zod schemas directly
import { ProductHighLevelDescription } from './ProductHighLevelDescription';
import ThemeToggle from './ThemeToggle';
import { validateSchema, formatValidationErrors } from '../lib/validationUtils'; // Corrected path
import { ErrorDisplay, type AppError } from './common/ErrorDisplay'; // Corrected import path
import { DualPathLanding } from './DualPathLanding';
import { ConnectExistingProject, type ExistingProjectData } from './ConnectExistingProject';

// Define Zod schema for ProjectType if not available from shared types
const ProjectTypeZodSchema = z.enum(['CREATE_NEW_APPLICATION', 'ADD_FEATURE_FOR_EXISTING_PROJECT']);

// Define Workflow States
const WORKFLOW_STATES = {
  DUAL_PATH_LANDING: 'dual_path_landing',
  CONNECT_EXISTING: 'connect_existing',
  PRODUCT_CONTEXT: 'product_context',
  QUICK_DEFINITION: 'quick_definition',
  PRD_REVIEW: 'prd_review',
  GENERATION: 'generation', // Placeholder for future build step
  DOWNLOAD: 'download',     // Placeholder for future download step
} as const;

type WorkflowState = typeof WORKFLOW_STATES[keyof typeof WORKFLOW_STATES];

const ProductHub: React.FC = () => {
  console.log('ProductHub component rendering');
  const [showLearningJournal, setShowLearningJournal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<AppError | null>(null); // Changed error state
  const [existingProjectData, setExistingProjectData] = useState<ExistingProjectData | null>(null);
  
  // Project type selection state - loads from localStorage
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType>(() => {
    const saved = localStorage.getItem('rainmaker_selectedProjectType');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validation = validateSchema(ProjectTypeZodSchema, parsed); // Use the locally defined or imported schema
        if (validation.success && validation.data) {
          return validation.data;
        }
        console.warn('Invalid selectedProjectType in localStorage:', formatValidationErrors(validation.errors, validation.errorMessages));
      } catch (e) {
        console.warn('Error parsing selectedProjectType from localStorage:', e);
      }
    }
    return 'CREATE_NEW_APPLICATION';
  });

  // Workflow state - loads from localStorage
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowState>(() => {
    const saved = localStorage.getItem('rainmaker_activeWorkflow');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Basic validation for workflow state
        if (Object.values(WORKFLOW_STATES).includes(parsed)) {
          return parsed;
        }
        console.warn('Invalid activeWorkflow in localStorage:', parsed);
      } catch (e) {
        console.warn('Error parsing activeWorkflow from localStorage:', e);
      }
    }
    return WORKFLOW_STATES.DUAL_PATH_LANDING;
  });

  // Active Product High Level Description state - loads from localStorage
  const [activeProductHighLevelDescription, setActiveProductHighLevelDescription] = useState<ProductHighLevelDescriptionType | null>(() => {
    const saved = localStorage.getItem('rainmaker_activeProductHighLevelDescription');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validation = validateSchema(ProductHighLevelDescriptionSchema, parsed); // Use imported Zod schema
        if (validation.success && validation.data) {
          return validation.data;
        }
        console.warn('Invalid activeProductHighLevelDescription in localStorage:', formatValidationErrors(validation.errors, validation.errorMessages));
      } catch (e) {
        console.warn('Error parsing activeProductHighLevelDescription from localStorage:', e);
      }
    }
    return null;
  });

  // Finalized PRD state - loads from localStorage
  const [finalizedPRD, setFinalizedPRD] = useState<ImprovedLeanPRDType | null>(() => {
    const saved = localStorage.getItem('rainmaker_finalizedPRD');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validation = validateSchema(ImprovedLeanPRDSchema, parsed); // Use imported Zod schema
        if (validation.success && validation.data) {
          return validation.data;
        }
        console.warn('Invalid finalizedPRD in localStorage:', formatValidationErrors(validation.errors, validation.errorMessages));
      } catch (e) {
        console.warn('Error parsing finalizedPRD from localStorage:', e);
      }
    }
    return null;
  });


  // Save state to localStorage whenever it changes, with validation
  useEffect(() => {
    // Basic validation for workflow state
    if (Object.values(WORKFLOW_STATES).includes(activeWorkflow)) {
      localStorage.setItem('rainmaker_activeWorkflow', JSON.stringify(activeWorkflow));
    } else {
      console.error('Attempted to save invalid activeWorkflow:', activeWorkflow);
    }
  }, [activeWorkflow]);

  useEffect(() => {
    const validation = validateSchema(ProjectTypeZodSchema, selectedProjectType); // Use the locally defined or imported schema
    if (validation.success) {
      localStorage.setItem('rainmaker_selectedProjectType', JSON.stringify(selectedProjectType));
    } else {
      console.error('Attempted to save invalid selectedProjectType:', selectedProjectType, formatValidationErrors(validation.errors, validation.errorMessages));
    }
  }, [selectedProjectType]);

  useEffect(() => {
    if (activeProductHighLevelDescription) {
      const validation = validateSchema(ProductHighLevelDescriptionSchema, activeProductHighLevelDescription); // Use imported Zod schema
      if (validation.success) {
        localStorage.setItem('rainmaker_activeProductHighLevelDescription', JSON.stringify(activeProductHighLevelDescription));
      } else {
        console.error('Attempted to save invalid activeProductHighLevelDescription:', activeProductHighLevelDescription, formatValidationErrors(validation.errors, validation.errorMessages));
      }
    } else {
      localStorage.removeItem('rainmaker_activeProductHighLevelDescription');
    }
  }, [activeProductHighLevelDescription]);

  useEffect(() => {
    if (finalizedPRD) {
      const validation = validateSchema(ImprovedLeanPRDSchema, finalizedPRD); // Use imported Zod schema
      if (validation.success) {
        localStorage.setItem('rainmaker_finalizedPRD', JSON.stringify(finalizedPRD));
      } else {
        console.error('Attempted to save invalid finalizedPRD:', finalizedPRD, formatValidationErrors(validation.errors, validation.errorMessages));
      }
    } else {
      localStorage.removeItem('rainmaker_finalizedPRD');
    }
  }, [finalizedPRD]);

  // Add debugging effect
  useEffect(() => {
    console.log('Current state (from effect):', {
      activeWorkflow, // Consistent naming
      activeProductHighLevelDescription,
      finalizedPRD,
      isLoading,
      appError // Corrected state variable name
    });
  }, [activeWorkflow, activeProductHighLevelDescription, finalizedPRD, isLoading, appError]); // Corrected dependency array

  // fetchIssues function fully removed
  // const fetchIssues = async () => { ... };

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
          const rawJson = JSON.parse(event.target?.result as string);
          const validation = validateSchema(ImprovedLeanPRDSchema, rawJson); // Use imported Zod schema

          if (validation.success && validation.data) {
            setFinalizedPRD(validation.data);
            setActiveWorkflow(WORKFLOW_STATES.PRD_REVIEW);
            setAppError(null);
          } else {
            const errorMsg = `Invalid JSON file format.`;
            const errorDetails = formatValidationErrors(validation.errors, validation.errorMessages);
            console.error(errorMsg, validation);
            setAppError({
              id: `drop-validation-${Date.now()}`,
              title: 'File Format Error',
              message: errorMsg,
              details: errorDetails,
              type: 'validation',
              timestamp: new Date(),
            });
            alert(`${errorMsg}\n\nDetails:\n${errorDetails}`); // Keep alert for immediate feedback
          }
        } catch (e) { // Catch errors from JSON.parse or other unexpected issues
          const errorMsg = `Error processing dropped file: ${e instanceof Error ? e.message : String(e)}`;
          console.error(errorMsg, e);
          setAppError({
            id: `drop-processing-${Date.now()}`,
            title: 'File Processing Error',
            message: 'Could not process the dropped file.',
            details: errorMsg,
            type: 'internal',
            timestamp: new Date(),
          });
          alert('Invalid JSON file. Please ensure it is correctly formatted and try again.');
        }
      };
      reader.readAsText(file);
    }
  }, [setFinalizedPRD, setActiveWorkflow, setAppError]);

  // renderWorkflowSelection removed as its logic is now inline

  const handleNextStep = () => {
    setAppError(null); // Clear previous errors
    switch (activeWorkflow) {
      case WORKFLOW_STATES.PRODUCT_CONTEXT:
        if (activeProductHighLevelDescription && activeProductHighLevelDescription.description.length >= 50) {
          setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION);
        } else {
          setAppError({
            id: `product-desc-len-${Date.now()}`,
            title: 'Input Required',
            message: "Please provide a product description of at least 50 characters to proceed.",
            type: 'user',
            timestamp: new Date(),
          });
        }
        break;
      // QUICK_DEFINITION transitions are handled by PRDQuestionFlow's onComplete
      // PRD_REVIEW transitions are handled by FinalizedPRDDisplay's actions
      default:
        console.warn("Unhandled state transition for next step:", activeWorkflow);
    }
  };
  
  const handlePreviousStep = () => {
    setAppError(null); // Clear previous errors
    switch (activeWorkflow) {
      case WORKFLOW_STATES.CONNECT_EXISTING:
        setActiveWorkflow(WORKFLOW_STATES.DUAL_PATH_LANDING);
        break;
      case WORKFLOW_STATES.PRODUCT_CONTEXT:
        setActiveWorkflow(WORKFLOW_STATES.DUAL_PATH_LANDING);
        break;
      case WORKFLOW_STATES.QUICK_DEFINITION:
        setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT);
        break;
      case WORKFLOW_STATES.PRD_REVIEW:
        // If we came from quick definition, go back there. Otherwise, product context.
        // This logic might need refinement if direct PRD editing is re-introduced.
        if (activeProductHighLevelDescription) { // Check if product context was filled
             setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION);
        } else {
            setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT); // Fallback, or could be PROJECT_TYPE_SELECTION
        }
        break;
      default:
        console.warn("Unhandled state transition for previous step:", activeWorkflow);
    }
  };

  const handleDualPathSelection = (path: 'connect-existing' | 'create-new') => {
    setAppError(null);
    if (path === 'connect-existing') {
      setSelectedProjectType('ADD_FEATURE_FOR_EXISTING_PROJECT');
      setActiveWorkflow(WORKFLOW_STATES.CONNECT_EXISTING);
    } else {
      setSelectedProjectType('CREATE_NEW_APPLICATION');
      setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT);
    }
  };

  const handleExistingProjectComplete = (data: ExistingProjectData) => {
    setExistingProjectData(data);
    
    if (data.skipAnalysis) {
      // Use the 3-question flow
      setActiveProductHighLevelDescription({
        id: `existing-project-${Date.now()}`,
        name: 'Existing Project Enhancement',
        description: data.projectDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION);
    } else {
      // TODO: Implement codebase analysis
      // For now, we'll also go to the 3-question flow
      setActiveProductHighLevelDescription({
        id: `existing-project-${Date.now()}`,
        name: 'Existing Project Enhancement',
        description: data.projectDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION);
    }
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

          <div className="flex justify-start mb-8"> {/* Keep Learning Journal */}
            <Button 
              onClick={() => setShowLearningJournal(!showLearningJournal)} 
              variant="outline"
              className="border-border hover:border-primary bg-background/50 text-primary hover:bg-accent transition-all duration-200"
            >
              <BookOpenIcon className="mr-2 h-4 w-4" />
              {showLearningJournal ? 'Hide' : 'Show'} Learning Journal
            </Button>
            {/* Refresh Issues button removed */}
          </div>

          {showLearningJournal && <LearningJournalComponent onEntryAdded={() => { /* Placeholder */ }} />}

          {appError && (
            <ErrorDisplay 
              error={appError} 
            />
          )}

          {isLoading && (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-primary font-medium">Loading...</p>
            </div>
          )}

          {!isLoading && (
            <motion.div
              key={activeWorkflow} // Add key for AnimatePresence re-render
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              {/* Main content area based on activeWorkflow */}
              
              {activeWorkflow === WORKFLOW_STATES.DUAL_PATH_LANDING && (
                <DualPathLanding onSelectPath={handleDualPathSelection} />
              )}

              {activeWorkflow === WORKFLOW_STATES.CONNECT_EXISTING && (
                <ConnectExistingProject 
                  onComplete={handleExistingProjectComplete}
                  onBack={() => setActiveWorkflow(WORKFLOW_STATES.DUAL_PATH_LANDING)}
                />
              )}

              {activeWorkflow === WORKFLOW_STATES.PRODUCT_CONTEXT && (
                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle>
                      {selectedProjectType === 'CREATE_NEW_APPLICATION' 
                        ? 'Product High-Level Context' 
                        : 'Feature Context for Existing Project'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProductHighLevelDescription 
                      setActiveProductHighLevelDescription={setActiveProductHighLevelDescription} 
                      activeProductHighLevelDescription={activeProductHighLevelDescription}
                    />
                    <div className="mt-6 flex justify-between">
                      <Button onClick={handlePreviousStep} variant="outline">Back</Button>
                      <Button onClick={handleNextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Next: Quick Definition
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeWorkflow === WORKFLOW_STATES.QUICK_DEFINITION && activeProductHighLevelDescription && (
                 <Card className="bg-card/80 backdrop-blur-sm border-border">
                   <CardHeader>
                     <CardTitle>Quick Definition Questions</CardTitle>
                   </CardHeader>
                   <CardContent>
                    <PRDQuestionFlow 
                      activeProductHighLevelDescription={activeProductHighLevelDescription} 
                      onComplete={(prd) => {
                        console.log('PRD question flow completed with data:', prd);
                        setFinalizedPRD(prd);
                        setActiveWorkflow(WORKFLOW_STATES.PRD_REVIEW);
                      }} 
                    />
                    {/* Back button for PRDQuestionFlow might be handled internally or added here */}
                     <Button onClick={handlePreviousStep} variant="outline" className="mt-4">Back to Product Context</Button>
                   </CardContent>
                 </Card>
              )}
              {activeWorkflow === WORKFLOW_STATES.QUICK_DEFINITION && !activeProductHighLevelDescription && (
                <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">Please define product context first.</p>
                    <Button onClick={() => setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT)}>Define Product Context</Button>
                </div>
              )}


              {activeWorkflow === WORKFLOW_STATES.PRD_REVIEW && finalizedPRD && (
                <>
                  <FinalizedPRDDisplay 
                    finalizedPRD={finalizedPRD} 
                    onPRDUpdate={setFinalizedPRD} 
                    projectType={selectedProjectType}
                    onEditPRD={() => {
                      if (activeProductHighLevelDescription) {
                        setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION);
                      } else {
                        // If no context, guide user to define it first before editing via question flow
                        setAppError({
                          id: `edit-prd-no-context-${Date.now()}`,
                          title: 'Context Required',
                          message: "To edit this PRD using the question flow, please define a product/feature context first.",
                          type: 'user',
                          timestamp: new Date(),
                          actions: [{ label: "Define Context", onClick: () => setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT) }]
                        });
                        // setActiveWorkflow(WORKFLOW_STATES.PRODUCT_CONTEXT); // Action button will handle this
                      }
                    }}
                  />
                  <div className="mt-6 text-center">
                    <Button 
                      onClick={() => setActiveWorkflow(WORKFLOW_STATES.GENERATION)} 
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={isLoading} // Disable if any loading process is active
                    >
                      🚀 {selectedProjectType === 'CREATE_NEW_APPLICATION' ? 'Generate Application' : 'Generate Feature Code'}
                    </Button>
                  </div>
                </>
              )}
              {activeWorkflow === WORKFLOW_STATES.PRD_REVIEW && !finalizedPRD && (
                <div className="text-center py-16">
                  <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No PRD Available</h3>
                  <p className="text-muted-foreground mb-6">Please complete the definition steps or upload a PRD.</p>
                  <Button onClick={() => setActiveWorkflow(WORKFLOW_STATES.QUICK_DEFINITION)} className="bg-primary hover:bg-primary/90">
                    Define PRD
                  </Button>
                </div>
              )}
              
              {activeWorkflow === WORKFLOW_STATES.GENERATION && (
                <div className="text-center py-16">
                  <p className="text-xl text-primary">Generating your application... (Placeholder)</p>
                  {/* Progress bar and status updates will go here */}
                </div>
              )}

              {activeWorkflow === WORKFLOW_STATES.DOWNLOAD && (
                <div className="text-center py-16">
                  <p className="text-xl text-green-500">Application Generated! (Placeholder)</p>
                  <Button className="mt-4 bg-green-500 hover:bg-green-600">Download Project</Button>
                </div>
              )}

            </motion.div>
          )}

          {/* Drag and drop area for JSON files - Kept for utility */}
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
