/**
 * Core Discovery Engine
 * 
 * This is the main orchestrator that demonstrates semantic code search and adaptation.
 * Built as a monolithic service that can be split later once we prove the concept works.
 */

import { z } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Octokit } from '@octokit/rest';
import type { 
  Component, 
  ComponentMetadata,
  UserContext, 
  AdaptedComponent,
  AdaptationPlan 
} from '../types';
import { ComponentSchema } from '../types';
import { analyzeCode } from '../services/code-analyzer';
import { generateEmbedding, cosineSimilarity } from '../services/embedding';
import { GitHubIndexer } from '../services/github-indexer';
import { logger } from '../utils/logger';

/**
 * Configuration for the discovery engine
 */
const DiscoveryConfigSchema = z.object({
  githubToken: z.string().optional(),
  dataDir: z.string().default('./data'),
  maxComponents: z.number().default(50),
});

type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>;

/**
 * Search result with similarity score
 */
const SearchResultSchema = z.object({
  component: ComponentSchema,
  score: z.number().describe('Similarity score 0-1'),
  reasoning: z.string().describe('Why this component matched'),
});

type SearchResult = z.infer<typeof SearchResultSchema>;

export class DiscoveryEngine {
  private config: DiscoveryConfig;
  private components: Map<string, Component> = new Map();
  private embeddings: Array<{ id: string; embedding: number[] }> = [];
  private octokit?: Octokit;
  
  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = DiscoveryConfigSchema.parse(config);
    
    if (this.config.githubToken) {
      this.octokit = new Octokit({ auth: this.config.githubToken });
    }
    
    // Ensure data directory exists
    this.ensureDataDir();
  }
  
  /**
   * Initialize the engine by loading cached components
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Discovery Engine...');
    
    try {
      await this.loadCachedComponents();
      logger.info(`Loaded ${this.components.size} cached components`);
    } catch (error) {
      logger.warn('No cached components found, starting fresh');
    }
    
    // If we have no components, index some sample ones
    if (this.components.size === 0) {
      logger.info('No components found, indexing sample authentication libraries...');
      await this.indexSampleComponents();
    }
  }
  
  /**
   * Search for components using semantic similarity
   */
  async search(query: string, context?: UserContext, limit: number = 10): Promise<SearchResult[]> {
    logger.info(`Searching for: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Calculate similarities
    const similarities = this.embeddings.map(item => {
      const component = this.components.get(item.id);
      if (!component) return null;
      
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      
      // Apply context-based boosting
      let boostedScore = score;
      if (context) {
        boostedScore = this.applyContextBoost(component, context, score);
      }
      
      return {
        component,
        score: boostedScore,
        reasoning: this.generateReasoning(component, query, score),
      };
    }).filter((item): item is SearchResult => item !== null);
    
    // Sort by score and return top results
    similarities.sort((a, b) => b.score - a.score);
    
    const results = similarities.slice(0, limit);
    
    logger.info(`Found ${results.length} results, top score: ${results[0]?.score.toFixed(3)}`);
    
    return results;
  }
  
  /**
   * Adapt a component for the user's context
   */
  async adaptComponent(
    componentId: string, 
    context: UserContext,
    customizations: Record<string, string> = {}
  ): Promise<AdaptedComponent> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }
    
    logger.info(`Adapting component: ${component.metadata.name}`);
    
    // Generate adaptation plan
    const plan = this.generateAdaptationPlan(component, context, customizations);
    
    // Apply the adaptations
    const adaptedCode = this.applyAdaptations(component.code.raw, plan);
    
    // Generate additional files if needed
    const additionalFiles = this.generateAdditionalFiles(component, context, plan);
    
    // Create the adapted component
    const adapted: AdaptedComponent = {
      original: component.metadata,
      adapted: {
        code: adaptedCode,
        files: [
          {
            path: this.generateFileName(component, context),
            content: adaptedCode,
            description: `Adapted ${component.metadata.name} for your project`,
          },
          ...additionalFiles,
        ],
        instructions: {
          install: this.generateInstallInstructions(component, context),
          setup: this.generateSetupInstructions(component, context),
          usage: this.generateUsageInstructions(component, context),
        },
        attribution: this.generateAttribution(component),
      },
      plan,
    };
    
    return adapted;
  }
  
  /**
   * Index components from GitHub repositories
   */
  async indexFromGitHub(categories: string[] = ['auth', 'payments'], options: {
    minStars?: number;
    limit?: number;
  } = {}): Promise<void> {
    if (!this.config.githubToken) {
      logger.warn('No GitHub token provided, falling back to sample components');
      await this.indexSampleComponents();
      return;
    }

    const { minStars = 100, limit = 50 } = options;
    logger.info('Starting GitHub indexing...', { categories, minStars, limit });

    const indexer = new GitHubIndexer(this.config.githubToken);
    
    for (const category of categories) {
      try {
        logger.info(`Indexing category: ${category}`);
        
        const components = await indexer.indexCategory(category, {
          minStars,
          limit: Math.floor(limit / categories.length),
        });

        // Add components to our collection
        for (const component of components) {
          this.components.set(component.metadata.id, component);
          
          // Generate and store embedding
          const embeddingText = `${component.metadata.name} ${component.metadata.description} ${component.metadata.category} ${component.metadata.technical.patterns.join(' ')}`;
          const embedding = await generateEmbedding(embeddingText);
          this.embeddings.push({
            id: component.metadata.id,
            embedding,
          });
          
          logger.info(`Indexed GitHub component: ${component.metadata.name} from ${component.metadata.source.repo}`);
        }
        
        logger.info(`Completed indexing ${components.length} components for category: ${category}`);
      } catch (error) {
        logger.error(`Failed to index category ${category}:`, error);
      }
    }

    // Save to cache
    await this.saveCachedComponents();
    logger.info(`GitHub indexing complete. Total components: ${this.components.size}`);
  }

  /**
   * Index sample components for demonstration
   */
  private async indexSampleComponents(): Promise<void> {
    // Sample authentication components to demonstrate the concept
    const sampleComponents = [
      {
        name: 'GoogleOAuthProvider',
        description: 'React component for Google OAuth authentication',
        code: `
import React, { createContext, useContext, useState, useEffect } from 'react';

interface GoogleAuthConfig {
  clientId: string;
  redirectUri?: string;
  scopes?: string[];
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  }
  return context;
};

export const GoogleAuthProvider: React.FC<{
  config: GoogleAuthConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Google Auth
    const initGoogleAuth = async () => {
      try {
        await window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: handleCredentialResponse,
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        setLoading(false);
      }
    };

    initGoogleAuth();
  }, [config.clientId]);

  const handleCredentialResponse = (response: any) => {
    // Decode JWT token
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    setUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
  };

  const signIn = async () => {
    setLoading(true);
    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    window.google.accounts.id.disableAutoSelect();
  };

  return (
    <GoogleAuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </GoogleAuthContext.Provider>
  );
};
        `,
        category: 'auth',
        framework: 'react',
        patterns: ['authentication', 'oauth', 'context', 'hooks'],
        dependencies: ['react'],
        apis: ['accounts.google.com'],
      },
      {
        name: 'JWTAuthMiddleware',
        description: 'Express middleware for JWT token authentication',
        code: `
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTConfig {
  secret: string;
  algorithm?: jwt.Algorithm;
  expiresIn?: string;
  issuer?: string;
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

export class JWTAuthMiddleware {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = {
      algorithm: 'HS256',
      expiresIn: '24h',
      ...config,
    };
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(payload: object): string {
    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.expiresIn,
      issuer: this.config.issuer,
    });
  }

  /**
   * Middleware to verify JWT tokens
   */
  verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm!],
        issuer: this.config.issuer,
      });
      
      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      } else {
        return res.status(500).json({ error: 'Token verification failed' });
      }
    }
  };

  /**
   * Optional middleware for routes that can work with or without auth
   */
  optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm!],
        issuer: this.config.issuer,
      });
      
      req.user = decoded;
    } catch (error) {
      // Ignore errors for optional auth
    }
    
    next();
  };
}

// Usage example:
// const authMiddleware = new JWTAuthMiddleware({
//   secret: process.env.JWT_SECRET!,
//   expiresIn: '7d',
// });
// 
// app.post('/login', (req, res) => {
//   // Validate user credentials
//   const token = authMiddleware.generateToken({ userId: user.id });
//   res.json({ token });
// });
//
// app.get('/protected', authMiddleware.verifyToken, (req, res) => {
//   res.json({ user: req.user });
// });
        `,
        category: 'auth',
        framework: 'express',
        patterns: ['authentication', 'jwt', 'middleware', 'async'],
        dependencies: ['jsonwebtoken', 'express'],
        apis: [],
      },
      {
        name: 'StripePaymentProcessor',
        description: 'TypeScript class for handling Stripe payments',
        code: `
import Stripe from 'stripe';

interface PaymentConfig {
  secretKey: string;
  webhookSecret?: string;
  apiVersion?: Stripe.LatestApiVersion;
}

interface CreatePaymentIntentOptions {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
}

export class StripePaymentProcessor {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(config: PaymentConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion || '2023-10-16',
    });
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency,
        customer: options.customerId,
        metadata: options.metadata,
        payment_method_types: options.paymentMethodTypes || ['card'],
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new Error(\`Failed to create payment intent: \${error.message}\`);
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      return customer;
    } catch (error) {
      throw new Error(\`Failed to create customer: \${error.message}\`);
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(options: CreateSubscriptionOptions): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: options.customerId,
        items: [{ price: options.priceId }],
        metadata: options.metadata,
        trial_period_days: options.trialPeriodDays,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      throw new Error(\`Failed to create subscription: \${error.message}\`);
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(body: string, signature: string): Promise<Stripe.Event> {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);
      
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(\`Unhandled event type: \${event.type}\`);
      }

      return event;
    } catch (error) {
      throw new Error(\`Webhook verification failed: \${error.message}\`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Implement your payment success logic here
    console.log('Payment succeeded:', paymentIntent.id);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Implement your payment failure logic here
    console.log('Payment failed:', paymentIntent.id);
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    // Implement your subscription change logic here
    console.log('Subscription changed:', subscription.id);
  }
}

// Usage example:
// const paymentProcessor = new StripePaymentProcessor({
//   secretKey: process.env.STRIPE_SECRET_KEY!,
//   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
// });
//
// const paymentIntent = await paymentProcessor.createPaymentIntent({
//   amount: 2000, // $20.00
//   currency: 'usd',
//   customerId: 'cus_123',
// });
        `,
        category: 'payments',
        framework: undefined,
        patterns: ['payments', 'async', 'webhooks', 'api-calls'],
        dependencies: ['stripe'],
        apis: ['api.stripe.com'],
      },
    ];

    // Index each sample component
    for (const sample of sampleComponents) {
      try {
        const component = await this.createComponentFromSample(sample);
        this.components.set(component.metadata.id, component);
        
        // Generate and store embedding
        const embeddingText = `${component.metadata.name} ${component.metadata.description} ${component.metadata.category} ${component.metadata.technical.patterns.join(' ')}`;
        const embedding = await generateEmbedding(embeddingText);
        this.embeddings.push({
          id: component.metadata.id,
          embedding,
        });
        
        logger.info(`Indexed sample component: ${component.metadata.name}`);
      } catch (error) {
        logger.error(`Failed to index sample component ${sample.name}:`, String(error));
      }
    }
    
    // Save to cache
    await this.saveCachedComponents();
  }
  
  /**
   * Create a component from sample data
   */
  private async createComponentFromSample(sample: any): Promise<Component> {
    // Analyze the code
    const analysis = await analyzeCode(sample.code, `${sample.name}.tsx`);
    if (!analysis) {
      throw new Error(`Failed to analyze sample code for ${sample.name}`);
    }
    
    // Create metadata
    const metadata: ComponentMetadata = {
      id: `sample-${sample.name.toLowerCase()}`,
      name: sample.name,
      description: sample.description,
      
      source: {
        type: 'github',
        repo: 'rainmaker-discovery/samples',
        path: `${sample.name}.tsx`,
        commit: 'sample',
        url: `https://github.com/rainmaker-discovery/samples/blob/main/${sample.name}.tsx`,
        license: 'MIT',
      },
      
      quality: {
        stars: 100,
        forks: 10,
        lastUpdated: new Date().toISOString(),
        hasTests: false,
        hasDocumentation: true,
      },
      
      technical: {
        language: 'typescript',
        framework: sample.framework,
        dependencies: sample.dependencies,
        apis: sample.apis,
        patterns: sample.patterns,
      },
      
      embedding: [], // Will be filled later
      tags: [...sample.patterns, sample.category],
      category: sample.category,
    };
    
    // Create the component
    const component: Component = {
      metadata,
      code: {
        raw: sample.code,
        ast: analysis.ast,
        normalized: analysis.normalizedCode,
      },
      prompts: {
        primary: analysis.primaryPrompt,
        variants: analysis.promptVariants,
        questions: analysis.configurableVariables.map(v => `Do you need to configure ${v.name}?`),
      },
      customization: {
        variables: analysis.configurableVariables,
        injectionPoints: analysis.injectionPoints,
        patterns: analysis.adaptablePatterns,
      },
    };
    
    return component;
  }
  
  /**
   * Apply context-based boosting to search scores
   */
  private applyContextBoost(component: Component, context: UserContext, baseScore: number): number {
    let boost = 1.0;
    
    // Framework matching
    if (context.project.framework && component.metadata.technical.framework === context.project.framework) {
      boost += 0.3;
    }
    
    // Language matching
    if (component.metadata.technical.language === context.project.language) {
      boost += 0.2;
    }
    
    // Naming convention matching
    const componentNaming = component.customization.patterns.find(p => p.type === 'naming');
    if (componentNaming && componentNaming.current === context.project.conventions.naming) {
      boost += 0.1;
    }
    
    return Math.min(baseScore * boost, 1.0);
  }
  
  /**
   * Generate reasoning for why a component matched
   */
  private generateReasoning(component: Component, query: string, score: number): string {
    const reasons: string[] = [];
    
    if (score > 0.8) {
      reasons.push('Strong semantic match');
    } else if (score > 0.6) {
      reasons.push('Good semantic match');
    } else {
      reasons.push('Partial match');
    }
    
    // Check for keyword matches
    const queryLower = query.toLowerCase();
    const componentText = `${component.metadata.name} ${component.metadata.description}`.toLowerCase();
    
    if (componentText.includes(queryLower)) {
      reasons.push('contains query keywords');
    }
    
    // Check for pattern matches
    const matchingPatterns = component.metadata.technical.patterns.filter(pattern => 
      queryLower.includes(pattern) || pattern.includes(queryLower)
    );
    
    if (matchingPatterns.length > 0) {
      reasons.push(`matches patterns: ${matchingPatterns.join(', ')}`);
    }
    
    return reasons.join(', ');
  }
  
  /**
   * Generate adaptation plan
   */
  private generateAdaptationPlan(
    component: Component, 
    context: UserContext, 
    customizations: Record<string, string>
  ): AdaptationPlan {
    const transformations: AdaptationPlan['transformations'] = [];
    
    // Naming convention transformation
    const componentNaming = component.customization.patterns.find(p => p.type === 'naming');
    if (componentNaming && componentNaming.current !== context.project.conventions.naming) {
      transformations.push({
        type: 'pattern',
        pattern: 'naming',
        from: componentNaming.current,
        to: context.project.conventions.naming,
      });
    }
    
    // Import style transformation
    const componentImports = component.customization.patterns.find(p => p.type === 'imports');
    if (componentImports && componentImports.current !== context.project.conventions.imports) {
      transformations.push({
        type: 'pattern',
        pattern: 'imports',
        from: componentImports.current,
        to: context.project.conventions.imports,
      });
    }
    
    // Apply customizations
    for (const [key, value] of Object.entries(customizations)) {
      const variable = component.customization.variables.find(v => v.name === key);
      if (variable) {
        transformations.push({
          type: 'configure',
          variable: key,
          value,
        });
      }
    }
    
    return {
      component: component.metadata.id,
      transformations,
    };
  }
  
  /**
   * Apply adaptations to code
   */
  private applyAdaptations(code: string, plan: AdaptationPlan): string {
    let adaptedCode = code;
    
    for (const transformation of plan.transformations) {
      switch (transformation.type) {
        case 'pattern':
          if (transformation.pattern === 'naming') {
            adaptedCode = this.transformNamingConvention(adaptedCode, transformation.from, transformation.to);
          }
          break;
          
        case 'configure':
          adaptedCode = this.configureVariable(adaptedCode, transformation.variable, transformation.value);
          break;
          
        // Add more transformation types as needed
      }
    }
    
    return adaptedCode;
  }
  
  /**
   * Transform naming convention
   */
  private transformNamingConvention(code: string, from: string, to: string): string {
    // This is a simplified transformation - in production you'd use AST manipulation
    if (from === 'camelCase' && to === 'snake_case') {
      return code.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    } else if (from === 'snake_case' && to === 'camelCase') {
      return code.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    
    return code;
  }
  
  /**
   * Configure a variable in the code
   */
  private configureVariable(code: string, variable: string, value: string): string {
    // Simple string replacement - in production you'd use AST manipulation
    const patterns = [
      new RegExp(`${variable}:\\s*['"][^'"]*['"]`, 'g'),
      new RegExp(`${variable}\\s*=\\s*['"][^'"]*['"]`, 'g'),
    ];
    
    for (const pattern of patterns) {
      code = code.replace(pattern, `${variable}: '${value}'`);
    }
    
    return code;
  }
  
  /**
   * Generate additional files
   */
  private generateAdditionalFiles(component: Component, context: UserContext, plan: AdaptationPlan): Array<{
    path: string;
    content: string;
    description: string;
  }> {
    const files: Array<{ path: string; content: string; description: string }> = [];
    
    // Generate package.json dependencies if needed
    if (component.metadata.technical.dependencies.length > 0) {
      const packageJson = {
        dependencies: component.metadata.technical.dependencies.reduce((acc, dep) => {
          acc[dep] = 'latest';
          return acc;
        }, {} as Record<string, string>),
      };
      
      files.push({
        path: 'package-additions.json',
        content: JSON.stringify(packageJson, null, 2),
        description: 'Dependencies to add to your package.json',
      });
    }
    
    // Generate environment variables template
    const envVars = component.customization.variables
      .filter(v => v.name.toUpperCase().includes('KEY') || v.name.toUpperCase().includes('SECRET'))
      .map(v => `${v.name.toUpperCase()}=${v.defaultValue || 'your_value_here'}`)
      .join('\n');
    
    if (envVars) {
      files.push({
        path: '.env.example',
        content: envVars,
        description: 'Environment variables needed for this component',
      });
    }
    
    return files;
  }
  
  /**
   * Generate file name based on component and context
   */
  private generateFileName(component: Component, context: UserContext): string {
    const baseName = component.metadata.name;
    const extension = context.project.language === 'typescript' ? '.ts' : '.js';
    
    if (component.metadata.technical.framework === 'react') {
      return `${baseName}.tsx`;
    }
    
    return `${baseName}${extension}`;
  }
  
  /**
   * Generate install instructions
   */
  private generateInstallInstructions(component: Component, context: UserContext): string[] {
    const instructions: string[] = [];
    
    if (component.metadata.technical.dependencies.length > 0) {
      const packageManager = context.project.packageManager || 'npm';
      const deps = component.metadata.technical.dependencies.join(' ');
      
      switch (packageManager) {
        case 'bun':
          instructions.push(`bun add ${deps}`);
          break;
        case 'yarn':
          instructions.push(`yarn add ${deps}`);
          break;
        case 'pnpm':
          instructions.push(`pnpm add ${deps}`);
          break;
        default:
          instructions.push(`npm install ${deps}`);
      }
    }
    
    return instructions;
  }
  
  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(component: Component, context: UserContext): string[] {
    const instructions: string[] = [];
    
    // Environment variables
    const envVars = component.customization.variables.filter(v => 
      v.name.toUpperCase().includes('KEY') || v.name.toUpperCase().includes('SECRET')
    );
    
    if (envVars.length > 0) {
      instructions.push('Configure environment variables in your .env file');
      envVars.forEach(v => {
        instructions.push(`  ${v.name.toUpperCase()}=${v.defaultValue || 'your_value_here'}`);
      });
    }
    
    // Framework-specific setup
    if (component.metadata.technical.framework === 'react') {
      instructions.push('Wrap your app with the provider component');
    }
    
    return instructions;
  }
  
  /**
   * Generate usage instructions
   */
  private generateUsageInstructions(component: Component, context: UserContext): string {
    const examples: string[] = [];
    
    if (component.metadata.technical.framework === 'react') {
      examples.push(`import { ${component.metadata.name} } from './${this.generateFileName(component, context)}';`);
      examples.push('');
      examples.push('// Use in your component:');
      examples.push(`<${component.metadata.name} />`);
    } else {
      examples.push(`import { ${component.metadata.name} } from './${this.generateFileName(component, context)}';`);
      examples.push('');
      examples.push('// Create an instance:');
      examples.push(`const instance = new ${component.metadata.name}(config);`);
    }
    
    return examples.join('\n');
  }
  
  /**
   * Generate attribution text
   */
  private generateAttribution(component: Component): string {
    return `Based on ${component.metadata.name} from ${component.metadata.source.repo} (${component.metadata.source.license} license)`;
  }
  
  /**
   * Ensure data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    if (!existsSync(this.config.dataDir)) {
      await mkdir(this.config.dataDir, { recursive: true });
    }
  }
  
  /**
   * Load cached components from disk
   */
  private async loadCachedComponents(): Promise<void> {
    const componentsPath = join(this.config.dataDir, 'components.json');
    const embeddingsPath = join(this.config.dataDir, 'embeddings.json');
    
    if (existsSync(componentsPath) && existsSync(embeddingsPath)) {
      const componentsData = JSON.parse(await readFile(componentsPath, 'utf-8'));
      const embeddingsData = JSON.parse(await readFile(embeddingsPath, 'utf-8'));
      
      // Restore components
      for (const [id, componentData] of Object.entries(componentsData)) {
        const validated = ComponentSchema.safeParse(componentData);
        if (validated.success) {
          this.components.set(id, validated.data);
        }
      }
      
      // Restore embeddings
      this.embeddings = embeddingsData;
    }
  }
  
  /**
   * Save cached components to disk
   */
  private async saveCachedComponents(): Promise<void> {
    const componentsPath = join(this.config.dataDir, 'components.json');
    const embeddingsPath = join(this.config.dataDir, 'embeddings.json');
    
    // Convert components map to object
    const componentsData = Object.fromEntries(this.components.entries());
    
    await writeFile(componentsPath, JSON.stringify(componentsData, null, 2));
    await writeFile(embeddingsPath, JSON.stringify(this.embeddings, null, 2));
  }
}
