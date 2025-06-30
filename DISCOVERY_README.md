# Rainmaker Discovery System

## The Vision

Instead of AI hallucinating new code, Rainmaker Discovery is a **semantic search engine for proven code**. It finds, understands, and intelligently adapts existing solutions to your specific needs.

## How It Works

1. **Describe Your Need**: "I need user authentication with Google OAuth"
2. **Socratic Refinement**: Answer targeted questions to clarify requirements
3. **Semantic Search**: Find the best implementations from millions of components
4. **Intelligent Adaptation**: Automatically adjust code to match your project style
5. **Ready to Use**: Get working code with proper attribution in minutes

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
    └── components/Discovery/      # New discovery flow UI
```

## Quick Start

```bash
# Run the quick start script
bun run quickstart.ts

# Or manually:
bun install
bun run dev
```

Then visit http://localhost:3000

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

## Example Flow

```typescript
// User: "I need authentication"

// System: "What type of authentication?"
// - OAuth (Google, GitHub, etc.) ✓
// - JWT-based
// - Session-based

// System: "Which OAuth providers?"
// - Google ✓
// - GitHub ✓
// - Facebook

// System finds: passport-google-oauth20 implementation
// with 2.5k stars, tests, MIT license

// Adapts to your project:
// - TypeScript with React
// - camelCase naming
// - Named imports
// - Your error handling style

// Result: Ready-to-use GoogleAuth.tsx
```

## Why This Approach Works

1. **Leverages Existing Solutions**: 90% of problems are already solved
2. **Battle-Tested Code**: Popular = probably good
3. **Continuous Learning**: Every selection improves matching
4. **Legal Clarity**: Proper attribution and licenses
5. **Actually Ships**: Find → Adapt → Use in minutes

## Customization Points

Each component identifies:
- **Variables**: Configuration values you can change
- **Injection Points**: Where to add custom logic
- **Patterns**: Conventions that can be adapted

## Future Roadmap

- **Phase 1**: MVP with auth, payments, database categories
- **Phase 2**: ML-improved dialogue and matching
- **Phase 3**: More languages and frameworks
- **Phase 4**: Community component contributions
- **Phase 5**: Private repository support

## The Philosophy

> "The best code is code you don't have to write. The second best is code someone else already debugged." - Every Developer Ever

Rainmaker Discovery embraces this truth. Instead of generating code that might work, we find code that definitely works and make it yours.

## Get Involved

This is just the beginning. We need:
- Feedback on the discovery flow
- Suggestions for new categories
- Component quality signals
- Adaptation patterns

Let's build the future of code reuse together! 🚀