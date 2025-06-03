// File: packages/api/src/build/build-orchestrator-service.ts

/**
 * Rainmaker Build Orchestrator Service
 * 
 * The "Magic Button" implementation - transforms a finalized PRD into a 
 * working codebase with curated components in one automated pipeline.
 * 
 * Philosophy: "Get them to the destination first, then think about what to eat."
 * - Carmack's directness: One click from PRD to working code
 * - Opinionated choices: Use RAINMAKER_VERIFIED components automatically
 * - Value-driven: Deliver working foundation, not endless options
 */

import { z } from 'zod';
import { componentRegistry } from '../components/registry';
import { EXPANDED_REGISTRY, getExpandedComponentsByCategory } from '../components/expanded-registry-complete';
import type { 
  CuratedComponent, 
  ComponentCategory, 
  SupportedFramework 
} from '../components/registry';
import { LeanPRDSchema } from '../prd/prd-schemas'; // Added import
import { instructor } from '../lib/instructor';
import { anthropicConfig } from '../config';
import { logger } from '../lib/logger';
import { createGitHubIssue } from '../github';
import { componentIntelligence } from '../knowledge/knowledge-system';

// Build request schema
export const BuildRequestSchema = z.object({
  prd: LeanPRDSchema, // Use the rich LeanPRDSchema
  targetFramework: z.enum(['REACT', 'VUE', 'NODE_JS', 'PYTHON']).optional(),
  projectType: z.enum(['NEW_PROJECT', 'EXISTING_REPO_FEATURE']),
  githubRepo: z.object({
    owner: z.string(),
    repo: z.string(),
  }).optional(),
});

// PRD analysis result schema
export const PRDAnalysisSchema = z.object({
  primaryFramework: z.enum(['REACT', 'VUE', 'NODE_JS', 'PYTHON']),
  requiredCategories: z.array(z.enum([
    'UI_COMPONENTS', 'STYLING', 'FORMS', 'DATA_DISPLAY', 'NAVIGATION',
    'AUTHENTICATION', 'API_CLIENTS', 'STATE_MANAGEMENT', 'TESTING',
    'BUILD_TOOLS', 'BACKEND_FRAMEWORKS', 'DATABASE', 'UTILITIES'
  ])),
  projectStructure: z.object({
    isFullStack: z.boolean(),
    hasDatabase: z.boolean(),
    hasAuthentication: z.boolean(),
    hasRealtime: z.boolean(),
    hasFileUpload: z.boolean(),
  }),
  estimatedComplexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
  keyFeatures: z.array(z.string()),
});

// Build result schema
export const BuildResultSchema = z.object({
  success: z.boolean(),
  buildId: z.string(),
  selectedStack: z.array(z.object({
    category: z.string(),
    component: z.any(), // CuratedComponent
    reason: z.string(),
  })),
  generatedFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
    description: z.string(),
  })),
  createdIssues: z.array(z.object({
    title: z.string(),
    url: z.string(),
    number: z.number(),
  })),
  buildSummary: z.object({
    totalFiles: z.number(),
    totalIssues: z.number(),
    estimatedSetupTime: z.string(),
    nextSteps: z.array(z.string()),
  }),
  error: z.string().optional(),
});

export type BuildRequest = z.infer<typeof BuildRequestSchema>;
export type PRDAnalysis = z.infer<typeof PRDAnalysisSchema>;
export type BuildResult = z.infer<typeof BuildResultSchema>;

/**
 * The Build Orchestrator - The heart of the "Magic Button"
 */
export class BuildOrchestratorService {
  private buildCounter = 0;

  /**
   * Main orchestration method - the "Magic Button" implementation
   */
  async buildFromPRD(request: BuildRequest): Promise<BuildResult> {
    const buildId = `build_${Date.now()}_${++this.buildCounter}`;
    const startTime = Date.now();

    // Use coreFeatureDefinition.content as the primary title/name for logging
    logger.info('🚀 Starting build orchestration', { buildId, prdTitle: request.prd.coreFeatureDefinition.content });

    try {
      // Step 1: Analyze PRD to understand technical requirements
      const analysis = await this.analyzePRD(request.prd, request.targetFramework);
      logger.info('📊 PRD analysis completed', { buildId, analysis });

      // Step 2: Assemble optimal stack from curated registry
      const selectedStack = await this.assembleStack(analysis);
      logger.info('🔧 Stack assembled', { buildId, stackSize: selectedStack.length });

      // Step 3: Generate code structure and files
      const generatedFiles = await this.generateCodeStructure(
        request.prd, 
        analysis, 
        selectedStack
      );
      logger.info('📝 Code generation completed', { buildId, fileCount: generatedFiles.length });

      // Step 4: Create GitHub issues for development tasks
      const createdIssues = await this.createDevelopmentIssues(
        request.prd,
        analysis,
        selectedStack,
        request.githubRepo
      );
      logger.info('📋 GitHub issues created', { buildId, issueCount: createdIssues.length });

      // Step 5: Generate build summary
      const buildSummary = this.generateBuildSummary(
        analysis,
        selectedStack,
        generatedFiles,
        createdIssues
      );

      const processingTime = Date.now() - startTime;
      logger.info('✅ Build orchestration completed', { 
        buildId, 
        processingTime,
        success: true 
      });

      // Learn from this successful build
      await componentIntelligence.learnFromBuild(
        {
          buildId,
          success: true,
          selectedStack,
          generatedFiles,
          createdIssues,
        },
        request.prd
      );

      return {
        success: true,
        buildId,
        selectedStack: selectedStack.map(item => ({
          category: item.category,
          component: item.component,
          reason: item.reason,
        })),
        generatedFiles,
        createdIssues,
        buildSummary,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Build orchestration failed', { 
        buildId, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime 
      });

      // Learn from this failed build
      await componentIntelligence.learnFromBuild(
        {
          buildId,
          success: false,
          selectedStack: [],
          generatedFiles: [],
          createdIssues: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        request.prd
      );

      return {
        success: false,
        buildId,
        selectedStack: [],
        generatedFiles: [],
        createdIssues: [],
        buildSummary: {
          totalFiles: 0,
          totalIssues: 0,
          estimatedSetupTime: '0 minutes',
          nextSteps: ['Review error logs and try again'],
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Step 1: Analyze PRD using LLM to understand technical requirements
   */
  private async analyzePRD(
    prd: BuildRequest['prd'], 
    targetFramework?: string
  ): Promise<PRDAnalysis> {
    logger.debug('Analyzing PRD with LLM', { title: prd.coreFeatureDefinition.content });

    try {
      const analysis = await instructor.chat.completions.create({
        model: anthropicConfig.model,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a senior software architect analyzing a Product Requirements Document (PRD) to determine the optimal technical stack and project structure.

Your job is to:
1. Identify the primary framework/technology stack
2. Determine required component categories
3. Assess project complexity and structure
4. Extract key technical features

Be opinionated and direct. Choose the BEST technology for the job, not the most popular.`
          },
          {
            role: 'user',
            content: `Analyze this PRD and determine the technical requirements:

TITLE: ${prd.coreFeatureDefinition.content}
CORE FEATURE DEFINITION: ${prd.coreFeatureDefinition.content}
BUSINESS OBJECTIVE: ${prd.businessObjective.content}

KEY USER STORY:
${prd.keyUserStory.content}

USER REQUIREMENTS:
${prd.userRequirements?.map(req => `- ${req.content}`).join('\n') || 'Not specified'}

SUCCESS METRICS:
${prd.successMetrics?.map(sm => `- ${sm.content}`).join('\n') || 'Not specified'}

CONSTRAINTS:
${prd.constraints?.map(c => `- ${c.content}`).join('\n') || 'Not specified'}

KNOWN RISKS:
${prd.knownRisks?.map(kr => `- ${kr.content}`).join('\n') || 'Not specified'}

${targetFramework ? `PREFERRED FRAMEWORK: ${targetFramework}` : ''}

Provide a comprehensive technical analysis.`
          }
        ],
        response_model: {
          name: 'PRDAnalysis',
          schema: PRDAnalysisSchema,
        },
      });

      return analysis;

    } catch (error) {
      logger.error('PRD analysis failed, using fallback', { error });
      
      // Fallback analysis based on keywords
      return this.createFallbackAnalysis(prd, targetFramework);
    }
  }

  /**
   * Fallback PRD analysis when LLM fails
   */
  private createFallbackAnalysis(
    prd: BuildRequest['prd'], 
    targetFramework?: string
  ): PRDAnalysis {
    const content = `${prd.coreFeatureDefinition.content} ${prd.businessObjective.content}`.toLowerCase();
    
    // Simple keyword-based analysis
    const isWebApp = content.includes('web') || content.includes('app') || content.includes('ui');
    const hasAuth = content.includes('auth') || content.includes('login') || content.includes('user');
    const hasDatabase = content.includes('data') || content.includes('store') || content.includes('save');
    const isAPI = content.includes('api') || content.includes('backend') || content.includes('server');

    return {
      primaryFramework: (targetFramework as any) || (isWebApp ? 'REACT' : isAPI ? 'NODE_JS' : 'REACT'),
      requiredCategories: [
        ...(isWebApp ? ['UI_COMPONENTS', 'STYLING'] : []),
        ...(hasAuth ? ['AUTHENTICATION'] : []),
        ...(hasDatabase ? ['DATABASE'] : []),
        ...(isAPI ? ['BACKEND_FRAMEWORKS', 'API_CLIENTS'] : []),
        'TESTING',
      ] as any,
      projectStructure: {
        isFullStack: isWebApp && isAPI,
        hasDatabase,
        hasAuthentication: hasAuth,
        hasRealtime: content.includes('real') || content.includes('live'),
        hasFileUpload: content.includes('upload') || content.includes('file'),
      },
      estimatedComplexity: 'MODERATE',
      keyFeatures: [prd.coreFeatureDefinition.content],
    };
  }

  /**
   * Step 2: Assemble optimal stack from curated registry
   */
  private async assembleStack(analysis: PRDAnalysis): Promise<Array<{
    category: string;
    component: CuratedComponent;
    reason: string;
  }>> {
    logger.debug('Assembling stack from curated registry', { 
      framework: analysis.primaryFramework,
      categories: analysis.requiredCategories 
    });

    const selectedStack: Array<{
      category: string;
      component: CuratedComponent;
      reason: string;
    }> = [];

    // For each required category, get intelligent recommendations
    for (const category of analysis.requiredCategories) {
      // Get AI-powered recommendations based on historical success
      const intelligentRecs = await componentIntelligence.getIntelligentRecommendations(
        analysis,
        category
      );

      // Get components from registry
      const registryComponents = EXPANDED_REGISTRY.filter(component => 
        component.frameworks.includes(analysis.primaryFramework) &&
        component.category === category
      );

      // Merge intelligence with registry data
      let bestComponent: CuratedComponent | null = null;
      let bestScore = -1;

      for (const component of registryComponents) {
        // Calculate combined score
        const intelligentScore = intelligentRecs.find(
          (rec: any) => rec.component_id === component.id
        );
        
        const historicalSuccess = intelligentScore?.success_count || 0;
        const avgConfidence = intelligentScore?.avg_confidence || 0.5;
        const stars = component.repository.stars;
        
        // Weighted score: 40% historical success, 30% confidence, 30% popularity
        const score = (historicalSuccess * 0.4) + (avgConfidence * 0.3) + (stars / 100000 * 0.3);
        
        if (score > bestScore) {
          bestScore = score;
          bestComponent = component;
        }
      }

      // Fallback to highest stars if no intelligent recommendation
      if (!bestComponent) {
        bestComponent = registryComponents.reduce((best, current) => 
          current.repository.stars > best.repository.stars ? current : best
        , registryComponents[0]);
      }

      if (bestComponent) {
        selectedStack.push({
          category,
          component: bestComponent,
          reason: `Selected ${bestComponent.name} for ${category}: AI confidence ${bestScore.toFixed(2)} based on historical success`,
        });
      }
    }

    // Add framework-specific defaults if not covered
    const hasStateManagement = selectedStack.some(s => s.category === 'STATE_MANAGEMENT');
    if (analysis.primaryFramework === 'REACT' && !hasStateManagement) {
      const zustand = EXPANDED_REGISTRY.find(c => c.id === 'zustand');
      if (zustand) {
        selectedStack.push({
          category: 'STATE_MANAGEMENT',
          component: zustand,
          reason: 'Added Zustand for React state management - simple and TypeScript-first',
        });
      }
    }

    logger.info('Stack assembly completed', { 
      selectedComponents: selectedStack.map(s => s.component.name) 
    });

    return selectedStack;
  }

  /**
   * Step 3: Generate code structure and files
   */
  private async generateCodeStructure(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): Promise<Array<{ path: string; content: string; description: string }>> {
    logger.debug('Generating code structure', { 
      framework: analysis.primaryFramework,
      stackSize: selectedStack.length 
    });

    const files: Array<{ path: string; content: string; description: string }> = [];

    // Generate package.json with selected dependencies
    if (analysis.primaryFramework === 'REACT' || analysis.primaryFramework === 'NODE_JS') {
      const packageJson = this.generatePackageJson(prd, analysis, selectedStack);
      files.push({
        path: 'package.json',
        content: JSON.stringify(packageJson, null, 2),
        description: 'Project dependencies with curated components',
      });
    }

    // Generate README with setup instructions
    const readme = this.generateReadme(prd, analysis, selectedStack);
    files.push({
      path: 'README.md',
      content: readme,
      description: 'Project documentation and setup guide',
    });

    // Generate basic project structure based on framework
    if (analysis.primaryFramework === 'REACT') {
      files.push(...this.generateReactStructure(prd, analysis, selectedStack));
    } else if (analysis.primaryFramework === 'NODE_JS') {
      files.push(...this.generateNodeStructure(prd, analysis, selectedStack));
    }

    // Generate environment configuration
    const envExample = this.generateEnvExample(analysis, selectedStack);
    files.push({
      path: '.env.example',
      content: envExample,
      description: 'Environment variables template',
    });

    logger.info('Code structure generation completed', { fileCount: files.length });
    return files;
  }

  /**
   * Generate package.json with curated dependencies
   */
  private generatePackageJson(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): any {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};

    // Add dependencies from selected stack
    selectedStack.forEach(({ component }) => {
      // Extract package name from installation command
      const installCmd = component.installation.command;
      if (installCmd.includes('npm install')) {
        const packageName = installCmd.replace('npm install ', '').split(' ')[0];
        dependencies[packageName] = 'latest';
      }

      // Add known dependencies
      component.installation.dependencies.forEach(dep => {
        dependencies[dep] = 'latest';
      });
    });

    // Add framework-specific base dependencies
    if (analysis.primaryFramework === 'REACT') {
      dependencies['react'] = '^18.0.0';
      dependencies['react-dom'] = '^18.0.0';
      devDependencies['@types/react'] = '^18.0.0';
      devDependencies['@types/react-dom'] = '^18.0.0';
      devDependencies['vite'] = '^4.0.0';
      devDependencies['@vitejs/plugin-react'] = '^4.0.0';
    } else if (analysis.primaryFramework === 'NODE_JS') {
      dependencies['express'] = '^4.17.1'; // Using a common stable version
      dependencies['cors'] = '^2.8.5';    // Using a common stable version
      devDependencies['@types/express'] = '^4.17.13';
      devDependencies['@types/cors'] = '^2.8.12';
    }

    // Always add TypeScript and testing
    devDependencies['typescript'] = '^5.0.0';
    devDependencies['vitest'] = '^1.0.0';
    dependencies['zod'] = '^3.22.0'; // Rainmaker principle: always include Zod

    return {
      name: prd.coreFeatureDefinition.content.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      description: prd.coreFeatureDefinition.content, // Or a combination from businessObjective
      type: 'module',
      scripts: {
        dev: analysis.primaryFramework === 'REACT' ? 'vite' : 'node src/index.js',
        build: analysis.primaryFramework === 'REACT' ? 'vite build' : 'tsc',
        test: 'vitest',
        'type-check': 'tsc --noEmit',
      },
      dependencies,
      devDependencies,
    };
  }

  /**
   * Generate comprehensive README
   */
  private generateReadme(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): string {
    return `# ${prd.coreFeatureDefinition.content}

${prd.businessObjective.content || prd.coreFeatureDefinition.content}

## 🚀 Generated by Rainmaker

This project was automatically generated using Rainmaker's curated component registry and build orchestration system.

## 📋 Project Overview

**Framework:** ${analysis.primaryFramework}
**Complexity:** ${analysis.estimatedComplexity}
**Key Features:** ${analysis.keyFeatures.join(', ')}

## 🔧 Technology Stack

This project uses the following Rainmaker-verified components:

${selectedStack.map(({ component, reason }) => 
  `### ${component.name}
- **Category:** ${component.category}
- **Stars:** ${component.repository.stars}
- **Why chosen:** ${reason}
- **Install:** \`${component.installation.command}\`
- **Docs:** ${component.usage.documentation.url}
`).join('\n')}

## 🏗️ Project Structure

\`\`\`
${analysis.primaryFramework === 'REACT' ? `
src/
  components/     # React components
  hooks/         # Custom hooks
  lib/           # Utilities and configurations
  types/         # TypeScript type definitions
  App.tsx        # Main application component
  main.tsx       # Application entry point
` : `
src/
  routes/        # API routes
  lib/           # Utilities and configurations
  types/         # TypeScript type definitions
  index.ts       # Application entry point
`}
\`\`\`

## 🚀 Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start development:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 🧪 Testing

\`\`\`bash
npm test
\`\`\`

## 📝 Next Steps

1. Review the generated code structure
2. Configure environment variables in \`.env\`
3. Implement business logic in the generated components
4. Add your specific features and customizations
5. Run tests and ensure everything works
6. Deploy when ready!

## 🎯 Rainmaker Philosophy

This project follows Rainmaker's core principles:
- **Type Safety:** Full TypeScript support with Zod schemas
- **Quality Components:** Only battle-tested, verified libraries
- **Rapid Development:** Get to working code fast
- **Opinionated Choices:** Best practices built-in

---

*Generated with ❤️ by Rainmaker - From idea to code in minutes*
`;
  }

  /**
   * Generate React project structure
   */
  private generateReactStructure(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): Array<{ path: string; content: string; description: string }> {
    const files: Array<{ path: string; content: string; description: string }> = [];

    // Main App component
    files.push({
      path: 'src/App.tsx',
      content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${prd.coreFeatureDefinition.content}</h1>
        <p>${prd.businessObjective.content || prd.coreFeatureDefinition.content}</p>
        <p>🚀 Generated by Rainmaker with curated components</p>
      </header>
    </div>
  );
}

export default App;`,
      description: 'Main React application component',
    });

    // Entry point
    files.push({
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      description: 'React application entry point',
    });

    // Basic CSS
    files.push({
      path: 'src/index.css',
      content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}`,
      description: 'Basic application styles',
    });

    // Vite config
    files.push({
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});`,
      description: 'Vite configuration for React development',
    });

    // TypeScript config
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2),
      description: 'TypeScript configuration',
    });

    return files;
  }

  /**
   * Generate Node.js project structure
   */
  private generateNodeStructure(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): Array<{ path: string; content: string; description: string }> {
    const files: Array<{ path: string; content: string; description: string }> = [];

    // Main server file
    files.push({
      path: 'src/index.ts',
      content: `import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: '${prd.coreFeatureDefinition.content}',
    description: '${prd.businessObjective.content || prd.coreFeatureDefinition.content}',
    status: 'Generated by Rainmaker 🚀',
  });
});

app.listen(port, () => {
  console.log(\`🚀 ${prd.coreFeatureDefinition.content} server running on port \${port}\`);
});`,
      description: 'Main Node.js server entry point',
    });

    // TypeScript config for Node
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: './dist',
          rootDir: './src',
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
      description: 'TypeScript configuration for Node.js',
    });

    return files;
  }

  /**
   * Generate environment variables template
   */
  private generateEnvExample(
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): string {
    const envVars: string[] = [
      '# Environment Configuration',
      '# Generated by Rainmaker',
      '',
      'NODE_ENV=development',
    ];

    // Add framework-specific variables
    if (analysis.primaryFramework === 'NODE_JS') {
      envVars.push('PORT=3001');
    }

    // Add database variables if needed
    if (analysis.projectStructure.hasDatabase) {
      envVars.push(
        '',
        '# Database Configuration',
        'DATABASE_URL=postgresql://username:password@localhost:5432/database_name'
      );
    }

    // Add auth variables if needed
    if (analysis.projectStructure.hasAuthentication) {
      envVars.push(
        '',
        '# Authentication',
        'JWT_SECRET=your-super-secret-jwt-key',
        'AUTH_PROVIDER_CLIENT_ID=your-oauth-client-id',
        'AUTH_PROVIDER_CLIENT_SECRET=your-oauth-client-secret'
      );
    }

    // Add component-specific variables
    selectedStack.forEach(({ component }) => {
      if (component.name === 'FastAPI') {
        envVars.push(
          '',
          '# FastAPI Configuration',
          'FASTAPI_ENV=development',
          'SECRET_KEY=your-secret-key'
        );
      }
    });

    return envVars.join('\n');
  }

  /**
   * Step 4: Create GitHub issues for development tasks
   */
  private async createDevelopmentIssues(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>,
    githubRepo?: { owner: string; repo: string }
  ): Promise<Array<{ title: string; url: string; number: number }>> {
    if (!githubRepo) {
      logger.info('No GitHub repo specified, skipping issue creation');
      return [];
    }

    logger.debug('Creating development issues', { repo: githubRepo });

    const issues: Array<{ title: string; url: string; number: number }> = [];

    try {
      // Create setup issue
      const setupIssueTitle = `🚀 Setup ${prd.coreFeatureDefinition.content} - Generated by Rainmaker`;
      const setupIssueBody = `## Project Setup

This issue tracks the initial setup of the ${prd.coreFeatureDefinition.content} feature generated by Rainmaker.

### Generated Stack
${selectedStack.map(({ component, reason }) => 
  `- **${component.name}**: ${reason}`
).join('\n')}

### Setup Tasks
- [ ] Install dependencies (\`npm install\`)
- [ ] Configure environment variables
- [ ] Review generated code structure
- [ ] Run initial tests
- [ ] Start development server

### Next Steps
Review the generated code and begin implementing the specific business logic for your feature.

---
*Generated by Rainmaker Build Orchestrator*`;
      const setupIssue = await createGitHubIssue(
        setupIssueTitle,
        setupIssueBody,
        ['rainmaker-generated', 'setup']
      );

      if (setupIssue.success) {
        issues.push({
          title: setupIssueTitle,
          url: setupIssue.issueUrl!,
          number: setupIssue.issueNumber!,
        });
      }

      // Create feature implementation issues based on user requirements and key user story
      const allRequirements = [
        { content: prd.keyUserStory.content, id: prd.keyUserStory.id }, 
        ...prd.userRequirements
      ].filter(req => req.content); 

      if (allRequirements.length > 0) {
        for (const requirement of allRequirements) {
          const featureIssueTitle = `Feature: ${requirement.content.substring(0, 50)}...`;
          const featureIssueBody = `## User Requirement
${requirement.content}

## Acceptance Criteria
To be defined (Acceptance Criteria not directly available from LeanPRDSchema for individual requirements)

## Implementation Notes
- Use the generated code structure as a starting point
- Follow the established patterns from the curated components
- Ensure type safety with Zod schemas

## Related Components
${selectedStack.map(({ component }) => 
  `- [${component.name}](${component.repository.url})`
).join('\n')}

---
*Generated by Rainmaker Build Orchestrator*`;
          const featureIssue = await createGitHubIssue(
            featureIssueTitle,
            featureIssueBody,
            ['rainmaker-generated', 'feature']
          );

          if (featureIssue.success) {
            issues.push({
              title: featureIssueTitle,
              url: featureIssue.issueUrl!,
              number: featureIssue.issueNumber!,
            });
          }
        }
      }

      logger.info('GitHub issues created successfully', { issueCount: issues.length });
      return issues;

    } catch (error) {
      logger.error('Failed to create GitHub issues', { error });
      return [];
    }
  }

  /**
   * Step 5: Generate build summary
   */
  private generateBuildSummary(
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>,
    generatedFiles: Array<{ path: string; content: string; description: string }>,
    createdIssues: Array<{ title: string; url: string; number: number }>
  ): BuildResult['buildSummary'] {
    const setupTime = analysis.estimatedComplexity === 'SIMPLE' ? '5-10 minutes' :
                     analysis.estimatedComplexity === 'MODERATE' ? '15-30 minutes' :
                     '30-60 minutes';

    const nextSteps = [
      'Review the generated code structure',
      'Install dependencies with `npm install`',
      'Configure environment variables in .env',
      'Start development server with `npm run dev`',
      'Implement business logic in generated components',
      'Add specific features and customizations',
      'Run tests and ensure everything works',
      'Deploy when ready!'
    ];

    return {
      totalFiles: generatedFiles.length,
      totalIssues: createdIssues.length,
      estimatedSetupTime: setupTime,
      nextSteps,
    };
  }
}

// Create and export a singleton instance
export const buildOrchestratorService = new BuildOrchestratorService();
