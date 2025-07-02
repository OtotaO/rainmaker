/**
 * Test the enhanced Socratic Dialogue with LLM integration
 * 
 * This demonstrates how the system now generates adaptive questions
 * based on user responses instead of using static dialogue trees.
 */

import { SocraticDialogue } from './services/socratic-dialogue-enhanced';
import type { UserContext } from './types';
import { logger } from './utils/logger';

async function testSocraticDialogue() {
  console.log('🧪 Testing Enhanced Socratic Dialogue with LLM Integration\n');
  
  // Create a test user context
  const userContext: UserContext = {
    project: {
      language: 'TypeScript',
      framework: 'React',
      conventions: {
        naming: 'camelCase',
        imports: 'named',
        exports: 'named',
      },
    },
    dependencies: {},
    preferences: {
      style: 'functional',
      errorHandling: 'exceptions',
      asyncPattern: 'async-await',
    },
  };
  
  // Test 1: Authentication dialogue
  console.log('📋 Test 1: Authentication Dialogue\n');
  
  const dialogue = new SocraticDialogue();
  
  // Start dialogue
  const firstQuestion = await dialogue.startDialogue('auth', 'I need user authentication', userContext);
  
  if (firstQuestion) {
    console.log('First Question:', firstQuestion.question);
    console.log('Type:', firstQuestion.type);
    console.log('Options:', firstQuestion.options?.map(o => o.label).join(', '));
    console.log('');
    
    // Simulate user selecting OAuth
    const response1 = 'oauth';
    console.log(`User selects: ${response1}\n`);
    
    const secondQuestion = await dialogue.processResponse(firstQuestion.id, response1);
    
    if (secondQuestion) {
      console.log('Second Question:', secondQuestion.question);
      console.log('Type:', secondQuestion.type);
      console.log('Options:', secondQuestion.options?.map(o => o.label).join(', '));
      console.log('');
      
      // Simulate user selecting multiple providers
      const response2 = ['google', 'github'];
      console.log(`User selects: ${response2.join(', ')}\n`);
      
      const thirdQuestion = await dialogue.processResponse(secondQuestion.id, response2);
      
      if (thirdQuestion) {
        console.log('Third Question:', thirdQuestion.question);
        console.log('Type:', thirdQuestion.type);
        console.log('Options:', thirdQuestion.options?.map(o => o.label).join(', '));
        console.log('');
        
        // Continue until dialogue completes
        const response3 = ['remember-me', 'role-based'];
        console.log(`User selects: ${response3.join(', ')}\n`);
        
        const complete = await dialogue.processResponse(thirdQuestion.id, response3);
        
        if (!complete) {
          console.log('✅ Dialogue complete! Building search request...\n');
          
          // Build the final search request
          const searchRequest = dialogue.buildSearchRequest(
            'I need user authentication',
            'auth',
            userContext
          );
          
          console.log('Search Request:');
          console.log('- Description:', searchRequest.refined.description);
          console.log('- Requirements:', searchRequest.refined.requirements);
          console.log('- Filters:', JSON.stringify(searchRequest.filters, null, 2));
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Payment dialogue
  console.log('📋 Test 2: Payment Processing Dialogue\n');
  
  const dialogue2 = new SocraticDialogue();
  
  const paymentQuestion = await dialogue2.startDialogue('payments', 'I need to process payments', userContext);
  
  if (paymentQuestion) {
    console.log('First Question:', paymentQuestion.question);
    console.log('Options:', paymentQuestion.options?.map(o => o.label).join(', '));
    console.log('');
    
    // This will use LLM to generate contextual questions
    console.log('💡 Note: With LLM enabled, questions will be dynamically generated');
    console.log('based on the specific context and previous responses.\n');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Show difference between static and dynamic
  console.log('📋 Test 3: Static vs Dynamic Comparison\n');
  
  console.log('Static Dialogue (fallback):');
  console.log('- Fixed question trees');
  console.log('- Predetermined paths');
  console.log('- Limited adaptability\n');
  
  console.log('Dynamic Dialogue (with LLM):');
  console.log('- Context-aware questions');
  console.log('- Adapts based on responses');
  console.log('- Can ask clarifying questions');
  console.log('- Better understanding of intent\n');
  
  console.log('🎯 Key Benefits:');
  console.log('1. More natural conversation flow');
  console.log('2. Better requirement gathering');
  console.log('3. Handles edge cases gracefully');
  console.log('4. Learns from context');
}

// Run the test
testSocraticDialogue().catch(console.error);
