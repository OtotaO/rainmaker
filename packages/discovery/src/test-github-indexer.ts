/**
 * Test the enhanced GitHub indexer with LLM quality assessment
 */

import { createEnhancedGitHubIndexer } from './services/github-indexer-enhanced';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testGitHubIndexer() {
  console.log('🔍 Testing Enhanced GitHub Indexer with LLM Quality Assessment\n');
  
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN not found in environment variables');
    console.log('Please set GITHUB_TOKEN in your .env file');
    return;
  }
  
  // Create indexer with custom quality thresholds
  const indexer = createEnhancedGitHubIndexer(githubToken, {
    qualityThresholds: {
      minOverallScore: 7,      // Higher bar for overall quality
      minCodeQuality: 6,       // Require good code quality
      minReliability: 6,       // Require reliable code
      minReusability: 7,       // High reusability is key
      minDocumentation: 5,     // Moderate documentation requirement
      minTesting: 5,           // Moderate testing requirement
    },
    useLLMAssessment: true,    // Enable LLM assessment
  });
  
  try {
    // Test 1: Index authentication components
    console.log('📂 Test 1: Indexing authentication components...');
    const authComponents = await indexer.indexCategory('auth', {
      minStars: 500,          // Higher quality repos
      languages: ['typescript'],
      limit: 5,               // Just a few for testing
    });
    
    console.log(`Found ${authComponents.length} high-quality auth components:`);
    authComponents.forEach(component => {
      const assessment = (component as any).qualityAssessment;
      console.log(`\n  📦 ${component.metadata.name}`);
      console.log(`     Repository: ${component.metadata.source.repo}`);
      console.log(`     Stars: ${component.metadata.quality.stars}`);
      if (assessment) {
        console.log(`     Quality Scores:`);
        console.log(`       - Overall: ${assessment.overall_score}/10`);
        console.log(`       - Code Quality: ${assessment.code_quality_score}/10`);
        console.log(`       - Reliability: ${assessment.reliability_score}/10`);
        console.log(`       - Reusability: ${assessment.reusability_score}/10`);
        console.log(`     Strengths: ${assessment.strengths.join(', ')}`);
      }
    });
    
    // Test 2: Index payment components
    console.log('\n\n📂 Test 2: Indexing payment components...');
    const paymentComponents = await indexer.indexCategory('payments', {
      minStars: 1000,         // Even higher quality for payments
      languages: ['typescript', 'javascript'],
      limit: 3,
    });
    
    console.log(`Found ${paymentComponents.length} high-quality payment components:`);
    paymentComponents.forEach(component => {
      const assessment = (component as any).qualityAssessment;
      console.log(`\n  💳 ${component.metadata.name}`);
      console.log(`     Repository: ${component.metadata.source.repo}`);
      console.log(`     Framework: ${component.metadata.technical.framework || 'None'}`);
      if (assessment) {
        console.log(`     Quality Assessment:`);
        console.log(`       - ${assessment.recommendations.join('\n       - ')}`);
      }
    });
    
    // Test 3: Test with LLM disabled (fallback mode)
    console.log('\n\n📂 Test 3: Testing fallback mode (LLM disabled)...');
    const fallbackIndexer = createEnhancedGitHubIndexer(githubToken, {
      useLLMAssessment: false,  // Disable LLM
    });
    
    const fallbackComponents = await fallbackIndexer.indexCategory('database', {
      minStars: 100,
      limit: 2,
    });
    
    console.log(`Found ${fallbackComponents.length} components using basic quality checks`);
    
    console.log('\n✅ Enhanced GitHub indexer test completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testGitHubIndexer().catch(console.error);
