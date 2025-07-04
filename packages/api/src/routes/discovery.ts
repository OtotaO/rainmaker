import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DiscoveryWrapper } from '../services/discovery-wrapper';
import { AdaptationWrapper } from '../services/adaptation-wrapper';

const router = Router();

// Initialize services
const discoveryService = new DiscoveryWrapper();
const adaptationEngine = new AdaptationWrapper();

// Request/Response schemas
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().positive().max(50).default(10),
  filters: z.object({
    category: z.string().optional(),
    language: z.string().optional(),
    framework: z.string().optional(),
    minStars: z.number().int().min(0).optional(),
  }).optional(),
});

const AnalyzeRequestSchema = z.object({
  componentId: z.string(),
  includePatterns: z.boolean().default(true),
  includeQuality: z.boolean().default(true),
});

const AdaptRequestSchema = z.object({
  componentId: z.string(),
  adaptations: z.object({
    namingConvention: z.enum(['camelCase', 'snake_case', 'kebab-case']).optional(),
    importStyle: z.enum(['default', 'named', 'namespace']).optional(),
    errorHandling: z.enum(['try-catch', 'promises', 'async-await', 'result-type']).optional(),
    customInjections: z.array(z.object({
      type: z.enum(['before', 'after', 'replace', 'wrap']),
      target: z.string(),
      code: z.string(),
    })).optional(),
  }),
});

const DialogueRequestSchema = z.object({
  sessionId: z.string().optional(),
  userResponse: z.string().optional(),
  context: z.object({
    previousQuestions: z.array(z.string()).optional(),
    requirements: z.record(z.any()).optional(),
  }).optional(),
});

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes

/**
 * POST /api/discovery/search
 * Search for code components
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = SearchRequestSchema.parse(req.body);
  
  try {
    const results = await discoveryService.search(
      validatedData.query,
      {
        limit: validatedData.limit,
        filters: validatedData.filters,
      }
    );
    
    res.json({
      success: true,
      data: {
        query: validatedData.query,
        totalResults: results.length,
        results: results.map(result => ({
          id: result.component.metadata.id,
          name: result.component.metadata.name,
          description: result.component.metadata.description,
          category: result.component.metadata.category,
          score: result.score,
          reasoning: result.reasoning,
          technical: result.component.metadata.technical,
          quality: result.component.metadata.quality,
        })),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search components',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * POST /api/discovery/analyze
 * Analyze a specific component
 */
router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = AnalyzeRequestSchema.parse(req.body);
  
  try {
    const component = await discoveryService.getComponent(validatedData.componentId);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
      });
    }
    
    const analysis = await discoveryService.analyzeComponent(
      component,
      {
        includePatterns: validatedData.includePatterns,
        includeQuality: validatedData.includeQuality,
      }
    );
    
    res.json({
      success: true,
      data: {
        component: {
          id: component.metadata.id,
          name: component.metadata.name,
          description: component.metadata.description,
        },
        analysis,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze component',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * POST /api/discovery/adapt
 * Adapt a component with specified transformations
 */
router.post('/adapt', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = AdaptRequestSchema.parse(req.body);
  
  try {
    const component = await discoveryService.getComponent(validatedData.componentId);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
      });
    }
    
    const adaptedCode = await adaptationEngine.adapt(
      component,
      validatedData.adaptations
    );
    
    res.json({
      success: true,
      data: {
        original: {
          id: component.metadata.id,
          name: component.metadata.name,
        },
        adaptations: validatedData.adaptations,
        adaptedCode,
        diff: generateDiff(component.code.raw, adaptedCode),
      },
    });
  } catch (error) {
    console.error('Adaptation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adapt component',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * POST /api/discovery/dialogue
 * Handle Socratic dialogue for requirement refinement
 */
router.post('/dialogue', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = DialogueRequestSchema.parse(req.body);
  
  try {
    const dialogueResponse = await discoveryService.processDialogue(
      validatedData.sessionId || generateSessionId(),
      validatedData.userResponse,
      validatedData.context
    );
    
    res.json({
      success: true,
      data: dialogueResponse,
    });
  } catch (error) {
    console.error('Dialogue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process dialogue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * GET /api/discovery/components/:id
 * Get a specific component by ID
 */
router.get('/components/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const component = await discoveryService.getComponent(id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
      });
    }
    
    res.json({
      success: true,
      data: component,
    });
  } catch (error) {
    console.error('Get component error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get component',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * GET /api/discovery/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      discovery: 'operational',
      socratic: 'operational',
      adaptation: 'operational',
    },
  });
});

// Helper functions
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateDiff(original: string, adapted: string): string {
  // Simple diff representation - in production, use a proper diff library
  const originalLines = original.split('\n');
  const adaptedLines = adapted.split('\n');
  
  let diff = '';
  const maxLines = Math.max(originalLines.length, adaptedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || '';
    const adaptLine = adaptedLines[i] || '';
    
    if (origLine !== adaptLine) {
      if (origLine) diff += `- ${origLine}\n`;
      if (adaptLine) diff += `+ ${adaptLine}\n`;
    } else {
      diff += `  ${origLine}\n`;
    }
  }
  
  return diff;
}

export default router;
