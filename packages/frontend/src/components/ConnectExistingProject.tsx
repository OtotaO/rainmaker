import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { Button } from "../@/components/ui/button";
import { Input } from "../@/components/ui/input";
import { Textarea } from "../@/components/ui/textarea";
import { Checkbox } from "../@/components/ui/checkbox";
import { Label } from "../@/components/ui/label";
import { GitHubLogoIcon, UploadIcon, FileTextIcon } from "@radix-ui/react-icons";
import { Alert, AlertDescription } from "../@/components/ui/alert";

interface ConnectExistingProjectProps {
  onComplete: (data: ExistingProjectData) => void;
  onBack: () => void;
}

export interface ExistingProjectData {
  connectionType: 'github' | 'upload' | 'manual';
  githubUrl?: string;
  uploadedFiles?: File[];
  projectDescription: string;
  skipAnalysis: boolean;
}

export const ConnectExistingProject: React.FC<ConnectExistingProjectProps> = ({ onComplete, onBack }) => {
  const [connectionType, setConnectionType] = useState<'github' | 'upload' | 'manual'>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [projectDescription, setProjectDescription] = useState('');
  const [skipAnalysis, setSkipAnalysis] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(files);
    setConnectionType('upload');
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(files);
    }
  };

  const handleSubmit = () => {
    setError(null);

    // Validation
    if (!skipAnalysis) {
      if (connectionType === 'github' && !githubUrl.trim()) {
        setError('Please provide a GitHub repository URL');
        return;
      }
      if (connectionType === 'upload' && uploadedFiles.length === 0) {
        setError('Please upload your project files');
        return;
      }
    }

    if (projectDescription.trim().length < 50) {
      setError('Please provide a more detailed description (at least 50 characters)');
      return;
    }

    onComplete({
      connectionType: skipAnalysis ? 'manual' : connectionType,
      githubUrl: connectionType === 'github' ? githubUrl : undefined,
      uploadedFiles: connectionType === 'upload' ? uploadedFiles : undefined,
      projectDescription,
      skipAnalysis
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Connect Your Existing Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Type Selection */}
          {!skipAnalysis && (
            <div className="space-y-4">
              <Label>How would you like to connect your project?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    connectionType === 'github' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setConnectionType('github')}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <GitHubLogoIcon className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">GitHub Repository</p>
                      <p className="text-sm text-muted-foreground">Connect via GitHub URL</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    connectionType === 'upload' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setConnectionType('upload')}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <UploadIcon className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Upload Files</p>
                      <p className="text-sm text-muted-foreground">Upload project archive</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* GitHub URL Input */}
          {connectionType === 'github' && !skipAnalysis && (
            <div className="space-y-2">
              <Label htmlFor="github-url">GitHub Repository URL</Label>
              <Input
                id="github-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
          )}

          {/* File Upload Area */}
          {connectionType === 'upload' && !skipAnalysis && (
            <div className="space-y-2">
              <Label>Upload Project Files</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your project files here, or click to browse
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".zip,.tar,.gz,.rar"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Browse Files
                </Button>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 text-sm text-left">
                    <p className="font-semibold mb-2">Selected files:</p>
                    <ul className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="text-muted-foreground">
                          • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">
              What is your application about? <span className="text-muted-foreground">(min 50 characters)</span>
            </Label>
            <Textarea
              id="project-description"
              placeholder="Describe your existing application, its purpose, main features, and what you'd like to improve or add..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {projectDescription.length}/50 characters
            </p>
          </div>

          {/* Skip Analysis Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-analysis"
              checked={skipAnalysis}
              onCheckedChange={(checked) => setSkipAnalysis(checked)}
            />
            <Label 
              htmlFor="skip-analysis" 
              className="text-sm font-normal cursor-pointer"
            >
              Skip codebase analysis and use the 3-question flow instead
            </Label>
          </div>

          {skipAnalysis && (
            <Alert>
              <FileTextIcon className="h-4 w-4" />
              <AlertDescription>
                You'll be guided through our standard PRD generation process without analyzing your existing code.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
