// ./packages/frontend/src/components/Refinement/FinalizedPRDDisplay.tsx
import React, { useState, useCallback } from 'react';
import { ScrollArea } from "../../@/components/ui/scroll-area";
import { Button } from "../../@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../@/components/ui/card";
import { ChevronLeft, ChevronRight, FileText, CheckSquare, AlertTriangle, Zap, Calendar, Upload, Cog, Download, ExternalLink } from 'lucide-react';
import { ImprovedLeanPRDSchema, ProjectType } from '../../../../shared/src/types';

interface FinalizedPRDDisplayProps {
  finalizedPRD: ImprovedLeanPRDSchema;
  onPRDUpdate?: (newPRD: ImprovedLeanPRDSchema) => void;
  onEditPRD?: (prdToEdit: ImprovedLeanPRDSchema) => void; // Added new prop for editing
  onCreateGitHubIssue?: () => Promise<void>; // Added missing prop
  projectType?: ProjectType; // Added project type prop
}

const sectionIcons = {
  CoreFeatureDefinition: <FileText className="w-4 h-4" />,
  BusinessObjective: <Zap className="w-4 h-4" />,
  KeyUserStory: <CheckSquare className="w-4 h-4" />,
  UserRequirements: <CheckSquare className="w-4 h-4" />,
  // AcceptanceCriteria: <CheckSquare className="w-4 h-4" />,
  SuccessMetrics: <Zap className="w-4 h-4" />,
  Constraints: <AlertTriangle className="w-4 h-4" />,
  KnownRisks: <AlertTriangle className="w-4 h-4" />,
  // FutureConsiderations: <Calendar className="w-4 h-4" />,
};

export const FinalizedPRDDisplay: React.FC<FinalizedPRDDisplayProps> = ({ finalizedPRD, onPRDUpdate, onEditPRD, projectType = 'CREATE_NEW_APPLICATION' }) => {
  const [tocExpanded, setTocExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState<any>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  const toggleToc = () => setTocExpanded(!tocExpanded);

  const formatSectionName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const renderSection = (sectionId: keyof typeof sectionIcons) => {
    const icon = sectionIcons[sectionId];
    const title = formatSectionName(sectionId);
    // Create a properly converted key
    const key = sectionId.charAt(0).toLowerCase() + sectionId.slice(1);
    // Use type assertion to tell TypeScript that this is a valid key
    const content = (finalizedPRD as Record<string, any>)[key];

    return (
      <Card key={sectionId} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold">
            {icon}
            <span className="ml-2">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(content) ? (
            <ul className="list-disc pl-5">
              {content.map((item, index) => (
                <li key={index}>{item.content}</li>
              ))}
            </ul>
          ) : (
            <p>{content.content}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Last Updated: {new Date().toLocaleString()} {/* Replace with actual timestamp */}
          </p>
        </CardContent>
      </Card>
    );
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
          onPRDUpdate?.(json);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Invalid JSON file. Please try again.');
        }
      };
      reader.readAsText(file);
    }
  }, [onPRDUpdate]);

  const handleCompileSpecification = useCallback(async () => {
    setIsCompiling(true);
    setCompilationError(null);
    setCompilationResult(null);

    try {
      const buildRequest = {
        prd: finalizedPRD,
        projectType: projectType === 'CREATE_NEW_APPLICATION' ? 'NEW_PROJECT' as const : 'EXISTING_REPO_FEATURE' as const,
        targetFramework: 'REACT' as const, // Default to React, could be made configurable
      };

      console.log('🚀 Compiling specification...', buildRequest);

      const response = await fetch('http://localhost:3001/api/build/from-prd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildRequest),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Compilation successful:', result);
        setCompilationResult(result.data);
      } else {
        console.error('❌ Compilation failed:', result);
        setCompilationError(result.error || 'Compilation failed');
      }
    } catch (error) {
      console.error('💥 Compilation error:', error);
      setCompilationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCompiling(false);
    }
  }, [finalizedPRD]);

  // Conditional rendering based on finalizedPRD
  if (!finalizedPRD) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading product details...</p> </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Column - Table of Contents */}
      <div className={`w-1/4 bg-background-secondary p-4 ${tocExpanded ? '' : 'w-16'}`}>
        <Button onClick={toggleToc} variant="ghost" className="mb-4 w-full justify-start">
          {tocExpanded ? <ChevronLeft className="mr-2" /> : <ChevronRight className="mr-2" />}
          {tocExpanded && "Table of Contents"}
        </Button>
        {tocExpanded && (
          <ScrollArea className="h-[calc(100vh-6rem)]">
            {Object.keys(sectionIcons).map((sectionId) => (
              <Button
                key={sectionId}
                variant="ghost"
                className="w-full justify-start mb-2"
                onClick={() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {sectionIcons[sectionId as keyof typeof sectionIcons]}
                <span className="ml-2">{formatSectionName(sectionId)}</span>
              </Button>
            ))}
          </ScrollArea>
        )}
      </div>

      {/* Right Column - Content */}
      <div className="flex-1 p-4 overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold">
                Finalized PRD
                <span className="text-sm font-normal ml-2">
                  Revision: {finalizedPRD.revisionInfo.revisionNumber}
                </span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={() => onEditPRD?.(finalizedPRD)}
                  variant="outline"
                  disabled={isCompiling}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Edit PRD Inputs
                </Button>
                <Button
                  onClick={handleCompileSpecification}
                  disabled={isCompiling}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200"
                >
                  {isCompiling ? (
                    <>
                      <Cog className="mr-2 h-4 w-4 animate-spin" />
                      {projectType === 'CREATE_NEW_APPLICATION' ? 'Generating Application...' : 'Generating Feature...'}
                    </>
                  ) : (
                    <>
                      <Cog className="mr-2 h-4 w-4" />
                      {projectType === 'CREATE_NEW_APPLICATION' ? 'Generate Complete Application' : 'Generate Feature Code'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Compilation Status and Results */}
            {compilationError && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <strong className="font-medium">Compilation Failed:</strong>
                </div>
                <p className="mt-2">{compilationError}</p>
              </div>
            )}

            {compilationResult && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2" />
                    <strong className="font-medium">Compilation Successful!</strong>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(compilationResult, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${finalizedPRD.coreFeatureDefinition.content.toLowerCase().replace(/\s+/g, '-')}-build-result.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Results
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Build ID:</strong> {compilationResult.buildId}
                  </div>
                  <div>
                    <strong>Files Generated:</strong> {compilationResult.generatedFiles?.length || 0}
                  </div>
                  <div>
                    <strong>Components Selected:</strong> {compilationResult.selectedStack?.length || 0}
                  </div>
                  <div>
                    <strong>GitHub Issues:</strong> {compilationResult.createdIssues?.length || 0}
                  </div>
                </div>
                {compilationResult.buildSummary && (
                  <div className="mt-4">
                    <strong>Setup Time:</strong> {compilationResult.buildSummary.estimatedSetupTime}
                  </div>
                )}
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-12rem)]">
              {Object.keys(sectionIcons).map((sectionId) => renderSection(sectionId as keyof typeof sectionIcons))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dev Tools: Drag and Drop Area */}
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg transition-all duration-300 ${isDragging ? 'bg-primary/10 border-2 border-primary' : 'bg-muted'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="sr-only">Drag and drop JSON file here</span>
        </div>
      </div>
    </div>
  );
};

export default FinalizedPRDDisplay;
