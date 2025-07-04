# Rainmaker Discovery

> **Production-ready semantic search engine for proven code components**

Rainmaker Discovery helps you find, understand, and adapt existing code solutions instead of writing everything from scratch. **Phase 3.1 Complete** - Now with full LLM integration and AI-powered discovery.

## ✨ Current Features

- 🔍 **Semantic search** with OpenAI embeddings (production-ready)
- 🤖 **AI-powered code understanding** with pattern recognition
- 🛠️ **Intelligent code adaptation** with AST manipulation
- 📦 **Component indexing** with comprehensive metadata
- 🔄 **Caching system** for performance optimization
- 🎯 **Type safety** with 95% coverage using Zod schemas
- 🐙 **GitHub repository indexing** with quality filtering
- 🔧 **Advanced AST transformations** for error handling patterns
- 📝 **Naming convention conversion** (camelCase ↔ snake_case ↔ kebab-case)
- 📦 **Import/export style transformation** (default ↔ named ↔ namespace)
- 🧠 **LLM-enhanced discovery** with graceful fallbacks (no API keys required)
- 💬 **Dynamic Socratic dialogue** for requirement refinement
- ⭐ **AI-powered quality assessment** across 5 dimensions
- 🔎 **Intelligent search refinement** with context awareness

## 🎯 Implementation Status

### ✅ Phase 2.4 COMPLETE - BoundaryML Integration
- **Structured LLM Operations**: 6 type-safe BAML functions for AI-powered analysis
- **Enhanced Code Analysis**: LLM-powered component descriptions and pattern recognition
- **Quality Assessment**: Multi-dimensional AI scoring with fallback systems
- **Production Ready**: Graceful error handling and comprehensive testing
- **AST-based Transformations**: Full Babel parser/generator integration
- **Error Handling Conversion**: try-catch ↔ promises ↔ async/await ↔ Result types
- **Naming Convention System**: Multi-format support with built-in identifier detection
- **Code Injection System**: Before/after/replace/wrap patterns with precise targeting
- **GitHub Integration**: Real repository crawling with quality filtering

### ✅ Phase 3.1 COMPLETE - Full LLM Integration
- **Enhanced Socratic Dialogue**: Dynamic, context-aware questioning with graceful fallback
- **GitHub Quality Assessment**: AI-powered component quality scoring across 5 dimensions
- **Search Query Refinement**: Intelligent ranking based on user needs with alternative queries
- **Code Transformation Suggestions**: Context-aware adaptations with priority-based application
- **Production Ready**: All features work without LLM API keys through graceful degradation

## 🚀 Quick Start

See our [**Quick Start Guide**](./QUICKSTART.md) for detailed setup instructions!

```bash
# Quick setup (after cloning)
./scripts/setup-env.sh  # Interactive environment setup
bun install            # Install dependencies
cd packages/discovery && bun run src/simple-cli.ts  # Test it works!
```

For the full experience with all features:
```bash
bun run dev:all  # Start all servers
```

## 🧪 Demo the Semantic Search

```bash
cd packages/discovery
bun run src/simple-cli.ts
```

**What you'll see:**
- Semantic search finding "Google OAuth authentication" → GoogleOAuthProvider
- Pattern matching for "JWT token middleware" → JWTAuthMiddleware  
- Quality scoring combining semantic similarity with code patterns
- Component metadata including frameworks, dependencies, and patterns

## Development

### Project Structure

- `rainmaker-discovery.ts` - Main entry point
- `src/` - Source code
- `dist/` - Compiled output
- `packages/` - Monorepo packages

### Commands

- `bun run build` - Build the project
- `bun run dev` - Run in development mode with watch
- `bun test` - Run tests
- `bun run lint` - Lint the codebase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT
bun run dev
```

Then visit:
- 📡 API Server: http://localhost:3001
- 🌐 Web Interface: http://localhost:3000

## Architecture

```
packages/
├── discovery/              # Core discovery engine
│   ├── services/
│   │   ├── github-indexer.ts      # Crawls and indexes GitHub
│   │   ├── code-analyzer.ts       # Understands code structure
│   │   ├── socratic-dialogue.ts   # Guides user refinement
│   │   ├── adaptation-engine.ts   # Transforms code intelligently
│   │   └── discovery-service.ts   # Orchestrates everything
│   └── types/              # Zod schemas for type safety
├── api/                    # Express API server
└── frontend/               # React UI
    └── components/Discovery/      # Discovery flow UI
```

## Key Features

### 1. Semantic Understanding
- Analyzes code structure, not just keywords
- Understands patterns, frameworks, and dependencies
- Generates embeddings for similarity matching

### 2. Socratic Dialogue
- Guides users through refinement questions
- Builds precise search criteria
- Learns from user choices

### 3. Intelligent Adaptation
- Converts naming conventions (camelCase → snake_case)
- Adjusts import/export styles
- Replaces dependencies
- Injects custom code at designated points

### 4. Quality Filtering
- Minimum star requirements
- Test coverage detection
- License compatibility
- Recent maintenance activity

## The Philosophy

> "The best code is code you don't have to write. The second best is code someone else already debugged." - Every Developer Ever

Rainmaker Discovery embraces this truth. Instead of generating code that might work, we find code that definitely works and make it yours.

## Documentation

- [Migration Guide](./MIGRATION_TO_DISCOVERY.md) - How we got here
- [Discovery README](./DISCOVERY_README.md) - Detailed system overview
- [Before vs After](./BEFORE_VS_AFTER.md) - Comparison with the old approach

## Development

```bash
# Install dependencies
bun install

# Start development servers
bun run dev

# Run tests
bun run test

# Build for production
bun run build
```

## Environment Setup

Copy `packages/api/.env.example` to `packages/api/.env` and configure:

```env
GITHUB_TOKEN=your_github_token
ANTHROPIC_API_KEY=your_anthropic_key
DATABASE_URL=your_database_url
```

## Contributing

This represents a fundamental shift in how we think about AI-assisted development. We're moving from "AI writes code" to "AI finds and adapts proven solutions."

Contributions welcome! 🚀
