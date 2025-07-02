/**
 * Test the enhanced discovery service with all LLM integrations
 */

import { PrismaClient } from '@prisma/client';
import { createEnhancedDiscoveryService } from './services/discovery-service-enhanced';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { UserContext } from './types';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

// Mock user context
const mockUserContext: UserContext = {
  project: {
    language: 'typescript',
    framework: 'react',
    packageManager: 'npm',
    conventions: {
      naming: 'camelCase',
      imports: 'named',
      exports: 'named',
    },
  },
  dependencies: {
    'react': '^18.0.0',
    'typescript': '^5.0.0',
  },
  preferences: {
    style: 'functional',
    errorHandling: 'exceptions',
    asyncPattern: 'async-await',
  },
};

async function testEnhancedDiscovery() {
  console.log('🚀 Testing Enhanced Discovery Service\n');
  
  // Check required environment variables
  const githubToken = process.env.GITHUB_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!githubToken || !anthropicKey) {
    console.error('❌ Missing required environment variables');
    console.log('Please set GITHUB_TOKEN and ANTHROPIC_API_KEY in your .env file');
    return;
  }
  
  // Create mock Prisma client
  const prisma = new PrismaClient();
  
  // Create enhanced discovery service
  const discovery = createEnhancedDiscoveryService({
    prisma,
    githubToken,
    anthropicApiKey: anthropicKey,
    useEnhancedSearch: true,
    useEnhancedIndexer: true,
    qualityThresholds: {
      minOverallScore: 6,
      minCodeQuality: 5,
      minReliability: 5,
      minReusability: 6,
    },
  });
  
  try {
    // Test 1: Complete discovery flow with authentication
    console.log('📋 Test 1: Complete discovery flow for authentication\n');
    
    const query = 'I need user authentication for my React app';
    
    // Step 1: Get category suggestions
    console.log('1️⃣ Getting category suggestions...');
    const { suggestions } = await discovery.discover(query, mockUserContext);
    console.log('Suggested categories:', suggestions);
    
    // Step 2: Start dialogue for auth category
    console.log('\n2️⃣ Starting Socratic dialogue for "auth" category...');
    const firstQuestion = await discovery.startDialogue('auth', query, mockUserContext);
    
    if (firstQuestion) {
      console.log('\nFirst question:', firstQuestion.question);
      console.log('Options:', firstQuestion.options?.map(o => o.label));
      
      // Simulate dialogue responses
      const dialogueState = {
        originalQuery: query,
        category: 'auth',
        context: mockUserContext,
        responses: [] as string[],
      };
      
      // Answer: OAuth providers
      console.log('\n3️⃣ Simulating dialogue responses...');
      console.log('Q: What type of authentication?');
      console.log('A: OAuth with Google and GitHub');
      dialogueState.responses.push('OAuth with Google and GitHub');
      
      console.log('\nQ: Do you need session management?');
      console.log('A: Yes, with JWT tokens');
      dialogueState.responses.push('Yes, with JWT tokens');
      
      console.log('\nQ: Multi-factor authentication?');
      console.log('A: Not required initially');
      dialogueState.responses.push('Not required initially');
      
      // Step 3: Search with enhanced query refinement
      console.log('\n4️⃣ Searching with enhanced query refinement...');
      
      // Build a mock search request
      const searchRequest = {
        query,
        refined: {
          description: 'OAuth authentication with Google and GitHub providers, JWT session management',
          requirements: [
            'Support for Google OAuth',
            'Support for GitHub OAuth',
            'JWT token generation and validation',
            'React integration',
          ],
          constraints: ['No multi-factor authentication needed'],
        },
        context: mockUserContext,
        filters: {
          languages: ['typescript', 'javascript'],
          frameworks: ['react'],
          hasTests: true,
        },
      };
      
      // This would normally happen through continueDialogue, but we'll call search directly
      const components = await discovery.search(searchRequest, dialogueState.responses);
      
      console.log(`\nFound ${components.length} components after refinement:`);
      components.slice(0, 3).forEach((component, i) => {
        const quality = (component as any).qualityAssessment;
        console.log(`\n${i + 1}. ${component.metadata.name}`);
        console.log(`   Repo: ${component.metadata.source.repo}`);
        console.log(`   Stars: ${component.metadata.quality.stars}`);
        console.log(`   Framework: ${component.metadata.technical.framework || 'None'}`);
        if (quality) {
          console.log(`   Quality Score: ${quality.overall_score}/10`);
        }
      });
    }
    
    // Test 2: Index some components first (optional, takes time)
    const shouldIndex = false; // Set to true to test indexing
    if (shouldIndex) {
      console.log('\n\n📋 Test 2: Indexing high-quality components...');
      
      console.log('Indexing authentication components...');
      const authCount = await discovery.indexCategory('auth', {
        minStars: 1000,
        languages: ['typescript'],
        limit: 5,
      });
      console.log(`Indexed ${authCount} high-quality auth components`);
      
      console.log('\nIndexing payment components...');
      const paymentCount = await discovery.indexCategory('payments', {
        minStars: 500,
        limit: 3,
      });
      console.log(`Indexed ${paymentCount} high-quality payment components`);
    }
    
    // Test 3: Test search refinement confidence
    console.log('\n\n📋 Test 3: Testing search refinement confidence...');
    
    const vagueQuery = 'need some auth stuff';
    const vagueRequest = {
      query: vagueQuery,
      refined: {
        description: vagueQuery,
        requirements: [],
        constraints: [],
      },
      context: mockUserContext,
    };
    
    // Search with no dialogue responses (should use fallback)
    console.log('Searching with vague query and no dialogue...');
    const vagueResults = await discovery.search(vagueRequest, []);
    console.log(`Found ${vagueResults.length} components (using fallback search)`);
    
    console.log('\n✅ Enhanced discovery service test completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEnhancedDiscovery().catch(console.error);
