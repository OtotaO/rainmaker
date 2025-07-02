#!/usr/bin/env bun

/**
 * GitHub Indexing CLI Demo
 * 
 * Demonstrates the GitHub indexing functionality of the Rainmaker Discovery Engine.
 * This script shows how to index real components from GitHub repositories.
 */

import { DiscoveryEngine } from './core/discovery-engine';
import { logger } from './utils/logger';

async function main() {
  console.log('🔍 Rainmaker Discovery Engine - GitHub Indexing Demo\n');

  // Check for GitHub token
  const githubToken = process.env['GITHUB_TOKEN'];
  if (!githubToken) {
    console.log('⚠️  No GITHUB_TOKEN environment variable found.');
    console.log('   Set GITHUB_TOKEN to index real repositories, or continue with sample components.\n');
  }

  // Initialize discovery engine
  const engine = new DiscoveryEngine({
    githubToken,
    dataDir: './data/discovery',
    maxComponents: 100,
  });

  try {
    console.log('Initializing discovery engine...');
    await engine.initialize();

    if (githubToken) {
      console.log('\n--- GitHub Indexing ---\n');
      
      // Index authentication and payment components from GitHub
      await engine.indexFromGitHub(['auth', 'payments'], {
        minStars: 50,  // Lower threshold for demo
        limit: 20,     // Limit for demo
      });
    } else {
      console.log('\n--- Using Sample Components ---\n');
      console.log('GitHub token not provided, using sample components for demo.');
    }

    console.log('\n--- Testing Search ---\n');

    // Test searches
    const queries = [
      'Google OAuth authentication',
      'JWT token middleware', 
      'Stripe payment processing',
      'user authentication',
      'payment integration'
    ];

    for (const query of queries) {
      console.log(`Searching for: "${query}"`);
      const results = await engine.search(query, undefined, 3);
      
      results.forEach((result, index) => {
        const source = result.component.metadata.source;
        const isGitHub = source.type === 'github' && !source.repo.includes('samples');
        const sourceLabel = isGitHub ? `${source.repo}` : 'Sample';
        
        console.log(`  ${index + 1}. ${result.component.metadata.name}`);
        console.log(`     Score: ${result.score.toFixed(3)}`);
        console.log(`     Source: ${sourceLabel}`);
        console.log(`     Reason: ${result.reasoning}`);
        console.log(`     Description: ${result.component.metadata.description}`);
        console.log(`     Framework: ${result.component.metadata.technical.framework || 'None'}`);
        console.log(`     Dependencies: ${result.component.metadata.technical.dependencies.join(', ')}`);
        console.log('');
      });
    }

    console.log('✅ GitHub indexing demo completed successfully!\n');

    if (githubToken) {
      console.log('This demonstrates:');
      console.log('- ✅ Real GitHub repository indexing');
      console.log('- ✅ Category-specific component discovery');
      console.log('- ✅ Quality filtering by stars and patterns');
      console.log('- ✅ Semantic search across indexed components');
      console.log('- ✅ Component metadata extraction and analysis');
    } else {
      console.log('This demonstrates:');
      console.log('- ✅ Component indexing with sample auth and payment libraries');
      console.log('- ✅ Semantic search using embeddings');
      console.log('- ✅ Similarity scoring and ranking');
      console.log('- ✅ Pattern-based matching');
      console.log('- ✅ Caching for performance');
    }

    console.log('\nNext steps would be:');
    console.log('- 🔧 Add more categories (database, API, UI components)');
    console.log('- 🔧 Implement incremental indexing');
    console.log('- 🔧 Add code adaptation engine');
    console.log('- 🔧 Build web interface');

    if (!githubToken) {
      console.log('\nTo test GitHub indexing:');
      console.log('1. Get a GitHub personal access token');
      console.log('2. Set GITHUB_TOKEN environment variable');
      console.log('3. Run this script again');
    }

  } catch (error) {
    logger.error('Demo failed:', error);
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
