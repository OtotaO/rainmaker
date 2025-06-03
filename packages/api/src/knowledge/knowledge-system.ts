/**
 * Rainmaker Knowledge System
 * 
 * Implements dynamic knowledge organization from conversational AI RFC
 * to create a learning code generation platform that improves with every use.
 */

import { z } from 'zod';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma-client';

// Core schemas for knowledge representation
export const FactSchema = z.object({
  factId: z.string(),
  content: z.string(),
  metadata: z.object({
    source: z.enum(['user_prd', 'build_result', 'user_feedback', 'system_observation']),
    projectId: z.string().optional(),
    timestamp: z.date(),
    confidence: z.number().min(0).max(1),
    extractionMethod: z.string(),
  }),
  context: z.object({
    prdId: z.string().optional(),
    buildId: z.string().optional(),
    componentIds: z.array(z.string()).optional(),
    domain: z.string().optional(),
  }),
  entities: z.array(z.object({
    entity: z.string(),
    type: z.string(),
    role: z.string().optional(),
  })),
  uncertainty: z.object({
    type: z.enum(['epistemic', 'aleatory']),
    factors: z.array(z.string()),
    confidenceInterval: z.tuple([z.number(), z.number()]),
  }).optional(),
});

export const RelationshipSchema = z.object({
  relationshipId: z.string(),
  sourceFactId: z.string(),
  targetFactId: z.string(),
  type: z.enum([
    'enables_success', 'causes_failure', 'works_with', 'conflicts_with',
    'preferred_over', 'required_by', 'optimizes', 'degrades'
  ]),
  metadata: z.object({
    confidence: z.number().min(0).max(1),
    detectionMethod: z.string(),
    timestamp: z.date(),
    evidenceCount: z.number().default(1),
  }),
  properties: z.object({
    strength: z.number().min(0).max(1),
    context: z.string().optional(),
    conditions: z.array(z.string()).optional(),
  }),
});

export const ComponentUsageFactSchema = z.object({
  componentId: z.string(),
  projectId: z.string(),
  outcome: z.enum(['success', 'failure', 'modified', 'replaced']),
  context: z.object({
    prdType: z.string(),
    otherComponents: z.array(z.string()),
    userExperience: z.enum(['beginner', 'intermediate', 'expert']).optional(),
    projectComplexity: z.enum(['simple', 'moderate', 'complex']),
  }),
  modifications: z.array(z.object({
    type: z.string(),
    description: z.string(),
    reason: z.string().optional(),
  })).optional(),
  performance: z.object({
    buildTime: z.number().optional(),
    bundleSize: z.number().optional(),
    userSatisfaction: z.number().min(0).max(10).optional(),
  }).optional(),
});

export type Fact = z.infer<typeof FactSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type ComponentUsageFact = z.infer<typeof ComponentUsageFactSchema>;

/**
 * Knowledge Extraction & Organization (KEO) System
 */
export class KnowledgeExtractionSystem {
  /**
   * Extract facts from a build result
   */
  async extractBuildFacts(buildResult: any, prd: any): Promise<Fact[]> {
    const facts: Fact[] = [];
    const buildId = buildResult.buildId;
    const timestamp = new Date();

    // Extract component combination success/failure
    if (buildResult.success) {
      const componentIds = buildResult.selectedStack.map((s: any) => s.component.id);
      
      facts.push({
        factId: `F_${buildId}_success`,
        content: `Component combination [${componentIds.join(', ')}] successfully built for ${prd.coreFeatureDefinition.content}`,
        metadata: {
          source: 'build_result',
          projectId: buildId,
          timestamp,
          confidence: 1.0,
          extractionMethod: 'direct_observation',
        },
        context: {
          buildId,
          prdId: prd.id,
          componentIds,
          domain: this.detectDomain(prd),
        },
        entities: [
          ...componentIds.map((id: string) => ({ entity: id, type: 'component' })),
          { entity: prd.coreFeatureDefinition.content, type: 'project_type' },
        ],
      });

      // Extract individual component performance
      for (const stackItem of buildResult.selectedStack) {
        facts.push({
          factId: `F_${buildId}_${stackItem.component.id}_usage`,
          content: `${stackItem.component.name} selected for ${stackItem.category} because: ${stackItem.reason}`,
          metadata: {
            source: 'system_observation',
            projectId: buildId,
            timestamp,
            confidence: 0.9,
            extractionMethod: 'build_analysis',
          },
          context: {
            buildId,
            prdId: prd.id,
            componentIds: [stackItem.component.id],
            domain: this.detectDomain(prd),
          },
          entities: [
            { entity: stackItem.component.id, type: 'component' },
            { entity: stackItem.category, type: 'category' },
          ],
        });
      }
    } else {
      // Extract failure facts
      facts.push({
        factId: `F_${buildId}_failure`,
        content: `Build failed for ${prd.coreFeatureDefinition.content}: ${buildResult.error}`,
        metadata: {
          source: 'build_result',
          projectId: buildId,
          timestamp,
          confidence: 1.0,
          extractionMethod: 'direct_observation',
        },
        context: {
          buildId,
          prdId: prd.id,
          domain: this.detectDomain(prd),
        },
        entities: [
          { entity: prd.coreFeatureDefinition.content, type: 'project_type' },
          { entity: buildResult.error || 'unknown_error', type: 'error' },
        ],
        uncertainty: {
          type: 'epistemic',
          factors: ['error_analysis'],
          confidenceInterval: [0.8, 1.0],
        },
      });
    }

    return facts;
  }

  /**
   * Extract facts from user feedback
   */
  async extractUserFeedbackFacts(feedback: any): Promise<Fact[]> {
    const facts: Fact[] = [];
    const timestamp = new Date();

    if (feedback.type === 'component_modified') {
      facts.push({
        factId: `F_feedback_${feedback.id}`,
        content: `User modified ${feedback.componentId} in ${feedback.projectId}: ${feedback.modification}`,
        metadata: {
          source: 'user_feedback',
          projectId: feedback.projectId,
          timestamp,
          confidence: 1.0,
          extractionMethod: 'user_report',
        },
        context: {
          buildId: feedback.buildId,
          componentIds: [feedback.componentId],
        },
        entities: [
          { entity: feedback.componentId, type: 'component' },
          { entity: feedback.modification, type: 'modification' },
        ],
      });
    }

    return facts;
  }

  /**
   * Detect domain from PRD
   */
  private detectDomain(prd: any): string {
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
}

/**
 * Relationship Management System
 */
export class RelationshipManager {
  /**
   * Detect relationships between facts
   */
  async detectRelationships(facts: Fact[]): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const fact1 = facts[i];
        const fact2 = facts[j];

        // Check for component compatibility relationships
        if (this.shareComponents(fact1, fact2)) {
          const relationship = this.analyzeComponentRelationship(fact1, fact2);
          if (relationship) {
            relationships.push(relationship);
          }
        }

        // Check for success/failure patterns
        if (this.isSuccessFailurePattern(fact1, fact2)) {
          relationships.push(this.createSuccessFailureRelationship(fact1, fact2));
        }
      }
    }

    return relationships;
  }

  private shareComponents(fact1: Fact, fact2: Fact): boolean {
    const components1 = fact1.context.componentIds || [];
    const components2 = fact2.context.componentIds || [];
    return components1.some(c => components2.includes(c));
  }

  private analyzeComponentRelationship(fact1: Fact, fact2: Fact): Relationship | null {
    // If both facts represent successful builds with overlapping components
    if (fact1.content.includes('successfully built') && fact2.content.includes('successfully built')) {
      const sharedComponents = (fact1.context.componentIds || []).filter(
        c => (fact2.context.componentIds || []).includes(c)
      );

      if (sharedComponents.length > 0) {
        return {
          relationshipId: `R_${fact1.factId}_${fact2.factId}`,
          sourceFactId: fact1.factId,
          targetFactId: fact2.factId,
          type: 'works_with',
          metadata: {
            confidence: 0.8,
            detectionMethod: 'pattern_analysis',
            timestamp: new Date(),
            evidenceCount: 1,
          },
          properties: {
            strength: sharedComponents.length / Math.max(
              fact1.context.componentIds?.length || 1,
              fact2.context.componentIds?.length || 1
            ),
            context: 'successful_builds',
          },
        };
      }
    }

    return null;
  }

  private isSuccessFailurePattern(fact1: Fact, fact2: Fact): boolean {
    return (fact1.content.includes('failed') && fact2.content.includes('successfully')) ||
           (fact1.content.includes('successfully') && fact2.content.includes('failed'));
  }

  private createSuccessFailureRelationship(fact1: Fact, fact2: Fact): Relationship {
    const failureFact = fact1.content.includes('failed') ? fact1 : fact2;
    const successFact = fact1.content.includes('failed') ? fact2 : fact1;

    return {
      relationshipId: `R_${failureFact.factId}_${successFact.factId}`,
      sourceFactId: failureFact.factId,
      targetFactId: successFact.factId,
      type: 'conflicts_with',
      metadata: {
        confidence: 0.7,
        detectionMethod: 'success_failure_analysis',
        timestamp: new Date(),
        evidenceCount: 1,
      },
      properties: {
        strength: 0.8,
        context: 'build_outcomes',
      },
    };
  }
}

/**
 * Component Intelligence System
 */
export class ComponentIntelligence {
  private knowledgeExtractor: KnowledgeExtractionSystem;
  private relationshipManager: RelationshipManager;

  constructor() {
    this.knowledgeExtractor = new KnowledgeExtractionSystem();
    this.relationshipManager = new RelationshipManager();
  }

  /**
   * Learn from a build result
   */
  async learnFromBuild(buildResult: any, prd: any): Promise<void> {
    try {
      // Extract facts from the build
      const facts = await this.knowledgeExtractor.extractBuildFacts(buildResult, prd);
      
      // Store facts in database
      for (const fact of facts) {
        await this.storeFact(fact);
      }

      // Detect relationships with existing facts
      const existingFacts = await this.getRecentFacts(100);
      const allFacts = [...existingFacts, ...facts];
      const relationships = await this.relationshipManager.detectRelationships(allFacts);

      // Store relationships
      for (const relationship of relationships) {
        await this.storeRelationship(relationship);
      }

      // Update component scores based on new knowledge
      await this.updateComponentScores(buildResult);

      logger.info('Knowledge system learned from build', {
        buildId: buildResult.buildId,
        factsExtracted: facts.length,
        relationshipsDetected: relationships.length,
      });
    } catch (error) {
      logger.error('Failed to learn from build', { error });
    }
  }

  /**
   * Get component recommendations based on learned knowledge
   */
  async getIntelligentRecommendations(prd: any, category: string): Promise<any[]> {
    const domain = this.detectDomain(prd);
    
    // Query successful component combinations for similar projects
    const successfulCombinations = await prisma.$queryRaw`
      SELECT 
        component_id,
        COUNT(*) as success_count,
        AVG(confidence) as avg_confidence
      FROM knowledge_facts
      WHERE 
        content LIKE '%successfully built%'
        AND context->>'domain' = ${domain}
        AND entities @> ${JSON.stringify([{ type: 'category', entity: category }])}
      GROUP BY component_id
      ORDER BY success_count DESC, avg_confidence DESC
      LIMIT 10
    `;

    return successfulCombinations;
  }

  /**
   * Predict build success probability
   */
  async predictBuildSuccess(componentIds: string[], prd: any): Promise<number> {
    // Look for historical success rates with these components
    const historicalData = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN content LIKE '%successfully built%' THEN 1 END) as successes,
        COUNT(*) as total
      FROM knowledge_facts
      WHERE 
        context->'componentIds' @> ${JSON.stringify(componentIds)}
    `;

    const successRate = historicalData[0]?.total > 0 
      ? historicalData[0].successes / historicalData[0].total 
      : 0.5; // Default to 50% if no data

    // Adjust based on component relationships
    const compatibilityScore = await this.calculateCompatibilityScore(componentIds);

    return (successRate * 0.7) + (compatibilityScore * 0.3);
  }

  private async calculateCompatibilityScore(componentIds: string[]): Promise<number> {
    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < componentIds.length; i++) {
      for (let j = i + 1; j < componentIds.length; j++) {
        const relationship = await prisma.$queryRaw`
          SELECT type, properties->>'strength' as strength
          FROM knowledge_relationships
          WHERE 
            (source_fact_id IN (
              SELECT fact_id FROM knowledge_facts 
              WHERE context->'componentIds' @> ${JSON.stringify([componentIds[i]])}
            ) AND target_fact_id IN (
              SELECT fact_id FROM knowledge_facts 
              WHERE context->'componentIds' @> ${JSON.stringify([componentIds[j]])}
            ))
            OR
            (source_fact_id IN (
              SELECT fact_id FROM knowledge_facts 
              WHERE context->'componentIds' @> ${JSON.stringify([componentIds[j]])}
            ) AND target_fact_id IN (
              SELECT fact_id FROM knowledge_facts 
              WHERE context->'componentIds' @> ${JSON.stringify([componentIds[i]])}
            ))
          ORDER BY metadata->>'confidence' DESC
          LIMIT 1
        `;

        if (relationship[0]) {
          const strength = parseFloat(relationship[0].strength || '0.5');
          if (relationship[0].type === 'works_with') {
            totalScore += strength;
          } else if (relationship[0].type === 'conflicts_with') {
            totalScore -= strength;
          }
        } else {
          totalScore += 0.5; // Neutral if no relationship found
        }
        comparisons++;
      }
    }

    return comparisons > 0 ? Math.max(0, Math.min(1, totalScore / comparisons)) : 0.5;
  }

  private detectDomain(prd: any): string {
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

  private async storeFact(fact: Fact): Promise<void> {
    await prisma.knowledgeFact.create({
      data: {
        factId: fact.factId,
        content: fact.content,
        metadata: fact.metadata as any,
        context: fact.context as any,
        entities: fact.entities as any,
        uncertainty: fact.uncertainty as any,
      },
    });
  }

  private async storeRelationship(relationship: Relationship): Promise<void> {
    await prisma.knowledgeRelationship.create({
      data: {
        relationshipId: relationship.relationshipId,
        sourceFactId: relationship.sourceFactId,
        targetFactId: relationship.targetFactId,
        type: relationship.type,
        metadata: relationship.metadata as any,
        properties: relationship.properties as any,
      },
    });
  }

  private async getRecentFacts(limit: number): Promise<Fact[]> {
    const facts = await prisma.knowledgeFact.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return facts.map((f: any) => ({
      factId: f.factId,
      content: f.content,
      metadata: f.metadata as any,
      context: f.context as any,
      entities: f.entities as any,
      uncertainty: f.uncertainty as any,
    }));
  }

  private async updateComponentScores(buildResult: any): Promise<void> {
    if (!buildResult.success) return;

    for (const stackItem of buildResult.selectedStack) {
      const componentId = stackItem.component.id;
      
      // Update or create component score
      await prisma.componentScore.upsert({
        where: { componentId },
        update: {
          successCount: { increment: 1 },
          totalUses: { increment: 1 },
          lastSuccessAt: new Date(),
        },
        create: {
          componentId,
          successCount: 1,
          totalUses: 1,
          failureCount: 0,
          modificationCount: 0,
          averageUserSatisfaction: null,
          lastSuccessAt: new Date(),
        },
      });
    }
  }
}

// Export singleton instance
export const componentIntelligence = new ComponentIntelligence();
