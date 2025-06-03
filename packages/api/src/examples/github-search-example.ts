// File: packages/api/src/examples/github-search-example.ts

/**
 * Example script demonstrating the Smart GitHub Search functionality
 * 
 * This script shows how to use the new GitHub search API to find
 * relevant components using natural language queries.
 * 
 * To run this example:
 * 1. Ensure your .env file has GITHUB_TOKEN and ANTHROPIC_API_KEY set
 * 2. Start the API server: bun run dev
 * 3. Run: bun run src/examples/github-search-example.ts
 */

import { GitHubSearchService } from '../github/search-service';
import { GitHubSearchQuery } from '../../../shared/src/schemas/github';
import { logger } from '../lib/logger';

async function demonstrateGitHubSearch() {
  console.log('🔍 Smart GitHub Search Demo\n');
  
  const searchService = new GitHubSearchService();
  
  // Example 1: React Component Search
  console.log('📱 Example 1: Searching for React components...');
  const reactQuery: GitHubSearchQuery = {
    query: 'I need a responsive date picker component for React with range selection',
    language: 'typescript',
    framework: 'react',
    maxResults: 3,
  };
  
  try {
    const reactResults = await searchService.searchComponents(reactQuery);
    
    console.log(`\n✅ Found ${reactResults.results.length} React components:`);
    console.log(`⏱️  Processing time: ${reactResults.queryProcessingTime}ms`);
    console.log(`🔍 Refined queries: ${reactResults.refinedQueries.join(', ')}\n`);
    
    reactResults.results.forEach((component, index) => {
      console.log(`${index + 1}. ${component.repository.full_name}`);
      console.log(`   ⭐ ${component.repository.stargazers_count} stars`);
      console.log(`   📝 ${component.repository.description}`);
      console.log(`   🎯 Relevance: ${component.assessment.relevanceScore}/10`);
      console.log(`   💎 Quality: ${component.assessment.qualityScore}/10`);
      console.log(`   📦 Install: ${component.installationCommand}`);
      console.log(`   💭 "${component.assessment.justification}"`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ React search failed:', error);
  }
  
  // Example 2: Python Library Search
  console.log('\n🐍 Example 2: Searching for Python libraries...');
  const pythonQuery: GitHubSearchQuery = {
    query: 'fast web API framework with automatic documentation generation',
    language: 'python',
    maxResults: 2,
  };
  
  try {
    const pythonResults = await searchService.searchComponents(pythonQuery);
    
    console.log(`\n✅ Found ${pythonResults.results.length} Python libraries:`);
    console.log(`⏱️  Processing time: ${pythonResults.queryProcessingTime}ms\n`);
    
    pythonResults.results.forEach((component, index) => {
      console.log(`${index + 1}. ${component.repository.full_name}`);
      console.log(`   ⭐ ${component.repository.stargazers_count} stars`);
      console.log(`   🏷️  Topics: ${component.repository.topics.join(', ')}`);
      console.log(`   🎯 Relevance: ${component.assessment.relevanceScore}/10`);
      console.log(`   💎 Quality: ${component.assessment.qualityScore}/10`);
      console.log(`   📦 Install: ${component.installationCommand}`);
      console.log(`   🔗 ${component.repository.html_url}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Python search failed:', error);
  }
  
  // Example 3: General Search (no specific language)
  console.log('\n🌐 Example 3: General component search...');
  const generalQuery: GitHubSearchQuery = {
    query: 'markdown editor with live preview and syntax highlighting',
    maxResults: 2,
  };
  
  try {
    const generalResults = await searchService.searchComponents(generalQuery);
    
    console.log(`\n✅ Found ${generalResults.results.length} components:`);
    console.log(`⏱️  Processing time: ${generalResults.queryProcessingTime}ms\n`);
    
    generalResults.results.forEach((component, index) => {
      console.log(`${index + 1}. ${component.repository.full_name}`);
      console.log(`   💻 Language: ${component.repository.language || 'Not specified'}`);
      console.log(`   ⭐ ${component.repository.stargazers_count} stars`);
      console.log(`   🔧 Complexity: ${component.assessment.usageComplexity}`);
      console.log(`   🎯 Features: ${component.assessment.keyFeatures.join(', ')}`);
      console.log(`   📦 Install: ${component.installationCommand}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ General search failed:', error);
  }
  
  console.log('🎉 Demo completed!');
}

// Example of how to make HTTP requests to the API endpoint
async function demonstrateAPICall() {
  console.log('\n🌐 API Endpoint Demo\n');
  
  const apiUrl = 'http://localhost:3001/api/github/search';
  const searchQuery = {
    query: 'Vue.js component library with TypeScript support',
    language: 'typescript',
    framework: 'vue',
    maxResults: 2,
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ API Response:');
    console.log(`📊 Total found: ${result.totalFound}`);
    console.log(`⏱️  Processing time: ${result.queryProcessingTime}ms`);
    console.log(`🔍 Original query: "${result.originalQuery}"`);
    console.log(`🎯 Refined queries: ${result.refinedQueries.join(', ')}`);
    console.log(`📦 Results: ${result.results.length} components\n`);
    
    result.results.forEach((component: any, index: number) => {
      console.log(`${index + 1}. ${component.repository.full_name}`);
      console.log(`   📝 ${component.repository.description}`);
      console.log(`   🎯 Relevance: ${component.assessment.relevanceScore}/10`);
      console.log(`   💎 Quality: ${component.assessment.qualityScore}/10`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ API call failed:', error);
    console.log('💡 Make sure the API server is running on http://localhost:3001');
  }
}

// Run the examples
async function main() {
  console.log('🚀 Starting Smart GitHub Search Examples\n');
  
  // Check environment variables
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    // Run direct service examples
    await demonstrateGitHubSearch();
    
    // Run API endpoint example (requires server to be running)
    await demonstrateAPICall();
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateGitHubSearch, demonstrateAPICall };
