import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { ConfigSettingSchema } from '../../../schema/src/types/configSetting';
import { ConfigSettingService } from '../config/configSettingService';
import { PrismaClient } from '.prisma/client';
import { logger } from '../lib/logger';

const c = initContract();

// Define the error response schema
const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Define the API contract for config settings
export const configRouter = c.router({
  createConfigSetting: {
    method: 'POST',
    path: '/config/settings',
    body: ConfigSettingSchema.omit({ id: true, lastModified: true }),
    responses: {
      201: ConfigSettingSchema,
      400: ErrorResponse,
      500: ErrorResponse,
    },
  },
  
  getConfigSetting: {
    method: 'GET',
    path: '/config/settings/:key',
    pathParams: z.object({
      key: z.string(),
    }),
    responses: {
      200: ConfigSettingSchema,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  },
});

/**
 * Creates the implementation for config routes
 * @param configService The ConfigSettingService instance
 * @returns Route implementations for config setting endpoints
 */
export const createConfigRouter = (configService: ConfigSettingService) => ({
  // Create a new config setting
  createConfigSetting: async ({ body }: ServerInferRequest<typeof configRouter.createConfigSetting>) => {
    try {
      logger.debug('API: Create config setting request received', { key: body.key });
      
      const result = await configService.createConfigSetting(body);
      
      // Convert any null values to undefined to match schema
      const conformedResult = {
        ...result,
        description: result.description ?? undefined,
        category: result.category ?? undefined,
      };
      
      return {
        status: 201 as const,
        body: conformedResult,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('API error creating config setting', { error: err.message });
      
      if (err.message.includes('already exists')) {
        return {
          status: 400 as const,
          body: { error: err.message },
        };
      }
      
      return {
        status: 500 as const,
        body: { error: 'Failed to create config setting', details: [err.message] },
      };
    }
  },
  
  // Get a config setting by key
  getConfigSetting: async ({ params }: ServerInferRequest<typeof configRouter.getConfigSetting>) => {
    try {
      logger.debug('API: Get config setting request received', { key: params.key });
      
      const result = await configService.getConfigSetting(params.key);
      
      if (!result) {
        return {
          status: 404 as const,
          body: { error: `Config setting with key '${params.key}' not found` },
        };
      }
      
      // Convert any null values to undefined to match schema
      const conformedResult = {
        ...result,
        description: result.description ?? undefined,
        category: result.category ?? undefined,
      };
      
      return {
        status: 200 as const,
        body: conformedResult,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('API error getting config setting', { error: err.message, key: params.key });
      
      return {
        status: 500 as const,
        body: { error: 'Failed to get config setting', details: [err.message] },
      };
    }
  },
});
