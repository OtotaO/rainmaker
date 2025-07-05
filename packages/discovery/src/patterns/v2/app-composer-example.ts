/**
 * Application Composer Example
 * 
 * Demonstrates how to build complete applications from patterns
 * without generating a single line of code.
 * 
 * Following Carmack: "The best code is no code. The second best is code that already works."
 */

import express from 'express';
import { PatternComposer, PatternComposition } from '../pattern-v2';
import { authJwtV2 } from './auth-jwt-v2';

// Example: Building a SaaS API
const saasApiComposition: PatternComposition = {
  name: 'my-saas-api',
  description: 'Complete SaaS API with auth, payments, and more',
  patterns: [
    {
      instanceId: 'auth',
      patternId: 'auth-jwt-v2',
      config: {
        accessTokenSecret: process.env['JWT_ACCESS_SECRET'] || 'dev-access-secret-min-32-characters!',
        refreshTokenSecret: process.env['JWT_REFRESH_SECRET'] || 'dev-refresh-secret-min-32-characters!',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        bcryptRounds: 10,
        tokenPrefix: 'Bearer '
      }
    }
    // Future patterns would be added here:
    // - payment-stripe-v2
    // - storage-s3-v2
    // - email-sendgrid-v2
    // - rate-limit-v2
  ]
};

/**
 * The key insight: We're not generating an Express app.
 * We're composing pre-built, tested modules that work together.
 */
export async function createSaaSApp() {
  const composer = new PatternComposer();
  
  // Register available patterns
  composer.register(authJwtV2);
  // composer.register(paymentStripeV2);
  // composer.register(storageS3V2);
  
  // Compose the application
  const app = await composer.compose(saasApiComposition);
  
  // Create Express server
  const server = express();
  server.use(express.json());
  
  // Mount pattern routes
  for (const [id, instance] of app.instances) {
    console.log(`Mounting pattern: ${id}`);
    
    // Add routes
    if (instance.routes) {
      for (const route of instance.routes) {
        const handlers = [
          ...(route.middleware || []),
          route.handler
        ];
        
        switch (route.method) {
          case 'GET':
            server.get(route.path, ...handlers);
            break;
          case 'POST':
            server.post(route.path, ...handlers);
            break;
          case 'PUT':
            server.put(route.path, ...handlers);
            break;
          case 'DELETE':
            server.delete(route.path, ...handlers);
            break;
          case 'PATCH':
            server.patch(route.path, ...handlers);
            break;
        }
      }
    }
  }
  
  // Health check
  server.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      app: app.name,
      patterns: Array.from(app.instances.keys())
    });
  });
  
  return { app, server };
}

/**
 * Zero Code Generation Example
 * 
 * This shows how to build applications without generating code.
 * Every line here is either:
 * 1. Configuration (data, not code)
 * 2. Composition (connecting existing modules)
 * 3. Framework glue (minimal and standard)
 */
export async function runExample() {
  const { app, server } = await createSaaSApp();
  
  const port = process.env['PORT'] || 3000;
  server.listen(port, () => {
    console.log(`
🚀 SaaS API running on port ${port}

Available endpoints:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET  /auth/me
- GET  /health

No code was generated. Only proven patterns were composed.
    `);
  });
}

/**
 * The Philosophy in Practice
 * 
 * 1. **No Code Generation**: We don't generate auth code. We use a proven auth module.
 * 2. **Configuration Over Transformation**: Change behavior through config, not AST manipulation.
 * 3. **Composition Over Inheritance**: Patterns work together through clean interfaces.
 * 4. **Explicit Over Magic**: You can see exactly what's happening.
 * 
 * This approach eliminates entire categories of bugs:
 * - No generated code to debug
 * - No AST transformation errors
 * - No version skew between generated and source
 * - No "works on my machine" issues
 */

// Run directly
if (require.main === module) {
  runExample().catch(console.error);
}
