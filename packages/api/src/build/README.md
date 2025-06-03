# Rainmaker Build Orchestrator - Specification Compiler

## Overview

The Build Orchestrator is the heart of Rainmaker's Specification Compiler - a system that transforms a finalized Product Requirements Document (PRD) into a complete, working codebase with curated components in one automated pipeline.

## Philosophy

> "Get them to the destination first, then think about what to eat."

The Build Orchestrator embodies Carmack's directness by providing:
- **One-click transformation**: PRD → Working Code
- **Opinionated choices**: Pre-vetted, battle-tested components
- **Immediate value**: Working foundation, not endless configuration options

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PRD Input     │───▶│ Build Orchestrator│───▶│ Working Codebase│
│                 │    │                  │    │                 │
│ • Title         │    │ 1. Analyze PRD   │    │ • package.json  │
│ • Description   │    │ 2. Select Stack  │    │ • Source files  │
│ • User Stories  │    │ 3. Generate Code │    │ • Documentation │
│ • Acceptance    │    │ 4. Create Issues │    │ • Environment   │
│   Criteria      │    │ 5. Build Summary │    │ • GitHub Issues │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. BuildOrchestratorService (`index.ts`)

The main orchestration class that coordinates the entire build process.

**Key Methods:**
- `buildFromPRD(request: BuildRequest): Promise<BuildResult>`
- `analyzePRD()` - LLM-powered requirement analysis
- `assembleStack()` - Component selection from curated registry
- `generateCodeStructure()` - File and project generation
- `createDevelopmentIssues()` - GitHub integration
- `generateBuildSummary()` - Final report

### 2. Schema Definitions

**BuildRequestSchema:**
```typescript
{
  prd: {
    title: string;
    description: string;
    userStories?: string[];
    acceptanceCriteria?: string[];
    technicalRequirements?: string[];
  };
  targetFramework?: 'REACT' | 'VUE' | 'NODE_JS' | 'PYTHON';
  projectType: 'NEW_PROJECT' | 'EXISTING_REPO_FEATURE';
  githubRepo?: { owner: string; repo: string; };
}
```

**BuildResultSchema:**
```typescript
{
  success: boolean;
  buildId: string;
  selectedStack: Array<{
    category: string;
    component: CuratedComponent;
    reason: string;
  }>;
  generatedFiles: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  createdIssues: Array<{
    title: string;
    url: string;
    number: number;
  }>;
  buildSummary: {
    totalFiles: number;
    totalIssues: number;
    estimatedSetupTime: string;
    nextSteps: string[];
  };
  error?: string;
}
```

## Build Process Flow

### Step 1: PRD Analysis
- **Primary**: Uses Anthropic LLM to analyze requirements
- **Fallback**: Keyword-based analysis for reliability
- **Output**: Technical framework, complexity, feature detection

```typescript
const analysis = await this.analyzePRD(prd, targetFramework);
// Determines: React vs Node.js, database needs, auth requirements, etc.
```

### Step 2: Stack Assembly
- **Source**: Curated Component Registry
- **Selection**: Based on GitHub stars, verification status, framework compatibility
- **Logic**: Best component per category, with intelligent defaults

```typescript
const selectedStack = await this.assembleStack(analysis);
// Selects: UI library, state management, testing framework, etc.
```

### Step 3: Code Generation
- **Framework-specific**: React (Vite + TypeScript) or Node.js (Express + TypeScript)
- **Complete structure**: package.json, README, source files, configuration
- **Opinionated defaults**: Always includes Zod, TypeScript, testing setup

```typescript
const generatedFiles = await this.generateCodeStructure(prd, analysis, selectedStack);
// Generates: Complete working project structure
```

### Step 4: GitHub Integration
- **Setup Issues**: Installation and configuration tasks
- **Feature Issues**: Based on user stories and acceptance criteria
- **Development Workflow**: Ready-to-use project management

```typescript
const createdIssues = await this.createDevelopmentIssues(prd, analysis, selectedStack, githubRepo);
// Creates: Actionable GitHub issues for development team
```

### Step 5: Build Summary
- **Metrics**: File count, issue count, estimated setup time
- **Next Steps**: Actionable instructions for immediate development
- **Success Tracking**: Build ID for monitoring and debugging

## Generated Project Structure

### React Projects
```
project-name/
├── package.json          # Dependencies with curated components
├── README.md             # Generated documentation
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
└── src/
    ├── App.tsx           # Main application component
    ├── main.tsx          # Application entry point
    └── index.css         # Basic styles
```

### Node.js Projects
```
project-name/
├── package.json          # Dependencies with curated components
├── README.md             # Generated documentation
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
└── src/
    └── index.ts          # Express server entry point
```

## API Endpoints

### POST `/api/build/from-prd`
The main Specification Compiler endpoint.

**Request:**
```json
{
  "prd": {
    "title": "Task Management App",
    "description": "A simple task management application for teams",
    "userStories": [
      "As a user, I want to create tasks",
      "As a user, I want to assign tasks to team members"
    ],
    "acceptanceCriteria": [
      "Tasks can be created with title and description",
      "Tasks can be assigned to users"
    ]
  },
  "targetFramework": "REACT",
  "projectType": "NEW_PROJECT",
  "githubRepo": {
    "owner": "myorg",
    "repo": "task-app"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Build orchestration completed successfully",
  "data": {
    "buildId": "build_1640995200000_1",
    "selectedStack": [...],
    "generatedFiles": [...],
    "createdIssues": [...],
    "buildSummary": {
      "totalFiles": 8,
      "totalIssues": 3,
      "estimatedSetupTime": "15-30 minutes",
      "nextSteps": [
        "Review the generated code structure",
        "Install dependencies with `npm install`",
        "Configure environment variables in .env",
        "Start development server with `npm run dev`"
      ]
    }
  }
}
```

### GET `/api/build/health`
Health check for the build orchestrator service.

### POST `/api/build/validate-prd`
Validate PRD structure without executing the full build pipeline.

## Error Handling

### LLM Analysis Failures
- **Fallback**: Keyword-based analysis
- **Graceful degradation**: Sensible defaults based on content analysis
- **Logging**: Comprehensive error tracking for debugging

### Component Registry Issues
- **Validation**: All components verified before inclusion
- **Fallbacks**: Default components when specific ones unavailable
- **Quality gates**: GitHub stars and verification requirements

### Code Generation Errors
- **Atomic operations**: Each file generation is independent
- **Rollback capability**: Failed builds don't leave partial state
- **Detailed logging**: File-level error reporting

## Integration Points

### Component Registry
- **Source**: `../components/registry.ts`
- **Method**: `getRecommendedStack(framework, categories)`
- **Fallbacks**: Framework-specific defaults (e.g., Zustand for React)

### GitHub Service
- **Source**: `../github/index.ts`
- **Method**: `createGitHubIssue(title, body, labels)`
- **Authentication**: Uses configured GitHub token

### LLM Service
- **Source**: `../lib/instructor.ts`
- **Provider**: Anthropic Claude
- **Fallback**: Keyword-based analysis

## Configuration

### Environment Variables
```bash
# Required for LLM analysis
ANTHROPIC_API_KEY=sk-ant-...

# Required for GitHub integration
GITHUB_TOKEN=ghp_...

# Optional: Custom model configuration
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Framework Defaults
- **React**: Vite + TypeScript + Zod + Vitest
- **Node.js**: Express + TypeScript + Zod + Vitest
- **Always included**: TypeScript, Zod (type safety principle)

## Monitoring and Debugging

### Logging
- **Build lifecycle**: Each step logged with timing
- **Error tracking**: Comprehensive error context
- **Performance metrics**: Build duration, file count, component selection

### Build IDs
- **Format**: `build_{timestamp}_{counter}`
- **Usage**: Tracking, debugging, user support
- **Persistence**: Logged for audit trail

## Testing

### Unit Tests
- **Schema validation**: Zod schema testing
- **Component selection**: Registry logic testing
- **Code generation**: Template output validation

### Integration Tests
- **End-to-end**: Full PRD → code pipeline
- **GitHub integration**: Issue creation testing
- **LLM integration**: Analysis accuracy testing

## Performance Considerations

### Build Speed
- **Target**: < 30 seconds for typical projects
- **Optimization**: Parallel file generation
- **Caching**: Component registry caching

### Resource Usage
- **Memory**: Efficient template processing
- **API calls**: Batched GitHub operations
- **LLM usage**: Optimized prompt engineering

## Future Enhancements

### Planned Features
1. **More Frameworks**: Vue.js, Python/FastAPI, Go
2. **Deployment Integration**: Vercel, Netlify, AWS
3. **Advanced Templates**: Microservices, mobile apps
4. **Custom Components**: User-defined component registry

### Architecture Evolution
1. **Plugin System**: Extensible component sources
2. **Template Engine**: More sophisticated code generation
3. **AI Improvements**: Better requirement understanding
4. **Collaboration**: Multi-user PRD editing

## Contributing

### Adding New Frameworks
1. Update `SupportedFramework` enum
2. Add framework detection logic in `analyzePRD`
3. Implement `generate{Framework}Structure` method
4. Add framework-specific components to registry

### Adding New Components
1. Verify component quality (GitHub stars, maintenance)
2. Add to component registry with verification notes
3. Test integration with build orchestrator
4. Update documentation

## Troubleshooting

### Common Issues

**Build fails with "LLM analysis failed"**
- Check ANTHROPIC_API_KEY configuration
- Verify API key has sufficient credits
- Review PRD content for clarity

**GitHub issues not created**
- Verify GITHUB_TOKEN permissions
- Check repository access rights
- Ensure repository exists and is accessible

**Generated code has TypeScript errors**
- Check component registry for outdated versions
- Verify framework-specific dependencies
- Review generated package.json for conflicts

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=debug npm start
```

## Philosophy in Practice

The Build Orchestrator embodies Rainmaker's core principles:

1. **"Get them to the destination first"**: Working code over perfect architecture
2. **Carmack's directness**: One API call, immediate results
3. **Opinionated choices**: Curated components, sensible defaults
4. **Type safety**: Zod + TypeScript throughout
5. **Value delivery**: Complete projects, not just boilerplate

This isn't just a code generator - it's a philosophy made manifest in working software.
