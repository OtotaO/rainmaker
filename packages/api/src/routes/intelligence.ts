/**
 * Intelligence API Routes
 * 
 * Exposes the knowledge system's intelligence to the frontend
 */

import { Router } from 'express';
import { z } from 'zod';
import { componentIntelligence } from '../knowledge/knowledge-system';
import { prisma } from '../lib/prisma-client';
import { logger } from '../lib/logger';

const intelligenceRouter = Router();

// Get component scores
intelligenceRouter.get('/component-scores', async (req, res) => {
  try {
    const scores = await prisma.componentScore.findMany({
      orderBy: { successCount: 'desc' },
      take: 10,
    });

    const enrichedScores = scores.map((score: any) => ({
      componentId: score.componentId,
      componentName: score.componentId, // In real implementation, map to actual names
      successRate: score.totalUses > 0 ? score.successCount / score.totalUses : 0,
      totalUses: score.totalUses,
      lastSuccess: score.lastSuccessAt?.toISOString() || 'Never',
      trend: score.successCount > score.failureCount ? 'up' : 'stable',
    }));

    return res.json({ scores: enrichedScores });
  } catch (error) {
    logger.error('Failed to fetch component scores', { error });
    return res.status(500).json({ error: 'Failed to fetch component scores' });
  }
});

// Get domain expertise
intelligenceRouter.get('/domain-expertise', async (req, res) => {
  try {
    const patterns = await prisma.domainPattern.findMany({
      orderBy: { successRate: 'desc' },
      take: 5,
    });

    const expertise = patterns.map((pattern: any) => ({
      domain: pattern.domain,
      expertise: pattern.successRate,
      topPatterns: (pattern.componentStack as string[]).slice(0, 3),
      usageCount: pattern.usageCount,
    }));

    return res.json({ expertise });
  } catch (error) {
    logger.error('Failed to fetch domain expertise', { error });
    return res.status(500).json({ error: 'Failed to fetch domain expertise' });
  }
});

// Predict build success
const PredictBuildSchema = z.object({
  componentIds: z.array(z.string()),
  prd: z.object({
    coreFeatureDefinition: z.object({ content: z.string() }),
    businessObjective: z.object({ content: z.string() }),
  }),
});

intelligenceRouter.post('/predict-build', async (req, res) => {
  try {
    // Validate request body
    const result = PredictBuildSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body', details: result.error });
    }

    const { componentIds, prd } = result.data;

    // Get success probability from knowledge system
    const probability = await componentIntelligence.predictBuildSuccess(
      componentIds,
      prd
    );

    // Calculate confidence based on historical data volume
    const historicalBuilds = await prisma.buildHistory.count({
      where: {
        selectedStack: {
          path: '$.*.component.id',
          array_contains: componentIds,
        },
      },
    });

    const confidence = Math.min(0.95, 0.5 + (historicalBuilds * 0.05));

    // Generate risks and recommendations
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Check for known conflicts
    for (let i = 0; i < componentIds.length; i++) {
      for (let j = i + 1; j < componentIds.length; j++) {
        const conflict = await prisma.componentRelationship.findFirst({
          where: {
            component1Id: componentIds[i],
            component2Id: componentIds[j],
            relationshipType: 'conflicts',
          },
        });

        if (conflict) {
          risks.push(
            `Potential conflict between ${componentIds[i]} and ${componentIds[j]}`
          );
        }
      }
    }

    // Add recommendations based on successful patterns
    const domain = detectDomain(prd);
    const domainPattern = await prisma.domainPattern.findFirst({
      where: { domain },
      orderBy: { successRate: 'desc' },
    });

    if (domainPattern) {
      const recommendedStack = domainPattern.componentStack as string[];
      const missingComponents = recommendedStack.filter(
        comp => !componentIds.includes(comp)
      );

      if (missingComponents.length > 0) {
        recommendations.push(
          `Consider adding ${missingComponents[0]} - commonly used in ${domain} projects`
        );
      }
    }

    return res.json({
      probability,
      confidence,
      risks,
      recommendations,
    });
  } catch (error) {
    logger.error('Failed to predict build success', { error });
    return res.status(500).json({ error: 'Failed to predict build success' });
  }
});

// Get intelligent recommendations
const RecommendationsSchema = z.object({
  prd: z.object({
    coreFeatureDefinition: z.object({ content: z.string() }),
    businessObjective: z.object({ content: z.string() }),
  }),
  category: z.string(),
});

intelligenceRouter.post('/recommendations', async (req, res) => {
  try {
    // Validate request body
    const result = RecommendationsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body', details: result.error });
    }

    const { prd, category } = result.data;

    const recommendations = await componentIntelligence.getIntelligentRecommendations(
      prd,
      category
    );

    return res.json({ recommendations });
  } catch (error) {
    logger.error('Failed to get recommendations', { error });
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Helper function to detect domain
function detectDomain(prd: any): string {
  const content = `${prd.coreFeatureDefinition.content} ${prd.businessObjective.content}`.toLowerCase();
  
  if (content.includes('ecommerce') || content.includes('shop') || content.includes('store')) {
    return 'ecommerce';
  } else if (content.includes('saas') || content.includes('subscription')) {
    return 'saas';
  } else if (content.includes('blog') || content.includes('content')) {
    return 'content';
  } else if (content.includes('dashboard') || content.includes('analytics')) {
    return 'analytics';
  } else if (content.includes('social') || content.includes('community')) {
    return 'social';
  }
  
  return 'general';
}

export default intelligenceRouter;
