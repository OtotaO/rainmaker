import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../@/components/ui/card';
import { Progress } from '../@/components/ui/progress';
import { Badge } from '../@/components/ui/badge';
import { Brain, TrendingUp, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ComponentScore {
  componentId: string;
  componentName: string;
  successRate: number;
  totalUses: number;
  lastSuccess: string;
  trend: 'up' | 'down' | 'stable';
}

interface DomainExpertise {
  domain: string;
  expertise: number;
  topPatterns: string[];
}

interface BuildPrediction {
  probability: number;
  confidence: number;
  risks: string[];
  recommendations: string[];
}

export function IntelligenceDisplay({ 
  selectedComponents = [],
  prdDomain = 'general'
}: {
  selectedComponents?: string[];
  prdDomain?: string;
}) {
  const [componentScores, setComponentScores] = useState<ComponentScore[]>([]);
  const [domainExpertise, setDomainExpertise] = useState<DomainExpertise[]>([]);
  const [buildPrediction, setBuildPrediction] = useState<BuildPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch intelligence data
    fetchIntelligenceData();
  }, [selectedComponents, prdDomain]);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll use mock data to demonstrate the UI
      
      // Mock component scores
      setComponentScores([
        {
          componentId: 'nextjs',
          componentName: 'Next.js',
          successRate: 0.94,
          totalUses: 1247,
          lastSuccess: '2 hours ago',
          trend: 'up'
        },
        {
          componentId: 'mantine',
          componentName: 'Mantine',
          successRate: 0.91,
          totalUses: 892,
          lastSuccess: '1 hour ago',
          trend: 'up'
        },
        {
          componentId: 'zustand',
          componentName: 'Zustand',
          successRate: 0.88,
          totalUses: 634,
          lastSuccess: '3 hours ago',
          trend: 'stable'
        }
      ]);

      // Mock domain expertise
      setDomainExpertise([
        {
          domain: 'ecommerce',
          expertise: 0.87,
          topPatterns: ['Next.js + Stripe + Mantine', 'Zustand for cart state', 'NextAuth for customers']
        },
        {
          domain: 'saas',
          expertise: 0.82,
          topPatterns: ['Clerk for auth', 'Prisma + PostgreSQL', 'Tailwind for rapid UI']
        }
      ]);

      // Mock build prediction
      setBuildPrediction({
        probability: 0.89,
        confidence: 0.92,
        risks: selectedComponents.length === 0 ? ['No components selected'] : [],
        recommendations: [
          'Consider adding Vitest for testing',
          'Mantine works exceptionally well with Next.js'
        ]
      });
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 0.8) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (probability >= 0.6) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-pulse flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <span>Analyzing intelligence data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Build Success Prediction */}
      {buildPrediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Build Success Prediction
            </CardTitle>
            <CardDescription>
              AI-powered prediction based on historical data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getProbabilityIcon(buildPrediction.probability)}
                  <span className="text-lg font-semibold">
                    Success Probability
                  </span>
                </div>
                <span className={`text-2xl font-bold ${getProbabilityColor(buildPrediction.probability)}`}>
                  {(buildPrediction.probability * 100).toFixed(0)}%
                </span>
              </div>
              
              <Progress value={buildPrediction.probability * 100} className="h-2" />
              
              <div className="text-sm text-muted-foreground">
                Confidence: {(buildPrediction.confidence * 100).toFixed(0)}%
              </div>

              {buildPrediction.risks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Potential Risks</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {buildPrediction.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {buildPrediction.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">AI Recommendations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {buildPrediction.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Component Intelligence
          </CardTitle>
          <CardDescription>
            Real-world performance data from {componentScores.reduce((sum, c) => sum + c.totalUses, 0).toLocaleString()} builds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {componentScores.map((component) => (
              <div key={component.componentId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{component.componentName}</span>
                    {component.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {component.totalUses} uses
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">
                    {(component.successRate * 100).toFixed(0)}% success
                  </span>
                </div>
                <Progress value={component.successRate * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  Last successful build: {component.lastSuccess}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain Expertise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Domain Expertise
          </CardTitle>
          <CardDescription>
            Rainmaker's accumulated knowledge by domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domainExpertise.map((domain) => (
              <div key={domain.domain} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{domain.domain}</span>
                  <span className="text-sm text-muted-foreground">
                    {(domain.expertise * 100).toFixed(0)}% expertise
                  </span>
                </div>
                <Progress value={domain.expertise * 100} className="h-1.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Top patterns:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {domain.topPatterns.map((pattern, i) => (
                      <li key={i}>• {pattern}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
