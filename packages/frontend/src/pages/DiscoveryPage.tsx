import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CodeViewer } from '../components/ui/CodeViewer';
import { DiscoveryFlow } from '../components/Discovery/DiscoveryFlow';
import { Download, Copy, Check } from 'lucide-react';

interface CodeMetadata {
  dependencies?: string[];
  usage?: string;
  props?: Record<string, unknown>;
}

interface AdaptedCode {
  code: string;
  language: string;
  componentName: string;
  description: string;
  filename: string;
  metadata?: CodeMetadata;
}

const DiscoveryPage: React.FC = () => {
  const [adaptedCode, setAdaptedCode] = useState<AdaptedCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('discovery');

  const handleComplete = (code: AdaptedCode): void => {
    console.log('Component adaptation complete:', code);
    setAdaptedCode(code);
  };

  const handleCopy = async (): Promise<void> => {
    if (!adaptedCode?.code) return;
    
    try {
      await navigator.clipboard.writeText(adaptedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = (): void => {
    if (!adaptedCode) return;
    
    const element = document.createElement('a');
    const file = new Blob([adaptedCode.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = adaptedCode.filename || `${adaptedCode.componentName}.${adaptedCode.language || 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderInstallationInstructions = (): JSX.Element | null => {
    if (!adaptedCode?.metadata?.dependencies?.length) return null;
    
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Installation</h3>
        <pre className="bg-muted p-3 rounded-md overflow-x-auto">
          <code>npm install {adaptedCode.metadata.dependencies.join(' ')}</code>
        </pre>
      </div>
    );
  };

  const renderUsageInstructions = (): JSX.Element | null => {
    if (!adaptedCode?.metadata?.usage) return null;
    
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Usage</h3>
        <pre className="bg-muted p-3 rounded-md overflow-x-auto">
          <code>{adaptedCode.metadata.usage}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="discovery">Component Discovery</TabsTrigger>
          {adaptedCode && (
            <TabsTrigger value="code">
              {adaptedCode.componentName || 'Adapted Code'}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="discovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discover Components</CardTitle>
              <CardDescription>
                Describe the component you&apos;re looking for and we&apos;ll help you find or create it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiscoveryFlow onComplete={(code) => {
                handleComplete(code);
                setActiveTab('code');
              }} />
            </CardContent>
          </Card>
        </TabsContent>

        {adaptedCode && (
          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>{adaptedCode.componentName}</CardTitle>
                  <CardDescription>{adaptedCode.description}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex items-center gap-1"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden border">
                  <CodeViewer
                    code={adaptedCode.code}
                    language={adaptedCode.language || 'typescript'}
                  />
                </div>

                <div className="mt-6 space-y-6">
                  {renderInstallationInstructions()}
                  {renderUsageInstructions()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default DiscoveryPage;
