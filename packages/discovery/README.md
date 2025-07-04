# Rainmaker Discovery Engine

The core semantic search and code adaptation engine for finding and transforming proven code components.

## Overview

The Discovery package provides:
- **Semantic Search**: Find code components using natural language queries
- **GitHub Indexing**: Crawl and index high-quality repositories
- **Code Analysis**: Understand code patterns, frameworks, and dependencies
- **Socratic Dialogue**: Guide users through requirement refinement
- **Code Adaptation**: Transform code to match project conventions
- **LLM Integration**: Enhanced analysis with AI-powered insights

## Quick Start

```bash
# Install dependencies
cd packages/discovery
bun install

# Run the simple CLI demo
bun run src/simple-cli.ts

# Test GitHub indexing (requires GITHUB_TOKEN)
bun run src/github-cli.ts

# Test enhanced features (requires API keys)
bun run src/test-enhanced-discovery.ts
```

## Architecture

```
src/
├── core/
│   └── discovery-engine.ts      # Main orchestrator
├── services/
│   ├── code-analyzer.ts         # AST analysis & pattern detection
│   ├── embedding-service.ts     # OpenAI embeddings
│   ├── github-indexer.ts        # Repository crawler
│   ├── socratic-dialogue.ts     # Requirement refinement
│   └── adaptation-engine.ts     # Code transformation
├── types/                       # TypeScript types
└── baml_client/                 # Generated BAML client
```

## Key Features

### 1. Semantic Search
Uses OpenAI embeddings to find components by meaning, not just keywords:
```typescript
const results = await engine.search("user authentication with Google OAuth");
// Returns components ranked by semantic similarity
```

### 2. GitHub Indexing
Crawls repositories to find high-quality components:
```typescript
await engine.indexFromGitHub({
  category: 'auth',
  minStars: 100,
  languages: ['typescript', 'javascript']
});
```

### 3. Code Analysis
Understands code structure using Babel AST:
- Detects frameworks (React, Vue, Express, etc.)
- Identifies patterns (auth, payments, async)
- Extracts dependencies and APIs
- Generates component metadata

### 4. Socratic Dialogue
Guides users through requirement refinement:
```typescript
const dialogue = new SocraticDialogue();
const questions = await dialogue.generateQuestions(query, context);
// Dynamic questions based on user needs
```

### 5. Code Adaptation
Transforms code to match your project:
- **Naming Conventions**: camelCase ↔ snake_case ↔ kebab-case
- **Import Styles**: default ↔ named ↔ namespace
- **Error Handling**: try-catch ↔ promises ↔ async/await ↔ Result types
- **Code Injection**: Add custom logic at specific points

### 6. LLM Integration (BoundaryML)
Enhanced analysis with AI:
- Component descriptions
- Pattern recognition
- Quality assessment
- Transformation suggestions

## Configuration

### Environment Variables
```bash
# Required for GitHub indexing
GITHUB_TOKEN=your_github_token

# Optional - enables LLM features
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Graceful Degradation
All features work without LLM API keys:
- Falls back to static analysis
- Uses rule-based patterns
- Maintains core functionality

## Usage Examples

### Basic Search
```typescript
import { DiscoveryEngine } from './core/discovery-engine';

const engine = new DiscoveryEngine();
const results = await engine.search('payment processing');
```

### With Adaptation
```typescript
const adapted = await engine.adaptComponent(component, {
  namingConvention: 'snake_case',
  importStyle: 'named',
  errorHandling: 'async-await',
  customizations: {
    apiEndpoint: 'https://api.myapp.com'
  }
});
```

### Enhanced with LLM
```typescript
import { createEnhancedDiscoveryService } from './services/discovery-service-enhanced';

const discovery = createEnhancedDiscoveryService({
  githubToken: process.env.GITHUB_TOKEN,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  qualityThresholds: {
    minOverallScore: 7,
    minCodeQuality: 6
  }
});
```

## Testing

```bash
# Run all tests
bun test

# Test specific features
bun run src/test-socratic-dialogue.ts
bun run src/test-github-indexer.ts
bun run src/test-baml.ts
```

## Performance

- **Caching**: Components cached to disk for fast retrieval
- **Batch Processing**: Embeddings generated in batches
- **Lazy Loading**: LLM features loaded on demand
- **Rate Limiting**: Respects GitHub API limits

## Contributing

1. Follow the existing code patterns
2. Add tests for new features
3. Ensure graceful degradation without API keys
4. Update this README with new capabilities

## License

MIT
