import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import type { ServerInferRequest } from '@ts-rest/core';
import { PrismaClient } from '.prisma/client';
import { ProductHighLevelDescriptionSchema } from '../../../shared/src/types';

const c = initContract();

const ErrorResponse = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Contract definition
export const productsRouter = c.router({
  getAll: {
    method: 'GET',
    path: '/api/product-high-level-descriptions',
    responses: {
      200: z.array(ProductHighLevelDescriptionSchema),
      500: ErrorResponse,
    },
  },
});

// Implementation
export const createProductsRouter = (prisma: PrismaClient) => ({
  getAll: async () => {
    try {
      const productHighLevelDescriptions = await prisma.productHighLevelDescription.findMany();
      return {
        status: 200 as const,
        body: productHighLevelDescriptions.map(desc => ({
          ...desc,
          createdAt: desc.createdAt.toISOString(),
          updatedAt: desc.updatedAt.toISOString()
        })),
      };
    } catch (error) {
      console.error('Error fetching product descriptions:', error);
      return {
        status: 500 as const,
        body: { error: 'Failed to fetch product descriptions' },
      };
    }
  },
}); 