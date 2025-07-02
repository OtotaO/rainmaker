#!/usr/bin/env bun
/**
 * CLI for testing the Discovery Engine
 * 
 * This demonstrates the core functionality without getting bogged down in type issues.
 */

import { DiscoveryEngine } from './core/discovery-engine';

async function main() {
  console.log('🔍 Rainmaker Discovery Engine Demo\n');
  
  try {
    // Initialize the discovery engine
    const engine = new DiscoveryEngine({
      dataDir: './data/discovery',
    });
    
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
        const results = await engine.search(query, undefined, 3);
        
        if (results.length === 0) {
          console.log('  No results found');
          continue;
        }
        
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.component.metadata.name}`);
          console.log(`     Score: ${result.score.toFixed(3)}`);
          console.log(`     Reason: ${result.reasoning}`);
          console.log(`     Description: ${result.component.metadata.description}`);
        });
      } catch (error) {
        console.error(`  Error searching: ${error}`);
      }
    }
    
    // Test adaptation functionality
    console.log('\n--- Testing Adaptation ---');
    
    try {
      // Get the first component for adaptation
      const searchResults = await engine.search('Google OAuth', undefined, 1);
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        if (!firstResult) {
          console.log('No valid search result found');
          return;
        }
        
        const componentId = firstResult.component.metadata.id;
        console.log(`\nAdapting component: ${firstResult.component.metadata.name}`);
        
        // Create a sample user context
        const userContext = {
          project: {
            language: 'typescript',
            framework: 'react',
            packageManager: 'bun' as const,
            conventions: {
              naming: 'camelCase' as const,
              imports: 'named' as const,
              exports: 'named' as const,
            },
          },
          dependencies: {
            'react': '^18.0.0',
            'typescript': '^5.0.0',
          },
          preferences: {
            style: 'functional' as const,
            errorHandling: 'exceptions' as const,
            asyncPattern: 'async-await' as const,
          },
        };
        
        const adapted = await engine.adaptComponent(
          componentId,
          userContext,
          { clientId: 'your-google-client-id' }
        );
        
        console.log('\nAdaptation successful!');
        console.log(`Generated ${adapted.adapted.files.length} files:`);
        
        adapted.adapted.files.forEach(file => {
          console.log(`  - ${file.path}: ${file.description}`);
        });
        
        console.log('\nInstall instructions:');
        adapted.adapted.instructions.install.forEach(cmd => {
          console.log(`  $ ${cmd}`);
        });
        
        console.log('\nSetup instructions:');
        adapted.adapted.instructions.setup.forEach(step => {
          console.log(`  - ${step}`);
        });
        
        console.log('\nUsage:');
        console.log(adapted.adapted.instructions.usage);
        
        console.log('\nAttribution:');
        console.log(adapted.adapted.attribution);
        
      } else {
        console.log('No components found for adaptation test');
      }
    } catch (error) {
      console.error(`Error during adaptation: ${error}`);
    }
    
    console.log('\n✅ Discovery Engine demo completed successfully!');
    
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
