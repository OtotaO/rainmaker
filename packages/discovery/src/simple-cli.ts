#!/usr/bin/env bun
/**
 * Simplified CLI for testing the Discovery Engine
 * 
 * This bypasses the complex type system to demonstrate core functionality.
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { generateEmbedding, cosineSimilarity } from './services/embedding';

// Simple types without Zod
interface Component {
  metadata: {
    id: string;
    name: string;
    description: string;
    category: string;
    technical: {
      language: string;
      framework?: string;
      dependencies: string[];
      patterns: string[];
    };
  };
  code: {
    raw: string;
  };
}

interface SearchResult {
  component: Component;
  score: number;
  reasoning: string;
}

class SimpleDiscoveryEngine {
  private components: Map<string, Component> = new Map();
  private embeddings: Array<{ id: string; embedding: number[] }> = [];
  private dataDir: string;
  
  constructor(dataDir: string = './data/discovery') {
    this.dataDir = dataDir;
  }
  
  async initialize(): Promise<void> {
    // Ensure data directory exists
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
    
    // Try to load cached data
    try {
      await this.loadCachedComponents();
      console.log(`Loaded ${this.components.size} cached components`);
    } catch (error) {
      console.log('No cached components found, creating sample data...');
      await this.createSampleComponents();
    }
    
    // If still no components, force create them
    if (this.components.size === 0) {
      console.log('No components loaded, creating sample data...');
      await this.createSampleComponents();
    }
  }
  
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    console.log(`Searching for: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Calculate similarities
    const similarities = this.embeddings.map(item => {
      const component = this.components.get(item.id);
      if (!component) return null;
      
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      
      return {
        component,
        score,
        reasoning: this.generateReasoning(component, query, score),
      };
    }).filter((item): item is SearchResult => item !== null);
    
    // Sort by score and return top results
    similarities.sort((a, b) => b.score - a.score);
    
    return similarities.slice(0, limit);
  }
  
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
  
  private async createSampleComponents(): Promise<void> {
    const sampleComponents: Component[] = [
      {
        metadata: {
          id: 'sample-googleoauthprovider',
          name: 'GoogleOAuthProvider',
          description: 'React component for Google OAuth authentication',
          category: 'auth',
          technical: {
            language: 'typescript',
            framework: 'react',
            dependencies: ['react'],
            patterns: ['authentication', 'oauth', 'context', 'hooks'],
          },
        },
        code: {
          raw: `
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
        },
      },
      {
        metadata: {
          id: 'sample-jwtauthmiddleware',
          name: 'JWTAuthMiddleware',
          description: 'Express middleware for JWT token authentication',
          category: 'auth',
          technical: {
            language: 'typescript',
            framework: 'express',
            dependencies: ['jsonwebtoken', 'express'],
            patterns: ['authentication', 'jwt', 'middleware', 'async'],
          },
        },
        code: {
          raw: `
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

  generateToken(payload: object): string {
    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.expiresIn,
      issuer: this.config.issuer,
    });
  }

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
}
          `,
        },
      },
      {
        metadata: {
          id: 'sample-stripepaymentprocessor',
          name: 'StripePaymentProcessor',
          description: 'TypeScript class for handling Stripe payments',
          category: 'payments',
          technical: {
            language: 'typescript',
            dependencies: ['stripe'],
            patterns: ['payments', 'async', 'webhooks', 'api-calls'],
          },
        },
        code: {
          raw: `
import Stripe from 'stripe';

interface PaymentConfig {
  secretKey: string;
  webhookSecret?: string;
  apiVersion?: Stripe.LatestApiVersion;
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

  async createPaymentIntent(options: {
    amount: number;
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency,
        customer: options.customerId,
        metadata: options.metadata,
        payment_method_types: ['card'],
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new Error(\`Failed to create payment intent: \${error.message}\`);
    }
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      throw new Error(\`Failed to create customer: \${error.message}\`);
    }
  }
}
          `,
        },
      },
    ];

    // Index each sample component
    for (const component of sampleComponents) {
      this.components.set(component.metadata.id, component);
      
      // Generate and store embedding
      const embeddingText = `${component.metadata.name} ${component.metadata.description} ${component.metadata.category} ${component.metadata.technical.patterns.join(' ')}`;
      const embedding = await generateEmbedding(embeddingText);
      this.embeddings.push({
        id: component.metadata.id,
        embedding,
      });
      
      console.log(`Indexed sample component: ${component.metadata.name}`);
    }
    
    // Save to cache
    await this.saveCachedComponents();
  }
  
  private async loadCachedComponents(): Promise<void> {
    const componentsPath = join(this.dataDir, 'components.json');
    const embeddingsPath = join(this.dataDir, 'embeddings.json');
    
    if (existsSync(componentsPath) && existsSync(embeddingsPath)) {
      const componentsData = JSON.parse(await readFile(componentsPath, 'utf-8'));
      const embeddingsData = JSON.parse(await readFile(embeddingsPath, 'utf-8'));
      
      // Restore components
      for (const [id, componentData] of Object.entries(componentsData)) {
        this.components.set(id, componentData as Component);
      }
      
      // Restore embeddings
      this.embeddings = embeddingsData;
    }
  }
  
  private async saveCachedComponents(): Promise<void> {
    const componentsPath = join(this.dataDir, 'components.json');
    const embeddingsPath = join(this.dataDir, 'embeddings.json');
    
    // Convert components map to object
    const componentsData = Object.fromEntries(this.components.entries());
    
    await writeFile(componentsPath, JSON.stringify(componentsData, null, 2));
    await writeFile(embeddingsPath, JSON.stringify(this.embeddings, null, 2));
  }
}

async function main() {
  console.log('🔍 Rainmaker Discovery Engine Demo (Simplified)\n');
  
  try {
    // Initialize the discovery engine
    const engine = new SimpleDiscoveryEngine('./data/discovery');
    
    console.log('Initializing discovery engine...');
    await engine.initialize();
    
    // Test search functionality
    console.log('\n--- Testing Search ---');
    
    const queries = [
      'Google OAuth authentication',
      'JWT token middleware',
      'Stripe payment processing',
      'user authentication',
      'payment integration',
    ];
    
    for (const query of queries) {
      console.log(`\nSearching for: "${query}"`);
      
      try {
        const results = await engine.search(query, 3);
        
        if (results.length === 0) {
          console.log('  No results found');
          continue;
        }
        
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.component.metadata.name}`);
          console.log(`     Score: ${result.score.toFixed(3)}`);
          console.log(`     Reason: ${result.reasoning}`);
          console.log(`     Description: ${result.component.metadata.description}`);
          console.log(`     Framework: ${result.component.metadata.technical.framework || 'None'}`);
          console.log(`     Dependencies: ${result.component.metadata.technical.dependencies.join(', ')}`);
        });
      } catch (error) {
        console.error(`  Error searching: ${error}`);
      }
    }
    
    console.log('\n✅ Discovery Engine demo completed successfully!');
    console.log('\nThis demonstrates:');
    console.log('- ✅ Component indexing with sample auth and payment libraries');
    console.log('- ✅ Semantic search using embeddings');
    console.log('- ✅ Similarity scoring and ranking');
    console.log('- ✅ Pattern-based matching');
    console.log('- ✅ Caching for performance');
    
    console.log('\nNext steps would be:');
    console.log('- 🔧 Add real GitHub indexing');
    console.log('- 🔧 Implement code adaptation');
    console.log('- 🔧 Add Socratic dialogue');
    console.log('- 🔧 Build web interface');
    
  } catch (error) {
    console.error('❌ Error running discovery engine:', error);
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
