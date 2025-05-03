// ./packages/frontend/src/components/Refinement/FinalizedPRDDisplay.tsx
import React, { useState, useCallback } from 'react';
import { ScrollArea } from "../../@/components/ui/scroll-area";
import { Button } from "../../@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../@/components/ui/card";
import { ChevronLeft, ChevronRight, FileText, CheckSquare, AlertTriangle, Zap, Calendar, Upload } from 'lucide-react';
import { ImprovedLeanPRDSchema } from '../../../../shared/src/types';

interface FinalizedPRDDisplayProps {
  finalizedPRD: ImprovedLeanPRDSchema;
  onPRDUpdate?: (newPRD: ImprovedLeanPRDSchema) => void;
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

export const FinalizedPRDDisplay: React.FC<FinalizedPRDDisplayProps> = ({ finalizedPRD, onPRDUpdate }) => {
  const [tocExpanded, setTocExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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
            <CardTitle className="text-2xl font-bold">
              Finalized PRD
              <span className="text-sm font-normal ml-2">
                Revision: {finalizedPRD.revisionInfo.revisionNumber}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
