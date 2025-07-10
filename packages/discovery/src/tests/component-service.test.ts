import { PrismaClient } from '@prisma/client';
import { ComponentService } from '../services/component-service';
import { describe, beforeAll, afterAll, test, expect } from 'bun:test';

// Create a test database connection
const prisma = new PrismaClient();
const componentService = new ComponentService(prisma);

// Test data
const TEST_COMPONENT = {
  name: 'test-user-service',
  description: 'A test user service',
  initialCode: `
    export class UserService {
      async getUser(id: string) {
        return { id, name: 'Test User' };
      }
    }
  `,
  initialContract: {
    openapi: '3.0.0',
    info: {
      title: 'User Service',
      version: '1.0.0',
    },
    paths: {
      '/getUser': {
        get: {
          parameters: [
            {
              name: 'id',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'A user object',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe('ComponentService', () => {
  let componentId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.component.deleteMany({ where: { name: TEST_COMPONENT.name } });
  });

  afterAll(async () => {
    // Clean up test data
    if (componentId) {
      await prisma.component.delete({ where: { id: componentId } });
    }
    await prisma.$disconnect();
  });

  test('should register a new component', async () => {
    const result = await componentService.registerComponent(TEST_COMPONENT);
    componentId = result.id;
    
    expect(result).toBeDefined();
    expect(result.name).toBe(TEST_COMPONENT.name);
    expect(result.version).toBeDefined();
    expect(result.contract).toBeDefined();
    expect(result.version.version).toBe('1.0.0');
  });

  test('should record component usage', async () => {
    const usage = await componentService.recordUsage(componentId, 'getUser', { 
      id: '123',
      includeProfile: true, // This is a new parameter not in the original contract
    });

    expect(usage).toBeDefined();
    expect(usage.componentId).toBe(componentId);
    expect(usage.method).toBe('getUser');
    expect(usage.parameters).toMatchObject({ id: '123', includeProfile: true });
  });

  test('should analyze usage patterns', async () => {
    // Record some more usage to get meaningful patterns
    await componentService.recordUsage(componentId, 'getUser', { 
      id: '123',
      includeProfile: true,
      fields: ['email', 'avatar'],
    });

    const analysis = await componentService.analyzeUsage(componentId);
    
    expect(analysis).toBeDefined();
    expect(analysis.suggestedUpdates).toBeDefined();
    
    // Should suggest adding the new parameters
    const addParamsUpdate = analysis.suggestedUpdates.find(
      (update: any) => update.type === 'add_parameters' && update.method === 'getUser'
    );
    
    expect(addParamsUpdate).toBeDefined();
    expect(addParamsUpdate.parameters).toContainEqual(
      expect.objectContaining({ name: 'includeProfile' })
    );
    expect(addParamsUpdate.parameters).toContainEqual(
      expect.objectContaining({ name: 'fields' })
    );
  });

  test('should create a new version with updated contract', async () => {
    // First, get the current contract
    const currentContract = await prisma.apiContract.findFirst({
      where: { componentId, isActive: true },
    });
    
    expect(currentContract).toBeDefined();
    
    // Update the contract with new parameters
    const updatedContract = {
      ...currentContract!.contract,
      paths: {
        ...currentContract!.contract.paths,
        '/getUser': {
          get: {
            ...currentContract!.contract.paths['/getUser'].get,
            parameters: [
              {
                name: 'id',
                in: 'query',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'includeProfile',
                in: 'query',
                required: false,
                schema: { type: 'boolean' },
              },
              {
                name: 'fields',
                in: 'query',
                required: false,
                schema: { 
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            ],
          },
        },
      },
    };

    // Create a new version with the updated contract
    const newVersion = await prisma.$transaction(async (tx) => {
      // Update the component version
      const version = await componentService.createVersion({
        componentId,
        code: TEST_COMPONENT.initialCode + '\n// Added support for includeProfile and fields parameters',
        description: 'Added support for includeProfile and fields parameters',
        contract: updatedContract,
      }, tx);

      // Update the contract
      await componentService.createApiContract({
        componentId,
        version: version.version,
        contract: updatedContract,
      }, tx);

      // Update the component's current version
      await tx.component.update({
        where: { id: componentId },
        data: { currentVersion: version.version },
      });

      return version;
    });

    expect(newVersion).toBeDefined();
    expect(newVersion.version).toBe('1.0.1');
    
    // Verify the contract was updated
    const updatedContractRecord = await prisma.apiContract.findFirst({
      where: { componentId, version: newVersion.version },
    });
    
    expect(updatedContractRecord).toBeDefined();
    expect(updatedContractRecord?.contract.paths['/getUser'].get.parameters).toHaveLength(3);
  });
});
