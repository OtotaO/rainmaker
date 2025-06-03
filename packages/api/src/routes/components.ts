/**
 * @fileoverview Curated Component Registry API routes
 * Provides access to Rainmaker's opinionated, verified component collection
 */

import { initContract, ServerInferRequest } from '@ts-rest/core';
import { z } from 'zod';
import { 
  componentRegistry,
  CuratedComponentSchema,
  ComponentCategory,
  SupportedFramework,
  ComponentVerificationLevel 
} from '../components/registry';

const c = initContract();

/**
 * Request schemas for component queries
 */
const ComponentQuerySchema = z.object({
  category: ComponentCategory.optional(),
  framework: SupportedFramework.optional(),
  verificationLevel: ComponentVerificationLevel.optional(),
});

const StackRecommendationSchema = z.object({
  framework: SupportedFramework,
  categories: z.array(ComponentCategory).min(1),
});

/**
 * Response schemas
 */
const ComponentListResponseSchema = z.array(CuratedComponentSchema);

const StackRecommendationResponseSchema = z.object({
  framework: SupportedFramework,
  requestedCategories: z.array(ComponentCategory),
  recommendations: z.array(CuratedComponentSchema),
  coverage: z.object({
    total: z.number(),
    covered: z.number(),
    missing: z.array(ComponentCategory),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

/**
 * API contract definition for component registry endpoints
 */
const contract = {
  // Get all components with optional filtering
  getComponents: {
    method: 'GET' as const,
    path: '/api/components',
    query: ComponentQuerySchema,
    responses: {
      200: ComponentListResponseSchema,
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get a specific component by ID
  getComponent: {
    method: 'GET' as const,
    path: '/api/components/:id',
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: CuratedComponentSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get components by category
  getComponentsByCategory: {
    method: 'GET' as const,
    path: '/api/components/category/:category',
    pathParams: z.object({
      category: ComponentCategory,
    }),
    responses: {
      200: ComponentListResponseSchema,
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get components by framework
  getComponentsByFramework: {
    method: 'GET' as const,
    path: '/api/components/framework/:framework',
    pathParams: z.object({
      framework: SupportedFramework,
    }),
    responses: {
      200: ComponentListResponseSchema,
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get Rainmaker-verified components only
  getRainmakerVerified: {
    method: 'GET' as const,
    path: '/api/components/verified',
    responses: {
      200: ComponentListResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get recommended stack for a framework and categories
  getStackRecommendations: {
    method: 'POST' as const,
    path: '/api/components/stack-recommendations',
    body: StackRecommendationSchema,
    responses: {
      200: StackRecommendationResponseSchema,
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },

  // Get available categories
  getCategories: {
    method: 'GET' as const,
    path: '/api/components/categories',
    responses: {
      200: z.array(ComponentCategory),
      500: ErrorResponseSchema,
    },
  },

  // Get available frameworks
  getFrameworks: {
    method: 'GET' as const,
    path: '/api/components/frameworks',
    responses: {
      200: z.array(SupportedFramework),
      500: ErrorResponseSchema,
    },
  },
} as const;

/**
 * Router instance created from the components contract
 */
export const componentsRouter = c.router(contract);

/**
 * Creates the implementation for component registry routes
 */
export const createComponentsRouter = () => ({
  /**
   * Get all components with optional filtering
   */
  getComponents: async ({ query }: ServerInferRequest<typeof contract.getComponents>) => {
    try {
      let components = componentRegistry.getAll();

      // Apply filters if provided
      if (query.category) {
        components = components.filter(c => c.category === query.category);
      }

      if (query.framework) {
        components = components.filter(c => c.frameworks.includes(query.framework!));
      }

      if (query.verificationLevel) {
        components = components.filter(c => c.verification.level === query.verificationLevel);
      }

      return {
        status: 200 as const,
        body: components,
      };
    } catch (error) {
      console.error('Error fetching components:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch components' },
      };
    }
  },

  /**
   * Get a specific component by ID
   */
  getComponent: async ({ params }: ServerInferRequest<typeof contract.getComponent>) => {
    try {
      const component = componentRegistry.getById(params.id);

      if (!component) {
        return {
          status: 404 as const,
          body: { error: `Component with ID '${params.id}' not found` },
        };
      }

      return {
        status: 200 as const,
        body: component,
      };
    } catch (error) {
      console.error('Error fetching component:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch component' },
      };
    }
  },

  /**
   * Get components by category
   */
  getComponentsByCategory: async ({ params }: ServerInferRequest<typeof contract.getComponentsByCategory>) => {
    try {
      const components = componentRegistry.getByCategory(params.category);

      return {
        status: 200 as const,
        body: components,
      };
    } catch (error) {
      console.error('Error fetching components by category:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch components by category' },
      };
    }
  },

  /**
   * Get components by framework
   */
  getComponentsByFramework: async ({ params }: ServerInferRequest<typeof contract.getComponentsByFramework>) => {
    try {
      const components = componentRegistry.getByFramework(params.framework);

      return {
        status: 200 as const,
        body: components,
      };
    } catch (error) {
      console.error('Error fetching components by framework:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch components by framework' },
      };
    }
  },

  /**
   * Get Rainmaker-verified components only
   */
  getRainmakerVerified: async (_: ServerInferRequest<typeof contract.getRainmakerVerified>) => {
    try {
      const components = componentRegistry.getRainmakerVerified();

      return {
        status: 200 as const,
        body: components,
      };
    } catch (error) {
      console.error('Error fetching verified components:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch verified components' },
      };
    }
  },

  /**
   * Get recommended stack for a framework and categories
   */
  getStackRecommendations: async ({ body }: ServerInferRequest<typeof contract.getStackRecommendations>) => {
    try {
      const recommendations = componentRegistry.getRecommendedStack(
        body.framework,
        body.categories
      );

      // Calculate coverage
      const covered = recommendations.map(r => r.category);
      const missing = body.categories.filter((cat: z.infer<typeof ComponentCategory>) => !covered.includes(cat));

      const response = {
        framework: body.framework,
        requestedCategories: body.categories,
        recommendations,
        coverage: {
          total: body.categories.length,
          covered: covered.length,
          missing,
        },
      };

      return {
        status: 200 as const,
        body: response,
      };
    } catch (error) {
      console.error('Error generating stack recommendations:', error);
      
      if (error instanceof z.ZodError) {
        return {
          status: 400 as const,
          body: { 
            error: 'Invalid request parameters',
            details: error.errors 
          },
        };
      }

      return {
        status: 500 as const,
        body: { error: 'Failed to generate stack recommendations' },
      };
    }
  },

  /**
   * Get available categories
   */
  getCategories: async (_: ServerInferRequest<typeof contract.getCategories>) => {
    try {
      const categories = ComponentCategory.options;

      return {
        status: 200 as const,
        body: categories,
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch categories' },
      };
    }
  },

  /**
   * Get available frameworks
   */
  getFrameworks: async (_: ServerInferRequest<typeof contract.getFrameworks>) => {
    try {
      const frameworks = SupportedFramework.options;

      return {
        status: 200 as const,
        body: frameworks,
      };
    } catch (error) {
      console.error('Error fetching frameworks:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch frameworks' },
      };
    }
  },
});
