import { PrismaClient, type Component, type ComponentVersion, type ComponentUsage, type ApiContract } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ComponentInput {
  name: string;
  description?: string;
  initialCode: string;
  initialContract: any; // JSON schema for the API contract
}

export interface ComponentVersionInput {
  componentId: string;
  code: string;
  description?: string;
  contract: any; // JSON schema for the API contract
}

export class ComponentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Register a new component
   */
  async registerComponent(input: ComponentInput): Promise<Component & { version: ComponentVersion; contract: ApiContract }> {
    return this.prisma.$transaction(async (tx) => {
      // Create the component
      const component = await tx.component.create({
        data: {
          name: input.name,
          description: input.description,
          currentVersion: '1.0.0',
        },
      });

      // Create the initial version
      const version = await this.createVersion({
        componentId: component.id,
        code: input.initialCode,
        description: 'Initial version',
        contract: input.initialContract,
      }, tx);

      // Create the initial API contract
      const contract = await this.createApiContract({
        componentId: component.id,
        version: '1.0.0',
        contract: input.initialContract,
      }, tx);

      return { ...component, version, contract };
    });
  }

  /**
   * Create a new version of a component
   */
  async createVersion(
    input: ComponentVersionInput,
    tx: any = this.prisma
  ): Promise<ComponentVersion> {
    return tx.componentVersion.create({
      data: {
        componentId: input.componentId,
        version: await this.getNextVersion(input.componentId, tx),
        code: input.code,
        description: input.description,
      },
    });
  }

  /**
   * Record component usage
   */
  async recordUsage(
    componentId: string,
    method: string,
    parameters: Record<string, any>
  ): Promise<ComponentUsage> {
    return this.prisma.componentUsage.create({
      data: {
        componentId,
        method,
        parameters,
      },
    });
  }

  /**
   * Create or update an API contract
   */
  async createApiContract(
    input: {
      componentId: string;
      version: string;
      contract: any;
    },
    tx: any = this.prisma
  ): Promise<ApiContract> {
    return tx.apiContract.upsert({
      where: {
        componentId_version: {
          componentId: input.componentId,
          version: input.version,
        },
      },
      update: {
        contract: input.contract,
        isActive: true,
      },
      create: {
        componentId: input.componentId,
        version: input.version,
        contract: input.contract,
      },
    });
  }

  /**
   * Get the next semantic version based on the current version
   */
  private async getNextVersion(componentId: string, tx: any): Promise<string> {
    const latestVersion = await tx.componentVersion.findFirst({
      where: { componentId },
      orderBy: { releasedAt: 'desc' },
      select: { version: true },
    });

    if (!latestVersion) {
      return '1.0.0';
    }

    const [major, minor, patch] = latestVersion.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Analyze usage patterns and suggest API contract updates
   */
  async analyzeUsage(componentId: string): Promise<{
    suggestedUpdates: any[];
    usagePatterns: Record<string, any>;
  }> {
    // Get recent usage
    const recentUsage = await this.prisma.componentUsage.findMany({
      where: { componentId },
      orderBy: { calledAt: 'desc' },
      take: 100, // Analyze last 100 usages
    });

    // Simple analysis: group by method and parameter patterns
    const usageByMethod = recentUsage.reduce((acc, usage) => {
      if (!acc[usage.method]) {
        acc[usage.method] = {
          count: 0,
          parameters: new Set<string>(),
          parameterTypes: {},
        };
      }

      const methodData = acc[usage.method];
      methodData.count++;

      // Track unique parameters and their types
      Object.entries(usage.parameters as Record<string, any>).forEach(([key, value]) => {
        methodData.parameters.add(key);
        
        if (!methodData.parameterTypes[key]) {
          methodData.parameterTypes[key] = new Set();
        }
        methodData.parameterTypes[key].add(typeof value);
      });

      return acc;
    }, {} as Record<string, { count: number; parameters: Set<string>; parameterTypes: Record<string, Set<string>> }>);

    // Generate suggested updates
    const suggestedUpdates = [];
    const currentContract = await this.getCurrentContract(componentId);

    for (const [method, data] of Object.entries(usageByMethod)) {
      const methodContract = currentContract?.contract?.paths?.[`/${method}`];
      
      if (!methodContract) {
        // New method detected in usage
        suggestedUpdates.push({
          type: 'add_method',
          method,
          parameters: Array.from(data.parameters),
          parameterTypes: Object.fromEntries(
            Object.entries(data.parameterTypes).map(([param, types]) => [
              param,
              Array.from(types),
            ])
          ),
        });
      } else {
        // Check for new parameters
        const methodParams = methodContract.parameters?.map((p: any) => p.name) || [];
        const newParams = Array.from(data.parameters).filter(p => !methodParams.includes(p));
        
        if (newParams.length > 0) {
          suggestedUpdates.push({
            type: 'add_parameters',
            method,
            parameters: newParams.map(param => ({
              name: param,
              types: Array.from(data.parameterTypes[param] || []),
            })),
          });
        }
      }
    }

    return {
      suggestedUpdates,
      usagePatterns: Object.fromEntries(
        Object.entries(usageByMethod).map(([method, data]) => [
          method,
          {
            count: data.count,
            parameters: Array.from(data.parameters),
            parameterTypes: Object.fromEntries(
              Object.entries(data.parameterTypes).map(([param, types]) => [
                param,
                Array.from(types),
              ])
            ),
          },
        ])
      ),
    };
  }

  /**
   * Get the current API contract for a component
   */
  private async getCurrentContract(componentId: string) {
    return this.prisma.apiContract.findFirst({
      where: { componentId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }
}
