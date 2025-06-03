// File: packages/api/src/examples/component-registry-example.ts

/**
 * Rainmaker Curated Component Registry Demo
 * 
 * This example demonstrates the opinionated, curated approach to component discovery.
 * Instead of overwhelming users with search results, we provide a carefully vetted
 * collection of battle-tested components that align with Rainmaker's principles.
 * 
 * Philosophy: "Opinionated and Direct" - No choice paralysis, just quality.
 */

import { componentRegistry } from '../components/registry';
import { logger } from '../lib/logger';

async function demonstrateComponentRegistry() {
  console.log('🎯 Rainmaker Curated Component Registry Demo\n');
  console.log('Philosophy: Opinionated and Direct - No choice paralysis, just quality.\n');

  // Example 1: Get all Rainmaker-verified components
  console.log('🏆 Example 1: Rainmaker-Verified Components');
  console.log('These components have been tested and approved by the Rainmaker team:\n');
  
  const verified = componentRegistry.getRainmakerVerified();
  verified.forEach((component, index) => {
    console.log(`${index + 1}. ${component.name}`);
    console.log(`   📝 ${component.description}`);
    console.log(`   🏷️  Category: ${component.category}`);
    console.log(`   💻 Frameworks: ${component.frameworks.join(', ')}`);
    console.log(`   ⭐ ${component.repository.stars} stars`);
    console.log(`   📦 Install: ${component.installation.command}`);
    console.log(`   🔧 Complexity: ${component.usage.complexity}`);
    console.log(`   ⏱️  Setup Time: ${component.usage.setupTime}`);
    console.log(`   ✅ Verified by: ${component.verification.verifiedBy}`);
    console.log('');
  });

  // Example 2: Get recommended stack for React project
  console.log('\n⚛️  Example 2: Recommended React Stack');
  console.log('Opinionated recommendations for a complete React application:\n');
  
  const reactStack = componentRegistry.getRecommendedStack('REACT', [
    'UI_COMPONENTS',
    'FORMS',
    'STATE_MANAGEMENT',
  ]);

  reactStack.forEach((component, index) => {
    console.log(`${index + 1}. ${component.name} (${component.category})`);
    console.log(`   📝 ${component.description}`);
    console.log(`   📦 ${component.installation.command}`);
    console.log(`   🎯 Why this choice: ${component.verification.notes}`);
    console.log('');
  });

  // Example 3: Get components by category
  console.log('\n📋 Example 3: Form Handling Components');
  console.log('All verified form-related components:\n');
  
  const formComponents = componentRegistry.getByCategory('FORMS');
  formComponents.forEach((component, index) => {
    console.log(`${index + 1}. ${component.name}`);
    console.log(`   📝 ${component.description}`);
    console.log(`   🔗 ${component.usage.documentation.url}`);
    console.log(`   📚 Documentation Quality: ${component.usage.documentation.quality}`);
    
    if (component.usage.examples.length > 0) {
      console.log(`   💡 Example: ${component.usage.examples[0].title}`);
      console.log(`   📄 ${component.usage.examples[0].description}`);
    }
    console.log('');
  });

  // Example 4: Show integration benefits
  console.log('\n🔗 Example 4: Rainmaker Integration Benefits');
  console.log('How these components align with Rainmaker principles:\n');
  
  verified.forEach((component, index) => {
    console.log(`${index + 1}. ${component.name}`);
    console.log(`   🧬 Code Generation: ${component.rainmakerIntegration.codeGeneration ? '✅' : '❌'}`);
    console.log(`   🔍 Zod Schemas: ${component.rainmakerIntegration.zodSchemas ? '✅' : '❌'}`);
    console.log(`   📝 TypeScript Types: ${component.rainmakerIntegration.typeDefinitions ? '✅' : '❌'}`);
    console.log(`   🧪 Testing Support: ${component.rainmakerIntegration.testingSupport ? '✅' : '❌'}`);
    console.log('');
  });
}

// Example of API usage
async function demonstrateAPIUsage() {
  console.log('\n🌐 API Usage Examples\n');
  
  const baseUrl = 'http://localhost:3001/api/components';
  
  console.log('📡 Available API Endpoints:');
  console.log(`GET ${baseUrl} - Get all components (with optional filters)`);
  console.log(`GET ${baseUrl}/verified - Get Rainmaker-verified components`);
  console.log(`GET ${baseUrl}/category/UI_COMPONENTS - Get UI components`);
  console.log(`GET ${baseUrl}/framework/REACT - Get React components`);
  console.log(`POST ${baseUrl}/stack-recommendations - Get recommended stack`);
  console.log(`GET ${baseUrl}/categories - Get available categories`);
  console.log(`GET ${baseUrl}/frameworks - Get available frameworks`);
  console.log('');

  // Example API calls
  const examples = [
    {
      title: 'Get all React components',
      method: 'GET',
      url: `${baseUrl}?framework=REACT`,
    },
    {
      title: 'Get UI components',
      method: 'GET', 
      url: `${baseUrl}/category/UI_COMPONENTS`,
    },
    {
      title: 'Get recommended React stack',
      method: 'POST',
      url: `${baseUrl}/stack-recommendations`,
      body: {
        framework: 'REACT',
        categories: ['UI_COMPONENTS', 'FORMS', 'STATE_MANAGEMENT']
      }
    },
    {
      title: 'Get specific component',
      method: 'GET',
      url: `${baseUrl}/shadcn-ui`,
    }
  ];

  console.log('🔧 Example API Calls:\n');
  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.title}`);
    console.log(`   ${example.method} ${example.url}`);
    if (example.body) {
      console.log(`   Body: ${JSON.stringify(example.body, null, 2)}`);
    }
    console.log('');
  });

  // Try actual API call if server is running
  try {
    console.log('🧪 Testing live API call...');
    const response = await fetch(`${baseUrl}/verified`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API is working! Found ${data.length} verified components.`);
    } else {
      console.log(`❌ API returned status: ${response.status}`);
    }
  } catch (error) {
    console.log('💡 API server not running. Start with: bun run dev');
  }
}

// Demonstrate the philosophy
function demonstratePhilosophy() {
  console.log('\n🎯 Rainmaker Component Philosophy\n');
  
  console.log('❌ BEFORE (Traditional Approach):');
  console.log('   • Search returns 100+ results');
  console.log('   • Hours spent evaluating options');
  console.log('   • Analysis paralysis');
  console.log('   • Inconsistent quality');
  console.log('   • No integration guidance');
  console.log('');
  
  console.log('✅ AFTER (Rainmaker Curated Registry):');
  console.log('   • Hand-picked, battle-tested components');
  console.log('   • Maximum 3-5 options per category');
  console.log('   • Clear quality scores and justification');
  console.log('   • Guaranteed Zod/TypeScript integration');
  console.log('   • Installation commands included');
  console.log('   • Opinionated recommendations');
  console.log('');
  
  console.log('🎯 Key Principles:');
  console.log('   1. Quality over Quantity');
  console.log('   2. Opinionated over Flexible');
  console.log('   3. Direct over Comprehensive');
  console.log('   4. Verified over Popular');
  console.log('   5. Integrated over Standalone');
  console.log('');
  
  console.log('💡 Result: Developers spend time building, not searching.');
}

// Show code generation potential
function demonstrateCodeGeneration() {
  console.log('\n🤖 Code Generation Potential\n');
  
  const component = componentRegistry.getById('react-hook-form');
  if (component) {
    console.log('📝 Example: Auto-generated form component');
    console.log('');
    console.log('// Generated by Rainmaker based on curated registry');
    console.log('import { useForm } from "react-hook-form"');
    console.log('import { zodResolver } from "@hookform/resolvers/zod"');
    console.log('import { Button } from "@/components/ui/button"');
    console.log('import { Input } from "@/components/ui/input"');
    console.log('import { z } from "zod"');
    console.log('');
    console.log('const UserSchema = z.object({');
    console.log('  name: z.string().min(1, "Name is required"),');
    console.log('  email: z.string().email("Invalid email"),');
    console.log('})');
    console.log('');
    console.log('export function UserForm() {');
    console.log('  const { register, handleSubmit, formState: { errors } } = useForm({');
    console.log('    resolver: zodResolver(UserSchema)');
    console.log('  })');
    console.log('');
    console.log('  return (');
    console.log('    <form onSubmit={handleSubmit(console.log)}>');
    console.log('      <Input {...register("name")} placeholder="Name" />');
    console.log('      {errors.name && <p>{errors.name.message}</p>}');
    console.log('      ');
    console.log('      <Input {...register("email")} placeholder="Email" />');
    console.log('      {errors.email && <p>{errors.email.message}</p>}');
    console.log('      ');
    console.log('      <Button type="submit">Submit</Button>');
    console.log('    </form>');
    console.log('  )');
    console.log('}');
    console.log('');
    console.log('🎯 Notice: Perfect integration between all components!');
  }
}

// Main demo function
async function main() {
  console.log('🚀 Starting Rainmaker Component Registry Demo\n');
  
  try {
    demonstratePhilosophy();
    await demonstrateComponentRegistry();
    await demonstrateAPIUsage();
    demonstrateCodeGeneration();
    
    console.log('\n🎉 Demo completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start the API server: bun run dev');
    console.log('   2. Try the API endpoints');
    console.log('   3. Integrate into your Rainmaker workflow');
    console.log('   4. Build faster with curated components!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { 
  demonstrateComponentRegistry, 
  demonstrateAPIUsage, 
  demonstratePhilosophy,
  demonstrateCodeGeneration 
};
