/**
 * Pattern V2: Configuration-Driven Patterns
 * 
 * Following Carmack's philosophy: Don't generate code, configure it.
 * Each pattern is a complete, working module that adapts through configuration,
 * not code transformation.
 */

export interface PatternV2 {
  id: string;
  name: string;
  description: string;
  
  // The pattern is a factory function, not raw code
  // This eliminates AST transformation entirely
  factory: (config: PatternConfig) => PatternModule;
  
  // Configuration schema for runtime adaptation
  configSchema: {
    required: Record<string, ConfigField>;
    optional: Record<string, ConfigField>;
  };
  
  // Dependencies are explicit and versioned
  dependencies: {
    npm: Record<string, string>;
    patterns: string[]; // Other patterns this depends on
  };
  
  // Simple, clear examples
  examples: Example[];
}

export interface PatternConfig {
  // All configuration is data, not code
  [key: string]: string | number | boolean | Record<string, any>;
}

export interface PatternModule {
  // Every pattern exports a consistent interface
  initialize: (context: AppContext) => Promise<void>;
  
  // Patterns expose their functionality through a clean API
  api: Record<string, Function>;
  
  // Middleware/hooks for framework integration
  middleware?: any[];
  
  // Routes for web frameworks
  routes?: RouteDefinition[];
  
  // Cleanup function
  destroy?: () => Promise<void>;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  default?: any;
  validation?: (value: any) => boolean;
}

export interface Example {
  name: string;
  description: string;
  config: PatternConfig;
  usage: string; // Code showing how to use it
}

export interface AppContext {
  env: Record<string, string>;
  services: Map<string, any>;
  logger: Logger;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: Function;
  middleware?: any[];
}

export interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

/**
 * Pattern Composer: Combines patterns into applications
 * No code generation - just composition and configuration
 */
export class PatternComposer {
  private patterns: Map<string, PatternV2> = new Map();
  private instances: Map<string, PatternModule> = new Map();
  
  register(pattern: PatternV2): void {
    this.patterns.set(pattern.id, pattern);
  }
  
  async compose(composition: PatternComposition): Promise<Application> {
    const context: AppContext = {
      env: process.env as Record<string, string>,
      services: new Map(),
      logger: this.createLogger(composition.name)
    };
    
    // Initialize patterns in dependency order
    const order = this.resolveDependencyOrder(composition.patterns);
    
    for (const patternUse of order) {
      const pattern = this.patterns.get(patternUse.patternId);
      if (!pattern) {
        throw new Error(`Pattern not found: ${patternUse.patternId}`);
      }
      
      // Validate configuration
      this.validateConfig(pattern, patternUse.config);
      
      // Create instance
      const instance = pattern.factory(patternUse.config);
      await instance.initialize(context);
      
      // Register services for other patterns to use
      context.services.set(patternUse.instanceId, instance.api);
      this.instances.set(patternUse.instanceId, instance);
    }
    
    return {
      name: composition.name,
      instances: this.instances,
      start: () => this.startApplication(composition),
      stop: () => this.stopApplication()
    };
  }
  
  private validateConfig(pattern: PatternV2, config: PatternConfig): void {
    // Check required fields
    for (const [key, field] of Object.entries(pattern.configSchema.required)) {
      if (!(key in config)) {
        throw new Error(`Missing required config: ${key}`);
      }
      if (field.validation && !field.validation(config[key])) {
        throw new Error(`Invalid config value for ${key}`);
      }
    }
    
    // Validate optional fields if present
    for (const [key, field] of Object.entries(pattern.configSchema.optional)) {
      if (key in config && field.validation && !field.validation(config[key])) {
        throw new Error(`Invalid config value for ${key}`);
      }
    }
  }
  
  private resolveDependencyOrder(patterns: PatternUse[]): PatternUse[] {
    // Simple topological sort for dependency resolution
    const visited = new Set<string>();
    const order: PatternUse[] = [];
    
    const visit = (patternUse: PatternUse) => {
      if (visited.has(patternUse.instanceId)) return;
      visited.add(patternUse.instanceId);
      
      const pattern = this.patterns.get(patternUse.patternId);
      if (!pattern) return;
      
      // Visit dependencies first
      for (const depId of pattern.dependencies.patterns) {
        const dep = patterns.find(p => p.patternId === depId);
        if (dep) visit(dep);
      }
      
      order.push(patternUse);
    };
    
    patterns.forEach(visit);
    return order;
  }
  
  private createLogger(appName: string): Logger {
    const prefix = `[${appName}]`;
    return {
      info: (msg, meta) => console.log(prefix, msg, meta || ''),
      error: (msg, error) => console.error(prefix, msg, error || ''),
      warn: (msg, meta) => console.warn(prefix, msg, meta || ''),
      debug: (msg, meta) => console.debug(prefix, msg, meta || '')
    };
  }
  
  private async startApplication(composition: PatternComposition): Promise<void> {
    console.log(`Starting application: ${composition.name}`);
    // Application-specific startup logic
  }
  
  private async stopApplication(): Promise<void> {
    // Cleanup in reverse order
    const instances = Array.from(this.instances.values()).reverse();
    for (const instance of instances) {
      if (instance.destroy) {
        await instance.destroy();
      }
    }
    this.instances.clear();
  }
}

export interface PatternComposition {
  name: string;
  description: string;
  patterns: PatternUse[];
  deployment?: DeploymentConfig;
}

export interface PatternUse {
  instanceId: string; // Unique instance identifier
  patternId: string;  // References PatternV2.id
  config: PatternConfig;
}

export interface Application {
  name: string;
  instances: Map<string, PatternModule>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface DeploymentConfig {
  platform: 'vercel' | 'aws' | 'gcp' | 'docker';
  environment: Record<string, string>;
  resources?: {
    memory?: string;
    cpu?: string;
  };
}
