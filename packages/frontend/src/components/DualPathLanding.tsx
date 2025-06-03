import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card";
import { GitHubLogoIcon, UploadIcon, PlusIcon, CodeIcon } from "@radix-ui/react-icons";

interface DualPathLandingProps {
  onSelectPath: (path: 'connect-existing' | 'create-new') => void;
}

export const DualPathLanding: React.FC<DualPathLandingProps> = ({ onSelectPath }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
        
        {/* Connect Existing Project Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-full cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-xl"
            onClick={() => onSelectPath('connect-existing')}
          >
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <CodeIcon className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Connect Existing Project</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Upload your existing codebase or connect a GitHub repository to modernize and enhance your application
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitHubLogoIcon className="w-4 h-4" />
                  <span>GitHub</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload</span>
                </div>
              </div>
              <div className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-primary">Perfect for:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Modernizing legacy applications</li>
                  <li>• Adding new features to existing projects</li>
                  <li>• Upgrading dependencies and frameworks</li>
                  <li>• Refactoring and optimization</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Create New Project Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-full cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-xl"
            onClick={() => onSelectPath('create-new')}
          >
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <PlusIcon className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Create New Project</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Start from scratch with our intelligent PRD-driven development process to build your application
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-lg">📝</span>
                  <span>PRD Generation</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-lg">🚀</span>
                  <span>Quick Start</span>
                </div>
              </div>
              <div className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-primary">Perfect for:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Greenfield projects</li>
                  <li>• Rapid prototyping</li>
                  <li>• MVP development</li>
                  <li>• Learning new technologies</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
