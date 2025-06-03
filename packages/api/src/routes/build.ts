// File: packages/api/src/routes/build.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { buildOrchestratorService, BuildRequestSchema } from '../build';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/build/from-prd
 * 
 * The "Magic Button" endpoint - transforms a finalized PRD into a working codebase
 * with curated components in one automated pipeline.
 * 
 * This is the core implementation of Rainmaker's "conversation → PRD → button click → finished product" vision.
 */
router.post('/from-prd', async (req: Request, res: Response) => {
  try {
    logger.info('🚀 Build from PRD request received', { 
      body: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });

    // Validate request body
    const buildRequest = BuildRequestSchema.parse(req.body);
    
    logger.info('✅ Build request validated', { 
      prdTitle: buildRequest.prd.title,
      targetFramework: buildRequest.targetFramework,
      projectType: buildRequest.projectType 
    });

    // Execute the build orchestration
    const buildResult = await buildOrchestratorService.buildFromPRD(buildRequest);

    if (buildResult.success) {
      logger.info('🎉 Build orchestration completed successfully', {
        buildId: buildResult.buildId,
        filesGenerated: buildResult.generatedFiles.length,
        issuesCreated: buildResult.createdIssues.length,
        stackComponents: buildResult.selectedStack.length
      });

      res.status(200).json({
        success: true,
        message: 'Build orchestration completed successfully',
        data: buildResult,
      });
    } else {
      logger.error('❌ Build orchestration failed', {
        buildId: buildResult.buildId,
        error: buildResult.error
      });

      res.status(500).json({
        success: false,
        message: 'Build orchestration failed',
        error: buildResult.error,
        buildId: buildResult.buildId,
      });
    }

  } catch (error) {
    logger.error('💥 Build from PRD endpoint error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body 
    });

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request format',
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error during build orchestration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * GET /api/build/health
 * 
 * Health check endpoint for the build orchestrator service
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Rainmaker Build Orchestrator is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    philosophy: 'Get them to the destination first, then think about what to eat.',
  });
});

/**
 * POST /api/build/validate-prd
 * 
 * Validate a PRD structure without executing the full build pipeline
 */
router.post('/validate-prd', async (req: Request, res: Response) => {
  try {
    const buildRequest = BuildRequestSchema.parse(req.body);
    
    res.status(200).json({
      success: true,
      message: 'PRD structure is valid',
      prd: buildRequest.prd,
      targetFramework: buildRequest.targetFramework,
      projectType: buildRequest.projectType,
    });

  } catch (error) {
    logger.error('PRD validation failed', { error, body: req.body });

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid PRD structure',
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error validating PRD',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;
