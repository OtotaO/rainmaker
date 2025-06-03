// File: packages/api/src/build/index.ts

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
import type { CuratedComponent } from '../components/registry';
import { instructor } from '../lib/instructor';
import { anthropicConfig } from '../config';
import { logger } from '../lib/logger';
import { createGitHubIssue } from '../github';

// Build request schema
export const BuildRequestSchema = z.object({
  prd: z.object({
    title: z.string(),
    description: z.string(),
    userStories: z.array(z.string()).optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    technicalRequirements: z.array(z.string()).optional(),
  }),
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
    component: z.any(),
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

    logger.info('🚀 Starting build orchestration', { buildId, prd: request.prd.title });

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
    logger.debug('Analyzing PRD with LLM', { title: prd.title });

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

TITLE: ${prd.title}
DESCRIPTION: ${prd.description}

USER STORIES:
${prd.userStories?.join('\n') || 'Not specified'}

ACCEPTANCE CRITERIA:
${prd.acceptanceCriteria?.join('\n') || 'Not specified'}

TECHNICAL REQUIREMENTS:
${prd.technicalRequirements?.join('\n') || 'Not specified'}

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
    const content = `${prd.title} ${prd.description}`.toLowerCase();
    
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
      keyFeatures: [prd.title],
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

    const recommendations = componentRegistry.getRecommendedStack(
      analysis.primaryFramework,
      analysis.requiredCategories
    );

    const categoryMap = new Map<string, CuratedComponent>();
    
    recommendations.forEach(component => {
      const existing = categoryMap.get(component.category);
      if (!existing || component.repository.stars > existing.repository.stars) {
        categoryMap.set(component.category, component);
      }
    });

    categoryMap.forEach((component, category) => {
      selectedStack.push({
        category,
        component,
        reason: `Selected ${component.name} for ${category}: ${component.verification.notes || 'Rainmaker verified choice'}`,
      });
    });

    if (analysis.primaryFramework === 'REACT' && !categoryMap.has('STATE_MANAGEMENT')) {
      const zustand = componentRegistry.getById('zustand');
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
    const files: Array<{ path: string; content: string; description: string }> = [];

    if (analysis.primaryFramework === 'REACT' || analysis.primaryFramework === 'NODE_JS') {
      const packageJson = this.generatePackageJson(prd, analysis, selectedStack);
      files.push({
        path: 'package.json',
        content: JSON.stringify(packageJson, null, 2),
        description: 'Project dependencies with curated components',
      });
    }

    const readme = this.generateReadme(prd, analysis, selectedStack);
    files.push({
      path: 'README.md',
      content: readme,
      description: 'Project documentation and setup guide',
    });

    if (analysis.primaryFramework === 'REACT') {
      files.push(...this.generateReactStructure(prd, analysis, selectedStack));
    } else if (analysis.primaryFramework === 'NODE_JS') {
      files.push(...this.generateNodeStructure(prd, analysis, selectedStack));
    }

    const envExample = this.generateEnvExample(analysis, selectedStack);
    files.push({
      path: '.env.example',
      content: envExample,
      description: 'Environment variables template',
    });

    logger.info('Code structure generation completed', { fileCount: files.length });
    return files;
  }

  private generatePackageJson(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): any {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};

    selectedStack.forEach(({ component }) => {
      const installCmd = component.installation.command;
      if (installCmd.includes('npm install')) {
        const packageName = installCmd.replace('npm install ', '').split(' ')[0];
        dependencies[packageName] = 'latest';
      }
      component.installation.dependencies.forEach(dep => {
        dependencies[dep] = 'latest';
      });
    });

    if (analysis.primaryFramework === 'REACT') {
      dependencies['react'] = '^18.0.0';
      dependencies['react-dom'] = '^18.0.0';
      devDependencies['@types/react'] = '^18.0.0';
      devDependencies['@types/react-dom'] = '^18.0.0';
      devDependencies['vite'] = '^4.0.0';
      devDependencies['@vitejs/plugin-react'] = '^4.0.0';
    }

    devDependencies['typescript'] = '^5.0.0';
    devDependencies['vitest'] = '^1.0.0';
    dependencies['zod'] = '^3.22.0';

    return {
      name: prd.title.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      description: prd.description,
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

  private generateReadme(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): string {
    return `# ${prd.title}

${prd.description}

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

## 🚀 Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment:**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. **Start development:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📝 Next Steps

1. Review the generated code structure
2. Configure environment variables in \`.env\`
3. Implement business logic in the generated components
4. Add your specific features and customizations
5. Run tests and ensure everything works
6. Deploy when ready!

---

*Generated with ❤️ by Rainmaker - From idea to code in minutes*
`;
  }

  private generateReactStructure(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): Array<{ path: string; content: string; description: string }> {
    return [
      {
        path: 'src/App.tsx',
        content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${prd.title}</h1>
        <p>${prd.description}</p>
        <p>🚀 Generated by Rainmaker with curated components</p>
      </header>
    </div>
  );
}

export default App;`,
        description: 'Main React application component',
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        description: 'React application entry point',
      },
      {
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
      }
    ];
  }

  private generateNodeStructure(
    prd: BuildRequest['prd'],
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): Array<{ path: string; content: string; description: string }> {
    return [
      {
        path: 'src/index.ts',
        content: `import express from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: '${prd.title}',
    description: '${prd.description}',
    status: 'Generated by Rainmaker 🚀',
  });
});

app.listen(port, () => {
  console.log(\`🚀 ${prd.title} server running on port \${port}\`);
});`,
        description: 'Main Node.js server entry point',
      }
    ];
  }

  private generateEnvExample(
    analysis: PRDAnalysis,
    selectedStack: Array<{ category: string; component: CuratedComponent; reason: string }>
  ): string {
    const envVars = [
      '# Environment Configuration',
      '# Generated by Rainmaker',
      '',
      'NODE_ENV=development',
    ];

    if (analysis.primaryFramework === 'NODE_JS') {
      envVars.push('PORT=3001');
    }

    if (analysis.projectStructure.hasDatabase) {
      envVars.push(
        '',
        '# Database Configuration',
        'DATABASE_URL=postgresql://username:password@localhost:5432/database_name'
      );
    }

    if (analysis.projectStructure.hasAuthentication) {
      envVars.push(
        '',
        '# Authentication',
        'JWT_SECRET=your-super-secret-jwt-key'
      );
    }

    return envVars.join('\n');
  }

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

    const issues: Array<{ title: string; url: string; number: number }> = [];

    try {
      const setupIssue = await createGitHubIssue(
        `🚀 Setup ${prd.title} - Generated by Rainmaker`,
        `## Project Setup

This issue tracks the initial setup of the ${prd.title} feature generated by Rainmaker.

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

---
*Generated by Rainmaker Build Orchestrator*`,
        ['rainmaker-generated', 'setup']
      );

      if (setupIssue.success) {
        issues.push({
          title: `🚀 Setup ${prd.title} - Generated by Rainmaker`,
          url: setupIssue.issueUrl!,
          number: setupIssue.issueNumber!,
        });
      }

      return issues;
    } catch (error) {
      logger.error('Failed to create GitHub issues', { error });
      return [];
    }
  }

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
