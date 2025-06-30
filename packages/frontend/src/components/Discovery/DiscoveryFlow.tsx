/**
 * Discovery Flow Component
 * 
 * The new main interface for finding and adapting code components
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../@/components/ui/card';
import { Button } from '../../@/components/ui/button';
import { Input } from '../../@/components/ui/input';
import { Label } from '../../@/components/ui/label';
import { Alert, AlertDescription } from '../../@/components/ui/alert';
import { Badge } from '../../@/components/ui/badge';
import { ScrollArea } from '../../@/components/ui/scroll-area';
import { Textarea } from '../../@/components/ui/textarea';

interface DiscoveryFlowProps {
  onComplete?: (adaptedCode: any) => void;
}

type FlowState = 
  | 'initial'
  | 'category-selection' 
  | 'dialogue'
  | 'results'
  | 'customizing'
  | 'complete';

interface Component {
  metadata: {
    id: string;
    name: string;
    description: string;
    source: {
      repo: string;
      url: string;
      license: string;
    };
    quality: {
      stars: number;
      hasTests: boolean;
    };
    technical: {
      language: string;
      framework?: string;
      dependencies: string[];
    };
  };
}

export const DiscoveryFlow: React.FC<DiscoveryFlowProps> = ({ onComplete }) => {
  const [flowState, setFlowState] = useState<FlowState>('initial');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [adaptedCode, setAdaptedCode] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // User context - in real app, this would come from project settings
  const userContext = {
    project: {
      language: 'typescript',
      framework: 'react',
      packageManager: 'bun',
      conventions: {
        naming: 'camelCase',
        imports: 'named',
        exports: 'named',
      },
    },
    dependencies: {
      'react': '^18.0.0',
      'typescript': '^5.0.0',
    },
    preferences: {
      style: 'functional',
      errorHandling: 'exceptions',
      asyncPattern: 'async-await',
    },
  };
  
  // Start discovery
  const handleStartDiscovery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: userContext }),
      });
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setFlowState('category-selection');
    } catch (err) {
      setError('Failed to start discovery');
    } finally {
      setLoading(false);
    }
  };
  
  // Select a category
  const handleSelectCategory = async (category: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/discovery/dialogue/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, context: userContext }),
      });
      
      const data = await response.json();
      setCurrentQuestion(data.dialogue);
      setSessionId(data.sessionId);
      setFlowState('dialogue');
    } catch (err) {
      setError('Failed to start dialogue');
    } finally {
      setLoading(false);
    }
  };
  
  // Answer dialogue question
  const handleAnswerQuestion = async (answer: any) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/discovery/dialogue/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          nodeId: currentQuestion.id,
          response: answer,
        }),
      });
      
      const data = await response.json();
      
      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
      } else if (data.components) {
        setComponents(data.components);
        setFlowState('results');
      }
    } catch (err) {
      setError('Failed to continue dialogue');
    } finally {
      setLoading(false);
    }
  };
  
  // Select a component
  const handleSelectComponent = (component: Component) => {
    setSelectedComponent(component);
    setFlowState('customizing');
  };
  
  // Adapt the component
  const handleAdaptComponent = async (customizations?: any) => {
    if (!selectedComponent) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/discovery/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentId: selectedComponent.metadata.id,
          context: userContext,
          customizations,
        }),
      });
      
      const data = await response.json();
      setAdaptedCode(data);
      setFlowState('complete');
      
      if (onComplete) {
        onComplete(data);
      }
    } catch (err) {
      setError('Failed to adapt component');
    } finally {
      setLoading(false);
    }
  };
  
  // Render based on flow state
  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {flowState === 'initial' && (
        <Card>
          <CardHeader>
            <CardTitle>Find the Perfect Component</CardTitle>
            <CardDescription>
              Describe what you're looking for, and I'll help you find existing code that matches your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="query">What do you want to build?</Label>
                <Input
                  id="query"
                  placeholder="e.g., user authentication with Google OAuth"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartDiscovery()}
                />
              </div>
              <Button 
                onClick={handleStartDiscovery} 
                disabled={loading || !query.trim()}
              >
                {loading ? 'Searching...' : 'Start Discovery'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {flowState === 'category-selection' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Category</CardTitle>
            <CardDescription>
              Based on your query, these categories might have what you need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {suggestions.map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  className="h-20"
                  onClick={() => handleSelectCategory(category)}
                  disabled={loading}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {flowState === 'dialogue' && currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Let's Refine Your Search</CardTitle>
            <CardDescription>
              Answer a few questions to find the perfect match
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>{currentQuestion.question}</Label>
              </div>
              
              {currentQuestion.type === 'single-choice' && (
                <div className="space-y-2">
                  {currentQuestion.options?.map((option: any) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAnswerQuestion(option.value)}
                      disabled={loading}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {currentQuestion.type === 'multi-choice' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select all that apply
                  </p>
                  {/* Would implement multi-select here */}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {flowState === 'results' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Found {components.length} Components</CardTitle>
              <CardDescription>
                These components match your requirements
              </CardDescription>
            </CardHeader>
          </Card>
          
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {components.map((component) => (
                <Card 
                  key={component.metadata.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSelectComponent(component)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {component.metadata.name}
                        </CardTitle>
                        <CardDescription>
                          {component.metadata.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        ⭐ {component.metadata.quality.stars}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge>{component.metadata.technical.language}</Badge>
                      {component.metadata.technical.framework && (
                        <Badge variant="outline">
                          {component.metadata.technical.framework}
                        </Badge>
                      )}
                      {component.metadata.quality.hasTests && (
                        <Badge variant="outline">✓ Tests</Badge>
                      )}
                      <Badge variant="outline">
                        {component.metadata.source.license}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      From: {component.metadata.source.repo}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {flowState === 'customizing' && selectedComponent && (
        <Card>
          <CardHeader>
            <CardTitle>Customize {selectedComponent.metadata.name}</CardTitle>
            <CardDescription>
              This component will be adapted to match your project's style and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  The component will be automatically adapted to use:
                  <ul className="list-disc list-inside mt-2">
                    <li>{userContext.project.conventions.naming} naming convention</li>
                    <li>{userContext.project.conventions.imports} imports</li>
                    <li>{userContext.project.language} with {userContext.project.framework}</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => handleAdaptComponent()}
                  disabled={loading}
                >
                  {loading ? 'Adapting...' : 'Adapt Component'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFlowState('results')}
                >
                  Back to Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {flowState === 'complete' && adaptedCode && (
        <Card>
          <CardHeader>
            <CardTitle>Component Ready!</CardTitle>
            <CardDescription>
              Your adapted component is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Installation</Label>
                <pre className="bg-muted p-2 rounded text-sm">
                  {adaptedCode.adapted.instructions.install.join('\n')}
                </pre>
              </div>
              
              <div>
                <Label>Main File</Label>
                <Textarea
                  value={adaptedCode.adapted.code}
                  readOnly
                  className="font-mono text-sm"
                  rows={20}
                />
              </div>
              
              <div>
                <Label>Usage</Label>
                <pre className="bg-muted p-2 rounded text-sm">
                  {adaptedCode.adapted.instructions.usage}
                </pre>
              </div>
              
              <Button onClick={() => window.location.reload()}>
                Start New Discovery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};